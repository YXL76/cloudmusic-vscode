# Change Log

All notable changes to the "cloudmusic" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

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
