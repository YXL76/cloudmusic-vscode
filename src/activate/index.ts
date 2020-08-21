import { initAccount } from "./account";
import { initCache } from "./cache";
import { initCommand } from "./command";
import { initPlayer } from "./player";
import { initPlaylist } from "./playlist";
import { initQueue } from "./queue";
import { initStatusBar } from "./statusBar";

export const steps = [
  initAccount,
  initPlayer,
  initCommand,
  initQueue,
  initStatusBar,
  initPlaylist,
  initCache,
];
