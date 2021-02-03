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
  like,
  volume,
  song,
  lyric,
}

export class ButtonManager {
  static context: ExtensionContext;

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
  ];

  private static buttonShow = [true, true, true, true, true, true, true, true];

  static init() {
    this.showLyric = this.context.globalState.get(LYRIC_KEY) || this.showLyric;

    this.buttons[0].text = "$(account)";
    this.buttons[1].text = "$(chevron-left)";
    this.buttons[2].text = "$(play)";
    this.buttons[3].text = "$(chevron-right)";
    this.buttons[4].text = "$(star)";
    this.buttons[5].text = "$(unmute)";
    this.buttons[6].text = "$(flame)";
    this.buttons[7].text = this.showLyric ? "$(text-size)" : i18n.word.disabled;

    this.buttons[0].tooltip = i18n.word.account;
    this.buttons[1].tooltip = i18n.word.previousTrack;
    this.buttons[2].tooltip = i18n.word.play;
    this.buttons[3].tooltip = i18n.word.nextTrack;
    this.buttons[4].tooltip = i18n.word.like;
    this.buttons[5].tooltip = i18n.word.volume;
    this.buttons[6].tooltip = i18n.word.song;
    this.buttons[7].tooltip = i18n.word.lyric;

    this.buttons[0].command = "cloudmusic.signin";
    this.buttons[1].command = "cloudmusic.previous";
    this.buttons[2].command = "cloudmusic.play";
    this.buttons[3].command = "cloudmusic.next";
    this.buttons[4].command = "cloudmusic.like";
    this.buttons[5].command = "cloudmusic.volume";
    this.buttons[6].command = "cloudmusic.songDetail";
    this.buttons[7].command = "cloudmusic.lyric";

    this.buttons[0].show();
    this.buttonShow =
      this.context.globalState.get(BUTTON_KEY) || this.buttonShow;
    while (this.buttonShow.length < this.buttons.length) {
      this.buttonShow.push(true);
    }
    this.show();
  }

  static toggle() {
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
      const button = await input.showQuickPick({
        title: "",
        step: 1,
        totalSteps: 1,
        items,
        placeholder: i18n.sentence.hint.button,
      });
      const { id } = button;
      this.buttonShow[id] = !this.buttonShow[id];
      if (LoggedIn.get()) {
        this.buttonShow[id] ? this.buttons[id].show() : this.buttons[id].hide();
      }
      await this.context.globalState.update(BUTTON_KEY, this.buttonShow);
      return input.pop();
    };

    void MultiStepInput.run(pickButton);
  }

  static show() {
    for (let i = 1; i < this.buttons.length; ++i) {
      if (this.buttonShow[i]) {
        this.buttons[i].show();
      } else {
        this.buttons[i].hide();
      }
    }
  }

  static hide() {
    for (let i = 1; i < this.buttons.length; ++i) {
      this.buttons[i].hide();
    }
  }

  static buttonAccountAccount(tooltip: string) {
    this.buttons[ButtonLabel.account].tooltip = tooltip;
    this.buttons[ButtonLabel.account].command = "cloudmusic.account";
  }

  static buttonAccountSignin() {
    this.buttons[ButtonLabel.account].command = "cloudmusic.signin";
  }

  static buttonPrevious(personalFm: boolean) {
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

  static buttonPlay(playing: boolean) {
    this.buttons[ButtonLabel.play].text = playing
      ? "$(debug-pause)"
      : "$(play)";
    this.buttons[ButtonLabel.play].tooltip = playing
      ? i18n.word.pause
      : i18n.word.play;
  }

  static buttonLike(islike: boolean) {
    this.buttons[ButtonLabel.like].text = islike ? "$(star-full)" : "$(star)";
    this.buttons[ButtonLabel.like].tooltip = islike
      ? i18n.word.dislike
      : i18n.word.like;
  }

  static buttonVolume(level: number) {
    this.buttons[ButtonLabel.volume].tooltip = `${i18n.word.volume}: ${level}`;
  }

  static buttonSong(name?: string, ar?: string) {
    if (name) {
      this.buttons[ButtonLabel.song].text = name;
      this.buttons[ButtonLabel.song].tooltip = ar ? `${name} - ${ar}` : name;
    } else {
      this.buttons[ButtonLabel.song].text = "$(flame)";
      this.buttons[ButtonLabel.song].tooltip = i18n.word.song;
    }
  }

  static toggleLyric() {
    this.showLyric = !this.showLyric;
    void this.context.globalState.update(LYRIC_KEY, this.showLyric);
  }

  static buttonLyric(text?: string) {
    if (this.showLyric) {
      this.buttons[ButtonLabel.lyric].text = text ?? "$(text-size)";
    } else {
      this.buttons[ButtonLabel.lyric].text = i18n.word.disabled;
    }
  }
}
