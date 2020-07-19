import { observable } from "mobx";
import { player } from "../util/player";
import { AccountManager } from "../manager/accountManager";
import { ButtonManager } from "../manager/buttonManager";
import { PlaylistProvider } from "../provider/playlistProvider";
import { QueueProvider } from "../provider/queueProvider";

export const loggedIn = observable.box(false);

const queueProvider = QueueProvider.getInstance();

loggedIn.observe((change) => {
  if (change.newValue) {
    ButtonManager.buttonAccount(
      "$(account)",
      AccountManager.nickname,
      "cloudmusic.account"
    );
    ButtonManager.show();
  } else {
    ButtonManager.buttonAccount("$(account)", "Account", "cloudmusic.signin");
    ButtonManager.buttonSong("Song", "");
    ButtonManager.hide();
    player.stop();
  }
  PlaylistProvider.refresh();
  queueProvider.clear();
  queueProvider.refresh();
});
