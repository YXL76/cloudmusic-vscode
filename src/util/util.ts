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
  apiLike,
  apiLyric,
  apiPlaymodeIntelligenceList,
  apiSimiSong,
  apiSongDetail,
  apiSongUrl,
} from "./api";
import { QueueItem, SongsItem } from "../constant/type";
import { ButtonManager } from "../manager/buttonManager";
import { QueueItemTreeItem } from "../provider/queueProvider";

export async function queueItem2TreeItem(
  id: number,
  ids: number[],
  songs: QueueItem[]
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
  return await queueItem2TreeItem(id, ids, songs);
}

export function solveSongItem(item: SongsItem): QueueItem {
  const { name, id, dt, alia, ar, al } = item;
  return {
    name,
    id,
    dt: dt,
    alia: alia ? alia[0] : "",
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
      detail: alia,
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
      albumDetailPick(pick.id);
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
        detail: song.alia,
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
  const { name, alias, briefDesc, hotSongs } = await apiArtists(id);
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
      type: 1,
    },
    ...hotSongs.map((song) => {
      return {
        label: `$(link) ${song.name}`,
        description: song.ar.map((i) => i.name).join("/"),
        detail: song.alia,
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
      break;
    case 2:
      //@ts-ignore
      songPick(pick.id);
      break;
  }
}

export async function albumDetailPick(id: number): Promise<void> {
  const songs = await apiAlbum(id);
  const pick = await window.showQuickPick(
    songs.map((song) => {
      return {
        label: `$(link) ${song.name}`,
        description: song.ar.map((i) => i.name).join("/"),
        detail: song.alia,
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
