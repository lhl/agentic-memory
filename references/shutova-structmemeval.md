---
title: "Evaluating Memory Structure in LLM Agents (StructMemEval)"
author: "Alina Shutova et al."
date: 2026-02-22
type: reference
tags:
  - paper
  - benchmark
  - agent-memory
  - evaluation
  - structured-memory
  - memory-organization
  - ledgers
  - state-tracking
  - trees
source: https://arxiv.org/abs/2602.11243
source_alt: https://arxiv.org/pdf/2602.11243.pdf
version: "arXiv v1 (2026-02-11)"
context: "StructMemEval is a benchmark suite that tests whether agents can organize long-term memory into useful structures (trees/ledgers/state machines), not just retrieve facts. Useful for shisad as an evaluation target for structured memory primitives and as evidence that ‘memory organization’ is a distinct capability from retrieval."
related:
  - ../ANALYSIS-arxiv-2602.11243-structmemeval.md
files:
  - ./papers/arxiv-2602.11243.pdf
  - ./papers/arxiv-2602.11243.md
---

# Evaluating Memory Structure in LLM Agents (StructMemEval)

## TL;DR

- Proposes **StructMemEval**, a benchmark intended to measure whether an agent can **organize** long-term memory, not just recall facts via retrieval.
- Task families are chosen to require specific human-style knowledge structures:
  - **tree-structured** relations (e.g., family/corporate hierarchies),
  - **state tracking** over time (transitions that change which facts are currently valid),
  - **counting/ledger** problems (transactions + netting / reconciliation).
- Uses an optional **“memory organization hint”** per scenario to test whether the model can recognize the required structure without being told.
- Key reported qualitative finding: retrieval baselines degrade when the task exceeds top‑k budgets or needs stateful context, while memory agents perform well *if they adhere to the correct structure* (especially when hinted).
- Reports two main failure modes in memory agents: **(i) not organizing memory** (especially without hints) and **(ii) hallucinating spurious memories** after many consecutive updates.
- Releases the task suite + code (as reported): `https://github.com/yandex-research/StructMemEval`.

## What’s novel / different

- Benchmarks “memory” as **structure formation and maintenance** (ledgers/trees/state machines), rather than as recall of isolated facts.
- Explicitly separates:
  - “agent can do the algorithm if memory is organized”
  - vs “agent fails because it never organized memory in the first place”.

## System / method overview (mechanism-first)

### Memory types and primitives (implicit)

StructMemEval is architecture-agnostic: it does not prescribe an internal memory representation, but tasks implicitly require:
- hierarchical structures (trees/graphs),
- append-only transactional records (ledgers),
- state machines / validity tracking (state transitions).

### Evaluation setup highlights (as reported)

- 73 unique scenarios (conversations) and 544 evaluation questions (as reported).
- Evaluates with and without structure hints.
- Compares retrieval-augmented LLM baselines to memory agents including **mem-agent** and **Mem0** (as reported), with notes about minimal tuning and model dependence.

## Open questions / risks

- Some results appear in appendices and figures; replication likely requires careful prompt + hyperparameter matching.
- The “hint” mode demonstrates potential but may overestimate performance in realistic settings where the agent must infer structure itself.

