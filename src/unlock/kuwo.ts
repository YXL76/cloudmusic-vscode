import { MUSIC_QUALITY, NATIVE } from "../constant";
import type { SongsItem } from "../constant";
import axios from "axios";
import { extname } from "path";

interface SearchResult {
  data: {
    list: {
      album: string;
      artist: string;
      musicrid: string;
      name: string;
      songTimeMinutes: string;
    }[];
  };
}

type KuwoSongItem = {
  album: string;
  artist: string[];
  musicrid: string;
  name: string;
  songTimeMinutes: number;
};

async function search(keyword: string) {
  keyword = encodeURIComponent(keyword);

  try {
    // const token =
    //   ((await axios.get(`http://kuwo.cn/search/list?key=${keyword}`))
    //     .headers as { "set-cookie": string[] })["set-cookie"]
    //     .find((line: string) => line.includes("kw_token"))
    //     ?.replace(/;.*/, "")
    //     .split("=")
    //     .pop() || "";

    const token = "WIRAHDP0MZ";
    const {
      data: {
        data: { list },
      },
    } = await axios.get<SearchResult>(
      `http://www.kuwo.cn/api/www/search/searchMusicBykeyWord?key=${keyword}pn=1&rn=8`,
      {
        headers: {
          referer: `http://www.kuwo.cn/search/list?key=${keyword}`,
          csrf: token,
          cookie: `kw_token=${token}`,
        },
      }
    );
    return list.map(({ album, artist, musicrid, name, songTimeMinutes }) => {
      const dt = songTimeMinutes.split(":").map((i) => parseInt(i));
      return {
        album,
        artist: artist.split("&"),
        musicrid,
        name,
        songTimeMinutes: (dt[0] * 60 + dt[1]) * 1000,
      };
    });
  } catch {}
  return [];
}

const format = ["flac", "mp3"]
  .slice(MUSIC_QUALITY === 999000 ? 0 : 1)
  .join("|");

async function songUrl({ musicrid }: KuwoSongItem) {
  try {
    if (MUSIC_QUALITY > 128000) {
      const id = musicrid.split("_").pop() || "";
      const { data } = await axios.get<string>(
        `http://mobi.kuwo.cn/mobi.s?f=kuwo&q=${NATIVE.kuwoCrypt(
          `corp=kuwo&p2p=1&type=convert_url2&sig=0&format=${format}&rid=${id}`
        ).toString("base64")}`,
        { headers: { "user-agent": "okhttp/3.10.0" } }
      );
      const obj: Record<string, string> = {};
      data.split("\r\n").forEach((line) => {
        const [key, value] = line.split("=");
        obj[key] = value;
      });
      return { url: obj["url"], type: obj["format"], md5: undefined };
    } else {
      const { data } = await axios.get<string>(
        `http://antiserver.kuwo.cn/anti.s?type=convert_url&format=mp3&response=url&rid=${musicrid}`,
        { headers: { "user-agent": "okhttp/3.10.0" } }
      );
      return { url: data, type: extname(data), md5: undefined };
    }
  } catch {}
  return undefined;
}

export default async function kuwo(song: SongsItem) {
  let list = await search(song.name);
  const filters = [
    (list: KuwoSongItem[]) => list.filter(({ name }) => name === song.name),
    (list: KuwoSongItem[]) =>
      list.filter(({ album }) => song.al.name === album),
    (list: KuwoSongItem[]) =>
      list.filter(
        ({ songTimeMinutes }) => Math.abs(songTimeMinutes - song.dt) < 10000
      ),
    (list: KuwoSongItem[]) =>
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
