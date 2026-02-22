---
title: "ENGRAM: Effective, Lightweight Memory Orchestration for Conversational Agents"
author: "Daivik Patel et al."
date: 2026-02-22
type: reference
tags:
  - paper
  - system
  - agent-memory
  - conversational-memory
  - typed-memory
  - episodic
  - semantic
  - procedural
  - routing
  - dense-retrieval
  - sqlite
  - token-efficiency
  - latency
  - locomo
  - longmemeval
source: https://arxiv.org/abs/2511.12960
source_alt: https://arxiv.org/pdf/2511.12960.pdf
version: "arXiv v2 (2026-02-03)"
context: "A strong ‘minimalist’ counterpoint to OS/graph-heavy memory stacks: typed memory records (episodic/semantic/procedural) + simple dense retrieval + strict evidence budgets. Useful for shisad as a baseline architecture and as evidence that better typing/budgeting can beat more complex orchestration."
related:
  - ../ANALYSIS-arxiv-2511.12960-engram.md
files:
  - ./papers/arxiv-2511.12960.pdf
  - ./papers/arxiv-2511.12960.md
---

# ENGRAM: Effective, Lightweight Memory Orchestration for Conversational Agents

## TL;DR

- Proposes **ENGRAM**, a deliberately simple long-term memory layer for conversational agents:
  - route each user turn into one or more **typed memory stores** (**episodic / semantic / procedural**),
  - persist normalized JSON records + embeddings (SQLite),
  - retrieve top-`k` dense neighbors per type at query time, merge/dedup, and inject as evidence context.
- Uses a **single router** (3-bit mask) + **single dense retriever** (cosine similarity), arguing this can match/beat more complex graph/OS-like memory systems.
- Reported results:
  - **LoCoMo**: best overall LLM-as-a-judge score **77.55** (gpt-4o-mini backbone), with ~916 memory tokens on average.
  - **LongMemEvalS**: **71.40%** overall judge vs **56.20%** full-context while using only **~1.0–1.2k tokens** vs ~101k (≈99% fewer tokens).
  - Latency (LoCoMo): median total **1.487s** (p95 1.819s), as reported.
- Ablations show typed separation matters: collapsing into a single undifferentiated store drops LoCoMo overall to **46.56%** judge.
- Builder caveat: the system focuses on retrieval + evidence budgeting; it doesn’t foreground correction/versioning semantics or poisoning defenses.

## What’s novel / different

- The “novelty” is mostly a **systems stance**: you can get SOTA by combining:
  - careful **memory typing** (episodic/semantic/procedural),
  - deterministic routing + formatting,
  - and strict evidence budgets (K scaling analysis).
- Makes budgeting quantitative: shows a “knee” around **K≈25** for LoCoMo accuracy per token.

## System / method overview (mechanism-first)

### Memory types and primitives

- Router output: `b_t ∈ {0,1}^3` indicating which stores to write to.
- Record schemas:
  - **episodic**: `(title, summary, temporal_anchor, embedding)`
  - **semantic**: `(fact, temporal_anchor, embedding)`
  - **procedural**: `(title, content, temporal_anchor, embedding)`
- Retrieval:
  - embed query once,
  - per-type top-`k` cosine neighbors,
  - `merge → dedup → truncate` to a fixed final budget (reported default K=25).

### Write path / Read path / Maintenance

- **Write path**:
  - router prompt decides store(s),
  - per-type extractor prompt normalizes a record (episodic extractor emphasizes temporal normalization).
  - records persisted to SQLite.
- **Read path**:
  - retrieve candidates per store,
  - merge + speaker-specific banks,
  - deterministic prompt template injects `timestamp: text` evidence.
- **Maintenance**:
  - primarily via budgeting and dedup at read-time; no deep lifecycle/TTL/versioning framework is the focus.

## Evaluation (as reported)

- LoCoMo: category-wise + overall judge scores; compares against Mem0, MemOS, LangMem, Zep, OpenAI memory, RAG, and full-context.
- LongMemEvalS: compares against full-context only (frozen ENGRAM config) to isolate horizon scaling.
- Reports search/total latency (p50/p95) and memory token budgets.

## Implementation details worth stealing

- Typed memory separation + per-type retrieval ensures heterogeneous evidence modes are represented.
- K-value scaling analysis provides a concrete starting point for evidence budgeting.
- Speaker-attributed evidence banks prevent mixing voices in multi-party settings.

## Open questions / risks / missing details

- Corrections/updating: how to represent “this preference changed” beyond adding another fact?
- Security: no explicit write-time poisoning/injection threat model.
- Dependence on backbone/evaluator: results are reported with gpt-4o-mini and an LLM-judge; reproducibility depends on prompt + judge stability.

## Notes

- Paper version reviewed: arXiv v2 (2026-02-03).
- Code availability: paper claims a complete implementation + harness (not validated here).

