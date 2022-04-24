use std::{
    env::var_os,
    path::{Path, PathBuf},
};

#[inline]
fn is_env(env_var: &str, value: &str) -> bool {
    var_os(env_var).map(|v| v == value).unwrap_or(false)
}

#[inline]
fn env_to_path(env_var: &str) -> PathBuf {
    PathBuf::from(var_os(env_var).unwrap())
}

fn main() {
    let output_file = env_to_path("CARGO_MANIFEST_DIR").join("index.node");
    let is_windows = is_env("CARGO_CFG_TARGET_OS", "windows");
    let is_gnu = is_env("CARGO_CFG_TARGET_ENV", "gnu");

    if is_windows && !is_gnu {
        let pdb_file = env_to_path("OUT_DIR")
            .join(Path::new(output_file.file_name().unwrap()).with_extension("pdb"));

        println!("cargo:rustc-cdylib-link-arg=/OUT:{}", output_file.display());
        println!("cargo:rustc-cdylib-link-arg=/PDB:{}", pdb_file.display());
    } else {
        println!("cargo:rustc-cdylib-link-arg=-o");
        println!("cargo:rustc-cdylib-link-arg={}", output_file.display());
    }
}
