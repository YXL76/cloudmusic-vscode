import { MultiStepInput, load, stop } from "../util";
import { QueueProvider, QueueSortType } from "../treeview";
import { commands, window } from "vscode";
import { ICON } from "../constant";
import { PersonalFm } from "../state";
import type { QueueContent } from "../treeview";
import i18n from "../i18n";

export function initQueue(): void {
  const queueProvider = QueueProvider.getInstance();
  window.registerTreeDataProvider("queue", queueProvider);

  commands.registerCommand("cloudmusic.sortQueue", () => {
    void MultiStepInput.run((input: MultiStepInput) => pickType(input));

    async function pickType(input: MultiStepInput) {
      const enum Order {
        ascending,
        descending,
      }

      const pick = await input.showQuickPick({
        title: i18n.word.account,
        step: 1,
        totalSteps: 1,
        items: [
          {
            label: `${ICON.song} ${i18n.word.song}`,
            description: i18n.word.ascending,
            type: QueueSortType.song,
            order: Order.ascending,
          },
          {
            label: `${ICON.song} ${i18n.word.song}`,
            description: i18n.word.descending,
            type: QueueSortType.song,
            order: Order.descending,
          },
          {
            label: `${ICON.album} ${i18n.word.album}`,
            description: i18n.word.ascending,
            type: QueueSortType.album,
            order: Order.ascending,
          },
          {
            label: `${ICON.album} ${i18n.word.album}`,
            description: i18n.word.descending,
            type: QueueSortType.album,
            order: Order.descending,
          },
          {
            label: `${ICON.artist} ${i18n.word.artist}`,
            description: i18n.word.ascending,
            type: QueueSortType.artist,
            order: Order.ascending,
          },
          {
            label: `${ICON.artist} ${i18n.word.artist}`,
            description: i18n.word.descending,
            type: QueueSortType.artist,
            order: Order.descending,
          },
        ],
      });

      stop();
      QueueProvider.refresh(() => {
        QueueProvider.sort(pick.type);
        if (pick.order === Order.descending) QueueProvider.reverse();
      });
      return input.stay();
    }
  });

  commands.registerCommand("cloudmusic.clearQueue", () =>
    QueueProvider.refresh(() => {
      QueueProvider.clear();
      if (!PersonalFm.get) stop();
    })
  );

  commands.registerCommand("cloudmusic.randomQueue", () =>
    QueueProvider.refresh(() => QueueProvider.random())
  );

  commands.registerCommand("cloudmusic.playSong", (element: QueueContent) =>
    QueueProvider.refresh(() => {
      void PersonalFm.set(false);
      QueueProvider.top(element.valueOf);
      void load(element);
    })
  );

  commands.registerCommand("cloudmusic.deleteSong", (element: QueueContent) =>
    QueueProvider.refresh(() => QueueProvider.delete(element.valueOf))
  );

  commands.registerCommand("cloudmusic.playNext", (element: QueueContent) => {
    QueueProvider.refresh(() => QueueProvider.playNext([element]));
  });
}
