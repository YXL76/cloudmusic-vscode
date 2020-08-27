import { AccountManager, ButtonManager } from "../../manager";
import { ExtensionContext, commands } from "vscode";
import { IsLike, PersonalFm, lock } from "../../state";
import { MultiStepInput, apiLike, load, player } from "../../util";
import { QueueProvider } from "../../provider";
import { i18n } from "../../i18n";

export function media(context: ExtensionContext): void {
  context.subscriptions.push(
    commands.registerCommand("cloudmusic.previous", async () => {
      const len = QueueProvider.songs.length - 1;
      if (!lock.playerLoad.get() && len > 0) {
        QueueProvider.refresh(async () => {
          await load(QueueProvider.songs[len]);
          QueueProvider.shift(-1);
        });
      }
    })
  );

  context.subscriptions.push(
    commands.registerCommand("cloudmusic.next", async () => {
      if (lock.playerLoad.get()) {
        return;
      }
      if (PersonalFm.get()) {
        load(await PersonalFm.next());
      } else if (QueueProvider.songs.length > 1) {
        QueueProvider.refresh(async () => {
          await load(QueueProvider.songs[1]);
          QueueProvider.shift(1);
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
      if (await apiLike(id, islike ? "" : "false")) {
        IsLike.set(islike);
        islike
          ? AccountManager.likelist.add(id)
          : AccountManager.likelist.delete(id);
      }
    })
  );

  context.subscriptions.push(
    commands.registerCommand("cloudmusic.volume", async () => {
      MultiStepInput.run((input) => inputLevel(input));

      async function inputLevel(input: MultiStepInput) {
        const level = await input.showInputBox({
          title: i18n.word.volume,
          step: 1,
          totalSteps: 1,
          value: `${player.level}`,
          prompt: `${i18n.sentence.hint.volume} (0~100)`,
        });
        if (/^\d+$/.exec(level)) {
          player.volume(parseInt(level));
        }
        return input.pop();
      }
    })
  );

  context.subscriptions.push(
    commands.registerCommand("cloudmusic.toggleButton", () => {
      ButtonManager.toggle();
    })
  );

  context.subscriptions.push(
    commands.registerCommand("cloudmusic.personalFM", () => {
      PersonalFm.set(!PersonalFm.get());
    })
  );
}
