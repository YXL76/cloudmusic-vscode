import {
  MultiStepInput,
  apiPlaylistDelete,
  apiPlaylistTracks,
  apiPlaymodeIntelligenceList,
  confirmation,
  load,
  pickAddToPlaylist,
  songsItem2TreeItem,
} from "../util";
import { PersonalFm, lock } from "../state";
import {
  PlaylistItemTreeItem,
  PlaylistProvider,
  QueueItemTreeItem,
  QueueProvider,
} from "../provider";
import { commands, window } from "vscode";

export async function initPlaylist(): Promise<void> {
  const userPlaylistProvider = PlaylistProvider.getUserInstance();
  const favoritePlaylistProvider = PlaylistProvider.getFavoriteInstance();
  window.registerTreeDataProvider("userPlaylist", userPlaylistProvider);
  window.registerTreeDataProvider("favoritePlaylist", favoritePlaylistProvider);

  commands.registerCommand("cloudmusic.refreshPlaylist", () => {
    PlaylistProvider.refresh({ refresh: true });
  });

  commands.registerCommand(
    "cloudmusic.refreshPlaylistContent",
    (element: PlaylistItemTreeItem) =>
      PlaylistProvider.refresh({ element, refresh: true })
  );

  commands.registerCommand(
    "cloudmusic.playPlaylist",
    (element: PlaylistItemTreeItem) => {
      PlaylistProvider.refresh({
        element,
        action: (items) => {
          QueueProvider.refresh(async () => {
            PersonalFm.set(false);
            QueueProvider.clear();
            QueueProvider.add(items);
            if (!lock.playerLoad.get()) {
              load(QueueProvider.songs[0]);
            }
          });
        },
      });
    }
  );

  commands.registerCommand(
    "cloudmusic.deletePlaylist",
    (element: PlaylistItemTreeItem) => {
      MultiStepInput.run((input) =>
        confirmation(input, 1, async () => {
          if (await apiPlaylistDelete(element.item.id)) {
            PlaylistProvider.refresh({});
          }
        })
      );
    }
  );

  commands.registerCommand(
    "cloudmusic.addPlaylist",
    (element: PlaylistItemTreeItem) => {
      PlaylistProvider.refresh({
        element,
        action: (items) => {
          QueueProvider.refresh(async () => {
            QueueProvider.add(items);
          });
        },
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
      PlaylistProvider.refresh({
        element: PlaylistProvider.playlists.get(element.pid),
        action: (items) => {
          QueueProvider.refresh(async () => {
            PersonalFm.set(false);
            QueueProvider.clear();
            QueueProvider.add(items);
            QueueProvider.top(element.item.id);
            if (!lock.playerLoad.get()) {
              load(QueueProvider.songs[0]);
            }
          });
        },
      });
    }
  );

  commands.registerCommand(
    "cloudmusic.deleteFromPlaylist",
    async (element: QueueItemTreeItem) => {
      MultiStepInput.run((input) =>
        confirmation(input, 1, async () => {
          if (await apiPlaylistTracks("del", element.pid, [element.item.id])) {
            PlaylistProvider.refresh({
              element: PlaylistProvider.playlists.get(element.pid),
              refresh: true,
            });
          }
        })
      );
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
