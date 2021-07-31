import { AccountViewProvider } from "../utils";
import type { ExtensionContext } from "vscode";
import { window } from "vscode";

export function initViewProvide(context: ExtensionContext): void {
  const accountViewProvider = new AccountViewProvider();
  context.subscriptions.push(
    window.registerWebviewViewProvider("account", accountViewProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );
}
