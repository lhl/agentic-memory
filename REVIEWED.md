---
title: "Reviewed — Triage Log for Examined Systems"
last_updated: 2026-04-11
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
| 2026-04-11 | GBrain (garrytan) | [garrytan/gbrain](https://github.com/garrytan/gbrain) | **Not promoted.** Personal knowledge brain CLI/MCP/library (TypeScript, ~6.8K LOC, Bun) — Postgres+pgvector retrieval layer for markdown wikis. Contract-first 30-operation API, 3-tier chunking (recursive/semantic/LLM-guided), RRF hybrid search (keyword+vector+multi-query expansion), 4-layer dedup, typed links with recursive CTE graph traversal, version history, 3-backend file migration, RLS. Well-engineered retrieval infrastructure, but **not a memory system** — no extraction pipeline, no consolidation engine, no decay/forgetting, no knowledge graph intelligence in code. The "dream cycle," entity detection, and enrichment are prompt instructions in fat markdown skill files for an external agent to execute, not implemented functionality. 1 squash commit, v0.5.0, MIT. |
| 2026-04-09 | Karta (rohithzr) | [rohithzr/karta](https://github.com/rohithzr/karta) | **PROMOTED to standalone analysis.** Rust (~10.4K LOC) agentic memory library with Zettelkasten-inspired knowledge graph, 7-type dream engine (deduction, induction, abduction, consolidation, contradiction, episode digest, cross-episode digest), embedding-based query classification (6 modes), retroactive context evolution with drift protection, cross-encoder reranking with abstention, multi-hop BFS traversal, atomic fact decomposition, episode digests with structured metadata, foresight signals with TTL. BEAM 100K: 57.7% (vs 63% Honcho). 42 commits, MIT, single developer, v0.1.0. Most architecturally sophisticated single-developer memory system in the survey. See `ANALYSIS-karta.md`. |
| 2026-04-07 | KMS-Agent (haih-net) | [haih-net/agent](https://github.com/haih-net/agent) | **Not promoted.** Full-stack agent platform (Next.js + n8n + Prisma/Supabase) with an epistemic belief-graph KB (10 tables: concepts, n-ary facts with confidence/status/temporal validity, first-class contradictions, knowledge spaces with per-space projections, identity merge/split), typed MindLogs (12 types, append-only), and a biological reflex/reaction experience system with pre-turn reflection. Architecturally interesting schema design, but all memory intelligence is delegated to LLM tool calls — no vector search, no automated extraction, no graph traversal, no retrieval optimization. In-memory AgentWorld tree not persisted. Effectiveness loop for reflexes incomplete. |
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

## 2026-04-11 — GBrain (garrytan)

**Source:** https://github.com/garrytan/gbrain
**Stats:** 1 squash commit, TypeScript (Bun), MIT license, v0.5.0, created by Garry Tan (Y Combinator CEO)
**Stack:** Bun + Postgres + pgvector + pg_trgm + OpenAI (embeddings) + Anthropic (query expansion) + MCP SDK + S3/Supabase Storage
**LOC:** ~6,808 src + ~4,303 test + ~781 skills + ~3,934 docs

**What it is:** A personal knowledge brain — a CLI, MCP server, and TypeScript library for indexing, searching, and managing a markdown knowledge base at scale. Designed around the "compiled truth + append-only timeline" pattern: above the `---` separator is the current best understanding (rewritten as evidence changes), below is the evidence trail (never edited). GBrain is the retrieval/indexing layer; an external AI agent (OpenClaw, Hermes, or any MCP client) provides the intelligence for entity detection, enrichment, and maintenance.

Garry Tan reports using it with 10,000+ markdown files, 3,000+ people dossiers, 13 years of calendar data, and 5,800+ Apple Notes — a real deployment at genuine scale.

**Data model (Postgres, 12 tables):**

- **pages**: slug (unique, lowercased), type (9 types: person/company/deal/yc/civic/project/concept/source/media), title, compiled_truth, timeline, frontmatter (JSONB), content_hash (SHA-256 idempotency), search_vector (trigger-based tsvector with A/B/C weighting: title/compiled_truth/timeline+timeline_entries)
- **content_chunks**: page_id FK, chunk_text, chunk_source (compiled_truth | timeline), embedding (vector 1536d), model, token_count. HNSW index on embeddings (cosine).
- **links**: from_page_id/to_page_id with link_type (knows/invested_in/works_at/founded/references) and context. Bidirectional query support.
- **tags**: many-to-many, page_id + tag
- **timeline_entries**: structured events (date, source, summary, detail). Trigger-updates parent page's search_vector on change.
- **page_versions**: snapshot history (compiled_truth + frontmatter + timestamp). Auto-snapshotted before updates.
- **raw_data**: sidecar JSONB from external APIs (page_id + source, upsert semantics)
- **files**: binary attachments with storage_path, content_hash, mime_type. FK to pages.slug with ON UPDATE CASCADE.
- **ingest_log**: audit trail of import operations
- **config**: brain-level settings (embedding model, chunk strategy)
- **access_tokens**: bearer tokens for remote MCP (UUID, token_hash, scopes, revocation)
- **mcp_request_log**: usage logging for remote MCP requests

**Contract-first operations (operations.ts, 666 lines):**

Single source of truth for CLI, MCP, and tools-json. 30 operations: page CRUD (get/put/delete/list with fuzzy slug resolution via pg_trgm), keyword search (tsvector), hybrid query (vector+keyword+RRF+expansion), tags, links (add/remove/backlinks/graph traverse), timeline (add/get), stats/health, versions (history/revert), sync, raw data, slug resolution, chunks, ingest log, file ops (list/upload/url). All operations share a typed `OperationContext` with engine, config, logger, dryRun.

**Write path (import-file.ts, 125 lines):**

1. Parse markdown (frontmatter + compiled_truth/timeline split at `---` separator)
2. SHA-256 hash of all fields → skip if unchanged (idempotent)
3. Chunk compiled_truth + timeline via recursive chunker (default)
4. Optionally embed chunks via OpenAI text-embedding-3-large (1536d, batch 100, retry with exponential backoff)
5. Transaction: version snapshot → putPage (upsert) → tag reconciliation (remove stale, add new) → upsert chunks (batch multi-row INSERT ON CONFLICT, preserves existing embeddings via COALESCE)

**Read path — hybrid search (hybrid.ts, 86 lines):**

1. Multi-query expansion via Claude Haiku (tool_use, 2 alternative phrasings, skip queries <3 words, non-fatal failure)
2. Parallel: keyword search (websearch_to_tsquery, ts_rank, search_vector) + embed all query variants
3. Vector search for each embedding (HNSW cosine, 1-distance as score)
4. RRF fusion: `score = sum(1/(60 + rank))` across all result lists
5. 4-layer dedup:
   - Layer 1: Top 3 chunks per page
   - Layer 2: Jaccard word-set similarity >0.85 removal (proxy for cosine — no actual embeddings at dedup time)
   - Layer 3: Type diversity cap (60% max per type)
   - Layer 4: Per-page chunk cap (2)
6. Stale alerts: flag pages where `updated_at < max(timeline_entries.created_at)`

**Chunking (3 strategies, ~714 lines total):**

- **Recursive** (default for import): 5-level delimiter hierarchy (paragraphs → lines → sentences → clauses → words), 300-word chunks, 50-word sentence-aware overlap, greedy merge to 1.5× target. Lossless reassembly invariant.
- **Semantic**: Split sentences → embed each → adjacent cosine similarities → Savitzky-Golay smoothing (window=5, poly=3) → local minima as topic boundaries → group → recursively split oversized groups. Full Gauss-Jordan matrix inversion for the SG filter coefficients. Falls back to recursive on any failure.
- **LLM-guided**: Pre-split into 128-word candidates → sliding window of 5 → Claude Haiku identifies topic shifts → merge at split points. 3 retries per window. Most expensive, best results.

**Graph traversal (postgres-engine.ts):**

Recursive CTE with configurable depth (default 5). Follows outgoing links, collects slug/title/type/depth + per-node links as JSONB aggregate. DISTINCT to avoid cycles.

**File migration lifecycle (files.ts, 485 lines):**

3-stage: mirror (copy to cloud, local untouched) → redirect (local replaced with YAML breadcrumbs) → clean (breadcrumbs removed). Reversible via restore until clean. File resolver: local → .redirect breadcrumb → .supabase marker → cloud URL. Backends: S3-compatible, Supabase Storage, local filesystem.

**MCP server (server.ts, 91 lines):**

Auto-generated from operations — ListTools maps operation params to JSON Schema, CallTool dispatches to operation handlers. Stdio transport. Also deployed as Supabase Edge Function for remote access (with bearer token auth).

**Skills (781 lines across 7 markdown files):**

Fat markdown instruction files that tell an AI agent HOW to use gbrain: ingest (meeting transcripts → entity detection → brain page updates), query (3-layer search with synthesis), maintain (find contradictions, stale pages, orphans), enrich (external API data), briefing (daily meeting prep), migrate (Obsidian/Notion/Logseq/Roam), setup (auto-provision + import).

The "dream cycle" is described in the skillpack as a cron job pattern: entity sweep → enrich thin spots → fix broken citations → consolidate memory. In OpenClaw it ships as DREAMS.md; for Hermes it's a cron command. **No dream logic exists in gbrain's codebase** — it's an instruction for an external agent.

**What's well-engineered:**

- **Contract-first design**: Single `operations.ts` generates CLI, MCP, and tools-json — structural parity enforced by tests. Clean separation of concerns.
- **Hybrid search with RRF**: Genuine two-path retrieval (keyword + vector) with principled fusion. Multi-query expansion via Haiku is a nice touch. Stale-page alerting in search results.
- **3-tier chunking**: The semantic chunker with Savitzky-Golay smoothing is real signal processing, not a toy. LLM-guided chunking for high-value content is pragmatic tiering.
- **Idempotent everything**: Content-hash-based skip on import, upsert semantics everywhere, COALESCE to preserve existing embeddings on re-import without re-embedding.
- **Security**: RLS on all tables (conditional on BYPASSRLS privilege), bearer token auth for remote MCP, content-hash dedup, path traversal protection on slugs.
- **Test coverage**: 20 unit test files + 4 E2E test files, parity tests for CLI/MCP/tools-json structural identity. Docker-based E2E against real Postgres+pgvector.

**Why not promoted — it's not a memory system:**

GBrain is a **retrieval/indexing layer for human-curated markdown**, not an agentic memory system in the sense this survey covers. The critical distinction:

1. **No extraction pipeline**: There is no code that reads conversations, documents, or sessions and extracts facts, entities, or memories. Import reads markdown files verbatim. The `importFromContent` pipeline is: parse frontmatter → hash → chunk → embed → store. No LLM extraction, no fact decomposition, no entity recognition.

2. **No consolidation engine**: No code merges, summarizes, or reorganizes memories over time. The "dream cycle" and "compiled truth rewriting" are described only as skill prompts — instructions for an external agent. Gbrain's own code never rewrites compiled truth, never consolidates timeline entries, never resolves contradictions.

3. **No decay or forgetting**: No importance scoring, no access-frequency tracking, no TTL, no archival. All pages are equally weighted forever. The `page_versions` table stores snapshots but there's no pruning, no retention policy, no usage-based selection.

4. **No knowledge graph intelligence in code**: Links exist (typed, bidirectional, with graph traversal), but no code creates links automatically, no entity resolution, no co-occurrence detection, no link inference. Link creation is manual (via CLI/MCP tool call or agent skill prompt).

5. **No write gating**: No junk filter, no quality heuristics, no semantic dedup on the write path. Content-hash dedup (exact match) only.

6. **All "intelligence" is in skill prompts**: Entity detection, enrichment, dream cycles, compiled truth maintenance, contradiction detection, citation hygiene — all described in `skills/*.md` and `docs/GBRAIN_SKILLPACK.md` as instructions for an external AI agent. This is the same architecture as giving Claude Code a detailed CLAUDE.md file — valuable in practice, but the intelligence is in the LLM, not in the system.

**Comparison to existing ANALYSIS.md systems:**

| Mechanism | GBrain | Closest existing system |
|-----------|--------|------------------------|
| Hybrid search (keyword + vector + RRF) | Implemented, with multi-query expansion | Standard across most promoted systems |
| 4-layer dedup | Type diversity + per-page cap + text similarity | Gigabrain (type-aware thresholds), Claude Code (LLM routing) |
| 3-tier chunking | recursive/semantic (SG smoothing)/LLM-guided | Unique chunking sophistication, but chunking is a retrieval concern, not memory |
| Version history | Snapshot before every update | Codex (thread-diff), Supermemory (version chains) |
| Graph traversal | Recursive CTE, configurable depth | Karta (BFS + dream-aware), Gigabrain (co-occurrence) |
| Extraction pipeline | None in code (skill prompts only) | Every promoted system has automated extraction |
| Consolidation | None in code (skill prompts only) | Codex (Phase 2), Claude Code (auto dream), Gigabrain (nightly sweep) |
| Decay/forgetting | None | MIRA-OSS, Codex, memv all implement decay |
| Write gating | Content-hash dedup only | Gigabrain (30+ junk patterns + semantic dedup), widemem-ai (YMYL + conflict resolution) |

**What's interesting for our survey (even though not promoted):**

- The **compiled truth + timeline** knowledge model is a clean articulation of the "living summary + evidence trail" pattern. Most memory systems implement this implicitly; GBrain names it explicitly and builds the schema around it.
- The **contract-first operation design** (one definition generates CLI + MCP + JSON schema) is good infrastructure engineering worth noting for any system that needs multiple interfaces.
- The **skillpack** (docs/GBRAIN_SKILLPACK.md) is the most detailed published playbook for how a production AI agent should interact with a knowledge base — brain-agent loop, entity detection protocol, enrichment pipeline, dream cycle, cron schedule. As a *pattern document*, it's more valuable than the code.
- **Real-world scale validation**: 10K+ files, 3K+ people, 13 years of data. This is one of very few systems in our survey with evidence of sustained personal use at scale.

**Verdict:** **Not promoted.** GBrain is well-engineered retrieval infrastructure for markdown knowledge bases — the hybrid search, chunking pipeline, and contract-first API design are solid. But it contributes no novel memory mechanisms to the survey. The system delegates all memory intelligence (extraction, consolidation, entity detection, dream cycles) to external AI agents via prompt instructions. In our taxonomy, it's a **storage + retrieval backend** that an agentic memory system could build on top of, not an agentic memory system itself. The skillpack is worth reading as a production agent-memory playbook, but the code doesn't implement the patterns it describes. Analogous to Supabase being good infrastructure without being a memory system.

---

## 2026-04-09 — Karta (rohithzr) — PROMOTED

**Source:** https://github.com/rohithzr/karta
**Stats:** 42 commits, Rust (2024 edition), MIT license, v0.1.0, single developer
**Stack:** Rust + LanceDB (embedded vector) + SQLite (WAL mode, graph/state) + async-openai (any OpenAI-compatible endpoint) + Jina AI reranker + tokio
**LOC:** 10,423 total (6,666 core, 3,754 tests)

**What it is:** An agentic memory system built as a Rust library (`cargo add karta`) that combines a Zettelkasten-inspired knowledge graph with active background reasoning. Three-path architecture: write (index + link + evolve), read (search + traverse + rerank + synthesize), dream (cluster + infer + persist). The tagline — "thinks, not just stores" — is accurate: the dream engine performs genuine inference operations that create new knowledge from existing notes.

**Data model:**

- **MemoryNote**: Core unit. Content, LLM-generated context, keywords, tags, embedding (1536d), bidirectional links, evolution history, provenance (6-variant enum), confidence score, lifecycle status (Active/Deprecated/Superseded/Archived), turn_index, source_timestamp, last_accessed_at.
- **Provenance enum**: `Observed` | `Dream { dream_type, source_note_ids, confidence }` | `Profile { entity_id }` | `Episode { episode_id }` | `Fact { source_note_id }` | `Digest { episode_id }`. Every derived note traces to its sources.
- **AtomicFact**: Fine-grained retrieval unit. Content, subject, embedding, stored in separate LanceDB table. 1–5 extracted per note during ingestion.
- **ForesightSignal**: Forward-looking prediction with validity window (`valid_from`, `valid_until`), extracted during ingestion or generated by abduction dreams.
- **Episode**: Thematic session group. Narrative, topic tags, note IDs, optional narrative note stored in vector index.
- **EpisodeDigest**: Structured metadata — entities (name, type, count, latest_value), date range, aggregation entries (label, count, items list), topic sequence, digest text.
- **NoteStatus**: `Active` | `Deprecated { by }` | `Superseded { by }` | `Archived`.

**Write path (write.rs, 607 lines):**

1. Parallel: LLM attribute generation (context, keywords, tags, foresight signals, atomic facts) + raw content embedding
2. ANN candidate search using raw embedding (fast path)
3. Compute enriched embedding (content + context + keywords) for storage
4. LLM link decisions on candidates above similarity threshold
5. Retroactive evolution: for each linked note, LLM updates its context to reflect implications of the new connection. **Drift-protected**: `max_evolutions_per_note` gate (default 5) — over-evolved notes skip evolution and need consolidation instead.
6. Store note in LanceDB with enriched embedding
7. Store bidirectional links in SQLite
8. Store foresight signals with parsed or default TTL (90 days)
9. Embed and store atomic facts in dedicated LanceDB table

With episodes enabled: boundary detection (hard time gap threshold + LLM-based thematic shift assessment), narrative synthesis, episode narrative stored as searchable note.

**Read path (read.rs, 1,153 lines) — the most complex in the survey:**

1. **Query classification**: Embed query → cosine similarity to 6 mode centroids (Temporal, Recency, Breadth, Computation, Existence, Standard) built from prototype examples. Keyword fallback if embedding fails. Lazy-initialized with 60s timeout.
2. **Parallel retrieval**: ANN search on notes + ANN search on atomic facts (if enabled). Mode-specific fetch_k multipliers.
3. **Entity profile auto-include**: Match query terms against known entity profiles, inject with graph bonus.
4. **Two-level episode retrieval**: ANN results partitioned into episode narratives vs. flat notes. Episode narratives above threshold trigger drilldown → fetch constituent notes, filter active, sort chronologically (turn_index → source_timestamp → created_at).
5. **Scoring**: Blended similarity + exponential recency decay (configurable half-life). Mode-specific recency weight (Recency mode: 0.60). Graph-aware PageRank-lite bonus (`ln(1 + link_count) * graph_weight`). Foresight boost for notes with active signals.
6. **Fact-to-note expansion**: High-scoring atomic facts → fetch parent notes → boost into results.
7. **Episode link traversal**: Follow cross-episode links to find related episode digests.
8. **Structured digest query**: For Computation/Breadth/Recency modes, search episode digest entities and aggregations via keyword matching. Enables "how many X" answers from pre-computed counts.
9. **Merge**: profiles → structurally matched digests → linked digests → episode-drilled notes → fact-expanded notes → flat ANN hits. Truncate to top_k.
10. **Reranker**: Cross-encoder (Jina recommended) or LLM fallback. Raw Jina scores preserved (not normalized) for meaningful abstention threshold. **Abstention gate**: if best relevance < threshold, system says "I don't know" rather than hallucinating. Computation mode skips reorder (preserving ANN order for completeness over precision).
11. **Contradiction force-retrieval**: Scan results for contradiction dream notes → fetch both source notes → inject as `[CONTRADICTION SOURCE]` with instructions to present both sides. Also checks if retrieved notes are linked to contradiction dreams via graph.
12. **Chronological ordering**: All notes sorted by turn_index → source_timestamp → created_at before synthesis. "LLMs perform better when notes arrive in chronological sequence, not relevance order."
13. **Synthesis**: Structured output with chain-of-thought reasoning, provenance markers (FACT/INFERRED/PROFILE/EPISODE/DIGEST), age display, contradiction flagging, abstention signal.
14. **Insufficient-info retry**: For Computation/Temporal modes, if answer admits insufficient info ("can't determine", "not mentioned"), retry with 3x wider retrieval and no reranker.

**Dream engine (dream/engine.rs, 952 lines):**

7 dream types, all fully implemented:

1. **Deduction** (per-cluster, ≥2 notes): Chain-of-thought reasoning to derive logically necessary conclusions from linked facts. Confidence-gated writing.
2. **Induction** (cross-cluster, ≥4 notes, sliding windows): Identify repeated patterns across multiple notes, generalize into principles. Reports supporting note count.
3. **Abduction** (cross-cluster, ≥3 notes, sliding windows): Identify conspicuous gaps in knowledge, hypothesize explanations. Emits foresight signals from hypotheses.
4. **Consolidation** (per-cluster, ≥3 notes): Build "peer cards" — entity profiles consolidating everything known about a person/project/topic. Creates or incrementally merges profile notes via LLM. Profiles linked to source notes and auto-included during retrieval.
5. **Contradiction** (per-cluster, ≥2 notes): Detect mutually exclusive facts or tensions. Severity levels (critical/tension/none). Contradiction notes linked to sources for force-retrieval during reads.
6. **Episode digest** (per-episode): Extract structured metadata — entities with types and counts, date ranges, aggregation summaries, topic sequences. Store as both structured SQLite data and searchable vector note.
7. **Cross-episode digest** (across ≥3 digests): Track entity timelines across episodes, identify value changes, create inter-episode links (entity_continuity, value_update).

Infrastructure:
- **Incremental processing**: Cursor-based. Only processes notes created/updated since last dream run, plus their linked neighbors.
- **Deduplication**: Embeds dream content, checks similarity against existing dream notes of same type. >0.85 similarity = duplicate, skip.
- **Cluster building**: Union-find over link graph. Only clusters with 2+ notes are dreamed about.
- **Foresight expiry**: Stale signals expired at start of each dream pass.

**Reranker (rerank.rs, 307 lines):**

Three implementations behind a trait:
- **JinaReranker**: Jina AI cross-encoder API (`jina-reranker-v3`). True cross-attention scoring. Raw scores preserved (not normalized) — this is deliberate: "Normalizing would destroy the abstention signal."
- **LlmReranker**: Batched 0-10 scoring prompt. Cheap fallback.
- **NoopReranker**: Pass-through for testing/cost saving.

**Storage (trait-based, 143 lines of traits):**

VectorStore trait: upsert, find_similar, get, get_many, get_all, delete, count, upsert_fact, find_similar_facts.
GraphStore trait: links (bidirectional), evolution history, dream state (cursor, runs), foresight signals, episodes, profiles, episode digests, atomic fact metadata, episode links, lifecycle.

Default implementations: LanceDB (lance.rs, 575 lines) for vector + SQLite (sqlite.rs, 730 lines) for graph. SQLite uses WAL mode. Production options (pgvector, Qdrant, Postgres, Dolt) mentioned in README but not implemented.

**Configuration (config.rs, 237 lines):**

Fully configuration-driven with sensible defaults:
- Per-operation LLM model overrides (write.attributes, dream.abduction, etc.)
- ReadConfig: recency_weight, recency_half_life_days, graph_weight, hop_depth/decay, abstention_threshold, episode settings, fact retrieval settings
- WriteConfig: top_k_candidates, similarity_threshold, evolve toggle, max_evolutions_per_note, foresight TTL, atomic facts toggle
- DreamConfig: write_threshold (confidence gate), max_notes_per_prompt, enabled dream types
- ForgetConfig: enabled (default false), decay_half_life_days, archive_threshold, sweep_on_dream

**Benchmarks (BEAM 100K, 400 questions, 10 abilities):**

| Ability | Day 2 (51.3%) | Best (57.7%) | Phase Next (53.0%) |
|---------|---------------|--------------|---------------------|
| preference_following | 80% | 78% | 70% |
| abstention | 60% | 68% | 68% |
| contradiction_resolution | 52% | 67% | 50% |
| multi_session_reasoning | 53% | 66% | 66% |
| instruction_following | 54% | 64% | 56% |
| summarization | 64% | 61% | 64% |
| information_extraction | 50% | 63% | 58% |
| temporal_reasoning | 40% | 53% | 39% |
| knowledge_update | 45% | 40% | 33% |
| event_ordering | 31% | 36% | 36% |

Reference: Honcho 63.0%. Active development targeting 90%+.

11 benchmark runs tracked with per-ability breakdowns. 243 failures catalogued by root cause: INCOMPLETE_RETRIEVAL 40.7%, FALSE_ABSTENTION 18.1%, WRONG_ORDER 17.3%, CONTRADICTION_MISS 10.7%, JUDGE_NOISE 5.8%, WRONG_COMPUTATION 3.3%, HALLUCINATION 2.9%, FORMAT_MISS 1.2%.

The developer's understanding of failure modes is unusually detailed — failure sub-patterns include "old value returned" (ANN prefers established notes over updates), "specific detail missed" (top_k too narrow), "cross-note computation failed" (both facts not retrieved together).

**Testing (3,754 lines):**

- **eval.rs**: 10 integration scenarios covering linking, evolution, knowledge graphs, temporal reasoning, contradictions. Real LanceDB + SQLite (not mocked).
- **beam_100k.rs**: Full BEAM 100K harness (798 lines).
- **bench_beam.rs**: Detailed benchmark runner with per-ability scoring (1,112 lines).
- **real_eval.rs**: Real LLM evaluation (requires API keys, `#[ignore]`).
- **MockLlmProvider**: Deterministic responses for offline testing (403 lines).

**What's novel (contributes mechanisms not in any other surveyed system):**

1. **Dream engine with 7 inference types**: No other system performs background deduction, induction, abduction, or contradiction detection. Consolidation exists elsewhere (Codex, Claude Code), but the full inference pipeline is unique. Dreams feed back into retrieval (contradiction force-injection, profile auto-include, foresight boosting).
2. **Embedding-based query classification**: Learned classifier using prototype centroids rather than regex/keywords. Lazy-initialized, timeout-protected with fallback. No other system classifies queries this way.
3. **Retroactive evolution with drift protection**: Notes' contexts evolve when new related information arrives, gated by max_evolutions to prevent unbounded growth. The gate signals "needs consolidation" — a clean interaction between write path and dream engine.
4. **Foresight signals**: Forward-looking predictions with validity windows, extracted during ingestion, emitted by abduction dreams, boosted during retrieval, expired during dream passes. No other system models predictions as first-class objects.
5. **Atomic facts with per-fact embeddings**: Fine-grained retrieval alongside coarse note retrieval. Parallel ANN search on both tables, fact hits expanded to parent notes with boost. No other system does dual-granularity vector search.
6. **Episode digests with structured metadata**: Pre-computed entities (typed, counted, with latest values), date ranges, aggregation entries (label + count + items), topic sequences. Enables structured matching for Computation/Breadth queries — answers "how many X" from pre-computed counts rather than re-counting from notes.
7. **Cross-episode entity timelines**: Dream engine tracks entity value changes across episodes, creates typed inter-episode links (entity_continuity, value_update). No other system in the survey builds cross-session entity evolution graphs.
8. **Insufficient-info retry**: For Computation/Temporal modes where missing specific facts is the failure mode, detects "I don't know" in the answer and retries with 3x wider retrieval. Pragmatic self-healing.

**What's missing / limitations:**

- **No MCP server, no agent integration**: Pure library. karta-cli exists as a stub (`fn main() {}`). No Claude Code plugin, no MCP, no HTTP API.
- **Forgetting not wired**: ForgetConfig + decay math exist. `last_accessed_at` updated on retrieval. But no sweep function is called — ForgetConfig.enabled defaults to false and no code path invokes archival.
- **No write gating**: No junk filter, no content quality checks, no semantic dedup on the write path. Evolution gating is the only write-side protection.
- **No team/shared memory**: Single-user, single-machine.
- **No correction/versioning semantics**: Evolution updates context in-place. NoteStatus lifecycle exists (Deprecated { by }, Superseded { by }) but no code automates status transitions. No append-only correction chains.
- **No security hardening**: No injection scanning, no secret detection, no auth.
- **Production storage not implemented**: VectorStore/GraphStore traits exist for pgvector/Qdrant/Postgres/Dolt but only LanceDB/SQLite are built.
- **Phase Next regression**: Atomic facts + episode digests caused a 4.7pp drop (57.7% → 53.0%) — dream/digest/fact notes polluting direct ANN results. Partially fixed by filtering, but still below pre-Phase-Next best.
- **Single developer, v0.1.0**: Early stage. Active development but no community, no CI/CD.

**Comparison to existing ANALYSIS.md systems:**

| Mechanism | Karta | Closest existing system |
|-----------|-------|------------------------|
| Dream engine (7 types) | Unique — deduction, induction, abduction, contradiction, consolidation, episode digest, cross-episode digest | No equivalent. Codex/Claude Code consolidate; Gigabrain does nightly quality sweeps; neither infers new knowledge |
| Retroactive evolution | Context evolve with drift gate | OpenViking updates L1 on write; Codex Phase 2 consolidation |
| Query classification | Embedding centroids (6 modes) | ByteRover tiered retrieval; Claude Code LLM routing; none use embedding-based classification |
| Cross-encoder reranking | Jina + LLM + noop (trait-based) | widemem-ai mentions reranking; no one else implements cross-encoder integration |
| Provenance tracking | 6-variant enum with source IDs | Gigabrain event-sourcing; Codex citation tracking |
| Foresight signals | Predictions with TTL, boosted in retrieval | Unique in survey |
| Atomic fact retrieval | Per-fact embeddings, parallel search, parent expansion | Codex per-rollout memories; no dual-granularity search |
| Episode digests | Structured metadata (entities, aggregations, topic sequences) | obra/episodic-memory summaries (less structured) |
| Multi-hop graph traversal | BFS with depth + decay | Gigabrain co-occurrence graph; OpenViking filesystem traversal |
| Knowledge graph | Bidirectional links with reasons, union-find clustering | KMS-Agent (richer schema but no traversal); Gigabrain (co-occurrence, not semantic) |
| Write path sophistication | Parallel embed + ANN + LLM link + evolution + facts | Gigabrain multi-gate; Codex two-phase batch |
| Forgetting | Defined (config + decay math) but not wired | MIRA-OSS activity-day decay; Codex usage-based retention |
| Benchmark rigor | BEAM 100K (400q, 10 abilities, 11 runs, 243 failure catalog) | Codex/Claude Code have internal evals; MemPalace has scripts but inflated claims; Karta's is the most transparent self-assessment |

**Verdict:** **Promoted to standalone analysis.** Karta contributes multiple genuinely novel mechanisms to the survey — the 7-type dream engine with inference feedback into retrieval, embedding-based query classification, retroactive evolution with drift protection, foresight signals, dual-granularity fact retrieval, structured episode digests, and cross-episode entity timelines. The code quality is high (proper Rust, trait-based architecture, real tests against real storage), the developer's self-assessment is unusually rigorous (243 failures catalogued by root cause), and the benchmark results are honest rather than inflated. At 57.7% BEAM vs 63% Honcho, it's not yet top-performing, but the architectural mechanisms are the most interesting in the folk-system space and several are not present in any other surveyed system including the first-party ones. Standalone analysis: `ANALYSIS-karta.md`.

---

## 2026-04-07 — KMS-Agent (haih-net)

**Source:** https://github.com/haih-net/agent
**Stats:** 4 stars, 824 files, TypeScript (Next.js + n8n), no license, created 2026-01-19, last pushed 2026-04-01
**Stack:** Next.js frontend + custom n8n server (workflow orchestration) + Prisma/PostgreSQL (Supabase) + OpenRouter LLM gateway + Docker/Traefik

**What it is:** A full-stack "Knowledge Management System with Cognitive Evolution" — a personal agent platform where the agent learns through interaction. It combines a chat interface, knowledge base, task management, mind logs, a biological reflex/reaction system, and a 3D spatial world. The README pitches it as "a living knowledge system that develops" — clone it, talk to it, watch it evolve.

**Data model (Prisma, ~860 lines, ~550 memory-relevant):**

Three distinct memory subsystems, all scoped per-user (the agent is itself a User row):

1. **MindLog** — flat append-only log with 12 typed entries:
   - Interaction lifecycle: `Stimulus`, `Reaction`, `Action`, `Error`, `Result`, `Conclusion`, `Evaluation`, `Correction`
   - Persistent memory: `Knowledge`, `Identity`, `Context`, `Relationship`
   - Fields: `type`, `data` (text blob), `quality` (float), `createdById`, `relatedToUserId`
   - No embedding column. No vector index.

2. **Knowledge Base (KB)** — an epistemic belief graph with 10 tables:
   - `KBConcept` — named entity nodes with type, name, description, content
   - `KBLabel` — multilingual names per concept (primary/synonym/alias/abbreviation, with language code)
   - `KBFact` — n-ary statements with `confidence` (0–1), `status` (unverified/tentative/verified/disputed/deprecated), `importance`, temporal validity (`validFrom`/`validTo`), `factType` (raw/derived)
   - `KBFactParticipation` — joins concepts to facts with `role`, `impact`, `value`, `localImportance`
   - `KBConstraint` — invariant rules for consistency checking
   - `KBConflict` / `KBConflictFact` — first-class contradiction records (open/resolved/dismissed)
   - `KBIdentityOperation` — merge/split operations on concepts
   - `KBProposal` — testable hypotheses (untested/tested/confirmed/rejected)
   - `KBDecision` — recorded choices with context, outcome, supersession chain
   - `KBKnowledgeSpace` / `KBFactProjection` — contextual views of facts with per-space trust/importance/visibility

3. **Experience System (EX)** — behavioral learning:
   - `EXReflex` — stored behavioral rules: `stimulus` (trigger pattern), `response` (action), `type` (unconditional/conditional), `effectiveness` and `executionRate` (floats)
   - `EXReaction` — instances of reflex firing with triple scoring (`scoreAgent`, `scoreTarget`, `scoreMentor`), token/duration metrics, feedback text

4. **AgentWorld** — in-memory tree (WorldsStore singleton). Rooted hierarchy of `WorldNode` objects with attention mechanics (frequently-read nodes auto-expand depth). **Not persisted** — lost on restart.

**Write path:**

All memory writes are **LLM-initiated via tool calls** during conversations. The n8n workflow wires CRUD tools for each subsystem (MindLog, KB concepts/facts/participations/projections/spaces, EX reflexes/reactions, AgentWorld nodes, Tasks). Each tool delegates to a GraphQL API. Feature-gated via env vars (`N8N_HAS_KNOWLEDGES_BASE_NODES`, `N8N_MINDLOGS_NODES`, `HAS_EX_NODES`).

No bulk import. No automated extraction pipeline. No background indexing. No document ingestion. The LLM decides what to remember and when.

**Read path:**

- **MindLogs**: Up to 100 entries of types KNOWLEDGE/IDENTITY/CONTEXT loaded via GraphQL before every turn and injected as system messages. **Load-everything** — no ranking, no filtering beyond type.
- **KB**: Via tool calls during conversation. The system prompt instructs "read concepts first." No vector search. No graph traversal engine. The LLM decides what to query.
- **AgentWorld**: Tree read with configurable `maxDepth` (default 2). Attention mechanic: nodes with `readCount > 5` auto-increase depth. Depth control only, not relevance ranking.
- **Memory Recall**: Separate lightweight agent (gemini-2.5-flash-lite default) searches an in-memory `ToolCallsMemory` store — records of every tool call the agent has made. Keyword/LLM-interpreted search, not vector.

**Cognitive loop (per interaction):**

1. Webhook trigger
2. Auth + session resolution
3. Parallel fetch: agent profile + MindLogs (100 recent)
4. **Reflection**: fetches all `EXReflex` records, sends them + user message to a fast LLM (gemini-2.5-flash-lite), which returns matching reflexes or `NO_MATCH`. Injected as internal instructions.
5. Decompositor + UsefulInfo sub-agents pre-analyze the user message
6. Main Agent (AgentOrchestrator) — custom n8n node using OpenAI SDK via OpenRouter, iterative tool-call loop (10–20 max iterations), access to all subsystem tools
7. Save conversation + return response

On `NO_MATCH` from reflection, the instructions tell the main agent to **create a new reflex** before acting. This is the learning loop.

**What's architecturally interesting:**

- **Epistemic KB design**: The belief-graph model with first-class contradictions (`KBConflict`), confidence levels, temporal validity, knowledge spaces with per-space fact projections, and identity merge/split operations is the most philosophically grounded KB schema in our survey. The comment "Fact != truth, fact = statement + trust context" is a deliberate stance that no other system implements this explicitly.
- **Reflex/Reaction system**: The biological-reflex metaphor — pre-turn reflection pass that matches stored reflexes against stimuli, triple-scoring feedback, and automatic reflex creation on novel stimuli — is distinctive. No other system in our survey has this behavioral-adaptation pattern.
- **N-ary facts**: `KBFactParticipation` joins multiple concepts to a single fact with typed roles and per-participation importance. This is richer than binary triples (most KG systems) or flat facts (most memory systems).

**What's missing / why not promoted:**

- **No vector search anywhere** — MindLogs, KB, AgentWorld all lack embeddings. Retrieval is either "load all 100" or "LLM decides what to query via tools." Will break at scale.
- **No automated extraction** — all KB writes depend entirely on the LLM choosing to call tools during conversation. No document ingestion, no background processing, no extraction pipeline.
- **No graph traversal** — KB facts use n-ary participation but there is no graph query engine, no path finding, no inference. It's a relational store with graph-shaped data, not a graph database.
- **Conflict detection is schema-only** — `KBConstraint` and `KBConflict` tables exist but no automated constraint-checking code is visible. Conflicts must be created manually via tool calls.
- **Reflex effectiveness loop is incomplete** — schema has `effectiveness` and `executionRate` on reflexes, but the workflow code does not show how these aggregate scores are updated from reaction scores.
- **AgentWorld not persisted** — the in-memory tree is lost on process restart.
- **No consolidation, decay, dedup, or maintenance** — no background jobs, no nightly sweeps, no forgetting.
- **No benchmarks or evals** — no performance claims to verify.
- **System prompt partially in Russian** — the agent-chat main system message is bilingual, suggesting a single-developer project.

**Comparison to existing ANALYSIS.md systems:**

| Mechanism | KMS-Agent | Closest existing system |
|-----------|-----------|------------------------|
| Epistemic KB schema | 10-table belief graph with confidence, contradiction, temporal validity, knowledge spaces | None this explicit — Gigabrain has event sourcing, but not epistemic modeling |
| Write path | LLM tool calls only | Same as MemGPT/Letta (tool-gated archival writes) |
| Read path | Load-all MindLogs + LLM-directed tool queries | Weaker than all promoted systems (no search) |
| Reflex/Reaction | Pre-turn pattern matching + triple scoring + auto-creation | Unique in survey |
| Orchestration | n8n workflow engine | Unique infrastructure choice; not a memory mechanism |
| Graph traversal | None (relational store, no query engine) | OpenViking, Gigabrain both have traversal |
| Consolidation/decay | None | Every promoted system has at least one |

**Verdict:** **Not promoted.** The epistemic KB schema is the most architecturally interesting part — first-class contradictions, knowledge spaces with per-space projections, and n-ary facts with confidence/temporal validity are genuinely thoughtful design. The reflex/reaction system is a distinctive behavioral-adaptation pattern not seen elsewhere. However, the gap between schema design and operational intelligence is large: there is no retrieval optimization (no embeddings, no vector search, no graph traversal), no automated extraction, no consolidation or maintenance pipeline, and several schema features (constraints, conflicts, effectiveness tracking) exist as tables but lack implementing code. The system is more of a full-stack agent platform with an ambitious but unrealized knowledge architecture than a memory system that contributes testable mechanisms. Worth re-examining if retrieval and the KB operational layer mature.

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
