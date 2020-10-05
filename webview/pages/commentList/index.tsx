import "./index.scss";
import { Avatar, Button, List, Tabs } from "antd";
import React, { useState } from "react";
import type { CommentDetail } from "../../constant";
import LikeFilled from "@ant-design/icons/LikeFilled";
import LikeOutlined from "@ant-design/icons/LikeOutlined";
import moment from "moment";

const { TabPane } = Tabs;

const { vscode, data } = window.webview;
const { i18n, message } = data;
const pageSize = message?.pageSize || 30;

enum SortType {
  recommendation = 1,
  hottest = 2,
  latest = 3,
}

export const CommentList = () => {
  const [lists, setLists] = useState([[], [], []] as CommentDetail[][]);
  const [loadings, setLoadings] = useState([true, false, false]);
  const [hasMores, setHasMores] = useState([true, true, true]);
  const [total, setTotal] = useState(pageSize);

  window.addEventListener("message", ({ data }) => {
    const { command } = data as {
      command: "list" | "total" | "more" | "like";
    };
    if (command === "list") {
      const { sortType, comments } = data as {
        sortType: SortType;
        comments: CommentDetail[];
      };
      const idx = sortType - 1;
      setLists([
        ...lists.slice(0, idx),
        lists[idx].concat(comments),
        ...lists.slice(idx + 1),
      ]);
      setLoadings([
        ...loadings.slice(0, idx),
        false,
        ...loadings.slice(idx + 1),
      ]);
    } else if (command === "more") {
      const { sortType, hasMore } = data as {
        sortType: SortType;
        hasMore: boolean;
      };
      const idx = sortType - 1;
      setHasMores([
        ...hasMores.slice(0, idx),
        hasMore,
        ...hasMores.slice(idx + 1),
      ]);
    } else if (command === "like") {
      const { liked, index, sortType } = data as {
        liked: boolean;
        index: number;
        sortType: SortType;
      };
      const idx = sortType - 1;
      if (lists[idx][index].liked !== liked) {
        lists[idx][index].liked = liked;
        lists[idx][index].likedCount += liked ? 1 : -1;
        setLists([...lists]);
      }
    } else if (command === "total") {
      const { total } = data as { total: number };
      setTotal(total);
    }
  });

  const usr = (id: number) => {
    vscode.postMessage({ command: "user", id });
  };

  const loadMore = (sortType: SortType, len: number) => {
    const idx = sortType - 1;
    setLoadings([...loadings.slice(0, idx), true, ...loadings.slice(idx + 1)]);
    vscode.postMessage({
      command: "list",
      sortType,
      pageNo: Math.floor(len / pageSize) + 1,
    });
  };

  const tab = (sortType: SortType) => {
    const idx = sortType - 1;
    return (
      <List
        size="small"
        itemLayout="horizontal"
        loadMore={
          hasMores[idx] ? (
            <div
              style={{
                textAlign: "center",
                marginTop: 12,
                marginBottom: 12,
                height: 32,
                lineHeight: "32px",
              }}
            >
              <Button
                loading={loadings[idx]}
                onClick={() => loadMore(sortType, lists[idx].length)}
              >
                More
              </Button>
            </div>
          ) : null
        }
        dataSource={lists[idx]}
        renderItem={(
          {
            commentId,
            user,
            content,
            liked,
            likedCount,
            time,
            beReplied,
            replyCount,
          },
          index
        ) => (
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
                    sortType,
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
                  {beReplied && (
                    <p className="list-content--beReplied">
                      <a href="." onClick={() => usr(beReplied.user.userId)}>
                        @{beReplied.user.nickname}
                      </a>
                      : {beReplied.content}
                    </p>
                  )}
                  {replyCount > 0 && (
                    <div>
                      <a href="." onClick={() => {}}>
                        {`${replyCount} ${i18n?.reply as string}`}
                      </a>
                    </div>
                  )}
                </div>
              }
            />
          </List.Item>
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
