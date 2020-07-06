import { homedir, platform } from "os";
import { posix } from "path";
import { workspace } from "vscode";
const commandExistsSync = require("command-exists").sync;

const conf = workspace.getConfiguration();
const system = platform();

export const SETTING_DIR = posix.join(homedir(), ".cloudmusic");
export const ACCOUNT_FILE = posix.join(SETTING_DIR, ".account");

export const AUTO_CHECK = conf.get("cloudmusic.account.autoCheck");

export const PROXY = conf.get("cloudmusic.music.proxy")
  ? conf.get("cloudmusic.music.proxy")
  : undefined;

export const MUSIC_QUALITY = conf.get("cloudmusic.music.quality");

export const TMP_DIR = posix.join(SETTING_DIR, "tmp");
export const CACHE_DIR = posix.join(SETTING_DIR, "cache", `${MUSIC_QUALITY}`);

const cacheSize = conf.get("cloudmusic.cache.size");
let finalSize = typeof cacheSize === "number" ? cacheSize : 1024;
finalSize = finalSize > 10240 ? 10240 : finalSize;
finalSize = finalSize < 128 ? 128 : finalSize;
export const CACHE_SIZE = finalSize * 1024 * 1024;

const gui = conf.get("cloudmusic.player.interface");
export const PLAYER = conf.get("cloudmusic.player.player");

const mpvBinary = conf.get("cloudmusic.player.mpv.path");

export const MPV_API_OPTIONS = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  audio_only: !gui,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  auto_restart: true,
  binary: mpvBinary ? mpvBinary : null,
  debug: false,
  ipcCommand: null,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  time_update: 1,
  verbose: false,
};

export const MPV_ARGS = [
  ...(conf.get("cloudmusic.player.ignoreConfig") ? ["--no-config"] : [""]),
  ...["--load-scripts=no", "--no-ytdl"],
].filter((item) => item !== "");

export const MPV_AVAILABLE = commandExistsSync(mpvBinary || "mpv");

const vlcBinary = conf.get("cloudmusic.player.vlc.path");
const vlcHttpPort = conf.get("cloudmusic.player.vlc.httpPort");
const vlcHttpPass = conf.get("cloudmusic.player.vlc.httpPass");

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
  ...(gui ? [""] : ["--intf=dummy", system === "win32" ? "--dummy-quiet" : ""]),
  ...(conf.get("cloudmusic.player.ignoreConfig") ? ["--ignore-config"] : [""]),
].filter((item) => item !== "");

export const VLC_API_OPTIONS = {
  app: vlcBinary || "vlc",
  args: VLC_ARGS,
  cwd: null,
  httpPort: vlcHttpPort || 9280,
  httpPass: vlcHttpPass ? vlcHttpPass : null,
  detached: true,
};

export const VLC_AVAILABLE = commandExistsSync(vlcBinary || "vlc");
