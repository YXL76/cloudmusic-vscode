import { join } from "path";
import { readFileSync } from "fs";
import { CACHE_DIR } from "../constant/setting";
const cacache = require("cacache");

export class Cache {
  static async get(key: string, md5: string): Promise<string> {
    try {
      const { integrity, path } = await cacache.get.info(CACHE_DIR, key);
      if (integrity === `md5-${Buffer.from(md5, "hex").toString("base64")}`) {
        return join(__dirname, path);
      }
      cacache.rm.entry(CACHE_DIR, key);
      return "";
    } catch {
      return "";
    }
  }

  static async put(key: string, path: string): Promise<void> {
    await cacache.put(CACHE_DIR, key, readFileSync(path), {
      algorithms: ["md5"],
    });
  }
}
