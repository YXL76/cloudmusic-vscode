import { ACCOUNT_KEY, AUTO_CHECK } from "../constant";
import { AccountManager } from "../manager";
import type { ExtensionContext } from "vscode";
import type { LoginParameters } from "../constant";

export async function initAccount(context: ExtensionContext): Promise<void> {
  const info: LoginParameters | undefined = context.globalState.get(
    ACCOUNT_KEY
  );
  if (info && (await AccountManager.login(info)) && AUTO_CHECK) {
    void AccountManager.dailySignin();
  }
}
