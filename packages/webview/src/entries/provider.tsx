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
const seek = (detail: MediaSessionActionDetails) => {
  if (detail.seekTime) {
    /* Controller.seek() */
  } else if (detail.seekOffset) Controller.seek(detail.seekOffset);
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

    console.log("Audio Player: HTMLAudioElement");
  }

  async load(data: Uint8Array): Promise<boolean> {
    this._audio.src = URL.createObjectURL(new Blob([data.buffer]));
    try {
      await this._audio.play();
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
    this._audio.currentTime = this._audio.currentTime + seekOffset;
  }
}

class Controller {
  private static _player?: Player | WebAudioPlayer;

  private static _playing = false;

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

    const msg: ProviderCMsg = { command: "pageLoaded" };
    vscode.postMessage(msg);
  }

  static async load(url: string) {
    if (!this._player) return;

    const rep = await fetch(url);
    const buf = await rep.arrayBuffer();
    this._playing = !!(await this._player.load(new Uint8Array(buf)));

    if (this._playing) {
      const msg: ProviderCMsg = { command: "load" };
      vscode.postMessage(msg);
    }
    this._syncState();
  }

  static async play() {
    if (!this._player) return;
    this._playing = !!(await this._player.play());
    this._syncState();
  }

  static pause() {
    if (!this._player) return;
    this._player.pause();
    this._playing = false;
    this._syncState();
  }

  static stop() {
    if (!this._player) return;
    this._player.stop();
    this._playing = false;
    this._syncState();
  }

  static speed(speed: number) {
    this._player?.set_speed(speed);
  }

  static volume(level: number) {
    this._player?.set_volume(level / 100);
  }

  static seek(seekOffset: number) {
    this._player?.seek(seekOffset);
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

  private static _syncState() {
    const msg: ProviderCMsg = {
      command: "playing",
      playing: this._playing,
    };
    vscode.postMessage(msg);
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
      const msg: ProviderCMsg = { command: "end" };
      vscode.postMessage(msg);
      return;
    }

    const msg: ProviderCMsg = {
      command: "position",
      pos: this._player.position(),
    };
    vscode.postMessage(msg);
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
          Controller.play().catch(console.error);
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
        case "seek":
          Controller.seek(data.seekOffset);
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
          onClick={() => {
            const msg: ProviderCMsg = { command: "account", userId };
            vscode.postMessage(msg);
          }}
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
