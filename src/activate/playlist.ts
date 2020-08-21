import { PersonalFm, lock } from "../state";
import {
  PlaylistItemTreeItem,
  PlaylistProvider,
  QueueItemTreeItem,
  QueueProvider,
} from "../provider";
import {
  apiPlaylistTracks,
  apiPlaymodeIntelligenceList,
  load,
  songsItem2TreeItem,
} from "../util";
import { commands, window } from "vscode";
import { AccountManager } from "../manager";

export function initPlaylist(): void {
  const userPlaylistProvider = PlaylistProvider.getUserInstance();
  const favoritePlaylistProvider = PlaylistProvider.getFavoriteInstance();
  window.registerTreeDataProvider("userPlaylist", userPlaylistProvider);
  window.registerTreeDataProvider("favoritePlaylist", favoritePlaylistProvider);

  commands.registerCommand(
    "cloudmusic.refreshPlaylist",
    PlaylistProvider.refresh
  );

  commands.registerCommand(
    "cloudmusic.refreshPlaylistContent",
    (element: PlaylistItemTreeItem) => PlaylistProvider.refresh(element)
  );

  commands.registerCommand(
    "cloudmusic.playPlaylist",
    (element: PlaylistItemTreeItem) => {
      PlaylistProvider.playPlaylist(element.item.id, () => {
        PersonalFm.set(false);
        if (!lock.playerLoad.get()) {
          load(QueueProvider.songs[0]);
        }
      });
    }
  );

  commands.registerCommand(
    "cloudmusic.addPlaylist",
    (element: PlaylistItemTreeItem) => {
      PlaylistProvider.addPlaylist(element);
    }
  );

  commands.registerCommand(
    "cloudmusic.intelligence",
    async (element: QueueItemTreeItem) => {
      PersonalFm.set(false);
      QueueProvider.refresh(async (queueProvider) => {
        const { pid } = element;
        const { id } = element.item;
        const songs = await apiPlaymodeIntelligenceList(id, pid);
        const ids = songs.map((song) => song.id);
        const elements = await songsItem2TreeItem(id, ids, songs);
        queueProvider.clear();
        queueProvider.add([element]);
        queueProvider.add(elements);
        if (!lock.playerLoad.get()) {
          load(element);
        }
      });
    }
  );

  commands.registerCommand(
    "cloudmusic.addSong",
    (element: QueueItemTreeItem) => {
      QueueProvider.refresh(async (queueProvider) => {
        queueProvider.add([element]);
      });
    }
  );

  commands.registerCommand(
    "cloudmusic.playSongWithPlaylist",
    (element: QueueItemTreeItem) => {
      PlaylistProvider.playPlaylist(
        element.pid,
        () => {
          if (!lock.playerLoad.get()) {
            load(element);
          }
        },
        element
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

  commands.registerCommand("cloudmusic.addToPlaylist", async ({ item }) => {
    const lists = await AccountManager.userPlaylist();
    const selection = await window.showQuickPick(
      lists.map(({ name, id }) => ({
        label: name,
        id,
      }))
    );
    if (!selection) {
      return;
    }
    if (await apiPlaylistTracks("add", selection.id, [item.id])) {
      PlaylistProvider.refresh();
    }
  });
}
