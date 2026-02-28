import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface AgentTeamConfig {
  enabled: boolean;
  configPath: string;
}

export class AgentTeamsDetector {
  private readonly settingsPath: string;

  constructor(settingsPath?: string) {
    this.settingsPath = settingsPath ?? path.join(os.homedir(), '.claude', 'settings.json');
  }

  readClaudeSettings(): Record<string, unknown> | null {
    try {
      if (!fs.existsSync(this.settingsPath)) return null;
      const raw = fs.readFileSync(this.settingsPath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  isAgentTeamsEnabled(): boolean {
    const settings = this.readClaudeSettings();
    if (!settings) return false;
    const env = (settings.env as Record<string, string>) ?? {};
    return env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === '1';
  }

  getTeamConfig(): AgentTeamConfig {
    return {
      enabled: this.isAgentTeamsEnabled(),
      configPath: this.settingsPath,
    };
  }
}
