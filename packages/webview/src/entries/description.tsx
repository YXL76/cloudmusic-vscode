import { request, startEventListener } from "../utils";
import { Description } from "../pages";
import type { DescriptionProps } from "../pages";
import React from "react";
import { render } from "react-dom";

const root = document.getElementById("root");

startEventListener();

request<DescriptionProps>(undefined)
  .then((props) => render(<Description {...props} />, root))
  .catch(console.error);
