# Codex Atlas — AI Crew V0.1 isolated handoff

Status: **post-public-launch implementation gate; do not deploy or merge**.

GitHub issue: https://github.com/Dood-Labs-One-Home/One-Home/issues/3

## First action
Verify public One Home URL and deployed commit SHA with owner evidence. Until confirmed, discovery and mock-only work are allowed on this branch; no production integration.

## Existing repository context
- `docs/architecture.md`: Dood ID / One Home / Ember / rooms architecture.
- `docs/midnight.md`: Midnight Build Club privacy direction, **not** a verified Midnight City API contract.
- `apps/one-home`: existing front end.
- `netlify/functions`: inspect before assuming API infrastructure.
- `Dood-Labs-One-Home/one-home-private-passport`: identity boundary; do not change without review.
- `Rare-Ink-Studio/WANDER`: independent-world reference; do not modify.

## Build V0.1 ONLY
1. Inspect deployed-vs-repository architecture, auth/session, tenancy, Home Ops and deploy tooling. Document findings.
2. Implement AI Crew owner-only control room behind a default-OFF feature flag, using existing project conventions.
3. Persistent server-verified auth, tenant-scoped permissions, immutable audit events, approval workflow, idempotency and durable kill switch.
4. Mock-only agent adapter and clearly labeled simulation; no real outbound agent commands.
5. Tests: unauthorized access, cross-tenant leakage, prompt injection, duplicate dispatch/concurrency, revoked sessions, restart and fail-closed emergency stop.
6. Produce a draft PR, migration/rollback plan, reproducible test output and precise remaining blockers.

## Explicitly out of scope
No Midnight City live actions, external auto-registration, unverified SSO promises, real commerce, wallet spending, outreach, or production deploy.

## Later gates
V0.2 Passport consent-based linking and one merchant pilot; V0.3 Midnight City ambassador with verified API, outreach consent and audit; independent virtual world design separate.

## Acceptance
Do not report completion based on mock unit tests alone. Require integrated security tests and owner approval for merge/deploy. Escalate only for real credentials, approval or non-reversible choices.
