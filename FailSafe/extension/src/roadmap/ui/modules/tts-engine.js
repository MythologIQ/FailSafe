// FailSafe Command Center — Text-to-Speech Engine
// Piper TTS via vendored WASM for neural-quality voice synthesis.

const PIPER_MODULE = '../vendor/piper/piper.min.js';

export class TtsEngine {
  constructor(store) {
    this.store = store || null;
    this.tts = null;
    this.audio = null;
    this.onStateChange = null;
    this.voiceId = 'en_US-hfc_female-medium';
    this._blobUrl = null;
  }

  async init(voiceId) {
    if (voiceId) this.voiceId = voiceId;
    else if (this.store) {
      const saved = this.store.get('tts-voice');
      if (saved) this.voiceId = saved;
    }
    try {
      // Check if file is actually on server to avoid 404 HTML/MIME errors
      const check = await fetch(PIPER_MODULE, { method: 'HEAD' });
      if (!check.ok) {
        console.info('Piper TTS: not vendored yet — speech synthesis disabled');
        return;
      }
      const ct = (check.headers.get('content-type') || '').toLowerCase();
      if (!ct.includes('javascript') && !ct.includes('application/octet-stream')) {
        console.info('Piper TTS: vendor file has wrong MIME type — speech synthesis disabled');
        return;
      }
      const mod = await import(PIPER_MODULE);
      this.tts = new mod.PiperTTS({ voiceId: this.voiceId });
      await this.tts.init();
    } catch (err) {
      console.warn('Failed to initialize Piper TTS:', err);
      this.tts = null;
    }
  }

  async speak(text) {
    if (!this.tts) return;
    this.stop();

    try {
      const wav = await this.tts.predict({ text, voiceId: this.voiceId });
      const blob = new Blob([wav], { type: 'audio/wav' });
      this._blobUrl = URL.createObjectURL(blob);
      this.audio = new Audio(this._blobUrl);

      this.audio.addEventListener('play', () => {
        this.onStateChange?.('speaking');
      });
      this.audio.addEventListener('ended', () => {
        this._cleanup();
        this.onStateChange?.('idle');
      });
      this.audio.addEventListener('error', () => {
        this._cleanup();
        this.onStateChange?.('idle');
      });

      await this.audio.play();
    } catch {
      this._cleanup();
      this.onStateChange?.('idle');
    }
  }

  stop() {
    if (!this.audio) return;
    this.audio.pause();
    this._cleanup();
    this.onStateChange?.('idle');
  }

  destroy() {
    this.stop();
    if (this.tts?.dispose) {
      try { this.tts.dispose(); } catch { /* best-effort */ }
    }
    this.tts = null;
  }

  _cleanup() {
    if (this._blobUrl) {
      URL.revokeObjectURL(this._blobUrl);
      this._blobUrl = null;
    }
    this.audio = null;
  }
}
