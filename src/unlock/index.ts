import type { SongsItem } from "../constant";
import joox from "./joox";
import kugou from "./kugou";
import kuwo from "./kuwo";
import migu from "./migu";

const provider = [kuwo, migu, kugou, joox];

export default async function unlock(song: SongsItem) {
  return (await Promise.all(provider.map((i) => i(song)))).find((item) => item);
}
