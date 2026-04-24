---
title: "Analysis — shisad Long-Term Memory (v0.7.0 release content, 2026-04-23)"
date: 2026-04-25
type: analysis
system: shisad (Shisa AI personal assistant daemon)
source: /home/lhl/github/shisa-ai/shisad (v0.7.0 release content, CHANGELOG 2026-04-23)
source_alt: /home/lhl/github/shisa-ai/shisad-dev/planning/PLAN-longterm-memory.md (2026-04-21 design baseline)
version: "v0.7.0 release content (M1–M6 foundations shipped; observed trust band gated to v0.7.1+)"
related:
  - ANALYSIS.md
  - ANALYSIS-academic-industry.md
  - ANALYSIS-claude-code-memory.md
  - ANALYSIS-codex-memory.md
  - ANALYSIS-karta.md
  - ANALYSIS-mira-OSS.md
  - ANALYSIS-coolmanns-openclaw-memory-architecture.md
tags:
  - agentic-memory
  - security-first
  - trust-model
  - executive-assistant
  - knowledge-graph
  - bi-temporal
  - procedural-memory
  - prompt-injection-defense
  - consolidation
  - benchmarks
---

# Analysis — shisad Long-Term Memory System

Deep analysis of the **shisad long-term memory architecture** as implemented in the **v0.7.0 release content** (CHANGELOG 2026-04-23, six-milestone M1→M6 scope closed). The earlier revision of this document reviewed the design plan; this revision reviews the running code, with the 2026-04-21 plan retained as the design baseline.

shisad is a personal/executive assistant daemon with multi-channel presence (CLI, Discord, Slack, Telegram, Matrix). The memory system supports both single-user executive-assistant workflows and multi-channel ingestion with provenance-aware trust handling.

File-path references below point into `~/github/shisa-ai/shisad` at the v0.7.0 release-candidate commit (`bcb3cb9`, `chore: prepare v0.7.0 release candidate`, plus the `7e6b277` follow-ups merged into the release branch).

## TL;DR

- **v0.7.0 shipped the substrate + surfaces architecture.** The storage substrate (SQLite + canonical §3.7 schema + append-only event log) and the five memory surfaces (Identity, Active Attention, Recall/MemoryPack, Procedural/Skills, Evidence) are all implemented. See `src/shisad/memory/{manager,backend/sqlite,events,surfaces/*}.py`.
- **Trust model is live in code, not just a plan.** `src/shisad/memory/trust.py` defines `SourceOrigin` (8 values), `ChannelTrust` (7 values), `ConfirmationStatus` (6 values), the valid-combination matrix (`_VALID_TRUST_MATRIX`), and enforcement via `validate_trust_triple` / `TrustGateViolation`. `src/shisad/memory/ingress.py` implements `IngressContext` as a frozen Pydantic model with SHA-256 content digests and a `DerivationPath` enum (direct/extracted/summary); `IngressContextRegistry.validate_binding` enforces digest/parent binding.
- **Pending-review queue, identity candidate lifecycle, and strong-invalidation review flows all ship.** `MemoryManager.list_review_queue`, `promote_identity_candidate`, `reject_identity_candidate`, `note_identity_candidate_surface`, `expire_identity_candidate` (manager.py:534–1041). Pattern-based observation detection in `src/shisad/memory/identity_candidates.py`. Strong invalidation patterns live in the consolidation worker and surface user-review events rather than silent updates.
- **Sandboxed consolidation worker with explicit capability scope.** `ConsolidationCapabilityScope(network=False, tool_recursion=False, self_invocation=False, write_scope="memory_substrate")` in `src/shisad/memory/consolidation/worker.py:79`. Consolidation writes go through the same trust matrix and resolve to `(consolidation_derived, consolidation, auto_accepted)` — `_VALID_TRUST_MATRIX` assigns this row `trust_band=untrusted` with `confidence_mode="inherit_weighted"`, so consolidation mathematically cannot upgrade trust.
- **Procedural memory with orthogonal install/invocation is live.** `invocation_eligible` is a boolean field on `MemoryEntry` (schema.py:97) independent of the derived `trust_band` property; `is_invocation_eligible_triple` in trust.py only allows `invocation_eligible=True` for elevated triples or the specific `(tool_output, tool_passed, pep_approved)` PEP-install path. Manager exposes `promote_to_skill`, `invoke_skill`, `list_invocable_skills`, `describe_skill`.
- **Derived knowledge graph is rebuildable, not authoritative.** `src/shisad/memory/graph/derived.py` builds `GraphNode` / `GraphEdge` from canonical entries; graph lifecycle metadata is exported through the live control surface (per CHANGELOG). Graph does not carry trust authority on its own — trust lives on the entries.
- **Legacy backfill is shipped as read-time remap.** `backfill_legacy_triple` in trust.py + `remap_memory_entry_payload` via the schema's `_backfill_legacy_shape` validator. Two explicit legacy rows in the trust matrix (`user_direct/command/auto_accepted` and `user_confirmed/command/auto_accepted`) land legacy entries at `trust_band=untrusted` with preserved confidence — no legacy entry can reach `elevated` via backfill alone.
- **"Observed" trust band is defined but gated off in v0.7.0.** `validate_trust_triple` downgrades `observed` rules to `untrusted` unless the caller passes `enable_observed=True`. In practice v0.7.0 operates with the `elevated / untrusted` pair; the `observed` band is scheduled for v0.7.1+.
- **Benchmark adapters are not in the repo yet.** The plan specifies six (LoCoMo, LongMemEval, EverMemBench, StructMemEval, LoCoMo-Plus, BEAM+LIGHT); there is no `tests/` or `scripts/` entry for any of them. The adversarial track exists but is minimal: `tests/adversarial/memory/poisoning_cases.json` has **3** cases, and `scripts/m6_adversarial_metrics.py` + `shisad.security.adversarial.AdversarialMetrics` track `utility_retention` only — not ISR/ASR/downstream-harm as specified in the plan.
- **Status: v0.7.0 release content cut.** The architectural claims in this analysis reference running code unless noted otherwise; the gaps above (observed band, benchmark adapters, adversarial metrics breadth) are the honest delta between the 2026-04-21 plan and the v0.7.0 release.

## Stage 1 — Descriptive (what v0.7.0 implements)

### 1.1 Architecture overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     MEMORY SURFACES (compiled views)                     │
├──────────────┬──────────────┬──────────────┬─────────────┬───────────────┤
│  Identity    │  Active      │ Recall       │ Procedural  │  Evidence     │
│  (session    │  Attention   │ (MemoryPack) │ (Skills)    │  (on-demand)  │
│   start +    │  (per-turn   │ (per-query)  │ (on-        │               │
│   invalidate)│   transition)│              │  invocation)│               │
│  trust:      │  trust:      │ trust:       │ trust:      │  trust:       │
│  elevated    │  untrusted   │ untrusted    │ artifact-   │  untrusted    │
│  only        │  content     │ data region  │ scoped      │  region       │
│  ~750 tok    │  ~750 tok    │ class-       │ per-skill   │  per-call     │
│  (default)   │  (default)   │ budgeted     │             │               │
│  identity.py │  active_     │ recall.py    │ procedural  │  evidence_    │
│              │  attention.py│              │  .py        │  refs ingest  │
├──────────────┴──────────────┴──────────────┴─────────────┴───────────────┤
│                     STORAGE SUBSTRATE (one data model)                   │
├──────────────────────────────────────────────────────────────────────────┤
│  Transcript Store   │ Append-only raw turns (core/transcript.py)         │
│  Evidence Store     │ Sanitized chunks + encrypted originals             │
│                     │ (memory/ingestion.py, AES-GCM via artifact KMS)    │
│  Typed Entries      │ SQLite (memory.sqlite3) via backend/sqlite.py;     │
│                     │ MemoryEntry in schema.py (21 entry_type values)    │
│  Knowledge Graph    │ Derived, rebuildable (graph/derived.py)            │
│  Event Trail        │ Append-only memory_events SQLite table             │
│                     │ (memory/events.py, MemoryEventStore)               │
├──────────────────────────────────────────────────────────────────────────┤
│                     TRUST + GOVERNANCE LAYER                             │
├──────────────────────────────────────────────────────────────────────────┤
│  PEP (Policy Enforcement Point) — memory/trust.py, memory/ingress.py     │
│  ├── IngressContext handles (frozen, SHA-256 content_digest)             │
│  ├── _VALID_TRUST_MATRIX (14 rules incl. legacy/consolidation rows)      │
│  ├── validate_binding() enforces digest + DerivationPath                 │
│  ├── Instruction-like rejection (MemoryManager._INSTRUCTION_PATTERNS)    │
│  ├── Minimum signal gate (_fails_minimum_signal)                         │
│  └── Write gate: allow | reject | require_confirmation                   │
├──────────────────────────────────────────────────────────────────────────┤
│  Content Firewall (src/shisad/security/firewall/)                        │
│  ├── Sanitization + fact extraction                                      │
│  ├── Risk scoring + taint labels                                         │
│  └── PII/secret redaction                                                │
├──────────────────────────────────────────────────────────────────────────┤
│                     CONSOLIDATION LAYER                                  │
├──────────────────────────────────────────────────────────────────────────┤
│  memory/consolidation/worker.py                                          │
│  ├── ConsolidationCapabilityScope (no network, no tool recursion,        │
│  │     no self-invocation, write_scope=memory_substrate)                 │
│  ├── Corroboration / contradiction / strong-invalidation detection       │
│  ├── Identity candidate accumulation + proposal                          │
│  ├── Dedup / merge / archive-candidate / quarantine proposals            │
│  └── All writes resolve to (consolidation_derived, consolidation,        │
│        auto_accepted) → trust_band=untrusted (by matrix)                 │
├──────────────────────────────────────────────────────────────────────────┤
│                     EVALUATION + ADVERSARIAL LAYER                       │
├──────────────────────────────────────────────────────────────────────────┤
│  scripts/m6_adversarial_gate.py + m6_adversarial_metrics.py              │
│  shisad.security.adversarial.AdversarialMetrics                          │
│  tests/adversarial/memory/poisoning_cases.json  (3 cases — minimal)      │
│  Benchmark adapters (LoCoMo/LongMemEval/...): not yet in repo            │
└──────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Storage substrate (shipped)

| Store | Role | Implementation |
|---|---|---|
| Transcript | Append-only raw turns + tool outputs | `src/shisad/core/transcript.py` |
| Evidence store | Sanitized chunks + encrypted originals | `src/shisad/memory/ingestion.py` |
| Typed entries | All durable memory, canonical §3.7 schema | `src/shisad/memory/schema.py` + `backend/sqlite.py` |
| Knowledge graph | Derived view over evidence + entries | `src/shisad/memory/graph/derived.py` |
| Event trail | Append-only audit of all mutations | `src/shisad/memory/events.py` (`memory_events` table) |

Backend: **SQLite** (single `memory.sqlite3` per storage dir). The v0.7.0 design target of SQLite + FTS5 + sqlite-vec is not fully wired — retrieval currently composes SQLite entries with the pre-existing `ingestion.py` retrieval stack; FTS5/sqlite-vec integration remains a tuning axis.

### 1.3 Entry-type taxonomy

`schema.MemoryEntryType` enumerates **21** string literal values across 5 categories (the 15 from the plan plus 6 channel/inbox/response types added during implementation):

| Category | Types | Trust expectations |
|---|---|---|
| **Identity** | `persona_fact`, `preference`, `soft_constraint` | `trust_elevated` only for Identity surface (identity.py:13) |
| **Active Agenda** | `open_thread`, `scheduled`, `recurring`, `waiting_on` | Any band; workflow_state lifecycle |
| **Semantic** | `fact`, `decision`, `relationship`, `episode`, `note` | Any band; retrieval as untrusted data |
| **Task** | `todo`, `project_state` | User-curated primary; extracted requires confirmation |
| **Channel / Inbox** | `inbox_item`, `channel_summary`, `person_note`, `channel_participation`, `response_feedback` | Multi-channel presence types; channel binding enforced in Active Attention pack |
| **Procedural** | `skill`, `runbook`, `template` | `invocation_eligible` orthogonal to `trust_band` |

The `MemoryEntry` schema (schema.py:61–131) carries: `id`/`version`/`supersedes`/`superseded_by`; entry_type/key/value/predicate/strength; source + the three PEP-minted trust fields; `created_at` / `valid_from` / `valid_to` / `last_verified_at` / `expires_at` (bi-temporal); `confidence` / `taint_labels` / `citation_count` / `last_cited_at` / `decay_score` / `importance_weight`; `status` / `workflow_state` / `scope` / `invocation_eligible` / `ingress_handle_id` / `content_digest` / `conflict_entry_ids`; and a handful of v0.6 legacy compatibility fields (`user_verified`, `deleted_at`, `quarantined`) kept for API-shape backfill.

`trust_band` is a **derived property** (schema.py:126), not a stored column — it's computed via `derive_trust_band(source_origin, channel_trust, confirmation_status)` so the matrix is the single source of truth.

### 1.4 Trust model — live in `trust.py`

`_VALID_TRUST_MATRIX` enumerates the legal triples. Counting the dict literal in v0.7.0:

- **5** `elevated` rules (user-direct command, user_confirmed command, user_corrected command, user_confirmed tool_passed, user_corrected tool_passed)
- **1** `observed` rule (`user_direct` / `owner_observed` / `auto_accepted` — downgraded to `untrusted` unless `enable_observed=True`)
- **6** `untrusted` rules for external/tool/web/rc-evidence ingress paths
- **2** legacy-backfill compatibility rows (preserved-confidence `untrusted`)

= 14 rules total. The plan's "16-row matrix" framing is still accurate as an approximation; the implemented set composes with backfill remap to cover the same ingress space.

Non-matrix triples raise `TrustGateViolation`. `pending_review` is a sentinel — any triple with `confirmation_status=pending_review` resolves to `_PENDING_REVIEW_RULE` which is `untrusted` with preserved prior confidence and a note that review-queue entries never surface by default.

`IngressContext` (ingress.py:40–53) is a frozen Pydantic model with `handle_id` (uuid4 hex), the three trust fields, `taint_labels`, `scope`, `source_id`, `content_digest` (SHA-256), and `created_at`. `IngressContextRegistry.mint` validates the triple before registering the handle; `validate_binding` enforces that the write payload's digest matches the handle's (for `DerivationPath.DIRECT`) or that the declared parent_digest matches (for `EXTRACTED` / `SUMMARY`).

The `mint_explicit_user_memory_ingress_context` helper (ingress.py:124–175) is the canonical ingress path for user-authored turn payloads — it's where CLI/connector messages get their triple assigned before the MemoryManager sees them.

### 1.5 Memory surfaces — compilers shipped

| Surface | Refresh | Compiler | Budget |
|---|---|---|---|
| **Identity** | Session start + turn transition on invalidation | `build_identity_pack` (surfaces/identity.py) | 750 tok default |
| **Active Attention** | Turn transitions | `build_active_attention_pack` (surfaces/active_attention.py) | 750 tok default, class-balanced |
| **Recall (MemoryPack)** | Per-query | `build_recall_pack` (surfaces/recall.py) | Caller-supplied `max_tokens` |
| **Procedural (Skills)** | On-invocation | `build_procedural_artifact` / `build_procedural_summary` (surfaces/procedural.py) | Per-skill |
| **Evidence** | Explicit fetch, audited | `ingestion.py` evidence refs | Per-call |

The Identity pack filters strictly — it requires `entry_type ∈ {persona_fact, preference, soft_constraint}`, `superseded_by is None`, `trust_band == "elevated"`, and explicitly blocks `source_origin ∈ {consolidation_derived, external_message, tool_output}` (identity.py:14–18). This is the "consolidation cannot upgrade trust" rule enforced at the read side too, as belt-and-braces.

The Active Attention pack filters on `status == "active"`, `workflow_state ∈ {active, waiting, blocked}`, optional `scope_filter`, and channel binding (for channel-affined entry types). Class-balancing (active_attention.py:150) ensures `waiting_on`, `scheduled`, `recurring`, `open_thread`, and `inbox_item` each get representation rather than one class monopolizing the budget.

### 1.6 Retrieval pipeline (MemoryPack)

`build_recall_pack` (surfaces/recall.py) currently wraps the existing `ingestion.py` retrieval results into a `RecallPack` dataclass carrying `query`, `results`, `citation_ids`, `max_tokens`, `as_of`, `include_archived`, and a `legacy_payload()` adapter that preserves the v0.6 `memory.retrieve` response shape.

The v0.7.0 recall pack is functional but does **not yet** layer in the full MemoryPack contract from the plan (per-entry trust-tier annotation, staleness caveats, conflict surfacing, capability filtering, archive auto-widen). Those annotations are carried by the underlying entries but aren't reshaped into a rich per-entry surface view by `build_recall_pack` itself — they're still plumbed through the ingestion stack's `RetrievalResult`. This is an M2-scope "rewire" visible in the commit history (`M2 Recall rewire`) and is the honest gap between the plan's "MemoryPack" and v0.7.0's Recall surface.

### 1.7 Write governance (MemoryManager)

`src/shisad/memory/manager.py` (1993 lines) enforces write gating. Key policies as class attributes:

- `_INSTRUCTION_PATTERNS`: regexes for `always …`, `never …`, `ignore policy`, `when you see …`, `if/whenever … then …`. Matches reject the write.
- `_PREFERENCE_PREDICATE_PATTERN`: preferences must be `name(value)` shape; directive-prefixed preferences (`always(...)`, `never(...)`, `ignore(...)`, `prioritize(...)`) rejected.
- `_LOW_SIGNAL_PHRASES` / `_LOW_SIGNAL_TOKENS` / `_GENERIC_KEY_SEGMENTS`: minimum signal gate (`_fails_minimum_signal`).
- `_USER_AUTHORED_ORIGINS`: set of origins eligible for elevated outcomes (`user_direct`, `user_confirmed`, `user_corrected`).

`write` / `write_with_provenance` route through the trust matrix and may return a `MemoryWriteDecision` of `allow` / `reject` / `require_confirmation`. `list_review_queue` surfaces pending-review items without leaking them into default recall (CHANGELOG "Pending-review memories and skills stay out of default recall and invocation paths").

Subagents do not write to long-term memory directly — they propose writes via structured outputs; the orchestrator submits through the MemoryManager gates. This is enforced at the API layer rather than as a separate runtime check.

### 1.8 Confidence-update mechanics

`MemoryManager.update_confidence` (manager.py:1126), `mark_conflict` (1167), `verify` (1060), `update_decay_score` (1100), and the consolidation worker's strong-invalidation path together implement the five-event model:

1. **Corroboration** — `update_confidence` with positive delta, capped at 0.99 in `clamp_confidence`.
2. **Contradiction** — `mark_conflict` + `update_confidence` with negative delta; conflict_entry_ids populated.
3. **Strong invalidation** — `consolidation/worker.py` detects patterns (`StrongInvalidationProposal`), surfaces a review event rather than mutating the target. CHANGELOG: "record auditable merge, quarantine, and confirmation events without turning the graph into authoritative state."
4. **Re-verification** — `verify` sets `last_verified_at` and pulls confidence toward 0.95.
5. **Stale drift** — `update_decay_score` recomputes `decay_score` without touching `confidence`.

All updates route through `MemoryEventStore.append` (events.py:39) with the appropriate event_type + metadata payload + `ingress_handle_id`.

### 1.9 Identity candidate lifecycle (shipped)

`src/shisad/memory/identity_candidates.py` detects owner-observed preference/persona signals via three regex patterns (`preference_like`, `preference_dislike`, `habitual_schedule`) on sanitized content and emits `IdentityObservation` records at 0.30 confidence.

Promotion/rejection flow lives in `MemoryManager`:
- `promote_identity_candidate` (manager.py:868) — user yes → elevated Identity entry
- `reject_identity_candidate` (manager.py:937) — user no → tombstone + detector back-off
- `note_identity_candidate_surface` (manager.py:975) — tracks surface count (default max 2)
- `expire_identity_candidate` (manager.py:1004) — silence → quiet expiry
- `_identity_candidate_surface_count` (manager.py:1888) — internal surface accounting

The pattern detector runs on sanitized content (post content-firewall); `external_message` origins are explicitly excluded from Identity promotion by the identity surface's `IDENTITY_BLOCKED_SOURCE_ORIGINS` gate — so the poisoning-resistance claim is enforced in code, not just in prose.

### 1.10 Procedural memory (shipped)

Two distinct operations, as designed:
- **Install/promote**: `MemoryManager.promote_to_skill` (manager.py:667) — write-path operation with trust gating via `is_invocation_eligible_triple` in trust.py. Elevated triples OR the specific `(tool_output, tool_passed, pep_approved)` path can set `invocation_eligible=True`.
- **Invocation**: `MemoryManager.invoke_skill` (manager.py:740), `list_invocable_skills` (manager.py:579), `describe_skill` (manager.py:629). User-requested `/skill <id>` proceeds without re-confirmation for already-approved skills; audit event fires.

`invocation_eligible` is a boolean field on `MemoryEntry` (schema.py:97), orthogonal to the derived `trust_band` property. A PEP-approved tool-installed skill has `trust_band = untrusted` but `invocation_eligible = true` — exactly as the plan specified, and enforced by `is_invocation_eligible_triple`.

### 1.11 Consolidation (shipped as sandboxed worker)

`src/shisad/memory/consolidation/worker.py` runs with `ConsolidationCapabilityScope(network=False, tool_recursion=False, self_invocation=False, write_scope="memory_substrate")` (worker.py:79). The worker implements:

- Corroboration / contradiction / strong-invalidation detection (regex + embedding-based matching)
- Identity candidate accumulation via `ExtractionCandidate`
- Dedup / merge / archive-candidate / quarantine proposals
- Confidence update events routed through `MemoryManager.update_confidence`

All consolidation writes resolve to the matrix row `(consolidation_derived, consolidation, auto_accepted)` → `trust_band="untrusted"`, `confidence_mode="inherit_weighted"`. Consolidation mathematically cannot upgrade trust band.

Multi-timescale scheduling (fast/medium/slow) is implicit in how the worker is invoked from the daemon loop; the worker itself is scheduler-agnostic. This is visible as a gap vs the plan's per-tier cadence spec.

### 1.12 Legacy backfill (shipped)

`backfill_legacy_triple` in trust.py + `remap_memory_entry_payload` via `schema.MemoryEntry._backfill_legacy_shape` (model_validator). Two legacy-compat rows in the matrix land v0.6-shape entries at `untrusted` with preserved confidence. No legacy entry reaches `elevated` via backfill alone — the blocked origins set on the Identity surface enforces this even for edge cases (consolidation-derived, external-message, tool-output are explicitly excluded).

### 1.13 Release scope

- **v0.7.0** (Path A, shipped 2026-04-23): M1 foundations + backend → M2 Recall rewire → M3 Identity + Active Attention → M4 Procedural + Evidence → M5 KG + Consolidation → M6 RC + release close. All six milestones have commits in the release-candidate range (see `git log` around `bcb3cb9`).
- **v0.7.1** (next): observed trust band enabled; benchmark hardening; retrieval sufficiency verification; correction semantics; telemetry; inference-based identity; autonomous skill selection.
- **v0.7.2**: open threads + working context generalization (already partially present via Active Attention).

## Stage 2 — Comparative (how v0.7.0 stacks up)

### 2.1 Coverage breadth

shisad remains the only system in the survey with first-class (✅) coverage across **all ten** dimensions in the ANALYSIS.md §2 comparison matrix: Identity, Working, Transcript/recall, Episodic, Semantic facts, Procedural/rules, Task/project, Graph/relations, Maintenance, Evaluation. The coverage is now backed by running code rather than a plan.

Closest competitors:
- **OpenClaw** has ✅ across 10 dimensions but with weaker trust/governance semantics
- **Claude Code** has ✅ on 5 and ⚠️ on 5 (no graph, no structured episodic, no procedural tier in v1)
- **Codex** has ✅ on 6 and ⚠️ on 4 (stronger procedural via Skills than Claude Code, but no graph, no entity linking)
- **Karta** has ✅ on 7 but ❌ on Identity, Working, Task

### 2.2 Security posture (unique position)

shisad is the **only system** with ✅ on both:
- **Taint/trust labels carried through**: `TaintLabel` on `IngressContext` → `MemoryEntry.taint_labels` → retrieval results (ingestion.py:145, 358, 1217)
- **Capability-scoped retrieval**: retrieval filtered by the agent's active capability set via the ingestion stack

The trust model formalism is now code-enforced:
- Valid-combination matrix (`_VALID_TRUST_MATRIX`) validated at write time by `validate_trust_triple`
- PEP-minted ingress handles via `IngressContextRegistry.mint` — opaque `handle_id`, callers cannot forge
- Content-binding via `validate_binding` + `DerivationPath` — handle payload can't be reused for unrelated content
- Consolidation cannot upgrade trust — matrix row enforces `untrusted`
- Cross-scope contamination prevented by binding scope to the handle at mint time

### 2.3 Trust model depth (updated)

| System | Trust model | Trust bands | Write gating | Trust carried through retrieval |
|---|---|---|---|---|
| **shisad (v0.7.0)** | Formal matrix in code (trust.py): 3 fields → 14 rules, PEP-minted handles with SHA-256 content binding | 2 operative (elevated / untrusted) + observed defined but gated off | ✅ instruction rejection + confirmation + quarantine + review queue (all in manager.py) | ✅ taint labels + capability scope (ingress.py + ingestion.py) |
| **Gigabrain** | Implicit: per-type junk filter + plausibility heuristics | 1 (all entries equal) | ✅ 7-stage pipeline | ❌ |
| **Claude Code** | Implicit: prompt-enforced exclusion rules + eval-validated gates | 1 (all entries equal; scope = private/shared) | ⚠️ exclusion list + prompt-enforced | ❌ |
| **Codex** | Implicit: minimum signal gate + secret redaction | 1 (all entries equal) | ⚠️ minimum signal gate | ❌ |
| **MIRA-OSS** | Implicit: auto-extract with fuzzy dedup thresholds | 1 | ❌ (auto-extract at collapse) | ❌ |
| **Karta** | Per-entry provenance enum (6 variants) | 2 (FACT vs INFERRED in retrieval prompt) | ❌ | ⚠️ (provenance markers, not taint) |
| **OpenClaw** | Convention-based (channel/security rules) | 1 | ❌ | ❌ |
| **Mem0** | Paper mentions trust scoring | 1 | ⚠️ | ❌ |

### 2.4 Retrieval sophistication

| Feature | shisad (v0.7.0) | Best comparable |
|---|---|---|
| Hybrid lexical+semantic | ✅ composed via ingestion.py | OpenClaw, MIRA-OSS |
| Entity/alias resolution | ✅ stable IDs + graph-derived canonicalization | Karta (entity profiles), MIRA-OSS (spaCy NER) |
| Knowledge graph traversal | ✅ derived KG (graph/derived.py) with evidence-backed queries | Karta (multi-hop BFS), MIRA-OSS (hub discovery) |
| Tiered retrieval | ✅ 5 surface compilers | Karta (6-mode classification), ByteRover (5-tier) |
| Capability-scoped retrieval | ✅ (unique; wired through ingestion) | No comparable |
| Taint labels through retrieval | ✅ (unique; TaintLabel on IngressContext + MemoryEntry) | Karta ⚠️ |
| Conflict surfacing | ⚠️ conflict_entry_ids stored; RecallPack does not yet annotate results (M2 rewire pending in v0.7.1) | Karta (contradiction force-retrieval) |
| Staleness annotations | ⚠️ fields stored; pack-level annotation pending | Claude Code (mtime-based), Codex (usage-based) |
| Bi-temporal as_of queries | ✅ valid_from/valid_to + created_at + as_of in RecallPack | Zep (temporal KG) |
| Archive-tier automatic widening | ⚠️ `include_archived` flag plumbed; auto-widen on relevance floor not yet live | No comparable |

The ⚠️ marks reflect the Recall-surface rewire still being in progress — the data is present, the pack-level annotations aren't yet.

### 2.5 Confidence and conflict mechanics

shisad's five-event confidence model is now implemented. Closest comparisons remain:
- **Karta**: contradiction dreams detect and persist conflicts; force-retrieval surfaces both sides. But confidence is per-note, not evidence-accumulating across corroboration, and there's no user-facing resolution flow.
- **MIRA-OSS**: supersedes links with scoring penalty.
- **Supermemory**: version chains (updates/extends/derives) with isLatest flag.
- **Mem0**: paper claims consolidation, but no published correction/conflict mechanics.

The **strong invalidation** pattern — detecting life-state changes and surfacing user-ask rather than silently changing — is implemented in consolidation/worker.py and ships as a first-class review flow (CHANGELOG: "surface strong invalidation review flow"). Still not found in any other surveyed system.

### 2.6 Identity and preference handling

| System | Identity surface | Inference from observation | User confirmation gate | Poisoning defense |
|---|---|---|---|---|
| **shisad (v0.7.0)** | Always-loaded, trust_elevated only, ~750 tok default | ✅ identity_candidates.py pattern detector, promotion/reject/expire in manager.py | ✅ agent-proposes-user-approves | ✅ IDENTITY_BLOCKED_SOURCE_ORIGINS excludes external_message / tool_output / consolidation_derived; instruction-like rejected |
| **Claude Code** | MEMORY.md index always loaded | ⚠️ background extraction | ⚠️ prompt-enforced | ⚠️ exclusion list |
| **Codex** | memory_summary.md always loaded | ⚠️ Phase 1 extraction | ❌ | ⚠️ minimum signal gate |
| **MIRA-OSS** | Portrait synthesis from collapsed summaries | ✅ assessment-anchored user model with critic | ⚠️ Haiku critic only | ⚠️ auto-extract |
| **Letta** | Memory blocks (persona/human) | ❌ agent-managed | ❌ | ❌ |

shisad's identity candidate lifecycle is the most carefully designed preference-inference mechanism in the survey and is the one dimension where v0.7.0's code matches the plan exactly.

### 2.7 Procedural memory

| System | Mechanism | Install gating | Invocation model | Safety |
|---|---|---|---|---|
| **shisad (v0.7.0)** | skill/runbook/template entry types; `invocation_eligible` flag | ✅ user confirmation or PEP-approved via is_invocation_eligible_triple | User-requested `/skill <id>` via invoke_skill, no re-confirmation | ✅ invocation_eligible ⊥ trust_band; pending-review queue for suggested skills |
| **Codex** | SKILL.md + scripts/ + templates/ + examples/ | ⚠️ creation criteria in MEMORY.md | `/skill <id>` | ⚠️ no explicit install gate |
| **Hermes Agent** | SKILL.md with YAML frontmatter, progressive disclosure | ⚠️ prompt-enforced | Slash command | ⚠️ prompt-enforced |
| **Karta** | Entity profiles from consolidation dreams | N/A | N/A | N/A |

shisad is the only system that formally separates install-time authorization from invocation-time execution for procedural memory, and the only system where invocation eligibility is orthogonal to the general trust axis — enforced in code by `is_invocation_eligible_triple`.

### 2.8 Active Attention (executive-assistant features)

shisad is the only system in the survey with a **first-class Active Attention surface**, and v0.7.0 ships a real compiler: `build_active_attention_pack` filters on workflow_state ∈ {active, waiting, blocked}, respects scope_filter and channel_binding, and class-balances across 5 entry types (`waiting_on`, `scheduled`, `recurring`, `open_thread`, `inbox_item`) within a 750-token budget.

### 2.9 Evaluation and adversarial testing

| System | Benchmark coverage | Adversarial track | Concrete metrics |
|---|---|---|---|
| **shisad (v0.7.0)** | Adapters **not yet** in repo (LoCoMo/LongMemEval/EverMemBench/StructMemEval/LoCoMo-Plus/BEAM+LIGHT planned) | ⚠️ minimal — 3 poisoning cases in tests/adversarial/memory/; M6 gate tracks utility_retention only | ⚠️ AdversarialMetrics dataclass tracks utility_retention; ISR/ASR/downstream-harm not yet wired |
| **Karta** | BEAM 100K (57.7%, 243 failure catalog) | ❌ | ✅ per-ability breakdowns |
| **OpenClaw** | 60-query benchmark | ❌ | ⚠️ |
| **Gigabrain** | memorybench harness + 12 tests | ❌ | ⚠️ |
| **Claude Code** | Internal evals with case IDs | ❌ | ✅ (internal, not public) |
| **Codex** | Citation-based usage tracking | ❌ | ✅ comprehensive telemetry |

This is the **honest downgrade** from the prior analysis: the plan specified six benchmark adapters and a multi-metric adversarial track, but what shipped in v0.7.0 is the substrate + surfaces + trust model, with evaluation breadth deferred. The adversarial track has the scaffolding (`AdversarialMetrics`, `ci_gate`, `m6_adversarial_metrics.py`) and a `poisoning_cases.json` fixture, but the fixture is 3 cases and the metric is utility-retention with no ISR/ASR decomposition.

Karta's BEAM 100K results remain the most transparent actual measurement in the survey.

## Stage 3 — Evaluative (strengths, gaps, risks)

### 3.1 Where shisad is ahead of the field (now verified in code)

1. **Trust formalism with anti-laundering guarantees — shipped.** `IngressContext` with SHA-256 content-binding + `DerivationPath` + `validate_binding` is a genuine security primitive not found in any other system. The "valid handle reused for unrelated content" attack is closed at the API boundary.

2. **Instruction/data boundary as architecture invariant — shipped.** `MemoryManager._INSTRUCTION_PATTERNS` + `_PREFERENCE_PREDICATE_PATTERN` + `_DISALLOWED_PREFERENCE_PREFIXES` enforce the "preferences are data predicates, not behavioral directives" rule in code. The Identity surface double-enforces via `IDENTITY_BLOCKED_SOURCE_ORIGINS`.

3. **Storage vs access separation — shipped.** One SQLite substrate, five surface compilers, each with its own filter set and budget. Cleanest storage/access separation in the survey, and the code matches the design.

4. **Strong-invalidation UX — shipped.** Detection in consolidation/worker.py emits `StrongInvalidationProposal` rather than mutating the target; a review flow surfaces the user ask. CHANGELOG: "surface strong invalidation review flow".

5. **Consolidation cannot upgrade trust — enforced by matrix.** The `(consolidation_derived, consolidation, auto_accepted)` row is hard-coded to `untrusted` with `confidence_mode="inherit_weighted"`. No code path can bypass this because `trust_band` is derived, not stored.

6. **Cross-scope contamination closed at write API — shipped.** Scope is bound to the `IngressContext` at mint time; cross-scope access happens at read time via scope filters in the Active Attention pack and the Recall pack.

### 3.2 Where other systems still have useful patterns shisad lacks

1. **Embedding-based query classification** (Karta): 6 query modes via prototype centroids controlling top_k/recency/multi-hop. shisad's retrieval doesn't adapt behavior to query type.
2. **Cross-encoder reranking with abstention** (Karta): raw relevance scores with abstention gate. shisad's effective_rank is multiplicative but doesn't specify a reranker or abstention threshold.
3. **Dream/inference engine creating new knowledge** (Karta): shisad's consolidation is maintenance-focused (dedup, merge, decay, conflict detection), not inference-focused. This is arguably the right safety call (consolidation can't upgrade trust), but means implicit connections aren't discovered without explicit user or retrieval interaction.
4. **Progressive local retrieval** (ByteRover CLI): five tiers from exact cache through full agentic retrieval. shisad goes straight to hybrid search without exhausting cheaper retrieval paths first.
5. **Forked-agent extraction with prompt cache sharing** (Claude Code): shisad's extraction is synchronous in the consolidation worker and doesn't currently share cache with the main agent.
6. **Complete citation→usage→retention feedback loop** (Codex): shisad has `citation_count` / `last_cited_at` + `record_citations` (manager.py:832), but the full loop from agent-emitted citation markers through usage-based Phase 2 selection and pruning is not yet wired.
7. **Multimodal memory ingestion** (Google Always-On Memory Agent): shisad is text-only.

### 3.3 Risks and open questions (refreshed for v0.7.0)

1. **Benchmark gap.** The biggest honest delta. The 2026-04-21 plan specified six benchmark adapters + an adversarial ISR/ASR/downstream-harm track. v0.7.0 shipped the substrate but not the benchmark adapters; the adversarial track has minimal fixtures. **No running benchmark numbers yet**, so the "most security-complete" claim is architectural, not empirical — this remains the single largest evaluation gap.

2. **Recall-surface annotation rewire is incomplete.** `build_recall_pack` currently wraps the ingestion stack's `RetrievalResult`; it does not yet reshape results into the per-entry annotated MemoryPack the plan specified (trust-tier annotation, staleness caveats, conflict surfacing, archive auto-widen). The data is all present on entries; the compiler doesn't yet project it. Visible in the `M2 Recall rewire` commit scope.

3. **`observed` trust band is gated off.** `validate_trust_triple` downgrades observed to untrusted unless `enable_observed=True`. In v0.7.0 the operative bands are elevated/untrusted. The 2-band operating point is simpler and safer, but it also means owner-observed signals aren't differentiable from other untrusted content at retrieval time until v0.7.1+.

4. **Consolidation scheduling is implicit.** The worker is scheduler-agnostic; the multi-timescale cadence (fast per-session / medium daily-weekly / slow monthly-quarterly) depends on how the daemon invokes it. The sandboxed capability scope is the load-bearing safety property; cadence is still a tunable rather than a contract.

5. **PEP handle mechanism complexity.** The ingress_context handle with content-binding verification is the right design and is implemented, but every new ingress path must correctly mint handles. `mint_explicit_user_memory_ingress_context` covers CLI/connector user turns; other ingress paths (tool output, web fetch, consolidation) each have their own mint sites that need to stay correct as the system evolves. The attack surface is the handle-minting code.

6. **Identity candidate UX at scale is untested.** The lifecycle is implemented, but with multi-channel presence (CLI + Discord + Slack + Matrix), the observation pipeline could create large candidate volumes. Tunable thresholds help (`N_candidate`, `M_surface`); real UX tuning data is not yet in the repo.

### 3.4 Delta vs previous analysis

The 2026-04-22 analysis characterized shisad as "design-complete, implementation in progress, six milestones scoped". The v0.7.0 release-content commit (2026-04-23) closes that gap on:

- Substrate + surfaces architecture (code in `memory/surfaces/`)
- Trust matrix + PEP handles (code in `memory/trust.py`, `memory/ingress.py`)
- Pending-review queue + identity candidate lifecycle (code in `memory/manager.py` + `memory/identity_candidates.py`)
- Procedural memory install/invocation separation (code in `memory/manager.py` + `memory/surfaces/procedural.py`)
- Sandboxed consolidation worker (code in `memory/consolidation/worker.py`)
- Derived knowledge graph (code in `memory/graph/derived.py`)
- Append-only event trail (code in `memory/events.py`)
- Legacy backfill without offline migration (code in `trust.py` + `schema.py` + `remap.py`)

The gaps vs the plan at v0.7.0 are:
- Benchmark adapters (LoCoMo/LongMemEval/etc.) — not yet in repo
- Adversarial track breadth (ISR/ASR/downstream-harm) — scaffolding only
- Observed trust band — defined but gated off
- MemoryPack annotation rewire — data plumbed, compiler not yet projecting

## Stage 4 — Summary assessment

### What this system is

The most architecturally ambitious and security-conscious agentic memory design in our survey, now with running code for the substrate + surfaces + trust matrix + governance primitives. It is still the only system that treats memory as a full data-engineering + security-invariant + information-retrieval problem simultaneously, rather than optimizing one axis (utility, convenience, or security) at the expense of the others.

The v0.7.0 release closes the plan-to-production gap for the architectural claims: trust formalism, PEP-minted ingress handles, identity candidate lifecycle, procedural install/invocation separation, sandboxed consolidation, and strong-invalidation UX are all in code and exercised by unit/integration tests.

### What it is not (yet)

A benchmarked system. The evaluation plan (six benchmark adapters, multi-metric adversarial track with ISR/ASR/downstream-harm) is specified but not yet exercised — the adversarial track's poisoning fixture is 3 cases and the M6 gate tracks utility-retention only. Until benchmark adapters land and adversarial metrics are decomposed, the "most security-complete" claim is architectural, not empirical.

The Recall surface is also partially rewired: MemoryPack-level annotations (trust tier, staleness, conflict, archive widening) are designed and the underlying data is all present, but `build_recall_pack` does not yet project them into the per-entry view.

### Where it sits in the landscape

If OpenClaw is the engineering-first reference and Karta is the inference-first reference, shisad remains the **governance-first reference** — the system to study when asking "how do you make memory safe under adversarial conditions while keeping it useful for a production assistant?" The v0.7.0 release makes this a runnable reference rather than a design document.

The executive-assistant product stance ("know the user, know what's on the desk") continues to position it differently from coding-agent-focused systems (Claude Code, Codex, ByteRover). shisad is designing for a broader interaction surface (multi-channel, multi-modal intent) where trust and provenance matter more because the agent has more capability and more attack surface.

## Corrections & Updates

- 2026-04-25: Revised to reflect shisad v0.7.0 release content (CHANGELOG 2026-04-23). Shifts framing from "design-complete, implementation in progress" to "v0.7.0 shipped" with specific file references into `src/shisad/memory/` (trust.py, ingress.py, schema.py, manager.py, events.py, surfaces/*, consolidation/worker.py, graph/derived.py, backend/sqlite.py). Honest gaps called out: benchmark adapters not yet in repo; adversarial track minimal (3 poisoning cases, utility_retention-only metric); observed trust band defined but gated off; Recall surface wraps existing ingestion results without yet projecting full per-entry MemoryPack annotations. Matrix rule count revised from "16-row" (plan) to "14 rules in code" (actual `_VALID_TRUST_MATRIX` entries) plus pending-review sentinel. Trust bands revised to "2 operative (elevated/untrusted) + observed defined but gated off".
- 2026-04-22: Initial analysis based on PLAN-longterm-memory.md 2026-04-21 revision (storage/surfaces split; trust model; executive-assistant design; Path A v0.7.0 scope).
