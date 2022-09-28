// Type definitions for qrcode 1.5
// Project: https://github.com/soldair/node-qrcode
// Definitions by: York Yao <https://github.com/plantain-00>
//                 Michael Nahkies <https://github.com/mnahkies>
//                 Rémi Sormain <https://github.com/Marchelune>
//                 BendingBender <https://github.com/BendingBender>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

/// <reference lib="dom" />

export type QRCodeErrorCorrectionLevel = "low" | "medium" | "quartile" | "high" | "L" | "M" | "Q" | "H";
export type QRCodeMaskPattern = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type QRCodeToSJISFunc = (codePoint: string) => number;

export interface QRCodeOptions {
  /**
   * QR Code version. If not specified the more suitable value will be calculated.
   */
  version?: number | undefined;
  /**
   * Error correction level.
   * @default 'M'
   */
  errorCorrectionLevel?: QRCodeErrorCorrectionLevel | undefined;
  /**
   * Mask pattern used to mask the symbol.
   *
   * If not specified the more suitable value will be calculated.
   */
  maskPattern?: QRCodeMaskPattern | undefined;
  /**
   * Helper function used internally to convert a kanji to its Shift JIS value.
   * Provide this function if you need support for Kanji mode.
   */
  toSJISFunc?: QRCodeToSJISFunc | undefined;
}
export interface QRCodeRenderersOptions extends QRCodeOptions {
  /**
   * Define how much wide the quiet zone should be.
   * @default 4
   */
  margin?: number | undefined;
  /**
   * Scale factor. A value of `1` means 1px per modules (black dots).
   * @default 4
   */
  scale?: number | undefined;
  /**
   * Forces a specific width for the output image.
   * If width is too small to contain the qr symbol, this option will be ignored.
   * Takes precedence over `scale`.
   */
  width?: number | undefined;
  color?:
    | {
        /**
         * Color of dark module. Value must be in hex format (RGBA).
         * Note: dark color should always be darker than `color.light`.
         * @default '#000000ff'
         */
        dark?: string | undefined;
        /**
         * Color of light module. Value must be in hex format (RGBA).
         * @default '#ffffffff'
         */
        light?: string | undefined;
      }
    | undefined;
}

/**
 * Draws qr code symbol to canvas.
 */
export function toCanvas(
  canvasElement: HTMLCanvasElement,
  text: string,
  options: QRCodeRenderersOptions
): Promise<void>;
