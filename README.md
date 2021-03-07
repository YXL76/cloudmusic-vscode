<h1 align="center">
  <img src="https://s1.ax1x.com/2020/07/07/UAKcaq.png" alt="CLOUDMUSIC" width="256" />
  <br />
  🎶 CLOUDMUSIC
  <br />
</h1>

<div align="center">

> Netease Music for VS Code

[![Marketplace](https://img.shields.io/visual-studio-marketplace/v/yxl.cloudmusic.svg?label=Marketplace&style=for-the-badge&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=yxl.cloudmusic)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/yxl.cloudmusic.svg?style=for-the-badge)](https://marketplace.visualstudio.com/items?itemName=yxl.cloudmusic)
[![Rating](https://img.shields.io/visual-studio-marketplace/stars/yxl.cloudmusic.svg?style=for-the-badge)](https://marketplace.visualstudio.com/items?itemName=yxl.cloudmusic)

简体中文 | [English](./README.EN.md)

</div>

## Table of contents

- [Table of contents](#table-of-contents)
- [Features](#features)
- [Requirements](#requirements)
- [Usage](#usage)
- [Contributions](#contributions)
- [Release Notes](#release-notes)
- [API](#api)
- [Acknowledgements](#acknowledgements)

## Features

- 简单：开箱即用，无需安装、修改任何文件
- 快速：使用本机模块，资源占用低，速度快
- 强大：借助网页 API，能实现所有常用功能

已实现的功能：

- 每日签到
- 歌曲播放，收藏，喜欢
- 听歌打卡
- 心动模式
- 私人 FM
- 评论（单曲/歌单...）
- 歌词显示
- 解锁变灰音乐
- 搜索（热搜/单曲/专辑/歌手...）
- 排行榜（音乐榜/歌手榜...）
- 发现（新歌速递/新碟上架...）
- 播单/节目
- 缓存管理
- 可选无损音质
- 媒体控制支持
- 更多功能等待发现

扩展产生的所有本地内容都位于`$HOME/.cloudmusic`文件夹中

## Requirements

一般来说，不需要进行任何额外的操作就可以正常使用。对于`Windows`用户，如果扩展无法正常初始化，请尝试安装[Microsoft Visual C++ Redistributable for Visual Studio 2015, 2017 and 2019](https://support.microsoft.com/en-us/help/2977003/the-latest-supported-visual-c-downloads)

## Usage

![Usage](https://s3.ax1x.com/2021/02/04/y3yJU0.png)

支持解锁变灰音乐，可以在设置中开启需要的音源（`cloudmusic.music.unblock`）

## Contributions

完整列表请查看`Feature Contributions`

## Release Notes

[CHANGELOG](./CHANGELOG.md)

## API

[API](./API.md)

## Acknowledgements

受到以下项目的启发：

- [swdc-vscode-musictime](https://github.com/swdotcom/swdc-vscode-musictime)
- [vsc-netease-music](https://github.com/nondanee/vsc-netease-music)
- [netease-music-tui](https://github.com/betta-cyber/netease-music-tui)

感谢这些超棒的项目：

- [NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi)
- [neon](https://github.com/neon-bindings/neon)
- [rodio](https://github.com/RustAudio/rodio)
- [UnblockNeteaseMusic](https://github.com/nondanee/UnblockNeteaseMusic)
