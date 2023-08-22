import { IPC, MultiStepInput } from "../utils/index.js";
import { QueueProvider, QueueSortOrder, QueueSortType } from "../treeview/index.js";
import type { ExtensionContext } from "vscode";
import type { QueueContent } from "../treeview/index.js";
import { commands } from "vscode";
import i18n from "../i18n/index.js";

export function initQueue(context: ExtensionContext): void {
  context.subscriptions.push(
    commands.registerCommand("cloudmusic.sortQueue", () => {
      void MultiStepInput.run(async (input) => {
        const pick = await input.showQuickPick({
          title: i18n.word.account,
          step: 1,
          totalSteps: 1,
          items: [
            {
              label: `$(zap) ${i18n.word.song}`,
              description: i18n.word.ascending,
              type: QueueSortType.song,
              order: QueueSortOrder.ascending,
            },
            {
              label: `$(zap) ${i18n.word.song}`,
              description: i18n.word.descending,
              type: QueueSortType.song,
              order: QueueSortOrder.descending,
            },
            {
              label: `$(circuit-board) ${i18n.word.album}`,
              description: i18n.word.ascending,
              type: QueueSortType.album,
              order: QueueSortOrder.ascending,
            },
            {
              label: `$(circuit-board) ${i18n.word.album}`,
              description: i18n.word.descending,
              type: QueueSortType.album,
              order: QueueSortOrder.descending,
            },
            {
              label: `$(account) ${i18n.word.artist}`,
              description: i18n.word.ascending,
              type: QueueSortType.artist,
              order: QueueSortOrder.ascending,
            },
            {
              label: `$(account) ${i18n.word.artist}`,
              description: i18n.word.descending,
              type: QueueSortType.artist,
              order: QueueSortOrder.descending,
            },
          ],
        });

        IPC.new(QueueProvider.sort(pick.type, pick.order));
        return input.stay();
      });
    }),

    commands.registerCommand("cloudmusic.clearQueue", IPC.clear),

    commands.registerCommand("cloudmusic.randomQueue", IPC.random),

    commands.registerCommand("cloudmusic.playSong", ({ valueOf }: QueueContent) => IPC.playSong(valueOf)),

    commands.registerCommand("cloudmusic.deleteSong", ({ valueOf }: QueueContent) => IPC.delete(valueOf)),

    commands.registerCommand("cloudmusic.playNext", ({ data }: QueueContent) => IPC.add([data], 1)),
  );
}
