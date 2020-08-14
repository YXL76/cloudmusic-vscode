import * as nls from "vscode-nls";
import {
  AlbumsItem,
  AnotherSongItem,
  Artist,
  SongsItem,
} from "../constant/type";
import {
  apiAlbum,
  apiArtistAlbum,
  apiArtists,
  apiLike,
  apiLyric,
  apiPlaymodeIntelligenceList,
  apiSimiSong,
  apiSongDetail,
  apiSongUrl,
} from "./api";
import { commands, window } from "vscode";
import { AccountManager } from "../manager/accountManager";
import { ButtonManager } from "../manager/buttonManager";
import { IsLike } from "../state/like";
import { MusicCache } from "../util/cache";
import { QueueItemTreeItem } from "../provider/queueProvider";
import { TMP_DIR } from "../constant/setting";
import { TreeItemCollapsibleState } from "vscode";
import { join } from "path";
import { lock } from "../state/lock";
import { lyric } from "../state/play";
import { player } from "./player";
// eslint-disable-next-line @typescript-eslint/naming-convention
const { DownloaderHelper } = require("node-downloader-helper");

nls.config({
  messageFormat: nls.MessageFormat.bundle,
  bundleFormat: nls.BundleFormat.standalone,
})();

const localize = nls.loadMessageBundle();

export function sleep(ms: number): Promise<unknown> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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

export async function getPlaylistContentIntelligence(
  id: number,
  pid: number
): Promise<QueueItemTreeItem[]> {
  const songs = await apiPlaymodeIntelligenceList(id, pid);
  const ids = songs.map((song) => song.id);
  return await songsItem2TreeItem(id, ids, songs);
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
  return {
    name,
    id,
    dt: dt / 1000,
    alia,
    ar,
    al,
  };
}

export function solveAnotherSongItem(item: AnotherSongItem): SongsItem {
  const { name, id, duration, alias, artists, album } = item;
  return {
    name,
    id,
    dt: duration / 1000,
    alia: alias,
    ar: artists.map(({ id, name }) => ({ id, name })),
    al: {
      id: album.id,
      name: album.name,
    },
  };
}

export function stop(): void {
  player.id = 0;
  player.stop();
  ButtonManager.buttonSong(localize("song", "Song"), "");
  ButtonManager.buttonLyric(localize("lyric", "Lyric"));
}

let errorCount = 0;

export async function load(element: QueueItemTreeItem): Promise<void> {
  lock.playerLoad = true;
  try {
    const { pid, md5 } = element;
    const { id, dt, name, ar } = element.item;
    const idString = `${id}`;
    const path = await MusicCache.get(idString);
    const { time, text } = await apiLyric(id);
    ButtonManager.buttonSong(name, ar.map((i) => i.name).join("/"));
    IsLike.set(AccountManager.likelist.has(id));

    if (path) {
      player.load(path, id, pid, dt);
    } else {
      const { url } = (await apiSongUrl([id]))[0];
      if (!url) {
        lock.playerLoad = false;
        commands.executeCommand("cloudmusic.next");
        return;
      }

      const tmpFilePath = join(TMP_DIR, idString);

      const dl = new DownloaderHelper(url, TMP_DIR, {
        fileName: idString,
        retry: { maxRetries: 2, delay: 1024 },
        override: true,
      });

      dl.once("download", () => {
        player.load(tmpFilePath, id, pid, dt);
      }).once("end", () => {
        errorCount = 0;
        MusicCache.put(idString, tmpFilePath, md5);
      });

      dl.start().catch(() => {
        window.showErrorMessage(localize("error.network", "Network Error"));
        if (++errorCount > 4) {
          setTimeout(() => {
            lock.playerLoad = false;
          }, 1500);
        } else {
          setTimeout(() => {
            lock.playerLoad = false;
            commands.executeCommand("cloudmusic.next");
          }, 1500);
        }
      });
    }
    lyric.index = 0;
    lyric.time = time;
    lyric.text = text;
  } catch {
    lock.playerLoad = false;
    commands.executeCommand("cloudmusic.next");
  }
}

export function splitLine(content: string): string {
  return `>>>>>>>>                        ${content}                        <<<<<<<<`;
}

export async function songPick(id: number, item?: SongsItem): Promise<void> {
  const { name, alia, ar, al } = item || (await apiSongDetail([id]))[0];
  const pick = await window.showQuickPick([
    {
      label: name,
      detail: alia.join("/"),
    },
    ...ar.map((i) => ({
      label: `$(account) ${localize("artist", "Artist")}`,
      detail: i.name,
      id: i.id,
      type: 1,
    })),
    {
      label: `$(circuit-board) ${localize("album", "Album")}`,
      detail: al.name,
      id: al.id,
      type: 2,
    },
    {
      label: `$(heart) ${localize("like.song", "Like this song")}`,
      type: 3,
    },
    {
      label: `$(add) ${localize("save.playlist", "Save to playlist")}`,
      type: 4,
    },
    {
      label: `$(library) ${localize("similar.song", "Similar songs")}`,
      type: 5,
    },
  ]);
  if (!pick || !pick.type) {
    return;
  }
  switch (pick.type) {
    case 1:
      // @ts-ignore
      artistPick(pick.id);
      break;
    case 2:
      // @ts-ignore
      albumPick(pick.id);
      break;
    case 3:
      if ((await apiLike(id)) && id === player.id) {
        IsLike.set(true);
        AccountManager.likelist.add(id);
      }
      break;
    case 4:
      commands.executeCommand("cloudmusic.addToPlaylist", {
        item: { id },
      });
      break;
    case 5:
      songsPick(await apiSimiSong(id));
      break;
  }
}

export async function songsPick(
  ids?: number[],
  songs?: SongsItem[]
): Promise<void> {
  if (!songs && ids) {
    songs = await apiSongDetail(ids);
  }
  if (!songs) {
    return;
  }
  const pick = await window.showQuickPick(
    songs.map((song) => ({
      label: `$(link) ${song.name}`,
      description: song.ar.map((i) => i.name).join("/"),
      detail: song.alia.join("/"),
      item: song,
    }))
  );
  if (!pick) {
    return;
  }
  songPick(pick.item.id, pick.item);
}

export async function artistPick(
  id: number,
  info?: Artist,
  songs?: SongsItem[]
): Promise<void> {
  if (!info || !songs) {
    const item = await apiArtists(id);
    info = item.info;
    songs = item.songs;
  }
  if (!info) {
    return;
  }
  const { name, alias, briefDesc, albumSize } = info;
  const pick = await window.showQuickPick([
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
      type: 1,
    },
    {
      label: splitLine(localize("song.hot", "HOT SONGS")),
    },
    ...songs.map((song) => ({
      label: `$(link) ${song.name}`,
      description: song.ar.map((i) => i.name).join("/"),
      detail: song.alia.join("/"),
      item: song,
      type: 2,
    })),
  ]);
  if (!pick) {
    return;
  }
  switch (pick.type) {
    case 1:
      // @ts-ignore
      albumsPick(pick.id);
      break;
    case 2:
      // @ts-ignore
      songPick(pick.item.id, pick.item);
      break;
  }
}

export async function artistsPick(items: Artist[]): Promise<void> {
  const pick = await window.showQuickPick(
    items.map(({ name, id, alias, briefDesc }) => ({
      label: `$(account) ${name}`,
      description: alias.join("/"),
      detail: briefDesc,
      id,
    }))
  );
  if (!pick) {
    return;
  }
  artistPick(pick.id);
}

export async function albumPick(
  id: number,
  info?: AlbumsItem,
  songs?: SongsItem[]
): Promise<void> {
  if (!info || !songs) {
    const item = await apiAlbum(id);
    info = item.info;
    songs = item.songs;
  }
  if (!info) {
    return;
  }
  const { artists, alias, company, description, name } = info;
  const pick = await window.showQuickPick([
    {
      label: name,
      description: alias.join("/"),
      detail: company,
      type: 0,
    },
    {
      label: `$(markdown) ${localize("description", "Description")}`,
      detail: description,
      type: 0,
    },
    ...artists.map((i) => ({
      label: `$(account) ${localize("artist", "Artist")}`,
      detail: i.name,
      item: i,
      type: 1,
    })),
    {
      label: splitLine(localize("content", "CONTENTS")),
      type: 0,
    },
    ...songs.map((song) => ({
      label: `$(link) ${song.name}`,
      description: song.ar.map((i) => i.name).join("/"),
      detail: song.alia.join("/"),
      item: song,
      type: 2,
    })),
  ]);
  if (!pick || pick.type === 0) {
    return;
  }
  switch (pick.type) {
    case 1:
      // @ts-ignore
      artistPick(pick.item.id, pick.item);
      break;
    case 2:
      // @ts-ignore
      songPick(pick.item.id, pick.item);
      break;
  }
}

export async function albumsPick(
  id?: number,
  albums?: AlbumsItem[]
): Promise<void> {
  if (!albums && id) {
    albums = await apiArtistAlbum(id);
  }
  if (!albums) {
    return;
  }
  const pick = await window.showQuickPick(
    albums.map((album) => ({
      label: `$(circuit-board) ${album.name}`,
      description: album.alias.join("/"),
      detail: album.artists.map((artist) => artist.name).join("/"),
      id: album.id,
    }))
  );
  if (!pick) {
    return;
  }
  // @ts-ignore
  albumPick(pick.id);
}
