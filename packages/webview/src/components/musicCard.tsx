import { FiPlayCircle } from "react-icons/fi";
import type { MusicRankingCMsg } from "@cloudmusic/shared";
import type { NeteaseTypings } from "api";
import { vscode } from "../utils";

export interface MusicCardProps extends NeteaseTypings.RecordData {
  max: number;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const MusicCard = ({ name, id, alia, ar, al, playCount, max }: MusicCardProps): JSX.Element => (
  <div className="relative box-border h-24 w-full my-4 rounded-xl bg-black bg-opacity-20 shadow-md flex flex-row px-4 justify-between items-center overflow-hidden">
    <div
      className="absolute h-full bg-blue-600 left-0 top-0 -z-10"
      style={{ width: `${Math.ceil(playCount / max)}%` }}
    />
    <img
      className="cursor-pointer rounded-full h-20 w-20"
      src={al.picUrl}
      alt={al.name}
      onClick={() => {
        const data: Omit<MusicRankingCMsg, "channel"> = { msg: { command: "album", id: al.id } };
        vscode.postMessage(data);
      }}
    />
    <div className="cursor-pointer flex-1 ml-4">
      <div
        className="font-medium text-xl"
        onClick={() => {
          const data: Omit<MusicRankingCMsg, "channel"> = { msg: { command: "song", id } };
          vscode.postMessage(data);
        }}
      >{`${name}${alia[0] ? ` (${alia.join("/")})` : ""}`}</div>
      <div>
        {ar.map(({ name, id }, idx) => (
          <div
            key={id}
            className="text-base inline-block"
            onClick={() => {
              const data: Omit<MusicRankingCMsg, "channel"> = { msg: { command: "artist", id } };
              vscode.postMessage(data);
            }}
          >
            {name}
            {idx < ar.length - 1 ? "/" : ""}
          </div>
        ))}
      </div>
    </div>
    <FiPlayCircle size={20} />
    <div className="w-16 font-bold text-2xl ml-2">{playCount}</div>
  </div>
);
