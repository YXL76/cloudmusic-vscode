import { LyricCache, MultiStepInput, Player, lyric } from "../util";
import { ButtonManager } from "../manager";
import type { QuickPickItem } from "vscode";
import { apiFmTrash } from "../api";
import { commands } from "vscode";
import i18n from "../i18n";

export function initStatusBar(): void {
  ButtonManager.init();

  commands.registerCommand("cloudmusic.lyric", async () => {
    const totalSteps = 2;
    const title = i18n.word.lyric;
    let select = "";

    const enum Type {
      delay,
      full,
      cache,
      disable,
    }

    await MultiStepInput.run((input) => pickMthod(input));

    async function pickMthod(input: MultiStepInput) {
      const { type } = await input.showQuickPick({
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
          {
            label: ButtonManager.showLyric
              ? `$(circle-slash) ${i18n.word.disable}`
              : `$(circle-large-outline) ${i18n.word.enable}`,
            type: Type.disable,
          },
        ],
      });
      switch (type) {
        case Type.delay:
          return (input: MultiStepInput) => inputDelay(input);
        case Type.full:
          return (input: MultiStepInput) => pickLyric(input);
        case Type.cache:
          LyricCache.clear();
          return;
        case Type.disable:
          ButtonManager.toggleLyric();
          return;
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
      }
      return input.stay();
    }

    async function pickLyric(input: MultiStepInput) {
      interface T extends QuickPickItem {
        description: string;
      }
      const items: T[] = [];
      for (let i = 0; i < lyric.text.length; ++i) {
        if (lyric.text[i] !== "Lyric") {
          items.push({
            label: lyric.text[i],
            description: `[${lyric.time[i]}]`,
          });
        }
      }
      const pick = await input.showQuickPick({
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
    if (Player.treeitem?.item?.id) void apiFmTrash(Player.treeitem.item.id);
  });
}
