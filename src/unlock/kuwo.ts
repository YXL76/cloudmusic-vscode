import { MUSIC_QUALITY, NATIVE } from "../constant";
import type { SongsItem, UnlockSongItem } from "../constant";
import axios from "axios";
import { extname } from "path";
import filter from "./filter";

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
      `http://www.kuwo.cn/api/www/search/searchMusicBykeyWord?key=${keyword}&pn=1&rn=8`,
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
        dt: (dt[0] * 60 + dt[1]) * 1000,
        id: musicrid,
        name,
      };
    });
  } catch {}
  return [];
}

const format = ["flac", "mp3"]
  .slice(MUSIC_QUALITY === 999000 ? 0 : 1)
  .join("|");

async function songUrl({ id }: UnlockSongItem) {
  try {
    if (MUSIC_QUALITY > 128000) {
      id = id.split("_").pop() || "";
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
      return { url: obj["url"], type: obj["format"], md5: "" };
    } else {
      const { data } = await axios.get<string>(
        `http://antiserver.kuwo.cn/anti.s?type=convert_url&format=mp3&response=url&rid=${id}`,
        { headers: { "user-agent": "okhttp/3.10.0" } }
      );
      return {
        url: data,
        type: extname(data).split(".").pop(),
        md5: "",
      };
    }
  } catch {}
  return undefined;
}

export default async function kuwo(song: SongsItem) {
  const list = await search(song.name);
  const selected = filter(list, song);
  return selected ? await songUrl(selected) : undefined;
}
