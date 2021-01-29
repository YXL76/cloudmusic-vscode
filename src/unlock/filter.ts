import type { SongsItem, UnlockSongItem } from "../constant";

export default function filter(list: UnlockSongItem[], song: SongsItem) {
  let newList = list.filter(({ name }) => name === song.name);
  if (newList.length > 0) {
    list = newList;
  }

  newList = list.filter(({ album }) => song.al.name === album);
  if (newList.length > 0) {
    list = newList;
  }

  newList = list.filter(({ artist }) =>
    song.ar.map(({ name }) => artist.includes(name)).includes(true)
  );
  if (newList.length > 0) {
    list = newList;
  }

  newList = list.filter(({ dt }) => Math.abs(dt - song.dt) < 10000);

  return (newList.length > 0 ? newList : list).shift();
}
