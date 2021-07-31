import { MultiStepInput, State } from "../utils";
import { StatusBarAlignment, window } from "vscode";
import { BUTTON_KEY } from "../constant";
import type { ExtensionContext } from "vscode";
import i18n from "../i18n";

const enum Label {
  // account,
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

  private static readonly _buttons = [
    // window.createStatusBarItem(StatusBarAlignment.Left, -128),
    window.createStatusBarItem(StatusBarAlignment.Left, -129),
    window.createStatusBarItem(StatusBarAlignment.Left, -130),
    window.createStatusBarItem(StatusBarAlignment.Left, -131),
    window.createStatusBarItem(StatusBarAlignment.Left, -132),
    window.createStatusBarItem(StatusBarAlignment.Left, -133),
    window.createStatusBarItem(StatusBarAlignment.Left, -134),
    window.createStatusBarItem(StatusBarAlignment.Left, -135),
    window.createStatusBarItem(StatusBarAlignment.Left, -136),
  ];

  private static _buttonShow = Array(8).fill(true) as boolean[];

  static init(): void {
    [
      // "$(account)",
      "$(chevron-left)",
      "$(play)",
      "$(chevron-right)",
      "$(sync-ignored)",
      "$(stop)",
      "$(unmute)",
      "$(flame)",
      State.showLyric ? "$(text-size)" : i18n.word.disabled,
    ].forEach((value, index) => (this._buttons[index].text = value));

    [
      // i18n.word.account,
      i18n.word.previousTrack,
      i18n.word.play,
      i18n.word.nextTrack,
      i18n.word.repeat,
      i18n.word.like,
      i18n.word.volume,
      i18n.word.song,
      i18n.word.lyric,
    ].forEach((value, index) => (this._buttons[index].tooltip = value));

    [
      // "cloudmusic.account",
      "cloudmusic.previous",
      "cloudmusic.toggle",
      "cloudmusic.next",
      "cloudmusic.repeat",
      "cloudmusic.like",
      "cloudmusic.volume",
      "cloudmusic.songDetail",
      "cloudmusic.lyric",
    ].forEach((value, index) => (this._buttons[index].command = value));

    this._buttonShow = this.context.globalState.get(
      BUTTON_KEY,
      this._buttonShow
    );

    this._buttons.forEach((v, i) =>
      this._buttonShow[i] ? v.show() : v.hide()
    );
  }

  static toggle(): void {
    void MultiStepInput.run(async (input) => {
      const { i } = await input.showQuickPick({
        title: "",
        step: 1,
        totalSteps: 1,
        items: this._buttons.map(({ text, tooltip }, i) => ({
          label: `${text} ${tooltip as string}`,
          description: this._buttonShow[i] ? i18n.word.show : i18n.word.hide,
          i,
        })),
        placeholder: i18n.sentence.hint.button,
      });
      this._buttonShow[i] = !this._buttonShow[i];
      this._buttonShow[i] ? this._buttons[i].show() : this._buttons[i].hide();
      await this.context.globalState.update(BUTTON_KEY, this._buttonShow);
      return input.stay();
    });
  }

  /* static buttonAccount(tooltip: string): void {
    this.buttons[Label.account].tooltip = tooltip;
  } */

  static buttonPrevious(personalFm: boolean): void {
    if (personalFm) {
      this._buttons[Label.previous].text = "$(trash)";
      this._buttons[Label.previous].tooltip = i18n.word.trash;
      this._buttons[Label.previous].command = "cloudmusic.fmTrash";
    } else {
      this._buttons[Label.previous].text = "$(chevron-left)";
      this._buttons[Label.previous].tooltip = i18n.word.previousTrack;
      this._buttons[Label.previous].command = "cloudmusic.previous";
    }
  }

  static buttonPlay(playing: boolean): void {
    this._buttons[Label.play].text = playing ? "$(debug-pause)" : "$(play)";
    this._buttons[Label.play].tooltip = playing
      ? i18n.word.pause
      : i18n.word.play;
  }

  static buttonRepeat(r: boolean): void {
    this._buttons[Label.repeat].text = r ? "$(sync)" : "$(sync-ignored)";
  }

  static buttonLike(islike: boolean): void {
    this._buttons[Label.like].text = islike ? "$(heart)" : "$(stop)";
    this._buttons[Label.like].tooltip = islike ? i18n.word.like : "";
  }

  static buttonVolume(level: number): void {
    this._buttons[Label.volume].tooltip = `${i18n.word.volume}: ${level}`;
  }

  static buttonSong(name?: string, ar?: string): void {
    if (name) {
      this._buttons[Label.song].text = name;
      this._buttons[Label.song].tooltip = ar ? `${name} - ${ar}` : name;
    } else {
      this._buttons[Label.song].text = "$(flame)";
      this._buttons[Label.song].tooltip = i18n.word.song;
    }
  }

  static buttonLyric(text?: string): void {
    this._buttons[Label.lyric].text = State.showLyric
      ? text ?? "$(text-size)"
      : i18n.word.disabled;
  }
}
