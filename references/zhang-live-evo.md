---
title: "Live-Evo: Online Evolution of Agentic Memory from Continuous Feedback"
author: "Yaolun Zhang et al."
date: 2026-02-22
type: reference
tags:
  - paper
  - system
  - agent-memory
  - online-learning
  - continual-learning
  - experience-bank
  - feedback
  - meta-guidelines
  - forecasting
  - prophet-arena
  - deep-research
source: https://arxiv.org/abs/2602.02369
source_alt: https://arxiv.org/pdf/2602.02369.pdf
version: "arXiv v1 (2026-02-02)"
context: "An online self-evolving memory system that updates experience usefulness weights from continuous feedback (contrastive eval) and learns meta-guidelines for compiling retrieved experiences into task-adaptive guidance. Useful for shisad as a reference for utility feedback loops, forgetting via down-weighting, and explicit procedural ‘how to use memory’ layers (with stronger safety gates)."
related:
  - ../ANALYSIS-arxiv-2602.02369-live-evo.md
files:
  - ./papers/arxiv-2602.02369.pdf
  - ./papers/arxiv-2602.02369.md
---

# Live-Evo: Online Evolution of Agentic Memory from Continuous Feedback

## TL;DR

- Proposes **Live-Evo**, an *online* self-evolving agent memory system intended for live benchmarks where tasks arrive over time and feedback is revealed later.
- Splits memory into:
  - an **Experience Bank** (reusable experiences) with **weights** that are reinforced/decayed from feedback, and
  - a **Meta-Guideline Bank** (higher-level instructions for how to turn retrieved experiences into a task-specific guideline).
- For each task, runs a loop: **Retrieve → Compile guideline → Act → Update**.
- Uses **contrastive evaluation** (solve with guideline vs without) to estimate the causal contribution of memory, then updates experience weights accordingly.
- Controls memory growth by generating new experience candidates from the worst-performing cases and only committing them if re-evaluation improves performance.
- Reported results (Prophet Arena, 10 weeks, GPT-4.1-mini): **Brier score 0.14 vs 0.19 base** (20.8% improvement) and **market return 1.46 vs 1.24** (12.9% improvement), as reported.
- Also reports generalization to a deep-research benchmark (XBench-DeepResearch) with **0.46 accuracy**, slightly above open-source deep research baselines (as reported).

## What’s novel / different

- Treats memory evolution as a *truly online* problem with continuous, objective feedback (calibration + returns), not “folded” static benchmarks.
- Separates **what happened** (experience) from **how to use it** (meta-guidelines), making “procedural memory for compilation” explicit.
- Uses contrastive eval to drive reinforcement/forgetting of experiences, rather than purely heuristic recency/utility scoring.

## System / method overview (mechanism-first)

### Memory types and primitives

- **Experience**: a structured record derived from a solved task (question + summarized trajectory/outcome + guidance).
- **Meta-guideline**: a higher-level rule for combining retrieved experience(s) with the current task to produce a guideline.
- **Weights** per experience that scale retrieval score: `Score = Weight × Sim(experience, query)`.

### Write path / Read path / Maintenance

- **Write path**:
  - store trajectories for tasks solved with guidelines,
  - summarize worst cases into candidate experiences,
  - commit only after re-evaluation shows improvement.
- **Read path**:
  - retrieve top‑k experiences + a meta-guideline,
  - compile a task-specific guideline,
  - answer with the guideline.
- **Maintenance**:
  - reinforce/decay experience weights from feedback,
  - add meta-guidelines on failure,
  - down-weight stale/misleading experiences over time.

## Evaluation (as reported)

- **Prophet Arena** (live future prediction; 10 weeks / 500 tasks): metrics include multiclass **Brier score** and **market return**.
- **XBench-DeepResearch**: accuracy metric; sequential evaluation across folds (as described).

## Implementation details worth stealing

- Contrastive “memory-on vs memory-off” measurement as a driver for memory updates (even if run offline due to cost).
- Down-weighting “bad experiences” as a forgetting mechanism (safer than delete, but still needs audit).
- A distinct meta-guideline store for “how to use memory” (procedural compilation heuristics).

## Open questions / risks / missing details

- Contrastive evaluation doubles inference cost; unclear if it can be amortized or approximated.
- Meta-guidelines are high-leverage procedural content and likely need strong write gates, provenance, and testing to avoid instruction/poisoning risks.
- Prophet Arena is domain-specific (forecasting); unclear transfer to conversational memory or tool-heavy task agents without adaptation.

## Notes

- Paper version reviewed: arXiv v1 (2026-02-02).

