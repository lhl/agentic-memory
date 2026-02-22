---
title: "Analysis — LoCoMo-Plus (Li et al., 2026)"
date: 2026-02-22
type: analysis
paper_id: "arxiv:2602.10715"
paper_title: "Locomo-Plus: Beyond-Factual Cognitive Memory Evaluation Framework for LLM Agents"
source:
  - references/li-locomoplus.md
  - references/papers/arxiv-2602.10715.pdf
related:
  - ANALYSIS-academic-industry.md
  - /home/lhl/github/shisa-ai/shisad/docs/PLAN-longterm-memory.md
---

# Analysis — LoCoMo-Plus (Li et al., 2026)

LoCoMo-Plus is best read as a corrective to “memory = recall the fact”: it targets **latent constraint retention** (state/goals/values/causal context) under conditions where later queries are **not semantically similar** to the original cue.

## Stage 1 — Descriptive (what the paper proposes)

### 1.1 The gap it targets

The paper argues that factual recall benchmarks miss cases where:
- the agent must behave consistently with implicit constraints (“I’m on a diet” → “late-night snack?”),
- cues and triggers are semantically disconnected,
- and correctness is not one gold string but a *set of behaviors* consistent with a constraint.

### 1.2 Problem framing: Level-1 vs Level-2 memory

- **Level-1 factual memory**: explicit facts/events with a well-defined ground-truth answer; evaluated via overlap metrics.
- **Level-2 cognitive memory**: implicit constraints inferred from prior interaction; induces a constraint `c` and a valid answer set:
  - `A_c = { a | a is consistent with c }`.

LoCoMo-Plus decomposes “cognitive memory” into four constraint components:
- causal, state, goal, value.

### 1.3 Dataset construction pipeline (cue → trigger → embed)

High-level pipeline:
1. Generate candidate cue dialogues.
2. Human verification: keep only **memory-worthy** cues (persistent, behaviorally constraining, non-trivial).
3. Construct trigger queries that require applying the cue while keeping low surface semantic similarity.
4. Filtering + a “memory elicitation” validation step to ensure the trigger genuinely requires the cue.
5. Embed validated cue–trigger pairs into long LoCoMo histories with a specified time gap.

### 1.4 Evaluation approach: constraint consistency + LLM judge

The paper argues overlap metrics have systematic biases (prompt bias, length/style bias) and proposes:
- a unified “conversational query” evaluation framing, and
- **LLM-as-a-judge** to decide whether the response is consistent with the induced constraint.

They report judge agreement with human annotators and stability across judge backbones.

## Stage 2 — Evaluative (what it measures, what’s missing, what breaks)

### 2.1 Why this matters for builders

If you build memory only as “retrieve relevant snippets”, you can pass many factual recall tests but still fail:
- user preference/state consistency,
- value-aligned behavior over time,
- “soft constraints” that should shape responses even when not explicitly queried.

LoCoMo-Plus is one of the first benchmarks here that forces this distinction.

### 2.2 Caveats / risks

- The benchmark is explicitly diagnostic and smaller-scale; it is not intended as a training dataset.
- Constraint-consistency judging introduces a new degree of freedom (judge choice + prompts), even if agreement/stability is tested.
- “Cognitive memory” is close to **procedural / policy-like** memory; systems that store it naively risk creating a durable instruction channel.

## Stage 3 — Dialectical / Synthesis hooks (how this fits + what we steal)

### 3.1 Implications for shisad (`PLAN-longterm-memory.md`)

LoCoMo-Plus suggests shisad should treat “memory” as multiple content classes with different governance:

- **Factual/semantic memory** (safe-ish data): preferences/facts with provenance + versioning.
- **Constraint-shaped memory** (riskier): goals/values/procedural heuristics that shape behavior.

Concrete implications:
1. Add first-class representation for **constraints** (or “preference context”) distinct from facts.
2. Keep constraint memory in a **separate tier/collection** with stricter write gating and tighter retrieval scoping than factual memory (avoid “memory learns policy” failure).
3. Add evaluation coverage for “latent constraint consistency” (LoCoMo-Plus) so we don’t optimize only for recall.

### 3.2 What to steal for our evaluation stack

- Treat “correctness” as a *set* for some memory tasks (multiple valid responses) rather than forcing one gold string.
- Add a judge reliability protocol (human agreement + cross-judge stability) for any judge-based metrics we rely on.
