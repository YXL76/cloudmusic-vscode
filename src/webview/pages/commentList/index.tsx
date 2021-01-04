import { Avatar, Button, Drawer, Input, List, Tabs } from "antd";
import React, { useEffect, useState } from "react";
import type { CommentDetail } from "../../../constant";
import LikeFilled from "@ant-design/icons/LikeFilled";
import LikeOutlined from "@ant-design/icons/LikeOutlined";
import PlusOutlined from "@ant-design/icons/PlusOutlined";
import UploadOutlined from "@ant-design/icons/UploadOutlined";
import dayjs from "dayjs";

const { TabPane } = Tabs;

const { vscode, data } = window.webview;
const { i18n, message } = data;
const pageSize = message?.pageSize || 30;

export const CommentList = () => {
  const [lists, setLists] = useState([[], [], []] as CommentDetail[][]);
  const [loadings, setLoadings] = useState([true, false, false]);
  const [hasMores, setHasMores] = useState([true, true, true]);
  const [total, setTotal] = useState(0);

  const [replyData, setReplyData] = useState({
    visible: false,
    content: "",
    cid: 0,
  });

  const [floorData, setFloorData] = useState({
    visible: false,
    owner: [] as CommentDetail[],
    list: [] as CommentDetail[],
    loading: true,
    hasMore: true,
    total: 0,
    pid: 0,
  });

  useEffect(() => {
    const handler = ({
      data,
    }: {
      data: {
        command: "list" | "like" | "floor";
        sortType: number;
        totalCount: number;
        hasMore: boolean;
        comments: CommentDetail[];
        liked: boolean;
        cid: number;
      };
    }) => {
      const { command } = data;
      if (command === "list") {
        const { sortType, totalCount, hasMore, comments } = data;
        const idx = sortType - 1;
        setTotal(totalCount);
        hasMores[idx] = hasMore;
        setHasMores([...hasMores]);
        lists[idx].push(...comments);
        setLists([...lists]);
        loadings[idx] = false;
        setLoadings([...loadings]);
      } else if (command === "like") {
        const { liked, cid } = data;
        if (floorData.visible) {
          const idx = floorData.list.findIndex(
            (value) => value.commentId === cid
          );
          if (idx >= 0 && floorData.list[idx].liked !== liked) {
            floorData.list[idx].liked = liked;
            floorData.list[idx].likedCount += liked ? 1 : -1;
          }
          setFloorData({ ...floorData });
        } else {
          for (const list of lists) {
            const idx = list.findIndex((value) => value.commentId === cid);
            if (idx >= 0 && list[idx].liked !== liked) {
              list[idx].liked = liked;
              list[idx].likedCount += liked ? 1 : -1;
            }
          }
          setLists([...lists]);
        }
      } else if (command === "floor") {
        const { totalCount, hasMore, comments } = data;
        floorData.list.push(
          ...comments.map((comment) => {
            if (
              comment?.beReplied?.beRepliedCommentId ===
              floorData.owner[0].commentId
            ) {
              comment.beReplied = undefined;
            }
            return comment;
          })
        );
        setFloorData({
          ...floorData,
          loading: false,
          hasMore,
          total: totalCount > 0 ? totalCount : floorData.total,
        });
      }
    };
    window.addEventListener("message", handler);
    return () => {
      window.removeEventListener("message", handler);
    };
  });

  const usr = (id: number) => {
    vscode.postMessage({ command: "user", id });
  };

  const listItem = ({
    commentId,
    user,
    content,
    liked,
    likedCount,
    time,
    beReplied,
    replyCount,
  }: CommentDetail) => (
    <List.Item
      actions={[
        <Button
          type="text"
          icon={liked ? <LikeFilled /> : <LikeOutlined />}
          onClick={() =>
            vscode.postMessage({
              command: "like",
              cid: commentId,
              t: liked ? "unlike" : "like",
            })
          }
        >
          {` (${likedCount})`}
        </Button>,
        <Button
          type="text"
          onClick={() =>
            setReplyData({ ...replyData, cid: commentId, visible: true })
          }
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
            <span className="font-sm ml-2">
              {dayjs(time).format("YYYY-MM-DD HH:mm:ss")}
            </span>
          </div>
        }
        description={
          <div className="flex flex-col">
            <p>{content}</p>
            {beReplied && (
              <p className="pl-3 border-0	border-l-4 border-solid	border-gray-800 bg-gray-800 bg-opacity-20">
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
                    vscode.postMessage({
                      command: "floor",
                      pid: commentId,
                      time: -1,
                    });
                    setFloorData({
                      ...floorData,
                      visible: true,
                      owner: [
                        {
                          commentId,
                          user,
                          content,
                          liked,
                          likedCount,
                          time,
                          beReplied,
                          replyCount: 0,
                        },
                      ],
                      pid: commentId,
                    });
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

  const tab = (idx: number) => (
    <List
      size="small"
      itemLayout="horizontal"
      loadMore={
        hasMores[idx] ? (
          <div className="text-center my-3 h-8 leading-8">
            <Button
              loading={loadings[idx]}
              onClick={() => {
                const len = lists[idx].length;
                vscode.postMessage({
                  command: "list",
                  sortType: idx + 1,
                  pageNo: Math.floor(len / pageSize) + 1,
                  time: len > 0 ? lists[idx][len - 1].time : 0,
                });
                loadings[idx] = true;
                setLoadings([...loadings]);
              }}
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

  const replyPanel = () => (
    <Drawer
      title={i18n?.reply}
      placement="bottom"
      onClose={() => setReplyData({ ...replyData, visible: false })}
      visible={replyData.visible}
      zIndex={2000}
      height={200}
      footer={
        <Button
          type="primary"
          disabled={replyData.content.length === 0}
          icon={<UploadOutlined />}
          onClick={() => {
            vscode.postMessage({
              command: "reply",
              cid: replyData.cid,
              content: replyData.content,
            });
            setReplyData({ ...replyData, content: "", visible: false });
          }}
        >
          {i18n?.submit}
        </Button>
      }
    >
      <Input
        defaultValue={replyData.content}
        allowClear={true}
        size="large"
        bordered={false}
        onChange={(e) =>
          setReplyData({ ...replyData, content: e.target.value })
        }
      />
    </Drawer>
  );

  const floorPanel = () => (
    <Drawer
      title={i18n?.reply}
      placement="right"
      onClose={() =>
        setFloorData({
          visible: false,
          owner: [],
          list: [],
          loading: true,
          hasMore: true,
          total: 0,
          pid: 0,
        })
      }
      visible={floorData.visible}
      zIndex={1000}
      width={1024}
    >
      <List
        size="small"
        itemLayout="horizontal"
        dataSource={floorData.owner}
        renderItem={listItem}
      />
      <div className="font-bold mr-8">{`${i18n?.comment as string} (${
        floorData.total
      })`}</div>
      <List
        size="small"
        itemLayout="horizontal"
        loadMore={
          floorData.hasMore ? (
            <div className="text-center my-3 h-8 leading-8">
              <Button
                loading={floorData.loading}
                onClick={() => {
                  vscode.postMessage({
                    command: "floor",
                    pid: floorData.pid,
                    time: floorData.list[floorData.list.length - 1].time,
                  });
                  setFloorData({ ...floorData, loading: true });
                }}
              >
                {i18n?.more}
              </Button>
            </div>
          ) : null
        }
        dataSource={floorData.list}
        renderItem={listItem}
      />
    </Drawer>
  );

  return (
    <>
      <Tabs
        tabBarExtraContent={{
          left: (
            <div className="font-bold mr-8">{`${
              i18n?.comment as string
            } (${total})`}</div>
          ),
          right: (
            <Button
              icon={<PlusOutlined />}
              onClick={() => setReplyData({ ...replyData, visible: true })}
            >
              {i18n?.reply}
            </Button>
          ),
        }}
      >
        <TabPane tab={i18n?.recommendation} key="1" forceRender>
          {tab(0)}
        </TabPane>
        <TabPane tab={i18n?.hottest} key="2" forceRender>
          {tab(1)}
        </TabPane>
        <TabPane tab={i18n?.latest} key="3" forceRender>
          {tab(2)}
        </TabPane>
      </Tabs>
      {replyPanel()}
      {floorPanel()}
    </>
  );
};
