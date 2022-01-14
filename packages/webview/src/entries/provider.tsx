import type { ProviderCMsg, ProviderSMsg } from "@cloudmusic/shared";
import React, { useEffect, useState } from "react";
import type { NeteaseTypings } from "api";
import { Player } from "cloudmusic-wasm";
import { render } from "react-dom";
import { vscode } from "../utils";

const root = document.getElementById("root");

const toggle = () => vscode.postMessage({ command: "toggle" } as ProviderCMsg);
const previous = () =>
  vscode.postMessage({ command: "previous" } as ProviderCMsg);
const next = () => vscode.postMessage({ command: "next" } as ProviderCMsg);

function setMediaSessionActionHandler() {
  if (!navigator.mediaSession) return;
  navigator.mediaSession.setActionHandler("play", toggle);
  navigator.mediaSession.setActionHandler("pause", toggle);
  navigator.mediaSession.setActionHandler("stop", toggle);

  navigator.mediaSession.setActionHandler("previoustrack", previous);
  navigator.mediaSession.setActionHandler("nexttrack", next);
}

function deleteMediaSessionActionHandler() {
  if (!navigator.mediaSession) return;
  navigator.mediaSession.setActionHandler("play", null);
  navigator.mediaSession.setActionHandler("pause", null);
  navigator.mediaSession.setActionHandler("stop", null);
  navigator.mediaSession.setActionHandler("seekbackward", null);
  navigator.mediaSession.setActionHandler("seekforward", null);
  navigator.mediaSession.setActionHandler("seekto", null);
  navigator.mediaSession.setActionHandler("previoustrack", null);
  navigator.mediaSession.setActionHandler("nexttrack", null);
  // navigator.mediaSession.setActionHandler("skipad", null);
  // navigator.mediaSession.setActionHandler("togglemicrophone", null);
  // navigator.mediaSession.setActionHandler("togglecamera", null);
  // navigator.mediaSession.setActionHandler("hangup", null);
}

deleteMediaSessionActionHandler();

class Controller {
  private static readonly _player = (
    window as unknown as { enablePlayer: boolean }
  ).enablePlayer
    ? new Player()
    : undefined;

  private static _playing = false;

  private static _d = 0;

  private static _i = 0;

  private static _master = false;

  // https://github.com/w3c/mediasession/issues/213
  private static _audioEle?: HTMLAudioElement;

  private static _timerId?: number;

  private static _playableFile?: string;

  static async load(url: string) {
    if (!this._player) return;

    const rep = await fetch(url);
    const buf = await rep.arrayBuffer();
    this._playing = !!this._player.load(new Uint8Array(buf));
    this._i = Date.now();
    if (this._playing) vscode.postMessage({ command: "load" } as ProviderCMsg);
  }

  static play() {
    if (!this._player) return;

    if (!this._playing) this._i = Date.now();
    this._playing = !!this._player.play();
    vscode.postMessage({
      command: "playing",
      playing: this._playing,
    } as ProviderCMsg);
  }

  static pause() {
    if (!this._player) return;

    this._player.pause();
    if (this._playing) {
      this._d = Date.now() - this._i;
      this._playing = false;
    }
  }

  static stop() {
    if (!this._player) return;

    this._d = 0;
    this._player.stop();
    this._playing = false;
  }

  static speed(speed: number) {
    this._player?.set_speed(speed);
  }

  static volume(level: number) {
    this._player?.set_volume(level);
  }

  static setMaster(value: boolean) {
    this._dropTimer();
    this._master = value;
    if (this._master) {
      // Only when player is enabled
      if (this._player) {
        setMediaSessionActionHandler();
        this._timerId = setInterval(this._posHandler.bind(this), 800);
        this._startSilent();
      }
    } else {
      this._player?.stop();
      deleteMediaSessionActionHandler();
      this._stopSilent();
    }
  }

  static async testAudioFiles(files: string[]) {
    const a = new Audio();
    for (const file of files) {
      a.src = file;
      try {
        await a.play();
        this._playableFile = file;
        if (this._master && this._player) this._startSilent(a);
        break;
      } catch {}
    }
  }

  private static _startSilent(ele?: HTMLAudioElement) {
    this._audioEle?.pause();
    if (!this._playableFile) return;
    this._audioEle = ele ?? new Audio(this._playableFile);
    this._audioEle.loop = true;
    this._audioEle.play().catch(console.error);
  }

  private static _stopSilent() {
    this._audioEle?.pause();
    this._audioEle = undefined;
  }

  private static _dropTimer() {
    if (this._timerId) {
      clearInterval(this._timerId);
      this._timerId = undefined;
    }
  }

  private static _posHandler() {
    if (!this._player || !this._playing) return;
    if (this._player.empty()) {
      this._playing = false;
      vscode.postMessage({ command: "end" } as ProviderCMsg);
      return;
    }
    const pos = (Date.now() - this._i + this._d) / 1000;
    vscode.postMessage({ command: "position", pos } as ProviderCMsg);
    if (navigator.mediaSession) {
      navigator.mediaSession.setPositionState?.({ position: pos });
    }
  }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
const Provider = (): JSX.Element => {
  const [profiles, setProfiles] = useState<NeteaseTypings.Profile[]>([]);

  useEffect(() => {
    const handler = ({ data }: { data: ProviderSMsg }) => {
      if (!navigator.mediaSession) return;
      switch (data.command) {
        case "master":
          Controller.setMaster(data.is);
          break;
        case "test":
          Controller.testAudioFiles(data.files).catch(console.error);
          break;
        case "state":
          navigator.mediaSession.playbackState = data.state;
          break;
        case "metadata":
          navigator.mediaSession.metadata = new MediaMetadata(data);
          navigator.mediaSession.setPositionState?.({
            duration: data.duration,
          });
          break;
        case "account":
          setProfiles(data.profiles);
          break;
        case "load":
          Controller.load(data.url).catch(console.error);
          break;
        case "play":
          Controller.play();
          break;
        case "pause":
          Controller.pause();
          break;
        case "stop":
          Controller.stop();
          break;
        case "speed":
          Controller.speed(data.speed);
          break;
        case "volume":
          Controller.volume(data.level);
          break;
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [setProfiles]);

  return (
    <div className="flex flex-col max-w-2xl">
      <audio id="audio"></audio>
      {profiles.map(({ userId, nickname, avatarUrl, backgroundUrl }) => (
        <div
          key={userId}
          className="rounded-lg cursor-pointer mx-1 my-2 bg-center bg-cover"
          style={{ backgroundImage: `url("${backgroundUrl}")` }}
          onClick={() =>
            vscode.postMessage({ command: "account", userId } as ProviderCMsg)
          }
        >
          <div className="h-16 flex flex-row items-center overflow-hidden p-2 bg-black bg-opacity-30">
            <img
              className="rounded-full mx-4"
              src={avatarUrl}
              alt={nickname}
            ></img>
            <div className="text-white font-bold text-xl">{nickname}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

let loaded = false;

render(<Provider />, root, () => {
  if (loaded) return;
  loaded = true;
  vscode.postMessage({ command: "pageLoaded" } as ProviderCMsg);
});
