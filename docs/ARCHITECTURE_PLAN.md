# Architecture Plan

## Risk Grade: L3

### Risk Assessment

- [x] Contains security/auth logic -> L3
- [x] Modifies existing APIs -> L2
- [ ] UI-only changes -> L1

**Rationale**: FailSafe contains TrustEngine, EnforcementEngine, PolicyEngine, and CryptoService - all security-critical components requiring mandatory /ql-audit before any changes.

## File Tree (The Contract)

```
extension/src/
|-- extension/
|   `-- main.ts                    # Extension entry point
|-- genesis/
|   |-- GenesisManager.ts          # Core genesis orchestration
|   |-- FeedbackManager.ts         # User feedback handling
|   |-- cortex/
|   |   `-- IntentScout.ts         # Intent detection
|   |-- decorators/
|   |   `-- HallucinationDecorator.ts
|   |-- panels/
|   |   |-- DashboardPanel.ts
|   |   |-- LedgerViewerPanel.ts
|   |   |-- L3ApprovalPanel.ts
|   |   `-- LivingGraphPanel.ts
|   `-- views/
|       |-- CortexStreamProvider.ts
|       |-- DojoViewProvider.ts
|       `-- LivingGraphProvider.ts
|-- governance/
|   |-- EnforcementEngine.ts       # CRITICAL: Policy enforcement
|   |-- GovernanceRouter.ts        # Route governance decisions
|   |-- IntentService.ts           # Intent management
|   |-- IntentStore.ts             # Intent persistence
|   |-- SessionManager.ts          # Session tracking
|   |-- EvaluationRouter.ts        # Evaluation routing
|   `-- types/
|       `-- IntentTypes.ts
|-- sentinel/
|   |-- SentinelDaemon.ts          # Background monitoring
|   |-- VerdictArbiter.ts          # Verdict decisions
|   |-- VerdictRouter.ts           # Verdict routing
|   |-- PatternLoader.ts           # Pattern loading
|   `-- engines/
|       |-- VerdictEngine.ts
|       |-- HeuristicEngine.ts
|       |-- ArchitectureEngine.ts
|       `-- ExistenceEngine.ts
|-- qorelogic/
|   |-- QoreLogicManager.ts        # QoreLogic orchestration
|   |-- FrameworkSync.ts           # Framework synchronization
|   |-- PluginRegistry.ts          # Plugin management
|   |-- SystemRegistry.ts          # System registration
|   |-- policies/
|   |   `-- PolicyEngine.ts        # CRITICAL: Policy evaluation
|   |-- trust/
|   |   `-- TrustEngine.ts         # CRITICAL: Trust computation
|   |-- shadow/
|   |   |-- ShadowGenomeManager.ts
|   |   |-- RetentionPolicy.ts
|   |   `-- SchemaVersionManager.ts
|   `-- ledger/
|       `-- LedgerManager.ts       # Merkle ledger
|-- shared/
|   |-- CryptoService.ts           # CRITICAL: Cryptographic ops
|   |-- ConfigManager.ts           # Configuration
|   |-- EventBus.ts                # Event handling
|   |-- Logger.ts                  # Logging
|   |-- LRUCache.ts                # Caching
|   `-- utils/
|       |-- security.ts            # CRITICAL: Security utils
|       |-- htmlSanitizer.ts
|       `-- capabilities.ts
`-- mcp/
    `-- FailSafeServer.ts          # MCP server interface
```

## Interface Contracts

### EnforcementEngine
- **Input**: Intent object, policy context
- **Output**: Verdict (ALLOW | DENY | ESCALATE)
- **Side Effects**: Logs to audit trail, may trigger L3 approval flow

### TrustEngine
- **Input**: Agent identity, action context, history
- **Output**: Trust score (0.0 - 1.0)
- **Side Effects**: Updates trust cache, emits trust events

### PolicyEngine
- **Input**: Policy rules, evaluation context
- **Output**: Policy evaluation result
- **Side Effects**: None (pure evaluation)

### SentinelDaemon
- **Input**: Monitoring configuration
- **Output**: Anomaly alerts, pattern matches
- **Side Effects**: Background thread, event emissions

## Data Flow

```
[Agent Intent] -> [IntentScout] -> [GovernanceRouter] -> [PolicyEngine]
                                                              |
                                                              v
                                                       [TrustEngine]
                                                              |
                                                              v
                                                    [EnforcementEngine]
                                                              |
                                         +--------------------+--------------------+
                                         |                    |                    |
                                         v                    v                    v
                                      [ALLOW]             [DENY]             [ESCALATE]
                                         |                    |                    |
                                         v                    v                    v
                                    [Execute]            [Block]          [L3ApprovalPanel]
```

## Dependencies

| Package | Justification | Vanilla Alternative |
|---------|---------------|---------------------|
| better-sqlite3 | High-performance SQLite for ledger | No - native SQLite critical for perf |
| vscode | Extension API | No - required for VSCode extension |

## Section 4 Razor Pre-Check

- [x] All planned functions <= 40 lines
- [x] All planned files <= 250 lines
- [x] No planned nesting > 3 levels

---
*Blueprint sealed. Awaiting GATE tribunal.*
