import type { SongsItem } from "../constant";
import axios from "axios";
import { createHash } from "crypto";
import { extname } from "path";

interface SearchResult {
  data: {
    lists: {
      /* eslint-disable @typescript-eslint/naming-convention */
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
      /* eslint-enable @typescript-eslint/naming-convention */
    }[];
  };
}

type KugouSongItem = {
  album: string;
  artist: string[];
  name: string;
  hash: string;
};

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
        /* eslint-disable @typescript-eslint/naming-convention */
        AlbumName,
        SingerName,
        SongName,
        FileHash,
        /* ExtName,
        HQFileHash,
        HQExtName,
        SQFileHash,
        SQExtName, */
        /* eslint-enable @typescript-eslint/naming-convention */
      }) => ({
        album: AlbumName,
        artist: SingerName.split("、"),
        name: SongName,
        hash: FileHash,
        /* ...[
          { hash: SQFileHash, type: SQExtName },
          { hash: HQFileHash, type: HQExtName },
          { hash: FileHash, type: ExtName },
        ]
          .slice(format)
          .filter(({ hash }) => hash)[0], */
      })
    );
  } catch {}
  return [];
}

async function songUrl({ hash }: KugouSongItem) {
  try {
    const {
      data: { url },
    } = await axios.get<{ url: string[] }>(
      `http://trackercdn.kugou.com/i/v2/?key=${createHash("md5")
        .update(`${hash}kgcloudv2`)
        .digest("hex")}&hash=${hash}&pid=2&cmd=25&behavior=play`
    );
    return { url: url[0], type: extname(url[0]), md5: undefined };
  } catch {}
  return undefined;
}

export default async function kugou(song: SongsItem) {
  let list = await search(song.name);
  const filters = [
    (list: KugouSongItem[]) => list.filter(({ name }) => name === song.name),
    (list: KugouSongItem[]) =>
      list.filter(({ album }) => song.al.name === album),
    (list: KugouSongItem[]) =>
      list.filter(({ artist }) =>
        song.ar.map(({ name }) => artist.includes(name)).includes(true)
      ),
  ];
  filters.forEach((filter) => {
    const newList = filter(list);
    if (newList.length > 0) {
      list = newList;
    }
  });
  const selected = list.shift();
  return selected ? await songUrl(selected) : undefined;
}
