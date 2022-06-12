/* import type { SongDetail, SongsItem, UnlockSongItem } from "../constant";
import axios from "axios";
import { extname } from "node:path";

interface SearchResult {
  tracks: {
    album_name: string;
    artist_list: { name: string }[];
    id: string;
    is_playable: boolean;
    name: string;
    play_duration: number;
  }[][];
}

async function search(keyword: string) {
  keyword = encodeURIComponent(keyword);

  try {
    const {
      data: { tracks },
    } = await axios.get<SearchResult>(
      `http://api-jooxtt.sanook.com/openjoox/v2/search_type?lang=zh_CN&type=0&key=${keyword}`
    );
    return (
      tracks
        .flat()
        // eslint-disable-next-line @typescript-eslint/naming-convention
        .filter(({ is_playable }) => is_playable)
        // eslint-disable-next-line @typescript-eslint/naming-convention
        .map(({ album_name, artist_list, id, name, play_duration }) => ({
          album: album_name,
          artist: artist_list.map(({ name }) => name),
          id,
          name,
          dt: play_duration * 1000,
        }))
        .slice(0, 8)
    );
  } catch {}
  return [];
}

async function songUrl({ id }: UnlockSongItem) {
  try {
    const { data } = await axios.get<string>(
      `http://api.joox.com/web-fcgi-bin/web_get_songinfo?songid=${id}&country=hk&lang=zh_CN&from_type=-1&channel_id=-1&_=${Date.now()}`,
      {
        headers: {
          origin: "http://www.joox.com",
          referer: "http://www.joox.com",
        },
      }
    );
    const { r320Url, r192Url, mp3Url } = JSON.parse(
      data.slice(data.indexOf("(") + 1, -1)
    ) as {
      r320Url?: string;
      r192Url?: string;
      mp3Url?: string;
    };
    const url = (r320Url || r192Url || mp3Url)?.replace(
      /M\d00([\w]+).mp3/,
      "M800$1.mp3"
    );
    return url ? { url, type: extname(url).split(".").pop() } : undefined;
  } catch {}
  return;
}

export default async function joox(
  song: SongsItem
): Promise<SongDetail | void> {
  const list = await search(song.name);
  const selected = list.shift();
  return selected ? await songUrl(selected) : undefined;
}
 */

export default undefined;
