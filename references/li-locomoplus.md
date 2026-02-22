---
title: "Locomo-Plus: Beyond-Factual Cognitive Memory Evaluation Framework for LLM Agents"
author: "Yifei Li et al."
date: 2026-02-22
type: reference
tags:
  - paper
  - benchmark
  - evaluation
  - cognitive-memory
  - long-term-memory
  - llm-as-a-judge
source: https://arxiv.org/abs/2602.10715
source_alt: https://arxiv.org/pdf/2602.10715.pdf
version: "arXiv v1 (2026-02-11)"
related:
  - ../ANALYSIS-arxiv-2602.10715-locomoplus.md
files:
  - ./papers/arxiv-2602.10715.pdf
  - ./papers/arxiv-2602.10715.md
---

# Locomo-Plus: Beyond-Factual Cognitive Memory Evaluation Framework for LLM Agents

## TL;DR

- Introduces **LoCoMo-Plus**, a benchmark and evaluation framework targeting **beyond-factual “cognitive memory”**: retaining and applying **latent constraints** (state/goals/values/causal context) across long conversations even when later queries are **not semantically similar** to the original cue (“cue–trigger semantic disconnect”).
- Argues existing conversational memory benchmarks (including LoCoMo-style factual QA) over-index on **explicit factual recall** and surface-form scoring.
- Proposes a **constraint-consistency** evaluation framing: instead of a single gold response, a response is correct if it lies in the set of outputs consistent with an induced constraint.
- Uses **LLM-as-a-judge** for constraint consistency and reports agreement/stability checks vs human annotators and across judge backbones.

## What’s novel / different

1. **Level-2 cognitive memory**: evaluates implicit behavioral constraints, not just recallable facts.
2. **Cue–trigger construction**: generates cue dialogues and later trigger queries with intentionally low semantic similarity.
3. **Evaluation protocol shift**: from overlap metrics (“did you match the reference?”) to **behavioral validity** (“are you consistent with the constraint?”).

## Benchmark construction (high level)

- Generate “cue dialogues” that imply a latent constraint (e.g., diet goal, relationship value, state).
- Human verification to keep only **memory-worthy** cues (persistent, behaviorally constraining, non-trivial).
- Construct trigger queries that require applying the cue but remain **underspecified** in isolation.
- Apply semantic filtering + a “memory elicitation” check to ensure the trigger genuinely requires recalling the cue.
- Embed validated cue–trigger pairs into long LoCoMo trajectories with a specified time gap.

LoCoMo-Plus decomposes cognitive memory constraints into four components:
- **causal**, **state**, **goal**, **value**.

## Evaluation notes (as reported)

- Highlights evaluation artifacts in older protocols:
  - **prompt bias** when explicitly disclosing task type to the model,
  - **length bias** in overlap metrics (models penalized/favored by style/length, not semantic validity).
- Quantifies judge reliability:
  - agreement between two human annotators and an LLM judge,
  - stability across different judge backbones.
- Reports a qualitative “length sensitivity” result:
  - object memory is robust,
  - episodic memory decays steadily,
  - cognitive memory collapses rapidly with long-context interference.

## Builder-oriented takeaways

- “Memory” that matters for user experience is often **constraint-shaped**, not fact-shaped.
- Systems need to represent and retrieve **latent constraints** (values/goals/state) and apply them consistently across time.
- For safety-first systems, “cognitive/procedural memory” is instruction-shaped; it needs **stricter governance** than factual memory.
