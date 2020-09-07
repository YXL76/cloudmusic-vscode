import { ACCOUNT_KEY, AUTO_CHECK, SETTING_DIR } from "../constant";
import { ExtensionContext, workspace } from "vscode";
import { AccountManager } from "../manager";

export async function initAccount(context: ExtensionContext): Promise<void> {
  await workspace.fs.createDirectory(SETTING_DIR);
  const info:
    | {
        phone: boolean;
        account: string;
        // eslint-disable-next-line @typescript-eslint/naming-convention
        md5_password: string;
      }
    | undefined = context.globalState.get(ACCOUNT_KEY);
  if (info) {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { phone, account, md5_password } = info;
    if (
      (await AccountManager.login(phone, account, md5_password)) &&
      AUTO_CHECK
    ) {
      AccountManager.dailySignin();
    }
  }
}
