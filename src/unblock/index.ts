import type { SongDetail, SongsItem } from "../constant";
import { UNLOCK_MUSIC } from "../constant";
import joox from "./joox";
import kugou from "./kugou";
import kuwo from "./kuwo";
import migu from "./migu";

const provider = [
  ...(UNLOCK_MUSIC.kuwo ? [kuwo] : []),
  ...(UNLOCK_MUSIC.migu ? [migu] : []),
  ...(UNLOCK_MUSIC.kugou ? [kugou] : []),
  ...(UNLOCK_MUSIC.joox ? [joox] : []),
];

export default async function unblock(
  song: SongsItem
): Promise<SongDetail | void> {
  return (await Promise.all(provider.map((i) => i(song)))).find((item) => item);
}
