import { request, startEventListener } from "../utils";
import type { CommentCSMsg } from "@cloudmusic/shared";
import { CommentList } from "../pages";
import type { CommentListProps } from "../pages";
import React from "react";
import { render } from "react-dom";

const root = document.getElementById("root");

startEventListener();

request<CommentListProps, CommentCSMsg>({ command: "init" })
  .then((props) => render(<CommentList {...props} />, root))
  .catch(console.error);
