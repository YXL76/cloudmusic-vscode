import * as nls from "vscode-nls";
import { Disposable, window } from "vscode";
import { readdirSync, unlinkSync } from "fs";
import { MusicCache } from "../util/cache";
import { PersonalFm } from "./play";
import { QueueProvider } from "../provider/queueProvider";
import { TMP_DIR } from "../constant/setting";
import { apiSongUrl } from "../util/api";
import { downloadMusic } from "../util/util";
import { join } from "path";
import { player } from "../util/player";

nls.config({
  messageFormat: nls.MessageFormat.bundle,
  bundleFormat: nls.BundleFormat.standalone,
})();

const localize = nls.loadMessageBundle();

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
          `$(loading) ${localize("music", "Music")}: ${localize(
            "loading",
            "Loading"
          )}`
        );
      } else {
        this.disposable.dispose();
      }
    }
  }
}

const queueProvider = QueueProvider.getInstance();

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
