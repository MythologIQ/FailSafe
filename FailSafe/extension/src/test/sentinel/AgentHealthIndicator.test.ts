import { describe, it } from 'mocha';
import { strict as assert } from 'assert';

// --- Inline types (avoid vscode imports) ---

type HealthLevel = 'healthy' | 'elevated' | 'warning' | 'critical';

interface HealthSnapshot {
    level: HealthLevel;
    openCritical: number;
    openHigh: number;
    avgTrust: number;
    quarantinedCount: number;
    queueDepth: number;
}

// --- Standalone mirror of AgentHealthIndicator.calculateHealth ---

function calculateHealth(snapshot: Omit<HealthSnapshot, 'level'>): HealthLevel {
    if (snapshot.openCritical > 0 || snapshot.quarantinedCount > 0) {
        return 'critical';
    }
    if (snapshot.openHigh > 0 || snapshot.avgTrust < 0.4) {
        return 'warning';
    }
    if (snapshot.queueDepth > 3) {
        return 'elevated';
    }
    return 'healthy';
}

// --- Standalone mirror of AgentHealthIndicator.formatDisplayText ---

function formatDisplayText(snapshot: Omit<HealthSnapshot, 'level'> & { level: HealthLevel }): string {
    const icons: Record<HealthLevel, string> = {
        healthy: '$(shield)',
        elevated: '$(shield)',
        warning: '$(warning)',
        critical: '$(error)',
    };
    const icon = icons[snapshot.level];
    if (snapshot.level === 'healthy') { return `${icon} FS: Healthy`; }
    if (snapshot.level === 'critical') { return `${icon} FS: Critical`; }
    const totalRisks = snapshot.openCritical + snapshot.openHigh;
    if (totalRisks > 0) {
        return `${icon} FS: ${totalRisks} Risk${totalRisks > 1 ? 's' : ''}`;
    }
    const label = snapshot.level.charAt(0).toUpperCase() + snapshot.level.slice(1);
    return `${icon} FS: ${label}`;
}

// --- Standalone mirror of AgentHealthIndicator.formatTooltip ---

function formatTooltip(snapshot: HealthSnapshot): string {
    const lines = [
        `FailSafe Health: ${snapshot.level.toUpperCase()}`,
        '---',
        `Open Critical: ${snapshot.openCritical}`,
        `Open High: ${snapshot.openHigh}`,
        `Quarantined Agents: ${snapshot.quarantinedCount}`,
        `Avg Trust: ${snapshot.avgTrust.toFixed(2)}`,
        `Queue Depth: ${snapshot.queueDepth}`,
    ];
    return lines.join('\n');
}

// --- Helper to build a snapshot with defaults ---

function makeSnapshot(
    overrides: Partial<Omit<HealthSnapshot, 'level'>> = {},
): Omit<HealthSnapshot, 'level'> {
    return {
        openCritical: 0,
        openHigh: 0,
        avgTrust: 0.85,
        quarantinedCount: 0,
        queueDepth: 0,
        ...overrides,
    };
}

// --- Tests ---

describe('AgentHealthIndicator.calculateHealth', () => {
    it('should return healthy when no risks, high trust, empty queue', () => {
        const level = calculateHealth(makeSnapshot());
        assert.equal(level, 'healthy');
    });

    it('should return critical when openCritical > 0', () => {
        const level = calculateHealth(makeSnapshot({ openCritical: 1 }));
        assert.equal(level, 'critical');
    });

    it('should return critical when quarantinedCount > 0', () => {
        const level = calculateHealth(makeSnapshot({ quarantinedCount: 2 }));
        assert.equal(level, 'critical');
    });

    it('should return warning when openHigh > 0', () => {
        const level = calculateHealth(makeSnapshot({ openHigh: 3 }));
        assert.equal(level, 'warning');
    });

    it('should return warning when avgTrust < 0.4', () => {
        const level = calculateHealth(makeSnapshot({ avgTrust: 0.39 }));
        assert.equal(level, 'warning');
    });

    it('should return elevated when queueDepth > 3', () => {
        const level = calculateHealth(makeSnapshot({ queueDepth: 4 }));
        assert.equal(level, 'elevated');
    });

    it('should return critical when both openCritical and openHigh are set (critical overrides warning)', () => {
        const level = calculateHealth(
            makeSnapshot({ openCritical: 1, openHigh: 5 }),
        );
        assert.equal(level, 'critical');
    });

    it('should return healthy when all metrics are zero or safe', () => {
        const level = calculateHealth({
            openCritical: 0,
            openHigh: 0,
            avgTrust: 1.0,
            quarantinedCount: 0,
            queueDepth: 0,
        });
        assert.equal(level, 'healthy');
    });

    it('should return warning (not elevated) when avgTrust < 0.4 and queueDepth > 3', () => {
        const level = calculateHealth(
            makeSnapshot({ avgTrust: 0.3, queueDepth: 10 }),
        );
        assert.equal(level, 'warning');
    });

    it('should return healthy at the avgTrust boundary of exactly 0.4', () => {
        const level = calculateHealth(makeSnapshot({ avgTrust: 0.4 }));
        assert.equal(level, 'healthy');
    });

    it('should return healthy at the queueDepth boundary of exactly 3', () => {
        const level = calculateHealth(makeSnapshot({ queueDepth: 3 }));
        assert.equal(level, 'healthy');
    });
});

describe('AgentHealthIndicator.formatDisplayText', () => {
    it('should format healthy level with shield icon and FS prefix', () => {
        const s = { ...makeSnapshot(), level: 'healthy' as HealthLevel };
        assert.equal(formatDisplayText(s), '$(shield) FS: Healthy');
    });

    it('should format elevated level with queue depth', () => {
        const s = { ...makeSnapshot({ queueDepth: 5 }), level: 'elevated' as HealthLevel };
        assert.equal(formatDisplayText(s), '$(shield) FS: Elevated');
    });

    it('should format warning level with risk count', () => {
        const s = { ...makeSnapshot({ openHigh: 2 }), level: 'warning' as HealthLevel };
        assert.equal(formatDisplayText(s), '$(warning) FS: 2 Risks');
    });

    it('should format critical level with error icon and FS prefix', () => {
        const s = { ...makeSnapshot({ openCritical: 1 }), level: 'critical' as HealthLevel };
        assert.equal(formatDisplayText(s), '$(error) FS: Critical');
    });
});

describe('AgentHealthIndicator.formatTooltip', () => {
    it('should include all metrics in the tooltip', () => {
        const snapshot: HealthSnapshot = {
            level: 'warning',
            openCritical: 0,
            openHigh: 2,
            avgTrust: 0.72,
            quarantinedCount: 0,
            queueDepth: 1,
        };
        const tooltip = formatTooltip(snapshot);

        assert.ok(tooltip.includes('FailSafe Health: WARNING'));
        assert.ok(tooltip.includes('Open Critical: 0'));
        assert.ok(tooltip.includes('Open High: 2'));
        assert.ok(tooltip.includes('Avg Trust: 0.72'));
        assert.ok(tooltip.includes('Quarantined Agents: 0'));
        assert.ok(tooltip.includes('Queue Depth: 1'));
    });

    it('should format avgTrust to two decimal places', () => {
        const snapshot: HealthSnapshot = {
            level: 'healthy',
            openCritical: 0,
            openHigh: 0,
            avgTrust: 0.9,
            quarantinedCount: 0,
            queueDepth: 0,
        };
        const tooltip = formatTooltip(snapshot);
        assert.ok(tooltip.includes('Avg Trust: 0.90'));
    });

    it('should show CRITICAL in uppercase for critical snapshots', () => {
        const snapshot: HealthSnapshot = {
            level: 'critical',
            openCritical: 3,
            openHigh: 0,
            avgTrust: 0.5,
            quarantinedCount: 1,
            queueDepth: 0,
        };
        const tooltip = formatTooltip(snapshot);
        assert.ok(tooltip.startsWith('FailSafe Health: CRITICAL'));
    });
});
