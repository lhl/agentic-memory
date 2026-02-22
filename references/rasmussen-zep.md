---
title: "Zep: A Temporal Knowledge Graph Architecture for Agent Memory"
author: "Preston Rasmussen et al."
date: 2026-02-22
type: reference
tags:
  - paper
  - system
  - memory-layer
  - knowledge-graph
  - temporal-memory
  - episodic-memory
  - semantic-memory
  - longmemeval
  - dmr
source: https://arxiv.org/abs/2501.13956
source_alt: https://arxiv.org/pdf/2501.13956.pdf
version: "arXiv v1 (2025-01-20)"
related:
  - ../ANALYSIS-arxiv-2501.13956-zep.md
files:
  - ./papers/arxiv-2501.13956.pdf
  - ./papers/arxiv-2501.13956.md
---

# Zep: A Temporal Knowledge Graph Architecture for Agent Memory

## TL;DR

- Introduces **Zep**, a production “memory layer service” for agents built on **Graphiti**, a **temporally-aware knowledge graph**.
- Uses a **three-tier graph**: **episodes** (raw, non-lossy inputs), **semantic entities/facts** (derived relations with validity), and **communities** (clusters with high-level summaries).
- Key mechanism: a **bi-temporal model** that distinguishes **event time** (when a fact is true) from **transaction time** (when Zep learned/invalidated it), enabling historical queries and update semantics.
- Retrieval is an explicit 3-stage pipeline: **search → rerank → construct context**, mixing **cosine similarity**, **BM25**, and **graph BFS**.
- Reports strong results on DMR and **LongMemEval**, with large reductions in context tokens and latency vs full-context baselines (as reported).

## What’s novel / different

- A concrete operationalization of **temporal validity intervals** (`tvalid`, `tinvalid`) for facts, plus separate audit timestamps (`t'created`, `t'expired`).
- A **non-lossy episodic store** linked bidirectionally to derived semantic edges/entities for provenance (“trace a fact back to its source episode”).
- A hierarchical “episodes → entities/facts → communities” graph organization that mirrors common agent memory desiderata (episodic + semantic + higher-level consolidation).
- Treats retrieval as a configurable IR stack (hybrid search + reranking), not “just query a graph”.

## System overview (mechanism-first)

### Memory types and primitives

- **Episodes**: raw messages/text/JSON with a reference timestamp `tref`.
- **Entities**: extracted/resolved nodes with summaries and embeddings.
- **Facts / semantic edges**: relations between entities with temporal metadata; can be invalidated by newer contradictory edges.
- **Communities**: clusters of entities with summaries for higher-level retrieval/global context.

### Write path / Read path / Maintenance

- **Write path**:
  - Ingest episode → extract entities (with short context window) → entity resolution/dedup → extract facts/edges → temporal extraction → invalidate overlapping contradictions.
  - Community detection + summary updates (dynamic extension + periodic refresh).
- **Read path**:
  - Query → search candidates (cosine/BM25/BFS) → rerank (RRF/MMR/mention- and distance-based; optional cross-encoder) → construct a context string with facts + validity ranges and entity summaries.
- **Maintenance**:
  - Continuous dedup/resolution; temporal invalidation rather than deletion to preserve history.
  - Community refreshes are an explicit long-running maintenance job.

## Evaluation (as reported)

- **DMR** (MemGPT’s Deep Memory Retrieval task):
  - Reports Zep outperforming MemGPT slightly (e.g., 94.8% vs 93.4% with gpt-4-turbo; full-context is also high).
  - Also reports gpt-4o-mini runs (Zep 98.2% vs full-context 98.0%).
- **LongMemEval (LongMemEvals subset)**:
  - Conversations average ~115k tokens.
  - Reports accuracy gains vs full-context baselines while reducing average context tokens to ~1.6k and reducing latency by ~90%.
  - Breakdown shows improvements are strongest for preference/multi-session/temporal questions, with a notable drop on “single-session-assistant”.

## Implementation details worth stealing

- **Validity intervals + invalidation semantics** as the default for “corrections” (instead of overwriting/deleting).
- Hybrid retrieval that includes **graph BFS** expansion (seeded by initial search) to surface contextually related facts.
- Explicit **constructor** step that formats memory into a stable prompt-ready layout (facts with date ranges, entity summaries).
- Storing provenance links from derived facts → source episodes to support citation/audit.

## Open questions / risks / missing details

- Cost profile of graph construction + community summarization at scale (background jobs, LLM calls) is only partially characterized.
- Security/poisoning is not the focus; a memory layer service needs explicit tenant isolation + write-time policy gates.
- DMR is acknowledged as a weak benchmark; LongMemEval baselines are stronger but still rely on LLM-judge evaluation.

## Notes

- Paper version reviewed: arXiv v1 (2025-01-20).
- Vendor context: this is a Zep-authored paper describing a production system.
