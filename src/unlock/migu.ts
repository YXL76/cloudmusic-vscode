import {
  constants,
  createCipheriv,
  createHash,
  publicEncrypt,
  randomBytes,
} from "crypto";
import { MUSIC_QUALITY } from "../constant";
import type { SongsItem } from "../constant";
import axios from "axios";
import { extname } from "path";
import { stringify } from "querystring";

interface SearchResult {
  musics: {
    albumName: string;
    artist: string;
    singerName: string;
    copyrightId: string;
    title: string;
    songName: string;
    mp3: string;
  }[];
}

type MiguSongItem = {
  album: string;
  artist: string[];
  copyrightId: string;
  title: string;
  mp3: string;
};

async function search(keyword: string) {
  keyword = encodeURIComponent(keyword);

  try {
    const {
      data: { musics },
    } = await axios.get<SearchResult>(
      `http://m.music.migu.cn/migu/remoting/scr_search_tag?keyword=${keyword}&type=2&rows=20&pgc=1`,
      {
        headers: {
          referer: `http://m.music.migu.cn/migu/remoting/scr_search_tag?keyword=${keyword}`,
        },
      }
    );
    return musics.map(({ albumName, singerName, copyrightId, title, mp3 }) => ({
      album: albumName,
      artist: singerName.split(", "),
      copyrightId,
      title,
      mp3,
    }));
  } catch {}
  return [];
}

const key =
  "-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC8asrfSaoOb4je+DSmKdriQJKWVJ2oDZrs3wi5W67m3LwTB9QVR+cE3XWU21Nx+YBxS0yun8wDcjgQvYt625ZCcgin2ro/eOkNyUOTBIbuj9CvMnhUYiR61lC1f1IGbrSYYimqBVSjpifVufxtx/I3exReZosTByYp4Xwpb1+WAQIDAQAB\n-----END PUBLIC KEY-----";

function encrypt(data: Record<string, unknown>) {
  const password = Buffer.from(randomBytes(32).toString("hex"));
  const salt = randomBytes(8);

  const result: Buffer[] = [Buffer.alloc(0)];
  for (let i = 0; i < 5; ++i) {
    result.push(
      createHash("md5")
        .update(Buffer.concat([result[result.length - 1], password, salt]))
        .digest()
    );
  }
  const buffer = Buffer.concat(result);
  const cipher = createCipheriv(
    "aes-256-cbc",
    buffer.slice(0, 32),
    buffer.slice(32, 48)
  );

  return stringify({
    data: Buffer.concat([
      Buffer.from("Salted__"),
      salt,
      cipher.update(Buffer.from(JSON.stringify(data))),
      cipher.final(),
    ]).toString("base64"),
    secKey: publicEncrypt(
      { key, padding: constants.RSA_PKCS1_PADDING },
      password
    ).toString("base64"),
  });
}

const format = MUSIC_QUALITY === 999000 ? 3 : MUSIC_QUALITY === 320000 ? 2 : 1;

async function songUrl({ copyrightId, mp3 }: MiguSongItem) {
  if (MUSIC_QUALITY === 128000 && mp3) {
    return mp3;
  }
  try {
    const {
      data: {
        data: { playUrl },
      },
    } = await axios.get<{ data: { playUrl: string } }>(
      `http://music.migu.cn/v3/api/music/audioPlayer/getPlayInfo?dataType=2&${encrypt(
        { copyrightId, type: format }
      )}`,
      {
        headers: {
          origin: "http://music.migu.cn/",
          referer: "http://music.migu.cn/",
        },
      }
    );
    return playUrl
      ? {
          url: `http:${encodeURI(playUrl)}`,
          type: extname(playUrl.split("?").shift() || "")
            .split(".")
            .pop(),
          md5: undefined,
        }
      : undefined;
  } catch {}
  return undefined;
}

export default async function kuwo(song: SongsItem) {
  let list = await search(song.name);
  const filters = [
    (list: MiguSongItem[]) => list.filter(({ title }) => title === song.name),
    (list: MiguSongItem[]) =>
      list.filter(({ album }) => song.al.name === album),
    (list: MiguSongItem[]) =>
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
