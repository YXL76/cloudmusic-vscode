use {
    rodio::{Decoder, OutputStream, OutputStreamHandle, Sink},
    std::io::Cursor,
    wasm_bindgen::prelude::*,
};

#[wasm_bindgen(start)]
pub fn main_js() -> Result<(), JsValue> {
    // This provides better error messages in debug mode.
    // It's disabled in release mode so it doesn't bloat up the file size.
    // #[cfg(feature = "debug")]
    // console_error_panic_hook::set_once();

    Ok(())
}

#[wasm_bindgen]
pub struct Player {
    speed: f32,
    volume: f32,
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
        Self {
            speed: 1.,
            volume: 0.,
            sink: None,
            stream,
            handle,
        }
    }

    #[wasm_bindgen]
    pub fn load(&mut self, data: &[u8]) -> bool {
        self.sink = None;

        if let Ok(sink) = Sink::try_new(&self.handle) {
            sink.set_speed(self.speed);
            sink.set_volume(self.volume);
            let cur = Cursor::new(data.to_owned());
            let decoder = Decoder::new(cur).unwrap();
            sink.append(decoder);
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
            }
        }
        true
    }

    #[wasm_bindgen]
    pub fn pause(&mut self) {
        if let Some(ref sink) = self.sink {
            sink.pause();
        }
    }

    #[wasm_bindgen]
    pub fn stop(&mut self) {
        self.sink = None;
    }

    #[wasm_bindgen]
    pub fn set_speed(&mut self, speed: f32) {
        self.speed = speed;
        if let Some(ref sink) = self.sink {
            sink.set_speed(speed);
        }
    }

    #[wasm_bindgen]
    pub fn set_volume(&mut self, level: f32) {
        let level = level / 100.0;
        self.volume = level;
        if let Some(ref sink) = self.sink {
            sink.set_volume(level);
        }
    }

    #[wasm_bindgen]
    pub fn empty(&self) -> bool {
        if let Some(ref sink) = self.sink {
            sink.empty()
        } else {
            true
        }
    }
}
