import { PersonalFm, lock } from "../state";
import { QueueItemTreeItem, QueueProvider } from "../provider";
import { commands, window } from "vscode";
import { load, stop } from "../util";

export async function initQueue(): Promise<void> {
  const queueProvider = QueueProvider.getInstance();
  window.registerTreeDataProvider("queue", queueProvider);

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
          QueueProvider.shift(QueueProvider.indexOf(element));
        });
      }
    }
  );

  commands.registerCommand(
    "cloudmusic.deleteSong",
    (element: QueueItemTreeItem) => {
      QueueProvider.refresh(async () => {
        QueueProvider.delete(element);
      });
    }
  );
}
