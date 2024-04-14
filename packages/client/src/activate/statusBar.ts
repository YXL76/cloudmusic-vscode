import { IPC, LyricType, MultiStepInput, STATE, Webview, pickUser } from "../utils/index.js";
import { BUTTON_MANAGER } from "../manager/index.js";
import type { ExtensionContext } from "vscode";
import type { InputStep } from "../utils/index.js";
import { commands } from "vscode";
import i18n from "../i18n/index.js";

export function initStatusBar(context: ExtensionContext): void {
  BUTTON_MANAGER.init();

  context.subscriptions.push(
    commands.registerCommand("cloudmusic.lyric", async () => {
      const totalSteps = 2;
      const title = i18n.word.lyric;
      let select = "";

      const enum Type {
        delay,
        type,
        all,
        cache,
        disable,
        user,
        font,
        panel,
      }

      await MultiStepInput.run(async (input) => {
        const user = STATE.lyric.user[<0 | 1>STATE.lyric.type];
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
                STATE.lyric.type === LyricType.ori
                  ? i18n.word.original
                  : STATE.lyric.type === LyricType.tra
                    ? i18n.word.translation
                    : i18n.word.romanization
              }`,
              type: Type.type,
            },
            { label: `$(list-ordered) ${i18n.word.fullLyric}`, type: Type.all },
            { label: `$(trash) ${i18n.word.cleanCache}`, type: Type.cache },
            {
              label: STATE.showLyric
                ? `$(circle-slash) ${i18n.word.disable}`
                : `$(circle-large-outline) ${i18n.word.enable}`,
              type: Type.disable,
            },
            ...(user ? [{ label: `$(account) ${i18n.word.user}`, type: Type.user }] : []),
            { label: `$(book) ${i18n.sentence.label.showInEditor}`, type: Type.panel },
          ],
        });
        switch (type) {
          case Type.delay:
            return (input) => inputDelay(input);
          case Type.all:
            return (input) => pickLyric(input);
          case Type.type:
            STATE.lyric.type = (STATE.lyric.type + 1) % 3;
            break;
          case Type.cache:
            IPC.lyric();
            break;
          case Type.disable:
            STATE.showLyric = !STATE.showLyric;
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
        const delay = await input.showInputBox({ title, step: 2, totalSteps, prompt: i18n.sentence.hint.lyricDelay });
        if (/^-?[0-9]+([.]{1}[0-9]+){0,1}$/.test(delay)) IPC.lyricDelay(parseFloat(delay));
        return input.stay();
      }

      async function pickLyric(input: MultiStepInput): Promise<InputStep> {
        const pick = await input.showQuickPick({
          title,
          step: 2,
          totalSteps: totalSteps + 1,
          items: STATE.lyric.time
            .map((time, i) => ({ label: STATE.lyric.text[i][STATE.lyric.type], description: `${time}` }))
            .filter(({ label }) => label),
        });
        select = pick.label;
        return (input) => showLyric(input);
      }

      async function showLyric(input: MultiStepInput) {
        await input.showInputBox({ title, step: 3, totalSteps: totalSteps + 1, value: select });
      }
    }),

    commands.registerCommand("cloudmusic.fmTrash", () => {
      if (STATE.fmUid && typeof STATE.playItem?.valueOf === "number") {
        void IPC.netease("fmTrash", [STATE.playItem.valueOf]);
        void commands.executeCommand("cloudmusic.next");
      }
    }),
  );
}
