// FailSafe Command Center — Brainstorm Voice MindMapper
// Voice-driven ideation with LLM extraction, backend graph, node CRUD.
import { BrainstormCanvas } from './brainstorm-canvas.js';
import { SttEngine } from './stt-engine.js';
import { TtsEngine } from './tts-engine.js';

const CATEGORIES = ['Feature', 'Architecture', 'Risk', 'Question'];

export class BrainstormRenderer {
  constructor(containerId, deps = {}) {
    this.container = document.getElementById(containerId);
    this.store = deps.store || null;
    this.client = deps.client || null;
    this.nodes = [];
    this.edges = [];
    this.canvas = null;
    this.stt = new SttEngine(this.store);
    this.tts = new TtsEngine();
    this.selectedCategory = 'Feature';
    this.voiceActive = false;
    this.selectedNodeId = null;

    // Push-to-Talk
    this.pttKey = 'Space';
    this.pttActive = false;
    this._onKeyDown = null;
    this._onKeyUp = null;
  }

  render(hubData) {
    if (!this.container || this.canvas) return;
    this.container.innerHTML = this.renderShell();
    this.fetchGraph().then(() => this.initCanvas());
    this._wireModelProgress();
    this.stt.init().then(() => this._loadVoiceSettings()).catch(() => {});
    this.tts.init().catch(() => {});
  }

  _wireModelProgress() {
    const btn = this.container?.querySelector('.cc-bs-voice');
    if (btn) { btn.disabled = true; btn.title = 'Loading Whisper model...'; }

    this.stt.onModelProgress = (status, progress) => {
      const btn = this.container?.querySelector('.cc-bs-voice');
      if (!btn) return;
      if (status === 'downloading') {
        btn.innerHTML = `${progress}%`;
        btn.disabled = true;
        btn.title = `Downloading Whisper model... ${progress}%`;
      } else if (status === 'loading') {
        btn.innerHTML = '&#x23F3;';
        btn.disabled = true;
        btn.title = 'Loading Whisper model...';
      } else if (status === 'ready') {
        btn.innerHTML = '&#x1F399; Mic';
        btn.disabled = false;
        btn.title = 'Hold to speak';
      } else if (status === 'error') {
        btn.innerHTML = '&#x1F399; Mic';
        btn.disabled = true;
        btn.title = 'Whisper model failed to load';
      }
    };
  }

  _loadVoiceSettings() {
    // PTT key
    const pttKey = this.store?.get('ptt-key');
    if (pttKey) this.pttKey = pttKey;

    // Silence timeout
    const timeout = this.store?.get('stt-silence-timeout');
    if (timeout) this.stt.setSilenceTimeout(Number(timeout));

    // Wire auto-stop callback
    this.stt.onAutoStop = () => {
      this.voiceActive = false;
      this.pttActive = false;
      const btn = this.container?.querySelector('.cc-bs-voice');
      if (btn) { btn.innerHTML = '&#x1F399; Mic'; btn.classList.remove('active'); }
      this.showStatus('Auto-stopped (silence)', 'var(--accent-cyan)');
    };

    // Wire wake word callback
    this.stt.onWakeWordTriggered = () => {
      this.voiceActive = true;
      const btn = this.container?.querySelector('.cc-bs-voice');
      if (btn) { btn.innerHTML = '&#x23F9; Stop'; btn.classList.add('active'); }
      this.showStatus('Wake word detected \u2014 recording...', 'var(--accent-red)');
    };

    // Start wake word listener if enabled
    const wakeEnabled = this.store?.get('wake-word-enabled');
    if (wakeEnabled === 'true' || wakeEnabled === true) {
      this.stt.startWakeWordListener();
    }
  }

  renderShell() {
    const cats = CATEGORIES.map(c =>
      `<button class="cc-chip cc-bs-cat${c === this.selectedCategory ? ' active' : ''}" data-cat="${c}">${c}</button>`
    ).join('');
    return `
      <div class="cc-bs-toolbar">
        <div class="cc-bs-input-row">
          <input class="cc-bs-label-input" type="text" placeholder="Node label..." maxlength="60" />
          <select class="cc-bs-type-select">${CATEGORIES.map(c =>
            `<option value="${c}"${c === this.selectedCategory ? ' selected' : ''}>${c}</option>`
          ).join('')}</select>
          <button class="cc-btn cc-btn--primary cc-bs-add">Add</button>
        </div>
        <div class="cc-bs-actions-row">
          <button class="cc-btn cc-bs-edit" disabled>Edit</button>
          <button class="cc-btn cc-btn--danger cc-bs-remove" disabled>Remove</button>
          <div style="flex:1"></div>
          <button class="cc-btn cc-bs-export">Export</button>
          <button class="cc-btn cc-btn--danger cc-bs-clear">Clear All</button>
        </div>
      </div>
      <div class="cc-bs-chat">
        <div class="cc-bs-chat-status"></div>
        <div class="cc-bs-chat-input-row">
          <input class="cc-bs-chat-input" type="text"
            placeholder="Type or speak an idea..." maxlength="500" />
          <button class="cc-btn cc-btn--primary cc-bs-chat-send">Send</button>
          <button class="cc-btn cc-bs-voice" title="Hold to speak">&#x1F399; Mic</button>
        </div>
      </div>
      <svg class="cc-canvas cc-brainstorm-svg" style="width:100%;height:400px"></svg>
      <div class="cc-bs-node-info" style="display:none"></div>`;
  }

  initCanvas() {
    const svg = this.container.querySelector('.cc-brainstorm-svg');
    if (!svg) return;
    this.canvas = new BrainstormCanvas(svg);
    this.canvas.setNodes(this.nodes);
    this.canvas.setEdges(this.edges, this.nodes);
    this.canvas.onNodeMove((id, x, y) => {
      const node = this.nodes.find(n => n.id === id);
      if (node) { node.x = x; node.y = y; }
    });
    this.canvas.onNodeSelect((id) => this.selectNode(id));
    this.canvas.onNodeDblClick((id) => this.startEditNode(id));
    this.bindToolbar();
    this.bindKeyboard();
  }

  bindToolbar() {
    const el = this.container;
    const labelInput = el.querySelector('.cc-bs-label-input');
    el.querySelector('.cc-bs-add')?.addEventListener('click', () => this.addNode());
    labelInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.addNode();
    });
    el.querySelector('.cc-bs-export')?.addEventListener('click', () => this.exportJSON());
    el.querySelector('.cc-bs-clear')?.addEventListener('click', () => this.clearAll());
    el.querySelector('.cc-bs-edit')?.addEventListener('click', () => this.startEditNode(this.selectedNodeId));
    el.querySelector('.cc-bs-remove')?.addEventListener('click', () => this.removeNode(this.selectedNodeId));

    // Chat box
    const chatInput = el.querySelector('.cc-bs-chat-input');
    el.querySelector('.cc-bs-chat-send')?.addEventListener('click', () => this.sendChat());
    chatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendChat(); }
    });
    el.querySelector('.cc-bs-voice')?.addEventListener('click', () => this.toggleVoice());
    this.stt.onTranscript = (text, isFinal) => this.onTranscript(text, isFinal);
  }

  // -- Chat box ---------------------------------------------------------------

  onTranscript(text, isFinal) {
    const chatInput = this.container?.querySelector('.cc-bs-chat-input');
    if (!chatInput) return;
    if (isFinal) {
      chatInput.value = text || '';
      if (text) this.sendChat();
    } else {
      chatInput.value = text?.slice(0, 500) || '';
      this.showStatus('Listening...', 'var(--accent-gold)');
    }
  }

  sendChat() {
    const chatInput = this.container?.querySelector('.cc-bs-chat-input');
    const text = chatInput?.value?.trim();
    if (!text) { chatInput?.focus(); return; }
    chatInput.value = '';
    this.submitTranscript(text);
  }

  async toggleVoice() {
    if (this.pttActive || !this.stt.modelReady) return;
    const btn = this.container.querySelector('.cc-bs-voice');
    if (this.voiceActive) {
      this.voiceActive = false;
      btn.innerHTML = '&#x1F399; Mic';
      btn?.classList.remove('active');
      this.showStatus('Processing...', 'var(--accent-cyan)');
      await this.stt.stopListening();
    } else {
      this.voiceActive = true;
      btn.innerHTML = '&#x23F9; Stop';
      btn?.classList.add('active');
      this.showStatus('Recording...', 'var(--accent-red)');
      this.stt.startListening();
    }
  }

  showStatus(text, color) {
    const status = this.container?.querySelector('.cc-bs-chat-status');
    if (!status) return;
    if (text) {
      status.textContent = text;
      status.style.borderLeftColor = color || 'var(--accent-cyan)';
      status.style.display = 'block';
    } else {
      status.style.display = 'none';
      status.textContent = '';
    }
  }

  // -- Push-to-Talk keyboard --------------------------------------------------

  bindKeyboard() {
    const isTextInput = (el) =>
      el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' ||
      el?.tagName === 'SELECT' || el?.isContentEditable;

    this._onKeyDown = (e) => {
      if (e.code !== this.pttKey || e.repeat || isTextInput(e.target)) return;
      if (this.voiceActive || this.pttActive || !this.stt.modelReady) return;
      e.preventDefault();
      this.pttActive = true;
      this.voiceActive = true;
      const btn = this.container?.querySelector('.cc-bs-voice');
      if (btn) { btn.innerHTML = '&#x23F9; Stop'; btn.classList.add('active'); }
      this.showStatus('Recording (PTT)...', 'var(--accent-red)');
      this.stt.startListening();
    };

    this._onKeyUp = (e) => {
      if (e.code !== this.pttKey || !this.pttActive) return;
      e.preventDefault();
      this.pttActive = false;
      this.voiceActive = false;
      const btn = this.container?.querySelector('.cc-bs-voice');
      if (btn) { btn.innerHTML = '&#x1F399; Mic'; btn.classList.remove('active'); }
      this.showStatus('Processing...', 'var(--accent-cyan)');
      this.stt.stopListening();
    };

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
  }

  setPttKey(code) {
    this.pttKey = code;
    this.store?.set('ptt-key', code);
  }

  unbindKeyboard() {
    if (this._onKeyDown) document.removeEventListener('keydown', this._onKeyDown);
    if (this._onKeyUp) document.removeEventListener('keyup', this._onKeyUp);
    this._onKeyDown = null;
    this._onKeyUp = null;
  }

  // -- Node selection --------------------------------------------------------

  selectNode(id) {
    this.selectedNodeId = id;
    const editBtn = this.container.querySelector('.cc-bs-edit');
    const removeBtn = this.container.querySelector('.cc-bs-remove');
    const info = this.container.querySelector('.cc-bs-node-info');
    if (!id) {
      editBtn && (editBtn.disabled = true);
      removeBtn && (removeBtn.disabled = true);
      if (info) info.style.display = 'none';
      return;
    }
    editBtn && (editBtn.disabled = false);
    removeBtn && (removeBtn.disabled = false);
    const node = this.nodes.find(n => n.id === id);
    if (info && node) {
      info.style.display = 'block';
      const conf = node.confidence >= 0 ? `${node.confidence}%` : 'N/A';
      info.innerHTML = `<strong>${node.label}</strong> &middot; ${node.type} &middot; Confidence: ${conf}`;
    }
  }

  // -- Node CRUD -------------------------------------------------------------

  async addNode() {
    const input = this.container.querySelector('.cc-bs-label-input');
    const select = this.container.querySelector('.cc-bs-type-select');
    const label = input?.value?.trim();
    if (!label) { input?.focus(); return; }
    const type = select?.value || this.selectedCategory;
    try {
      const res = await fetch('/api/v1/brainstorm/node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, type }),
      });
      const node = await res.json();
      if (node.id) this.mergeNodes([node], []);
      input.value = '';
    } catch { /* network error — WS will sync */ }
  }

  startEditNode(id) {
    if (!id) return;
    const node = this.nodes.find(n => n.id === id);
    if (!node) return;
    const input = this.container.querySelector('.cc-bs-label-input');
    const select = this.container.querySelector('.cc-bs-type-select');
    const addBtn = this.container.querySelector('.cc-bs-add');
    input.value = node.label;
    select.value = node.type;
    addBtn.textContent = 'Save';
    addBtn.onclick = () => this.saveEditNode(id);
    input.focus();
  }

  async saveEditNode(id) {
    const input = this.container.querySelector('.cc-bs-label-input');
    const select = this.container.querySelector('.cc-bs-type-select');
    const addBtn = this.container.querySelector('.cc-bs-add');
    const label = input?.value?.trim();
    if (!label) { input?.focus(); return; }
    try {
      await fetch(`/api/v1/brainstorm/node/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, type: select?.value }),
      });
      const node = this.nodes.find(n => n.id === id);
      if (node) { node.label = label; node.type = select?.value; }
      this.canvas?.setNodes(this.nodes);
    } catch { /* network error */ }
    input.value = '';
    addBtn.textContent = 'Add';
    addBtn.onclick = () => this.addNode();
  }

  async removeNode(id) {
    if (!id) return;
    try {
      await fetch(`/api/v1/brainstorm/node/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch { /* network error */ }
    this.nodes = this.nodes.filter(n => n.id !== id);
    this.edges = this.edges.filter(e => e.source !== id && e.target !== id);
    this.canvas?.setNodes(this.nodes);
    this.canvas?.setEdges(this.edges, this.nodes);
    this.selectNode(null);
  }

  // -- Transcript + merge ----------------------------------------------------

  async submitTranscript(transcript) {
    this.showStatus('Processing transcript...', 'var(--accent-cyan)');
    try {
      const res = await fetch('/api/v1/brainstorm/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });
      const extraction = await res.json();
      if (extraction.nodes) this.applyExtraction(extraction);
    } catch { /* network error */ }
  }

  applyExtraction(extraction) {
    this.mergeNodes(extraction.nodes || [], extraction.edges || []);
    if (extraction.verbalResponse) {
      this.showStatus(extraction.verbalResponse, 'var(--accent-green)');
      this.tts.speak(extraction.verbalResponse).catch(() => {});
    }
  }

  mergeNodes(newNodes, newEdges) {
    const existingIds = new Set(this.nodes.map(n => n.id));
    for (const n of newNodes) {
      if (!existingIds.has(n.id)) this.nodes.push(n);
    }
    for (const e of newEdges) this.edges.push(e);
    this.canvas?.setNodes(this.nodes);
    this.canvas?.setEdges(this.edges, this.nodes);
  }

  // -- Bulk actions ----------------------------------------------------------

  async clearAll() {
    try { await fetch('/api/v1/brainstorm/graph', { method: 'DELETE' }); } catch {}
    this.nodes = [];
    this.edges = [];
    this.canvas?.setNodes([]);
    this.canvas?.setEdges([], []);
    this.selectNode(null);
  }

  async exportJSON() {
    try {
      const res = await fetch('/api/v1/brainstorm/graph');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'brainstorm-session.json'; a.click();
      URL.revokeObjectURL(url);
    } catch {}
  }

  async fetchGraph() {
    try {
      const res = await fetch('/api/v1/brainstorm/graph');
      const data = await res.json();
      this.nodes = data.nodes || [];
      this.edges = data.edges || [];
    } catch {}
  }

  // -- WebSocket events ------------------------------------------------------

  onEvent(evt) {
    if (evt.type === 'brainstorm.update' && evt.payload) {
      this.mergeNodes(evt.payload.nodes || [], evt.payload.edges || []);
    }
    if (evt.type === 'brainstorm.node-removed' && evt.payload?.id) {
      this.nodes = this.nodes.filter(n => n.id !== evt.payload.id);
      this.edges = this.edges.filter(e => e.source !== evt.payload.id && e.target !== evt.payload.id);
      this.canvas?.setNodes(this.nodes);
      this.canvas?.setEdges(this.edges, this.nodes);
      if (this.selectedNodeId === evt.payload.id) this.selectNode(null);
    }
    if (evt.type === 'brainstorm.reset') {
      this.nodes = []; this.edges = [];
      this.canvas?.setNodes([]); this.canvas?.setEdges([], []);
      this.selectNode(null);
    }
  }

  destroy() {
    this.unbindKeyboard();
    this.stt.destroy();
    this.tts.destroy();
    this.canvas?.destroy();
    if (this.container) this.container.innerHTML = '';
  }
}
