// FailSafe Command Center — Speech-to-Text Engine
// Whisper via vendored Transformers.js. Web Speech API used only for wake word.

const WHISPER_MODULE = '../vendor/whisper/transformers.min.js';

async function checkVendorAvailable() {
  try {
    await import(WHISPER_MODULE);
    return true;
  } catch {
    return false;
  }
}

async function loadPipeline(...args) {
  const available = await checkVendorAvailable();
  if (!available) {
    throw new Error('Whisper Transformers.js not vendored at ' + WHISPER_MODULE);
  }

  const mod = await import(WHISPER_MODULE);

  // v4.3.2: Configure environment — fetch models from HuggingFace CDN, not local paths
  if (mod.env) {
    mod.env.allowRemoteModels = true;
    mod.env.allowLocalModels = false;
    // Tell transformers where to find its own WASM helpers
    mod.env.backends.onnx.wasm.wasmPaths = '../vendor/whisper/';
  }

  return mod.pipeline(...args);
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
    this.loadingStatus = 'idle';

    // Silence timeout
    this.silenceTimeoutMs = 5000;
    this._silenceTimer = null;
    // Wake word (uses Web Speech API internally)
    this.wakeWordEnabled = false;
    this.wakePhrase = 'hey failsafe';
    this._wakeRecognition = null;
    
    // Live interim transcription (Web Speech API companion)
    this._liveRecognition = null;
    this._liveAccumulated = '';
    // Audio device / language
    this.micDeviceId = null;
    this.language = null;
  }

  async init() {
    console.log('FailSafe STT: Initialization started');
    this._loadSettings();
    // Path check removed as it can cause hangs; we rely on catch block below.

    let hasMic = false;
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        hasMic = devices.some(d => d.kind === 'audioinput');
      }
    } catch {
      hasMic = false;
    }

    if (!hasMic) {
      console.warn('FailSafe STT: No microphone found');
      this.onModelProgress?.('error');
      return;
    }

    this.loadingStatus = 'loading';
    this.onModelProgress?.('loading');
    console.log('FailSafe STT: Loading machine learning pipeline...');
    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 30000));
      this._whisperPipeline = await Promise.race([
        loadPipeline(
          'automatic-speech-recognition',
          'Xenova/whisper-tiny.en',
          {
            progress_callback: (p) => {
              if (p.status === 'initiate') this.loadingStatus = 'downloading';
              if (p.status === 'progress') {
                this.loadingStatus = 'downloading';
                this.onModelProgress?.('downloading', Math.round(p.progress));
              }
            },
          }
        ),
        timeoutPromise
      ]);
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
    const mic = this.store?.get('audio-input-device');
    if (mic) this.micDeviceId = mic;
    this.language = this.store?.get('stt-language') || navigator.language || 'en-US';
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

  setMicDevice(deviceId) {
    this.micDeviceId = deviceId || null;
    this.store?.set('audio-input-device', this.micDeviceId || '');
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
      this._wakeRetries = (this._wakeRetries || 0) + 1;
      if (this._wakeRetries > 5) {
        this.onModelProgress?.('error', 'Wake word stopped after 5 failures');
        return;
      }
      if (this.wakeWordEnabled && this.state === 'idle') {
        const delay = Math.min(1000 * Math.pow(2, this._wakeRetries - 1), 30000);
        setTimeout(() => this.startWakeWordListener(), delay);
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
    this.onTranscript = null;
    this.onStateChange = null;
    this.onAutoStop = null;
    this.onWakeWordTriggered = null;
    this.onModelProgress = null;
  }

  // -- Private helpers -------------------------------------------------------

  async _startWhisper() {
    if (!this._whisperReady) {
      this._setState('idle');
      return;
    }

    this._chunks = [];
    try {
      const audioConstraint = this.micDeviceId ? { deviceId: { exact: this.micDeviceId } } : true;
      this._stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraint });
      
      // Live Analysis for UI
      this._audioCtx = new (globalThis.AudioContext || globalThis.webkitAudioContext)();
      this._analyser = this._audioCtx.createAnalyser();
      this._analyser.fftSize = 256;
      const source = this._audioCtx.createMediaStreamSource(this._stream);
      source.connect(this._analyser);
      this.onAnalyserCreated?.(this._analyser);
      
    } catch (err) {
      const msg = err.name === 'NotAllowedError' ? 'Microphone access denied'
        : err.name === 'NotFoundError' ? 'No microphone detected'
        : err.message?.includes('network') ? 'Network error loading speech model'
        : 'Speech recognition unavailable';
      this.onModelProgress?.('error', msg);
      this._setState('idle');
      return;
    }
    // B126: Explicit codec with fallback
    const mimeType = MediaRecorder.isTypeSupported?.('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported?.('audio/webm') ? 'audio/webm' : undefined;
    try {
      this._recorder = new MediaRecorder(this._stream, mimeType ? { mimeType } : undefined);
    } catch (recErr) {
      this._releaseStream();
      this._setState('idle');
      return;
    }
    this._recorder.addEventListener('dataavailable', (e) => {
      if (e.data.size > 0) this._chunks.push(e.data);
    });
    this._recorder.start();
    this._resetSilenceTimer();

    // Start live interim transcription via Web Speech API (if available)
    this._startLiveTranscription();
  }

  async _stopWhisper() {
    if (!this._recorder) return;

    const stopped = new Promise((res) => {
      this._recorder.addEventListener('stop', res, { once: true });
    });
    this._recorder.stop();
    await stopped;
    this._stopLiveTranscription();
    this._releaseStream();

    const blob = new Blob(this._chunks, { type: 'audio/webm' });
    if (this.onAudioCaptured) {
      this.onAudioCaptured(blob);
    }
    const arrayBuf = await blob.arrayBuffer();
    const ctx = new (globalThis.AudioContext || globalThis.webkitAudioContext)({ sampleRate: 16000 });
    try {
      const decoded = await ctx.decodeAudioData(arrayBuf);
      const audioBuffer = decoded.getChannelData(0);
      const result = await this._whisperPipeline(audioBuffer);
      this.onTranscript?.(result.text, true);
    } catch {
      this.onTranscript?.('[transcription failed]', true);
    } finally {
      ctx.close().catch(() => {});
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

  // -- Live Transcription (Web Speech API) ------------------------------------

  _startLiveTranscription() {
    if (!SpeechRecognitionCtor || this._liveRecognition) return;
    try {
      this._liveRecognition = new SpeechRecognitionCtor();
      this._liveRecognition.continuous = true;
      this._liveRecognition.interimResults = true;
      this._liveRecognition.lang = this.language || 'en-US';

      this._liveRecognition.addEventListener('result', (e) => {
        let current = '';
        for (let i = 0; i < e.results.length; i++) {
          current += e.results[i][0].transcript;
        }
        if (current) {
          this._liveAccumulated = current;
          this.onTranscript?.(this._liveAccumulated, false);
          this._resetSilenceTimer();
        }
      });

      this._liveRecognition.addEventListener('end', () => {
        // Restart if still recording (Web Speech auto-stops periodically)
        if (this.state === 'listening' && this._liveRecognition) {
          try { this._liveRecognition.start(); } catch { /* already started */ }
        }
      });

      this._liveRecognition.addEventListener('error', () => {
        // Silently ignore — this is a supplementary feature
      });

      this._liveRecognition.start();
    } catch {
      // Web Speech not available — no live preview, Whisper still works
      this._liveRecognition = null;
    }
  }

  _stopLiveTranscription() {
    if (!this._liveRecognition) return;
    try { this._liveRecognition.stop(); } catch { /* already stopped */ }
    this._liveRecognition = null;
    this._liveAccumulated = '';
  }

  _releaseStream() {
    this._stream?.getTracks().forEach((t) => t.stop());
    this._stream = null;
    if (this._audioCtx) {
      this._audioCtx.close().catch(() => {});
      this._audioCtx = null;
    }
    this._analyser = null;
  }

  _setState(state) {
    this.state = state;
    this.onStateChange?.(state);
  }
}
