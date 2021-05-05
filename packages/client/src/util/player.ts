import type { Lyric, LyricSpecifyData } from "../constant";
import { LyricType } from "../constant";
import i18n from "../i18n";

/* async function prefetch() {
  try {
    const treeitem = PersonalFm.state
      ? await PersonalFm.next()
      : QueueProvider.next;
    if (!treeitem || treeitem instanceof LocalFileTreeItem) return;
    const idS = `${treeitem.valueOf}`;

    if (idS !== "0" && !MusicCache.get(idS)) {
      const { url, md5 } = await apiSongUrl(treeitem.item);
      if (!url) return;

      const path = Uri.joinPath(TMP_DIR, idS);
      const data = await downloadMusic(url, idS, path, !PersonalFm.state, md5);
      if (data) {
        const file = createWriteStream(path.fsPath);
        data.pipe(file);
      }
      void apiLyric(treeitem.valueOf);
    }
  } catch {}
} */

export const lyric: Lyric = {
  index: 0,
  delay: -1.0,
  type: LyricType.original,
  time: [0],
  o: { text: [i18n.word.lyric] },
  t: { text: [i18n.word.lyric] },
};

export const setLyric = (
  index: number,
  time: number[],
  o: LyricSpecifyData,
  t: LyricSpecifyData
): void => {
  lyric.index = index;
  lyric.time = time;
  lyric.o = o;
  lyric.t = t;
};
