---
title: "Analysis — ReMe (Cao et al., 2025)"
date: 2026-02-22
type: analysis
paper_id: "arxiv:2512.10696"
paper_title: "Remember Me, Refine Me: A Dynamic Procedural Memory Framework for Experience-Driven Agent Evolution"
source:
  - references/cao-remember-me-refine-me.md
  - references/papers/arxiv-2512.10696.pdf
related:
  - ANALYSIS-academic-industry.md
  - /home/lhl/github/shisa-ai/shisad/docs/PLAN-longterm-memory.md
---

# Analysis — ReMe (Cao et al., 2025)

ReMe is a procedural memory paper that takes a strong stance against the “append-only scrapbook” pattern:

> If you treat procedural memory as a static archive, it will accumulate stale/misleading experiences and stop helping.

Instead, it proposes a managed lifecycle: **acquire → reuse → refine**, where “refine” includes both *adding validated experiences* and *pruning outdated ones* based on utility.

## TL;DR

- **Problem**: Existing procedural memory frameworks often do passive accumulation; they don’t distill high-quality skills well, don’t adapt them to new tasks, and don’t remove harmful/stale experiences.
- **Core idea**: ReMe manages procedural memory as a compact, high-quality experience pool via:
  1. multi-faceted distillation (success + failure + comparative insights),
  2. context-adaptive reuse (scenario-aware indexing),
  3. utility-based refinement (validated addition + deletion).
- **Key primitives / operations**:
  - structured experience object `E = ⟨ω, e, κ, c, τ⟩` (scenario, content, keywords, confidence, tools),
  - top‑K experience retrieval (K=5 reported),
  - dynamic pool updates during execution (“dynamic” vs “fixed”),
  - failure-aware reflection and utility thresholds for pruning.
- **Evaluation (as reported)**: BFCL‑V3 and AppWorld; ReMe (dynamic) achieves best performance across Qwen3 model sizes.
- **Main caveats**: pruning semantics are underdefined for safe systems; procedural experiences are high influence and need write-gates; results are specific to tool-use benchmarks.
- **Most reusable takeaway for shisad**: procedural memory should be versioned, utility-scored, and pruned via explicit policies — but “deletion” must be an audit-friendly invalidation, not forgetting.

## Stage 1 — Descriptive (what the paper proposes)

### 1.1 Experience object and indexing

ReMe defines an “experience” as a structured record:

`E = ⟨ω, e, κ, c, τ⟩`

- `ω`: scenario / when-to-use conditions
- `e`: core experience content (“how-to” guidance)
- `κ`: keywords for categorization
- `c`: confidence in [0,1]
- `τ`: tools used

This is a concrete procedural-memory schema: not just text, but text + applicability metadata.

### 1.2 Experience acquisition: multi-faceted distillation

The system samples multiple trajectories per task (reported `N = 8`, temperature 0.9) to capture diverse success/failure paths.

A summarizer model distills trajectories into experiences via three analyses (as described):
1. **Success pattern recognition** (what worked and why)
2. **Failure trigger analysis** (what caused failure)
3. **Comparative insights** (contrasts success vs failure to extract transferable rules)

This is conceptually similar to “reflection”, but framed as systematic distillation with multiple lenses.

### 1.3 Experience reuse: context-adaptive retrieval

Given a new task, a retriever:
- recalls top‑K relevant experiences (reported K=5),
- injects them into the agent context to guide decision-making.

The paper emphasizes scenario-aware indexing: the same “skill” may be relevant only under certain conditions.

### 1.4 Experience refinement: add + prune by utility

ReMe explicitly includes *removal*:
- incorporate new “solid” experiences (addition), and
- discard outdated ones (deletion) to keep the pool compact and high quality.

It distinguishes:
- **ReMe (fixed)**: experience pool not updated during execution,
- **ReMe (dynamic)**: experience pool updated online during agent execution.

## Stage 2 — Evaluative (what it measures, what’s missing, what breaks)

### 2.1 Evaluation setup (as reported)

Benchmarks:
- **BFCL‑V3** and **AppWorld**

Metrics:
- **Avg@4**: average task success across 4 independent trials
- **Pass@4**: probability at least one of 4 trials succeeds

Baselines:
- No Memory
- A‑Mem (note/link memory baseline)
- LangMem (LangChain long-term memory module)

### 2.2 Main results (as reported)

Table 1 reports results across Qwen3 model sizes. Selected rows:

Qwen3‑8B:
- No Memory: BFCL‑V3 Avg@4 **40.33**, Pass@4 **59.55**; AppWorld Avg@4 **14.97**, Pass@4 **32.85**
- ReMe (dynamic): BFCL‑V3 Avg@4 **45.17**, Pass@4 **68.00**; AppWorld Avg@4 **24.70**, Pass@4 **42.06**

Qwen3‑14B:
- No Memory: Avg (across both benchmarks) Avg@4 **35.62**, Pass@4 **54.65**
- ReMe (dynamic): Avg Avg@4 **44.66**, Pass@4 **63.71**

Qwen3‑32B:
- ReMe (dynamic): Avg Avg@4 **49.10**, Pass@4 **69.97**

The paper highlights a “memory scaling” effect: smaller Qwen3‑8B + ReMe can outperform larger memoryless models (as reported).

### 2.3 Strengths

- Clear end-to-end procedural memory lifecycle, including pruning (often missing in practice).
- Uses tool-use benchmarks (BFCL‑V3/AppWorld) that are closer to real agent workloads than static QA.
- Reports both Avg@4 and Pass@4, capturing robustness across multiple attempts.

### 2.4 Limitations / open questions (builder lens)

- **Deletion semantics**: utility-based deletion is not the same as a safe correction mechanism. Builders need:
  - reasons, evidence, and version history for removals,
  - protection against adversarial poisoning that triggers deletion of good experiences.
- **Procedural memory safety**: experiences are effectively instructions; without a policy firewall, they can become a prompt-injection persistence vector.
- **Generalization**: unclear how well this maps to conversational long-term memory (persona/preferences) vs tool-use procedural skills.

## Stage 3 — Synthesis hooks (how this fits + what we steal)

### 3.1 Comparison to adjacent work

- Compared to **Live‑Evo**, ReMe uses performance-based refinement but does not emphasize explicit memory-on vs memory-off contrastive evaluation as the update signal.
- Compared to **AgeMem / Memory‑R1**, ReMe doesn’t require RL fine-tuning; it’s a prompting/system design approach for experience distillation and pool management.

### 3.2 Mapping to shisad (`PLAN-longterm-memory.md`)

ReMe suggests concrete additions for shisad’s procedural memory tier:

1. **First-class procedural experience objects**
   - schema: scenario applicability + tools used + confidence + keywords, not just free text.
2. **Refinement policies**
   - add/merge/prune should be explicit jobs with logs and thresholds.
3. **Deletion as invalidation**
   - don’t hard-delete experiences; mark them invalid/outdated with reasons and keep history (“humans remember they used to think X”).
4. **Poisoning-resistant refinement**
   - require multiple signals before pruning high-utility experiences (utility decay + time + verification).

### 3.3 Concrete takeaways (actionable)

**Primitives to add**
- `ProceduralExperience` with `scenario`, `tools`, `keywords`, `confidence`, `source_traces`.
- `ExperienceUtility` + decay rules.
- `InvalidateExperience` event (versioned).

**Tests / eval adapters to add**
- Tool-use regression suites that measure robustness across multiple trials (Avg@N / Pass@N).
- “Stale experience” tests where environment changes and pruning must occur without catastrophic forgetting.

## Notes / Corrections & Updates

- Capture date: 2026-02-22
- Paper version reviewed: arXiv v1 (2025-12-11)

