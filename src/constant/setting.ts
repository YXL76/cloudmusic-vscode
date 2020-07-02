import { homedir, platform } from "os";
import { join } from "path";
import { workspace } from "vscode";

const conf = workspace.getConfiguration();
const system = platform();

export const SETTING_DIR = join(homedir(), ".cloudmusic");
export const ACCOUNT_FILE = join(SETTING_DIR, ".account");

export const PROXY = conf.get("cloudmusic.music.proxy")
  ? conf.get("cloudmusic.music.proxy")
  : undefined;

export const MUSIC_QUALITY = conf.get("cloudmusic.music.quality");

export const PLAYER = conf.get("cloudmusic.player.player");

const MPV_BINARY = conf.get("cloudmusic.player.mpv.path");

export const MPV_API_OPTIONS = {
  audio_only: true,
  auto_restart: true,
  binary: MPV_BINARY ? MPV_BINARY : null,
  debug: false,
  ipcCommand: null,
  time_update: 1,
  verbose: false,
};

export const MPV_ARGS = [
  ...(conf.get("cloudmusic.player.ignoreConfig") ? ["--no-config"] : [""]),
  ...["--load-scripts=no", "--no-ytdl"],
].filter((item) => item !== "");

const VLC_BINARY = conf.get("cloudmusic.player.vlc.path");
const VLC_HTTP_PORT = conf.get("cloudmusic.player.vlc.httpPort");
const VLC_HTTP_PASS = conf.get("cloudmusic.player.vlc.httpPass");

const VLC_ARGS = [
  ...[
    "--no-video",
    "--no-video-deco",
    "--sout-transcode-venc=none",
    "--sout-transcode-senc=none",
    "--vout=none",
    "--text-renderer=none",
    "--qt-start-minimized",
    "--no-qt-autoload-extensions",
    "--no-keyboard-events",
    "--no-sub-autodetect-file",
    "--no-sout-video",
    "--no-plugins-scan",
    "--qt-notification=0",
    "--no-qt-error-dialogs",
  ],
  ...(system === "win32" ? ["--high-priority", "--no-qt-updates-notif"] : [""]),
  ...(conf.get("cloudmusic.player.vlc.dummy")
    ? ["--intf=dummy", system === "win32" ? "--dummy-quiet" : ""]
    : [""]),
  ...(conf.get("cloudmusic.player.ignoreConfig") ? ["--ignore-config"] : [""]),
].filter((item) => item !== "");

export const VLC_API_OPTIONS = {
  app: VLC_BINARY || "vlc",
  args: VLC_ARGS,
  cwd: null,
  httpPort: VLC_HTTP_PORT || 9280,
  httpPass: VLC_HTTP_PASS ? VLC_HTTP_PASS : null,
  detached: true,
};
