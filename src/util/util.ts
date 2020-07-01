import { QueueItem, songsItem } from "../constant/type";
import { QueueItemTreeItem } from "../provider/queueProvider";
import { ButtonLabel, ButtonManager } from "../manager/buttonManager";
import { player } from "./player";

export function solveSongItem(item: songsItem): QueueItem {
  const { name, id, alia, ar } = item;
  let arNames = [];
  for (const i of ar) {
    arNames.push(i.name);
  }
  const arName = arNames.join("/");
  return {
    name,
    id,
    alia: alia ? alia[0] : "",
    arName,
  };
}

export async function playCallback(elements: [number, QueueItemTreeItem][]) {
  player.load(elements[0][1].url);
}

const buttonManager = ButtonManager.getInstance();

export function buttonPlay() {
  buttonManager.updateButton(ButtonLabel.Play, "$(play)", "PLay");
}

export function buttonPause() {
  buttonManager.updateButton(ButtonLabel.Play, "$(debug-pause)", "Pause");
}
