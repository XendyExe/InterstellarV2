use std::io::Cursor;
use audioadapter_buffers::direct::SequentialSlice;
use symphonia::core::audio::Signal;
use symphonia::core::codecs::{Decoder, DecoderOptions};
use symphonia::core::errors::Error;
use symphonia::core::formats::{FormatOptions, FormatReader, SeekMode, SeekTo};
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use symphonia::core::units::Time;
use ringbuf::{traits::*, LocalRb, HeapRb};
use ringbuf::storage::Heap;
use rubato::{Fft, FixedSync, Resampler};
use crate::AUDIO_SAMPLE_RATE;

#[derive(PartialEq)]
pub enum UpdateResult<T> {
    Retry,
    Two((T, T)),
    None
}

pub enum MusicCreateResult {
    Success(InterstellarMusic),
    Fail(String)
}

pub struct InterstellarResampler {
    // Buffer is what is read to be played
    pub buffer_left: LocalRb<Heap<f32>>,
    pub buffer_right: LocalRb<Heap<f32>>,
    pub resampler: Fft<f32>,
    pub resampler_input: [f32;PROCESS_CHUNK_SIZE * 2],
    pub resampler_output: [f32;PROCESS_CHUNK_SIZE * 2],
    pub input_adapter: SequentialSlice<& [f32]>,
    pub output_adapter: SequentialSlice<& mut [f32]>
}

pub struct InterstellarMusic {
    pub music_id: u32,
    pub file_name: String,
    pub format: Box<dyn FormatReader>,
    pub decoder: Box<dyn Decoder>,
    pub track_id: u32,
    // Frame buffer is unprocessed buffers, which are played if no resampler is attached
    pub frame_buffer_left: LocalRb<Heap<f32>>,
    pub frame_buffer_right: LocalRb<Heap<f32>>,
    pub next_update: UpdateResult<Vec<f32>>,
    pub playing: bool,
    pub active: bool,
    pub time: f32,
    pub resampler: Option<InterstellarResampler>
}

const FRAME_BUFFER_SIZE: usize = 4096;
const BUFFER_SIZE: usize = 4096;
const PROCESS_CHUNK_SIZE: usize = 1024;

pub fn create_music(music_id: u32, file_name: String, bytes: Vec<u8>) -> MusicCreateResult {
    // Load the bytes as a file to read in symphonia
    let cursor = Cursor::new(bytes);
    let source = MediaSourceStream::new(Box::new(cursor), Default::default());

    // Create a probe
    let hint = Hint::new();
    let format_opts: FormatOptions = Default::default();
    let metadata_opts: MetadataOptions = Default::default();
    let probed =
        symphonia::default::get_probe().format(&hint, source, &format_opts, &metadata_opts).unwrap();

    // Get format, usable track ids, and a decoder
    let format = probed.format;
    let Some(track) = format.default_track() else { return MusicCreateResult::Fail("File did not have a track".parse().unwrap())};
    let track_id = track.id;
    let codec_params = track.codec_params.clone();
    let dec_opts: DecoderOptions = Default::default();
    let decoder = symphonia::default::get_codecs().make(&codec_params, &dec_opts)
        .expect("unsupported codec");
    let Some(sample_rate) = track.codec_params.sample_rate else {return MusicCreateResult::Fail("Track doesn't have a sample rate".parse().unwrap())};

    // Create ringbuffers
    let frame_buffer_left: LocalRb<Heap<f32>> = LocalRb::new(FRAME_BUFFER_SIZE);
    let frame_buffer_right: LocalRb<Heap<f32>> = LocalRb::new(FRAME_BUFFER_SIZE);

    let mut resampler = None;
    if (sample_rate != AUDIO_SAMPLE_RATE) {
        let buffer_left: LocalRb<Heap<f32>> = LocalRb::new(BUFFER_SIZE);
        let buffer_right: LocalRb<Heap<f32>> = LocalRb::new(BUFFER_SIZE);
        let sampler = Fft::<f32>::new(sample_rate as usize, AUDIO_SAMPLE_RATE as usize, PROCESS_CHUNK_SIZE, 2, 2, FixedSync::Input).unwrap();


        let mut input: [f32;PROCESS_CHUNK_SIZE*2] = [0.0; PROCESS_CHUNK_SIZE*2];
        let mut output: [f32;PROCESS_CHUNK_SIZE*2] = [0.0; PROCESS_CHUNK_SIZE*2];
        let input_adapter = SequentialSlice::new(&input, 2, PROCESS_CHUNK_SIZE).unwrap();
        let output_adapter = SequentialSlice::new_mut(&mut output, 2, PROCESS_CHUNK_SIZE).unwrap();

        resampler = Some(InterstellarResampler {
            buffer_left,
            buffer_right,
            resampler_output: output,
            resampler_input: input,
            resampler: sampler,
            input_adapter,
            output_adapter
        });
    }

    // return result
    MusicCreateResult::Success(InterstellarMusic {
        music_id,
        file_name,
        format,
        decoder,
        track_id,
        frame_buffer_left,
        frame_buffer_right,
        resampler,
        next_update: UpdateResult::None,
        playing: false,
        active: false,
        time: 0.0
    })
}

fn update_music(music: &mut InterstellarMusic) -> UpdateResult<Vec<f32>> {
    let format = &mut music.format;
    let decoder = &mut music.decoder;
    let packet = match format.next_packet() {
        Ok(p) => p,
        Err(_) => {
            format.seek(
                SeekMode::Accurate,
                SeekTo::Time { time: Time::new(0, 0.0), track_id: None }
            ).expect("Failed to seek in song");
            decoder.reset();
            return UpdateResult::Retry;
        }
    };
    if packet.track_id() != music.track_id {
        return UpdateResult::Retry;
    }

    match decoder.decode(&packet) {
        Ok(decoded) => {
            let audio = decoded.make_equivalent::<f32>();
            let left: Vec<f32> = audio.chan(0).to_vec();
            let right: Vec<f32> = audio.chan(1).to_vec();
            UpdateResult::Two((left, right))
        }
        Err(Error::IoError(_)) => {
            UpdateResult::Retry
        }
        Err(Error::DecodeError(_)) => {
            UpdateResult::Retry
        }
        Err(err) => {
            // An unrecoverable error occured, halt decoding.
            panic!("{}", err);
        }
    }
}

/// Certainly pushes the next pcm into the music's ringbuffer and returns the occupied length of the ringbuffer
fn push_next_pcm(music: &mut InterstellarMusic) -> usize {
    let mut result: UpdateResult<Vec<f32>> = UpdateResult::Retry;
    while result != UpdateResult::Retry {
        result = update_music(music);
    }
    match result {
        UpdateResult::Retry => { panic!("Unreachable"); }
        UpdateResult::None => { panic!("Unreachable"); }
        UpdateResult::Two((left, right)) => {
            let frames = left.len();
            music.frame_buffer_left.push_slice(left.as_slice());
            music.frame_buffer_right.push_slice(right.as_slice());
            // return
            music.frame_buffer_left.occupied_len()
        }
    }
}

/// Certainly reprocesses frame buffer into correct sample rate, returning the length of the ringbuffer
fn resample_next_pcm(music: &mut InterstellarMusic) -> usize {
    if (music.frame_buffer_left.occupied_len() < PROCESS_CHUNK_SIZE) {
        panic!("Buffer underflow, attempted to resample pcm when not enough is able to be sampled.");
    }
    let Some(mut resampler) = music.resampler else { panic!("Music must have a resampler"); };
    music.frame_buffer_left.pop_slice(&mut resampler.process_left);
    music.frame_buffer_right.pop_slice(&mut resampler.process_right);
    resampler.resampler.process_into_buffer(&resampler.input_adapter, &mut resampler.output_adapter, None).unwrap();
    resampler.buffer_left.push_slice(&resampler.output_left);
    resampler.buffer_right.push_slice(&resampler.output_right);
    // return
    resampler.buffer_left.occupied_len()
}