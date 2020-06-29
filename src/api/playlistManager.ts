import { AccountManager } from "./accountManager";
import { QueueItem } from "../constant/type";
import {
  API_playlistDetail,
  API_playmodeIntelligenceList,
  API_songDetail,
} from "../util/api";

export class PlaylistManager {
  private static instance: PlaylistManager;
  private accountManager: AccountManager = AccountManager.getInstance();

  constructor() {}

  static getInstance(): PlaylistManager {
    return this.instance
      ? this.instance
      : (this.instance = new PlaylistManager());
  }

  async tracks(id: number): Promise<QueueItem[]> {
    return await API_songDetail(
      await API_playlistDetail(id, this.accountManager.cookie),
      this.accountManager.cookie
    );
  }

  async tracksIntelligence(id: number, pid: number): Promise<QueueItem[]> {
    return await API_playmodeIntelligenceList(
      id,
      pid,
      this.accountManager.cookie
    );
  }
}
