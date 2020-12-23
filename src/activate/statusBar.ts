import type { ExtensionContext, QuickPickItem } from "vscode";
import { LyricCache, MultiStepInput, lyric, player } from "../util";
import { ButtonManager } from "../manager";
import { apiFmTrash } from "../api";
import { commands } from "vscode";
import { i18n } from "../i18n";

export async function initStatusBar(context: ExtensionContext): Promise<void> {
  void (await ButtonManager.init(context));
  ButtonManager.show();

  commands.registerCommand("cloudmusic.lyric", async () => {
    const totalSteps = 2;
    const title = i18n.word.lyric;
    let select = "";

    const enum Type {
      delay,
      full,
      cache,
    }

    await MultiStepInput.run((input) => pickMthod(input));

    async function pickMthod(input: MultiStepInput) {
      const pick = await input.showQuickPick({
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
      switch (pick.type) {
        case Type.delay:
          return (input: MultiStepInput) => inputDelay(input);
        case Type.full:
          return (input: MultiStepInput) => pickLyric(input);
        case Type.cache:
          LyricCache.clear();
      }
      return;
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
      return input.pop();
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
    void apiFmTrash(player.item.id);
  });
}
