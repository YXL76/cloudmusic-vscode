use neon::prelude::*;
use std::{sync::Arc, thread, time::Duration};

static SLEEP_DURATION: Duration = Duration::from_millis(16);

#[cfg(target_os = "linux")]
use std::{os::raw::c_char, ptr, slice::from_raw_parts};
#[cfg(target_os = "linux")]
use x11::xlib::{XOpenDisplay, XQueryKeymap};

#[cfg(target_os = "linux")]
static KEYS: [i32; 3] = [5, 4, 3];

#[cfg(target_os = "linux")]
pub fn start_keyboard_event(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let callback = Arc::new(cx.argument::<JsFunction>(0)?.root(&mut cx));
    let queue = cx.queue();

    thread::spawn(move || {
        let mut prev = 0;
        let keymap: *mut c_char = [0; 32].as_mut_ptr();

        unsafe {
            let disp = XOpenDisplay(ptr::null());

            loop {
                thread::sleep(SLEEP_DURATION);
                let mut flag = false;
                XQueryKeymap(disp, keymap);
                let b = from_raw_parts(keymap, 32)[21];

                for (i, &key) in KEYS.iter().enumerate() {
                    if b & 1 << key != 0 {
                        flag = true;
                        if prev != key {
                            prev = key;
                            let callback = callback.clone();
                            queue.send(move |mut cx| {
                                let callback = callback.to_inner(&mut cx);
                                let this = cx.undefined();
                                let args = vec![cx.number(i as f64)];

                                callback.call(&mut cx, this, args)?;
                                Ok(())
                            });
                        }
                        break;
                    }
                }
                if !flag {
                    prev = 0;
                }
            }
        }
    });

    Ok(cx.undefined())
}

#[cfg(target_os = "windows")]
use winapi::um::winuser::{
    GetAsyncKeyState, VK_MEDIA_NEXT_TRACK, VK_MEDIA_PLAY_PAUSE, VK_MEDIA_PREV_TRACK,
};

#[cfg(target_os = "windows")]
static KEYS: [i32; 3] = [
    VK_MEDIA_PREV_TRACK,
    VK_MEDIA_PLAY_PAUSE,
    VK_MEDIA_NEXT_TRACK,
];

#[cfg(target_os = "windows")]
pub fn start_keyboard_event(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let callback = cx.argument::<JsFunction>(0)?.root(&mut cx);
    let queue = cx.queue();

    thread::spawn(move || {
        let mut prev = 0;

        loop {
            thread::sleep(SLEEP_DURATION);
            let mut flag = false;

            for (i, &key) in KEYS.iter().enumerate() {
                unsafe {
                    if GetAsyncKeyState(*key) as u32 & 0x8000 != 0 {
                        flag = true;
                        if prev != key {
                            prev = key;
                            let callback = callback.clone();
                            queue.send(move |mut cx| {
                                let callback = callback.to_inner(&mut cx);
                                let this = cx.undefined();
                                let args = vec![cx.number(i as f64)];

                                callback.call(&mut cx, this, args)?;
                                Ok(())
                            });
                        }
                        break;
                    }
                    if !flag {
                        prev = 0;
                    }
                }
            }
        }
    });

    Ok(cx.undefined())
}

#[cfg(target_os = "macos")]
#[link(name = "AppKit", kind = "framework")]
extern "C" {
    fn CGEventSourceKeyState(state: i32, keycode: u16) -> bool;
}

#[cfg(target_os = "macos")]
static KEYS: [i32; 3] = [98, 100, 101];

#[cfg(target_os = "macos")]
pub fn start_keyboard_event(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let callback = cx.argument::<JsFunction>(0)?.root(&mut cx);
    let queue = cx.queue();

    thread::spawn(move || {
        let mut prev = 0;

        loop {
            thread::sleep(SLEEP_DURATION);
            let mut flag = false;

            for (i, &key) in KEYS.iter().enumerate() {
                unsafe {
                    if CGEventSourceKeyState(0, key) {
                        flag = true;
                        if prev != key {
                            prev = key;
                            let callback = callback.clone();
                            queue.send(move |mut cx| {
                                let callback = callback.to_inner(&mut cx);
                                let this = cx.undefined();
                                let args = vec![cx.number(i as f64)];

                                callback.call(&mut cx, this, args)?;
                                Ok(())
                            });
                        }
                        break;
                    }
                    if !flag {
                        prev = 0;
                    }
                }
            }
        }
    });

    Ok(cx.undefined())
}
