---
title: "SimpleMem: Efficient Lifelong Memory for LLM Agents"
author: "Jiaqi Liu et al."
date: 2026-02-22
type: reference
tags:
  - paper
  - system
  - agent-memory
  - compression
  - consolidation
  - intent-aware-retrieval
  - multi-index-retrieval
  - locomo
  - longmemeval
source: https://arxiv.org/abs/2601.02553
source_alt: https://arxiv.org/pdf/2601.02553.pdf
version: "arXiv v3 (2026-01-29)"
context: "SimpleMem proposes a 3-stage, mechanism-heavy pipeline (structured semantic compression → online synthesis → intent-aware retrieval planning) to increase information density and cut token costs. Useful for shisad as a concrete design for write-time denoising + multi-view indexing + query-complexity-based retrieval budgets, with the usual need for provenance and ‘derived vs raw’ separation."
related:
  - ../ANALYSIS-arxiv-2601.02553-simplemem.md
files:
  - ./papers/arxiv-2601.02553.pdf
  - ./papers/arxiv-2601.02553.md
---

# SimpleMem: Efficient Lifelong Memory for LLM Agents

## TL;DR

- Proposes **SimpleMem**, a memory framework aimed at maximizing **information density** and reducing **inference-time token cost** for long-horizon interactions.
- Three-stage pipeline:
  1. **Semantic Structured Compression**: distills dialogue windows into compact “memory units” with multiple indexed views (semantic/lexical/symbolic); includes an implicit semantic-density gate.
  2. **Online Semantic Synthesis**: consolidates related units within-session to remove redundancy and keep memory compact.
  3. **Intent-Aware Retrieval Planning**: infers query intent/complexity to adapt retrieval scope and build compact contexts from multiple indexes with ID dedup.
- Uses multi-view retrieval (dense embeddings + BM25 + symbolic metadata) and unions results rather than complex weighting.
- Reported LoCoMo results (Table 1, GPT‑4.1‑mini): **Avg F1 43.24** vs **Mem0 34.20**, with much lower “Cost” (**531** vs **973**; full-context baseline **16,910**), as reported.
- Reported LongMemEval-S results (Table 2): **76.87%** avg accuracy (GPT‑4.1‑mini) and **83.97%** (GPT‑4.1), outperforming Mem0 (as reported).
- Code is reported available: `https://github.com/aiming-lab/SimpleMem`.

## What’s novel / different

- Treats “memory efficiency” as a write-time problem: compress and structure interactions before storage to avoid accumulating low-entropy noise.
- Integrates “gating + extraction + time/coref resolution” as a unified generation transform into context-independent units.
- Makes retrieval budget selection an explicit planning step (kmin→kmax) based on inferred query complexity.

## System / method overview (mechanism-first)

### Memory types and primitives

- **Memory unit**: atomized, context-independent statement(s) with resolved entities and absolute timestamps (as described).
- **Indexes/views**:
  - semantic (dense embeddings),
  - lexical (BM25),
  - symbolic (metadata constraints).

### Write path / Read path / Maintenance

- **Write path**: sliding windows → density gating → de-linearization transform (extract + coref + time anchoring) → optional synthesis/merge of related units.
- **Read path**: intent-aware planning chooses retrieval depth and query forms; retrieve across multiple views; union + dedup; compile bounded context.
- **Maintenance**: online synthesis functions like consolidation to keep memory compact.

## Open questions / risks

- “Semantic lossless compression” is only as good as the model’s extraction fidelity; errors can silently distort memory.
- Without raw-evidence pointers and audit trails, compressed units can be hard to debug or correct.
- Security/poisoning and multi-tenant isolation are not central; write-time gates matter a lot because stored units are high influence.

