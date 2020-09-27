export type SongsItem = {
  name: string;
  id: number;
  dt: number;
  alia: string[];
  ar: { id: number; name: string }[];
  al: { id: number; name: string; picUrl: string };
};

export type RecordData = SongsItem & { playCount: number };
