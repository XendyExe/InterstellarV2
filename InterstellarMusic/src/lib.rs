mod music_player;
mod source_stream;

use crate::music_player::InterstellarMusic;
use std::arch::wasm32::memory_size;
use std::arch::wasm32::{f32x4_add, f32x4_mul, f32x4_splat, v128, v128_load, v128_store};
use std::collections::HashMap;
use wasm_bindgen::prelude::*;
use wasm_bindgen::throw_str;
use web_sys::console;
use web_sys::js_sys::{Array, Object, Reflect, Uint8Array};
use crate::source_stream::{clear_js_cache, get_js_cache_length};

const WEB_AUDIO_QUANTUM: usize = 128;
const AUDIO_SAMPLE_RATE: u32 = 48000;

const FOCUS_FADE: f32 = 0.6; // percent per second
const ACTIVE_FADE: f32 = 0.5; // percent per second

// Compile-time dynamics
const DELTA_TIME: f32 = WEB_AUDIO_QUANTUM as f32 / AUDIO_SAMPLE_RATE as f32;
const FOCUS_FADE_DELTA: f32 =  DELTA_TIME / FOCUS_FADE;
const ACTIVE_FADE_DELTA: f32 = DELTA_TIME / ACTIVE_FADE;

#[macro_export] macro_rules! console_log {
    ($($t:tt)*) => (console::log_1(&format_args!($($t)*).to_string().into()))
}

pub struct AudioFadeCache {
    name: String,
    hash: String,
    completion: usize,
    buffer_left: Vec<f32>,
    buffer_right: Vec<f32>,
    length: usize,
    start_time: u64,
    start_volume: f32
}

impl AudioFadeCache {
    pub fn new(name: String, hash: String, start_time: u64, length: usize, start_volume: f32) -> AudioFadeCache {
        Self {
            name,
            hash,
            start_time,
            start_volume,
            length,
            completion: 0,
            buffer_left: vec!(0.0f32; length),
            buffer_right: vec!(0.0f32; length),
        }
    }

    pub fn consume(&mut self, left_result: &mut [f32], right_result: &mut [f32], global_volume: f32) -> f32 {
        left_result.copy_from_slice(&self.buffer_left[self.completion..self.completion + WEB_AUDIO_QUANTUM]);
        right_result.copy_from_slice(&self.buffer_right[self.completion..self.completion + WEB_AUDIO_QUANTUM]);
        self.completion += WEB_AUDIO_QUANTUM;
        global_volume * (self.start_volume * ((self.length - self.completion) as f32 / self.length as f32))
    }
}


#[wasm_bindgen]
pub struct AudioProcessor {
    loaded_music: Option<InterstellarMusic>,
    cache_fade: HashMap<String, AudioFadeCache>,
    is_focused: bool,
    master_volume: f32,
    focus_volume: f32,
    left_scratch: [f32; WEB_AUDIO_QUANTUM],
    right_scratch: [f32; WEB_AUDIO_QUANTUM],
    pause_cache: HashMap<String, u64>,

    time_ticks: u64
}

#[wasm_bindgen]
impl AudioProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        console_error_panic_hook::set_once();
        Self {
            loaded_music: None,
            cache_fade: HashMap::new(),
            pause_cache: HashMap::new(),
            master_volume: 0.0,
            focus_volume: 1.0,
            is_focused: true,
            left_scratch: [0f32; WEB_AUDIO_QUANTUM],
            right_scratch: [0f32; WEB_AUDIO_QUANTUM],
            time_ticks: 0
        }
    }

    pub fn process_stereo(&mut self, left_output: &mut [f32], right_output: &mut [f32], sample_rate: u32) {
        if sample_rate != AUDIO_SAMPLE_RATE { throw_str(&format!("Running incorrect sample rates! Expected {} but the worker is at {}", AUDIO_SAMPLE_RATE, sample_rate)); }
        self.time_ticks += WEB_AUDIO_QUANTUM as u64;
        if self.is_focused && self.focus_volume < 1.0 {
            self.focus_volume = f32::min(self.focus_volume + FOCUS_FADE_DELTA, 1.0);
        }
        else if !self.is_focused && self.focus_volume > 0.0 {
            self.focus_volume = f32::max(self.focus_volume - FOCUS_FADE_DELTA, 0.0);
        }

        let global_volume = self.master_volume * self.focus_volume;
        let left_scratch = &mut self.left_scratch;
        let right_scratch = &mut self.right_scratch;
        let pause_cache = &mut self.pause_cache;
        let time_ticks = self.time_ticks;
        let global_volume = global_volume;

        if let Some(mut music) = self.loaded_music.take() {
            if let Some(gain) = music.update_music(left_scratch, right_scratch, global_volume, time_ticks) {
                unsafe { Self::simd_mix(left_scratch, right_scratch, left_output, right_output, gain); }
            }
            self.loaded_music = Some(music);
        }

        self.cache_fade.retain(|hash, cache| {
            let gain = cache.consume(left_scratch, right_scratch, global_volume);
            unsafe { Self::simd_mix(left_scratch, right_scratch, left_output, right_output, gain); }
            if cache.completion >= cache.length {
                pause_cache.insert(hash.clone(), 0);
                return false;
            }
            true
        });
    }

    unsafe fn simd_mix(left_scratch: &mut [f32], right_scratch: &mut [f32], left_output: &mut [f32], right_output: &mut [f32], gain: f32) {
        let gain_v = f32x4_splat(gain);
        let mut i = 0;
        while i + 4 <= WEB_AUDIO_QUANTUM {
            let left_in_v = v128_load(left_scratch.as_ptr().add(i) as *const v128);
            let left_out_v = v128_load(left_output.as_ptr().add(i) as *const v128);
            let left_mixed = f32x4_add(left_out_v, f32x4_mul(left_in_v, gain_v));
            v128_store(left_output.as_mut_ptr().add(i) as *mut v128, left_mixed);

            let right_in_v = v128_load(right_scratch.as_ptr().add(i) as *const v128);
            let right_out_v = v128_load(right_output.as_ptr().add(i) as *const v128);
            let right_mixed = f32x4_add(right_out_v, f32x4_mul(right_in_v, gain_v));
            v128_store(right_output.as_mut_ptr().add(i) as *mut v128, right_mixed);
            i += 4;
        }
    }

    pub fn set_master_volume(&mut self, master_volume: f32) {
        self.master_volume = master_volume;
    }

    pub fn set_focused(&mut self, is_focused: bool) {
        self.is_focused = is_focused;
    }

    pub fn enable_song(&mut self, raw_name: &[u8], raw_hash: &[u8], file: &Uint8Array, start_time: f64) {
        let name = std::str::from_utf8(raw_name).unwrap();
        let hash = std::str::from_utf8(raw_hash).unwrap();
        console_log!("Enabling {} ({})", name, hash);
        if let Some(mut music) = self.loaded_music.take() {
            // Unload existing music
            let cache = music.get_fade_buffers(self.time_ticks);
            if cache.length > 0 {
                console_log!("Enabling song is bumping a song into cache with length {}", cache.length);
                self.cache_fade.insert(cache.hash.clone(), cache);
            }
            clear_js_cache();
        }
        let mut start = start_time;
        if let Some(cache) = self.cache_fade.get_mut(hash) {
            start = (cache.start_time + cache.completion as u64) as f64 / AUDIO_SAMPLE_RATE as f64;
            self.cache_fade.remove(hash);
        }
        self.loaded_music = Some(InterstellarMusic::new(name.to_string(), hash.to_string(), file, start));
    }

    pub fn disable_song(&mut self, raw_hash: &[u8]) {
        let hash = std::str::from_utf8(raw_hash).unwrap();
        if let Some(mut music) = self.loaded_music.take() {
            if music.hash == hash {
                let cache = music.get_fade_buffers(self.time_ticks);
                if cache.length > 0 {
                    console_log!("Disabling song is bumping a song into cache with length {}", cache.length);
                    self.cache_fade.insert(cache.hash.clone(), cache);
                }
                clear_js_cache();
            } else {
                self.loaded_music = Some(music);
            }
        }
    }

    pub fn get_debug_data(&mut self) -> Object {
        let mut loaded_song = JsValue::NULL;
        if let Some(music) = self.loaded_music.take() {
            let loaded_song_obj = Object::new();
            Reflect::set(&loaded_song_obj, &JsValue::from("name"), &JsValue::from(music.file_name.clone())).unwrap();
            Reflect::set(&loaded_song_obj, &JsValue::from("started"), &JsValue::from(music.started)).unwrap();
            Reflect::set(&loaded_song_obj, &JsValue::from("time"), &JsValue::from(music.current_time)).unwrap();
            Reflect::set(&loaded_song_obj, &JsValue::from("playing"), &JsValue::from(music.playing)).unwrap();
            if let Some(pause_time) = music.pause_time {
                Reflect::set(&loaded_song_obj, &JsValue::from("pause_time_song"), &JsValue::from(pause_time.0)).unwrap();
                Reflect::set(&loaded_song_obj, &JsValue::from("pause_time_start"), &JsValue::from(pause_time.1)).unwrap();
            }
            Reflect::set(&loaded_song_obj, &JsValue::from("buffer_length"), &JsValue::from(music.average_buffer)).unwrap();
            Reflect::set(&loaded_song_obj, &JsValue::from("length"), &JsValue::from(music.length)).unwrap();
            Reflect::set(&loaded_song_obj, &JsValue::from("resampler"), &JsValue::from(music.sampler.is_some())).unwrap();
            Reflect::set(&loaded_song_obj, &JsValue::from("active"), &JsValue::from(music.active)).unwrap();
            loaded_song = JsValue::from(loaded_song_obj);
            self.loaded_music = Some(music);
        }

        let caches = Array::new();
        self.cache_fade.iter().for_each(|(_, cache)| {
            let cache_obj = Object::new();
            Reflect::set(&cache_obj, &JsValue::from("name"), &JsValue::from(cache.name.clone())).unwrap();
            Reflect::set(&cache_obj, &JsValue::from("completion"), &JsValue::from(cache.completion)).unwrap();
            Reflect::set(&cache_obj, &JsValue::from("length"), &JsValue::from(cache.length)).unwrap();
            caches.push(&*cache_obj);
        });

        let processor_debug_data = Object::new();
        Reflect::set(&processor_debug_data, &JsValue::from("wasm_mem"), &JsValue::from(memory_size::<0>() * 65536)).unwrap();
        Reflect::set(&processor_debug_data, &JsValue::from("cache_mem"), &JsValue::from(get_js_cache_length())).unwrap();
        Reflect::set(&processor_debug_data, &JsValue::from("loaded_song"), &loaded_song).unwrap();
        Reflect::set(&processor_debug_data, &JsValue::from("caches"), &caches).unwrap();
        processor_debug_data
    }

    pub fn get_time(&self) -> f32 {
        (self.time_ticks as f32) / AUDIO_SAMPLE_RATE as f32
    }
}