import { request, startEventListener } from "../utils";
import { Description } from "../pages";
import type { DescriptionProps } from "../pages";
import { createRoot } from "react-dom/client";

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const root = createRoot(document.getElementById("root")!);

startEventListener();

request<DescriptionProps>(undefined)
  .then((props) => root.render(<Description {...props} />))
  .catch(console.error);
