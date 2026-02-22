---
title: "Agentic Memory: Learning Unified Long-Term and Short-Term Memory Management for Large Language Model Agents"
author: "Yi Yu et al."
date: 2026-02-22
type: reference
tags:
  - paper
  - system
  - agent-memory
  - reinforcement-learning
  - grpo
  - long-term-memory
  - short-term-memory
  - memory-operations
  - context-management
  - evaluation
source: https://arxiv.org/abs/2601.01885
source_alt: https://arxiv.org/pdf/2601.01885.pdf
version: "arXiv v1 (2026-01-05)"
context: "AgeMem is an RL-trained policy that unifies LTM + STM operations as tool actions (add/update/delete/retrieve/summarize/filter). Useful for shisad as a ‘learned controller’ direction once explicit memory primitives + logging are stable, and as evidence for step-wise credit assignment over memory actions."
related:
  - ../ANALYSIS-arxiv-2601.01885-agentic-memory.md
files:
  - ./papers/arxiv-2601.01885.pdf
  - ./papers/arxiv-2601.01885.md
---

# Agentic Memory (AgeMem): Learning Unified Long-Term and Short-Term Memory Management for LLM Agents

## TL;DR

- Proposes **Agentic Memory (AgeMem)**: a unified framework that makes both **long-term memory (LTM)** and **short-term context management (STM)** part of the agent’s policy.
- Exposes memory control as **tool actions**:
  - LTM: `ADD`, `UPDATE`, `DELETE`
  - STM: `RETRIEVE` (from LTM into context), `SUMMARY`, `FILTER`
- Trains the agent with a **three-stage progressive RL** setup and a **step-wise GRPO** variant to handle sparse/discontinuous rewards from memory operations.
- Reported evaluation on 5 long-horizon benchmarks (ALFWorld, SciWorld, PDDL, BabyAI, HotpotQA) shows AgeMem outperforms strong memory baselines (LangMem, A-Mem, Mem0/Mem0g) across Qwen backbones.
- Adds “Memory Quality” (MQ) evaluation using HotpotQA supporting facts to assess relevance of stored LTM (as reported).

## What’s novel / different

- Explicitly unifies *two usually separate concerns*:
  - LTM writing/updating and
  - STM prompt/context budgeting,
  under one RL-trained tool-action policy.
- Step-wise GRPO broadcasts a terminal advantage signal back across all earlier memory actions, addressing discontinuous credit assignment.

## System / method overview (mechanism-first)

### Memory types and primitives

- LTM: persistent store manipulated by `ADD/UPDATE/DELETE`.
- STM: active conversation/context `C_t` manipulated by:
  - `RETRIEVE` from LTM into STM,
  - `SUMMARY` to compress,
  - `FILTER` to remove distractors/noise.

### Write path / Read path / Maintenance

- **Write path**: in a “casual interaction” stage, agent decides what salient info to store into LTM.
- **Read path**: in later stages, agent retrieves from LTM and manages STM to answer tasks under distractors and long contexts.
- **Maintenance**: emerges through learned `UPDATE/DELETE` and through STM summarization/filtering policies; no explicit governance model is central.

## Evaluation (as reported)

- RL fine-tuning performed on HotpotQA training (Stage 1 context is available from supporting facts), then evaluated zero-shot across other environments.
- Metrics: success/progress rates (embodied tasks), LLM-judge for HotpotQA, and an LLM-judged “Memory Quality” score comparing stored memories to ground-truth supporting facts.
- Backbones: Qwen2.5-7B-Instruct and Qwen3-4B-Instruct.

## Implementation details worth stealing

- Treat memory decisions as logged tool calls with clear action semantics; this makes it possible to start with heuristics and later learn policies.
- Separate rewards for task success, context efficiency, and memory quality (plus penalties for overflow/tool abuse).

## Open questions / risks / missing details

- RL reward realism: many deployments lack clean step-wise correctness signals (especially for LTM write quality).
- Safety/security: tool-based memory writes are a large attack surface; write-policy gating and taint tracking are not the focus here.
- Portability: results depend on training setup (three stages, distractor design) and chosen judge models.

## Notes

- Paper version reviewed: arXiv v1 (2026-01-05).
- Code availability: not checked here.

