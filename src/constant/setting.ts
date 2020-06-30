import { homedir } from "os";
import { join } from "path";
import { workspace } from "vscode";

export const SETTING_DIR = join(homedir(), ".cloudmusic");
export const ACCOUNT_FILE = join(SETTING_DIR, ".account");

export const MPV_BINARY = workspace
  .getConfiguration()
  .get("cloudmusic.player.mpvPath");
