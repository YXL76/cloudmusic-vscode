import { observable } from "mobx";
import { ButtonManager } from "../manager/buttonManager";

export const playing = observable.box(false);

playing.observe((change) => {
  ButtonManager.buttonPlay(change.newValue);
});
