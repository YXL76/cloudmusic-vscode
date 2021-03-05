# Change Log

All notable changes to the "cloudmusic" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [7.3.1] - 2021-03-05

### Changed

- Improve the login process

## [7.3.0] - 2021-03-05

### Added

- Apply a spinning animation to loading icon
- New activation events

### Changed

- Account: use build-in authentication
- Cache: rewrite lyric cache design

### Fixed

- Security: store account and cookie in secrets

## [7.2.0] - 2021-03-04

### Added

- Lyric
  - support translation ([#322](https://github.com/YXL76/cloudmusic-vscode/issues/322))
  - support pre-fetch
  - show in editor ([#324](https://github.com/YXL76/cloudmusic-vscode/issues/324))
- Player: support repeat playback ([#313](https://github.com/YXL76/cloudmusic-vscode/issues/313))
- Support media control again ([#288](https://github.com/YXL76/cloudmusic-vscode/issues/288))

### Changed

- Cache: music cache dir name
- Treeview: speed up queue modification

### Fixed

- Api: like did not work ([#330](https://github.com/YXL76/cloudmusic-vscode/issues/330))
- Lyric
  - Clear data after stopping playback
  - Delay did not work
- Player: `togglePlay` did not work when playing local file ([#329](https://github.com/YXL76/cloudmusic-vscode/issues/329))

## [7.1.2] - 2021-02-08

### Added

- Ignore `.vim` folder

## [7.1.0] - 2021-02-08

### Added

- API: support `artist_desc`
- Webview: add `description` page

### Changed

- QuickPick: improve ux

### Fixed

- Use a specific dirname when unblocking is enabled ([#210](https://github.com/YXL76/cloudmusic-vscode/issues/210))

## [7.0.2] - 2021-02-05

### Fixed

- Do not play free trial when unblocking is enabled

## [7.0.1] - 2021-02-05

### Added

- Adapt vscode `1.53.0`

## [7.0.0] - 2021-02-04

### Added

- API: support radio/program/dj/yunbei
- Lyric: can now control whether to display lyrics
- Treeview: add `Radio` and `Local library`
- Support unblocking copyrighted music (thanks to [UnblockNeteaseMusic](https://github.com/nondanee/UnblockNeteaseMusic))

### Changed

- Eslint: new rules
- QuickPick: do not show split line
- Webview
  - render html in server side
  - No longer depend on `ant design`

### Fixed

- Commands: do not displaye commands without `category` key in command palette
- Player: duration of different units

### Removed

- Cache: local cache support

## [6.5.0] - 2021-01-23

### Added

- load recommended songs after logging in ([#254](https://github.com/YXL76/cloudmusic-vscode/issues/254), [#160](https://github.com/YXL76/cloudmusic-vscode/issues/160))

### Changed

- Permanently cache user level

### Fixed

- Commands: fail to execute `cloudmusic.songDetail`

## [6.4.0] - 2021-01-17

### Added

- Commands
  - `cloudmusic.copySongLink` and `cloudmusic.copyPlaylistLink` ([#241](https://github.com/YXL76/cloudmusic-vscode/issues/241))
  - `cloudmusic.downloadSong` ([#244](https://github.com/YXL76/cloudmusic-vscode/issues/244))

## [6.3.2] - 2021-01-10

### Added

- Publish to Open VSX Registry
- Support using cookie to sign in

## [6.3.1] - 2021-01-08

- Native: disable media control (memory leak)

## [6.3.0] - 2021-01-08

### Added

- Native
  - Support media control again
  - Dynamic loading

## [6.2.0] - 2021-01-04

### Added

- API: QR Code login

### Changed

- State: store cookie
- API: use `api` instead of `linuxapi` (significant speed increase)
- Automatic check-in is only executed once a day

## [6.1.1] - 2020-12-28

### Changed

- API: choose `user-agent` only once

### Fixed

- Command: `Search` command not found ([#210](https://github.com/YXL76/cloudmusic-vscode/issues/210))

## [6.1.1] - 2020-12-27

### Fixed

- Activation sequence

## [6.1.0] - 2020-12-25

### Added

- Update `appver` ([Binaryify/NeteaseCloudMusicApi#1060](https://github.com/Binaryify/NeteaseCloudMusicApi/issues/1060))
- Set `X-Real-IP` in request headers for foreign users ([#210](https://github.com/YXL76/cloudmusic-vscode/issues/210))

## [6.0.5] - 2020-12-18

### Fixed

- API: personalized playlist url
- Player: prefetch keep running

## [6.0.4] - 2020-12-17

### Fixed

- Engines version

## [6.0.3] - 2020-12-16

### Fixed

- Player: increase download timeout

## [6.0.2] - 2020-12-15

### Changed

- Native: revert `Neon` to `v0.5.3` to disable dynamic loading

## [6.0.0] - 2020-12-15

### Added

- Native: Use `N-API` runtime
- Player: add fade-in effect ([#46](https://github.com/YXL76/cloudmusic-vscode/issues/46))
- Print handled error in console ([#35](https://github.com/YXL76/cloudmusic-vscode/issues/35))
- Self-host `NeteaseCloudMusicApi`

### Changed

- I18n: fewer words
- Change minimum supported vscode version to `1.52.0`

### Fixed

- Cache: integrity check use `md5` algorithm
- Player: mute when volume is set to 0

### Removed

- API: `related_playlist`
- Configuration: remove `cloudmusic.player.defaultLibrary` and `cloudmusic.music.realIP`
- Player: Remove loading lock ([#148](https://github.com/YXL76/cloudmusic-vscode/issues/148))
- Native
  - Remove `miniaudio` support
  - Temporarily remove file download and media control function (waiting for [neon-bindings/neon#596](https://github.com/neon-bindings/neon/issues/596))

### Security

- Solve [#L50](https://github.com/YXL76/cloudmusic-vscode/security/code-scanning/7?query=ref%3Arefs%2Fheads%2Fmaster) and [#L59](https://github.com/YXL76/cloudmusic-vscode/security/code-scanning/12?query=ref%3Arefs%2Fheads%2Fmaster)

## [5.2.3] - 2020-11-18

### Changed

- Upgrade dependences

## [5.2.2] - 2020-10-14

### Changed

- Upgrade dependences and reduce build size

## [5.2.1] - 2020-10-07

### Changed

- Cache: reduce comment cache ttl

### Fixed

- Api: load comment correctly when `sortType` is 3

## [5.2.0] - 2020-10-07

### Added

- Search: add default search keyword
- Webview: can watch floor comments and reply comment

### Fixed

- Refresh cache when create/delete playlist
- Webview: will no add multi event listener

## [5.1.3] - 2020-10-02

### Fixed

- Ignore parcel build cache

## [5.1.2] - 2020-10-02

### Changed

- Improve performance and reduce build size

## [5.1.1] - 2020-10-02

### Changed

- Improve performance and reduce build size

## [5.1.0] - 2020-10-01

### Added

- Api: comment (single/playlist/album)
- Webview: commentList

### Changed

- Explore: new songs express pick
- Daily signin will work in both platform
- Performance improvements

### Fixed

- User music ranking list can be refreshed correctly

## [5.0.2] - 2020-09-27

### Added

- InputBox: add close button

## [5.0.1] - 2020-09-27

### Added

- QuickPick: add close button

### Fixed

- TreeView: will not show alia when it is empty

## [5.0.0] - 2020-09-27

### Changed

- Webview: rewrite webview with `React` and `Ant Design`
- Workflow: refactor workflow to have faster build speed and smaller build size

### Removed

- Remove `libmpv` support
- Remove unused api modules to reduce build size
- Remove abi check, waiting for `N-API` suport in `neon`

## [4.7.0] - 2020-09-20

### Added

- Api: add `user_level` and `playlist_highquality_tags`

## [4.6.4] - 2020-09-19

### Added

- All songs pick use `canSelectMany`

## [4.6.3] - 2020-09-19

### Added

- Use `canSelectMany` in PickSongs ([#50](https://github.com/YXL76/cloudmusic-vscode/issues/50))
- Add all inline commands to the context menu ([#43](https://github.com/YXL76/cloudmusic-vscode/issues/43))
- Add buttons to replace the items to turn pages

## [4.6.2] - 2020-09-17

### Added

- Add `addToQueue` item in playlist pick ([#50](https://github.com/YXL76/cloudmusic-vscode/issues/50))

## [4.6.1] - 2020-09-17

### Added

- Prompt the user to log in after initialization

## [4.6.0] - 2020-09-08

### Added

- Add mobile country code

## [4.5.0] - 2020-09-08

### Added

- Player: keep volume setting

### Changed

- Use `globalState` api instead of `fs-based` storage
- Improve the speed of network data acquisition ([#34](https://github.com/YXL76/cloudmusic-vscode/issues/34))

## [4.4.1] - 2020-09-04

### Added

- Quickpick: show playlists in `user`

## [4.4.0] - 2020-09-04

### Added

- Quickpick: `user` and `users`

## [4.3.0] - 2020-08-28

### Added

- Command: `cloudmusic.playNext`, `cloudmusic.sortQueue`
- Api: `top_playlist`, `top_playlist_highquality`, `artist_list`
- When there is only one song in the queue, it is played in a loop

### Changed

- The volume input is only valid from 0 to 100

## [4.2.2] - 2020-08-28

### Fixed

- No error is displayed when musics are not cached

## [4.2.1] - 2020-08-27

### Fixed

- Cache
- Player: increase the minimum load size
- Queue: cannot switch songs when not in focus

## [4.2.0] - 2020-08-26

### Added

- `artist_sub`, `artist_sublist`
- `playlist_create`, `playlist_update`, `playlist_subscribe`

### Fixed

- I18n: fix some spelling mistakes

## [4.1.0] - 2020-08-25

### Added

- Explore: `Popular artists`
- `album_sub`, `album_sublist`

### Changed

- Fit `NeteaseCloudMusicApi` 3.39.0
- Get playlist content faster
- Lyric: will no show uncessary items

### Fixed

- Quickpick: some titles

## [4.0.1] - 2020-08-23

### Fixed

- The queue item will be unique

## [4.0.0] - 2020-08-23

### Added

- Multi-step input
- Configuration
  - `cloudmusic.music.realIP`
  - Add constraints for some items
- Cache
  - Local music file support (`cloudmusic.cache.localDirectory`)
  - Add cache to some api request
- Search
  - Search for playlist
  - Search suggestion
- Treeview: busy hint
- i18n: `中文（繁體）` support
- Top list
- Explore
- Command: `cloudmusic.deletePlaylist`

### Changed

- Search process
- Command: `cloudmusic.toggleButto` loop input
- Icon: Unified icon

### Removed

- Command: `cloudmusic.addToPlaylist`(replace by `cloudmusic.saveToPlaylist`)

## [3.7.7] - 2020-08-17

### Fixed

- Download error will no longer crash extension
- `Miniaudio` no sound

### Changed

- Static link `curl` to improve performace
- Use `EventHandler`api to handle keyboard event

## [3.7.6] - 2020-08-16

### Added

- Download the next song in advance

### Changed

- No longer cache personal FM music
- Use native `download` to break proxy restrictions

## [3.7.5] - 2020-08-14

### Changed

- Better network error handling
- Upgrade `rodio`

## [3.7.4] - 2020-08-12

### Changed

- Webview: modify `userMusicRanking` style

### Fix

- `js` scripts missing

## [3.7.3] - 2020-08-12

### Added

- Media control support (macos)

### Changed

- Webview: update `userMusicRanking` style

### Fix

- Macos load error ([#5](https://github.com/YXL76/cloudmusic-vscode/issues/5))

## [3.7.2] - 2020-08-06

### Changed

- Bundle `vscode-nls`

## [3.7.1] - 2020-08-06

### Fixed

- Fix `Cannot find module 'vscode-nls'`

## [3.7.0] - 2020-08-06

### Added

- I18n: `zh-cn` support

### Changed

- Stop the player when activated

### Fixed

- Sign in process

## [3.6.2] - 2020-08-05

### Added

- Configuration: `cloudmusic.player.mediaControl`

### Fixed

- Check if platform is supported

## [3.6.1] - 2020-08-05

### Added

- Ignore `.yarn` folder

## [3.6.0] - 2020-08-05

### Added

- Media control support (windows/linux)

### Changed

- Lock: unlock after 2s when network error occurs
- Native module: reduce size

## [3.5.0] - 2020-07-30

### Added

- Command: `cloudmusic.search`

### Changed

- Qiuckpick: reduce network request in order to improve performance

### Fixed

- Status bar: will check like status before changing button

## [3.4.1] - 2020-07-30

### Fixed

- Status bar: `like` button will change when using quickpick
- Command: `cloudmusic.addToPlaylist`

## [3.4.0] - 2020-07-28

### Added

- Player: `miniaudio`
- Configuration: `cloudmusic.player.defaultLibrary`

## [3.3.1] - 2020-07-24

### Changed

- Cache: music folder

## [3.3.0] - 2020-07-24

### Added

- Command: `cloudmusic.personalFM`
- Cache: cache lyric
- Lyric: can show full lyric

### Changed

- Cache: check md5 when putting item in instead of when getting item

### Fixed

- Player: will not load file when network error occurs
- Lyric: time parse

## [3.2.2] - 2020-07-23

### Changed

- Command: `cloudmusic.volume` inputbox will show current volume

### Fixed

- Player: build for different abi([#8](https://github.com/YXL76/cloudmusic-vscode/issues/8))

## [3.2.1] - 2020-07-22

### Changed

- Status bar: change buttons' position

### Fixed

- Player: keep volume setting

## [3.2.0] - 2020-07-21

### Added

- Command: add `cloudmusic.toggleButton` which can control button visibility([#6](https://github.com/YXL76/cloudmusic-vscode/issues/6))

### Changed

- Player: playback will be stopped when network error occurs

### Fixed

- Command: `previoud` will no longer load undefined item

## [3.1.0] - 2020-07-20

### Added

- Personal fm
- Command: `cloudmusic.fmTrash`

### Changed

- Lyric: match more accurately. default delay is changed to `-1.0`

### Fixed

- Status bar: like button will be changed every load
- Queue: lock every operation
- The login status will be changed correctly

## [3.0.0] - 2020-07-19

### Added

- Player: use native modules

### Changed

- Lyric: default delay changes to `-3.5`
- Status bar: song name limit changes to `12`
- Performance improvements

### Removed

- Player: no longer support `vlc` and `mpv`
- Configuration: `cloudmusic.player.player`, `cloudmusic.player.ignoreConfig`, `cloudmusic.player.interface`, `cloudmusic.player.mpv.path`, `cloudmusic.player.vlc.path`, `cloudmusic.player.vlc.httpPort`, `cloudmusic.player.vlc.httpPass`

## [2.1.4] - 2020-07-14

### Fixed

- Tree item: alias check
- User music ranking: update `NeteaseCloudMusicApi` to fix [#848](https://github.com/Binaryify/NeteaseCloudMusicApi/issues/848)

## [2.1.3] - 2020-07-13

### Added

- Add `user music ranking` webview

## [2.1.2] - 2020-07-12

### Fixed

- Email login

## [2.1.1] - 2020-07-11

### Added

- Quick Pick: albums

## [2.1.0] - 2020-07-10

### Added

- Quick Pick: song detail, album detail, artist detail
- Button: a new button which will show playing song title

## [2.0.2] - 2020-07-09

### Fixed

- [#2](https://github.com/YXL76/cloudmusic-vscode/issues/2)

## [2.0.1] - 2020-07-09

### Fixed

- MPV Player: stability

## [2.0.0] - 2020-07-08

🎉🎉🎉 First stable release

### Added

- Lyric: can set display delay

### Changed

- VLC Player: fix unexpected pause

## [1.6.1] - 2020-07-07

### Added

- Status bar: lyric display

### Changed

- Icon: more beautiful icon

## [1.6.0] - 2020-07-06

### Added

- Configuration: add `cloudmusic.player.interface`

### Changed

- Store `md5_password` instead of `password`

### Fixed

- Player load process

### Removed

- Configuration: remove `cloudmusic.player.vlc.dummy`

## [1.5.4] - 2020-07-06

### Added

- Add player check step which will notif user whether player is working well

### Fixed

- `MPV Player` will have fewer crashes
- Command: `deleteSong` will no longer _add song_

## [1.5.3] - 2020-07-05

### Changed

- More efficent tmp file management

### Remove

- Double network request

## [1.5.2] - 2020-07-05

### Remove

- Double network request

## [1.5.1] - 2020-07-05

### Fixed

- Can set payler init volume without error
- Cache item can return right path

## [1.5.0] - 2020-07-04

### Added

- Extension kind: change to `ui` which can work in remote workspace
- Cache: now cloudmusic can use local cache. Thanks to it, `VLC Player` can play `flac` stream now
- Configuration: add `cloudmusic.cache.size`
- TreeView: content command `Delete from playlist` and `Add to playlist`

### Changed

- TreeView: better `tooltip`
- Performance improvements

### Fixed

- `queue` view can sync with player now

### Removed

- command `throttle`

## [1.4.0] - 2020-07-04

### Added

- configuration: `cloudmusic.account.autoCheck`

### Changed

- command: `playSong` and `playPlaylist` can auto play now

### Fixed

- `scrobble` api is usable now

### Removed

- command: `dailySignIn` to `dailyCheck`

## [1.3.1] - 2020-07-03

### Changed

- New `random` command which will no interrupt current playback
- Performance improvements

## [1.3.0] - 2020-07-02

### Added

- `scrobble` api support
- Divide playlist view into user and favorite

### Deprecated

- `cloudmusic.player.vlcIgnoreConfig` configuration

### Fixed

- `VLC Player` can set volume now
- Handle `flac` stream which will cause `VLC Player` crash

### Security

- Requset music url for every play to prevent url out of date

## [1.2.2] - 2020-07-02

### Added

- `VLC Player` error handle
- `VLC Player` will no longer show system notification

### Fixed

- `cloudmusic.music.musicQuality` can work correctly

## [1.2.1] - 2020-07-01

### Added

- Add `cloudmusic.music.proxy` configuration

## [1.2.0] - 2020-07-01

### Added

- Add `VLC Player` as a replacement for `MPV Player`

  - `cloudmusic.player.player` configuration to choose default player
  - `cloudmusic.player.vlcPath`, `cloudmusic.player.vlcHttpPort`, `cloudmusic.player.vlcHttpPass`, `cloudmusic.player.vlcDummy`, `cloudmusic.player.vlcIgnoreConfig` configuration

### Changed

- Improve network request speed

## [1.1.0] - 2020-06-30

### Added

- Add `cloudmusic.player.mpvPath` configuration

### Fixed

- Use `node-mpv` instead of `node-mpv-km`, because `node-mpv-km` cannot work in Windows

## [1.0.1] - 2020-06-30

### Fixed

- FIx webpack `Critical dependency`

## [1.0.0] - 2020-06-30

- Initial release

[unreleased]: https://github.com/YXL76/cloudmusic-vscode
