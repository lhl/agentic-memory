---
title: "Memoria: A Scalable Agentic Memory Framework for Personalized Conversational AI"
author: "Samarth Sarin et al."
date: 2026-02-22
type: reference
tags:
  - paper
  - system
  - agentic-memory
  - personalization
  - knowledge-graph
  - conversational-memory
  - summarization
  - recency-weighting
  - longmemeval
  - chromadb
  - sqlite
source: https://arxiv.org/abs/2512.12686
source_alt: https://arxiv.org/pdf/2512.12686.pdf
version: "arXiv v1 (2025-12-14)"
context: "Industry-style architecture for personalized conversational assistants: persistent SQL logs + session summaries + KG triplets stored in a vector DB with exponential recency weighting. Useful for shisad as a pragmatic ‘KG user model + summary’ hybrid and as a baseline for read-time conflict resolution without hard deletes."
related:
  - ../ANALYSIS-arxiv-2512.12686-memoria.md
files:
  - ./papers/arxiv-2512.12686.pdf
  - ./papers/arxiv-2512.12686.md
---

# Memoria: A Scalable Agentic Memory Framework for Personalized Conversational AI

## TL;DR

- Proposes **Memoria**, a modular memory layer for LLM chat apps focused on **personalization across sessions**.
- Hybrid memory design:
  - **dynamic session-level summarization** (short-term coherence),
  - a **knowledge-graph (KG) user model** built from extracted triplets (long-term traits/preferences).
- Stores:
  - raw conversation logs + summaries in **SQLite**,
  - KG triplets in SQL (raw) and as embeddings in **ChromaDB** with metadata (timestamp, source message, user).
- At retrieval time, gets top-`K` triplets (K=20 reported) and assigns **exponential recency weights** to prioritize new information and resolve contradictions.
- Reported evaluation on LongMemEvals (subset):
  - Accuracy (LLM-judge): **87.1%** (single-session-user) and **80.8%** (knowledge-update), slightly above full-context prompting (85.7% / 78.2%) and A-Mem variants (as reported).
  - Prompt length: ~400 tokens vs ~115k full context (as reported).
- Builder caveat: evaluation is limited to 2/6 LongMemEvals categories; memory semantics are mostly “append + weighted retrieval” (no explicit versioning/ACL/poisoning controls).

## What’s novel / different

- A simple, explicit **recency-weighting scheme** over retrieved KG triplets (EWA / exponential decay) as a conflict-resolution mechanism.
- Clear modular decomposition into: persistent logging, persona KG, session summary, and retrieval.

## System / method overview (mechanism-first)

### Memory types and primitives

- Episodic-ish: structured conversation history + per-session summaries.
- Semantic-ish: KG triplets extracted from user messages (subject, predicate, object).
- Primitive operations:
  - extract triplets (LLM),
  - embed + store triplets (vector DB),
  - retrieve top-`K` triplets by semantic similarity,
  - weight triplets by recency before prompt construction.

### Write path / Read path / Maintenance

- **Write path**:
  - persist raw messages with timestamps/session IDs,
  - extract KG triplets from user messages and store (SQL + vector DB),
  - update session summary and store against session ID.
- **Read path**:
  - retrieve session summary + top-`K` KG triplets filtered by user,
  - compute exponential decay weights based on time since creation,
  - construct prompt using summary + weighted triplets.
- **Maintenance**:
  - no explicit pruning/TTL/version chains; “freshness” handled via recency weighting.

## Evaluation (as reported)

- Dataset: LongMemEvals (~115k tokens per conversation on average).
- Only two categories evaluated: single-session-user and knowledge-update.
- LLM: GPT-4.1-mini; embeddings: text-embedding-ada-002; vector store: ChromaDB; retrieval `K=20`; decay rate α=0.02.

## Implementation details worth stealing

- Persist raw transcripts + structured extractions (triplets) with metadata for filtering and traceability.
- Use recency-weighted retrieval to resolve contradictions without hard deletes.
- Keep session-summary as a cheap “working context” cache.

## Open questions / risks / missing details

- Privacy/security: user KG can contain sensitive attributes; needs ACLs, retention, redaction, and audit logs.
- Update semantics: weighting helps at read time, but there’s no explicit “supersedes” relation or contradiction tracking.
- Benchmark coverage: results are limited to a narrow LongMemEvals slice; no LoCoMo/LongMemEval full coverage.

## Notes

- Paper version reviewed: arXiv v1 (2025-12-14).
- Code availability: authors state they plan to release as open-source package (not validated here).

