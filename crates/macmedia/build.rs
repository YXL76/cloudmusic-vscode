use std::{env::var_os, path::PathBuf};

#[inline]
fn env_to_path(env_var: &str) -> PathBuf {
    PathBuf::from(var_os(env_var).unwrap())
}

fn main() {
    let output_file = env_to_path("CARGO_MANIFEST_DIR").join("media");

    println!("cargo:rustc-link-arg-bins=-o");
    println!("cargo:rustc-link-arg-bins={}", output_file.display());
}
