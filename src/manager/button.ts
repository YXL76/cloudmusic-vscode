import { BUTTON_KEY, LYRIC_KEY } from "../constant";
import type { ExtensionContext, QuickPickItem, StatusBarItem } from "vscode";
import { StatusBarAlignment, window } from "vscode";
import { LoggedIn } from "../state";
import { MultiStepInput } from "../util";
import i18n from "../i18n";

const enum ButtonLabel {
  account,
  previous,
  play,
  next,
  repeat,
  like,
  volume,
  song,
  lyric,
}

export class ButtonManager {
  static context: ExtensionContext;

  static repeat = false;

  static showLyric = false;

  private static buttons: StatusBarItem[] = [
    window.createStatusBarItem(StatusBarAlignment.Left, -128),
    window.createStatusBarItem(StatusBarAlignment.Left, -129),
    window.createStatusBarItem(StatusBarAlignment.Left, -130),
    window.createStatusBarItem(StatusBarAlignment.Left, -131),
    window.createStatusBarItem(StatusBarAlignment.Left, -132),
    window.createStatusBarItem(StatusBarAlignment.Left, -133),
    window.createStatusBarItem(StatusBarAlignment.Left, -134),
    window.createStatusBarItem(StatusBarAlignment.Left, -135),
    window.createStatusBarItem(StatusBarAlignment.Left, -136),
  ];

  private static buttonShow = Array(9).fill(true) as boolean[];

  static init(): void {
    this.showLyric = this.context.globalState.get(LYRIC_KEY) || this.showLyric;

    [
      "$(account)",
      "$(chevron-left)",
      "$(play)",
      "$(chevron-right)",
      "$(sync-ignored)",
      "$(star)",
      "$(unmute)",
      "$(flame)",
      this.showLyric ? "$(text-size)" : i18n.word.disabled,
    ].forEach((value, index) => (this.buttons[index].text = value));

    [
      i18n.word.account,
      i18n.word.previousTrack,
      i18n.word.play,
      i18n.word.nextTrack,
      i18n.word.repeat,
      i18n.word.like,
      i18n.word.volume,
      i18n.word.song,
      i18n.word.lyric,
    ].forEach((value, index) => (this.buttons[index].tooltip = value));

    [
      "cloudmusic.signin",
      "cloudmusic.previous",
      "cloudmusic.play",
      "cloudmusic.next",
      "cloudmusic.repeat",
      "cloudmusic.like",
      "cloudmusic.volume",
      "cloudmusic.songDetail",
      "cloudmusic.lyric",
    ].forEach((value, index) => (this.buttons[index].command = value));

    this.buttons[0].show();
    this.buttonShow =
      this.context.globalState.get(BUTTON_KEY) || this.buttonShow;
    this.show();
  }

  static toggle(): void {
    const pickButton = async (input: MultiStepInput) => {
      interface T extends QuickPickItem {
        id: number;
      }

      const items: T[] = [];
      for (let id = 1; id < this.buttons.length; ++id) {
        items.push({
          label: `${this.buttons[id].text} ${
            this.buttons[id].tooltip as string
          }`,
          description: this.buttonShow[id] ? i18n.word.show : i18n.word.hide,
          id,
        });
      }
      const { id } = await input.showQuickPick({
        title: "",
        step: 1,
        totalSteps: 1,
        items,
        placeholder: i18n.sentence.hint.button,
      });
      this.buttonShow[id] = !this.buttonShow[id];
      if (LoggedIn.get())
        this.buttonShow[id] ? this.buttons[id].show() : this.buttons[id].hide();
      await this.context.globalState.update(BUTTON_KEY, this.buttonShow);
      return input.stay();
    };

    void MultiStepInput.run(pickButton);
  }

  static show(): void {
    for (let i = 1; i < this.buttons.length; ++i) {
      if (this.buttonShow[i]) {
        this.buttons[i].show();
      } else {
        this.buttons[i].hide();
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
      this.buttons[ButtonLabel.previous].text = "$(chevron-left)";
      this.buttons[ButtonLabel.previous].tooltip = i18n.word.previousTrack;
      this.buttons[ButtonLabel.previous].command = "cloudmusic.previous";
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

  static buttonRepeat(): void {
    this.repeat = !this.repeat;
    this.buttons[ButtonLabel.repeat].text = this.repeat
      ? "$(sync)"
      : "$(sync-ignored)";
  }

  static buttonLike(islike: boolean): void {
    this.buttons[ButtonLabel.like].text = islike ? "$(star-full)" : "$(star)";
    this.buttons[ButtonLabel.like].tooltip = islike
      ? i18n.word.dislike
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
      this.buttons[ButtonLabel.song].text = "$(flame)";
      this.buttons[ButtonLabel.song].tooltip = i18n.word.song;
    }
  }

  static toggleLyric(): void {
    this.showLyric = !this.showLyric;
    void this.context.globalState.update(LYRIC_KEY, this.showLyric);
  }

  static buttonLyric(text?: string): void {
    this.buttons[ButtonLabel.lyric].text = this.showLyric
      ? text ?? "$(text-size)"
      : i18n.word.disabled;
  }
}
