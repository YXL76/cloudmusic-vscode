use {
    souvlaki::{
        MediaControlEvent, MediaControls, MediaMetadata, MediaPlayback, MediaPosition,
        PlatformConfig,
    },
    std::{
        io::{stdin, stdout, BufRead, Write},
        thread,
        time::Duration,
    },
    winit::{
        event::Event,
        event_loop::{ControlFlow, EventLoop},
    },
};

#[derive(Debug)]
enum CustomEvent {
    Media(MediaControlEvent),
    Metadata(String),
    Playing(String),
}

fn main() {
    #[cfg(not(target_os = "macos"))]
    let event_loop = EventLoop::<CustomEvent>::with_user_event();

    #[cfg(target_os = "macos")]
    let mut event_loop = EventLoop::<CustomEvent>::with_user_event();
    #[cfg(target_os = "macos")]
    use winit::platform::macos::{ActivationPolicy, EventLoopExtMacOS};
    #[cfg(target_os = "macos")]
    event_loop.set_activation_policy(ActivationPolicy::Prohibited);

    let mut controls = MediaControls::new(PlatformConfig {
        dbus_name: "cloudmusic-vscode",
        display_name: "Cloudmusic VSCode",
        hwnd: None,
    })
    .unwrap();

    let event_loop_proxy = event_loop.create_proxy();
    controls
        .attach(move |event: MediaControlEvent| {
            event_loop_proxy
                .send_event(CustomEvent::Media(event))
                .unwrap();
        })
        .unwrap();

    controls.set_playback(MediaPlayback::Stopped).unwrap();

    let event_loop_proxy = event_loop.create_proxy();
    thread::spawn(move || loop {
        let mut buffer = String::new();
        if stdin().lock().read_line(&mut buffer).unwrap() != 0 {
            buffer.remove(buffer.len() - 1);
            let type_ = buffer.remove(buffer.len() - 1);
            match type_ {
                '0' => event_loop_proxy
                    .send_event(CustomEvent::Metadata(buffer))
                    .unwrap(),
                '1' => event_loop_proxy
                    .send_event(CustomEvent::Playing(buffer))
                    .unwrap(),
                _ => (),
            }
        } else {
            break;
        }
    });

    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;

        match event {
            Event::UserEvent(event) => match event {
                CustomEvent::Media(event) => {
                    let type_ = match event {
                        MediaControlEvent::Play => 0,
                        MediaControlEvent::Pause => 1,
                        MediaControlEvent::Toggle => 2,
                        MediaControlEvent::Next => 3,
                        MediaControlEvent::Previous => 4,
                        MediaControlEvent::Stop => 5,
                        _ => return,
                    };
                    stdout().write_fmt(format_args!("{type_}\n")).unwrap();
                }

                CustomEvent::Metadata(event) => {
                    let mut metadata = MediaMetadata::default();

                    for string in event.split("\t") {
                        let (key, value) = string.split_once(':').unwrap();
                        match key {
                            "title" => metadata.title = Some(value),
                            "album" => metadata.album = Some(value),
                            "artist" => metadata.artist = Some(value),
                            "cover_url" => metadata.cover_url = Some(value),
                            "duration" => {
                                metadata.duration =
                                    Some(Duration::from_secs_f64(value.parse().unwrap()))
                            }
                            _ => (),
                        }
                    }

                    controls.set_metadata(metadata).unwrap();
                }

                CustomEvent::Playing(event) => {
                    let (playing, position) = event.split_once(',').unwrap();

                    let progress = Some(MediaPosition(Duration::from_secs_f64(
                        position.parse().unwrap(),
                    )));
                    controls
                        .set_playback(match playing.parse().unwrap() {
                            true => MediaPlayback::Playing { progress },
                            false => MediaPlayback::Paused { progress },
                        })
                        .unwrap();
                }
            },
            _ => (),
        }
    });
}
