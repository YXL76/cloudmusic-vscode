import {
  CommentType,
  apiPlaylistCreate,
  apiPlaylistDelete,
  apiPlaylistSubscribe,
  apiPlaylistTracks,
  apiPlaylistUpdate,
  apiPlaymodeIntelligenceList,
  apiSongUrl,
} from "../api";
import {
  MultiStepInput,
  WebView,
  confirmation,
  downloadMusic,
  load,
  pickAddToPlaylist,
  pickPlaylist,
  pickSong,
  player,
  songsItem2TreeItem,
} from "../util";
import type { PlaylistItemTreeItem, QueueItemTreeItem } from "../provider";
import { PlaylistProvider, QueueProvider } from "../provider";
import { Uri, commands, env, window } from "vscode";
import { basename, dirname } from "path";
import { HOME_DIR } from "../constant";
import { PersonalFm } from "../state";
import { createWriteStream } from "fs";
import { i18n } from "../i18n";

export function initPlaylist() {
  const userPlaylistProvider = PlaylistProvider.getUserInstance();
  const favoritePlaylistProvider = PlaylistProvider.getFavoriteInstance();
  window.registerTreeDataProvider("userPlaylist", userPlaylistProvider);
  window.registerTreeDataProvider("favoritePlaylist", favoritePlaylistProvider);

  commands.registerCommand("cloudmusic.refreshPlaylist", () => {
    PlaylistProvider.refresh({ refresh: true });
  });

  commands.registerCommand("cloudmusic.createPlaylist", () => {
    let name: undefined | string = undefined;

    void MultiStepInput.run((input) => inputName(input));

    async function inputName(input: MultiStepInput) {
      name = await input.showInputBox({
        title: i18n.word.createPlaylist,
        step: 1,
        totalSteps: 2,
        value: name,
        prompt: i18n.sentence.hint.name,
      });

      return (input: MultiStepInput) => pickType(input);
    }

    async function pickType(input: MultiStepInput) {
      const enum Type {
        public,
        private,
      }
      const pick = await input.showQuickPick({
        title: i18n.word.createPlaylist,
        step: 2,
        totalSteps: 2,
        items: [
          {
            label: i18n.word.public,
            type: Type.public,
          },
          {
            label: i18n.word.private,
            type: Type.private,
          },
        ],
      });

      if (
        name &&
        (await apiPlaylistCreate(name, pick.type === Type.public ? 0 : 10))
      ) {
        PlaylistProvider.refresh({});
      }
    }
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
          QueueProvider.refresh(() => {
            void PersonalFm.set(false);
            QueueProvider.clear();
            QueueProvider.add(items);
            void load(QueueProvider.songs[0]);
          });
        },
      });
    }
  );

  commands.registerCommand(
    "cloudmusic.deletePlaylist",
    ({ item: { id } }: PlaylistItemTreeItem) => {
      void MultiStepInput.run((input) =>
        confirmation(input, 1, async () => {
          if (await apiPlaylistDelete(id)) {
            PlaylistProvider.refresh({});
          }
        })
      );
    }
  );

  commands.registerCommand(
    "cloudmusic.editPlaylist",
    ({ item: { id, name, description } }: PlaylistItemTreeItem) => {
      type State = { name: string; desc: string };
      const state: State = { name, desc: description || "" };

      void MultiStepInput.run((input) => inputName(input));

      async function inputName(input: MultiStepInput) {
        state.name = await input.showInputBox({
          title: i18n.word.editPlaylist,
          step: 1,
          totalSteps: 2,
          value: state.name,
          prompt: i18n.sentence.hint.name,
        });
        return (input: MultiStepInput) => inputDesc(input);
      }

      async function inputDesc(input: MultiStepInput) {
        state.desc = await input.showInputBox({
          title: i18n.word.editPlaylist,
          step: 2,
          totalSteps: 2,
          value: state.desc,
          prompt: i18n.sentence.hint.desc,
        });
        if (await apiPlaylistUpdate(id, state.name, state.desc)) {
          PlaylistProvider.refresh({});
        }
      }
    }
  );

  commands.registerCommand(
    "cloudmusic.unsavePlaylist",
    ({ item: { id } }: PlaylistItemTreeItem) => {
      void MultiStepInput.run((input) =>
        confirmation(input, 1, async () => {
          if (await apiPlaylistSubscribe(id, "unsubscribe")) {
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
          QueueProvider.refresh(() => {
            QueueProvider.add(items);
          });
        },
      });
    }
  );

  commands.registerCommand(
    "cloudmusic.playlistDetail",
    ({ item }: PlaylistItemTreeItem) => {
      void MultiStepInput.run((input) => pickPlaylist(input, 1, item));
    }
  );

  commands.registerCommand(
    "cloudmusic.playlistComment",
    ({ item: { id, name } }: PlaylistItemTreeItem) => {
      WebView.getInstance().commentList(CommentType.playlist, id, name);
    }
  );

  commands.registerCommand(
    "cloudmusic.copyPlaylistLink",
    ({ item: { id } }: PlaylistItemTreeItem) => {
      void env.clipboard.writeText(`https://music.163.com/#/playlist?id=${id}`);
    }
  );

  commands.registerCommand(
    "cloudmusic.intelligence",
    async (element: QueueItemTreeItem) => {
      const { pid, item } = element;
      const { id } = item;
      const songs = await apiPlaymodeIntelligenceList(id, pid);
      void PersonalFm.set(false);
      QueueProvider.refresh(() => {
        const elements = songsItem2TreeItem(id, songs);
        QueueProvider.clear();
        QueueProvider.add([element]);
        QueueProvider.add(elements);
        void load(element);
      });
    }
  );

  commands.registerCommand(
    "cloudmusic.addSong",
    (element: QueueItemTreeItem) => {
      QueueProvider.refresh(() => {
        QueueProvider.add([element]);
      });
    }
  );

  commands.registerCommand(
    "cloudmusic.playSongWithPlaylist",
    ({ item: { id }, pid }: QueueItemTreeItem) => {
      PlaylistProvider.refresh({
        element: PlaylistProvider.playlists.get(pid),
        action: (items) => {
          QueueProvider.refresh(() => {
            void PersonalFm.set(false);
            QueueProvider.clear();
            QueueProvider.add(items);
            QueueProvider.top(id);
            void load(QueueProvider.songs[0]);
          });
        },
      });
    }
  );

  commands.registerCommand(
    "cloudmusic.deleteFromPlaylist",
    ({ item: { id }, pid }: QueueItemTreeItem) => {
      void MultiStepInput.run((input) =>
        confirmation(input, 1, async () => {
          if (await apiPlaylistTracks("del", pid, [id])) {
            PlaylistProvider.refresh({
              element: PlaylistProvider.playlists.get(pid),
              refresh: true,
            });
          }
        })
      );
    }
  );

  commands.registerCommand(
    "cloudmusic.saveToPlaylist",
    ({ item: { id } }: QueueItemTreeItem) => {
      void MultiStepInput.run((input) => pickAddToPlaylist(input, 1, id));
    }
  );

  commands.registerCommand(
    "cloudmusic.songDetail",
    (element?: QueueItemTreeItem) => {
      const { item } = element ? element : player;
      if (item) {
        void MultiStepInput.run((input) => pickSong(input, 1, item));
      }
    }
  );

  commands.registerCommand(
    "cloudmusic.songComment",
    ({ item: { id, name } }: QueueItemTreeItem) => {
      WebView.getInstance().commentList(CommentType.song, id, name);
    }
  );

  commands.registerCommand(
    "cloudmusic.copySongLink",
    ({ item: { id } }: QueueItemTreeItem) => {
      void env.clipboard.writeText(`https://music.163.com/#/song?id=${id}`);
    }
  );

  commands.registerCommand(
    "cloudmusic.downloadSong",
    async ({ item }: QueueItemTreeItem) => {
      const { url, type } = await apiSongUrl(item);
      if (!url) {
        return;
      }
      const uri = await window.showSaveDialog({
        defaultUri: Uri.joinPath(HOME_DIR, `${item.name}.${type || "mp3"}`),
        filters: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          Music: [type || "mp3"],
        },
      });
      if (uri && uri.scheme === "file") {
        const filename = basename(uri.fsPath);
        const data = await downloadMusic(url, filename, uri, false);
        if (data) {
          data.on("error", (err) => {
            console.error(err);
            void window.showErrorMessage(i18n.sentence.error.network);
            void commands.executeCommand("cloudmusic.next");
          });
          data.on("close", () => {
            void env.openExternal(Uri.file(dirname(uri.fsPath)));
          });
          const file = createWriteStream(uri.fsPath);
          data.pipe(file);
        }
      }
    }
  );
}
