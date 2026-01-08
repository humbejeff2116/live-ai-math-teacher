export class GeminiLiveClient {
  private audioCtx = new AudioContext();
  private videoEl: HTMLVideoElement;

  constructor(videoEl: HTMLVideoElement) {
    this.videoEl = videoEl;
  }

  playAudio(chunk: ArrayBuffer) {
    this.audioCtx.decodeAudioData(chunk, (buffer) => {
      const src = this.audioCtx.createBufferSource();
      src.buffer = buffer;
      src.connect(this.audioCtx.destination);
      src.start();
    });
  }

  playVideo(chunk: ArrayBuffer) {
    const blob = new Blob([chunk], { type: "video/webm" });
    this.videoEl.src = URL.createObjectURL(blob);
    this.videoEl.play();
  }
}
