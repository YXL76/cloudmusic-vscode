use cfg_if::cfg_if;
use neon::prelude::*;
use std::{
    fs::File,
    io::{BufReader, Write},
    sync::{mpsc, Arc, Mutex},
    thread,
    time::{Duration, Instant},
};

/*use std::{
    io::{Read, Seek, SeekFrom},
    mem,
};*/

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
enum ControlEvrnt {
    Play,
    Pause,
    Stop,
    Volume(f32),
    Empty,
}

pub struct Rodio {
    status: Status,
    control_tx: mpsc::Sender<ControlEvrnt>,
    info_rx: mpsc::Receiver<bool>,
}

impl Rodio {
    #[inline]
    pub fn load(&mut self, url: &str) -> bool {
        if let Ok(file) = File::open(url) {
            if let Ok(source) = rodio::Decoder::new(BufReader::new(file)) {
                self.stop();

                let (control_tx, control_rx) = mpsc::channel();
                let (info_tx, info_rx) = mpsc::channel();

                thread::spawn(move || {
                    let (_stream, handle) = rodio::OutputStream::try_default().unwrap();
                    let sink = rodio::Sink::try_new(&handle).unwrap();
                    sink.append(source);
                    let _ = info_tx.send(true);
                    loop {
                        match control_rx.recv() {
                            Ok(ControlEvrnt::Play) => sink.play(),
                            Ok(ControlEvrnt::Pause) => sink.pause(),
                            Ok(ControlEvrnt::Volume(level)) => sink.set_volume(level),
                            Ok(ControlEvrnt::Empty) => {
                                let _ = info_tx.send(sink.empty());
                            }
                            _ => {
                                drop(sink);
                                break;
                            }
                        }
                    }
                });

                self.control_tx = control_tx;
                self.info_rx = info_rx;
                let _ = self.info_rx.recv();
                self.status.play();
                return true;
            }
        }
        false
    }

    #[inline]
    pub fn play(&mut self) {
        let _ = self.control_tx.send(ControlEvrnt::Play);
        self.status.play()
    }

    #[inline]
    pub fn pause(&mut self) {
        let _ = self.control_tx.send(ControlEvrnt::Pause);
        self.status.stop()
    }

    #[inline]
    pub fn stop(&mut self) {
        let _ = self.control_tx.send(ControlEvrnt::Stop);
        self.status.reset()
    }

    #[inline]
    pub fn set_volume(&self, level: f32) {
        let _ = self.control_tx.send(ControlEvrnt::Volume(level));
    }

    #[inline]
    pub fn empty(&self) -> bool {
        if let Ok(_) = self.control_tx.send(ControlEvrnt::Empty) {
            if let Ok(res) = self.info_rx.recv_timeout(Duration::from_millis(128)) {
                return res;
            }
        }
        true
    }

    #[inline]
    pub fn position(&self) -> u128 {
        self.status.elapsed().as_millis()
    }
}

declare_types! {
    pub class JsRodio for Rodio {
        init(_) {
            let (_stream, handle) = rodio::OutputStream::try_default().unwrap();
            let _ = rodio::Sink::try_new(&handle).unwrap();
            let (control_tx, _) = mpsc::channel();
            let (_, info_rx) = mpsc::channel();
            Ok(Rodio {
                status: Status::new(),
                control_tx,
                info_rx,
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
            Ok(cx.number(res as f64 / 1000.0).upcast())
        }
    }
}

pub struct Miniaudio {
    status: Arc<Mutex<Status>>,
    empty: Arc<Mutex<bool>>,
    volume: Arc<Mutex<f32>>,
}

impl Miniaudio {
    #[inline]
    pub fn load(&mut self, url: &str) -> bool {
        if let Ok(mut decoder) = miniaudio::Decoder::from_file(url, None) {
            self.status.lock().unwrap().reset();
            *self.empty.lock().unwrap() = true;

            let status = self.status.clone();
            let empty = self.empty.clone();
            let volume = self.volume.clone();

            let (tx, rx) = mpsc::channel();

            thread::spawn(move || {
                let mut config = miniaudio::DeviceConfig::new(miniaudio::DeviceType::Playback);
                config.playback_mut().set_format(decoder.output_format());
                config
                    .playback_mut()
                    .set_channels(decoder.output_channels());
                config.set_sample_rate(decoder.output_sample_rate());

                if let Ok(mut device) = miniaudio::Device::new(None, &config) {
                    let status_cb = status.clone();
                    let empty_cb = empty.clone();
                    device.set_data_callback(move |_device, output, _frames| {
                        if let Status::Playing(_, _) = *status_cb.lock().unwrap() {
                            if !(*empty_cb.lock().unwrap()) {
                                let frames = decoder.read_pcm_frames(output);
                                if frames == 0 {
                                    *empty_cb.lock().unwrap() = true;
                                }
                            }
                        }
                    });
                    thread::sleep(Duration::from_secs(1));
                    if let Ok(_) = device.start() {
                        let _ = tx.send(true);
                        *empty.lock().unwrap() = false;
                        status.lock().unwrap().play();
                        while !(*empty.lock().unwrap()) {
                            device
                                .set_master_volume(*volume.lock().unwrap())
                                .unwrap_or(());
                            thread::sleep(Duration::from_secs(1));
                        }
                    }
                }
            });

            if let Ok(true) = rx.recv() {
                return true;
            }
        }
        false
    }

    #[inline]
    pub fn play(&self) -> bool {
        match *self.status.lock().unwrap() {
            Status::Stopped(_) => {
                self.status.lock().unwrap().play();
                true
            }
            _ => false,
        }
    }

    #[inline]
    pub fn pause(&self) {
        self.status.lock().unwrap().stop()
    }

    #[inline]
    pub fn stop(&self) {
        self.status.lock().unwrap().reset();
        *self.empty.lock().unwrap() = true;
        *self.volume.lock().unwrap() = 0.0;
    }

    #[inline]
    pub fn set_volume(&self, level: f32) {
        *self.volume.lock().unwrap() = level;
    }

    #[inline]
    pub fn empty(&self) -> bool {
        *self.empty.lock().unwrap()
    }

    #[inline]
    pub fn position(&self) -> u128 {
        self.status.lock().unwrap().elapsed().as_millis()
    }
}

declare_types! {
    pub class JsMiniaudio for Miniaudio {
        init(_) {
            let config = miniaudio::DeviceConfig::new(miniaudio::DeviceType::Playback);
            let _ = miniaudio::Device::new(None, &config).unwrap();
            Ok(Miniaudio {
                status: Arc::new(Mutex::new(Status::new())),
                empty: Arc::new(Mutex::new(true)),
                volume: Arc::new(Mutex::new(85.0)),
            })
        }

        method load(mut cx) {
            let url = cx.argument::<JsString>(0)?.value();
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
                let this = cx.this();
                let guard = cx.lock();
                let player = this.borrow(&guard);
                player.play()
            };
            Ok(cx.boolean(res).upcast())
        }

        method pause(mut cx) {
            {
                let this = cx.this();
                let guard = cx.lock();
                let player = this.borrow(&guard);
                player.pause();
            };
            Ok(cx.undefined().upcast())
        }

        method stop(mut cx) {
            {
                let this = cx.this();
                let guard = cx.lock();
                let player = this.borrow(&guard);
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
            Ok(cx.number(res as f64 / 1000.0).upcast())
        }
    }
}

/* fn mpv_open(_: &mut (), uri: &str) -> File {
    File::open(&uri[13..]).unwrap()
}

fn mpv_close(_: Box<File>) {
    unsafe { self.empty = true }
}

fn mpv_read(cookie: &mut File, buf: &mut [i8]) -> i64 {
    unsafe {
        let forbidden_magic = mem::transmute::<&mut [i8], &mut [u8]>(buf);
        cookie.read(forbidden_magic).unwrap() as _
    }
}

fn mpv_seek(cookie: &mut File, offset: i64) -> i64 {
    cookie.seek(SeekFrom::Start(offset as u64)).unwrap() as _
}

fn mpv_size(cookie: &mut File) -> i64 {
    cookie.metadata().unwrap().len() as _
}

pub struct Libmpv {
    mpv: libmpv::Mpv,
}

impl Libmpv {
    pub fn load(&mut self, url: &str) -> bool {
        let path = format!("filereader://{}", url);
        match self
            .mpv
            .playlist_load_files(&[(&path, libmpv::FileState::Replace, None)])
        {
            Ok(_) => {
                unsafe {
                    self.status.reset();
                    self.empty = false;
                }
                self.play();
                true
            }
            _ => false,
        }
    }

    pub fn play(&mut self) -> bool {
        unsafe {
            match self.status {
                Status::Stopped(_) => match self.mpv.unpause() {
                    Ok(_) => {
                        self.status.play();
                        true
                    }
                    _ => false,
                },
                _ => false,
            }
        }
    }

    pub fn pause(&mut self) {
        self.mpv.pause().unwrap_or(());
        unsafe { self.status.stop() }
    }

    pub fn stop(&mut self) {
        unsafe {
            self.status.reset();
            self.empty = true;
        }
        self.mpv.playlist_remove_current().unwrap_or(());
    }

    pub fn set_volume(&self, volume: i64) {
        self.mpv.set_property("volume", volume).unwrap_or(());
    }

    pub fn empty(&mut self) -> bool {
        unsafe { self.empty }
    }

    pub fn position(&self) -> u128 {
        unsafe { self.status.elapsed().as_millis() }
    }
}

declare_types! {
    pub class JsLibmpv for Libmpv {
        init(_) {
            let protocol = unsafe {
                libmpv::protocol::Protocol::new(
                    "filereader".into(),
                    (),
                    mpv_open,
                    mpv_close,
                    mpv_read,
                    Some(mpv_seek),
                    Some(mpv_size),
                )
            };
            let mpv = libmpv::Mpv::new().unwrap();
            let proto_ctx = mpv.create_protocol_context();
            proto_ctx.register(protocol).unwrap();
            unsafe  {
                self.status.reset();
                self.empty = true;
            }
            Ok(Libmpv {
                mpv,
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
            let level = cx.argument::<JsNumber>(0)?.value();
            {
                let this = cx.this();
                let guard = cx.lock();
                let player = this.borrow(&guard);
                player.set_volume(level as i64);
            };
            Ok(cx.undefined().upcast())
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
            Ok(cx.number(res as f64 / 1000.0).upcast())
        }
    }
}*/

pub fn start_keyboard_event(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let this = cx.this();
    let func = cx.argument::<JsFunction>(0)?;
    let cb = EventHandler::new(&cx, this, func);
    thread::spawn(move || {
        cfg_if! {
            if #[cfg(target_os = "linux")] {
                use std::ptr;
                use std::slice::from_raw_parts;
                use x11::xlib::{XOpenDisplay, XQueryKeymap};

                unsafe {
                    let keys = [5, 4, 3];
                    let mut flag;
                    let mut prev_key = 0;
                    let disp = XOpenDisplay(ptr::null());
                    let keymap: *mut i8 = [0; 32].as_mut_ptr();

                    loop {
                        thread::sleep(Duration::from_millis(32));
                        XQueryKeymap(disp, keymap);
                        let b = from_raw_parts(keymap, 32)[21];

                        flag = false;
                        for key in keys.iter() {
                            if b & 1 << *key != 0 {
                                if prev_key != *key {
                                    prev_key = *key;
                                    let arg = match *key {
                                        5 => "prev",
                                        4 => "play",
                                        _ => "next",
                                    };
                                    cb.schedule(move |cx| {
                                        let args: Vec<Handle<JsValue>> =
                                            vec![cx.string(arg).upcast()];
                                        args
                                    });
                                }
                                flag = true;
                                break;
                            }
                        }
                        if !flag {
                            prev_key = 0;
                        }
                    }
                }
            } else if #[cfg(target_os = "windows")] {
                use winapi::um::winuser::GetAsyncKeyState;

                let keys = [177, 179, 176];
                let mut flag;
                let mut prev_key = 0;

                loop {
                    thread::sleep(Duration::from_millis(32));

                    flag = false;
                    for key in keys.iter() {
                        unsafe {
                            let state = GetAsyncKeyState(*key);
                            if state & -32768 != 0 {
                                if prev_key != *key {
                                    prev_key = *key;
                                    let arg = match *key {
                                        177 => "prev",
                                        179 => "play",
                                        _ => "next",
                                    };
                                    cb.schedule(move |cx| {
                                        let args: Vec<Handle<JsValue>> =
                                            vec![cx.string(arg).upcast()];
                                        args
                                    });
                                }
                                flag = true;
                                break;
                            }
                        }
                    }
                    if !flag {
                        prev_key = 0;
                    }
                }
            } else if #[cfg(target_os = "macos")] {
                extern "C" {
                    fn CGEventSourceKeyState(state: i32, keycode: u16) -> bool;
                }

                let keys = [98, 100, 101];
                let mut flag;
                let mut prev_key = 0;

                loop {
                    thread::sleep(Duration::from_millis(32));

                    flag = false;
                    for key in keys.iter() {
                        unsafe {
                            if CGEventSourceKeyState(0, *key) {
                                if prev_key != *key {
                                    prev_key = *key;
                                    let arg = match *key {
                                        98 => "prev",
                                        100 => "play",
                                        _ => "next",
                                    };
                                    cb.schedule(move |cx| {
                                        let args: Vec<Handle<JsValue>> = vec![cx.string(arg).upcast()];
                                        args
                                    });
                                }
                                flag = true;
                                break;
                            }
                        }
                    }
                    if !flag {
                        prev_key = 0;
                    }
                }
            }
        }
    });
    Ok(cx.undefined())
}

struct DownloadTask {
    url: String,
    path: String,
}

impl Task for DownloadTask {
    type Output = bool;
    type Error = String;
    type JsEvent = JsBoolean;

    fn perform(&self) -> Result<bool, String> {
        let mut handle = curl::easy::Easy::new();
        if let Ok(_) = handle.url(&self.url) {
            let mut file = File::create(&self.path).unwrap();
            {
                let mut transfer = handle.transfer();
                transfer
                    .write_function(|data| {
                        file.write_all(&data).unwrap();
                        Ok(data.len())
                    })
                    .unwrap();
                let _ = transfer.perform();
            }
            if let Ok(http_code) = handle.response_code() {
                if http_code == 200 {
                    return Ok(true);
                }
            }
        }
        Ok(false)
    }

    fn complete(self, mut cx: TaskContext, result: Result<bool, String>) -> JsResult<JsBoolean> {
        if let Ok(true) = result {
            return Ok(cx.boolean(true));
        }
        Ok(cx.boolean(false))
    }
}

pub fn download(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let url = cx.argument::<JsString>(0)?.value();
    let path = cx.argument::<JsString>(1)?.value();
    let cb = cx.argument::<JsFunction>(2)?;
    let task = DownloadTask { url, path };
    task.schedule(cb);
    Ok(cx.undefined())
}

register_module!(mut cx, {
    cx.export_class::<JsRodio>("Rodio")?;
    cx.export_class::<JsMiniaudio>("Miniaudio")?;
    // cx.export_class::<JsLibmpv>("Libmpv")?;
    cx.export_function("startKeyboardEvent", start_keyboard_event)?;
    cx.export_function("download", download)
});
