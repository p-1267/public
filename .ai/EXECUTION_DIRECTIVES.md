# EXECUTION DIRECTIVES

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
- G0: No in-memory/mock imports in runtime UI (enforced via scripts/verify_no_inmemory_showcase.sh)
- Build must pass
- All role homes must load without infinite loaders

## Intelligence Integrity
- Brain pipeline remains intact
- Seed creates real inputs for intelligence generation
- Cognitive panels surface DB-backed artifacts with WHY explanations
