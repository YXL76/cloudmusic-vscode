import {
  CommentType,
  apiPlaylistCreate,
  apiPlaylistDelete,
  apiPlaylistSubscribe,
  apiPlaylistTracks,
  apiPlaylistUpdate,
  apiPlaymodeIntelligenceList,
} from "../api";
import {
  MultiStepInput,
  WebView,
  confirmation,
  load,
  pickAddToPlaylist,
  pickPlaylist,
  pickSong,
  player,
  songsItem2TreeItem,
} from "../util";
import type { PlaylistItemTreeItem, QueueItemTreeItem } from "../provider";
import { PlaylistProvider, QueueProvider } from "../provider";
import { commands, env, window } from "vscode";
import { PersonalFm } from "../state";
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
    (element: PlaylistItemTreeItem) => {
      void MultiStepInput.run((input) =>
        confirmation(input, 1, async () => {
          if (await apiPlaylistDelete(element.item.id)) {
            PlaylistProvider.refresh({});
          }
        })
      );
    }
  );

  commands.registerCommand(
    "cloudmusic.editPlaylist",
    (element: PlaylistItemTreeItem) => {
      type State = {
        name: string;
        desc: string;
      };
      const state: State = {
        name: element.item.name,
        desc: element.item.description || "",
      };

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
        if (await apiPlaylistUpdate(element.item.id, state.name, state.desc)) {
          PlaylistProvider.refresh({});
        }
      }
    }
  );

  commands.registerCommand(
    "cloudmusic.unsavePlaylist",
    (element: PlaylistItemTreeItem) => {
      void MultiStepInput.run((input) =>
        confirmation(input, 1, async () => {
          if (await apiPlaylistSubscribe(element.item.id, "unsubscribe")) {
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
    (element: PlaylistItemTreeItem) => {
      void MultiStepInput.run((input) => pickPlaylist(input, 1, element.item));
    }
  );

  commands.registerCommand(
    "cloudmusic.playlistComment",
    (element: PlaylistItemTreeItem) => {
      const { id, name } = element.item;
      WebView.getInstance().commentList(CommentType.playlist, id, name);
    }
  );

  commands.registerCommand(
    "cloudmusic.copyPlaylistLink",
    (element: PlaylistItemTreeItem) => {
      void env.clipboard.writeText(
        `https://music.163.com/#/playlist?id=${element.item.id}`
      );
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
    (element: QueueItemTreeItem) => {
      PlaylistProvider.refresh({
        element: PlaylistProvider.playlists.get(element.pid),
        action: (items) => {
          QueueProvider.refresh(() => {
            void PersonalFm.set(false);
            QueueProvider.clear();
            QueueProvider.add(items);
            QueueProvider.top(element.item.id);
            void load(QueueProvider.songs[0]);
          });
        },
      });
    }
  );

  commands.registerCommand(
    "cloudmusic.deleteFromPlaylist",
    (element: QueueItemTreeItem) => {
      void MultiStepInput.run((input) =>
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
      void MultiStepInput.run((input) =>
        pickAddToPlaylist(input, 1, element.item.id)
      );
    }
  );

  commands.registerCommand(
    "cloudmusic.songDetail",
    (element?: QueueItemTreeItem) => {
      const item = element ? element.item : player.item;
      if (item) {
        void MultiStepInput.run((input) => pickSong(input, 1, item));
      }
    }
  );

  commands.registerCommand(
    "cloudmusic.songComment",
    (element: QueueItemTreeItem) => {
      const { id, name } = element.item;
      WebView.getInstance().commentList(CommentType.song, id, name);
    }
  );

  commands.registerCommand(
    "cloudmusic.copySongLink",
    (element: QueueItemTreeItem) => {
      void env.clipboard.writeText(
        `https://music.163.com/#/song?id=${element.item.id}`
      );
    }
  );
}
