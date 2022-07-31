import { request, startEventListener } from "../utils";
import type { CommentCSMsg } from "@cloudmusic/shared";
import { CommentList } from "../pages";
import type { CommentListProps } from "../pages";
import { createRoot } from "react-dom/client";

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const root = createRoot(document.getElementById("root")!);

startEventListener();

request<CommentListProps, CommentCSMsg>({ command: "init" })
  .then((props) => root.render(<CommentList {...props} />))
  .catch(console.error);
