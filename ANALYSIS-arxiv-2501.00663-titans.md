---
title: "Analysis — Titans (Behrouz et al., 2024)"
date: 2026-02-22
type: analysis
paper_id: "arxiv:2501.00663"
paper_title: "Titans: Learning to Memorize at Test Time"
source:
  - references/behrouz-titans.md
  - references/papers/arxiv-2501.00663.pdf
related:
  - ANALYSIS-academic-industry.md
  - shisad internal long-term memory plan (private)
---

# Analysis — Titans (Behrouz et al., 2024)

Titans is not a database-backed “agent memory system”. It is an architecture proposal where **memory is implemented as an online-updated neural module** (test-time learning), intended to let a model use a short attention window for precision while still retaining very long-range information via parametric compression. For shisad, the main value is conceptual + algorithmic: it gives concrete knobs for **salience (“surprise”)**, **forgetting**, and **multi-branch memory roles**.

## TL;DR

- **Problem**: Attention is accurate but expensive and bounded by context window; linear recurrent models scale but often lose accuracy and struggle with retrieval of long-range dependencies.
- **Core idea**: Add a long-term **neural memory module** that updates its parameters online at inference to store long past, and combine it with limited-window attention (short-term memory).
- **Memory types covered**: short-term attention; long-term adaptive “contextual memory”; persistent task memory (learnable prefix parameters).
- **Key primitives**:
  - associative-memory inner-loop objective `||M(k)-v||^2`,
  - “surprise” from gradients + momentum (`S_t`),
  - explicit forgetting/gating via weight decay (`α_t`),
  - retrieval as forward pass from memory `M*(q)`.
- **Architectures**: Memory-as-Context (MAC), Memory-as-Gate (MAG), Memory-as-Layer (MAL), and memory-only (LMM).
- **Evaluation** (as reported): improved LM/commonsense metrics; strong retention on needle-in-haystack across increasing sequence lengths; strong BABILong results (figures).
- **Main caveat**: online weight updates complicate determinism/auditability; mapping to external LTM requires extra design layers (policy, provenance, safety).

## Stage 1 — Descriptive (what the paper proposes)

### 1.1 Neural memory as online compression

The neural memory `M_t` is trained as a meta-model that learns how to “memorize” at test time by optimizing an inner-loop loss over the sequence:

- Project each token into key/value: `k_t = x_t W_K`, `v_t = x_t W_V`.
- Define an associative-memory loss:
  - `ℓ(M_{t-1}; x_t) = || M_{t-1}(k_t) - v_t ||^2`

The update rule uses a “surprise” term based on gradients:

- Past surprise (momentum-like): `S_t = η_t S_{t-1} - θ_t ∇ℓ(M_{t-1}; x_t)`
- Forgetting/gating: `M_t = (1 - α_t) M_{t-1} + S_t`

Interpretation:
- `α_t` is an explicit forgetting knob (weight decay as gating).
- `η_t` controls how long surprise persists (context-continuity vs context-reset).

Retrieval is the forward pass without update:
- `q_t = x_t W_Q`
- `y_t = M*(q_t)`

### 1.2 Persistent memory

They add learnable, input-independent prefix parameters `{p_1…p_{N_p}}` (persistent/meta memory) to encode task priors and mitigate attention biases.

### 1.3 Incorporating memory: MAC / MAG / MAL

All variants share a three-way decomposition:
1) **Core**: short-term attention (limited window / sliding window)
2) **Long-term**: neural memory module (online-updated)
3) **Persistent**: learnable prefix parameters

Differences:
- **MAC** segments the sequence; retrieves long-term memory for the current segment and concatenates (persistent + retrieved + current) before attention; then uses attention output to update memory.
- **MAG** runs sliding-window attention and memory in parallel and combines outputs via a gating nonlinearity.
- **MAL** stacks memory then attention (memory output becomes attention input), which they argue is less complementary.
- **LMM** is memory-only (no attention), used to test whether the long-term memory module is “independently useful”.

### 1.4 Parallelizability claim

The paper argues the inner-loop update can be tensorized/chunked to use matmuls (building on work showing mini-batch gradient descent forward passes can be computed efficiently), and uses scan/convolution tricks for momentum-like recurrences.

## Stage 2 — Evaluative (what it measures, what’s missing, what breaks)

### 2.1 Evaluation setup (as reported)

Benchmarks include:
- Language modeling + commonsense reasoning tasks (perplexity + multiple-choice accuracies).
- Needle-in-a-haystack tasks (RULER S-NIAH) at increasing sequence lengths.
- BABILong benchmark (few-shot + fine-tuning), with comparisons against large frontier models and RAG baselines (reported via figures).

### 2.2 Main results (as reported)

Needle-in-a-haystack (S-NIAH) illustrates the main qualitative claim: Titans variants maintain high retrieval performance as length increases, while some recurrent baselines degrade sharply.

Example from their S-NIAH table (16K):
- `Titans (MAC)` stays high across PK/N/W variants (e.g., 98.4 / 97.4 / 95.2), while TTT and Mamba2 collapse on N/W.

Language modeling: their table suggests Titans hybrids are competitive with or better than hybrid recurrent+attention baselines at similar parameter scales (as reported).

### 2.3 Strengths (builder-relevant)

- Provides explicit, operational knobs for memory:
  - *what updates* (memory weights),
  - *when to forget* (`α_t`),
  - *what’s salient* (gradient-based surprise + momentum).
- Evaluation includes multiple “memory stressors” (NIAH, long-doc reasoning).

### 2.4 Limitations / open questions

- **Online updates**: production deployment needs determinism, rollback, audit logs, and safety gates. A model that changes weights during inference complicates this.
- **Alignment with agent memory**: many agent memory failures are about *retrieval correctness*, *conflict resolution*, *scoping*, and *policy*, which are not addressed by internal parametric memory alone.
- **Comparability**: results depend on training regimes, chunking, and implementation details that can be hard to reproduce.

## Stage 3 — Synthesis hooks (how this fits + what we steal)

### 3.1 What Titans implies for external agent memory

Even if shisad remains “external memory + retrieval”, Titans suggests:
- Use **surprise/prediction-error proxies** to decide what should be written to durable memory (salience gating).
- Make forgetting explicit: external memory also needs `α`-like semantics (TTL, decay, invalidation) rather than only “keep everything”.
- Maintain separate roles:
  - **persistent** (rarely changed) procedural/task priors,
  - **contextual long-term** (frequently updated),
  - **short-term/working** (high churn).

### 3.2 Mapping to shisad (`PLAN-longterm-memory.md`)

Suggested shisad primitives inspired by Titans:
- A write-policy score that approximates “surprise”:
  - disagreement between prediction and outcome,
  - novelty vs existing memories,
  - or explicit gradient/LLM-uncertainty surrogates.
- A first-class **forgetting/decay interface** (per tier) that is explicit and measurable.
- Strong separation between:
  - **procedural memory** (stable policies, tools, constraints),
  - **episodic memory** (events/logs),
  - **semantic memory** (facts/relations).

What shisad adds that Titans doesn’t cover:
- multi-tenant scoping/isolation,
- correction semantics (supersedes history),
- poisoning defenses and provenance.

### 3.3 Roadmap placement

- v0.7: incorporate Titans-inspired *policy knobs* (salience scoring, decay semantics) into external memory write/consolidation.
- Later: consider internal memory architectures as optional model-side upgrades; they don’t replace external auditability and safety requirements.

## Notes / Corrections & Updates

- Capture date: 2026-02-22.
- Paper version reviewed: arXiv v1 (2024-12-31).
