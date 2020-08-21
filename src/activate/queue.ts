import { PersonalFm, lock } from "../state";
import { QueueItemTreeItem, QueueProvider } from "../provider";
import { commands, window } from "vscode";
import { load, stop } from "../util";

export function initQueue(): void {
  const queueProvider = QueueProvider.getInstance();
  window.registerTreeDataProvider("queue", queueProvider);

  commands.registerCommand("cloudmusic.clearQueue", () => {
    QueueProvider.refresh(async (queueProvider) => {
      if (!PersonalFm.get()) {
        stop();
      }
      queueProvider.clear();
    });
  });

  commands.registerCommand("cloudmusic.randomQueue", () => {
    QueueProvider.refresh(async (queueProvider) => {
      queueProvider.random();
    });
  });

  commands.registerCommand(
    "cloudmusic.playSong",
    async (element: QueueItemTreeItem) => {
      if (!lock.playerLoad.get()) {
        PersonalFm.set(false);
        await load(element);
        QueueProvider.refresh(async (queueProvider) => {
          queueProvider.top(element);
        });
      }
    }
  );

  commands.registerCommand(
    "cloudmusic.deleteSong",
    (element: QueueItemTreeItem) => {
      QueueProvider.refresh(async (queueProvider) => {
        queueProvider.delete(element);
      });
    }
  );
}
