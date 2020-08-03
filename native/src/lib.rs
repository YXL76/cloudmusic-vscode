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

pub struct Rodio {
    status: Status,
    sink: rodio::Sink,
}

impl Rodio {
    pub fn load(&mut self, url: &str) -> bool {
        match File::open(url) {
            Ok(file) => match rodio::Decoder::new(BufReader::new(file)) {
                Ok(source) => {
                    self.stop();
                    let device = rodio::default_output_device().unwrap();
                    self.sink = rodio::Sink::new(&device);
                    self.sink.append(source);
                    self.play();
                    true
                }
                _ => false,
            },
            _ => false,
        }
    }

    pub fn play(&mut self) {
        self.sink.play();
        self.status.play()
    }

    pub fn pause(&mut self) {
        self.sink.pause();
        self.status.stop()
    }

    pub fn stop(&mut self) {
        self.sink.stop();
        self.status.reset();
    }

    pub fn set_volume(&self, volume: f32) {
        self.sink.set_volume(volume);
    }

    pub fn is_paused(&self) -> bool {
        self.sink.is_paused()
    }

    pub fn empty(&self) -> bool {
        self.sink.empty()
    }

    pub fn position(&self) -> u128 {
        self.status.elapsed().as_millis()
    }
}

declare_types! {
    pub class JsRodio for Rodio {
        init(_) {
            let device = rodio::default_output_device().unwrap();
            let sink = rodio::Sink::new(&device);
            sink.pause();
            Ok(Rodio {
                status: Status::Stopped(Duration::from_nanos(0)),
                sink,
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
                match player.empty() {
                    false => {
                        player.play();
                        true
                    }
                    _ => false
                }
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
                let this = cx.this();
                let guard = cx.lock();
                let player = this.borrow(&guard);
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

register_module!(mut cx, { cx.export_class::<JsRodio>("Rodio") });
