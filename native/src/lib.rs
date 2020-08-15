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

static mut STATUS: Status = Status::Stopped(Duration::from_nanos(0));

#[derive(Clone)]
enum ControlEvrnt {
    Play,
    Pause,
    Stop,
    Volume(f32),
    Empty,
}

pub struct Rodio {
    control_tx: mpsc::Sender<ControlEvrnt>,
    info_rx: mpsc::Receiver<bool>,
}

impl Rodio {
    #[inline]
    pub fn load(&mut self, url: &str) -> bool {
        match File::open(url) {
            Ok(file) => match rodio::Decoder::new(BufReader::new(file)) {
                Ok(source) => {
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
                    unsafe {
                        STATUS.play();
                    }
                    true
                }
                _ => false,
            },
            _ => false,
        }
    }

    #[inline]
    pub fn play(&self) {
        let _ = self.control_tx.send(ControlEvrnt::Play);
        unsafe { STATUS.play() }
    }

    #[inline]
    pub fn pause(&self) {
        let _ = self.control_tx.send(ControlEvrnt::Pause);
        unsafe { STATUS.stop() }
    }

    #[inline]
    pub fn stop(&self) {
        let _ = self.control_tx.send(ControlEvrnt::Stop);
        unsafe { STATUS.reset() }
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
        unsafe { STATUS.elapsed().as_millis() }
    }
}

declare_types! {
    pub class JsRodio for Rodio {
        init(_) {
            let (control_tx, _) = mpsc::channel();
            let (_, info_rx) = mpsc::channel();
            Ok(Rodio {
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
                let this = cx.this();
                let guard = cx.lock();
                let player = this.borrow(&guard);
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

static mut EMPTY: bool = true;

pub struct Miniaudio {
    device: miniaudio::Device,
}

impl Miniaudio {
    #[inline]
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
                                if let Status::Playing(_, _) = STATUS {
                                    if !EMPTY {
                                        let frames = decoder.read_pcm_frames(output);
                                        if frames == 0 {
                                            EMPTY = true;
                                        }
                                    }
                                }
                            });
                        match self.device.start() {
                            Ok(_) => {
                                unsafe {
                                    STATUS.reset();
                                    EMPTY = false;
                                }
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

    #[inline]
    pub fn play(&self) -> bool {
        unsafe {
            match STATUS {
                Status::Stopped(_) => {
                    STATUS.play();
                    true
                }
                _ => false,
            }
        }
    }

    #[inline]
    pub fn pause(&self) {
        unsafe { STATUS.stop() }
    }

    #[inline]
    pub fn stop(&self) {
        unsafe {
            STATUS.reset();
            EMPTY = true;
        }
        self.device.stop().unwrap_or(());
    }

    #[inline]
    pub fn set_volume(&self, volume: f32) {
        self.device.set_master_volume(volume).unwrap_or(());
    }

    #[inline]
    pub fn empty(&self) -> bool {
        unsafe { EMPTY }
    }

    #[inline]
    pub fn position(&self) -> u128 {
        unsafe { STATUS.elapsed().as_millis() }
    }
}

declare_types! {
    pub class JsMiniaudio for Miniaudio {
        init(_) {
            let config = miniaudio::DeviceConfig::new(miniaudio::DeviceType::Playback);
            let device = miniaudio::Device::new(None, &config).unwrap();
            unsafe  {
                STATUS.reset();
                EMPTY = true;
            }
            Ok(Miniaudio {
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
    unsafe { EMPTY = true }
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
                    STATUS.reset();
                    EMPTY = false;
                }
                self.play();
                true
            }
            _ => false,
        }
    }

    pub fn play(&mut self) -> bool {
        unsafe {
            match STATUS {
                Status::Stopped(_) => match self.mpv.unpause() {
                    Ok(_) => {
                        STATUS.play();
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
        unsafe { STATUS.stop() }
    }

    pub fn stop(&mut self) {
        unsafe {
            STATUS.reset();
            EMPTY = true;
        }
        self.mpv.playlist_remove_current().unwrap_or(());
    }

    pub fn set_volume(&self, volume: i64) {
        self.mpv.set_property("volume", volume).unwrap_or(());
    }

    pub fn empty(&mut self) -> bool {
        unsafe { EMPTY }
    }

    pub fn position(&self) -> u128 {
        unsafe { STATUS.elapsed().as_millis() }
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
                STATUS.reset();
                EMPTY = true;
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

pub enum KeyboardEvent {
    Prev,
    Play,
    Next,
}

#[cfg(target_os = "linux")]
use std::ptr;
#[cfg(target_os = "linux")]
use std::slice::from_raw_parts;
#[cfg(target_os = "linux")]
use x11::xlib::{XOpenDisplay, XQueryKeymap};

#[cfg(target_os = "linux")]
fn keyboard_event_thread() -> mpsc::Receiver<KeyboardEvent> {
    let (tx, events_rx) = mpsc::channel();

    thread::spawn(move || unsafe {
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
                        match *key {
                            5 => {
                                tx.send(KeyboardEvent::Prev).unwrap_or(());
                            }
                            4 => {
                                tx.send(KeyboardEvent::Play).unwrap_or(());
                            }
                            3 => {
                                tx.send(KeyboardEvent::Next).unwrap_or(());
                            }
                            _ => {}
                        }
                    }
                    flag = true;
                    break;
                }
            }
            if !flag {
                prev_key = 0;
            }
        }
    });

    events_rx
}

#[cfg(target_os = "windows")]
use winapi::um::winuser::GetAsyncKeyState;

#[cfg(target_os = "windows")]
fn keyboard_event_thread() -> mpsc::Receiver<KeyboardEvent> {
    let (tx, events_rx) = mpsc::channel();

    thread::spawn(move || {
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
                            match *key {
                                177 => {
                                    tx.send(KeyboardEvent::Prev).unwrap_or(());
                                }
                                179 => {
                                    tx.send(KeyboardEvent::Play).unwrap_or(());
                                }
                                176 => {
                                    tx.send(KeyboardEvent::Next).unwrap_or(());
                                }
                                _ => {}
                            }
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
    });

    events_rx
}

#[cfg(target_os = "macos")]
extern "C" {
    fn CGEventSourceKeyState(state: i32, keycode: u16) -> bool;
}

#[cfg(target_os = "macos")]
fn keyboard_event_thread() -> mpsc::Receiver<KeyboardEvent> {
    let (tx, events_rx) = mpsc::channel();

    thread::spawn(move || {
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
                            match *key {
                                98 => {
                                    tx.send(KeyboardEvent::Prev).unwrap_or(());
                                }
                                100 => {
                                    tx.send(KeyboardEvent::Play).unwrap_or(());
                                }
                                101 => {
                                    tx.send(KeyboardEvent::Next).unwrap_or(());
                                }
                                _ => {}
                            }
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
    });

    events_rx
}

pub struct KeyboardEventEmitter(Arc<Mutex<mpsc::Receiver<KeyboardEvent>>>);

impl Task for KeyboardEventEmitter {
    type Output = Option<KeyboardEvent>;
    type Error = String;
    type JsEvent = JsValue;

    fn perform(&self) -> Result<Self::Output, Self::Error> {
        let rx = self
            .0
            .lock()
            .map_err(|_| "Could not obtain lock on receiver".to_string())?;

        match rx.recv_timeout(Duration::from_millis(16)) {
            Ok(event) => Ok(Some(event)),
            _ => Ok(None),
        }
    }

    fn complete(
        self,
        mut cx: TaskContext,
        event: Result<Self::Output, Self::Error>,
    ) -> JsResult<Self::JsEvent> {
        let event = event.unwrap_or(None);

        let event = match event {
            Some(event) => event,
            _ => return Ok(JsUndefined::new().upcast()),
        };

        let o = cx.empty_object();

        match event {
            KeyboardEvent::Prev => {
                let event_name = cx.string("prev");
                o.set(&mut cx, "event", event_name)?;
            }
            KeyboardEvent::Play => {
                let event_name = cx.string("play");
                o.set(&mut cx, "event", event_name)?;
            }
            KeyboardEvent::Next => {
                let event_name = cx.string("next");
                o.set(&mut cx, "event", event_name)?;
            }
        }

        Ok(o.upcast())
    }
}

declare_types! {
    pub class JsKeyboardEventEmitter for KeyboardEventEmitter {
        init(_) {
            let rx = keyboard_event_thread();
            Ok(KeyboardEventEmitter (Arc::new(Mutex::new(rx))))
        }

        method poll(mut cx) {
            let cb = cx.argument::<JsFunction>(0)?;
            let this = cx.this();

            let events = cx.borrow(&this, |emitter| Arc::clone(&emitter.0));
            let emitter = KeyboardEventEmitter(events);

            emitter.schedule(cb);

            Ok(JsUndefined::new().upcast())
        }

    }
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
        let mut buf = Vec::new();
        let mut handle = curl::easy::Easy::new();
        handle.timeout(Duration::from_secs(1)).unwrap();
        handle.connect_timeout(Duration::from_secs(5)).unwrap();
        handle.url(&self.url).unwrap();
        {
            let mut transfer = handle.transfer();
            transfer
                .write_function(|data| {
                    buf.extend_from_slice(data);
                    Ok(data.len())
                })
                .unwrap();
            transfer.perform().unwrap();
        }
        let http_code = handle.response_code().unwrap();
        if http_code == 200 {
            let mut file = File::create(&self.path).unwrap();
            file.write_all(&buf).unwrap();
            Ok(true)
        } else {
            Ok(false)
        }
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
    cx.export_class::<JsKeyboardEventEmitter>("KeyboardEventEmitter")?;
    cx.export_function("download", download)
});
