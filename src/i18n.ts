import { join } from "path";
import { readFileSync } from "fs";

interface VSCodeNlsConfig {
  locale: string;
  availableLanguages: {
    [pack: string]: string;
  };
  _languagePackSupport?: boolean;
  _languagePackId?: string;
  _translationsConfigFile?: string;
  _cacheRoot?: string;
  _corruptedFile: string;
}

function isString(value: any): value is string {
  return Object.prototype.toString.call(value) === "[object String]";
}

type AvailableLanguages = "en" | "zh-cn" | "zh-tw";

const availableLanguages: AvailableLanguages[] = ["zh-cn", "zh-tw"];

export const i18n = (() => {
  let lang: AvailableLanguages = "en";

  if (isString(process.env.VSCODE_NLS_CONFIG)) {
    const { locale } = JSON.parse(
      process.env.VSCODE_NLS_CONFIG
    ) as VSCodeNlsConfig;
    const idx = availableLanguages.findIndex((value) => locale === value);
    if (idx !== -1) {
      lang = availableLanguages[idx];
    }
  }

  const localize = JSON.parse(
    readFileSync(join(__dirname, "..", "i18n", `${lang}.json`)).toString()
  ) as Record<string, string>;

  return {
    sentence: {
      error: {
        needSignIn: localize["sentence.error.needSignIn"],
        network: localize["sentence.error.network"],
        systemSupport: localize["sentence.error.systemSupport"],
      },
      fail: {
        signIn: localize["sentence.fail.signIn"],
      },
      hint: {
        account: localize["sentence.hint.account"],
        button: localize["sentence.hint.button"],
        confirmation: localize["sentence.hint.confirmation"],
        countrycode: localize["sentence.hint.countrycode"],
        desc: localize["sentence.hint.desc"],
        keyword: localize["sentence.hint.keyword"],
        lyricDelay: localize["sentence.hint.lyricDelay"],
        name: localize["sentence.hint.name"],
        password: localize["sentence.hint.password"],
        search: localize["sentence.hint.search"],
        signIn: localize["sentence.hint.signIn"],
        trySignIn: localize["sentence.hint.trySignIn"],
        volume: localize["sentence.hint.volume"],
      },
      info: {
        alreadySignIn: localize["sentence.info.alreadySignIn"],
      },
      label: {
        cellphone: localize["sentence.label.cellphone"],
        dailyRecommendedPlaylists:
          localize["sentence.label.dailyRecommendedPlaylists"],
        dailyRecommendedSongs: localize["sentence.label.dailyRecommendedSongs"],
        email: localize["sentence.label.email"],
        lyricDelay: localize["sentence.label.lyricDelay"],
        newsongRecommendation: localize["sentence.label.newsongRecommendation"],
        playlistRecommendation:
          localize["sentence.label.playlistRecommendation"],
      },
      success: {
        dailyCheck: localize["sentence.success.dailyCheck"],
        signIn: localize["sentence.success.signIn"],
      },
    },
    word: {
      account: localize["word.account"],
      addToQueue: localize["word.addToQueue"],
      album: localize["word.album"],
      albumNewest: localize["word.albumNewest"],
      all: localize["word.all"],
      allTime: localize["word.allTime"],
      area: localize["word.area"],
      artist: localize["word.artist"],
      artistList: localize["word.artistList"],
      ascending: localize["word.ascending"],
      band: localize["word.band"],
      categorie: localize["word.categorie"],
      cellphone: localize["word.cellphone"],
      cleanCache: localize["word.cleanCache"],
      close: localize["word.close"],
      comment: localize["word.comment"],
      confirmation: localize["word.confirmation"],
      content: localize["word.content"],
      createPlaylist: localize["word.createPlaylist"],
      default: localize["word.default"],
      descending: localize["word.descending"],
      description: localize["word.description"],
      detail: localize["word.detail"],
      editPlaylist: localize["word.editPlaylist"],
      email: localize["word.email"],
      en: localize["word.en"],
      explore: localize["word.explore"],
      female: localize["word.female"],
      followeds: localize["word.followeds"],
      follows: localize["word.follows"],
      forward: localize["word.forward"],
      fullLyric: localize["word.fullLyric"],
      hide: localize["word.hide"],
      highqualityPlaylist: localize["word.highqualityPlaylist"],
      hotSongs: localize["word.hotSongs"],
      hottest: localize["word.hottest"],
      initial: localize["word.initial"],
      ja: localize["word.ja"],
      kr: localize["word.kr"],
      like: localize["word.like"],
      loading: localize["word.loading"],
      lyric: localize["word.lyric"],
      lyricDelay: localize["word.lyricDelay"],
      male: localize["word.male"],
      more: localize["word.more"],
      latest: localize["word.latest"],
      nextPage: localize["word.nextPage"],
      nextTrack: localize["word.nextTrack"],
      other: localize["word.other"],
      pause: localize["word.pause"],
      personalFm: localize["word.personalFm"],
      play: localize["word.play"],
      playCount: localize["word.playCount"],
      playlist: localize["word.playlist"],
      previousPage: localize["word.previousPage"],
      previousTrack: localize["word.previousTrack"],
      private: localize["word.private"],
      public: localize["word.public"],
      recommendation: localize["word.recommendation"],
      refresh: localize["word.refresh"],
      refreshing: localize["word.refreshing"],
      reply: localize["word.reply"],
      save: localize["word.save"],
      saved: localize["word.save"],
      saveToPlaylist: localize["word.saveToPlaylist"],
      search: localize["word.search"],
      show: localize["word.show"],
      signIn: localize["word.signIn"],
      signOut: localize["word.signOut"],
      similarArtists: localize["word.similarArtists"],
      similarPlaylists: localize["word.similarPlaylists"],
      similarSongs: localize["word.similarSongs"],
      single: localize["word.single"],
      song: localize["word.song"],
      songList: localize["word.songList"],
      submit: localize["word.submit"],
      subscribedCount: localize["word.subscribedCount"],
      topAlbums: localize["word.topAlbums"],
      topArtists: localize["word.topArtists"],
      toplist: localize["word.toplist"],
      topSong: localize["word.topSong"],
      trackCount: localize["word.trackCount"],
      trash: localize["word.trash"],
      type: localize["word.type"],
      dislike: localize["word.dislike"],
      unsave: localize["word.unsave"],
      user: localize["word.user"],
      userRankingList: localize["word.userRankingList"],
      volume: localize["word.volume"],
      weekly: localize["word.weekly"],
      zh: localize["word.zh"],
    },
  };
})();
