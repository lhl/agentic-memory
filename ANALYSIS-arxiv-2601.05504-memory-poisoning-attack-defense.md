---
title: "Analysis — Memory Poisoning Attack & Defense (Sunil et al., 2026)"
date: 2026-02-22
type: analysis
paper_id: "arxiv:2601.05504"
paper_title: "Memory Poisoning Attack and Defense on Memory Based LLM-Agents"
source:
  - references/sunil-memory-poisoning-attack-defense.md
  - references/papers/arxiv-2601.05504.pdf
related:
  - ANALYSIS-academic-industry.md
  - ANALYSIS-arxiv-2503.03704-minja.md
  - shisad internal long-term memory plan (private)
---

# Analysis — Memory Poisoning Attack & Defense (Sunil et al., 2026)

This paper is a useful “reality check” on MINJA-style poisoning: it shows that attacks that look devastating in an empty-memory evaluation can weaken significantly once the memory bank contains many legitimate examples — but also that **retrieval policy** and **trust gating** can re-open the vulnerability. It also demonstrates a common trap: “trust scores” can become a confidence filter rather than a security filter.

## TL;DR

- **Problem**: Memory-augmented agents are vulnerable to query-only poisoning (MINJA); defenses are under-tested in realistic deployments.
- **Core idea**: Evaluate poisoning robustness and defenses in an EHR agent setting by varying:
  - initial memory (empty vs pre-populated legitimate memories),
  - number of indication prompts,
  - number of retrieved memories appended as context.
- **Key metrics**:
  - **ISR**: poison accepted into memory,
  - **ASR**: poison changes downstream behavior.
- **Main result** (as reported): pre-existing correct memories can drastically reduce ASR (e.g., GPT‑4o‑mini ASR 62% → 6.67% when relevant initial memory is present).
- **Defense proposals**:
  - input/output moderation with composite trust scoring + audit logs,
  - memory sanitization with trust-aware retrieval (temporal decay + pattern filters).
- **Main caveat**: trust-score defenses fail in both directions — either reject everything (no utility) or accept poisoned entries with high confidence (security collapse).
- **Most reusable takeaway for shisad**: implement first-class safety primitives for memory: write-time gates, taint/provenance, audit logs, retrieval-time filtering, and “verification-of-effect” checks that don’t rely on model confidence.

## Stage 1 — Descriptive (what the paper proposes)

### 1.1 Attack framing

The attack is MINJA-like: an attacker injects “Knowledge:” style directives into interactions and relies on the agent’s memory system to store them. Later, when the victim asks a benign query, retrieval pulls the poisoned memory as few-shot context, steering the agent to misbehave (e.g., redirect patient identifiers in EHR queries).

### 1.2 Key robustness dimensions

The paper tests:
- **Initial memory state**: empty vs a small set of pre-existing benign memories (including victim-ID examples).
- **Indication prompts count**: more injected “knowledge” attempts.
- **Retrieval count**: how many past memories get appended as context (3 vs 5 vs 10 in Table 2).

These dimensions map directly to product knobs (memory retention + retrieval budgets).

### 1.3 Defenses

**Defense 1: Input/Output moderation**
- Input: static heuristics/keywords + optional semantic classifier; can skip execution entirely.
- Output: code-safety checks (dangerous ops), relevance checks; composite trust score.
- Append only above a threshold; log decisions with reasons.

**Defense 2: Memory sanitization**
- Append-time trust score per entry `t ∈ [0,1]` using orthogonal checks (code patterns, label verification, sandbox execution).
- Retrieval-time filtering/ranking uses “effective trust” after **temporal decay**, plus pattern filters for known poisoning templates.

## Stage 2 — Evaluative (what it measures, what’s missing, what breaks)

### 2.1 Main robustness results (as reported)

Initial memory effect (Table 1):
- GPT‑4o‑mini:
  - empty memory: ASR 62%, ISR 100%
  - relevant initial memory: ASR 6.67%, ISR 26.67%
- Llama‑3.1‑8B:
  - empty memory: ASR 52.94%, ISR 100%
  - relevant initial memory: ASR 0%, ISR 99.95% (poison stored but not used)

Retrieval count effect (Table 2):
- Increasing retrieved memories increases ASR (e.g., GPT‑4o‑mini ASR 6% → 20% → 38% when retrieving 3 → 5 → 10 memories), showing that “more recall” can amplify poisoning.

### 2.2 Defense findings (as reported)

Trust-score behavior differs sharply across models:
- GPT‑4o‑mini run: sanitization can become **so conservative** it rejects all candidate entries (safe but useless).
- Gemini‑2.0‑Flash run: accepts 82 entries with trust=1.0; later analysis finds 54/82 were poisoned, meaning the defense becomes a “confidence filter” and fails to detect well-phrased attacks.

### 2.3 Strengths

- Explicitly distinguishes “stored” vs “harmful” (ISR vs ASR).
- Shows realistic factors (pre-existing memory, retrieval budgets) matter more than indication prompt count in their setup.
- Provides a concrete illustration of trust-score calibration pitfalls.

### 2.4 Limitations / open questions (builder lens)

- Project-report nature: the environment and pipeline details are less standardized than in benchmark papers; generality is uncertain.
- Retrieval implementation quirks matter: e.g., Levenshtein-based retrieval reduces the impact of “more indication prompts” in their experiment.
- The proposed defenses remain largely heuristic; robust security likely requires immutable ground-truth validation and stronger isolation.

## Stage 3 — Dialectical / Synthesis hooks (how this fits + what we steal)

### 3.1 Implications for memory system design

Key takeaway: in many systems, poisoning risk is dominated by:
- write policy (what enters memory),
- retrieval policy (what gets appended),
- and the agent’s ability to distinguish instruction vs data.

“More memory” and “more retrieved examples” is not monotonic good; it can increase attack success.

### 3.2 Mapping to shisad (`PLAN-longterm-memory.md`)

Add to shisad’s v0.7 memory overhaul (security track):
- First-class **taint/provenance** on memory entries (who/what caused a write).
- Append-time gates:
  - instruction/data boundary checks,
  - pattern filters for known injection templates,
  - optional sandbox/verification hooks for tool outputs.
- Retrieval-time policy:
  - cap `k` aggressively by default,
  - filter by trust/taint,
  - and log what was injected into the prompt.
- Avoid “trust=confidence”: incorporate **verification-of-effect** checks (e.g., immutable DB constraints) to catch high-confidence poison.

### 3.3 Concrete takeaways (actionable)

**Primitives to add**
- `MemoryEntry.security` fields: `trust_score`, `taint_source`, `write_reason`, `policy_decision`.
- `MemoryAppendDecision` audit logs.

**Tests / eval adapters to add**
- A MINJA-style harness with variable:
  - initial benign memory,
  - retrieval `k`,
  - and instruction-pattern variants,
  measuring ISR/ASR separately.

## Notes / Corrections & Updates

- Capture date: 2026-02-22
- Paper version reviewed: arXiv v2 (2026-01-12)

