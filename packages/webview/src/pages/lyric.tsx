import { FiMinus, FiPlus } from "react-icons/fi";
import React, { useEffect, useState } from "react";
import type { LyricSMsg } from "@cloudmusic/shared";
import type { NeteaseTypings } from "api";

let cnt = 0;
let active = 0;

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Lyric = (): JSX.Element => {
  const [fontSize, setFontSize] = useState(18);
  const [lyric, setLyric] = useState<NeteaseTypings.LyricData["text"]>([]);

  useEffect(() => {
    const handler = ({ data }: { data: LyricSMsg }) => {
      switch (data.command) {
        case "lyric":
          cnt += 1;
          setLyric(data.text);
          break;
        case "index":
          {
            const prev = document.getElementById(`${cnt}-${active}`);
            if (prev) {
              prev.style.fontSize = "";
              prev.style.opacity = "";
              prev.style.fontWeight = "";
            }
            active = data.idx;
            const curr = document.getElementById(`${cnt}-${active}`);
            if (curr) {
              curr.style.fontSize = `${fontSize + 4}px`;
              curr.style.opacity = "1";
              curr.style.fontWeight = "bold";
              const { top, bottom } = curr.getBoundingClientRect();
              if (top > innerHeight + 200 || bottom < -200)
                curr.scrollIntoView({ block: "center", behavior: "smooth" });
            }
          }
          break;
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [fontSize, setFontSize, setLyric]);

  return (
    <>
      <div
        className="fixed right-8 bottom-8 bg-blue-600 rounded-full p-1 cursor-pointer"
        onClick={() => setFontSize(fontSize - 2)}
      >
        <FiMinus size={32} />
      </div>
      <div
        className="fixed right-8 bottom-24 bg-blue-600 rounded-full p-1 cursor-pointer"
        onClick={() => setFontSize(fontSize + 2)}
      >
        <FiPlus size={32} />
      </div>

      <div
        style={{ fontSize }}
        className="overflow-y-scroll flex flex-col items-center gap-y-4"
      >
        {lyric.map(([otext, ttext], idx) => (
          <div
            id={`${cnt}-${idx}`}
            key={`${cnt}-${idx}`}
            className="text-center text-ellipsis whitespace-nowrap flex flex-col gap-y-1 opacity-90"
          >
            <div>{otext}</div>
            {ttext && <div>{ttext}</div>}
          </div>
        ))}
      </div>
    </>
  );
};
