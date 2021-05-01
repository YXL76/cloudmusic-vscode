pub mod kuwo_des;

use crate::kuwo_des::*;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn kuwo_crypt(msg: &str) -> Vec<u8> {
    crypt(msg)
}
