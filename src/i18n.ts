import * as nls from "vscode-nls";

nls.config({
  messageFormat: nls.MessageFormat.bundle,
  bundleFormat: nls.BundleFormat.standalone,
})();

const localize = nls.loadMessageBundle();

export const i18n = {
  sentence: {
    error: {
      needSignIn: localize(
        "sentence.error.needSignIn",
        "Please operate after signing in"
      ),
      network: localize("sentence.error.network", "Network error"),
      systemSupport: localize(
        "sentence.error.systemSupport",
        "System is not supported"
      ),
    },
    fail: {
      signIn: localize("sentence.fail.signIn", "Sign in failed"),
    },
    hint: {
      account: localize("sentence.hint.account", "Please enter your account"),
      button: localize(
        "sentence.hint.button",
        "Set whether the button is displayed or not"
      ),
      keyword: localize("sentence.hint.keyword", "Please enter keyword"),
      lyricDelay: localize(
        "sentence.hint.lyricDelay",
        "Please enter lyric delay"
      ),
      password: localize("sentence.hint.password", "lease enter your password"),
      search: localize("sentence.hint.search", "Please choose search type"),
      signIn: localize("sentence.hint.signIn", "Select the method to sign in"),
      volume: localize("sentence.hint.volume", "Please enter volume"),
    },
    info: {
      alreadySignIn: localize(
        "sentence.info.alreadySignIn",
        "Account already signed in"
      ),
    },
    label: {
      cellphone: localize(
        "sentence.label.cellphone",
        "use cellphone to sign in"
      ),
      dailyRecommendedPlaylists: localize(
        "sentence.label.dailyRecommendedPlaylists",
        "Daily recommended playlists"
      ),
      dailyRecommendedSongs: localize(
        "sentence.label.dailyRecommendedSongs",
        "Daily recommended songs"
      ),
      email: localize("sentence.label.email", "Use email to sign in"),
      lyricDelay: localize("sentence.label.lyricDelay", "Set lyric delay"),
      newsongRecommendation: localize(
        "sentence.label.newsongRecommendation",
        "New song recommendation"
      ),
      playlistRecommendation: localize(
        "sentence.label.playlistRecommendation",
        "Playlist recommendation"
      ),
    },
    success: {
      dailyCheck: localize(
        "sentence.success.dailyCheck",
        "Daily check successful"
      ),
      signIn: localize("sentence.success.signIn", "Sign in successful"),
    },
  },
  word: {
    account: localize("word.account", "Account"),
    addToQueue: localize("word.addToQueue", "Add to queue"),
    album: localize("word.album", "Album"),
    allTime: localize("word.allTime", "All time"),
    artist: localize("word.artist", "Artist"),
    cellphone: localize("word.cellphone", "Cellphone"),
    cleanCache: localize("word.cleanCache", "Clean cache"),
    content: localize("word.content", "Content"),
    default: localize("word.default", "Default"),
    description: localize("word.description", "Description"),
    detail: localize("word.detail", "Detail"),
    email: localize("word.email", "Email"),
    forword: localize("word.forword", "Forword"),
    fullLyric: localize("word.fullLyric", "Full lyric"),
    hide: localize("word.hide", "Hide"),
    hotSongs: localize("word.hotSongs", "Hot songs"),
    like: localize("word.like", "Like"),
    loading: localize("word.loading", "Loading"),
    lyric: localize("word.lyric", "Lyric"),
    lyricDelay: localize("word.lyricDelay", "Lyric delay"),
    nextPage: localize("word.nextPage", "Next Rage"),
    nextTrack: localize("word.nextTrack", "Next track"),
    pause: localize("word.pause", "Pause"),
    personalFm: localize("word.personalFm", "Personal FM"),
    play: localize("word.play", "Play"),
    playCount: localize("word.playCount", "Play count"),
    playlist: localize("word.playlist", "Playlist"),
    previousPage: localize("word.previousPage", "Previous page"),
    previousTrack: localize("word.previousTrack", "Previous track"),
    recommendation: localize("word.recommendation", "Recommendation"),
    saveToPlaylist: localize("word.saveToPlaylist", "Save to playlist"),
    search: localize("word.search", "Search"),
    show: localize("word.show", "Show"),
    signIn: localize("word.signIn", "Sign in"),
    signOut: localize("word.signOut", "Sign out"),
    similarArtists: localize("word.similarArtists", "Similar artists"),
    similarPlaylists: localize("word.similarPlaylists", "Similar playlists"),
    similarSongs: localize("word.similarSongs", "Similar songs"),
    single: localize("word.single", "Single"),
    song: localize("word.song", "Song"),
    subscribedCount: localize("word.subscribedCount", "Subscribed count"),
    trackCount: localize("word.trackCount", "trackCount"),
    trash: localize("word.trash", "Trash"),
    unlike: localize("word.unlike", "Unlike"),
    user: localize("word.user", "User"),
    userRankingList: localize("word.userRankingList", "User ranking list"),
    volume: localize("word.volume", "Volume"),
    weekly: localize("word.weekly", "Weekly"),
  },
};
