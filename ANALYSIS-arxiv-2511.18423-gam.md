---
title: "Analysis — GAM (Yan et al., 2025)"
date: 2026-02-22
type: analysis
paper_id: "arxiv:2511.18423"
paper_title: "General Agentic Memory Via Deep Research"
source:
  - references/yan-gam.md
  - references/papers/arxiv-2511.18423.pdf
related:
  - ANALYSIS-academic-industry.md
  - shisad internal long-term memory plan (private)
---

# Analysis — GAM (Yan et al., 2025)

GAM is one of the clearest “architecture papers” in this set because it reframes memory as **just‑in‑time (JIT) context compilation**:

- store *lossless evidence* (a universal page-store of full sessions),
- store a *lightweight index* (structured memos),
- and at request time run a “deep research” agent over the page-store to assemble an optimized context.

This directly targets the standard AOT failure mode: once you compress history into a few summaries, you’ve already lost the fine-grained evidence you’ll later need.

## TL;DR

- **Problem**: Ahead‑of‑time memory compression loses information and can’t satisfy fine-grained future queries.
- **Core idea**: JIT memory compilation via a duo design:
  - **Memorizer**: incrementally produces memos while storing full pages,
  - **Researcher**: plans, searches, integrates, and reflects over the page-store to answer online requests.
- **Key primitives / operations**:
  - memo generation per session,
  - page creation with a header to preserve semantics for retrieval,
  - multi-tool search (embedding/BM25/ID exploration),
  - iterative reflection to expand search if needed,
  - integration result (optionally plus sources/snippets) as the produced context.
- **Evaluation (as reported)**: LoCoMo + HotpotQA (56K/224K/448K) + RULER (128K) + NarrativeQA; GAM outperforms memory-free and memory-based baselines.
- **Efficiency trade-off (as reported)**: high online serving cost due to deep research (e.g., 12–18s online serve in Table 5), but much higher answer quality on HotpotQA.
- **Most reusable takeaway for shisad**: treat raw episodic evidence storage as non-negotiable; use lightweight memos for indexing; make “deep research over your own history” an on-demand (not always-on) retrieval mode.

## Stage 1 — Descriptive (what the paper proposes)

### 1.1 Data model: sessions, memos, pages

History is a sequence of sessions `hist: s1 … sT`.

For each new session `s_i`, the **Memorizer** does:
1. **Memorize**: produce a memo `μ_i` (concise structured snapshot) conditioned on the new session and existing memory.
2. **Page**: produce a page `p_i = { header: h_i, content: s_i }` and append to the page-store.

The paper motivates headers as a way to preserve page semantics for later retrieval (analogous to landmark/contextual retrieval ideas).

### 1.2 Researcher: plan → search → integrate → reflect

Given a request `r`, the **Researcher**:
- **Plans** search actions based on existing memory + available tools.
- **Searches** the page-store using multiple tools (embedding search, BM25, ID-based exploration).
- **Integrates** retrieved pages with the current integration result.
- **Reflects**: decides whether information is sufficient; if not, generates a refined request and repeats.

This is “deep research”, but over your own page-store rather than the web.

### 1.3 Output formats

The system can return:
- just the integration result (default),
- integration + source pages,
- integration + extracted snippets from pages.

The paper suggests adding sources can reduce loss of fine-grained details that integration might omit (Table 4 discussion).

## Stage 2 — Evaluative (what it measures, what’s missing, what breaks)

### 2.1 Main results (as reported)

LoCoMo (Table 1a; GPT‑4o‑mini):

| Method | SingleHop F1 | MultiHop F1 | Temporal F1 | OpenDom F1 |
|---|---:|---:|---:|---:|
| Mem0 | 47.65 | 38.72 | 48.93 | 28.64 |
| **GAM** | **57.75** | **42.29** | **59.45** | **33.30** |

HotpotQA (Table 1b; GPT‑4o‑mini):

| Method | 56K F1 | 224K F1 | 448K F1 |
|---|---:|---:|---:|
| Long‑LLM | 56.56 | 54.29 | 53.92 |
| RAG | 52.71 | 51.84 | 54.01 |
| Mem0 | 32.58 | 31.74 | 27.41 |
| **GAM** | **63.22** | **64.56** | **59.81** |

### 2.2 Efficiency trade-offs (as reported)

Table 5 (HotpotQA) reports offline build + online serve time and answer quality. Example (Qwen2.5‑14B; HotpotQA 56K):

- Mem0: offline 37.42s, online 0.15s, F1 30.12
- LightMem: offline 4.93s, online 0.20s, F1 37.30
- **GAM**: offline 56.89s, online 12.43s, F1 64.07

Interpretation: GAM’s performance comes with a substantial **online latency** cost because it is running an iterative research agent at query time.

### 2.3 Strengths

- Clean separation between:
  - lossless evidence store (pages),
  - lightweight index (memos),
  - runtime synthesis (researcher).
- Demonstrates that even long-context LLMs can underperform due to “context rot”/dilution, while targeted retrieval + integration can win.
- Provides ablations on tools and output formats, making it easier to reason about what drives gains.

### 2.4 Limitations / open questions (builder lens)

- **Latency**: 10–20s online serving is not acceptable for many product loops unless you gate it (only run deep research when needed).
- **Determinism and audit**: the researcher’s planning/integration/reflection is inherently stochastic and can be hard to reproduce; needs logging.
- **Security / scope**: a universal page-store is a data lake; without strict scoping and tainting, retrieval can leak cross-tenant or surface poisoned content.
- **Versioning/corrections**: the approach focuses on retrieval/synthesis; how corrections propagate into memos/pages is not the core topic.

## Stage 3 — Synthesis hooks (how this fits + what we steal)

### 3.1 Relation to other memory systems

- Compared to Mem0/A‑Mem style “store compact memories”, GAM is explicitly **evidence-first**: keep full pages, compress only for indexing.
- Compared to SimpleMem, GAM shifts work to runtime deep research rather than relying primarily on write-time compression/consolidation.

### 3.2 Mapping to shisad (`PLAN-longterm-memory.md`)

Suggested shisad v0.7 implications:

1. **Raw episodic evidence store**
   - keep an append-only page/episode store as source of truth; derived memories point back to it.
2. **Lightweight memo index**
   - store memos as a searchable, cheap index (summary + keys + links), not as the only memory.
3. **On-demand deep research mode**
   - implement a “researcher” retrieval mode that can iterate planning/search/reflection when simple retrieval fails.
4. **Provenance-first compilation**
   - when producing “optimized context”, include citations/pointers to pages/snippets for debuggability.
5. **Latency gates**
   - default to cheap retrieval; run deep research only when a verifier says “insufficient”.

### 3.3 Concrete takeaways (actionable)

**Primitives to add**
- `Page` (raw session) + `PageHeader` (semantic anchor)
- `Memo` (lightweight structured snapshot)
- `ResearchPlan` + `IntegrationResult` objects with logs

**Tests / eval adapters to add**
- “Context rot” regressions: long-context baseline vs targeted retrieval.
- Latency/quality tradeoff harness: gate deep research based on insufficiency signals.

## Notes / Corrections & Updates

- Capture date: 2026-02-22
- Paper version reviewed: arXiv v1 (2025-11-23)

