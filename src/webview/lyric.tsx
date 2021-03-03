import * as React from "react";

// eslint-disable-next-line @typescript-eslint/naming-convention
const Lyric = ({
  otext,
  ttext,
}: {
  otext: string;
  ttext: string;
}): JSX.Element => (
  <div className="h-screen w-screen flex flex-col">
    <div className="text-xl">{otext}</div>
    <div className="text-xl">{ttext}</div>
  </div>
);

export default Lyric;
