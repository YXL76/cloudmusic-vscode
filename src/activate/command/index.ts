import { ExtensionContext } from "vscode";
import { account } from "./account";
import { media } from "./media";
import { search } from "./search";

export async function initCommand(context: ExtensionContext): Promise<void> {
  account(context);
  media(context);
  search(context);
}
