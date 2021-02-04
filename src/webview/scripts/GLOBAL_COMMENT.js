// @ts-check

/** @type { import("../types").VsCodeApi}*/
// @ts-ignore
// eslint-disable-next-line no-undef
const vscode = acquireVsCodeApi();

/**
 * @param {number} id -
 * @param {string | "like" | "unlike"} t -
 * @returns {*} -
 */
const like = (id, t) => vscode.postMessage({ command: "like", id, t });

/**
 * @param {number} id -
 * @returns {*} -
 */
const list = (id) => vscode.postMessage({ command: "list", id });

/**
 * @param {number} id -
 * @returns {*} -
 */
const user = (id) => vscode.postMessage({ command: "user", id });

/** @returns {*} - */
const prev = () => vscode.postMessage({ command: "prev" });

/** @returns {*} - */
const next = () => vscode.postMessage({ command: "next" });

/**
 * @param {number} id -
 * @returns {*} -
 */
const floor = (id) => vscode.postMessage({ command: "floor", id });

/**
 * @param {number} id -
 * @returns {*} -
 */
const reply = (id) => vscode.postMessage({ command: "reply", id });

document.querySelectorAll("nav#tabs > button.tabs-button").forEach((node) => {
  const index = parseInt(node.getAttribute("data-index"));
  node.addEventListener("click", () => list(index));
});

document.querySelector("button#prev")?.addEventListener("click", prev);
document.querySelector("button#next")?.addEventListener("click", next);

document.querySelectorAll("div.comment").forEach((cnode) => {
  const cid = parseInt(cnode.getAttribute("data-id"));

  cnode.querySelectorAll("div.like").forEach((node) => {
    const t = node.getAttribute("data-t");
    node.addEventListener("click", () => like(cid, t));
  });

  cnode.querySelectorAll(".user").forEach((node) => {
    const uid = parseInt(node.getAttribute("data-id"));
    node.addEventListener("click", () => user(uid));
  });

  cnode.querySelectorAll("div.floor").forEach((node) => {
    node.addEventListener("click", () => floor(cid));
  });

  cnode.querySelectorAll("div.reply").forEach((node) => {
    node.addEventListener("click", () => reply(cid));
  });
});
