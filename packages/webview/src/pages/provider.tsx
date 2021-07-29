import React, { useEffect, useState } from "react";
import type { NeteaseTypings } from "api";
import type { ProviderSMsg } from "@cloudmusic/shared";
import { vscode } from "../utils";

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Provider = (): JSX.Element => {
  const [firstPlay, setFirstPlay] = useState(false);
  const [profiles, setProfiles] = useState<NeteaseTypings.Profile[]>([]);

  useEffect(() => {
    const handler = ({ data }: { data: ProviderSMsg }) => {
      /* if (data.command === "master") {
        window.master = !!data.is;
        if (window.audioTarget) window.audioTarget.muted = !!data.is;
        return;
      } */
      if (/* !window.master || */ !navigator.mediaSession) return;
      switch (data.command) {
        case "state":
          navigator.mediaSession.playbackState = data.state;
          break;
        /* case "position":
          navigator.mediaSession.setPositionState?.({
            position: data.position,
          });
          break; */
        case "metadata":
          navigator.mediaSession.metadata = new MediaMetadata(data);
          // navigator.mediaSession.setPositionState?.({ duration: data.duration });
          break;
        case "account":
          setProfiles(data.profiles);
          break;
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [setProfiles]);

  return (
    <>
      <div className="flex flex-col max-w-2xl">
        {profiles.map(({ userId, nickname, avatarUrl, backgroundUrl }, key) => (
          <div
            key={key}
            className="flex flex-row items-center h-16 rounded-lg cursor-pointer mx-1 my-2 p-2 bg-center bg-cover"
            style={{
              backgroundImage: `url("${backgroundUrl}")`,
            }}
            onClick={() => vscode.postMessage({ command: "account", userId })}
          >
            <img
              className="rounded-full mx-4"
              src={avatarUrl}
              alt={nickname}
            ></img>
            <div className="text-white font-bold text-xl">{nickname}</div>
          </div>
        ))}
      </div>
      <audio
        id="audio"
        autoPlay
        loop
        onPlay={
          firstPlay
            ? () => {
                //
              }
            : ({ currentTarget }) => {
                if (firstPlay) return;
                setFirstPlay(true);

                currentTarget.muted = true;
                currentTarget.onplay = null;

                if (navigator.mediaSession) {
                  navigator.mediaSession.setActionHandler("play", () =>
                    vscode.postMessage({ command: "toggle" })
                  );
                  navigator.mediaSession.setActionHandler("pause", () =>
                    vscode.postMessage({ command: "toggle" })
                  );
                  navigator.mediaSession.setActionHandler("stop", null);
                  navigator.mediaSession.setActionHandler("seekbackward", null);
                  navigator.mediaSession.setActionHandler("seekforward", null);
                  navigator.mediaSession.setActionHandler("seekto", null);
                  navigator.mediaSession.setActionHandler("previoustrack", () =>
                    vscode.postMessage({ command: "previous" })
                  );
                  navigator.mediaSession.setActionHandler("nexttrack", () =>
                    vscode.postMessage({ command: "next" })
                  );
                }
              }
        }
      ></audio>
    </>
  );
};
