import { CommentList, UserMusicRankingList } from "./pages";

const { entry } = window.webview;

export const App = () => {
  if (entry === "userMusicRankingList") {
    return <UserMusicRankingList />;
  } else if (entry === "commentList") {
    return <CommentList />;
  }
  return <div></div>;
};
