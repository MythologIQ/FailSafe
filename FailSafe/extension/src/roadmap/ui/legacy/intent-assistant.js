import { escapeHtml } from './utils.js';

export class IntentAssistant {
  constructor(options) {
    this.elements = options.elements;
    this.getPhase = options.getPhase;
    this.getSelectedSkill = options.getSelectedSkill;
    this.getFallbackSkill = options.getFallbackSkill;

    this.elements.generate.addEventListener('click', () => this.generate());
    this.elements.copy.addEventListener('click', () => this.copy());
  }

  renderContext() {
    const phase = this.getPhase();
    const skill = this.getSelectedSkill();
    this.elements.context.textContent = skill
      ? `Intent Buffer: ${phase.title} | ${skill.label}`
      : `Intent Buffer: ${phase.title} | empty`;
  }

  generate() {
    const intent = (this.elements.input.value || '').trim();
    if (!intent) {
      this.elements.output.textContent = 'Enter an intent goal first. Generating a package does not execute a run.';
      return;
    }
    const phase = this.getPhase();
    const selected = this.getSelectedSkill() || this.getFallbackSkill();

    const packageText = [
      '# package-generated (no execution)',
      'action_package:',
      `  goal: "${intent.replace(/"/g, "'")}"`,
      `  phase: "${phase.key}"`,
      `  phase_title: "${phase.title}"`,
      `  skill: "${selected?.key || 'failsafe-general-use-workflow'}"`,
      `  skill_label: "${selected?.label || 'General Workflow'}"`,
      '  constraints:',
      '    - "Do not bypass policy or permission checks"',
      '    - "Provide deterministic validation steps"',
      '  plan:',
      '    - "Restate scope in one sentence"',
      '    - "Execute phase-aligned tasks in order"',
      '    - "Run verification and capture evidence"',
      '    - "Summarize outcome and rollback options"',
      '  verification:',
      '    - "Expected output is concrete and testable"',
      '    - "Risks and blockers are explicitly stated"'
    ].join('\n');

    this.elements.output.textContent = packageText;
  }

  async copy() {
    const text = this.elements.output.textContent || '';
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      this.elements.output.textContent = `${text}\n\n# copied`;
    } catch {
      this.elements.output.textContent = `${text}\n\n# copy_failed`;
    }
  }
}
