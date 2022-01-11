use {
    neon::prelude::*,
    rodio::Source,
    std::{
        cell::RefCell,
        fs::File,
        io::BufReader,
        sync::mpsc,
        thread,
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
    fn elapsed(&self) -> Duration {
        match *self {
            Status::Stopped(d) => d,
            Status::Playing(start, extra) => start.elapsed() + extra,
        }
    }

    #[inline]
    fn stop(&mut self) {
        if let Status::Playing(start, extra) = *self {
            *self = Status::Stopped(start.elapsed() + extra)
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
}

#[derive(Clone)]
enum ControlEvent {
    Play,
    Pause,
    Stop,
    Volume(f32),
    Empty,
}

pub struct Player {
    volume: f32,
    status: Status,
    control_tx: mpsc::Sender<ControlEvent>,
    info_rx: mpsc::Receiver<bool>,
}

impl Finalize for Player {}

impl Player {
    #[inline]
    fn new() -> Self {
        let (control_tx, _) = mpsc::channel();
        let (_, info_rx) = mpsc::channel();
        Self {
            volume: 0.0,
            status: Status::new(),
            control_tx,
            info_rx,
        }
    }

    #[inline]
    fn load(&mut self, url: String) -> bool {
        let file = match File::open(url) {
            Ok(f) => f,
            _ => return false,
        };

        let source = match rodio::Decoder::new(BufReader::new(file)) {
            Ok(s) => s,
            _ => return false,
        };

        self.stop();
        let volume = self.volume;

        let (control_tx, control_rx) = mpsc::channel();
        let (info_tx, info_rx) = mpsc::channel();

        thread::spawn(move || {
            if let Ok((_stream, handle)) = rodio::OutputStream::try_default() {
                let sink = rodio::Sink::try_new(&handle).unwrap();
                sink.set_volume(volume);
                sink.append(source.fade_in(Duration::from_secs(2)));

                let _ = info_tx.send(true);

                while let Ok(ce) = control_rx.recv() {
                    match ce {
                        ControlEvent::Play => sink.play(),
                        ControlEvent::Pause => sink.pause(),
                        ControlEvent::Volume(level) => sink.set_volume(level),
                        ControlEvent::Empty => info_tx.send(sink.empty()).unwrap_or(()),
                        _ => break,
                    }
                }

                drop(sink);
            }
        });

        self.control_tx = control_tx;
        self.info_rx = info_rx;
        let _ = self.info_rx.recv();
        self.status.play();

        true
    }

    #[inline]
    fn play(&mut self) {
        let _ = self.control_tx.send(ControlEvent::Play);
        self.status.play()
    }

    #[inline]
    fn pause(&mut self) {
        let _ = self.control_tx.send(ControlEvent::Pause);
        self.status.stop()
    }

    #[inline]
    fn stop(&mut self) {
        let _ = self.control_tx.send(ControlEvent::Stop);
        self.status.reset()
    }

    #[inline]
    fn set_volume(&mut self, level: f32) {
        let _ = self.control_tx.send(ControlEvent::Volume(level));
        self.volume = level;
    }

    #[inline]
    fn empty(&self) -> bool {
        if self.control_tx.send(ControlEvent::Empty).is_ok() {
            if let Ok(res) = self.info_rx.recv_timeout(Duration::from_millis(128)) {
                return res;
            }
        }
        true
    }

    #[inline]
    fn position(&self) -> f64 {
        self.status.elapsed().as_secs_f64()
    }
}

pub fn player_new(mut cx: FunctionContext) -> JsResult<JsValue> {
    let player = RefCell::new(Player::new());

    Ok(cx.boxed(player).upcast())
}

pub fn player_load(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let player = cx.argument::<JsBox<RefCell<Player>>>(0)?;
    let url = cx.argument::<JsString>(1)?.value(&mut cx);
    let res = player.borrow_mut().load(url);

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
