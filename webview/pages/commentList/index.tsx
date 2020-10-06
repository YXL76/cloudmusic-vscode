import "./index.scss";
import { Avatar, Button, Divider, Drawer, Input, List, Tabs } from "antd";
import React, { useState } from "react";
import type { CommentDetail } from "../../constant";
import LikeFilled from "@ant-design/icons/LikeFilled";
import LikeOutlined from "@ant-design/icons/LikeOutlined";
import PlusOutlined from "@ant-design/icons/PlusOutlined";
import UploadOutlined from "@ant-design/icons/UploadOutlined";
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
  const [total, setTotal] = useState(0);

  const [replyVisible, setReplyVisible] = useState(false);
  const [content, setContent] = useState("");
  const [replyAction, setReplyAction] = useState("add" as "add" | "reply");
  const [cid, setCid] = useState(0);

  const [floorVisible, setFloorVisible] = useState(false);
  const [floorOwner, setFloorOwner] = useState([] as CommentDetail[]);
  const [floorList, setFloorList] = useState([] as CommentDetail[]);
  const [floorLoading, setFloorLoading] = useState(true);
  const [floorHasMore, setFloorHasMore] = useState(true);
  const [pid, setPid] = useState(0);

  window.addEventListener("message", ({ data }) => {
    const { command } = data as {
      command: "list" | "total" | "more" | "like" | "floor";
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
      const { liked, cid } = data as {
        liked: boolean;
        cid: number;
      };
      for (const list of lists) {
        const idx = list.findIndex((value) => value.commentId === cid);
        if (idx >= 0) {
          if (list[idx].liked !== liked) {
            list[idx].liked = liked;
            list[idx].likedCount += liked ? 1 : -1;
          }
        }
      }
      setLists([...lists]);
    } else if (command === "total") {
      const { total } = data as { total: number };
      setTotal(total);
    } else if (command === "floor") {
      const { hasMore, comments } = data as {
        hasMore: boolean;
        comments: CommentDetail[];
      };
      if (!hasMore) {
        setFloorHasMore(hasMore);
      }
      setFloorList(floorList.concat(comments));
      setFloorLoading(false);
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

  const listItem = (item: CommentDetail) => {
    const {
      commentId,
      user,
      content,
      liked,
      likedCount,
      time,
      beReplied,
      replyCount,
    } = item;
    return (
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
              })
            }
          >
            {` (${likedCount})`}
          </Button>,
          <Button
            type="text"
            onClick={() => {
              setReplyAction("reply");
              setCid(commentId);
              setReplyVisible(true);
            }}
          >
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
                  <a
                    href="."
                    onClick={() => {
                      setPid(commentId);
                      vscode.postMessage({
                        command: "floor",
                        pid: commentId,
                      });
                      setFloorOwner([item]);
                      setFloorVisible(true);
                    }}
                  >
                    {`${replyCount} ${i18n?.reply as string}`}
                  </a>
                </div>
              )}
            </div>
          }
        />
      </List.Item>
    );
  };

  const tab = (sortType: SortType) => {
    const idx = sortType - 1;
    return (
      <List
        size="small"
        itemLayout="horizontal"
        loadMore={
          hasMores[idx] ? (
            <div className="list-footer--load-more">
              <Button
                loading={loadings[idx]}
                onClick={() => loadMore(sortType, lists[idx].length)}
              >
                {i18n?.more}
              </Button>
            </div>
          ) : null
        }
        dataSource={lists[idx]}
        renderItem={listItem}
      />
    );
  };

  const replyPanel = () => {
    return (
      <Drawer
        title={i18n?.reply}
        placement="bottom"
        onClose={() => setReplyVisible(false)}
        visible={replyVisible}
        zIndex={2000}
        height={200}
        footer={
          <Button
            type="primary"
            disabled={content.length === 0}
            icon={<UploadOutlined />}
            onClick={() => {
              vscode.postMessage({
                command: replyAction,
                cid,
                content,
              });
              setContent("");
              setReplyVisible(false);
            }}
          >
            {i18n?.submit}
          </Button>
        }
      >
        <Input
          defaultValue={content}
          allowClear={true}
          size="large"
          bordered={false}
          onChange={(e) => {
            const { value } = e.target;
            setContent(value);
          }}
        />
      </Drawer>
    );
  };

  const floorPanel = () => {
    return (
      <Drawer
        title={i18n?.reply}
        placement="right"
        onClose={() => {
          setFloorVisible(false);
          setFloorList([]);
          setFloorOwner([]);
          setFloorHasMore(true);
          setFloorLoading(true);
        }}
        visible={floorVisible}
        zIndex={1000}
        width={1024}
      >
        <List
          size="small"
          itemLayout="horizontal"
          dataSource={floorOwner}
          renderItem={listItem}
        />
        <Divider />
        <List
          size="small"
          itemLayout="horizontal"
          loadMore={
            floorHasMore ? (
              <div className="list-footer--load-more">
                <Button
                  loading={floorLoading}
                  onClick={() => {
                    vscode.postMessage({
                      command: "floor",
                      pid,
                      time: floorList[floorList.length - 1].time,
                    });
                  }}
                >
                  {i18n?.more}
                </Button>
              </div>
            ) : null
          }
          dataSource={floorList}
          renderItem={listItem}
        />
      </Drawer>
    );
  };

  return (
    <>
      <Tabs
        className="commentList"
        tabBarExtraContent={{
          left: (
            <div className="tab-bar--extra-left">{`${
              i18n?.comment as string
            } (${total})`}</div>
          ),
          right: (
            <Button
              icon={<PlusOutlined />}
              onClick={() => {
                setReplyAction("add");
                setReplyVisible(true);
              }}
            >
              {i18n?.reply}
            </Button>
          ),
        }}
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
      {replyPanel()}
      {floorPanel()}
    </>
  );
};
