import { AccountManager, ButtonManager } from "../manager";
import { IsLike, PersonalFm } from "../state";
import {
  LocalCache,
  MusicCache,
  apiSongUrl,
  downloadMusic,
  player,
} from "../util";
import { Uri, workspace } from "vscode";
import { QueueProvider } from "../provider";
import { TMP_DIR } from "../constant";
import { i18n } from "../i18n";

class PlayerLoad {
  private static state = false;

  static get(): boolean {
    return this.state;
  }

  static set(newValue: boolean): void {
    if (newValue !== this.state) {
      this.state = newValue;
      if (newValue) {
        ButtonManager.buttonSong(
          `$(loading) ${i18n.word.song}: ${i18n.word.loading}`
        );
      } else {
        const { name, ar, id } = player.item;
        ButtonManager.buttonSong(name, ar.map((i) => i.name).join("/"));
        IsLike.set(AccountManager.likelist.has(id));
      }
    }
  }
}

class DeleteTmp {
  private static state = false;

  static get(): boolean {
    return this.state;
  }

  static async set(newValue: boolean): Promise<void> {
    if (newValue !== this.state) {
      this.state = newValue;
      if (newValue) {
        try {
          const items = await workspace.fs.readDirectory(TMP_DIR);
          for (const item of items) {
            if (item[0] !== `${player.item.id}`) {
              workspace.fs.delete(Uri.joinPath(TMP_DIR, item[0]));
            }
          }
        } catch {}

        let id = 0;

        if (PersonalFm.get()) {
          if (PersonalFm.item.length > 1) {
            id = PersonalFm.item[1].item.id;
          }
        } else {
          if (QueueProvider.songs.length > 1) {
            id = QueueProvider.songs[1].item.id;
          }
        }
        const idString = `${id}`;
        if (id !== 0 && !(await MusicCache.get(idString))) {
          const { url, md5 } = (await apiSongUrl([id]))[0];
          if (!url || LocalCache.get(md5)) {
            return;
          }
          downloadMusic(
            url,
            idString,
            Uri.joinPath(TMP_DIR, idString),
            md5,
            !PersonalFm.get()
          );
        }
      }
    }
  }
}

export const lock = {
  queue: false,
  playerLoad: PlayerLoad,
  deleteTmp: DeleteTmp,
};
