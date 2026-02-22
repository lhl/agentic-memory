---
title: "TiMem: Temporal-Hierarchical Memory Consolidation for Long-Horizon Conversational Agents"
author: "Kai Li et al."
date: 2026-02-22
type: reference
tags:
  - paper
  - system
  - agent-memory
  - consolidation
  - temporal-memory
  - hierarchical-memory
  - summarization
  - persona
  - retrieval-planning
  - locomo
  - longmemeval
source: https://arxiv.org/abs/2601.02845
source_alt: https://arxiv.org/pdf/2601.02845.pdf
version: "arXiv v1 (2026-01-06)"
context: "A temporal hierarchy (segment→session→day→week→profile) that explicitly consolidates conversation into progressively abstract persona representations, paired with a query-complexity recall planner and gating. Useful for shisad as a concrete consolidation schedule + hierarchical retrieval budgeting pattern."
related:
  - ../ANALYSIS-arxiv-2601.02845-timem.md
files:
  - ./papers/arxiv-2601.02845.pdf
  - ./papers/arxiv-2601.02845.md
---

# TiMem: Temporal-Hierarchical Memory Consolidation for Long-Horizon Conversational Agents

## TL;DR

- Proposes **TiMem**, a temporal–hierarchical memory framework built around a **Temporal Memory Tree (TMT)** that consolidates dialogue into multiple time scales.
- Uses a 5-level hierarchy (reported default):
  1) segments (fine-grained facts),
  2) sessions,
  3) daily,
  4) weekly,
  5) profile (persona-level stable preferences/values).
- Consolidation is done via **instruction prompting** (no fine-tuning) with level-specific prompts; higher levels are fewer and more abstract (progressive consolidation).
- Retrieval uses:
  - a **recall planner** that classifies query complexity (simple/hybrid/complex) and selects which hierarchy levels to consult,
  - **hierarchical recall** across selected levels,
  - a **recall gating** module to keep only query-relevant memories under token budgets.
- Reported results:
  - **LoCoMo** overall LLJ accuracy **75.30%** (vs MemOS 69.24%) and best per-category scores (as reported).
  - **LongMemEval‑S** overall LLJ accuracy **76.88%** (gpt‑4o‑mini answer model) and **78.96%** (gpt‑4o) (as reported).
  - Efficiency: adaptive planning reaches LoCoMo accuracy with ~**511** recalled tokens and LongMemEval‑S with ~**1271** recalled tokens (as reported).

## What’s novel / different

- Makes temporal structure first-class: memory objects have explicit time intervals and sit in a temporal containment hierarchy.
- Separates “store everything then retrieve” from “**consolidate progressively** into persona representations” and uses query complexity to decide which abstraction level to rely on.

## System / method overview (mechanism-first)

### Memory types and primitives

- Memory node `m`: time interval `τ(m)` + semantic memory `σ(m)` at a hierarchy level `ℓ(m)`.
- TMT `T=(M,E,τ,σ)` with constraints:
  - temporal containment (parent covers child interval),
  - progressive consolidation (higher levels are fewer),
  - semantic consolidation via level-specific prompts.

### Write path / Read path / Maintenance

- **Write path**:
  - consolidate dialog stream into segment memories,
  - merge into session/daily/weekly summaries,
  - incrementally refine a profile/persona representation.
- **Read path**:
  - planner chooses recall scope based on query complexity,
  - recall across chosen levels + temporal proximity ordering,
  - recall gating filters to a compact set for prompt injection.
- **Maintenance**:
  - ongoing consolidation reduces redundancy/noise over time; profile serves as stable long-term persona.

## Evaluation (as reported)

- Benchmarks: LoCoMo and LongMemEval‑S.
- Metric: LLM-as-a-judge (accuracy) plus F1 and ROUGE-L on LoCoMo.
- Baselines: MemoryBank, A‑MEM, Mem0, MemoryOS, MemOS.

## Implementation details worth stealing

- Temporal hierarchy with explicit consolidation prompts per time scale.
- Query-complexity planner + gating as explicit control knobs for memory budgets.

## Open questions / risks / missing details

- Consolidation errors: wrong summaries at higher levels can “poison” persona/profile.
- Update semantics: how corrections are represented across time scales isn’t fully explicit (supersedes vs overwrite vs append).
- Reliance on LLM prompting: robustness depends on prompt design and model stability.

## Notes

- Paper version reviewed: arXiv v1 (2026-01-06).
- Code availability: not checked here.

