import { CONTEXT, MultiStepInput, STATE } from "../utils/index.js";
import { LocalFileTreeItem, type QueueContent } from "../treeview/index.js";
import { MarkdownString, StatusBarAlignment, window } from "vscode";
import { BUTTON_KEY } from "../constant/index.js";
import type { StatusBarItem } from "vscode";
import i18n from "../i18n/index.js";
import { parseFile } from "music-metadata";
import { randomUUID } from "node:crypto";

const enum Label {
  seekbackward,
  previous,
  play,
  next,
  seekforward,
  repeat,
  like,
  speed,
  volume,
  song,
  lyric,
}

interface MyStatusBarItem extends StatusBarItem {
  command: string;
}

class ButtonManager {
  #mdSong = "";

  readonly #defaultText = <const>[
    "$(triangle-left)",
    "$(chevron-left)",
    "$(play)",
    "$(chevron-right)",
    "$(triangle-right)",
    "$(sync-ignored)",
    "$(stop)",
    "$(dashboard)",
    "$(unmute)",
    "$(flame)",
    "$(text-size)",
  ];

  readonly #defaultTooltip = <const>[
    i18n.word.seekbackward,
    i18n.word.previousTrack,
    i18n.word.play,
    i18n.word.nextTrack,
    i18n.word.seekforward,
    i18n.word.repeat,
    i18n.word.like,
    i18n.word.speed,
    i18n.word.volume,
    i18n.word.song,
    i18n.word.lyric,
  ];

  readonly #defaultCommand = <const>[
    "cloudmusic.seekbackward",
    "cloudmusic.previous",
    "cloudmusic.toggle",
    "cloudmusic.next",
    "cloudmusic.seekforward",
    "cloudmusic.repeat",
    "cloudmusic.like",
    "cloudmusic.speed",
    "cloudmusic.volume",
    "cloudmusic.songDetail",
    "cloudmusic.lyric",
  ];

  readonly #buttons = [
    <MyStatusBarItem>window.createStatusBarItem(randomUUID(), StatusBarAlignment.Left, -128),
    <MyStatusBarItem>window.createStatusBarItem(randomUUID(), StatusBarAlignment.Left, -129),
    <MyStatusBarItem>window.createStatusBarItem(randomUUID(), StatusBarAlignment.Left, -130),
    <MyStatusBarItem>window.createStatusBarItem(randomUUID(), StatusBarAlignment.Left, -131),
    <MyStatusBarItem>window.createStatusBarItem(randomUUID(), StatusBarAlignment.Left, -132),
    <MyStatusBarItem>window.createStatusBarItem(randomUUID(), StatusBarAlignment.Left, -133),
    <MyStatusBarItem>window.createStatusBarItem(randomUUID(), StatusBarAlignment.Left, -134),
    <MyStatusBarItem>window.createStatusBarItem(randomUUID(), StatusBarAlignment.Left, -135),
    <MyStatusBarItem>window.createStatusBarItem(randomUUID(), StatusBarAlignment.Left, -136),
    <MyStatusBarItem>window.createStatusBarItem(randomUUID(), StatusBarAlignment.Left, -137),
    <MyStatusBarItem>window.createStatusBarItem(randomUUID(), StatusBarAlignment.Left, -138),
  ];

  #buttonShow = <boolean[]>Array(11).fill(true);

  readonly #mdTooltip = new MarkdownString("", true);

  constructor() {
    this.#defaultText.forEach((value, index) => (this.#buttons[index].text = value));

    this.#defaultTooltip.forEach((value, index) => (this.#buttons[index].tooltip = value));

    this.#defaultCommand.forEach((value, index) => (this.#buttons[index].command = value));

    this.#mdTooltip.isTrusted = true;
    this.#mdTooltip.supportHtml = true;
    this.#setMdTooltip();
  }

  init(): void {
    this.#buttonShow = CONTEXT.context.globalState.get(BUTTON_KEY, this.#buttonShow);
    this.#buttonShow.forEach((v, i: Label) => {
      if (i === Label.song) this.#buttons[i].show();
      else v ? this.#buttons[i].show() : this.#buttons[i].hide();
    });
  }

  toggle(): void {
    void MultiStepInput.run(async (input) => {
      const { i } = await input.showQuickPick({
        title: "",
        step: 1,
        totalSteps: 1,
        items: this.#defaultText.map((text, i: Label) => ({
          label: `${text} ${this.#defaultTooltip[i]}`,
          description: this.#buttonShow[i] ? i18n.word.show : i18n.word.hide,
          i,
        })),
        placeholder: i18n.sentence.hint.button,
      });

      const show = (this.#buttonShow[i] = !this.#buttonShow[i]);
      if (i === Label.song) {
        if (show) this.#buttons[Label.song].text = "$(flame)";
      } else show ? this.#buttons[i].show() : this.#buttons[i].hide();

      await CONTEXT.context.globalState.update(BUTTON_KEY, this.#buttonShow);
      return input.stay();
    });
  }

  buttonPrevious(personalFm: boolean): void {
    if (personalFm) {
      this.#buttons[Label.previous].text = "$(trash)";
      this.#buttons[Label.previous].tooltip = i18n.word.trash;
      this.#buttons[Label.previous].command = "cloudmusic.fmTrash";
    } else {
      this.#buttons[Label.previous].text = "$(chevron-left)";
      this.#buttons[Label.previous].tooltip = i18n.word.previousTrack;
      this.#buttons[Label.previous].command = "cloudmusic.previous";
    }
    this.#setMdTooltip();
  }

  buttonPlay(playing: boolean): void {
    this.#buttons[Label.play].text = playing ? "$(debug-pause)" : "$(play)";
    this.#buttons[Label.play].tooltip = playing ? i18n.word.pause : i18n.word.play;
    this.#setMdTooltip();
  }

  buttonRepeat(r: boolean): void {
    this.#buttons[Label.repeat].text = r ? "$(sync)" : "$(sync-ignored)";
    this.#setMdTooltip();
  }

  buttonLike(): void {
    this.#buttons[Label.like].text = STATE.like ? "$(heart)" : "$(stop)";
    this.#buttons[Label.like].tooltip = STATE.like ? i18n.word.like : "";
    this.#setMdTooltip();
  }

  buttonVolume(level: number): void {
    this.#buttons[Label.volume].tooltip = `${i18n.word.volume}: ${level}`;
  }

  buttonSpeed(speed: number): void {
    this.#buttons[Label.speed].tooltip = `${i18n.word.speed}: ${speed}`;
  }

  buttonSong(ele?: QueueContent | string): void {
    if (!ele || typeof ele === "string") {
      this.#buttons[Label.song].text = ele || "$(flame)";
      this.#mdSong = "";
    } else {
      const item = "mainSong" in ele.data ? ele.data.mainSong : ele.data;
      const ars = item.ar.map(({ name }) => name).join("/");
      this.#buttons[Label.song].text = ars ? `${item.name}-${ars}` : item.name;
      this.#mdSong = `<table><tr><th align="center">${item.name}</th></tr><tr><td align="center">${ars}</td></tr><tr><td align="center">${ele.tooltip}</td></tr><tr><td align="center"><img src="${item.al.picUrl}" alt="${item.al.name}" width="384"/></td></tr><tr><td align="center">`;
      if (ele instanceof LocalFileTreeItem) {
        parseFile(ele.data.abspath)
          .then(({ common: { picture } }) => {
            if (!picture?.length) return;
            const [{ data, format }] = picture;
            const picUrl = `data:${format};base64,${data.toString("base64")}`;
            if (picUrl.length < 81920) {
              // TODO: resize large image
              this.#mdSong = this.#mdSong.replace(`<img src="" `, `<img src="${picUrl}" `);
              this.#setMdTooltip();
            }
          })
          .catch(console.error);
      }
    }

    this.#setMdTooltip();
  }

  buttonLyric(text?: string): void {
    this.#buttons[Label.lyric].text = STATE.showLyric && text ? text : "$(text-size)";
  }

  #setMdTooltip() {
    this.#mdTooltip.value = `${this.#mdSong}${this.#buttons
      .slice(0, this.#buttons.length - 2)
      .map(({ text, command }) => `<a href="command:${command}">${text}</a>`)
      .join("<span>&nbsp;&nbsp;&nbsp;·&nbsp;&nbsp;&nbsp;</span>")}</td></tr></table>`;

    this.#buttons[Label.song].tooltip = this.#mdTooltip;
  }
}

export const BUTTON_MANAGER = new ButtonManager();
