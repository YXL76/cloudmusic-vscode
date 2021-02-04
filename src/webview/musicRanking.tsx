import { RawScript, Tabs } from ".";
import { FiPlayCircle } from "react-icons/fi";
import type { RecordData } from "../constant";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { h } from "preact";
import i18n from "../i18n";
/** @jsx h */

interface MusicCardProps extends RecordData {
  max: number;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
const MusicCard = ({
  name,
  id,
  alia,
  ar,
  al,
  playCount,
  max,
}: MusicCardProps): h.JSX.Element => (
  <div className="relative box-border h-24 w-full my-4 rounded-xl bg-black bg-opacity-20 shadow-md flex flex-row px-4 justify-between items-center overflow-hidden">
    <div
      className="absolute h-full bg-blue-600 left-0 top-0 -z-10"
      style={`width: ${Math.ceil(playCount / max)}%`}
    />
    <img
      className="album cursor-pointer rounded-full h-20 w-20"
      src={al.picUrl}
      alt={al.name}
      data-id={al.id}
    />
    <div className="cursor-pointer flex-1 ml-4">
      <div className="song font-medium text-xl" data-id={id}>{`${name}${
        alia[0] ? ` (${alia.join("/")})` : ""
      }`}</div>
      <div>
        {ar.map(({ name, id }, key3) => (
          <div
            key={key3}
            className="artist text-base inline-block"
            data-id={id}
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

interface MusicRankingProps {
  record: RecordData[];
  nonce: string;
  index: number;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
const MusicRanking = ({
  record,
  nonce,
  index,
}: MusicRankingProps): h.JSX.Element => {
  const max =
    record.reduce((pre, { playCount }) => Math.max(pre, playCount), 0) / 100;
  return (
    <div>
      <div className="box-border w-screen p-4">
        <Tabs
          className="mb-4"
          titles={[i18n.word.weekly, i18n.word.allTime]}
          selectd={index}
        />
        {record.map((item, key1) => (
          <MusicCard key={key1} {...item} max={max} />
        ))}
      </div>
      <RawScript content={GLOBAL_MUSIC_RANKING} nonce={nonce} />
    </div>
  );
};

export default MusicRanking;
