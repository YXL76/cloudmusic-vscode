import {
  IPC,
  MultiStepInput,
  State,
  Webview,
  pickAddToPlaylist,
  pickPlaylist,
  pickProgram,
  pickSong,
} from "../utils";
import type {
  PlaylistItemTreeItem,
  QueueContent,
  UserTreeItem,
} from "../treeview";
import {
  PlaylistProvider,
  ProgramTreeItem,
  QueueItemTreeItem,
} from "../treeview";
import { commands, env, window } from "vscode";
import { AccountManager } from "../manager";
import type { ExtensionContext } from "vscode";
import { NeteaseEnum } from "@cloudmusic/shared";
import i18n from "../i18n";

export function initPlaylist(context: ExtensionContext): void {
  const playlistProvider = PlaylistProvider.getInstance();

  context.subscriptions.push(
    window.registerTreeDataProvider("playlist", playlistProvider),

    commands.registerCommand(
      "cloudmusic.refreshPlaylist",
      (element: UserTreeItem) => PlaylistProvider.refreshUser(element)
    ),

    commands.registerCommand(
      "cloudmusic.createPlaylist",
      (element: UserTreeItem) => {
        let name: undefined | string = undefined;

        void MultiStepInput.run(async (input) => {
          name = await input.showInputBox({
            title: i18n.word.createPlaylist,
            step: 1,
            totalSteps: 2,
            value: name,
            prompt: i18n.sentence.hint.name,
          });

          return (input) => pickType(input);
        });

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

          if (!name) return;
          const res = await IPC.netease("playlistCreate", [
            name,
            pick.type === Type.public ? 0 : 10,
          ]);
          if (res) PlaylistProvider.refreshUser(element);
        }
      }
    ),

    commands.registerCommand(
      "cloudmusic.refreshPlaylistContent",
      (element: PlaylistItemTreeItem) =>
        PlaylistProvider.refreshPlaylistHard(element)
    ),

    commands.registerCommand(
      "cloudmusic.playPlaylist",
      async (element: PlaylistItemTreeItem) => {
        const items = await PlaylistProvider.refreshPlaylist(element);
        IPC.new(items);
      }
    ),

    commands.registerCommand(
      "cloudmusic.deletePlaylist",
      (element: UserTreeItem) =>
        void MultiStepInput.run(async (input) => {
          const { uid } = element;
          const items = (await AccountManager.userPlaylist(uid)).map(
            ({ name, id }) => ({ label: `$(list-unordered) ${name}`, id })
          );
          const title = i18n.word.saveToPlaylist;
          const pick = await input.showQuickPick({ title, step: 1, items });
          if (!pick || !pick.id) return;
          const confirm = await window.showWarningMessage(
            i18n.sentence.hint.confirmation,
            { modal: true },
            i18n.word.confirmation
          );
          if (!confirm) return;
          if (
            await (AccountManager.isUserPlaylisr(uid, pick.id)
              ? IPC.netease("playlistDelete", [uid, pick.id])
              : IPC.netease("playlistSubscribe", [uid, pick.id, "unsubscribe"]))
          )
            PlaylistProvider.refreshUser(element);
        })
    ),

    commands.registerCommand(
      "cloudmusic.editPlaylist",
      (element: UserTreeItem) => {
        type State = { name: string; desc: string };
        const title = i18n.word.editPlaylist;
        const totalSteps = 3;
        const state: State = { name: "", desc: "" };
        const { uid } = element;

        void MultiStepInput.run(async (input) => {
          const items = (await AccountManager.userPlaylist(uid)).map(
            ({ name, id, description }) => ({
              label: `$(list-unordered) ${name}`,
              id,
              description: description || "",
            })
          );
          const pick = await input.showQuickPick({ title, step: 1, items });
          if (!pick || !pick.id) return;
          return (input) => inputName(input, pick.id);
        });

        async function inputName(input: MultiStepInput, id: number) {
          state.name = await input.showInputBox({
            title,
            step: 2,
            totalSteps,
            value: state.name,
            prompt: i18n.sentence.hint.name,
          });
          return (input: MultiStepInput) => inputDesc(input, id);
        }

        async function inputDesc(input: MultiStepInput, id: number) {
          state.desc = await input.showInputBox({
            title,
            step: 3,
            totalSteps,
            value: state.desc,
            prompt: i18n.sentence.hint.desc,
          });
          if (await IPC.netease("playlistUpdate", [id, state.name, state.desc]))
            PlaylistProvider.refreshUser(element);
        }
      }
    ),

    commands.registerCommand(
      "cloudmusic.addPlaylist",
      async (element: PlaylistItemTreeItem) => {
        const items = await PlaylistProvider.refreshPlaylist(element);
        IPC.add(items);
      }
    ),

    commands.registerCommand(
      "cloudmusic.playlistDetail",
      ({ item }: PlaylistItemTreeItem) =>
        void MultiStepInput.run((input) => pickPlaylist(input, 1, item))
    ),

    commands.registerCommand(
      "cloudmusic.playlistComment",
      ({ item: { id, name } }: PlaylistItemTreeItem) =>
        Webview.comment(NeteaseEnum.CommentType.playlist, id, name)
    ),

    commands.registerCommand(
      "cloudmusic.copyPlaylistLink",
      ({ item: { id } }: PlaylistItemTreeItem) =>
        void env.clipboard.writeText(
          `https://music.163.com/#/playlist?id=${id}`
        )
    ),

    commands.registerCommand(
      "cloudmusic.intelligence",
      async ({ data }: QueueItemTreeItem) => {
        const songs = await IPC.netease("playmodeIntelligenceList", [
          data.id,
          data.pid,
        ]);
        IPC.new([
          data,
          ...songs.map(
            (song) => QueueItemTreeItem.new({ ...song, pid: data.pid }).data
          ),
        ]);
      }
    ),

    commands.registerCommand(
      "cloudmusic.addSong",
      ({ data }: QueueItemTreeItem) => IPC.add([data])
    ),

    commands.registerCommand(
      "cloudmusic.deleteFromPlaylist",
      (element: PlaylistItemTreeItem) =>
        void MultiStepInput.run(async (input) => {
          const {
            uid,
            item: { id },
          } = element;
          if (!uid) return;

          const songs = await IPC.netease("playlistDetail", [uid, id]);
          const pick = await input.showQuickPick({
            title: i18n.word.playlist,
            step: 1,
            items: songs.map(({ name, al, ar, id }) => ({
              id,
              label: name,
              description: ar.map(({ name }) => name).join("/"),
              detail: al.name,
            })),
          });
          if (!pick) return;
          const confirm = await window.showWarningMessage(
            i18n.sentence.hint.confirmation,
            { modal: true },
            i18n.word.confirmation
          );
          if (!confirm) return;
          if (await IPC.netease("playlistTracks", [uid, "del", id, [pick.id]]))
            PlaylistProvider.refreshPlaylistHard(element);
        })
    ),

    commands.registerCommand(
      "cloudmusic.saveToPlaylist",
      ({ item: { id } }: QueueItemTreeItem) =>
        void MultiStepInput.run((input) => pickAddToPlaylist(input, 1, id))
    ),

    commands.registerCommand(
      "cloudmusic.songDetail",
      (element?: QueueContent) => {
        element = element ?? State.playItem;
        if (!element) return;
        if (element instanceof QueueItemTreeItem)
          void MultiStepInput.run((input) =>
            pickSong(input, 1, (element as QueueItemTreeItem).item)
          );
        else if (element instanceof ProgramTreeItem)
          void MultiStepInput.run((input) =>
            pickProgram(input, 1, (element as ProgramTreeItem).data)
          );
      }
    ),

    commands.registerCommand(
      "cloudmusic.songComment",
      ({ item: { id, name } }: QueueItemTreeItem) =>
        Webview.comment(NeteaseEnum.CommentType.song, id, name)
    ),

    commands.registerCommand(
      "cloudmusic.copySongLink",
      ({ item: { id } }: QueueItemTreeItem) =>
        void env.clipboard.writeText(`https://music.163.com/#/song?id=${id}`)
    ),

    commands.registerCommand(
      "cloudmusic.downloadSong",
      async ({ valueOf }: QueueItemTreeItem | ProgramTreeItem) => {
        const { url, type } = await IPC.netease("songUrl", [`${valueOf}`]);
        if (!url) return;

        const uri = await window.showSaveDialog({
          // eslint-disable-next-line @typescript-eslint/naming-convention
          filters: { Music: [type || "mp3"] },
        });
        if (uri && uri.scheme === "file") IPC.download(url, uri.fsPath);
      }
    )
  );
}
