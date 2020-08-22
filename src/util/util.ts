import { AccountManager, ButtonManager } from "../manager";
import {
  AlbumsItem,
  AnotherSongItem,
  Artist,
  ICON,
  NATIVE,
  PlaylistItem,
  SongsItem,
  TMP_DIR,
} from "../constant";
import {
  InputStep,
  LocalCache,
  MultiStepInput,
  MusicCache,
  apiAlbum,
  apiArtistAlbum,
  apiArtists,
  apiLike,
  apiPlaylistDetail,
  apiPlaylistTracks,
  apiSimiSong,
  apiSongDetail,
  apiSongUrl,
  player,
} from "../util";
import { IsLike, PersonalFm, lock } from "../state";
import { PlaylistProvider, QueueItemTreeItem } from "../provider";
import {
  QuickPickItem,
  TreeItemCollapsibleState,
  Uri,
  commands,
  window,
  workspace,
} from "vscode";
import { i18n } from "../i18n";

const { download } = NATIVE;

export function downloadMusic(
  url: string,
  filename: string,
  path: string,
  md5: string
): void {
  try {
    download(url, path, (_, res) => {
      if (res) {
        if (!PersonalFm.get()) {
          MusicCache.put(filename, path, md5);
        }
      } else {
        window.showErrorMessage(i18n.sentence.error.network);
      }
    });
  } catch {}
}

export async function songsItem2TreeItem(
  id: number,
  ids: number[],
  songs: SongsItem[]
): Promise<QueueItemTreeItem[]> {
  const ret: QueueItemTreeItem[] = [];
  const items = await apiSongUrl(ids);
  for (let i = 0; i < items.length; ++i) {
    const song = songs[i];
    const { url, md5 } = items[i];
    if (url) {
      ret.push(
        new QueueItemTreeItem(
          `${song.name}${song.alia[0] ? ` (${song.alia[0]})` : ""}`,
          song,
          id,
          `md5-${Buffer.from(md5, "hex").toString("base64")}`,
          TreeItemCollapsibleState.None
        )
      );
    }
  }
  return ret;
}

export function solveArtist(item: Artist): Artist {
  const { name, id, alias, briefDesc, albumSize } = item;
  return { name, id, alias, briefDesc, albumSize };
}

export function solveAlbumsItem(item: AlbumsItem): AlbumsItem {
  const { artists, alias, company, description, name, id } = item;
  return {
    artists: artists.map((artist: Artist) => ({
      name: artist.name,
      id: artist.id,
      alias: artist.alias,
      briefDesc: artist.briefDesc,
      albumSize: artist.albumSize,
    })),
    alias,
    company,
    description,
    name,
    id,
  };
}

export function solveSongItem(item: SongsItem): SongsItem {
  const { name, id, dt, alia, ar, al } = item;
  return { name, id, dt: dt / 1000, alia, ar, al };
}

export function solveAnotherSongItem(item: AnotherSongItem): SongsItem {
  const { name, id, duration, alias, artists, album } = item;
  return {
    name,
    id,
    dt: duration / 1000,
    alia: alias,
    ar: artists.map(({ id, name }) => ({ id, name })),
    al: { id: album.id, name: album.name },
  };
}

export function stop(): void {
  player.item = { id: 0 } as SongsItem;
  player.stop();
  ButtonManager.buttonSong();
  ButtonManager.buttonLyric();
}

export async function load(element: QueueItemTreeItem): Promise<void> {
  lock.playerLoad.set(true);
  const { pid, md5, item } = element;
  const { id } = item;
  const idString = `${id}`;
  const path = LocalCache.get(md5) || (await MusicCache.get(idString));

  if (path) {
    player.load(path, pid, item);
  } else {
    const { url } = (await apiSongUrl([id]))[0];
    if (!url) {
      lock.playerLoad.set(false);
      commands.executeCommand("cloudmusic.next");
      return;
    }

    const tmpFileUri = Uri.joinPath(TMP_DIR, idString);
    try {
      (await workspace.fs.stat(tmpFileUri)).size;
      player.load(tmpFileUri.fsPath, pid, item);
    } catch {
      downloadMusic(url, idString, tmpFileUri.fsPath, md5);
      let count = 0;
      const timer = setInterval(async () => {
        if ((await workspace.fs.stat(tmpFileUri)).size > 256) {
          clearInterval(timer);
          player.load(tmpFileUri.fsPath, pid, item);
        } else if (++count > 12) {
          clearInterval(timer);
          lock.playerLoad.set(false);
          commands.executeCommand("cloudmusic.next");
        }
      }, 100);
    }
  }
}

export function splitLine(content: string): string {
  return `>>>>>>>>>>>>>>                                ${content.toUpperCase()}                                <<<<<<<<<<<<<<`;
}

enum PickType {
  artist,
  album,
  albums,
  like,
  save,
  similar,
  song,
  playlist,
}
interface T extends QuickPickItem {
  id?: number;
  type?: PickType;
}
interface ST extends T {
  id: number;
  type: PickType;
}

export const pickSongItems = (songs: SongsItem[]): ST[] =>
  songs.map(({ name, ar, alia, id }) => ({
    label: `${ICON.song} ${name}`,
    description: ar.map((i) => i.name).join("/"),
    detail: alia.join("/"),
    id,
    type: PickType.song,
  }));

export const pickArtistItems = (ars: { id: number; name: string }[]): ST[] =>
  ars.map(({ name, id }) => ({
    label: `${ICON.artist} ${i18n.word.artist}`,
    detail: name,
    id,
    type: PickType.artist,
  }));

export const pickAlbumItems = (albums: AlbumsItem[]): ST[] =>
  albums.map(({ name, alias, artists, id }) => ({
    label: `${ICON.album} ${name}`,
    description: alias.join("/"),
    detail: artists.map((artist) => artist.name).join("/"),
    id,
    type: PickType.album,
  }));

interface PST extends T {
  item: PlaylistItem;
}

export const pickPlaylistItems = (playlists: PlaylistItem[]): PST[] =>
  playlists.map((playlist) => ({
    label: `${ICON.playlist} ${playlist.name}`,
    description: `${playlist.trackCount}`,
    detail: playlist.description || "",
    id: playlist.id,
    item: playlist,
    type: PickType.playlist,
  }));

export async function pickSong(
  input: MultiStepInput,
  step: number,
  id: number
): Promise<InputStep> {
  const { name, alia, ar, al } = (await apiSongDetail([id]))[0];

  const pick = await input.showQuickPick<T>({
    title: `${i18n.word.song}-${i18n.word.detail}`,
    step,
    items: [
      {
        label: `${ICON.name} ${name}`,
        detail: alia.join("/"),
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
        label: `${ICON.save} ${i18n.word.saveToPlaylist}`,
        type: PickType.save,
      },
      {
        label: `${ICON.similar} ${i18n.word.similarSongs}`,
        type: PickType.similar,
      },
    ],
  });
  if (pick.type === PickType.album) {
    return (input: MultiStepInput) =>
      pickAlbum(input, step + 1, pick.id as number);
  }
  if (pick.type === PickType.artist) {
    return (input: MultiStepInput) =>
      pickArtist(input, step + 1, pick.id as number);
  }
  if (pick.type === PickType.like) {
    if (await apiLike(id)) {
      AccountManager.likelist.add(id);
      if (id === player.item.id) {
        IsLike.set(true);
      }
    }
  }
  if (pick.type === PickType.save) {
    return (input: MultiStepInput) => pickAddToPlaylist(input, step + 1, id);
  }
  if (pick.type === PickType.similar) {
    const songs = await apiSimiSong(id);
    return (input: MultiStepInput) =>
      pickSongs(input, step + 1, undefined, songs);
  }
  input.pop();
  return (input: MultiStepInput) => pickSong(input, step, id);
}

export async function pickSongs(
  input: MultiStepInput,
  step: number,
  ids?: number[],
  songs?: SongsItem[]
): Promise<InputStep> {
  if (!songs) {
    songs = await apiSongDetail(ids || [0]);
  }
  const pick = await input.showQuickPick({
    title: i18n.word.song,
    step,
    items: pickSongItems(songs),
  });
  input.pop();
  return (input: MultiStepInput) => pickSong(input, step + 1, pick.id);
}

export async function pickArtist(
  input: MultiStepInput,
  step: number,
  id: number
): Promise<InputStep> {
  const { info, songs } = await apiArtists(id);

  const { name, alias, briefDesc, albumSize } = info;
  const pick = await input.showQuickPick<T>({
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
      },
      {
        label: `${ICON.album} ${i18n.word.album}`,
        detail: `${albumSize}`,
        id,
        type: PickType.albums,
      },
      {
        label: splitLine(i18n.word.hotSongs),
      },
      ...pickSongItems(songs),
    ],
  });
  if (pick.type === PickType.albums) {
    return (input: MultiStepInput) =>
      pickAlbums(input, step + 1, pick.id as number);
  } else if (pick.type === PickType.song) {
    return (input: MultiStepInput) =>
      pickSong(input, step + 1, pick.id as number);
  }
  input.pop();
  return (input: MultiStepInput) => pickArtist(input, step, id);
}

export async function pickAlbum(
  input: MultiStepInput,
  step: number,
  id: number
): Promise<InputStep> {
  const { info, songs } = await apiAlbum(id);

  const { artists, alias, company, description, name } = info;
  const pick = await input.showQuickPick<T>({
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
      ...pickArtistItems(artists),
      {
        label: splitLine(i18n.word.content),
      },
      ...pickSongItems(songs),
    ],
  });
  if (pick.type === PickType.artist) {
    return (input: MultiStepInput) =>
      pickArtist(input, step + 1, pick.id as number);
  } else if (pick.type === PickType.song) {
    return (input: MultiStepInput) =>
      pickSong(input, step + 1, pick.id as number);
  }
  input.pop();
  return (input: MultiStepInput) => pickAlbum(input, step, id);
}

export async function pickAlbums(
  input: MultiStepInput,
  step: number,
  id: number
): Promise<InputStep> {
  const albums = await apiArtistAlbum(id);
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
  } = item;
  const ids = await apiPlaylistDetail(id);
  const songs = await apiSongDetail(ids);
  const pick = await input.showQuickPick<T>({
    title: i18n.word.song,
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
        label: `${ICON.number} ${i18n.word.playCount}`,
        description: `${playCount}`,
      },
      {
        label: `${ICON.number} ${i18n.word.subscribedCount}`,
        description: `${subscribedCount}`,
      },
      {
        label: `${ICON.number} ${i18n.word.trackCount}`,
        description: `${trackCount}`,
      },
      {
        label: splitLine(i18n.word.content),
      },
      ...pickSongItems(songs),
    ],
  });
  if (pick.type === PickType.song) {
    return (input: MultiStepInput) =>
      pickSong(input, step + 1, pick.id as number);
  }
  input.pop();
  return (input: MultiStepInput) => pickPlaylist(input, step, item);
}

export async function pickAddToPlaylist(
  input: MultiStepInput,
  step: number,
  id: number
): Promise<InputStep> {
  const lists = await AccountManager.userPlaylist();
  const pick = await input.showQuickPick({
    title: i18n.word.saveToPlaylist,
    step,
    items: lists.map(({ name, id }) => ({
      label: `${ICON.playlist} ${name}`,
      id,
    })),
  });
  if (await apiPlaylistTracks("add", pick.id, [id])) {
    PlaylistProvider.refresh();
  }
  input.pop();
  return (input: MultiStepInput) => pickAddToPlaylist(input, step, id);
}
