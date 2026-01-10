export class LiveAudioPlayer {
  private audioCtx = new AudioContext();
  private queue: AudioBuffer[] = [];
  private playing = false;

  async enqueueChunk(base64: string) {
    const data = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const buffer = await this.audioCtx.decodeAudioData(data.buffer);
    this.queue.push(buffer);

    if (!this.playing) {
      this.playNext();
    }
  }

  private playNext() {
    const buffer = this.queue.shift();
    if (!buffer) {
      this.playing = false;
      return;
    }

    this.playing = true;
    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioCtx.destination);
    source.start();

    source.onended = () => this.playNext();
  }
}
