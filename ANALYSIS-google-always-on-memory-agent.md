---
title: "Analysis — Always-On Memory Agent (Google)"
date: 2026-03-07
type: analysis
system: always-on-memory-agent
source:
  - vendor/always-on-memory-agent (snapshot from GoogleCloudPlatform/generative-ai, captured 2026-03-07)
related:
  - ANALYSIS.md
  - ANALYSIS-academic-industry.md
---

# Analysis — Always-On Memory Agent (Google)

Always-On Memory Agent is a single-file Python agent (~678 LOC) built on Google ADK (Agent Development Kit) + Gemini 3.1 Flash-Lite that runs as a persistent background process. It ingests multimodal content (text, images, audio, video, PDFs), stores structured memories in SQLite, periodically consolidates them via LLM, and answers queries with source citations. It includes a Streamlit dashboard and an HTTP API.

This file is a critical deep dive over the vendored snapshot in `vendor/always-on-memory-agent`.

## Stage 1 — Descriptive (what it is)

### Product surface

A self-contained Python CLI/daemon with:
- **HTTP API** (aiohttp, 7 endpoints): ingest, query, consolidate, status, memories, delete, clear
- **File watcher**: polls `./inbox/` every 5s for 27 supported file types (text, image, audio, video, PDF)
- **Consolidation timer**: runs every N minutes (default 30), processes unconsolidated memories
- **Streamlit dashboard** (`dashboard.py`): visual UI for all operations, sample data presets, file upload
- **Multimodal ingestion**: leverages Gemini's native multimodal capabilities (inline bytes up to 20MB)

### Architecture

Four Google ADK agents orchestrated by a parent agent:

```
memory_orchestrator (router)
  +-- ingest_agent     (tools: store_memory)
  +-- consolidate_agent (tools: read_unconsolidated_memories, store_consolidation)
  +-- query_agent      (tools: read_all_memories, read_consolidation_history)
```

The orchestrator also has `get_memory_stats` as a direct tool. Routing is prompt-driven (the orchestrator's instruction says "new information -> ingest_agent, questions -> query_agent, etc."). There is no deterministic routing logic; the LLM decides which sub-agent to invoke.

Each `MemoryAgent.run()` call creates a **new session** (`InMemorySessionService`), meaning there is no cross-query conversational state. Every interaction is stateless from the ADK session perspective; all persistence is via SQLite.

### Data model

SQLite with three tables:

**`memories`**:
- `id` (autoincrement), `source`, `raw_text`, `summary`, `entities` (JSON array), `topics` (JSON array), `connections` (JSON array), `importance` (float 0.0-1.0), `created_at` (ISO timestamp), `consolidated` (boolean flag)

**`consolidations`**:
- `id`, `source_ids` (JSON array of memory IDs), `summary`, `insight`, `created_at`

**`processed_files`**:
- `path` (primary key), `processed_at` — tracks which inbox files have been ingested

No indexes beyond the primary keys. No FTS. No embeddings. No vector search.

### Write path (ingestion)

1. Content arrives via HTTP POST, file watcher, or dashboard upload
2. Text files: read as UTF-8, truncated to 10,000 chars; media files: read as bytes (skip if >20MB)
3. For text: `MemoryAgent.ingest()` sends `"Remember this information: {text}"` to the orchestrator
4. For media: `MemoryAgent.ingest_file()` sends multimodal content (text prompt + inline bytes) to the orchestrator
5. Orchestrator routes to `ingest_agent`
6. `ingest_agent` is prompted to extract: summary, entities, topics, importance score, then call `store_memory`
7. `store_memory` inserts a row into `memories`

Key observations:
- **No dedup**: identical content ingested twice produces two separate memory rows
- **No validation**: whatever the LLM extracts is stored directly; no schema enforcement on entities/topics
- **No write gating**: all content is auto-committed with no confirmation or quarantine
- **LLM-determined importance**: the 0.0-1.0 importance score is entirely LLM-assigned with no calibration

### Read path (retrieval)

1. Query arrives via HTTP GET or dashboard
2. `MemoryAgent.query()` sends `"Based on my memories, answer: {question}"` to the orchestrator
3. Orchestrator routes to `query_agent`
4. `query_agent` calls `read_all_memories()` — which is `SELECT * FROM memories ORDER BY created_at DESC LIMIT 50`
5. `query_agent` also calls `read_consolidation_history()` — `SELECT * FROM consolidations ORDER BY created_at DESC LIMIT 10`
6. The LLM synthesizes an answer from these results, citing memory IDs

**This is not retrieval — it is full scan with a hard cap.** There is no search, no ranking, no relevance filtering. The query agent receives the 50 most recent memories and 10 most recent consolidations, regardless of query content. For small memory stores this works; it breaks entirely at scale.

### Consolidation

1. Timer fires every N minutes (default 30)
2. Checks if there are >= 2 unconsolidated memories
3. Sends `"Consolidate unconsolidated memories"` to the orchestrator
4. `consolidate_agent` calls `read_unconsolidated_memories()` — `SELECT ... WHERE consolidated = 0 ... LIMIT 10`
5. LLM finds connections/patterns, produces summary + insight + connection list
6. `store_consolidation` inserts a consolidation row, updates `connections` JSONB on involved memories, marks them `consolidated = 1`

Key observations:
- **Batch size capped at 10**: only 10 unconsolidated memories are processed per cycle, which creates a backlog under heavy ingestion
- **One-shot consolidation**: once marked `consolidated = 1`, memories are never reconsolidated; no iterative refinement
- **Connections are append-only**: `connections` array grows monotonically; no pruning or decay
- **No hierarchy**: there is no temporal tiering (session/day/week) or consolidation-of-consolidations

### What it explicitly does NOT cover

- No embeddings or vector search
- No knowledge graph
- No decay/TTL/pruning
- No dedup or conflict handling
- No versioning or correction semantics
- No multi-user/tenant isolation
- No authentication or authorization
- No security model (prompt injection, taint tracking)
- No evaluation or benchmarks

## Stage 2 — Evaluative (coherence, risks, missing pieces)

### Strengths

- **Genuinely simple**: ~678 LOC for the entire agent + API + file watcher + consolidation loop. This is a good "weekend project" starting point for someone exploring memory agents.

- **Multimodal ingestion via Gemini**: leveraging Gemini's native multimodal capabilities (inline image/audio/video/PDF bytes) for memory extraction is a clean design choice. Most folk memory systems are text-only; this supports 27 file types with minimal code.

- **Always-on daemon pattern**: the combination of file watcher + consolidation timer + HTTP API as a persistent background process is architecturally sound. The "drop a file in inbox" UX is low-friction.

- **Cost-conscious model choice**: using Flash-Lite for continuous background processing is pragmatic. The README correctly identifies that cost/speed matter more than raw capability for background memory tasks.

- **Official Google ADK showcase**: as a first-party demonstration from Google's `generative-ai` repo of the ADK agent orchestration pattern (parent agent routing to specialist sub-agents with scoped tools), this is a clean, readable example. Its official provenance gives it weight as a reference implementation for how Google envisions ADK being used.

### Weaknesses / risks

- **Full-scan retrieval is the critical bottleneck**: `read_all_memories()` returns the 50 most recent memories regardless of query. This means:
  - Memory #51 and beyond are invisible to queries
  - Query relevance is entirely dependent on recency, not content
  - At even modest scale (hundreds of memories), retrieval quality collapses
  - This is fundamentally worse than naive RAG (which at least does similarity matching)

- **No search of any kind**: no FTS, no BM25, no embeddings, no vector search, no keyword matching. The README claims "No vector database. No embeddings" as a feature, but the alternative is not "LLM reads everything" — it's "LLM reads only the 50 most recent things."

- **Consolidation doesn't compensate for missing retrieval**: consolidations are stored in a separate table and also retrieved via `LIMIT 10` recency scan. Even if consolidation compresses information, the retrieval path doesn't use consolidated insights to guide search — it just dumps them alongside raw memories.

- **No decay, no pruning, no eviction**: memories accumulate forever. With `LIMIT 50` retrieval, older memories become permanently inaccessible without manual deletion. There is no importance-based eviction, no TTL, no access-count tracking.

- **LLM-as-router without fallback**: the orchestrator's routing is entirely prompt-driven. If the LLM misroutes (e.g., treats a question as information to ingest), there is no deterministic fallback. This is a known fragility of pure-LLM routing in multi-agent systems.

- **New session per request**: `MemoryAgent.run()` creates a fresh ADK session for every call. This means the orchestrator has no conversational context — it can't do follow-up queries, and can't maintain state across the ingest→consolidate→query lifecycle within a single session.

- **SQLite concurrency**: the file watcher, consolidation timer, and HTTP API all call `get_db()` independently (creating new connections). SQLite's write-lock behavior means concurrent writes (e.g., file watcher ingesting while API ingests) will produce `SQLITE_BUSY` errors under load. There is no connection pooling, no WAL mode configuration, and no retry logic.

- **No input validation on API endpoints**: the `/ingest` endpoint accepts arbitrary text with no size limit. The `/query` endpoint passes user input directly to the LLM. The `/clear` endpoint deletes all memories and inbox files with no confirmation.

- **Connections have no retrieval utility**: the `connections` array on memories is populated by consolidation but never queried. There is no link traversal, no graph-based retrieval, no use of connection metadata for ranking.

- **Dashboard uses `unsafe_allow_html=True` extensively**: memory summaries and entity names are injected into raw HTML without escaping (`dashboard.py:109-117`). If a memory contains `<script>` tags or HTML, it will be rendered directly.

### Comparison to other folk systems in this repo

| Dimension | Always-On Memory Agent | OpenClaw | ClawVault | memv | MIRA-OSS |
|-----------|----------------------|----------|-----------|------|----------|
| Deployment model | Python daemon (aiohttp) | Plugin/config suite | CLI tool (npm) | Library (PyPI) | Full-stack app (FastAPI) |
| Storage | SQLite (no FTS, no vectors) | SQLite + FTS5 + embeddings | Markdown files + graph JSON | SQLite + sqlite-vec + FTS5 | PostgreSQL + Valkey |
| Retrieval | Recency scan (LIMIT 50) | FTS5 + embeddings + rerank | QMD hybrid | sqlite-vec + FTS5 + RRF | BM25 + vector RRF + entity hubs |
| Consolidation | LLM-driven, timer-based, one-shot | Manual/scheduled | Observation + reflect pipeline | None yet | Segment collapse + extraction pipeline |
| Multimodal | Yes (27 file types via Gemini) | No | No | No | No |
| Decay/TTL | None | Activation/importance | Reindex/refresh | Bi-temporal validity | Multi-factor sigmoid (activity-day) |
| Write gating | None | Curation habits | Sanitization + path safety | Confidence >= 0.7 | None (auto-extract) |
| Dedup | None | 60-query benchmark | Graph index dedup | Fuzzy matching | 0.92 similarity threshold |
| Connections/graph | Stored but unused | SQLite facts + aliases | Graph index | None | Typed bidirectional links + entity hubs |
| Security | None | Convention-based | Path sanitization | None (library) | RLS + Vault + contextvars |
| Evaluation | None | 60-query benchmark | 449+ tests | None | Internal tuning tests |
| LOC (core) | ~678 | ~thousands | ~thousands | ~thousands | ~269 files |

**Position in the design space**: Always-On Memory Agent is the simplest system in this repo's collection by a significant margin. It is best understood as a **proof-of-concept for the always-on daemon pattern and multimodal ingestion via Google ADK**, not as a production memory system. It occupies the same architectural niche as a minimal MemGPT demo — showing the pattern without implementing the hard parts (retrieval, decay, corrections, security).

## Stage 3 — Prescriptive (what this informs)

### What Always-On Memory Agent adds to the design space

1. **Multimodal ingestion as a first-class concern**: most memory systems in this repo (and in the academic literature) are text-only. The pattern of "send raw bytes + extraction prompt to a multimodal LLM and store the structured output" is simple and effective for personal knowledge capture. This is worth noting as an ingestion pattern even if the rest of the pipeline is underdeveloped.

2. **Always-on background daemon as a deployment pattern**: the combination of file watcher + consolidation timer + HTTP API is a useful architectural template. The "inbox folder" pattern (drop a file, agent processes it) is low-friction and composable with other tools (e.g., email-to-folder, browser extension save-to-folder).

3. **Google ADK multi-agent orchestration as a reference**: the parent-agent + sub-agents pattern with scoped tools is a clean demonstration of ADK's capabilities. The tool function signatures (with docstrings that become the LLM's understanding of the tool) are well-structured.

4. **"Sleep-like" consolidation metaphor**: the framing of periodic background consolidation as analogous to human sleep-based memory consolidation is evocative, even if the implementation is a minimal version of what TiMem, HiMem, or EverMemOS do with temporal hierarchies and sufficiency verification.

### For the synthesis / shisad mapping

- **Multimodal ingestion adapter**: shisad's memory plan is text-centric. The pattern of "multimodal LLM extracts structured text from any media type" is a simple ingestion adapter that could front-end any memory pipeline. The 20MB inline limit and the "describe→summarize→extract entities→store" prompt template are reusable.

- **What NOT to do for retrieval**: this system is a concrete demonstration of why "just dump recent memories into the prompt" fails at scale. It validates the necessity of the indexing→retrieval→reading pipeline (LongMemEval decomposition) even for simple personal memory systems.

- **Consolidation needs hierarchy and reconsolidation**: one-shot `consolidated = 1` marking with no reconsolidation, no hierarchy, and no decay means consolidation outputs are never refined. This contrasts with HiMem (reconsolidation loop), TiMem (temporal hierarchy), and MIRA-OSS (segment collapse + extraction pipeline).

### Missing pieces (if someone wanted to evolve this)

1. **Retrieval**: add at minimum FTS5 on `raw_text` + `summary`; ideally embeddings + hybrid search. Without this, the system is fundamentally broken beyond ~50 memories.
2. **Decay/eviction**: importance scores are stored but never used for retrieval ranking or eviction. Add score-weighted retrieval and TTL-based pruning.
3. **Dedup**: add similarity-based dedup at ingest time (even a simple text hash would help).
4. **WAL mode + connection pooling**: enable SQLite WAL mode and use a shared connection to avoid `SQLITE_BUSY` under concurrent access.
5. **Input sanitization**: escape HTML in dashboard rendering; add size limits on API inputs; sanitize memory content before prompt injection.
6. **Deterministic routing**: replace or supplement LLM-based routing with keyword/intent classification for the three obvious categories (ingest/query/consolidate).

## Notes

- Capture date: 2026-03-07
- Source: https://github.com/GoogleCloudPlatform/generative-ai/tree/main/gemini/agents/always-on-memory-agent
- License: Apache 2.0 (GoogleCloudPlatform/generative-ai repo)
- Dependencies: google-adk >= 1.0.0, google-genai >= 1.0.0, aiohttp, streamlit, requests
- Model: Gemini 3.1 Flash-Lite (configurable via MODEL env var)
