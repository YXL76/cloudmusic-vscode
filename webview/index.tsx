import { App } from "./App";
import { ConfigProvider } from "antd";
import ReactDOM from "react-dom";
import { StrictMode } from "react";
import enUS from "antd/es/locale/en_US";
import zhCN from "antd/es/locale/zh_CN";
import zhTW from "antd/es/locale/zh_TW";

const { language } = window.webview;

ReactDOM.render(
  <StrictMode>
    <ConfigProvider
      locale={language === "zh-cn" ? zhCN : language === "zh-tw" ? zhTW : enUS}
    >
      <App />
    </ConfigProvider>
  </StrictMode>,
  document.getElementById("root")
);
