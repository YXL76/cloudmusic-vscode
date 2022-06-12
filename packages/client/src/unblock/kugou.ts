/* import type { SongDetail, SongsItem, UnlockSongItem } from "../constant";
import axios from "axios";
import { createHash } from "node:crypto";
import { extname } from "node:path";
import filter from "./filter";

interface SearchResult {
  data: {
    lists: {
      AlbumName: string;
      SingerName: string;
      SongName: string;
      Suffix: string;
      FileHash: string;
      ExtName: string;
      HQFileHash: string;
      HQExtName: string;
      SQFileHash: string;
      SQExtName: string;
      SuperFileHash: string;
      SuperExtName: string;
    }[];
  };
}

// const format = MUSIC_QUALITY === 999000 ? 0 : MUSIC_QUALITY === 320000 ? 1 : 2;

async function search(keyword: string) {
  keyword = encodeURIComponent(keyword);

  try {
    const {
      data: {
        data: { lists },
      },
    } = await axios.get<SearchResult>(
      `http://songsearch.kugou.com/song_search_v2?keyword=${keyword}&page=1&pagesize=8&platform=WebFilter`
    );
    return lists.map(
      ({
        AlbumName,
        SingerName,
        SongName,
        FileHash,
        // ExtName,
        // HQFileHash,
        // HQExtName,
        // SQFileHash,
        // SQExtName,
      }) => ({
        album: AlbumName,
        artist: SingerName.split("、"),
        dt: 0,
        id: FileHash,
        name: SongName,
        // ...[
        //   { hash: SQFileHash, type: SQExtName },
        //   { hash: HQFileHash, type: HQExtName },
        //   { hash: FileHash, type: ExtName },
        // ]
        //   .slice(format)
        //   .filter(({ hash }) => hash)[0],
      })
    );
  } catch {}
  return [];
}

async function songUrl({ id }: UnlockSongItem) {
  try {
    const {
      data: { url },
    } = await axios.get<{ url: string[] }>(
      `http://trackercdn.kugou.com/i/v2/?key=${createHash("md5")
        .update(`${id}kgcloudv2`)
        .digest("hex")}&hash=${id}&pid=2&cmd=25&behavior=play`
    );
    return { url: url[0], type: extname(url[0]).split(".").pop(), md5: id };
  } catch {}
  return;
}

export default async function kugou(
  song: SongsItem
): Promise<SongDetail | void> {
  const list = await search(song.name);
  const selected = filter(list, song);
  return selected ? await songUrl(selected) : undefined;
}
 */

export default undefined;
