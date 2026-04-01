---
title: "Analysis — Codex Memory Subsystem (OpenAI, from source)"
date: 2026-03-31
type: analysis
system: Codex (CLI coding agent)
source: /home/lhl/Downloads/codex/codex-rs/core/src/memories/
source_repo: https://github.com/openai/codex
related:
  - ANALYSIS.md
  - REVIEWED.md
  - ANALYSIS-claude-code-memory.md
---

# Analysis — Codex Memory Subsystem

Deep-dive analysis of the memory subsystem in **Codex** (OpenAI's open-source coding agent CLI), based on a thorough source code review of the Rust core (`codex-rs/core/src/memories/`) and prompt templates (`codex-rs/core/templates/memories/`). This is a **first-party, open-source** memory system — the only system in our survey built by a frontier model provider and published as open source with full implementation details.

## TL;DR

- **Two-phase async pipeline** — Phase 1 (gpt-5.1-codex-mini, reasoning=Low, 8-way parallel) extracts per-rollout memories → Phase 2 (gpt-5.3-codex, reasoning=Medium, single global job) consolidates into a progressive-disclosure file hierarchy.
- **SQLite-backed distributed job coordination** — ownership tokens, leases (1h), heartbeats (90s), watermarks, retry backoff. Multi-worker safe without external infrastructure.
- **Progressive disclosure memory layout** — `memory_summary.md` (always loaded, ~5K tokens) → `MEMORY.md` (grep-based handbook) → `rollout_summaries/` (per-rollout evidence) → `skills/` (procedural memory). Each layer is more detailed and less frequently accessed.
- **Skills as procedural memory** — `SKILL.md` with YAML frontmatter + `scripts/` + `templates/` + `examples/`. Extracted from recurring patterns (repeats > 1). First system in our survey to treat learned workflows as memory artifacts.
- **Usage-based retention** — `usage_count` and `last_usage` tracking per memory. Phase 2 selection ranks by usage, not just recency. Unused memories pruned after configurable `max_unused_days`.
- **Incremental update with thread-diff forgetting** — Phase 2 receives a selection diff (added/retained/removed thread IDs). Removed threads trigger targeted memory cleanup. Evidence for removed threads preserved during the transition.
- **Memory citation tracking** — `<oai-mem-citation>` XML blocks with citation entries (file:line with notes) and rollout IDs for attribution/debugging. Parsed programmatically for telemetry.
- **~1,400 lines of prompt engineering** — Stage 1 extraction (~570 lines) + Phase 2 consolidation (~836 lines) with detailed signal filtering, task outcome triage, evidence-preservation rules, and wording-preservation requirements.
- **Secret redaction** — All Phase 1 outputs passed through `redact_secrets()` before storage. Developer messages and memory-excluded content stripped from rollout data.
- **No vector search, no knowledge graph, no LLM-based query-time selection** — retrieval is keyword grep over MEMORY.md + progressive file access. Read path is simpler than Claude Code's Sonnet selector.

## Stage 1 — Descriptive (what is implemented)

### 1.1 Architecture overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     CODEX MEMORY PIPELINE                               │
├─────────────────────────────────────────────────────────────────────────┤
│  STARTUP TRIGGER                                                        │
│  ├── Root session starts (not ephemeral, not subagent, DB available)    │
│  ├── Feature gate: Feature::MemoryTool                                  │
│  └── Spawns tokio task: prune → phase1 → phase2                        │
├─────────────────────────────────────────────────────────────────────────┤
│  PHASE 1: ROLLOUT EXTRACTION (per-thread, parallel)                     │
│  ├── Claim eligible rollouts from state DB (scan limit: 5,000)          │
│  │   └── Filters: age window, idle hours, lease, source type            │
│  ├── Parallel extraction: 8 concurrent jobs (buffer_unordered)          │
│  │   ├── Load rollout items from disk                                   │
│  │   ├── Filter: strip developer messages, memory-excluded fragments    │
│  │   ├── Truncate to 70% of model context window (150K tokens default)  │
│  │   ├── Send to gpt-5.1-codex-mini (reasoning=Low)                    │
│  │   └── Parse structured JSON: raw_memory + rollout_summary + slug     │
│  ├── Secret redaction on all output fields                              │
│  ├── Store results in state DB (stage1_outputs table)                   │
│  └── Outcomes: SucceededWithOutput / SucceededNoOutput / Failed          │
├─────────────────────────────────────────────────────────────────────────┤
│  PHASE 2: GLOBAL CONSOLIDATION (single job, agent-driven)               │
│  ├── Claim global lock with ownership token                             │
│  │   └── Outcomes: Claimed / SkippedNotDirty / SkippedRunning           │
│  ├── Load phase-2 input selection from DB                               │
│  │   ├── Rank by usage_count, then last_usage/generated_at              │
│  │   ├── Bounded by max_raw_memories_for_consolidation                  │
│  │   └── Exclude memories unused > max_unused_days                      │
│  ├── Compute selection diff: added / retained / removed thread IDs      │
│  ├── Sync filesystem artifacts:                                         │
│  │   ├── raw_memories.md (merged, latest first)                         │
│  │   └── rollout_summaries/ (one file per retained rollout)             │
│  ├── Spawn consolidation sub-agent (gpt-5.3-codex, reasoning=Medium)    │
│  │   ├── Sandbox: no network, local write only, no approvals            │
│  │   ├── Disabled features: SpawnCsv, Collab, MemoryTool (no recursion) │
│  │   └── Heartbeat lease every 90s while agent runs                     │
│  └── On completion: mark success + update watermark + selection flags    │
├─────────────────────────────────────────────────────────────────────────┤
│  READ PATH (runtime, per-query)                                         │
│  ├── memory_summary.md injected into developer instructions (always)    │
│  │   └── Truncated to 5,000 tokens if large                            │
│  ├── Agent reads MEMORY.md via grep (keyword-driven)                    │
│  ├── Agent reads rollout_summaries/ if MEMORY.md points there           │
│  ├── Agent reads skills/ for procedural guidance                        │
│  └── Decision boundary: skip memory for self-contained queries          │
├─────────────────────────────────────────────────────────────────────────┤
│  CITATION TRACKING                                                      │
│  ├── Agent appends <oai-mem-citation> XML to responses                  │
│  ├── Parsed: citation_entries (file:line|note) + rollout_ids            │
│  ├── Rollout IDs converted to thread IDs for usage tracking             │
│  └── usage_count/last_usage updated in stage1_outputs                   │
├─────────────────────────────────────────────────────────────────────────┤
│  STORAGE                                                                │
│  ├── SQLite state DB (persistent job coordination + stage1_outputs)     │
│  │   ├── stage1_outputs: thread_id, raw_memory, rollout_summary,        │
│  │   │   rollout_slug, cwd, git_branch, usage_count, last_usage,        │
│  │   │   selected_for_phase2, selected_for_phase2_source_updated_at     │
│  │   ├── jobs: kind, job_key, status, ownership_token, lease_until,     │
│  │   │   retry_at, input_watermark, last_success_watermark              │
│  │   └── threads: memory_mode column (enabled/disabled)                 │
│  └── Filesystem (~/.codex/memories/)                                    │
│      ├── raw_memories.md          (Phase 1 merged output)               │
│      ├── rollout_summaries/       (per-rollout evidence files)          │
│      │   └── {timestamp}-{hash}[-{slug}].md                            │
│      ├── MEMORY.md                (consolidated handbook)               │
│      ├── memory_summary.md        (always-loaded navigational summary)  │
│      └── skills/                  (procedural memory)                   │
│          └── <skill-name>/                                              │
│              ├── SKILL.md         (entrypoint)                          │
│              ├── scripts/         (executable helpers)                   │
│              ├── templates/       (reusable templates)                   │
│              └── examples/        (worked examples)                      │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 File inventory

**Core memory module** (`codex-rs/core/src/memories/`, ~12 files, ~1,500+ LOC Rust):

| File | LOC | Role |
|------|-----|------|
| `mod.rs` | 116 | Entry point: phase configs (models, concurrency, leases), metrics constants, artifact paths, `ensure_layout()` |
| `phase1.rs` | 620 | Per-rollout extraction: claim jobs, parallel sampling, structured JSON output, secret redaction, metrics |
| `phase2.rs` | 510 | Global consolidation: claim lock, selection diff, spawn sub-agent, heartbeat loop, watermark tracking |
| `start.rs` | 45 | Startup orchestrator: eligibility checks → `prune()` → `phase1::run()` → `phase2::run()` |
| `storage.rs` | 261 | Filesystem sync: rebuild `raw_memories.md`, write/prune rollout summaries, filename derivation |
| `prompts.rs` | 190 | Template rendering: consolidation prompt, stage-1 input, read-path developer instructions |
| `citations.rs` | 90 | Parse `<oai-mem-citation>` XML: extract citation entries + rollout IDs → thread IDs |
| `control.rs` | 34 | `clear_memory_root_contents()` with symlink protection |
| `usage.rs` | 130 | Track memory file reads via tool invocations: emit `codex.memories.usage` metrics |
| `README.md` | 132 | Internal architecture documentation (phases, watermarks, selection diffs) |

**Prompt templates** (`codex-rs/core/templates/memories/`, 4 files, ~1,550 lines):

| File | Lines | Role |
|------|-------|------|
| `stage_one_system.md` | ~570 | Phase 1 system prompt: minimum signal gate, high-signal memory definition, rollout reading order, task outcome triage, raw_memory + rollout_summary output schemas |
| `stage_one_input.md` | ~10 | Phase 1 user message: rollout metadata + content injection |
| `consolidation.md` | ~836 | Phase 2 consolidation prompt: INIT vs INCREMENTAL modes, MEMORY.md format, memory_summary.md format, skills format, thread-diff-based forgetting, evidence deep-dive rules |
| `read_path.md` | ~130 | Runtime injection: decision boundary, quick memory pass, drift verification, citation requirements |

**Database layer** (`codex-rs/state/`, migrations + runtime):

| Component | Role |
|-----------|------|
| `0006_memories.sql` | Creates `stage1_outputs` + `jobs` tables |
| `0009_stage1_outputs_rollout_slug.sql` | Adds `rollout_slug` column |
| `0016_memory_usage.sql` | Adds `usage_count` + `last_usage` columns |
| `0017_phase2_selection_flag.sql` | Adds `selected_for_phase2` flag |
| `0018_phase2_selection_snapshot.sql` | Adds `selected_for_phase2_source_updated_at` + `threads.memory_mode` |
| `model/memories.rs` (~103 lines) | Data models: `Stage1Output`, `Stage1OutputRef`, `Phase2InputSelection`, claim outcome enums |
| `runtime/memories.rs` (~4,624 lines) | Database operations: claim jobs, load inputs, record usage, mark success/failure, prune |

### 1.3 Data model

**SQLite tables:**

```sql
stage1_outputs (
    thread_id         TEXT PRIMARY KEY,       -- FK → threads(id)
    source_updated_at INTEGER NOT NULL,       -- rollout timestamp
    raw_memory        TEXT NOT NULL,           -- Phase 1 extracted memory (markdown)
    rollout_summary   TEXT NOT NULL,           -- Phase 1 compact summary
    rollout_slug      TEXT,                    -- filesystem-safe slug (≤80 chars)
    generated_at      INTEGER NOT NULL,        -- extraction timestamp
    usage_count       INTEGER,                 -- citation-driven access count
    last_usage        INTEGER,                 -- last citation timestamp
    selected_for_phase2 INTEGER DEFAULT 0,     -- was this included in last Phase 2?
    selected_for_phase2_source_updated_at INTEGER  -- snapshot for diff detection
);

jobs (
    kind              TEXT NOT NULL,           -- 'memory_stage1' | 'memory_consolidate_global'
    job_key           TEXT NOT NULL,           -- thread_id or 'global'
    status            TEXT NOT NULL,           -- lifecycle state
    worker_id         TEXT,                    -- claiming worker
    ownership_token   TEXT,                    -- prevents duplicate claims
    lease_until       INTEGER,                 -- lease expiry (1h)
    retry_at          INTEGER,                 -- backoff timestamp
    input_watermark   INTEGER,                 -- dirty tracking
    last_success_watermark INTEGER,            -- completion tracking
    PRIMARY KEY (kind, job_key)
);
```

**Phase 2 selection diff model:**

```rust
Phase2InputSelection {
    selected: Vec<Stage1Output>,           // current top-N by usage
    previous_selected: Vec<Stage1Output>,  // from last successful Phase 2
    removed: Vec<Stage1OutputRef>,         // previously selected, now outside top-N
    retained_thread_ids: HashSet<ThreadId>,// intersection of current and previous
}
```

**Filesystem artifacts:**

- `raw_memories.md` — merged Phase 1 outputs (latest first), with metadata headers (thread_id, updated_at, cwd, rollout_path, rollout_summary_file)
- `rollout_summaries/{timestamp}-{hash}[-{slug}].md` — per-rollout evidence with metadata (thread_id, updated_at, rollout_path, cwd, git_branch) + rollout_summary content
- `MEMORY.md` — consolidated handbook with task groups, user preferences, reusable knowledge, failures
- `memory_summary.md` — always-loaded navigational summary: User Profile (≤500 words), User preferences (bullets), General Tips, What's in Memory (scope→day→topic index)
- `skills/<name>/SKILL.md` — procedural memory with YAML frontmatter

### 1.4 Write path

**Phase 1: Rollout extraction** (asynchronous, parallel, per-rollout)

1. **Startup trigger**: root session start → `start_memories_startup_task()` → tokio::spawn
2. **Prune first**: `phase1::prune()` removes old unused stage-1 outputs (configurable `max_unused_days`, batch size 200)
3. **Claim jobs**: query state DB for eligible rollouts:
   - Source types: `INTERACTIVE_SESSION_SOURCES` only
   - Age window: `max_rollout_age_days`
   - Idle hours: `min_rollout_idle_hours` (avoids summarizing active sessions)
   - Scan limit: 5,000 threads
   - Lease: 1 hour
4. **Parallel extraction**: `futures::stream::buffer_unordered(8)`:
   - Load rollout items from disk (`RolloutRecorder::load_rollout_items`)
   - Filter: strip developer messages, remove memory-excluded contextual fragments
   - Truncate: 70% of model context window (default: 150K tokens)
   - Stream to gpt-5.1-codex-mini (reasoning=Low)
   - Parse structured JSON: `StageOneOutput { raw_memory, rollout_summary, rollout_slug }`
5. **Secret redaction**: `codex_secrets::redact_secrets()` on all three output fields
6. **Persist**: store in `stage1_outputs` table with metadata

**Minimum signal gate** (enforced by Phase 1 prompt):

The extraction prompt contains an explicit decision gate: "Will a future agent behave better because of this?" If the rollout contains only one-off queries, generic updates, temporary facts, obvious knowledge, or no artifacts/preferences, the model returns empty JSON — no memory is created.

**Phase 2: Global consolidation** (asynchronous, single global job, agent-driven)

1. **Claim global lock**: `try_claim_global_phase2_job()` → Claimed / SkippedNotDirty / SkippedRunning
2. **Load inputs**: select top-N from `stage1_outputs` ranked by usage_count → last_usage/generated_at
3. **Compute diff**: compare current selection against `selected_for_phase2` flags → added/retained/removed
4. **Sync filesystem**: write `raw_memories.md` + rollout summaries; prune stale summaries
5. **Spawn sub-agent**: gpt-5.3-codex (reasoning=Medium), sandbox (no network, local write, no approvals), disabled features (SpawnCsv, Collab, MemoryTool)
6. **Heartbeat loop**: tokio::select! between agent status and 90s heartbeat interval
7. **On success**: mark job, update watermark, persist selection flags

### 1.5 Read path

**Progressive disclosure** (designed so agents read the minimum needed):

1. **Always loaded**: `memory_summary.md` injected into developer instructions at session start. Truncated to 5,000 tokens.
2. **Decision boundary** (read_path.md prompt):
   - Skip memory for self-contained queries (time, translation, trivial formatting)
   - Use memory when query mentions workspace/repo in MEMORY_SUMMARY, asks for prior context, is ambiguous
3. **Quick memory pass** (≤4-6 search steps):
   - Step 1: Skim MEMORY_SUMMARY, extract keywords
   - Step 2: Search MEMORY.md using those keywords
   - Step 3: Open 1-2 most relevant rollout_summaries/ or skills/ if MEMORY.md points there
   - Step 4: If need exact evidence, search rollout_path for raw data
   - Step 5: No hits → stop
4. **Drift verification**: the read_path prompt includes guidance on when to verify stale memories vs answering from memory, with a risk/effort trade-off framework

**Citation tracking** (closed-loop usage feedback):

- Agent appends `<oai-mem-citation>` XML block to responses
- Contains `<citation_entries>` (file:line_start-line_end|note=) and `<rollout_ids>` (UUIDs)
- Parsed by `citations.rs` → thread IDs
- `record_stage1_output_usage()` increments `usage_count` and updates `last_usage` in DB
- Usage data feeds back into Phase 2 selection ranking

### 1.6 Maintenance pipeline

**Phase 1 pruning** (pre-extraction):
- `prune_stage1_outputs_for_retention(max_unused_days, PRUNE_BATCH_SIZE=200)`
- Removes memories with no recent usage beyond the configured window
- Runs before every Phase 1 extraction pass

**Phase 2 consolidation** (agent-driven, produces final artifacts):
- INIT mode: build MEMORY.md, memory_summary.md from scratch
- INCREMENTAL mode: use thread-diff snapshot (added/removed thread IDs):
  - Added threads: extract new task groups, preferences, knowledge, failures
  - Removed threads: surgically delete references, clean up empty task groups
  - Retained threads: check for updates if source_updated_at changed
- Evidence deep-dive: agent reads rollout_summaries/ for exact wording, quote-oriented evidence
- Wording preservation: consolidation prompt requires preserving user's exact phrasing when extracting preferences

**Dirty/clean tracking** (watermark-based):
- Phase 2 only runs if dirty (new stage-1 outputs since last success)
- `input_watermark` vs `last_success_watermark` comparison
- Prevents redundant consolidation runs

**Skills extraction** (recurring workflow → procedural memory):
- Triggered by repeats > 1 (same pattern across multiple rollouts)
- SKILL.md format: YAML frontmatter (name, description, argument-hint, allowed-tools, user-invocable, disable-model-invocation) + structured body (When to use, Inputs, Procedure, Efficiency, Pitfalls, Verification)
- Supporting files: scripts/ (executable), templates/ (reusable), examples/ (worked)
- Keep under 500 lines; move details to supporting files

### 1.7 Configuration

**Phase 1 constants** (compile-time):

| Parameter | Value | Notes |
|-----------|-------|-------|
| Model | gpt-5.1-codex-mini | Smaller, cheaper model for extraction |
| Reasoning effort | Low | Fast extraction, not deep reasoning |
| Concurrency limit | 8 | Parallel job cap |
| Rollout token limit | 150,000 (default) | 70% of model context window |
| Memory tool dev instructions summary limit | 5,000 tokens | Truncation for memory_summary.md |
| Job lease | 3,600s (1h) | Ownership window |
| Job retry delay | 3,600s | Backoff between retries |
| Thread scan limit | 5,000 | Max threads to consider |
| Prune batch size | 200 | Memory cleanup batch size |

**Phase 2 constants:**

| Parameter | Value | Notes |
|-----------|-------|-------|
| Model | gpt-5.3-codex | Larger model for consolidation |
| Reasoning effort | Medium | More thoughtful consolidation |
| Job lease | 3,600s | Ownership window |
| Job retry delay | 3,600s | Backoff |
| Heartbeat interval | 90s | Agent monitoring + lease renewal |

**Runtime config** (`MemoriesConfig` struct):

| Field | Effect |
|-------|--------|
| `generate_memories` | Enable Phase 1 extraction |
| `use_memories` | Inject memory_summary.md into developer instructions |
| `max_raw_memories_for_consolidation` | Top-N selection limit for Phase 2 |
| `max_unused_days` | Discard memories unused beyond this window |
| `max_rollout_age_days` | Don't process rollouts older than this |
| `max_rollouts_per_startup` | Bounded claim limit per startup |
| `min_rollout_idle_hours` | Avoid summarizing active sessions |
| `extract_model` | Override Phase 1 model |
| `consolidation_model` | Override Phase 2 model |
| `no_memories_if_mcp_or_web_search` | Disable if external tools present |

### 1.8 Telemetry

| Metric | When | Dimensions |
|--------|------|------------|
| `codex.memory.phase1` | Phase 1 jobs complete | status (succeeded/no_output/failed) |
| `codex.memory.phase1.e2e_ms` | Phase 1 batch complete | latency histogram |
| `codex.memory.phase1.output` | Phase 1 produces memories | count |
| `codex.memory.phase1.token_usage` | Per-phase 1 | total/input/cached_input/output/reasoning_output |
| `codex.memory.phase2` | Phase 2 claim attempt | status (claimed/not_dirty/running) |
| `codex.memory.phase2.e2e_ms` | Phase 2 complete | latency histogram |
| `codex.memory.phase2.input` | Phase 2 inputs loaded | count |
| `codex.memory.phase2.token_usage` | Phase 2 agent complete | total/input/cached_input/output/reasoning_output |
| `codex.memories.usage` | Agent reads memory file | kind (memory_md/memory_summary/raw/rollout_summaries/skills), tool, success |

### 1.9 Security mechanisms

- **Secret redaction**: `codex_secrets::redact_secrets()` on all Phase 1 output fields before storage
- **Developer message stripping**: developer role messages removed entirely from rollout data before extraction
- **Memory-excluded fragments**: contextual user fragments marked for exclusion are stripped from rollout content
- **Symlink protection**: `clear_memory_root_contents()` refuses to clear symlinked memory root
- **Sandboxed consolidation agent**: no network, local write only to memory_root, no feature recursion (MemoryTool disabled), no approvals, no collaboration
- **Memory mode per thread**: `memory_mode` column in `threads` table (enabled/disabled) — can disable memory for specific sessions

---

## Stage 2 — Evaluative (is it coherent? what's missing?)

### 2.1 Internal coherence

The system is well-engineered and internally consistent:

- **Two-phase separation** is clean: Phase 1 is embarrassingly parallel (one model call per rollout), Phase 2 is serial (global lock, one agent). This matches the workload characteristics — extraction is independent, consolidation requires global view.
- **SQLite-based coordination** (leases, ownership tokens, watermarks) provides distributed-safe semantics without external infrastructure. The retry/lease model prevents both duplicate work and indefinite orphaning.
- **Selection diff** for incremental updates is a genuinely novel mechanism. Rather than re-consolidating everything, Phase 2 sees exactly what's new (added), what's unchanged (retained), and what's gone (removed). The removed-thread evidence preservation during transition is a thoughtful detail.
- **Usage-based retention** creates a closed feedback loop: citation tracking → usage_count → Phase 2 selection priority → consolidation → better memories → more citations. This is the first system in our survey with a complete usage→retention feedback loop.
- **Progressive disclosure** is well-layered: memory_summary.md (always loaded, navigational) → MEMORY.md (grepable handbook) → rollout_summaries (evidence) → skills (procedures). Each layer has a clear role and access pattern.

### 2.2 What's notably well-done

1. **The prompt engineering is extraordinarily detailed.** The Phase 1 extraction prompt (~570 lines) includes: a minimum signal gate, a "how to read a rollout" section prioritizing user messages > tool outputs > assistant actions, task outcome triage with 4 labels and real-world signals, and separate schemas for raw_memory (consolidatable) vs rollout_summary (reference). The Phase 2 consolidation prompt (~836 lines) specifies exact MEMORY.md block structure, memory_summary.md sections with word limits, skills format with creation criteria, INIT vs INCREMENTAL modes, and evidence deep-dive rules with wording-preservation requirements. No other system in our survey has prompts at this level of specificity.

2. **Skills as procedural memory** is a unique contribution. Most memory systems store facts, preferences, and events. Codex also stores learned procedures — SKILL.md files with YAML frontmatter, executable scripts, templates, and worked examples. The creation criteria (repeats > 1, failure shields, formatting contracts) ground skill extraction in evidence, not speculation.

3. **Usage-based retention with citation tracking** closes the feedback loop. The `<oai-mem-citation>` mechanism lets the system track which memories actually get used. This feeds Phase 2 selection (higher usage = higher priority) and pruning (unused memories evicted). This is the "echo/fizzle" pattern that jumperz proposed — but actually implemented and integrated into the retention pipeline.

4. **Thread-diff-based forgetting** is surgically precise. Rather than re-consolidating from scratch, Phase 2 receives a diff showing which threads were added, retained, or removed. Removed threads trigger targeted cleanup: delete references, remove empty task groups, clean up stale entries. The evidence for removed threads is preserved during the transition (union of current + previous selection) so the agent can read the old summaries before deciding what to delete.

5. **The read path's decision boundary** is practical. The read_path.md prompt gives agents a clear framework: skip memory for self-contained queries, use it by default when the query touches workspace/prior context, and keep lookup to ≤4-6 search steps. The drift verification guidance (risk-of-drift vs verification-effort trade-off) is more nuanced than "always verify" or "always trust."

### 2.3 What's missing vs the serious systems

1. **No LLM-based query-time selection.** Retrieval is keyword grep over MEMORY.md. The agent decides what to search for based on the memory_summary.md overview. There's no vector search, no embeddings, no Sonnet-style "pick the best 5 from a manifest." This works when MEMORY.md is well-structured and the memory_summary.md is accurate, but degrades if either drifts.

2. **No knowledge graph or entity linking.** Memories are organized by task group (cwd/project), not by entities or relationships. There's no entity resolution, no "who is X" capability beyond what's in the memory_summary.md user profile.

3. **No real-time extraction.** Memory extraction only happens at session startup (prune → phase1 → phase2). There's no background extraction during a session (unlike Claude Code's per-query-loop extraction). A long session's insights aren't captured until the next session starts.

4. **No team/shared memory.** Codex's memory is strictly per-user. There's no mechanism to share memories across team members, no sync protocol, no access control beyond the filesystem.

5. **No correction/versioning semantics.** The consolidation prompt supports "incremental update" with thread-diff forgetting, but there's no append-only correction chain. When a memory is wrong, it gets updated in place or deleted. No "I used to believe X but learned Y" history.

6. **No session memory / working notes.** There's no equivalent of Claude Code's session memory — running notes about the current conversation that survive context compaction. Codex's memory is purely cross-session.

7. **No staleness caveats.** The read_path.md prompt says "if a fact is likely to drift, verify it" — but there's no automatic freshness annotation on recalled memories. No age display, no "this memory is N days old" warnings.

8. **No write gating beyond prompt instructions.** The minimum signal gate is in the Phase 1 prompt — the model decides. There's no code-level junk filter, no similarity dedup, no plausibility check. If the model decides to save something, it gets saved.

### 2.4 Likely failure modes

1. **Phase 2 bottleneck.** The global consolidation job runs with a single gpt-5.3-codex agent. As memory corpus grows, the agent has more to read and more to consolidate. The ~836-line prompt already pushes context limits. With hundreds of rollout summaries, the agent may not be able to read all evidence within its turn budget.

2. **Usage tracking requires citation compliance.** The `<oai-mem-citation>` mechanism depends on the agent correctly appending citations to every response that uses memory. If the agent forgets (prompt compliance is <100%), usage_count under-counts, and good memories may get pruned.

3. **Startup-only extraction creates a lag.** A user has a productive session full of valuable insights. Those insights aren't extracted until the next session starts. If the user starts a new session immediately (or Codex crashes), Phase 1 may extract from the previous session — but there's a temporal gap where recent work is unremembered.

4. **MEMORY.md structure degrades with scale.** The consolidation prompt specifies a detailed block structure (task groups → tasks → preferences → knowledge → failures). As the corpus grows, maintaining this structure becomes harder. The agent must balance adding new content against keeping the document navigable.

5. **No fallback if Phase 2 fails.** If the consolidation agent fails (runs out of turns, produces malformed output, crashes), the job is marked failed with retry backoff. But `raw_memories.md` and `rollout_summaries/` have already been synced to disk. Until Phase 2 succeeds, the on-disk MEMORY.md may be stale relative to the raw inputs.

---

## Stage 3 — Dialectical (steelman + counterarguments)

### 3.1 Steelman

Codex's memory system makes a deliberate architectural bet: **batch-processed, database-coordinated, heavily-prompted extraction and consolidation.** The strongest version of this argument:

1. **Startup-time processing avoids runtime overhead.** By running extraction and consolidation at session start (not during active use), the system never adds latency to user-facing queries. The user's session runs with pre-consolidated memory. This is a fundamentally different trade-off than Claude Code's per-query-loop extraction.

2. **Usage-based retention is self-correcting.** Most memory systems rely on recency or importance scoring by the model. Codex tracks actual usage (via citations) and lets usage frequency drive retention. This creates a genuine feedback loop: useful memories survive, unused memories are pruned. The "echo/fizzle" concept from the jumperz spec — actually working.

3. **Two-model strategy is cost-efficient.** Phase 1 uses a smaller, cheaper model (gpt-5.1-codex-mini at Low reasoning) for the embarrassingly-parallel extraction work. Phase 2 uses a larger, more capable model (gpt-5.3-codex at Medium reasoning) for the harder consolidation work. This matches compute to difficulty.

4. **SQLite coordination is infrastructure-free.** The lease/heartbeat/watermark system provides distributed-safe job coordination without Redis, message queues, or external databases. This matters for a CLI tool that needs to work on developer laptops without infrastructure setup.

5. **Skills as procedural memory** are a genuinely novel contribution. By extracting learned workflows into SKILL.md files with executable scripts and templates, the system captures "how to do X" alongside "what I know about X." This is the procedural tier that several academic papers (ENGRAM, ReMe) formalize — but implemented as a practical filesystem artifact.

6. **Thread-diff forgetting** is surgically precise and avoids the "re-consolidate everything" problem. Rather than reading all memories and rebuilding from scratch, the consolidation agent sees exactly what changed. This makes incremental updates tractable even with a large corpus.

### 3.2 Strongest objections

1. **No real-time extraction is a significant gap.** Claude Code extracts memories during the session via a forked background agent. Codex only extracts at next-session startup. This means: (a) a crash or forced quit loses in-flight memory, (b) session insights aren't available within the same session, and (c) there's always a one-session lag for new memories.

2. **Keyword grep retrieval doesn't scale.** MEMORY.md is retrieved by grep, not by embeddings or LLM routing. This works when MEMORY.md is small and well-structured, but as the corpus grows, keyword grep becomes a bottleneck. The agent must know what keywords to search for, and the memory_summary.md must accurately describe what's in MEMORY.md. If either drifts, recall degrades silently.

3. **Citation compliance is a weak link.** The usage-based retention system depends on agents correctly citing memories in every response. This is prompt-enforced, not system-enforced. If citation compliance drops (due to prompt drift, model changes, or competing instructions), the usage tracking becomes noisy and the retention signal degrades. There's no validation that citations are accurate (the right file:line for the right content).

4. **~1,400 lines of prompts are a maintenance burden.** The extraction and consolidation prompts are extremely detailed, specifying exact output formats, schemas, reading orders, and decision trees. Any change to the memory format requires updating multiple prompts in lockstep. The prompts carry no eval case IDs or pass rates (unlike Claude Code's eval-validated approach).

5. **No team memory limits organizational use.** Claude Code has team memory with OAuth sync, per-type scope guidance, and secret scanning. Codex has nothing — memory is per-user, per-machine. For team adoption, this is a significant gap.

### 3.3 Relationship to other systems

**vs. Claude Code memory subsystem:**
Both are first-party production systems from frontier model providers. Key architectural differences:

| Dimension | Codex | Claude Code |
|-----------|-------|-------------|
| Extraction timing | Session startup (batch) | Per-query loop (streaming) |
| Extraction model | gpt-5.1-codex-mini (small/cheap) | Same model as main agent (forked) |
| Consolidation model | gpt-5.3-codex (large/separate) | Same model as main agent (forked) |
| Retrieval | Keyword grep over MEMORY.md | LLM-based Sonnet selector (up to 5) |
| Job coordination | SQLite leases/heartbeats/watermarks | File-based locks + turn counting |
| Usage tracking | Citation-based usage_count/last_usage | None (mtime-based staleness only) |
| Team memory | None | OAuth-synced private + shared |
| Session memory | None | Forked subagent running notes |
| Skills | First-class procedural memory | None |
| Prompt engineering | ~1,400 lines, detailed but no evals | ~600 lines, eval-validated with case IDs |
| Data model | SQLite + filesystem | Flat files only |

These are genuinely different architectural philosophies: Codex is "batch-process then serve pre-built artifacts" while Claude Code is "live-extract and route in real time." Both approaches have real strengths.

**vs. Minimal MEMORY.md agents (Hermes, Malaiac):**
Codex produces the same MEMORY.md artifact as the convergent pattern, but with a sophisticated two-phase pipeline behind it. The minimal agents have the agent write MEMORY.md directly; Codex has a dedicated extraction model, a database coordination layer, and a separate consolidation model. Same output format, dramatically different infrastructure.

**vs. OpenClaw memory architecture:**
OpenClaw has SQLite+FTS5 knowledge graph, GPU embeddings, 60-query benchmark. Codex has SQLite job coordination but no knowledge graph, no embeddings, and no benchmark harness. OpenClaw's retrieval is more sophisticated; Codex's consolidation pipeline and usage-based retention are more sophisticated.

**vs. Gigabrain:**
Both have event-sourced patterns (Gigabrain's append-only events, Codex's stage1_outputs with selection snapshots). Gigabrain has explicit capture via XML tags, type-aware semantic dedup, and multi-gate write pipeline. Codex has two-phase extraction/consolidation, usage-based retention, and skills as procedural memory. Gigabrain's write gating is more rigorous; Codex's maintenance pipeline is more sophisticated.

**vs. MIRA-OSS:**
MIRA has entity graph, typed relationships, activity-day decay, hub-based discovery, and behavioral adaptation. Codex has none of these, but has database-coordinated job scheduling, usage-based retention, and skills. Different quadrants of the design space.

---

## Synthesis-ready takeaways

1. **Two-phase extraction→consolidation** is a clean architectural pattern. Separating the embarrassingly-parallel per-rollout extraction (cheap model) from the serial global consolidation (expensive model) matches compute to task difficulty. Worth considering for any system that processes historical data into curated memory.

2. **Usage-based retention via citation tracking** closes the feedback loop that most memory systems leave open. The `echo/fizzle` concept works when you can actually track what gets cited. The weakness is prompt-enforced compliance — a system-enforced tracking mechanism would be more robust.

3. **Thread-diff-based forgetting** is a novel incremental update mechanism. Rather than re-processing everything, give the consolidation agent a diff (added/retained/removed). This enables surgical updates and avoids the "blow up and rebuild" problem.

4. **Skills as procedural memory** should be studied by every memory system. Most systems store "what" (facts, preferences); Codex also stores "how" (procedures, scripts, templates). This is the procedural tier that ENGRAM and ReMe formalize in academic papers.

5. **Progressive disclosure** (summary → index → evidence → procedures) is a practical retrieval architecture that works without embeddings. Each layer exists for a reason and has a clear access pattern. The weakness is that it depends on the consolidation agent producing good summaries — garbage in the summary means missed memories.

6. **Startup-only extraction** is a bold simplification. By not extracting during sessions, Codex avoids the complexity of real-time background agents, mutual exclusion, and mid-session memory writes. The cost is a one-session lag and crash vulnerability. Whether this is an acceptable trade-off depends on session frequency and crash rates.

---

## Claims table

| # | Claim | Type | Evidence | Credence | Notes |
|---|-------|------|----------|----------|-------|
| 1 | Two-phase pipeline uses separate models (gpt-5.1-codex-mini → gpt-5.3-codex) | Mechanism | Source code (`mod.rs` constants, `phase1.rs`, `phase2.rs`) | 0.95 | Model names are compile-time constants; actual deployment may override |
| 2 | Phase 1 runs 8 concurrent extraction jobs | Mechanism | Source code (`CONCURRENCY_LIMIT = 8`, `buffer_unordered`) | 0.95 | Hard-coded constant |
| 3 | SQLite leases/heartbeats/watermarks provide distributed-safe coordination | Mechanism | Source code (`jobs` table schema, `phase2.rs` heartbeat loop, `runtime/memories.rs`) | 0.90 | Design is sound; no evidence of stress testing under heavy contention |
| 4 | Usage-based retention: citation tracking drives Phase 2 selection | Mechanism | Source code (`citations.rs`, `usage_count`/`last_usage` columns, Phase 2 selection ranking) | 0.90 | End-to-end path confirmed in code; actual citation compliance rate unknown |
| 5 | Thread-diff forgetting: Phase 2 receives added/retained/removed diff | Mechanism | Source code (`Phase2InputSelection`, `prompts.rs` render functions, consolidation.md) | 0.95 | Full implementation confirmed |
| 6 | Skills extracted as procedural memory (SKILL.md + scripts/templates/examples) | Mechanism | Consolidation prompt (~836 lines, skills section), template directory structure | 0.85 | Prompt describes format; actual skill creation depends on model compliance |
| 7 | Secret redaction on all Phase 1 outputs | Mechanism | Source code (`phase1.rs`, `codex_secrets::redact_secrets()` calls) | 0.95 | Applied to raw_memory, rollout_summary, and rollout_slug |
| 8 | No vector search, embeddings, or LLM-based query-time selection | Absence | Full source review of `codex-rs/core/src/memories/` + templates | 0.95 | Confirmed absent; retrieval is keyword grep + progressive file access |
| 9 | No real-time extraction during sessions | Absence | `start.rs` runs pipeline at startup only; no mid-session extraction hooks | 0.95 | Confirmed: pipeline is start → prune → phase1 → phase2, no event-driven triggers |
| 10 | No team/shared memory mechanism | Absence | Full source review; no sync, no access control, no shared directories | 0.95 | Memory is per-user per-machine |
| 11 | ~1,400 lines of extraction + consolidation prompts | Scale | Direct line counts: stage_one_system.md (~570) + consolidation.md (~836) | 0.95 | Most detailed prompts in our survey by line count |
| 12 | Prompts lack eval case IDs or pass rate references | Absence | Full review of all 4 template files | 0.90 | No eval references found; Claude Code's prompts carry specific case IDs |

---

## Corrections & Updates

- 2026-03-31: Initial analysis from source code review of `codex-rs/core/src/memories/` + `codex-rs/core/templates/memories/` + `codex-rs/state/migrations/` in the open-source Codex repository (https://github.com/openai/codex). Additional files found and analyzed: `start.rs` (startup orchestrator), `control.rs` (symlink-safe clearing), `citations.rs` (citation parsing), `storage.rs` (filesystem sync + filename derivation), `prompts.rs` (template rendering), `README.md` (architecture docs). Database schema confirmed across 4 migrations (0006, 0009, 0016, 0017, 0018). Runtime DB layer in `state/runtime/memories.rs` (~4,624 lines) provides full CRUD + coordination.
