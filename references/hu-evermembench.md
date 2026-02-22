---
title: "EverMemBench: Benchmarking Long-Term Interactive Memory in Large Language Models"
author: "Chuanrui Hu et al."
date: 2026-02-22
type: reference
tags:
  - paper
  - benchmark
  - evaluation
  - long-term-memory
  - multi-party
  - temporal-reasoning
source: https://arxiv.org/abs/2602.01313
source_alt: https://arxiv.org/pdf/2602.01313.pdf
version: "arXiv v2 (2026-02-03)"
related:
  - ../ANALYSIS-arxiv-2602.01313-evermembench.md
files:
  - ./papers/arxiv-2602.01313.pdf
  - ./papers/arxiv-2602.01313.md
---

# EverMemBench: Benchmarking Long-Term Interactive Memory in Large Language Models

## TL;DR

- Introduces **EverMemBench**, a benchmark designed to stress **realistic long-horizon memory** patterns: **multi-party, multi-group** conversations with **interleaved topics**, **role-conditioned personas**, and **dynamic knowledge updates**, spanning **>1M tokens** (as reported).
- Evaluates memory systems with **1,000+ QA pairs** across three dimensions:
  1) **fine-grained recall**, 2) **memory awareness** (knowing when to use history), and 3) **user profile understanding**.
- Key reported findings:
  - **Multi-hop reasoning collapses** in the multi-party/interleaved setting (even strong long-context models perform poorly).
  - **Temporal reasoning is largely unsolved**, and needs **version semantics** (supersession, “final” state) rather than timestamp matching.
  - “Memory awareness” is often **retrieval-bottlenecked**: the answer model can reason if given strong evidence, but similarity-based retrieval produces weak/fragmented evidence.

## What’s novel / different

1. **Interaction structure**: not dyadic; information is scattered across speakers, channels/groups, and time.
2. **Non-stationary facts**: explicit emphasis on knowledge updates and conflict resolution.
3. **Benchmark hygiene pipeline** (QA filtering): designed to reduce “guessability” and enforce evidence grounding.

## Benchmark curation pipeline (as described)

The paper describes a multi-stage QA curation/verification pipeline:

- **Blind test**: discard QA pairs that an LLM can answer from the question alone (filters parametric memorization and artifacts).
- **Evidence grounding**: segment the conversation; require “sufficiency” (evidence segment alone supports answer) and “uniqueness” (other segments should not).
- **Human audit**: expert review for semantic coherence and pragmatic plausibility.

## Evaluation setup (high level)

- Compares:
  - **long-context LLMs** that read full history, and
  - **memory-augmented systems** (e.g., Zep/Mem0/MemOS/EverMemOS as configured by the authors).
- Includes an **oracle** setting that directly provides ground-truth evidence spans to the answer model to isolate “reasoning vs retrieval” bottlenecks.

## Builder-oriented takeaways

- “Just increase context length” and “top-k retrieval” both fail under **cross-thread multi-party fragmentation**.
- Temporal questions force **update-aware memory semantics**:
  - what changed, what supersedes what, what is “final”, and what should be answered *as-of* a time.
- For system builders (e.g., shisad), the benchmark implies you need:
  - structured episodic/task representations,
  - update/version chains, and
  - retrieval strategies that can bridge semantic gaps (not only similarity search).
