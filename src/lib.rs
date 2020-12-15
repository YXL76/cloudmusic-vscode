use neon::prelude::*;

mod native {
    pub mod player;
    // pub mod download;
    // pub mod keyboard;
}
// use native::download::*;
// use native::keyboard::*;
use native::player::*;

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
    cx.export_function("playerSetVolume", player_set_volume)?;
    cx.export_function("playerStop", player_stop)?;

    Ok(())
}
