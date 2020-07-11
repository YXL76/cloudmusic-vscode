import * as http from "http";
import { posix } from "path";
import { createWriteStream } from "fs";
import { commands, window } from "vscode";
import { TMP_DIR } from "../constant/setting";
import { Cache } from "../util/cache";
import { player } from "./player";
import { lock } from "../state/lock";
import { lyric } from "../state/play";
import { TreeItemCollapsibleState } from "vscode";
import {
  apiAlbum,
  apiArtists,
  apiArtistAlbum,
  apiLike,
  apiLyric,
  apiPlaymodeIntelligenceList,
  apiSimiSong,
  apiSongDetail,
  apiSongUrl,
} from "./api";
import { Artist, AlbumsItem, SongsItem } from "../constant/type";
import { ButtonManager } from "../manager/buttonManager";
import { QueueItemTreeItem } from "../provider/queueProvider";

export async function songItem2TreeItem(
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
          `${song.name}${song.alia ? ` (${song.alia})` : ""}`,
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
  return await songItem2TreeItem(id, ids, songs);
}

export function solveArtist(item: Artist): Artist {
  const { name, id, alias, briefDesc, albumSize } = item;
  return { name, id, alias, briefDesc, albumSize };
}

export function solveAlbumsItem(item: AlbumsItem): AlbumsItem {
  const { artists, alias, company, description, subType, name, id } = item;
  return {
    artists: artists.map((artist: Artist) => {
      return {
        name: artist.name,
        id: artist.id,
        alias: artist.alias,
        briefDesc: artist.briefDesc,
        albumSize: artist.albumSize,
      };
    }),
    alias,
    company,
    description,
    subType,
    name,
    id,
  };
}

export function solveSongItem(item: SongsItem): SongsItem {
  const { name, id, dt, alia, ar, al } = item;
  return {
    name,
    id,
    dt: dt,
    alia,
    ar,
    al,
  };
}

export async function load(element: QueueItemTreeItem): Promise<void> {
  lock.playerLoad = true;
  try {
    const { pid, md5 } = element;
    const { id, dt, name, ar } = element.item;
    const path = await Cache.get(`${id}`, md5);
    const { time, text } = await apiLyric(id);
    ButtonManager.buttonSong(name, ar.map((i) => i.name).join("/"));

    if (path) {
      player.load(path, id, pid, dt);
      lyric.time = time;
      lyric.text = text;
    } else {
      const { url } = (await apiSongUrl([id]))[0];
      if (!url) {
        lock.playerLoad = false;
        commands.executeCommand("cloudmusic.next");
        return;
      }
      const tmpFilePath = posix.join(TMP_DIR, `${id}`);
      const tmpFile = createWriteStream(tmpFilePath);

      http
        .get(url, (res) => {
          res.pipe(tmpFile);
          tmpFile.on("finish", () => {
            tmpFile.close();
            Cache.put(`${id}`, tmpFilePath);
          });
        })
        .on("response", () => {
          player.load(tmpFilePath, id, pid, dt);
        })
        .on("error", () => {
          player.load(url, id, pid, dt);
        });

      lyric.time = time;
      lyric.text = text;
    }
  } catch {
    lock.playerLoad = false;
    commands.executeCommand("cloudmusic.next");
  }
}

export async function songPick(id: number): Promise<void> {
  const { name, alia, ar, al } = (await apiSongDetail([id]))[0];
  const pick = await window.showQuickPick([
    {
      label: name,
      detail: alia.join("/"),
    },
    ...ar.map((i) => {
      return {
        label: "$(account) Artist",
        detail: i.name,
        id: i.id,
        type: 1,
      };
    }),
    {
      label: "$(circuit-board) Album",
      detail: al.name,
      id: al.id,
      type: 2,
    },
    {
      label: "$(heart) Like this song",
      type: 3,
    },
    {
      label: "$(add) Save to playlist",
      type: 4,
    },
    {
      label: "$(library) Similar songs",
      type: 5,
    },
  ]);
  if (!pick || !pick.type) {
    return;
  }
  switch (pick.type) {
    case 1:
      //@ts-ignore
      artistPick(pick.id);
      break;
    case 2:
      //@ts-ignore
      albumPick(pick.id);
      break;
    case 3:
      apiLike(id);
      break;
    case 4:
      commands.executeCommand("cloudmusic.addToPlaylist", { item: { id } });
      break;
    case 5:
      songsPick(await apiSimiSong(id));
      break;
  }
}

export async function songsPick(ids: number[]): Promise<void> {
  const songs = await apiSongDetail(ids);
  const pick = await window.showQuickPick(
    songs.map((song) => {
      return {
        label: `$(link) ${song.name}`,
        description: song.ar.map((i) => i.name).join("/"),
        detail: song.alia.join("/"),
        id: song.id,
      };
    })
  );
  if (!pick) {
    return;
  }
  //@ts-ignore
  songPick(pick.id);
}

export async function artistPick(id: number): Promise<void> {
  const { info, songs } = await apiArtists(id);
  const { name, alias, briefDesc, albumSize } = info;
  const pick = await window.showQuickPick([
    {
      label: name,
      detail: alias.join("/"),
    },
    {
      label: "$(markdown) Brief description",
      detail: briefDesc,
    },
    {
      label: "$(circuit-board) Albums",
      detail: `${albumSize}`,
      id,
      type: 1,
    },
    {
      label: ">>>>> HOT SONGS <<<<<",
    },
    ...songs.map((song) => {
      return {
        label: `$(link) ${song.name}`,
        description: song.ar.map((i) => i.name).join("/"),
        detail: song.alia.join("/"),
        id: song.id,
        type: 2,
      };
    }),
  ]);
  if (!pick) {
    return;
  }
  switch (pick.type) {
    case 1:
      //@ts-ignore
      albumsPick(pick.id);
      break;
    case 2:
      //@ts-ignore
      songPick(pick.id);
      break;
  }
}

export async function albumPick(id: number): Promise<void> {
  const { info, songs } = await apiAlbum(id);
  const { artists, alias, company, description, subType, name } = info;
  const pick = await window.showQuickPick([
    {
      label: name,
      description: alias.join("/"),
      detail: `${company} · ${subType}`,
    },
    {
      label: "$(markdown) Description",
      detail: description,
    },
    ...artists.map((i) => {
      return {
        label: "$(account) Artist",
        detail: i.name,
        id: i.id,
        type: 1,
      };
    }),
    {
      label: ">>>>> CONTENTS <<<<<",
    },
    ...songs.map((song) => {
      return {
        label: `$(link) ${song.name}`,
        description: song.ar.map((i) => i.name).join("/"),
        detail: song.alia.join("/"),
        id: song.id,
        type: 2,
      };
    }),
  ]);
  if (!pick) {
    return;
  }
  //@ts-ignore
  switch (pick.type) {
    case 1:
      //@ts-ignore
      artistPick(pick.id);
      break;
    case 2:
      //@ts-ignore
      songPick(pick.id);
      break;
  }
}

export async function albumsPick(id: number): Promise<void> {
  const albums = await apiArtistAlbum(id);
  const pick = await window.showQuickPick(
    albums.map((album) => {
      return {
        label: `$(circuit-board) ${album.name}`,
        description: album.alias.join("/"),
        detail: album.artists.map((artist) => artist.name).join("/"),
        id: album.id,
      };
    })
  );
  if (!pick) {
    return;
  }
  //@ts-ignore
  albumPick(pick.id);
}
