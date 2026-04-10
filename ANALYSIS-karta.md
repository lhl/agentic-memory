---
title: "Analysis — Karta (rohithzr)"
author: rohithzr
date: 2026-04-09
type: analysis
source: https://github.com/rohithzr/karta
source_repo: https://github.com/rohithzr/karta
local_clone: vendor/karta
version: v0.1.0 (commit c203059)
tags:
  - agentic-memory
  - zettelkasten
  - dream-engine
  - rust
  - lancedb
  - sqlite
  - graph-memory
  - episode-memory
  - reranking
  - benchmarks
related:
  - ANALYSIS.md
  - ANALYSIS-academic-industry.md
  - ANALYSIS-arxiv-2502.12110-a-mem.md
  - REVIEWED.md
---

# Analysis — Karta (rohithzr)

Karta is a Rust agentic memory library (~10.4K LOC, MIT, v0.1.0, single developer, 42 commits) that combines a Zettelkasten-inspired knowledge graph with an active background inference engine. Three-path architecture: **write** (index + link + evolve), **read** (search + traverse + rerank + synthesize), **dream** (cluster + infer + persist). The tagline — "thinks, not just stores" — is accurate: the dream engine performs genuine inference operations (deduction, induction, abduction, contradiction detection) that create new knowledge from existing notes and feed it back into retrieval.

Reviewed at commit `c203059`, vendored at `vendor/karta/`.

## TL;DR

- **Rust library** (`cargo add karta`), not a service or agent integration. CLI is a stub. No MCP, no HTTP API.
- **Three-path architecture**: write (parallel LLM attribute gen + ANN linking + retroactive evolution + atomic fact decomposition), read (embedding-based query classification + multi-source ANN + graph traversal + cross-encoder reranking + abstention + synthesis), dream (7 inference types over union-find clusters with incremental cursor + dedup).
- **Novel mechanisms not found in any other surveyed system**: 7-type dream engine with inference feedback into retrieval, embedding-based query classification via prototype centroids, foresight signals (predictions with TTL), dual-granularity ANN (notes + atomic facts), structured episode digests with pre-computed entity counts/aggregations, cross-episode entity timelines.
- **Data model**: MemoryNote with 6-variant Provenance enum (Observed/Dream/Profile/Episode/Fact/Digest), 4-state lifecycle (Active/Deprecated/Superseded/Archived), rich metadata (evolution history, links, confidence, turn_index, timestamps).
- **Storage**: LanceDB embedded vector + SQLite WAL graph. Trait-based pluggable storage — production backends (pgvector, Qdrant, Postgres) declared but not implemented.
- **Benchmarks**: BEAM 100K (400 questions, 10 abilities): 57.7% best vs 63% Honcho reference. 243 failures catalogued by root cause. Phase Next regression (53%) from atomic facts/digests polluting ANN.
- **What's missing**: no agent/MCP integration, forgetting not wired (config exists, sweep never called), no write gating, no team/shared memory, no correction/versioning semantics (evolution is in-place), no security hardening, production storage not implemented.
- **Code quality**: proper idiomatic Rust with trait-based abstractions, 3,754 lines of tests against real LanceDB + SQLite, honest self-assessment rather than inflated claims.

## Architecture

### System overview

Karta is structured as a Rust workspace with two crates:

- **karta-core** (6,666 LOC): the memory engine
- **karta-cli** (stub): `fn main() {}`

The core exposes a `Karta` struct as the primary API surface. All operations go through it: `remember()` (write), `ask()` (read), `dream()` (dream engine). Storage is trait-based: `VectorStore` for embeddings (LanceDB default) and `GraphStore` for links/state (SQLite default). LLM interaction is trait-based via `LlmProvider` (OpenAI-compatible default via `async-openai`). Reranking is trait-based via `Reranker` (Jina/LLM/noop).

### Storage architecture

| Store | Backend | Purpose |
|-------|---------|---------|
| VectorStore | LanceDB (embedded, lance.rs, 575 lines) | Note embeddings (1536d), atomic fact embeddings, ANN search |
| GraphStore | SQLite WAL (sqlite.rs, 730 lines) | Bidirectional links, evolution history, dream state (cursor, runs), foresight signals, episodes, entity profiles, episode digests, atomic fact metadata, episode links, lifecycle status |

SQLite uses WAL mode for concurrent reads during dream passes. LanceDB is embedded (no server process). Both are single-file stores on local disk.

### Configuration

Fully configuration-driven (config.rs, 237 lines) with sensible defaults:

- Per-operation LLM model overrides (e.g., `write.attributes` can use a cheaper model than `dream.abduction`)
- **ReadConfig**: recency_weight, recency_half_life_days, graph_weight, hop_depth/decay, abstention_threshold, episode settings, fact retrieval settings
- **WriteConfig**: top_k_candidates, similarity_threshold, evolve toggle, max_evolutions_per_note (default 5), foresight TTL (default 90 days), atomic facts toggle
- **DreamConfig**: write_threshold (confidence gate), max_notes_per_prompt, enabled dream types
- **ForgetConfig**: enabled (default false), decay_half_life_days, archive_threshold, sweep_on_dream

## Write Path

**write.rs, 607 lines.**

The write path is the most parallel and LLM-heavy of the three paths. Sequence:

1. **Parallel LLM attribute generation + raw embedding**: Fork two tasks — (a) LLM generates context description, keywords, tags, foresight signals, and atomic facts; (b) embed raw content for candidate search.
2. **ANN candidate search**: Use raw content embedding against existing notes. Fast path — finds linking candidates before the enriched embedding is computed.
3. **Enriched embedding**: Compute final embedding from content + context + keywords for storage. This two-stage embedding strategy means the stored embedding is richer than the search embedding used for candidate finding.
4. **LLM link decisions**: For candidates above similarity threshold, LLM decides whether a directional link should exist and provides a reason.
5. **Retroactive context evolution**: For each newly linked note, LLM updates the linked note's context to reflect implications of the new connection. **Drift-protected**: `max_evolutions_per_note` gate (default 5). Over-evolved notes skip evolution and are flagged as needing consolidation — a clean handoff to the dream engine.
6. **Store**: Note to LanceDB with enriched embedding. Bidirectional links to SQLite. Foresight signals with parsed or default TTL. Atomic facts (1-5 per note) embedded and stored in dedicated LanceDB table.

With episodes enabled, the write path also performs **boundary detection**: hard time gap threshold plus LLM-based thematic shift assessment. When a boundary fires, a narrative synthesis is generated and stored as a searchable note in the vector index.

### Write path assessment

Strengths:
- The two-stage embedding (raw for search, enriched for storage) is a practical optimization: candidates are found faster, stored representations are richer.
- Atomic fact decomposition (1-5 per note, per-fact embeddings) creates fine-grained retrieval hooks that the read path exploits.
- Evolution gating is the right instinct — unbounded reconsolidation is the primary risk of any "evolve on write" system.

Gaps:
- **No write gating**: anything passed to `remember()` gets indexed. No junk filter, no content quality check, no semantic dedup. The only protection is evolution count gating, which is a downstream limit, not an ingestion gate.
- **Evolution is in-place**: context fields are overwritten, not versioned. Evolution history is tracked (count + timestamps), but the prior context text is gone. This means you cannot audit "what did this note say before the last evolution?" — a meaningful gap for any system that claims to track knowledge evolution.

## Read Path

**read.rs, 1,153 lines — the most complex read path in the survey.**

The read path is a 14-step pipeline that starts with query classification and ends with structured synthesis:

1. **Query classification**: Embed query, compute cosine similarity to 6 mode prototype centroids (Standard, Recency, Breadth, Computation, Temporal, Existence). Keyword fallback if embedding classification fails. Centroids are lazy-initialized with 60s timeout.

2. **Parallel ANN search**: Simultaneous search on notes table and atomic facts table (if enabled). Mode-specific `fetch_k` multipliers (Breadth mode fetches wider).

3. **Entity profile auto-include**: Match query terms against known entity profiles. Inject matching profiles with graph bonus score.

4. **Two-level episode retrieval**: Partition ANN results into episode narrative notes vs. flat notes. Episode narratives above similarity threshold trigger drilldown — fetch constituent notes, filter active, sort chronologically (turn_index, then source_timestamp, then created_at).

5. **Blended scoring**: `similarity * (1 - recency_weight) + recency_score * recency_weight`. Recency is exponential decay with configurable half-life. Mode-specific recency weight (Recency mode: 0.60). Graph-aware PageRank-lite bonus: `ln(1 + link_count) * graph_weight`. Foresight boost for notes with active (non-expired) signals.

6. **Fact-to-note expansion**: High-scoring atomic facts are mapped to their parent notes. Parent notes get a boost and are merged into results.

7. **Episode link traversal**: Follow cross-episode links (entity_continuity, value_update) to find related episode digests.

8. **Structured digest matching**: For Computation/Breadth/Recency modes, search episode digest entities and aggregations via keyword matching. This enables "how many X" answers from pre-computed counts rather than re-counting from notes.

9. **Merge with priority**: profiles, then structurally matched digests, then linked digests, then episode-drilled notes, then fact-expanded notes, then flat ANN hits. Truncate to top_k.

10. **Cross-encoder reranking**: Jina (recommended), LLM batched scoring, or noop. Raw Jina scores are preserved (not normalized) — this is deliberate for meaningful abstention thresholds.

11. **Abstention gate**: If best relevance score < threshold after reranking, the system says "I don't know" rather than hallucinating. Computation mode skips reorder (preserving ANN order for completeness over precision).

12. **Contradiction force-retrieval**: Scan results for contradiction dream notes. Fetch both source notes from the contradiction. Inject as `[CONTRADICTION SOURCE]` with instructions to present both sides. Also checks if retrieved notes are linked to contradiction dreams via graph.

13. **Chronological ordering**: All notes sorted by turn_index, then source_timestamp, then created_at before synthesis. Rationale: "LLMs perform better when notes arrive in chronological sequence, not relevance order."

14. **Synthesis**: Structured output with chain-of-thought reasoning, provenance markers (FACT/INFERRED/PROFILE/EPISODE/DIGEST), age display, contradiction flagging, and abstention signal.

15. **Insufficient-info retry**: For Computation/Temporal modes, if the answer admits insufficient info ("can't determine", "not mentioned"), retry with 3x wider retrieval and no reranker. A pragmatic self-healing loop for the modes most sensitive to missing specific facts.

### Read path assessment

The read path is impressively engineered for a solo-developer v0.1.0. The layered merge (profiles first, digests, episode drilldown, facts, flat ANN) means different provenance types contribute at different priority levels rather than being mixed in a single ANN result set.

The contradiction force-retrieval mechanism is unique: no other system in the survey actively detects and injects contradictory evidence into the synthesis prompt. This is the dream engine's most direct impact on read quality.

The insufficient-info retry is a clean pattern — detect failure, widen the net, try again. The 3x multiplier is a reasonable heuristic (not so wide as to flood the context, wide enough to catch near-misses).

Risks:
- The 14-step pipeline is a lot of serial work. Latency numbers are not reported. For real-time conversational use, the multiple LLM calls (classification, reranking, synthesis) could be expensive.
- Mode classification from prototype centroids is clever but fragile. The centroids are hardcoded from example phrases — no learning, no adaptation. If a query doesn't match any centroid well, it falls to Standard mode, which may be suboptimal.

## Dream Engine

**dream/engine.rs, 952 lines. 7 dream types, all fully implemented.**

The dream engine is the most architecturally novel component. It runs as a background process, builds union-find clusters over the link graph, and performs seven types of inference:

### Dream types

| Type | Scope | Min notes | What it does |
|------|-------|-----------|-------------|
| **Deduction** | Per-cluster | 2 | Chain-of-thought reasoning to derive logically necessary conclusions from linked facts. Confidence-gated writing (below threshold = skip). |
| **Induction** | Cross-cluster | 4 (sliding windows) | Identify repeated patterns across multiple notes, generalize into principles. Reports supporting note count. |
| **Abduction** | Cross-cluster | 3 (sliding windows) | Identify conspicuous gaps in knowledge, hypothesize explanations. Emits foresight signals from hypotheses. |
| **Consolidation** | Per-cluster | 3 | Build "peer cards" — entity profiles consolidating everything known about a person/project/topic. Creates or incrementally merges profile notes via LLM. Profiles linked to source notes and auto-included during retrieval. |
| **Contradiction** | Per-cluster | 2 | Detect mutually exclusive facts or tensions. Severity levels (critical/tension/none). Contradiction notes linked to sources for force-retrieval during reads. |
| **Episode digest** | Per-episode | N/A | Extract structured metadata: entities (name, type, count, latest_value), date ranges, aggregation entries (label + count + items), topic sequences. Store as both structured SQLite data and searchable vector note. |
| **Cross-episode digest** | Across episodes | 3 digests | Track entity timelines across episodes, identify value changes, create inter-episode links (entity_continuity, value_update). |

### Infrastructure

- **Incremental processing**: Cursor-based. Only processes notes created/updated since last dream run, plus their linked neighbors (to detect new cluster formations).
- **Deduplication**: Embeds dream content, checks similarity against existing dream notes of same type. >0.85 cosine similarity = duplicate, skip.
- **Cluster building**: Union-find over link graph. Only clusters with 2+ notes are dreamed about.
- **Foresight expiry**: Stale signals expired at start of each dream pass.

### Dream engine assessment

The dream engine is what separates Karta from every other system in the survey. No other system performs background deduction, induction, abduction, or contradiction detection. Consolidation exists elsewhere (Codex two-phase consolidation, Claude Code background extraction), but the full inference pipeline is unique.

The feedback loop is the key architectural insight: dreams create notes with Dream provenance, those notes participate in retrieval (contradiction force-injection, profile auto-include, foresight boosting, digest structured matching), and new observations trigger new dreams. This creates an evolving knowledge base that genuinely derives new information rather than just reorganizing existing facts.

Risks:
- **Dream quality depends entirely on LLM quality**: every dream type is an LLM prompt. Bad inferences become first-class notes with Dream provenance. The confidence gate (write_threshold) is the only protection — there is no validation, no human-in-the-loop, no self-correction.
- **ANN pollution**: The Phase Next regression (57.7% to 53.0%) demonstrates the core risk — dream/digest/fact notes can crowd out original observations in ANN results. This is partially mitigated by filtering, but the problem is structural: any system that indexes derived content alongside primary content will face this.
- **Dedup threshold (0.85) is a magic number**: too low and duplicates accumulate; too high and near-duplicates with important nuances are dropped. No evidence this threshold was tuned.

## Data Model

### MemoryNote (core unit)

| Field | Type | Purpose |
|-------|------|---------|
| id | UUID | Primary key |
| content | String | Raw content |
| context | String | LLM-generated context description (evolves on write) |
| keywords | Vec<String> | LLM-extracted |
| tags | Vec<String> | LLM-extracted |
| embedding | Vec<f32> | 1536d enriched embedding (content + context + keywords) |
| links | Vec<NoteLink> | Bidirectional, with reason |
| evolution_history | Vec<EvolutionEntry> | Count + timestamps (not prior text) |
| provenance | Provenance | 6-variant enum (see below) |
| confidence | f64 | 0.0-1.0 |
| status | NoteStatus | Active / Deprecated{by} / Superseded{by} / Archived |
| turn_index | u64 | Conversation position |
| source_timestamp | Option<DateTime> | Caller-provided event time |
| created_at | DateTime | Ingestion time |
| last_accessed_at | DateTime | Updated on retrieval |

### Provenance enum

```
Observed                           — direct user input
Dream { dream_type, source_note_ids, confidence }  — dream engine output
Profile { entity_id }              — consolidation entity profile
Episode { episode_id }             — episode narrative
Fact { source_note_id }            — atomic fact decomposition
Digest { episode_id }              — episode digest
```

Every derived note traces to its sources. This is the cleanest provenance model in the folk-system survey — it enables the read path to display provenance markers (FACT/INFERRED/PROFILE/EPISODE/DIGEST) in synthesis output.

### Supporting types

- **AtomicFact**: content, subject, embedding. Stored in separate LanceDB table. 1-5 per note.
- **ForesightSignal**: prediction content, valid_from, valid_until. Extracted during ingestion or emitted by abduction dreams.
- **Episode**: narrative, topic tags, note IDs, optional narrative note in vector index.
- **EpisodeDigest**: entities (name/type/count/latest_value), date_range, aggregation entries (label/count/items), topic_sequence, digest text.
- **AskResult**: answer, provenance markers, contradiction flags, abstention signal.

## Benchmarks

### BEAM 100K (400 questions, 10 abilities)

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

### Failure analysis (243 failures catalogued)

| Root cause | Share | Example sub-patterns |
|------------|-------|---------------------|
| INCOMPLETE_RETRIEVAL | 40.7% | ANN prefers established notes over updates; top_k too narrow for specific details; cross-note computation needs both facts but only one retrieved |
| FALSE_ABSTENTION | 18.1% | Reranker scores too conservative; info present but below abstention threshold |
| WRONG_ORDER | 17.3% | Temporal ordering errors despite chronological sort |
| CONTRADICTION_MISS | 10.7% | Contradiction dream didn't fire or didn't cover the specific pair |
| JUDGE_NOISE | 5.8% | Benchmark judge inconsistency |
| WRONG_COMPUTATION | 3.3% | Arithmetic/aggregation errors in synthesis |
| HALLUCINATION | 2.9% | Confident wrong answers |
| FORMAT_MISS | 1.2% | Output formatting issues |

### Benchmark assessment

The failure analysis is the most detailed self-assessment in the folk-system survey. 11 benchmark runs tracked with per-ability breakdowns. The developer's understanding of failure modes — down to sub-patterns like "old value returned because ANN prefers established notes" — demonstrates genuine engineering rigor.

The Phase Next regression (57.7% to 53.0%) is instructive: adding atomic facts and episode digests improved some abilities (information_extraction, multi_session_reasoning) but degraded others (preference_following, contradiction_resolution, temporal_reasoning, knowledge_update). The root cause — dream/digest/fact notes polluting direct ANN results — is a fundamental challenge for any system that indexes derived content alongside primary content.

At 57.7% vs 63% Honcho, Karta is not top-performing. But it is honest about where it stands and why, which is more useful than inflated claims.

## What's Novel

Mechanisms in Karta not present in any other surveyed system (academic or folk):

1. **Dream engine with 7 inference types**: Deduction, induction, abduction, contradiction, consolidation, episode digest, cross-episode digest. No other system performs background logical inference that creates new knowledge notes. Codex and Claude Code consolidate; Gigabrain does nightly quality sweeps; neither infers.

2. **Embedding-based query classification**: 6-mode classification (Standard/Recency/Breadth/Computation/Temporal/Existence) via cosine similarity to prototype centroids, with keyword fallback. No other system classifies query intent this way — ByteRover uses tiered retrieval, Claude Code uses LLM routing.

3. **Foresight signals**: Forward-looking predictions with validity windows (valid_from, valid_until), extracted during ingestion, emitted by abduction dreams, boosted during retrieval, expired during dream passes. No other system models predictions as first-class retrieval-boosting objects.

4. **Dual-granularity ANN search**: Parallel search on notes table and atomic facts table. Fact hits expanded to parent notes with score boost. No other system does dual-table vector search with parent expansion.

5. **Structured episode digests**: Pre-computed entity metadata (typed, counted, with latest values), date ranges, aggregation entries (label + count + items list), topic sequences. Enables structured matching for Computation/Breadth queries — answers "how many X" from pre-computed counts.

6. **Cross-episode entity timelines**: Dream engine tracks entity value changes across episodes, creates typed inter-episode links (entity_continuity, value_update). No other system builds cross-session entity evolution graphs.

7. **Contradiction force-retrieval**: When a retrieved note is linked to a contradiction dream note, the read path fetches both source notes and injects them with instructions to present both sides. The dream engine actively flags conflicts; the read path actively surfaces them.

8. **Insufficient-info retry**: For Computation/Temporal modes, detects "I don't know" patterns in the synthesis answer, retries with 3x wider retrieval and no reranker. Pragmatic self-healing for the modes most sensitive to missing facts.

9. **Retroactive evolution with drift protection**: Notes' contexts evolve when new related information arrives, gated by max_evolutions_per_note. Over-evolved notes skip and are flagged for consolidation — a clean interaction between write path and dream engine.

## What's Missing

- **No MCP server, no agent integration**: Pure library. karta-cli is `fn main() {}`. No Claude Code plugin, no MCP, no HTTP API. To use Karta in a real agent, you must write Rust integration code.
- **Forgetting not wired**: ForgetConfig + decay math exist. `last_accessed_at` is updated on retrieval. But no sweep function is called — `ForgetConfig.enabled` defaults to false and no code path invokes archival. The architecture supports forgetting; the implementation doesn't.
- **No write gating**: Anything passed to `remember()` is indexed. No junk filter, no content quality check, no semantic dedup on ingestion. Evolution count gating is a downstream limit, not an ingestion gate.
- **No team/shared memory**: Single-user, single-machine. No multi-tenant isolation, no access control.
- **No correction/versioning semantics**: Evolution updates context in-place. NoteStatus lifecycle exists (Deprecated{by}, Superseded{by}) but no code automates status transitions. No append-only correction chains. You cannot ask "what did this note say before evolution #3?"
- **No security hardening**: No injection scanning, no secret detection, no auth. Memory poisoning (MINJA-style) would be trivially effective since write gating is absent.
- **Production storage not implemented**: VectorStore/GraphStore traits exist for pgvector/Qdrant/Postgres/Dolt but only LanceDB/SQLite are built. Real deployments at scale would need the missing backends.
- **Phase Next regression unresolved**: The 4.7pp drop (57.7% to 53.0%) from atomic facts/digests polluting ANN is partially mitigated by filtering but still below pre-Phase-Next best. This is a structural problem — indexing derived content alongside primary content in the same ANN table invites retrieval pollution.
- **Single developer, v0.1.0**: Early stage. Active development but no community, no CI/CD, no published API stability guarantees.

## Comparison to A-Mem Paper

Both Karta and A-Mem (Xu et al., 2025; arxiv:2502.12110) are Zettelkasten-inspired agentic memory systems built on notes + links + evolution. Karta cites A-Mem as inspiration. The comparison is instructive:

| Dimension | A-Mem (paper) | Karta (implementation) |
|-----------|---------------|------------------------|
| **Status** | Research paper with evaluation | Working Rust library with tests |
| **Primitives** | Note, attributes, link, evolve | Note, attributes, link, evolve, dream, episode, fact, foresight, digest |
| **Note construction** | LLM generates content + context + keywords + tags + embedding | Same, plus atomic facts (1-5 per note) and foresight signals |
| **Link generation** | Top-k ANN candidates → LLM decides | Same mechanism, plus bidirectional links with reasons stored in SQLite |
| **Memory evolution** | LLM updates older notes' attributes/context when new evidence arrives | Same, with drift protection (max_evolutions_per_note gate) and consolidation handoff |
| **Evolution audit** | Not discussed | Evolution count tracked but prior text not preserved — same gap |
| **Retrieval** | Top-k ANN + linked-context expansion | 14-step pipeline: classification, dual ANN, episode drilldown, graph traversal, reranking, abstention, contradiction injection, retry |
| **Dream/inference** | Not present | 7-type dream engine creating new knowledge notes that feed back into retrieval |
| **Episode structure** | Not present | Episode detection, narrative synthesis, structured digests, cross-episode entity timelines |
| **Contradiction handling** | Not present | Dream-based detection + force-retrieval during reads |
| **Query classification** | Not present | 6-mode embedding-based classification |
| **Reranking** | Not present | Cross-encoder (Jina), LLM, noop — trait-based |
| **Benchmarks** | LoCoMo + DialSim (as reported) | BEAM 100K (400q, 10 abilities, 243 failures catalogued) |
| **Provenance** | Implicit | Explicit 6-variant enum |

**Summary**: Karta is essentially A-Mem extended with a dream engine, episode memory, atomic facts, query classification, reranking, and structured digests. The core note+link+evolve primitives are the same. Karta's main addition is that derived knowledge (dreams, profiles, digests, facts) are first-class notes with provenance that participate in retrieval — A-Mem's notes are all Observed. Karta inherits A-Mem's main weakness (evolution is in-place, not versioned) without fixing it.

## Claims Table

| # | Claim | Evidence | Status |
|---|-------|----------|--------|
| 1 | "Thinks, not just stores" — dream engine creates new knowledge | 7 dream types implemented (952 lines), each producing Dream-provenance notes that feed into retrieval via contradiction force-injection, profile auto-include, foresight boosting, digest matching | **Verified in code** |
| 2 | Three-path architecture (write/read/dream) | write.rs (607 lines), read.rs (1,153 lines), dream/engine.rs (952 lines) all fully implemented | **Verified in code** |
| 3 | Trait-based pluggable storage and LLM | VectorStore (143 lines of traits), GraphStore, LlmProvider, Reranker traits all defined with default implementations | **Verified in code** |
| 4 | Retroactive evolution with drift protection | max_evolutions_per_note gate implemented in write path; over-evolved notes skip evolution | **Verified in code** |
| 5 | Embedding-based query classification (6 modes) | Prototype centroids hardcoded from example phrases, cosine similarity classification, keyword fallback | **Verified in code** |
| 6 | Cross-encoder reranking with abstention | JinaReranker preserves raw scores, abstention_threshold gate, Computation mode skips reorder | **Verified in code** |
| 7 | BEAM 100K: 57.7% best | bench_beam.rs (1,112 lines) + beam_100k.rs (798 lines) implement the harness; 11 runs tracked; 243 failures catalogued | **Verified in code** (harness exists; results as reported, not independently reproduced) |
| 8 | Honcho reference: 63% | Cited in benchmark notes | **As reported** — not independently verified |
| 9 | Phase Next regression: 53% | Documented with per-ability breakdown showing which abilities degraded | **As reported** — consistent with the structural risk of ANN pollution from derived content |
| 10 | Forgetting implemented | ForgetConfig exists, decay math defined, last_accessed_at updated | **Partially true** — config/math exist but sweep is never called; ForgetConfig.enabled defaults to false |
| 11 | Production storage backends | README mentions pgvector, Qdrant, Postgres, Dolt | **Not implemented** — only LanceDB + SQLite exist |
| 12 | Foresight signals with TTL | ForesightSignal type with valid_from/valid_until, parsed or default TTL (90 days), boosted in retrieval, expired in dream passes | **Verified in code** |
| 13 | Atomic fact decomposition | 1-5 facts per note, per-fact embeddings in dedicated LanceDB table, parallel ANN search, parent expansion | **Verified in code** |
| 14 | Episode digests with structured metadata | Entities (typed, counted), date ranges, aggregation entries, topic sequences stored as SQLite data + vector note | **Verified in code** |
| 15 | Cross-episode entity timelines | Dream engine creates entity_continuity and value_update inter-episode links | **Verified in code** |

## Verdict

Karta is the most architecturally ambitious folk-system in the survey. It contributes multiple genuinely novel mechanisms — the 7-type dream engine, embedding-based query classification, foresight signals, dual-granularity ANN, structured episode digests, cross-episode entity timelines, contradiction force-retrieval — that are not present in any other surveyed system including first-party ones (Claude Code, Codex) and academic papers (A-Mem, Zep/Graphiti, Nemori, HiMem).

The code quality is high: idiomatic Rust, trait-based abstractions, 3,754 lines of tests against real storage backends, and the most transparent self-assessment in the survey (243 failures catalogued by root cause with sub-pattern analysis).

The weaknesses are real: no agent integration (library only), forgetting not wired, no write gating, evolution is in-place without version history, no security hardening, and the Phase Next regression demonstrates a structural ANN pollution risk from indexing derived content alongside primary content. At 57.7% BEAM vs 63% Honcho, it is not yet top-performing.

The system's value to this research collection is primarily in its mechanisms rather than its benchmark numbers. The dream engine's feedback loop (infer new knowledge, inject it into retrieval, detect contradictions, force-surface conflicts) is the clearest implementation of "memory that reasons" in the survey. The structured episode digests (pre-computed counts, entity tracking, aggregation entries) are a practical solution to "how many X" queries that no other system attempts. The foresight signals (predictions as first-class objects with validity windows) are a novel primitive worth tracking.

For builders: Karta demonstrates that a single developer can implement a sophisticated memory architecture in ~10K lines of Rust. The trait-based design makes individual mechanisms (dream engine, reranker, query classifier) extractable for use in other systems. The BEAM failure analysis is a useful reference for understanding where retrieval-based memory systems actually break.

## Notes / Corrections & Updates

- Capture date: 2026-04-09
- Reviewed commit: c203059 (42 commits, v0.1.0)
- Vendored at: vendor/karta/
