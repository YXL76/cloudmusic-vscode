import { IPC, MultiStepInput, STATE, likeMusic } from "../utils/index.js";
import { QueueItemTreeItem, QueueProvider } from "../treeview/index.js";
import { SPEED_KEY, VOLUME_KEY } from "../constant/index.js";
import { BUTTON_MANAGER } from "../manager/index.js";
import type { ExtensionContext } from "vscode";
import { commands } from "vscode";
import i18n from "../i18n/index.js";

export function initCommand(context: ExtensionContext): void {
  context.subscriptions.push(
    commands.registerCommand("cloudmusic.seekbackward", IPC.seek.bind(undefined, -15)),

    commands.registerCommand("cloudmusic.seekforward", IPC.seek.bind(undefined, 15)),

    commands.registerCommand("cloudmusic.previous", () => {
      if (!STATE.fmUid && QueueProvider.len) IPC.shift(-1);
    }),

    commands.registerCommand("cloudmusic.next", async () => {
      if (STATE.fmUid) {
        const item = await IPC.netease("personalFm", [STATE.fmUid, true]);
        if (item) STATE.playItem = QueueItemTreeItem.new({ ...item, pid: item.al.id, itemType: "q" });
      } else if (QueueProvider.len) IPC.shift(1);
    }),

    commands.registerCommand("cloudmusic.toggle", IPC.toggle),

    commands.registerCommand("cloudmusic.repeat", () => IPC.repeat(!STATE.repeat)),

    commands.registerCommand("cloudmusic.like", () => {
      if (STATE.like && STATE.playItem instanceof QueueItemTreeItem) {
        const id = STATE.playItem.valueOf;
        void MultiStepInput.run((input) => likeMusic(input, 1, id));
      }
    }),

    commands.registerCommand(
      "cloudmusic.volume",
      () =>
        void MultiStepInput.run(async (input) => {
          const levelS = await input.showInputBox({
            title: i18n.word.volume,
            step: 1,
            totalSteps: 1,
            value: `${context.globalState.get(VOLUME_KEY, 85)}`,
            prompt: `${i18n.sentence.hint.volume} (0~100)`,
          });
          if (/^[1-9]\d$|^\d$|^100$/.exec(levelS)) {
            const level = parseInt(levelS);
            IPC.volume(level);
            await context.globalState.update(VOLUME_KEY, level);
          }
          return input.stay();
        }),
    ),

    commands.registerCommand(
      "cloudmusic.speed",
      () =>
        void MultiStepInput.run(async (input) => {
          const speedS = await input.showInputBox({
            title: i18n.word.speed,
            step: 1,
            totalSteps: 1,
            value: `${context.globalState.get(SPEED_KEY, 1)}`,
            prompt: i18n.sentence.hint.speed,
          });
          const speed = parseFloat(speedS);
          if (!isNaN(speed)) {
            IPC.speed(speed);
            await context.globalState.update(SPEED_KEY, speed);
          }
          return input.stay();
        }),
    ),

    commands.registerCommand("cloudmusic.toggleButton", () => BUTTON_MANAGER.toggle()),
  );
}
