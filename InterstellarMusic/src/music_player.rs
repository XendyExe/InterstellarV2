use crate::{console, ACTIVE_FADE_DELTA, AUDIO_SAMPLE_RATE, WEB_AUDIO_QUANTUM};
use resampler::{Attenuation, Latency, ResamplerFir, SampleRate};
use ringbuf::consumer::Consumer;
use ringbuf::storage::Heap;
use ringbuf::traits::{Observer, Producer, RingBuffer};
use ringbuf::LocalRb;
use std::convert::TryFrom;
use std::io::Cursor;
use symphonia::core::audio::Signal;
use symphonia::core::codecs::{Decoder, DecoderOptions};
use symphonia::core::errors::Error;
use symphonia::core::formats::{FormatOptions, FormatReader, SeekMode, SeekTo};
use symphonia::core::io::{MediaSource, MediaSourceStream};
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use symphonia::core::units::Time;
use wasm_bindgen::throw_str;

use crate::console_log;

pub const FRAME_BUFFER_SIZE: usize = 4096;

pub struct InterstellarResampler {
    sampler: ResamplerFir,
    input_buffer: Vec<f32>,
    output_buffer: Vec<f32>,
}

impl InterstellarResampler {
    pub fn new(original_rate: u32) -> InterstellarResampler {
        let sampler = ResamplerFir::new(
            2,
            SampleRate::try_from(original_rate).expect("Invalid sample rate"),
            SampleRate::try_from(AUDIO_SAMPLE_RATE).unwrap(),
            Latency::Sample64,
            Attenuation::Db90
        );

        let output_buffer = vec![0.0f32; sampler.buffer_size_output()];
        let input_buffer = vec![0.0f32; 8192 * 2];

        Self {
            sampler,
            input_buffer,
            output_buffer,
        }
    }
}

pub struct InterstellarMusic {
    pub file_name: String,
    pub hash: String,
    pub format: Box<dyn FormatReader>,
    pub decoder: Box<dyn Decoder>,
    pub track_id: u32,
    // Frame buffer is unprocessed buffers, which are played if no resampler is attached
    pub frame_buffer_left: LocalRb<Heap<f32>>,
    pub frame_buffer_right: LocalRb<Heap<f32>>,
    pub sampler: Option<InterstellarResampler>,
    pub playing: bool,
    pub active: bool,

    pub volume: f32,
    pub pause_time: Option<(u64, u64)>,
    pub length: u64,
    pub current_time: u64,
    pub started: bool,

    pub unloading: bool,
    pub unloaded: bool,

    pub average_buffer: f32
}

impl InterstellarMusic {
    pub fn new(name: String, hash: String, bytes: &[u8], start_time: f64) -> Self {
        // Load the bytes as a file to read in symphonia
        let owned = bytes.to_owned();
        let cursor = Cursor::new(owned);
        let source = MediaSourceStream::new(Box::new(cursor), Default::default());
        // Create a probe
        let hint = Hint::new();
        let format_opts: FormatOptions = Default::default();
        let metadata_opts: MetadataOptions = Default::default();
        let mut probed =
            symphonia::default::get_probe().format(&hint, source, &format_opts, &metadata_opts).unwrap();

        // Get format, usable track ids, and a decoder
        let mut current_time: u64 = 0;
        if start_time != 0.0 {
            console_log!("Seeking to {} in {} ({}, {})", start_time, name, start_time.trunc() as u64, start_time.fract());
            probed.format.seek(
                SeekMode::Accurate,
                SeekTo::Time { time: Time::new(start_time.trunc() as u64, start_time.fract()), track_id: None }
            ).expect("Failed to seek in song");
            current_time = (start_time * AUDIO_SAMPLE_RATE as f64) as u64;
        }
        let format = probed.format;
        let Some(track) = format.default_track() else { throw_str("File has no default track") };
        let track_id = track.id;
        let codec_params = track.codec_params.clone();
        let dec_opts: DecoderOptions = Default::default();
        let decoder = symphonia::default::get_codecs().make(&codec_params, &dec_opts)
            .expect("unsupported codec");
        let Some(sample_rate) = track.codec_params.sample_rate else {throw_str("Default track has no sample rate")};
        let Some(frames) = track.codec_params.n_frames else {throw_str("Default track has no frame count")};
        let length = frames;

        let frame_buffer_left: LocalRb<Heap<f32>> = LocalRb::new(FRAME_BUFFER_SIZE);
        let frame_buffer_right: LocalRb<Heap<f32>> = LocalRb::new(FRAME_BUFFER_SIZE);

        let mut sampler = None;
        if sample_rate != AUDIO_SAMPLE_RATE {
            console_log!("{} requires a resampler, {} -> {}", name, sample_rate, AUDIO_SAMPLE_RATE);
            sampler = Some(InterstellarResampler::new(sample_rate));
        }

        console_log!("Created a new music track with file {}", name);

        Self {
            hash,
            file_name: name.parse().unwrap(),
            format,
            decoder,
            track_id,
            frame_buffer_right,
            frame_buffer_left,
            playing: false,
            active: true,
            sampler,

            volume: 0.0,
            pause_time: None,
            current_time,
            length,
            started: false,

            unloading: false,
            unloaded: false,
            average_buffer: 0.0
        }
    }

    fn get_next_packet(&mut self) -> (Vec<f32>, Vec<f32>) {
        // Loop until we get a valid packet result
        loop {
            let format = &mut self.format;
            let decoder = &mut self.decoder;
            let packet = match format.next_packet() {
                Ok(p) => p,
                Err(_) => {
                    // Loop back to start because it is the end.
                    format.seek(
                        SeekMode::Accurate,
                        SeekTo::Time { time: Time::new(0, 0.0), track_id: None }
                    ).expect("Failed to seek in song");
                    decoder.reset();
                    continue;
                }
            };
            if packet.track_id() != self.track_id {
                continue;
            }

            match decoder.decode(&packet) {
                Ok(decoded) => {
                    let mut audio = decoded.make_equivalent::<f32>();
                    decoded.convert(&mut audio);
                    let left: Vec<f32> = audio.chan(0).to_vec();
                    let right: Vec<f32> = audio.chan(1).to_vec();
                    return (left, right);
                }
                Err(Error::IoError(_)) => {
                    continue;
                }
                Err(Error::DecodeError(_)) => {
                    continue
                }
                Err(err) => {
                    // An unrecoverable error occured, halt decoding.
                    panic!("{}", err);
                }
            }
        }
    }

    pub fn update_music(&mut self, left_result: &mut [f32], right_result: &mut [f32], global_volume: f32, time: u64) -> Option<f32> {
        if self.unloaded { throw_str("Attempted to update a unloaded music object"); }
        if self.active && self.volume < 1.0 {
            self.volume = f32::min(self.volume + ACTIVE_FADE_DELTA, 1.0);
        }
        else if !self.active && self.volume > 0.0 {
            self.volume = f32::max(self.volume - ACTIVE_FADE_DELTA, 0.0);
        }

        let master_volume = global_volume * self.volume;
        if master_volume == 0f32 {
            if self.unloading {
                self.unloaded = true;
                return None;
            }
            if self.pause_time.is_none() {
                self.average_buffer = 0.0;
                self.pause_time = Some((self.current_time, time));
                console_log!("Pausing {}!!", self.file_name);
            }
            // Tell the mixer to not mix us, we have no data
            return None;
        }
        if !self.playing {
            self.frame_buffer_left.clear();
            self.frame_buffer_right.clear();
            self.average_buffer = 0.0;
            if self.started {
                if let Some(pause_time) = self.pause_time {
                    let continue_time_samples = (pause_time.0 + (time - pause_time.1)) % self.length;
                    let continue_time = continue_time_samples as f64 / AUDIO_SAMPLE_RATE as f64;
                    self.format.seek(
                        SeekMode::Coarse,
                        SeekTo::Time { time: Time::new(continue_time.trunc() as u64, continue_time.fract()), track_id: None }
                    ).expect("Failed to seek in song");
                    self.current_time = continue_time_samples;
                    console_log!("Playing {} starting at {} ({} sec)", self.file_name, continue_time_samples, continue_time);
                }
            } else { self.started = true; }
            self.pause_time = None;
            self.playing = true;
        }

        if let Some(mut resampler) = self.sampler.take() {
            loop {
                if self.frame_buffer_left.occupied_len() >= WEB_AUDIO_QUANTUM {
                    break;
                }
                let (left, right) = self.get_next_packet();
                let frames = left.len();

                if resampler.input_buffer.len() < frames * 2 {
                    resampler.input_buffer.resize(frames * 2, 0.0);
                }
                for i in 0..frames {
                    resampler.input_buffer[i * 2] = left[i];
                    resampler.input_buffer[i * 2 + 1] = right[i];
                }
                let (_consumed, produced) = resampler.sampler.resample(
                    &resampler.input_buffer[..frames * 2],
                    &mut resampler.output_buffer
                ).unwrap();

                let output_frames = produced / 2;
                for i in 0..output_frames {
                    self.frame_buffer_left.push_overwrite(resampler.output_buffer[i * 2]);
                    self.frame_buffer_right.push_overwrite(resampler.output_buffer[i * 2 + 1]);
                }
            }
            self.sampler = Some(resampler);
            self.frame_buffer_left.pop_slice(left_result);
            self.frame_buffer_right.pop_slice(right_result);
        }
        else {
            let mut frame_buffer_length = self.frame_buffer_left.occupied_len();
            while frame_buffer_length < WEB_AUDIO_QUANTUM {
                let (left, right) = self.get_next_packet();
                let frames = left.len();
                if self.frame_buffer_left.vacant_len() < frames {throw_str("Buffer overflow")};
                self.frame_buffer_left.push_slice(left.as_slice());
                self.frame_buffer_right.push_slice(right.as_slice());
                frame_buffer_length = self.frame_buffer_left.occupied_len();
            }
            self.frame_buffer_left.pop_slice(left_result);
            self.frame_buffer_right.pop_slice(right_result);
        }
        self.average_buffer = self.average_buffer * 0.999 + self.frame_buffer_left.occupied_len() as f32 * 0.001;
        self.current_time += WEB_AUDIO_QUANTUM as u64;

        // return
        Some(master_volume)
    }
}