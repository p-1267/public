# RUNBOOK STEP 0 → STEP 7

## GLOBAL HEADER (REQUIRED AT TOP OF EVERY STEP)

Before doing ANY work:
1. Read **docs/execution/PRODUCT_CONSTITUTION.md** (HIGHEST AUTHORITY)
2. Read **docs/execution/NON_NEGOTIABLE_EXECUTION_DIRECTIVE.md**
3. Read **docs/execution/RUNBOOK_STEP0_STEP7.md** (this file)
4. Read latest truth reports (if present):
   - docs/execution/SCHEMA_TRUTH.md
   - docs/execution/FEATURE_SURFACE_TRUTH.md
   - docs/execution/SEED_SCOPE_TRUTH.md

If dependency/feature not in truth reports, STOP and update reports first.

Output only: FILES CHANGED, SQL/RPC names, verifier commands, PASS/FAIL tables.

"DONE" is FORBIDDEN unless all required gates for the step are PASS.

---

## STEP 0 — REPO TRUTH + ENV TRUTH + HARD GUARDS

**Goal:** Establish baseline repo state and runtime detection capability.

### Tasks

A) **Repo baseline files** (create if missing):
   - .ai/EXECUTION_DIRECTIVES.md
   - docs/execution/PRODUCT_CONSTITUTION.md
   - docs/execution/NON_NEGOTIABLE_EXECUTION_DIRECTIVE.md
   - docs/execution/RUNBOOK_STEP0_STEP7.md

B) **Environment truth:**
   - Identify Supabase URL + project ref from .env
   - Confirm exactly ONE Supabase project (no alternate .env.* files)

C) **G0 detection capability:**
   - Ensure scripts/verify_no_inmemory_showcase.sh exists
   - Ensure package.json has:
     - `verify:g0` script: `bash scripts/verify_no_inmemory_showcase.sh`
     - `verify:all` script: `npm run verify:g0 && npm run build`
   - Run `npm run verify:g0` and REPORT violations (do NOT fix them here)

D) **Build verification:**
   - Run `npm run build` and report PASS/FAIL

E) **Cleanup artifacts** (if present):
   - Delete generated batch/migration artifacts:
     - exec_batch_*.sql*
     - micro_batch_*.sql*
     - MASTER_APPLY.sql
     - APPLY_ALL_MIGRATIONS.sh
     - apply_batch_*
     - apply_all_remaining_migrations.sql
     - execution_order*.txt
     - *.sql.clean*
     - EXECUTION_*.md / FINAL_*REPORT*.md / *_STATUS_REPORT.md
   - DO NOT delete: supabase/migrations/, src/, docs/execution/, .ai/, .env

### Acceptance (Step 0)

| Gate | Status | Notes |
|------|--------|-------|
| Directive files exist | PASS | All 4 files present |
| Supabase connection identified | PASS | Single project confirmed |
| verify:g0 script exists | PASS | Runnable |
| Build | PASS | npm run build succeeds |
| G0 violations detected | REPORT ONLY | List violations (fix in Step 3) |

### STOP CONDITIONS (Step 0 ONLY)

Step 0 stops if:
- Multiple Supabase configs detected
- verify_no_inmemory_showcase.sh missing or broken
- Schema guessing attempted
- Build fails with compilation errors

**NOTE:** G0 violations are REPORTED, not blocking. They are addressed in Step 3.

### Output Format

**FILES CHANGED:**
- (list files)

**ENVIRONMENT:**
- Supabase Project: [project-ref]
- URL: [url]

**PASS/FAIL:**
| Check | Status | Details |
|-------|--------|---------|
| Directive files | PASS/FAIL | ... |
| Supabase connection | PASS/FAIL | ... |
| G0 script | PASS/FAIL | ... |
| Build | PASS/FAIL | ... |

**G0 VIOLATIONS DETECTED (to be fixed in Step 3):**
1. (list violations if any)

---

## STEP 1 — TRUTH MAPS

**Goal:** Generate authoritative truth maps from LIVE database.

### Tasks

A) **Generate docs/execution/SCHEMA_TRUTH.md:**
   - Query LIVE DB for:
     - public tables + columns + constraints + indexes
     - enums
     - RPC/functions (name + args + returns)
     - triggers
     - cron jobs (pg_cron)
     - RLS policies

B) **Generate docs/execution/FEATURE_SURFACE_TRUTH.md:**
   - For each role (Senior/Family/Caregiver/Supervisor/Agency/Manager/Departments):
     - List pages/components
     - List data dependencies: tables read/write, RPCs, edge functions
     - Mark READ/WRITE/BOTH
     - Status: WIRED / PARTIAL / UNWIRED

C) **Generate docs/execution/SEED_SCOPE_TRUTH.md:**
   - Derive seed coverage checklist: each page must have ≥1 non-empty data source post-seed
   - Derive prerequisites for every write action

### Acceptance (Step 1)

| Gate | Status |
|------|--------|
| All pages mapped | PASS |
| 0 unknown dependencies | PASS |
| Seed scope created | PASS |

### Output Format

**FILES CHANGED:**
- docs/execution/SCHEMA_TRUTH.md
- docs/execution/FEATURE_SURFACE_TRUTH.md
- docs/execution/SEED_SCOPE_TRUTH.md

**PASS/FAIL:**
| Check | Status | Details |
|-------|--------|---------|
| Mapping completeness | PASS/FAIL | ... |

---

## STEP 2 — CARECONTEXT FOUNDATION

**Goal:** Establish care_contexts table as single source of behavioral configuration.

### Tasks

A) **Confirm/create care_contexts table:**
   - Check SCHEMA_TRUTH.md for existence
   - Required columns:
     - id (uuid PK)
     - resident_id (uuid FK)
     - management_mode (SELF | FAMILY_MANAGED | AGENCY_MANAGED)
     - care_setting (IN_HOME | FACILITY)
     - service_model (NONE | DIRECT_HIRE | AGENCY_HOME_CARE | AGENCY_FACILITY)
     - agency_id (uuid nullable)
     - family_admin_user_id (uuid nullable)
     - supervision_enabled (boolean)
     - is_active (boolean)
     - created_at/updated_at

B) **Add/confirm RPCs:**
   - `get_active_care_context(resident_id)`
   - `set_active_care_context(resident_id, care_context_id)`
   - `create_default_care_context(resident_id)`

C) **Frontend:**
   - Add CareContextProvider (loads active context, derives feature flags)
   - Add ResidentContextCard component
   - Show context card on all role homes (Senior/Family/Caregiver/Supervisor/AgencyAdmin)
   - NO scenario branching introduced

### Acceptance (Step 2)

| Gate | Status |
|------|--------|
| RPC returns 1 active row | PASS |
| All role homes load | PASS |
| Context card visible | PASS |
| No scenario branches | PASS |

### Output Format

**FILES CHANGED:**
- (list files)

**SQL/RPC ADDED:**
- get_active_care_context
- set_active_care_context
- create_default_care_context

**UI ROUTES VERIFIED:**
| Route | Status |
|-------|--------|
| SeniorHome | PASS/FAIL |
| FamilyHome | PASS/FAIL |
| CaregiverHome | PASS/FAIL |
| SupervisorHome | PASS/FAIL |
| AgencyAdminHome | PASS/FAIL |

---

## STEP 3 — DB-ONLY RUNTIME ENFORCEMENT

**Goal:** Remove all runtime imports of in-memory/mock/scenario code.

### PRECONDITION

**Step 3 cannot be marked PASS unless `verify:g0` is PASS (0 violations).**

### Tasks

A) **Identify runtime violations:**
   - Use FEATURE_SURFACE_TRUTH.md to identify runtime routes/pages
   - Run `npm run verify:g0` to detect violations

B) **Remove runtime violations:**
   - Remove imports/references to:
     - mockAIEngine
     - scenarioGenerator
     - showcaseSeeder
     - operationalDataGenerator
     - simulationEngine
     - scenarioRunner
   - These MAY remain in: tests/, scripts/, seed tooling
   - They MUST NOT be in runtime UI paths

C) **Verify enforcement:**
   - Run `npm run verify:g0` → must be PASS (0 violations)
   - Run `npm run build` → must succeed
   - Ensure scripts/verify_no_inmemory_showcase.sh fails on forbidden imports

### Acceptance (Step 3)

| Gate | Status | Required |
|------|--------|----------|
| verify:g0 | PASS | 0 violations |
| Build | PASS | Clean build |
| Runtime uses Supabase only | PASS | No mocks in UI |

### Output Format

**FILES CHANGED:**
- (list files with violations removed)

**PASS/FAIL:**
| Check | Status | Details |
|-------|--------|---------|
| verify:g0 | PASS/FAIL | Violations count |
| Build | PASS/FAIL | ... |

---

## STEP 4 — UNIVERSAL FEATURE-AWARE DB SEED ENGINE

**Goal:** Seed ALL features discovered in SEED_SCOPE_TRUTH.md.

### Tasks

A) **Create/confirm canonical RPC:**
   - `seed_active_context(care_context_id uuid)`
   - Requirements:
     - Coverage-driven: seeds every required READ table + all WRITE prerequisites from SEED_SCOPE_TRUTH.md
     - Context-driven: behavior varies ONLY by care_context fields
     - Idempotent: safe to re-run without duplicates
     - Attaches rows to resident_id + care_context_id + tenant/agency

B) **Create/confirm verifier RPC:**
   - `verify_seed_coverage(care_context_id uuid)`
   - Outputs: page_name | required_sources | missing_sources | PASS/FAIL
   - FAIL if any page marked "must be non-empty" has 0 rows

C) **Intelligence integrity:**
   - Seed must create real inputs (timeline/observations/etc) for brain pipeline
   - DO NOT remove brain layers

### Acceptance (Step 4)

| Gate | Status |
|------|--------|
| seed_active_context executes | PASS |
| verify_seed_coverage 0 FAIL rows | PASS |
| ≥1 intelligence artifact exists | PASS |

### Output Format

**FILES CHANGED:**
- (list migration files)

**SQL/RPC ADDED:**
- seed_active_context
- verify_seed_coverage

**VERIFIER COMMANDS:**
```sql
SELECT seed_active_context('uuid');
SELECT * FROM verify_seed_coverage('uuid');
```

**PASS/FAIL:**
| Check | Status | Details |
|-------|--------|---------|
| Seed executes | PASS/FAIL | ... |
| Coverage | PASS/FAIL | ... |

---

## STEP 5 — BIDIRECTIONAL OPERATIONAL LOOP

**Goal:** Wire Family → Supervisor → Caregiver → Timeline with DB audit trail.

### Tasks

A) **Ensure audited family write pathways (RPCs):**
   - `submit_family_observation(...)`
   - `submit_family_action_request(...)`
   - Must:
     - Write audited row
     - Write unified timeline event (actor_type=FAMILY)
     - Create supervisor exception when supervision_enabled=true OR service_model implies oversight

B) **Ensure supervisor triage creates caregiver work:**
   - `supervisor_triage_exception(...)`
   - Must:
     - Update exception state
     - Create/assign task to caregiver
     - Timeline event (actor_type=SUPERVISOR)

C) **Ensure caregiver sees resulting work:**
   - Task appears in caregiver task list

### Acceptance (Step 5)

| Gate | Status |
|------|--------|
| DB proof: Family write → Supervisor queue → Task → Timeline | PASS |
| UI proof: Family submits → Supervisor triages → Caregiver sees task | PASS |

### Output Format

**FILES CHANGED:**
- (list files)

**SQL/RPC ADDED:**
- submit_family_observation
- submit_family_action_request
- supervisor_triage_exception

**UI ROUTES VERIFIED:**
| Route | Status |
|-------|--------|
| FamilyHome | PASS/FAIL |
| SupervisorHome | PASS/FAIL |
| CaregiverHome | PASS/FAIL |

**ACTIONS VERIFIED:**
| Action | Status |
|--------|--------|
| Family submit | PASS/FAIL |
| Supervisor triage | PASS/FAIL |
| Caregiver see task | PASS/FAIL |

---

## STEP 6 — INTELLIGENCE SURFACING PER ROLE

**Goal:** Add cognitive panels (NOW/NEXT/RISK/WHY) to all role homes.

### Tasks

A) **Add/confirm RPC:**
   - `get_cognitive_panel(role, resident_id, care_context_id)`
   - Must be deterministic and DB-backed (no mock AI)
   - Aggregates: signals/projections/compound events/tasks/timeline/notifications
   - Returns NOW/NEXT/RISK/WHY items with source_table/source_id references

B) **UI:**
   - Render CognitivePanel on each role home
   - No empty state unless explains why + provides DB seed CTA

### Acceptance (Step 6)

| Gate | Status |
|------|--------|
| All role homes show ≥1 intelligence artifact | PASS |
| Items include WHY with DB linkage | PASS |

### Output Format

**FILES CHANGED:**
- (list files)

**SQL/RPC ADDED:**
- get_cognitive_panel

**UI ROUTES VERIFIED:**
| Route | Artifacts | Status |
|-------|-----------|--------|
| SeniorHome | Count | PASS/FAIL |
| FamilyHome | Count | PASS/FAIL |
| CaregiverHome | Count | PASS/FAIL |
| SupervisorHome | Count | PASS/FAIL |
| AgencyAdminHome | Count | PASS/FAIL |

---

## STEP 7 — APP-WIDE RUNTIME VERIFICATION

**Goal:** Page-by-page + button-by-button verification across all care contexts.

### Tasks

A) **Implement/confirm verifier RPCs:**
   - `verify_step1_activation()`
   - `verify_seed_coverage(care_context_id)`
   - `verify_operational_loop(care_context_id)`
   - `verify_cognitive_ui(care_context_id)`
   - `verify_app_wide_wiring()`

B) **verify_app_wide_wiring() must output:**
   1. UI ROUTES VERIFIED: role | route | PASS/FAIL | key data counts | RPC/table sources
   2. ACTIONS VERIFIED: action | DB write verified | downstream trigger evidence | UI update proof

C) **Test across CareContext configurations:**
   - SELF (management_mode=SELF, service_model=NONE)
   - FAMILY_MANAGED (management_mode=FAMILY_MANAGED, service_model=NONE)
   - DIRECT_HIRE (management_mode=FAMILY_MANAGED, service_model=DIRECT_HIRE)
   - AGENCY_HOME_CARE (management_mode=AGENCY_MANAGED, service_model=AGENCY_HOME_CARE)
   - AGENCY_FACILITY (management_mode=AGENCY_MANAGED, service_model=AGENCY_FACILITY)

### Acceptance (Step 7)

| Gate | Status |
|------|--------|
| 100% PASS routes | PASS |
| 100% PASS critical actions | PASS |
| Zero empty pages | PASS |
| Zero infinite loaders | PASS |

### Output Format

**VERIFIER SQL COMMANDS:**
```sql
SELECT * FROM verify_app_wide_wiring();
```

**PASS/FAIL MATRICES:**

UI ROUTES VERIFIED:
| Role | Route | Status | Data Counts | Sources |
|------|-------|--------|-------------|---------|
| ... | ... | PASS/FAIL | ... | ... |

ACTIONS VERIFIED:
| Action | DB Write | Downstream Evidence | UI Update | Status |
|--------|----------|---------------------|-----------|--------|
| ... | ... | ... | ... | PASS/FAIL |

**FINAL STATUS:**
- PASS (if all gates pass)
- INCOMPLETE (with exact blockers listed)
