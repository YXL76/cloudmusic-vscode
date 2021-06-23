import { ButtonAction, IPC, LikeState, State, Webview } from ".";
import type { InputStep, MultiStepInput } from ".";
import type {
  PlaylistItemTreeItem,
  QueueContent,
  RadioTreeItem,
} from "../treeview";
import {
  PlaylistProvider,
  ProgramTreeItem,
  QueueItemTreeItem,
} from "../treeview";
import { commands, window } from "vscode";
import { AccountManager } from "../manager";
import { ICON } from "../constant";
import { NeteaseEnum } from "@cloudmusic/shared";
import type { NeteaseTypings } from "api";
import type { QuickPickItem } from "vscode";

import i18n from "../i18n";

export async function likeMusic(id: number, like: boolean): Promise<void> {
  if (await IPC.netease("like", [id, like])) {
    if (id === State.playItem?.valueOf)
      State.like = like ? LikeState.like : LikeState.dislike;
    like ? AccountManager.likelist.add(id) : AccountManager.likelist.delete(id);
    void window.showInformationMessage(
      like ? i18n.word.like : i18n.word.dislike
    );
  } else void window.showErrorMessage(i18n.sentence.fail.addToPlaylist);
}

const enum PickType {
  description,
  artist,
  album,
  albums,
  like,
  add,
  next,
  save,
  unsave,
  similar,
  song,
  songs,
  playlist,
  subscribed,
  user,
  followeds,
  follows,
  comment,
  copy,
  download,
  program,
  programs,
  radio,
  hot,
}
interface T extends QuickPickItem {
  id: number;
  type: PickType;
}

interface ST extends T {
  item: NeteaseTypings.SongsItem;
}

export const pickSongItems = (
  songs: readonly NeteaseTypings.SongsItem[]
): readonly ST[] =>
  songs.map((item) => ({
    label: `${ICON.song} ${item.name}`,
    description: item.ar.map((i) => i.name).join("/"),
    detail: item.alia.join("/"),
    id: item.id,
    item,
    type: PickType.song,
  }));

export const pickArtistItems = (
  ars: readonly { id: number; name: string }[]
): readonly T[] =>
  ars.map(({ name, id }) => ({
    label: `${ICON.artist} ${name}`,
    id,
    type: PickType.artist,
  }));

export const pickAlbumItems = (
  albums: readonly NeteaseTypings.AlbumsItem[]
): readonly T[] =>
  albums.map(({ name, alias, artists, id }) => ({
    label: `${ICON.album} ${name}`,
    description: alias.join("/"),
    detail: artists.map((artist) => artist.name).join("/"),
    id,
    type: PickType.album,
  }));

interface PT extends T {
  item: NeteaseTypings.PlaylistItem;
}

export const pickPlaylistItems = (
  playlists: readonly NeteaseTypings.PlaylistItem[]
): readonly PT[] =>
  playlists.map((playlist) => ({
    label: `${ICON.playlist} ${playlist.name}`,
    description: `${playlist.trackCount}`,
    detail: playlist.description || "",
    id: playlist.id,
    item: playlist,
    type: PickType.playlist,
  }));

export const pickUserDetails = (
  users: readonly NeteaseTypings.UserDetail[]
): readonly T[] =>
  users.map(({ nickname, signature, userId }) => ({
    label: `${ICON.artist} ${nickname}`,
    detail: signature,
    id: userId,
    type: PickType.user,
  }));

interface RDT extends T {
  item: NeteaseTypings.RadioDetail;
}

export const pickRadioDetails = (
  radios: readonly NeteaseTypings.RadioDetail[]
): readonly RDT[] =>
  radios.map((item) => ({
    label: `${ICON.radio} ${item.name}`,
    description: item.dj.nickname,
    id: item.id,
    item,
    type: PickType.radio,
  }));

interface PDT extends T {
  item: NeteaseTypings.ProgramDetail;
}

export const pickProgramDetails = (
  programs: readonly NeteaseTypings.ProgramDetail[]
): readonly PDT[] =>
  programs.map((item) => ({
    label: `${ICON.program} ${item.mainSong.name}`,
    description: item.mainSong.ar.map(({ name }) => name).join("/"),
    id: item.id,
    item,
    type: PickType.program,
  }));

export async function pickSong(
  input: MultiStepInput,
  step: number,
  item: NeteaseTypings.SongsItem
): Promise<InputStep> {
  const { name, alia, ar, al, id } = item;

  const pick = await input.showQuickPick({
    title: `${i18n.word.song}-${i18n.word.detail}`,
    step,
    items: [
      {
        label: `${ICON.name} ${name}`,
        detail: alia.join("/"),
      },
      {
        label: `${ICON.copy} ${i18n.word.copyLink}`,
        type: PickType.copy,
      },
      {
        label: `${ICON.download} ${i18n.word.download}`,
        type: PickType.download,
      },
      ...pickArtistItems(ar),
      {
        label: `${ICON.album} ${i18n.word.album}`,
        detail: al.name,
        id: al.id,
        type: PickType.album,
      },
      {
        label: `${ICON.like} ${i18n.word.like}`,
        type: PickType.like,
      },
      {
        label: `${ICON.comment} ${i18n.word.comment}`,
        type: PickType.comment,
      },
      {
        label: `${ICON.add} ${i18n.word.addToQueue}`,
        type: PickType.add,
      },
      {
        label: `${ICON.play} ${i18n.word.nextTrack}`,
        type: PickType.next,
      },
      {
        label: `${ICON.save} ${i18n.word.saveToPlaylist}`,
        type: PickType.save,
      },
      {
        label: `${ICON.similar} ${i18n.word.similarSongs}`,
        type: PickType.similar,
      },
      {
        label: `${ICON.similar} ${i18n.word.similarPlaylists}`,
        type: PickType.similar,
      },
    ],
  });
  switch (pick.type) {
    case PickType.copy:
      void commands.executeCommand("cloudmusic.copySongLink", {
        item,
      } as QueueItemTreeItem);
      break;
    case PickType.download:
      void commands.executeCommand("cloudmusic.downloadSong", { item } as
        | QueueItemTreeItem
        | ProgramTreeItem);
      break;
    case PickType.album:
      return (input) => pickAlbum(input, step + 1, (pick as T).id);
    case PickType.artist:
      return (input) => pickArtist(input, step + 1, (pick as T).id);
    case PickType.save:
      return (input) => pickAddToPlaylist(input, step + 1, id);
    case PickType.similar:
      if (pick.label === `${ICON.similar} ${i18n.word.similarSongs}`) {
        return (input) => pickSimiSong(input, step + 1, id, 0);
      }
      return (input) => pickSimiPlaylists(input, step + 1, id, 0);
    case PickType.comment:
      Webview.comment(NeteaseEnum.CommentType.song, id, name);
      break;
    case PickType.like:
      await likeMusic(id, true);
      break;
    case PickType.add:
      void commands.executeCommand(
        "cloudmusic.addSong",
        QueueItemTreeItem.new({ ...item, pid: item.al.id })
      );
      break;
    case PickType.next:
      void commands.executeCommand(
        "cloudmusic.playNext",
        QueueItemTreeItem.new({ ...item, pid: item.al.id }) as QueueContent
      );
      break;
  }

  return input.stay();
}

export async function pickSongMany(
  input: MultiStepInput,
  step: number,
  songs: readonly NeteaseTypings.SongsItem[]
): Promise<InputStep> {
  const pick = await input.showQuickPick({
    title: i18n.word.song,
    step,
    items: [
      {
        label: `${ICON.add} ${i18n.word.addToQueue}`,
        type: PickType.add,
      },
      {
        label: `${ICON.play} ${i18n.word.nextTrack}`,
        type: PickType.next,
      },
    ],
  });
  IPC.add(
    songs.map(
      (song) => QueueItemTreeItem.new({ ...song, pid: song.al.id }).data
    ),
    pick.type === PickType.add ? undefined : 1
  );
  return input.stay();
}

async function pickSimiSong(
  input: MultiStepInput,
  step: number,
  id: number,
  offset: number
): Promise<InputStep> {
  const limit = 50;
  const songs = await IPC.netease("simiSong", [id, limit, offset]);
  const pick = await input.showQuickPick({
    title: i18n.word.similarSongs,
    step,
    items: pickSongItems(songs),
    canSelectMany: true,
    previous: offset > 0,
    next: songs.length === limit,
  });
  if (pick === ButtonAction.previous)
    return input.stay((input) => pickSimiSong(input, step, id, offset - limit));
  if (pick === ButtonAction.next)
    return input.stay((input) => pickSimiSong(input, step, id, offset + limit));
  if (pick.length === 0) return input.stay();
  if (pick.length === 1)
    return (input) => pickSong(input, step + 1, pick[0].item);

  return (input) =>
    pickSongMany(
      input,
      step + 1,
      pick.map(({ item }) => item)
    );
}

export async function pickSongs(
  input: MultiStepInput,
  step: number,
  songs: readonly NeteaseTypings.SongsItem[]
): Promise<InputStep> {
  const pick = await input.showQuickPick({
    title: i18n.word.song,
    step,
    items: pickSongItems(songs),
    canSelectMany: true,
  });
  if (pick.length === 0) return input.stay();
  if (pick.length === 1)
    return (input) => pickSong(input, step + 1, pick[0].item);

  return (input) =>
    pickSongMany(
      input,
      step + 1,
      pick.map(({ item }) => item)
    );
}

export async function pickProgram(
  input: MultiStepInput,
  step: number,
  program: NeteaseTypings.ProgramDetail
): Promise<InputStep> {
  const { mainSong, dj, id, rid } = program;
  const { name } = mainSong;
  const radio = await IPC.netease("djDetail", [rid]);

  const pick = await input.showQuickPick({
    title: `${i18n.word.program}-${i18n.word.detail}`,
    step,
    items: [
      { label: `${ICON.name} ${name}` },
      {
        label: `${ICON.copy} ${i18n.word.copyLink}`,
        type: PickType.copy,
      },
      {
        label: `${ICON.download} ${i18n.word.download}`,
        type: PickType.download,
      },
      ...pickUserDetails([dj]),
      ...pickRadioDetails(radio ? [radio] : []),
      {
        label: `${ICON.comment} ${i18n.word.comment}`,
        type: PickType.comment,
      },
      {
        label: `${ICON.add} ${i18n.word.addToQueue}`,
        type: PickType.add,
      },
      {
        label: `${ICON.play} ${i18n.word.nextTrack}`,
        type: PickType.next,
      },
    ],
  });
  switch (pick.type) {
    case PickType.copy:
      void commands.executeCommand("cloudmusic.copyProgramLink", {
        data: { id },
      } as ProgramTreeItem);
      break;
    case PickType.download:
      void commands.executeCommand("cloudmusic.downloadSong", {
        item: mainSong,
      } as QueueItemTreeItem | ProgramTreeItem);
      break;
    case PickType.user:
      return (input) => pickUser(input, step + 1, (pick as T).id);
    case PickType.radio:
      return (input) =>
        pickRadio(input, step + 1, radio as NeteaseTypings.RadioDetail);
    case PickType.comment:
      Webview.comment(NeteaseEnum.CommentType.dj, id, name);
      break;
    case PickType.add:
      void commands.executeCommand(
        "cloudmusic.addProgram",
        ProgramTreeItem.new({ ...program, pid: radio ? radio.id : 0 })
      );
      break;
    case PickType.next:
      IPC.add(
        [ProgramTreeItem.new({ ...program, pid: program.mainSong.al.id }).data],
        1
      );
      break;
  }

  return input.stay();
}

export async function pickProgramMany(
  input: MultiStepInput,
  step: number,
  programs: readonly NeteaseTypings.ProgramDetail[]
): Promise<InputStep> {
  const pick = await input.showQuickPick({
    title: i18n.word.program,
    step,
    items: [
      {
        label: `${ICON.add} ${i18n.word.addToQueue}`,
        type: PickType.add,
      },
      {
        label: `${ICON.play} ${i18n.word.nextTrack}`,
        type: PickType.next,
      },
    ],
  });
  IPC.add(
    programs.map(
      (program) =>
        ProgramTreeItem.new({ ...program, pid: program.mainSong.id }).data
    ),
    pick.type === PickType.add ? undefined : 1
  );
  return input.stay();
}

export async function pickPrograms(
  input: MultiStepInput,
  step: number,
  programs: readonly NeteaseTypings.ProgramDetail[]
): Promise<InputStep> {
  const pick = await input.showQuickPick({
    title: i18n.word.program,
    step,
    items: pickProgramDetails(programs),
    canSelectMany: true,
  });
  if (pick.length === 0) return input.stay();
  if (pick.length === 1)
    return (input) => pickProgram(input, step + 1, pick[0].item);

  return (input) =>
    pickProgramMany(
      input,
      step + 1,
      pick.map(({ item }) => item)
    );
}

export async function pickRadio(
  input: MultiStepInput,
  step: number,
  item: NeteaseTypings.RadioDetail
): Promise<InputStep> {
  const { name, desc, id, subCount, programCount, playCount, dj } = item;

  const pick = await input.showQuickPick({
    title: `${i18n.word.radio}-${i18n.word.detail}`,
    step,
    items: [
      { label: `${ICON.name} ${name}` },
      { label: `${ICON.description} ${desc}` },
      {
        label: `${ICON.copy} ${i18n.word.copyLink}`,
        type: PickType.copy,
      },
      ...pickUserDetails([dj]),
      {
        label: `${ICON.number} ${i18n.word.playCount}`,
        description: `${playCount}`,
      },
      {
        label: `${ICON.number} ${i18n.word.subscribedCount}`,
        description: `${subCount}`,
        type: PickType.subscribed,
      },
      {
        label: `${ICON.number} ${i18n.word.trackCount}`,
        description: `${programCount}`,
        type: PickType.programs,
      },
    ],
  });
  switch (pick.type) {
    case PickType.copy:
      void commands.executeCommand("cloudmusic.copyRadioLink", {
        item: { id },
      } as RadioTreeItem);
      break;
    case PickType.user:
      return (input) => pickUser(input, step + 1, (pick as T).id);
    case PickType.subscribed:
      return async (input) =>
        pickUsers(
          input,
          step + 1,
          (id, limit) => IPC.netease("djSubscriber", [id, limit]),
          -1,
          id
        );
    case PickType.programs:
      return async (input) =>
        pickPrograms(
          input,
          step + 1,
          await IPC.netease("djProgram", [id, programCount])
        );
  }

  return input.stay();
}

export async function pickRadios(
  input: MultiStepInput,
  step: number,
  radios: readonly NeteaseTypings.RadioDetail[]
): Promise<InputStep> {
  const { item } = await input.showQuickPick({
    title: i18n.word.radio,
    step,
    items: pickRadioDetails(radios),
  });
  return (input) => pickRadio(input, step + 1, item);
}

export async function pickArtist(
  input: MultiStepInput,
  step: number,
  id: number
): Promise<InputStep> {
  const { info, songs } = await IPC.netease("artists", [id]);

  const { name, alias, briefDesc, albumSize, musicSize } = info;
  const pick = await input.showQuickPick({
    title: `${i18n.word.artist}-${i18n.word.detail}`,
    step,
    items: [
      {
        label: `${ICON.name} ${name}`,
        detail: alias.join("/"),
      },
      {
        label: `${ICON.description} ${i18n.word.description}`,
        detail: briefDesc,
        type: PickType.description,
      },
      {
        label: `${ICON.album} ${i18n.word.album}`,
        description: `${albumSize}`,
        id,
        type: PickType.albums,
      },
      {
        label: `${ICON.hot} ${i18n.word.hotSongs}`,
        description: `${songs.length}`,
        type: PickType.hot,
      },
      {
        label: `${ICON.number} ${i18n.word.trackCount}`,
        description: `${musicSize}`,
        id,
        type: PickType.songs,
      },
      {
        label: `${ICON.similar} ${i18n.word.similarArtists}`,
        type: PickType.similar,
      },
      {
        label: `${ICON.save} ${i18n.word.save}`,
        type: PickType.save,
      },
      {
        label: `${ICON.unsave} ${i18n.word.unsave}`,
        type: PickType.unsave,
      },
    ],
  });
  switch (pick.type) {
    case PickType.description:
      await Webview.description(id, name);
      break;
    case PickType.albums:
      return async (input) =>
        pickAlbums(
          input,
          step + 1,
          await IPC.netease("artistAlbum", [pick.id as number])
        );
    case PickType.hot:
      return (input) => pickSongs(input, step + 1, songs);
    case PickType.songs:
      return (input) => pickAllSongs(input, step + 1, id, 0);
    case PickType.similar:
      return async (input) =>
        pickArtists(input, step + 1, await IPC.netease("simiArtist", [id]));
    case PickType.unsave:
      if (
        await window.showWarningMessage(
          i18n.sentence.hint.confirmation,
          { modal: true },
          i18n.word.confirmation
        )
      )
        await IPC.netease("artistSub", [id, "unsub"]);
      break;
    case PickType.save:
      await IPC.netease("artistSub", [id, "sub"]);
  }

  return input.stay();

  async function pickAllSongs(
    input: MultiStepInput,
    step: number,
    id: number,
    offset: number
  ): Promise<InputStep> {
    const limit = 100;
    const songs = await IPC.netease("artistSongs", [id, limit, offset]);
    const pick = await input.showQuickPick({
      title: i18n.word.song,
      step,
      items: pickSongItems(songs),
      canSelectMany: true,
      previous: offset > 0,
      next: songs.length === limit,
    });
    if (pick === ButtonAction.previous)
      return input.stay((input) =>
        pickAllSongs(input, step, id, offset - limit)
      );
    if (pick === ButtonAction.next)
      return input.stay((input) =>
        pickAllSongs(input, step, id, offset + limit)
      );
    if (pick.length === 0) return input.stay();
    if (pick.length === 1)
      return (input) => pickSong(input, step + 1, pick[0].item);

    return (input) =>
      pickSongMany(
        input,
        step + 1,
        pick.map(({ item }) => item)
      );
  }
}

export async function pickArtists(
  input: MultiStepInput,
  step: number,
  artists: readonly NeteaseTypings.Artist[]
): Promise<InputStep> {
  const pick = await input.showQuickPick({
    title: i18n.word.artist,
    step,
    items: pickArtistItems(artists),
  });
  return (input) => pickArtist(input, step + 1, pick.id);
}

export async function pickAlbum(
  input: MultiStepInput,
  step: number,
  id: number
): Promise<InputStep> {
  const { info, songs } = await IPC.netease("album", [id]);

  const { artists, alias, company, description, name } = info;
  const pick = await input.showQuickPick({
    title: `${i18n.word.album}-${i18n.word.detail}`,
    step,
    items: [
      {
        label: `${ICON.name} ${name}`,
        description: alias.join("/"),
        detail: company,
      },
      {
        label: `${ICON.description} ${i18n.word.description}`,
        detail: description,
      },
      {
        label: `${ICON.song} ${i18n.word.content}`,
        type: PickType.songs,
      },
      {
        label: `${ICON.comment} ${i18n.word.comment}`,
        type: PickType.comment,
      },
      ...pickArtistItems(artists),
      {
        label: `${ICON.save} ${i18n.word.save}`,
        type: PickType.save,
      },
      {
        label: `${ICON.unsave} ${i18n.word.unsave}`,
        type: PickType.unsave,
      },
    ],
  });
  switch (pick.type) {
    case PickType.artist:
      return (input) => pickArtist(input, step + 1, (pick as T).id);
    case PickType.songs:
      return (input) => pickSongs(input, step + 1, songs);
    case PickType.unsave:
      if (
        await window.showWarningMessage(
          i18n.sentence.hint.confirmation,
          { modal: true },
          i18n.word.confirmation
        )
      )
        await IPC.netease("albumSub", [id, "unsub"]);
      break;
    case PickType.comment:
      Webview.comment(NeteaseEnum.CommentType.album, id, name);
      break;
    case PickType.save:
      await IPC.netease("albumSub", [id, "sub"]);
  }

  return input.stay();
}

export async function pickAlbums(
  input: MultiStepInput,
  step: number,
  albums: readonly NeteaseTypings.AlbumsItem[]
): Promise<InputStep> {
  const pick = await input.showQuickPick({
    title: i18n.word.album,
    step,
    items: pickAlbumItems(albums),
  });
  return (input) => pickAlbum(input, step + 1, pick.id);
}

export async function pickPlaylist(
  input: MultiStepInput,
  step: number,
  item: NeteaseTypings.PlaylistItem
): Promise<InputStep> {
  const {
    id,
    name,
    description,
    playCount,
    subscribedCount,
    trackCount,
    creator,
  } = item;
  const pick = await input.showQuickPick({
    title: i18n.word.playlist,
    step,
    items: [
      {
        label: `${ICON.name} ${name}`,
      },
      {
        label: `${ICON.description} ${i18n.word.description}`,
        detail: description || "",
      },
      {
        label: `${ICON.copy} ${i18n.word.copyLink}`,
        type: PickType.copy,
      },
      {
        label: `${ICON.comment} ${i18n.word.comment}`,
        type: PickType.comment,
      },
      ...(playCount
        ? [
            {
              label: `${ICON.number} ${i18n.word.playCount}`,
              description: `${playCount}`,
            },
          ]
        : []),
      ...(subscribedCount
        ? [
            {
              label: `${ICON.number} ${i18n.word.subscribedCount}`,
              description: `${subscribedCount}`,
              type: PickType.subscribed,
            },
          ]
        : []),
      ...(trackCount
        ? [
            {
              label: `${ICON.number} ${i18n.word.trackCount}`,
              description: `${trackCount}`,
              type: PickType.songs,
            },
          ]
        : []),
      ...pickUserDetails([creator]),
      {
        label: `${ICON.add} ${i18n.word.addToQueue}`,
        type: PickType.add,
      },
      {
        label: `${ICON.play} ${i18n.word.nextTrack}`,
        type: PickType.next,
      },
      {
        label: `${ICON.save} ${i18n.word.save}`,
        type: PickType.save,
      },
    ],
  });
  switch (pick.type) {
    case PickType.copy:
      void commands.executeCommand("cloudmusic.copyPlaylistLink", {
        item,
      } as PlaylistItemTreeItem);
      break;
    case PickType.songs:
      return async (input) =>
        pickSongs(input, step + 1, await IPC.netease("playlistDetail", [id]));
    case PickType.subscribed:
      return (input) =>
        pickUsers(
          input,
          step + 1,
          (id, limit, offset) =>
            IPC.netease("playlistSubscribers", [id, limit, offset]),
          0,
          id
        );
    case PickType.user:
      return (input) => pickUser(input, step + 1, (pick as T).id);
    case PickType.add:
      {
        const songs = await IPC.netease("playlistDetail", [id]);
        IPC.add(
          songs.map((song) => QueueItemTreeItem.new({ ...song, pid: id }).data)
        );
      }
      break;
    case PickType.next:
      {
        const songs = await IPC.netease("playlistDetail", [id]);
        IPC.add(
          songs.map((song) => QueueItemTreeItem.new({ ...song, pid: id }).data),
          1
        );
      }
      break;
    case PickType.comment:
      Webview.comment(NeteaseEnum.CommentType.playlist, id, name);
      break;
    case PickType.save:
      await IPC.netease("playlistSubscribe", [id, "subscribe"]);
  }
  return input.stay();
}

async function pickSimiPlaylists(
  input: MultiStepInput,
  step: number,
  id: number,
  offset: number
): Promise<InputStep> {
  const limit = 50;
  const playlists = await IPC.netease("simiPlaylist", [id, limit, offset]);
  const pick = await input.showQuickPick({
    title: i18n.word.similarPlaylists,
    step,
    items: pickPlaylistItems(playlists),
    previous: offset > 0,
    next: playlists.length === limit,
  });
  if (pick === ButtonAction.previous)
    return input.stay((input) =>
      pickSimiPlaylists(input, step, id, offset - limit)
    );
  if (pick === ButtonAction.next)
    return input.stay((input) =>
      pickSimiPlaylists(input, step, id, offset + limit)
    );
  return (input) => pickPlaylist(input, step + 1, pick.item);
}

export async function pickPlaylists(
  input: MultiStepInput,
  step: number,
  items: readonly NeteaseTypings.PlaylistItem[]
): Promise<InputStep> {
  const pick = await input.showQuickPick({
    title: i18n.word.playlist,
    step,
    items: pickPlaylistItems(items),
  });
  return (input) => pickPlaylist(input, step + 1, pick.item);
}

export async function pickAddToPlaylist(
  input: MultiStepInput,
  step: number,
  id: number
): Promise<InputStep | void> {
  const lists = AccountManager.userPlaylist;
  const pick = await input.showQuickPick({
    title: i18n.word.saveToPlaylist,
    step,
    items: lists.map(({ name, id }) => ({
      label: `${ICON.playlist} ${name}`,
      id,
    })),
  });
  if (await IPC.netease("playlistTracks", ["add", pick.id, [id]]))
    PlaylistProvider.refresh(PlaylistProvider.playlists.get(pick.id));
  else void window.showErrorMessage(i18n.sentence.fail.addToPlaylist);
  return input.stay();
}

export async function pickUser(
  input: MultiStepInput,
  step: number,
  uid: number
): Promise<InputStep> {
  const user = await IPC.netease("userDetail", [uid]);
  if (!user) {
    return input.stay();
  }
  const playlists = await IPC.netease("userPlaylist", [uid]);
  const pick = await input.showQuickPick({
    title: i18n.word.user,
    step,
    items: [
      {
        label: `${ICON.artist} ${user.nickname}`,
        detail: user.signature,
        item: 0,
      },
      {
        label: `${ICON.number} ${i18n.word.followeds}`,
        description: `${user.followeds}`,
        type: PickType.followeds,
        item: 0,
      },
      {
        label: `${ICON.number} ${i18n.word.follows}`,
        description: `${user.follows}`,
        type: PickType.follows,
        item: 0,
      },
      {
        label: `>>>>    ${i18n.word.playlist}`,
        item: 0,
      },
      ...pickPlaylistItems(
        playlists.filter((playlist) => playlist.creator.userId === uid)
      ),
      {
        label: `>>>>    ${i18n.word.saved}`,
        item: 0,
      },
      ...pickPlaylistItems(
        playlists.filter((playlist) => playlist.creator.userId !== uid)
      ),
    ],
  });
  switch (pick.type) {
    case PickType.followeds:
      return (input) =>
        pickUsers(
          input,
          step + 1,
          (uid, limit, offset) =>
            IPC.netease("userFolloweds", [uid, limit, offset]),
          0,
          uid
        );
    case PickType.follows:
      return (input) =>
        pickUsers(
          input,
          step + 1,
          (uid, limit, offset) =>
            IPC.netease("userFollows", [uid, limit, offset]),
          0,
          uid
        );
    case PickType.playlist:
      return (input) =>
        pickPlaylist(input, step + 1, pick.item as NeteaseTypings.PlaylistItem);
  }
  return input.stay();
}

const limit = 50;

export async function pickUsers(
  input: MultiStepInput,
  step: number,
  func: (...args: number[]) => Promise<readonly NeteaseTypings.UserDetail[]>,
  offset: number,
  id: number
): Promise<InputStep> {
  const users = await func(id, limit, offset);
  const pick = await input.showQuickPick({
    title: i18n.word.user,
    step,
    items: pickUserDetails(users),
    previous: offset > 0,
    next: users.length === limit,
  });
  if (pick === ButtonAction.previous)
    return input.stay((input) =>
      pickUsers(input, step, func, offset - limit, id)
    );
  if (pick === ButtonAction.next)
    return input.stay((input) =>
      pickUsers(input, step, func, offset + limit, id)
    );
  return (input) => pickUser(input, step + 1, pick.id);
}
