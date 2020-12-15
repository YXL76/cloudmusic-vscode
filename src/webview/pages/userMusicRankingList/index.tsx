import { Avatar, Button, List, Progress, Skeleton, Tabs } from "antd";
import React, { useEffect, useState } from "react";
import type { RecordData, SongsItem } from "../../../constant";
import LoadingOutlined from "@ant-design/icons/LoadingOutlined";
import PlayCircleOutlined from "@ant-design/icons/PlayCircleOutlined";
import ReloadOutlined from "@ant-design/icons/ReloadOutlined";

const { TabPane } = Tabs;

const { vscode, data } = window.webview;
const { i18n } = data;

export const UserMusicRankingList = () => {
  const [loading, setLoading] = useState(true);
  const [lists, setLists] = useState(() => {
    const emptyData = new Array(100).fill({
      name: "",
      id: 0,
      dt: 0,
      alia: [],
      ar: [],
      al: { id: 0, name: "", picUrl: "" },
      playCount: 0,
    }) as RecordData[];
    return [emptyData, emptyData];
  });

  useEffect(() => {
    const handler = ({ data }: { data: RecordData[][] }) => {
      setLists(data);
      setLoading(false);
    };
    window.addEventListener("message", handler);
    return () => {
      window.removeEventListener("message", handler);
    };
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
                  description={ar.map(({ name, id }, index) => (
                    <div key={index} className="inline">
                      <a
                        href="."
                        onClick={() => {
                          artist(id);
                        }}
                      >
                        {name}
                      </a>
                      <div className="inline">
                        {index < ar.length - 1 ? " / " : ""}
                      </div>
                    </div>
                  ))}
                />
                <div className="w-3/5 flex flex-row justify-around items-center">
                  <div className="font-bold pl-1 w-16 text-xl">{index + 1}</div>
                  <div className="flex-grow">
                    <Progress
                      percent={(playCount * 100) / max}
                      size="small"
                      showInfo={false}
                      status="normal"
                      strokeWidth={16}
                    />
                  </div>
                  <div className="flex flex-row justify-around items-center text-lg w-20 ml-4">
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

  const tabs = lists.map((list, index) => (
    <TabPane tab={index === 0 ? i18n?.weekly : i18n?.allTime} key={index}>
      {tab(list, list[0].playCount)}
    </TabPane>
  ));

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

  return <Tabs tabBarExtraContent={OperationsSlot}>{tabs}</Tabs>;
};
