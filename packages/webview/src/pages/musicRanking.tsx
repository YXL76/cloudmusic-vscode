import { MusicCard, Tabs } from "../components";
import React, { useState } from "react";
import type { NeteaseTypings } from "api";
import i18n from "../i18n";

export interface MusicRankingProps {
  record: NeteaseTypings.RecordData[][];
  max: number[];
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const MusicRanking = ({
  record,
  max,
}: MusicRankingProps): JSX.Element => {
  const [index, setIndex] = useState(0);

  return (
    <>
      <div className="w-full p-3">
        <Tabs
          titles={[i18n.word.weekly, i18n.word.allTime]}
          selectd={index}
          switchTab={(i) => setIndex(i)}
        />
        {record[index].map((item, key1) => (
          <MusicCard key={key1} {...item} max={max[index]} />
        ))}
      </div>
    </>
  );
};