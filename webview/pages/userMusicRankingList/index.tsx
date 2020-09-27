import "./index.scss";
import "../../global.scss";
import React, { useState } from "react";
import Avatar from "antd/es/avatar";
import Button from "antd/es/button";
import List from "antd/es/list";
import LoadingOutlined from "@ant-design/icons/LoadingOutlined";
import PlayCircleOutlined from "@ant-design/icons/PlayCircleOutlined";
import Progress from "antd/es/progress";
import type { RecordData } from "../../constant";
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

export const UserMusicRankingList = () => {
  const [loading, setLoading] = useState(true);
  const [lists, setLists] = useState([emptyData, emptyData] as RecordData[][]);

  window.addEventListener("message", ({ data }) => {
    setLists(() => data as RecordData[][]);
    setLoading(false);
  });

  const refresh = () => {
    setLoading(true);
    window.webview.vscode.postMessage({ command: "refresh" });
  };

  const tab = (list: RecordData[], max: number) => {
    return (
      <List
        itemLayout="horizontal"
        dataSource={list}
        bordered
        renderItem={({ name, alia, ar, al, playCount }, index) => (
          <List.Item>
            <Skeleton avatar title={false} loading={loading} active>
              <List.Item.Meta
                avatar={<Avatar src={al.picUrl} />}
                title={
                  <a href=".">
                    {name}
                    {alia[0] ? ` (${alia.join(" / ")})` : ""}
                  </a>
                }
                description={ar.map(({ name }) => name).join(" / ")}
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
        )}
      />
    );
  };

  const tabs = lists.map((list, index) => {
    return (
      <TabPane
        tab={index === 0 ? "Weekly" : "All time"}
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
        Refreshing
      </Button>
    ) : (
      <Button shape="round" icon={<ReloadOutlined />} onClick={refresh}>
        Refresh
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
