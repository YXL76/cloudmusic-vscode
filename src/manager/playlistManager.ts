import { QueueItem } from "../constant/type";
import {
  apiPlaylistDetail,
  apiPlaymodeIntelligenceList,
  apiSongDetail,
  apiSongUrl,
} from "../util/api";

export class PlaylistManager {
  static async tracks(id: number): Promise<QueueItem[]> {
    return await apiSongDetail(await apiPlaylistDetail(id));
  }

  static async tracksIntelligence(
    id: number,
    pid: number
  ): Promise<QueueItem[]> {
    return await apiPlaymodeIntelligenceList(id, pid);
  }

  static async trackUrls(id: number[]): Promise<string[]> {
    const items = await apiSongUrl(id);
    return items.map((item) => item.url);
  }
}
