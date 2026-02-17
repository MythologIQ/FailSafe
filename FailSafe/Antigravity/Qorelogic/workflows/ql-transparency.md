# QoreLogic Transparency Workflow

Log transparency events to `.failsafe/logs/transparency.jsonl` for audit trail.

## Purpose

Provides a persistent, queryable log of all AI prompt lifecycle events for governance auditing and debugging.

## Event Types

| Event                     | Description                  |
| ------------------------- | ---------------------------- |
| `prompt.build_started`    | Prompt construction began    |
| `prompt.build_completed`  | Prompt ready for dispatch    |
| `prompt.dispatched`       | Prompt sent to AI model      |
| `prompt.dispatch_blocked` | Prompt blocked by governance |

## Log Format

Each event is logged as a single JSON line:

```json
{
  "id": "prompt-1708123456789-abc123",
  "type": "prompt.build_completed",
  "timestamp": "2026-02-16T22:45:00.000Z",
  "sessionId": "session-123",
  "intentId": "intent-456",
  "promptHash": "a1b2c3d4",
  "tokenCount": 1500,
  "targetModel": "claude-3-opus",
  "duration": 45
}
```

## Usage

### Log an Event

```
Use the `log-transparency-event` skill to append events to the transparency log.
```

### Query Recent Events

```
Read the last N lines from .failsafe/logs/transparency.jsonl
Parse each line as JSON
Filter by event type, timestamp range, or session ID
```

### Generate Audit Report

```
1. Read all events from transparency.jsonl
2. Group by type and count occurrences
3. Identify blocked events and their reasons
4. Calculate average prompt build duration
5. Report on token usage trends
```

## Integration Points

- **VS Code Extension**: `TransparencyPanel` displays real-time event stream
- **MCP Server**: Emits events via `PromptTransparency` class
- **Governance Router**: Logs blocked dispatches with reasons

## Retention

Events are retained indefinitely. Consider implementing rotation for high-volume workspaces:

```
.failsafe/logs/transparency.jsonl (current)
.failsafe/logs/transparency.2026-02.jsonl (archived by month)
```

## Security Considerations

- Prompt previews are truncated to 200 characters
- Full prompt content is NOT logged (privacy)
- Prompt hashes enable correlation without exposing content
