import en from "./en.js";
import { env } from "vscode";
import type zhCn from "./zh-cn.js";
import type zhTw from "./zh-tw.js";

const i18n: typeof en | typeof zhCn | typeof zhTw = en;

type AvailableLanguages = "en" | "zh-cn" | "zh-tw";

const availableLanguages: readonly Exclude<AvailableLanguages, "en">[] = ["zh-cn", "zh-tw"];

const lang = availableLanguages.find((value) => env.language === value);

switch (lang) {
  case "zh-cn":
    import("./zh-cn.js").then((i) => Object.assign(i18n, i.default)).catch(console.error);
    break;
  case "zh-tw":
    import("./zh-tw.js").then((i) => Object.assign(i18n, i.default)).catch(console.error);
    break;
}

export default i18n;
