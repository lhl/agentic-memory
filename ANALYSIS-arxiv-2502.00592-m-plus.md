---
title: "Analysis — M+ (Wang et al., 2025)"
date: 2026-02-22
type: analysis
paper_id: "arxiv:2502.00592"
paper_title: "M+: Extending MemoryLLM with Scalable Long-Term Memory"
source:
  - references/wang-m-plus.md
  - references/papers/arxiv-2502.00592.pdf
related:
  - ANALYSIS-academic-industry.md
  - /home/lhl/github/shisa-ai/shisad-dev/planning/PLAN-longterm-memory.md
---

# Analysis — M+ (Wang et al., 2025)

M+ is a latent-space memory architecture paper: it addresses “long-term memory” by storing and retrieving **hidden-state memory tokens**, not by building an external memory store of human-readable notes.

Even though `shisad` is primarily about external agent memory, M+ is still valuable as a reference for:
- what latent-memory approaches can buy you (retention at 100k+ scale),
- and what they cost you (interpretability, correction semantics, safety boundaries).

## TL;DR

- **Problem**: MemoryLLM compresses past information into hidden states but struggles to retain knowledge beyond ~20k tokens.
- **Core idea**: Extend MemoryLLM with:
  - a **long-term memory** `Θ` that stores dropped memory tokens instead of discarding them, and
  - a **co-trained retriever** that selects relevant long-term tokens during generation.
- **Key primitives / operations**:
  - short-term memory pool `θ` per layer (MemoryLLM),
  - long-term memory pool `Θ` per layer with max capacity (reported `M = 150k`),
  - “age” metadata to preserve chronological ordering,
  - retrieval of `K0` tokens from `Θ` during generation and concatenation with `θ`,
  - Multi‑LoRA design: separate LoRA weights for update vs generation.
- **Evaluation (as reported)**: long-book QA/Event QA, LongBench ablations, and knowledge retention tasks with distractors (SQuAD/NaturalQA).
- **Main caveats**: latent memory is not directly auditable or safely editable; “memory poisoning” boundaries differ because memory lives in hidden state; applicability to multi-tenant agent memory stores is indirect.
- **Most reusable takeaway for shisad**: treat memory as multi-timescale with explicit “age” and retrieval budgets, and build retrieval-quality diagnostics; but keep shisad’s external memory as the auditable source of truth.

## Stage 1 — Descriptive (what the paper proposes)

### 1.1 MemoryLLM baseline (short-term latent memory)

MemoryLLM maintains a memory pool `θ` with `L` layers `{θ_l}`.
Each `θ_l` contains `N` memory tokens in `R^d` (hidden size).

During update, MemoryLLM drops `K` tokens from `θ` and merges new tokens; dropped tokens are discarded.

### 1.2 M+: adding Long-Term Memory (Θ)

M+ introduces a long-term memory `Θ = {Θ_l}`:
- flexible size up to a maximum `M` (reported `M = 150k`).

**Update process**
- tokens that would be dropped from `θ` are instead stored in `Θ` with an **age** value.
- when `Θ` reaches capacity, oldest tokens (largest age) are dropped.

**Generation process**
- at each layer, retrieve `K0` tokens from `Θ_l` via a retrieval mechanism,
- sort retrieved tokens by age (chronological),
- concatenate retrieved LTM tokens with `θ_l`,
- query hidden states attend to both via cross-attention.

### 1.3 Co-trained retriever

The retriever is trained to match query hidden states to relevant memory tokens via a contrastive objective (as described):
- push queries close to positive memory tokens,
- push away from negatives.

The paper also compares to an attention-score-based retrieval variant (M+-Attn) and reports M+ performs better on retention tasks (as reported).

### 1.4 Multi‑LoRA (write vs read adapters)

Training uses two sets of LoRA weights:
- one activated during update (“write/compress”),
- one during generation (“read/use”).

This is a useful systems idea: reading and writing are different distributions and should not share all parameters.

## Stage 2 — Evaluative (what it measures, what’s missing, what breaks)

### 2.1 GPU memory cost (as reported)

Table 1 reports GPU memory cost (MB). Selected entries:

| Method | GPU memory (MB) |
|---|---:|
| M+ | 21,177.76 |
| MemoryLLM‑8B | 21,176.24 |
| M+ (offload) | 17,973.34 |
| MemoryLLM‑8B (offload) | 17,967.47 |

Interpretation: adding long-term memory does not increase GPU memory cost vs MemoryLLM, and CPU offloading reduces GPU usage (as reported).

### 2.2 Long-context quality within shorter windows (as reported)

Table 3 shows an 8k-window LongBench ablation across stages:
- MemoryLLM‑8B Stage 1 avg: 26.55
- MemoryLLM‑8B‑Long Stage 2 avg: 31.29
- M+ Stage 3 avg: 31.00

Interpretation: M+ is competitive with Stage 2 on shorter-window evaluations (as reported).

### 2.3 Knowledge retention at very long lengths (as reported)

The paper reports that Stage 3 extends retention on SQuAD from “50k to over 160k tokens” (as described).

Retrieval-quality diagnostic (as described in §4.6.2):
- when ~81,276 tokens are in long-term memory, M+ retrieves ~30% of “ground-truth tokens” vs ~3% for random retrieval (as reported).

### 2.4 Limitations / builder questions

- Latent memory makes **correction semantics** difficult: how do you invalidate a wrong latent token without training?
- The paper is not primarily about multi-user agent memory: **scoping**, **ACLs**, and **auditing** are out-of-scope.
- Poisoning risks exist but look different: the “write path” is model update/encoding, not an explicit memory API call.

## Stage 3 — Synthesis hooks (how this fits + what we steal)

### 3.1 Relation to external agent memory systems

M+ is “memory inside the model”, whereas shisad is “memory outside the model”. These can be complementary:
- latent memory can help with very long documents/histories,
- external memory is still needed for:
  - auditability,
  - explicit versioned corrections,
  - access control,
  - safety policy.

### 3.2 Mapping to shisad (`PLAN-longterm-memory.md`)

Practical takeaways for shisad:

1. **Age is a first-class signal**
   - M+ explicitly tracks “age” and orders retrieved memory; shisad should do the same across episodic/note/procedural tiers.
2. **Write vs read policies differ**
   - mirror the Multi‑LoRA idea at the system level: separate extraction/write prompts/policies from retrieval/compilation prompts/policies.
3. **Retrieval-quality diagnostics**
   - build diagnostics like “ground-truth token retention” analogues for external memory (oracle evidence retrieval rates).
4. **Keep external truth**
   - use latent compression only as a derived accelerator; keep raw evidence + version history as ground truth.

## Notes / Corrections & Updates

- Capture date: 2026-02-22
- Paper version reviewed: arXiv v2 (2025-05-30)

