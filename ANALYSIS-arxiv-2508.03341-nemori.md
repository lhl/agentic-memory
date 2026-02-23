---
title: "Analysis — Nemori (Nan et al., 2025)"
date: 2026-02-23
type: analysis
paper_id: "arxiv:2508.03341"
paper_title: "Nemori: Self-Organizing Agent Memory Inspired by Cognitive Science"
source:
  - references/nan-nemori.md
  - references/papers/arxiv-2508.03341.pdf
related:
  - ANALYSIS-academic-industry.md
  - /home/lhl/github/shisa-ai/shisad/docs/PLAN-longterm-memory.md
---

# Analysis — Nemori (Nan et al., 2025)

Nemori is a “cognitive science inspired” long-term memory architecture for LLM agents that attacks two recurring production problems:

1. **Memory granularity**: fixed-size chunking (or naive turn-pair chunking) breaks semantic integrity and yields brittle retrieval.
2. **Passive extraction**: “extract facts every turn” produces noisy, redundant stores that degrade retrieval over time.

Its answer is a dual-store design (episodic + semantic) with (a) an LLM boundary detector + narrative episode generator and (b) a **Predict-Calibrate** loop that updates semantic memory by extracting only what the system failed to predict from its existing KB.

## TL;DR

- **Core idea**: a dual-store memory system where:
  - episodic memory is generated via boundary detection + third-person narrative episodes, and
  - semantic memory is updated via predict-calibrate (prediction gaps → new knowledge).
- **Write path**:
  1. buffer messages,
  2. detect semantic boundary (`is_boundary` + `confidence`),
  3. generate episode `(title, narrative)`,
  4. retrieve relevant semantic KB entries,
  5. predict episode content,
  6. distill missed facts from the raw segmented conversation,
  7. integrate into semantic KB.
- **Read path**: unified dense retrieval over episodic + semantic stores (paper retrieves top-`k` episodes and top-`2k` semantic entries).
- **Reported results**:
  - LoCoMo (gpt-4o-mini): overall LLM-judge **0.744** vs FullContext **0.723**, Mem0 **0.613**, Zep **0.585**, with **~88% fewer tokens** than FullContext.
  - LongMemEvalS: average accuracy improves with **95–96% less context** than FullContext (as reported).
- **Builder relevance**: predict-calibrate is a concrete “commit-time gate” that can reduce redundant memory writes, but it needs explicit provenance + correction semantics + security gating to be safe in production.

## Stage 1 — Descriptive (what the paper proposes)

### 1.1 Dual stores

Nemori maintains:
- **Episodic memory**: generated episodes `e=(ξ, ζ)` where `ξ` is a title and `ζ` is a detailed third-person narrative.
- **Semantic memory**: distilled knowledge statements `K` (the paper focuses on distillation mechanics more than on rich typing/correction semantics).

### 1.2 Two-Step Alignment (segmentation + narrative)

**Boundary alignment**:
- Messages accumulate in a per-user buffer `B_u` with items `m_i=(role, content, timestamp)`.
- On each new message `m_{t+1}`, an LLM-based boundary detector outputs `(b_boundary, c_boundary)`.
- Segmentation triggers if:
  - `(b_boundary ∧ c_boundary > σ_boundary)` or
  - buffer length `|M| ≥ β_max`.

**Representation alignment**:
- Given a segmented conversation block `M`, an LLM episode generator outputs:
  - `ξ`: episode title
  - `ζ`: third-person narrative
- The episodic record is stored; the title (and episode) drives downstream semantic distillation.

### 1.3 Predict-Calibrate (semantic KB evolution by prediction gap)

Nemori’s semantic memory generation is a 3-stage cycle:

1. **Prediction**:
   - Retrieve relevant semantic statements `K_relevant` by embedding `(ξ ⊕ ζ)` and searching `K`.
   - Predict episode content `ê = h(ξ, K_relevant)` (LLM predictor).
2. **Calibration**:
   - Compare the prediction `ê` against the **raw segmented conversation** `M` (not the narrative `ζ`).
   - Distill the “prediction gap” into new statements: `K_new = r(ê, M)`.
3. **Integration**:
   - Integrate `K_new` into `K`.

This is a plausible mechanism for “extract less over time”: as `K` improves, more of an episode is predictable, leaving fewer gaps to store.

### 1.4 Retrieval setup (as reported)

Main experiment settings (paper “reproducibility” section):
- Embeddings: `text-embedding-3-small`.
- Boundary confidence threshold: `σ_boundary = 0.7`.
- Max buffer size: `β_max = 25`.
- Similarity threshold: `σ_s = 0.0`.
- Retrieval ratio: retrieve top-`k` episodic items and top-`m=2k` semantic items; main experiments use `k=10`.
- Only top-2 episodic memories include their original conversation text (the rest rely on episode narrative).

## Stage 2 — Evaluative (what it measures, what’s missing, what breaks)

### 2.1 Evaluation design (as reported)

- Datasets:
  - **LoCoMo**: 10 dialogues, ~24K tokens average, 1,540 questions across four categories.
  - **LongMemEvalS**: 500 conversations, ~105K tokens average.
- Baselines:
  - FullContext, RAG-4096, LangMem, Mem0, Zep.
- Note on fairness: Mem0 and Zep use their commercial retrieval APIs to obtain contexts, which are then fed to the same answer models used elsewhere.

### 2.2 Main results (as reported)

**LoCoMo (LLM-judge overall):**
- gpt-4o-mini: Nemori **0.744** vs FullContext **0.723**, Mem0 **0.613**, Zep **0.585**.
- gpt-4.1-mini: Nemori **0.794** vs FullContext **0.806** (Nemori is better on temporal reasoning but does not beat FullContext overall in this setting).

**Efficiency (LoCoMo, gpt-4o-mini):**
- Tokens: Nemori **2,745** vs FullContext **23,653**.
- Total latency: Nemori **3,053 ms** vs FullContext **5,806 ms**.

**LongMemEvalS (average accuracy):**
- gpt-4o-mini: Nemori **64.2%** vs FullContext **55.0%**.
- gpt-4.1-mini: Nemori **74.6%** vs FullContext **65.6%**.
- Nemori uses ~3.7–4.8K tokens vs ~101K tokens for FullContext (paper note).

### 2.3 Strengths

- **Commit-time gating via prediction error** is a coherent answer to “memory bloat from redundant extraction”.
- **Episode segmentation** targets a real retrieval failure mode: coherence breakage from arbitrary chunks.
- **Temporal reasoning gains** are plausible given the “pre-reasoned semantic facts” framing and episodic chronology.

### 2.4 Limitations / open questions (builder lens)

- **LLM-in-the-write-path**: boundary detection + narrative generation + distillation are all model calls; production systems need batching, budgets, and failure handling.
- **Truth maintenance is under-specified**: the paper’s semantic KB evolution doesn’t foreground explicit invalidation/versioning semantics.
- **Security posture is incomplete**: there’s no explicit memory poisoning threat model or write gating/quarantine design.
- **Typed memory objects**: semantic memory is treated as “statements”; richer schemas (typed attributes/constraints/ledgers) aren’t the focus.

## Stage 3 — Prescriptive (how to use this for shisad)

- **Steal the predict-calibrate gate**, but pair it with:
  - evidence-first storage (append-only episodes/pages as canonical),
  - explicit provenance links from semantic items → episodes,
  - history-preserving correction semantics (invalidate vs delete),
  - and security gates (no instruction injection; quarantine; tenant scoping).
- **Steal boundary detection**, but treat it as a heuristic producing a “candidate segmentation” that can be audited/merged/split later by maintenance jobs.
- **Measure stage-wise**: for Nemori-like systems, logging must separate segmentation quality, extraction quality, retrieval quality, and reading/compilation outcomes.
