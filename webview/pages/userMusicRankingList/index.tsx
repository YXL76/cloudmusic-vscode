import "./index.scss";
import "../../global.scss";
import React, { useState } from "react";
import type { RecordData, SongsItem } from "../../constant";
import Avatar from "antd/es/avatar";
import Button from "antd/es/button";
import List from "antd/es/list";
import LoadingOutlined from "@ant-design/icons/LoadingOutlined";
import PlayCircleOutlined from "@ant-design/icons/PlayCircleOutlined";
import Progress from "antd/es/progress";
import ReloadOutlined from "@ant-design/icons/ReloadOutlined";
import Skeleton from "antd/es/skeleton";
import Tabs from "antd/es/tabs";

const { TabPane } = Tabs;

const emptyData = new Array(100).fill({
  name: "",
  id: 0,
  dt: 0,
  alia: [],
  ar: [],
  al: { id: 0, name: "", picUrl: "" },
  playCount: 0,
}) as RecordData[];

const { vscode } = window.webview;
const { i18n } = window.webview.data;

export const UserMusicRankingList = () => {
  const [loading, setLoading] = useState(true);
  const [lists, setLists] = useState([emptyData, emptyData] as RecordData[][]);

  window.addEventListener("message", ({ data }) => {
    setLists(() => data as RecordData[][]);
    setLoading(false);
  });

  const refresh = () => {
    setLoading(true);
    vscode.postMessage({ command: "refresh" });
  };

  const song = (item: SongsItem) => {
    vscode.postMessage({ command: "song", item });
  };

  const album = (id: number) => {
    vscode.postMessage({ command: "album", id });
  };

  const artist = (id: number) => {
    vscode.postMessage({ command: "artist", id });
  };

  const tab = (list: RecordData[], max: number) => {
    return (
      <List
        itemLayout="horizontal"
        dataSource={list}
        bordered
        renderItem={(item, index) => {
          const { name, alia, ar, al, playCount } = item;
          return (
            <List.Item>
              <Skeleton avatar title={false} loading={loading} active>
                <List.Item.Meta
                  avatar={
                    <a
                      href="."
                      onClick={() => {
                        album(al.id);
                      }}
                    >
                      <Avatar src={al.picUrl} />
                    </a>
                  }
                  title={
                    <a
                      href="."
                      onClick={() => {
                        song(item);
                      }}
                    >
                      {name}
                      {alia[0] ? ` (${alia.join(" / ")})` : ""}
                    </a>
                  }
                  description={ar.map(({ name, id }, index) => {
                    return (
                      <text>
                        <a
                          href="."
                          onClick={() => {
                            artist(id);
                          }}
                        >
                          {name}
                        </a>
                        <text>{index < ar.length - 1 ? " / " : ""}</text>
                      </text>
                    );
                  })}
                />
                <div className="list-extra flex flex-row flex-space-around flex-align-center">
                  <div className="list-extra--order">{index + 1}</div>
                  <div className="list-extra--progress">
                    <Progress
                      percent={(playCount * 100) / max}
                      size="small"
                      showInfo={false}
                      status="normal"
                      strokeWidth={16}
                    />
                  </div>
                  <div className="list-extra--count flex flex-row flex-space-around flex-align-center">
                    <PlayCircleOutlined />
                    {playCount}
                  </div>
                </div>
              </Skeleton>
            </List.Item>
          );
        }}
      />
    );
  };

  const tabs = lists.map((list, index) => {
    return (
      <TabPane
        tab={index === 0 ? i18n?.weekly : i18n?.allTime}
        key={index}
        forceRender
      >
        {tab(list, list[0].playCount)}
      </TabPane>
    );
  });

  const OperationsSlot = {
    right: loading ? (
      <Button shape="round" icon={<LoadingOutlined />} disabled>
        {i18n?.refreshing}
      </Button>
    ) : (
      <Button shape="round" icon={<ReloadOutlined />} onClick={refresh}>
        {i18n?.refresh}
      </Button>
    ),
  };

  return (
    <Tabs
      className="userMusicRankingList"
      tabBarExtraContent={OperationsSlot}
      animated
    >
      {tabs}
    </Tabs>
  );
};
