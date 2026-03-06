// FailSafe Command Center — Ideation Buffer State
// Pure data layer to manage the staging workspace for the 3D Mindmap

const MAX_HISTORY = 10;

export class IdeationBuffer {
  constructor() {
    this.currentText = '';
    this.history = []; // Array of { id, text, timestamp }
  }

  appendTranscript(textDelta) {
    if (!textDelta) return;
    const prefix = this.currentText ? ' ' : '';
    this.currentText += prefix + textDelta;
  }

  setText(text) {
    this.currentText = text || '';
  }

  commit() {
    if (!this.currentText.trim()) return null;
    
    const thought = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      text: this.currentText.trim(),
      timestamp: new Date().toISOString()
    };
    
    this.history.unshift(thought);
    if (this.history.length > MAX_HISTORY) {
      this.history.pop();
    }
    
    this.currentText = '';
    return thought;
  }

  getHistory() {
    return this.history;
  }
}
