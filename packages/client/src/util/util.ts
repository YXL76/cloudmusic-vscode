import { AccountManager, ButtonManager } from "../manager";
import type {
  AlbumsItem,
  Artist,
  PlaylistItem,
  ProgramDetail,
  RadioDetail,
  SongsItem,
  UserDetail,
} from "../constant";
import {
  ButtonAction,
  IPCClient,
  LikeState,
  MusicCache,
  State,
  setLyric,
} from ".";
import {
  CommentType,
  apiAlbum,
  apiAlbumSub,
  apiArtistAlbum,
  apiArtistSongs,
  apiArtistSub,
  apiArtists,
  apiDjDetail,
  apiDjProgram,
  apiDjSubscriber,
  apiLike,
  apiPlaylistDetail,
  apiPlaylistSubscribe,
  apiPlaylistSubscribers,
  apiPlaylistTracks,
  apiSimiArtist,
  apiSimiPlaylist,
  apiSimiSong,
  apiUserDetail,
  apiUserFolloweds,
  apiUserFollows,
  apiUserPlaylist,
} from "../api";
import type { InputStep, MultiStepInput } from ".";
import {
  PlaylistProvider,
  ProgramTreeItem,
  QueueItemTreeItem,
} from "../treeview";
import type { QuickPickItem, Uri } from "vscode";
import { commands, window } from "vscode";
import { ICON } from "../constant";
import type { Readable } from "stream";
import { Webview } from "../webview";
import axios from "axios";
import i18n from "../i18n";

export async function downloadMusic(
  url: string,
  filename: string,
  path: Uri,
  cache: boolean,
  md5?: string
): Promise<Readable | void> {
  try {
    const { data } = await axios.get<Readable>(url, {
      responseType: "stream",
      timeout: 8000,
    });

    if (cache) data.on("end", () => void MusicCache.put(filename, path, md5));

    return data;
  } catch (err) {
    console.error(err);
    void window.showErrorMessage(i18n.sentence.error.network);
  }
  return;
}

export async function likeMusic(id: number, like: boolean): Promise<void> {
  /* if (await apiLike(id, like)) {
    if (id === Player.item?.valueOf)
      State.like = like ? LikeState.like : LikeState.dislike;
    like ? AccountManager.likelist.add(id) : AccountManager.likelist.delete(id);
    void window.showInformationMessage(
      like ? i18n.word.like : i18n.word.dislike
    );
  } else void window.showErrorMessage(i18n.sentence.fail.addToPlaylist); */
}

export function stop(): void {
  IPCClient.stop();
  ButtonManager.buttonSong();
  ButtonManager.buttonLyric();
  setLyric(0, [0], { text: [i18n.word.lyric] }, { text: [i18n.word.lyric] });
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
  item: SongsItem;
}

export const pickSongItems = (songs: SongsItem[]): ST[] =>
  songs.map((item) => ({
    label: `${ICON.song} ${item.name}`,
    description: item.ar.map((i) => i.name).join("/"),
    detail: item.alia.join("/"),
    id: item.id,
    item,
    type: PickType.song,
  }));

export const pickArtistItems = (ars: { id: number; name: string }[]): T[] =>
  ars.map(({ name, id }) => ({
    label: `${ICON.artist} ${name}`,
    id,
    type: PickType.artist,
  }));

export const pickAlbumItems = (albums: AlbumsItem[]): T[] =>
  albums.map(({ name, alias, artists, id }) => ({
    label: `${ICON.album} ${name}`,
    description: alias.join("/"),
    detail: artists.map((artist) => artist.name).join("/"),
    id,
    type: PickType.album,
  }));

interface PT extends T {
  item: PlaylistItem;
}

export const pickPlaylistItems = (playlists: PlaylistItem[]): PT[] =>
  playlists.map((playlist) => ({
    label: `${ICON.playlist} ${playlist.name}`,
    description: `${playlist.trackCount}`,
    detail: playlist.description || "",
    id: playlist.id,
    item: playlist,
    type: PickType.playlist,
  }));

export const pickUserDetails = (users: UserDetail[]): T[] =>
  users.map(({ nickname, signature, userId }) => ({
    label: `${ICON.artist} ${nickname}`,
    detail: signature,
    id: userId,
    type: PickType.user,
  }));

interface RDT extends T {
  item: RadioDetail;
}

export const pickRadioDetails = (radios: RadioDetail[]): RDT[] =>
  radios.map((item) => ({
    label: `${ICON.radio} ${item.name}`,
    description: item.dj.nickname,
    id: item.id,
    item,
    type: PickType.radio,
  }));

interface PDT extends T {
  item: ProgramDetail;
}

export const pickProgramDetails = (programs: ProgramDetail[]): PDT[] =>
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
  item: SongsItem
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
      void commands.executeCommand("cloudmusic.copySongLink", { item });
      break;
    case PickType.download:
      void commands.executeCommand("cloudmusic.downloadSong", { item });
      break;
    case PickType.album:
      return (input: MultiStepInput) =>
        pickAlbum(input, step + 1, (pick as T).id);
    case PickType.artist:
      return (input: MultiStepInput) =>
        pickArtist(input, step + 1, (pick as T).id);
    case PickType.save:
      return (input: MultiStepInput) => pickAddToPlaylist(input, step + 1, id);
    case PickType.similar:
      if (pick.label === `${ICON.similar} ${i18n.word.similarSongs}`) {
        return (input: MultiStepInput) => pickSimiSong(input, step + 1, id, 0);
      }
      return (input: MultiStepInput) =>
        pickSimiPlaylists(input, step + 1, id, 0);
    case PickType.comment:
      await Webview.comment(CommentType.song, id, name);
      break;
    case PickType.like:
      await likeMusic(id, true);
      break;
    case PickType.add:
      void commands.executeCommand(
        "cloudmusic.addSong",
        QueueItemTreeItem.new({ ...item, pid: 0 })
      );
      break;
    case PickType.next:
      IPCClient.add([QueueItemTreeItem.new({ ...item, pid: 0 }).data], 1);
      break;
  }

  return input.stay();
}

export async function pickSongMany(
  input: MultiStepInput,
  step: number,
  songs: SongsItem[]
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
  IPCClient.add(
    songs.map((song) => QueueItemTreeItem.new({ ...song, pid: 0 }).data),
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
  const songs = await apiSimiSong(id, limit, offset);
  const pick = await input.showQuickPick({
    title: i18n.word.similarSongs,
    step,
    items: pickSongItems(songs),
    canSelectMany: true,
    previous: offset > 0,
    next: songs.length === limit,
  });
  if (pick === ButtonAction.previous)
    return input.stay((input: MultiStepInput) =>
      pickSimiSong(input, step, id, offset - limit)
    );
  if (pick === ButtonAction.next)
    return input.stay((input: MultiStepInput) =>
      pickSimiSong(input, step, id, offset + limit)
    );
  if (pick.length === 0) return input.stay();
  if (pick.length === 1)
    return (input: MultiStepInput) => pickSong(input, step + 1, pick[0].item);

  return (input: MultiStepInput) =>
    pickSongMany(
      input,
      step + 1,
      pick.map(({ item }) => item)
    );
}

export async function pickSongs(
  input: MultiStepInput,
  step: number,
  songs: SongsItem[]
): Promise<InputStep> {
  const pick = await input.showQuickPick({
    title: i18n.word.song,
    step,
    items: pickSongItems(songs),
    canSelectMany: true,
  });
  if (pick.length === 0) return input.stay();
  if (pick.length === 1)
    return (input: MultiStepInput) => pickSong(input, step + 1, pick[0].item);

  return (input: MultiStepInput) =>
    pickSongMany(
      input,
      step + 1,
      pick.map(({ item }) => item)
    );
}

export async function pickProgram(
  input: MultiStepInput,
  step: number,
  program: ProgramDetail
): Promise<InputStep> {
  const { mainSong, dj, id, rid } = program;
  const { name } = mainSong;
  const radio = await apiDjDetail(rid);

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
      void commands.executeCommand("cloudmusic.copyProgramLink", { id });
      break;
    case PickType.download:
      void commands.executeCommand("cloudmusic.downloadSong", {
        item: mainSong,
      });
      break;
    case PickType.user:
      return (input: MultiStepInput) =>
        pickUser(input, step + 1, (pick as T).id);
    case PickType.radio:
      return (input: MultiStepInput) =>
        pickRadio(input, step + 1, radio as RadioDetail);
    case PickType.comment:
      await Webview.comment(CommentType.dj, id, name);
      break;
    case PickType.add:
      void commands.executeCommand(
        "cloudmusic.addProgram",
        ProgramTreeItem.new({ ...program, pid: radio ? radio.id : 0 })
      );
      break;
    case PickType.next:
      IPCClient.add([ProgramTreeItem.new({ ...program, pid: 0 }).data], 1);
      break;
  }

  return input.stay();
}

export async function pickProgramMany(
  input: MultiStepInput,
  step: number,
  programs: ProgramDetail[]
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
  IPCClient.add(
    programs.map((program) => ProgramTreeItem.new({ ...program, pid: 0 }).data),
    pick.type === PickType.add ? undefined : 1
  );
  return input.stay();
}

export async function pickPrograms(
  input: MultiStepInput,
  step: number,
  programs: ProgramDetail[]
): Promise<InputStep> {
  const pick = await input.showQuickPick({
    title: i18n.word.program,
    step,
    items: pickProgramDetails(programs),
    canSelectMany: true,
  });
  if (pick.length === 0) return input.stay();
  if (pick.length === 1)
    return (input: MultiStepInput) =>
      pickProgram(input, step + 1, pick[0].item);

  return (input: MultiStepInput) =>
    pickProgramMany(
      input,
      step + 1,
      pick.map(({ item }) => item)
    );
}

export async function pickRadio(
  input: MultiStepInput,
  step: number,
  item: RadioDetail
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
      void commands.executeCommand("cloudmusic.copyRadioLink", { id });
      break;
    case PickType.user:
      return (input: MultiStepInput) =>
        pickUser(input, step + 1, (pick as T).id);
    case PickType.subscribed:
      return async (input: MultiStepInput) =>
        pickUsers(input, step + 1, apiDjSubscriber, -1, id);
    case PickType.programs:
      return async (input: MultiStepInput) =>
        pickPrograms(input, step + 1, await apiDjProgram(id, programCount));
  }

  return input.stay();
}

export async function pickRadios(
  input: MultiStepInput,
  step: number,
  radios: RadioDetail[]
): Promise<InputStep> {
  const { item } = await input.showQuickPick({
    title: i18n.word.radio,
    step,
    items: pickRadioDetails(radios),
  });
  return (input: MultiStepInput) => pickRadio(input, step + 1, item);
}

export async function pickArtist(
  input: MultiStepInput,
  step: number,
  id: number
): Promise<InputStep> {
  const { info, songs } = await apiArtists(id);

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
      return async (input: MultiStepInput) =>
        pickAlbums(input, step + 1, await apiArtistAlbum(pick.id as number));
    case PickType.hot:
      return (input: MultiStepInput) => pickSongs(input, step + 1, songs);
    case PickType.songs:
      return (input: MultiStepInput) => pickAllSongs(input, step + 1, id, 0);
    case PickType.similar:
      return async (input: MultiStepInput) =>
        pickArtists(input, step + 1, await apiSimiArtist(id));
    case PickType.unsave:
      if (
        await window.showWarningMessage(
          i18n.sentence.hint.confirmation,
          { modal: true },
          i18n.word.confirmation
        )
      )
        await apiArtistSub(id, "unsub");
      break;
    case PickType.save:
      await apiArtistSub(id, "sub");
  }

  return input.stay();

  async function pickAllSongs(
    input: MultiStepInput,
    step: number,
    id: number,
    offset: number
  ): Promise<InputStep> {
    const limit = 100;
    const songs = await apiArtistSongs(id, limit, offset);
    const pick = await input.showQuickPick({
      title: i18n.word.song,
      step,
      items: pickSongItems(songs),
      canSelectMany: true,
      previous: offset > 0,
      next: songs.length === limit,
    });
    if (pick === ButtonAction.previous)
      return input.stay((input: MultiStepInput) =>
        pickAllSongs(input, step, id, offset - limit)
      );
    if (pick === ButtonAction.next)
      return input.stay((input: MultiStepInput) =>
        pickAllSongs(input, step, id, offset + limit)
      );
    if (pick.length === 0) return input.stay();
    if (pick.length === 1)
      return (input: MultiStepInput) => pickSong(input, step + 1, pick[0].item);

    return (input: MultiStepInput) =>
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
  artists: Artist[]
): Promise<InputStep> {
  const pick = await input.showQuickPick({
    title: i18n.word.artist,
    step,
    items: pickArtistItems(artists),
  });
  return (input: MultiStepInput) => pickArtist(input, step + 1, pick.id);
}

export async function pickAlbum(
  input: MultiStepInput,
  step: number,
  id: number
): Promise<InputStep> {
  const { info, songs } = await apiAlbum(id);

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
      return (input: MultiStepInput) =>
        pickArtist(input, step + 1, (pick as T).id);
    case PickType.songs:
      return (input: MultiStepInput) => pickSongs(input, step + 1, songs);
    case PickType.unsave:
      if (
        await window.showWarningMessage(
          i18n.sentence.hint.confirmation,
          { modal: true },
          i18n.word.confirmation
        )
      )
        await apiAlbumSub(id, "unsub");
      break;
    case PickType.comment:
      await Webview.comment(CommentType.album, id, name);
      break;
    case PickType.save:
      await apiAlbumSub(id, "sub");
  }

  return input.stay();
}

export async function pickAlbums(
  input: MultiStepInput,
  step: number,
  albums: AlbumsItem[]
): Promise<InputStep> {
  const pick = await input.showQuickPick({
    title: i18n.word.album,
    step,
    items: pickAlbumItems(albums),
  });
  return (input: MultiStepInput) => pickAlbum(input, step + 1, pick.id);
}

export async function pickPlaylist(
  input: MultiStepInput,
  step: number,
  item: PlaylistItem
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
      void commands.executeCommand("cloudmusic.copyPlaylistLink", { item });
      break;
    case PickType.songs:
      return async (input: MultiStepInput) =>
        pickSongs(input, step + 1, await apiPlaylistDetail(id));
    case PickType.subscribed:
      return (input: MultiStepInput) =>
        pickUsers(input, step + 1, apiPlaylistSubscribers, 0, id);
    case PickType.user:
      return (input: MultiStepInput) =>
        pickUser(input, step + 1, (pick as T).id);
    case PickType.add:
      {
        const songs = await apiPlaylistDetail(id);
        IPCClient.add(
          songs.map((song) => QueueItemTreeItem.new({ ...song, pid: 0 }).data)
        );
      }
      break;
    case PickType.next:
      {
        const songs = await apiPlaylistDetail(id);
        IPCClient.add(
          songs.map((song) => QueueItemTreeItem.new({ ...song, pid: 0 }).data),
          1
        );
      }
      break;
    case PickType.comment:
      await Webview.comment(CommentType.playlist, id, name);
      break;
    case PickType.save:
      await apiPlaylistSubscribe(id, "subscribe");
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
  const playlists = await apiSimiPlaylist(id, limit, offset);
  const pick = await input.showQuickPick({
    title: i18n.word.similarPlaylists,
    step,
    items: pickPlaylistItems(playlists),
    previous: offset > 0,
    next: playlists.length === limit,
  });
  if (pick === ButtonAction.previous)
    return input.stay((input: MultiStepInput) =>
      pickSimiPlaylists(input, step, id, offset - limit)
    );
  if (pick === ButtonAction.next)
    return input.stay((input: MultiStepInput) =>
      pickSimiPlaylists(input, step, id, offset + limit)
    );
  return (input: MultiStepInput) => pickPlaylist(input, step + 1, pick.item);
}

export async function pickPlaylists(
  input: MultiStepInput,
  step: number,
  items: PlaylistItem[]
): Promise<InputStep> {
  const pick = await input.showQuickPick({
    title: i18n.word.playlist,
    step,
    items: pickPlaylistItems(items),
  });
  return (input: MultiStepInput) => pickPlaylist(input, step + 1, pick.item);
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
  if (await apiPlaylistTracks("add", pick.id, [id]))
    PlaylistProvider.refresh(PlaylistProvider.playlists.get(pick.id));
  else void window.showErrorMessage(i18n.sentence.fail.addToPlaylist);
  return input.stay();
}

export async function pickUser(
  input: MultiStepInput,
  step: number,
  uid: number
): Promise<InputStep> {
  const user = await apiUserDetail(uid);
  if (!user) {
    return input.stay();
  }
  const playlists = await apiUserPlaylist(uid);
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
      return (input: MultiStepInput) =>
        pickUsers(input, step + 1, apiUserFolloweds, 0, uid);
    case PickType.follows:
      return (input: MultiStepInput) =>
        pickUsers(input, step + 1, apiUserFollows, 0, uid);
    case PickType.playlist:
      return (input: MultiStepInput) =>
        pickPlaylist(input, step + 1, pick.item as PlaylistItem);
  }
  return input.stay();
}

const limit = 50;

export async function pickUsers(
  input: MultiStepInput,
  step: number,
  func: (...args: number[]) => Promise<UserDetail[]>,
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
    return input.stay((input: MultiStepInput) =>
      pickUsers(input, step, func, offset - limit, id)
    );
  if (pick === ButtonAction.next)
    return input.stay((input: MultiStepInput) =>
      pickUsers(input, step, func, offset + limit, id)
    );
  return (input: MultiStepInput) => pickUser(input, step + 1, pick.id);
}
