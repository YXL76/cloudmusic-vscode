import { QueueItem } from "../constant/type";
import {
  API_playlistDetail,
  API_playmodeIntelligenceList,
  API_songDetail,
  API_songUrl,
} from "../util/api";

export class PlaylistManager {
  constructor() {}

  static async tracks(id: number): Promise<QueueItem[]> {
    return await API_songDetail(await API_playlistDetail(id));
  }

  static async tracksIntelligence(
    id: number,
    pid: number
  ): Promise<QueueItem[]> {
    return await API_playmodeIntelligenceList(id, pid);
  }

  static async trackUrls(id: number[]): Promise<Map<number, string>> {
    return await API_songUrl(id);
  }
}
