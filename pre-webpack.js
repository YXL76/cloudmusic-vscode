const fs = require("fs");
const path = require("path");

const dir = path.join(".", "node_modules", "NeteaseCloudMusicApi");

let data = [];

fs.writeFileSync(
  path.join(dir, "module", "playlist_update.js"),
  `
module.exports = (query, request) => {
  query.cookie.os = 'pc'
  const data = {
    '/api/playlist/desc/update': \`{"id":\${query.id},"desc":"\${query.desc}"}\`,
    '/api/playlist/update/name': \`{"id":\${query.id},"name":"\${query.name}"}\`,
  }
  return request('POST', 'https://music.163.com/weapi/batch', data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}`
);

fs.writeFileSync(
  path.join(dir, "module", "song_detail.js"),
  `
module.exports = (query, request) => {
  const data = {
    c: '[' + query.ids.map((id) => '{"id":' + id + '}').join(',') + ']',
    ids: '[' + query.ids.join(',') + ']',
  }
  return request('POST', "https://music.163.com/weapi/v3/song/detail", data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}`
);

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
          cookie: data.cookie || {},
        },
        request
      );
    };`);
  });

fs.writeFileSync(
  path.join(dir, "main.js"),
  `
  const request = require('./util/request')

  let obj = {}

  ${data.join("\n")}
  
  module.exports = obj
  `
);
