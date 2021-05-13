import type { ExtensionContext, StatusBarItem } from "vscode";
import { LikeState, MultiStepInput, State } from "../utils";
import { StatusBarAlignment, window } from "vscode";
import { BUTTON_KEY } from "../constant";
import i18n from "../i18n";

const enum Label {
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

  private static readonly buttons: StatusBarItem[] = [
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
    [
      "$(account)",
      "$(chevron-left)",
      "$(play)",
      "$(chevron-right)",
      "$(sync-ignored)",
      "$(stop)",
      "$(unmute)",
      "$(flame)",
      State.showLyric ? "$(text-size)" : i18n.word.disabled,
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
      "cloudmusic.account",
      "cloudmusic.previous",
      "cloudmusic.toggle",
      "cloudmusic.next",
      "cloudmusic.repeat",
      "cloudmusic.like",
      "cloudmusic.volume",
      "cloudmusic.songDetail",
      "cloudmusic.lyric",
    ].forEach((value, index) => (this.buttons[index].command = value));

    this.buttonShow = this.context.globalState.get(BUTTON_KEY, this.buttonShow);
    this.show();
  }

  static toggle(): void {
    void MultiStepInput.run(async (input) => {
      const { index } = await input.showQuickPick({
        title: "",
        step: 1,
        totalSteps: 1,
        items: this.buttons.map((button, index) => ({
          label: `${button.text} ${button.tooltip as string}`,
          description: this.buttonShow[index] ? i18n.word.show : i18n.word.hide,
          index,
        })),
        placeholder: i18n.sentence.hint.button,
      });
      this.buttonShow[index] = !this.buttonShow[index];
      if (State.login)
        this.buttonShow[index]
          ? this.buttons[index].show()
          : this.buttons[index].hide();
      await this.context.globalState.update(BUTTON_KEY, this.buttonShow);
      return input.stay();
    });
  }

  static show(): void {
    this.buttons.forEach((v, i) => {
      if (this.buttonShow[i]) v.show();
      else v.hide();
    });
  }

  static hide(): void {
    for (const i of this.buttons) i.hide();
  }

  static buttonAccount(tooltip: string): void {
    this.buttons[Label.account].tooltip = tooltip;
  }

  static buttonPrevious(personalFm: boolean): void {
    if (personalFm) {
      this.buttons[Label.previous].text = "$(trash)";
      this.buttons[Label.previous].tooltip = i18n.word.trash;
      this.buttons[Label.previous].command = "cloudmusic.fmTrash";
    } else {
      this.buttons[Label.previous].text = "$(chevron-left)";
      this.buttons[Label.previous].tooltip = i18n.word.previousTrack;
      this.buttons[Label.previous].command = "cloudmusic.previous";
    }
  }

  static buttonPlay(playing: boolean): void {
    this.buttons[Label.play].text = playing ? "$(debug-pause)" : "$(play)";
    this.buttons[Label.play].tooltip = playing
      ? i18n.word.pause
      : i18n.word.play;
  }

  static buttonRepeat(r: boolean): void {
    this.buttons[Label.repeat].text = r ? "$(sync)" : "$(sync-ignored)";
  }

  static buttonLike(islike: LikeState): void {
    let text!: string;
    let tooltip!: string;
    switch (islike) {
      case LikeState.none:
        text = "$(stop)";
        tooltip = "";
        break;
      case LikeState.like:
        text = "$(star-full)";
        tooltip = i18n.word.dislike;
        break;
      case LikeState.dislike:
        text = "$(star)";
        tooltip = i18n.word.like;
    }
    this.buttons[Label.like].text = text;
    this.buttons[Label.like].tooltip = tooltip;
  }

  static buttonVolume(level: number): void {
    this.buttons[Label.volume].tooltip = `${i18n.word.volume}: ${level}`;
  }

  static buttonSong(name?: string, ar?: string): void {
    if (name) {
      this.buttons[Label.song].text = name;
      this.buttons[Label.song].tooltip = ar ? `${name} - ${ar}` : name;
    } else {
      this.buttons[Label.song].text = "$(flame)";
      this.buttons[Label.song].tooltip = i18n.word.song;
    }
  }

  static buttonLyric(text?: string): void {
    this.buttons[Label.lyric].text = State.showLyric
      ? text ?? "$(text-size)"
      : i18n.word.disabled;
  }
}
