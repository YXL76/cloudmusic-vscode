import { observable } from "mobx";
import { Lyric } from "../constant/type";
import { ButtonManager } from "../manager/buttonManager";
const { closestSearch } = require("@thejellyfish/binary-search");

export const playing = observable.box(false);
export const position = observable.box(0);

export const lyric: Lyric = {
  time: [0],
  text: ["Lyric"],
};

playing.observe((change) => {
  ButtonManager.buttonPlay(change.newValue);
});

position.observe((change) => {
  const index = closestSearch(lyric.time, change.newValue);
  ButtonManager.buttonLyric(lyric.text[index]);
});
