import { observable } from "mobx";
import { ButtonManager } from "../manager/buttonManager";

export const volumeLevel = observable.box(85);

volumeLevel.observe((change) => {
  ButtonManager.buttonVolume(change.newValue);
});
