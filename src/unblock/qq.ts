/* import type { SongsItem } from "../constant";
import axios from "axios";
import { userAgent } from "../api";

interface SearchResult {
  data: {
    song: {
      list: {
        mid: string;
        name: string;
        album: { name: string };
        file: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          media_mid: string;
        };
        singer: { name: string }[];
      }[];
    };
  };
}

async function search(keyword: string) {
  const url = `https://c.y.qq.com/soso/fcgi-bin/client_search_cp?format=json&new_json=1&w=${encodeURIComponent(
    keyword
  )}`;

  try {
    const res = await axios.get<SearchResult>(url, {
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        "User-Agent": userAgent,
      },
    });
    console.log(res);
    const {
      data: {
        data: {
          song: { list },
        },
      },
    } = res;
    return list;
  } catch {}
  return [];
}

interface SongUrlResult {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  req_0: {
    data: {
      sip: string[];
      midurlinfo: { purl: string }[];
    };
  };
}

async function songUrl(mid: string) {
  const url =
    "https://u.y.qq.com/cgi-bin/musicu.fcg?data=" +
    encodeURIComponent(
      JSON.stringify({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        req_0: {
          module: "vkey.GetVkeyServer",
          method: "CgiGetVkey",
          param: {
            guid: `${Math.floor(Math.random() * 1000000000)}`,
            loginflag: 1,
            songmid: [mid],
            songtype: [0],
            uin: "0",
            platform: "20",
          },
        },
      })
    );

  try {
    const xx = await axios.get<SongUrlResult>(url, {
      headers: {
        origin: "http://y.qq.com/",
        referer: "http://y.qq.com/",
      },
    });

    const {
      data: {
        req_0: {
          data: { sip, midurlinfo },
        },
      },
    } = xx;

    return `${sip[0]}${midurlinfo[0].purl}`;
  } catch {}
  return;
}

export async function qq(song: SongsItem) {
  const list = await search(song.name);
  const url = await songUrl(list[0].mid);
}
 */
