import * as React from "react";

interface LyricProps {
  otext: string;
  ttext: string;
  fontSize: number;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
const Lyric = ({ otext, ttext, fontSize }: LyricProps): JSX.Element => (
  <div className="h-screen w-screen flex flex-col">
    <div style={{ fontSize }}>{otext}</div>
    <div style={{ fontSize }}>{ttext}</div>
  </div>
);

export default Lyric;
