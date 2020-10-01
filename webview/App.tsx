import { CommentList, UserMusicRankingList } from "./pages";
import React from "react";

const { entry } = window.webview;

export const App = () => {
  if (entry === "userMusicRankingList") {
    return <UserMusicRankingList />;
  } else if (entry === "commentList") {
    return <CommentList />;
  }
  return <div></div>;
};
