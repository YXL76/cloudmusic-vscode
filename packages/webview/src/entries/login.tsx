import { request, startEventListener } from "../utils";
import { Login } from "../pages";
import type { LoginProps } from "../pages";
import React from "react";
import { createRoot } from "react-dom/client";

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const root = createRoot(document.getElementById("root")!);

startEventListener();

request<LoginProps>(undefined)
  .then((props) => root.render(<Login {...props} />))
  .catch(console.error);
