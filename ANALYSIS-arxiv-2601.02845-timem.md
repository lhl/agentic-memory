---
title: "Analysis — TiMem (Li et al., 2026)"
date: 2026-02-22
type: analysis
paper_id: "arxiv:2601.02845"
paper_title: "TiMem: Temporal-Hierarchical Memory Consolidation for Long-Horizon Conversational Agents"
source:
  - references/li-timem.md
  - references/papers/arxiv-2601.02845.pdf
related:
  - ANALYSIS-academic-industry.md
  - /home/lhl/github/shisa-ai/shisad/docs/PLAN-longterm-memory.md
---

# Analysis — TiMem (Li et al., 2026)

TiMem is a “consolidation-first” memory framework: it assumes that long-horizon personalization fails not because retrieval is impossible, but because memories remain **fragmented** and not organized across time scales. The core abstraction is a **Temporal Memory Tree (TMT)** that consolidates from fine-grained segment memories into higher-order daily/weekly/profile representations, paired with a query-aware recall planner and gating.

## TL;DR

- **Problem**: Long dialogue histories exceed context windows; existing memory systems struggle to represent temporally structured, hierarchical persona information, leading to unstable long-horizon personalization.
- **Core idea**: Store and consolidate memory in a temporal hierarchy (TMT) and retrieve adaptively based on query complexity.
- **Memory types covered**:
  - fine-grained episodic/factual memories at low levels,
  - progressively abstracted behavioral patterns and persona/profile at high levels.
- **Key primitives / operations**:
  - temporal containment hierarchy with explicit time intervals,
  - level-specific consolidation prompts (summarize/merge patterns),
  - recall planner (simple/hybrid/complex),
  - recall gating to fit token budgets.
- **Write path**: dialog stream → segment summaries → session/daily/weekly consolidation → incremental profile.
- **Read path**: planner chooses levels → hierarchical recall → gating → prompt injection.
- **Evaluation (as reported)**: best overall LLM-judge accuracy on LoCoMo (75.30%) and LongMemEval‑S (76.88%/78.96%), with strong accuracy–token tradeoffs.
- **Main caveats**: higher-level consolidation can propagate errors; correction/versioning semantics across levels are under-specified; heavily prompt-dependent.
- **Most reusable takeaway for shisad**: implement explicit temporal consolidation tiers (session/day/week/profile) with provenance links and a query-aware retrieval planner; add versioned correction semantics so higher-level persona doesn’t silently overwrite history.

## Stage 1 — Descriptive (what the paper proposes)

### 1.1 Temporal Memory Tree (TMT)

TMT `T=(M,E,τ,σ)`:
- nodes `m` live at levels `ℓ(m) ∈ {1..L}` from fine-grained to abstract,
- each node has a time interval `τ(m)` and a semantic memory payload `σ(m)`,
- parent–child edges represent temporal containment and consolidation flow.

The paper emphasizes three structural properties:
- **Temporal containment**: parent interval covers child interval.
- **Progressive consolidation**: higher levels contain fewer memories (`|M_i| ≤ |M_{i-1}|`).
- **Semantic consolidation**: level-specific prompts `I_i` define how children summaries merge into a parent summary.

Concrete default configuration:
- L1 segments: factual summarization of dialog details
- L2 sessions: non-redundant event summaries
- L3 daily: routine contexts + recurrent interests
- L4 weekly: evolving behavioral features + preference patterns
- L5 profile: incrementally refined persona (stable preferences/values)

### 1.2 Consolidation mechanism

TiMem uses prompting (no fine-tuning) to consolidate:
- lower-level items preserve concrete details,
- higher-level items store more abstract patterns and persona features.

Builder note: this is effectively a derived-memory pipeline; correctness depends on consolidation prompts and on maintaining provenance links to underlying evidence.

### 1.3 Recall pipeline: planner + hierarchical recall + gating

At query time:
- a **recall planner** classifies query complexity (simple/hybrid/complex) and selects recall scope.
- hierarchical recall collects candidates from chosen levels.
- a **recall gating** module filters candidates to a compact set (token budget control).

Retained memories are ranked by:
- hierarchy level and temporal proximity within level (recency-aware ordering).

## Stage 2 — Evaluative (what it measures, what’s missing, what breaks)

### 2.1 Evaluation setup (as reported)

- Benchmarks: LoCoMo (1,540 Q) and LongMemEval‑S (500 Q).
- Metrics:
  - LoCoMo: LLM-as-a-judge (LLJ) accuracy per category + overall, plus F1 and ROUGE-L.
  - LongMemEval‑S: LLJ accuracy per task type + overall (two answer model settings).
- Baselines: MemoryBank, A‑MEM, Mem0, MemoryOS, MemOS.

### 2.2 Main results (as reported)

LoCoMo (Table 1):
- TiMem overall LLJ: **75.30% ± 0.16%** (best), vs MemOS 69.24% ± 0.11%.
- Per-category LLJ: TiMem is best on single-hop, temporal, open-domain, and multi-hop (as reported).

LongMemEval‑S (Table 2):
- With GPT‑4o‑mini answer model: TiMem overall **76.88% ± 0.30%** (best), vs MemOS 68.68% ± 0.16%.
- With GPT‑4o answer model: TiMem overall **78.96% ± 0.26%** (best), vs MemOS 73.07% ± 0.25%.

Budget/efficiency highlights (as reported in text/ablations):
- Adaptive planner reaches LoCoMo accuracy with ~511 recalled tokens and LongMemEval‑S with ~1271 tokens.

### 2.3 Strengths

- Consolidation hierarchy is explicit and aligns with how many real assistants want to operate (daily/weekly persona).
- Planner + gating makes “how much to retrieve” explicit, improving the accuracy–token tradeoff.
- Strong improvements on both LoCoMo and LongMemEval‑S suggest generality beyond one benchmark.

### 2.4 Limitations / open questions (builder lens)

- **Error propagation**: wrong higher-level summaries can dominate retrieval and be hard to correct.
- **Correction semantics**: the paper doesn’t fully specify how contradictions flow across levels (e.g., profile updates vs keeping prior states).
- **Security**: procedural/persona layers are susceptible to instruction-like poisoning unless guarded.
- **Evaluation realism**: LLM-as-a-judge is used; judge choice can influence margins.

## Stage 3 — Dialectical / Synthesis hooks (how this fits + what we steal)

### 3.1 Comparison to adjacent work

- Compared to ENGRAM: both emphasize representation/budgeting, but TiMem adds **temporal hierarchy** and an explicit consolidation schedule.
- Compared to EverMemOS: both do consolidation; EverMemOS uses MemCells/MemScenes + sufficiency checks, while TiMem uses a fixed temporal hierarchy and planner-based scope selection.

### 3.2 Mapping to shisad (`PLAN-longterm-memory.md`)

Suggested shisad v0.7 adoption:
- Add explicit temporal consolidation tiers (session/day/week/profile) as derived artifacts with provenance pointers to underlying episodes.
- Add query-aware retrieval planning and gating:
  - decide “which tiers” to consult,
  - separate `k_retrieve` from `k_keep` and track token budgets.
- Add correction/versioning primitives so profile updates don’t erase history:
  - represent “preference changed” as a dated state transition (supersedes chain) rather than overwrite.

### 3.3 Concrete takeaways (actionable)

**Primitives to add**
- `TemporalAggregate` objects (daily/weekly/profile) with `sources[]` and `validity` metadata.
- `RecallPlan` objects (complexity class, selected tiers, budgets) for observability.

**Tests / eval adapters to add**
- LongMemEval “knowledge update” + “multi-session” tests as consolidation regression harnesses.
- A “profile drift” test: repeated preference flips across weeks; ensure profile reflects the latest while preserving history.

## Notes / Corrections & Updates

- Capture date: 2026-02-22
- Paper version reviewed: arXiv v1 (2026-01-06)

