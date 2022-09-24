import { useEffect, useRef } from "react";

export type VideoProps = { cover: string; url: string };

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Video = ({ cover, url }: VideoProps): JSX.Element => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.src = url;
  });

  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <video
        ref={videoRef}
        className="h-5/6"
        poster={cover}
        controls
        playsInline
        preload="metadata"
        disablePictureInPicture
        disableRemotePlayback
      />
      ;
    </div>
  );
};
