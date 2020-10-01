import "./index.scss";
import React, { useState } from "react";
import Avatar from "antd/es/avatar";
import Button from "antd/es/button";
import type { CommentDetail } from "../../constant";
import LikeFilled from "@ant-design/icons/LikeFilled";
import LikeOutlined from "@ant-design/icons/LikeOutlined";
import List from "antd/es/list";
import Skeleton from "antd/es/skeleton";
import Tabs from "antd/es/tabs";
import moment from "moment";

const { TabPane } = Tabs;

const { vscode, data } = window.webview;
const { i18n, message } = data;
const limit = message?.limit || 50;

const emptyData = new Array(limit).fill({
  user: {
    userId: 0,
    nickname: "",
    signature: "",
    followeds: 0,
    follows: 0,
    avatarUrl: "",
  },
  name: "",
  commentId: 0,
  content: "",
  time: 0,
  likedCount: 0,
  liked: false,
}) as CommentDetail[];

export const CommentList = () => {
  const [hottestLoading, setHottestLoading] = useState(true);
  const [hottestTotal, setHottestTotal] = useState(limit);
  const [hottestLists, setHottestLists] = useState(emptyData);

  const [latestLoading, setLatestLoading] = useState(true);
  const [latestTotal, setLatestTotal] = useState(limit);
  const [latestLists, setLatestLists] = useState(emptyData);

  window.addEventListener("message", ({ data }) => {
    const { command } = data as {
      command: "hottestTotal" | "hottest" | "latestTotal" | "latest" | "like";
    };
    if (command === "hottestTotal") {
      setHottestTotal((data as { total: number }).total);
    } else if (command === "hottest") {
      setHottestLists((data as { hotComments: CommentDetail[] }).hotComments);
      setHottestLoading(false);
    } else if (command === "latestTotal") {
      setLatestTotal((data as { total: number }).total);
    } else if (command === "latest") {
      setLatestLists((data as { comments: CommentDetail[] }).comments);
      setLatestLoading(false);
    } else if (command === "like") {
      const { cid, liked, index } = data as {
        cid: number;
        liked: boolean;
        index: number;
      };
      if (
        hottestLists[index].commentId === cid &&
        hottestLists[index].liked !== liked
      ) {
        hottestLists[index].liked = liked;
        hottestLists[index].likedCount += liked ? 1 : -1;
        setHottestLists([...hottestLists]);
      }
      if (
        latestLists[index].commentId === cid &&
        latestLists[index].liked !== liked
      ) {
        latestLists[index].liked = liked;
        latestLists[index].likedCount += liked ? 1 : -1;
        setLatestLists([...latestLists]);
      }
    }
  });

  const usr = (id: number) => {
    vscode.postMessage({ command: "user", id });
  };

  const tab = (
    list: CommentDetail[],
    total: number,
    loading: boolean,
    command: "hottest" | "latest"
  ) => {
    return (
      <List
        header={`${i18n?.comment as string} (${total})`}
        size="small"
        itemLayout="horizontal"
        pagination={{
          onChange: (page) => {
            if (command === "hottest") {
              setHottestLoading(true);
            } else {
              setLatestLoading(true);
            }
            vscode.postMessage({
              command,
              offset: (page - 1) * limit,
            });
          },
          defaultPageSize: limit,
          showQuickJumper: true,
          showSizeChanger: false,
          total: Math.min(total, 5000),
          disabled: loading,
          showTotal: (total, range) => `${range.join("-")} / ${total}`,
        }}
        dataSource={list}
        renderItem={(
          { commentId, user, content, liked, likedCount, time, beReplied },
          index
        ) => (
          <Skeleton avatar title={false} loading={loading} active>
            <List.Item
              actions={[
                <Button
                  type="text"
                  icon={liked ? <LikeFilled /> : <LikeOutlined />}
                  onClick={() =>
                    vscode.postMessage({
                      command: "like",
                      cid: commentId,
                      t: liked ? 0 : 1,
                      index,
                    })
                  }
                >
                  {` (${likedCount})`}
                </Button>,
                <Button type="text" onClick={() => {}}>
                  {i18n?.reply}
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <a href="." onClick={() => usr(user.userId)}>
                    <Avatar src={user.avatarUrl} />
                  </a>
                }
                title={
                  <div>
                    <a href="." onClick={() => usr(user.userId)}>
                      {user.nickname}
                    </a>
                    <span className="list-title--time">
                      {moment(time).format("YYYY-MM-DD HH:mm:ss")}
                    </span>
                  </div>
                }
                description={
                  <div className="flex flex-column">
                    <p>{content}</p>
                    {beReplied ? (
                      <p className="list-content--beReplied">
                        <a href="." onClick={() => usr(beReplied.user.userId)}>
                          @{beReplied.user.nickname}
                        </a>
                        : {beReplied.content}
                      </p>
                    ) : undefined}
                  </div>
                }
              />
            </List.Item>
          </Skeleton>
        )}
      />
    );
  };

  return (
    <Tabs className="commentList">
      <TabPane tab={i18n?.hottest} key="1" forceRender>
        {tab(hottestLists, hottestTotal, hottestLoading, "hottest")}
      </TabPane>
      <TabPane tab={i18n?.latest} key="2" forceRender>
        {tab(latestLists, latestTotal, latestLoading, "latest")}
      </TabPane>
    </Tabs>
  );
};
