import type { ProviderCMsg, ProviderSMsg } from "@cloudmusic/shared";
import { useEffect, useState } from "react";
import type { NeteaseTypings } from "api";
import type { Player } from "cloudmusic-wasm";
import { createRoot } from "react-dom/client";
import { vscode } from "../utils";

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const root = createRoot(document.getElementById("root")!);

const toggle = () => {
  const msg: ProviderCMsg = { command: "toggle" };
  vscode.postMessage(msg);
};
const previous = () => {
  const msg: ProviderCMsg = { command: "previous" };
  vscode.postMessage(msg);
};
const next = () => {
  const msg: ProviderCMsg = { command: "next" };
  vscode.postMessage(msg);
};
const seek = ({ action, seekTime, seekOffset }: MediaSessionActionDetails) => {
  if (seekTime) {
    const pos = Controller.position();
    if (pos) Controller.seek(seekTime - pos);
  } else if (seekOffset) Controller.seek(seekOffset);
  else {
    if (action === "seekbackward") Controller.seek(-15);
    else Controller.seek(15);
  }
};

function setMediaSessionActionHandler() {
  if (!navigator.mediaSession) return;
  navigator.mediaSession.setActionHandler("play", toggle);
  navigator.mediaSession.setActionHandler("pause", toggle);
  navigator.mediaSession.setActionHandler("stop", toggle);

  navigator.mediaSession.setActionHandler("previoustrack", previous);
  navigator.mediaSession.setActionHandler("nexttrack", next);

  navigator.mediaSession.setActionHandler("seekbackward", seek);
  navigator.mediaSession.setActionHandler("seekforward", seek);
  navigator.mediaSession.setActionHandler("seekto", seek);
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

class WebAudioPlayer {
  private _audio: HTMLAudioElement;

  constructor() {
    this._audio = new Audio();
    this._audio.preservesPitch = true;
    this._audio.preload = "auto";

    this._audio.addEventListener("durationchange", () => {
      if (this._audio.duration) {
        Controller.duration = this._audio.duration;
        Controller.setStatus(this._audio.currentTime);
      }
    });

    console.log("Audio Player: HTMLAudioElement");
  }

  async load(data: Uint8Array, play: boolean, seek?: number): Promise<boolean> {
    this._audio.src = URL.createObjectURL(new Blob([data.buffer]));
    try {
      if (seek) this._audio.currentTime += seek;
      if (play) await this._audio.play();
      return true;
    } catch {}
    return false;
  }

  // load(url: string): boolean {
  //   this._audio.src = url;
  //   return this.play();
  // }

  async play(): Promise<boolean> {
    if (this.empty()) return false;
    try {
      await this._audio.play();
      return true;
    } catch {}
    return false;
  }

  pause(): void {
    this._audio.pause();
  }

  stop(): void {
    this._audio.src = "";
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  set_speed(speed: number): void {
    this._audio.defaultPlaybackRate = speed;
    this._audio.playbackRate = speed;
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  set_volume(level: number): void {
    this._audio.volume = level;
  }

  empty(): boolean {
    return this._audio.ended;
  }

  position(): number {
    return this._audio.currentTime;
  }

  seek(seekOffset: number): void {
    // this._audio.fastSeek(seekOffset);
    this._audio.currentTime += seekOffset;
  }
}

class Controller {
  static duration = 300;

  private static _playbackRate = 1;

  private static _player?: Player | WebAudioPlayer;

  private static _playing = false;

  private static _master = false;

  // https://github.com/w3c/mediasession/issues/213
  private static _audioEle?: HTMLAudioElement;

  private static _timerId?: number;

  private static _playableFile?: string;

  private static set playing(playing: boolean) {
    if (this._playing !== playing) {
      this._playing = playing;
      navigator.mediaSession.playbackState = playing ? "playing" : "paused";
      if (this._player) this.setStatus(this._player.position());
      const msg: ProviderCMsg = { command: "playing", playing };
      vscode.postMessage(msg);
    }
  }

  static async init() {
    const { enablePlayer, testfiles } = window as unknown as { enablePlayer: boolean; testfiles: string[] };

    if (enablePlayer) {
      const fakeAudio = await this._testAudioFiles(testfiles);
      if (fakeAudio) this._playableFile = fakeAudio;

      this._player = fakeAudio ? new (await import("cloudmusic-wasm")).Player() : new WebAudioPlayer();

      if (this._master) {
        setMediaSessionActionHandler();
        this._startSilent().catch(console.error);
        if (!this._timerId) this._timerId = setInterval(this._posHandler.bind(this), 800);
      }
    }

    const msg: ProviderCMsg = { command: "pageLoaded" };
    vscode.postMessage(msg);
  }

  static async load(url: string, play: boolean, seek?: number) {
    if (!this._player) return;

    const rep = await fetch(url);
    const buf = await rep.arrayBuffer();

    if (await this._player.load(new Uint8Array(buf), play, seek)) {
      this.playing = play;
      const msg: ProviderCMsg = { command: "load" };
      vscode.postMessage(msg);
    } else {
      this.playing = false;
      const msg: ProviderCMsg = { command: "load", fail: true };
      vscode.postMessage(msg);
    }
  }

  static async play() {
    if (!this._player) return;
    this.playing = !!(await this._player.play());
  }

  static pause() {
    if (!this._player) return;
    this._player.pause();
    this.playing = false;
  }

  static stop() {
    if (!this._player) return;
    this._player.stop();
    this.playing = false;
  }

  static speed(speed: number) {
    this._playbackRate = speed;
    if (this._player) {
      this._player.set_speed(speed);
      Controller.setStatus(this._player.position());
    }
  }

  static volume(level: number) {
    this._player?.set_volume(level / 100);
  }

  static seek(seekOffset: number) {
    if (this._player) {
      this._player.seek(seekOffset);
      Controller.setStatus(this._player.position());
    }
  }

  static position() {
    return this._player?.position();
  }

  static setMaster(value: boolean) {
    this._master = value;
    if (this._timerId) {
      clearInterval(this._timerId);
      this._timerId = undefined;
    }
    if (this._master) {
      // Only when player is enabled
      if (this._player) {
        setMediaSessionActionHandler();
        this._timerId = setInterval(this._posHandler.bind(this), 800);
        this._startSilent().catch(console.error);
      }
    } else {
      this._player?.stop();
      deleteMediaSessionActionHandler();
      this._stopSilent();
    }
  }

  static setStatus(position: number) {
    navigator.mediaSession.setPositionState?.({ duration: this.duration, playbackRate: this._playbackRate, position });
  }

  private static async _testAudioFiles(files: string[]): Promise<string | undefined> {
    const audioCtx = new window.AudioContext();
    const passed = [];
    for (const file of files) {
      const rep = await fetch(file);
      const buf = await rep.arrayBuffer();
      try {
        await audioCtx.decodeAudioData(buf);
        passed.push(file);
      } catch {}
    }
    if (passed.length !== files.length) return passed.pop();
    return;
  }

  private static async _startSilent() {
    if (!this._playableFile || this._audioEle) return;
    const rep = await fetch(this._playableFile);
    const buf = await rep.arrayBuffer();
    this._audioEle = new Audio();
    this._audioEle.src = URL.createObjectURL(new Blob([buf]));
    this._audioEle.preload = "auto";
    this._audioEle.loop = true;
    this._audioEle.volume = 0.05;
    await this._audioEle.play();
  }

  private static _stopSilent() {
    this._audioEle?.pause();
    this._audioEle = undefined;
  }

  private static _posHandler() {
    if (!this._player || !this._playing) return;
    if (this._player.empty()) {
      this.playing = false;
      const msg: ProviderCMsg = { command: "end" };
      vscode.postMessage(msg);
      return;
    }

    const pos = this._player.position();
    const msg: ProviderCMsg = { command: "position", pos };
    vscode.postMessage(msg);
  }
}

let loaded = false;

// eslint-disable-next-line @typescript-eslint/naming-convention
const Provider = (): JSX.Element => {
  if (!loaded) {
    loaded = true;
    setTimeout(Controller.init.bind(Controller), 8);
  }

  const [profiles, setProfiles] = useState<NeteaseTypings.Profile[]>([]);

  useEffect(() => {
    const handler = ({ data }: { data: ProviderSMsg }): void => {
      if (!navigator.mediaSession) return;
      switch (data.command) {
        case "master":
          return Controller.setMaster(data.is);
        case "state":
          return void (navigator.mediaSession.playbackState = data.state);
        case "metadata":
          navigator.mediaSession.metadata = data.meta ? new MediaMetadata(data.meta) : null;
          if (data.duration) Controller.duration = data.duration;
          return Controller.setStatus(0);
        case "account":
          return setProfiles(data.profiles);
        case "load":
          return void Controller.load(data.url, data.play, data.seek).catch(console.error);
        case "play":
          return void Controller.play().catch(console.error);
        case "pause":
          return Controller.pause();
        case "stop":
          return Controller.stop();
        case "speed":
          return Controller.speed(data.speed);
        case "volume":
          return Controller.volume(data.level);
        case "seek":
          return Controller.seek(data.seekOffset);
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
          onClick={() => {
            const msg: ProviderCMsg = { command: "account", userId };
            vscode.postMessage(msg);
          }}
        >
          <div className="h-16 flex flex-row items-center overflow-hidden p-2 bg-black bg-opacity-30">
            <img className="rounded-full mx-4" src={avatarUrl} alt={nickname}></img>
            <div className="text-white font-bold text-xl">{nickname}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

root.render(<Provider />);
