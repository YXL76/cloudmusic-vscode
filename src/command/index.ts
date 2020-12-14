import type { ExtensionContext } from "vscode";
import { account } from "./account";
import { media } from "./media";
import { search } from "./search";

export function initCommand(context: ExtensionContext): void {
  account(context);
  media(context);
  search(context);
}
