import * as nls from "vscode-nls";

nls.config({
  messageFormat: nls.MessageFormat.bundle,
  bundleFormat: nls.BundleFormat.standalone
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
      )
    },
    fail: {
      signIn: localize("sentence.fail.signIn", "Sign in failed")
    },
    hint: {
      account: localize("sentence.hint.account", "Please enter your account"),
      button: localize(
        "sentence.hint.button",
        "Set whether the button is displayed or not"
      ),
      confirmation: localize(
        "sentence.hint.confirmation",
        'Are you sure you want to do this? Please enter "yes" to confirm (case insensitive)'
      ),
      countrycode: localize(
        "sentence.hint.countrycode",
        "Please enter your countrycode"
      ),
      desc: localize("sentence.hint.desc", "Please enter description"),
      keyword: localize("sentence.hint.keyword", "Please enter keyword"),
      lyricDelay: localize(
        "sentence.hint.lyricDelay",
        "Please enter lyric delay"
      ),
      name: localize("sentence.hint.name", "Please enter the name"),
      password: localize(
        "sentence.hint.password",
        "Please enter your password"
      ),
      search: localize("sentence.hint.search", "Please choose search type"),
      signIn: localize("sentence.hint.signIn", "Select the method to sign in"),
      trySignIn: localize(
        "sentence.hint.trySignIn",
        "Found that you have not logged in"
      ),
      volume: localize("sentence.hint.volume", "Please enter volume")
    },
    info: {
      alreadySignIn: localize(
        "sentence.info.alreadySignIn",
        "Account already signed in"
      )
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
      )
    },
    success: {
      dailyCheck: localize(
        "sentence.success.dailyCheck",
        "Daily check successful"
      ),
      signIn: localize("sentence.success.signIn", "Sign in successful")
    }
  },
  word: {
    account: localize("word.account", "Account"),
    addToQueue: localize("word.addToQueue", "Add to queue"),
    album: localize("word.album", "Album"),
    albumNewest: localize("word.albumNewest", "Album newest"),
    all: localize("word.all", "All"),
    allTime: localize("word.allTime", "All time"),
    area: localize("word.area", "Area"),
    artist: localize("word.artist", "Artist"),
    artistList: localize("word.artistList", "Artist list"),
    ascending: localize("word.ascending", "Ascending"),
    band: localize("word.band", "Band"),
    categorie: localize("word.categorie", "Categorie"),
    cellphone: localize("word.cellphone", "Cellphone"),
    cleanCache: localize("word.cleanCache", "Clean cache"),
    confirmation: localize("word.confirmation", "Confirmation"),
    content: localize("word.content", "Content"),
    createPlaylist: localize("word.createPlaylist", "Create playlist"),
    default: localize("word.default", "Default"),
    descending: localize("word.descending", "Descending"),
    description: localize("word.description", "Description"),
    detail: localize("word.detail", "Detail"),
    editPlaylist: localize("word.editPlaylist", "Edit playlist"),
    email: localize("word.email", "Email"),
    en: localize("word.en", "English"),
    explore: localize("word.explore", "Explore"),
    female: localize("word.female", "Female artist"),
    followeds: localize("word.followeds", "Followeds"),
    follows: localize("word.follows", "Follows"),
    forward: localize("word.forward", "Forword"),
    fullLyric: localize("word.fullLyric", "Full lyric"),
    hide: localize("word.hide", "Hide"),
    highqualityPlaylist: localize(
      "word.highqualityPlaylist",
      "Highquality playlist"
    ),
    hotSongs: localize("word.hotSongs", "Hot songs"),
    initial: localize("word.initial", "Initial"),
    ja: localize("word.ja", "Japanese"),
    kr: localize("word.kr", "Korean"),
    like: localize("word.like", "Like"),
    loading: localize("word.loading", "Loading"),
    lyric: localize("word.lyric", "Lyric"),
    lyricDelay: localize("word.lyricDelay", "Lyric delay"),
    male: localize("word.male", "Male artist"),
    nextPage: localize("word.nextPage", "Next Rage"),
    nextTrack: localize("word.nextTrack", "Next track"),
    other: localize("word.other", "Other"),
    pause: localize("word.pause", "Pause"),
    personalFm: localize("word.personalFm", "Personal FM"),
    play: localize("word.play", "Play"),
    playCount: localize("word.playCount", "Play count"),
    playlist: localize("word.playlist", "Playlist"),
    previousPage: localize("word.previousPage", "Previous page"),
    previousTrack: localize("word.previousTrack", "Previous track"),
    private: localize("word.private", "Private"),
    public: localize("word.public", "Public"),
    recommendation: localize("word.recommendation", "Recommendation"),
    save: localize("word.save", "Save"),
    saved: localize("word.save", "Saved"),
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
    songList: localize("word.songList", "Song list"),
    subscribedCount: localize("word.subscribedCount", "Subscribed count"),
    topAlbums: localize("word.topAlbums", "New discs on shelves"),
    topArtists: localize("word.topArtists", "Popular artists"),
    toplist: localize("word.toplist", "Toplist"),
    topSong: localize("word.topSong", "New song express"),
    trackCount: localize("word.trackCount", "Track count"),
    trash: localize("word.trash", "Trash"),
    type: localize("word.type", "Type"),
    unlike: localize("word.unlike", "Unlike"),
    unsave: localize("word.unsave", "Unsave"),
    user: localize("word.user", "User"),
    userRankingList: localize("word.userRankingList", "User ranking list"),
    volume: localize("word.volume", "Volume"),
    weekly: localize("word.weekly", "Weekly"),
    zh: localize("word.zh", "Chinese")
  }
};
