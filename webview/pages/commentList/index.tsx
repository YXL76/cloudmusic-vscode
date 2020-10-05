import "./index.scss";
import { Avatar, Button, List, Skeleton, Tabs } from "antd";
import React, { useState } from "react";
import type { CommentDetail } from "../../constant";
import LikeFilled from "@ant-design/icons/LikeFilled";
import LikeOutlined from "@ant-design/icons/LikeOutlined";
import moment from "moment";

const { TabPane } = Tabs;

const { vscode, data } = window.webview;
const { i18n, message } = data;
const pageSize = message?.pageSize || 50;

const emptyData = new Array(pageSize).fill({
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

enum SortType {
  recommendation = 1,
  hottest = 2,
  latest = 3,
}

export const CommentList = () => {
  const [lists, setLists] = useState([emptyData, emptyData, emptyData]);
  const [loadings, setLoadings] = useState([true, true, true]);
  const [total, setTotals] = useState(pageSize);

  window.addEventListener("message", ({ data }) => {
    const { command } = data as { command: "list" | "total" | "like" };
    if (command === "list") {
      const { sortType, comments } = data as {
        sortType: SortType;
        comments: CommentDetail[];
      };
      const idx = sortType - 1;
      setLists([...lists.slice(0, idx), comments, ...lists.slice(idx + 1)]);
      setLoadings([
        ...loadings.slice(0, idx),
        false,
        ...loadings.slice(idx + 1),
      ]);
    } else if (command === "total") {
      const { total } = data as { total: number };
      setTotals(total);
    } else if (command === "like") {
    }
  });

  const usr = (id: number) => {
    vscode.postMessage({ command: "user", id });
  };

  const tab = (sortType: SortType) => {
    const idx = sortType - 1;
    return (
      <List
        size="small"
        itemLayout="horizontal"
        pagination={{
          onChange: (page) => {
            setLoadings([
              ...loadings.slice(0, idx),
              true,
              ...loadings.slice(idx + 1),
            ]);
            vscode.postMessage({ command: "list", sortType, page });
          },
          defaultPageSize: pageSize,
          showQuickJumper: true,
          showSizeChanger: false,
          total,
          disabled: loadings[idx],
          showTotal: (total, range) => `${range.join("-")} / ${total}`,
        }}
        dataSource={lists[idx]}
        renderItem={(
          { commentId, user, content, liked, likedCount, time, beReplied },
          index
        ) => (
          <Skeleton avatar title={false} loading={loadings[idx]} active>
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
    <Tabs
      className="commentList"
      tabBarExtraContent={<div>{`${i18n?.comment as string} (${total})`}</div>}
    >
      <TabPane tab={i18n?.recommendation} key="1" forceRender>
        {tab(SortType.recommendation)}
      </TabPane>
      <TabPane tab={i18n?.hottest} key="2" forceRender>
        {tab(SortType.hottest)}
      </TabPane>
      <TabPane tab={i18n?.latest} key="3" forceRender>
        {tab(SortType.latest)}
      </TabPane>
    </Tabs>
  );
};
