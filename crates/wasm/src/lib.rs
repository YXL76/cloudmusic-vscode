use {
    rodio::{Decoder, OutputStream, OutputStreamHandle, Sink},
    std::io::Cursor,
    wasm_bindgen::prelude::*,
    web_sys::{console, window},
};

#[wasm_bindgen(start)]
pub fn main_js() -> Result<(), JsValue> {
    // This provides better error messages in debug mode.
    // It's disabled in release mode so it doesn't bloat up the file size.
    // #[cfg(feature = "debug")]
    // console_error_panic_hook::set_once();

    Ok(())
}

enum Status {
    Playing(f64, f64),
    Stopped(f64),
}

#[inline]
fn now() -> f64 {
    window().unwrap().performance().unwrap().now() / 1000.0
}

#[inline]
fn elapsed(old: f64) -> f64 {
    now() - old
}

impl Status {
    #[inline]
    fn new() -> Status {
        Status::Stopped(0.0)
    }

    #[inline]
    fn elapsed(&self, speed: f64) -> f64 {
        match *self {
            Status::Stopped(d) => d,
            Status::Playing(start, extra) => elapsed(start) * speed + extra,
        }
    }

    #[inline]
    fn stop(&mut self, speed: f64) {
        if let Status::Playing(start, extra) = *self {
            *self = Status::Stopped(elapsed(start) * speed + extra)
        }
    }

    #[inline]
    fn play(&mut self) {
        if let Status::Stopped(duration) = *self {
            *self = Status::Playing(now(), duration)
        }
    }

    #[inline]
    fn reset(&mut self) {
        *self = Status::Stopped(0.0);
    }

    #[inline]
    fn store(&mut self, speed: f64) {
        if let Status::Playing(start, extra) = *self {
            *self = Status::Playing(now(), elapsed(start) * speed + extra)
        }
    }
}

#[wasm_bindgen]
pub struct Player {
    speed: f64,
    volume: f32,
    status: Status,
    sink: Option<Sink>,
    #[allow(dead_code)]
    stream: OutputStream,
    handle: OutputStreamHandle,
}

impl Default for Player {
    fn default() -> Self {
        Self::new()
    }
}

#[wasm_bindgen]
impl Player {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        let (stream, handle) = OutputStream::try_default().unwrap();
        console::log_1(&"Audio Player: WASM".into());
        Self {
            speed: 1.,
            volume: 0.,
            status: Status::new(),
            sink: None,
            stream,
            handle,
        }
    }

    #[wasm_bindgen]
    pub fn load(&mut self, data: &[u8]) -> bool {
        self.sink = None;

        if let Ok(sink) = Sink::try_new(&self.handle) {
            sink.set_speed(self.speed as f32);
            sink.set_volume(self.volume);
            let cur = Cursor::new(data.to_owned());
            let decoder = Decoder::new(cur).unwrap();
            sink.append(decoder);
            self.status.play();
            self.sink = Some(sink);
            return true;
        }

        false
    }

    #[wasm_bindgen]
    pub fn play(&mut self) -> bool {
        if let Some(ref sink) = self.sink {
            if sink.empty() {
                return false;
            } else {
                sink.play();
                self.status.play()
            }
        }
        true
    }

    #[wasm_bindgen]
    pub fn pause(&mut self) {
        if let Some(ref sink) = self.sink {
            sink.pause();
            self.status.stop(self.speed);
        }
    }

    #[wasm_bindgen]
    pub fn stop(&mut self) {
        self.sink = None;
        self.status.reset()
    }

    #[wasm_bindgen]
    pub fn set_speed(&mut self, speed: f64) {
        if let Some(ref sink) = self.sink {
            sink.set_speed(speed as f32);
            self.status.store(self.speed);
        }
        self.speed = speed;
    }

    #[wasm_bindgen]
    pub fn set_volume(&mut self, level: f32) {
        if let Some(ref sink) = self.sink {
            sink.set_volume(level);
        }
        self.volume = level;
    }

    #[wasm_bindgen]
    pub fn empty(&self) -> bool {
        if let Some(ref sink) = self.sink {
            sink.empty()
        } else {
            true
        }
    }

    #[wasm_bindgen]
    pub fn position(&self) -> f64 {
        self.status.elapsed(self.speed)
    }

    #[wasm_bindgen]
    pub fn seek(&self, _: f64) {}
}
