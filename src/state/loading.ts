import { AccountManager, ButtonManager } from "../manager";
import { IsLike } from ".";
import { Player } from "../util";
import i18n from "../i18n";

export class Loading {
  private static state = false;

  static set(newValue: boolean): void {
    if (newValue !== this.state) {
      this.state = newValue;
      if (newValue) {
        ButtonManager.buttonSong(
          `$(loading) ${i18n.word.song}: ${i18n.word.loading}`
        );
      } else if (Player.treeitem) {
        const { name, ar, id } = Player.treeitem.item;
        ButtonManager.buttonSong(name, ar.map(({ name }) => name).join("/"));
        IsLike.set(AccountManager.likelist.has(id));
      }
    }
  }
}
