import { IPC, MultiStepInput, State, Webview, pickUser } from "../utils";
import { ButtonManager } from "../manager";
import type { ExtensionContext } from "vscode";
import type { InputStep } from "../utils";
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
        const { time, text, user } = State.lyric[State.lyric.type];
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
                State.lyric.type === "o"
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
              label: State.showLyric
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
            return (input) => pickLyric(input, time, text);
          case Type.font:
            return (input) => inputFontSize(input);
          case Type.type:
            State.lyric.type = State.lyric.type === "o" ? "t" : "o";
            break;
          case Type.cache:
            IPC.lyric();
            break;
          case Type.disable:
            State.showLyric = !State.showLyric;
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
          prompt: i18n.sentence.hint.lyricDelay,
        });
        if (/^-?[0-9]+([.]{1}[0-9]+){0,1}$/.test(delay))
          IPC.lyricDelay(parseFloat(delay));
        return input.stay();
      }

      async function inputFontSize(input: MultiStepInput) {
        const size = await input.showInputBox({
          title,
          step: 2,
          totalSteps,
          prompt: i18n.sentence.hint.lyricFontSize,
        });
        if (/^\d+$/.test(size)) State.lyric.updateFontSize?.(parseInt(size));
        return input.stay();
      }

      async function pickLyric(
        input: MultiStepInput,
        time: number[],
        text: string[]
      ): Promise<InputStep> {
        const pick = await input.showQuickPick({
          title,
          step: 2,
          totalSteps: totalSteps + 1,
          items: time.map((v, i) => ({
            label: text[i],
            description: `${v}`,
          })),
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
