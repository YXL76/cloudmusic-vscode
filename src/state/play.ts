import { observable } from "mobx";
import { Lyric } from "../constant/type";
import { ButtonManager } from "../manager/buttonManager";

export const playing = observable.box(false);
export const position = observable.box(0);

export const lyric: Lyric = {
  index: 0,
  time: [0],
  text: ["Lyric"],
};

playing.observe((change) => {
  ButtonManager.buttonPlay(change.newValue);
});

position.observe((change) => {
  while (change.newValue >= lyric.time[lyric.index]) {
    ++lyric.index;
  }
  ButtonManager.buttonLyric(lyric.text[lyric.index - 1]);
});
