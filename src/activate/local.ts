import type { ExtensionContext } from "vscode";
import { LocalProvider } from "../provider";
import { window } from "vscode";

export function initLocal(context: ExtensionContext) {
  LocalProvider.context = context;
  const localProvider = LocalProvider.getInstance();
  window.registerTreeDataProvider("local", localProvider);
}
