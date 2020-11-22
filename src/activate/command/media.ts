import { AccountManager, ButtonManager } from "../../manager";
import { IsLike, PersonalFm } from "../../state";
import { MultiStepInput, apiLike, load, player } from "../../util";
import type { ExtensionContext } from "vscode";
import { QueueProvider } from "../../provider";
import { VOLUME_KEY } from "../../constant";
import { commands } from "vscode";
import { i18n } from "../../i18n";

export function media(context: ExtensionContext): void {
  context.subscriptions.push(
    commands.registerCommand("cloudmusic.previous", () => {
      const len = QueueProvider.songs.length - 1;
      if (!PersonalFm.get() && len > 0) {
        if (len === 1) {
          load(QueueProvider.songs[0]);
        } else {
          QueueProvider.refresh(() => {
            QueueProvider.shift(-1);
            load(QueueProvider.songs[len]);
          });
        }
      }
    })
  );

  context.subscriptions.push(
    commands.registerCommand("cloudmusic.next", async () => {
      if (PersonalFm.get()) {
        load(await PersonalFm.next());
      } else if (QueueProvider.songs.length > 1) {
        QueueProvider.refresh(() => {
          QueueProvider.shift(1);
          load(QueueProvider.songs[1]);
        });
      } else if (QueueProvider.songs.length === 1) {
        load(QueueProvider.songs[0]);
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
      if (await apiLike(id, islike ? "true" : "false")) {
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
          value: `${context.globalState.get(VOLUME_KEY) as number}`,
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
