import type { SongsItem } from "../constant";
import kuwo from "./kuwo";
import migu from "./migu";

const provider = [kuwo, migu];

export default async function unlock(song: SongsItem) {
  return (await Promise.all(provider.map((i) => i(song)))).find((item) => item);
}
