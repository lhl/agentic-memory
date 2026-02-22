---
title: "HEMA: A Hippocampus-Inspired Extended Memory Architecture for Long-Context AI Conversations"
author: "Kwangseob Ahn"
date: 2026-02-22
type: reference
tags:
  - paper
  - system
  - conversational-memory
  - vector-memory
  - summarization
  - hippocampus-inspired
  - faiss
  - pruning
  - long-context
source: https://arxiv.org/abs/2504.16754
source_alt: https://arxiv.org/pdf/2504.16754.pdf
version: "arXiv v1 (2025-04-23)"
context: "A practical dual-memory design (compact running summary + episodic vector store) with explicit prompt-budgeting and pruning policies; useful as an engineering reference and as a cautionary example for evaluation rigor and dataset realism."
related:
  - ../ANALYSIS-arxiv-2504.16754-hema.md
files:
  - ./papers/arxiv-2504.16754.pdf
  - ./papers/arxiv-2504.16754.md
---

# HEMA: A Hippocampus-Inspired Extended Memory Architecture for Long-Context AI Conversations

## TL;DR

- Proposes HEMA, a **dual-memory** architecture for long dialogues:
  - **Compact Memory**: a continuously updated short summary intended to preserve the global narrative.
  - **Vector Memory**: an episodic store of embedded dialogue chunks retrieved via cosine similarity.
- Adds two key maintenance ideas:
  - **Semantic forgetting**: age/salience-weighted pruning of low-salience vectors to reduce latency.
  - **Summary-of-summaries**: periodically compress older summaries to reduce drift/cascade errors.
- Describes an explicit **prompt composition** policy with a hard budget (≤ 3,500 tokens) that includes summary + retrieved chunks + recent turns.
- Reports large gains in long-form QA accuracy/coherence and improved retrieval PR curves vs a summary-only baseline (as reported).
- Builder caveat: the evaluation relies heavily on synthetic/constructed datasets and custom metrics; treat reported results as directional unless reproduced.

## What’s novel / different

- A straightforward “hippocampus-inspired” mapping:
  - Compact summary as neocortical gist,
  - episodic vector store as hippocampal traces.
- Explicitly quantifies retrieval quality via **P@5 / R@50 / AUPRC** on an “annotated relevance oracle” (as described).
- Introduces a simple but implementable forgetting policy (age decay + “recently retrieved” bonus) and measures latency tradeoffs.

## System overview (mechanism-first)

### Memory types and primitives

- **Compact Memory**: a single running summary `S_t` updated per turn:
  - `S_t = Summarizer(S_{t-1}, u_t)`
  - plus a “summary-of-summaries” compression every 100 turns.
- **Vector Memory**:
  - chunk each dialogue turn/window into chunk `c`,
  - embed `e = Φ(c)` (paper lists `text-embedding-3-small`, 1536-d),
  - store embeddings in an ANN index (paper lists FAISS IVF-4096 + OPQ-16).

### Read path / prompt compilation

- On each user query, compute query embedding and retrieve top-`K` chunks by cosine similarity.
- Compose a prompt with:
  - system guidelines,
  - compact summary,
  - retrieved chunks,
  - recent dialogue tail.
- Enforce a hard prompt budget (≤ 3,500 tokens) by trimming retrieved chunks based on similarity.

### Maintenance: semantic forgetting

Every 100 turns, prune the bottom 0.5% by a salience weight (paper notation):
- combines an age-based decay term and a “recently retrieved” indicator/bonus.

## Evaluation (as reported)

Datasets (as described):
- LongformQA-100 (Wikipedia-based dialogues, ~320–350 turns)
- StoryCloze-Ext (synthetic narrative dialogues, up to 500 turns)
- Synthetic-Support (synthetic customer support, ~280 turns)

Baselines:
- No-Memory (keep recent ~4k tokens)
- Summary-Only
- Streaming RAG (BM25 top-5 from transcript)

Metrics:
- factual recall accuracy (exact match vs predefined spans)
- human-rated coherence (1–5; Fleiss κ reported)
- retrieval P@5, R@50, AUPRC
- latency (wall clock)

Key reported headline results:
- Retrieval: Compact+Vector P@5 ≈ 0.82, R@50 ≈ 0.74, AUPRC ≈ 0.72 (vs summary-only lower).
- Downstream quality: long-form QA accuracy 0.41 → 0.87 and coherence 2.7 → 4.3 with Compact+Vector (vs raw).
- Robustness: recall degrades with dialogue length for raw/compact-only but remains higher for compact+vector at 500 turns (as reported).

## Implementation details worth stealing

- Hard **prompt budgeting** (≤ 3.5k tokens) with explicit trimming rules.
- Periodic **summary-of-summaries** as an anti-drift consolidation job.
- A simple, measurable pruning policy (“semantic forgetting”) with latency vs recall tradeoffs.

## Open questions / risks

- Dataset provenance and realism: synthetic dialogues can overestimate retrieval and summarization effectiveness.
- Summarizer drift and omission: summary-only fails if the summarizer misses a later-salient detail; HEMA relies on explicit cueing + retrieval to recover.
- Security posture: no adversarial memory poisoning evaluation; vector stores + summaries are write-time attack surfaces.
- Multi-tenant scoping and correction semantics are not central; builders need versioning and policy layers.

## Notes

- Paper version reviewed: arXiv v1 (2025-04-23).
