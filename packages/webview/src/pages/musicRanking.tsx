import { MusicCard, Tabs } from "../components";
import type { NeteaseTypings } from "api";
import i18n from "../i18n";
import { useState } from "react";

export interface MusicRankingProps {
  record: ReadonlyArray<readonly NeteaseTypings.RecordData[]>;
  max: readonly number[];
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const MusicRanking = ({ record, max }: MusicRankingProps): JSX.Element => {
  const [index, setIndex] = useState(0);

  return (
    <>
      <div className="w-full p-3">
        <Tabs titles={[i18n.word.weekly, i18n.word.allTime]} selectd={index} switchTab={(i) => setIndex(i)} />
        {record[index].map((item) => (
          <MusicCard key={item.id} {...item} max={max[index]} />
        ))}
      </div>
    </>
  );
};
