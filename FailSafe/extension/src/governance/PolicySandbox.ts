interface PolicyRule {
  id: string;
  condition: (context: Record<string, unknown>) => boolean;
  action: 'allow' | 'block' | 'escalate';
}

interface SandboxResult {
  ruleId: string;
  action: 'allow' | 'block' | 'escalate';
  matched: boolean;
}

export class PolicySandbox {
  private rules: PolicyRule[] = [];

  addRule(rule: PolicyRule): void {
    this.rules.push(rule);
  }

  dryRun(context: Record<string, unknown>): SandboxResult[] {
    return this.rules.map(rule => ({
      ruleId: rule.id,
      action: rule.action,
      matched: rule.condition(context),
    }));
  }

  getEffectiveAction(context: Record<string, unknown>): 'allow' | 'block' | 'escalate' {
    for (const rule of this.rules) {
      if (rule.condition(context)) {
        return rule.action;
      }
    }
    return 'allow';
  }
}
