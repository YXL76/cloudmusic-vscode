# Change Log

All notable changes to the "cloudmusic" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [3.7.1] - 2020-08-06

### Fixed

- fix `Cannot find module 'vscode-nls'`

## [3.7.0] - 2020-08-06

### Added

- i18n: `zh-cn` support

### Changed

- stop the player when activated

### Fixed

- sign in process

## [3.6.2] - 2020-08-05

### Added

- Configuration: `cloudmusic.player.mediaControl`

### Fixed

- check if platform is supported

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
- performance improvements

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
