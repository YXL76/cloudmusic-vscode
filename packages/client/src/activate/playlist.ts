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
import type { PlaylistItemTreeItem, QueueContent } from "../treeview";
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

    commands.registerCommand("cloudmusic.refreshPlaylist", () =>
      PlaylistProvider.refresh()
    ),

    commands.registerCommand("cloudmusic.createPlaylist", () => {
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

        if (
          name &&
          (await IPC.netease("playlistCreate", [
            name,
            pick.type === Type.public ? 0 : 10,
          ]))
        )
          PlaylistProvider.refresh();
      }
    }),

    commands.registerCommand(
      "cloudmusic.refreshPlaylistContent",
      (element: PlaylistItemTreeItem) => PlaylistProvider.refresh(element)
    ),

    commands.registerCommand(
      "cloudmusic.playPlaylist",
      (element: PlaylistItemTreeItem) =>
        PlaylistProvider.refresh(element, (items) => IPC.new(items))
    ),

    commands.registerCommand(
      "cloudmusic.deletePlaylist",
      async ({ item: { id } }: PlaylistItemTreeItem) => {
        if (
          (await window.showWarningMessage(
            i18n.sentence.hint.confirmation,
            { modal: true },
            i18n.word.confirmation
          )) &&
          (await (AccountManager.isUserPlaylisr(id)
            ? IPC.netease("playlistDelete", [id])
            : IPC.netease("playlistSubscribe", [id, "unsubscribe"])))
        )
          PlaylistProvider.refresh();
      }
    ),

    commands.registerCommand(
      "cloudmusic.editPlaylist",
      ({ item: { id, name, description } }: PlaylistItemTreeItem) => {
        if (!AccountManager.isUserPlaylisr(id)) return;

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
            PlaylistProvider.refresh();
        }
      }
    ),

    commands.registerCommand(
      "cloudmusic.addPlaylist",
      (element: PlaylistItemTreeItem) =>
        PlaylistProvider.refresh(element, (items) => IPC.add(items))
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
      ({ data: { id, pid } }: QueueItemTreeItem) =>
        PlaylistProvider.refresh(PlaylistProvider.playlists.get(pid), (items) =>
          IPC.new(items, id)
        )
    ),

    commands.registerCommand(
      "cloudmusic.deleteFromPlaylist",
      async ({ data: { id, pid } }: QueueItemTreeItem) => {
        if (
          AccountManager.isUserPlaylisr(id) &&
          (await window.showWarningMessage(
            i18n.sentence.hint.confirmation,
            { modal: true },
            i18n.word.confirmation
          )) &&
          (await IPC.netease("playlistTracks", ["del", pid, [id]]))
        )
          PlaylistProvider.refresh(PlaylistProvider.playlists.get(pid));
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
