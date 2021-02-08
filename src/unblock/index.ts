import type { SongDetail, SongsItem } from "../constant";
import { UNBLOCK_MUSIC } from "../constant";
import joox from "./joox";
import kugou from "./kugou";
import kuwo from "./kuwo";
import migu from "./migu";

const provider = [
  ...(UNBLOCK_MUSIC.kuwo ? [kuwo] : []),
  ...(UNBLOCK_MUSIC.migu ? [migu] : []),
  ...(UNBLOCK_MUSIC.kugou ? [kugou] : []),
  ...(UNBLOCK_MUSIC.joox ? [joox] : []),
];

export default async function unblock(
  song: SongsItem
): Promise<SongDetail | void> {
  return (await Promise.all(provider.map((i) => i(song)))).find((item) => item);
}
