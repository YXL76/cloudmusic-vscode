import { request, startEventListener } from "../utils";
import { Video } from "../pages";
import type { VideoProps } from "../pages";
import { createRoot } from "react-dom/client";

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const root = createRoot(document.getElementById("root")!);

startEventListener();

request<VideoProps>(undefined)
  .then((props) => root.render(<Video {...props} />))
  .catch(console.error);
