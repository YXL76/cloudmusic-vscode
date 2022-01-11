use {
    neon::prelude::*,
    souvlaki::{MediaControlEvent, MediaControls, MediaMetadata, PlatformConfig},
    std::{cell::RefCell, sync::Arc, time::Duration},
};

pub struct MediaSession {
    controls: MediaControls,
}

impl Finalize for MediaSession {}

impl MediaSession {
    #[inline]
    fn new() -> Self {
        const TITLE: &str = "Cloudmusic VSCode";

        let hwnd = {
            #[cfg(target_os = "windows")]
            {
                #[cfg(any(target_arch = "x86_64", target_arch = "x86"))]
                {
                    use {
                        raw_window_handle::{HasRawWindowHandle, RawWindowHandle},
                        winit::{event_loop::EventLoop, window::WindowBuilder},
                    };

                    match WindowBuilder::new()
                        .with_title(TITLE)
                        .with_visible(false)
                        .with_transparent(true)
                        .with_decorations(false)
                        .build(&EventLoop::new())
                        .unwrap()
                        .raw_window_handle()
                    {
                        RawWindowHandle::Win32(han) => Some(han.hwnd),
                        _ => None,
                    }
                }
                #[cfg(not(any(target_arch = "x86_64", target_arch = "x86")))]
                {
                    // FIXME: is it workable?
                    Some(raw_window_handle::Win32Handle::empty().hwnd)
                }
            }
            #[cfg(not(target_os = "windows"))]
            {
                None
            }
        };

        let config = PlatformConfig {
            dbus_name: "cloudmusic-vscode",
            display_name: TITLE,
            hwnd,
        };

        let controls = MediaControls::new(config).unwrap();

        MediaSession { controls }
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
        let album = match album.is_empty() {
            true => Some(album.as_str()),
            false => None,
        };
        let artist = match artist.is_empty() {
            true => Some(artist.as_str()),
            false => None,
        };
        let cover_url = match cover_url.is_empty() && cover_url.starts_with("http") {
            true => Some(cover_url.as_str()),
            false => None,
        };
        let duration = match duration == 0. {
            true => Some(Duration::from_secs_f64(duration)),
            false => None,
        };

        self.controls
            .set_metadata(MediaMetadata {
                title: Some(title.as_str()),
                album,
                artist,
                cover_url,
                duration,
            })
            .unwrap();
    }
}

pub fn media_session_new(mut cx: FunctionContext) -> JsResult<JsValue> {
    let media_session = cx.boxed(RefCell::new(MediaSession::new()));
    let toggle_handler = Arc::new(cx.argument::<JsFunction>(0)?.root(&mut cx));
    let next_handler = Arc::new(cx.argument::<JsFunction>(1)?.root(&mut cx));
    let previous_handler = Arc::new(cx.argument::<JsFunction>(2)?.root(&mut cx));
    let stop_handler = Arc::new(cx.argument::<JsFunction>(3)?.root(&mut cx));

    let channel = cx.channel();

    let _ = media_session
        .borrow_mut()
        .controls
        .attach(move |event: MediaControlEvent| {
            let toggle_handler = toggle_handler.clone();
            let next_handler = next_handler.clone();
            let previous_handler = previous_handler.clone();
            let stop_handler = stop_handler.clone();

            channel.send(move |mut cx| {
                let callback = match event {
                    MediaControlEvent::Play
                    | MediaControlEvent::Pause
                    | MediaControlEvent::Toggle => toggle_handler.to_inner(&mut cx),
                    MediaControlEvent::Next => next_handler.to_inner(&mut cx),
                    MediaControlEvent::Previous => previous_handler.to_inner(&mut cx),
                    MediaControlEvent::Stop => stop_handler.to_inner(&mut cx),
                    _ => return Ok(()),
                };
                let this = cx.undefined();
                let args: [Handle<JsUndefined>; 0] = [];
                callback.call(&mut cx, this, args)?;
                Ok(())
            });
        });

    Ok(media_session.upcast())
}

pub fn media_session_set_metadata(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let media_session = cx.argument::<JsBox<RefCell<MediaSession>>>(0)?;
    let title = cx.argument::<JsString>(1)?.value(&mut cx);
    let album = cx.argument::<JsString>(2)?.value(&mut cx);
    let artist = cx.argument::<JsString>(3)?.value(&mut cx);
    let cover_url = cx.argument::<JsString>(4)?.value(&mut cx);
    let duration = cx.argument::<JsNumber>(5)?.value(&mut cx);

    media_session
        .borrow_mut()
        .set_metadata(title, album, artist, cover_url, duration);

    Ok(cx.undefined())
}
