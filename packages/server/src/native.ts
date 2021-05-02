import { arch, platform } from "os";
import { resolve } from "path";

type NativePlayer = unknown;

interface NativeModule {
  playerEmpty(player: NativePlayer): boolean;
  playerLoad(player: NativePlayer, url: string): boolean;
  playerNew(): NativePlayer;
  playerPause(player: NativePlayer): void;
  playerPlay(player: NativePlayer): boolean;
  playerPosition(player: NativePlayer): number;
  playerSetVolume(player: NativePlayer, level: number): void;
  playerStop(player: NativePlayer): void;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
declare function __non_webpack_require__(_: string): unknown;

export const native = __non_webpack_require__(
  resolve(
    __dirname,
    "..",
    "build",
    `${platform()}-${arch() === "x64" ? "x86" : arch()}.node`
  )
) as NativeModule;
