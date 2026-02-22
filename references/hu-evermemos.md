---
title: "EverMemOS: A Self-Organizing Memory Operating System for Structured Long-Horizon Reasoning"
author: "Chuanrui Hu et al."
date: 2026-02-22
type: reference
tags:
  - paper
  - system
  - memory-os
  - agent-memory
  - episodic-memory
  - semantic-consolidation
  - lifecycle
  - clustering
  - user-profile
  - foresight
  - locom o
  - longmemeval
  - personamem
source: https://arxiv.org/abs/2601.02163
source_alt: https://arxiv.org/pdf/2601.02163.pdf
version: "arXiv v2 (2026-01-09)"
context: "A lifecycle-based ‘memory OS’ that builds episodic MemCells, consolidates them into MemScenes (thematic clusters) and user profiles, then performs necessity/sufficiency-guided recollection. Highly relevant for shisad as a reference design for consolidation + scene-guided retrieval + query rewriting/sufficiency checks."
related:
  - ../ANALYSIS-arxiv-2601.02163-evermemos.md
files:
  - ./papers/arxiv-2601.02163.pdf
  - ./papers/arxiv-2601.02163.md
---

# EverMemOS: A Self-Organizing Memory Operating System for Structured Long-Horizon Reasoning

## TL;DR

- Proposes **EverMemOS**, a “memory operating system” that treats memory as a **lifecycle** rather than a flat record store.
- Core primitives:
  - **MemCell** `c=(E,F,P,M)`:
    - `E` episode narrative (semantic anchor),
    - `F` atomic facts (precise matching),
    - `P` foresight/prospection with validity intervals (temporary plans/states),
    - `M` metadata (timestamps, sources).
  - **MemScene**: thematic cluster of MemCells for coherent consolidation.
- Three phases:
  1) **Episodic Trace Formation**: segment dialogue into MemCells (episodes/facts/foresight),
  2) **Semantic Consolidation**: cluster MemCells into MemScenes and update a compact user profile,
  3) **Reconstructive Recollection**: scene-guided retrieval that composes “necessary and sufficient” context, with LLM-based sufficiency checks and query rewriting when needed.
- Reported results:
  - **LoCoMo**: EverMemOS reaches **86.76%** (GPT‑4o‑mini backbone) and **93.05%** (GPT‑4.1‑mini backbone), outperforming Zep/MemOS/Mem0 baselines (as reported).
  - **LongMemEval**: EverMemOS overall **83.00%**, beating MemOS **77.80%** (as reported).
- Also evaluates persona/profile modeling on PersonaMem-v2 and analyzes segmentation/retrieval budgets.

## What’s novel / different

- Makes consolidation explicit via **MemScenes** (scene-level “semantic structures”) rather than treating retrieval as independent top‑k fragments.
- Adds an explicit **necessity/sufficiency** retrieval loop (verify context sufficiency; rewrite query if insufficient).
- Includes “foresight” objects with validity intervals (a concrete representation for temporary constraints/plans).

## System / method overview (mechanism-first)

### Memory types and primitives

- Episodic traces (MemCell episodes + facts).
- Consolidated scene-level semantic structure (MemScenes).
- User profile updated from scene summaries.
- Time-bounded foresight (plans/states with `[t_start, t_end]` validity).

### Write path / Read path / Maintenance

- **Write path**:
  - semantic segmentation for episode boundaries,
  - generate MemCell from each segment (episode + facts + foresight),
  - assimilate MemCells into MemScenes online; update scene summary + user profile.
- **Read path**:
  - retrieve relevant MemCells by hybrid dense+BM25 over facts (RRF),
  - select top MemScenes (default N≈10),
  - pool/re-rank episodes (default K≈10),
  - filter foresight by validity at current time,
  - verify sufficiency; optionally query rewrite.
- **Maintenance**:
  - incremental clustering updates, profile evolution, and consolidation reduce fragmentation.

## Evaluation (as reported)

- Benchmarks: LoCoMo, LongMemEval (S setting), PersonaMem-v2.
- Baselines: Zep, Mem0, MemOS, MemoryOS, etc. (LongMemEval baselines partly taken from MemOS leaderboard).
- Judge reliability is compared to human annotation (Cohen’s κ > 0.89, as reported).

## Implementation details worth stealing

- MemCell/MemScene abstraction as a concrete consolidation hierarchy.
- Verification + query rewriting loop for “retrieval sufficiency”.
- Scene-guided retrieval budgets (separate `N` scenes from `K` episodes) and cost–accuracy frontier analysis.

## Open questions / risks / missing details

- Operational cost: lifecycle phases can require many LLM calls and tokens (especially at write/consolidation time).
- Safety: user profiles and foresight are sensitive; needs governance (ACLs, retention, taint).
- Baseline comparability: some LongMemEval baseline scores are imported rather than re-run end-to-end.

## Notes

- Paper version reviewed: arXiv v2 (2026-01-09).
- Code: paper links `https://github.com/EverMind-AI/EverMemOS` (not validated here).

