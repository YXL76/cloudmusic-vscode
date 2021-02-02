import { AccountManager, ButtonManager } from "../manager";
import type {
  AlbumsItem,
  Artist,
  PlaylistItem,
  SongsItem,
  UserDetail,
} from "../constant";
import { ButtonAction, MusicCache, Player, WebView } from ".";
import {
  CommentType,
  apiAlbum,
  apiAlbumSub,
  apiArtistAlbum,
  apiArtistSongs,
  apiArtistSub,
  apiArtists,
  apiLike,
  apiPlaylistDetail,
  apiPlaylistSubscribe,
  apiPlaylistSubscribers,
  apiPlaylistTracks,
  apiSimiArtist,
  apiSimiPlaylist,
  apiSimiSong,
  apiSongUrl,
  apiUserDetail,
  apiUserFolloweds,
  apiUserFollows,
  apiUserPlaylist,
} from "../api";
import { ICON, MUSIC_QUALITY, TMP_DIR } from "../constant";
import type { InputStep, MultiStepInput } from ".";
import { IsLike, Loading, PersonalFm, Playing } from "../state";
import {
  LocalFileTreeItem,
  PlaylistProvider,
  QueueItemTreeItem,
  QueueProvider,
} from "../treeview";
import { Uri, commands, window } from "vscode";
import type { ProgramTreeItem } from "../treeview";
import type { QuickPickItem } from "vscode";
import type { Readable } from "stream";
import axios from "axios";
import { createWriteStream } from "fs";
import { i18n } from "../i18n";

const minSize = MUSIC_QUALITY === 999000 ? 2 * 1024 * 1024 : 256 * 1024;

export async function downloadMusic(
  url: string,
  filename: string,
  path: Uri,
  cache: boolean,
  md5?: string
) {
  try {
    const { data } = await axios.get<Readable>(url, {
      responseType: "stream",
      timeout: 8000,
    });

    if (cache) {
      data.on("end", () => void MusicCache.put(filename, path, md5));
    }

    return data;
  } catch (err) {
    console.error(err);
    void window.showErrorMessage(i18n.sentence.error.network);
  }
  return;
}

export function stop() {
  Player.stop();
  Player.item = {} as SongsItem;
  Playing.set(false);
  ButtonManager.buttonSong();
  ButtonManager.buttonLyric();
}

export async function load(
  element: QueueItemTreeItem | LocalFileTreeItem | ProgramTreeItem
) {
  Loading.set(true);
  if (element instanceof LocalFileTreeItem) {
    Player.load(element.tooltip, 0, {
      name: element.label,
      id: 0,
      dt: 4800000,
      alia: [],
      ar: [],
      al: { id: 0, name: "", picUrl: "" },
    });
    return;
  }

  const { pid, item } = element;
  const { id } = item;
  const idS = `${id}`;

  const path = await MusicCache.get(idS);
  if (path) {
    Player.load(path, pid, item);
    return;
  }

  const { url, md5 } = await apiSongUrl(item);
  if (!url) {
    void commands.executeCommand("cloudmusic.next");
    return;
  }

  const tmpUri = Uri.joinPath(TMP_DIR, idS);
  const data = await downloadMusic(url, idS, tmpUri, !PersonalFm.get(), md5);
  if (data) {
    let len = 0;
    const onData = ({ length }: { length: number }) => {
      len += length;
      if (len > minSize) {
        data.removeListener("data", onData);
        Player.load(tmpUri.fsPath, pid, item);
      }
    };
    data.on("data", onData);
    data.once("error", (err) => {
      console.error(err);
      void window.showErrorMessage(i18n.sentence.error.network);
      void commands.executeCommand("cloudmusic.next");
    });
    const file = createWriteStream(tmpUri.fsPath);
    data.pipe(file);
  }
}

export async function confirmation(
  input: MultiStepInput,
  step: number,
  action: () => Promise<any>
): Promise<InputStep | undefined> {
  const i = await input.showInputBox({
    title: i18n.word.confirmation,
    step,
    prompt: i18n.sentence.hint.confirmation,
  });
  if (i.toLowerCase() === "yes") {
    await action();
  }
  input.pop();
  return input.pop();
}

export function splitLine(content: string) {
  return `>>>>>>>>        ${content.toUpperCase()}        <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<`;
}

const enum PickType {
  artist,
  album,
  albums,
  like,
  add,
  save,
  unsave,
  similar,
  song,
  songs,
  playlist,
  subscribed,
  user,
  followeds,
  follows,
  comment,
  copy,
  download,
}
interface T extends QuickPickItem {
  id: number;
  type: PickType;
}

interface ST extends T {
  item: SongsItem;
}

export const pickSongItems = (songs: SongsItem[]): ST[] =>
  songs.map((item) => ({
    label: `${ICON.song} ${item.name}`,
    description: item.ar.map((i) => i.name).join("/"),
    detail: item.alia.join("/"),
    id: item.id,
    item,
    type: PickType.song,
  }));

export const pickArtistItems = (ars: { id: number; name: string }[]): T[] =>
  ars.map(({ name, id }) => ({
    label: `${ICON.artist} ${name}`,
    id,
    type: PickType.artist,
  }));

export const pickAlbumItems = (albums: AlbumsItem[]): T[] =>
  albums.map(({ name, alias, artists, id }) => ({
    label: `${ICON.album} ${name}`,
    description: alias.join("/"),
    detail: artists.map((artist) => artist.name).join("/"),
    id,
    type: PickType.album,
  }));

interface PT extends T {
  item: PlaylistItem;
}

export const pickPlaylistItems = (playlists: PlaylistItem[]): PT[] =>
  playlists.map((playlist) => ({
    label: `${ICON.playlist} ${playlist.name}`,
    description: `${playlist.trackCount}`,
    detail: playlist.description || "",
    id: playlist.id,
    item: playlist,
    type: PickType.playlist,
  }));

export const pickUserDetails = (users: UserDetail[]): T[] =>
  users.map((user) => ({
    label: `${ICON.artist} ${user.nickname}`,
    detail: user.signature,
    id: user.userId,
    type: PickType.user,
  }));

export async function pickSong(
  input: MultiStepInput,
  step: number,
  item: SongsItem
): Promise<InputStep> {
  const { name, alia, ar, al, id } = item;

  const pick = await input.showQuickPick({
    title: `${i18n.word.song}-${i18n.word.detail}`,
    step,
    items: [
      {
        label: `${ICON.name} ${name}`,
        detail: alia.join("/"),
      },
      {
        label: `${ICON.copy} ${i18n.word.copyLink}`,
        type: PickType.copy,
      },
      {
        label: `${ICON.download} ${i18n.word.download}`,
        type: PickType.download,
      },
      ...pickArtistItems(ar),
      {
        label: `${ICON.album} ${i18n.word.album}`,
        detail: al.name,
        id: al.id,
        type: PickType.album,
      },
      {
        label: `${ICON.like} ${i18n.word.like}`,
        type: PickType.like,
      },
      {
        label: `${ICON.comment} ${i18n.word.comment}`,
        type: PickType.comment,
      },
      {
        label: `${ICON.add} ${i18n.word.addToQueue}`,
        type: PickType.add,
      },
      {
        label: `${ICON.save} ${i18n.word.saveToPlaylist}`,
        type: PickType.save,
      },
      {
        label: `${ICON.similar} ${i18n.word.similarSongs}`,
        type: PickType.similar,
      },
      {
        label: `${ICON.similar} ${i18n.word.similarPlaylists}`,
        type: PickType.similar,
      },
    ],
  });
  switch (pick.type) {
    case PickType.copy:
      void commands.executeCommand("cloudmusic.copySongLink", { item });
      break;
    case PickType.download:
      void commands.executeCommand("cloudmusic.downloadSong", { item });
      break;
    case PickType.album:
      return (input: MultiStepInput) =>
        pickAlbum(input, step + 1, (pick as T).id);
    case PickType.artist:
      return (input: MultiStepInput) =>
        pickArtist(input, step + 1, (pick as T).id);
    case PickType.save:
      return (input: MultiStepInput) => pickAddToPlaylist(input, step + 1, id);
    case PickType.similar:
      if (pick.label === `${ICON.similar} ${i18n.word.similarSongs}`) {
        return (input: MultiStepInput) => pickSimiSong(input, step + 1, id, 0);
      }
      return (input: MultiStepInput) =>
        pickSimiPlaylists(input, step + 1, id, 0);
    case PickType.comment:
      WebView.getInstance().commentList(CommentType.song, id, name);
      break;
    case PickType.like:
      if (await apiLike(id, true)) {
        AccountManager.likelist.add(id);
        IsLike.set(id === Player.item.id);
      }
      break;
    case PickType.add:
      const element = new QueueItemTreeItem(item, 0);
      void commands.executeCommand("cloudmusic.addSong", element);
  }

  return input.pop() as InputStep;
}

export async function pickSongMany(
  input: MultiStepInput,
  step: number,
  songs: SongsItem[]
): Promise<InputStep> {
  const pick = await input.showQuickPick({
    title: i18n.word.song,
    step,
    items: [
      {
        label: `${ICON.add} ${i18n.word.addToQueue}`,
        type: PickType.add,
      },
    ],
  });
  if (pick.type === PickType.add) {
    QueueProvider.refresh(() =>
      QueueProvider.add(songs.map((song) => new QueueItemTreeItem(song, 0)))
    );
  }
  input.pop();
  return input.pop() as InputStep;
}

async function pickSimiSong(
  input: MultiStepInput,
  step: number,
  id: number,
  offset: number
): Promise<InputStep> {
  const limit = 50;
  const songs = await apiSimiSong(id, limit, offset);
  const pick = await input.showQuickPick(
    {
      title: i18n.word.similarSongs,
      step,
      items: pickSongItems(songs),
    },
    true,
    {
      previous: offset > 0,
      next: songs.length === limit,
    }
  );
  if (pick === ButtonAction.previous) {
    input.pop();
    return (input: MultiStepInput) =>
      pickSimiSong(input, step, id, offset - limit);
  }
  if (pick === ButtonAction.next) {
    input.pop();
    return (input: MultiStepInput) =>
      pickSimiSong(input, step, id, offset + limit);
  }
  if (pick.length === 0) {
    return input.pop() as InputStep;
  }
  if (pick.length === 1) {
    return (input: MultiStepInput) => pickSong(input, step + 1, pick[0].item);
  }
  return (input: MultiStepInput) =>
    pickSongMany(
      input,
      step + 1,
      pick.map(({ item }) => item)
    );
}

export async function pickSongs(
  input: MultiStepInput,
  step: number,
  songs: SongsItem[]
): Promise<InputStep> {
  const pick = await input.showQuickPick(
    {
      title: i18n.word.song,
      step,
      items: pickSongItems(songs),
    },
    true
  );
  if (pick.length === 0) {
    return input.pop() as InputStep;
  }
  if (pick.length === 1) {
    return (input: MultiStepInput) => pickSong(input, step + 1, pick[0].item);
  }
  return (input: MultiStepInput) =>
    pickSongMany(
      input,
      step + 1,
      pick.map(({ item }) => item)
    );
}

export async function pickArtist(
  input: MultiStepInput,
  step: number,
  id: number
): Promise<InputStep> {
  const { info, songs } = await apiArtists(id);

  const { name, alias, briefDesc, albumSize, musicSize } = info;
  const pick = await input.showQuickPick({
    title: `${i18n.word.artist}-${i18n.word.detail}`,
    step,
    items: [
      {
        label: `${ICON.name} ${name}`,
        detail: alias.join("/"),
      },
      {
        label: `${ICON.description} ${i18n.word.description}`,
        detail: briefDesc,
      },
      {
        label: `${ICON.album} ${i18n.word.album}`,
        description: `${albumSize}`,
        id,
        type: PickType.albums,
      },
      {
        label: `${ICON.number} ${i18n.word.trackCount}`,
        description: `${musicSize}`,
        id,
        type: PickType.songs,
      },
      {
        label: `${ICON.similar} ${i18n.word.similarArtists}`,
        type: PickType.similar,
      },
      {
        label: `${ICON.save} ${i18n.word.save}`,
        type: PickType.save,
      },
      {
        label: `${ICON.unsave} ${i18n.word.unsave}`,
        type: PickType.unsave,
      },
      {
        label: splitLine(i18n.word.hotSongs),
      },
      ...pickSongItems(songs),
    ],
  });
  switch (pick.type) {
    case PickType.albums:
      return async (input: MultiStepInput) =>
        pickAlbums(input, step + 1, await apiArtistAlbum(pick.id as number));
    case PickType.song:
      return (input: MultiStepInput) =>
        pickSong(input, step + 1, (pick as ST).item);
    case PickType.songs:
      return (input: MultiStepInput) => pickAllSongs(input, step + 1, id, 0);
    case PickType.similar:
      return async (input: MultiStepInput) =>
        pickArtists(input, step + 1, await apiSimiArtist(id));
    case PickType.unsave:
      return (input: MultiStepInput) =>
        confirmation(
          input,
          step + 1,
          async () => await apiArtistSub(id, "unsub")
        );
    case PickType.save:
      await apiArtistSub(id, "sub");
  }

  return input.pop() as InputStep;

  async function pickAllSongs(
    input: MultiStepInput,
    step: number,
    id: number,
    offset: number
  ): Promise<InputStep> {
    const limit = 100;
    const songs = await apiArtistSongs(id, limit, offset);
    const pick = await input.showQuickPick(
      {
        title: i18n.word.song,
        step,
        items: pickSongItems(songs),
      },
      true,
      {
        previous: offset > 0,
        next: songs.length === limit,
      }
    );
    if (pick === ButtonAction.previous) {
      input.pop();
      return (input: MultiStepInput) =>
        pickAllSongs(input, step, id, offset - limit);
    }
    if (pick === ButtonAction.next) {
      input.pop();
      return (input: MultiStepInput) =>
        pickAllSongs(input, step, id, offset + limit);
    }
    if (pick.length === 0) {
      return input.pop() as InputStep;
    }
    if (pick.length === 1) {
      return (input: MultiStepInput) => pickSong(input, step + 1, pick[0].item);
    }
    return (input: MultiStepInput) =>
      pickSongMany(
        input,
        step + 1,
        pick.map(({ item }) => item)
      );
  }
}

export async function pickArtists(
  input: MultiStepInput,
  step: number,
  artists: Artist[]
): Promise<InputStep> {
  const pick = await input.showQuickPick({
    title: i18n.word.artist,
    step,
    items: pickArtistItems(artists),
  });
  return (input: MultiStepInput) => pickArtist(input, step + 1, pick.id);
}

export async function pickAlbum(
  input: MultiStepInput,
  step: number,
  id: number
): Promise<InputStep> {
  const { info, songs } = await apiAlbum(id);

  const { artists, alias, company, description, name } = info;
  const pick = await input.showQuickPick({
    title: `${i18n.word.album}-${i18n.word.detail}`,
    step,
    items: [
      {
        label: `${ICON.name} ${name}`,
        description: alias.join("/"),
        detail: company,
      },
      {
        label: `${ICON.description} ${i18n.word.description}`,
        detail: description,
      },
      {
        label: `${ICON.comment} ${i18n.word.comment}`,
        type: PickType.comment,
      },
      ...pickArtistItems(artists),
      {
        label: `${ICON.save} ${i18n.word.save}`,
        type: PickType.save,
      },
      {
        label: `${ICON.unsave} ${i18n.word.unsave}`,
        type: PickType.unsave,
      },
      {
        label: splitLine(i18n.word.content),
      },
      ...pickSongItems(songs),
    ],
  });
  switch (pick.type) {
    case PickType.artist:
      return (input: MultiStepInput) =>
        pickArtist(input, step + 1, (pick as T).id);
    case PickType.song:
      return (input: MultiStepInput) =>
        pickSong(input, step + 1, (pick as ST).item);
    case PickType.unsave:
      return (input: MultiStepInput) =>
        confirmation(
          input,
          step + 1,
          async () => await apiAlbumSub(id, "unsub")
        );
    case PickType.comment:
      WebView.getInstance().commentList(CommentType.album, id, name);
      break;
    case PickType.save:
      await apiAlbumSub(id, "sub");
  }

  return input.pop() as InputStep;
}

export async function pickAlbums(
  input: MultiStepInput,
  step: number,
  albums: AlbumsItem[]
): Promise<InputStep> {
  const pick = await input.showQuickPick({
    title: i18n.word.album,
    step,
    items: pickAlbumItems(albums),
  });
  return (input: MultiStepInput) => pickAlbum(input, step + 1, pick.id);
}

export async function pickPlaylist(
  input: MultiStepInput,
  step: number,
  item: PlaylistItem
): Promise<InputStep> {
  const {
    id,
    name,
    description,
    playCount,
    subscribedCount,
    trackCount,
    creator,
  } = item;
  const songs = await apiPlaylistDetail(id);
  const pick = await input.showQuickPick({
    title: i18n.word.playlist,
    step,
    items: [
      {
        label: `${ICON.name} ${name}`,
      },
      {
        label: `${ICON.description} ${i18n.word.description}`,
        detail: description || "",
      },
      {
        label: `${ICON.copy} ${i18n.word.copyLink}`,
        type: PickType.copy,
      },
      {
        label: `${ICON.comment} ${i18n.word.comment}`,
        type: PickType.comment,
      },
      ...(playCount
        ? [
            {
              label: `${ICON.number} ${i18n.word.playCount}`,
              description: `${playCount}`,
            },
          ]
        : []),
      ...(subscribedCount
        ? [
            {
              label: `${ICON.number} ${i18n.word.subscribedCount}`,
              description: `${subscribedCount}`,
              type: PickType.subscribed,
            },
          ]
        : []),
      ...(trackCount
        ? [
            {
              label: `${ICON.number} ${i18n.word.trackCount}`,
              description: `${trackCount}`,
            },
          ]
        : []),
      ...pickUserDetails([creator]),
      {
        label: `${ICON.add} ${i18n.word.addToQueue}`,
        type: PickType.add,
      },
      {
        label: `${ICON.save} ${i18n.word.save}`,
        type: PickType.save,
      },
      {
        label: splitLine(i18n.word.content),
      },
      ...pickSongItems(songs),
    ],
  });
  switch (pick.type) {
    case PickType.copy:
      void commands.executeCommand("cloudmusic.copyPlaylistLink", { item });
      break;
    case PickType.song:
      return (input: MultiStepInput) =>
        pickSong(input, step + 1, (pick as ST).item);
    case PickType.subscribed:
      return (input: MultiStepInput) =>
        pickUsers(input, step + 1, apiPlaylistSubscribers, true, 0, id);
    case PickType.user:
      return (input: MultiStepInput) =>
        pickUser(input, step + 1, (pick as T).id);
    case PickType.add:
      QueueProvider.refresh(() =>
        QueueProvider.add(songs.map((song) => new QueueItemTreeItem(song, id)))
      );
      break;
    case PickType.comment:
      WebView.getInstance().commentList(CommentType.playlist, id, name);
      break;
    case PickType.save:
      await apiPlaylistSubscribe(id, "subscribe");
  }
  return input.pop() as InputStep;
}

async function pickSimiPlaylists(
  input: MultiStepInput,
  step: number,
  id: number,
  offset: number
): Promise<InputStep> {
  const limit = 50;
  const playlists = await apiSimiPlaylist(id, limit, offset);
  const pick = await input.showQuickPick(
    {
      title: i18n.word.similarPlaylists,
      step,
      items: pickPlaylistItems(playlists),
    },
    undefined,
    {
      previous: offset > 0,
      next: playlists.length === limit,
    }
  );
  if (pick === ButtonAction.previous) {
    input.pop();
    return (input: MultiStepInput) =>
      pickSimiPlaylists(input, step, id, offset - limit);
  }
  if (pick === ButtonAction.next) {
    input.pop();
    return (input: MultiStepInput) =>
      pickSimiPlaylists(input, step, id, offset + limit);
  }
  return (input: MultiStepInput) => pickPlaylist(input, step + 1, pick.item);
}

export async function pickPlaylists(
  input: MultiStepInput,
  step: number,
  items: PlaylistItem[]
): Promise<InputStep> {
  const pick = await input.showQuickPick({
    title: i18n.word.playlist,
    step,
    items: pickPlaylistItems(items),
  });
  return (input: MultiStepInput) => pickPlaylist(input, step + 1, pick.item);
}

export async function pickAddToPlaylist(
  input: MultiStepInput,
  step: number,
  id: number
): Promise<InputStep | undefined> {
  const lists = await AccountManager.userPlaylist();
  const pick = await input.showQuickPick({
    title: i18n.word.saveToPlaylist,
    step,
    items: lists.map(({ name, id }) => ({
      label: `${ICON.playlist} ${name}`,
      id,
    })),
  });
  if (await apiPlaylistTracks("add", pick.id, [id])) {
    PlaylistProvider.refresh(PlaylistProvider.playlists.get(pick.id));
  }
  input.pop();
  return input.pop();
}

export async function pickUser(
  input: MultiStepInput,
  step: number,
  uid: number
): Promise<InputStep> {
  const user = await apiUserDetail(uid);
  if (!user) {
    input.pop();
    return input.pop() as InputStep;
  }
  const playlists = await apiUserPlaylist(uid);
  const pick = await input.showQuickPick({
    title: i18n.word.user,
    step,
    items: [
      {
        label: `${ICON.artist} ${user.nickname}`,
        detail: user.signature,
        item: 0,
      },
      {
        label: `${ICON.number} ${i18n.word.followeds}`,
        description: `${user.followeds}`,
        type: PickType.followeds,
        item: 0,
      },
      {
        label: `${ICON.number} ${i18n.word.follows}`,
        description: `${user.follows}`,
        type: PickType.follows,
        item: 0,
      },
      {
        label: splitLine(i18n.word.playlist),
        item: 0,
      },
      ...pickPlaylistItems(
        playlists.filter((playlist) => playlist.creator.userId === uid)
      ),
      {
        label: splitLine(i18n.word.saved),
        item: 0,
      },
      ...pickPlaylistItems(
        playlists.filter((playlist) => playlist.creator.userId !== uid)
      ),
    ],
  });
  switch (pick.type) {
    case PickType.followeds:
      return (input: MultiStepInput) =>
        pickUsers(input, step + 1, apiUserFolloweds, false, 0, uid);
    case PickType.follows:
      return (input: MultiStepInput) =>
        pickUsers(input, step + 1, apiUserFollows, true, 0, uid);
    case PickType.playlist:
      return (input: MultiStepInput) =>
        pickPlaylist(input, step + 1, pick.item as PlaylistItem);
  }
  return input.pop() as InputStep;
}

const limit = 50;

export async function pickUsers(
  input: MultiStepInput,
  step: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  func: (...args: any[]) => Promise<UserDetail[]>,
  pagination: boolean,
  offset: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
): Promise<InputStep> {
  const users = await func(...args, limit, offset);
  const pick = await input.showQuickPick(
    {
      title: i18n.word.user,
      step,
      items: pickUserDetails(users),
    },
    undefined,
    {
      previous: offset > 0,
      next: users.length === limit,
    }
  );
  if (pick === ButtonAction.previous) {
    input.pop();
    return (input: MultiStepInput) =>
      pickUsers(input, step, func, pagination, offset - limit, args);
  }
  if (pick === ButtonAction.next) {
    input.pop();
    return (input: MultiStepInput) =>
      pickUsers(input, step, func, pagination, offset + limit, args);
  }
  return (input: MultiStepInput) => pickUser(input, step + 1, pick.id);
}
