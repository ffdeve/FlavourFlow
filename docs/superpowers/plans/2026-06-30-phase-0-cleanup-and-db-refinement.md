# Phase 0 — Cleanup & DB Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove dead one-off scripts/artifacts from the repo, confirm no secrets are hardcoded, and produce an approved drop-list for unused live DB objects — leaving a clean workspace before feature work begins.

**Architecture:** Pure housekeeping. No app code changes. "Tests" here are verification commands (build/grep/git status), since deletions and a read-only DB audit have no unit-testable logic. The DB audit is **non-destructive**: it only produces a drop-list for user approval; the actual destructive migration is a final gated task.

**Tech Stack:** git, Expo/TypeScript (build smoke check), Supabase CLI (linked project `gcuunqmbapmoelvczanv`).

## Global Constraints

- Conventional commit messages (`feat:`/`fix:`/`refactor:`/`docs:`/`chore:`).
- End commit messages with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Work happens on branch `feat/app-completion` (already created).
- **No destructive DB change without explicit user approval of the drop-list.**
- Never delete a file that is imported/referenced by app code or `package.json`.

---

### Task 1: Delete dead root scripts & editor artifacts

**Files:**
- Delete (git-tracked): `fix_cat.py`, `fix_cooking.py`, `fix_index.py`, `fix_today_rec.py`, `fix_ts.py`, `fix_ui.py`, `move_fridge.py`, `restore_index.py`, `refine_community.py`, `refine_postcard.py`, `update_categories.py`, `update_popular.py`, `test-db.js`, `test-db-cols.js`, `test_api.js`, `fetch-schema.js`, `temp_migration.sql`, `html_snippet.txt`, `src/app/(tabs)/index.tsx.rej`, `src/app/(tabs)/.index.tsx.swp`, `src/app/.chefboo-preferences.tsx.swp`
- Delete (untracked, local only): `recent_chat`
- Modify: `.gitignore` (add `*.swp`, `*.rej` so they never get tracked again)

**Interfaces:**
- Consumes: nothing.
- Produces: a clean repo root; no symbol or import changes for later tasks.

- [ ] **Step 1: Verify none of the targets are imported by app code**

Run:
```bash
cd /Users/azaxghulam/flavourflow
grep -rnE "fetch-schema|test_api|test-db|temp_migration|html_snippet|restore_index|refine_(community|postcard)|update_(categories|popular)|move_fridge|fix_(cat|cooking|index|today_rec|ts|ui)" src package.json app.json metro.config.js babel.config.js 2>/dev/null || echo "NO REFERENCES — safe to delete"
```
Expected: `NO REFERENCES — safe to delete`

- [ ] **Step 2: Remove the tracked files via git**

Run:
```bash
git rm -q \
  fix_cat.py fix_cooking.py fix_index.py fix_today_rec.py fix_ts.py fix_ui.py \
  move_fridge.py restore_index.py refine_community.py refine_postcard.py \
  update_categories.py update_popular.py \
  test-db.js test-db-cols.js test_api.js fetch-schema.js \
  temp_migration.sql html_snippet.txt \
  "src/app/(tabs)/index.tsx.rej" "src/app/(tabs)/.index.tsx.swp" "src/app/.chefboo-preferences.tsx.swp"
rm -f recent_chat
```
Expected: no output (success).

- [ ] **Step 3: Add editor artifacts to .gitignore**

Append these two lines to `.gitignore` (only if not already present):
```
*.swp
*.rej
```

- [ ] **Step 4: Verify the app still builds (deletions touched no app code)**

Run:
```bash
npx tsc --noEmit 2>&1 | tail -20 || true
```
Expected: no NEW errors introduced by this task (pre-existing type errors, if any, are unchanged and unrelated to the deleted standalone scripts). The deleted files were standalone `.py`/`.js`/artifacts never imported by the RN app, so the Expo bundle is unaffected.

- [ ] **Step 5: Confirm clean working tree for these paths & commit**

Run:
```bash
git add .gitignore
git status --short
git commit -m "chore: remove dead one-off scripts and editor artifacts

Delete root dev scripts (fix_*.py, refine_*.py, update_*.py, move_fridge.py,
restore_index.py), throwaway DB/API test scripts (test-db*.js, test_api.js,
fetch-schema.js), temp_migration.sql, html_snippet.txt, and stray .rej/.swp
files. Add *.swp/*.rej to .gitignore. None were imported by app code.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
Expected: commit succeeds; `git status` shows only intended deletions + `.gitignore` change.

---

### Task 2: Secret & environment-variable audit

**Files:**
- Inspect only: `src/**`, `supabase/functions/**`, `.env`, `.env.example`
- Modify (only if a hardcoded secret is found): the offending source file → replace literal with an env reference.

**Interfaces:**
- Consumes: nothing.
- Produces: confirmation that secrets come only from env (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and Supabase-secret-injected `GEMINI_API_KEY` in edge functions).

- [ ] **Step 1: Scan client source for hardcoded keys**

Run:
```bash
cd /Users/azaxghulam/flavourflow
grep -rnE "eyJ[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{20,}|service_role|sb_secret|SUPABASE_SERVICE" src 2>/dev/null || echo "CLEAN — no hardcoded keys in src/"
```
Expected: `CLEAN — no hardcoded keys in src/`. (Edge functions reading `Deno.env.get("GEMINI_API_KEY")` are correct and expected.)

- [ ] **Step 2: Confirm edge functions read secrets from env, not literals**

Run:
```bash
grep -rnE "Deno.env.get|GEMINI_API_KEY|process.env" supabase/functions 2>/dev/null
```
Expected: keys are read via `Deno.env.get(...)`; no literal key strings.

- [ ] **Step 3: Record the result**

If Steps 1–2 are clean, no code change is needed — note "secret audit: clean" in the Phase 0 completion summary and skip to Task 3 (no commit).
If a literal secret IS found: replace it with the appropriate env reference, ensure the var exists in `.env`/Supabase secrets, then commit:
```bash
git commit -am "fix: move hardcoded secret to environment variable

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Live DB schema audit → drop-list (non-destructive)

**Files:**
- Create (scratch, not committed): `scratch/live_schema.sql`, `scratch/db_audit.md`

**Interfaces:**
- Consumes: the **18 app-referenced tables** (the baseline): `recipes, profiles, follows, posts, post_likes, comments, favorites, user_preferences, recipe_interactions, recipe_recommendations, recipe_translations, ai_generated_recipes, notifications, kitchen_essentials, ingredients, cuisine_items, search_history, chefboo_events`.
- Produces: `scratch/db_audit.md` — a drop-candidate list (tables/columns in the live DB not in the baseline, plus any dangling bookmark/save objects and already-removed Urdu columns) for user approval. **No schema is modified in this task.**

- [ ] **Step 1: Dump the live public schema**

Run (may prompt once for the DB password):
```bash
cd /Users/azaxghulam/flavourflow
supabase db dump --schema public -f scratch/live_schema.sql --linked 2>&1 | tail -5
```
Expected: `scratch/live_schema.sql` created. If the CLI errors on auth, run `supabase login` first; if it needs the password, supply the project DB password.

- [ ] **Step 2: List live tables and diff against the baseline**

Run:
```bash
echo "=== LIVE TABLES ===" && grep -oE "CREATE TABLE (IF NOT EXISTS )?\"?public\"?\.\"?[a-z_]+\"?" scratch/live_schema.sql | grep -oE "[a-z_]+$" | sort -u
echo "=== BASELINE (app-used) ===" && printf "%s\n" recipes profiles follows posts post_likes comments favorites user_preferences recipe_interactions recipe_recommendations recipe_translations ai_generated_recipes notifications kitchen_essentials ingredients cuisine_items search_history chefboo_events | sort -u
```
Expected: two lists printed. Tables in LIVE but not in BASELINE are drop candidates.

- [ ] **Step 3: Scan for dangling bookmark/save objects and removed Urdu columns**

Run:
```bash
grep -niE "bookmark|saved|_urdu|title_ur|instructions_ur" scratch/live_schema.sql || echo "none found"
```
Expected: any matches are added to the drop-candidate list (community posts have no save feature, and Urdu columns were removed in `20260630190000_remove_urdu_columns.sql`).

- [ ] **Step 4: Write the audit summary**

Create `scratch/db_audit.md` listing, for each drop candidate: object name, type (table/column), why it's a candidate (unused-by-app / dangling-bookmark / leftover-urdu), and a "keep / drop" recommendation. Do not guess on ambiguous tables — mark them "needs user decision".

- [ ] **Step 5: STOP — present the drop-list to the user**

Output the contents of `scratch/db_audit.md` to the user and ask for explicit approval of which objects to drop. **Do not proceed to Task 4 until the user approves.** No commit in this task (scratch files are untracked).

---

### Task 4: Apply approved DB cleanup (GATED — only after Task 3 approval)

**Files:**
- Create: `supabase/migrations/<timestamp>_phase0_db_cleanup.sql`

**Interfaces:**
- Consumes: the user-approved drop-list from Task 3.
- Produces: a committed migration dropping only the approved objects.

- [ ] **Step 1: Write the migration for ONLY user-approved drops**

Create `supabase/migrations/<YYYYMMDDHHMMSS>_phase0_db_cleanup.sql` containing `drop table if exists ...` / `alter table ... drop column if exists ...` for **only** the objects the user approved in Task 3. Use `if exists` guards so it's idempotent.

- [ ] **Step 2: Apply the migration to the linked project**

Run:
```bash
supabase db push 2>&1 | tail -10
```
Expected: migration applies cleanly.

- [ ] **Step 3: Verify the app still loads core data**

Run the app (`npm start`) and confirm home/recipe/community screens still fetch (the dropped objects were unused by the app, so no regression). Expected: no new fetch errors.

- [ ] **Step 4: Commit**

Run:
```bash
git add supabase/migrations/
git commit -m "chore(db): drop unused tables/columns per Phase 0 audit

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
Expected: commit succeeds.

---

## Self-Review

**Spec coverage (Phase 0 section of the design spec):**
- "Delete one-off scripts and artifacts" → Task 1 ✓
- "Confirm each deletion is safe" → Task 1 Step 1 ✓
- "Verify `.env` holds only env-referenced keys / nothing secret hardcoded" → Task 2 ✓
- "DB refinement (live audit) … present drop list … approval before destructive migration" → Tasks 3 (audit + present) & 4 (gated apply) ✓
- "dangling bookmark/save … removed Urdu columns as drop candidates" → Task 3 Step 3 ✓

**Placeholder scan:** Task 4 intentionally parameterizes on the user-approved list (cannot enumerate drops before the live audit runs) — this is a genuine runtime dependency, not a placeholder; the procedure and guards are fully specified.

**Type consistency:** No app types introduced; the 18-table baseline is identical everywhere it appears.

**Note:** Phases 1–4 each get their own plan, written when we reach them (per writing-plans scope guidance — one plan per independently-shippable subsystem).
