const { createWriteStream } = require("fs");
const { get } = require("https");

let data;

get(
  "https://sourceforge.net/projects/mpv-player-windows/rss?path=/libmpv",
  {
    headers: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.89 Safari/537.36",
    },
  },
  (res) => {
    res.on("data", (chunk) => {
      data += chunk;
    });
    res.on("end", () => {
      const lines = data.split("\n");
      for (const line of lines) {
        const r = /\<title\>\<!\[CDATA\[\/libmpv\/mpv-dev-x86_64-(.+)\.7z\]\]\>\<\/title\>/.exec(
          line.trim()
        );
        if (r) {
          const file = createWriteStream("mpv.7z");
          get(
            `https://ayera.dl.sourceforge.net/project/mpv-player-windows/libmpv/mpv-dev-x86_64-${r[1]}.7z`,
            (res) => {
              res.pipe(file);
            }
          );
          break;
        }
      }
    });
  }
);
