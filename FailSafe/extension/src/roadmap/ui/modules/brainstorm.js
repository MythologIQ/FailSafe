// FailSafe Command Center — Brainstorm Voice MindMapper
// Voice-driven ideation with LLM extraction, backend graph, node CRUD.
import { BrainstormCanvas } from './brainstorm-canvas.js';
import { SttEngine } from './stt-engine.js';
import { TtsEngine } from './tts-engine.js';
import { VoiceController } from './voice-controller.js';
import { KeyboardManager } from './keyboard-manager.js';
import { BrainstormGraph } from './brainstorm-graph.js';

const CATEGORIES = ['Feature', 'Architecture', 'Risk', 'Question'];

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export class BrainstormRenderer {
  constructor(containerId, deps = {}) {
    this.container = document.getElementById(containerId);
    this.store = deps.store || null;
    this.client = deps.client || null;
    this.selectedCategory = 'Feature';
    this.selectedNodeId = null;

    const stt = new SttEngine(this.store);
    const tts = new TtsEngine();
    this.voice = new VoiceController(stt, tts, this.store);
    this.keyboard = new KeyboardManager(this.store);
    this.graph = new BrainstormGraph();
  }

  render(hubData) {
    if (!this.container || this.graph.canvas) return;
    this.container.innerHTML = this.renderShell();
    this.graph.fetchGraph().then(() => this.initCanvas());
    this._wireVoice();
    this.voice.stt.init().then(() => this.voice.loadSettings()).catch(() => {});
    this.voice.tts.init().catch(() => {});
  }

  _wireVoice() {
    const btn = () => this.container?.querySelector('.cc-bs-voice');
    this.voice.onMicButton = (html, active, disabled, title) => {
      const el = btn();
      if (!el) return;
      if (html !== null) el.innerHTML = html;
      el.classList.toggle('active', !!active);
      if (disabled !== undefined) el.disabled = !!disabled;
      if (title) el.title = title;
    };
    this.voice.onStatus = (text, color) => this.showStatus(text, color);
    this.voice.wireModelProgress();
    this.voice.stt.onTranscript = (text, isFinal) => this.onTranscript(text, isFinal);
    this.keyboard.onPttStart = () => this.voice.startPtt();
    this.keyboard.onPttStop = () => this.voice.stopPtt();
    this.graph.onSelectionChange = (id) => {
      if (id === this.selectedNodeId || id === null) this.selectNode(null);
    };
  }

  renderShell() {
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
    const canvas = new BrainstormCanvas(svg);
    this.graph.setCanvas(canvas);
    canvas.setNodes(this.graph.nodes);
    canvas.setEdges(this.graph.edges, this.graph.nodes);
    canvas.onNodeMove((id, x, y) => {
      const node = this.graph.nodes.find(n => n.id === id);
      if (node) { node.x = x; node.y = y; }
    });
    canvas.onNodeSelect((id) => this.selectNode(id));
    canvas.onNodeDblClick((id) => this.startEditNode(id));
    this.bindToolbar();
    this.keyboard.loadKey();
    this.keyboard.bind();
  }

  bindToolbar() {
    const el = this.container;
    el.querySelector('.cc-bs-add')?.addEventListener('click', () => this.addNode());
    el.querySelector('.cc-bs-label-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.addNode();
    });
    el.querySelector('.cc-bs-export')?.addEventListener('click', () => this.graph.exportJSON());
    el.querySelector('.cc-bs-clear')?.addEventListener('click', () => this.graph.clearAll());
    el.querySelector('.cc-bs-edit')?.addEventListener('click', () => this.startEditNode(this.selectedNodeId));
    el.querySelector('.cc-bs-remove')?.addEventListener('click', () => this.graph.removeNode(this.selectedNodeId));
    el.querySelector('.cc-bs-chat-send')?.addEventListener('click', () => this.sendChat());
    el.querySelector('.cc-bs-chat-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendChat(); }
    });
    el.querySelector('.cc-bs-voice')?.addEventListener('click', () => this.voice.toggle());
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

  async submitTranscript(transcript) {
    this.showStatus('Processing transcript...', 'var(--accent-cyan)');
    const extraction = await this.graph.submitTranscript(transcript);
    if (!extraction) {
      this.showStatus('Server unavailable — try adding nodes manually', 'var(--accent-red)');
      return;
    }
    if (extraction.error) {
      this.showStatus(extraction.error, 'var(--accent-red)');
      return;
    }
    if (extraction.nodes) {
      this.graph.applyExtraction(extraction);
      const msg = extraction.verbalResponse
        || `Extracted ${extraction.nodes.length} node(s)`;
      this.showStatus(msg, 'var(--accent-green)');
      if (extraction.verbalResponse) {
        this.voice.tts.speak(extraction.verbalResponse).catch(() => {});
      }
    } else {
      this.showStatus('No ideas extracted — try rephrasing', 'var(--accent-gold)');
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

  // -- Node selection ---------------------------------------------------------

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
    const node = this.graph.nodes.find(n => n.id === id);
    if (info && node) {
      info.style.display = 'block';
      const conf = node.confidence >= 0 ? `${node.confidence}%` : 'N/A';
      info.innerHTML = `<strong>${escapeHtml(node.label)}</strong> &middot; ${escapeHtml(node.type)} &middot; Confidence: ${conf}`;
    }
  }

  addNode() {
    const input = this.container.querySelector('.cc-bs-label-input');
    const select = this.container.querySelector('.cc-bs-type-select');
    const label = input?.value?.trim();
    if (!label) { input?.focus(); return; }
    this.graph.addNode(label, select?.value || this.selectedCategory);
    input.value = '';
  }

  startEditNode(id) {
    if (!id) return;
    const node = this.graph.nodes.find(n => n.id === id);
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
    await this.graph.saveNode(id, label, select?.value);
    input.value = '';
    addBtn.textContent = 'Add';
    addBtn.onclick = () => this.addNode();
  }

  onEvent(evt) { this.graph.onEvent(evt); }

  destroy() {
    this.keyboard.unbind();
    this.voice.destroy();
    this.graph.canvas?.destroy();
    if (this.container) this.container.innerHTML = '';
  }
}
