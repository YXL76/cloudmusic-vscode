use neon::prelude::*;
use std::fs::File;
use std::io::BufReader;
use std::sync::mpsc;
use std::sync::{Arc, Mutex};
use std::thread;
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
            let sink = rodio::Sink::new(&device);
            sink.pause();
            unsafe  {
                STATUS.reset();
                SINK = Some(sink);
            }
            Ok(Rodio {})
        }

        method load(mut cx) {
            let url: String = cx.argument::<JsString>(0)?.value();
            let res = {
                match File::open(url) {
                    Ok(file) => match rodio::Decoder::new(BufReader::new(file)) {
                        Ok(source) => unsafe {
                            if let Some(sink) = &SINK {
                                sink.stop();
                            }
                            let device = rodio::default_output_device().unwrap();
                            let sink = rodio::Sink::new(&device);
                            sink.append(source);
                            sink.play();
                            STATUS.reset();
                            STATUS.play();
                            SINK = Some(sink);
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
                    Some(sink) if !sink.empty() => {
                        sink.play();
                        STATUS.play();
                        Ok(cx.boolean(true).upcast())
                    },
                    _ => Ok(cx.boolean(false).upcast()),
                }
            }
        }

        method pause(mut cx) {
            unsafe  {
                if let Some(sink) = &SINK {
                    sink.pause();
                };
                STATUS.stop();
            }
            Ok(cx.undefined().upcast())
        }

        method stop(mut cx) {
            unsafe  {
                if let Some(sink) = &SINK {
                    sink.stop();
                };
                STATUS.reset();
            }
            Ok(cx.undefined().upcast())
        }

        method setVolume(mut cx) {
            let level = cx.argument::<JsNumber>(0)?.value() / 100.0;
            unsafe  {
                if let Some(sink) = &SINK {
                    sink.set_volume(level as f32);
                };
            }
            Ok(cx.undefined().upcast())
        }

        method isPaused(mut cx) {
            unsafe  {
                match &SINK {
                    Some(sink) => Ok(cx.boolean(sink.is_paused()).upcast()),
                    _ => Ok(cx.boolean(true).upcast())
                }
            }
        }

        method empty(mut cx) {
            unsafe  {
                match &SINK {
                    Some(sink) => Ok(cx.boolean(sink.empty()).upcast()),
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

#[cfg(target_os = "linux")]
use std::ptr;
#[cfg(target_os = "linux")]
use std::slice::from_raw_parts;
#[cfg(target_os = "linux")]
use x11::xlib::{XOpenDisplay, XQueryKeymap};

pub enum KeyboardEvent {
    Prev,
    Play,
    Next,
}

#[cfg(target_os = "linux")]
fn keyboard_event_thread() -> mpsc::Receiver<KeyboardEvent> {
    let (tx, events_rx) = mpsc::channel();

    thread::spawn(move || unsafe {
        let disp = XOpenDisplay(ptr::null());
        let keymap: *mut i8 = [0; 32].as_mut_ptr();
        let mut prev_key = 0;

        loop {
            thread::sleep(Duration::from_millis(32));

            XQueryKeymap(disp, keymap);
            let b = from_raw_parts(keymap, 32)[21];

            if prev_key != 1 && b & 1 << 3 != 0 {
                prev_key = 1;
                tx.send(KeyboardEvent::Next).unwrap_or(());
            } else if prev_key != 2 && b & 1 << 4 != 0 {
                prev_key = 2;
                tx.send(KeyboardEvent::Play).unwrap_or(());
            } else if prev_key != 3 && b & 1 << 5 != 0 {
                prev_key = 3;
                tx.send(KeyboardEvent::Prev).unwrap_or(());
            }
        }
    });

    events_rx
}

#[cfg(target_os = "windows")]
fn keyboard_event_thread() -> mpsc::Receiver<KeyboardEvent> {
    let (tx, events_rx) = mpsc::channel();

    events_rx
}

#[cfg(target_os = "macos")]
fn keyboard_event_thread() -> mpsc::Receiver<KeyboardEvent> {
    let (tx, events_rx) = mpsc::channel();

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

        match rx.recv() {
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

register_module!(mut cx, {
    cx.export_class::<JsRodio>("Rodio")?;
    cx.export_class::<JsMiniaudio>("Miniaudio")?;
    cx.export_class::<JsKeyboardEventEmitter>("KeyboardEventEmitter")
});
