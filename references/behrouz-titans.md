---
title: "Titans: Learning to Memorize at Test Time"
author: "Ali Behrouz et al."
date: 2026-02-22
type: reference
tags:
  - paper
  - architecture
  - long-context
  - test-time-learning
  - neural-memory
  - continual-learning
  - attention
  - recurrent-models
source: https://arxiv.org/abs/2501.00663
source_alt: https://arxiv.org/pdf/2501.00663.pdf
version: "arXiv v1 (2024-12-31)"
context: "Internal (parametric) memory module that learns online at inference/test time; useful as a conceptual and algorithmic reference for multi-timescale consolidation and write-salience (surprise/forgetting) in agent memory systems."
related:
  - ../ANALYSIS-arxiv-2501.00663-titans.md
files:
  - ./papers/arxiv-2501.00663.pdf
  - ./papers/arxiv-2501.00663.md
---

# Titans: Learning to Memorize at Test Time

## TL;DR

- Introduces a **neural long-term memory module** that **updates its weights at test time** via an online learning rule, intended to complement short-term attention.
- Defines “surprise” using gradients of an **associative memory loss** and uses **momentum + weight decay/gating** as a structured forgetting mechanism.
- Proposes **Titans**, architectures with three branches:
  1) a **core** short-term module (attention with limited window),
  2) a **long-term memory** module (their neural memory), and
  3) **persistent memory** (learnable, input-independent parameters).
- Provides three integration variants: **Memory-as-Context (MAC)**, **Memory-as-Gate (MAG)**, and **Memory-as-Layer (MAL)** (plus memory-only LMM).
- Reports improvements over Transformers and modern linear recurrent models on language modeling, reasoning, and long-context benchmarks (as reported).

## What’s novel / different (memory lens)

- Treats long-term memory as a **meta in-context learner**: it learns a *memorization rule* during training but applies that rule online at inference.
- Uses an explicit **forgetting knob** `α_t` (weight decay / gating) to manage limited capacity at million-token scales.
- Separates “task knowledge” (persistent memory) from contextual long-term memory (neural memory), mirroring a short-term vs long-term vs task prior decomposition.

## System / method overview (mechanism-first)

### Neural memory module (online update)

The memory is a neural network `M_t` updated online to compress past inputs `{x_1…x_{t-1}}` into its parameters.

- Project token to key/value: `k_t = x_t W_K`, `v_t = x_t W_V`.
- Inner-loop associative memory objective:
  - `ℓ(M_{t-1}; x_t) = || M_{t-1}(k_t) - v_t ||^2`
- Update uses a “surprise” term from gradients:
  - Momentary surprise: `∇ℓ(M_{t-1}; x_t)`
  - Past surprise/momentum: `S_t = η_t S_{t-1} - θ_t ∇ℓ(...)`
- Forgetting/gating:
  - `M_t = (1 - α_t) M_{t-1} + S_t`
  - Intuition: `α_t→1` clears memory; `α_t→0` preserves past abstraction.

Retrieval is the forward pass without weight update: `y_t = M*(q_t)` where `q_t = x_t W_Q`.

### Persistent memory

Adds `N_p` learnable, input-independent parameters `{p_1…p_{N_p}}` prepended to the sequence as task-related memory (“meta-memory”).

### Titans integration variants

- **MAC**: chunk sequence into segments; retrieve long-term memory for the current segment; concatenate persistent memory + retrieved long-term memory + current segment and run attention; update memory with the attention output.
- **MAG**: combine sliding-window attention output with neural memory output via a gating nonlinearity; persistent memory is included as a prefix.
- **MAL**: stack memory then attention: first apply neural memory to compress context, then apply sliding-window attention to memory output.
- **LMM**: memory-only variant (no attention).

## Evaluation (as reported)

- Language modeling + commonsense reasoning (perplexity + accuracy) across model sizes.
- Needle-in-a-haystack tasks (RULER S-NIAH) across context lengths (2K→16K).
- BABILong benchmark (few-shot + fine-tuning) with comparisons against large frontier models and RAG baselines (reported via figures).
- Paper claims effectiveness at very long context (up to multi-million tokens) in NIAH-style settings (as reported).

Representative reported NIAH numbers (S-NIAH, 16K):
- **Titans (MAC)** maintains high scores across tasks where TTT/Mamba2/DeltaNet degrade sharply.

## Implementation details worth stealing (for external agent memory too)

- “Surprise” as an operational salience proxy (gradient magnitude / prediction error) for deciding what should persist.
- Explicit **forgetting control** (`α_t`) as a first-class parameter rather than relying on implicit decay.
- A three-way separation:
  - short-term precise context use,
  - long-term adaptive compression,
  - persistent task priors.

## Open questions / risks

- This is an **internal parametric memory** approach; translating to external agent memory requires mapping “update rules” to “write policies + consolidation”.
- Online weight updates at inference raise practical questions: determinism, drift, safety, auditability, and deployment constraints.
- Most reported gains are on synthetic/benchmark settings; end-to-end agent usefulness depends on tool use and memory governance.

## Notes

- Paper version reviewed: arXiv v1 (2024-12-31).
