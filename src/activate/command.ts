import {
  LikeState,
  MultiStepInput,
  PersonalFm,
  Player,
  State,
  likeMusic,
  load,
} from "../util";
import { QueueItemTreeItem, QueueProvider } from "../treeview";
import { ButtonManager } from "../manager";
import type { ExtensionContext } from "vscode";
import { VOLUME_KEY } from "../constant";
import { commands } from "vscode";
import i18n from "../i18n";

export function initCommand(context: ExtensionContext): void {
  context.subscriptions.push(
    commands.registerCommand("cloudmusic.previous", () => {
      const len = QueueProvider.len;
      if (!PersonalFm.get && len > 0)
        QueueProvider.refresh(() => {
          QueueProvider.shift(-1);
          void load(QueueProvider.head);
        });
    })
  );

  context.subscriptions.push(
    commands.registerCommand("cloudmusic.next", async (repeat?: boolean) => {
      if (repeat) void load(Player.treeitem);
      else {
        if (PersonalFm.get) void load(await PersonalFm.head());
        else
          QueueProvider.refresh(() => {
            QueueProvider.shift(1);
            void load(QueueProvider.head);
          });
      }
    })
  );

  context.subscriptions.push(
    commands.registerCommand("cloudmusic.play", () => Player.togglePlay())
  );

  context.subscriptions.push(
    commands.registerCommand("cloudmusic.repeat", () =>
      ButtonManager.buttonRepeat()
    )
  );

  context.subscriptions.push(
    commands.registerCommand("cloudmusic.like", () => {
      if (
        Player.treeitem instanceof QueueItemTreeItem &&
        State.like !== LikeState.none
      )
        void likeMusic(Player.treeitem.valueOf, !State.like);
    })
  );

  context.subscriptions.push(
    commands.registerCommand("cloudmusic.volume", () => {
      void MultiStepInput.run((input) => inputLevel(input));

      async function inputLevel(input: MultiStepInput) {
        const level = await input.showInputBox({
          title: i18n.word.volume,
          step: 1,
          totalSteps: 1,
          value: `${context.globalState.get<number>(VOLUME_KEY) ?? 85}`,
          prompt: `${i18n.sentence.hint.volume} (0~100)`,
        });
        if (/^[1-9]\d$|^\d$|^100$/.exec(level))
          await Player.volume(parseInt(level));
        return input.stay();
      }
    })
  );

  context.subscriptions.push(
    commands.registerCommand(
      "cloudmusic.toggleButton",
      () => void ButtonManager.toggle()
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      "cloudmusic.personalFM",
      () => void PersonalFm.set(true)
    )
  );
}
