# EXECUTION DIRECTIVES

## MANDATORY READING ORDER

Before performing ANY work, read these documents in order:

1. **docs/execution/PRODUCT_CONSTITUTION.md** (HIGHEST AUTHORITY)
2. **docs/execution/NON_NEGOTIABLE_EXECUTION_DIRECTIVE.md**
3. **docs/execution/RUNBOOK_STEP0_STEP7.md**
4. **docs/execution/SCHEMA_TRUTH.md** (if present; otherwise Step 1 generates)
5. **docs/execution/FEATURE_SURFACE_TRUTH.md** (if present; otherwise Step 1 generates)
6. **docs/execution/SEED_SCOPE_TRUTH.md** (if present; otherwise Step 1 generates)

**CONFLICT RESOLUTION RULE:**
If any instruction conflicts, **PRODUCT_CONSTITUTION wins.**

## Core Principles

1. **DB-ONLY RUNTIME**: All runtime UI must use Supabase tables/RPCs only. NO in-memory mocks, NO scenario generators in runtime code.
2. **Truth-Driven**: All work derived from SCHEMA_TRUTH.md, FEATURE_SURFACE_TRUTH.md, SEED_SCOPE_TRUTH.md
3. **CareContext = Data**: Scenarios are configurations in care_contexts table, not code branches
4. **Coverage-Driven Seeding**: Seed engine covers ALL features discovered in SEED_SCOPE_TRUTH.md
5. **Verifiable at Every Step**: Each step has acceptance gates with PASS/FAIL output

## Output Rules

- NO questions
- NO narration/progress updates
- Output ONLY: FILES CHANGED, SQL/RPC names, verifier commands, PASS/FAIL tables
- "DONE" forbidden unless acceptance gates PASS

## Runtime Guards

- **G0**: No in-memory/mock imports in runtime UI (enforced via scripts/verify_no_inmemory_showcase.sh)
- **Build**: npm run build must pass
- **UI Routes**: All role homes must load without infinite loaders

## Intelligence Integrity

- Brain pipeline remains intact
- Seed creates real inputs for intelligence generation
- Cognitive panels surface DB-backed artifacts with WHY explanations

## Verification Commands

```bash
npm run verify:g0        # Runtime purity check
npm run verify:all       # G0 + build
npm run build            # Build check
```

## Step Execution Pattern

Each step outputs:
1. FILES CHANGED (exact paths)
2. SQL/RPC ADDED (function names)
3. VERIFIER COMMANDS (SQL to verify)
4. PASS/FAIL TABLE (gates with status)
