import { FiCircle, FiCrosshair, FiLifeBuoy, FiMinus, FiPlus } from "react-icons/fi";
import { useEffect, useMemo, useState } from "react";
import type { LyricSMsg } from "@cloudmusic/shared";
import type { NeteaseTypings } from "api";

const enum FocusMode {
  free = 0,
  center = 1,
  inview = 2,
}

let cnt = 0;
let active = 0;
let bigFontSize = 18 + 8;

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Lyric = (): JSX.Element => {
  const [focus, setFocus] = useState(FocusMode.center);
  const [fontSize, setFontSize] = useState(bigFontSize - 8);
  bigFontSize = fontSize + 8;
  const [lyric, setLyric] = useState<NeteaseTypings.LyricData["text"]>([]);

  useEffect(() => {
    const handler = ({ data }: { data: LyricSMsg }) => {
      switch (data.command) {
        case "lyric":
          cnt += 1;
          setLyric(data.text);
          return window.scrollTo({ top: 0, behavior: "smooth" });
        case "index": {
          const prev = document.getElementById(`${cnt}-${active}`);
          if (prev) {
            prev.style.fontSize = "";
            prev.style.opacity = "";
            prev.style.fontWeight = "";
          }
          active = data.idx;
          const curr = document.getElementById(`${cnt}-${active}`);
          if (!curr) return;

          curr.style.fontSize = `${bigFontSize}px`;
          curr.style.opacity = "1";
          curr.style.fontWeight = "bold";
          if (focus === FocusMode.center) curr.scrollIntoView({ block: "center", behavior: "smooth" });
          else if (focus === FocusMode.inview) {
            const { top, bottom } = curr.getBoundingClientRect();
            if (top > innerHeight || bottom < 0) curr.scrollIntoView({ block: "center", behavior: "smooth" });
          }
        }
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [focus]);

  return (
    <>
      {useMemo(
        () => (
          <>
            <div
              className="fixed right-8 bottom-8 bg-slate-700 rounded-full p-1 cursor-pointer z-10"
              onClick={() => setFontSize((v) => v - 2)}
            >
              <FiMinus size={32} />
            </div>
            <div
              className="fixed right-8 bottom-24 bg-slate-700 rounded-full p-1 cursor-pointer z-10"
              onClick={() => setFontSize((v) => v + 2)}
            >
              <FiPlus size={32} />
            </div>
          </>
        ),
        [],
      )}

      {useMemo(() => {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const Icon = focus === FocusMode.center ? FiCrosshair : focus === FocusMode.inview ? FiLifeBuoy : FiCircle;
        return (
          <div
            className="fixed right-8 bottom-40 bg-slate-700 rounded-full p-1 cursor-pointer z-10"
            onClick={() => setFocus((v) => (v + 1) % 3)}
          >
            <Icon size={32} />{" "}
          </div>
        );
      }, [focus])}

      <style>{"body::-webkit-scrollbar{display: none;}"}</style>
      <div style={{ fontSize }} className="my-80">
        {lyric.map(([otext, ttext, rtext], idx) => (
          <div
            id={`${cnt}-${idx}`}
            key={`${cnt}-${idx}`}
            className="text-center text-ellipsis whitespace-nowrap flex flex-col gap-y-1 opacity-80 mb-8"
          >
            <div>{otext}</div>
            {rtext && <div>{rtext}</div>}
            {ttext && <div>{ttext}</div>}
          </div>
        ))}
      </div>
    </>
  );
};
