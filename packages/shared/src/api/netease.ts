export const enum NeteaseArtistArea {
  all = "-1",
  zh = "7",
  ea = "96",
  ja = "8",
  kr = "16",
  other = "0",
}

export const enum NeteaseArtistType {
  male = "1",
  female = "2",
  band = "3",
}

export const enum NeteaseCommentType {
  song = 0,
  mv = 1,
  playlist = 2,
  album = 3,
  dj = 4,
  video = 5,
  event = 6,
}

export const enum NeteaseCommentAction {
  add = 1,
  delete = 0,
  reply = 2,
}

export const enum NeteaseSearchType {
  single = 1,
  album = 10,
  artist = 100,
  playlist = 1000,
  user = 1002,
  mv = 1004,
  lyric = 1006,
  dj = 1009,
  video = 1014,
  complex = 1018,
  sound = 2000,
}

export const enum NeteaseSortType {
  recommendation = 99,
  hottest = 2,
  latest = 3,
}

export const enum NeteaseTopSongType {
  all = 0,
  zh = 7,
  ea = 96,
  kr = 16,
  ja = 8,
}
