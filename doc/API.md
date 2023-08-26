# API

Use [NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi) to provide `API`, the following is a complete list, ✔️ means realized, ❌ means no implementation plan

## 专辑类

|        module        |        function        | status |
| :------------------: | :--------------------: | :----: |
|        album         |        专辑内容        |   ✔️    |
|      album_list      |   数字专辑-新碟上架    |   ❌    |
|      album_new       |        全部新碟        |   ❌    |
|      album_sub       |   收藏与取消收藏专辑   |   ✔️    |
|     album_detail     |        专辑详情        |   ❌    |
|     album_newest     |        最新专辑        |   ✔️    |
|    album_sublist     |     已收藏专辑列表     |   ✔️    |
|   album_list_style   |  数字专辑-语种风格馆   |   ❌    |
| album_detail_dynamic |      专辑动态信息      |   ❌    |
| album_songsaleboard  | 数字专辑&数字单曲-榜单 |   ❌    |
| digitalAlbum_detail  |      数字专辑详情      |   ❌    |
|  digitalAlbum_sales  |      数字专辑销量      |   ❌    |

## 歌手类

|       module        |      function      | status |
| :-----------------: | :----------------: | :----: |
|    artist_album     |    歌手专辑列表    |   ✔️    |
|     artist_desc     |      歌手介绍      |   ✔️    |
|    artist_detail    |      歌手详情      |        |
|     artist_fans     |      歌手粉丝      |        |
| artist_follow_count |    歌手粉丝数量    |        |
|     artist_list     |      歌手分类      |   ✔️    |
|      artist_mv      |    歌手相关 MV     |   ❌    |
|    artist_new_mv    |    歌手最新 MV     |   ❌    |
|   artist_new_song   |    歌手最新歌曲    |        |
|    artist_songs     |    歌手所有歌曲    |   ✔️    |
|     artist_sub      | 收藏与取消收藏歌手 |   ✔️    |
|   artist_sublist    |    关注歌手列表    |   ✔️    |
|   artist_top_song   | 歌手热门 50 首歌曲 |   ❌    |
|       artists       |      歌手单曲      |   ✔️    |
|     simi_artist     |      相似歌手      |   ✔️    |

## 歌曲类

|      module       |      function      | status |
| :---------------: | :----------------: | :----: |
|    check_music    |     歌曲可用性     |   ❌    |
|       like        | 红心与取消红心歌曲 |   ✔️    |
|       lyric       |        歌词        |   ✔️    |
|     lyric_new     |        歌词        |   ✔️    |
|     simi_song     |      相似歌曲      |   ✔️    |
|    sheet_list     |      乐谱列表      |   ❌    |
|   sheet_preview   |      乐谱预览      |   ❌    |
|    song_detail    |      歌曲详情      |   ✔️    |
| song_download_url |   客户端歌曲下载   |   ✔️    |
|     song_url      |      歌曲链接      |   ✔️    |
|    song_url_v1    |      歌曲链接      |   ✔️    |
| song_wiki_summary |  音乐百科基础信息  |   ❌    |

## 评论类

|        module        |      function      | status |
| :------------------: | :----------------: | :----: |
|       comment        |   发送与删除评论   |   ✔️    |
|    comment_album     |      专辑评论      |   ❌    |
|      comment_dj      |      电台评论      |   ❌    |
|    comment_event     |    获取动态评论    |   ❌    |
|    comment_floor     |      楼层评论      |   ✔️    |
|     comment_hot      |      热门评论      |   ❌    |
|   comment_hug_list   |   评论抱一抱列表   |        |
| comment_hotwall_list |      云村热评      |        |
|     comment_like     | 点赞与取消点赞评论 |   ✔️    |
|    comment_music     |      歌曲评论      |   ❌    |
|      comment_mv      |      MV 评论       |   ❌    |
|     comment_new      |      新版评论      |   ✔️    |
|   comment_playlist   |      歌单评论      |   ❌    |
|    comment_video     |      视频评论      |   ❌    |
|     hug_comment      |     抱一抱评论     |        |

## 电台类

|          module          |       function        | status |
| :----------------------: | :-------------------: | :----: |
|       audio_upload       |     播客上传声音      |   ❌    |
|  dj_category_excludehot  |    电台非热门类型     |   ❌    |
|  dj_category_recommend   |     电台推荐类型      |   ✔️    |
|       dj_catelist        |     电台分类列表      |   ✔️    |
|        dj_detail         |       电台详情        |   ✔️    |
|          dj_hot          |       热门电台        |   ✔️    |
|        dj_paygift        |       付费电台        |   ❌    |
|        dj_program        |     电台节目列表      |   ✔️    |
|    dj_program_detail     |     电台节目详情      |   ✔️    |
|    dj_program_toplist    |      电台节目榜       |   ✔️    |
| dj_program_toplist_hours |  电台 24 小时节目榜   |   ✔️    |
|       dj_radio_hot       |     类别热门电台      |   ✔️    |
|       dj_recommend       |       精选电台        |   ✔️    |
|    dj_recommend_type     |     精选电台分类      |   ✔️    |
|          dj_sub          |    订阅与取消电台     |   ✔️    |
|        dj_sublist        |     订阅电台列表      |   ✔️    |
|      dj_subscriber       |      电台订阅者       |   ✔️    |
|    dj_today_perfered     |     电台今日优选      |   ❌    |
|        dj_toplist        | 新晋电台榜/热门电台榜 |   ✔️    |
|     dj_toplist_hours     |  电台 24 小时主播榜   |   ❌    |
|   dj_toplist_newcomer    |      电台新人榜       |   ❌    |
|      dj_toplist_pay      |       付费精品        |   ❌    |
|    dj_toplist_popular    |    电台最热主播榜     |   ❌    |

## 歌单类

|           module           |           function            | status |
| :------------------------: | :---------------------------: | :----: |
|          likelist          |       喜欢的歌曲(无序)        |   ✔️    |
|      playlist_catlist      |         全部歌单分类          |   ✔️    |
|   playlist_cover_update    |         歌单封面上传          |   ❌    |
|      playlist_create       |           创建歌单            |   ✔️    |
|      playlist_delete       |           删除歌单            |   ✔️    |
|      playlist_detail       |           歌单详情            |   ✔️    |
|  playlist_detail_dynamic   |         歌单详情动态          |        |
|    playlist_desc_update    |         更新歌单描述          |   ❌    |
| playlist_highquality_tags  |         精品歌单标签          |   ✔️    |
|        playlist_hot        |         热门歌单分类          |   ❌    |
|    playlist_name_update    |          更新歌单名           |   ❌    |
|   playlist_order_update    |         编辑歌单顺序          |   ❌    |
|      playlist_privacy      |         公开隐私歌单          |   ❌    |
|     playlist_subscribe     |      收藏与取消收藏歌单       |   ✔️    |
|    playlist_subscribers    |          歌单收藏者           |   ✔️    |
|    playlist_tags_update    |         更新歌单标签          |   ❌    |
|      playlist_tracks       | 收藏单曲到歌单/从歌单删除歌曲 |   ✔️    |
|      playlist_update       |           编辑歌单            |   ✔️    |
| playlist_update_playcount  |          更新播放量           |   ✔️    |
| playmode_intelligence_list |           智能播放            |   ✔️    |
|    playmode_song_vector    |          云随机播放           |   ✔️    |
|      related_playlist      |           相关歌单            |   ✔️    |
|       simi_playlist        |           相似歌单            |   ✔️    |
|     song_order_update      |         更新歌曲顺序          |   ❌    |
|        top_playlist        |           分类歌单            |   ✔️    |
|  top_playlist_highquality  |           精品歌单            |   ✔️    |

## MV 类

|      module       |       function        | status |
| :---------------: | :-------------------: | :----: |
|      mv_all       |        全部 MV        |   ❌    |
|     mv_detail     |        MV 详情        |   ✔️    |
|  mv_detail_info   | MV 点赞转发评论数数据 |   ❌    |
| mv_exclusive_rcmd |       网易出品        |   ❌    |
|     mv_first      |        最新 MV        |   ❌    |
|      mv_sub       |   收藏与取消收藏 MV   |   ❌    |
|    mv_sublist     |    已收藏 MV 列表     |   ❌    |
|      mv_url       |        MV 链接        |   ✔️    |
| related_allvideo  |       相关视频        |   ❌    |
|      simi_mv      |        相似 MV        |   ❌    |

## 视频类

|          module          |        function        | status |
| :----------------------: | :--------------------: | :----: |
|     playlist_mylike      |      点赞过的视频      |   ❌    |
|    playlist_track_add    |   收藏视频到视频歌单   |   ❌    |
|  playlist_track_delete   |  删除视频歌单里的视频  |   ❌    |
|  playlist_video_recent   |     最近播放的视频     |   ❌    |
|     mlog_music_rcmd      |      歌曲相关视频      |   ❌    |
|      mlog_to_video       | 将 mlog id 转为视频 id |   ❌    |
|         mlog_url         |   获取 mlog 播放地址   |   ❌    |
|   video_category_list    |      视频分类列表      |   ❌    |
|       video_detail       |        视频详情        |   ❌    |
|    video_detail_info     | 视频点赞转发评论数数据 |   ❌    |
|       video_group        | 视频标签/分类下的视频  |   ❌    |
|     video_group_list     |      视频标签列表      |   ❌    |
|        video_sub         |   收藏与取消收藏视频   |   ❌    |
|    video_timeline_all    |      全部视频列表      |   ❌    |
| video_timeline_recommend |        推荐视频        |   ❌    |
|        video_url         |        视频链接        |   ❌    |

## 帐号类

|              module              |        function        | status |
| :------------------------------: | :--------------------: | :----: |
|      activate_init_profile       |       初始化名字       |   ❌    |
|        aidj_content_rcmd         |        私人 DJ         |        |
|          avatar_upload           |        更新头像        |   ❌    |
|           captcha_sent           |       发送验证码       |   ✔️    |
|          captcha_verify          |       校验验证码       |   ❌    |
|    cellphone_existence_check     | 检测手机号码是否已注册 |   ❌    |
|              cloud               |        云盘上传        |   ❌    |
|           cloud_match            |  云盘歌曲信息匹配纠正  |   ❌    |
|           daily_signin           |          签到          |   ✔️    |
|      digitalAlbum_ordering       |      购买数字专辑      |   ❌    |
|      digitalAlbum_purchased      |      我的数字专辑      |   ❌    |
|     dj_personalize_recommend     |      电台个性推荐      |   ✔️    |
|              event               |          动态          |        |
|            event_del             |        删除动态        |        |
|          event_forward           |        转发动态        |        |
|             fm_trash             |         垃圾桶         |   ✔️    |
|              follow              |   关注与取消关注用户   |   ❌    |
|     history_recommend_songs      |    历史每日推荐歌曲    |   ❌    |
|  history_recommend_songs_detail  |  历史每日推荐歌曲详情  |   ❌    |
|      listen_together_status      |       一起听状态       |        |
|              login               |        邮箱登录        |   ✔️    |
|         login_cellphone          |        手机登录        |   ✔️    |
|          login_qr_check          |     二维码扫码状态     |   ✔️    |
|         login_qr_create          |       二维码生成       |   ✔️    |
|           login_qr_key           |    二维码 key 生成     |   ✔️    |
|          login_refresh           |        登录刷新        |   ✔️    |
|           login_status           |        登录状态        |   ✔️    |
|              logout              |        退出登录        |   ✔️    |
|           msg_comments           |          评论          |        |
|           msg_forwards           |          @我           |        |
|           msg_notices            |          通知          |        |
|           msg_private            |          私信          |        |
|       msg_private_history        |        私信内容        |        |
|        msg_recentcontact         |       最近联系人       |        |
|        musician_tasks_new        |     获取音乐人任务     |   ❌    |
|          nickname_check          |      重复昵称检测      |   ❌    |
|           personal_fm            |        私人 FM         |   ✔️    |
|           personalized           |        推荐歌单        |   ✔️    |
|      personalized_djprogram      |        推荐电台        |   ✔️    |
|         personalized_mv          |        推荐 MV         |   ❌    |
|       personalized_newsong       |        推荐新歌        |   ✔️    |
|   personalized_privatecontent    |        独家放送        |   ❌    |
| personalized_privatecontent_list |      独家放送列表      |   ❌    |
|              rebind              |        更换手机        |   ❌    |
|        recommend_resource        |      每日推荐歌单      |   ✔️    |
|         recommend_songs          |      每日推荐歌曲      |   ✔️    |
|        register_cellphone        |        注册账号        |   ❌    |
|          resource_like           |   点赞与取消点赞资源   |        |
|             scrobble             |        听歌打卡        |   ✔️    |
|         send_event_text          |      发送文本动态      |        |
|          send_playlist           |        私信歌单        |        |
|            send_song             |        私信音乐        |        |
|            send_text             |          私信          |        |
|             setting              |          设置          |   ❌    |
|          share_resource          |     分享歌曲到动态     |        |
|         sign_happy_info          |        乐签信息        |   ❌    |
|         signin_progress          |        签到进度        |   ❌    |
|            simi_user             |        相似用户        |   ❌    |
|          song_purchased          |        已购单曲        |        |
|          topic_sub_list          |       收藏的专栏       |        |
|           user_account           |      获取账号信息      |   ❌    |
|            user_audio            |     用户创建的电台     |        |
|           user_binding           |      用户绑定信息      |   ❌    |
|      user_bindingcellphone       |        绑定手机        |   ❌    |
|            user_cloud            |        云盘数据        |   ❌    |
|          user_cloud_del          |      云盘歌曲删除      |   ❌    |
|        user_cloud_detail         |      云盘数据详情      |   ❌    |
|       user_comment_history       |      用户历史评论      |        |
|           user_detail            |        用户详情        |   ✔️    |
|             user_dj              |      用户电台节目      |        |
|            user_event            |        用户动态        |        |
|          user_followeds          |   关注 TA 的人(粉丝)   |   ✔️    |
|           user_follows           |   TA 关注的人(关注)    |   ✔️    |
|            user_level            |      用户等级信息      |   ✔️    |
|          user_playlist           |        用户歌单        |   ✔️    |
|           user_record            |        听歌排行        |   ✔️    |
|          user_subcount           |        收藏计数        |   ❌    |
|           user_update            |      编辑用户信息      |   ❌    |
|             vip_info             |        VIP 信息        |        |
|           vip_info_v2            |        VIP 信息        |        |
|         vip_growthpoint          |       vip 成长值       |        |
|     vip_growthpoint_details      |   vip 成长值获取记录   |        |
|       vip_growthpoint_get        |    领取 vip 成长值     |        |
|            vip_tasks             |        vip 任务        |        |
|         vip_timemachine          |       黑胶时光机       |   ❌    |
|              yunbei              |      云贝签到信息      |   ❌    |
|           yunbei_info            |      云贝账户信息      |   ✔️    |
|         yunbei_rcmd_song         |        云贝推歌        |        |
|     yunbei_rcmd_song_history     |    云贝推歌历史记录    |        |
|           yunbei_sign            |        云贝签到        |   ✔️    |
|           yunbei_tasks           |      云贝所有任务      |   ❌    |
|        yunbei_tasks_todo         |     云贝 todo 任务     |   ❌    |
|       yunbei_tasks_expense       |        云贝支出        |   ❌    |
|       yunbei_tasks_receipt       |        云贝收入        |   ❌    |
|        yunbei_task_finish        |      云贝完成任务      |   ❌    |
|           yunbei_today           |    云贝今日签到信息    |   ✔️    |

## 搜索类

|       module       |    function    | status |
| :----------------: | :------------: | :----: |
| cloudsearch_search |      搜索      |   ✔️    |
|   search_default   | 默认搜索关键词 |   ✔️    |
|     search_hot     |    热门搜索    |   ❌    |
| search_hot_detail  |    热搜列表    |   ✔️    |
| search_multimatch  |   多类型搜索   |   ❌    |
|   search_suggest   |    搜索建议    |   ✔️    |

## 音乐人

|          module           |    function    | status |
| :-----------------------: | :------------: | :----: |
|  musician_data_overview   | 音乐人数据概况 |   ❌    |
|    musician_play_trend    | 音乐人播放趋势 |   ❌    |
|      musician_tasks       |   音乐人任务   |   ❌    |
|    musician_cloudbean     |   账号云豆数   |   ❌    |
| musician_cloudbean_obtain |    领取云豆    |   ❌    |
|       musician_sign       |   音乐人签到   |   ❌    |

## 杂项

|              module              |       function        | status |
| :------------------------------: | :-------------------: | :----: |
|              banner              |      首页轮播图       |   ❌    |
|              batch               |     批量请求接口      |   ❌    |
|             calendar             |       音乐日历        |   ❌    |
|       countries_code_list        |     国家编码列表      |   ✔️    |
|            dj_banner             |      电台 banner      |   ❌    |
|       homepage_block_page        | 首页-发现 block page  |   ❌    |
|       homepage_dragon_ball       | 首页-发现 dragon ball |   ❌    |
|            hot_topic             |       热门话题        |   ❌    |
|        listentogether_end        |    一起听 结束房间    |   ❌    |
|     listentogether_heartbeat     |    一起听 发送心跳    |   ❌    |
|   listentogether_play_command    |  一起听 发送播放状态  |   ❌    |
|    listentogether_room_check     |    一起听 房间情况    |   ❌    |
|    listentogether_room_create    |    一起听 创建房间    |   ❌    |
| listentogether_sync_list_command |  一起听 更新播放列表  |   ❌    |
| listentogether_sync_playlist_get |  一起听 当前列表获取  |   ❌    |
|     music_first_listen_info      |       回忆坐标        |   ❌    |
|    starpick_comments_summary     | 云村星评馆 - 简要评论 |   ❌    |
|        program_recommend         |       推荐节目        |   ✔️    |
|            top_album             |       新碟上架        |   ✔️    |
|           top_artists            |       热门歌手        |   ✔️    |
|             top_list             |        排行榜         |   ❌    |
|              top_mv              |       MV 排行榜       |   ❌    |
|             top_song             |       新歌速递        |   ✔️    |
|           topic_detail           |       话题详情        |   ❌    |
|      topic_detail_event_hot      |   话题详情热门动态    |   ❌    |
|             toplist              |     所有榜单介绍      |   ✔️    |
|          toplist_artist          |        歌手榜         |   ✔️    |
|          toplist_detail          |   所有榜单内容摘要    |   ❌    |
|              weblog              |       操作记录        |   ❌    |
