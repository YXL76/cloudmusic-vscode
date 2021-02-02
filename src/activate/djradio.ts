import { DjRadioProvider } from "../provider";
import { window } from "vscode";

export function initDjradio() {
  const djRadioProvider = DjRadioProvider.getInstance();
  window.registerTreeDataProvider("djradio", djRadioProvider);
}
