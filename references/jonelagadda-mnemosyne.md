---
title: "Mnemosyne: An Unsupervised, Human-Inspired Long-Term Memory Architecture for Edge-Based LLMs"
author: "Aneesh Jonelagadda et al."
date: 2026-02-22
type: reference
tags:
  - paper
  - system
  - agent-memory
  - edge
  - graph-memory
  - probabilistic-recall
  - decay
  - redundancy
  - core-summary
  - healthcare
source: https://arxiv.org/abs/2510.08601
source_alt: https://arxiv.org/pdf/2510.08601.pdf
version: "arXiv v1 (2025-10-07)"
context: "Edge-focused memory architecture for longitudinal, high-redundancy domains (healthcare). Useful to shisad as a concrete graph-based alternative to ‘top-k vector store + prompt prepend’, and as a design example for decay/refresh, redundancy handling, and a fixed-budget persona/core summary."
related:
  - ../ANALYSIS-arxiv-2510.08601-mnemosyne.md
files:
  - ./papers/arxiv-2510.08601.pdf
  - ./papers/arxiv-2510.08601.md
---

# Mnemosyne: An Unsupervised, Human-Inspired Long-Term Memory Architecture for Edge-Based LLMs

## TL;DR

- Proposes **Mnemosyne**, an **unsupervised**, edge-friendly long-term memory system built around a **memory graph** (nodes = interaction summaries; edges = similarity links).
- **Write/commit** is gated by:
  - an LLM-based **substance filter** (discard mundane summaries),
  - a classical ML **redundancy filter** (mutual information + Jaccard similarity) that pairs redundant nodes and computes a “rewind/boost” value.
- **Read/recall** is **probabilistic**: pick a start node (query similarity augmented with “naturalized time deltas”), then do DFS-style traversal where node/edge selection probability is modulated by **temporal decay** and **refresh/rewind** boosts.
- Maintains a fixed-budget **core summary** (“supersummary”) derived from a fixed-size subset of the graph to capture stable user/persona details and to serve as a salience baseline for the substance filter.
- Reported results:
  - **Human eval win rate**: 65.8% for Mnemosyne (with core summary) vs 31.1% for a naive RAG baseline (as reported).
  - **LoCoMo**: highest J-scores (as reported) for single-hop (62.78) and temporal reasoning (53.03) among the compared methods; overall J-score 54.55 (second to Memory-R1’s 62.74).
- Builder caveat: probabilistic recall can be non-deterministic, and baseline comparability is tricky because LoCoMo numbers are partially cited from another paper and human eval uses internal annotators.

## What’s novel / different

- Treats “forgetting” as a **probability model** (decay + refresh) instead of hard TTLs or fixed-size caches.
- Designs explicitly for **edge constraints** and **high semantic redundancy** domains where naive vector similarity retrieval tends to return near-duplicates.
- Introduces “temporal language” (“last week”, etc.) as part of similarity scoring to improve temporally situated recall.

## System / method overview (mechanism-first)

### Memory types and primitives

- Memory unit: **interaction summaries** stored as graph nodes (plus lightweight metadata).
- Graph edges: similarity links between nodes (weighted by embedding similarity + keyword overlap).
- Derived memory:
  - “**core summary**” (persona/stable details) generated periodically from a fixed-size subset of nodes.

### Write path / Read path / Maintenance

- **Write path (commitment)**:
  - Input: interaction summaries (optionally with a running summary).
  - Substance filter (LLM): keep only “substantial” summaries.
  - Redundancy filter (MI + Jaccard): pair redundant nodes, drop newest in a redundant pair, compute a boost/rewind value.
  - Connect new node via weighted edges to similar nodes; generate hypothetical queries (HyDE-style) to reduce query–document mismatch.
- **Read path (recall)**:
  - Choose a start node with a similarity score that mixes:
    - query ↔ “hypothetical query + summary”, and
    - query ↔ metadata including **naturalized time delta** text.
  - Probabilistic DFS traversal: choose neighbors with probability proportional to `edge_weight × decay(effective_age) × exploration`.
  - Return recalled nodes formatted as LLM context + always inject the core summary.
- **Maintenance**:
  - Periodic core summary refresh (async).
  - Pruning module for graph-size control.

## Evaluation (as reported)

- LoCoMo J-scores reported with GPT-4o-mini as judge; baseline LoCoMo numbers cited from Memory-R1’s paper for comparable backbone.
- Human study: pairwise preferences over 40 queries, 8 annotators (internal), comparing Mnemosyne (with/without core summary) and naive RAG.

## Implementation details worth stealing

- Redundancy detection and “refresh” boosts for repeated memories (a concrete alternative to naive LRU/TTL).
- Core-summary as a fixed-budget “user model” memory that is always in context.
- Time-delta natural language features for temporal retrieval (instead of only numeric timestamps).

## Open questions / risks / missing details

- Probabilistic traversal stability: how often does recall miss key evidence or vary between runs?
- Domain dependence: “substantial” definition is healthcare-centric; generalization needs policy design.
- Comparability and bias: human eval uses internal annotators; LoCoMo baseline numbers are partly cited rather than re-run.

## Notes

- Paper version reviewed: arXiv v1 (2025-10-07).
- Code availability: not checked here.

