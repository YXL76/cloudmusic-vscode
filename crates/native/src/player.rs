use {
    neon::prelude::*,
    rodio::{Decoder, OutputStream, OutputStreamHandle, PlayError, Sink, Source},
    std::{
        cell::RefCell,
        fs::File,
        io::BufReader,
        time::{Duration, Instant},
    },
};

enum Status {
    Playing(Instant, Duration),
    Stopped(Duration),
}

impl Status {
    #[inline]
    fn new() -> Status {
        Status::Stopped(Duration::from_nanos(0))
    }

    #[inline]
    fn elapsed(&self, speed: f64) -> f64 {
        match *self {
            Status::Stopped(d) => d.as_secs_f64(),
            Status::Playing(start, extra) => {
                start.elapsed().as_secs_f64() * speed + extra.as_secs_f64()
            }
        }
    }

    #[inline]
    fn stop(&mut self, speed: f64) {
        if let Status::Playing(start, extra) = *self {
            *self = Status::Stopped(start.elapsed().mul_f64(speed) + extra)
        }
    }

    #[inline]
    fn play(&mut self) {
        if let Status::Stopped(duration) = *self {
            *self = Status::Playing(Instant::now(), duration)
        }
    }

    #[inline]
    fn reset(&mut self) {
        *self = Status::Stopped(Duration::from_nanos(0));
    }

    #[inline]
    fn store(&mut self, speed: f64) {
        if let Status::Playing(start, extra) = *self {
            *self = Status::Playing(Instant::now(), start.elapsed().mul_f64(speed) + extra)
        }
    }

    #[inline]
    fn seek(&mut self, pos: Duration) {
        match self {
            Status::Stopped(d) => *d = pos,
            Status::Playing(start, extra) => {
                *start = Instant::now();
                *extra = pos;
            }
        }
    }
}

pub struct Player {
    speed: f64,
    volume: f32,
    status: Status,
    sink: Option<Sink>,
    #[allow(dead_code)]
    stream: OutputStream,
    handle: OutputStreamHandle,
}

// We can ensure the stream is `Sned`.
// https://github.com/RustAudio/cpal/commit/33ddf749548d87bf54ce18eb342f954cec1465b2
unsafe impl Send for Player {}

impl Finalize for Player {}

impl Player {
    #[inline]
    fn new() -> Self {
        #[cfg(target_os = "windows")]
        {
            use {
                std::ffi::CString,
                windows::{core::PCSTR, Win32::System::Threading::AvSetMmThreadCharacteristicsA},
            };

            let taskname = CString::new("Pro Audio").unwrap();
            let mut taskindex = 0u32;
            if let Err(err) = unsafe {
                AvSetMmThreadCharacteristicsA(
                    PCSTR::from_raw(taskname.as_ptr() as _),
                    &mut taskindex,
                )
            } {
                eprintln!("Cannot increase thread priority! {}", err)
            }
        }

        let (stream, handle) = OutputStream::try_default().unwrap();
        Self {
            speed: 1.,
            volume: 0.,
            status: Status::new(),
            sink: None,
            stream,
            handle,
        }
    }

    #[inline]
    fn load(&mut self, url: String, play: bool) -> bool {
        let file = match File::open(url) {
            Ok(f) => f,
            _ => return false,
        };

        let source = match Decoder::new(BufReader::new(file)) {
            Ok(s) => s.fade_in(Duration::from_secs(2)),
            _ => return false,
        };

        self.stop();

        let sink = match Sink::try_new(&self.handle) {
            Ok(sink) => sink,
            Err(PlayError::NoDevice) => {
                let (stream, handle) = OutputStream::try_default().unwrap();
                self.stream = stream;
                self.handle = handle;
                Sink::try_new(&self.handle).unwrap()
            }
            Err(PlayError::DecoderError(_)) => return false,
        };
        sink.set_speed(self.speed as f32);
        sink.set_volume(self.volume);
        sink.append(source);

        if play {
            self.status.play();
        } else {
            sink.pause()
        }
        self.sink = Some(sink);

        true
    }

    #[inline]
    fn play(&mut self) {
        if let Some(ref sink) = self.sink {
            sink.play();
            self.status.play()
        }
    }

    #[inline]
    fn pause(&mut self) {
        if let Some(ref sink) = self.sink {
            sink.pause();
            self.status.stop(self.speed);
        }
    }

    #[inline]
    fn stop(&mut self) {
        self.sink = None;
        self.status.reset()
    }

    #[inline]
    fn set_speed(&mut self, speed: f64) {
        if let Some(ref sink) = self.sink {
            sink.set_speed(speed as f32);
            self.status.store(self.speed);
        }
        self.speed = speed;
    }

    #[inline]
    fn set_volume(&mut self, level: f32) {
        if let Some(ref sink) = self.sink {
            sink.set_volume(level);
        }
        self.volume = level;
    }

    #[inline]
    fn empty(&self) -> bool {
        if let Some(ref sink) = self.sink {
            return sink.empty();
        }
        true
    }

    #[inline]
    fn position(&self) -> f64 {
        self.status.elapsed(self.speed)
    }

    #[inline]
    fn seek(&mut self, offset: f64) {
        if let Some(ref sink) = self.sink {
            if let Ok(pos) = Duration::try_from_secs_f64(self.position() + offset) {
                if let Ok(_) = sink.try_seek(pos) {
                    self.status.seek(pos);
                }
            }
        }
    }
}

pub fn player_new(mut cx: FunctionContext) -> JsResult<JsValue> {
    let player = RefCell::new(Player::new());

    Ok(cx.boxed(player).upcast())
}

pub fn player_load(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let player = cx.argument::<JsBox<RefCell<Player>>>(0)?;
    let url = cx.argument::<JsString>(1)?.value(&mut cx);
    let play = cx.argument::<JsBoolean>(2)?.value(&mut cx);
    let res = player.borrow_mut().load(url, play);

    Ok(cx.boolean(res))
}

pub fn player_play(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let player = cx.argument::<JsBox<RefCell<Player>>>(0)?;
    let mut player = player.borrow_mut();

    let res = match player.empty() {
        false => {
            player.play();
            true
        }
        _ => false,
    };

    Ok(cx.boolean(res))
}

pub fn player_pause(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let player = cx.argument::<JsBox<RefCell<Player>>>(0)?;
    player.borrow_mut().pause();

    Ok(cx.undefined())
}

pub fn player_stop(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let player = cx.argument::<JsBox<RefCell<Player>>>(0)?;
    player.borrow_mut().stop();

    Ok(cx.undefined())
}

pub fn player_set_speed(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let player = cx.argument::<JsBox<RefCell<Player>>>(0)?;
    let speed = cx.argument::<JsNumber>(1)?.value(&mut cx);
    player.borrow_mut().set_speed(speed);

    Ok(cx.undefined())
}

pub fn player_set_volume(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let player = cx.argument::<JsBox<RefCell<Player>>>(0)?;
    let level = cx.argument::<JsNumber>(1)?.value(&mut cx) / 100.0;
    player.borrow_mut().set_volume(level as f32);

    Ok(cx.undefined())
}

pub fn player_empty(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let player = cx.argument::<JsBox<RefCell<Player>>>(0)?;
    let res = player.borrow().empty();

    Ok(cx.boolean(res))
}

pub fn player_position(mut cx: FunctionContext) -> JsResult<JsNumber> {
    let player = cx.argument::<JsBox<RefCell<Player>>>(0)?;
    let res = player.borrow().position();

    Ok(cx.number(res))
}

pub fn player_seek(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let player = cx.argument::<JsBox<RefCell<Player>>>(0)?;
    let seek_offset = cx.argument::<JsNumber>(1)?.value(&mut cx);
    player.borrow_mut().seek(seek_offset);

    Ok(cx.undefined())
}
