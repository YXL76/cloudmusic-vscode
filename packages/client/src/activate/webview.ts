import { AccountViewProvider } from "../util";
import type { ExtensionContext } from "vscode";
import { window } from "vscode";

export function initViewProvide(context: ExtensionContext): void {
  const accountViewProvider = new AccountViewProvider(context.extensionUri);
  context.subscriptions.push(
    window.registerWebviewViewProvider("account", accountViewProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );
}
