import { IPC, MultiStepInput, Webview, pickRadio } from "../utils";
import type { ProgramTreeItem, UserTreeItem } from "../treeview";
import { RadioProvider, RadioTreeItem } from "../treeview";
import { commands, env, window } from "vscode";
import type { ExtensionContext } from "vscode";
import { NeteaseEnum } from "@cloudmusic/shared";

export function initRadio(context: ExtensionContext): void {
  const djRadioProvider = RadioProvider.getInstance();

  context.subscriptions.push(
    window.registerTreeDataProvider("radio", djRadioProvider),

    commands.registerCommand(
      "cloudmusic.refreshRadio",
      (element: UserTreeItem) => RadioProvider.refreshUser(element)
    ),

    commands.registerCommand(
      "cloudmusic.refreshRadioContent",
      (element: RadioTreeItem) => RadioProvider.refreshRadioHard(element)
    ),

    commands.registerCommand(
      "cloudmusic.playRadio",
      async (element: RadioTreeItem) => {
        const items = await RadioProvider.refreshRadio(element);
        IPC.new(items);
      }
    ),

    commands.registerCommand(
      "cloudmusic.addRadio",
      async (element: RadioTreeItem) => {
        const items = await RadioProvider.refreshRadio(element);
        IPC.add(items);
      }
    ),

    commands.registerCommand(
      "cloudmusic.unsubRadio",
      ({ item: { id } }: RadioTreeItem) => IPC.netease("djSub", [id, "unsub"])
    ),

    commands.registerCommand(
      "cloudmusic.radioDetail",
      ({ item }: RadioTreeItem) =>
        void MultiStepInput.run((input) => pickRadio(input, 1, item))
    ),

    commands.registerCommand(
      "cloudmusic.playProgram",
      async ({ data: { id, pid, uid } }: ProgramTreeItem) => {
        const element = RadioTreeItem.get(pid, uid ?? 0);
        if (!element) return;
        const items = await RadioProvider.refreshRadio(element);
        IPC.new(items, id);
      }
    ),

    commands.registerCommand(
      "cloudmusic.addProgram",
      ({ data }: ProgramTreeItem) => IPC.add([data])
    ),

    commands.registerCommand(
      "cloudmusic.copyRadioLink",
      ({ item: { id } }: RadioTreeItem) =>
        void env.clipboard.writeText(`https://music.163.com/#/djradio?id=${id}`)
    ),

    commands.registerCommand(
      "cloudmusic.programComment",
      ({ data: { id }, label }: ProgramTreeItem) =>
        Webview.comment(NeteaseEnum.CommentType.dj, id, label)
    ),

    commands.registerCommand(
      "cloudmusic.copyProgramLink",
      ({ data: { id } }: ProgramTreeItem) =>
        void env.clipboard.writeText(`https://music.163.com/#/program?id=${id}`)
    )
  );
}
