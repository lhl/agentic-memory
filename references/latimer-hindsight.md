---
title: "Hindsight is 20/20: Building Agent Memory that Retains, Recalls, and Reflects"
author: "Chris Latimer et al."
date: 2026-02-22
type: reference
tags:
  - paper
  - system
  - agent-memory
  - retain-recall-reflect
  - temporal-reasoning
  - entity-resolution
  - memory-graph
  - belief-tracking
  - confidence
  - retrieval-fusion
  - locom o
  - longmemeval
source: https://arxiv.org/abs/2512.12818
source_alt: https://arxiv.org/pdf/2512.12818.pdf
version: "arXiv v1 (2025-12-14)"
context: "A ‘memory as reasoning substrate’ architecture that explicitly separates evidence from belief and adds a reflect layer that updates opinions with confidence over time. Highly relevant to shisad’s planned versioned-corrections + historical memory story and to implementing token-budgeted multi-channel retrieval."
related:
  - ../ANALYSIS-arxiv-2512.12818-hindsight.md
files:
  - ./papers/arxiv-2512.12818.pdf
  - ./papers/arxiv-2512.12818.md
---

# Hindsight is 20/20: Building Agent Memory that Retains, Recalls, and Reflects

## TL;DR

- Proposes **Hindsight**, a memory architecture that treats memory as a **structured substrate for reasoning**, not just “top‑k snippets appended to a prompt”.
- Organizes memory into **four logical networks**:
  - **World facts** and **agent experiences** (objective evidence),
  - **Observations** (preference-neutral entity summaries synthesized from facts),
  - **Opinions/beliefs** (subjective beliefs with **confidence scores** that evolve over time).
- Defines three core operations:
  - **retain** (extract + store temporally grounded narrative facts with entities and links),
  - **recall** (token-budgeted, multi-strategy retrieval with fusion + reranking),
  - **reflect** (profile-conditioned reasoning that forms/updates beliefs traceably).
- TEMPR implements retain/recall: narrative fact extraction + entity resolution + a memory graph with link types (entity/temporal/semantic/causal) and a **four-way parallel retrieval** (vector, BM25, graph spreading activation, temporal-range retrieval) fused by **RRF** and reranked by a cross-encoder.
- CARA implements reflect: integrates an agent “disposition profile” (skepticism/literalism/empathy + bias strength) and updates opinions’ confidence based on new supporting/contradicting evidence.
- Reported results are extremely strong:
  - **LongMemEval (S)**: Hindsight (OSS‑20B) overall **83.6%** vs full-context OSS‑20B **39.0%** and full-context GPT‑4o **60.2%** (as reported).
  - **LoCoMo**: Hindsight (OSS‑20B) overall **83.18%** vs Memobase **75.78%** (as reported); larger backbones reach ~89.6% overall.
- Code is reported as open: `vectorize-io/hindsight` with an interactive benchmarks viewer.

## What’s novel / different

- Explicitly separates:
  - **evidence** (facts/experiences) vs
  - **inference** (opinions) vs
  - **summaries** (observations),
  addressing a common failure mode where systems store model-generated beliefs as if they were facts.
- Retrieval is explicitly **token-budgeted** (not just “top‑k”), and multi-channel with rank fusion + reranking.
- Provides a concrete mechanism for **belief evolution** via confidence updates when new evidence arrives.

## System / method overview (mechanism-first)

### Memory types and primitives

- Memory unit: narrative fact node with embedding + temporal interval (`τs, τe`) + mention time (`τm`) + type.
- Graph edges: weighted links of types: entity, temporal, semantic, causal.
- Opinion unit: `(text, confidence ∈ [0,1], time)`; updated by reinforcement when evidence supports/contradicts.

### Write path / Read path / Maintenance

- **Write (retain)**: LLM narrative fact extraction → temporal normalization → entity resolution → link construction → background observation updates.
- **Read (recall)**: four parallel retrieval channels → Reciprocal Rank Fusion → cross-encoder rerank → pack within token budget.
- **Reflect**: profile-conditioned reasoning over retrieved evidence to answer and to create/update opinions.

## Evaluation (as reported)

- Benchmarks: LongMemEval (S setting) and LoCoMo.
- Metrics: LLM-as-a-judge binary correctness.
- Uses open-source “GPT‑OSS” models for retention/reflection and a larger judge model (as reported).

## Implementation details worth stealing

- Narrative fact extraction (keep context/justifications together) + entity-aware graph linking.
- Token-budgeted retrieval API plus RRF fusion of multiple retrieval channels.
- Separate “observation” summaries from “opinion” beliefs, and track confidence evolution over time.

## Open questions / risks / missing details

- Evaluation relies on LLM judges; baseline numbers for some systems are imported from prior reports.
- Resource costs: retain-time extraction + graph construction + reranking may be expensive at scale.
- Security: write-time poisoning is not the primary focus; strong provenance/taint policies are still needed.

## Notes

- Paper version reviewed: arXiv v1 (2025-12-14).
- Code: paper links `https://github.com/vectorize-io/hindsight` and a benchmarks viewer (not validated here).

