import { observable } from "mobx";
import { ButtonManager } from "../manager/buttonManager";

export const isLike = observable.box(false);

isLike.observe((change) => {
  if (change.newValue) {
    ButtonManager.buttonLike(true);
  } else {
    ButtonManager.buttonLike(false);
  }
});
