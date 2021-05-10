/// <reference types="./provider" />

import type { ProviderSMsg } from "@cloudmusic/shared";
import { vscode } from "./utils";

window.addEventListener("message", ({ data }: { data: ProviderSMsg }) => {
  if (data.command === "master") {
    window.master = !!data.is;
    if (window.audioTarget) window.audioTarget.muted = !!data.is;
    return;
  }
  if (!window.master || !navigator.mediaSession) return;
  switch (data.command) {
    case "state":
      navigator.mediaSession.playbackState = data.state;
      break;
    /* case "position":
      navigator.mediaSession.setPositionState?.({ position: data.position });
      break; */
    case "metadata":
      navigator.mediaSession.metadata = new MediaMetadata(data);
      navigator.mediaSession.setPositionState?.({ duration: data.duration });

      break;
  }
});

let firstPlay = false;

window.handleFirstPlay = ({ target }) => {
  if (firstPlay) return;
  firstPlay = true;

  window.audioTarget = target;
  target.pause();
  target.muted = true;
  target.onplay = null;

  if (navigator.mediaSession) {
    navigator.mediaSession.setActionHandler("play", () =>
      vscode.postMessage({ command: "toggle" })
    );
    navigator.mediaSession.setActionHandler("pause", () =>
      vscode.postMessage({ command: "toggle" })
    );
    navigator.mediaSession.setActionHandler("stop", null);
    navigator.mediaSession.setActionHandler("seekbackward", null);
    navigator.mediaSession.setActionHandler("seekforward", null);
    navigator.mediaSession.setActionHandler("seekto", null);
    navigator.mediaSession.setActionHandler("previoustrack", () =>
      vscode.postMessage({ command: "previous" })
    );
    navigator.mediaSession.setActionHandler("nexttrack", () =>
      vscode.postMessage({ command: "next" })
    );
  }
};
