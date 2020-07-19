import { join } from "path";
import { readdirSync, unlinkSync } from "fs";
import { observable } from "mobx";
import { lock } from "./lock";
import { TMP_DIR } from "../constant/setting";
import { Lyric } from "../constant/type";
import { player } from "../util/player";
import { ButtonManager } from "../manager/buttonManager";
const { closestSearch } = require("@thejellyfish/binary-search");

export const playing = observable.box(false);
export const position = observable.box(0);

export const lyric: Lyric = {
  delay: -1.5,
  time: [0],
  text: ["Lyric"],
};

playing.observe((change) => {
  ButtonManager.buttonPlay(change.newValue);
});

position.observe((change) => {
  const index = closestSearch(lyric.time, change.newValue + lyric.delay);
  ButtonManager.buttonLyric(lyric.text[index]);
  if (change.newValue > 100 && !lock.playerLoad) {
    lock.playerLoad = true;
    readdirSync(TMP_DIR).forEach((file) => {
      if (file !== `${player.id}`) {
        try {
          unlinkSync(join(TMP_DIR, file));
        } catch {}
      }
    });
    lock.playerLoad = false;
  }
});
