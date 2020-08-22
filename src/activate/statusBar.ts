import {
  LyricCache,
  MultiStepInput,
  apiFmTrash,
  lyric,
  pickSong,
  player,
} from "../util";
import { QuickPickItem, commands } from "vscode";
import { ButtonManager } from "../manager";
import { QueueItemTreeItem } from "../provider";

import { i18n } from "../i18n";

export async function initStatusBar(): Promise<void> {
  await ButtonManager.init();
  ButtonManager.show();

  commands.registerCommand(
    "cloudmusic.songDetail",
    async (element?: QueueItemTreeItem) => {
      const id = element ? element.item.id : player.item.id;
      if (id) {
        await MultiStepInput.run((input) => pickSong(input, 1, id));
      }
    }
  );

  commands.registerCommand("cloudmusic.lyric", async () => {
    const totalSteps = 2;
    const title = i18n.word.lyric;
    let select = "";

    enum Type {
      delay,
      full,
      cache,
    }

    interface T extends QuickPickItem {
      type: Type;
    }

    await MultiStepInput.run((input) => pickMthod(input));

    async function pickMthod(input: MultiStepInput) {
      const pick = await input.showQuickPick<T>({
        title,
        step: 1,
        totalSteps,
        items: [
          {
            label: `$(versions) ${i18n.word.lyricDelay}`,
            description: `${i18n.sentence.label.lyricDelay} (${i18n.word.default}: -1.0)`,
            type: Type.delay,
          },
          {
            label: `$(list-ordered) ${i18n.word.fullLyric}`,
            type: Type.full,
          },
          {
            label: `$(trash) ${i18n.word.cleanCache}`,
            type: Type.cache,
          },
        ],
      });
      if (pick.type === Type.delay) {
        return (input: MultiStepInput) => inputDelay(input);
      }
      if (pick.type === Type.full) {
        return (input: MultiStepInput) => pickLyric(input);
      }
      if (pick.type === Type.cache) {
        LyricCache.clear();
      }
    }

    async function inputDelay(input: MultiStepInput) {
      const delay = await input.showInputBox({
        title,
        step: 2,
        totalSteps,
        value: `${lyric.delay}`,
        prompt: i18n.sentence.hint.lyricDelay,
      });
      if (/^-?[0-9]+([.]{1}[0-9]+){0,1}$/.test(delay)) {
        lyric.delay = parseFloat(delay);
      } else {
        input.pop();
        return (input: MultiStepInput) => inputDelay(input);
      }
    }

    async function pickLyric(input: MultiStepInput) {
      interface T extends QuickPickItem {
        description: string;
      }
      const items: T[] = [];
      for (let i = 0; i < lyric.text.length; ++i) {
        items.push({
          label: lyric.text[i],
          description: `[${lyric.time[i]}]`,
        });
      }
      const pick = await input.showQuickPick<T>({
        title,
        step: 2,
        totalSteps: totalSteps + 1,
        items,
      });
      select = pick.label;
      return (input: MultiStepInput) => showLyric(input);
    }

    async function showLyric(input: MultiStepInput) {
      await input.showInputBox({
        title,
        step: 3,
        totalSteps: totalSteps + 1,
        value: select,
      });
    }
  });

  commands.registerCommand("cloudmusic.fmTrash", () => {
    apiFmTrash(player.item.id);
  });
}
