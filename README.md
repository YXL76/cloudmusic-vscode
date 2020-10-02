<div align="center">

<img src="https://s1.ax1x.com/2020/07/07/UAKcaq.png" alt="CLOUDMUSIC" width="256"/>

简体中文 | [English](./README.EN.md)

# CLOUDMUSIC

> Netease Music for VS Code

[![Marketplace](https://img.shields.io/visual-studio-marketplace/v/yxl.cloudmusic.svg?label=Marketplace&style=for-the-badge&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=yxl.cloudmusic)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/yxl.cloudmusic.svg?style=for-the-badge)](https://marketplace.visualstudio.com/items?itemName=yxl.cloudmusic)
[![Rating](https://img.shields.io/visual-studio-marketplace/stars/yxl.cloudmusic.svg?style=for-the-badge)](https://marketplace.visualstudio.com/items?itemName=yxl.cloudmusic)

</div>

## Table of contents

- [Features](#Features)
- [Requirements](#Requirements)
- [Usage](#Usage)
- [Contributions](#Contributions)
  - [Settings](#Settings)
  - [Commands](#Commands)
- [Known Issues](#Known-Issues)
- [Release Notes](#Release-Notes)
- [API](#API)
- [Acknowledgements](#Acknowledgements)

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
- 搜索（热搜/单曲/专辑/歌手...）
- 排行榜（音乐榜/歌手榜...）
- 发现（新歌速递/新碟上架...）
- 缓存管理
- 可选无损音质
- 媒体控制支持
- 更多功能等待发现

扩展产生的所有本地内容都位于`$HOME/.cloudmusic`文件夹中

## Requirements

一般来说，不需要进行任何额外的操作就可以正常使用。对于`Windows`用户，如果扩展无法正常初始化，请尝试安装[Microsoft Visual C++ Redistributable for Visual Studio 2015, 2017 and 2019](https://support.microsoft.com/en-us/help/2977003/the-latest-supported-visual-c-downloads)

## Usage

![First time](https://s1.ax1x.com/2020/07/07/UAgwfP.png)

![Usage](https://s1.ax1x.com/2020/07/07/UAgWYq.png)

## Contributions

完整列表请查看`Feature Contributions`

### Settings

- `cloudmusic.account.autoCheck`: 登录后自动签到
- `cloudmusic.cache.size`: 缓存大小限制
- `cloudmusic.music.quality`: 音质选择

### Commands

- `Cloudmusic: Sign in`: 登录
- `Cloudmusic: Sign out`: 登出
- `Cloudmusic: Daily check`: 每日签到
- `Cloudmusic: Toggle button`: 显示/隐藏按钮
- `Cloudmusic: Search`: 搜索

## Known Issues

## Release Notes

[CHANGELOG](./CHANGELOG.md)

## API

使用[NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi)提供`API`，下面为完整列表，✔️ 代表已实现，❌ 代表无实现计划

- 专辑类

|        module        |        function        | status |
| :------------------: | :--------------------: | :----: |
|        album         |        专辑内容        |   ✔️   |
|      album_list      |   数字专辑-新碟上架    |   ❌   |
|      album_new       |        全部新碟        |   ❌   |
|      album_sub       |   收藏与取消收藏专辑   |   ✔️   |
|     album_detail     |      数字专辑详情      |   ❌   |
|     album_newest     |        最新专辑        |   ✔️   |
|    album_sublist     |     已收藏专辑列表     |   ✔️   |
|   album_list_style   |  数字专辑-语种风格馆   |   ❌   |
| album_detail_dynamic |      专辑动态信息      |   ❌   |
| album_songsaleboard  | 数字专辑&数字单曲-榜单 |   ❌   |

- 歌手类

|     module      |      function      | status |
| :-------------: | :----------------: | :----: |
|  artist_album   |    歌手专辑列表    |   ✔️   |
|   artist_desc   |      歌手介绍      |        |
|   artist_list   |      歌手分类      |   ✔️   |
|    artist_mv    |    歌手相关 MV     |   ❌   |
|  artist_songs   |    歌手所有歌曲    |   ✔️   |
|   artist_sub    | 收藏与取消收藏歌手 |   ✔️   |
| artist_sublist  |    关注歌手列表    |   ✔️   |
| artist_top_song | 歌手热门 50 首歌曲 |   ❌   |
|     artists     |      歌手单曲      |   ✔️   |
|   simi_artist   |      相似歌手      |   ✔️   |

- 歌曲类

|   module    |      function      | status |
| :---------: | :----------------: | :----: |
| check_music |     歌曲可用性     |   ✔️   |
|    lyric    |        歌词        |   ✔️   |
|  simi_song  |      相似歌曲      |   ✔️   |
| song_detail |      歌曲详情      |   ✔️   |
|  song_url   |      歌曲链接      |   ✔️   |
|    like     | 红心与取消红心歌曲 |   ✔️   |

- 评论类

|        module        |      function      | status |
| :------------------: | :----------------: | :----: |
|       comment        |   发送与删除评论   |        |
|    comment_album     |      专辑评论      |   ✔️   |
|      comment_dj      |      电台评论      |        |
|    comment_event     |    获取动态评论    |        |
|    comment_floor     |      楼层评论      |        |
|     comment_hot      |      热门评论      |   ✔️   |
| comment_hotwall_list |      云村热评      |        |
|     comment_like     | 点赞与取消点赞评论 |   ✔️   |
|    comment_music     |      歌曲评论      |   ✔️   |
|      comment_mv      |      MV 评论       |   ❌   |
|   comment_playlist   |      歌单评论      |   ✔️   |
|    comment_video     |      视频评论      |   ❌   |

- 电台类

|          module          |       function        | status |
| :----------------------: | :-------------------: | :----: |
|  dj_category_excludehot  |    电台非热门类型     |        |
|  dj_category_recommend   |     电台推荐类型      |        |
|       dj_catelist        |     电台分类列表      |        |
|        dj_detail         |       电台详情        |        |
|          dj_hot          |       热门电台        |        |
|        dj_paygift        |       付费电台        |        |
| dj_personalize_recommend |     电台个性推荐      |        |
|        dj_program        |     电台节目列表      |        |
|    dj_program_detail     |     电台节目详情      |        |
|    dj_program_toplist    |      电台节目榜       |        |
| dj_program_toplist_hours |  电台 24 小时节目榜   |        |
|       dj_radio_hot       |     类别热门电台      |        |
|       dj_recommend       |       精选电台        |        |
|    dj_recommend_type     |     精选电台分类      |        |
|          dj_sub          |    订阅与取消电台     |        |
|        dj_sublist        |     订阅电台列表      |        |
|    dj_today_perfered     |     电台今日优选      |        |
|        dj_toplist        | 新晋电台榜/热门电台榜 |        |
|     dj_toplist_hours     |  电台 24 小时主播榜   |        |
|   dj_toplist_newcomer    |      电台新人榜       |        |
|      dj_toplist_pay      |       付费精品        |   ❌   |
|    dj_toplist_popular    |    电台最热主播榜     |        |

- 歌单类

|           module           |           function            | status |
| :------------------------: | :---------------------------: | :----: |
|          likelist          |       喜欢的歌曲(无序)        |   ✔️   |
|      playlist_catlist      |         全部歌单分类          |   ✔️   |
|   playlist_cover_update    |         歌单封面上传          |   ❌   |
|      playlist_create       |           创建歌单            |   ✔️   |
|      playlist_delete       |           删除歌单            |   ✔️   |
|      playlist_detail       |           歌单详情            |   ✔️   |
|    playlist_desc_update    |         更新歌单描述          |   ❌   |
| playlist_highquality_tags  |         精品歌单标签          |   ✔️   |
|        playlist_hot        |         热门歌单分类          |   ❌   |
|    playlist_name_update    |          更新歌单名           |   ❌   |
|   playlist_order_update    |         编辑歌单顺序          |   ❌   |
|     playlist_subscribe     |      收藏与取消收藏歌单       |   ✔️   |
|    playlist_subscribers    |          歌单收藏者           |   ✔️   |
|    playlist_tags_update    |         更新歌单标签          |   ❌   |
|      playlist_tracks       | 收藏单曲到歌单/从歌单删除歌曲 |   ✔️   |
|      playlist_update       |           编辑歌单            |   ✔️   |
| playmode_intelligence_list |           智能播放            |   ✔️   |
|      related_playlist      |           相关歌单            |   ✔️   |
|       simi_playlist        |           相似歌单            |   ✔️   |
|     song_order_update      |         更新歌曲顺序          |   ❌   |
|        top_playlist        |           分类歌单            |   ✔️   |
|  top_playlist_highquality  |           精品歌单            |   ✔️   |

- MV 类

|      module       |       function        | status |
| :---------------: | :-------------------: | :----: |
|      mv_all       |        全部 MV        |   ❌   |
|     mv_detail     |        MV 详情        |   ❌   |
|  mv_detail_info   | MV 点赞转发评论数数据 |   ❌   |
| mv_exclusive_rcmd |       网易出品        |   ❌   |
|     mv_first      |        最新 MV        |   ❌   |
|      mv_sub       |   收藏与取消收藏 MV   |   ❌   |
|    mv_sublist     |    已收藏 MV 列表     |   ❌   |
|      mv_url       |        MV 链接        |   ❌   |
| related_allvideo  |       相关视频        |   ❌   |
|      simi_mv      |        相似 MV        |   ❌   |

- 视频类

|          module          |        function        | status |
| :----------------------: | :--------------------: | :----: |
|   video_category_list    |      视频分类列表      |   ❌   |
|       video_detail       |        视频详情        |   ❌   |
|    video_detail_info     | 视频点赞转发评论数数据 |   ❌   |
|       video_group        | 视频标签/分类下的视频  |   ❌   |
|     video_group_list     |      视频标签列表      |   ❌   |
|        video_sub         |   收藏与取消收藏视频   |   ❌   |
|    video_timeline_all    |      全部视频列表      |   ❌   |
| video_timeline_recommend |        推荐视频        |   ❌   |
|        video_url         |        视频链接        |   ❌   |

- 帐号类

|              module              |        function        | status |
| :------------------------------: | :--------------------: | :----: |
|      activate_init_profile       |       初始化名字       |   ❌   |
|          avatar_upload           |        更新头像        |   ❌   |
|           captcha_sent           |       发送验证码       |   ❌   |
|          captcha_verify          |       校验验证码       |   ❌   |
|    cellphone_existence_check     | 检测手机号码是否已注册 |   ❌   |
|           daily_signin           |          签到          |   ✔️   |
|      digitalAlbum_ordering       |      购买数字专辑      |   ❌   |
|      digitalAlbum_purchased      |      我的数字专辑      |   ❌   |
|              event               |          动态          |        |
|            event_del             |        删除动态        |        |
|          event_forward           |        转发动态        |        |
|             fm_trash             |         垃圾桶         |   ✔️   |
|              follow              |   关注与取消关注用户   |   ❌   |
|     history_recommend_songs      |    历史每日推荐歌曲    |   ❌   |
|  history_recommend_songs_detail  |  历史每日推荐歌曲详情  |   ❌   |
|              login               |        邮箱登录        |   ✔️   |
|         login_cellphone          |        手机登录        |   ✔️   |
|          login_refresh           |        登录刷新        |   ✔️   |
|           login_status           |        登录状态        |   ✔️   |
|              logout              |        退出登录        |   ✔️   |
|           msg_comments           |          评论          |        |
|           msg_forwards           |          @我           |        |
|           msg_notices            |          通知          |        |
|           msg_private            |          私信          |        |
|       msg_private_history        |        私信内容        |        |
|           personal_fm            |        私人 FM         |   ✔️   |
|           personalized           |        推荐歌单        |   ✔️   |
|      personalized_djprogram      |        推荐电台        |        |
|         personalized_mv          |        推荐 MV         |   ❌   |
|       personalized_newsong       |        推荐新歌        |   ✔️   |
|   personalized_privatecontent    |        独家放送        |   ❌   |
| personalized_privatecontent_list |      独家放送列表      |   ❌   |
|              rebind              |        更换手机        |   ❌   |
|        recommend_resource        |      每日推荐歌单      |   ✔️   |
|         recommend_songs          |      每日推荐歌曲      |   ✔️   |
|        register_cellphone        |        注册账号        |   ❌   |
|          resource_like           |   点赞与取消点赞资源   |        |
|             scrobble             |        听歌打卡        |   ✔️   |
|          send_playlist           |        私信歌单        |        |
|            send_text             |          私信          |        |
|             setting              |          设置          |   ❌   |
|          share_resource          |     分享歌曲到动态     |        |
|            simi_user             |        相似用户        |        |
|            user_audio            |     用户创建的电台     |        |
|            user_cloud            |        云盘数据        |   ❌   |
|          user_cloud_del          |      云盘歌曲删除      |   ❌   |
|        user_cloud_detail         |      云盘数据详情      |   ❌   |
|           user_detail            |        用户详情        |   ✔️   |
|             user_dj              |      用户电台节目      |        |
|            user_event            |        用户动态        |        |
|          user_followeds          |   关注 TA 的人(粉丝)   |   ✔️   |
|           user_follows           |   TA 关注的人(关注)    |   ✔️   |
|            user_level            |      用户等级信息      |   ✔️   |
|          user_playlist           |        用户歌单        |   ✔️   |
|           user_record            |        听歌排行        |   ✔️   |
|          user_subcount           |        收藏计数        |   ❌   |
|           user_update            |      编辑用户信息      |   ❌   |

- 搜索类

|       module       |    function    | status |
| :----------------: | :------------: | :----: |
| cloudsearch/search |      搜索      |   ✔️   |
|   search_default   | 默认搜索关键词 |   ❌   |
|     search_hot     |    热门搜索    |   ❌   |
| search_hot_detail  |    热搜列表    |   ✔️   |
| search_multimatch  |   多类型搜索   |   ❌   |
|   search_suggest   |    搜索建议    |   ✔️   |

- 杂项

|        module        |       function        | status |
| :------------------: | :-------------------: | :----: |
|        banner        |      首页轮播图       |   ❌   |
|        batch         |     批量请求接口      |        |
| countries_code_list  |     国家编码列表      |        |
|      dj_banner       |      电台 banner      |   ❌   |
| homepage_block_page  | 首页-发现 block page  |   ❌   |
| homepage_dragon_ball | 首页-发现 dragon ball |   ❌   |
|      hot_topic       |       热门话题        |   ❌   |
|  program_recommend   |       推荐节目        |        |
|      top_album       |       新碟上架        |   ✔️   |
|     top_artists      |       热门歌手        |   ✔️   |
|       top_list       |        排行榜         |   ❌   |
|        top_mv        |       MV 排行榜       |   ❌   |
|       top_song       |       新歌速递        |   ✔️   |
|       toplist        |     所有榜单介绍      |   ✔️   |
|    toplist_artist    |        歌手榜         |   ✔️   |
|    toplist_detail    |   所有榜单内容摘要    |   ❌   |
|        weblog        |       操作记录        |        |

## Acknowledgements

受到以下项目的启发：

- [swdc-vscode-musictime](https://github.com/swdotcom/swdc-vscode-musictime)
- [vsc-netease-music](https://github.com/nondanee/vsc-netease-music)
- [netease-music-tui](https://github.com/betta-cyber/netease-music-tui)

感谢这些超棒的项目：

- [NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi)
- [neon](https://github.com/neon-bindings/neon)
- [rodio](https://github.com/RustAudio/rodio)
