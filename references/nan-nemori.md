---
title: "Nemori: Self-Organizing Agent Memory Inspired by Cognitive Science"
author: "Jiayan Nan et al."
date: 2026-02-23
type: reference
tags:
  - paper
  - system
  - long-term-memory
  - conversational-memory
  - episodic-memory
  - semantic-memory
  - episode-segmentation
  - predict-calibrate
  - locomo
  - longmemeval
source: https://arxiv.org/abs/2508.03341
source_alt: https://arxiv.org/pdf/2508.03341.pdf
source_repo: https://github.com/nemori-ai/nemori
version: "arXiv v3 (2025-08-27)"
related:
  - ../ANALYSIS-arxiv-2508.03341-nemori.md
files:
  - ./papers/arxiv-2508.03341.pdf
  - ./papers/arxiv-2508.03341.md
---

# Nemori: Self-Organizing Agent Memory Inspired by Cognitive Science

## TL;DR

- Proposes **Nemori**, a dual-store agent memory system: **episodic memory** (coherent episodes) + **semantic memory** (distilled knowledge statements).
- Addresses a common memory failure mode: **arbitrary chunking** for the “memory unit” (fixed-size chunks or turn pairs) by learning **semantic boundaries** and generating episodes.
- Introduces two principles:
  - **Two-Step Alignment**: (1) boundary alignment (semantic episode segmentation) → (2) representation alignment (episode title + third-person narrative).
  - **Predict-Calibrate**: a proactive knowledge-evolution loop that distills new semantic knowledge from **prediction gaps** (not “extract everything” heuristics).
- Uses a unified dense retriever over episodic + semantic stores; main setup retrieves **top-k episodes + top-2k semantic** items (as reported).
- Reports strong results on **LoCoMo** and **LongMemEvalS**, including major token reduction vs full-context baselines (as reported).

## What’s novel / different

1. **Granularity is treated as a first-class problem**: the system tries to learn episode boundaries rather than assuming a chunk size.
2. **Knowledge evolution via “prediction error”**: semantic memory updates are framed as “what the KB failed to predict about this episode”, not passive extraction rules.

## System / method overview (mechanism-first)

### Data model (as described)

- **Message buffer** `B_u` per user accumulates incoming messages until a boundary is detected.
- **Episodic memory** `e=(ξ, ζ)`:
  - `ξ`: concise title.
  - `ζ`: detailed third-person narrative of the episode.
- **Semantic memory** `K`: a set of distilled knowledge statements updated incrementally.

### Write path / Read path / Maintenance

- **Write path**:
  1. **Topic segmentation / boundary detection**: an LLM boundary detector returns `(is_boundary, confidence)`; segmentation triggers if `(is_boundary ∧ confidence > σ_boundary)` or buffer size reaches `β_max`.
  2. **Episode generation**: generate `(title, narrative)` from the segmented conversation.
  3. **Predict-Calibrate semantic update**:
     - retrieve relevant semantic knowledge `K_relevant`,
     - predict episode content from `(title, K_relevant)`,
     - compare prediction against the **raw segmented conversation** (ground truth) to distill “what was missed” into new semantic statements,
     - integrate into `K`.
- **Read path**: retrieve a mix of episodic + semantic memory and answer using the retrieved context (dense retrieval).
- **Maintenance**: primarily via the continual Predict-Calibrate integration step; explicit correction/version semantics are not a central focus in the paper.

## Evaluation (as reported)

### LoCoMo

- Metric: LLM-judge score (gpt-4o-mini judge), plus F1 and BLEU-1.
- Overall LLM-judge:
  - **Nemori (gpt-4o-mini)**: **0.744** vs FullContext **0.723**, Mem0 **0.613**, Zep **0.585**.
  - **Nemori (gpt-4.1-mini)**: **0.794** vs FullContext **0.806**.
- Efficiency (gpt-4o-mini):
  - Avg tokens **2,745** vs FullContext **23,653**; total latency **3,053 ms** vs **5,806 ms**.

### LongMemEvalS

- Reports large gains under ~105K-token average histories while using ~3.7–4.8K retrieved tokens (as reported).
- Average accuracy:
  - **gpt-4o-mini**: **64.2%** (Nemori) vs **55.0%** (FullContext).
  - **gpt-4.1-mini**: **74.6%** (Nemori) vs **65.6%** (FullContext).

## Open questions / risks / missing details (builder lens)

- **Write-time cost/latency**: boundary detection + narrative generation + predict-calibrate adds ongoing overhead; production viability depends on scheduling/batching.
- **Correction semantics**: the paper does not foreground an explicit “versioned truth maintenance” model (invalidation chains, provenance graphs, etc.).
- **Security posture**: the system assumes the write path is benign; it does not directly address memory poisoning/injection threats.
