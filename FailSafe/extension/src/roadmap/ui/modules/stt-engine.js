// FailSafe Command Center — Speech-to-Text Engine
import { loadPipeline, checkMicAvailable } from './whisper-loader.js';
import { SilenceTimer } from './silence-timer.js';
import { WakeWordListener } from './wake-word-listener.js';
import { LiveTranscriber } from './live-transcriber.js';

export class SttEngine {
  constructor(store) {
    this.store = store;
    this.onTranscript = null; this.onStateChange = null; this.onAutoStop = null;
    this.onWakeWordTriggered = null; this.onModelProgress = null;
    this.onAnalyserCreated = null; this.onAudioCaptured = null;
    this.state = 'idle';
    this._recorder = null;
    this._whisperPipeline = null;
    this._whisperReady = false;
    this._chunks = [];
    this._stream = null;
    this.modelReady = false;
    this.loadingStatus = 'idle';
    this.micDeviceId = null;
    this.language = null;

    this._silence = new SilenceTimer(5000);
    this._wake = new WakeWordListener(store);
    this._live = new LiveTranscriber();
  }

  async init() {
    this._loadSettings();
    if (!(await checkMicAvailable())) {
      this.onModelProgress?.('error');
      return;
    }
    await this._loadWhisperModel();
  }

  async _loadWhisperModel() {
    this.loadingStatus = 'loading';
    this.onModelProgress?.('loading');
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 30000)
      );
      this._whisperPipeline = await Promise.race([
        loadPipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
          progress_callback: (p) => {
            if (p.status === 'initiate') this.loadingStatus = 'downloading';
            if (p.status === 'progress') {
              this.loadingStatus = 'downloading';
              this.onModelProgress?.('downloading', Math.round(p.progress));
            }
          },
        }),
        timeoutPromise,
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
    if (timeout) this._silence.setTimeout(Number(timeout));
    const mic = this.store?.get('audio-input-device');
    if (mic) this.micDeviceId = mic;
    this.language = this.store?.get('stt-language') || navigator.language || 'en-US';
  }

  async startListening() {
    this._setState('listening');
    await this._startWhisper();
  }

  async stopListening() {
    this._silence.clear();
    this._setState('processing');
    await this._stopWhisper();
    this._setState('idle');
    if (this._wake.enabled) this.startWakeWordListener();
  }

  setSilenceTimeout(ms) {
    this._silence.setTimeout(ms);
    this.store?.set('stt-silence-timeout', this._silence.timeoutMs);
  }

  _resetSilenceTimer() {
    this._silence.reset(() => {
      if (this.state === 'listening') {
        this.onAutoStop?.();
        this.stopListening();
      }
    });
  }

  get wakeWordEnabled() { return this._wake.enabled; }
  get wakePhrase() { return this._wake.phrase; }
  get silenceTimeoutMs() { return this._silence.timeoutMs; }

  setWakeWordEnabled(enabled) { this._wake.setEnabled(enabled); }
  setWakeWord(phrase) { this._wake.setPhrase(phrase); }

  setMicDevice(deviceId) {
    this.micDeviceId = deviceId || null;
    this.store?.set('audio-input-device', this.micDeviceId || '');
  }

  startWakeWordListener() {
    this._wake.start(
      () => { this.onWakeWordTriggered?.(); this.startListening(); },
      (status, msg) => this.onModelProgress?.(status, msg),
      () => this.state
    );
  }

  stopWakeWordListener() { this._wake.stop(); }

  destroy() {
    this._silence.clear();
    this._wake.destroy();
    this._live.stop();
    this._stopRecorder();
    this._setState('idle');
    this.onTranscript = null; this.onStateChange = null; this.onAutoStop = null;
    this.onWakeWordTriggered = null; this.onModelProgress = null;
    this.onAnalyserCreated = null; this.onAudioCaptured = null;
  }

  async _startWhisper() {
    if (!this._whisperReady) {
      this.onModelProgress?.('error', 'Voice model not loaded — check network connection');
      this._setState('idle');
      return;
    }

    this._chunks = [];
    if (!(await this._acquireStream())) return;
    if (!this._createRecorder()) return;

    this._recorder.start();
    this._resetSilenceTimer();
    this._live.start(
      this.language,
      (text, isFinal) => this.onTranscript?.(text, isFinal),
      () => this._resetSilenceTimer(),
      () => this.state
    );
  }

  async _acquireStream() {
    try {
      const audioConstraint = this.micDeviceId
        ? { deviceId: { exact: this.micDeviceId } }
        : true;
      this._stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraint });
      this._audioCtx = new (globalThis.AudioContext || globalThis.webkitAudioContext)();
      this._analyser = this._audioCtx.createAnalyser();
      this._analyser.fftSize = 256;
      const source = this._audioCtx.createMediaStreamSource(this._stream);
      source.connect(this._analyser);
      this.onAnalyserCreated?.(this._analyser);
      return true;
    } catch (err) {
      let msg = 'Speech recognition unavailable';
      if (err.name === 'NotAllowedError') msg = 'Microphone access denied';
      else if (err.name === 'NotFoundError') msg = 'No microphone detected';
      this.onModelProgress?.('error', msg);
      this._setState('idle');
      return false;
    }
  }

  _createRecorder() {
    let mimeType;
    if (MediaRecorder.isTypeSupported?.('audio/webm;codecs=opus')) {
      mimeType = 'audio/webm;codecs=opus';
    } else if (MediaRecorder.isTypeSupported?.('audio/webm')) {
      mimeType = 'audio/webm';
    }
    try {
      this._recorder = new MediaRecorder(this._stream, mimeType ? { mimeType } : undefined);
    } catch {
      this._releaseStream();
      this._setState('idle');
      return false;
    }
    this._recorder.addEventListener('dataavailable', (e) => {
      if (e.data.size > 0) this._chunks.push(e.data);
    });
    return true;
  }

  async _stopWhisper() {
    if (!this._recorder) return;

    const stopped = new Promise((res) => {
      this._recorder.addEventListener('stop', res, { once: true });
    });
    this._recorder.stop();
    await stopped;
    this._live.stop();
    this._releaseStream();

    const blob = new Blob(this._chunks, { type: 'audio/webm' });
    if (this.onAudioCaptured) this.onAudioCaptured(blob);

    const arrayBuf = await blob.arrayBuffer();
    const ctx = new (globalThis.AudioContext || globalThis.webkitAudioContext)({ sampleRate: 16000 });
    try {
      const decoded = await ctx.decodeAudioData(arrayBuf);
      const result = await this._whisperPipeline(decoded.getChannelData(0));
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
