/* eslint-disable @typescript-eslint/no-explicit-any */
type SpeechResultHandler = (text: string) => void;
type SpeechStartHandler = () => void;

export class SpeechRecognizer {
  private recognition: SpeechRecognition | null = null;

  constructor(onResult: SpeechResultHandler, onStart?: SpeechStartHandler) {
    const SpeechRecognitionImpl =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionImpl) {
      console.warn("Speech recognition not supported");
      return;
    }

    this.recognition = new SpeechRecognitionImpl();
  
    if (this.recognition) {
      this.recognition.lang = "en-US";
      this.recognition.continuous = false;
      this.recognition.interimResults = false;

      this.recognition.onstart = () => {
        onStart?.();
      };

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onResult(transcript);
      };

      this.recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event);
      };
    }
  }

  start() {
    this.recognition?.start();
  }

  stop() {
    this.recognition?.stop();
  }
}
