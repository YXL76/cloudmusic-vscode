import { FiPlayCircle } from "react-icons/fi";
import React from "react";
import type { RecordData } from "@cloudmusic/shared";
import { vscode } from "../utils";

export interface MusicCardProps extends RecordData {
  max: number;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const MusicCard = ({
  name,
  id,
  alia,
  ar,
  al,
  playCount,
  max,
}: MusicCardProps): JSX.Element => (
  <div className="relative box-border h-24 w-full my-4 rounded-xl bg-black bg-opacity-20 shadow-md flex flex-row px-4 justify-between items-center overflow-hidden">
    <div
      className="absolute h-full bg-blue-600 left-0 top-0 -z-10"
      style={{ width: `${Math.ceil(playCount / max)}%` }}
    />
    <img
      className="cursor-pointer rounded-full h-20 w-20"
      src={al.picUrl}
      alt={al.name}
      onClick={() =>
        vscode.postMessage({ msg: { command: "album", id: al.id } })
      }
    />
    <div className="cursor-pointer flex-1 ml-4">
      <div
        className="font-medium text-xl"
        onClick={() => vscode.postMessage({ msg: { command: "song", id } })}
      >{`${name}${alia[0] ? ` (${alia.join("/")})` : ""}`}</div>
      <div>
        {ar.map(({ name, id }, key3) => (
          <div
            key={key3}
            className="text-base inline-block"
            onClick={() =>
              vscode.postMessage({ msg: { command: "artist", id } })
            }
          >
            {name}
            {key3 < ar.length - 1 ? "/" : ""}
          </div>
        ))}
      </div>
    </div>
    <FiPlayCircle size={20} />
    <div className="w-16 font-bold text-2xl ml-2">{playCount}</div>
  </div>
);
