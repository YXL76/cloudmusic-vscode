declare interface Window {
  master?: boolean;
  audioTarget?: HTMLAudioElement;
  handleFirstPlay?: (event: { target: HTMLAudioElement }) => void;
}
