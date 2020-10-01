import { ACCOUNT_KEY, AUTO_CHECK } from "../constant";
import { AccountManager } from "../manager";
import type { ExtensionContext } from "vscode";

export async function initAccount(context: ExtensionContext): Promise<void> {
  const info:
    | {
        phone: boolean;
        account: string;
        // eslint-disable-next-line @typescript-eslint/naming-convention
        md5_password: string;
        countrycode?: string;
      }
    | undefined = context.globalState.get(ACCOUNT_KEY);
  if (info && (await AccountManager.login(info)) && AUTO_CHECK) {
    void AccountManager.dailySignin();
  }
}
