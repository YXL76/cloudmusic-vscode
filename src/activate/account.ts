import { ACCOUNT_FILE, AUTO_CHECK, SETTING_DIR } from "../constant";
import { AccountManager } from "../manager";
import { workspace } from "vscode";

export async function initAccount(): Promise<void> {
  await workspace.fs.createDirectory(SETTING_DIR);
  try {
    try {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { phone, account, md5_password } = JSON.parse(
        Buffer.from(await workspace.fs.readFile(ACCOUNT_FILE)).toString()
      );
      if (
        (await AccountManager.login(phone, account, md5_password)) &&
        AUTO_CHECK
      ) {
        AccountManager.dailySignin();
      }
    } catch {}
  } catch {}
}
