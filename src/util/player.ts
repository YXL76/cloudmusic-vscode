import { commands } from "vscode";
const mpvAPI = require("node-mpv-km");

export const mpv = new mpvAPI({
  audio_only: true,
  auto_restart: true,
  // binary: null,
  debug: false,
  ipcCommand: null,
  time_update: 1,
  verbose: false,
});

mpv.on("stopped", () => {
  commands.executeCommand("cloudmusic.next");
});
