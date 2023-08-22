import { request, startEventListener } from "../utils";
import { MusicRanking } from "../pages";
import type { NeteaseTypings } from "api";
import { createRoot } from "react-dom/client";

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const root = createRoot(document.getElementById("root")!);

startEventListener();

request<ReadonlyArray<readonly NeteaseTypings.RecordData[]>>(undefined)
  .then((record) =>
    root.render(
      <MusicRanking
        record={record}
        max={record.map((i) => i.reduce((pre, { playCount }) => Math.max(pre, playCount), 0) / 100)}
      />,
    ),
  )
  .catch(console.error);
