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
    this.onAnalyser = null;

    this.stt.onAnalyserCreated = (analyser) => {
      this.onAnalyser?.(analyser);
    };
  }

  wireModelProgress() {
    this.stt.onModelProgress = (status, progress) => {
      if (status === 'downloading') {
        this._setMicContent('🎙️ PREPARING', true, 'Preparing security model...');
      } else if (status === 'loading') {
        this._setMicContent('⏳ LOADING', true, 'Loading Whisper model...');
      } else if (status === 'ready') {
        this._setMicContent('🎙️ LISTEN', false, 'Click to speak');
      } else if (status === 'error') {
        this._setMicContent('❌ NO MIC', true, 'Whisper unavailable — check permissions');
      }
    };
  }

  loadSettings() {
    const timeout = this.store?.get('stt-silence-timeout');
    if (timeout) this.stt.setSilenceTimeout(Number(timeout));

    this.stt.onAutoStop = () => {
      this.voiceActive = false;
      this.pttActive = false;
      this.onMicButton?.('🎙️ LISTEN', false);
      this.onStatus?.('Auto-stopped (silence)', 'var(--accent-cyan)');
    };

    this.stt.onWakeWordTriggered = () => {
      this.voiceActive = true;
      this.onMicButton?.('⏹️ STOP', true);
      this.onStatus?.('Wake word detected \u2014 recording...', 'var(--accent-red)');
    };

    const wakeEnabled = this.store?.get('wake-word-enabled');
    if (wakeEnabled === 'true' || wakeEnabled === true) {
      this.stt.startWakeWordListener();
    }
  }

  async toggle() {
    if (this.pttActive || this._toggling) return;
    if (!this.stt.modelReady) {
      const msg = this.stt.loadingStatus === 'downloading' || this.stt.loadingStatus === 'loading'
        ? 'Security model is still preparing — please wait...'
        : 'Voice model not available — type your ideas instead';
      this.onStatus?.(msg, 'var(--accent-gold)');
      return;
    }
    this._toggling = true;
    try {
      if (this.voiceActive) {
        this.voiceActive = false;
        this.onMicButton?.('🎙️ LISTEN', false);
        this.onStatus?.('Processing...', 'var(--accent-cyan)');
        await this.stt.stopListening();
      } else {
        this.voiceActive = true;
        this.onMicButton?.('⏹️ STOP', true);
        this.onStatus?.('Recording...', 'var(--accent-red)');
        this.stt.startListening();
      }
    } finally {
      this._toggling = false;
    }
  }

  startPtt() {
    if (this.voiceActive || this.pttActive || !this.stt.modelReady) return false;
    this.pttActive = true;
    this.voiceActive = true;
    this.onMicButton?.('⏹️ STOP', true);
    this.onStatus?.('Recording (PTT)...', 'var(--accent-red)');
    this.stt.startListening();
    return true;
  }

  async stopPtt() {
    if (!this.pttActive) return;
    this.pttActive = false;
    this.voiceActive = false;
    this.onMicButton?.('🎙️ LISTEN', false);
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

  _setMicContent(html, disabled, title) {
    this.onMicButton?.(html, !disabled, disabled, title);
  }
}
