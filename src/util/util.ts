import * as nls from "vscode-nls";
import { AlbumsItem, AnotherSongItem, Artist, SongsItem } from "../constant";
import { InputStep, MultiStepInput, MusicCache } from "../util";
import { NATIVE, TMP_DIR } from "../constant";
import { QuickPickItem, commands, window } from "vscode";
import {
  apiAlbum,
  apiArtistAlbum,
  apiArtists,
  apiLike,
  apiSimiSong,
  apiSongDetail,
  apiSongUrl,
} from "./api";
import { existsSync, statSync } from "fs";
import { AccountManager } from "../manager";
import { ButtonManager } from "../manager";
import { IsLike } from "../state";
import { PersonalFm } from "../state";
import { QueueItemTreeItem } from "../provider";
import { TreeItemCollapsibleState } from "vscode";
import { join } from "path";
import { lock } from "../state";
import { player } from "./player";

const { download } = NATIVE;

nls.config({
  messageFormat: nls.MessageFormat.bundle,
  bundleFormat: nls.BundleFormat.standalone,
})();

const localize = nls.loadMessageBundle();

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
        window.showErrorMessage(localize("error.network", "Network Error"));
      }
    });
  } catch {}
}

export async function lockQueue(callback: () => Promise<void>): Promise<void> {
  if (!lock.queue) {
    lock.queue = true;
    await callback();
    lock.queue = false;
  }
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
  player.id = 0;
  player.stop();
  ButtonManager.buttonSong(localize("song", "Song"), "");
  ButtonManager.buttonLyric(localize("lyric", "Lyric"));
}

export async function load(element: QueueItemTreeItem): Promise<void> {
  lock.playerLoad.set(true);
  const { pid, md5 } = element;
  const { id, dt, name, ar } = element.item;
  const idString = `${id}`;
  const path = await MusicCache.get(idString);

  const playerLoad = async (p: string) => {
    await player.load(p, id, pid, dt);
    ButtonManager.buttonSong(name, ar.map((i) => i.name).join("/"));
    IsLike.set(AccountManager.likelist.has(id));
  };

  if (path) {
    playerLoad(path);
  } else {
    const { url } = (await apiSongUrl([id]))[0];
    if (!url) {
      lock.playerLoad.set(false);
      commands.executeCommand("cloudmusic.next");
      return;
    }

    const tmpFilePath = join(TMP_DIR, idString);
    if (!existsSync(tmpFilePath)) {
      downloadMusic(url, idString, tmpFilePath, md5);
      let count = 0;
      const timer = setInterval(() => {
        if (statSync(tmpFilePath).size > 256) {
          clearInterval(timer);
          playerLoad(tmpFilePath);
        } else if (++count > 12) {
          clearInterval(timer);
          lock.playerLoad.set(false);
          commands.executeCommand("cloudmusic.next");
        }
      }, 100);
    } else {
      playerLoad(tmpFilePath);
    }
  }
}

export function splitLine(content: string): string {
  return `>>>>>>>>                        ${content}                        <<<<<<<<`;
}

enum PickType {
  artist,
  album,
  albums,
  like,
  save,
  similar,
  song,
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
    label: `$(link) ${name}`,
    description: ar.map((i) => i.name).join("/"),
    detail: alia.join("/"),
    id,
    type: PickType.song,
  }));

export const pickArtistItems = (ars: { id: number; name: string }[]): ST[] =>
  ars.map(({ name, id }) => ({
    label: `$(account) ${localize("artist", "Artist")}`,
    detail: name,
    id,
    type: PickType.artist,
  }));

export const pickAlbumItems = (albums: AlbumsItem[]): ST[] =>
  albums.map(({ name, alias, artists, id }) => ({
    label: `$(circuit-board) ${name}`,
    description: alias.join("/"),
    detail: artists.map((artist) => artist.name).join("/"),
    id,
    type: PickType.album,
  }));

export async function pickSong(
  input: MultiStepInput,
  step: number,
  id: number
): Promise<InputStep | void> {
  const { name, alia, ar, al } = (await apiSongDetail([id]))[0];

  const pick = await input.showQuickPick<T>({
    title: `${localize("song", "Song")}${localize("detail", " Detail")}`,
    step,
    items: [
      {
        label: name,
        detail: alia.join("/"),
      },
      ...pickArtistItems(ar),
      {
        label: `$(circuit-board) ${localize("album", "Album")}`,
        detail: al.name,
        id: al.id,
        type: PickType.album,
      },
      {
        label: `$(heart) ${localize("like.song", "Like this song")}`,
        type: PickType.like,
      },
      {
        label: `$(add) ${localize("save.playlist", "Save to playlist")}`,
        type: PickType.save,
      },
      {
        label: `$(library) ${localize("similar.song", "Similar songs")}`,
        type: PickType.similar,
      },
    ],
  });
  if (pick.type === PickType.album) {
    return (input: MultiStepInput) =>
      pickAlbum(input, step + 1, pick.id as number);
  } else if (pick.type === PickType.artist) {
    return (input: MultiStepInput) =>
      pickArtist(input, step + 1, pick.id as number);
  } else if (pick.type === PickType.like) {
    if (await apiLike(id)) {
      AccountManager.likelist.add(id);
      if (id === player.id) {
        IsLike.set(true);
      }
    }
  } else if (pick.type === PickType.save) {
    commands.executeCommand("cloudmusic.addToPlaylist", {
      item: { id },
    });
  } else if (pick.type === PickType.similar) {
    const ids = await apiSimiSong(id);
    return (input: MultiStepInput) => pickSongs(input, step + 1, ids);
  }
}

export async function pickSongs(
  input: MultiStepInput,
  step: number,
  ids: number[]
): Promise<InputStep | void> {
  const songs = await apiSongDetail(ids);
  const pick = await input.showQuickPick({
    title: localize("song", "Songs"),
    step,
    items: pickSongItems(songs),
  });
  return (input: MultiStepInput) => pickSong(input, step + 1, pick.id);
}

export async function pickArtist(
  input: MultiStepInput,
  step: number,
  id: number
): Promise<InputStep | void> {
  const { info, songs } = await apiArtists(id);

  const { name, alias, briefDesc, albumSize } = info;
  const pick = await input.showQuickPick<T>({
    title: `${localize("artist", "Artist")}${localize("detail", " Detail")}`,
    step,
    items: [
      {
        label: name,
        detail: alias.join("/"),
      },
      {
        label: `$(markdown) ${localize("description", "Brief description")}`,
        detail: briefDesc,
      },
      {
        label: `$(circuit-board) ${localize("album", "Album")}`,
        detail: `${albumSize}`,
        id,
        type: PickType.albums,
      },
      {
        label: splitLine(localize("song.hot", "HOT SONGS")),
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
}

export async function pickAlbum(
  input: MultiStepInput,
  step: number,
  id: number
): Promise<InputStep | void> {
  const { info, songs } = await apiAlbum(id);

  const { artists, alias, company, description, name } = info;
  const pick = await input.showQuickPick<T>({
    title: `${localize("album", "Album")}${localize("detail", " Detail")}`,
    step,
    items: [
      {
        label: name,
        description: alias.join("/"),
        detail: company,
      },
      {
        label: `$(markdown) ${localize("description", "Description")}`,
        detail: description,
      },
      ...pickArtistItems(artists),
      {
        label: splitLine(localize("content", "CONTENTS")),
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
}

export async function pickAlbums(
  input: MultiStepInput,
  step: number,
  id: number
): Promise<InputStep | void> {
  const albums = await apiArtistAlbum(id);
  const pick = await input.showQuickPick({
    title: localize("album", "Albums"),
    step,
    items: pickAlbumItems(albums),
  });
  return (input: MultiStepInput) => pickAlbum(input, step + 1, pick.id);
}
