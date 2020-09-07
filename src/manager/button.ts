import {
  ExtensionContext,
  QuickPickItem,
  StatusBarAlignment,
  StatusBarItem,
  window,
} from "vscode";
import { BUTTON_KEY } from "../constant";
import { LoggedIn } from "../state";
import { MultiStepInput } from "../util";
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

  private static buttonShow = [true, true, true, true, true, true, true, false];
  private static buttonText = [
    "$(account)",
    "$(chevron-left)",
    "$(play)",
    "$(chevron-right)",
    "$(star)",
    "$(unmute)",
    "$(flame)",
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
  private static context: ExtensionContext;

  static async init(context: ExtensionContext): Promise<void> {
    this.context = context;
    for (let i = 0; i < this.buttons.length; ++i) {
      this.buttons[i].text = this.buttonText[i];
      this.buttons[i].tooltip = this.buttonTooltip[i];
      this.buttons[i].command = this.buttonCommand[i];
    }
    this.buttons[0].show();
    this.buttonShow = this.context.globalState.get(BUTTON_KEY) || [
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      false,
    ];
  }

  static async toggle(): Promise<void> {
    const pickButton = async (input: MultiStepInput) => {
      interface T extends QuickPickItem {
        id: number;
      }

      const items: T[] = [];
      for (let id = 1; id < this.buttons.length; ++id) {
        items.push({
          label: `${this.buttonText[id]} ${this.buttonTooltip[id]}`,
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

    MultiStepInput.run((input) => pickButton(input));
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
