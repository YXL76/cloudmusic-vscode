import * as nls from "vscode-nls";
import { Command, StatusBarAlignment, StatusBarItem, window } from "vscode";
import { existsSync, readFileSync, writeFile } from "fs";
import { BUTTON_FILE } from "../constant";
import { LoggedIn } from "../state";

nls.config({
  messageFormat: nls.MessageFormat.bundle,
  bundleFormat: nls.BundleFormat.standalone,
})();

const localize = nls.loadMessageBundle();

enum ButtonLabel {
  account,
  previous,
  play,
  next,
  like,
  volume,
  song,
  lyric,
}

function getSetting(): boolean[] {
  try {
    if (existsSync(BUTTON_FILE)) {
      const { show } = JSON.parse(readFileSync(BUTTON_FILE, "utf8"));
      return show;
    }
  } catch {}
  return [true, true, true, true, true, true, true, false];
}

export class ButtonManager {
  private static buttons: StatusBarItem[] = [
    window.createStatusBarItem(StatusBarAlignment.Left, -128),
    window.createStatusBarItem(StatusBarAlignment.Left, -129),
    window.createStatusBarItem(StatusBarAlignment.Left, -130),
    window.createStatusBarItem(StatusBarAlignment.Left, -131),
    window.createStatusBarItem(StatusBarAlignment.Left, -132),
    window.createStatusBarItem(StatusBarAlignment.Left, -133),
    window.createStatusBarItem(StatusBarAlignment.Left, -134),
    window.createStatusBarItem(StatusBarAlignment.Left, -135),
  ];

  private static buttonShow = getSetting();
  private static buttonName = [
    `$(account) ${localize("account", "Account")}`,
    `$(chevron-left) ${localize("previous", "Previous")}`,
    `$(play) ${localize("play", "Play")}`,
    `$(chevron-right) ${localize("next", "Next")}`,
    `$(star) ${localize("like", "Like")}`,
    `$(unmute) ${localize("volume", "Volume")}`,
    `$(file-media) ${localize("song", "Song")}`,
    `$(text-size) ${localize("lyric", "Lyric")}`,
  ];

  static init(): void {
    this.updateButton(
      0,
      "$(account)",
      localize("account", "Account"),
      "cloudmusic.signin"
    );
    this.updateButton(
      1,
      "$(chevron-left)",
      localize("previous", "Previous"),
      "cloudmusic.previous"
    );
    this.updateButton(
      2,
      "$(play)",
      localize("play", "Play"),
      "cloudmusic.play"
    );
    this.updateButton(
      3,
      "$(chevron-right)",
      localize("next", "Next"),
      "cloudmusic.next"
    );
    this.updateButton(
      4,
      "$(star)",
      localize("like", "Like"),
      "cloudmusic.like"
    );
    this.updateButton(
      5,
      "$(unmute)",
      `${localize("volume", "Volume")}: 85`,
      "cloudmusic.volume"
    );
    this.updateButton(6, localize("song", "Song"), "", "cloudmusic.songDetail");
    this.updateButton(7, localize("lyric", "Lyric"), "", "cloudmusic.lyric");
    this.buttons[0].show();
  }

  private static updateButton(
    index: number,
    text: string,
    tooltip: string,
    command?: string | Command
  ): void {
    this.buttons[index].text = text;
    this.buttons[index].tooltip = tooltip;
    if (command) {
      this.buttons[index].command = command;
    }
  }

  static async toggle(): Promise<void> {
    const pick: {
      label: string;
      description: string;
      id: number;
    }[] = [];
    for (let id = 1; id < this.buttons.length; ++id) {
      pick.push({
        label: this.buttonName[id],
        description: this.buttonShow[id]
          ? localize("show", "Show")
          : localize("hide", "Hide"),
        id,
      });
    }
    const button = await window.showQuickPick(pick, {
      placeHolder: localize(
        "toggleButton.placeHolder",
        "Set buton is showing or hidding"
      ),
    });
    if (!button) {
      return;
    }
    const { id } = button;
    this.buttonShow[id] = !this.buttonShow[id];
    if (LoggedIn.get()) {
      this.buttonShow[id] ? this.buttons[id].show() : this.buttons[id].hide();
    }
    writeFile(BUTTON_FILE, JSON.stringify({ show: this.buttonShow }), () => {
      //
    });
  }

  static clearButtonCommand(index: number): void {
    this.buttons[index].command = undefined;
  }

  static show(): void {
    for (let i = 1; i < this.buttons.length; ++i) {
      if (this.buttonShow[i]) {
        this.buttons[i].show();
      }
    }
  }

  static hide(): void {
    for (let i = 1; i < this.buttons.length; ++i) {
      this.buttons[i].hide();
    }
  }

  static buttonAccountAccount(tooltip: string): void {
    this.updateButton(
      ButtonLabel.account,
      "$(account)",
      tooltip,
      "cloudmusic.account"
    );
  }

  static buttonAccountSignin(): void {
    this.updateButton(
      ButtonLabel.account,
      "$(account)",
      localize("account", "Account"),
      "cloudmusic.signin"
    );
  }

  static buttonPrevious(personalFm: boolean): void {
    personalFm
      ? this.updateButton(
          ButtonLabel.previous,
          "$(trash)",
          localize("trash", "Trash"),
          "cloudmusic.fmTrash"
        )
      : this.updateButton(
          ButtonLabel.previous,
          "$(chevron-left)",
          localize("previous", "Previous"),
          "cloudmusic.previous"
        );
  }

  static buttonPlay(playing: boolean): void {
    this.updateButton(
      ButtonLabel.play,
      playing ? "$(debug-pause)" : "$(play)",
      playing ? localize("pause", "Pause") : localize("play", "Play")
    );
  }

  static buttonLike(islike: boolean): void {
    this.updateButton(
      ButtonLabel.like,
      islike ? "$(star-full)" : "$(star)",
      islike ? localize("unlike", "Unlike") : localize("like", "Like")
    );
  }

  static buttonVolume(level: number): void {
    this.updateButton(
      ButtonLabel.volume,
      "$(unmute)",
      `${localize("volume", "Volume")}: ${level}`
    );
  }

  static buttonSong(name: string, ar: string): void {
    this.updateButton(ButtonLabel.song, name, ar ? `${name} - ${ar}` : name);
  }

  static buttonLyric(text: string): void {
    this.updateButton(ButtonLabel.lyric, text, "");
  }
}
