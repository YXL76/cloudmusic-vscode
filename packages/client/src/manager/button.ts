import { BUTTON_KEY, COMPACT } from "../constant";
import { MarkdownString, StatusBarAlignment, window } from "vscode";
import { MultiStepInput, State } from "../utils";
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

  private static _compact = false;

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

  private static readonly _mdTooltip = new MarkdownString(
    this._mdTooltipV(),
    true
  );

  static init(): void {
    this._mdTooltip.isTrusted = true;

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

    this._setCompact(COMPACT());
  }

  static setCompact(): void {
    const compact = COMPACT();
    console.log("tttttt", compact);
    if (compact !== this._compact) {
      this._compact = compact;
      this._setCompact(compact);
    }
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
      if (!this._compact)
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
    this._mdTooltip.value = this._mdTooltipV();
  }

  static buttonPlay(playing: boolean): void {
    this._buttons[Label.play].text = playing ? "$(debug-pause)" : "$(play)";
    this._buttons[Label.play].tooltip = playing
      ? i18n.word.pause
      : i18n.word.play;
    this._mdTooltip.value = this._mdTooltipV();
  }

  static buttonRepeat(r: boolean): void {
    this._buttons[Label.repeat].text = r ? "$(sync)" : "$(sync-ignored)";
    this._mdTooltip.value = this._mdTooltipV();
  }

  static buttonLike(): void {
    this._buttons[Label.like].text = State.like ? "$(heart)" : "$(stop)";
    this._buttons[Label.like].tooltip = State.like ? i18n.word.like : "";
    this._mdTooltip.value = this._mdTooltipV();
  }

  static buttonVolume(level: number): void {
    this._buttons[Label.volume].tooltip = `${i18n.word.volume}: ${level}`;
  }

  static buttonSong(name?: string, ar?: string): void {
    this._buttons[Label.song].text = name ? name : "$(flame)";
    if (!this._compact)
      this._buttons[Label.song].tooltip = name
        ? ar
          ? `${name} - ${ar}`
          : name
        : i18n.word.song;
  }

  static buttonLyric(text?: string): void {
    this._buttons[Label.lyric].text = State.showLyric
      ? text ?? "$(text-size)"
      : i18n.word.disabled;
  }

  private static _setCompact(compact: boolean): void {
    console.log("asdasd", compact);
    if (compact) {
      this._buttons[Label.song].tooltip = this._mdTooltip;
      for (let i = 0; i < 6; i++) this._buttons[i].hide();
    } else {
      console.log(this._buttonShow);
      this._buttons[Label.song].tooltip = i18n.word.song;
      this._buttons.forEach((v, i) =>
        this._buttonShow[i] ? v.show() : v.hide()
      );
    }
  }

  private static _mdTooltipV() {
    const fm = this._buttons[Label.previous].text === "$(trash)";
    const playing = this._buttons[Label.play].text === "$(debug-pause)";
    const repeat = this._buttons[Label.repeat].text === "$(sync)";
    const islike = State.like;

    return `${
      fm
        ? `[$(trash) ${i18n.word.trash}](command:cloudmusic.fmTrash)`
        : `[$(chevron-left) ${i18n.word.previousTrack}](command:cloudmusic.previous)`
    }
[${
      playing
        ? `$(debug-pause) ${i18n.word.pause}`
        : `$(play) ${i18n.word.play}`
    }](command:cloudmusic.toggle)
[$(chevron-right) ${i18n.word.nextTrack}](command:cloudmusic.next)
[${repeat ? "sync" : "$(sync-ignored)"} ${
      i18n.word.repeat
    }](command:cloudmusic.repeat)
${
  islike
    ? `$(stop) ${i18n.word.like}`
    : `[$(heart) ${i18n.word.like}](command:cloudmusic.like)`
}
[$(unmute) ${i18n.word.volume}](command:cloudmusic.volume)`;
  }
}
