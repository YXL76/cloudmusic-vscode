import { ThemeIcon, TreeItem, TreeItemCollapsibleState } from "vscode";

export class UserTreeItem extends TreeItem {
  private static readonly _set = new Map<number, UserTreeItem>();

  override readonly iconPath = new ThemeIcon("account");

  override readonly contextValue = "UserTreeItem";

  constructor(
    override readonly label: string,
    readonly uid: number,
  ) {
    super(label, TreeItemCollapsibleState.Collapsed);
  }

  static new(label: string, uid: number): UserTreeItem {
    let element = this._set.get(uid);
    if (element) return element;
    element = new this(label, uid);
    this._set.set(uid, element);
    return element;
  }

  static unsafeGet(uid: number): UserTreeItem {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this._set.get(uid)!;
  }
}
