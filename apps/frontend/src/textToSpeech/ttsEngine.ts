export class TTSEngine {
  private enabled = true;
  private voice: SpeechSynthesisVoice | null = null;

  constructor() {
    if (!("speechSynthesis" in window)) {
      console.warn("TTS not supported in this browser");
      this.enabled = false;
      return;
    }

    this.loadVoices();
  }

  private loadVoices() {
    const voices = window.speechSynthesis.getVoices();
    this.voice =
      voices.find(
        (v) => v.lang.startsWith("en") && v.name.includes("Google")
      ) ??
      voices.find((v) => v.lang.startsWith("en")) ??
      null;

    window.speechSynthesis.onvoiceschanged = () => {
      this.loadVoices();
    };
  }

  setEnabled(value: boolean) {
    this.enabled = value;
    if (!value) {
      window.speechSynthesis.cancel();
    }
  }

  speak(text: string) {
    if (!this.enabled || !this.voice) return;

    // Cancel any ongoing speech before starting new
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = this.voice;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    window.speechSynthesis.speak(utterance);
  }

  stop() {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
  }
}
