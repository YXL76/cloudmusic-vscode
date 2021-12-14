import { AccountViewProvider, Webview } from "../utils";
import type { ExtensionContext } from "vscode";
import { VOLUME_KEY } from "../constant";
import { window } from "vscode";

export function initViewProvide(context: ExtensionContext): void {
  Webview.init(context.extensionUri);
  const accountViewProvider = new AccountViewProvider(
    context.extensionUri,
    context.globalState.get(VOLUME_KEY, 85)
  );
  context.subscriptions.push(
    window.registerWebviewViewProvider("account", accountViewProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );
}
