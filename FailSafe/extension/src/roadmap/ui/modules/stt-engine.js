// FailSafe Command Center — Speech-to-Text Engine
// Whisper via vendored Transformers.js. Web Speech API used only for wake word.

const WHISPER_MODULE = '../../vendor/whisper/transformers.min.js';

async function loadPipeline(...args) {
  const mod = await import(WHISPER_MODULE);
  return mod.pipeline(...args);
}

async function isWhisperAvailable() {
  try {
    const res = await fetch(WHISPER_MODULE, { method: 'HEAD' });
    return res.ok;
  } catch { return false; }
}

const SpeechRecognitionCtor =
  globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition || null;

export class SttEngine {
  constructor(store) {
    this.store = store;
    this.onTranscript = null;
    this.onStateChange = null;
    this.onAutoStop = null;
    this.onWakeWordTriggered = null;
    this.onModelProgress = null;
    this.state = 'idle';
    this._recorder = null;
    this._whisperPipeline = null;
    this._whisperReady = false;
    this._chunks = [];
    this._stream = null;
    this.modelReady = false;

    // Silence timeout
    this.silenceTimeoutMs = 5000;
    this._silenceTimer = null;
    // Wake word (uses Web Speech API internally)
    this.wakeWordEnabled = false;
    this.wakePhrase = 'hey failsafe';
    this._wakeRecognition = null;
  }

  async init() {
    this._loadSettings();
    const available = await isWhisperAvailable();
    if (!available) return;
    this.onModelProgress?.('loading');
    try {
      this._whisperPipeline = await loadPipeline(
        'automatic-speech-recognition',
        'Xenova/whisper-tiny.en',
        {
          progress_callback: (p) => {
            if (p.status === 'progress') {
              this.onModelProgress?.('downloading', Math.round(p.progress));
            }
          },
        }
      );
      this._whisperReady = true;
      this.modelReady = true;
      this.onModelProgress?.('ready');
    } catch {
      this._whisperReady = false;
      this._whisperPipeline = null;
      this.onModelProgress?.('error');
    }
  }

  _loadSettings() {
    const timeout = this.store?.get('stt-silence-timeout');
    if (timeout) this.silenceTimeoutMs = Number(timeout);
    const wakeEnabled = this.store?.get('wake-word-enabled');
    if (wakeEnabled === 'true' || wakeEnabled === true) this.wakeWordEnabled = true;
    const phrase = this.store?.get('wake-word-phrase');
    if (phrase) this.wakePhrase = phrase.toLowerCase();
  }

  async startListening() {
    this._setState('listening');
    await this._startWhisper();
  }

  async stopListening() {
    this._clearSilenceTimer();
    this._setState('processing');
    await this._stopWhisper();
    this._setState('idle');

    // Restart wake word listener if enabled
    if (this.wakeWordEnabled) this.startWakeWordListener();
  }

  // -- Silence timeout -------------------------------------------------------

  setSilenceTimeout(ms) {
    this.silenceTimeoutMs = Math.max(1000, Math.min(15000, Number(ms) || 5000));
    this.store?.set('stt-silence-timeout', this.silenceTimeoutMs);
  }

  _resetSilenceTimer() {
    this._clearSilenceTimer();
    this._silenceTimer = setTimeout(() => {
      if (this.state === 'listening') {
        this.onAutoStop?.();
        this.stopListening();
      }
    }, this.silenceTimeoutMs);
  }

  _clearSilenceTimer() {
    if (this._silenceTimer) {
      clearTimeout(this._silenceTimer);
      this._silenceTimer = null;
    }
  }

  // -- Wake word -------------------------------------------------------------

  setWakeWordEnabled(enabled) {
    this.wakeWordEnabled = !!enabled;
    this.store?.set('wake-word-enabled', this.wakeWordEnabled);
    if (!enabled) this.stopWakeWordListener();
  }

  setWakeWord(phrase) {
    this.wakePhrase = (phrase || 'hey failsafe').toLowerCase();
    this.store?.set('wake-word-phrase', this.wakePhrase);
  }

  startWakeWordListener() {
    if (!SpeechRecognitionCtor || this._wakeRecognition) return;
    this._wakeRecognition = new SpeechRecognitionCtor();
    this._wakeRecognition.continuous = true;
    this._wakeRecognition.interimResults = true;

    this._wakeRecognition.addEventListener('result', (e) => {
      for (let i = 0; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript.toLowerCase();
        if (transcript.includes(this.wakePhrase)) {
          this.stopWakeWordListener();
          this.onWakeWordTriggered?.();
          this.startListening();
          return;
        }
      }
    });

    this._wakeRecognition.addEventListener('end', () => {
      // Restart if still enabled and not actively recording
      if (this.wakeWordEnabled && this.state === 'idle' && this._wakeRecognition) {
        try { this._wakeRecognition.start(); } catch { /* already started */ }
      }
    });

    this._wakeRecognition.addEventListener('error', () => {
      // Silently restart on transient errors
      if (this.wakeWordEnabled && this.state === 'idle') {
        setTimeout(() => this.startWakeWordListener(), 1000);
      }
    });

    try { this._wakeRecognition.start(); } catch { /* already started */ }
  }

  stopWakeWordListener() {
    if (!this._wakeRecognition) return;
    try { this._wakeRecognition.stop(); } catch { /* already stopped */ }
    this._wakeRecognition = null;
  }

  destroy() {
    this._clearSilenceTimer();
    this.stopWakeWordListener();
    this._stopRecorder();
    this._setState('idle');
  }

  // -- Private helpers -------------------------------------------------------

  async _startWhisper() {
    if (!this._whisperReady) {
      this._setState('idle');
      return;
    }

    this._chunks = [];
    try {
      this._stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      this._setState('idle');
      return;
    }
    this._recorder = new MediaRecorder(this._stream);
    this._recorder.addEventListener('dataavailable', (e) => {
      if (e.data.size > 0) this._chunks.push(e.data);
    });
    this._recorder.start();
  }

  async _stopWhisper() {
    if (!this._recorder) return;

    const stopped = new Promise((res) => {
      this._recorder.addEventListener('stop', res, { once: true });
    });
    this._recorder.stop();
    await stopped;
    this._releaseStream();

    const blob = new Blob(this._chunks, { type: 'audio/webm' });
    const arrayBuf = await blob.arrayBuffer();
    const ctx = new (globalThis.AudioContext || globalThis.webkitAudioContext)();
    const decoded = await ctx.decodeAudioData(arrayBuf);
    const audioBuffer = decoded.getChannelData(0);
    await ctx.close();

    try {
      const result = await this._whisperPipeline(audioBuffer);
      this.onTranscript?.(result.text, true);
    } catch {
      this.onTranscript?.('[transcription failed]', true);
    }
    this._chunks = [];
    this._recorder = null;
  }

  _stopRecorder() {
    if (!this._recorder) return;
    try { this._recorder.stop(); } catch { /* already stopped */ }
    this._releaseStream();
    this._recorder = null;
    this._chunks = [];
  }

  _releaseStream() {
    this._stream?.getTracks().forEach((t) => t.stop());
    this._stream = null;
  }

  _setState(state) {
    this.state = state;
    this.onStateChange?.(state);
  }
}
