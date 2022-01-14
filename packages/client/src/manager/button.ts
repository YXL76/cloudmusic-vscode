import type { ExtensionContext, StatusBarItem } from "vscode";
import { MarkdownString, StatusBarAlignment, window } from "vscode";
import { MultiStepInput, State } from "../utils";
import { BUTTON_KEY } from "../constant";
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

interface MyStatusBarItem extends StatusBarItem {
  command: string;
}

const LEFT = StatusBarAlignment.Left;

export class ButtonManager {
  static context: ExtensionContext;

  private static _mdSong = "";

  private static readonly _defaultText = [
    // "$(account)",
    "$(chevron-left)",
    "$(play)",
    "$(chevron-right)",
    "$(sync-ignored)",
    "$(stop)",
    "$(unmute)",
    "$(flame)",
    "$(text-size)",
  ] as const;

  private static readonly _defaultTooltip = [
    // i18n.word.account,
    i18n.word.previousTrack,
    i18n.word.play,
    i18n.word.nextTrack,
    i18n.word.repeat,
    i18n.word.like,
    i18n.word.volume,
    i18n.word.song,
    i18n.word.lyric,
  ] as const;

  private static readonly _defaultCommand = [
    // "cloudmusic.account",
    "cloudmusic.previous",
    "cloudmusic.toggle",
    "cloudmusic.next",
    "cloudmusic.repeat",
    "cloudmusic.like",
    "cloudmusic.volume",
    "cloudmusic.songDetail",
    "cloudmusic.lyric",
  ] as const;

  private static readonly _buttons = [
    // window.createStatusBarItem(LEFT, -128) MyStatusBarItem,
    window.createStatusBarItem(LEFT, -129) as MyStatusBarItem,
    window.createStatusBarItem(LEFT, -130) as MyStatusBarItem,
    window.createStatusBarItem(LEFT, -131) as MyStatusBarItem,
    window.createStatusBarItem(LEFT, -132) as MyStatusBarItem,
    window.createStatusBarItem(LEFT, -133) as MyStatusBarItem,
    window.createStatusBarItem(LEFT, -134) as MyStatusBarItem,
    window.createStatusBarItem(LEFT, -135) as MyStatusBarItem,
    window.createStatusBarItem(LEFT, -136) as MyStatusBarItem,
  ];

  private static _buttonShow = Array(8).fill(true) as boolean[];

  private static readonly _mdTooltip = new MarkdownString("", true);

  static init(): void {
    this._defaultText.forEach(
      (value, index) => (this._buttons[index].text = value)
    );

    this._defaultTooltip.forEach(
      (value, index) => (this._buttons[index].tooltip = value)
    );

    this._defaultCommand.forEach(
      (value, index) => (this._buttons[index].command = value)
    );

    this._mdTooltip.isTrusted = true;
    this._mdTooltip.supportHtml = true;
    this._setMdTooltip();

    this._buttonShow = this.context.globalState.get(
      BUTTON_KEY,
      this._buttonShow
    );

    this._buttonShow.forEach((v, i) => {
      if (i === Label.song) this._buttons[i].show();
      else v ? this._buttons[i].show() : this._buttons[i].hide();
    });
  }

  static toggle(): void {
    void MultiStepInput.run(async (input) => {
      const { i } = await input.showQuickPick({
        title: "",
        step: 1,
        totalSteps: 1,
        items: this._defaultText.map((text, i) => ({
          label: `${text} ${this._defaultTooltip[i]}`,
          description: this._buttonShow[i] ? i18n.word.show : i18n.word.hide,
          i,
        })),
        placeholder: i18n.sentence.hint.button,
      });

      const show = (this._buttonShow[i] = !this._buttonShow[i]);
      if (i === Label.song) {
        if (show) this._buttons[Label.song].text = "$(flame)";
      } else show ? this._buttons[i].show() : this._buttons[i].hide();

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
    this._setMdTooltip();
  }

  static buttonPlay(playing: boolean): void {
    this._buttons[Label.play].text = playing ? "$(debug-pause)" : "$(play)";
    this._buttons[Label.play].tooltip = playing
      ? i18n.word.pause
      : i18n.word.play;
    this._setMdTooltip();
  }

  static buttonRepeat(r: boolean): void {
    this._buttons[Label.repeat].text = r ? "$(sync)" : "$(sync-ignored)";
    this._setMdTooltip();
  }

  static buttonLike(): void {
    this._buttons[Label.like].text = State.like ? "$(heart)" : "$(stop)";
    this._buttons[Label.like].tooltip = State.like ? i18n.word.like : "";
    this._setMdTooltip();
  }

  static buttonVolume(level: number): void {
    this._buttons[Label.volume].tooltip = `${i18n.word.volume}: ${level}`;
  }

  static buttonSong(name = "", ar = "", picUrl = "", al = ""): void {
    if (this._buttonShow[Label.song])
      this._buttons[Label.song].text = name || "$(flame)";

    this._mdSong = `<table><tr><th align="center">${name}</th></tr><tr><td align="center">${ar}</td></tr><tr><td align="center"><img src="${picUrl}" alt="${al}" width="384"/></td></tr><tr><td align="center">`;

    this._setMdTooltip();
  }

  static buttonLyric(text?: string): void {
    this._buttons[Label.lyric].text =
      State.showLyric && text ? text : "$(text-size)";
  }

  private static _setMdTooltip() {
    this._mdTooltip.value = `${this._mdSong}${this._buttons
      .slice(0, 6)
      .map(
        ({ text, command }) => `<a data-href="command:${command}">${text}</a>`
      )
      .join(
        "<span>&nbsp;&nbsp;&nbsp;·&nbsp;&nbsp;&nbsp;</span>"
      )}</td></tr></table>`;

    this._buttons[Label.song].tooltip = this._mdTooltip;
  }
}
