import { AccountViewProvider, IPC } from "../utils";
import { PLAYER_MODE, VOLUME_KEY } from "../constant";
import { Uri, workspace } from "vscode";
import type { ExtensionContext } from "vscode";

type NativeModule = `${NodeJS.Platform}-${string}.node`;

export async function initPlayer(context: ExtensionContext): Promise<void> {
  const name: NativeModule = `${process.platform}-${process.arch}.node`;
  const wasm =
    PLAYER_MODE === "wasm" ||
    (await (async () => {
      try {
        const files = await workspace.fs.readDirectory(
          Uri.joinPath(context.extensionUri, "build")
        );
        return files.findIndex(([file]) => file === name) === -1;
      } catch {}
      return false;
    })());
  console.log("Cloudmusic:", PLAYER_MODE, "mode.");
  AccountViewProvider.enablePlayer = wasm;
  IPC.init(process.env["VSCODE_PID"], context.globalState.get(VOLUME_KEY, 85), {
    wasm,
    name,
  });
}
