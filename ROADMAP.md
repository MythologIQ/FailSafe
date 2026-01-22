# QoreLogic Roadmap

This roadmap tracks the sprinted remediation plan and future enhancements.

## Remediation Phases (From GapAudit)

- **M0: Spec/Manifest Alignment** - Ensure alignment between spec and implementation.
- **M1: Storage + Ledger Backbone** - Establish persistence layers.
- **M2: Sentinel Enforcement Engine** - Implement active monitoring.
- **M3: QoreLogic Governance Layer** - Build persona and policy logic.
- **M4: Genesis UI Completion** - Finalize visualization and interaction.
- **M5: Platform Extensions** - Expand to MCP/CLI.

## Future Enhancements

### M6: Community Feedback Loop

- **Automated Issue Reporting**: Convert `.failsafe/feedback/{GUID}.json` reports into GitHub Issues.
- **User Consent Flow**: Interactive prompt asking user to "Send Feedback" after a session.
- **Sanitization**: Ensure PII/Secrets are stripped from feedback JSON before upload.
