---
title: "MemBench: Towards More Comprehensive Evaluation on the Memory of LLM-based Agents"
author: "Haoran Tan et al."
date: 2026-02-22
type: reference
tags:
  - paper
  - benchmark
  - evaluation
  - agent-memory
  - factual-memory
  - reflective-memory
  - observation-scenario
  - participation-scenario
  - efficiency
  - capacity
source: https://arxiv.org/abs/2506.21605
source_alt: https://arxiv.org/pdf/2506.21605.pdf
version: "arXiv v1 (2025-06-20)"
context: "A memory benchmark/dataset that explicitly covers multiple interaction scenarios (participation vs observation) and multiple memory levels (factual vs reflective), with metrics for accuracy/recall/capacity/efficiency; good candidate for shisad evaluation adapters."
related:
  - ../ANALYSIS-arxiv-2506.21605-membench.md
files:
  - ./papers/arxiv-2506.21605.pdf
  - ./papers/arxiv-2506.21605.md
---

# MemBench: Towards More Comprehensive Evaluation on the Memory of LLM-based Agents

## TL;DR

- Introduces **MemBench**, a dataset + benchmark intended to evaluate memory in LLM-based agents more comprehensively than prior work.
- Adds two key coverage axes that are often missing:
  - **Multi-scenario**: participation (agent interacts) vs **observation** (agent is a passive recorder).
  - **Multi-level**: **factual memory** (specific attributes/events) vs **reflective memory** (higher-level preferences inferred/aggregated from evidence).
- Uses a time-aware simulation of interaction: at time `t` the agent sees the current round; earlier rounds must be recalled through the memory mechanism (closer to real “write then later retrieve”).
- Proposes multiple metrics beyond “did the agent answer”: **accuracy**, **retrieval recall**, **capacity** (performance vs memory size), and **temporal efficiency** (read/write time).
- Evaluates several common memory mechanisms (Full/Recent/Retrieval memories, MemoryBank, MemGPT, GenerativeAgent, etc.) and finds retrieval-based memory is most robust at very long histories (as reported).

## What’s novel / different

- Treats “agent memory” as more than long dialogue QA:
  - observation-only use cases matter (e.g., agents listening/monitoring channels),
  - reflective preference inference matters (not only factual recall).
- Explicitly reports **read time** and **write time** per operation, highlighting that some memory architectures are too slow for realistic use.
- Uses a controllable **noise injection** process to push histories to ~100k tokens while avoiding factual conflicts (as described).

## Dataset design (mechanism-first)

### Memory levels

- **Factual memory (FM)**: specific attributes about users/entities/events (e.g., ages, hometowns, event times) including:
  - indirect time expressions that require normalization,
  - knowledge updates (corrections over time),
  - single- vs multi-session reasoning.
- **Reflective memory (RM)**: higher-level preferences inferred from multiple low-level mentions (e.g., infer a “sweet and salty” flavor preference from liked dishes), plus assistant-side recommendation tracking.

### Interactive scenarios

- **Participation scenario (PS)**: agent converses with the user and must remember both user messages and its own responses (predefined in the simulation).
- **Observation scenario (OS)**: agent is a passive observer that only needs to remember user messages over time.

### Evaluation metrics (as defined by authors)

- **Memory accuracy**: questions are multiple-choice to reduce grading ambiguity.
- **Memory recall**: for retrieval-based mechanisms, compute whether key evidence dialogues are retrieved (Recall@10).
- **Memory capacity**: measure accuracy as memory-token volume increases; a “cliff” indicates limited retention capacity.
- **Temporal efficiency**: per-operation read time (RT) and write time (WT).

## Benchmark results (as reported)

The paper evaluates seven memory mechanisms (implemented via MemEngine) using Qwen2.5-7B as a base agent model, and reports performance under long histories (10k vs 100k-ish token regimes depending on scenario/sub-dataset).

Headline patterns from the main tables:
- **RetrievalMemory** is the most robust at very long histories:
  - FM Participation accuracy improves to ~0.833 at 100k (vs FullMemory ~0.489; RecentMemory ~0.422).
  - FM Observation accuracy ~0.933 at 100k (vs FullMemory ~0.631; RecentMemory ~0.512).
  - RM shows similar robustness where some other mechanisms degrade at 100k.
- **Efficiency matters**: some mechanisms have much higher RT/WT:
  - e.g., MemGPT shows very high read times in the reported setup (seconds), and MemoryBank shows very high write times.

The paper also compares different base LLMs (Qwen2.5-7B, GPT-4o-mini, Llama-3.1-8B, GLM-4-9B) and finds base model choice interacts strongly with memory method performance and latency (as reported).

## Implementation details worth stealing

- Time-aware evaluation protocol (“write now, recall later”).
- Separate evaluation for observer-mode memory (OS) vs participant-mode (PS).
- Reflective-memory question types as a proxy for “preference consolidation”.
- Report RT/WT to keep memory systems honest about deployability.

## Open questions / risks / missing details

- Multiple-choice accuracy avoids grading ambiguity but may under-measure partial correctness or generative reasoning.
- The dataset is built from structured relation graphs and generated dialogues; transfer to real, messy conversations is an open question.
- “Reflective memory” is still a narrow slice (preferences); emotional/identity-tied or procedural reflection is not deeply modeled.
- Security/poisoning is out of scope; MemBench should be paired with attack benchmarks (e.g., MINJA-style).

## Notes

- Paper version reviewed: arXiv v1 (2025-06-20).
- Code/dataset link (as stated): `https://github.com/import-myself/Membench` (not validated here).
