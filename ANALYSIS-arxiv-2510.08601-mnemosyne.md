---
title: "Analysis — Mnemosyne (Jonelagadda et al., 2025)"
date: 2026-02-22
type: analysis
paper_id: "arxiv:2510.08601"
paper_title: "Mnemosyne: An Unsupervised, Human-Inspired Long-Term Memory Architecture for Edge-Based LLMs"
source:
  - references/jonelagadda-mnemosyne.md
  - references/papers/arxiv-2510.08601.pdf
related:
  - ANALYSIS-academic-industry.md
  - /home/lhl/github/shisa-ai/shisad/docs/PLAN-longterm-memory.md
---

# Analysis — Mnemosyne (Jonelagadda et al., 2025)

Mnemosyne is a graph-first, edge-oriented memory architecture aimed at **longitudinal, semantically redundant** dialogue domains (healthcare is their motivating example). The paper’s distinctive moves are:

- **Commit-time gates** (substance + redundancy) to keep the store small and meaningful,
- a **probabilistic recall traversal** modulated by **temporal decay** and “refresh/rewind” boosts, and
- a fixed-budget **core summary** (persona supersummary) derived from a fixed-size subset of the graph.

It is best read as a “context engineering” system: the memory subsystem is responsible for selecting what enters the model’s small context window on constrained devices.

## TL;DR

- **Problem**: Edge devices can’t brute-force long context; naive RAG struggles when memories are semantically similar (high redundancy) and when temporal nuance matters.
- **Core idea**: Store summaries in a **memory graph** and recall via **probabilistic traversal** whose selection probabilities are shaped by **edge weights** and **temporal decay/refresh** dynamics.
- **Memory types covered**:
  - episodic-ish summaries as graph nodes,
  - derived “persona” memory via a fixed-budget **core summary**.
- **Key primitives / operations**:
  - commitment gates: `HasSubstance`, redundancy pairing, node/edge creation,
  - recall: start-node scoring with naturalized time deltas, probabilistic DFS traversal,
  - maintenance: periodic core-summary updates, pruning.
- **Write path**: summarize interactions → substance filter → redundancy filter + rewind calculation → connect node with weighted edges + HyDE-style hypothetical queries.
- **Read path**: start node via query+metadata similarity → probabilistic traversal with decay/rewind → format retrieved nodes + inject core summary.
- **Evaluation (as reported)**:
  - LoCoMo J-score: Mnemosyne is best on **single-hop** and **temporal** among compared methods; overall J-score 54.55 (second to Memory-R1).
  - Human eval win rate: 65.8% (Mnemosyne w/ core summary) vs 31.1% (naive RAG).
- **Main risks / caveats**: probabilistic recall can be unstable/non-deterministic; redundancy policy “drop newest” can erase updates; evaluation baselines are partly cited; human study is internal.
- **Most reusable takeaway for shisad**: treat “memory” as a **graph + policies** (redundancy, decay, derived summaries) rather than a single top-`k` vector retrieval; but keep retrieval deterministic by default and make probabilistic exploration an explicit mode.

## Stage 1 — Descriptive (what the paper proposes)

### 1.1 Data model: a lightweight memory graph

- Nodes: store interaction summaries (and minimal metadata required for graph ops).
- Edges: connect nodes above a similarity threshold, with weight:
  - embedding cosine similarity + keyword overlap (Jaccard), mixed by a hyperparameter.
- Additional stored artifacts:
  - HyDE-style **hypothetical queries** per node to reduce query–memory mismatch during recall.
  - Redundancy pairing metadata and a **boost/rewind** value used for decay compensation.

### 1.2 Commitment (write path)

Commitment takes a new summary `s_new` and either discards it or adds it as a node:

1. **Substance filter (LLM)**: a binary classification step (“substantial” vs “mundane”) based on summary + core summary. In the healthcare framing, “substantial” includes: condition/treatment, clinical status/needs, and personality details.
2. **Redundancy filter (classical)**:
   - find the most redundant existing node using a redundancy score:
     - mutual information between binned embeddings + Jaccard similarity over keywords.
   - if redundant, pair nodes and **discard the newer node** in a redundant pair (primacy/recency rationale).
   - compute a **rewind/boost** value (bounded sigmoid) and store it for later recall.
3. **Graph connection**: add edges from the new node to similar nodes (thresholded).

Builder note: the paper’s redundancy decision is unusual (“discard the more recent redundant node”). This makes sense if redundancy truly means “no new information”, but it can be wrong when “similar” conversations contain new or corrected details.

### 1.3 Recall (read path)

Recall has two phases:

1. **Start node selection**:
   - scores nodes by a mixture of:
     - `S_query`: query similarity to (hypothetical query + summary text), and
     - `S_meta`: query similarity to a metadata string that includes a **naturalized time delta** (“last week”, etc.), a domain state string, and keywords.
   - motivation: users refer to memories with relative time language; embed that text instead of relying only on numeric timestamps.

2. **Probabilistic traversal**:
   - DFS-style traversal from the start node.
   - for a neighbor `m` connected by edge weight `e_nm`, choose it with probability proportional to:
     - `e_nm × τ(e_eff) × μ`
   - where `τ` is a reverse-sigmoid **decay function** over effective age `e_eff`, and `μ` is an exploration hyperparameter.
   - effective age is reduced by the rewind value from redundancy refresh: `e_eff = t_now − t_init − Δe(t_now)`.

The output is a set of recalled nodes `R` formatted into LLM context; the **core summary is always injected** alongside recalled context.

### 1.4 Core summary (derived “persona” memory)

The core summary is periodically regenerated asynchronously:

- Select a fixed-size subset of graph nodes (topic coverage enforced by k-means clustering).
- Score nodes by a mixture of connectivity, boost, recency, and information density.
- Feed raw summaries from selected nodes + previous core summary into an LLM to produce the updated “supersummary”.

This is a useful pattern: a stable, fixed-budget “user model” that is always present in context, while episodic recall remains selective.

### 1.5 Pruning / forgetting

When graph size approaches memory limits, a pruning module removes low-score nodes (based on a variant of the traversal probability without exploration).

## Stage 2 — Evaluative (what it measures, what’s missing, what breaks)

### 2.1 Evaluation setup (as reported)

System details (as reported):
- Hardware: i7-12700E + RTX A4000 16GB + 64GB RAM.
- LLMs:
  - Mistral-7B-Instruct (quantized) used for substance filter + commitment/core operations,
  - Llama-3.1-8B-Instruct used as the LoCoMo generation model,
  - GPT-4o-mini used as the LoCoMo judge.
- Embeddings: PubMedBERT.
- Storage: Redis for node attributes + graph structure.

Benchmarks:
- LoCoMo (adversarial category excluded).
- Human eval: 40 healthcare-style queries, pairwise preferences among 3 systems.

Baseline comparability:
- LoCoMo baseline metrics are cited from Memory-R1’s paper rather than rerun end-to-end in the same harness.

### 2.2 Main results (as reported)

LoCoMo J-scores (Table 2):

| System | Single-hop | Multi-hop | Open-domain | Temporal | Overall |
|---|---:|---:|---:|---:|---:|
| Memory-R1*† | 59.83 | 53.01 | 68.78 | 51.55 | 62.74 |
| Mnemosyne* | **62.78** | 49.53 | 60.42 | **53.03** | 54.55 |
| Mem0*† | 43.93 | 37.35 | 52.27 | 31.40 | 45.68 |
| Zep*† | 52.38 | 33.33 | 45.36 | 27.58 | 42.80 |

Human eval win rates (Table 3):

| System | Win rate | Notes |
|---|---:|---|
| Mnemosyne w/ core summary | **65.8%** | preferred realism + long-term details |
| Mnemosyne w/o core summary | 53.1% | shows graph+filters help even without persona summary |
| Naive RAG | 31.1% | baseline |

### 2.3 Strengths

- Strong, implementation-oriented mechanisms for:
  - redundancy handling (pairing + refresh),
  - temporally aware recall (naturalized time deltas),
  - and a fixed-budget core persona summary.
- Explicitly targets “edge constraints” rather than assuming 128k+ context and cloud infra.
- The paper itself includes a valuable critique of LoCoMo gold-answer quality, which is unusual (and important) for benchmark interpretation.

### 2.4 Limitations / open questions (builder lens)

- **Non-determinism**: probabilistic traversal can cause answer variance across runs. For product agents, you likely want determinism by default (or at least a seeded mode + logging).
- **Redundancy policy risk**: “drop newest” can delete true updates; needs a “redundant vs updated” classifier or a merge step rather than simple removal.
- **Domain dependence**:
  - “substantial” definition is healthcare-centric; general domain needs policy design.
  - PubMedBERT embeddings are domain-specific; LoCoMo generalization might be artificially constrained by embedding mismatch.
- **Evaluation bias**:
  - human evaluators are internal employees (the paper acknowledges this as a limitation),
  - baseline LoCoMo numbers are cited rather than rerun, which weakens apples-to-apples claims.

## Stage 3 — Dialectical / Synthesis hooks (how this fits + what we steal)

### 3.1 Comparison to adjacent work

- Compared to **Mem0 / Memory-R1**: Mnemosyne is less about CRUD policies and more about **graph structure + recall dynamics** (decay/refresh, exploration).
- Compared to **Zep/Graphiti**: Mnemosyne’s graph is similarity-linked episodic summaries with probabilistic traversal; Zep emphasizes bi-temporal validity semantics and structured entity/fact graphs.

### 3.2 Mapping to shisad (`PLAN-longterm-memory.md`)

Suggested shisad takeaways to incorporate in v0.7 memory overhaul:
- Add a **derived “core summary” / user model memory** with explicit fixed budget and update schedule.
- Add explicit **redundancy handling primitives** beyond “dedup by similarity”:
  - track “refresh counts” for repeated memories,
  - allow “merge” vs “supersede” semantics instead of deletion.
- Add time-aware retrieval features:
  - embed relative time language (or compute features that approximate it) to improve temporal recall.

Things to treat cautiously:
- Probabilistic recall should be optional and fully logged (seed, traversal path), otherwise debugging is hard.
- “Drop newest redundant node” is not safe without additional validation.

### 3.3 Concrete takeaways (actionable)

**Primitives to add**
- `MemoryGraphNode` + `MemoryGraphEdge` types with minimal required metadata (timestamps, source, refresh counters).
- `RedundancyPair` / `Refresh` semantics distinct from `Supersedes`.
- `CoreSummary` as a derived artifact with provenance pointing to its source nodes.

**Tests / eval adapters to add**
- A “high redundancy” evaluation slice (daily-report style dialogues) where naive vector top-`k` fails.
- A “temporal language” slice: queries phrased with relative time (“last week”) vs absolute.

**Operational knobs**
- Seeded recall exploration parameter `μ` and a hard cap on recalled node count/token budget.

## Notes / Corrections & Updates

- Capture date: 2026-02-22
- Paper version reviewed: arXiv v1 (2025-10-07)

