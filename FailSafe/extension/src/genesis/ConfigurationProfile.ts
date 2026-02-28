export interface ConfigEntry {
  key: string;
  value: string;
  source: 'default' | 'user' | 'workspace' | 'run';
}

export class ConfigurationProfile {
  private entries: Map<string, ConfigEntry> = new Map();

  set(key: string, value: string, source: ConfigEntry['source']): void {
    this.entries.set(key, { key, value, source });
  }

  resolve(key: string): string {
    return this.entries.get(key)?.value ?? '';
  }

  getAll(): ConfigEntry[] {
    return Array.from(this.entries.values());
  }

  loadDefaults(defaults: Record<string, string>): void {
    for (const [key, value] of Object.entries(defaults)) {
      if (!this.entries.has(key)) {
        this.entries.set(key, { key, value, source: 'default' });
      }
    }
  }
}
