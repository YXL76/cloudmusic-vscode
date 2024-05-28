use {
    souvlaki::{
        MediaControlEvent, MediaControls, MediaMetadata, MediaPlayback, MediaPosition,
        PlatformConfig,
    },
    std::{io::stdin, thread, time::Duration},
    winit::{
        application::ApplicationHandler,
        event::WindowEvent,
        event_loop::{ActiveEventLoop, ControlFlow, EventLoop},
        window::WindowId,
    },
};

#[derive(Debug)]
enum CustomEvent {
    Media(MediaControlEvent),
    Metadata(String),
    Playing(String),
}

struct App {
    controls: MediaControls,
}

impl ApplicationHandler<CustomEvent> for App {
    fn resumed(&mut self, _: &ActiveEventLoop) {}

    fn window_event(&mut self, _: &ActiveEventLoop, _: WindowId, _: WindowEvent) {}

    fn user_event(&mut self, _: &ActiveEventLoop, event: CustomEvent) {
        match event {
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
                println!("{type_}");
            }

            CustomEvent::Metadata(event) => {
                let mut metadata = MediaMetadata::default();

                for string in event.split('\t') {
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

                self.controls.set_metadata(metadata).unwrap();
            }

            CustomEvent::Playing(event) => {
                let (playing, position) = event.split_once(',').unwrap();

                let progress = Some(MediaPosition(Duration::from_secs_f64(
                    position.parse().unwrap(),
                )));
                self.controls
                    .set_playback(match playing.parse().unwrap() {
                        true => MediaPlayback::Playing { progress },
                        false => MediaPlayback::Paused { progress },
                    })
                    .unwrap();
            }
        }
    }
}

const TITLE: &str = "Cloudmusic VSCode";

fn main() {
    let mut event_loop = EventLoop::<CustomEvent>::with_user_event();

    #[cfg(target_os = "macos")]
    use winit::platform::macos::{ActivationPolicy, EventLoopBuilderExtMacOS};
    #[cfg(target_os = "macos")]
    event_loop.with_activation_policy(ActivationPolicy::Prohibited);

    let event_loop = event_loop.build().unwrap();
    let mut controls = MediaControls::new(PlatformConfig {
        dbus_name: "cloudmusic-vscode",
        display_name: TITLE,
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
        if stdin().read_line(&mut buffer).unwrap() != 0 {
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

    event_loop.set_control_flow(ControlFlow::Wait);
    let mut app = App { controls };
    event_loop.run_app(&mut app).unwrap();
}
