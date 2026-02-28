import * as zlib from 'zlib';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { LedgerManager } from '../qorelogic/ledger/LedgerManager';
import { ShadowGenomeManager } from '../qorelogic/shadow/ShadowGenomeManager';

type ComplianceFramework = 'SOC2' | 'ISO27001' | 'EU_AI_ACT';

interface ControlMapping {
  framework: string;
  controls: Array<{ id: string; description: string; evidenceType: string }>;
}

export class ComplianceExporter {
  constructor(
    private readonly ledgerManager: LedgerManager,
    private readonly shadowGenomeManager: ShadowGenomeManager,
  ) {}

  async exportBundle(framework: ComplianceFramework, outputDir: string): Promise<string> {
    const bundle = {
      framework,
      exportedAt: new Date().toISOString(),
      ledger: await this.ledgerManager.getRecentEntries(10000),
      shadowGenome: await this.shadowGenomeManager.analyzeFailurePatterns(),
      unresolvedFailures: await this.shadowGenomeManager.getUnresolvedEntries(),
      chainVerification: this.ledgerManager.verifyChain(),
      controlMapping: this.mapToFramework(framework),
    };

    const json = JSON.stringify(bundle, null, 2);
    const hash = crypto.createHash('sha256').update(json).digest('hex');
    const filename = `compliance-${framework}-${hash.slice(0, 12)}.json.gz`;
    const outputPath = path.join(outputDir, filename);

    const compressed = zlib.gzipSync(Buffer.from(json));
    fs.writeFileSync(outputPath, compressed);

    return outputPath;
  }

  private mapToFramework(framework: ComplianceFramework): ControlMapping {
    const mappings: Record<ComplianceFramework, ControlMapping> = {
      SOC2: {
        framework: 'SOC2',
        controls: [
          { id: 'CC6.1', description: 'Logical access controls', evidenceType: 'ledger' },
          { id: 'CC7.2', description: 'System monitoring', evidenceType: 'shadow_genome' },
        ],
      },
      ISO27001: {
        framework: 'ISO27001',
        controls: [
          { id: 'A.12.4', description: 'Logging and monitoring', evidenceType: 'ledger' },
          { id: 'A.14.2', description: 'Security in development', evidenceType: 'ledger' },
        ],
      },
      EU_AI_ACT: {
        framework: 'EU_AI_ACT',
        controls: [
          { id: 'Art.12', description: 'Record-keeping', evidenceType: 'ledger' },
          { id: 'Art.14', description: 'Human oversight', evidenceType: 'shadow_genome' },
        ],
      },
    };
    return mappings[framework];
  }
}
