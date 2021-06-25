import { request, startEventListener } from "../utils";
import { Login } from "../pages";
import type { LoginProps } from "../pages";
import React from "react";
import { render } from "react-dom";

const root = document.getElementById("root");

startEventListener();

request<LoginProps>(undefined)
  .then((props) => render(<Login {...props} />, root))
  .catch(console.error);
