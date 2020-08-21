import { Disposable, window } from "vscode";
import { MusicCache, apiSongUrl, downloadMusic, player } from "../util";
import { readdirSync, unlinkSync } from "fs";
import { PersonalFm } from "../state";
import { QueueProvider } from "../provider";
import { TMP_DIR } from "../constant";
import { i18n } from "../i18n";
import { join } from "path";

class PlayerLoad {
  private static state = false;
  private static disposable = new Disposable(() => {
    //
  });

  static get(): boolean {
    return this.state;
  }

  static set(newValue: boolean): void {
    if (newValue !== this.state) {
      this.state = newValue;
      if (newValue) {
        this.disposable = window.setStatusBarMessage(
          `$(loading) ${i18n.word.song}: ${i18n.word.loading}`
        );
      } else {
        this.disposable.dispose();
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
        readdirSync(TMP_DIR).forEach((file) => {
          if (file !== `${player.id}`) {
            try {
              unlinkSync(join(TMP_DIR, file));
            } catch {}
          }
        });

        let id = 0;
        let md5 = "";

        if (PersonalFm.get()) {
          if (PersonalFm.item.length > 1) {
            id = PersonalFm.item[1].item.id;
            md5 = PersonalFm.item[1].md5;
          }
        } else {
          const queueProvider = QueueProvider.getInstance();
          if (queueProvider.songs.length > 1) {
            id = queueProvider.songs[1].item.id;
            md5 = queueProvider.songs[1].md5;
          }
        }
        const idString = `${id}`;
        if (id !== 0 && !(await MusicCache.get(idString))) {
          const { url } = (await apiSongUrl([id]))[0];
          if (!url) {
            return;
          }
          const tmpFilePath = join(TMP_DIR, idString);
          downloadMusic(url, idString, tmpFilePath, md5);
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
