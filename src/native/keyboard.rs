use neon::prelude::*;
use std::{thread, time::Duration};

static SLEEP_DURATION: Duration = Duration::from_millis(16);

#[cfg(target_os = "linux")]
use std::{os::raw::c_char, ptr, slice::from_raw_parts};
#[cfg(target_os = "linux")]
use x11::xlib::{XOpenDisplay, XQueryKeymap};

#[cfg(target_os = "linux")]
pub fn start_keyboard_event(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let callback = cx.argument::<JsFunction>(0)?.root(&mut cx);
    let prev = cx.argument::<JsNumber>(1)?.value(&mut cx) as i32;
    let queue = cx.queue();

    thread::spawn(move || {
        // let keys = [5, 4, 3];
        let mut active = 0;
        let keymap: *mut c_char = [0; 32].as_mut_ptr();

        unsafe {
            let disp = XOpenDisplay(ptr::null());

            loop {
                thread::sleep(SLEEP_DURATION);
                XQueryKeymap(disp, keymap);
                let b = from_raw_parts(keymap, 32)[21];

                let state1 = b & 1 << 5 != 0;
                let state2 = b & 1 << 4 != 0;
                let state3 = b & 1 << 3 != 0;

                if prev != 0 {
                    if !state1 && !state2 && !state3 {
                        break;
                    }
                } else {
                    if state1 {
                        active = 1;
                        break;
                    }
                    if state2 {
                        active = 2;
                        break;
                    }
                    if state3 {
                        active = 3;
                        break;
                    }
                }
            }
        }

        queue.send(move |mut cx| {
            let callback = callback.into_inner(&mut cx);
            let this = cx.undefined();
            let args = vec![cx.number(active)];

            callback.call(&mut cx, this, args)?;
            Ok(())
        });
    });
    Ok(cx.undefined())
}

#[cfg(target_os = "windows")]
use winapi::um::winuser::{
    GetAsyncKeyState, VK_MEDIA_NEXT_TRACK, VK_MEDIA_PLAY_PAUSE, VK_MEDIA_PREV_TRACK,
};

#[cfg(target_os = "windows")]
pub fn start_keyboard_event(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let callback = cx.argument::<JsFunction>(0)?.root(&mut cx);
    let prev = cx.argument::<JsNumber>(1)?.value(&mut cx) as i32;
    let queue = cx.queue();

    thread::spawn(move || {
        // let keys = [177, 179, 176];
        let mut active = 0;

        loop {
            thread::sleep(SLEEP_DURATION);

            unsafe {
                let state1 = GetAsyncKeyState(VK_MEDIA_PREV_TRACK) as u32 & 0x8000 != 0;
                let state2 = GetAsyncKeyState(VK_MEDIA_PLAY_PAUSE) as u32 & 0x8000 != 0;
                let state3 = GetAsyncKeyState(VK_MEDIA_NEXT_TRACK) as u32 & 0x8000 != 0;

                if prev != 0 {
                    if !state1 && !state2 && !state3 {
                        break;
                    }
                } else {
                    if state1 {
                        active = 1;
                        break;
                    }
                    if state2 {
                        active = 2;
                        break;
                    }
                    if state3 {
                        active = 3;
                        break;
                    }
                }
            }
        }

        queue.send(move |mut cx| {
            let callback = callback.into_inner(&mut cx);
            let this = cx.undefined();
            let args = vec![cx.number(active)];

            callback.call(&mut cx, this, args)?;
            Ok(())
        });
    });
    Ok(cx.undefined())
}

#[cfg(target_os = "macos")]
#[link(name = "AppKit", kind = "framework")]
extern "C" {
    fn CGEventSourceKeyState(state: i32, keycode: u16) -> bool;
}

#[cfg(target_os = "macos")]
pub fn start_keyboard_event(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let callback = cx.argument::<JsFunction>(0)?.root(&mut cx);
    let prev = cx.argument::<JsNumber>(1)?.value(&mut cx) as i32;
    let queue = cx.queue();

    thread::spawn(move || {
        // let keys = [98, 100, 101];
        let mut active = 0;

        loop {
            thread::sleep(SLEEP_DURATION);

            unsafe {
                let state1 = CGEventSourceKeyState(0, 98);
                let state2 = CGEventSourceKeyState(0, 100);
                let state3 = CGEventSourceKeyState(0, 101);

                if prev != 0 {
                    if !state1 && !state2 && !state3 {
                        break;
                    }
                } else {
                    if state1 {
                        active = 1;
                        break;
                    }
                    if state2 {
                        active = 2;
                        break;
                    }
                    if state3 {
                        active = 3;
                        break;
                    }
                }
            }
        }

        queue.send(move |mut cx| {
            let callback = callback.into_inner(&mut cx);
            let this = cx.undefined();
            let args = vec![cx.number(active)];

            callback.call(&mut cx, this, args)?;
            Ok(())
        });
    });
    Ok(cx.undefined())
}
