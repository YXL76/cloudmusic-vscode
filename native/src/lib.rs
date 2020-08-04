use neon::prelude::*;
use std::fs::File;
use std::io::BufReader;
use std::time::{Duration, Instant};

enum Status {
    Playing(Instant, Duration),
    Stopped(Duration),
}

impl Status {
    fn elapsed(&self) -> Duration {
        match *self {
            Status::Stopped(d) => d,
            Status::Playing(start, extra) => start.elapsed() + extra,
        }
    }

    fn stop(&mut self) {
        if let Status::Playing(start, extra) = *self {
            *self = Status::Stopped(start.elapsed() + extra)
        }
    }

    fn play(&mut self) {
        if let Status::Stopped(duration) = *self {
            *self = Status::Playing(Instant::now(), duration)
        }
    }

    fn reset(&mut self) {
        *self = Status::Stopped(Duration::from_nanos(0));
    }
}

static mut STATUS: Status = Status::Stopped(Duration::from_nanos(0));
static mut SINK: Option<rodio::Sink> = None;

pub struct Rodio {}

declare_types! {
    pub class JsRodio for Rodio {
        init(_) {
            let device = rodio::default_output_device().unwrap();
            let s = rodio::Sink::new(&device);
            s.pause();
            unsafe  {
                SINK = Some(s);
            }
            Ok(Rodio {})
        }

        method load(mut cx) {
            let url: String = cx.argument::<JsString>(0)?.value();
            let res = {
                match File::open(url) {
                    Ok(file) => match rodio::Decoder::new(BufReader::new(file)) {
                        Ok(source) => unsafe {
                            if let Some(s) = &SINK {
                                s.stop();
                            }
                            let device = rodio::default_output_device().unwrap();
                            let s = rodio::Sink::new(&device);
                            s.append(source);
                            s.play();
                            STATUS.play();
                            SINK = Some(s);
                            true
                        }
                        _ => false,
                    },
                    _ => false,
                }
            };
            Ok(cx.boolean(res).upcast())
        }

        method play(mut cx) {
            let res = unsafe  {
                match &SINK {
                    Some(s) if !s.empty() => {
                        s.play();
                        true
                    },
                    _ => false
                }
            };
            Ok(cx.boolean(res).upcast())
        }

        method pause(mut cx) {
            unsafe  {
                if let Some(s) = &SINK {
                    s.pause();
                };
                STATUS.stop();
            }
            Ok(cx.undefined().upcast())
        }

        method stop(mut cx) {
            unsafe  {
                if let Some(s) = &SINK {
                    s.stop();
                };
                STATUS.reset();
            }
            Ok(cx.undefined().upcast())
        }

        method setVolume(mut cx) {
            let level = cx.argument::<JsNumber>(0)?.value() / 100.0;
            unsafe  {
                if let Some(s) = &SINK {
                    s.set_volume(level as f32);
                };
            }
            Ok(cx.undefined().upcast())
        }

        method isPaused(mut cx) {
            unsafe  {
                match &SINK {
                    Some(s) => Ok(cx.boolean(s.is_paused()).upcast()),
                    _ => Ok(cx.boolean(true).upcast())
                }
            }
        }

        method empty(mut cx) {
            unsafe  {
                match &SINK {
                    Some(s) => Ok(cx.boolean(s.empty()).upcast()),
                    _ => Ok(cx.boolean(false).upcast())
                }
            }
        }

        method position(mut cx) {
            unsafe {
                Ok(cx.number(STATUS.elapsed().as_millis() as f64).upcast())
            }
        }
    }
}

static mut PLAYING: bool = false;

pub struct Miniaudio {
    status: Status,
    device: miniaudio::Device,
}

impl Miniaudio {
    pub fn load(&mut self, url: &str) -> bool {
        match miniaudio::Decoder::from_file(url, None) {
            Ok(mut decoder) => {
                let mut config = miniaudio::DeviceConfig::new(miniaudio::DeviceType::Playback);
                config.playback_mut().set_format(decoder.output_format());
                config
                    .playback_mut()
                    .set_channels(decoder.output_channels());
                config.set_sample_rate(decoder.output_sample_rate());
                match miniaudio::Device::new(None, &config) {
                    Ok(device) => {
                        self.device = device;
                        self.device
                            .set_data_callback(move |_device, output, _frames| unsafe {
                                if PLAYING {
                                    let frames = decoder.read_pcm_frames(output);
                                    if frames == 0 {
                                        PLAYING = false;
                                    }
                                }
                            });
                        match self.device.start() {
                            Ok(_) => {
                                self.status.reset();
                                self.play();
                                true
                            }
                            _ => false,
                        }
                    }
                    _ => false,
                }
            }
            _ => false,
        }
    }

    pub fn play(&mut self) -> bool {
        match self.status {
            Status::Stopped(_) => {
                unsafe { PLAYING = true }
                self.status.play();
                true
            }
            _ => false,
        }
    }

    pub fn pause(&mut self) {
        unsafe { PLAYING = false }
        self.status.stop()
    }

    pub fn stop(&mut self) {
        unsafe { PLAYING = false }
        self.device.stop().unwrap_or(());
        self.status.reset();
    }

    pub fn set_volume(&self, volume: f32) {
        self.device.set_master_volume(volume).unwrap_or(());
    }

    pub fn is_paused(&self) -> bool {
        match self.status {
            Status::Stopped(_) => true,
            _ => false,
        }
    }

    pub fn empty(&mut self) -> bool {
        unsafe {
            if !PLAYING {
                self.status.stop();
            }
            !PLAYING
        }
    }

    pub fn position(&self) -> u128 {
        self.status.elapsed().as_millis()
    }
}

declare_types! {
    pub class JsMiniaudio for Miniaudio {
        init(_) {
            let config = miniaudio::DeviceConfig::new(miniaudio::DeviceType::Playback);
            let device = miniaudio::Device::new(None, &config).unwrap();
            Ok(Miniaudio {
                status: Status::Stopped(Duration::from_nanos(0)),
                device,
            })
        }

        method load(mut cx) {
            let url: String = cx.argument::<JsString>(0)?.value();
            let res = {
                let mut this = cx.this();
                let guard = cx.lock();
                let mut player = this.borrow_mut(&guard);
                player.load(&url)
            };
            Ok(cx.boolean(res).upcast())
        }

        method play(mut cx) {
            let res = {
                let mut this = cx.this();
                let guard = cx.lock();
                let mut player = this.borrow_mut(&guard);
                player.play()
            };
            Ok(cx.boolean(res).upcast())
        }

        method pause(mut cx) {
            {
                let mut this = cx.this();
                let guard = cx.lock();
                let mut player = this.borrow_mut(&guard);
                player.pause();
            };
            Ok(cx.undefined().upcast())
        }

        method stop(mut cx) {
            {
                let mut this = cx.this();
                let guard = cx.lock();
                let mut player = this.borrow_mut(&guard);
                player.stop();
            };
            Ok(cx.undefined().upcast())
        }

        method setVolume(mut cx) {
            let level = cx.argument::<JsNumber>(0)?.value() / 100.0;
            {
                let this = cx.this();
                let guard = cx.lock();
                let player = this.borrow(&guard);
                player.set_volume(level as f32);
            };
            Ok(cx.undefined().upcast())
        }

        method isPaused(mut cx) {
            let res = {
                let this = cx.this();
                let guard = cx.lock();
                let player = this.borrow(&guard);
                player.is_paused()
            };
            Ok(cx.boolean(res).upcast())
        }

        method empty(mut cx) {
            let res = {
                let mut this = cx.this();
                let guard = cx.lock();
                let mut player = this.borrow_mut(&guard);
                player.empty()
            };
            Ok(cx.boolean(res).upcast())
        }

        method position(mut cx) {
            let res = {
                let this = cx.this();
                let guard = cx.lock();
                let player = this.borrow(&guard);
                player.position()
            };
            Ok(cx.number(res as f64).upcast())
        }
    }
}

register_module!(mut cx, {
    cx.export_class::<JsRodio>("Rodio")?;
    cx.export_class::<JsMiniaudio>("Miniaudio")
});
