---
title: "AriGraph: Learning Knowledge Graph World Models with Episodic Memory for LLM Agents"
author: "Petr Anokhin et al."
date: 2026-02-22
type: reference
tags:
  - paper
  - system
  - agent-memory
  - knowledge-graph
  - episodic-memory
  - semantic-memory
  - world-model
  - text-games
  - multi-hop-qa
source: https://arxiv.org/abs/2407.04363
source_alt: https://arxiv.org/pdf/2407.04363.pdf
version: "arXiv v3 (2025-05-15)"
context: "Knowledge-graph + episodic memory world model for an LLM agent; useful for shisad as a concrete episodic↔semantic linking design and graph-search retrieval pattern."
related:
  - ../ANALYSIS-arxiv-2407.04363-arigraph.md
files:
  - ./papers/arxiv-2407.04363.pdf
  - ./papers/arxiv-2407.04363.md
---

# AriGraph: Learning Knowledge Graph World Models with Episodic Memory for LLM Agents

## TL;DR

- Proposes **AriGraph**, a memory graph that combines:
  - **semantic memory** as a knowledge graph of extracted triplets, and
  - **episodic memory** as timestamped/step-indexed observation nodes connected to the triplets extracted from that observation.
- Uses an “Ariadne” agent architecture that separates **world-model update + retrieval**, **planning** (subgoals), and **decision-making** (ReAct-style).
- Retrieval is two-stage: **semantic graph search** (dense similarity + graph expansion) then **episodic search** (find the most relevant past observations linked to the semantic hits).
- Reports strong performance in **partially observable text-game environments** and competitive performance on **multi-hop QA** (as reported).
- Builder caveat: semantic graph updates rely on LLM extraction + “outdated edge” deletion; correction/version semantics are closer to “overwrite” than “retain history”.

## What’s novel / different

- A concrete operational link between episodic and semantic memory:
  - episodic vertices store raw observations,
  - episodic “edges” connect an observation to *all* semantic triplets extracted from it (effectively a hyperedge).
- Explicitly treats memory as a **world model** for navigation/exploration in partially observable environments (not only conversational recall).
- Retrieval uses KG structure for expansion (depth/width hyperparameters), not only vector similarity over text chunks.

## System / method overview (mechanism-first)

### Memory types and primitives

The world model is `G = (V_s, E_s, V_e, E_e)`:
- **Semantic vertices** `V_s`: entities/objects extracted from triplets.
- **Semantic edges** `E_s`: relations `(v, rel, u)` representing extracted triplets.
- **Episodic vertices** `V_e`: per-step observations `v_e^t = o_t` (raw text).
- **Episodic edges** `E_e`: for each step, a connection `(v_e^t, E_s^t)` linking the observation node to the set of semantic edges extracted from that observation (the paper notes these are technically hyperedges).

Key ops:
- `EXTRACT_TRIPLETS(o_t) → (V_s^t, E_s^t)` (LLM-based).
- `DELETE_OUTDATED(E_s_rel, E_s^t)` (LLM-based comparison; removes contradicted/obsolete incident edges).
- `ADD(V_s^t, E_s^t)` to semantic KG; `ADD(v_e^t)` and link to `E_s^t` in episodic layer.

### Write path / Read path / Maintenance

- **Write path** (per observation):
  1. Extract new triplets from `o_t` as `V_s^t, E_s^t`.
  2. Find existing incident edges `E_s_rel` for extracted entities.
  3. Detect “outdated” edges by comparing `E_s_rel` to `E_s^t`, and remove outdated edges.
  4. Add new vertices/edges to semantic memory.
  5. Add episodic vertex `v_e^t = o_t` and connect it to all `E_s^t`.

- **Read path** (per query or per decision step):
  - **Semantic search**: dense retrieval over semantic triplets + recursive KG expansion from incident vertices (depth/width knobs).
  - **Episodic search**: use episodic links from the semantic hits to rank and return top-`k` past observations.
    - Relevance uses a fraction of matched triplets with a log scaling to weight richer observations; single-triplet observations get downweighted to avoid “trivial echo”.

- **Maintenance**:
  - Primarily “outdated knowledge” deletion during ingestion; no explicit long-horizon consolidation beyond that is central.

## Evaluation (as reported)

- **Interactive environments**: TextWorld-style partially observable text games (navigation/object manipulation) and NetHack (roguelike).
  - The key claim is that AriGraph-enabled agent remains strong even when observations are restricted to the current room/corridor (needs memory for global state).
- **Multi-hop QA**: 200 sampled instances from MuSiQue and HotpotQA, compared to GraphReader, ReadAgent, HOLMES, GraphRAG, and RAG baselines.

Reported multi-hop QA numbers (from their table):
- **MuSiQue**: AriGraph(GPT-4) EM/F1 = 45.0 / 57.0
- **HotpotQA**: AriGraph(GPT-4) EM/F1 = 68.0 / 74.7

## Implementation details worth stealing

- The core data model: **episodes as non-lossy observation nodes** + derived semantics; episodic↔semantic linking makes provenance and recall much easier.
- Retrieval split: **semantic hits → episodic backpointers** is a clean pattern for “find relevant events” after “find relevant facts”.
- Action-space extension: “go to location” navigation built from spatial relations in the semantic graph (useful for tool-like planners).

## Open questions / risks / missing details

- **Correction semantics**: deleting “outdated” edges loses history; for real assistants we often need “invalidate/supersede” with an audit trail.
- **Extraction quality**: hallucinated triplets or wrong “outdated” deletions can permanently corrupt the world model.
- **Security**: no explicit poisoning model (write-time injection into observations); high relevance for production agents.
- **Cost**: per-step LLM extraction and update can be expensive; the paper focuses on effectiveness more than throughput.

## Notes

- Paper version reviewed: arXiv v3 (2025-05-15).
