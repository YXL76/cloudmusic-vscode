import { QueueItem, songsItem } from "../constant/type";

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
