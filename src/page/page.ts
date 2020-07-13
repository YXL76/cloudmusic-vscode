import { posix } from "path";
import { ExtensionContext, Uri, WebviewPanel } from "vscode";
import { SongsItem } from "../constant/type";

export function userMusicRanking(
  context: ExtensionContext,
  panel: WebviewPanel,
  songs: { count: number; song: SongsItem }[]
): string {
  const chartCss = panel.webview.asWebviewUri(
    Uri.file(
      posix.join(
        context.extensionPath,
        "page",
        "userMusicRanking",
        "Chart.min.css"
      )
    )
  );

  const chartJs = panel.webview.asWebviewUri(
    Uri.file(
      posix.join(
        context.extensionPath,
        "page",
        "userMusicRanking",
        "Chart.bundle.min.js"
      )
    )
  );

  const data = {
    labels: songs.map(({ song }) => song.name),
    datasets: [
      {
        label: "Play Count",
        borderWidth: 1,
        data: songs.map(({ count }) => count),
      },
    ],
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <link href="${chartCss}" />
</head>
<body>
  <canvas id="myChart" width="1024" height="2048"></canvas>
  <script src="${chartJs}"></script>
  <script>
    const ctx = document.getElementById("myChart");
    const myBarChart = new Chart(ctx, {
      type: "horizontalBar",
      data: ${JSON.stringify(data)},
    });
  </script>
</body>
</html>
`;
}
