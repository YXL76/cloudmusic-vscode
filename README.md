# CLOUDMUSIC

网易云音乐`Visual Studio Code`插件。

## Features

## Requirements

需要安装一下至少一个播放器：

- [MPV Player](https://mpv.io/installation/)
- [VLC Player](https://www.videolan.org/vlc/)

对于`Windows`用户，推荐使用`VLC Player`，`MPV Player`在某些情况下可能无法正常工作。如果播放器的路径不位于环境变量中，可以在设置中指定二进制文件的路径
对于`Linux`用户，可以依照自身喜好选择
对于`MAC OS`用户，因为开发者没有相关环境，所以无法测试

如果有更好的方案可以提交`ISSUE`。

## Extension Settings

- `cloudmusic.player.mpvPath`: 指定`MPV Player`的二进制文件路径
- `cloudmusic.player.vlcPath`: 指定`VLC Player`的二进制文件路径

## Known Issues

- `VLC Player`目前在`VS Code`中无法调节音量

## Release Notes

[CHANGELOG](./CHANGELOG.md)
