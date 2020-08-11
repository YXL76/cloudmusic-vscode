import { SongsItem } from "../../src/constant/type";

window.addEventListener("message", (event) => {
  const songs: (SongsItem & { count: number })[] = event.data;
  const max = songs[0].count;
  const root = document.getElementById("list");

  if (root) {
    let i = 0;
    for (const { count, name, alia } of songs) {
      const item = document.createElement("div");
      item.className = "list__item";

      const left = document.createElement("div");
      left.className = "list__item-left";
      left.innerHTML = `${++i}`;
      item.appendChild(left);

      const middle = document.createElement("div");
      middle.className = "list__item-middle";
      middle.innerHTML = `${name} ${alia[0] ? `(${alia[0]})` : ""}`;
      item.appendChild(middle);

      const right = document.createElement("div");
      right.className = "list__item-right";
      right.innerHTML = `${count}`;
      right.style.width = `${(count * 54) / max}vw`;
      item.appendChild(right);

      root.appendChild(item);
    }
  }
});
