mod music_player;

use std::arch::wasm32::{f32x4_add, f32x4_mul, f32x4_splat, v128, v128_load, v128_store};
use std::arch::wasm32::memory_size;
use std::collections::HashMap;
use std::ops::Index;
use ringbuf::traits::Observer;
use web_sys::console;
use wasm_bindgen::prelude::*;
use wasm_bindgen::throw_str;
use web_sys::js_sys::{Array, Object, Reflect};
use crate::music_player::{InterstellarMusic, FRAME_BUFFER_SIZE};

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

#[wasm_bindgen]
pub struct AudioProcessor {
    loaded_music: HashMap<String, InterstellarMusic>,
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
            loaded_music: HashMap::new(),
            pause_cache: HashMap::new(),
            master_volume: 1.0,
            focus_volume: 1.0,
            is_focused: true,
            left_scratch: [0f32; WEB_AUDIO_QUANTUM],
            right_scratch: [0f32; WEB_AUDIO_QUANTUM],
            time_ticks: 0
        }
    }

    #[target_feature(enable = "simd128")]
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
        self.loaded_music.retain(|_, music| {
            let Some(gain) = music.update_music(
                left_scratch,
                right_scratch,
                global_volume,
                time_ticks,
            ) else {
                if music.unloaded {
                    pause_cache.insert(music.hash.clone(), music.current_time);
                }
                return !music.unloaded;
            };

            let gain_v = f32x4_splat(gain);
            let mut i = 0;

            unsafe {
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

            true
        });

    }

    pub fn set_master_volume(&mut self, master_volume: f32) {
        self.master_volume = master_volume;
    }

    pub fn set_focused(&mut self, is_focused: bool) {
        self.is_focused = is_focused;
    }

    pub fn enable_song(&mut self, raw_name: &[u8], raw_hash: &[u8], file: &[u8], start_time: f64) {
        let name = std::str::from_utf8(raw_name).unwrap();
        let hash = std::str::from_utf8(raw_hash).unwrap();
        if let Some(music) = self.loaded_music.get_mut(hash) {
            music.active = true;
            music.unloading = false;
        } else {
            let mut start = start_time;
            if let Some(music) = self.pause_cache.get(hash) { start = music.clone() as f64 / AUDIO_SAMPLE_RATE as f64; }
            self.loaded_music.insert(hash.to_string(), InterstellarMusic::new(name.to_string(), hash.to_string(), file, start));
        }
    }

    pub fn disable_song(&mut self, raw_hash: &[u8]) {
        let hash = std::str::from_utf8(raw_hash).unwrap();
        if let Some(music) = self.loaded_music.get_mut(hash) {
            console_log!("Deleting song {}", hash);
            music.active = false;
            music.unloading = true;
        }
    }

    pub fn get_debug_data(&mut self) -> Object {
        let loaded_songs = Array::new();
        self.loaded_music.iter().for_each(|(_hash, music)| {
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
            Reflect::set(&loaded_song_obj, &JsValue::from("unloading"), &JsValue::from(music.unloading)).unwrap();
            loaded_songs.push(&*loaded_song_obj);
        });

        let processor_debug_data = Object::new();
        Reflect::set(&processor_debug_data, &JsValue::from("memory"), &JsValue::from(memory_size::<0>() * 65536)).unwrap();
        Reflect::set(&processor_debug_data, &JsValue::from("loaded_songs"), &JsValue::from(loaded_songs)).unwrap();
        processor_debug_data
    }

    pub fn get_time(&self) -> f32 {
        (self.time_ticks as f32) / AUDIO_SAMPLE_RATE as f32
    }
}