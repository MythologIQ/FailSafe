// FailSafe Command Center — Voice Controller
// Manages voice toggle, PTT coordination, model progress, and wake word UI wiring.

export class VoiceController {
  constructor(stt, tts, store) {
    this.stt = stt;
    this.tts = tts;
    this.store = store;
    this.voiceActive = false;
    this.pttActive = false;

    // UI callbacks (set by consumer)
    this.onMicButton = null;
    this.onStatus = null;
  }

  wireModelProgress() {
    this.stt.onModelProgress = (status, progress) => {
      if (status === 'downloading') {
        this._setMicContent(`${progress}%`, true, `Downloading Whisper model... ${progress}%`);
      } else if (status === 'loading') {
        this._setMicContent('&#x23F3;', true, 'Loading Whisper model...');
      } else if (status === 'ready') {
        this._setMicContent('&#x1F399; Mic', false, 'Click to speak');
      } else if (status === 'error') {
        this._setMicContent('&#x1F399; Mic', false, 'Whisper unavailable — mic disabled');
      }
    };
  }

  loadSettings() {
    const timeout = this.store?.get('stt-silence-timeout');
    if (timeout) this.stt.setSilenceTimeout(Number(timeout));

    this.stt.onAutoStop = () => {
      this.voiceActive = false;
      this.pttActive = false;
      this.onMicButton?.('&#x1F399; Mic', false);
      this.onStatus?.('Auto-stopped (silence)', 'var(--accent-cyan)');
    };

    this.stt.onWakeWordTriggered = () => {
      this.voiceActive = true;
      this.onMicButton?.('&#x23F9; Stop', true);
      this.onStatus?.('Wake word detected \u2014 recording...', 'var(--accent-red)');
    };

    const wakeEnabled = this.store?.get('wake-word-enabled');
    if (wakeEnabled === 'true' || wakeEnabled === true) {
      this.stt.startWakeWordListener();
    }
  }

  async toggle() {
    if (this.pttActive) return;
    if (!this.stt.modelReady) {
      this.onStatus?.('Voice model not available — type your ideas instead', 'var(--accent-gold)');
      return;
    }
    if (this.voiceActive) {
      this.voiceActive = false;
      this.onMicButton?.('&#x1F399; Mic', false);
      this.onStatus?.('Processing...', 'var(--accent-cyan)');
      await this.stt.stopListening();
    } else {
      this.voiceActive = true;
      this.onMicButton?.('&#x23F9; Stop', true);
      this.onStatus?.('Recording...', 'var(--accent-red)');
      this.stt.startListening();
    }
  }

  startPtt() {
    if (this.voiceActive || this.pttActive || !this.stt.modelReady) return false;
    this.pttActive = true;
    this.voiceActive = true;
    this.onMicButton?.('&#x23F9; Stop', true);
    this.onStatus?.('Recording (PTT)...', 'var(--accent-red)');
    this.stt.startListening();
    return true;
  }

  async stopPtt() {
    if (!this.pttActive) return;
    this.pttActive = false;
    this.voiceActive = false;
    this.onMicButton?.('&#x1F399; Mic', false);
    this.onStatus?.('Processing...', 'var(--accent-cyan)');
    this.stt.stopListening();
  }

  destroy() {
    this.stt.destroy();
    this.tts.destroy();
  }

  // -- Private helpers ---------------------------------------------------------

  _setMicDisabled(disabled, title) {
    this.onMicButton?.(null, false, disabled, title);
  }

  _setMicContent(html, active, title) {
    this.onMicButton?.(html, active, !active && html !== '&#x1F399; Mic', title);
  }
}
