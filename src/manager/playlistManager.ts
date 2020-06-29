import { AccountManager } from "./accountManager";
import { QueueItem } from "../constant/type";
import {
  API_playlistDetail,
  API_playmodeIntelligenceList,
  API_songDetail,
  API_songUrl,
} from "../util/api";

export class PlaylistManager {
  private static accountManager: AccountManager = AccountManager.getInstance();

  constructor() {}

  static async tracks(id: number): Promise<QueueItem[]> {
    return await API_songDetail(
      await API_playlistDetail(id, this.accountManager.cookie),
      this.accountManager.cookie
    );
  }

  static async tracksIntelligence(
    id: number,
    pid: number
  ): Promise<QueueItem[]> {
    return await API_playmodeIntelligenceList(
      id,
      pid,
      this.accountManager.cookie
    );
  }

  static async trackUrl(id: number): Promise<string> {
    return (await API_songUrl([id], this.accountManager.cookie))[0];
  }

  static async trackUrls(id: number[]): Promise<string[]> {
    return await API_songUrl(id, this.accountManager.cookie);
  }
}
