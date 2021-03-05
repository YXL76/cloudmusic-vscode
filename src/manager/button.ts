import { BUTTON_KEY, LYRIC_KEY } from "../constant";
import type { ExtensionContext, StatusBarItem } from "vscode";
import { MultiStepInput, State } from "../util";
import { StatusBarAlignment, window } from "vscode";
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
      "cloudmusic.account",
      "cloudmusic.previous",
      "cloudmusic.play",
      "cloudmusic.next",
      "cloudmusic.repeat",
      "cloudmusic.like",
      "cloudmusic.volume",
      "cloudmusic.songDetail",
      "cloudmusic.lyric",
    ].forEach((value, index) => (this.buttons[index].command = value));

    this.buttonShow =
      this.context.globalState.get(BUTTON_KEY) || this.buttonShow;
    this.show();
  }

  static toggle(): void {
    const pickButton = async (input: MultiStepInput) => {
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
    };

    void MultiStepInput.run((input) => pickButton(input));
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
    this.buttons[ButtonLabel.account].tooltip = tooltip;
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
