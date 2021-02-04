{
  const vscode = acquireVsCodeApi();

  const like = (id: number, t: "like" | "unlike") =>
    vscode.postMessage({ command: "like", id, t });

  const list = (id: number) => vscode.postMessage({ command: "list", id });

  const user = (id: number) => vscode.postMessage({ command: "user", id });

  const prev = () => vscode.postMessage({ command: "prev" });

  const next = () => vscode.postMessage({ command: "next" });

  const floor = (id: number) => vscode.postMessage({ command: "floor", id });

  const reply = (id: number) => vscode.postMessage({ command: "reply", id });

  document.querySelectorAll("nav#tabs > button.tabs-button").forEach((node) => {
    const index = parseInt(node.getAttribute("data-index") as string);
    node.addEventListener("click", () => list(index));
  });

  document.querySelector("button#prev")?.addEventListener("click", prev);
  document.querySelector("button#next")?.addEventListener("click", next);

  document.querySelectorAll("div.comment").forEach((cnode) => {
    const cid = parseInt(cnode.getAttribute("data-id") as string);

    cnode.querySelectorAll("div.like").forEach((node) => {
      const t = node.getAttribute("data-t") as "like" | "unlike";
      node.addEventListener("click", () => like(cid, t));
    });

    cnode.querySelectorAll(".user").forEach((node) => {
      const uid = parseInt(node.getAttribute("data-id") as string);
      node.addEventListener("click", () => user(uid));
    });

    cnode.querySelectorAll("div.floor").forEach((node) => {
      node.addEventListener("click", () => floor(cid));
    });

    cnode.querySelectorAll("div.reply").forEach((node) => {
      node.addEventListener("click", () => reply(cid));
    });
  });
}
