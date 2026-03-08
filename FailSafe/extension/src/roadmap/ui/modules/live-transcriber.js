// FailSafe Command Center — Live Transcriber
// Real-time interim transcription via Web Speech API during Whisper recording.

import { SpeechRecognitionCtor } from './whisper-loader.js';

export class LiveTranscriber {
  constructor() {
    this._recognition = null;
    this._accumulated = '';
  }

  start(language, onTranscript, onSilenceReset, getState) {
    if (!SpeechRecognitionCtor || this._recognition) return;
    try {
      this._recognition = new SpeechRecognitionCtor();
      this._recognition.continuous = true;
      this._recognition.interimResults = true;
      this._recognition.lang = language || 'en-US';

      this._recognition.addEventListener('result', (e) => {
        let current = '';
        for (let i = 0; i < e.results.length; i++) {
          current += e.results[i][0].transcript;
        }
        if (current) {
          this._accumulated = current;
          onTranscript?.(this._accumulated, false);
          onSilenceReset?.();
        }
      });

      this._recognition.addEventListener('end', () => {
        if (getState?.() === 'listening' && this._recognition) {
          try { this._recognition.start(); } catch { /* already started */ }
        }
      });

      this._recognition.addEventListener('error', () => {
        // Silently ignore — this is a supplementary feature
      });

      this._recognition.start();
    } catch {
      this._recognition = null;
    }
  }

  stop() {
    if (!this._recognition) return;
    try { this._recognition.stop(); } catch { /* already stopped */ }
    this._recognition = null;
    this._accumulated = '';
  }
}
