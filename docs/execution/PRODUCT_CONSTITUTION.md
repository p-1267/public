# PRODUCT CONSTITUTION — AGEEMPOWER

## NON-NEGOTIABLE PRODUCT EXECUTION DIRECTIVE

### PRODUCT DEFINITION

AgeEmpower is a **multi-role senior care intelligence platform** that delivers:
- **SELF mode** (Senior manages own care)
- **FAMILY_MANAGED mode** (Family oversees care)
- **DIRECT_HIRE mode** (Family employs caregiver directly)
- **AGENCY_HOME_CARE mode** (Agency provides in-home care)
- **AGENCY_FACILITY mode** (Agency provides facility care)

All modes are **configurations** stored in `care_contexts` table, NOT separate codebases or scenario branches.

### ARCHITECTURAL NON-NEGOTIABLES

1. **DB-ONLY RUNTIME**
   - Runtime UI uses Supabase tables/RPCs/Edge Functions ONLY
   - NO in-memory mocks, generators, or scenario code in runtime paths
   - Mocks/generators allowed ONLY in: tests/, scripts/, seed tooling
   - Violation detection enforced via `verify:g0` (scripts/verify_no_inmemory_showcase.sh)

2. **SINGLE SOURCE OF TRUTH**
   - LIVE database schema is authoritative
   - Truth maps (SCHEMA_TRUTH.md, FEATURE_SURFACE_TRUTH.md, SEED_SCOPE_TRUTH.md) reflect actual DB state
   - NO guessing: if dependency not in truth reports, STOP and update reports first

3. **CARE CONTEXT = DATA**
   - All behavioral variation driven by `care_contexts` table fields:
     - management_mode: SELF | FAMILY_MANAGED | AGENCY_MANAGED
     - care_setting: IN_HOME | FACILITY
     - service_model: NONE | DIRECT_HIRE | AGENCY_HOME_CARE | AGENCY_FACILITY
     - supervision_enabled: boolean
   - NO scenario branches in code
   - ONE runtime codebase serves all modes

4. **INTELLIGENCE INTEGRITY**
   - Brain pipeline remains fully intact (observation → aggregation → correlation → trajectory → cognitive output)
   - All intelligence artifacts stored in DB with correlation IDs
   - Cognitive panels (NOW/NEXT/RISK/WHY) surface DB-backed artifacts
   - NO mock AI in runtime

5. **UNIVERSAL SEED ENGINE**
   - Single seed RPC: `seed_active_context(care_context_id)`
   - Coverage-driven: seeds ALL features in SEED_SCOPE_TRUTH.md
   - Context-driven: behavior varies by care_context fields ONLY
   - Idempotent: safe to re-run without duplicates
   - Verifiable: `verify_seed_coverage(care_context_id)` returns PASS/FAIL per page

6. **BIDIRECTIONAL OPERATIONAL LOOP**
   - Family → Supervisor → Caregiver → Timeline (all DB-backed)
   - All write pathways audited with correlation IDs
   - Timeline events trace actor_type across roles
   - Supervisor exceptions create caregiver tasks

7. **ZERO EMPTY PAGES**
   - Every role home must show non-empty data post-seed
   - Empty states must explain why + provide actionable next step
   - NO infinite loaders on seeded contexts

### STOP CONDITIONS

Work STOPS immediately if:
1. **Schema Guessing**: Attempting to use tables/columns/enums not present in SCHEMA_TRUTH.md
2. **Runtime Mock**: Adding in-memory data or scenario generators to runtime UI paths
3. **Scenario Branching**: Adding code branches for modes instead of reading care_contexts
4. **Feature Removal**: Deleting brain layers, intelligence pipelines, or core capabilities
5. **Multiple Supabase Configs**: More than one .env or Supabase project reference
6. **Truth Drift**: Making changes without updating truth maps first

### VERIFICATION HIERARCHY

Every step must output:
1. **FILES CHANGED** (exact paths)
2. **SQL/RPC ADDED** (function names)
3. **VERIFIER COMMANDS** (SQL commands to verify)
4. **PASS/FAIL TABLE** (acceptance gates with status)

"DONE" is **FORBIDDEN** unless acceptance gates for the step are PASS.

### ACCEPTANCE GATES (GLOBAL)

| Gate | Command | Required State |
|------|---------|----------------|
| G0 Runtime Purity | `npm run verify:g0` | PASS (0 violations) |
| Build | `npm run build` | Success |
| Schema Truth | Compare SCHEMA_TRUTH.md vs LIVE DB | Match |
| Feature Surface Truth | All pages mapped | 100% coverage |
| Seed Coverage | `SELECT * FROM verify_seed_coverage('uuid')` | 0 FAIL rows |
| UI Routes | All role homes load | No infinite loaders |
| Operational Loop | Family write → Supervisor → Caregiver → Timeline | Correlation IDs present |
| Cognitive UI | All role homes show intelligence | At least 1 artifact per role |

### FINAL PRODUCT DEFINITION

The final product is:
- ONE runtime application
- FIVE operational modes (SELF, FAMILY_MANAGED, DIRECT_HIRE, AGENCY_HOME_CARE, AGENCY_FACILITY)
- ALL modes served by reading `care_contexts` table
- ALL features available per mode's configuration
- ALL data persisted in Supabase
- ALL intelligence generated from DB pipeline
- ZERO runtime mocks or scenario code
- 100% verifiable via SQL queries

### CONFLICT RESOLUTION

If any instruction, runbook, or directive conflicts with this PRODUCT_CONSTITUTION:
**PRODUCT_CONSTITUTION WINS.**
