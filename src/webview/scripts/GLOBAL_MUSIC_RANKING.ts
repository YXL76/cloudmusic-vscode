{
  const vscode = acquireVsCodeApi();

  const tab = (id: number) => vscode.postMessage({ command: "tab", id });

  const song = (id: number) => vscode.postMessage({ command: "song", id });

  const album = (id: number) => vscode.postMessage({ command: "album", id });

  const artist = (id: number) => vscode.postMessage({ command: "artist", id });

  document.querySelectorAll("nav#tabs > button.tabs-button").forEach((node) => {
    const index = parseInt(node.getAttribute("data-index") as string);
    node.addEventListener("click", () => tab(index));
  });

  document.querySelectorAll("div.song").forEach((node) => {
    const id = parseInt(node.getAttribute("data-id") as string);
    node.addEventListener("click", () => song(id));
  });

  document.querySelectorAll("img.album").forEach((node) => {
    const id = parseInt(node.getAttribute("data-id") as string);
    node.addEventListener("click", () => album(id));
  });

  document.querySelectorAll("div.artist").forEach((node) => {
    const id = parseInt(node.getAttribute("data-id") as string);
    node.addEventListener("click", () => artist(id));
  });
}
