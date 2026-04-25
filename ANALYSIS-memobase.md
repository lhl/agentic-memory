---
title: "Analysis — Memobase (memodb-io)"
date: 2026-04-25
type: analysis
system: Memobase
source: https://github.com/memodb-io/memobase
local_clone: vendor/memobase
version: "commit 358c16bb (2026-01-11), v0.0.40+"
related:
  - ANALYSIS.md
  - ANALYSIS-arxiv-2604.21748-structmem.md
  - ANALYSIS-arxiv-2504.19413-mem0.md
  - ANALYSIS-arxiv-2501.13956-zep.md
  - REVIEWED.md
tags:
  - agentic-memory
  - user-profile
  - conversational-memory
  - locomo
  - postgres
  - pgvector
  - fastapi
  - production
---

# Analysis — Memobase (memodb-io)

Deep analysis of **Memobase**, an open-source user-profile-based memory system competing in the Mem0/Zep design space. Source: `vendor/memobase` (commit `358c16bb`, 2026-01-11).

## TL;DR

- **Profile-centric, not session-centric.** Memobase stores user attributes in a **typed 8-topic / ~40-slot taxonomy** (`basic_info`, `contact_info`, `education`, `demographics`, `work`, `interest`, `psychological`, `life_event`), each with 3-7 sub-topics. This is a structured *ontology*, not a bag of notes. Extraction is schema-driven and can be run in strict mode (reject off-schema topics) or free mode. Config-customizable per project.
- **Cold-path batch architecture.** Insertion goes into a `BufferZone` (idle/processing/done/failed status); when buffer `token_size > 1024` (default), flush triggers exactly **three** LLM calls: entry summary → topic extraction → YOLO merge (`src/server/api/memobase_server/controllers/modal/chat/__init__.py:38-118`). The README's "40-50% token reduction" is real — v0.0.40 collapsed a 3-10 call loop into a fixed 3-call pipeline (Changelog 2026-01).
- **Reads do not touch an LLM by default.** `User.context()` is pure SQL + pgvector (`controllers/context.py:115-222`), Redis-cached profiles (20-min TTL), and pre-computed event gist embeddings. The "sub-100ms" latency claim is architecturally plausible but not empirically benchmarked in the repo.
- **Dual memory streams.** Mutable `UserProfile` rows (consolidated facts) + immutable `UserEvent` timeline with `UserEventGist` fine-grained gists for search. The event timeline preserves timestamps and `profile_delta` payloads, which appears to drive Memobase's **85.05% LoCoMo temporal** (best-in-table; beats Zep's 67.71, Mem0's 55.51).
- **Real LoCoMo artifacts.** `docs/experiments/locomo-benchmark/` ships the prediction JSON, LLM-judge outputs, and score-aggregation script — the 75.78 overall / 85.05 temporal / 70.92 multi-hop / 77.17 open-domain numbers are reproducible from repo artifacts (not just README claims).
- **Production stack.** FastAPI + Postgres + Redis + pgvector, Docker-deployable, Apache-2.0. Python/TypeScript/Go SDKs + MCP integration. Telemetry + token-quota billing table.
- **No provenance, no versioning, no trust labels.** Profile updates are in-place. Profiles don't carry a `source_blob_id`. `update_hits` counter tracks merge frequency but there's no supersedes chain. Temporal conflicts are handled by LLM judgment in the YOLO merge prompt, not by explicit validity intervals.

## What's novel

1. **Typed user-profile ontology with per-project customization.** The schema lives in `src/server/api/memobase_server/prompts/user_profile_topics.py:9-78`: 8 topics × ~5 sub-topics with natural-language descriptions and typing hints (e.g., `age: "integer"`). Customizable via `project.profile_config`. Strict mode (`extract.py:39`) rejects off-schema topics. This is closer to a structured user-model schema than a free-form memory store — contrast Mem0's flat memory list or Zep's entity/fact graph.
2. **YOLO merge.** `controllers/modal/chat/merge_yolo.py:14-186` batches every extracted fact into a single merge prompt; the LLM decides `APPEND` / `UPDATE` / `ABORT` per fact in one call. Conflict detection ("if supplementary info conflicts with current memo, UPDATE") is prompt-encoded, not validity-interval-encoded. This is the primary cost optimization.
3. **Profile/event dual channels.** Profiles = consolidated, mutable, in-place-updated. Events = append-only timeline with per-event gists stored separately (`UserEventGist` added in v0.0.37). At retrieval, `context.py` returns a markdown payload with `## User Background:` (profiles) + `## Latest Events:` (time-filtered gists). The split is deliberate: profiles answer "who are they", events answer "what happened recently".
4. **Project-scoped multi-tenancy with bearer-token routing.** Every table composite-key includes `project_id`; API keys are `sk-proj-{random}` parsed by middleware. Clean production-multi-tenant shape — stronger than most OSS memory stacks in the survey.
5. **3-fixed-call pipeline documented by version number.** The Changelog explicitly records the 3-10 → 3 reduction at v0.0.40. Version-controlled cost math is rare in this space.

## System overview

### Storage substrate

Five tables in `src/server/api/memobase_server/models/database.py`:

| Table | Role | Key fields |
|---|---|---|
| `GeneralBlob` (lines 286-343) | Raw inserted payloads | `blob_type`, `blob_data` (JSONB), timestamps |
| `BufferZone` (lines 346-416) | Staging for batch flush | `blob_id` FK, `token_size`, `status` enum |
| `UserProfile` (lines 419-456) | Consolidated user attributes | `content` (TEXT), `attributes` JSONB (`topic`/`sub_topic`), `update_hits` |
| `UserEvent` (lines 459-512) | Append-only timeline | `event_data` JSONB (`event_tip`, `event_tags`, `profile_delta`), `embedding` (pgvector) |
| `UserEventGist` (lines 515-587) | Fine-grained event gists | `gist_data` JSONB, `embedding` (pgvector) |

Ancillary: `User` (242-283), `Billing` (126-238) for token-quota enforcement.

Raw blobs are deleted post-flush unless `persistent_chat_blobs=True` (`controllers/buffer.py:211-215`). Events are permanent; gists are permanent.

### Write path

1. `POST /blobs/insert/{user_id}` with a `ChatBlob(messages=[...])` → inserts into `GeneralBlob`, adds a `BufferZone` row with status=`idle` and `token_size`.
2. Buffer-overflow check (`buffer.py:66-94`): if `buffer.token_size > CONFIG.max_chat_blob_buffer_token_size` (default 1024 tokens), flush.
3. Flush modes:
   - **Sync** (`wait_process=True`): blocks the response.
   - **Async** (default): enqueue to Redis; background worker processes (`buffer_background.py:40-276`).
   - **Manual**: `user.flush(sync=True)` SDK call.
   - **Time-based**: the README mentions "1 hour idle" but there is no cron/scheduler in the repo — time-based flush relies on external orchestration.
4. Flush runs exactly three LLM calls (`controllers/modal/chat/__init__.py:38-118`):
   - **Entry summary** (`entry_summary.py:15-60`): summarize all buffered blobs into a markdown `user_memo_str`.
   - **Extract topics** (`extract.py:26-114`): few-shot prompt extracts `topic::sub_topic::memo` triples using the project's topic schema.
   - **YOLO merge** (`merge_yolo.py:14-186`): one prompt, all facts, per-fact `APPEND`/`UPDATE`/`ABORT`.
5. Event processing runs in parallel (`__init__.py:75-82`, `asyncio.gather`): tags the events (`event_summary.tag_event`) without adding LLM calls (reuses `user_memo_str`).
6. `UserEvent.event_data.profile_delta` records which facts were added/updated by this flush — useful for audit but not linked back from `UserProfile` rows.

### Extraction

Schema lives in `src/server/api/memobase_server/prompts/user_profile_topics.py:9-78`. Eight topics with descriptions and sub-topics, e.g.:

```python
"work": {
    "company": "Current employer",
    "title": "Job title or position",
    "working_industry": "Industry",
    "previous_projects": "Notable past work",
    "work_skills": "Skills and competencies",
}
```

Extraction prompt (`prompts/extract_profile.py`) includes few-shot examples and a psychologist persona; temperature 0.2. Output is a markdown list `- topic::sub_topic::memo` parsed by `parse_string_into_profiles` in `prompts/utils.py`.

Schema can be strict (`extract.py:39`) — off-schema topics rejected — or permissive, where the LLM can invent topics. Customization is per-project via `project.profile_config`.

### Read path

`User.context(max_token_size=1000, prefer_topics=[], only_topics=[], chats=[])` → markdown string. Pipeline (`controllers/context.py:115-222`):

1. **Profile retrieval** (`get_user_profiles_data`, 31-83):
   - Fetch profiles from Redis cache (`profile.py:75-117`, TTL 20min) or DB.
   - **Chat-conditioned filter**: if `chats` is provided, `filter_profiles_with_chats` uses an LLM to select relevant topics (the one LLM call on the read path, and only when `chats` is passed).
   - **Truncate**: sort by `updated_at`, prioritize `prefer_topics`, cap by token budget.
2. **Event retrieval** (`get_user_event_gists_data`, 86-112):
   - If `chats` + embeddings enabled: embed last 3 chat messages → cosine search `UserEventGist` (pgvector).
   - Else: latest 60 gists by timestamp.
   - Filter by `time_range_in_days` (default 21).
3. **Pack** (`context.py:204-221`): emit markdown:

```
# Memory
## User Background:
- topic::sub_topic: content
...
## Latest Events:
- event gist content
...
```

Latency architecture: no LLM on the default read path, Redis-cached profiles, pgvector on events, no joins. Sub-100ms is plausible on a tuned Postgres; repo has no latency benchmark.

### Consolidation / conflict / versioning

All consolidation happens inside YOLO merge (`controllers/modal/chat/merge_yolo.py`):

- **APPEND**: add `;`-separated clause to existing profile content.
- **UPDATE**: LLM rewrites the entire profile content string.
- **ABORT**: discard (off-topic, redundant).

Conflict handling is entirely prompt-driven. The prompt (lines 31-41) instructs the model to handle supplementary-conflict-with-current cases, with a worked temporal example ("midterm → final exams", line 105). There's no code-level dedup, no embedding-similarity dedup, no validity interval.

Extra passes:
- `controllers/modal/chat/organize.py` (called at `__init__.py:156-166`): re-categorize after merge.
- `controllers/modal/chat/summary.py` (called at `__init__.py:169-180`): condense a profile if it exceeds a token threshold.

**Versioning: none.** No snapshot table. Profiles update in-place. `update_hits` counter exists but isn't a DAG. Events preserve history via the append-only timeline; `profile_delta` on each event records that flush's changes but without back-pointers from profile rows.

**Forgetting: none at profile level.** Events have a `time_range_in_days` retrieval filter (default 21) but are not deleted.

### Trust / provenance

None. Profiles don't carry source-blob IDs. No confidence scores. No taint labels. No adversarial-prompt rejection (no "ignore prior instructions" gate). Validation mode (`merge_yolo.py:34-38`, `CONFIG.profile_validate_mode`) only checks schema alignment. Strict mode blocks off-schema topics but not instruction-like content.

### Multi-tenancy

Strong project-scoped isolation:
- Every table composite-key includes `project_id` (VARCHAR 64).
- API keys `sk-proj-{random}` (auth/token.py:12-19); middleware extracts `project_id` and injects into request state.
- All controller queries filter by `project_id`.
- `Billing` table tracks per-project `usage_left` (token quotas); insertion checks quota.

### LoCoMo evidence

`docs/experiments/locomo-benchmark/README.md` documents the evaluation. The evaluation uses the **Locomo10** dataset (900 turns, 1540 questions across 4 categories). Artifacts shipped:
- `fixture/memobase/memobase_eval_0710_3000.json` — predicted answers.
- `results_0710_3000.json` — LLM-judge scores.
- `generate_scores.py` — aggregation script (BLEU / F1 / LLM-judge).

Reported numbers (Memobase v0.0.37, Changelog 2026-07-15):

| Method | Single-hop | Multi-hop | Open-domain | Temporal | Overall |
|---|---|---|---|---|---|
| **Memobase** | 70.92 | 46.88 | 77.17 | **85.05** | **75.78** |
| Mem0 | 67.13 | 51.15 | 72.93 | 55.51 | 66.88 |
| Zep | 61.70 | 41.35 | 76.60 | 49.31 | 65.99 |

These match the numbers that the StructMem paper (`ANALYSIS-arxiv-2604.21748-structmem.md`) reproduces in its Table 1, which is reassuring triangulation. Memobase's **temporal dominance** (85.05 vs Mem0 55.51) is the most striking result — consistent with its timeline-preserving event model and time-annotated merge prompts.

**Caveat**: LoCoMo only. No LongMemEval, EverMemBench, or StructMemEval evidence.

### API surface (client SDK)

`src/client/memobase/`:
- **Client**: `MemoBaseClient(api_key, project_url)`, `add_user`, `get_user`, `delete_user`.
- **User write**: `insert(ChatBlob(messages=[...]))`, `flush()`, `add_profile(content, topic, sub_topic)`.
- **User read**: `profile(max_token_size, prefer_topics, only_topics, chats)`, `event(topk, need_summary)`, `context(max_token_size, chats)`, `search_event(query)`, `search_event_by_tags`.
- **User modify**: `update_profile`, `delete_profile`, `update_event`.

Also TypeScript (`@memobase/memobase` on npm) and Go (`pkg.go.dev`).

## Comparative position

### vs Mem0 (`arxiv:2504.19413`)

Both target "long-term conversational memory for LLM apps", both ship SDKs. Memobase is **structured-profile-first**, Mem0 is **fact/memory-flat-first**. Memobase extracts into a predefined topic schema; Mem0 stores free-form memory entries with optional graph edges. Memobase wins LoCoMo overall 75.78 vs Mem0 66.88 (per Memobase's own eval; also independently reported in StructMem's Table 1). Mem0 has more LLM calls on the write path (per-message extraction); Memobase's buffer-and-batch architecture drops to 3 calls per flush.

Memobase is missing Mem0's explicit ADD/UPDATE/DELETE/NOOP op semantics — its merge outcomes are APPEND/UPDATE/ABORT, with delete-equivalent being the extraction abort, not a user-facing op.

### vs Zep (`arxiv:2501.13956`)

Zep's Graphiti uses a **bi-temporal knowledge graph** with validity intervals. Memobase has no KG, no validity intervals, no temporal edges — its "temporal" capability comes from appending timestamps into profile content strings and filtering events by `time_range_in_days`. Despite this, Memobase beats Zep on LoCoMo temporal by ~35pp (85.05 vs 49.31) and on LoCoMo overall by ~10pp. This is a useful empirical counter-argument to "you need a proper temporal KG for temporal reasoning" — Memobase shows that time-annotated profile strings + event timelines + chat-conditioned retrieval can cover a lot of LoCoMo temporal ground.

### vs Supermemory

Similar production-SaaS framing (FastAPI/Postgres, multi-tenant), but Supermemory's core engine is closed-source while Memobase ships everything. Supermemory has explicit version chains and typed relationships (`updates`/`extends`/`derives`); Memobase has neither. Supermemory exposes a static/dynamic profile synthesis API endpoint; Memobase's `context()` is the functional equivalent but returns a packed markdown string rather than structured JSON.

### vs MIRA-OSS

Both have a structured user model. MIRA's "user model synthesis" uses a critic-validated synthesis loop and a textual-LoRA directive injection system. Memobase is simpler — no critic, no textual-LoRA, no sub-agent forage — but also much smaller and more deployable. MIRA covers richer tool surface and behavioral adaptation; Memobase covers persistent user profiles cleanly.

### vs Claude Code / Codex (first-party)

Both first-party systems use MEMORY.md / memory_summary.md as always-loaded context. Memobase's `User.context()` is conceptually the same surface (a packed markdown payload injected into the prompt), but Memobase generates the payload on-demand from a live DB rather than a file. The first-party systems have no explicit user-profile schema — they use free-form typed memories (Claude Code: user/feedback/project/reference; Codex: MEMORY.md handbook) that aren't ontology-driven.

## Strengths

1. **Schema-first user modeling is legible and debuggable.** You can inspect a user row and see `work::company = "Acme Corp; Bigco [mentioned 2025/05]"`. This is dramatically easier to audit than a 200-entry flat memory list.
2. **Cold-path batch architecture is cost-predictable.** 3 LLM calls per flush, regardless of conversation length. Token budgets become straightforward: `flush_calls = ceil(total_tokens / 1024)`, cost per call ≈ (prompt schema + buffered conversation + profile state).
3. **LoCoMo artifacts are reproducible.** The JSON predictions and judge outputs ship in the repo; anyone can re-score independently. Stronger claim-hygiene than most OSS memory systems.
4. **Production shape.** Project-scoped auth, Redis caching, pgvector indexes, Postgres-native, Docker. Apache-2.0.
5. **Temporal reasoning without a KG.** The 85.05 LoCoMo temporal from string-embedded timestamps + event timelines is an interesting empirical data point — it suggests that a lot of "temporal reasoning" in LoCoMo can be answered from a simpler substrate than Zep-style bi-temporal KGs.

## Gaps and risks

1. **No versioning / no supersede chains.** Profile updates are destructive. An incorrect merge is permanent unless the user manually reconstructs from the event timeline (which *does* preserve history via `profile_delta`, but has no back-pointer from the profile row).
2. **No provenance.** You cannot trace `work::title = "Engineering Manager"` back to the conversation it was extracted from without scanning the event timeline for matching `profile_delta` payloads. For an enterprise/compliance use case, this is a blocker.
3. **No trust/taint labels.** External-message content (Discord, Slack, emails ingested as chat) extracts into profiles with no provenance or trust band. An adversarial participant's messages could write elevated-trust user attributes.
4. **Instruction-like content isn't rejected.** Nothing in the merge prompt filters directives ("always prioritize speed over safety" as a preference). Strict-topic mode helps by constraining to schema topics, but directive-shaped *content* within a valid topic is not rejected.
5. **Conflict resolution is entirely LLM-judgment.** No validity intervals, no embedding-based dedup, no code-level quorum logic. Correctness depends on prompt robustness in the YOLO merge.
6. **One benchmark.** Only LoCoMo. No LongMemEval, EverMemBench, StructMemEval, or BEAM numbers. Temporal dominance on LoCoMo doesn't automatically transfer to multi-party or very-long-scale settings.
7. **"Sub-100ms" is architectural, not measured.** Plausible on a tuned DB; not proven by a benchmark in the repo.
8. **No scheduler for idle-flush.** The README implies time-based flushing; the repo has no cron. External orchestration (or manual `flush()` calls) is required.

## Verdict

Memobase is **worth promoting to the main `ANALYSIS.md` comparison matrix.** It has:
- A genuinely distinct design point (typed user-profile ontology + cold-path batch).
- Real, reproducible LoCoMo numbers that position it competitively with Zep and above Mem0 on overall.
- A striking temporal result (85.05) that challenges the "you need a temporal KG" assumption.
- Production-shaped implementation (multi-tenant, telemetry, SDKs).
- Apache-2.0 open-source with real commit activity.

Gaps (no versioning, no provenance, no trust labels) are typical of the OSS memory-layer category — they don't disqualify promotion, they define where shisad's safety model would add value if we were to wrap Memobase-style schema extraction in shisad's trust/ingress layer.

### What we'd steal

1. **Typed user-profile ontology (8 topics, ~40 slots, config-customizable).** Maps cleanly onto shisad's Identity surface: the schema becomes a persona_fact/preference/soft_constraint taxonomy. Memobase's topic system could seed shisad's Identity candidate detector.
2. **Buffer-and-batch extraction (cold path, 3 LLM calls per flush).** shisad's consolidation worker could adopt this exact pattern — buffer until `token_size > threshold`, then run entry-summary → extract → merge in a single bounded pipeline. Cost-predictable.
3. **YOLO merge as a design pattern.** Single prompt, per-fact decision. In shisad we'd write the merge output as `source_origin=consolidation_derived`, making consolidation cheaper without upgrading trust.
4. **Dual profile/event channels.** Profiles = Identity surface, events = Recall/Episodic tier. This is already approximately shisad's model but Memobase is a clean reference for how to keep them in sync.
5. **Reproducible benchmark artifacts shipped in-repo.** Strong hygiene pattern; shisad's M6 should do the same.

### Where shisad's model is stronger

1. **Provenance + trust model.** Memobase cannot answer "where did this preference come from?". shisad's `ingress_handle_id` on every write closes this.
2. **Supersedes chains.** Memobase updates in place; shisad's versioning preserves prior values with supersedes links.
3. **Instruction-like rejection.** Memobase's merge prompt accepts directive-shaped profiles; shisad's `_INSTRUCTION_PATTERNS` rejects them.
4. **Identity candidate lifecycle.** Memobase's extraction is one-shot per flush. shisad's observation → corroboration → agent-proposes-user-approves adds a safety gate that Memobase lacks.

## Corrections & Updates

- 2026-04-25: Initial analysis against commit `358c16bb` (2026-01-11). LoCoMo numbers verified against shipped artifacts in `docs/experiments/locomo-benchmark/`. Cross-checked against StructMem paper (arXiv:2604.21748) Table 1.
