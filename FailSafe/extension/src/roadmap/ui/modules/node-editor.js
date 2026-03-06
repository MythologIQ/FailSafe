// FailSafe Command Center — Node Editor
// Node selection, add, edit, and save operations.

import { escapeHtml } from './brainstorm-templates.js';

export class NodeEditor {
  constructor(graph, getEl) {
    this.graph = graph;
    this._getEl = getEl;
    this.selectedNodeId = null;
  }

  select(id) {
    this.selectedNodeId = id;
    const editBtn = this._getEl('.cc-bs-edit');
    const removeBtn = this._getEl('.cc-bs-remove');
    const info = this._getEl('.cc-bs-node-info');
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

  add(label, type) {
    if (!label) return;
    this.graph.addNode(label, type);
  }

  startEdit(id) {
    if (!id) return;
    const node = this.graph.nodes.find(n => n.id === id);
    if (!node) return;
    const input = this._getEl('.cc-bs-label-input');
    const select = this._getEl('.cc-bs-type-select');
    const addBtn = this._getEl('.cc-bs-add');
    if (input) input.value = node.label;
    if (select) select.value = node.type;
    if (addBtn) {
      addBtn.textContent = 'Save';
      addBtn.onclick = () => this.saveEdit(id);
    }
    input?.focus();
  }

  async saveEdit(id) {
    const input = this._getEl('.cc-bs-label-input');
    const select = this._getEl('.cc-bs-type-select');
    const addBtn = this._getEl('.cc-bs-add');
    const label = input?.value?.trim();
    if (!label) { input?.focus(); return; }
    await this.graph.saveNode(id, label, select?.value);
    if (input) input.value = '';
    if (addBtn) {
      addBtn.textContent = 'Add';
      addBtn.onclick = () => this.add(input?.value?.trim(), select?.value);
    }
  }
}
