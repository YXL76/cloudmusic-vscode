import { RadioProvider } from "../treeview";
import { window } from "vscode";

export function initRadio() {
  const djRadioProvider = RadioProvider.getInstance();
  window.registerTreeDataProvider("radio", djRadioProvider);
}
