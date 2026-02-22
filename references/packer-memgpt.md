---
title: "MemGPT: Towards LLMs as Operating Systems"
author: "Charles Packer et al."
date: 2026-02-22
type: reference
tags:
  - paper
  - system
  - agent-memory
  - virtual-context
  - paging
  - hierarchical-memory
  - function-calling
source: https://arxiv.org/abs/2310.08560
source_alt: https://arxiv.org/pdf/2310.08560.pdf
version: "arXiv v2 (2024-02-12)"
context: "MemGPT is a foundational external-memory architecture: OS-inspired hierarchical memory + paging between an LLM’s fixed context window and external stores (recall + archival). Useful for shisad as a reference for memory tiers, function-call memory ops, and event-driven control flow, plus as a baseline to improve on with stronger versioning/safety semantics."
related:
  - ../ANALYSIS-arxiv-2310.08560-memgpt.md
files:
  - ./papers/arxiv-2310.08560.pdf
  - ./papers/arxiv-2310.08560.md
---

# MemGPT: Towards LLMs as Operating Systems

## TL;DR

- Proposes **MemGPT**, an OS-inspired approach to “virtual context management” for fixed-context LLMs.
- Adds a **hierarchical memory system**:
  - **main context** (system instructions + working context + FIFO queue),
  - **external context** (recall storage DB + archival storage DB),
  with paging between tiers via **LLM function calls**.
- The LLM can chain function calls (“heartbeat”) to do multi-step retrieval/pagination.
- Reported multi-session chat results show large gains in deep memory retrieval accuracy when using MemGPT vs fixed-context baselines (Table 2, as reported).
- Releases code/data and a benchmarks page (as reported): `https://research.memgpt.ai`.

## What’s novel / different

- Treats the LLM like a process with limited RAM and uses paging to/from disk-like stores.
- Makes memory management a first-class part of agent control flow (events, warnings, scheduled tasks).

## Open questions / risks

- Function-call write/read operations are a security boundary; without write gating, memory can become a persistence vector for prompt injection.
- The paper emphasizes paging mechanics more than correction/version semantics and governance.

