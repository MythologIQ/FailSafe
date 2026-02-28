import type Database from 'better-sqlite3';

interface LedgerQueryFilters {
  agent?: string;
  riskGrade?: string;
  eventType?: string;
  dateFrom?: string;
  dateTo?: string;
  artifactPath?: string;
}

interface LedgerRow {
  id: number;
  timestamp: string;
  event_type: string;
  agent_did: string;
  risk_grade: string | null;
  artifact_path: string | null;
  payload: string | null;
}

export class LedgerQueryAPI {
  constructor(private readonly db: Database.Database) {}

  query(filters: LedgerQueryFilters): LedgerRow[] {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (filters.agent) {
      clauses.push('agent_did = ?');
      params.push(filters.agent);
    }
    if (filters.riskGrade) {
      clauses.push('risk_grade = ?');
      params.push(filters.riskGrade);
    }
    if (filters.eventType) {
      clauses.push('event_type = ?');
      params.push(filters.eventType);
    }
    if (filters.dateFrom) {
      clauses.push('timestamp >= ?');
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      clauses.push('timestamp <= ?');
      params.push(filters.dateTo);
    }
    if (filters.artifactPath) {
      clauses.push('artifact_path = ?');
      params.push(filters.artifactPath);
    }

    const where = clauses.length > 0
      ? `WHERE ${clauses.join(' AND ')}`
      : '';

    return this.db.prepare(
      `SELECT * FROM soa_ledger ${where} ORDER BY timestamp DESC LIMIT 500`
    ).all(...params) as LedgerRow[];
  }
}
