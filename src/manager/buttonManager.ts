import { Command, StatusBarAlignment, StatusBarItem, window } from "vscode";

export enum ButtonLabel {
  Account,
  Previous,
  Play,
  Next,
  Like,
}

export class ButtonManager {
  private static instance: ButtonManager;

  private buttons: StatusBarItem[] = [
    window.createStatusBarItem(StatusBarAlignment.Left, 512),
    window.createStatusBarItem(StatusBarAlignment.Left, 511),
    window.createStatusBarItem(StatusBarAlignment.Left, 510),
    window.createStatusBarItem(StatusBarAlignment.Left, 509),
    window.createStatusBarItem(StatusBarAlignment.Left, 508),
  ];

  constructor() {
    this.updateButton(0, "$(account)", "Account");
    this.updateButton(1, "$(chevron-left)", "Previous", "cloudmusic.previous");
    this.updateButton(2, "$(play)", "Play", "cloudmusic.play");
    this.updateButton(3, "$(chevron-right)", "Next", "cloudmusic.next");
    this.updateButton(4, "$(star)", "star", "cloudmusic.like");
    for (const button of this.buttons) {
      button.show();
    }
  }

  static getInstance(): ButtonManager {
    return this.instance
      ? this.instance
      : (this.instance = new ButtonManager());
  }

  updateButton(
    index: number,
    text: string,
    tooltip: string,
    command?: string | Command
  ) {
    this.buttons[index].text = text;
    this.buttons[index].tooltip = tooltip;
    if (command) {
      this.buttons[index].command = command;
    }
  }
}
