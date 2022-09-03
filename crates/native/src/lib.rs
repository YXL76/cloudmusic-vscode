pub mod media;
pub mod player;

// use crate::download::*;
// use crate::keyboard::*;
use {media::*, neon::prelude::*, player::*};

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    // cx.export_function("download", download)?;

    // cx.export_function("startKeyboardEvent", start_keyboard_event)?;

    cx.export_function("playerEmpty", player_empty)?;
    cx.export_function("playerLoad", player_load)?;
    cx.export_function("playerNew", player_new)?;
    cx.export_function("playerPause", player_pause)?;
    cx.export_function("playerPlay", player_play)?;
    cx.export_function("playerPosition", player_position)?;
    cx.export_function("playerSetSpeed", player_set_speed)?;
    cx.export_function("playerSetVolume", player_set_volume)?;
    cx.export_function("playerStop", player_stop)?;
    cx.export_function("playerSeek", player_seek)?;

    // #[cfg(target_os = "windows")]
    // cx.export_function("mediaSessionHwnd", media_session_hwnd)?;
    cx.export_function("mediaSessionNew", media_session_new)?;
    cx.export_function("mediaSessionSetMetadata", media_session_set_metadata)?;
    cx.export_function("mediaSessionSetPlayback", media_session_set_playback)?;

    Ok(())
}
