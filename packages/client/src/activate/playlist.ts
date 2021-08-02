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
import {
  PlaylistItemTreeItem,
  PlaylistProvider,
  ProgramTreeItem,
  QueueItemTreeItem,
  UserTreeItem,
} from "../treeview";
import { commands, env, window } from "vscode";
import { AccountManager } from "../manager";
import type { ExtensionContext } from "vscode";
import { NeteaseEnum } from "@cloudmusic/shared";
import type { QueueContent } from "../treeview";
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
      async ({ item: { id }, uid }: PlaylistItemTreeItem) => {
        const confirm = await window.showWarningMessage(
          i18n.sentence.hint.confirmation,
          { modal: true },
          i18n.word.confirmation
        );
        if (!confirm) return;
        if (
          await (AccountManager.isUserPlaylisr(uid, id)
            ? IPC.netease("playlistDelete", [id])
            : IPC.netease("playlistSubscribe", [id, "unsubscribe"]))
        )
          PlaylistProvider.refreshUser(UserTreeItem.get(uid) as UserTreeItem);
      }
    ),

    commands.registerCommand(
      "cloudmusic.editPlaylist",
      ({ item: { id, name, description }, uid }: PlaylistItemTreeItem) => {
        if (!AccountManager.isUserPlaylisr(uid, id)) return;

        type State = { name: string; desc: string };
        const state: State = { name, desc: description || "" };

        void MultiStepInput.run(async (input) => {
          state.name = await input.showInputBox({
            title: i18n.word.editPlaylist,
            step: 1,
            totalSteps: 2,
            value: state.name,
            prompt: i18n.sentence.hint.name,
          });
          return (input) => inputDesc(input);
        });

        async function inputDesc(input: MultiStepInput) {
          state.desc = await input.showInputBox({
            title: i18n.word.editPlaylist,
            step: 2,
            totalSteps: 2,
            value: state.desc,
            prompt: i18n.sentence.hint.desc,
          });
          if (await IPC.netease("playlistUpdate", [id, state.name, state.desc]))
            PlaylistProvider.refreshUser(UserTreeItem.get(uid) as UserTreeItem);
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
      "cloudmusic.playSongWithPlaylist",
      async ({ data: { id, pid, uid } }: QueueItemTreeItem) => {
        const element = PlaylistItemTreeItem.get(pid, uid ?? 0);
        if (!element) return;
        const items = await PlaylistProvider.refreshPlaylist(element);
        IPC.new(items, id);
      }
    ),

    commands.registerCommand(
      "cloudmusic.deleteFromPlaylist",
      async ({ data: { id, pid, uid } }: QueueItemTreeItem) => {
        const p = PlaylistItemTreeItem.get(pid, uid ?? 0);
        if (!p || !AccountManager.isUserPlaylisr(p.uid, pid)) return;
        const confirm = await window.showWarningMessage(
          i18n.sentence.hint.confirmation,
          { modal: true },
          i18n.word.confirmation
        );
        if (!confirm) return;
        if (await IPC.netease("playlistTracks", [p.uid, "del", pid, [id]]))
          PlaylistProvider.refreshPlaylistHard(p);
      }
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
