import { ButtonAction, IPC, Webview } from "./index.js";
import type { InputStep, MultiStepInput } from "./index.js";
import { ProgramTreeItem, QueueItemTreeItem } from "../treeview/index.js";
import { commands, window } from "vscode";
import { AccountManager } from "../manager/index.js";
import { NeteaseCommentType } from "@cloudmusic/shared";
import type { NeteaseTypings } from "api";
import type { QuickPickItem } from "vscode";
import i18n from "../i18n/index.js";

export async function likeMusic(input: MultiStepInput, step: number, id: number): Promise<InputStep> {
  const title = i18n.word.like;
  const accounts = [...AccountManager.accounts].map(([uid, { nickname: name }]) => ({ uid, name }));

  const items = (await Promise.allSettled(accounts.map(({ uid }) => IPC.netease("likelist", [uid])))).map((res, i) => {
    const { uid, name } = accounts[i];
    return res.status === "fulfilled" && res.value.includes(id)
      ? { label: `$(star-empty) ${name}`, uid, like: false }
      : { label: `$(star-full) ${name}`, uid, like: true };
  });
  const { uid, like } = await input.showQuickPick({ title, step, items });
  if (await IPC.netease("like", [uid, id, like])) {
    IPC.deleteCache(`likelist${uid}`);
    void window.showInformationMessage(like ? i18n.word.liked : i18n.word.unliked);
  } else void window.showErrorMessage(i18n.sentence.fail.addToPlaylist);
  return input.stay();
}

const enum PickType {
  description,
  artist,
  album,
  albums,
  like,
  add,
  next,
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
  mv,
  copy,
  download,
  program,
  programs,
  radio,
  hot,
}
interface T extends QuickPickItem {
  id: number;
  type: PickType;
}

interface ST extends T {
  item: NeteaseTypings.SongsItem;
}

export const pickSongItems = (songs: readonly NeteaseTypings.SongsItem[]): readonly ST[] =>
  songs.map((item) => ({
    label: `$(zap) ${item.name}`,
    description: item.ar.map(({ name }) => name).join("/"),
    detail: item.alia.join("/"),
    id: item.id,
    item,
    type: PickType.song,
  }));

export const pickArtistItems = (ars: readonly { id: number; name: string }[]): readonly T[] =>
  ars.map(({ name, id }) => ({
    label: `$(account) ${name}`,
    id,
    type: PickType.artist,
  }));

export const pickAlbumItems = (albums: readonly NeteaseTypings.AlbumsItem[]): readonly T[] =>
  albums.map(({ name, alias, artists, id }) => ({
    label: `$(circuit-board) ${name}`,
    description: alias.join("/"),
    detail: artists.map((artist) => artist.name).join("/"),
    id,
    type: PickType.album,
  }));

interface PT extends T {
  item: NeteaseTypings.PlaylistItem;
}

export const pickPlaylistItems = (playlists: readonly NeteaseTypings.PlaylistItem[]): readonly PT[] =>
  playlists.map((playlist) => ({
    label: `$(list-unordered) ${playlist.name}`,
    description: `${playlist.trackCount}`,
    detail: playlist.description || "",
    id: playlist.id,
    item: playlist,
    type: PickType.playlist,
  }));

export const pickUserDetails = (users: readonly NeteaseTypings.UserDetail[]): readonly T[] =>
  users.map(({ nickname, signature, userId }) => ({
    label: `$(account) ${nickname}`,
    detail: signature,
    id: userId,
    type: PickType.user,
  }));

interface RDT extends T {
  item: NeteaseTypings.RadioDetail;
}

export const pickRadioDetails = (radios: readonly NeteaseTypings.RadioDetail[]): readonly RDT[] =>
  radios.map((item) => ({
    label: `$(rss) ${item.name}`,
    description: item.dj.nickname,
    id: item.id,
    item,
    type: PickType.radio,
  }));

interface PDT extends T {
  item: NeteaseTypings.ProgramDetail;
}

export const pickProgramDetails = (programs: readonly NeteaseTypings.ProgramDetail[]): readonly PDT[] =>
  programs.map((item) => ({
    label: `$(radio-tower) ${item.mainSong.name}`,
    description: item.mainSong.ar.map(({ name }) => name).join("/"),
    id: item.id,
    item,
    type: PickType.program,
  }));

export async function pickSong(
  input: MultiStepInput,
  step: number,
  item: NeteaseTypings.SongsItem,
): Promise<InputStep> {
  const { name, alia, ar, al, id } = item;

  const pick = await input.showQuickPick({
    title: `${i18n.word.song}-${i18n.word.detail}`,
    step,
    items: [
      { label: `$(code) ${name}`, detail: alia.join("/") },
      { label: `$(link) ${i18n.word.copyLink}`, type: PickType.copy },
      { label: `$(cloud-download) ${i18n.word.download}`, type: PickType.download },
      ...pickArtistItems(ar),
      { label: `$(circuit-board) ${i18n.word.album}`, detail: al.name, id: al.id, type: PickType.album },
      { label: `$(heart) ${i18n.word.like}`, type: PickType.like },
      { label: `$(comment) ${i18n.word.comment}`, type: PickType.comment },
      ...(item.mv ? [{ label: `$(device-camera) MV`, type: PickType.mv }] : []),
      { label: `$(add) ${i18n.word.addToQueue}`, type: PickType.add },
      { label: `$(play) ${i18n.word.nextTrack}`, type: PickType.next },
      { label: `$(diff-added) ${i18n.word.saveToPlaylist}`, type: PickType.save },
      { label: `$(library) ${i18n.word.similarSongs}`, type: PickType.similar },
      { label: `$(library) ${i18n.word.similarPlaylists}`, type: PickType.similar },
    ],
  });
  switch (pick.type) {
    case PickType.copy:
      void commands.executeCommand("cloudmusic.copySongLink", { data: item });
      break;
    case PickType.download:
      void commands.executeCommand("cloudmusic.downloadSong", { item, valueOf: id });
      break;
    case PickType.album:
      return (input) => pickAlbum(input, step + 1, (<T>pick).id);
    case PickType.artist:
      return (input) => pickArtist(input, step + 1, (<T>pick).id);
    case PickType.save:
      return (input) => pickAddToPlaylist(input, step + 1, id);
    case PickType.similar:
      if (pick.label === `$(library) ${i18n.word.similarSongs}`) {
        return (input) => pickSimiSong(input, step + 1, id, 0);
      }
      return (input) => pickSimiPlaylists(input, step + 1, id, 0);
    case PickType.comment:
      Webview.comment(NeteaseCommentType.song, id, name);
      break;
    case PickType.mv:
      if (item.mv) await Webview.video(item.mv);
      break;
    case PickType.like:
      return (input) => likeMusic(input, step + 1, id);
    case PickType.add:
      void commands.executeCommand(
        "cloudmusic.addSong",
        QueueItemTreeItem.new({ ...item, pid: item.al.id, itemType: "q" }),
      );
      break;
    case PickType.next:
      void commands.executeCommand(
        "cloudmusic.playNext",
        QueueItemTreeItem.new({ ...item, pid: item.al.id, itemType: "q" }),
      );
      break;
  }

  return input.stay();
}

export async function pickSongMany(
  input: MultiStepInput,
  step: number,
  songs: readonly NeteaseTypings.SongsItem[],
): Promise<InputStep> {
  const pick = await input.showQuickPick({
    title: i18n.word.song,
    step,
    items: [
      { label: `$(add) ${i18n.word.addToQueue}`, type: PickType.add },
      { label: `$(play) ${i18n.word.nextTrack}`, type: PickType.next },
    ],
  });
  IPC.add(
    songs.map((song) => QueueItemTreeItem.new({ ...song, pid: song.al.id, itemType: "q" }).data),
    pick.type === PickType.add ? undefined : 1,
  );
  return input.stay();
}

async function pickSimiSong(input: MultiStepInput, step: number, id: number, offset: number): Promise<InputStep> {
  const limit = 50;
  const songs = await IPC.netease("simiSong", [id, limit, offset]);
  const pick = await input.showQuickPick({
    title: i18n.word.similarSongs,
    step,
    items: pickSongItems(songs),
    canSelectMany: true,
    previous: offset > 0,
    next: songs.length === limit,
  });
  if (pick === ButtonAction.previous) return input.stay((input) => pickSimiSong(input, step, id, offset - limit));
  if (pick === ButtonAction.next) return input.stay((input) => pickSimiSong(input, step, id, offset + limit));
  if (pick.length === 0) return input.stay();
  if (pick.length === 1) return (input) => pickSong(input, step + 1, pick[0].item);

  return (input) =>
    pickSongMany(
      input,
      step + 1,
      pick.map(({ item }) => item),
    );
}

export async function pickSongs(
  input: MultiStepInput,
  step: number,
  songs: readonly NeteaseTypings.SongsItem[],
): Promise<InputStep> {
  const pick = await input.showQuickPick({
    title: i18n.word.song,
    step,
    items: pickSongItems(songs),
    canSelectMany: true,
  });
  if (pick.length === 0) return input.stay();
  if (pick.length === 1) return (input) => pickSong(input, step + 1, pick[0].item);

  return (input) =>
    pickSongMany(
      input,
      step + 1,
      pick.map(({ item }) => item),
    );
}

export async function pickProgram(
  input: MultiStepInput,
  step: number,
  program: NeteaseTypings.ProgramDetail,
): Promise<InputStep> {
  const { mainSong, dj, id, rid } = program;
  const { name } = mainSong;
  const radio = await IPC.netease("djDetail", [rid]);

  const pick = await input.showQuickPick({
    title: `${i18n.word.program}-${i18n.word.detail}`,
    step,
    items: [
      { label: `$(code) ${name}` },
      { label: `$(link) ${i18n.word.copyLink}`, type: PickType.copy },
      { label: `$(cloud-download) ${i18n.word.download}`, type: PickType.download },
      ...pickUserDetails([dj]),
      ...pickRadioDetails(radio ? [radio] : []),
      { label: `$(comment) ${i18n.word.comment}`, type: PickType.comment },
      { label: `$(add) ${i18n.word.addToQueue}`, type: PickType.add },
      { label: `$(play) ${i18n.word.nextTrack}`, type: PickType.next },
    ],
  });
  switch (pick.type) {
    case PickType.copy:
      void commands.executeCommand("cloudmusic.copyProgramLink", { data: { id } });
      break;
    case PickType.download:
      void commands.executeCommand("cloudmusic.downloadSong", { item: mainSong, valueOf: id });
      break;
    case PickType.user:
      return (input) => pickUser(input, step + 1, (<T>pick).id);
    case PickType.radio:
      return (input) => pickRadio(input, step + 1, <NeteaseTypings.RadioDetail>radio);
    case PickType.comment:
      Webview.comment(NeteaseCommentType.dj, id, name);
      break;
    case PickType.add:
      void commands.executeCommand(
        "cloudmusic.addProgram",
        ProgramTreeItem.new({ ...program, pid: radio ? radio.id : 0, itemType: "p" }),
      );
      break;
    case PickType.next:
      IPC.add([ProgramTreeItem.new({ ...program, pid: program.mainSong.al.id, itemType: "p" }).data], 1);
      break;
  }

  return input.stay();
}

export async function pickProgramMany(
  input: MultiStepInput,
  step: number,
  programs: readonly NeteaseTypings.ProgramDetail[],
): Promise<InputStep> {
  const pick = await input.showQuickPick({
    title: i18n.word.program,
    step,
    items: [
      { label: `$(add) ${i18n.word.addToQueue}`, type: PickType.add },
      { label: `$(play) ${i18n.word.nextTrack}`, type: PickType.next },
    ],
  });
  IPC.add(
    programs.map((program) => ProgramTreeItem.new({ ...program, pid: program.mainSong.id, itemType: "p" }).data),
    pick.type === PickType.add ? undefined : 1,
  );
  return input.stay();
}

export async function pickPrograms(
  input: MultiStepInput,
  step: number,
  programs: readonly NeteaseTypings.ProgramDetail[],
): Promise<InputStep> {
  const pick = await input.showQuickPick({
    title: i18n.word.program,
    step,
    items: pickProgramDetails(programs),
    canSelectMany: true,
  });
  if (pick.length === 0) return input.stay();
  if (pick.length === 1) return (input) => pickProgram(input, step + 1, pick[0].item);

  return (input) =>
    pickProgramMany(
      input,
      step + 1,
      pick.map(({ item }) => item),
    );
}

export async function pickRadio(
  input: MultiStepInput,
  step: number,
  item: NeteaseTypings.RadioDetail,
): Promise<InputStep> {
  const { name, desc, id, subCount, programCount, playCount, dj } = item;

  const pick = await input.showQuickPick({
    title: `${i18n.word.radio}-${i18n.word.detail}`,
    step,
    items: [
      { label: `$(code) ${name}` },
      { label: `$(markdown) ${desc}` },
      { label: `$(link) ${i18n.word.copyLink}`, type: PickType.copy },
      ...pickUserDetails([dj]),
      { label: `$(symbol-number) ${i18n.word.playCount}`, description: `${playCount}` },
      { label: `$(symbol-number) ${i18n.word.subscribedCount}`, description: `${subCount}`, type: PickType.subscribed },
      { label: `$(symbol-number) ${i18n.word.trackCount}`, description: `${programCount}`, type: PickType.programs },
    ],
  });
  switch (pick.type) {
    case PickType.copy:
      void commands.executeCommand("cloudmusic.copyRadioLink", { item: { id } });
      break;
    case PickType.user:
      return (input) => pickUser(input, step + 1, (<T>pick).id);
    case PickType.subscribed:
      return async (input) =>
        pickUsers(input, step + 1, (id, limit) => IPC.netease("djSubscriber", [id, limit]), -1, id);
    case PickType.programs:
      return async (input) => pickPrograms(input, step + 1, await IPC.netease("djProgram", [0, id, programCount]));
  }

  return input.stay();
}

export async function pickRadios(
  input: MultiStepInput,
  step: number,
  radios: readonly NeteaseTypings.RadioDetail[],
): Promise<InputStep> {
  const { item } = await input.showQuickPick({ title: i18n.word.radio, step, items: pickRadioDetails(radios) });
  return (input) => pickRadio(input, step + 1, item);
}

export async function pickArtist(input: MultiStepInput, step: number, id: number): Promise<InputStep> {
  const { artist, hotSongs } = await IPC.netease("artists", [id]);

  const { name, alias, briefDesc, albumSize, musicSize } = artist;
  const pick = await input.showQuickPick({
    title: `${i18n.word.artist}-${i18n.word.detail}`,
    step,
    items: [
      { label: `$(code) ${name}`, detail: alias.join("/") },
      { label: `$(markdown) ${i18n.word.description}`, detail: briefDesc, type: PickType.description },
      { label: `$(circuit-board) ${i18n.word.album}`, description: `${albumSize}`, id, type: PickType.albums },
      { label: `$(flame) ${i18n.word.hotSongs}`, description: `${hotSongs.length}`, type: PickType.hot },
      { label: `$(symbol-number) ${i18n.word.trackCount}`, description: `${musicSize}`, id, type: PickType.songs },
      { label: `$(library) ${i18n.word.similarArtists}`, type: PickType.similar },
      { label: `$(diff-added) ${i18n.word.save}`, type: PickType.save },
      { label: `$(diff-removed) ${i18n.word.unsave}`, type: PickType.unsave },
    ],
  });
  switch (pick.type) {
    case PickType.description:
      await Webview.description(id, name);
      break;
    case PickType.albums:
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return async (input) => pickAlbums(input, step + 1, await IPC.netease("artistAlbum", [pick.id!]));
    case PickType.hot:
      return (input) => pickSongs(input, step + 1, hotSongs);
    case PickType.songs:
      return (input) => pickAllSongs(input, step + 1, id, 0);
    case PickType.similar:
      return async (input) => pickArtists(input, step + 1, await IPC.netease("simiArtist", [id]));
    case PickType.unsave:
      if (await window.showWarningMessage(i18n.sentence.hint.confirmation, { modal: true }, i18n.word.confirmation))
        await IPC.netease("artistSub", [id, "unsub"]);
      break;
    case PickType.save:
      await IPC.netease("artistSub", [id, "sub"]);
  }

  return input.stay();

  async function pickAllSongs(input: MultiStepInput, step: number, id: number, offset: number): Promise<InputStep> {
    const limit = 100;
    const songs = await IPC.netease("artistSongs", [id, limit, offset]);
    const pick = await input.showQuickPick({
      title: i18n.word.song,
      step,
      items: pickSongItems(songs),
      canSelectMany: true,
      previous: offset > 0,
      next: songs.length === limit,
    });
    if (pick === ButtonAction.previous) return input.stay((input) => pickAllSongs(input, step, id, offset - limit));
    if (pick === ButtonAction.next) return input.stay((input) => pickAllSongs(input, step, id, offset + limit));
    if (pick.length === 0) return input.stay();
    if (pick.length === 1) return (input) => pickSong(input, step + 1, pick[0].item);

    return (input) =>
      pickSongMany(
        input,
        step + 1,
        pick.map(({ item }) => item),
      );
  }
}

export async function pickArtists(
  input: MultiStepInput,
  step: number,
  artists: readonly NeteaseTypings.Artist[],
): Promise<InputStep> {
  const pick = await input.showQuickPick({ title: i18n.word.artist, step, items: pickArtistItems(artists) });
  return (input) => pickArtist(input, step + 1, pick.id);
}

export async function pickAlbum(input: MultiStepInput, step: number, id: number): Promise<InputStep> {
  const { album, songs } = await IPC.netease("album", [id]);

  const { artists, alias, company, description, name } = album;
  const pick = await input.showQuickPick({
    title: `${i18n.word.album}-${i18n.word.detail}`,
    step,
    items: [
      { label: `$(code) ${name}`, description: alias.join("/"), detail: company },
      { label: `$(markdown) ${i18n.word.description}`, detail: description },
      { label: `$(zap) ${i18n.word.content}`, type: PickType.songs },
      { label: `$(comment) ${i18n.word.comment}`, type: PickType.comment },
      ...pickArtistItems(artists),
      { label: `$(diff-added) ${i18n.word.save}`, type: PickType.save },
      { label: `$(diff-removed) ${i18n.word.unsave}`, type: PickType.unsave },
    ],
  });
  switch (pick.type) {
    case PickType.artist:
      return (input) => pickArtist(input, step + 1, (<T>pick).id);
    case PickType.songs:
      return (input) => pickSongs(input, step + 1, songs);
    case PickType.unsave:
      if (await window.showWarningMessage(i18n.sentence.hint.confirmation, { modal: true }, i18n.word.confirmation))
        await IPC.netease("albumSub", [id, "unsub"]);
      break;
    case PickType.comment:
      Webview.comment(NeteaseCommentType.album, id, name);
      break;
    case PickType.save:
      await IPC.netease("albumSub", [id, "sub"]);
  }

  return input.stay();
}

export async function pickAlbums(
  input: MultiStepInput,
  step: number,
  albums: readonly NeteaseTypings.AlbumsItem[],
): Promise<InputStep> {
  const pick = await input.showQuickPick({ title: i18n.word.album, step, items: pickAlbumItems(albums) });
  return (input) => pickAlbum(input, step + 1, pick.id);
}

export async function pickPlaylist(
  input: MultiStepInput,
  step: number,
  item: NeteaseTypings.PlaylistItem,
): Promise<InputStep> {
  const { id, name, description, playCount, subscribedCount, trackCount, creator } = item;
  const pick = await input.showQuickPick({
    title: i18n.word.playlist,
    step,
    items: [
      { label: `$(code) ${name}` },
      { label: `$(markdown) ${i18n.word.description}`, detail: description || "" },
      { label: `$(link) ${i18n.word.copyLink}`, type: PickType.copy },
      { label: `$(comment) ${i18n.word.comment}`, type: PickType.comment },
      ...(playCount ? [{ label: `$(symbol-number) ${i18n.word.playCount}`, description: `${playCount}` }] : []),
      ...(subscribedCount
        ? [
            {
              label: `$(symbol-number) ${i18n.word.subscribedCount}`,
              description: `${subscribedCount}`,
              type: PickType.subscribed,
            },
          ]
        : []),
      ...(trackCount
        ? [{ label: `$(symbol-number) ${i18n.word.trackCount}`, description: `${trackCount}`, type: PickType.songs }]
        : []),
      ...pickUserDetails([creator]),
      { label: `$(add) ${i18n.word.addToQueue}`, type: PickType.add },
      { label: `$(play) ${i18n.word.nextTrack}`, type: PickType.next },
      { label: `$(diff-added) ${i18n.word.save}`, type: PickType.save },
    ],
  });
  switch (pick.type) {
    case PickType.copy:
      void commands.executeCommand("cloudmusic.copyPlaylistLink", { item });
      break;
    case PickType.songs:
      return async (input) => pickSongs(input, step + 1, await IPC.netease("playlistDetail", [0, id]));
    case PickType.subscribed:
      return (input) =>
        pickUsers(
          input,
          step + 1,
          (id, limit, offset) => IPC.netease("playlistSubscribers", [id, limit, offset]),
          0,
          id,
        );
    case PickType.user:
      return (input) => pickUser(input, step + 1, (<T>pick).id);
    case PickType.add:
      {
        const songs = await IPC.netease("playlistDetail", [0, id]);
        IPC.add(songs.map((song) => QueueItemTreeItem.new({ ...song, pid: id, itemType: "q" }).data));
      }
      break;
    case PickType.next: {
      const songs = await IPC.netease("playlistDetail", [0, id]);
      IPC.add(
        songs.map((song) => QueueItemTreeItem.new({ ...song, pid: id, itemType: "q" }).data),
        1,
      );
      break;
    }
    case PickType.comment:
      Webview.comment(NeteaseCommentType.playlist, id, name);
      break;
    case PickType.save:
      return (input) => _pickPlaylistSubscribe(input, step + 1);
  }
  return input.stay();

  async function _pickPlaylistSubscribe(input: MultiStepInput, step: number) {
    const pick = await input.showQuickPick({
      title: i18n.word.saveToPlaylist,
      step,
      items: [...AccountManager.accounts].map(([uid, { nickname }]) => ({ label: `$(account) ${nickname}`, uid })),
    });
    if (!pick) return;
    await IPC.netease("playlistSubscribe", [pick.uid, id, "subscribe"]);
    return input.stay();
  }
}

async function pickSimiPlaylists(input: MultiStepInput, step: number, id: number, offset: number): Promise<InputStep> {
  const limit = 50;
  const playlists = await IPC.netease("simiPlaylist", [id, limit, offset]);
  const pick = await input.showQuickPick({
    title: i18n.word.similarPlaylists,
    step,
    items: pickPlaylistItems(playlists),
    previous: offset > 0,
    next: playlists.length === limit,
  });
  if (pick === ButtonAction.previous) return input.stay((input) => pickSimiPlaylists(input, step, id, offset - limit));
  if (pick === ButtonAction.next) return input.stay((input) => pickSimiPlaylists(input, step, id, offset + limit));
  return (input) => pickPlaylist(input, step + 1, pick.item);
}

export async function pickPlaylists(
  input: MultiStepInput,
  step: number,
  items: readonly NeteaseTypings.PlaylistItem[],
): Promise<InputStep> {
  const pick = await input.showQuickPick({ title: i18n.word.playlist, step, items: pickPlaylistItems(items) });
  return (input) => pickPlaylist(input, step + 1, pick.item);
}

export async function pickAddToPlaylist(input: MultiStepInput, step: number, id: number): Promise<InputStep | void> {
  const items = [];
  for (const [uid, { nickname }] of AccountManager.accounts) items.push({ label: `$(account) ${nickname}`, uid });
  const { uid } = await input.showQuickPick({ title: i18n.word.user, step, items });
  return (input) => _pickPlaylist(input, step + 1, uid);

  async function _pickPlaylist(input: MultiStepInput, step: number, uid: number) {
    const lists = await AccountManager.userPlaylist(uid);
    const pick = await input.showQuickPick({
      title: i18n.word.saveToPlaylist,
      step,
      items: lists.map(({ name, id }) => ({ label: `$(list-unordered) ${name}`, id })),
    });
    if (await IPC.netease("playlistTracks", [uid, "add", pick.id, [id]])) {
      void window.showInformationMessage(i18n.sentence.success.addToPlaylist);
    } else void window.showErrorMessage(i18n.sentence.fail.addToPlaylist);
    return input.stay();
  }
}

export async function pickUser(input: MultiStepInput, step: number, uid: number): Promise<InputStep> {
  const user = await IPC.netease("userDetail", [uid]);
  if (!user) return input.stay();

  const playlists = await IPC.netease("userPlaylist", [uid]);
  const pick = await input.showQuickPick({
    title: i18n.word.user,
    step,
    items: [
      { label: `$(account) ${user.nickname}`, detail: user.signature, item: 0 },
      {
        label: `$(symbol-number) ${i18n.word.followeds}`,
        description: `${user.followeds}`,
        type: PickType.followeds,
        item: 0,
      },
      {
        label: `$(symbol-number) ${i18n.word.follows}`,
        description: `${user.follows}`,
        type: PickType.follows,
        item: 0,
      },
      { label: `>>>>    ${i18n.word.playlist}`, item: 0 },
      ...pickPlaylistItems(playlists.filter((playlist) => playlist.creator.userId === uid)),
      { label: `>>>>    ${i18n.word.saved}`, item: 0 },
      ...pickPlaylistItems(playlists.filter((playlist) => playlist.creator.userId !== uid)),
    ],
  });
  switch (pick.type) {
    case PickType.followeds:
      return (input) =>
        pickUsers(input, step + 1, (uid, limit, offset) => IPC.netease("userFolloweds", [uid, limit, offset]), 0, uid);
    case PickType.follows:
      return (input) =>
        pickUsers(input, step + 1, (uid, limit, offset) => IPC.netease("userFollows", [uid, limit, offset]), 0, uid);
    case PickType.playlist:
      return (input) => pickPlaylist(input, step + 1, <NeteaseTypings.PlaylistItem>pick.item);
  }
  return input.stay();
}

const limit = 50;

export async function pickUsers(
  input: MultiStepInput,
  step: number,
  func: (...args: number[]) => Promise<readonly NeteaseTypings.UserDetail[]>,
  offset: number,
  id: number,
): Promise<InputStep> {
  const users = await func(id, limit, offset);
  const pick = await input.showQuickPick({
    title: i18n.word.user,
    step,
    items: pickUserDetails(users),
    previous: offset > 0,
    next: users.length === limit,
  });
  if (pick === ButtonAction.previous) return input.stay((input) => pickUsers(input, step, func, offset - limit, id));
  if (pick === ButtonAction.next) return input.stay((input) => pickUsers(input, step, func, offset + limit, id));
  return (input) => pickUser(input, step + 1, pick.id);
}
