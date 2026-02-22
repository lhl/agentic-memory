---
title: "Remember Me, Refine Me: A Dynamic Procedural Memory Framework for Experience-Driven Agent Evolution (ReMe)"
author: "Zouying Cao et al."
date: 2026-02-22
type: reference
tags:
  - paper
  - system
  - agent-memory
  - procedural-memory
  - experience-replay
  - refinement
  - pruning
  - tool-use
  - appworld
  - bfcl
source: https://arxiv.org/abs/2512.10696
source_alt: https://arxiv.org/pdf/2512.10696.pdf
version: "arXiv v1 (2025-12-11)"
context: "ReMe is a procedural memory framework that distills success/failure trajectories into structured experiences, reuses them via scenario-aware retrieval, and refines/prunes the pool by utility. Useful for shisad as a concrete procedural-memory lifecycle (acquire → reuse → refine) and as evidence that experience pruning and indexing matter as much as storage."
related:
  - ../ANALYSIS-arxiv-2512.10696-remember-me-refine-me.md
files:
  - ./papers/arxiv-2512.10696.pdf
  - ./papers/arxiv-2512.10696.md
---

# Remember Me, Refine Me (ReMe)

## TL;DR

- Proposes **ReMe**, a procedural memory framework for experience-driven agent evolution (no parameter training required).
- Targets a failure mode the authors call **“passive accumulation”**: append-only experience archives that grow noisy/stale.
- Three main mechanisms across the lifecycle:
  1. **Multi-faceted distillation**: derive reusable experiences from success patterns, failure triggers, and comparative insights.
  2. **Context-adaptive reuse**: scenario-aware indexing/retrieval so experiences fit new tasks.
  3. **Utility-based refinement**: add validated experiences and prune outdated/harmful ones to keep a compact pool.
- Reports SOTA results on **BFCL‑V3** and **AppWorld**; highlights a “memory scaling” effect where smaller models + ReMe can beat larger memoryless baselines (as reported).

## What’s novel / different

- Treats procedural memory as a *managed pool* with explicit pruning, not a write-only log.
- Distillation explicitly learns from both successes and failures via comparative analysis.

## Open questions / risks

- Pruning/deletion needs careful audit + versioning to avoid losing history (especially for debugging and safety).
- Procedural experiences are high influence; write-gating and poisoning defenses matter.

