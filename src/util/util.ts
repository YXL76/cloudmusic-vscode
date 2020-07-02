import { TreeItemCollapsibleState } from "vscode";
import { QueueItem, songsItem } from "../constant/type";
import { QueueItemTreeItem } from "../provider/queueProvider";
import { PlaylistManager } from "../manager/playlistManager";
import { ButtonLabel, ButtonManager } from "../manager/buttonManager";
import { player } from "./player";

export async function QueueItem2TreeItem(
  id: number,
  songs: QueueItem[]
): Promise<QueueItemTreeItem[]> {
  return songs.map((song) => {
    return new QueueItemTreeItem(
      `${song.name}${song.alia ? ` (${song.alia})` : ""}`,
      song,
      id,
      TreeItemCollapsibleState.None
    );
  });
}

export async function getPlaylistContentIntelligence(
  id: number,
  pid: number
): Promise<QueueItemTreeItem[]> {
  const songs = await PlaylistManager.tracksIntelligence(id, pid);
  return await QueueItem2TreeItem(id, songs);
}

export function solveSongItem(item: songsItem): QueueItem {
  const { name, id, bt, alia, ar } = item;
  let arNames = [];
  for (const i of ar) {
    arNames.push(i.name);
  }
  const arName = arNames.join("/");
  return {
    name,
    id,
    bt: bt / 1000,
    alia: alia ? alia[0] : "",
    arName,
  };
}

export async function playCallback(elements: [number, QueueItemTreeItem][]) {
  player.load(elements[0][1]);
}

const buttonManager = ButtonManager.getInstance();

export function buttonPlay() {
  buttonManager.updateButton(ButtonLabel.Play, "$(play)", "PLay");
}

export function buttonPause() {
  buttonManager.updateButton(ButtonLabel.Play, "$(debug-pause)", "Pause");
}
