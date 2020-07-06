import * as http from "http";
import { posix } from "path";
import { createWriteStream } from "fs";
import { commands } from "vscode";
import { TMP_DIR } from "../constant/setting";
import { Cache } from "../util/cache";
import { player } from "./player";
import { lock } from "../state/lock";
import { TreeItemCollapsibleState } from "vscode";
import { apiPlaymodeIntelligenceList, apiSongUrl } from "./api";
import { QueueItem, SongsItem } from "../constant/type";
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
  const { name, id, dt, alia, ar } = item;
  const arNames: string[] = [];
  for (const i of ar) {
    arNames.push(i.name);
  }
  const arName = arNames.join("/");
  return {
    name,
    id,
    dt: dt,
    alia: alia ? alia[0] : "",
    arName,
  };
}

export async function load(element: QueueItemTreeItem): Promise<void> {
  lock.playerLoad = true;
  const { pid, md5 } = element;
  const { id, dt } = element.item;
  const path = await Cache.get(`${id}`, md5);

  if (path) {
    player.load(path, id, pid, dt);
  } else {
    const { url } = (await apiSongUrl([id]))[0];
    if (!url) {
      lock.playerLoad = false;
      await commands.executeCommand("cloudmusic.next");
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
  }
}
