# NON-NEGOTIABLE EXECUTION DIRECTIVE

## Global Rules
1. **Single Source of Truth**: LIVE DB schema is authoritative. Truth maps must reflect actual DB state.
2. **No Guessing**: If a dependency/feature is not in truth reports, STOP and update reports first.
3. **DB-Only Runtime**: Runtime UI uses Supabase only. Mocks/generators allowed ONLY in tests/scripts/seed tooling.
4. **Idempotent Seeds**: All seed functions safe to re-run without duplicates.
5. **Correlation IDs**: All write pathways maintain audit trail with correlation IDs for tracing.
6. **Zero Empty Pages**: Seeded contexts must have non-empty data for all role homes and critical pages.

## Acceptance Gates (Global)
- **G0 (Runtime Purity)**: verify:g0 PASS (no forbidden runtime imports)
- **Build**: npm run build succeeds
- **Schema Truth**: SCHEMA_TRUTH.md matches LIVE DB
- **Feature Surface Truth**: All pages mapped with data dependencies
- **Seed Coverage**: verify_seed_coverage returns 0 FAIL rows
- **UI Routes**: All role homes load without errors or infinite loaders
- **Actions**: Critical write actions trace through DB with correlation IDs

## Verification Commands
```bash
npm run verify:g0        # Runtime purity check
npm run verify:all       # All verification checks
npm run build            # Build check
```

## SQL Verification Pattern
```sql
SELECT verify_step1_activation();
SELECT * FROM verify_seed_coverage('context-id');
SELECT * FROM verify_operational_loop('context-id');
SELECT * FROM verify_cognitive_ui('context-id');
SELECT * FROM verify_app_wide_wiring();
```

## Output Format Requirements
**FILES CHANGED:**
- path/to/file1.tsx
- path/to/file2.sql

**SQL/RPC ADDED:**
- seed_active_context
- verify_seed_coverage
- get_cognitive_panel

**VERIFIER COMMANDS:**
```sql
SELECT * FROM verify_seed_coverage('uuid');
```

**PASS/FAIL TABLE:**
| Check | Status | Details |
|-------|--------|---------|
| G0 Runtime | PASS | No forbidden imports |
| Build | PASS | Clean build |
| Seed Coverage | FAIL | Missing data for FamilyHome |
