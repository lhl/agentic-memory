---
title: "Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory"
author: "Prateek Chhikara et al."
date: 2026-02-22
type: reference
tags:
  - paper
  - system
  - long-term-memory
  - conversational-memory
  - memory-operations
  - graph-memory
  - latency
  - token-efficiency
  - locomo
source: https://arxiv.org/abs/2504.19413
source_alt: https://arxiv.org/pdf/2504.19413.pdf
version: "arXiv v1 (2025-04-28)"
related:
  - ../ANALYSIS-arxiv-2504.19413-mem0.md
files:
  - ./papers/arxiv-2504.19413.pdf
  - ./papers/arxiv-2504.19413.md
---

# Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory

## TL;DR

- Proposes **Mem0**, a pragmatic long-term memory pipeline for agents that: **extracts** salient memories from new turns, then **updates** a long-term store via explicit ops (**ADD / UPDATE / DELETE / NOOP**).
- Adds a graph variant (**Mem0g**) that stores memory as a **directed labeled entity–relation graph** (Neo4j), with conflict resolution that can **invalidate** edges for temporal reasoning.
- Evaluates on **LoCoMo** (10 very long, multi-session conversations; single-hop / multi-hop / temporal / open-domain QA).
- Reports strong quality + deployability tradeoffs: compared to full-context, **Mem0** has much lower tail latency and much lower context-token usage (as reported).
- Main builder caveat: base Mem0’s **DELETE** is a hard delete (history loss); security/poisoning isn’t a first-class concern.

## What’s novel / different

- Treats “memory” as an **incremental production pipeline** operating per message-pair, not a one-shot transcript embedding.
- Uses the LLM itself (via **function calling / tool call**) to choose memory ops against semantically similar existing memories.
- Makes deployment constraints explicit by reporting **token consumption** and **p50/p95 latency** alongside accuracy.
- Graph variant explicitly models **relations** and introduces a (soft) invalidation mechanism to support time-sensitive queries.

## System / method overview (mechanism-first)

### Memory types and primitives

- **Mem0 (dense/natural-language memory)**:
  - Memory unit: extracted “fact-like” natural language snippets, stored with embeddings + metadata.
  - Ops: `ADD`, `UPDATE`, `DELETE`, `NOOP`.
- **Mem0g (graph memory)**:
  - Memory unit: entity nodes + relation triplets `(v_s, r, v_d)` with timestamps and embeddings.
  - Ops: create/merge nodes + edges; **invalidate** obsolete relations (rather than always deleting).

### Write path / Read path / Maintenance

- **Write path**:
  - Input: new message pair `(m_{t-1}, m_t)` plus context.
  - Context: (a) conversation summary `S` refreshed asynchronously + (b) a recency window of messages (reported config: `m=10`).
  - Extract: LLM extracts candidate memories `Ω`.
  - Update: for each candidate, retrieve top-`s` similar existing memories (reported config: `s=10`) and have the LLM choose an op (tool call) to maintain a coherent store.
- **Read path**:
  - Retrieve memories relevant to a question and answer using a prompt that emphasizes timestamps and resolving contradictions by recency (Appendix prompt templates).
  - Mem0g adds graph retrieval: entity-centric subgraph expansion + semantic matching over triplets.
- **Maintenance**:
  - Primarily via update-time dedup/merge/delete; Mem0g adds invalidation for temporal consistency.
  - No explicit decay/TTL policy is a main missing piece (builder lens).

## Evaluation (as reported)

- **Dataset**: LoCoMo QA benchmark (adversarial category excluded due to missing ground truth in their setup).
- **Metrics**:
  - F1, BLEU-1
  - LLM-as-a-judge `J` (binary CORRECT/WRONG rubric; 10 runs, mean ± stdev).
  - Deployment metrics: **token consumption** (retrieved context size) + **search/total latency** (p50/p95).
- **Baselines**: LoCoMo/ReadAgent/MemoryBank/MemGPT/A-Mem, LangMem, RAG variants, full-context, OpenAI ChatGPT memory, Zep.
- **Key results**:
  - Overall quality: `J` ≈ 66.9% (Mem0) / 68.4% (Mem0g) vs 52.9% (OpenAI memory baseline) and 66.0% (Zep).
  - Tail latency: total p95 ≈ 1.44s (Mem0) / 2.59s (Mem0g) vs 17.12s (full-context).

## Implementation details worth stealing

- **Asynchronous conversation-summary refresh** feeding the extractor (cheap global context without blocking writes).
- Explicit **memory-op semantics** (ADD/UPDATE/DELETE/NOOP) as a stable interface between LLM reasoning and deterministic storage code.
- Measure and publish **p95 latency** + **retrieval token budget**; these become first-class knobs for production.
- Graph retrieval dual-mode: **entity-anchored expansion** + **triplet semantic match**.

## Open questions / risks / missing details

- **Hard deletion vs history**: base Mem0 deletes contradicted memories; many agent deployments need audit/history (and correction tracking).
- **Write-time poisoning**: no explicit threat model; LLM-controlled ops + extraction can be manipulated by adversarial content.
- **Replicability**: OpenAI “memory” and Zep baselines are hard to reproduce exactly; comparisons depend on vendor configurations.
- **Scaling + multi-tenant**: paper focuses on single-conversation evaluation; tenant isolation, access control, and policy gating are not central.

## Notes

- Paper version reviewed: arXiv v1 (2025-04-28).
- Code availability: paper points to `https://mem0.ai/research` (not validated here).
