import { AccountManager, ButtonManager } from "../manager";
import { IsLike, PersonalFm } from "../state";
import { MultiStepInput, load, player } from "../util";
import type { ExtensionContext } from "vscode";
import { QueueProvider } from "../provider";
import { VOLUME_KEY } from "../constant";
import { apiLike } from "../api";
import { commands } from "vscode";
import { i18n } from "../i18n";

export function initCommand(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand("cloudmusic.previous", () => {
      const len = QueueProvider.songs.length - 1;
      if (!PersonalFm.get() && len > 0) {
        if (len === 1) {
          void load(QueueProvider.songs[0]);
        } else {
          QueueProvider.refresh(() => {
            QueueProvider.shift(-1);
            void load(QueueProvider.songs[0]);
          });
        }
      }
    })
  );

  context.subscriptions.push(
    commands.registerCommand("cloudmusic.next", async () => {
      if (PersonalFm.get()) {
        void load(await PersonalFm.next());
      } else {
        QueueProvider.refresh(() => {
          QueueProvider.shift(1);
          void load(QueueProvider.songs[0]);
        });
      }
    })
  );

  context.subscriptions.push(
    commands.registerCommand("cloudmusic.play", () => {
      player.togglePlay();
    })
  );

  context.subscriptions.push(
    commands.registerCommand("cloudmusic.like", async () => {
      const islike = !IsLike.get();
      const { id } = player.item;
      if (await apiLike(id, islike)) {
        IsLike.set(islike);
        islike
          ? AccountManager.likelist.add(id)
          : AccountManager.likelist.delete(id);
      }
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
        if (/^[1-9]\d$|^\d$|^100$/.exec(level)) {
          await player.volume(parseInt(level));
        }
        return input.pop();
      }
    })
  );

  context.subscriptions.push(
    commands.registerCommand("cloudmusic.toggleButton", () => {
      void ButtonManager.toggle();
    })
  );

  context.subscriptions.push(
    commands.registerCommand("cloudmusic.personalFM", () => {
      void PersonalFm.set(true);
    })
  );
}
