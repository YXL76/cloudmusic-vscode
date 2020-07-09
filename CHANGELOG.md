# Change Log

All notable changes to the "cloudmusic" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

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
