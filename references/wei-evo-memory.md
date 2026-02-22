---
title: "Evo-Memory: Benchmarking LLM Agent Test-time Learning with Self-Evolving Memory"
author: "Tianxin Wei et al."
date: 2026-02-22
type: reference
tags:
  - paper
  - benchmark
  - framework
  - agent-memory
  - test-time-learning
  - self-evolving-memory
  - experience-reuse
  - procedural-memory
  - evaluation
source: https://arxiv.org/abs/2511.20857
source_alt: https://arxiv.org/pdf/2511.20857.pdf
version: "arXiv v1 (2025-11-25)"
context: "A streaming benchmark + framework that evaluates memory as continual experience reuse (not just conversational recall). High-leverage for shisad’s evaluation roadmap: sequence-based tests, memory refinement/pruning, and metrics like step-efficiency and robustness."
related:
  - ../ANALYSIS-arxiv-2511.20857-evo-memory.md
files:
  - ./papers/arxiv-2511.20857.pdf
  - ./papers/arxiv-2511.20857.md
---

# Evo-Memory: Benchmarking LLM Agent Test-time Learning with Self-Evolving Memory

## TL;DR

- Introduces **Evo-Memory**, a **streaming benchmark + framework** for evaluating whether agents **accumulate and reuse experience** across sequential tasks (“test-time evolution”), not just recall facts from dialogue.
- Restructures many datasets into **task streams** and evaluates agents under a unified **search → synthesis → evolve** loop.
- Implements and compares **10+ memory modules** (retrieval-based, adaptive, workflow/procedural, hierarchical), including Mem0, MemOS, LangMem, Dynamic Cheatsheets, and Agent Workflow Memory.
- Proposes:
  - **ExpRAG**: retrieve top-`k` similar past task experiences and condition on them (one-shot experience reuse),
  - **ReMem**: a **Think / Act / Refine** loop where “Refine” prunes/organizes memory during deployment.
- Reports consistent gains for evolving-memory methods across proprietary backbones (Gemini 2.5 and Claude), especially in multi-turn environments; ReMem improves success/progress and reduces steps (as reported).

## What’s novel / different

- Shifts evaluation from “can you answer questions about a long chat?” to “can you **get better over time** on a stream of related tasks by reusing what you learned?”
- Adds metrics beyond accuracy: **progress**, **step efficiency**, and **sequence robustness** (sensitivity to task order).
- Treats memory as a **mutable experience store** with explicit refine/prune operations.

## System / method overview (mechanism-first)

### Memory types and primitives

- Memory unit: **experience tuples** like `(input/task, model output/trajectory, feedback)` serialized into text.
- Ops: retrieve similar experiences; append new experiences; optionally **prune** and **reorganize** memory (ReMem).

### Write path / Read path / Maintenance

- **Write path**: after each task step, store an experience entry with correctness/feedback.
- **Read path**: retrieve similar experiences for the current task and condition the agent on them.
- **Maintenance**: ReMem explicitly prunes unhelpful memories and performs meta-reasoning about what to keep.

## Evaluation (as reported)

- **Single-turn**: AIME-24/25, GPQA, MMLU-Pro, ToolBench.
- **Multi-turn**: AgentBoard environments like AlfWorld, BabyAI, PDDL, ScienceWorld (and others).
- **Models**: Gemini-2.5 series and Claude series.
- **Metrics**: exact match / accuracy, success & progress, steps-to-complete, robustness across task orders.

## Implementation details worth stealing

- A unified streaming evaluation harness for “experience reuse” with controlled memory budgets.
- A “refine” action space for memory: prune/remove irrelevant or harmful past experiences (especially failed trajectories).

## Open questions / risks / missing details

- Heavy dependence on proprietary models/APIs makes third-party replication harder.
- Feedback signal realism: many real deployments lack clean per-task correctness feedback.
- Safety: storing and retrieving past trajectories can leak instruction-like content unless write policies and tenant isolation exist.

## Notes

- Paper version reviewed: arXiv v1 (2025-11-25).
- Code availability: paper states code/configs will be released (not validated here).

