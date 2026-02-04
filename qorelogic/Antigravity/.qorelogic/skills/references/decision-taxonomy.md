# Decision Taxonomy and Risk Grades

## Decision Types

| Decision Type    | Description                         | Risk Grade | Examples                           |
| ---------------- | ----------------------------------- | ---------- | ---------------------------------- |
| ARCHITECTURE     | System design, component structure  | L2/L3      | "Use SQLite not PostgreSQL"        |
| SECURITY         | Cryptography, auth, key management  | L3         | "Migrate to platform keystore"     |
| SCOPE_CHANGE     | Add/remove features                 | L2/L3      | "Defer PyVeritas to Phase 3"       |
| TECH_STACK       | Languages, frameworks, dependencies | L2         | "Add pytest-cov for coverage"      |
| TIMELINE         | Schedule adjustments                | L1/L2      | "Extend Week 2 by 3 days"          |
| QUALITY_GATE     | Standards, thresholds, criteria     | L2         | "Require 80% test coverage"        |
| PROCESS          | Development workflow changes        | L1/L2      | "Weekly drift audits every Friday" |
| VENDOR           | Third-party service selection       | L2/L3      | "Use GitHub Actions for CI/CD"     |
| DEPLOYMENT       | Infrastructure, hosting decisions   | L3         | "Deploy to AWS Lambda"             |
| BUDGET           | Resource allocation, costs          | L2         | "Allocate 2 engineers full-time"   |

## Risk Grade Validation

**L3 CRITICAL (Requires User Approval):**

- Security/cryptographic changes
- Data schema modifications
- Authentication/authorization
- Production deployment architecture
- Budget > $10K
- Timeline slips > 2 weeks

**L2 FUNCTIONAL (Requires Lead Reviewer Approval):**

- Architecture changes
- Tech stack additions
- Scope changes
- Quality gate definitions
- Timeline slips 1-2 weeks
- Budget $1K-$10K

**L1 ROUTINE (Lead Reviewer Decision):**

- Process improvements
- Documentation updates
- Minor timeline adjustments (< 1 week)
- Budget < $1K
