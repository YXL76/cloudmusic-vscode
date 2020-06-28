import { PlaylistContent } from "../constant/type";
import { API_playlistDetail, API_songDetail } from "../util/api";

export class PlaylistManager {
  private static instance: PlaylistManager;

  constructor() {}

  static getInstance(): PlaylistManager {
    return this.instance
      ? this.instance
      : (this.instance = new PlaylistManager());
  }

  async tracks(id: number): Promise<PlaylistContent[]> {
    return await API_songDetail(await API_playlistDetail(id));
  }
}
