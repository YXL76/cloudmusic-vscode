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
import { join } from "path";

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
        let md5 = "";

        if (PersonalFm.get()) {
          if (PersonalFm.item.length > 1) {
            id = PersonalFm.item[1].item.id;
            md5 = PersonalFm.item[1].md5;
          }
        } else {
          if (QueueProvider.songs.length > 1) {
            id = QueueProvider.songs[1].item.id;
            md5 = QueueProvider.songs[1].md5;
          }
        }
        const idString = `${id}`;
        if (
          id !== 0 &&
          !(LocalCache.get(md5) || (await MusicCache.get(idString)))
        ) {
          const { url } = (await apiSongUrl([id]))[0];
          if (!url) {
            return;
          }
          downloadMusic(url, idString, join(TMP_DIR.fsPath, idString), md5);
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
