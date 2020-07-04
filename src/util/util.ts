import { TreeItemCollapsibleState } from "vscode";
import { apiPlaymodeIntelligenceList, apiScrobble, apiSongUrl } from "./api";
import { player } from "../util/player";
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
          md5,
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

export function scrobbleEvent(id: number, pid: number, dt: number): void {
  if (dt > 60000) {
    const delay = Math.floor(Math.random() * dt + 60000);
    setTimeout(() => {
      if (player.id === id) {
        apiScrobble(id, pid, Math.floor(delay / 1000));
      }
    }, delay);
  }
}
