---
title: "StructMem: Structured Memory for Long-Horizon Behavior in LLMs"
author: "Buqiang Xu et al. (Zhejiang University + Ant Group)"
date: 2026-04-25
type: reference
tags:
  - paper
  - agent-memory
  - long-term-memory
  - locomo
  - temporal-reasoning
  - multi-hop
  - embedding-only
source: "https://arxiv.org/abs/2604.21748"
source_alt: "https://arxiv.org/pdf/2604.21748"
version: "arXiv v1, ACL 2026 main conference (accepted)"
context: "ACL 2026 memory system; temporally-anchored dual-perspective entries as a graph-free alternative to KG construction; strong LoCoMo numbers at very low build-token cost"
related:
  - "../ANALYSIS-arxiv-2604.21748-structmem.md"
  - "../ANALYSIS-academic-industry.md"
  - "../ANALYSIS-arxiv-2501.13956-zep.md"
  - "../ANALYSIS-arxiv-2502.12110-a-mem.md"
  - "../ANALYSIS-arxiv-2508.03341-nemori.md"
  - "../ANALYSIS-karta.md"
---

# StructMem — Structured Memory for Long-Horizon Behavior in LLMs

## TL;DR

- **What it is**: Hierarchical memory for conversational agents that avoids building a full knowledge graph. Each utterance produces paired **factual** and **relational** entries, both tagged with the same timestamp `τᵢ`; cross-event structure is induced later by consolidation rather than eagerly by entity linking.
- **What it adds**: A "temporally-anchored dual-perspective" entry design that lets retrieval reconstruct whole events by grouping on shared `τᵢ`, and a periodic **cross-event consolidation** pass that synthesizes relational hypotheses from semantically-similar seed events. No KG, no entity resolution.
- **Why it matters**: Posts **76.82 LoCoMo overall** (beats Zep 75.14, Mem0 66.88, A-Mem 64.16; best-in-table on temporal with 81.62) with **~18× fewer build tokens than Mem0g** (1.937M vs 35.825M) and **~5× faster total build time**. Accepted to ACL 2026 main conference.
- **Biggest caveat**: No conflict resolution, no versioning, no decay, no confidence — the authors flag this as a limitation. Single-benchmark evaluation (LoCoMo only). Build-only efficiency numbers; per-query inference costs are not reported.
- **Code**: `github.com/zjunlp/LightMem` (LightMem is the shared experimental framework; StructMem is the method implemented inside it).

## What's novel / different

- **Dual-perspective extraction with shared timestamp anchoring**: Every utterance goes through two separate LLM prompts — one produces factual entries (Φᵢ), the other produces relational entries (Ψᵢ about interpersonal dynamics, causal influences, temporal dependencies). Both kinds are stored as `⟨text, embedding, timestamp⟩` triples. Because they share `τᵢ`, the "event" of that utterance can be reconstructed later without an explicit event schema.
- **Cross-event consolidation via seeds, not graphs**: Instead of building edges between entries at write time, the system periodically (≥1h of accumulated buffer) sorts the buffered entries, concatenates their embeddings into an aggregate query, retrieves the top-K=15 semantically similar *historical* entries as **seeds**, reconstructs each seed's full event via timestamp matching, and asks an LLM to synthesize relational hypotheses across this combined context. The synthesis output `C_cons` is written back to memory (Equation 6) as a new entry class, forming a second retrieval circuit.
- **Dual-circuit retrieval at QA time**: Each query pulls 60 atomic entries (factual + relational) and 5 synthesis summaries; both are merged into the QA prompt.
- **Graph-free-by-design**: Flat vector store only (text-embedding-3-small). Authors argue entity resolution and symbolic graph traversal are the expensive/fragile parts of graph-based memory systems like Zep, so they replace them with periodic batch consolidation.

## System / method overview

### Memory types and primitives

- **Memory types stored**: factual entries (event content), relational entries (cross-event dynamics/causality/temporal dependencies), synthesis entries (from cross-event consolidation).
- **Operations**: extract (per utterance) → consolidate (periodic when buffer age ≥ 1h) → retrieve (dual-circuit at QA time). No update, delete, supersede, or confidence-update operations are described.
- **Data model**: `⟨x, e_x, τᵢ⟩` triple per entry (text, embedding, timestamp). No entities, no edges, no schema beyond timestamp grouping.

### Write path / Read path / Maintenance

- **Write path**:
  1. For each utterance, run two LLM prompts: factual extraction → Φᵢ, relational extraction → Ψᵢ.
  2. Embed each text piece with text-embedding-3-small.
  3. Store as `⟨x, e_x, τᵢ⟩` in the flat vector store, buffered for consolidation.
- **Consolidation (periodic, trigger = 1h buffered)**:
  1. Sort buffer temporally.
  2. Aggregate buffer texts → single concatenated query embedding.
  3. Cosine-rank all historical entries; pick top-K=15 as seeds.
  4. Reconstruct each seed's full event by grouping all entries with matching `τ`.
  5. LLM synthesizes relational hypotheses from `C_cross = C_buf ∪ ⋃ E_τ(seed)`, constrained to cite timestamps.
  6. Write the synthesis result back to memory as `C_cons`.
- **Read path**: At each query, pull 60 atomic entries + 5 synthesis entries (cosine similarity; no reported reranker); concatenate into QA prompt (prompt template in Figure 13).
- **Maintenance**: None beyond the periodic consolidation trigger. No decay, no dedup, no TTL, no versioning.

## Evaluation (as reported)

- **Benchmarks**: LoCoMo only (10 conversations, avg 588 turns / 16,618 tokens each).
- **Metrics**: LoCoMo overall + per-subtype (multi-hop, open-domain, single-hop, temporal). Judge models: gpt-4o-mini primary, with Qwen2.5-32B-Instruct and DeepSeek-V3.2 as cross-judges.
- **Models**: gpt-4o-mini for extraction/consolidation/QA; text-embedding-3-small for retrieval.
- **Baselines**: Zep, Memobase, Mem0, A-Mem, FullContext (+ Graph Memory and Flat Memory as paradigm baselines for ablation).

Key results (LoCoMo, judge = gpt-4o-mini):

| Method | Overall | Multi-hop | Open | Single | Temporal |
|---|---|---|---|---|---|
| **StructMem** | **76.82** | 68.77 | 46.88 | 81.09 | **81.62** |
| Zep | 75.14 | **74.11** | **66.04** | 79.79 | 67.71 |
| Memobase | 75.78 | 70.92 | 46.88 | 77.17 | **85.05** |
| Mem0 | 66.88 | 67.13 | 51.15 | 72.93 | 59.19 |
| A-Mem | 64.16 | 56.03 | 31.25 | 72.06 | 60.44 |
| FullContext | 73.83 | 68.79 | 56.25 | **86.56** | 50.16 |

Ablation (paradigm comparison):

| Method | Multi | Open | Single | Temporal |
|---|---|---|---|---|
| Flat Memory | 66.31 | 46.88 | 78.83 | 78.50 |
| Graph Memory | 66.67 | 48.96 | 80.50 | 76.64 |
| StructMem w/o Cross-Event | 66.31 | 46.88 | 80.86 | 79.44 |
| StructMem (full) | **68.77** | 46.88 | **81.09** | **81.62** |

Authors' note: flat retrieval F1 "peaks at 60 entries and plateaus thereafter" — the ceiling is reasoning, not coverage. K=0 (no cross-event seeds) matches Flat Memory, so most of StructMem's temporal gain is attributed to the cross-event consolidation step.

Build efficiency (vs KG-style baselines):

| Method | Total tokens (M) | API calls | Runtime (s) |
|---|---|---|---|
| **StructMem** | **1.937** | **1,056** | **22,854** |
| MemoryOS | 2.868 | 5,534 | 24,220 |
| LightRAG | 11.931 | 13,576 | 60,469 |
| A-Mem | 11.494 | 11,754 | 60,607 |
| Mem0g | 35.825 | 53,514 | 115,670 |

Per-query QA cost is not separately reported.

## Implementation details worth stealing

- **Storage/index choices**: flat vector store; entries stored as `⟨text, embedding, timestamp⟩` with no schema beyond those three fields. Simple and fast, which is why build-token cost drops an order of magnitude.
- **Event reconstruction via timestamp join**: gives "graph-like" event coherence at read time (group-by `τ`) without paying graph-construction cost at write time. Worth adopting regardless of whether we keep an explicit graph on the side.
- **Dual-perspective extraction**: paired factual + relational prompts is cheap (two calls per utterance), and the relational layer is what drives the temporal-reasoning lift.
- **Periodic batch consolidation over eager KG construction**: removes the need for entity resolution at write time. The price is that cross-event structure lags behind the buffer threshold (1h), not acceptable if the agent needs to reason across events within the same session but fine for asynchronous review.
- **Retrieval budget**: 60 atomic + 5 synthesis = 65 entries per query is the reference budget for the LoCoMo configuration. Useful ballpark when calibrating shisad's Recall surface.

## Open questions / risks / missing details

- **No correction/conflict/versioning mechanics**. The paper flags this explicitly: "the framework currently lacks an explicit mechanism for conflict resolution and memory updating." For an agent that must track evolving state, this is a production showstopper — exactly the class of problem shisad's §3.7.x confidence-update mechanics address.
- **Single-benchmark evaluation**. Only LoCoMo. No LongMemEval, EverMemBench, StructMemEval, or BEAM. LoCoMo is known to have saturation effects on strong models; whether StructMem's advantages transfer to multi-party or longer-scale settings (where EverMemBench operates) is untested.
- **Build-only efficiency claims**. The 18× token-cost advantage is build-side. Per-query inference cost isn't reported, and consolidation at 1h cadence may shift cost from build-time to background-time without actually reducing it.
- **Judge dependence**. gpt-4o-mini is the primary judge; cross-judge stability numbers aren't given for StructMem specifically in the snippets reviewed.
- **Top-K=15 seeds and 60 atomic entries** look tuned to LoCoMo's size (588-turn avg). How these scale to 10k-turn or multi-channel histories is unknown.
- **LLM-synthesized relational hypotheses stored back as memory**. These entries inherit whatever errors the synthesis step makes, and the paper has no trust band or provenance that distinguishes synthesis outputs from direct-observation entries. In shisad terms, a consolidation worker could produce `C_cons` with `source_origin=consolidation_derived`; this paper has no such label.

## Notes

- **Paper version reviewed**: arXiv v1, dated 2026-04-23. ACL 2026 main conference (accepted).
- **Code availability**: `github.com/zjunlp/LightMem`. Paper confirms "Graph Memory, Flat Memory, and StructMem prompts are all implemented in the LightMem framework" — LightMem is the shared experimental harness, StructMem the method.
- **Authors**: Buqiang Xu, Yijun Chen, Jizhan Fang, Ruobin Zhong, Yunzhi Yao, Yuqi Zhu, Lun Du, Shumin Deng — Zhejiang University + Ant Group; Zhejiang University–Ant Group Joint Laboratory of Knowledge Graph; `zjunlp` GitHub handle suggests ZJU NLP lab affiliation.
