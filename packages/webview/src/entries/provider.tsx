import type { ProviderCMsg, ProviderSMsg } from "@cloudmusic/shared";
import { useEffect, useState } from "react";
import type { NeteaseTypings } from "api";
import type { Player } from "cloudmusic-wasm";
import { createRoot } from "react-dom/client";
import { vscode } from "../utils";

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const root = createRoot(document.getElementById("root")!);

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

class WebAudioPlayer {
  private _audio: HTMLAudioElement;

  constructor() {
    this._audio = new Audio();
    this._audio.preservesPitch = true;
  }

  free(): void {
    // noop
  }

  load(data: Uint8Array): boolean {
    this._audio.src = URL.createObjectURL(new Blob([data.buffer]));
    return this.play();
  }

  play(): boolean {
    if (this.empty()) return false;
    this._audio.play().catch(console.error);
    return true;
  }

  pause(): void {
    this._audio.pause();
  }

  stop(): void {
    this._audio.src = "";
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  set_speed(speed: number): void {
    this._audio.playbackRate = speed; // TODO
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  set_volume(level: number): void {
    this._audio.volume = level / 100;
  }

  empty(): boolean {
    return this._audio.ended;
  }
}

class Controller {
  private static _player?: Player;

  private static _speed = 1;

  private static _playing = false;

  private static _duration = 0;

  private static _instant = 0;

  private static _master = false;

  // https://github.com/w3c/mediasession/issues/213
  private static _audioEle?: HTMLAudioElement;

  private static _timerId?: number;

  private static _playableFile?: string;

  static async init() {
    const { enablePlayer, testfiles } = window as unknown as {
      enablePlayer: boolean;
      testfiles: string[];
    };

    const fakeAudio = await this._testAudioFiles(testfiles);
    if (fakeAudio && this._master) this._startSilent(fakeAudio);

    if (enablePlayer) {
      this._player = fakeAudio
        ? new (await import("cloudmusic-wasm")).Player()
        : new WebAudioPlayer();
    }

    vscode.postMessage({ command: "pageLoaded" } as ProviderCMsg);
  }

  static async load(url: string) {
    if (!this._player) return;

    const rep = await fetch(url);
    const buf = await rep.arrayBuffer();
    this._playing = !!this._player.load(new Uint8Array(buf));
    if (this._playing) {
      this._instant = Date.now();
      this._duration = 0;
      vscode.postMessage({ command: "load" } as ProviderCMsg);
    }
  }

  static play() {
    if (!this._player) return;

    if (!this._playing) this._instant = Date.now();
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
      this._duration = (Date.now() - this._instant) * this._speed;
      this._playing = false;
    }
  }

  static stop() {
    if (!this._player) return;

    this._duration = 0;
    this._player.stop();
    this._playing = false;
  }

  static speed(speed: number) {
    this._player?.set_speed(speed);
    this._duration += (Date.now() - this._instant) * this._speed;
    this._instant = Date.now();
    this._speed = speed;
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

  private static async _testAudioFiles(
    files: string[]
  ): Promise<HTMLAudioElement | undefined> {
    const a = new Audio();
    const passed = [];
    for (const file of files) {
      a.src = file;
      try {
        await a.play();
        passed.push(file);
      } catch {}
    }
    if (passed.length !== files.length) {
      this._playableFile = passed.pop();
      return a;
    }
    return;
  }

  private static _startSilent(ele?: HTMLAudioElement) {
    if (!this._playableFile) return;
    this._audioEle?.pause();
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
    const pos =
      ((Date.now() - this._instant) * this._speed + this._duration) / 1000;
    vscode.postMessage({ command: "position", pos } as ProviderCMsg);
    /* if (navigator.mediaSession) {
      navigator.mediaSession.setPositionState?.({ position: pos });
    } */
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
    const handler = ({ data }: { data: ProviderSMsg }) => {
      if (!navigator.mediaSession) return;
      switch (data.command) {
        case "master":
          Controller.setMaster(data.is);
          break;
        case "state":
          navigator.mediaSession.playbackState = data.state;
          break;
        case "metadata":
          navigator.mediaSession.metadata = new MediaMetadata(data);
          /* navigator.mediaSession.setPositionState?.({
            duration: data.duration,
          }); */
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

root.render(<Provider />);
