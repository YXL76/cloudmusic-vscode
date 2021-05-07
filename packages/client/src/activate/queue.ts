import { IPC, MultiStepInput, State, stop } from "../util";
import { QueueProvider, QueueSortOrder, QueueSortType } from "../treeview";
import { commands, window } from "vscode";
import type { ExtensionContext } from "vscode";
import { ICON } from "../constant";
import type { QueueContent } from "../treeview";
import i18n from "../i18n";

export function initQueue(context: ExtensionContext): void {
  const queueProvider = QueueProvider.getInstance();

  queueProvider.onDidChangeTreeData(
    () => (State.playItem = QueueProvider.head)
  );

  context.subscriptions.push(
    window.registerTreeDataProvider("queue", queueProvider),

    commands.registerCommand("cloudmusic.sortQueue", () => {
      void MultiStepInput.run((input: MultiStepInput) => pickType(input));

      async function pickType(input: MultiStepInput) {
        const pick = await input.showQuickPick({
          title: i18n.word.account,
          step: 1,
          totalSteps: 1,
          items: [
            {
              label: `${ICON.song} ${i18n.word.song}`,
              description: i18n.word.ascending,
              type: QueueSortType.song,
              order: QueueSortOrder.ascending,
            },
            {
              label: `${ICON.song} ${i18n.word.song}`,
              description: i18n.word.descending,
              type: QueueSortType.song,
              order: QueueSortOrder.descending,
            },
            {
              label: `${ICON.album} ${i18n.word.album}`,
              description: i18n.word.ascending,
              type: QueueSortType.album,
              order: QueueSortOrder.ascending,
            },
            {
              label: `${ICON.album} ${i18n.word.album}`,
              description: i18n.word.descending,
              type: QueueSortType.album,
              order: QueueSortOrder.descending,
            },
            {
              label: `${ICON.artist} ${i18n.word.artist}`,
              description: i18n.word.ascending,
              type: QueueSortType.artist,
              order: QueueSortOrder.ascending,
            },
            {
              label: `${ICON.artist} ${i18n.word.artist}`,
              description: i18n.word.descending,
              type: QueueSortType.artist,
              order: QueueSortOrder.descending,
            },
          ],
        });

        stop();
        IPC.sort(pick.type, pick.order);
        return input.stay();
      }
    }),

    commands.registerCommand("cloudmusic.clearQueue", () => IPC.clear()),

    commands.registerCommand("cloudmusic.randomQueue", () => IPC.random()),

    commands.registerCommand(
      "cloudmusic.playSong",
      ({ valueOf }: QueueContent) => IPC.playSong(valueOf)
    ),

    commands.registerCommand(
      "cloudmusic.deleteSong",
      ({ valueOf }: QueueContent) => IPC.delete(valueOf)
    ),

    commands.registerCommand("cloudmusic.playNext", (element: QueueContent) =>
      IPC.add([element.data], 1)
    )
  );
}
