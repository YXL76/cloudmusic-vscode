use {
    neon::prelude::*,
    std::{cell::RefCell, sync::Arc},
};

// static ACCESSABLE: AtomicBool = AtomicBool::new(true);

#[cfg(not(target_os = "macos"))]
pub struct MediaSession {
    controls: souvlaki::MediaControls,
}

#[cfg(target_os = "macos")]
pub struct MediaSession {
    stdin: std::process::ChildStdin,
}

type JSMediaSession = Option<MediaSession>;

impl Finalize for MediaSession {}

#[cfg(not(target_os = "macos"))]
impl MediaSession {
    #[inline]
    fn new() -> Option<Self> {
        use {
            souvlaki::{MediaControls, PlatformConfig},
            std::ffi::c_void,
        };

        const TITLE: &str = "Cloudmusic VSCode";

        let hwnd = {
            #[cfg(target_os = "windows")]
            {
                #[cfg(any(target_arch = "x86_64", target_arch = "x86"))]
                {
                    use {
                        raw_window_handle::{HasWindowHandle, RawWindowHandle},
                        winit::{event_loop::EventLoop, window::Window},
                    };
                    match EventLoop::new()
                        .unwrap()
                        .create_window(
                            Window::default_attributes()
                                .with_title(TITLE)
                                .with_visible(false)
                                .with_transparent(true)
                                .with_decorations(false),
                        )
                        .unwrap()
                        .window_handle()
                        .unwrap()
                        .as_raw()
                    {
                        RawWindowHandle::Win32(han) => Some(han.hwnd.get() as *mut c_void),
                        _ => panic!("No hwnd was found! Try to use wasm mode."),
                    }
                }
                #[cfg(not(any(target_arch = "x86_64", target_arch = "x86")))]
                {
                    panic!("No hwnd was found! Try to use wasm mode.");
                    None
                }
            }
            #[cfg(not(target_os = "windows"))]
            {
                None
            }
        };

        fn config<'a>(hwnd: Option<*mut c_void>) -> PlatformConfig<'a> {
            PlatformConfig {
                dbus_name: "cloudmusic-vscode",
                display_name: TITLE,
                hwnd,
            }
        }

        /* let controls = match MediaControls::new(config(hwnd)) {
            Ok(controls) => controls,
            // Access to other windows requires admin rights,
            // so it almost always fails on Windows, we still
            // need to use a fake window as fallback.
            Err(_) => {
                ACCESSABLE.store(false, Ordering::Relaxed);
                MediaControls::new(config(fallback())).unwrap()
            }
        }; */
        match MediaControls::new(config(hwnd)) {
            Ok(controls) => Some(MediaSession { controls }),
            Err(_) => None,
        }
    }

    #[inline]
    fn set_metadata(
        &mut self,
        title: String,
        album: String,
        artist: String,
        cover_url: String,
        duration: f64,
    ) {
        use {souvlaki::MediaMetadata, std::time::Duration};
        self.controls
            .set_metadata(MediaMetadata {
                title: Some(title.as_str()),
                album: (!album.is_empty()).then_some(album.as_str()),
                artist: (!artist.is_empty()).then_some(artist.as_str()),
                cover_url: cover_url.starts_with("http").then_some(cover_url.as_str()),
                duration: (duration != 0.).then_some(Duration::from_secs_f64(duration)),
            })
            .unwrap();
    }

    #[inline]
    fn set_playback(&mut self, playing: bool, position: f64) {
        use {
            souvlaki::{MediaPlayback, MediaPosition},
            std::time::Duration,
        };

        let progress = Some(MediaPosition(Duration::from_secs_f64(position)));
        self.controls
            .set_playback(match playing {
                true => MediaPlayback::Playing { progress },
                false => MediaPlayback::Paused { progress },
            })
            .unwrap();
    }
}

#[cfg(target_os = "macos")]
impl MediaSession {
    #[inline]
    fn set_metadata(
        &mut self,
        title: String,
        album: String,
        artist: String,
        cover_url: String,
        duration: f64,
    ) {
        use std::io::Write;

        let mut items = Vec::new();
        items.push(format!("title:{title}"));
        if !album.is_empty() {
            items.push(format!("album:{album}"));
        }
        if !artist.is_empty() {
            items.push(format!("artist:{artist}"));
        }
        if cover_url.starts_with("http") {
            items.push(format!("cover_url:{cover_url}"));
        }
        if duration != 0. {
            items.push(format!("duration:{duration}"));
        }

        let string = items.join("\t");
        self.stdin.write_fmt(format_args!("{string}0\n")).unwrap();
    }

    #[inline]
    fn set_playback(&mut self, playing: bool, position: f64) {
        use std::io::Write;

        self.stdin
            .write_fmt(format_args!("{playing},{position}1\n"))
            .unwrap();
    }
}

/* #[cfg(target_os = "windows")]
pub fn media_session_hwnd(mut cx: FunctionContext) -> JsResult<JsString> {
    if !ACCESSABLE.load(Ordering::Relaxed) {
        return Ok(cx.string("".to_string()));
    }

    fn decode_utf16(buf: &[u16]) -> String {
        use std::char::{decode_utf16, REPLACEMENT_CHARACTER};

        decode_utf16(buf.iter().take_while(|&i| *i != 0).cloned())
            .map(|r| r.unwrap_or(REPLACEMENT_CHARACTER))
            .collect::<String>()
    }

    use {
        std::sync::atomic::{AtomicU32, AtomicU64},
        winapi::{
            shared::{
                minwindef::{BOOL, FALSE, LPARAM, TRUE},
                windef::HWND,
            },
            um::winuser::{EnumWindows, GetClassNameW, GetWindowTextW, GetWindowThreadProcessId},
        },
    };

    static PID: AtomicU32 = AtomicU32::new(0);
    static PSTR: AtomicU64 = AtomicU64::new(0);

    PID.store(
        cx.argument::<JsString>(0)?.value(&mut cx).parse().unwrap(),
        Ordering::Relaxed,
    );

    extern "system" fn callback(hwnd: HWND, _: LPARAM) -> BOOL {
        const LEN: usize = 1 << 8;
        let mut buf = [0u16; LEN];

        if unsafe { GetClassNameW(hwnd, &mut buf[0], LEN as i32) } < 0 {
            return TRUE;
        }
        let class_name = decode_utf16(&buf);
        if class_name != "Chrome_WidgetWin_1" {
            return TRUE;
        }

        if unsafe { GetWindowTextW(hwnd, &mut buf[0], LEN as i32) } < 0 {
            return TRUE;
        }
        let title = decode_utf16(&buf);
        if title != "Code" {
            return TRUE;
        }

        let mut pid: u32 = 0;
        let _creator = unsafe { GetWindowThreadProcessId(hwnd, &mut pid) };
        if PID.load(Ordering::SeqCst) != pid {
            return TRUE;
        }

        PSTR.store(hwnd as u64, Ordering::SeqCst);
        FALSE
    }

    Ok(cx.string(match unsafe { EnumWindows(Some(callback), 0) } {
        FALSE => PSTR.load(Ordering::Relaxed).to_string(),
        _ => "".to_string(),
    }))
} */

#[cfg(not(target_os = "macos"))]
pub fn media_session_new(mut cx: FunctionContext) -> JsResult<JsValue> {
    use souvlaki::{MediaControlEvent, MediaPlayback};

    // let hwnd = cx.argument::<JsString>(0)?.value(&mut cx);
    let handler = Arc::new(cx.argument::<JsFunction>(0)?.root(&mut cx));

    let media_session: JSMediaSession = MediaSession::new();
    let media_session = cx.boxed(RefCell::new(media_session));
    let channel = cx.channel();

    let _ = media_session.borrow_mut().as_mut().map(|m| {
        m.controls.attach(move |event: MediaControlEvent| {
            let type_ = match event {
                MediaControlEvent::Play => 0.,
                MediaControlEvent::Pause => 1.,
                MediaControlEvent::Toggle => 2.,
                MediaControlEvent::Next => 3.,
                MediaControlEvent::Previous => 4.,
                MediaControlEvent::Stop => 5.,
                _ => return,
            };
            let handler = handler.clone();

            channel.send(move |mut cx| {
                let this = cx.undefined();
                let args = [cx.number(type_).upcast()];
                handler.to_inner(&mut cx).call(&mut cx, this, args)?;
                Ok(())
            });
        })
    });

    let _ = media_session
        .borrow_mut()
        .as_mut()
        .map(|m| m.controls.set_playback(MediaPlayback::Stopped));

    Ok(media_session.upcast())
}

#[cfg(target_os = "macos")]
pub fn media_session_new(mut cx: FunctionContext) -> JsResult<JsValue> {
    use std::{
        io::{BufRead, BufReader},
        path::Path,
        process::{Command, Stdio},
        thread,
    };

    let handler = Arc::new(cx.argument::<JsFunction>(0)?.root(&mut cx));
    let path = cx.argument::<JsString>(1)?.value(&mut cx);

    let mut child = Command::new(Path::new(&path))
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .unwrap();

    let stdout = child.stdout.take().unwrap();
    let channel = cx.channel();
    thread::spawn(move || {
        for line in BufReader::new(stdout).lines() {
            if let Ok(type_) = line.unwrap().parse::<i32>() {
                let handler = handler.clone();

                channel.send(move |mut cx| {
                    let this = cx.undefined();
                    let args = [cx.number(type_).upcast()];
                    handler.to_inner(&mut cx).call(&mut cx, this, args)?;
                    Ok(())
                });
            }
        }
    });

    let stdin = child.stdin.take().unwrap();
    let media_session: JSMediaSession = Some(MediaSession { stdin });
    let media_session = cx.boxed(RefCell::new(media_session));
    Ok(media_session.upcast())
}

pub fn media_session_set_metadata(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let media_session = cx.argument::<JsBox<RefCell<JSMediaSession>>>(0)?;
    let title = cx.argument::<JsString>(1)?.value(&mut cx);
    let album = cx.argument::<JsString>(2)?.value(&mut cx);
    let artist = cx.argument::<JsString>(3)?.value(&mut cx);
    let cover_url = cx.argument::<JsString>(4)?.value(&mut cx);
    let duration = cx.argument::<JsNumber>(5)?.value(&mut cx);

    media_session
        .borrow_mut()
        .as_mut()
        .map(|m| m.set_metadata(title, album, artist, cover_url, duration));

    Ok(cx.undefined())
}

pub fn media_session_set_playback(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let media_session = cx.argument::<JsBox<RefCell<JSMediaSession>>>(0)?;
    let playing = cx.argument::<JsBoolean>(1)?.value(&mut cx);
    let position = cx.argument::<JsNumber>(2)?.value(&mut cx);

    media_session
        .borrow_mut()
        .as_mut()
        .map(|m| m.set_playback(playing, position));

    Ok(cx.undefined())
}
