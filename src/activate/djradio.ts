import { DjRadioProvider } from "../treeview";
import { window } from "vscode";

export function initDjradio() {
  const djRadioProvider = DjRadioProvider.getInstance();
  window.registerTreeDataProvider("djradio", djRadioProvider);
}
