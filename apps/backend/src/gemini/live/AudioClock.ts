export class AudioClock {
  private startedAt = Date.now();

  nowMs(): number {
    return Date.now() - this.startedAt;
  }

  reset() {
    this.startedAt = Date.now();
  }
}
