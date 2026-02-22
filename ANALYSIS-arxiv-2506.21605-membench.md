---
title: "Analysis — MemBench (Tan et al., 2025)"
date: 2026-02-22
type: analysis
paper_id: "arxiv:2506.21605"
paper_title: "MemBench: Towards More Comprehensive Evaluation on the Memory of LLM-based Agents"
source:
  - references/tan-membench.md
  - references/papers/arxiv-2506.21605.pdf
related:
  - ANALYSIS-academic-industry.md
  - /home/lhl/github/shisa-ai/shisad/docs/PLAN-longterm-memory.md
---

# Analysis — MemBench (Tan et al., 2025)

MemBench is an evaluation paper. Its biggest contribution is not a new memory architecture, but a benchmark framing that tries to avoid two common blind spots: (1) evaluation that only covers “agent participates in chat” (ignoring observer-mode memory), and (2) evaluation that only covers factual recall (ignoring reflective consolidation of preferences). For shisad, MemBench is primarily valuable as an **evaluation adapter** and as a reminder that memory needs to be scored on **latency/cost** and **capacity cliffs**, not only QA accuracy.

## TL;DR

- **Problem**: Existing memory benchmarks/datasets often lack scenario diversity and only partially measure memory quality; metrics are frequently under-specified.
- **Core idea**: Build a dataset + benchmark that spans:
  - **scenarios**: participation vs observation, and
  - **levels**: factual vs reflective memory.
- **Evaluation method**: simulate time flow: at round `t` the agent sees current input; earlier content must be recalled through memory (closer to real agent operation).
- **Metrics**: accuracy (multiple-choice), retrieval recall@10 (for retrieval methods), memory capacity (accuracy vs memory tokens), and temporal efficiency (read/write time per op).
- **Main results (as reported)**: retrieval-based memory stays strong at ~100k-token histories where full-history and “recent window” baselines degrade; some memory mechanisms are prohibitively slow in RT/WT.

## Stage 1 — Descriptive (what the paper proposes)

### 1.1 Two axes of dataset coverage

**Scenario axis**:
- Participation scenario: agent interacts; must remember user messages and its own prior responses.
- Observation scenario: agent is a passive observer; must store/recall user messages only.

**Memory-level axis**:
- Factual memory: concrete attributes and events (including temporal normalization and updates over time).
- Reflective memory: higher-level preference inference (aggregate low-level evidence into high-level tastes) and assistant recommendation tracking.

### 1.2 Question/task types

The paper includes question families that imply different memory operations:
- single-hop vs multi-hop,
- comparative and aggregative reasoning,
- knowledge updates / corrections,
- post-processing (e.g., combining attributes like email + hobby),
- assistant-related recall (“what did you recommend?”),
- high-level preference inference (“what flavor do I prefer?”).

### 1.3 Evaluation protocol (why it matters)

They explicitly model time:
- At time `t`, the agent is given only the current round input.
- Earlier rounds are *not* in the prompt unless the memory system retrieves/compiles them.

This aligns with the “write then later read” reality of production memory systems; it’s closer to LongMemEval’s interactive framing than to offline long-context reading.

### 1.4 Metrics (what is measured)

- **Accuracy**: multiple-choice to avoid free-form grading ambiguity.
- **Recall@10**: measures whether retrieval methods bring back key evidence dialogues.
- **Capacity**: observe sharp accuracy drop (“cliff”) as memory-token volume grows.
- **Temporal efficiency**: read time (RT) and write time (WT) per operation in seconds.

## Stage 2 — Evaluative (what it measures, what’s missing, what breaks)

### 2.1 Main results (as reported)

Factual memory (selected highlights from their table using Qwen2.5-7B as the base model):

| Method | PS Accuracy (10k) | PS Accuracy (100k) | OS Accuracy (1k) | OS Accuracy (100k) | RT / WT (PS) |
|---|---:|---:|---:|---:|---:|
| FullMemory | 0.647 | 0.489 | 0.786 | 0.631 | 0.001 / <0.001 |
| RecentMemory | 0.639 | 0.422 | 0.800 | 0.512 | 0.001 / <0.001 |
| RetrievalMemory | 0.692 | 0.833 | 0.883 | 0.933 | 0.041 / 0.058 |
| MemGPT | 0.455 | 0.411 | 0.789 | 0.488 | 4.549 / 0.106 |

Reflective memory (selected highlights):
- RetrievalMemory stays high at 100k where several other mechanisms degrade sharply (as reported).

Base model sensitivity:
- GPT-4o-mini tends to perform best under the same memory mechanisms (as reported), and latency profiles vary substantially by base model.

### 2.2 Strengths

- Adds two high-value axes that map to real systems:
  - observer-mode memory (OS),
  - reflective preference consolidation (RM).
- Reports latency for read/write operations, which prevents “paper-only” memory designs.
- Time-aware evaluation reduces “just stuff everything into prompt” gaming.

### 2.3 Limitations / open questions

- **Multiple-choice** can under-measure partial correctness and over-measure brittle template matching; for agents, we also care about grounded free-form outputs and abstention.
- **Recall@10** is only defined for retrieval-based methods; other designs may need different diagnostic metrics (e.g., evidence coverage in compiled prompts).
- Reflective memory is mostly preference aggregation; other reflective/procedural memories (lessons, strategies) are not central.
- Security is out of scope; MemBench should be paired with poisoning/injection evaluations (e.g., MINJA-style) for production readiness.

## Stage 3 — Synthesis hooks (how this fits + what we steal)

### 3.1 How MemBench changes “what to measure”

For shisad, MemBench implies we should treat memory evaluation as multi-dimensional:
- accuracy/utility (task success),
- retrieval correctness (evidence recall),
- capacity cliffs,
- latency per write/read path stage,
- plus additional dimensions from other papers (updates, abstention, temporal reasoning, poisoning robustness).

### 3.2 Mapping to shisad (`PLAN-longterm-memory.md`)

Concrete additions to consider:
- Add MemBench adapters as part of the v0.7 memory overhaul evaluation suite.
- Explicitly test observation-mode memory:
  - “record channel logs, later answer questions” differs from “chat with user”.
- Treat reflective memory questions as a proxy for constraint/preference consolidation:
  - pair with LoCoMo-Plus for constraint-consistency evaluation.
- Track RT/WT and p95 for memory operations (write pipeline and retrieval pipeline).

### 3.3 What MemBench doesn’t solve for shisad

- Versioned correction semantics (supersedes/invalidate) are only lightly implied by “knowledge update”.
- Multi-tenant isolation and poisoning defenses are not addressed; must be added separately.

## Notes / Corrections & Updates

- Capture date: 2026-02-22.
- Paper version reviewed: arXiv v1 (2025-06-20).
