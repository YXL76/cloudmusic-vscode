import { Command, StatusBarAlignment, StatusBarItem, window } from "vscode";

enum ButtonLabel {
  account,
  previous,
  play,
  next,
  like,
  volume,
}

export class ButtonManager {
  private static buttons: StatusBarItem[] = [
    window.createStatusBarItem(StatusBarAlignment.Left, 512),
    window.createStatusBarItem(StatusBarAlignment.Left, 511),
    window.createStatusBarItem(StatusBarAlignment.Left, 510),
    window.createStatusBarItem(StatusBarAlignment.Left, 509),
    window.createStatusBarItem(StatusBarAlignment.Left, 508),
    window.createStatusBarItem(StatusBarAlignment.Left, 507),
  ];

  static init(): void {
    this.updateButton(0, "$(account)", "Account", "cloudmusic.signin");
    this.updateButton(1, "$(chevron-left)", "Previous", "cloudmusic.previous");
    this.updateButton(2, "$(play)", "Play", "cloudmusic.play");
    this.updateButton(3, "$(chevron-right)", "Next", "cloudmusic.next");
    this.updateButton(4, "$(star)", "Like", "cloudmusic.like");
    this.updateButton(5, "$(unmute)", "Volume", "cloudmusic.volume");
    this.buttons[0].show();
  }

  private static updateButton(
    index: number,
    text: string,
    tooltip: string,
    command?: string | Command
  ): void {
    this.buttons[index].text = text;
    this.buttons[index].tooltip = tooltip;
    if (command) {
      this.buttons[index].command = command;
    }
  }

  static clearButtonCommand(index: number): void {
    this.buttons[index].command = undefined;
  }

  static show(): void {
    for (let i = 1; i < this.buttons.length; ++i) {
      this.buttons[i].show();
    }
  }

  static hide(): void {
    for (let i = 1; i < this.buttons.length; ++i) {
      this.buttons[i].hide();
    }
  }

  static buttonAccount(
    text: string,
    tooltip: string,
    command?: string | Command
  ): void {
    this.updateButton(ButtonLabel.account, text, tooltip, command);
  }

  static buttonPlay(): void {
    this.updateButton(ButtonLabel.play, "$(play)", "PLay");
  }

  static buttonPause(): void {
    this.updateButton(ButtonLabel.play, "$(debug-pause)", "Pause");
  }

  static buttonLike(islike: boolean): void {
    this.updateButton(
      ButtonLabel.like,
      islike ? "$(star-full)" : "$(star)",
      "Like"
    );
  }
}
