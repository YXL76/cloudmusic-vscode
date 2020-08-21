import { StatusBarAlignment, StatusBarItem, window } from "vscode";
import { existsSync, readFileSync, writeFile } from "fs";
import { BUTTON_FILE } from "../constant";
import { LoggedIn } from "../state";
import { i18n } from "../i18n";

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
  private static buttonText = [
    "$(account)",
    "$(chevron-left)",
    "$(play)",
    "$(chevron-right)",
    "$(star)",
    "$(unmute)",
    "$(file-media)",
    "$(text-size)",
  ];
  private static buttonTooltip = [
    i18n.word.account,
    i18n.word.previousTrack,
    i18n.word.play,
    i18n.word.nextTrack,
    i18n.word.like,
    i18n.word.volume,
    i18n.word.song,
    i18n.word.lyric,
  ];
  private static buttonCommand = [
    "cloudmusic.signin",
    "cloudmusic.previous",
    "cloudmusic.play",
    "cloudmusic.next",
    "cloudmusic.like",
    "cloudmusic.volume",
    "cloudmusic.songDetail",
    "cloudmusic.lyric",
  ];

  static init(): void {
    for (let i = 0; i < this.buttons.length; ++i) {
      this.buttons[i].text = this.buttonText[i];
      this.buttons[i].tooltip = this.buttonTooltip[i];
      this.buttons[i].command = this.buttonCommand[i];
    }
    this.buttons[0].show();
  }

  static async toggle(): Promise<void> {
    const pick: {
      label: string;
      description: string;
      id: number;
    }[] = [];
    for (let id = 1; id < this.buttons.length; ++id) {
      pick.push({
        label: `${this.buttonText[id]} ${this.buttonTooltip[id]}`,
        description: this.buttonShow[id] ? i18n.word.show : i18n.word.hide,
        id,
      });
    }
    const button = await window.showQuickPick(pick, {
      placeHolder: i18n.sentence.hint.button,
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
    this.buttons[ButtonLabel.account].tooltip = tooltip;
    this.buttons[ButtonLabel.account].command = "cloudmusic.account";
  }

  static buttonAccountSignin(): void {
    this.buttons[ButtonLabel.account].command = "cloudmusic.signin";
  }

  static buttonPrevious(personalFm: boolean): void {
    if (personalFm) {
      this.buttons[ButtonLabel.previous].text = "$(trash)";
      this.buttons[ButtonLabel.previous].tooltip = i18n.word.trash;
      this.buttons[ButtonLabel.previous].command = "cloudmusic.fmTrash";
    } else {
      this.buttons[ButtonLabel.previous].text = this.buttonText[
        ButtonLabel.previous
      ];
      this.buttons[ButtonLabel.previous].tooltip = this.buttonTooltip[
        ButtonLabel.previous
      ];
      this.buttons[ButtonLabel.previous].command = this.buttonCommand[
        ButtonLabel.previous
      ];
    }
  }

  static buttonPlay(playing: boolean): void {
    this.buttons[ButtonLabel.play].text = playing
      ? "$(debug-pause)"
      : "$(play)";
    this.buttons[ButtonLabel.play].tooltip = playing
      ? i18n.word.pause
      : i18n.word.play;
  }

  static buttonLike(islike: boolean): void {
    this.buttons[ButtonLabel.like].text = islike ? "$(star-full)" : "$(star)";
    this.buttons[ButtonLabel.like].tooltip = islike
      ? i18n.word.unlike
      : i18n.word.like;
  }

  static buttonVolume(level: number): void {
    this.buttons[ButtonLabel.volume].tooltip = `${i18n.word.volume}: ${level}`;
  }

  static buttonSong(name?: string, ar?: string): void {
    if (name) {
      this.buttons[ButtonLabel.song].text = name;
      this.buttons[ButtonLabel.song].tooltip = ar ? `${name} - ${ar}` : name;
    } else {
      this.buttons[ButtonLabel.song].text = this.buttonText[ButtonLabel.song];
      this.buttons[ButtonLabel.song].tooltip = this.buttonTooltip[
        ButtonLabel.song
      ];
    }
  }

  static buttonLyric(text?: string): void {
    this.buttons[ButtonLabel.lyric].text =
      text ?? this.buttonText[ButtonLabel.lyric];
  }
}
