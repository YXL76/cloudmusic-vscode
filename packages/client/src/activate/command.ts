import { IPC, LikeState, MultiStepInput, State, likeMusic } from "../util";
import { QueueItemTreeItem, QueueProvider } from "../treeview";
import { ButtonManager } from "../manager";
import type { ExtensionContext } from "vscode";
import { VOLUME_KEY } from "../constant";
import { commands } from "vscode";
import i18n from "../i18n";

export function initCommand(context: ExtensionContext): void {
  context.subscriptions.push(
    commands.registerCommand("cloudmusic.previous", () => {
      if (/* !PersonalFm.state &&  */ QueueProvider.len) IPC.shift(-1);
    }),

    commands.registerCommand("cloudmusic.next", () => {
      // TODO
      /* if (repeat) void load(Player.item);
      else {
        if (PersonalFm.state) void load(await PersonalFm.head());
        else  
      } */
      if (QueueProvider.len) IPC.shift(1);
    }),

    commands.registerCommand("cloudmusic.play", () => IPC.toggle()),

    commands.registerCommand("cloudmusic.repeat", () =>
      ButtonManager.buttonRepeat()
    ),

    commands.registerCommand("cloudmusic.like", () => {
      if (
        State.playItem instanceof QueueItemTreeItem &&
        State.like !== LikeState.none
      )
        void likeMusic(State.playItem.valueOf, !State.like);
    }),

    commands.registerCommand("cloudmusic.volume", () => {
      void MultiStepInput.run(async (input) => {
        const levelS = await input.showInputBox({
          title: i18n.word.volume,
          step: 1,
          totalSteps: 1,
          value: `${context.globalState.get(VOLUME_KEY, 85)}`,
          prompt: `${i18n.sentence.hint.volume} (0~100)`,
        });
        if (/^[1-9]\d$|^\d$|^100$/.exec(levelS)) {
          const level = parseInt(levelS);
          IPC.volume(level);
          await context.globalState.update(VOLUME_KEY, level);
        }
        return input.stay();
      });
    }),

    commands.registerCommand(
      "cloudmusic.toggleButton",
      () => void ButtonManager.toggle()
    )

    /* commands.registerCommand(
      "cloudmusic.personalFM",
      () => (PersonalFm.state = true)
    ) */
  );
}
