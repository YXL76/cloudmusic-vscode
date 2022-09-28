import { useEffect, useRef, useState } from "react";
import type { LoginSMsg } from "@cloudmusic/shared";
import { toCanvas } from "qrcode";
import { vscode } from "../utils";

const BASE_URL = "https://music.163.com/login?codekey=";

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Login = (): JSX.Element => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const handler = ({ data }: { data: LoginSMsg }) => {
      switch (data.command) {
        case "message":
          return setMessage(data.message);
        case "key":
          if (!canvasRef.current) return;
          toCanvas(canvasRef.current, `${BASE_URL}${data.key}`, { scale: 7 }).catch(console.error);
      }
    };

    window.addEventListener("message", handler);
    vscode.postMessage("");
    return () => window.removeEventListener("message", handler);
  });

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center">
      <canvas ref={canvasRef} />
      <div className="my-4 text-3xl text-black dark:text-white">{message}</div>
    </div>
  );
};
