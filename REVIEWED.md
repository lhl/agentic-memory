---
title: "Reviewed — Triage Log for Examined Systems"
last_updated: 2026-04-07
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
| 2026-04-07 | MemPalace (milla-jovovich) | [milla-jovovich/mempalace](https://github.com/milla-jovovich/mempalace) | **Not promoted.** Method-of-loci spatial metaphor (Wings/Rooms/Halls/Tunnels) over ChromaDB + SQLite KG, 4-layer progressive loading (~170 token wake-up), rule-based AAAK compression, 20-tool MCP server. Spatial metaphor is genuinely novel and worth tracking. **However, multiple README claims are false**: "contradiction detection" is not implemented, "zero information loss" compression drops 12.4pp on LongMemEval, headline 96.6% is just ChromaDB vector search. 2 days old, 7 commits. Standalone deep dive: `ANALYSIS-mempalace.md`. Re-examine if claims-vs-code gap closes. |
| 2026-04-03 | Hermes Agent memory providers (Nous Research) | [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) | **Re-reviewed.** Hermes is now a pluggable memory orchestration layer with a `MemoryProvider` interface, async prefetch/sync/mirror hooks, and 7 external providers. Built-in `MEMORY.md` / `USER.md` remains tiny and frozen-snapshot. Not promoted as a standalone memory system; the provider architecture is the interesting part. |
| 2026-04-03 | Honcho (plastic-labs) | [plastic-labs/honcho](https://github.com/plastic-labs/honcho) | **Not promoted.** Open-source memory library + managed service built around peers/sessions/workspaces, semantic search, peer cards, and dialectic Q&A. Interesting AI/user peer model, but service-centric and with limited visible correction/version semantics from the reviewed OSS surface. |
| 2026-04-04 | OpenViking (volcengine) | [volcengine/OpenViking](https://github.com/volcengine/OpenViking) | **PROMOTED to standalone analysis.** Open-source context database with filesystem paradigm (`viking://`), L0/L1/L2 tiered loading, unified memory/resources/skills, and automatic session extraction. See `ANALYSIS-openviking.md`. |
| 2026-04-03 | Mem0 OSS repo + Hermes provider | [mem0ai/mem0](https://github.com/mem0ai/mem0) | **Existing standalone analysis updated.** Public repo remains platform/SDK-centric; Hermes integrates only the hosted API path (`add` / `search` / `get_all`) with async prefetch/sync and a circuit breaker. See updated `ANALYSIS-arxiv-2504.19413-mem0.md`. |
| 2026-04-03 | Hindsight OSS repo + Hermes provider | [vectorize-io/hindsight](https://github.com/vectorize-io/hindsight) | **Existing standalone analysis updated.** Public repo now clearly ships cloud, Docker, and embedded local modes; Hermes exposes `retain` / `recall` / `reflect` with budgeted recall. See updated `ANALYSIS-arxiv-2512.12818-hindsight.md`. |
| 2026-04-03 | Holographic memory provider (Hermes in-tree) | Source: `vendor/hermes-agent/plugins/memory/holographic/` | **Not promoted.** Local SQLite+FTS5 fact store with entity tables, trust scoring, and optional HRR-based compositional retrieval (`probe` / `reason` / `contradict`). Clever local plugin, but shallow write path and limited lifecycle/maintenance semantics. |
| 2026-04-03 | RetainDB (cloud API + Hermes plugin) | [retaindb.com](https://www.retaindb.com) | **Not promoted.** Hermes adapter exposes hybrid search/profile/context/write/delete, but the engine remains largely closed; public GitHub presence is mostly starters/templates, so claims like 7 memory types and delta compression are not independently auditable from code. |
| 2026-04-04 | ByteRover CLI (campfirein) | [campfirein/byterover-cli](https://github.com/campfirein/byterover-cli) | **PROMOTED to standalone analysis.** Local-first CLI memory layer / coding agent with context tree, cloud sync, MCP, and strong self-reported LoCoMo / LongMemEval-S benchmarks. See `ANALYSIS-byterover-cli.md`. |
| 2026-04-02 | widemem-ai (remete618) | [remete618/widemem-ai](https://github.com/remete618/widemem-ai) | **Not promoted.** Clean library-style memory SDK (~3.5K LOC Python) with importance+decay scoring, hierarchical tiers (fact→summary→theme), YMYL domain protection, batch conflict resolution, self-supervised extraction data collection, MCP server, and uncertainty-aware retrieval. Well-engineered but convergent — no novel mechanisms beyond what ANALYSIS.md already covers. See detailed notes below. |
| 2026-03-28 | Supermemory (supermemoryai) | [supermemoryai/supermemory](https://github.com/supermemoryai/supermemory) | **PROMOTED to ANALYSIS.md + standalone.** Industry (startup) memory-as-a-service. Version chains, typed relationships (updates/extends/derives), static/dynamic profiles, temporal forgetting. Core engine proprietary — open-source is SDK/UI client only. Self-reported #1 on LongMemEval/LoCoMo/ConvoMem (no paper). See `ANALYSIS-supermemory.md`. |
| 2026-03-31 | Codex memory subsystem (OpenAI) | [openai/codex](https://github.com/openai/codex) | **Promoted to ANALYSIS.md.** Two-phase async pipeline (gpt-5.1-codex-mini → gpt-5.3-codex) with SQLite-backed job coordination, progressive disclosure memory layout, skills as procedural memory, usage-based retention via citation tracking, thread-diff-based incremental forgetting, ~1,400 lines of extraction/consolidation prompts. Standalone analysis exists. |
| 2026-03-31 | Claude Code memory subsystem (Anthropic) | Source: `/home/lhl/Downloads/claude-code/src` | **Promoted to ANALYSIS.md.** First-party production-scale memory: flat-file MEMORY.md + typed topic files + background extraction via forked agent + LLM-based relevance selection + team memory sync + auto dream consolidation + eval-validated prompts. Standalone analysis exists. |
| 2026-03-30 | MIRA-OSS v1 rev 2 (refresh) | [taylorsatula/mira-OSS](https://github.com/taylorsatula/mira-OSS) | **Standalone analysis refreshed.** Substantive update: background forage agent (sub-agent collaboration), user model synthesis pipeline with critic validation, portrait synthesis, 3-axis linking (adds TF-IDF), extraction pipeline restructure, verbose refinement ablated, 16 tools (up from 11), account tier system, context overflow remediation, immutable domain models. See ANALYSIS-mira-OSS.md. |
| 2026-03-07 | Always-On Memory Agent (Google) | [GoogleCloudPlatform/generative-ai](https://github.com/GoogleCloudPlatform/generative-ai/tree/main/gemini/agents/always-on-memory-agent) | **PoC / tutorial only.** No retrieval (recency LIMIT 50), no decay, no dedup, no versioning. Standalone analysis exists. Not in ANALYSIS.md. |
| 2026-03-07 | Gigabrain | [legendaryvibecoder/gigabrain](https://github.com/legendaryvibecoder/gigabrain) | **Promoted to ANALYSIS.md.** Event-sourced storage, multi-gate write pipeline, type-aware semantic dedup, class-budgeted recall. See detailed notes below and ANALYSIS.md. |
| 2026-03-07 | Malaiac/claude (short-term-memory + diary) | [Malaiac/claude](https://github.com/Malaiac/claude) | **Convergent MEMORY.md pattern.** Working-memory skill (`current-context.md`) + append-only monthly journal. Nice ergonomics but no code, no retrieval, no storage beyond flat files. |
| 2026-03-07 | episodic-memory (obra) | [obra/episodic-memory](https://github.com/obra/episodic-memory) | **Well-built episodic retrieval layer.** Claude Code plugin: sync conversations → local embeddings (Transformers.js) → SQLite + sqlite-vec → semantic search via MCP. Hierarchical summarization, search subagent. No fact extraction, no consolidation, no decay. |

---

## 2026-04-03 — Hermes Agent memory providers (Nous Research) — RE-REVIEWED

**Source:** https://github.com/NousResearch/hermes-agent (reviewed at `cc54818d2671f2e19c31305ef3f7cbc8d0d3294e`)

**What changed since the 2026-03-07 review:** Hermes is no longer just the tiny built-in `MEMORY.md` + `USER.md` baseline. As of the current docs and vendored repo, it now ships a proper `MemoryProvider` abstraction and seven external provider plugins: Honcho, OpenViking, Mem0, Hindsight, Holographic, RetainDB, and ByteRover.

**Architecture:**

- **Provider lifecycle hooks**: each provider can contribute a `system_prompt_block()`, `queue_prefetch()` / `prefetch()`, `sync_turn()`, `on_session_end()`, `on_memory_write()`, and provider-specific tool schemas.
- **Additive model**: the external provider runs alongside the built-in memory files; Hermes mirrors built-in memory writes outward rather than replacing them.
- **Background flow**: provider recall is prefetched before the next turn, sync is non-blocking after each response, and some providers run extra extraction on session end.
- **Profile-scoped configuration**: providers write config under `$HERMES_HOME/` (`honcho.json`, `mem0.json`, `hindsight/config.json`, `byterover/`, `config.yaml`, etc.), so data and credentials stay profile-isolated.

**What’s interesting:**

- Hermes has become a **memory orchestration layer** rather than just a flat-file memory toy.
- The adapter surface is reasonably clean and portable: it is easy to see how a provider plugs into the runner.
- One provider, **Holographic**, is fully in-tree and local, so Hermes now includes at least one inspectable retrieval implementation rather than only SaaS wrappers.

**What’s still limited:**

- The built-in Hermes memory is still the same small frozen-snapshot `MEMORY.md` / `USER.md` baseline.
- Only **one** external provider can be active at a time.
- Most of the actual memory sophistication lives in the providers; Hermes itself does not add correction history, graph semantics, or consolidation logic.

**Verdict:** **Not promoted.** Hermes is now a meaningful memory-provider host and adapter layer, but not itself a top-tier standalone memory architecture. The interesting review target is the provider ecosystem around it, not the built-in store.

---

## 2026-04-03 — Honcho (plastic-labs)

**Source:** https://github.com/plastic-labs/honcho  
**Hermes integration:** `vendor/hermes-agent/plugins/memory/honcho/`  
**Reviewed commits:** `29ff4653e5feadbd129b2fe342d3349e91453bc0` (Honcho), `cc54818d2671f2e19c31305ef3f7cbc8d0d3294e` (Hermes)

**What it is:** An open-source memory library with a managed cloud service for stateful agents. The core conceptual model is **workspaces + peers + sessions**. Honcho stores messages, builds peer representations, supports semantic search, and exposes a dialectic `chat` interface for synthesized answers about a person/peer.

**What Hermes adds on top:**

- `honcho_profile`, `honcho_search`, `honcho_context`, and `honcho_conclude` tools
- async prefetch instead of blocking every-turn calls
- cost-aware cadence knobs
- AI peer identity / SOUL.md integration
- local-vs-Honcho memory-mode controls in the integration spec

**What’s interesting:**

- **Peer model**: distinct user peer and AI peer is more explicit than most memory layers.
- **Dialectic QA**: the `peer.chat()` / context APIs are closer to “reason over a profile” than raw vector retrieval.
- **Session-first structure**: representations, peer cards, and continual learning make it clearly optimized for personalization / relationship memory.

**What’s missing vs stronger systems:**

- From the reviewed OSS surface, correction/version semantics are not clearly first-class.
- The strongest benchmark/eval claims are still self-published rather than independently inspectable from the repo itself.
- It is fairly service-centric: the managed platform is the main intended path.

**Verdict:** **Not promoted.** Honcho is a real system, not a toy, and the peer-centric design is distinctive. But from the reviewed code/docs surface it is still more productized user-modeling infrastructure than a memory architecture we need to promote into synthesis work.

---

## 2026-04-04 — OpenViking (volcengine) — PROMOTED

**Source:** https://github.com/volcengine/OpenViking  
**Hermes integration:** `vendor/hermes-agent/plugins/memory/openviking/`  
**Reviewed commits:** `3d2037aaea6a00c1bc29fe60abfe636078ad2b02` (OpenViking), `cc54818d2671f2e19c31305ef3f7cbc8d0d3294e` (Hermes)

**What it is:** An AGPL open-source **context database** for agents that unifies memories, resources, and skills under a filesystem-style model. The key abstraction is hierarchical storage with `viking://` URIs plus tiered loading (`abstract` / `overview` / `full`).

**What Hermes exposes:**

- `viking_search`
- `viking_read`
- `viking_browse`
- `viking_remember`
- `viking_add_resource`

**What’s interesting:**

- **Filesystem paradigm** instead of “just vector search”
- **L0/L1/L2 loading** as a first-class API concept
- **Unified context types**: memories, resources, and skills are in the same navigable substrate
- **Automatic session extraction** into categories like profile/preferences/entities/events/cases/patterns
- **Browsable retrieval**: the agent can navigate the memory structure, not just call a blind search endpoint

**What’s missing / why not promoted yet:**

- We have not done a deep enough code audit yet to validate the claimed retrieval/maintenance quality.
- It is a broader “agent context database” than a narrowly-scoped memory engine, so promotion should come after a more deliberate comparison pass.
- The operational stack is heavier than most reviewed systems (Python + Go + C++ pieces, dedicated server).

**Verdict:** **Promoted to standalone analysis.** OpenViking contributes a distinct architectural pattern to the repo: filesystem-native context management across memories/resources/skills, hierarchical L0/L1/L2 layering, and session-commit extraction into typed user/agent memory directories. Standalone analysis: `ANALYSIS-openviking.md`.

---

## 2026-04-03 — Mem0 OSS repo + Hermes provider — EXISTING ANALYSIS UPDATED

**Source:** https://github.com/mem0ai/mem0  
**Hermes integration:** `vendor/hermes-agent/plugins/memory/mem0/`  
**Reviewed commits:** `33d2bc495dba34e671a978bb2ae7e8078e0828fb` (Mem0), `cc54818d2671f2e19c31305ef3f7cbc8d0d3294e` (Hermes)

**What changed from the prior paper-only view:** The public repo is now clearly a **platform/SDK/CLI** product surface. Hermes uses the hosted API path only: `MemoryClient.search()` for prefetch, `MemoryClient.add()` for background turn sync, `get_all()` for profile reads, and an explicit `infer=False` path for `mem0_conclude`. The Hermes adapter also adds a simple circuit breaker after repeated failures.

**Assessment:** This does not overturn the existing standalone analysis. If anything, it confirms the prior read:

- Mem0 remains a clean explicit-memory product surface.
- Hermes exercises the **hosted semantic memory API**, not graph-mode internals or correction-history semantics.
- The existing paper analysis remains the right synthesis entrypoint.

**Verdict:** **Existing standalone analysis updated.** No new standalone needed; `ANALYSIS-arxiv-2504.19413-mem0.md` is the right place to carry the re-review date and repo/adapter notes.

---

## 2026-04-03 — Hindsight OSS repo + Hermes provider — EXISTING ANALYSIS UPDATED

**Source:** https://github.com/vectorize-io/hindsight  
**Hermes integration:** `vendor/hermes-agent/plugins/memory/hindsight/`  
**Reviewed commits:** `906b740dd795aae63cfc2d5e0b78362cd661c622` (Hindsight), `cc54818d2671f2e19c31305ef3f7cbc8d0d3294e` (Hermes)

**What changed from the prior paper-only view:** The public repo is now concrete and productized. It ships:

- cloud client mode
- Docker local server mode
- embedded Python mode (`HindsightEmbedded`)
- explicit `retain`, `recall`, and `reflect` APIs

Hermes exposes the same three operations and threads through a `budget` knob (`low` / `mid` / `high`) plus cloud/local configuration.

**Assessment:** The prior standalone analysis still stands and is strengthened:

- the “code availability claim” is now directly auditable
- the retain/recall/reflect surface is not just a paper abstraction
- Hermes demonstrates that Hindsight is usable as a drop-in agent memory backend, not only as a research prototype

**Verdict:** **Existing standalone analysis updated.** `ANALYSIS-arxiv-2512.12818-hindsight.md` remains the right synthesis artifact.

---

## 2026-04-03 — Holographic memory provider (Hermes in-tree)

**Source:** `vendor/hermes-agent/plugins/memory/holographic/` at `cc54818d2671f2e19c31305ef3f7cbc8d0d3294e`

**What it is:** A fully local, in-tree Hermes memory provider built on SQLite. It stores explicit facts, extracts/link entities, indexes facts with FTS5, tracks trust, and optionally uses **Holographic Reduced Representations (HRR)** for compositional retrieval.

**Architecture:**

- `facts`, `entities`, `fact_entities`, and `memory_banks` tables in SQLite
- FTS5 virtual table + triggers for keyword retrieval
- trust scoring with asymmetric feedback (`+0.05` helpful, `-0.10` unhelpful)
- `fact_store` tool with `add/search/probe/related/reason/contradict/update/remove/list`
- `fact_feedback` tool for post-use reinforcement
- optional session-end auto-extraction and built-in memory mirroring

**What’s interesting:**

- This is the most inspectable **local-only** provider in the Hermes set.
- `probe` / `related` / `reason` are more ambitious than generic top-k vector search.
- Trust feedback is simple but operationally clear.

**What’s missing:**

- The write path is shallow: explicit facts plus optional simple auto-extraction, not a rich extraction/consolidation pipeline.
- No version chains, supersedes semantics, or serious maintenance jobs.
- Entity extraction is lightweight/pattern-based rather than robust.

**Verdict:** **Not promoted.** Clever local plugin with unusual retrieval ideas, but too shallow to justify synthesis promotion.

---

## 2026-04-03 — RetainDB (cloud API + Hermes plugin)

**Source:** https://www.retaindb.com  
**Hermes integration:** `vendor/hermes-agent/plugins/memory/retaindb/` at `cc54818d2671f2e19c31305ef3f7cbc8d0d3294e`

**What it is:** A cloud memory API surfaced in Hermes via simple HTTP calls. The plugin exposes profile/context/search plus explicit remember/forget operations and background turn ingestion.

**What’s visible from the reviewed surface:**

- hybrid search claims (vector + BM25 + reranking)
- profile endpoint
- task-context endpoint
- explicit memory writes with `memory_type` + `importance`
- profile-scoped project naming in the Hermes adapter

**Why it is hard to evaluate seriously:**

- The public GitHub org is mostly **starters/templates**, not an inspectable open core engine.
- Claims like **7 memory types** and **delta compression** are not independently verifiable from the reviewed public code.
- Hermes is effectively a thin adapter over a closed API.

**Verdict:** **Not promoted.** Too closed to compare rigorously with the stronger open systems in this repo.

---

## 2026-04-04 — ByteRover CLI (campfirein) — PROMOTED

**Source:** https://github.com/campfirein/byterover-cli  
**Hermes integration:** `vendor/hermes-agent/plugins/memory/byterover/`  
**Reviewed commits:** `be9c3e7897977e3739a430be97164ee84b72e952` (ByteRover CLI), `cc54818d2671f2e19c31305ef3f7cbc8d0d3294e` (Hermes)

**What it is:** A local-first coding-agent memory layer packaged as a CLI (`brv`). It manages a context tree, supports cloud sync, exposes MCP, and positions itself as a portable shared memory substrate across many coding agents.

**What Hermes does with it:**

- shells out to `brv query`
- shells out to `brv curate`
- shells out to `brv status`
- keeps provider data profile-scoped under `$HERMES_HOME/byterover/`

**What’s interesting:**

- It is explicitly aimed at **coding agents**, not generic chatbots.
- The repo claims benchmark results from the production codebase: **96.1% LoCoMo** and **92.8% LongMemEval-S**.
- The local-first + optional cloud-sync model is pragmatic for developer workflows.

**What’s missing / why not promoted yet:**

- The benchmark claims are self-reported and not yet audited here.
- The Hermes adapter is just a CLI bridge; it does not expose ByteRover’s deeper internals.
- We have not yet read the full paper / implementation in enough depth for synthesis promotion.

**Verdict:** **Promoted to standalone analysis.** ByteRover contributes an agent-native memory/runtime design with a file-based context tree, explicit lifecycle metadata, 5-tier progressive retrieval, and a real product codebase paired with a benchmark paper. Standalone analysis: `ANALYSIS-byterover-cli.md`.

---

## 2026-04-02 — widemem-ai (remete618)

**Source:** https://github.com/remete618/widemem-ai
**Commit:** `f2b4e2f` (HEAD as of review)
**License:** Apache 2.0
**Language:** Python 3.10+, ~3,500 LOC library + ~2,300 LOC tests (140 tests claimed)
**Published:** PyPI `widemem-ai`, v1.4+
**Age:** 28 commits, 2026-03-08 to 2026-03-20

**What it is:** A standalone Python memory library (pip-installable SDK) with an MCP server. Designed as a pluggable memory backend for AI agents/assistants. Multi-provider: OpenAI/Anthropic/Ollama for LLM, OpenAI/Sentence-Transformers/Ollama for embeddings, FAISS/Qdrant for vector storage, SQLite for history/audit.

**Architecture:**

- **Write pipeline**: Input text → LLM fact extraction (JSON structured output, importance 1-10) → YMYL importance floor enforcement → batch conflict resolution (single LLM call: ADD/UPDATE/DELETE/NONE per fact vs existing memories found by embedding similarity) → content-hash dedup → vector store insert → SQLite history log.
- **Read pipeline**: Query → embed → vector search (FAISS inner product with L2 normalization) → TTL filter → multi-factor scoring (`similarity_weight × similarity + importance_weight × importance + recency_weight × recency`) → adaptive query scoring (factual queries boost similarity, temporal queries boost recency) → topic boost multiplier → YMYL decay immunity → optional hierarchy routing (fact/summary/theme tier preference by query type) → confidence assessment → `SearchResult` with `RetrievalConfidence` enum.
- **Hierarchical memory (3 tiers)**: `FACT` → `SUMMARY` → `THEME`. LLM groups facts by topic, summarizes groups, then synthesizes themes from summaries. Tier routing at query time: broad queries prefer themes, specific queries prefer facts, mid-range queries prefer summaries. Disabled by default.
- **Temporal decay**: 4 functions — exponential (`e^(-rate×days)`), linear (`1 - rate×days`), step (1.0/0.7/0.4/0.1 at 7/30/90+ days), none. Configurable rate. YMYL facts can be decay-immune.
- **YMYL domain protection**: Regex-based classifier (strong patterns like "blood pressure" + weak patterns like "doctor", 8 categories). Strong matches or 2+ weak matches → importance floor (default 8.0) + decay immunity + forced active retrieval.
- **Batch conflict resolution**: Single LLM call receives all new facts + all similar existing memories. Returns per-fact actions (ADD/UPDATE/DELETE/NONE) with target IDs. ID mapper translates sequential ints ↔ UUIDs for prompt compactness. Falls back to ADD-all on LLM failure.
- **Active retrieval**: Contradiction detection via LLM — compares new facts against existing high-similarity memories. Returns `Clarification` objects (contradiction/ambiguity + question). Callback-based: caller decides whether to proceed or abort.
- **Uncertainty-aware responses**: Confidence levels (HIGH/MODERATE/LOW/NONE) based on top-similarity thresholds (0.65/0.45/0.25). Three uncertainty modes (strict/helpful/creative) determine response guidance (refuse/hedge/answer/offer_guess). Frustration detection via keyword matching ("you forgot", "I told you") with fact extraction and auto-pin.
- **Pin mechanism**: `pin()` stores a memory at elevated importance (default 9.0). Useful for user-corrected facts or YMYL data. Processes through normal pipeline then elevates.
- **Self-supervised extraction collection**: Logs (input_text, extracted_facts, model, timestamp) to SQLite. Exportable as JSONL for fine-tuning a local extraction model. `SelfSupervisedExtractor` class can use a fine-tuned HuggingFace model with confidence-gated fallback to the LLM extractor.
- **Persistence repetition boosting**: `boost_on_repetition()` checks if content is ≥0.85 similar to existing memory; if so, bumps importance by configurable amount. "Things the user keeps mentioning automatically become harder to forget."
- **MCP server**: stdio-based, 6 tools (add, search, delete, count, pin, export, health). Defaults to Ollama + Sentence-Transformers for fully local operation.
- **History/audit**: SQLite table logs every ADD/UPDATE/DELETE with old_content/new_content and timestamp. Per-memory timeline queryable via API.
- **Retrieval modes**: Fast (top_k=10, 3x fetch, no hierarchy), Balanced (top_k=25, 4x fetch, hierarchy), Deep (top_k=50, 5x fetch, hierarchy). Per-query or config-level.

**What's interesting:**

- **YMYL as a first-class concern**: The dual-confidence regex classifier (strong/weak patterns across 8 categories) with importance floors, decay immunity, and forced active retrieval is the most explicit YMYL handling in our survey. No other system treats "your blood type should not decay" as a design principle.
- **Adaptive query scoring**: Dynamically adjusting similarity/importance/recency weights based on query type (factual → similarity-first, temporal → recency-first, multi-hop → default) is a pragmatic approach. The two-pass similarity rescue (ensure top-similarity results aren't buried) is a nice detail.
- **Self-supervised extraction pipeline**: Collecting (input, extraction) pairs for model distillation with a confidence-gated fallback extractor is forward-looking. No other folk system in our survey has this explicit distillation path.
- **Clean library design**: Pydantic models, provider abstractions, base classes, dependency injection, thread locking. This is the most pip-installable-SDK-shaped system in the survey. The MCP server is a thin wrapper over the library API.

**What's missing vs serious systems:**

- **No knowledge graph or entity linking** — memories are isolated facts in a vector store. No relationships, no entity resolution, no co-occurrence tracking.
- **No consolidation pipeline** — hierarchical summarization is on-demand (`summarize()`), not scheduled. No nightly maintenance, no quality sweeps, no pruning beyond TTL.
- **No event sourcing** — history table is an audit log, but memories are mutable (update-in-place). No append-only corrections, no versioning, no supersedes chains.
- **No write gating** — no junk filter, no plausibility heuristics, no content quality checks beyond what the LLM extraction prompt implicitly provides. Content-hash dedup only (no semantic dedup on the write path).
- **No team/shared memory** — single-user, single-machine.
- **No background processing** — all extraction is synchronous in the `add()` call path. No async workers, no batch processing outside the session.
- **No security hardening** — no path traversal guards, no injection scanning on memory content, no secret detection. The MCP server has no auth.
- **Repetition boosting is defined but not wired** — `persistence.py` defines `boost_on_repetition()` but it's not called anywhere in the pipeline. Dead code.
- **Hierarchy is off by default** — and the query router is keyword-based, not LLM-based. The grouping/summarization in `HierarchyManager` uses LLM but must be explicitly triggered.

**Comparison to existing ANALYSIS.md systems:**

| Mechanism | widemem-ai | Closest existing system |
|-----------|-----------|------------------------|
| Importance scoring | LLM-assigned 1-10 + YMYL floors | Gigabrain (value scoring), memv (LLM importance) |
| Temporal decay | 4 decay functions, configurable | MIRA-OSS (activity-day decay), memv (configurable decay) |
| Conflict resolution | Batch LLM call (ADD/UPDATE/DELETE/NONE) | Gigabrain (multi-gate pipeline), Codex (Phase 2 consolidation) |
| Hierarchical tiers | fact→summary→theme (LLM-based) | ENGRAM (working→episodic→semantic→procedural) |
| Active retrieval | Contradiction detection + clarification callback | Supermemory (forced contradiction detection) |
| YMYL protection | Regex classifier + importance floors + decay immunity | None in survey (unique, but narrow) |
| Self-supervised collection | Extraction pair logging for distillation | None in survey (unique, but unrealized) |
| Vector search | FAISS/Qdrant with multi-factor ranking | Standard across most serious systems |
| Uncertainty handling | Confidence levels + response guidance + frustration detection | None in survey (unique) |

**Verdict:** **Not promoted.** widemem-ai is a well-engineered, pip-installable memory SDK with clean architecture and good test coverage. However, its core mechanisms are convergent with patterns already well-covered in ANALYSIS.md — importance scoring, temporal decay, LLM extraction, batch conflict resolution, and vector retrieval are all established patterns. The unique contributions (YMYL protection, self-supervised extraction collection, uncertainty/frustration handling) are interesting surface features but don't represent novel architectural mechanisms:

- YMYL protection is regex-based classification + importance floors — a policy layer, not a new memory architecture pattern.
- Self-supervised extraction is a logging pipeline for future distillation — the distillation itself doesn't exist yet (`SelfSupervisedExtractor` falls back to LLM if no model loaded).
- Uncertainty handling is post-retrieval response formatting, not a retrieval mechanism.
- The repetition boosting mechanism is dead code.
- No knowledge graph, no event sourcing, no background consolidation, no team memory, no security model.

The system occupies the same design space as memv (vector search + LLM extraction + importance scoring) with cleaner packaging but fewer novel mechanisms than Gigabrain (event sourcing, multi-gate write pipeline, class-budgeted recall) or the first-party systems (Codex, Claude Code). Keep an eye on the self-supervised extraction path if it matures.

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

---

## 2026-04-07 — MemPalace (milla-jovovich)

**Source:** https://github.com/milla-jovovich/mempalace
**Reviewed at:** 988 stars, v3.0.0, 7 commits (repo created 2026-04-05)

**What it is:** A Python memory system (21 modules, 2 runtime deps: `chromadb` + `pyyaml`) organized around the **method of loci** — memories are placed in Wings (projects/people) → Rooms (topics) → Halls (categories) → Drawers (individual items). Everything lives in a single ChromaDB collection (`mempalace_drawers`) with metadata filtering for spatial navigation. Includes a SQLite temporal knowledge graph, a deterministic "AAAK" compression dialect, a 20-tool MCP server, and a CLI for mining existing projects/conversations.

**What's genuinely novel (and worth tracking):**

- **Spatial metaphor as organizing principle**: no other system in this survey uses navigable "rooms." The Wing/Room/Hall structure provides human-legible organization, progressive retrieval scoping (all → wing → wing+room), and automatic cross-domain links ("tunnels" where the same room name appears in multiple wings). The metaphor is appealing for onboarding and explainability even though the underlying mechanism is ChromaDB metadata filtering.
- **Very low wake-up cost**: 4-layer progressive loading (L0 identity ~100tok, L1 top-15 drawers ~500-800tok, L2 topic-scoped on-demand, L3 full search). ~170 tokens at boot is among the lowest in this survey — better than Claude Code (loads full MEMORY.md + topic files), OpenViking (recursive L0 abstracts), ByteRover (tiered context tree).
- **Zero-LLM write path**: all extraction, classification, and compression is deterministic (regex + keyword scoring). Fully offline, zero API cost. Trade-off: no semantic understanding during extraction.
- **Agent diary**: per-agent wings with timestamped diary entries in the same ChromaDB collection. Simple but functional per-agent persistent memory.
- **Mining pipeline**: walks existing project files (20 extensions) and conversations into drawers, with room detection via folder path → filename → keyword scoring → fallback.

**What's concerning (and why not promoted):**

Multiple README claims do not match the code:

| Claim | Code reality |
|-------|-------------|
| "30x compression, zero information loss" | AAAK is lossy abbreviation (regex + keyword dicts + templates); `decode()` is just string splitting, no text reconstruction; token counting uses `len(text)//3` heuristic; **LongMemEval drops from 96.6% to 84.2% in AAAK mode** |
| "Contradiction detection" | `knowledge_graph.py` has no contradiction detection — dedup only blocks identical open triples with same subject/predicate/object |
| 96.6% LongMemEval R@5 (headline) | Real score, but in "raw mode" — uncompressed text stored in ChromaDB, standard nearest-neighbor retrieval. The palace structure is not involved. This measures ChromaDB's default embedding model, not MemPalace. |
| "+34% retrieval boost from palace structure" | Metadata filtering (narrowing search to wing+room). Standard technique, not a novel retrieval mechanism. |
| "100% with Haiku rerank" | Not in the benchmark scripts. Method unverifiable. |

**Architecture details:**

- **Storage**: one ChromaDB persistent collection, metadata per drawer: wing, room, hall, source_file, chunk_index, importance, emotional_weight, filed_at. Drawer IDs: `drawer_{wing}_{room}_{md5[:16]}`.
- **Chunking**: 800 chars, 100 overlap, paragraph-then-line splitting, min 50 chars.
- **Search**: `col.query()` with optional `where` filters. Distance→similarity: `1-dist`. No re-ranking, no BM25, no hybrid retrieval.
- **Knowledge graph**: SQLite with `entities` and `triples` tables, temporal validity via `valid_from`/`valid_to` string dates. Inspired by Zep/Graphiti but much simpler (no community detection, no entity resolution beyond naive slug, no multi-hop traversal). Row parsing uses hardcoded column indices — fragile.
- **Palace graph**: not stored; computed on-demand by scanning all ChromaDB metadata in 1000-item batches and building set intersections. Rooms are connected if they share a wing (BFS). Tunnels are rooms appearing in 2+ wings. Lightweight but purely structural.
- **AAAK**: 5-step deterministic pipeline — entity detection (name→3-char code), topic extraction (word frequency), key sentence selection (decision-keyword scoring, truncated at 55 chars), emotion detection (keyword→code), flag detection (keyword→label).
- **General extractor**: regex classification into 5 categories (decisions/preferences/milestones/problems/emotional) with confidence scoring and sentiment-based disambiguation.
- **MCP server**: 20 tools, all implemented (no stubs), manual JSON-RPC 2.0 over stdin/stdout. Embeds `PALACE_PROTOCOL` in status output instructing the AI to verify before guessing — good prompt-engineering pattern.
- **Tests**: 4 test files for 21 modules.

**Benchmarks:**

- LongMemEval 96.6% R@5 (raw) / 84.2% (AAAK) / 89.4% (room-boosted) — retrieval only, no end-to-end QA
- LoCoMo 60.3% (session, top-10) / 77.8% (top-50) — mediocre vs field (HiMem ~83-89%, Hindsight similar)
- ConvoMem 92.9% average recall — but only 50 items per category (300 total)
- No baseline comparisons, no statistical significance, no end-to-end eval
- Benchmark scripts provided and appear runnable — reproducibility is a genuine strength

**What's missing vs. the field:** no decay/forgetting, no LLM-based extraction, no write gating, no content-level dedup, no provenance/audit trail, no hybrid search (BM25/FTS), no multi-hop graph retrieval, no feedback loops (echo/fizzle), no entity resolution.

**Standalone deep dive:** [ANALYSIS-mempalace.md](ANALYSIS-mempalace.md) (full architecture + benchmark + claims analysis; claims table at top).

**Verdict:** **Not promoted.** The spatial metaphor is the most novel contribution — genuinely interesting as an organizing principle that could layer on top of more sophisticated backends, and the 4-layer progressive loading with ~170 token wake-up is well-designed. However, the gap between README claims and code reality is the largest we've seen in this survey (features that don't exist, benchmark framing that credits the system for ChromaDB's performance, "lossless" compression that is measurably lossy). The repo is also extremely new (2 days, 7 commits). Worth re-examining if the claims are corrected and the implementation matures — particularly if the spatial structure develops semantic connections beyond metadata filtering.
