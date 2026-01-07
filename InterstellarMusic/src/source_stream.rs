use std::cell::RefCell;
use std::io::{Read, Result, Seek, SeekFrom};
use symphonia::core::io::MediaSource;
use wasm_bindgen::throw_str;
use web_sys::js_sys::Uint8Array;

thread_local! {
    static JS_CACHE: RefCell<Option<Uint8Array>> = RefCell::new(None);
}

static mut CACHE_LENGTH: u32 = 0;

pub fn clear_js_cache() {
    JS_CACHE.set(None);
}

pub fn get_js_cache_length() -> u32 {
    unsafe { CACHE_LENGTH }
}

pub struct JSSourceStream {
    pos: u32,
}

impl JSSourceStream {
    pub fn new(data: &Uint8Array) -> Self {
        JS_CACHE.with(|cache| {
            if cache.take().is_some() { throw_str("Could not create new JSSourceStream because the cache is in use"); }
            cache.replace(Some(data.clone()));
        });
        unsafe {
            CACHE_LENGTH = data.length();
        }
        Self { pos: 0 }
    }
}

impl Read for JSSourceStream {
    fn read(&mut self, buf: &mut [u8]) -> Result<usize> {
        JS_CACHE.with(|cache| {
            if let Some(data) = cache.borrow().as_ref() {
                let remaining = data.length().saturating_sub(self.pos);
                let to_read = remaining.min(buf.len() as u32);

                if to_read == 0 {
                    return Ok(0);
                }
                data.subarray(self.pos,self.pos + to_read).copy_to(&mut buf[0..to_read as usize]);
                self.pos += to_read;
                Ok(to_read as usize)
            } else {
                throw_str("Failed to read from cache because cache was None")
            }
        })
    }
}

impl Seek for JSSourceStream {
    fn seek(&mut self, pos: SeekFrom) -> Result<u64> {
        unsafe {
            let new_pos = match pos {
                SeekFrom::Start(p) => p as i64,
                SeekFrom::Current(o) => self.pos as i64 + o,
                SeekFrom::End(o) => CACHE_LENGTH as i64 + o,
            };

            self.pos = new_pos.clamp(0, CACHE_LENGTH as i64) as u32;
            Ok(self.pos as u64)
        }
    }
}

impl MediaSource for JSSourceStream {
    fn is_seekable(&self) -> bool {
        true
    }

    fn byte_len(&self) -> Option<u64> {
        unsafe {
            Some(CACHE_LENGTH as u64)
        }
    }
}
