---
title: "General Agentic Memory Via Deep Research (GAM)"
author: "B.Y. Yan et al."
date: 2026-02-22
type: reference
tags:
  - paper
  - system
  - agent-memory
  - just-in-time
  - deep-research
  - page-store
  - retrieval-planning
  - reflection
  - locomo
  - long-context
source: https://arxiv.org/abs/2511.18423
source_alt: https://arxiv.org/pdf/2511.18423.pdf
version: "arXiv v1 (2025-11-23)"
context: "GAM reframes agent memory as just-in-time (JIT) compilation: keep lightweight memos plus a universal page-store of full history, then run a deep-research agent at request time to assemble an optimized context. Useful for shisad as a concrete architecture for separating raw evidence storage from runtime context synthesis, with clear latency/cost trade-offs."
related:
  - ../ANALYSIS-arxiv-2511.18423-gam.md
files:
  - ./papers/arxiv-2511.18423.pdf
  - ./papers/arxiv-2511.18423.md
---

# General Agentic Memory Via Deep Research (GAM)

## TL;DR

- Proposes **GAM**, a memory framework built on a “**just-in-time compilation**” principle: don’t over-compress memory ahead of time; instead synthesize optimized context at runtime.
- Two modules:
  - **Memorizer**: produces lightweight structured **memos** while storing complete sessions as **pages** in a universal page-store (with headers to preserve semantics for retrieval).
  - **Researcher**: performs iterative **plan → search → integrate → reflect** deep research over the page-store, guided by memos, to produce a compact context for a client agent.
- Uses multiple search tools (embedding search, BM25, ID-based page exploration) and can scale test-time computation via reflection depth / retrieved pages.
- Reports large gains vs baselines on LoCoMo and long-context QA benchmarks (as reported), with notable online latency due to iterative research (Table 5, as reported).
- Code reported: `https://github.com/VectorSpaceLab/general-agentic-memory`.

## What’s novel / different

- Treats memory as a **two-tier artifact**:
  - lightweight memo index (cheap),
  - full page-store (lossless evidence),
  and moves “expensive thinking” to query time.
- Makes “deep research over your own history” a first-class retrieval/compilation mechanism.

## Open questions / risks

- Online serving time can be high due to iterative planning/reflection.
- Without strong provenance + policy, page-store retrieval can surface poisoned or cross-scope information.

