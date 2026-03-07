---
title: "Reviewed — Triage Log for Examined Systems"
last_updated: 2026-03-07
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
| 2026-03-07 | Always-On Memory Agent (Google) | [GoogleCloudPlatform/generative-ai](https://github.com/GoogleCloudPlatform/generative-ai/tree/main/gemini/agents/always-on-memory-agent) | **PoC / tutorial only.** No retrieval (recency LIMIT 50), no decay, no dedup, no versioning. Standalone analysis exists. Not in ANALYSIS.md. |
| 2026-03-07 | Hermes Agent memory | [hermes-agent.nousresearch.com](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory) | **Minimal MEMORY.md baseline.** Clean security hygiene but no retrieval sophistication, no consolidation, no graph, no decay. Not worth a standalone analysis. |
| 2026-03-07 | Gigabrain | [legendaryvibecoder/gigabrain](https://github.com/legendaryvibecoder/gigabrain) | **Promoted to ANALYSIS.md.** Event-sourced storage, multi-gate write pipeline, type-aware semantic dedup, class-budgeted recall. See detailed notes below and ANALYSIS.md. |
| 2026-03-07 | Malaiac/claude (short-term-memory + diary) | [Malaiac/claude](https://github.com/Malaiac/claude) | **Convergent MEMORY.md pattern.** Working-memory skill (`current-context.md`) + append-only monthly journal. Nice ergonomics but no code, no retrieval, no storage beyond flat files. |
| 2026-03-07 | episodic-memory (obra) | [obra/episodic-memory](https://github.com/obra/episodic-memory) | **Well-built episodic retrieval layer.** Claude Code plugin: sync conversations → local embeddings (Transformers.js) → SQLite + sqlite-vec → semantic search via MCP. Hierarchical summarization, search subagent. No fact extraction, no consolidation, no decay. |

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
