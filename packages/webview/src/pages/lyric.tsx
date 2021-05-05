import React, { useEffect, useState } from "react";
import type { webview } from "@cloudmusic/shared";

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Lyric = (): JSX.Element => {
  const [fontSize, setFontSize] = useState(16);
  const [text, setText] = useState({ otext: "", ttext: "" });

  useEffect(() => {
    const handler = ({ data }: { data: webview.LyricSMsg }) => {
      switch (data.command) {
        case "lyric":
          setText(data.data);
          break;
        case "size":
          setFontSize(data.data);
          break;
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [setText, setFontSize]);
  return (
    <div className="h-screen w-screen flex flex-col">
      <div style={{ fontSize }}>{text.otext}</div>
      <div style={{ fontSize }}>{text.ttext}</div>
    </div>
  );
};
