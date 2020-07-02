import { TreeItemCollapsibleState } from "vscode";
import { QueueItem, SongsItem } from "../constant/type";
import { QueueItemTreeItem } from "../provider/queueProvider";
import { PlaylistManager } from "../manager/playlistManager";
import { ButtonLabel, ButtonManager } from "../manager/buttonManager";

export async function queueItem2TreeItem(
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
  return await queueItem2TreeItem(id, songs);
}

export function solveSongItem(item: SongsItem): QueueItem {
  const { name, id, bt, alia, ar } = item;
  const arNames: string[] = [];
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

const buttonManager = ButtonManager.getInstance();

export function buttonPlay(): void {
  buttonManager.updateButton(ButtonLabel.play, "$(play)", "PLay");
}

export function buttonPause(): void {
  buttonManager.updateButton(ButtonLabel.play, "$(debug-pause)", "Pause");
}

export function buttonLike(islike: boolean): void {
  buttonManager.updateButton(
    ButtonLabel.like,
    islike ? "$(star-full)" : "$(star)",
    "Like"
  );
}
