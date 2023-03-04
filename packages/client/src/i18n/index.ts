import en from "./en.js";
import { env } from "vscode";
import zhCn from "./zh-cn.js";
import zhTw from "./zh-tw.js";

type AvailableLanguages = "en" | "zh-cn" | "zh-tw";

const availableLanguages: readonly Exclude<AvailableLanguages, "en">[] = ["zh-cn", "zh-tw"];

const lang = availableLanguages.find((value) => env.language === value);

const i18n = (() => {
  switch (lang) {
    case "zh-cn":
      return zhCn;
    case "zh-tw":
      return zhTw;
    default:
      return en;
  }
})();

export default i18n;
