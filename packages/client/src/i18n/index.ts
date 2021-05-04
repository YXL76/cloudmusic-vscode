import en from "./en";
import { env } from "vscode";
import type zhCn from "./zh-cn";
import type zhTw from "./zh-tw";

const i18n: typeof en | typeof zhCn | typeof zhTw = en;

type AvailableLanguages = "en" | "zh-cn" | "zh-tw";

const availableLanguages: Exclude<AvailableLanguages, "en">[] = [
  "zh-cn",
  "zh-tw",
];

const lang = availableLanguages.find((value) => env.language === value);

switch (lang) {
  case "zh-cn":
    import("./zh-cn")
      .then((i) => Object.assign(i18n, i.default))
      .catch(console.error);
    break;
  case "zh-tw":
    import("./zh-tw")
      .then((i) => Object.assign(i18n, i.default))
      .catch(console.error);
    break;
}

export default i18n;
