import {
  MultiStepInput,
  apiPlaylistCreate,
  apiPlaylistDelete,
  apiPlaylistSubscribe,
  apiPlaylistTracks,
  apiPlaylistUpdate,
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
import { i18n } from "../i18n";

export async function initPlaylist(): Promise<void> {
  const userPlaylistProvider = PlaylistProvider.getUserInstance();
  const favoritePlaylistProvider = PlaylistProvider.getFavoriteInstance();
  window.registerTreeDataProvider("userPlaylist", userPlaylistProvider);
  window.registerTreeDataProvider("favoritePlaylist", favoritePlaylistProvider);

  commands.registerCommand("cloudmusic.refreshPlaylist", () => {
    PlaylistProvider.refresh({ refresh: true });
  });

  commands.registerCommand("cloudmusic.createPlaylist", () => {
    let name: undefined | string = undefined;

    MultiStepInput.run((input) => inputName(input));

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
      enum Type {
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
        (await apiPlaylistCreate(name, pick.type === Type.public ? 10 : 0))
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

      MultiStepInput.run((input) => inputName(input));

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
      MultiStepInput.run((input) =>
        confirmation(input, 1, async () => {
          if (await apiPlaylistSubscribe(element.item.id, 0)) {
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
        const elements = songsItem2TreeItem(id, songs);
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
