import { CommentType, apiDjSub } from "../api";
import type { ProgramTreeItem, RadioTreeItem } from "../treeview";
import { QueueProvider, RadioProvider } from "../treeview";
import { WebView, load } from "../util";
import { commands, env, window } from "vscode";
import { PersonalFm } from "../state";

export function initRadio() {
  const djRadioProvider = RadioProvider.getInstance();
  window.registerTreeDataProvider("radio", djRadioProvider);

  commands.registerCommand("cloudmusic.refreshRadio", () =>
    RadioProvider.refresh()
  );

  commands.registerCommand(
    "cloudmusic.refreshRadioContent",
    (element: RadioTreeItem) => RadioProvider.refresh(element)
  );

  commands.registerCommand("cloudmusic.playRadio", (element: RadioTreeItem) =>
    RadioProvider.refresh(element, (items) =>
      QueueProvider.refresh(() => {
        void PersonalFm.set(false);
        QueueProvider.clear();
        QueueProvider.add(items);
        void load(QueueProvider.songs[0]);
      })
    )
  );

  commands.registerCommand("cloudmusic.addRadio", (element: RadioTreeItem) =>
    RadioProvider.refresh(element, (items) =>
      QueueProvider.refresh(() => QueueProvider.add(items))
    )
  );

  commands.registerCommand(
    "cloudmusic.unsubRadio",
    ({ item: { id } }: RadioTreeItem) => apiDjSub(id, "unsub")
  );

  commands.registerCommand(
    "cloudmusic.playProgram",
    ({ item: { id }, pid }: ProgramTreeItem) =>
      RadioProvider.refresh(RadioProvider.radios.get(pid), (items) =>
        QueueProvider.refresh(() => {
          void PersonalFm.set(false);
          QueueProvider.clear();
          QueueProvider.add(items);
          QueueProvider.top(id);
          void load(QueueProvider.songs[0]);
        })
      )
  );

  commands.registerCommand(
    "cloudmusic.addProgram",
    (element: ProgramTreeItem) =>
      QueueProvider.refresh(() => QueueProvider.add([element]))
  );

  commands.registerCommand(
    "cloudmusic.copyRadioLink",
    ({ item: { id } }: RadioTreeItem) =>
      void env.clipboard.writeText(`https://music.163.com/#/djradio?id=${id}`)
  );

  commands.registerCommand(
    "cloudmusic.programComment",
    ({ bid, item: { name } }: ProgramTreeItem) =>
      WebView.getInstance().commentList(CommentType.dj, bid, name)
  );

  commands.registerCommand(
    "cloudmusic.copyProgramLink",
    ({ bid }: ProgramTreeItem) =>
      void env.clipboard.writeText(`https://music.163.com/#/program?id=${bid}`)
  );
}
