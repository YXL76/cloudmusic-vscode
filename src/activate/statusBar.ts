import {
  LyricCache,
  MultiStepInput,
  apiFmTrash,
  lyric,
  pickSong,
  player,
} from "../util";
import { QuickPickItem, commands, window } from "vscode";
import { ButtonManager } from "../manager";
import { QueueItemTreeItem } from "../provider";

import { i18n } from "../i18n";

export function initStatusBar(): void {
  ButtonManager.init();

  commands.registerCommand(
    "cloudmusic.songDetail",
    async (element?: QueueItemTreeItem) => {
      const id = element ? element.item.id : player.item.id;
      if (id) {
        await MultiStepInput.run((input) => pickSong(input, 1, id));
      }
    }
  );

  commands.registerCommand("cloudmusic.lyric", async () => {
    const pick = await window.showQuickPick([
      {
        label: i18n.word.lyricDelay,
        description: `${i18n.sentence.label.lyricDelay} (${i18n.word.default}: -1.0)`,
        type: 0,
      },
      {
        label: i18n.word.fullLyric,
        type: 1,
      },
      {
        label: i18n.word.cleanCache,
        type: 2,
      },
    ]);
    if (!pick) {
      return;
    }
    switch (pick.type) {
      case 0:
        const delay = await window.showInputBox({
          value: `${lyric.delay}`,
          placeHolder: i18n.sentence.hint.lyricDelay,
        });
        if (!delay || !/^-?[0-9]+([.]{1}[0-9]+){0,1}$/.test(delay)) {
          return;
        }
        lyric.delay = parseFloat(delay);
        break;
      case 1:
        const lyricItem: QuickPickItem[] = [];
        for (let i = 0; i < lyric.text.length; ++i) {
          lyricItem.push({
            label: lyric.text[i],
            description: `[${lyric.time[i]}]`,
          });
        }
        const allLyric = await window.showQuickPick(lyricItem);
        if (allLyric) {
          await window.showInputBox({
            value: allLyric.description,
          });
        }
        break;
      case 2:
        LyricCache.clear();
        break;
    }
  });

  commands.registerCommand("cloudmusic.fmTrash", () => {
    apiFmTrash(player.item.id);
  });
}
