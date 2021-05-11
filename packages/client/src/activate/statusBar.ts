import {
  IPC,
  LyricType,
  MultiStepInput,
  State,
  Webview,
  lyric,
  pickUser,
} from "../utils";
import { ButtonManager } from "../manager";
import type { ExtensionContext } from "vscode";
import type { InputStep } from "../utils";
import type { QuickPickItem } from "vscode";
import { commands } from "vscode";
import i18n from "../i18n";

export function initStatusBar(context: ExtensionContext): void {
  ButtonManager.init();

  context.subscriptions.push(
    commands.registerCommand("cloudmusic.lyric", async () => {
      const totalSteps = 2;
      const title = i18n.word.lyric;
      let select = "";

      const enum Type {
        delay,
        type,
        full,
        cache,
        disable,
        user,
        font,
        panel,
      }

      await MultiStepInput.run(async (input) => {
        const { text, user } = lyric[lyric.type];
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
              label: `$(symbol-type-parameter) ${
                lyric.type === LyricType.original
                  ? i18n.word.translation
                  : i18n.word.original
              }`,
              type: Type.type,
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
            ...(user
              ? [{ label: `$(account) ${i18n.word.user}`, type: Type.user }]
              : []),
            {
              label: `$(text-size) ${i18n.word.fontSize}`,
              type: Type.font,
            },
            {
              label: `$(book) ${i18n.sentence.label.showInEditor}`,
              type: Type.panel,
            },
          ],
        });
        switch (type) {
          case Type.delay:
            return (input) => inputDelay(input);
          case Type.full:
            return (input) => pickLyric(input, text);
          case Type.font:
            return (input) => inputFontSize(input);
          case Type.type:
            lyric.type =
              lyric.type === LyricType.original
                ? LyricType.translation
                : LyricType.original;
            break;
          case Type.cache:
            IPC.lyric();
            break;
          case Type.disable:
            ButtonManager.toggleLyric();
            break;
          case Type.user:
            return (input) => pickUser(input, 2, user?.userid || 0);
          case Type.panel:
            Webview.lyric();
            break;
        }
        return input.stay();
      });

      async function inputDelay(input: MultiStepInput): Promise<InputStep> {
        const delay = await input.showInputBox({
          title,
          step: 2,
          totalSteps,
          value: `${lyric.delay}`,
          prompt: i18n.sentence.hint.lyricDelay,
        });
        if (/^-?[0-9]+([.]{1}[0-9]+){0,1}$/.test(delay))
          lyric.delay = parseFloat(delay);
        return input.stay();
      }

      async function inputFontSize(input: MultiStepInput) {
        const size = await input.showInputBox({
          title,
          step: 2,
          totalSteps,
          prompt: i18n.sentence.hint.lyricFontSize,
        });
        if (/^\d+$/.test(size)) lyric.updateFontSize?.(parseInt(size));
        return input.stay();
      }

      async function pickLyric(
        input: MultiStepInput,
        text: string[]
      ): Promise<InputStep> {
        interface T extends QuickPickItem {
          description: string;
        }
        const items: T[] = [];
        text.forEach((v, i) => {
          if (v !== i18n.word.lyric && v !== text[i - 1])
            items.push({ label: v, description: `[${lyric.time[i]}]` });
        });

        const pick = await input.showQuickPick({
          title,
          step: 2,
          totalSteps: totalSteps + 1,
          items,
        });
        select = pick.label;
        return (input) => showLyric(input);
      }

      async function showLyric(input: MultiStepInput) {
        await input.showInputBox({
          title,
          step: 3,
          totalSteps: totalSteps + 1,
          value: select,
        });
      }
    }),

    commands.registerCommand("cloudmusic.fmTrash", () => {
      if (State.fm && typeof State.playItem?.valueOf === "number") {
        void IPC.netease("fmTrash", [State.playItem.valueOf]);
        void commands.executeCommand("cloudmusic.next");
      }
    })
  );
}
