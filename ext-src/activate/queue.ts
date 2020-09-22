import { MultiStepInput, load, stop } from "../util";
import { PersonalFm, lock } from "../state";
import { QueueItemTreeItem, QueueProvider } from "../provider";
import { commands, window } from "vscode";
import { ICON } from "../constant";
import { i18n } from "../../i18n";

export async function initQueue(): Promise<void> {
  const queueProvider = QueueProvider.getInstance();
  window.registerTreeDataProvider("queue", queueProvider);

  commands.registerCommand("cloudmusic.sortQueue", () => {
    MultiStepInput.run((input: MultiStepInput) => pickType(input));

    async function pickType(input: MultiStepInput) {
      enum Type {
        song,
        album,
        artist,
      }
      enum Order {
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

      const { songs } = QueueProvider;
      stop();
      await QueueProvider.refresh(async () => {
        if (pick.type === Type.song) {
          QueueProvider.songs = songs.sort((a, b) =>
            a.item.name.localeCompare(b.item.name)
          );
        } else if (pick.type === Type.album) {
          QueueProvider.songs = songs.sort((a, b) =>
            a.item.al.name.localeCompare(b.item.al.name)
          );
        } else if (pick.type === Type.artist) {
          QueueProvider.songs = songs.sort((a, b) =>
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

  commands.registerCommand("cloudmusic.clearQueue", () => {
    QueueProvider.refresh(async () => {
      if (!PersonalFm.get()) {
        stop();
      }
      QueueProvider.clear();
    });
  });

  commands.registerCommand("cloudmusic.randomQueue", () => {
    QueueProvider.refresh(async () => {
      QueueProvider.random();
    });
  });

  commands.registerCommand(
    "cloudmusic.playSong",
    async (element: QueueItemTreeItem) => {
      if (!lock.playerLoad.get()) {
        PersonalFm.set(false);
        await load(element);
        QueueProvider.refresh(async () => {
          QueueProvider.top(element.item.id);
        });
      }
    }
  );

  commands.registerCommand(
    "cloudmusic.deleteSong",
    (element: QueueItemTreeItem) => {
      QueueProvider.refresh(async () => {
        QueueProvider.delete(element.item.id);
      });
    }
  );

  commands.registerCommand(
    "cloudmusic.playNext",
    (element: QueueItemTreeItem) => {
      if (QueueProvider.songs.length > 2) {
        const { id } = element.item;
        QueueProvider.refresh(async () => {
          const index = QueueProvider.songs.findIndex(
            (value) => value.valueOf() === id
          );
          if (index >= 2) {
            QueueProvider.songs = [
              QueueProvider.songs[0],
              QueueProvider.songs[index],
            ].concat(
              QueueProvider.songs.slice(1, index),
              QueueProvider.songs.slice(index + 1)
            );
          }
        });
      }
    }
  );
}
