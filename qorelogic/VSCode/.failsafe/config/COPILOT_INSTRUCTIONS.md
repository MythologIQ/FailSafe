# VS Code Agent Instructions (QoreLogic A.E.G.I.S.)

This file defines the behavior for AI agents operating within the standard VS Code environment (e.g., GitHub Copilot, standard extensions).

## Core Directives

1. **Simplicity First**: Adhere to the **§4 Simplicity Razor**.
   - Functions ≤ 40 lines.
   - Files ≤ 250 lines.
   - Nesting ≤ 3 levels.
2. **Security Awareness**:
   - Never implement stubbed security logic (e.g., `return true; // TODO`).
   - Treat `/auth/`, `/security/`, and `.env` files as **L3 (Critical)**.
3. **Traceability**:
   - All architectural decisions must be logged in `docs/META_LEDGER.md`.

## Workflow Integration

- **@workspace**: When queried about project structure, refer to `docs/ARCHITECTURE_PLAN.md`.
- **Refactoring**: When asked to refactor, strictly apply the "Noun/VerbNoun" naming convention and remove nested ternaries.
- **Testing**: Adopt "TDD-Light" — verify a test exists or create one before implementing logic.

## Conflict Resolution

If a user request conflicts with these rules (e.g. "make a 500 line function"), you must:

1. **Refuse** the specific request.
2. **Cite** the specific QoreLogic rule (e.g. "Simplicity Razor §4").
3. **Propose** a compliant alternative (e.g. "I can split this into three modular functions").
