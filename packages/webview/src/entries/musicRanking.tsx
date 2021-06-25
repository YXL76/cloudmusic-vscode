import { request, startEventListener } from "../utils";
import { MusicRanking } from "../pages";
import type { NeteaseTypings } from "api";
import React from "react";
import { render } from "react-dom";

const root = document.getElementById("root");

startEventListener();

request<ReadonlyArray<readonly NeteaseTypings.RecordData[]>>(undefined)
  .then((record) =>
    render(
      <MusicRanking
        record={record}
        max={record.map(
          (i) =>
            i.reduce((pre, { playCount }) => Math.max(pre, playCount), 0) / 100
        )}
      />,
      root
    )
  )
  .catch(console.error);
