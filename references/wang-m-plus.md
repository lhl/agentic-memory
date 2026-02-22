---
title: "M+: Extending MemoryLLM with Scalable Long-Term Memory"
author: "Yu Wang et al."
date: 2026-02-22
type: reference
tags:
  - paper
  - architecture
  - latent-memory
  - long-context
  - retriever
  - memory-tokens
  - compression
source: https://arxiv.org/abs/2502.00592
source_alt: https://arxiv.org/pdf/2502.00592.pdf
version: "arXiv v2 (2025-05-30)"
context: "M+ extends MemoryLLM with an explicit long-term latent memory store plus a co-trained retriever, improving retention to >160k tokens at similar GPU memory cost. Useful for shisad as a reference point for latent-space memory alternatives and for ideas like age-ordered memory retrieval, write/read separation, and retrieval-quality diagnostics."
related:
  - ../ANALYSIS-arxiv-2502.00592-m-plus.md
files:
  - ./papers/arxiv-2502.00592.pdf
  - ./papers/arxiv-2502.00592.md
---

# M+: Extending MemoryLLM with Scalable Long-Term Memory

## TL;DR

- Proposes **M+**, a latent-space memory architecture built on **MemoryLLM** that adds a **long-term memory** store and a co-trained **retriever**.
- Key mechanism: tokens that MemoryLLM would normally drop during memory updates are instead stored in long-term memory and later **retrieved during generation**.
- Uses **age** metadata to keep retrieved long-term memory tokens chronologically ordered.
- Reports extending knowledge retention from <20k to **>160k tokens** with similar GPU memory overhead (as reported).
- Provides GPU memory cost comparisons and latency/retrieval-quality analyses (as reported).
- Code is reported open-sourced under the MemoryLLM repo: `https://github.com/wangyu-ustc/MemoryLLM`.

## What’s novel / different

- Adds explicit **long-term retention** to a latent-memory-token model via retrieval rather than increasing context length.
- Co-trains the retriever to select useful latent memory tokens instead of using attention heuristics alone.

## Open questions / risks

- This is model-architecture memory, not an external agent memory store; operational semantics (versioning, scoping, poisoning) differ from shisad-style systems.
- Interpretability and correction of latent memory remains hard.

