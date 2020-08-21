import { ACCOUNT_FILE, AUTO_CHECK, SETTING_DIR } from "../constant";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { AccountManager } from "../manager";

export function initAccount(): void {
  if (!existsSync(SETTING_DIR)) {
    mkdirSync(SETTING_DIR);
  }
  if (existsSync(ACCOUNT_FILE)) {
    try {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { phone, account, md5_password } = JSON.parse(
        readFileSync(ACCOUNT_FILE, "utf8")
      );
      AccountManager.login(phone, account, md5_password).then((res) => {
        if (res && AUTO_CHECK) {
          AccountManager.dailySignin();
        }
      });
    } catch {}
  }
}
