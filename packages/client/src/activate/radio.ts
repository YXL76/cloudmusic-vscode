import { CommentType, apiDjSub } from "../api";
import { IPCClient, MultiStepInput, Webview, pickRadio } from "../util";
import type { ProgramTreeItem, RadioTreeItem } from "../treeview";
import { commands, env, window } from "vscode";
import type { ExtensionContext } from "vscode";
import { RadioProvider } from "../treeview";

export function initRadio(context: ExtensionContext): void {
  const djRadioProvider = RadioProvider.getInstance();

  context.subscriptions.push(
    window.registerTreeDataProvider("radio", djRadioProvider),

    commands.registerCommand("cloudmusic.refreshRadio", () =>
      RadioProvider.refresh()
    ),

    commands.registerCommand(
      "cloudmusic.refreshRadioContent",
      (element: RadioTreeItem) => RadioProvider.refresh(element)
    ),

    commands.registerCommand("cloudmusic.playRadio", (element: RadioTreeItem) =>
      RadioProvider.refresh(element, (items) =>
        IPCClient.new(items.map(({ data }) => data))
      )
    ),

    commands.registerCommand("cloudmusic.addRadio", (element: RadioTreeItem) =>
      RadioProvider.refresh(element, (items) =>
        IPCClient.add(items.map(({ data }) => data))
      )
    ),

    commands.registerCommand(
      "cloudmusic.unsubRadio",
      ({ item: { id } }: RadioTreeItem) => apiDjSub(id, "unsub")
    ),

    commands.registerCommand(
      "cloudmusic.radioDetail",
      ({ item }: RadioTreeItem) =>
        void MultiStepInput.run((input) => pickRadio(input, 1, item))
    ),

    commands.registerCommand(
      "cloudmusic.playProgram",
      ({ data: { id, pid } }: ProgramTreeItem) =>
        RadioProvider.refresh(RadioProvider.radios.get(pid), (items) =>
          IPCClient.new(
            items.map(({ data }) => data),
            id
          )
        )
    ),

    commands.registerCommand(
      "cloudmusic.addProgram",
      ({ data }: ProgramTreeItem) => IPCClient.add([data])
    ),

    commands.registerCommand(
      "cloudmusic.copyRadioLink",
      ({ item: { id } }: RadioTreeItem) =>
        void env.clipboard.writeText(`https://music.163.com/#/djradio?id=${id}`)
    ),

    commands.registerCommand(
      "cloudmusic.programComment",
      ({ data: { id }, label }: ProgramTreeItem) =>
        Webview.comment(CommentType.dj, id, label)
    ),

    commands.registerCommand(
      "cloudmusic.copyProgramLink",
      ({ data: { id } }: ProgramTreeItem) =>
        void env.clipboard.writeText(`https://music.163.com/#/program?id=${id}`)
    )
  );
}
