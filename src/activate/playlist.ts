import { PersonalFm, lock } from "../state";
import {
  PlaylistItemTreeItem,
  PlaylistProvider,
  QueueItemTreeItem,
  QueueProvider,
} from "../provider";
import {
  MultiStepInput,
  apiPlaylistTracks,
  apiPlaymodeIntelligenceList,
  load,
  pickAddToPlaylist,
  songsItem2TreeItem,
} from "../util";
import { commands, window } from "vscode";
import { AccountManager } from "../manager";

export function initPlaylist(): void {
  const userPlaylistProvider = PlaylistProvider.getUserInstance();
  const favoritePlaylistProvider = PlaylistProvider.getFavoriteInstance();
  window.registerTreeDataProvider("userPlaylist", userPlaylistProvider);
  window.registerTreeDataProvider("favoritePlaylist", favoritePlaylistProvider);

  commands.registerCommand("cloudmusic.refreshPlaylist", () => {
    PlaylistProvider.refresh();
  });

  commands.registerCommand(
    "cloudmusic.refreshPlaylistContent",
    (element: PlaylistItemTreeItem) => PlaylistProvider.refresh(element)
  );

  commands.registerCommand(
    "cloudmusic.playPlaylist",
    (element: PlaylistItemTreeItem) => {
      PlaylistProvider.refresh(element, (items) => {
        QueueProvider.refresh(async () => {
          PersonalFm.set(false);
          QueueProvider.clear();
          QueueProvider.add(items);
          if (!lock.playerLoad.get()) {
            load(QueueProvider.songs[0]);
          }
        });
      });
    }
  );

  commands.registerCommand(
    "cloudmusic.addPlaylist",
    (element: PlaylistItemTreeItem) => {
      PlaylistProvider.refresh(element, (items) => {
        QueueProvider.refresh(async () => {
          QueueProvider.add(items);
        });
      });
    }
  );

  commands.registerCommand(
    "cloudmusic.intelligence",
    async (element: QueueItemTreeItem) => {
      PersonalFm.set(false);
      QueueProvider.refresh(async () => {
        const { pid } = element;
        const { id } = element.item;
        const songs = await apiPlaymodeIntelligenceList(id, pid);
        const ids = songs.map((song) => song.id);
        const elements = await songsItem2TreeItem(id, ids, songs);
        QueueProvider.clear();
        QueueProvider.add([element]);
        QueueProvider.add(elements);
        if (!lock.playerLoad.get()) {
          load(element);
        }
      });
    }
  );

  commands.registerCommand(
    "cloudmusic.addSong",
    (element: QueueItemTreeItem) => {
      QueueProvider.refresh(async () => {
        QueueProvider.add([element]);
      });
    }
  );

  commands.registerCommand(
    "cloudmusic.playSongWithPlaylist",
    (element: QueueItemTreeItem) => {
      PlaylistProvider.refresh(
        PlaylistProvider.playlists.get(element.pid),
        (items) => {
          QueueProvider.refresh(async () => {
            PersonalFm.set(false);
            QueueProvider.clear();
            QueueProvider.add(items);
            QueueProvider.shift(QueueProvider.songs.indexOf(element));
            if (!lock.playerLoad.get()) {
              load(QueueProvider.songs[0]);
            }
          });
        }
      );
    }
  );

  commands.registerCommand(
    "cloudmusic.deleteFromPlaylist",
    async (element: QueueItemTreeItem) => {
      if (await apiPlaylistTracks("del", element.pid, [element.item.id])) {
        PlaylistProvider.refresh();
      }
    }
  );

  commands.registerCommand(
    "cloudmusic.saveToPlaylist",
    (element: QueueItemTreeItem) => {
      MultiStepInput.run((input) =>
        pickAddToPlaylist(input, 1, element.item.id)
      );
    }
  );
}
