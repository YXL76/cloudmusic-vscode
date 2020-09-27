import React from "react";
import { UserMusicRankingList } from "./pages";

const { entry } = window.webview;

export const App = () => {
  if (entry === "userMusicRankingList") {
    return <UserMusicRankingList />;
  }
  return <div></div>;
};
