import { Uri, ViewColumn, window } from "vscode";
import { apiUserRecord } from "../util";
import { join } from "path";

export class WebView {
  constructor(private extensionPath: string) {}

  private file2uri(...path: string[]) {
    return Uri.file(join(this.extensionPath, "page", ...path));
  }

  async userMusicRanking(
    type: string,
    title: string,
    queryType: 0 | 1
  ): Promise<void> {
    const panel = window.createWebviewPanel(type, title, ViewColumn.One, {
      enableScripts: true,
      retainContextWhenHidden: true,
    });

    const css = panel.webview.asWebviewUri(
      this.file2uri("css", "userMusicRanking.css")
    );

    const js = panel.webview.asWebviewUri(
      this.file2uri("js", "userMusicRanking.js")
    );

    panel.webview.html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <link rel="stylesheet" href="${css}" />
</head>
<body>
<div class="list" id="list">
</div>
<script src="${js}"></script>
</body>
</html>
`;

    panel.webview.postMessage(await apiUserRecord(queryType));
  }
}
