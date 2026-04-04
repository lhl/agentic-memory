---
title: "Analysis — Zep (Rasmussen et al., 2025)"
date: 2026-02-22
type: analysis
paper_id: "arxiv:2501.13956"
paper_title: "Zep: A Temporal Knowledge Graph Architecture for Agent Memory"
source:
  - references/rasmussen-zep.md
  - references/papers/arxiv-2501.13956.pdf
related:
  - ANALYSIS-academic-industry.md
  - shisad internal long-term memory plan (private)
---

# Analysis — Zep (Rasmussen et al., 2025)

Zep is one of the more concrete “agent memory” proposals because it commits to a data model: a **temporally-aware knowledge graph** with explicit **validity intervals** and a **non-lossy episodic store**. It also exposes a retrieval pipeline that looks like real IR: hybrid search + reranking + a constructor step that emits a stable prompt context.

## TL;DR

- **Problem**: RAG systems are good at static docs but weak for evolving “agent memory” that mixes conversations + business data + updates over time.
- **Core idea**: Store memory in a hierarchical KG (episodes → semantic entities/facts → communities) where facts have **validity ranges** and contradictions **invalidate** older facts rather than deleting them.
- **Memory types covered**: episodic (raw episodes), semantic (entities + relational facts), plus a community layer (cluster summaries).
- **Key primitives / operations**: entity extraction + resolution; fact extraction + edge dedup; temporal extraction; edge invalidation; community detection + refresh; hybrid retrieval and reranking.
- **Write path**: ingest episode → extract entities/facts with short context window → resolve/dedup → store edges with `tvalid/tinvalid` and audit timestamps → invalidate overlapping contradictions.
- **Read path**: query → search candidates (cosine/BM25/BFS) → rerank → construct a context string (facts with date ranges + entity summaries) for the LLM.
- **Maintenance**: dynamic community extension + periodic refresh; ongoing dedup/resolution.
- **Evaluation** (as reported): DMR (MemGPT) + LongMemEval (LongMemEvals subset) with large context-token reductions and big latency reductions vs full-context baselines.
- **Main caveat**: this is a vendor-authored paper; full cost profile and security posture are not deeply analyzed.
- **Most reusable takeaway for shisad**: the **bi-temporal + validity-interval semantics** are a clean way to model “corrections without forgetting”.

## Stage 1 — Descriptive (what the paper proposes)

### 1.1 Memory model: Graphiti as a bi-temporal KG

Zep’s memory is a temporally-aware dynamic knowledge graph `G=(N,E,φ)` split into three tiers:

- **Episode subgraph**: episode nodes store raw inputs (messages/text/JSON). Episodes are intended as a **non-lossy store**.
- **Semantic entity subgraph**: entity nodes + semantic edges (“facts” as relations) extracted from episodes.
- **Community subgraph**: community nodes represent clusters of strongly connected entities and contain higher-level summaries.

The temporal commitment is the most important design choice:
- Each message/episode carries a reference timestamp `t_ref` (event anchoring).
- Graphiti tracks **two timelines**:
  - `T` = chronological/event time (“when the fact is true”)
  - `T'` = transactional/audit time (“when Zep learned/invalidated it”)
- Facts/edges store four timestamps: `t'created`, `t'expired` (audit) and `tvalid`, `tinvalid` (validity interval).

### 1.2 Write path (ingestion)

**Episodes** are ingested as raw units, then processed into semantic artifacts.

**Entity extraction**:
- Uses the current message plus the last `n` messages as extraction context (reported `n=4`).
- Uses a reflection technique (inspired by Reflexion) to reduce hallucinations and improve coverage.
- Produces entity names + summaries.
- Embeds entity names into a 1024-d vector space; performs cosine similarity + full-text search to find candidate duplicates.
- Runs an LLM “entity resolution” prompt over candidates and updates names/summaries if a duplicate is found.
- Writes to Neo4j using predefined Cypher queries (explicitly avoiding LLM-written DB queries).

**Fact extraction + edge dedup**:
- Extracts facts/relations between entities; the paper frames this as edges between entity nodes.
- Dedup is constrained to candidate edges between the same entity pairs to avoid cross-pair merges and to reduce search cost.

**Temporal extraction + edge invalidation**:
- Extracts absolute and relative time from context using `t_ref` as the anchor.
- When a new edge contradicts a semantically related existing edge over an overlapping time range, Graphiti invalidates older edges by setting `tinvalid` appropriately.
- New information is prioritized via the transactional timeline `T'`.

**Communities**:
- Uses label propagation for community detection (chosen for a simpler dynamic update story than Leiden).
- Supports dynamic extension when new nodes arrive (assign to plurality neighbor community), but requires periodic refresh as drift accumulates.
- Builds community summaries via iterative map-reduce-style summarization; also generates community “names” with key terms for retrieval.

### 1.3 Read path (retrieval → rerank → constructor)

Zep frames memory retrieval as a function `f(α)→β` that maps a query string to a context string. It decomposes `f` into:

1. **Search (`ϕ`)**: returns candidate semantic edges, entity nodes, and community nodes.
   - Cosine similarity search
   - BM25 full-text search
   - Graph BFS expansion (n-hop) to pull in nearby context (can be seeded from recent episodes)
2. **Reranker (`ρ`)**: reorder/prune candidates for precision.
   - Supports RRF and MMR
   - “Episode mentions” reranker (prioritize frequently mentioned items)
   - Node-distance reranker (graph distance from a centroid node)
   - Optional cross-encoder reranker (highest cost)
3. **Constructor (`χ`)**: converts the chosen facts/entities/communities into a stable prompt layout, including:
   - facts + `tvalid/tinvalid` ranges
   - entity names + summaries
   - community summaries

## Stage 2 — Evaluative (what it measures, what’s missing, what breaks)

### 2.1 Evaluation setup (as reported)

The paper reports results on:

- **DMR** (Deep Memory Retrieval) from MemGPT:
  - 500 conversations from a multi-session chat dataset.
  - Paper notes this benchmark is limited (mostly single-turn fact retrieval; ambiguous questions; full-context already strong).
- **LongMemEval (LongMemEvals dataset)**:
  - Conversations average ~115,000 tokens.
  - Six question types: single-session (user/assistant/preference), multi-session, knowledge-update, temporal-reasoning.
  - Evaluation uses GPT-4o as a judge with question-specific prompts from the LongMemEval paper.

Implementation notes that matter for interpretation:
- Tests ran Dec 2024–Jan 2025.
- Zep retrieval was called over the network (Boston laptop → AWS us-west-2); paper says this adds latency not present in baseline evaluations.

### 2.2 Main results (as reported)

**DMR (score)**:
- MemGPT (reported): 93.4% (gpt-4-turbo)
- Zep: 94.8% (gpt-4-turbo); 98.2% (gpt-4o-mini)

**LongMemEvals (score + latency + context size)**:

| Memory | Model | Score | Latency | Avg context tokens |
|---|---|---:|---:|---:|
| Full-context | gpt-4o-mini | 55.4% | 31.3s | 115k |
| Zep | gpt-4o-mini | 63.8% | 3.20s | 1.6k |
| Full-context | gpt-4o | 60.2% | 28.9s | 115k |
| Zep | gpt-4o | 71.2% | 2.58s | 1.6k |

The question-type breakdown shows the largest gains in preference/multi-session/temporal questions, but a consistent drop in “single-session-assistant” questions.

### 2.3 Strengths (builder-relevant)

- **Correction semantics**: invalidation with explicit `tvalid/tinvalid` is a strong default for memory that changes over time.
- **Provenance hooks**: episodes link to derived facts/entities; this enables audit and citation (even if not fully demonstrated here).
- **Retrieval realism**: the search/rerank/constructor decomposition is implementable and maps to measurable knobs.
- **Budget wins**: reducing 115k-token contexts to ~1.6k-token retrieval contexts is exactly what production systems need.

### 2.4 Limitations / open questions

- **Cost profile of writes**: graph construction + community summarization is likely to require multiple LLM calls and background work; the paper doesn’t fully characterize end-to-end ingestion throughput/cost.
- **Evaluation comparability**:
  - DMR is arguably saturated by long-context frontier models; the paper acknowledges this.
  - They could not evaluate MemGPT on LongMemEval due to ingestion limitations, so the strongest head-to-head is missing.
- **Security posture**: no explicit poisoning or cross-tenant leakage evaluation; a memory *service* needs stronger isolation guarantees than a single-agent academic prototype.
- **Single-session-assistant regression** suggests retrieval/context construction may omit assistant-side details, or that summarization compresses away answer-critical nuance.

## Stage 3 — Synthesis hooks (how this fits + what we steal)

### 3.1 Comparison to adjacent work

- vs **Mem0/Mem0g**: Zep’s core advantage is explicit temporal validity semantics and a richer retrieval stack. Mem0 critiques Zep’s store-level token bloat, but that’s about *materializing the whole graph*; Zep’s retrieved contexts in LongMemEval are still small (~1.6k tokens).
- vs **GraphRAG**: Zep adopts a community-summarization layer but uses a different retrieval approach than GraphRAG’s map-reduce query-time summarization.
- vs **classic RAG**: Zep treats “memory” as dynamic, with update + invalidation, not as static corpora.

### 3.2 Mapping to shisad (`PLAN-longterm-memory.md`)

Strongly aligned concepts to copy into shisad:
- **Append-only + invalidation** for corrections (keep history; add validity intervals).
- Explicit representation of **episodes** as a non-lossy store, with derived semantic facts referencing source spans (provenance).
- A retrieval pipeline that separates **candidate generation** (hybrid search), **precision** (rerank), and **prompt construction** (constructor with stable formatting).

Where shisad may want a different implementation shape:
- Shisad doesn’t need Neo4j to adopt these semantics; we can model:
  - episodes in a table/log,
  - extracted facts as rows with `valid_from/valid_to`,
  - optional derived graph indices/views for BFS-like expansions.
- Community detection/summaries look like a heavier “consolidation job” tier; good v0.7+ material, but only after base correctness + policy gates.

Suggested roadmap placement:
- Add validity-interval semantics and “invalidate, don’t delete” early (core memory correctness).
- Add graph-style expansions and community summaries later as optional indexing layers.

## Notes / Corrections & Updates

- Capture date: 2026-02-22.
- Paper version reviewed: arXiv v1 (2025-01-20).
