import type { LocalFileTreeItem, QueueItemTreeItem } from "../treeview";
import { MultiStepInput, load, stop } from "../util";
import { commands, window } from "vscode";
import { ICON } from "../constant";
import { PersonalFm } from "../state";
import { QueueProvider } from "../treeview";
import { i18n } from "../i18n";

export function initQueue() {
  const queueProvider = QueueProvider.getInstance();
  window.registerTreeDataProvider("queue", queueProvider);

  commands.registerCommand("cloudmusic.sortQueue", () => {
    void MultiStepInput.run((input: MultiStepInput) => pickType(input));

    async function pickType(input: MultiStepInput) {
      const enum Type {
        song,
        album,
        artist,
      }
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
            type: Type.song,
            order: Order.ascending,
          },
          {
            label: `${ICON.song} ${i18n.word.song}`,
            description: i18n.word.descending,
            type: Type.song,
            order: Order.descending,
          },
          {
            label: `${ICON.album} ${i18n.word.album}`,
            description: i18n.word.ascending,
            type: Type.album,
            order: Order.ascending,
          },
          {
            label: `${ICON.album} ${i18n.word.album}`,
            description: i18n.word.descending,
            type: Type.album,
            order: Order.descending,
          },
          {
            label: `${ICON.artist} ${i18n.word.artist}`,
            description: i18n.word.ascending,
            type: Type.artist,
            order: Order.ascending,
          },
          {
            label: `${ICON.artist} ${i18n.word.artist}`,
            description: i18n.word.descending,
            type: Type.artist,
            order: Order.descending,
          },
        ],
      });

      stop();
      QueueProvider.refresh(() => {
        switch (pick.type) {
          case Type.song:
            QueueProvider.songs.sort((a, b) => a.label.localeCompare(b.label));
            break;
          case Type.album:
            QueueProvider.songs.sort((a, b) =>
              a.item.al.name.localeCompare(b?.item.al.name)
            );
            break;
          case Type.artist:
            QueueProvider.songs.sort((a, b) =>
              a.item.ar[0].name.localeCompare(b.item.ar[0].name)
            );
        }
        if (pick.order === Order.descending) {
          QueueProvider.songs.reverse();
        }
      });
      return input.pop();
    }
  });

  commands.registerCommand("cloudmusic.clearQueue", () =>
    QueueProvider.refresh(() => {
      QueueProvider.clear();
      if (!PersonalFm.get()) stop();
    })
  );

  commands.registerCommand("cloudmusic.randomQueue", () =>
    QueueProvider.refresh(() => QueueProvider.random())
  );

  commands.registerCommand(
    "cloudmusic.playSong",
    (element: QueueItemTreeItem | LocalFileTreeItem) =>
      QueueProvider.refresh(() => {
        void PersonalFm.set(false);
        QueueProvider.top(element.valueOf());
        void load(element);
      })
  );

  commands.registerCommand(
    "cloudmusic.deleteSong",
    (element: QueueItemTreeItem | LocalFileTreeItem) =>
      QueueProvider.refresh(() => QueueProvider.delete(element.valueOf()))
  );

  commands.registerCommand(
    "cloudmusic.playNext",
    (element: QueueItemTreeItem | LocalFileTreeItem) => {
      if (QueueProvider.songs.length > 2)
        QueueProvider.refresh(() => {
          const index = QueueProvider.songs.findIndex(
            (value) => value.valueOf() === element.valueOf()
          );
          if (index >= 2)
            QueueProvider.songs = [
              QueueProvider.songs[0],
              QueueProvider.songs[index],
            ].concat(
              QueueProvider.songs.slice(1, index),
              QueueProvider.songs.slice(index + 1)
            );
        });
    }
  );
}
