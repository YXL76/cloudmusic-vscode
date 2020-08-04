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
static mut EMPTY: bool = true;
static mut DEVICE: Option<miniaudio::Device> = None;

pub struct Rodio {}
pub struct Miniaudio {}

declare_types! {
    pub class JsRodio for Rodio {
        init(_) {
            let device = rodio::default_output_device().unwrap();
            let s = rodio::Sink::new(&device);
            s.pause();
            unsafe  {
                STATUS.reset();
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
                            STATUS.reset();
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
            unsafe  {
                match &SINK {
                    Some(s) if !s.empty() => {
                        s.play();
                        STATUS.play();
                        Ok(cx.boolean(true).upcast())
                    },
                    _ => Ok(cx.boolean(false).upcast()),
                }
            }
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
                Ok(cx.number(STATUS.elapsed().as_millis() as f64 / 1000.0).upcast())
            }
        }
    }

    pub class JsMiniaudio for Miniaudio {
        init(_) {
            let config = miniaudio::DeviceConfig::new(miniaudio::DeviceType::Playback);
            let device = miniaudio::Device::new(None, &config).unwrap();
            unsafe  {
                STATUS.reset();
                EMPTY = true;
                DEVICE = Some(device);
            }
            Ok(Miniaudio {})
        }

        method load(mut cx) {
            let url: String = cx.argument::<JsString>(0)?.value();
            let res = {
                match miniaudio::Decoder::from_file(url, None) {
                    Ok(mut decoder) => {
                        let mut config = miniaudio::DeviceConfig::new(miniaudio::DeviceType::Playback);
                        config.playback_mut().set_format(decoder.output_format());
                        config
                            .playback_mut()
                            .set_channels(decoder.output_channels());
                        config.set_sample_rate(decoder.output_sample_rate());
                        match miniaudio::Device::new(None, &config) {
                            Ok(mut device) => unsafe {
                                device
                                    .set_data_callback(move |_device, output, _frames|  {
                                        if let Status::Playing(_, _) = STATUS   {
                                            if !EMPTY {
                                                let frames = decoder.read_pcm_frames(output);
                                                if frames == 0 {
                                                    EMPTY = true;
                                                }
                                            }
                                        }
                                    });
                                match device.start() {
                                    Ok(_) => {
                                        STATUS.reset();
                                        STATUS.play();
                                        EMPTY = false;
                                        DEVICE = Some(device);
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
            };
            Ok(cx.boolean(res).upcast())
        }

        method play(mut cx) {
            unsafe {
                match STATUS {
                    Status::Stopped(_) if !EMPTY => {
                        STATUS.play();
                        Ok(cx.boolean(true).upcast())
                    }
                    _ => Ok(cx.boolean(false).upcast()),
                }
            }
        }

        method pause(mut cx) {
            unsafe  {
                STATUS.stop();
            }
            Ok(cx.undefined().upcast())
        }

        method stop(mut cx) {
            unsafe  {
                if let Some(device) = &DEVICE {
                    device.stop().unwrap_or(());
                };
                STATUS.reset();
                EMPTY = true;
            }
            Ok(cx.undefined().upcast())
        }

        method setVolume(mut cx) {
            let level = cx.argument::<JsNumber>(0)?.value() / 100.0;
            unsafe  {
                if let Some(device) = &DEVICE {
                    device.set_master_volume(level as f32).unwrap_or(());
                };
            }
            Ok(cx.undefined().upcast())
        }

        method isPaused(mut cx) {
            unsafe  {
                match STATUS {
                    Status::Stopped(_) => Ok(cx.boolean(true).upcast()),
                    _ => Ok(cx.boolean(false).upcast())
                }
            }
        }

        method empty(mut cx) {
            unsafe  {
                Ok(cx.boolean(EMPTY).upcast())
            }
        }

        method position(mut cx) {
            unsafe {
                Ok(cx.number(STATUS.elapsed().as_millis() as f64 / 1000.0).upcast())
            }
        }
    }
}

register_module!(mut cx, {
    cx.export_class::<JsRodio>("Rodio")?;
    cx.export_class::<JsMiniaudio>("Miniaudio")
});
