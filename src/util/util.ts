import { QueueItem, songsItem } from "../constant/type";

export function solveSongItem(item: songsItem): QueueItem {
  const { name, id, alia, ar } = item;
  return {
    name,
    id,
    alia: alia ? alia[0] : "",
    arName: ar[0].name,
  };
}
