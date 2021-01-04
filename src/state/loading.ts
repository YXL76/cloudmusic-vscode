import { AccountManager, ButtonManager } from "../manager";
import { IsLike } from ".";
import type { SongsItem } from "../constant";
import { i18n } from "../i18n";

export class Loading {
  private static state = false;

  static set(newValue: boolean, item?: SongsItem) {
    if (newValue !== this.state) {
      this.state = newValue;
      if (newValue) {
        ButtonManager.buttonSong(
          `$(loading) ${i18n.word.song}: ${i18n.word.loading}`
        );
      } else {
        const { name, ar, id } = item as SongsItem;
        ButtonManager.buttonSong(name, ar.map((i) => i.name).join("/"));
        IsLike.set(AccountManager.likelist.has(id));
      }
    }
  }
}
