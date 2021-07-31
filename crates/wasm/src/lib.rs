use std::io::Cursor;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(start)]
pub fn main_js() -> Result<(), JsValue> {
    // This provides better error messages in debug mode.
    // It's disabled in release mode so it doesn't bloat up the file size.
    #[cfg(debug_assertions)]
    console_error_panic_hook::set_once();

    Ok(())
}

#[wasm_bindgen]
pub struct Player {
    volume: f32,
    sink: rodio::Sink,
    #[allow(dead_code)]
    stream: rodio::OutputStream,
}

#[wasm_bindgen]
impl Player {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        let cur = Cursor::new(include_bytes!("./silent.flac"));
        let (stream, handle) = rodio::OutputStream::try_default().unwrap();
        let sink = rodio::Sink::try_new(&handle).unwrap();
        sink.set_volume(0.0);
        let decoder = rodio::Decoder::new(cur).unwrap();
        sink.append(decoder);
        sink.pause();
        Self {
            volume: 0.0,
            sink,
            stream,
        }
    }

    #[wasm_bindgen]
    pub fn load(&mut self, data: &[u8]) -> bool {
        if let Ok((stream, handle)) = rodio::OutputStream::try_default() {
            if let Ok(sink) = rodio::Sink::try_new(&handle) {
                self.sink = sink;
                self.stream = stream;
                self.sink.set_volume(self.volume);
                let cur = Cursor::new(data.to_owned());
                let decoder = rodio::Decoder::new(cur).unwrap();
                self.sink.append(decoder);
                return true;
            }
        }
        false
    }

    #[wasm_bindgen]
    pub fn play(&mut self) -> bool {
        if self.sink.empty() {
            false
        } else {
            self.sink.play();
            true
        }
    }

    #[wasm_bindgen]
    pub fn pause(&mut self) {
        self.sink.pause();
    }

    #[wasm_bindgen]
    pub fn stop(&mut self) {
        self.sink.stop();
    }

    #[wasm_bindgen]
    pub fn set_volume(&mut self, level: f32) {
        let level = level / 100.0;
        self.sink.set_volume(level);
        self.volume = level;
    }

    #[wasm_bindgen]
    pub fn empty(&self) -> bool {
        self.sink.empty()
    }
}
