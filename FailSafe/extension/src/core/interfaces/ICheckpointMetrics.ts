export interface ICheckpointMetrics {
    getLedgerEntryCount(): number;
    getSentinelEventsProcessed(): number;
}
