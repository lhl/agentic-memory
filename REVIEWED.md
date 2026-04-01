---
title: "Reviewed — Triage Log for Examined Systems"
last_updated: 2026-03-31
type: triage
related:
  - ANALYSIS.md
  - ANALYSIS-academic-industry.md
  - README.md
---

# Reviewed — Triage Log

Systems, projects, and papers we've examined but **not promoted** to the main comparison (`ANALYSIS.md`) or academic synthesis (`ANALYSIS-academic-industry.md`). This prevents re-examining things we've already evaluated and records our reasoning for exclusion.

If a system later matures or becomes relevant, it can be promoted — but the triage entry stays as history.

| Date | System | Source | Verdict |
|------|--------|--------|---------|
| 2026-03-31 | Codex memory subsystem (OpenAI) | [openai/codex](https://github.com/openai/codex) | **Promoted to ANALYSIS.md.** Two-phase async pipeline (gpt-5.1-codex-mini → gpt-5.3-codex) with SQLite-backed job coordination, progressive disclosure memory layout, skills as procedural memory, usage-based retention via citation tracking, thread-diff-based incremental forgetting, ~1,400 lines of extraction/consolidation prompts. Standalone analysis exists. |
| 2026-03-31 | Claude Code memory subsystem (Anthropic) | Source: `/home/lhl/Downloads/claude-code/src` | **Promoted to ANALYSIS.md.** First-party production-scale memory: flat-file MEMORY.md + typed topic files + background extraction via forked agent + LLM-based relevance selection + team memory sync + auto dream consolidation + eval-validated prompts. Standalone analysis exists. |
| 2026-03-30 | MIRA-OSS v1 rev 2 (refresh) | [taylorsatula/mira-OSS](https://github.com/taylorsatula/mira-OSS) | **Standalone analysis refreshed.** Substantive update: background forage agent (sub-agent collaboration), user model synthesis pipeline with critic validation, portrait synthesis, 3-axis linking (adds TF-IDF), extraction pipeline restructure, verbose refinement ablated, 16 tools (up from 11), account tier system, context overflow remediation, immutable domain models. See ANALYSIS-mira-OSS.md. |
| 2026-03-07 | Always-On Memory Agent (Google) | [GoogleCloudPlatform/generative-ai](https://github.com/GoogleCloudPlatform/generative-ai/tree/main/gemini/agents/always-on-memory-agent) | **PoC / tutorial only.** No retrieval (recency LIMIT 50), no decay, no dedup, no versioning. Standalone analysis exists. Not in ANALYSIS.md. |
| 2026-03-07 | Hermes Agent memory | [hermes-agent.nousresearch.com](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory) | **Minimal MEMORY.md baseline.** Clean security hygiene but no retrieval sophistication, no consolidation, no graph, no decay. Not worth a standalone analysis. |
| 2026-03-07 | Gigabrain | [legendaryvibecoder/gigabrain](https://github.com/legendaryvibecoder/gigabrain) | **Promoted to ANALYSIS.md.** Event-sourced storage, multi-gate write pipeline, type-aware semantic dedup, class-budgeted recall. See detailed notes below and ANALYSIS.md. |
| 2026-03-07 | Malaiac/claude (short-term-memory + diary) | [Malaiac/claude](https://github.com/Malaiac/claude) | **Convergent MEMORY.md pattern.** Working-memory skill (`current-context.md`) + append-only monthly journal. Nice ergonomics but no code, no retrieval, no storage beyond flat files. |
| 2026-03-07 | episodic-memory (obra) | [obra/episodic-memory](https://github.com/obra/episodic-memory) | **Well-built episodic retrieval layer.** Claude Code plugin: sync conversations → local embeddings (Transformers.js) → SQLite + sqlite-vec → semantic search via MCP. Hierarchical summarization, search subagent. No fact extraction, no consolidation, no decay. |

---

## 2026-03-31 — Codex Memory Subsystem (OpenAI) — PROMOTED

**Source:** https://github.com/openai/codex (`codex-rs/core/src/memories/` + `codex-rs/core/templates/memories/`)

**What it is:** The memory subsystem of OpenAI's open-source coding agent CLI (Codex). First-party, open-source, Rust-based. Core memory module ~1,500+ LOC Rust across 12 files + ~1,550 lines of prompt templates + ~4,624 lines of database operations. The only system in our survey from a frontier model provider that is fully open source.

**Architecture:**

- **Two-phase async pipeline**: Phase 1 (gpt-5.1-codex-mini, reasoning=Low, 8-way parallel) extracts per-rollout memories → Phase 2 (gpt-5.3-codex, reasoning=Medium, single global job) consolidates into file hierarchy. Separate models tuned for each task.
- **SQLite-backed job coordination**: `stage1_outputs` table (raw_memory, rollout_summary, usage tracking) + `jobs` table (ownership tokens, leases=1h, heartbeats=90s, watermarks, retry backoff). Multi-worker safe without external infrastructure.
- **Progressive disclosure layout**: `memory_summary.md` (always loaded, ≤5K tokens) → `MEMORY.md` (grepable handbook) → `rollout_summaries/` (per-rollout evidence) → `skills/` (procedural memory).
- **Skills as procedural memory**: SKILL.md with YAML frontmatter + scripts/ + templates/ + examples/. Extracted from recurring patterns (repeats > 1).
- **Usage-based retention**: `usage_count` and `last_usage` tracking via citation parsing. Phase 2 selection ranks by usage. Unused memories pruned after `max_unused_days`.
- **Thread-diff incremental forgetting**: Phase 2 receives selection diff (added/retained/removed thread IDs). Removed threads trigger targeted cleanup. Evidence preserved during transition.
- **Memory citation tracking**: `<oai-mem-citation>` XML blocks with citation entries (file:line|note) and rollout IDs for attribution/usage feedback.
- **Secret redaction**: `codex_secrets::redact_secrets()` on all Phase 1 outputs. Developer messages stripped. Memory-excluded fragments filtered.
- **Sandboxed consolidation agent**: No network, local write only, no approvals, disabled features (SpawnCsv, Collab, MemoryTool). Prevents recursion.

**What's interesting:**

- **Two-phase batch pipeline**: Extraction at startup (not during session). Cheap model for parallel per-rollout extraction, expensive model for single consolidation pass. Avoids runtime overhead entirely.
- **Usage-based retention via citation tracking**: The "echo/fizzle" feedback loop that @jumperz proposed — actually implemented. Citations → usage_count → selection priority → consolidation → better memories → more citations.
- **Thread-diff-based forgetting**: Surgically precise incremental updates. Phase 2 agent sees exactly what's new, what's unchanged, and what's been removed. Evidence for removed threads preserved during transition for the agent to read before deciding what to delete.
- **Skills as procedural memory**: Only system in our survey that extracts learned workflows into executable artifacts (scripts, templates, examples). Not just "what I know" but "how to do it."
- **~1,400 lines of extraction + consolidation prompts**: Most detailed prompt engineering in our survey by line count. Minimum signal gate, task outcome triage, evidence-preservation rules, wording-preservation requirements.
- **SQLite-as-infrastructure**: Leases, heartbeats, watermarks, ownership tokens — distributed-safe coordination without Redis or message queues. Practical for a CLI tool on developer laptops.

**What's missing vs serious systems:**

- **No LLM-based query-time selection** — retrieval is keyword grep over MEMORY.md; no vector search, no embeddings, no Sonnet-style selector
- **No real-time extraction** — memories only extracted at next session startup; one-session lag
- **No team/shared memory** — strictly per-user, per-machine
- **No knowledge graph or entity linking** — memories organized by task group, not entities
- **No correction/versioning semantics** — updates in place, no append-only correction chains
- **No staleness caveats** — no automatic freshness annotations on recalled memories
- **No session memory** — no running notes about current conversation
- **No eval-validated prompts** — prompts are detailed but carry no eval case IDs or pass rates (unlike Claude Code)

**Verdict:** **Promoted to ANALYSIS.md.** This is a genuinely sophisticated two-phase memory pipeline with novel mechanisms not seen in other systems: SQLite-backed distributed job coordination with leases/heartbeats/watermarks, two-model extraction→consolidation strategy, skills as procedural memory, usage-based retention via citation tracking, and thread-diff-based incremental forgetting. The batch-processing architecture is a fundamentally different approach than Claude Code's real-time extraction. Contributes unique mechanisms to the design space. Standalone analysis: `ANALYSIS-codex-memory.md`.

---

## 2026-03-31 — Claude Code Memory Subsystem (Anthropic) — PROMOTED

**Source:** `/home/lhl/Downloads/claude-code/src` (decompiled/bundled source snapshot)

**What it is:** The memory subsystem of Anthropic's official coding agent (Claude Code — CLI, IDE, web). First-party, production-scale, shipping to Anthropic's entire user base. TypeScript, ~3,500 LOC across 8 core files + 4 service directories. Reviewed from bundled source, not a public repository.

**Architecture:**

- **Flat-file storage**: `~/.claude/projects/<sanitized-git-root>/memory/` with MEMORY.md index (max 200 lines / 25KB) + individual topic files with YAML frontmatter.
- **Four-type taxonomy**: user (role/preferences), feedback (corrections + confirmations), project (deadlines/decisions/context), reference (external system pointers). Enforced via prompt instructions, not code-level types. Combined mode adds per-type scope tags (always private / bias team / usually team).
- **Background extraction via forked agent**: "Perfect fork" sharing parent's prompt cache. Fires at end of each query loop. Restricted tools (read + write-to-memory-only). Max 5 turns. Mutually exclusive with main agent writes (`hasMemoryWritesSince`).
- **LLM-based query-time relevance selection**: Sonnet reads a manifest of memory descriptions and picks up to 5 relevant files per query. Tool-aware filtering (exclude reference docs for active tools, keep warnings). Not vector search.
- **Team memory with server sync**: Private + shared directories. OAuth-authenticated delta sync. Secret scanning before upload. Size caps (250KB/entry, 200KB/request). Pull=server wins, push=delta only.
- **Auto dream consolidation**: Time-gated (24h) + session-gated (5 sessions) + lock-gated. 4-phase: orient → gather → consolidate → prune. Forked agent with same tool restrictions.
- **KAIROS daily-log mode**: Append-only `logs/YYYY/MM/YYYY-MM-DD.md` for long-lived assistant sessions. Separate `/dream` skill distills logs nightly.
- **Session memory**: Separate forked subagent maintains per-conversation notes (12K token budget, section-based template). Distinct from persistent auto-memory.
- **Security-hardened paths**: Symlink traversal protection (realpath on deepest existing ancestor), Unicode normalization attack detection, URL-encoded traversal rejection, null byte filtering, dangling symlink detection, projectSettings exclusion.
- **Eval-validated prompts**: Source comments reference specific eval case IDs with pass/fail rates (e.g., "H1: 0/2 → 3/3 via appendSystemPrompt"). Memory prompts are empirically tuned.

**What's interesting:**

- **Forked-agent-as-infrastructure**: Three subsystems (extraction, consolidation, session memory) use the same "perfect fork with shared prompt cache" pattern. Only works when you control the inference infrastructure.
- **LLM-based memory routing**: Sonnet selector picking from a manifest is a viable alternative to vector search at small scale (~200 files). Understands intent and context.
- **Staleness-first recall**: Multi-layer freshness handling — mtime-based age strings, per-memory caveats, system prompt drift warnings, "before recommending from memory" section. "The memory says X exists ≠ X exists now."
- **Exclusion list as design feature**: What NOT to save is specified in detail. Gate intercepts even explicit user requests to save derivable content ("ask what was surprising").
- **Eval-validated prompt engineering**: Only system in our survey that cites specific eval IDs with pass rates. Header-wording A/B tests. Position-sensitivity experiments.
- **Team memory scope per type**: Not binary private/shared — each type has its own scope guidance embedded in the type definition.
- **Main/extraction mutual exclusion**: Clean cursor-based tracking prevents duplicate writes between the main agent and background extractor.

**What's missing vs serious systems:**

- **No vector search / embeddings** — LLM routing over descriptions only; 200-file hard cap is a scaling wall
- **No knowledge graph or entity linking** — memories are isolated topic files
- **No decay or importance scoring** — mtime-based staleness *display* but no scoring that affects retrieval priority
- **No structured episode objects** — KAIROS logs are text, not structured events
- **No correction/versioning semantics** — overwrite model ("update or remove"), no append-only corrections
- **No write-side content gating** — no junk filter, no similarity dedup, no plausibility heuristics (prompt says "don't duplicate" but no code-level check)
- **No benchmark harness** — internal evals referenced in comments but no user-facing quality measurement

**Verdict:** **Promoted to ANALYSIS.md.** This is the convergent MEMORY.md pattern elevated to production scale with real infrastructure: forked agents, prompt cache sharing, team sync, multi-mode prompts, eval-validated behavioral instructions, and security hardening. Contributes novel mechanisms: forked-agent extraction with mutual exclusion, LLM-based relevance selection, staleness-first recall, team memory with per-type scope, and eval-validated prompt engineering. The most widely-deployed agentic memory system in our survey. Standalone analysis: `ANALYSIS-claude-code-memory.md`.

---

## 2026-03-07 — episodic-memory (obra / Jesse Vincent)

**Source:** https://github.com/obra/episodic-memory
**Blog post:** https://blog.fsck.com/2025/10/23/episodic-memory/

**What it is:** A Claude Code plugin (npm `episodic-memory`, v1.0.15, MIT) that provides semantic search over past Claude Code conversations. Built by Jesse Vincent (obra). TypeScript, 71 tests, 15 releases (Oct–Dec 2025). Active community (36+ issues/PRs).

**Architecture:**

- **Sync pipeline**: SessionStart hook → copies conversation `.jsonl` files from `~/.claude/projects/` to `~/.config/superpowers/conversations-archive/` → parses user-agent exchanges → generates embeddings → stores in SQLite with sqlite-vec.
- **Local embeddings**: Transformers.js with `all-MiniLM-L6-v2` (384d). No API calls for search. Fully offline retrieval.
- **Summarization**: LLM-generated conversation summaries (Haiku by default, configurable). Short conversations (≤15 exchanges) summarized directly; long conversations use **hierarchical summarization** — chunk into groups of 8, summarize each chunk, then synthesize chunks into a final summary. Summaries stored as `-summary.txt` sidecar files.
- **Search**: Vector similarity (sqlite-vec cosine distance) + text matching (SQL LIKE) + combined mode. **Multi-concept AND search** — pass array of concepts, each searched independently, results intersected and ranked by average similarity. Date range filters (`--after`, `--before`).
- **Search subagent**: Dedicated Haiku-powered agent dispatched for historical searches. Reads top 2-5 full conversations via MCP `show` tool, synthesizes into 200-1000 word actionable summary with source pointers. Keeps main agent's context window clean — "50-100x context savings vs loading raw conversations."
- **Rich metadata**: session ID, project, timestamp, git branch, cwd, Claude version, thinking level/triggers, tool calls (separate `tool_calls` table with tool name/input/result/error), parent UUID + sidechain tracking.
- **Privacy**: `DO NOT INDEX` marker excludes conversations. Summarizer meta-conversations auto-excluded. Project-level exclusion list.
- **Plugin integration**: Full Claude Code plugin with hooks (SessionStart sync), MCP server (search + show tools), slash command (`/search-conversations`), agent (`search-conversations`), skill (`remembering-conversations`). The most complete plugin architecture in our survey.
- **Database**: SQLite with WAL mode, proper indexes (timestamp, session_id, project, git_branch, tool_name), schema migrations for backwards compatibility.

**What's interesting:**
- **Conversation as the memory unit**: Most systems extract facts/memories from conversations; this indexes the conversations themselves. Each user-agent exchange is an independently searchable unit with its own embedding.
- **Hierarchical summarization**: The chunk→summarize→synthesize pattern for long conversations is a practical approach to the "conversation too long to summarize in one shot" problem.
- **Search subagent for context protection**: Delegating retrieval + synthesis to a cheap model (Haiku) and returning a compressed summary protects the main agent's context budget. This is the "tiered retrieval" pattern applied to the agent's own workflow.
- **Tool call indexing**: Tracking which tools were used in each exchange enables tool-aware search ("find conversations where I used git push").

**What's missing vs serious systems:**
- **No structured fact extraction** — indexes raw exchanges, not typed memories (facts, preferences, decisions)
- **No dedup or consolidation** — every exchange stored independently; no merging of related information across conversations
- **No decay or importance scoring** — all indexed conversations are equally weighted regardless of age or relevance
- **No knowledge graph or entity linking** — no entities, no relationships between memories
- **No write gating** — indexes everything that isn't explicitly excluded; no quality filter on what gets stored
- **No correction/versioning** — read-only memory; no mechanism to update or supersede past information
- **No maintenance pipeline** — no scheduled consolidation, pruning, or quality sweeps

**Verdict:** A well-executed **episodic retrieval layer** that cleanly solves the "Claude forgets between sessions" problem. Implements the "append-only transcript store + derived search index" tier from the Memory OS model but doesn't attempt semantic memory, consolidation, or the harder memory problems. The search subagent pattern and hierarchical summarization are practical details worth noting. Does not add new architectural mechanisms to the ANALYSIS.md design space — the episodic/transcript tier is already well-covered.

---

## 2026-03-07 — Malaiac/claude (short-term-memory + diary)

**Source:** https://github.com/Malaiac/claude

**What it is:** A collection of Claude Code skills and CLAUDE.md templates by Malaiac. Two memory-relevant components: a `short-term-memory` skill and a `diary` template. Pure prompt engineering — no code, no storage backend, no retrieval system.

**short-term-memory skill:**

A skill that instructs Claude to maintain a `current-context.md` file per project. The workflow is rigid: READ → WORK → UPDATE → CHECK → SEND on every response.

Structured sections with line limits:
- 🎯 RIGHT NOW (<10 lines) — current and just-finished actions
- ✅ Recently Completed (no limit) — done items with timestamps
- ✅ Decisions Made (no limit) — architectural/design decisions
- 🔄 Next Logical Step (<10 lines) — what comes next
- 💡 Fresh Decisions (<15 lines) — decisions awaiting formalization
- ⏸️ Active Blockers (<10 lines) — waiting on external input
- ⚠️ Don't Forget (<15 lines) — explicit warnings/constraints

200-line cap with auto-archival to dated `pastcontext.md` files. Timestamps from system clock (`YYYYMMDD-HHMMSS`). Terse entry style ("what, where, how — not why unless it's a decision").

**diary template:**

A CLAUDE.md template that instructs Claude to append entries to monthly journal files (`YYYY-MM.journal.md`). Entries written at milestones, a-ha moments, and session end. 2-10 lines natural language per entry. Append-only (bash `>>` for concurrency safety). Per-project directory paths in entries.

**Assessment:**

The short-term-memory skill is essentially a formalized version of Claude Code's built-in auto-memory pattern (`~/.claude/projects/.../MEMORY.md`), but scoped to working context rather than long-term knowledge. The diary template captures episodic history as flat append-only logs.

Together they implement a clean working-memory/episodic-log split with good ergonomics and a nice comparison table explaining how they complement CLAUDE.md and auto-memory. The skill's emphasis on surviving context compaction is practical — timestamps + structured sections make resumption easier.

**What's missing:** Everything beyond flat files. No search, no embeddings, no retrieval, no dedup, no consolidation, no entity linking, no decay. The diary has no way to find past entries except `grep`. The short-term memory has no mechanism to carry forward beyond the current project's 200-line window.

**Verdict:** Convergent MEMORY.md pattern with nice ergonomics. The working-memory vs episodic-log split maps to the same two tiers that obra/episodic-memory addresses with actual infrastructure. Does not contribute new mechanisms to the design space.

---

## 2026-03-07 — Gigabrain (legendaryvibecoder) — PROMOTED

**Source:** https://github.com/legendaryvibecoder/gigabrain

**What it is:** OpenClaw plugin (npm `@legendaryvibecoder/gigabrain`, v0.3.2) providing long-term memory: capture, recall, dedupe, audit, native markdown sync. Node.js 22+ (uses `node:sqlite` experimental API). Optional FastAPI web console. Bilingual (EN/DE).

**Promoted to ANALYSIS.md** because it contributes novel mechanisms not covered by other folk systems: event-sourced storage, multi-gate write pipeline with review queue, type-aware semantic dedup thresholds, explicit capture protocol via XML tags, and class-budgeted recall.

**Architecture highlights:**

- **Event-sourced storage**: append-only `memory_events` table + `memory_current` materialized projection. Every capture, rejection, dedup, and audit action is logged with event_id, reason_codes, similarity scores, and JSON payloads. Per-memory timeline API. This is the closest any folk system gets to the "corrections without forgetting" audit pattern.

- **7 typed memories**: USER_FACT, PREFERENCE, DECISION, ENTITY, EPISODE, AGENT_IDENTITY, CONTEXT — with type-aware dedup thresholds and type-based value scoring.

- **Multi-gate write pipeline**: `<memory_note>` XML tag parsing (explicit capture, not auto-extraction) -> junk filter (30+ patterns blocking system prompts, API keys, benchmark artifacts, wrapper tags) -> exact dedup (normalized content) -> semantic dedup (weighted Jaccard: word overlap 0.35 + char n-grams 0.25 + numeric tokens 0.2 + semantic anchors 0.2, with type-aware thresholds: USER_FACT/PREFERENCE at 0.78/0.62, CONTEXT at 0.84/0.70) -> plausibility heuristics (broken phrases, entityless numeric facts, low-confidence user facts) -> review queue for borderline cases -> optional LLM second opinion.

- **Recall pipeline**: query sanitization (strips prior context blocks) -> entity coreference resolution (pronoun follow-ups, bilingual) -> lexical search on SQLite registry + native markdown chunks -> multi-factor ranking (semantic overlap + value score + recency decay [stepped: 1d/7d/30d/90d/365d] + scope weight + durable boost + entity boost + person role boost + entity answer quality - noise penalty - archive penalty) -> class budgets (core 0.45 / situational 0.30 / decisions 0.25 with configurable token cap, default 1200) -> content dedup -> entity answer hints for "who is" queries -> XML-escaped injection block.

- **Nightly maintenance**: snapshot -> native_sync -> quality_sweep -> exact_dedupe -> semantic_dedupe -> audit_delta -> archive_compression -> vacuum -> metrics_report. Value scoring: weighted feature vector (personal relevance 0.19, relationship signal 0.15, agent identity 0.18, durable signal 0.12, retrieval utility 0.2, recency 0.08, specificity 0.08, ops noise -0.15) -> keep/archive/reject with configurable thresholds.

- **Person service**: entity mention tracking across memories, entity-aware retrieval ordering, "who is" query detection with entity answer hints.

- **Native sync**: indexes workspace MEMORY.md and daily notes alongside SQLite registry for unified recall with provenance tracking.

- **Security**: fail-closed token auth (timing-safe comparison), XML-escaping on all injected content, path traversal guards, SSRF protection, junk patterns block credentials.

- **Testing + benchmarks**: 12 tests (unit/integration/regression/performance), custom memorybench harness with A/B comparison, eval cases (bilingual EN/DE).

**What's missing:**
- No embeddings/vector search (lexical only via FTS + Jaccard)
- No consolidation/temporal hierarchy (nightly does quality sweeps, not temporal tiering)
- No versioning/correction semantics (event store is audit trail, not corrections; memories are active or archived, not versioned)
- No knowledge graph retrieval (graph-build.js generates co-occurrence graphs for export, not used in recall path)
- No true decay/TTL (recency weighting in scoring, but no scheduled eviction)

---

## 2026-03-07 — Hermes Agent (Nous Research)

**Source:** https://hermes-agent.nousresearch.com/docs/user-guide/features/memory

**What it is:** Hermes Agent is a multi-platform AI agent (CLI + Telegram/Discord/Slack/WhatsApp gateway) built by Nous Research. The memory subsystem is one feature among many (tools, skills, MCP, container isolation, etc.).

**Memory architecture:**

Two-file structured memory with hard capacity limits:
- **MEMORY.md** (~800 tokens, 2,200 char limit): agent's personal notes — environment facts, project conventions, workarounds, task logs, learned techniques.
- **USER.md** (~500 tokens, 1,375 char limit): user profile — identity, preferences, workflow habits, timezone, skill level.

Both live in `~/.hermes/memories/` and are injected into the system prompt as a **frozen snapshot at session start** (no mid-session updates). A `memory` tool supports `add`, `replace` (substring matching), and `remove` actions. Changes persist to disk immediately but don't affect the current session's system prompt.

**Session history:** SQLite (`~/.hermes/state.db`) with FTS5 full-text search. A `session_search` tool lets the agent query past conversations. JSON logs are also kept in `~/.hermes/sessions/` as human-readable backups.

**Skills as procedural memory:** Skills stored in `~/.hermes/skills/` as SKILL.md files with YAML frontmatter. Progressive disclosure: Level 0 (list, ~3k tokens) -> Level 1 (full content) -> Level 2 (specific reference files). Created when agent encounters complex workflows (5+ tool calls, error recovery, user corrections). Hub-installed skills get security scanning.

**Context compression:** `context_compressor.py` summarizes when approaching token limits, using a separate auxiliary LLM instance.

**Security (memory-relevant):** Memory writes are scanned for injection patterns (prompt injection, credential exfiltration, SSH backdoors, invisible Unicode). Context files (AGENTS.md, SOUL.md) are also scanned. This is more write-gating than most folk systems.

**Optional:** Honcho (Plastic Labs) integration for AI-generated cross-session user modeling.

**Assessment relative to ANALYSIS.md systems:**

What it covers well:
- The MEMORY.md pattern (convergent across folk systems) with explicit capacity budgets and forced consolidation at 80%
- Skills as procedural memory with progressive disclosure — maps to the procedural tier that ENGRAM/ReMe formalize
- Injection scanning on memory writes — more write-gating than MIRA-OSS
- FTS5 session search for basic episodic retrieval

What's missing vs the serious systems:
- **No semantic/vector retrieval** — FTS5 only, no embeddings, no hybrid search
- **No decay/importance scoring** — memories are static until manually edited; no access tracking, no recency weighting
- **No consolidation pipeline** — the 80% capacity wall forces the agent to consolidate on the fly, but there's no background job, no temporal hierarchy
- **No knowledge graph or entity linking**
- **No versioning or correction semantics** — `replace` does substring substitution; no history, no supersedes chains
- **No typed memory beyond the two files** — no episodic objects, no structured facts, no constraints tier
- **Frozen snapshot injection** — memory loads once at session start; multi-step tasks can't benefit from earlier writes in the same session
- **Tiny capacity** — 2,200 + 1,375 chars total is closer to Claude's CLAUDE.md pattern than to a real memory system

**Verdict:** Roughly at the "joelclaw before ADR-0077" level — a working MEMORY.md + session history baseline with good security hygiene, but no retrieval sophistication, no consolidation, no graph, no decay. Does not add new mechanisms to the design space beyond what's already covered in ANALYSIS.md. The injection scanning on memory writes is a practical detail worth noting.

---

## 2026-03-07 — Always-On Memory Agent (Google)

**Source:** https://github.com/GoogleCloudPlatform/generative-ai/tree/main/gemini/agents/always-on-memory-agent

**What it is:** An official Google ADK (Agent Development Kit) sample from the `GoogleCloudPlatform/generative-ai` repo. Single-file Python agent (~678 LOC) built on Gemini 3.1 Flash-Lite. Runs as a persistent background daemon with multimodal file ingestion, periodic LLM consolidation, HTTP API, and Streamlit dashboard. Created by a Senior AI PM at Google Cloud as a tutorial/PoC.

**Standalone analysis:** [ANALYSIS-google-always-on-memory-agent.md](ANALYSIS-google-always-on-memory-agent.md) (full deep dive exists; summary only here).

**Key points:**
- Multimodal ingestion (27 file types via Gemini native capabilities) is the most interesting pattern — most memory systems are text-only
- Always-on daemon pattern (file watcher + consolidation timer + HTTP API) is a clean architectural template
- **Critical gap:** retrieval is `SELECT * FROM memories ORDER BY created_at DESC LIMIT 50` — no search of any kind (no FTS, no embeddings, no keyword matching)
- No decay, no dedup, no versioning, no security model
- SQLite with no WAL mode, no connection pooling, no indexes beyond PKs

**Verdict:** Tutorial/PoC only. Useful as a Google ADK orchestration reference and for the multimodal ingestion pattern, but the memory system itself is not functional beyond ~50 memories. Does not contribute mechanisms worth comparing to the systems in ANALYSIS.md. Vendored in `vendor/always-on-memory-agent/`.
