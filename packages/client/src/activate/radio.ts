import { IPC, MultiStepInput, Webview, pickRadio } from "../utils/index.js";
import type { ProgramTreeItem, RadioTreeItem, UserTreeItem } from "../treeview/index.js";
import { commands, env } from "vscode";
import type { ExtensionContext } from "vscode";
import { NeteaseCommentType } from "@cloudmusic/shared";
import { RadioProvider } from "../treeview/index.js";

export function initRadio(context: ExtensionContext): void {
  context.subscriptions.push(
    commands.registerCommand("cloudmusic.refreshRadio", (element: UserTreeItem) => RadioProvider.refreshUser(element)),

    commands.registerCommand("cloudmusic.refreshRadioContent", (element: RadioTreeItem) =>
      RadioProvider.refreshRadioHard(element),
    ),

    commands.registerCommand("cloudmusic.playRadio", async (element: RadioTreeItem) =>
      IPC.new(await RadioProvider.refreshRadio(element)),
    ),

    commands.registerCommand("cloudmusic.addRadio", async (element: RadioTreeItem) =>
      IPC.add(await RadioProvider.refreshRadio(element)),
    ),

    commands.registerCommand("cloudmusic.unsubRadio", ({ item: { id } }: RadioTreeItem) =>
      IPC.netease("djSub", [id, "unsub"]),
    ),

    commands.registerCommand(
      "cloudmusic.radioDetail",
      ({ item }: RadioTreeItem) => void MultiStepInput.run((input) => pickRadio(input, 1, item)),
    ),

    commands.registerCommand("cloudmusic.addProgram", ({ data }: ProgramTreeItem) => IPC.add([data])),

    commands.registerCommand(
      "cloudmusic.copyRadioLink",
      ({ item: { id } }: RadioTreeItem) => void env.clipboard.writeText(`https://music.163.com/#/djradio?id=${id}`),
    ),

    commands.registerCommand("cloudmusic.programComment", ({ data: { id }, label }: ProgramTreeItem) =>
      Webview.comment(NeteaseCommentType.dj, id, label),
    ),

    commands.registerCommand(
      "cloudmusic.copyProgramLink",
      ({ data: { id } }: ProgramTreeItem) => void env.clipboard.writeText(`https://music.163.com/#/program?id=${id}`),
    ),
  );
}
