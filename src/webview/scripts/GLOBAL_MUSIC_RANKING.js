const tab = (id) => vscode.postMessage({ command: "tab", id });
const song = (id) => vscode.postMessage({ command: "song", id });
const album = (id) => vscode.postMessage({ command: "album", id });
const artist = (id) => vscode.postMessage({ command: "artist", id });

document.querySelectorAll("nav#tabs > button.tabs-button").forEach((node) => {
  const index = parseInt(node.getAttribute("data-index"));
  node.addEventListener("click", () => tab(index));
});

document.querySelectorAll("div.song").forEach((node) => {
  const id = parseInt(node.getAttribute("data-id"));
  node.addEventListener("click", () => song(id));
});

document.querySelectorAll("img.album").forEach((node) => {
  const id = parseInt(node.getAttribute("data-id"));
  node.addEventListener("click", () => album(id));
});

document.querySelectorAll("div.artist").forEach((node) => {
  const id = parseInt(node.getAttribute("data-id"));
  node.addEventListener("click", () => artist(id));
});
