# Change Log

All notable changes to the "cloudmusic" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [9.22.0] - 2024-06-04

### Fixed

- API
- Windows playback device

## [9.21.1] - 2024-05-28

### Fixed

- Fix deleting local library ([#974](https://github.com/YXL76/cloudmusic-vscode/issues/974))

## [9.21.0] - 2024-05-28

### Changed

- Load local file cover on playing time

## [9.20.0] - 2024-04-14

### Added

- Seeking
- Show artist name in status bar ([#971](https://github.com/YXL76/cloudmusic-vscode/issues/971))

### Fixed

- `picUrl` too large ([#975](https://github.com/YXL76/cloudmusic-vscode/issues/975))
- Remove powershell ([#965](https://github.com/YXL76/cloudmusic-vscode/issues/965))
- Generate UUID for status bar items ([#953](https://github.com/YXL76/cloudmusic-vscode/issues/953))

## [9.19.2] - 2023-08-26

### Added

- Add hint ([#919](https://github.com/YXL76/cloudmusic-vscode/issues/919))

## [9.19.1] - 2023-04-03

### Fixed

- Player: playback interrupted ([#897](https://github.com/YXL76/cloudmusic-vscode/issues/868), [#909](https://github.com/YXL76/cloudmusic-vscode/issues/909))

## [9.19.0] - 2023-03-04

### Changed

- Update deps

### Fixed

- I18n: import error ([#897](https://github.com/YXL76/cloudmusic-vscode/issues/897))
- Media session: ignore missing view ([#909](https://github.com/YXL76/cloudmusic-vscode/issues/909))

## [9.18.0] - 2023-01-19

### Added

- UI: fallback lyric display ([#855](https://github.com/YXL76/cloudmusic-vscode/issues/855))

### Changed

- Deps: update

### Fixed

- UI: search input loses focus ([#848](https://github.com/YXL76/cloudmusic-vscode/issues/848))

## [9.17.1] - 2022-12-11

### Changed

- Webview: better UX

### Fixed

- Temporary fixes for 1.74 issues

## [9.17.0] - 2022-09-24

### Added

- API:
  - `countries_code_list`: login
  - `playlist_update_playcount`: play playlist
  - `mv_detail` and `mv_url`: support mv playback

### Changed

- Scripts: use `deno` runtime

## [9.16.9] - 2022-09-19

### Changed

- Status bar: shrink image size

## [9.16.8] - 2022-09-13

### Changed

- Treeview: use unique id ([#818](https://github.com/YXL76/cloudmusic-vscode/issues/818))

### Fixed

- API: `songUrl` level
- Player: playback state

## [9.16.7] - 2022-09-12

### Changed

- Webview: Make `spawn` async

### Fixed

- Cache: automatically clean up the tmp dir

## [9.16.6] - 2022-09-08

### Fixed

- Cache: Temp folder conflict ([#812](https://github.com/YXL76/cloudmusic-vscode/issues/812))
- Local library: check `codecProfile` ([#813](https://github.com/YXL76/cloudmusic-vscode/issues/813))

## [9.16.5] - 2022-09-08

### Fixed

- Treeview: `LocalFileTreeItem` do not use `id` to identify

### Changed

- ES2022 target
- Update minimum supported Vs Code Version to 1.67.0

## [9.16.3] - 2022-09-07

### Fixed

- Webview: set `localResourceRoots` as fs root ([#800](https://github.com/YXL76/cloudmusic-vscode/issues/800), [#807](https://github.com/YXL76/cloudmusic-vscode/issues/807))

### Changed

- I18n: clearer liking status prompts ([@xuan25](https://github.com/xuan25))
- IPC: close socket after 2s on Windows

## [9.16.2] - 2022-09-04

### Fixed

- Player
  - MediaSession do not conflict with native player
  - Resume playback position when using `wasm` player

## [9.16.1] - 2022-09-04

### Changed

- API: retry on `POST` by default

## [9.16.0] - 2022-09-03

### Added

- Treeview: read local files' metadata ([#640](https://github.com/YXL76/cloudmusic-vscode/issues/640))

## [9.15.1] - 2022-09-03

### Fixed

- Resume playback after reload

## [9.15.0] - 2022-09-03

### Added

- Configuration: use `WebAudioPlayer` as default player when vscode version >= 1.71 ([microsoft/vscode#118275](https://github.com/microsoft/vscode/issues/118275))
- Player:
  - Add `WebAudioPlayer`
  - Support seeking when using `WebAudioPlayer` ([#638](https://github.com/YXL76/cloudmusic-vscode/issues/638), [#776](https://github.com/YXL76/cloudmusic-vscode/issues/776))

### Fixed

- Commands: `cloudmusic.downloadSong` args

## [9.14.4] - 2022-08-30

### Fixed

- API: Specify cookies once

## [9.14.3] - 2022-08-30

## [9.14.2] - 2022-08-29

### Fixed

- API: cookie version

## [9.14.1] - 2022-08-28

### Fixed

- Server: each version uses a specific socket

## [9.14.0] - 2022-08-28

### Added

- API:
  - Use new `song_url_v1` interface
  - Use `tough-cookie` to store cookies
- Add warnning about login method

### Fixed

- Player: auto check output device
- Server: set `master` immediately if the client is master
- Treeview: expand item when refreshing

## [9.13.3] - 2022-08-08

### Fixed

API: `loginRefresh` response

## [9.13.2] - 2022-08-07

### Fixed

API: fix cookie parsing

## [9.13.1] - 2022-08-07

### Fixed

- API: parse `loginRefresh` response

## [9.13.0] - 2022-08-07

### Added

- API: remember password and refresh cookie automatically ([#777](https://github.com/YXL76/cloudmusic-vscode/issues/777), [#651](https://github.com/YXL76/cloudmusic-vscode/issues/651))
- Player: increase process priority ([#754](https://github.com/YXL76/cloudmusic-vscode/issues/754))

## [9.12.1] - 2022-07-28

### Changed

- Update runtime

## [9.12.0] - 2022-07-17

### Added

- Commands: `cloudmusic.openLogFile`

### Changed

- Player: better performance

## [9.11.0] - 2022-07-12

### Added

- Configuration: add `cloudmusic.network.proxy` ([#747](https://github.com/YXL76/cloudmusic-vscode/issues/747))

## [9.10.6] - 2022-06-30

### Fixed

- IPC: message parsing
- Tooltip: button link

## [9.10.5] - 2022-06-19

### Fixed

- API: [Binaryify/NeteaseCloudMusicApi#1551](https://github.com/Binaryify/NeteaseCloudMusicApi/issues/1551)
- Typo ([#724](https://github.com/YXL76/cloudmusic-vscode/pull/724) [@chen310](https://github.com/chen310))

## [9.10.4] - 2022-06-15

### Fixed

- Server: Correctly decode URL string ([#721](https://github.com/YXL76/cloudmusic-vscode/issues/721))

## [9.10.3] - 2022-06-14

### Changed

- Server: convert to ES Module

### Fixed

- API: add `X-Forwarded-For` header for foreign user
- Native: downgrade glibc version ([#717](https://github.com/YXL76/cloudmusic-vscode/issues/717))

## [9.10.2] - 2022-06-06

### Fixed

- [#706](https://github.com/YXL76/cloudmusic-vscode/issues/706)

## [9.10.1] - 2022-06-02

### Fixed

- Media session: Add execute rights ([#706](https://github.com/YXL76/cloudmusic-vscode/issues/706))

## [9.10.0] - 2022-05-29

### Added

- Media session: support macOS

### Fixed

- API: fix cookie

## [9.9.3] - 2022-05-21

### Fixed

- Queue: Blocking caused by network request failure
- Status bar: The number of icons on tooltip

## [9.9.2] - 2022-05-17

### Fixed

- Server: listening to `uncaughtException`

## [9.9.1] - 2022-05-07

### Fixed

- Packaging error

## [9.9.0] - 2022-05-07

### Added

- Lyric: Support romanization ([#322](https://github.com/YXL76/cloudmusic-vscode/issues/322))

### Changed

- API: Use `got` to replace `axios`
- Webview: improve performace

### Fixed

- API: increase maximum number of sockets

## [9.8.4] - 2022-04-24

### Changed

- Remove `fs.rmdir`
- Webview: Update to React 18
- Update minimum supported Vs Code Version to 1.66.0

## [9.8.3] - 2022-03-28

### Changed

- Media session always use fake window on Windows

### Fixed

- API: keep up with the upstream

## [9.8.2] - 2022-01-26

### Changed

- Activation: change event from `*` to `onStartupFinished` ([#634](https://github.com/YXL76/cloudmusic-vscode/issues/634))
- Player
  - Change codec to `symphonia`
  - Support to change the speed while playing ([#576](https://github.com/YXL76/cloudmusic-vscode/issues/576))
- Webview: dynamic import wasm pkg

### Fixed

- Player: position is correctly affected by speed

## [9.8.1] - 2022-01-24

### Fixed

- Api: add/reply comments
- TreeView: missing listener ([#631](https://github.com/YXL76/cloudmusic-vscode/issues/631))

## [9.8.0] - 2022-01-22

### Added

- Player: support `wav` format ([#632](https://github.com/YXL76/cloudmusic-vscode/issues/632))

### Fixed

- Cache: file name conflict ([#633](https://github.com/YXL76/cloudmusic-vscode/issues/633))
- Command: `deleteLocalLibrary` index error

## [9.7.2] - 2022-01-15

### Fixed

- Cache: prefetch path

## [9.7.1] - 2022-01-15

### Fixed

- Player: sync issue in wasm mode

## [9.7.0] - 2022-01-14

### Added

- Cache: save music by name
- Configuration: `cloudmusic.host.autoStart`
- Player: support adjusting playback speed
- Treeview: automatically add cache directory

### Fixed

- Personal FM logic

## [9.6.2] - 2022-01-13

### Fixed

- IPC: do not close socket on windows
- Native: workflow for media session ([#591](https://github.com/YXL76/cloudmusic-vscode/issues/591))

## [9.6.1] - 2022-01-13

- The binaries for version `9.6.0` are all wrong!!!

## [9.6.0] - 2022-01-13

### Added

- Commands: set the default file name for `cloudmusic.downloadSong` ([#612](https://github.com/YXL76/cloudmusic-vscode/issues/612))
- Configuration: add `cloudmusic.cache.path` ([#620](https://github.com/YXL76/cloudmusic-vscode/issues/620))
- Player: support native media control ([#591](https://github.com/YXL76/cloudmusic-vscode/issues/591))
- Webview: new lyric panel ([#625](https://github.com/YXL76/cloudmusic-vscode/issues/625))
- Package: support platform-specific extensions

### Changed

- Add `'use strict';` banner
- Use `spawn` instead of `fork` to start the server
- Use `export const enum`

### Fixed

- Webview: symbolic link file ([#618](https://github.com/YXL76/cloudmusic-vscode/issues/))

## [9.5.1] - 2021-11-22

### Fixed

- API
  - `songUrl` response type
  - `scrobble` need integer time ([#585](https://github.com/YXL76/cloudmusic-vscode/issues/585))

## [9.5.0] - 2021-11-22

### Added

- API: support `song_download_url`

### Changed

- Doc: add new API items
- Status bar: add space between buttons in the tooltip

### Fixed

- API: params of `comment_new`
- State: `fm` is locked ([#598](https://github.com/YXL76/cloudmusic-vscode/issues/598))

## [9.4.0] - 2021-11-06

### Added

- Status bar: rich tooltip ([#525](https://github.com/YXL76/cloudmusic-vscode/issues/525))

### Fixed

- Player: mediaSession ([#559](https://github.com/YXL76/cloudmusic-vscode/issues/559))
- Webview: list key

## [9.3.0] - 2021-10-12

### Added

- State: sync `globalState`
- Status bar: new style ([#549](https://github.com/YXL76/cloudmusic-vscode/issues/549), WIP)

### Changed

- Host: reduce memory usage

### Fixed

- IPC: close socket immediately when deactivate
- Network: unable to work with proxy ([#527](https://github.com/YXL76/cloudmusic-vscode/issues/527))
- Webview: message format

## [9.2.4] - 2021-09-15

### Fixed

- Handle uncaughtException and unhandledRejection ([#536](https://github.com/YXL76/cloudmusic-vscode/issues/536))

## [9.2.3] - 2021-09-15

### Added

- Player: support native mode on `armv7-linux` machine

### Fixed

- Player: add new items to the list of supported native modules

## [9.2.2] - 2021-09-15

### Added

- Player: support native mode on `aarch64-linux` machine

## [9.2.1] - 2021-09-14

### Added

- Player: support native mode on `m1` machine

## [9.2.0] - 2021-09-02

### Added

- API: support login with captcha
- Commands: `cloudmusic.account`
- Status bar
  - support rich hover ([#525](https://github.com/YXL76/cloudmusic-vscode/issues/525))
  - check likelist ([#528](https://github.com/YXL76/cloudmusic-vscode/issues/528))
- Workbench: support walkthroughs

### Fixed

- Configuration: detect changes

## [9.1.3] - 2021-08-04

### Changed

- Log: better output

## [9.1.2] - 2021-08-04

### Changed

- Commands: run `playNext` in every view

### Fixed

- Account: empty user playlist
- Commands: `like` ([#521](https://github.com/YXL76/cloudmusic-vscode/issues/521))

## [9.1.1] - 2021-08-02

### Fixed

- Player: volume in `wasm` mode
- Status bar: init song button

## [9.1.0] - 2021-08-02

### Added

- Configuration: `cloudmusic.queue.initialization` ([#507](https://github.com/YXL76/cloudmusic-vscode/issues/507))

### Changed

- Treeview
  - Account card style
  - Move `deletePlaylist`, `deleteFromPlaylist`, `editPlaylist` to parent node (reduce memory usage)

### Fixed

- API: Reject timeout requests
- Player
  - Initialize the player only once
  - `mediaSession` ([w3c/mediasession#213](https://github.com/w3c/mediasession/issues/213))

### Removed

- Commands: `cloudmusic.playSongWithPlaylist` and `cloudmusic.playProgram`

## [9.0.1] - 2021-07-31

### Fixed

- Treeview: playlist id
- Lyrics parsing (Check [Parklife](https://music.163.com/#/song?id=16880947))

## [9.0.0] - 2021-07-31

### Added

- Accessibility: Sign in hint
- Multiple accounts ([#342](https://github.com/YXL76/cloudmusic-vscode/issues/342), [#439](https://github.com/YXL76/cloudmusic-vscode/issues/439), [#496](https://github.com/YXL76/cloudmusic-vscode/issues/496), [#502](https://github.com/YXL76/cloudmusic-vscode/issues/502))
- Player: `wasm` mode ([#344](https://github.com/YXL76/cloudmusic-vscode/issues/344), [#414](https://github.com/YXL76/cloudmusic-vscode/issues/414), [#503](https://github.com/YXL76/cloudmusic-vscode/issues/503))
- Configuration: `cloudmusic.player.mode`

### Changed

- Activation events: only `onView:account`
- Server
  - Logfile name
  - Catch axios error

### Fixed

- Commands: `cloudmusic.deleteFromPlaylist` ([#517](https://github.com/YXL76/cloudmusic-vscode/issues/517))

## [8.3.9] - 2021-07-07

### Changed

- Treeview: `Playlist` icon

### Fixed

- Parsing lyrics in uncommon format ([#486](https://github.com/YXL76/cloudmusic-vscode/pull/486) [@yume-chan](https://github.com/yume-chan))

## [8.3.8] - 2021-06-25

### Fixed

- CSS: support dark mode ([#478](https://github.com/YXL76/cloudmusic-vscode/issues/478))

## [8.3.7] - 2021-06-23

### Fixed

- [#470](https://github.com/YXL76/cloudmusic-vscode/issues/470)

## [8.3.6] - 2021-06-23

### Fixed

- Do not ignore css output

## [8.3.5] - 2021-06-23

### Fixed

- Commands: fix parameters typo ([#465](https://github.com/YXL76/cloudmusic-vscode/issues/465))
- Treeview: `Local library` always reads only local directories ([#470](https://github.com/YXL76/cloudmusic-vscode/issues/470))

## [8.3.4] - 2021-05-24

### Fixed

- Player: stay silent on next load

## [8.3.2] - 2021-05-20

### Added

- Configuration: add `cloudmusic.network.foreignUser`

## [8.3.1] - 2021-05-19

### Fixed

- Cache: music cache was removed every time loading this extension

## [8.3.0] - 2021-05-18

### Added

- API
  - support http request
  - support https over http ([#438](https://github.com/YXL76/cloudmusic-vscode/issues/438))
- IPC: handle `uncaught exception` and `unhandled rejection`

## [8.2.4] - 2021-05-17

### Added

- IPC: pass proxy setting to shared process ([#438](https://github.com/YXL76/cloudmusic-vscode/issues/438))

## [8.2.3] - 2021-05-14

### Fixed

- API: parameters error

## [8.2.2] - 2021-05-13

### Fixed

- Login process ([#418](https://github.com/YXL76/cloudmusic-vscode/issues/418))

## [8.2.1] - 2021-05-13

### Fixed

- Media session: `play`/`pause` does not work when playback is paused

## [8.2.0] - 2021-05-13

### Added

- Configuration: listening for change
- Treeview: support a recursive directory reading

### Fixed

- Button: add missing label
- Native: do not panic when there is no device
- Player: set metadata when toggling HTML
- Treeview: shuffle

## [8.1.0] - 2021-05-12

### Added

- IPC: redirect the server process' output into file
- Player
  - Set loading timeout to 30s

### Changed

- Treeview: improve performance and reduce memory usage

### Fixed

- API: fix lyric parsing and reject free trial
- Player: multiple pages competing for `mediaSession`

## [8.0.0] - 2021-05-12

🎉🎉🎉 This version has a great improvement in user experience. By using interprocess communication, multiple extension instances can be synchronized, and the previous state can be automatically restored after reloading the window. ([#388](https://github.com/YXL76/cloudmusic-vscode/issues/388))

### Added

- Player
  - support `mediaSession` ([#401](https://github.com/YXL76/cloudmusic-vscode/issues/401))
  - skip playing when using the trash ([#415](https://github.com/YXL76/cloudmusic-vscode/issues/415))
- Native: support arm64 windows
- Treeview: add `account` panel ([#343](https://github.com/YXL76/cloudmusic-vscode/issues/343), [#342](https://github.com/YXL76/cloudmusic-vscode/issues/342))

### Changed

- API: improve lyrics parsing ([#386](https://github.com/YXL76/cloudmusic-vscode/issues/386))
- Treeview: combine `user playlist` and `favorite playlist`

### Removed

- Unblocking copyrighted music

## [7.7.2] - 2021-04-01

### Fixed

- QuickPick: staying will clear the last pcik
- Account: authentication error vscode ([#392](https://github.com/YXL76/cloudmusic-vscode/issues/392), [#384](https://github.com/YXL76/cloudmusic-vscode/issues/384))

## [7.7.1] - 2021-03-17

### Fixed

- Cache: size limit

## [7.7.0] - 2021-03-14

### Added

- API: search lyric

## [7.6.0] - 2021-03-07

### Added

- Lyric: set font size ([#338](https://github.com/YXL76/cloudmusic-vscode/issues/338))

## [7.5.1] - 2021-03-07

### Fixed

- Lyric: copy the original text to the translation when there is no translation ([#337](https://github.com/YXL76/cloudmusic-vscode/issues/337))

## [7.5.0] - 2021-03-06

### Added

- Add a new package keyword
- Button: add a new inoperable state for the like button and show operation result information

### Changed

- New unplayable handling

### Fixed

- API : Check the playable status in all relevant APIs

## [7.4.1] - 2021-03-05

### Fixed

- `Vscode` instance will not exist when deactivating

## [7.4.0] - 2021-03-05

### Changed

- Cache: new music cache model

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

- API: like did not work ([#330](https://github.com/YXL76/cloudmusic-vscode/issues/330))
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

- API: load comment correctly when `sortType` is 3

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

- API: comment (single/playlist/album)
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

- API: add `user_level` and `playlist_highquality_tags`

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

- QuickPick: show playlists in `user`

## [4.4.0] - 2020-09-04

### Added

- QuickPick: `user` and `users`

## [4.3.0] - 2020-08-28

### Added

- Command: `cloudmusic.playNext`, `cloudmusic.sortQueue`
- API: `top_playlist`, `top_playlist_highquality`, `artist_list`
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

- QuickPick: some titles

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

- QuickPick: reduce network request in order to improve performance

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
