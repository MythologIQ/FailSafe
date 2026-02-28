import * as https from 'https';
import * as url from 'url';
import * as net from 'net';

interface WebhookConfig {
  url: string;
  events: string[];
  secret?: string;
}

interface WebhookResult {
  success: boolean;
  statusCode?: number;
  error?: string;
}

export class GovernanceWebhook {
  private configs: WebhookConfig[] = [];

  register(config: WebhookConfig): void {
    if (!this.isValidUrl(config.url)) {
      throw new Error(`Invalid webhook URL: must be HTTPS and not a private IP`);
    }
    this.configs.push(config);
  }

  unregister(webhookUrl: string): void {
    this.configs = this.configs.filter(c => c.url !== webhookUrl);
  }

  getRegistered(): WebhookConfig[] {
    return [...this.configs];
  }

  async dispatch(event: string, payload: Record<string, unknown>): Promise<WebhookResult[]> {
    const targets = this.configs.filter(c => c.events.includes(event) || c.events.includes('*'));
    return Promise.all(targets.map(config => this.send(config, event, payload)));
  }

  private async send(
    config: WebhookConfig,
    event: string,
    payload: Record<string, unknown>,
  ): Promise<WebhookResult> {
    const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
    const parsed = new url.URL(config.url);

    return new Promise((resolve) => {
      const req = https.request({
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        timeout: 5000,
      }, (res) => {
        resolve({ success: res.statusCode === 200, statusCode: res.statusCode });
        res.resume();
      });
      req.on('error', (err) => resolve({ success: false, error: err.message }));
      req.on('timeout', () => { req.destroy(); resolve({ success: false, error: 'Timeout' }); });
      req.write(body);
      req.end();
    });
  }

  private isValidUrl(webhookUrl: string): boolean {
    try {
      const parsed = new url.URL(webhookUrl);
      if (parsed.protocol !== 'https:') return false;
      if (this.isPrivateIp(parsed.hostname)) return false;
      return true;
    } catch { return false; }
  }

  private isPrivateIp(hostname: string): boolean {
    if (net.isIP(hostname) === 0) return false;
    return hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') || hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') || hostname.startsWith('172.19.') ||
      hostname.startsWith('172.2') || hostname.startsWith('172.3') ||
      hostname.startsWith('192.168.') ||
      hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname === '::1';
  }
}
