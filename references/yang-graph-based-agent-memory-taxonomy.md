---
title: "Graph-based Agent Memory: Taxonomy, Techniques, and Applications"
author: "Chang Yang et al."
date: 2026-02-22
type: reference
tags:
  - paper
  - survey
  - taxonomy
  - agent-memory
  - graph-memory
  - knowledge-graph
  - temporal-graph
  - retrieval
  - consolidation
source: https://arxiv.org/abs/2602.05665
source_alt: https://arxiv.org/pdf/2602.05665.pdf
version: "arXiv v1 (2026-02-05)"
context: "A graph-centric survey of agent memory: taxonomy, lifecycle (extract/store/retrieve/evolve), storage structures (KG/temporal/hyper/hierarchical/hybrid), retrieval operators, and self-evolution techniques. Useful for shisad as a shared vocabulary for graph-as-index vs graph-as-source-of-truth and for identifying missing primitives (provenance, consolidation, reorganization)."
related:
  - ../ANALYSIS-arxiv-2602.05665-graph-based-agent-memory-taxonomy.md
files:
  - ./papers/arxiv-2602.05665.pdf
  - ./papers/arxiv-2602.05665.md
---

# Graph-based Agent Memory: Taxonomy, Techniques, and Applications

## TL;DR

- Survey of **graph-based agent memory** for LLM agents, arguing graphs are a strong substrate for relational structure, hierarchy, and multi-hop retrieval.
- Provides a multi-axis **taxonomy of agent memory** (short vs long-term; knowledge vs experience; structural vs non-structural), then maps graph memory as a unifying view.
- Frames memory as a lifecycle with four stages:
  1. **Extraction** (raw observations → structured units),
  2. **Storage** (organize/index in a graph structure),
  3. **Retrieval** (operators over graphs: similarity/rule/graph/temporal/agent-based),
  4. **Evolution** (consolidation, reasoning, reorganization).
- Summarizes open-source libraries, benchmarks, and application scenarios; maintains a resource list (as reported): `https://github.com/DEEP-PolyU/Awesome-GraphMemory`.

## Why it matters for shisad

- Helps name design choices: graph as **index/view** vs graph as **source of truth**; temporal validity semantics; consolidation and reorganization jobs.
- Makes “evolution” first-class: graphs must be maintained (merge/prune/repair), not only appended.

