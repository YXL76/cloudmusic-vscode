const fs = require("fs");
const path = require("path");

const dir = path.join(".", "node_modules", "NeteaseCloudMusicApi");

let data = [];

fs.readdirSync(path.join(dir, "module"))
  .reverse()
  .forEach((file) => {
    if (!file.endsWith(".js")) {
      return;
    }
    const name = file.split(".").shift();
    data.push(`
    let ${name} = require("./module/${name}")
    obj["${name}"] = function (data) {
      return ${name}(
        {
          ...data,
          cookie: data.cookie ? data.cookie : {},
        },
        request
      );
    };`);
  });

fs.writeFileSync(
  path.join(dir, "main.js"),
  `
  const request = require('./util/request')
  const { cookieToJson } = require('./util/index')

  let obj = {}

  ${data.join("\n")}
  
  module.exports = obj
  `
);
