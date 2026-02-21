# ClawVault Issue #4 Implementation Plan

## Scope

Implement and integrate:

1. Ledger-first observer architecture (raw transcripts as source of truth)
2. Importance model replacing emoji priorities
3. Reflection layer (`clawvault reflect`) with weekly promotion rules
4. Observation archival (`clawvault archive`)
5. Replay engine (`clawvault replay`)
6. Graph guardrails (`--max-hops` + derived-only graph behavior)
7. Optional Beads sync (`clawvault sync-bd`)
8. Migration utility (`clawvault migrate-observations`)
9. Backward compatibility for old emoji observation format during transition

All work will be delivered on the current working branch with focused commits referencing #4.

---

## Architecture & Design Decisions

## 1) Ledger canonical filesystem model

Introduce a central ledger helper module to avoid path drift across commands.

**New utility module**
- `src/lib/ledger.ts`

**Responsibilities**
- Resolve canonical ledger paths:
  - `ledger/raw/<source>/`
  - `ledger/observations/YYYY/MM/DD.md`
  - `ledger/reflections/YYYY-WNN.md`
  - `ledger/archive/observations/YYYY/MM/DD.md`
- Ensure directories exist on first use
- Enumerate date-ranged observation files
- Convert date ↔ path

**Backward compatibility**
- Readers will support both:
  - new ledger observations path
  - legacy `observations/YYYY-MM-DD.md`
- New writes go to ledger paths.

---

## 2) Observation format and parsing model

### New canonical line format

`- [<type>|c=<0-1>|i=<0-1>] <content>`

Types:
- decision, preference, fact, commitment, milestone, lesson, relationship, project

### Parser strategy

Create a shared observation parsing module so compressor/router/context/wake/reflect/archive/replay use one parser.

**New module**
- `src/lib/observation-format.ts`

**Exports**
- types:
  - `ObservationType`
  - `ObservationRecord`
  - `ObservationLineKind = "scored" | "emoji"`
- parse functions:
  - `parseObservationMarkdown(markdown)`
  - `parseObservationLine(line, date)`
- helpers:
  - `isScoredObservationLine`
  - `isEmojiObservationLine`
  - `normalizeImportanceBucket` (structural/potential/contextual)
  - `emojiToScoreMapping` for migration/back-compat (🔴→0.9, 🟡→0.6, 🟢→0.2 default)
  - render functions for scored lines

Backward compatibility behavior:
- Existing emoji lines remain readable.
- New pipeline emits scored lines only.
- Consumers must treat parsed records uniformly (importance derived from line kind).

---

## 3) Compressor and importance model migration

### `src/observer/compressor.ts` (major refactor)

Changes:
- Replace emoji prompt instructions with scored format instructions.
- LLM output normalization accepts scored format.
- Fallback compression now outputs scored lines with:
  - inferred type
  - confidence (c)
  - importance (i)
- Replace `enforcePriorityRules` with `enforceImportanceRules`:
  - critical patterns force high importance (`i>=0.8`)
  - notable patterns raise moderate importance (`>=0.4`)
  - confidence floor/ceil adjustments for deterministic fallback
- Merge/dedupe logic operates on parsed observation records (content-level dedupe).

Prompt constraints include strict line grammar and examples from spec.

---

## 4) Observer as ledger compiler + raw transcript capture

### `src/observer/observer.ts`

Refactor observer to:
- Initialize ledger directory structure via `ensureLedgerStructure`.
- Write compiled observations to `ledger/observations/YYYY/MM/DD.md`.
- Persist raw transcript chunks before compression:
  - default source: `openclaw` unless explicit source label provided.
- Keep existing thresholded buffering behavior.

### API extension

Add optional source metadata without breaking existing callers:
- `processMessages(messages: string[], options?: { source?: string; sessionKey?: string; transcriptId?: string; timestamp?: Date })`
- `flush(options?)` may reuse pending metadata if needed.

`active-session-observer.ts` and sleep/replay callers will pass source metadata for raw ledger capture.

---

## 5) Rebuild command (`clawvault rebuild`)

**New command module**
- `src/commands/rebuild.ts`

Behavior:
- Replay raw transcripts from `ledger/raw/**` filtered by `--from/--to`.
- Normalize transcript chunks into message arrays.
- Re-run Observer/Compressor pipeline to regenerate compiled observations.
- `-v/--vault` support.
- Determinism target: structural equivalence (headings + valid scored records), not exact text.

Command registration:
- Add to `bin/register-maintenance-commands.js` (maintenance family).
- Export in `src/index.ts`.

---

## 6) Reflection layer (`clawvault reflect`)

### New command module
- `src/commands/reflect.ts`

### New service module
- `src/observer/reflection-engine.ts` (or evolve current `reflector.ts` into weekly reflection engine and keep compatibility alias)

Behavior:
- Input window: last N days (default 14)
- Parse scored observations (+ emoji fallback mapped to importance)
- Apply promotion rules:
  - i >= 0.8: auto-promote unless contradicted
  - 0.4 <= i < 0.8: promote only if seen on >=2 different dates
  - i < 0.4: no auto-promotion
- Deduplicate against previous reflection files.
- Use LLM provider chain pattern (anthropic/openai/gemini fallback) similar to compressor.
- Write output to `ledger/reflections/YYYY-WNN.md`.
- Support `--dry-run`.
- Trigger archival pass automatically at end of reflect run.

### Sleep integration
- Add `--reflect` option to sleep command path to run reflection after handoff/observe.

### Hook automation
- Add weekly trigger in `hooks/clawvault/handler.js`:
  - respond to `cron.weekly`
  - if event timestamp indicates Sunday midnight, run `clawvault reflect`
- Update `hooks/clawvault/HOOK.md` events list to include `cron.weekly`.

---

## 7) Observation archival (`clawvault archive`)

**New command module**
- `src/commands/archive.ts`

Behavior:
- Move compiled observation files older than retention (default 14 days)
  from `ledger/observations/YYYY/MM/DD.md`
  to `ledger/archive/observations/YYYY/MM/DD.md`
- Preserve content exactly.
- Do not delete archived data.
- `--dry-run`.
- `--older-than <days>`.
- Exclude archive paths from observation readers and search context.

Reflect command calls archive service automatically.

---

## 8) Replay engine (`clawvault replay`)

**New command module**
- `src/commands/replay.ts`

**New normalizers**
- `src/replay/normalizers/chatgpt.ts`
- `src/replay/normalizers/claude.ts`
- `src/replay/normalizers/opencode.ts`
- `src/replay/normalizers/openclaw.ts`
- `src/replay/types.ts`

Unified normalized message shape:
- `{ timestamp?: string; role?: string; text: string; conversationId?: string; source: <platform> }`

Flow:
1. Parse source export by platform.
2. Filter by `--from/--to`.
3. Save raw payload chunks into `ledger/raw/<source>/`.
4. Feed normalized messages into observer compressor pipeline.
5. Run `reflect` for the replay range after ingestion (unless `--dry-run`).

CLI:
- `clawvault replay --source <chatgpt|claude|opencode|openclaw> --input <path> [--from] [--to] [--dry-run] [-v]`

---

## 9) Migration utility (`clawvault migrate-observations`)

**New command module**
- `src/commands/migrate-observations.ts`

Behavior:
- Find legacy emoji observation files in both:
  - legacy `observations/*.md`
  - ledger observations (if any old lines remain)
- Create non-destructive backup copy before mutation
  - e.g. sibling `*.emoji-backup.md` (or backup directory under `ledger/migrations/`)
- Convert emoji lines to scored lines with mapped type/confidence/importance
- Preserve date headings and ordering.
- Idempotent (already scored lines unchanged).

---

## 10) Router updates

### `src/observer/router.ts`

Refactor to parse observation records from shared parser:
- Route by type + importance threshold:
  - route `i >= 0.4` (structural/potential)
  - ignore contextual by default (`i < 0.4`)
- Category preference by type mapping:
  - decision -> decisions
  - preference -> preferences
  - fact/lesson/commitment/relationship/project/milestone -> mapped categories
- Maintain dedupe and entity extraction behavior.
- Ensure routed line format in category files remains readable (may include `[type|c|i]` block).

---

## 11) Context and wake integration updates

### `src/lib/observation-reader.ts`
- Read from ledger observations + legacy fallback.
- Parse both scored + emoji.
- Expose normalized importance and type for ranking.

### `src/commands/context.ts`
- Replace red/yellow/green ranking with importance buckets:
  - structural: i>=0.8
  - potential: i>=0.4
  - contextual: i<0.4
- Add `--max-hops` (default 2) for graph expansion.
- Graph traversal limited by hops (BFS layers), not only immediate neighbors.

### `src/commands/wake.ts`
- Observation highlights based on importance thresholds:
  - show structural and potential
  - include emoji fallback mapping.
- Read from ledger observation tree, legacy fallback.

---

## 12) Graph guardrails

### `src/lib/memory-graph.ts`
- Enforce derived-only nodes:
  - unresolved links remain unresolved nodes
  - never synthesize note nodes for missing files
- Add inline documentation/comments reflecting guardrail constraint.

### `src/commands/context.ts`
- Respect `--max-hops` during graph context expansion.

---

## 13) Optional Beads integration

**New command module**
- `src/commands/sync-bd.ts`

Behavior:
- Check availability of `bd` binary (spawnSync `bd --version` or `which bd` via spawnSync).
- If unavailable: print informational message and exit 0.
- If available:
  - fetch active tasks via bd CLI output
  - write section in `views/now.md` under `## Active Tasks (from bd)`
  - update only that section (idempotent)
  - reindex only this file (via vault reindex fallback; if file-level qmd update unsupported, document limitation and keep minimal impact)
- `--dry-run`.

---

## 14) Command registration surface

Add new commands in appropriate registrars:

- query/session modules:
  - reflect
  - replay
- maintenance/vault ops modules:
  - rebuild
  - archive
  - migrate-observations
  - sync-bd

Also update:
- `src/index.ts` exports
- `bin/help-contract.test.js`
- `bin/command-registration.test.js`

---

## 15) Testing strategy (Vitest)

### Unit tests to add/update

1. `src/lib/observation-format.test.ts`
   - parse scored lines
   - parse emoji lines (compat)
   - render + normalize helpers

2. `src/observer/compressor.test.ts`
   - scored output format
   - importance enforcement
   - fallback type/c/i generation

3. `src/observer/observer.test.ts`
   - writes to ledger observations path
   - raw transcript chunks saved before compression

4. `src/observer/router.test.ts`
   - routing by type + importance
   - compat with emoji line parsing

5. `src/lib/observation-reader.test.ts`
   - mixed legacy + ledger path reads
   - mixed emoji/scored parse

6. `src/commands/context.test.ts`
   - importance-based ordering
   - graph `--max-hops` expansion limit

7. `src/commands/wake.test.ts`
   - highlight selection using scored lines

8. New command tests:
   - `reflect.test.ts`
   - `archive.test.ts`
   - `rebuild.test.ts`
   - `replay.test.ts`
   - `migrate-observations.test.ts`
   - `sync-bd.test.ts`

9. Hook tests:
   - weekly `cron.weekly` trigger invokes reflect

10. Registration/help contract tests:
   - new command names/options present

### Verification gates
- `npm run build`
- `npx vitest run`

---

## 16) Implementation order

1. Introduce shared ledger + observation-format primitives.
2. Migrate compressor + observer + router to scored model.
3. Add observation reader/context/wake compatibility updates.
4. Implement archive + migrate commands.
5. Implement reflect engine + command + hook weekly trigger.
6. Implement replay + rebuild.
7. Implement graph `max-hops` and guardrail docs.
8. Implement optional sync-bd.
9. Final pass on tests, build, docs, and command contracts.

---

## 17) Risks and mitigations

- **Risk:** Broad path migration breaks existing consumers.
  - **Mitigation:** dual-path read compatibility, ledger-only writes, exhaustive tests.

- **Risk:** LLM variability affects deterministic tests.
  - **Mitigation:** test parser/structure/invariants; mock LLM outputs.

- **Risk:** Replay formats differ across exports.
  - **Mitigation:** strict normalizers per source + robust parsing fallbacks.

- **Risk:** Hook event shape variance.
  - **Mitigation:** reuse existing tolerant event matching; add tests for aliases.

---

## 18) Deliverables checklist

- [ ] `PLAN.md` committed
- [ ] Ledger path migration + compat readers
- [ ] Scored importance model end-to-end
- [ ] `migrate-observations`
- [ ] `archive`
- [ ] `reflect` + weekly hook automation
- [ ] `rebuild`
- [ ] `replay` (all listed sources)
- [ ] Graph `--max-hops` + derived-only guardrails
- [ ] Optional `sync-bd`
- [ ] Updated tests and docs
- [ ] Build + test pass

