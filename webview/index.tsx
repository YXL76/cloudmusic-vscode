import { App } from "./App";
import ConfigProvider from "antd/lib/config-provider";
import React from "react";
import ReactDOM from "react-dom";
import enUS from "antd/es/locale/en_US";
import zhCN from "antd/es/locale/zh_CN";
import zhTW from "antd/es/locale/zh_TW";

const { language } = window.webview;

ReactDOM.render(
  <React.StrictMode>
    <ConfigProvider
      locale={language === "zh-cn" ? zhCN : language === "zh-tw" ? zhTW : enUS}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>,
  document.getElementById("root")
);
