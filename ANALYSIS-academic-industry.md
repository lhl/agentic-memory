---
title: "Analysis — Academic/Industry Agent Memory Systems (Synthesis)"
date: 2026-02-22
type: analysis
related:
  - ANALYSIS.md
  - PUNCHLIST-academic-industry.md
  - shisad internal long-term memory plan (private)
---

# Analysis — Academic/Industry Agent Memory Systems (Synthesis)

This document is a synthesis/comparison of **academic + industry** work on long‑term memory for LLM agents (benchmarks, architectures, attacks, and surveys), intended to drive design decisions for `shisad` (implementation reference: `shisad internal long-term memory plan (private)`).

Scope notes:
- This is **not** a review of the “folk” ad‑hoc memory projects; those are in `ANALYSIS.md` and the non‑paper `ANALYSIS-*.md` deep dives.
- Quantitative results are treated **as reported** unless we reproduce them.
- Every paper in `PUNCHLIST-academic-industry.md` has a per‑paper deep dive (`ANALYSIS-arxiv-*.md`) and a reference summary (`references/*.md`); this file is the cross‑paper synthesis.

## 0) TL;DR for builders (what the 2025–2026 SOTA is converging on)

If you want a “SOTA‑shaped” memory system in 2026, the literature is converging on these ideas:

1. **Memory is a pipeline, not a database**: indexing → retrieval → reading (LongMemEval), plus explicit write gates, version semantics, and maintenance loops.
2. **Episodic evidence must remain addressable**: store a non‑lossy episode/page/log tier (Zep, GAM, Hindsight, EverMemOS), and treat summaries/notes/KG edges as *derived views* with provenance.
3. **Updates/corrections are first‑class**: LongMemEval/EverMemBench force version semantics; systems differ sharply on whether they preserve history (Zep, MemOS, Hindsight) or delete/overwrite (Mem0, Memory‑R1, AgeMem).
4. **“Memory types” matter operationally**: episodic/semantic/procedural/constraints behave differently; typed stores + strict budgets (ENGRAM) beat “one giant bucket”.
5. **Consolidation is the real scaling mechanism**: temporal hierarchies (TiMem), episodic→scene consolidation (EverMemOS), episode→note splits (HiMem), or core-summary regeneration (Mnemosyne) are all ways of avoiding “scrapbook bloat”.
6. **Reading/compilation is a separate hard problem**: multi‑channel retrieval + fusion + rerank + token‑budget packing (Hindsight, Zep) and “sufficiency verification” loops (EverMemOS/HiMem/GAM) are increasingly common.
7. **Procedural/experience memory is powerful and risky**: ReMe / Evo‑Memory / Live‑Evo show big gains from experience reuse, but also create a durable “instruction channel” unless you firewall it.
8. **Memory security is not optional**: MINJA and follow‑ups show query‑only poisoning works against common “store demonstrations” patterns; retrieval `k` and trust gating can amplify or dampen ASR (poisoning attack/defense paper).
9. **Evaluation is diversifying beyond recall**: structure formation (StructMemEval), constraint consistency (LoCoMo‑Plus), multi‑party fragmentation + oracle diagnostics (EverMemBench), and latency/capacity (MemBench) all matter.
10. **Internal/latent memory is advancing, but isn’t a product memory substitute**: Titans and M+ show impressive long‑range retention via internal updates/latent tokens; they trade away inspectability, correction semantics, and multi‑tenant governance.

## 1) Landscape map: what we covered (by role)

### Benchmarks (what they test)

- **LoCoMo ([arXiv:2402.17753](https://arxiv.org/abs/2402.17753))**: very long, multi‑session dialogue grounded in personas + temporal event graphs (and images); demonstrates that **wrong retrieval hurts**.
- **LongMemEval ([arXiv:2410.10813](https://arxiv.org/abs/2410.10813))**: assistant‑style multi‑session histories with **updates** and **abstention**; provides the shared decomposition: **indexing → retrieval → reading**.
- **EverMemBench ([arXiv:2602.01313](https://arxiv.org/abs/2602.01313))**: >1M‑token, multi‑party / multi‑group interleavings; includes **oracle evidence** evaluation to isolate retrieval vs reading failures.
- **MemBench ([arXiv:2506.21605](https://arxiv.org/abs/2506.21605))**: participation vs observation scenarios; factual vs reflective memory; includes **read/write time** and capacity cliffs.
- **LoCoMo‑Plus ([arXiv:2602.10715](https://arxiv.org/abs/2602.10715))**: “cognitive memory”: latent constraints (state/goal/value/causal) under cue–trigger semantic disconnect; evaluated via **constraint consistency**.
- **StructMemEval ([arXiv:2602.11243](https://arxiv.org/abs/2602.11243))**: evaluates whether agents form/use **structures** (trees/state/ledgers), including **hint vs no‑hint** diagnostics.

### Systems / architectures (what to steal)

- **MemGPT ([arXiv:2310.08560](https://arxiv.org/abs/2310.08560))**: OS‑style paging between bounded context and external stores; foundational baseline for explicit memory ops.
- **Mem0 ([arXiv:2504.19413](https://arxiv.org/abs/2504.19413))**: production‑leaning explicit ops (`ADD/UPDATE/DELETE/NOOP`) + tokens/p95 latency reporting; optional KG variant.
- **Zep / Graphiti ([arXiv:2501.13956](https://arxiv.org/abs/2501.13956))**: bi‑temporal KG with validity intervals + hybrid retrieval + constructor; strong “corrections without forgetting” semantics.
- **AriGraph ([arXiv:2407.04363](https://arxiv.org/abs/2407.04363))**: episodic↔semantic **memory graph world model** (episodes linked to extracted triplets) with semantic→episodic two‑stage retrieval; strong for interactive environments.
- **MemOS ([arXiv:2507.03724](https://arxiv.org/abs/2507.03724))**: memory “operating system” with MemCubes, lifecycle/governance, and multi‑substrate memory (plaintext/activation/parameter).
- **HEMA ([arXiv:2504.16754](https://arxiv.org/abs/2504.16754))**: dual memory (running summary + vector store) with explicit token budgets + pruning + summary‑of‑summaries.
- **ENGRAM ([arXiv:2511.12960](https://arxiv.org/abs/2511.12960))**: typed episodic/semantic/procedural stores + simple router + strict evidence budgets; “simplicity wins” story with latency reporting.
- **Memoria ([arXiv:2512.12686](https://arxiv.org/abs/2512.12686))**: transcript + session summaries + persona KG; uses **recency weighting** to prioritize newer preferences.
- **Mnemosyne ([arXiv:2510.08601](https://arxiv.org/abs/2510.08601))**: edge‑oriented memory graph with **commit‑time substance/redundancy gates**, probabilistic recall traversal, and a fixed‑budget “core summary”.
- **Nemori ([arXiv:2508.03341](https://arxiv.org/abs/2508.03341))**: cognitively-inspired dual memory (episodes + semantic KB) with LLM boundary detection and **predict-calibrate** knowledge distillation from prediction gaps; strong LoCoMo + LongMemEvalS results (as reported).
- **TiMem ([arXiv:2601.02845](https://arxiv.org/abs/2601.02845))**: temporal consolidation hierarchy (segment→session→day→week→profile) + query‑aware planner + gating.
- **EverMemOS ([arXiv:2601.02163](https://arxiv.org/abs/2601.02163))**: MemCells (episode+narrative+facts+foresight validity) → MemScenes + sufficiency verifier + query rewriting.
- **HiMem ([arXiv:2601.06377](https://arxiv.org/abs/2601.06377))**: episode memory + stable note memory; note‑first retrieval with fallback; reconsolidation loop.
- **SimpleMem ([arXiv:2601.02553](https://arxiv.org/abs/2601.02553))**: write‑time structured compression + online synthesis + intent‑aware retrieval planning + multi‑view (dense/sparse/symbolic) union/dedup.
- **MemInsight ([arXiv:2503.21760](https://arxiv.org/abs/2503.21760))**: autonomous attribute mining/annotation to make memory searchable via stable fields, not just embeddings.
- **A‑Mem ([arXiv:2502.12110](https://arxiv.org/abs/2502.12110))**: Zettelkasten‑like note network with LLM link generation and “memory evolution” (rewrites).
- **Hindsight ([arXiv:2512.12818](https://arxiv.org/abs/2512.12818))**: separates **evidence vs beliefs vs derived summaries**; multi‑channel retrieval + fusion/rerank + belief/confidence updates (“retain/recall/reflect”).
- **GAM ([arXiv:2511.18423](https://arxiv.org/abs/2511.18423))**: JIT “deep research over your own history”: universal page‑store + lightweight memos + researcher that compiles optimized context at runtime (high latency).
- **Recursive Language Models ([arXiv:2512.24601](https://arxiv.org/abs/2512.24601))**: programmable/recursive “reading engine” over arbitrarily long evidence stores via sandboxed code + subcalls (not persistent memory per se).

### Learning / evolution (memory as policy + feedback)

- **AgeMem ([arXiv:2601.01885](https://arxiv.org/abs/2601.01885))**: RL policy over both LTM ops and STM tools (`retrieve/summary/filter`) with a staged curriculum.
- **Memory‑R1 ([arXiv:2508.19828](https://arxiv.org/abs/2508.19828))**: RL fine‑tunes a memory manager (CRUD) and an answer agent (post‑retrieval distillation).
- **Evo‑Memory ([arXiv:2511.20857](https://arxiv.org/abs/2511.20857))**: benchmark/framework for **test‑time evolution**: streaming tasks, experience reuse, refine/prune, order robustness.
- **Live‑Evo ([arXiv:2602.02369](https://arxiv.org/abs/2602.02369))**: online evolution with an Experience Bank + Meta‑Guideline Bank, and contrastive **memory‑on vs memory‑off** utility measurement.
- **ReMe ([arXiv:2512.10696](https://arxiv.org/abs/2512.10696))**: procedural memory lifecycle acquire→reuse→refine; utility‑based pruning (deletion must become invalidation in safe systems).

### Internal/latent memory (important contrasts)

- **Titans ([arXiv:2501.00663](https://arxiv.org/abs/2501.00663))**: test‑time adaptive neural memory with explicit surprise/momentum/forgetting dynamics.
- **M+ ([arXiv:2502.00592](https://arxiv.org/abs/2502.00592))**: latent long‑term memory tokens with a co‑trained retriever; retention to 100k–160k+ tokens (as reported).
- **Nested Learning ([arXiv:2512.24695](https://arxiv.org/abs/2512.24695))**: “continuum memory” via multi‑timescale update frequencies; conceptual consolidation lens for external systems.

### Security / trust (memory as attack surface)

- **MINJA ([arXiv:2503.03704](https://arxiv.org/abs/2503.03704))**: query‑only memory injection for systems that store demonstrations/trajectories; shows write‑path is a security boundary.
- **Memory poisoning attack & defense ([arXiv:2601.05504](https://arxiv.org/abs/2601.05504))**: distinguishes ISR vs ASR; shows “initial benign memory” can reduce ASR, while higher retrieval `k` can amplify it; warns that “trust score” can fail as a security control.

### Surveys (useful organizing frames)

- **Zhang et al. survey ([arXiv:2404.13501](https://arxiv.org/abs/2404.13501))**: broad checklist of memory forms/ops/evaluation (pre‑2025 wave).
- **Hu et al. survey ([arXiv:2512.13564](https://arxiv.org/abs/2512.13564))**: unifying triangle **Forms ↔ Functions ↔ Dynamics** + trustworthiness frontier.
- **Yang et al. graph survey ([arXiv:2602.05665](https://arxiv.org/abs/2602.05665))**: graph‑centric lifecycle **extract → store → retrieve → evolve** and operator taxonomy.

## 2) A shared vocabulary: forms, functions, dynamics, and the pipeline

The 2026 surveys are useful because “memory” is overloaded. A workable builder vocabulary is:

### 2.1 Forms (representation substrate)

- **Token / artifact memory** (inspectable): notes, facts, episodes, pages, tool outputs (Mem0, ENGRAM, Zep, GAM, Hindsight, shisad plan).
- **Graph memory** (structured artifact): entity–relation edges with time validity (Zep, Mem0g, Memoria, AriGraph).
- **Activation memory** (inference‑coupled): KV‑cache / activation injection (MemOS).
- **Parametric / latent memory** (model‑internal): online weight updates (Titans), latent tokens (M+). Powerful, but hard to govern.

### 2.2 Functions (what the memory is for)

Across papers, “long‑term memory” splits into at least:

- **Episodic evidence**: what happened when (LoCoMo, Zep episodes, EverMemOS MemCells, HiMem episodes, GAM pages).
- **Semantic facts / profile**: stable facts/preferences (Mem0 facts, Memoria KG, TiMem profile, HiMem notes).
- **Task/state memory**: ledgers, state machines, and “current state after transitions” (StructMemEval; EverMemBench decision trajectories).
- **Constraints**: goals/values/state/causal constraints that shape behavior even when not asked directly (LoCoMo‑Plus).
- **Procedural / experiential memory**: how‑to guidance, workflows, tool recipes, and “lessons learned” (ENGRAM procedural, ReMe, Evo‑Memory, Live‑Evo).
- **Working memory / compilation scratch**: bounded context that is continuously re‑packed (AgeMem STM tools; RLM programmable reading).

### 2.3 Dynamics (how memory changes over time)

Most production failures happen in dynamics, not retrieval:

- **Formation**: extraction, commit‑time gates, schemas, provenance (SimpleMem compression; Mnemosyne commitment gates; Mem0 ops).
- **Evolution**: dedup/merge, pruning/decay, consolidation tiers, re‑linking (TiMem/EverMemOS/HiMem; Mnemosyne refresh; Zep community refresh).
- **Correction**: explicit version semantics (Zep validity intervals; MemOS version chains; Hindsight belief updates) vs silent overwrite/delete.
- **Utility feedback**: memory‑on/off evaluation or proxies (“echo/fizzle”‑like) to adapt weights/policies (Live‑Evo; ReMe; Evo‑Memory).
- **Sharing & boundaries**: multi‑party/multi‑group scope and access control (EverMemBench pressures this; MemOS includes governance; shisad plan makes it central).

### 2.4 The pipeline (LongMemEval + extensions)

LongMemEval’s **indexing → retrieval → reading** is the right backbone, but SOTA systems add two bookends:

0. **Policy / trust gating** (before indexing): what is allowed to persist; how it’s labeled (security boundary).
1. **Indexing**: turn raw inputs into memory units (episodes/notes/facts/attributes) with metadata.
2. **Retrieval**: candidate generation (hybrid search; graph operators; time filters).
3. **Reading / compilation**: fuse, rerank, enforce token budgets, and produce a stable “MemoryPack”.
4. **Post‑hoc maintenance**: consolidation jobs, pruning, utility feedback, corrections propagation.

## 3) Mechanism catalog (what techniques are actually used)

### 3.1 Evidence‑first vs derived‑first designs

There’s a deep split in the literature:

- **Evidence‑first (recommended for correctness/safety)**: keep raw episodes/pages, and make everything else derived:
  - Zep: episodes → facts/entities/communities with validity intervals.
  - GAM: page‑store + memos; compile context JIT.
  - Hindsight: objective facts separated from derived observations and subjective beliefs.
  - EverMemOS/HiMem: explicit episode objects plus higher‑level notes/scenes.
- **Derived‑first (cheap, but brittle)**: store only extracted facts/notes and hope they stay correct:
  - Mem0/ENGRAM style “facts” stores (though Mem0 keeps summaries/recency windows).
  - Many RL CRUD approaches (Memory‑R1/AgeMem) assume the memory bank is the “truth”.

Builder consequence for `shisad`: if you want auditability and correction semantics, you need an episodic evidence tier even if you also store compact notes.

### 3.2 Commit‑time gates (what prevents memory bloat)

Scaling pressures force commit‑time selection:

- **Substance + redundancy gates**: Mnemosyne uses “substantial vs mundane” + redundancy pairing; SimpleMem uses an implicit “semantic density” gate; these are write‑time filters.
- **Explicit ops (dedup/merge/delete)**: Mem0 uses LLM‑selected CRUD ops; Memory‑R1/AgeMem learn those decisions.
- **Segmentation gates**: EverMemOS (semantic segmentation), HiMem (topic shift or surprise) decide episode boundaries; TiMem uses temporal tiers.

The common failure mode: *gates that delete history* (drop newest redundant node; hard delete contradictions) solve bloat but break “corrections without forgetting”.

### 3.3 Typed memory objects (what makes retrieval precise)

Many “strong” systems force typing:

- ENGRAM’s episodic/semantic/procedural split is a minimal, high‑leverage typing strategy.
- Hindsight’s separation (world/experience/observation/opinion) is a richer “epistemic typing” strategy: evidence vs belief is explicit.
- EverMemOS MemCells (episode + facts + foresight validity) are a “narrative + atoms” pattern.
- MemInsight adds **derived attributes** so retrieval can filter by stable fields (event/time/topic/intent).
- StructMemEval shows why “typed structures” (ledgers/state machines) matter: a vector store of snippets can’t reliably do state tracking and reconciliation.

### 3.4 Retrieval operators: top‑k isn’t the whole story

The field is moving from “vector top‑k” to explicit operator stacks:

- **Hybrid candidate generation**: dense + sparse (BM25) + symbolic filters (SimpleMem; Zep; Hindsight).
- **Graph operators**: BFS neighborhood expansion, spreading activation, node‑distance reranking (Zep, Hindsight, AriGraph; Mnemosyne traversal).
- **Time operators**:
  - validity intervals and invalidation (Zep),
  - occurrence intervals overlap (Hindsight),
  - recency weighting (Memoria),
  - time‑tier selection (TiMem).
- **Fusion + rerank**: RRF + cross‑encoder rerank shows up explicitly (Hindsight) and implicitly as “retrieval stack” best practice (Zep).

### 3.5 Reading/compilation: the “MemoryPack” layer

SOTA systems increasingly treat compilation as its own step:

- **Budgeted packing**: ENGRAM enforces strict evidence budgets; HEMA caps tokens; Hindsight exposes a token‑budgeted recall API.
- **Conflict surfacing**: systems that preserve history (Zep, Hindsight) can present conflicts as conflicts; delete/overwrite systems often can’t.
- **Sufficiency loops**:
  - EverMemOS verifies “necessary and sufficient” context, and rewrites the query if insufficient.
  - HiMem best‑effort retrieval tries notes first, then falls back to episodes if insufficient.
  - GAM’s researcher reflects and expands search if needed.
- **Programmable reading**: RLMs suggest an extreme approach—treat reading as sandboxed code and recursive subcalls—useful for “hard mode” compilation.

### 3.6 Consolidation: multi‑timescale derived views

If you operate for weeks/months, consolidation is the only way out:

- **Temporal hierarchies**: TiMem (segment→session→day→week→profile) and similar.
- **Episode→scene→profile**: EverMemOS MemCells→MemScenes; HiMem episodes→notes; Mnemosyne core summary; Zep communities.
- **Reconsolidation**: HiMem updates notes based on episodes; A‑Mem “evolves” notes; Live‑Evo updates experience weights and meta‑guidelines; ReMe prunes stale experiences.
- **Continuum lens**: Nested Learning’s CMS suggests thinking in **update frequencies**: some memory should change hourly, some weekly, some only with explicit review.

## 4) Corrections and historical memory (“don’t forget you used to think X”)

Updates are no longer edge cases:
- LongMemEval explicitly tests knowledge updates and abstention.
- EverMemBench’s multi‑party “final state” questions implicitly require a version semantics.
- StructMemEval’s state tracking punishes systems that surface stale facts without state context.

### 4.1 Correction semantics in the literature

- **Hard delete / overwrite** (simple, but loses history): Mem0’s base CRUD includes `DELETE`; Memory‑R1 and AgeMem also include delete as an action.
- **Soft invalidation / validity intervals** (history preserved): Zep’s `tvalid/tinvalid` is the clearest “production‑grade” correction semantics in this set.
- **Version chains / rollback**: MemOS explicitly discusses version chains and rollback; this is the right shape for auditable systems, but the paper leaves many details to implementations.
- **Belief evolution with confidence**: Hindsight’s opinion network makes “belief updates” explicit and keeps that history.
- **Recency weighting**: Memoria’s exponential decay is a lightweight compromise when you don’t have full truth maintenance; it is not a substitute for explicit invalidation.

### 4.2 Why this matters beyond “correctness”

Preserving “past belief states” is also a **safety and governance** primitive:
- you can investigate why a memory was used,
- you can quarantine/rollback if something is poisoned,
- and you can explain changes to users (“you told me X on date Y; later you corrected it on date Z”).

This lines up with “corrections as first‑class” thinking in Reality Check (`/home/lhl/github/lhl/realitycheck/docs/PLAN-analysis-rigor-improvement.md`), where corrections are tracked append‑only and propagate impact instead of silently mutating records.

## 5) Evaluation: what to measure (so we don’t fool ourselves)

The benchmarks are complementary; no single suite covers everything:

- **Recall under long horizons**: LoCoMo, LongMemEval.
- **Updates + abstention**: LongMemEval.
- **Multi‑party fragmentation + oracle diagnostics**: EverMemBench.
- **Latency/capacity cliffs**: MemBench (explicit RT/WT), plus Mem0/ENGRAM system reporting.
- **Constraint memory**: LoCoMo‑Plus.
- **Structure formation**: StructMemEval.
- **Streaming experience reuse**: Evo‑Memory (order robustness; storing failures; step efficiency).

Key evaluation lessons that reoccur across papers:

1. **Stage‑wise instrumentation is mandatory**: measure indexing quality, retrieval quality (oracle evidence / recall@k), and reading/compilation separately (EverMemBench’s oracle is the gold pattern).
2. **Token + p95 latency belongs next to accuracy**: Mem0/ENGRAM make this explicit; GAM shows how “deep research” can win but be too slow.
3. **Judge‑based metrics need guardrails**: use human agreement checks, cross‑judge stability, and “hint vs no‑hint” diagnostics (StructMemEval) to isolate failure modes.
4. **Measure “retrieval harm”**: LoCoMo’s observation that wrong retrieval hurts should be operationalized as a regression suite (detect and surface conflicts, avoid silent override).
5. **Measure robustness to noise and order**: Evo‑Memory’s order shifts and failed experiences are closer to production reality than curated QA.

## 6) Security and trust: memory is part of the attack surface

Two papers make the point unavoidably:

- **MINJA**: query‑only injection can poison “memory‑as‑demonstrations” even without DB access; shared memory + similarity retrieval + stored reasoning traces is a dangerous combo.
- **Memory poisoning attack/defense**: the same attack can weaken with “good initial memory”, but retrieval `k` and trust gating can re‑open it; trust scores can fail as security controls.

Practical builder implications (also aligned with the shisad plan):
- **Treat memory as data, never instructions**; never place memory into trusted/system prompt segments.
- **Write gating + quarantine** is non‑negotiable for any durable store, and *especially* for procedural/meta‑guideline memory.
- **Scope/tenant boundaries** must be explicit (EverMemBench pressures this; MINJA assumes shared pools).
- **Demonstrations are high influence**: avoid storing chain‑of‑thought / tool traces as reusable few‑shot examples unless sandboxed and provenance‑scoped.

## 7) Mapping to shisad (what’s already planned vs what to add)

`shisad`’s `shisad internal long-term memory plan (private)` already aligns strongly with the best “2026‑shaped” ideas:
- explicit memory tiers (transcripts/recall vs retrievable corpus vs typed LTM entries vs KG),
- append‑only supersedes semantics + provenance,
- capability‑aware retrieval, quarantine, and instruction/data boundary rules,
- explicit compilation/budgeting via MemoryPack‑style thinking.

What the paper set above suggests to **add or prioritize** (implementation‑relevant deltas):

1. **Benchmark‑driven evaluation adapters**
   - Add harnesses for: LongMemEval (updates/abstention), EverMemBench (oracle diagnostics), LoCoMo‑Plus (constraint consistency), StructMemEval (structure), MemBench (RT/WT + capacity cliffs), Evo‑Memory (streaming experience reuse).
2. **Procedural memory firewall + lifecycle**
   - Treat procedural/experience/meta‑guideline memory as a separate tier with stricter gates (ReMe, Live‑Evo, Evo‑Memory).
3. **Sufficiency verification as an API**
   - Add “is this memory pack sufficient?” checks and query rewrite / retrieval expansion loops (EverMemOS, HiMem, GAM).
4. **Structured memory primitives beyond facts**
   - Add explicit support (schemas + validators) for ledgers, state transitions, and hierarchical relations (StructMemEval).
5. **Derived‑metadata layer**
   - Implement MemInsight‑style derived attributes as a recomputable, versioned view to make retrieval precise (attribute filters + symbolic constraints + embeddings).
6. **History‑preserving correction semantics everywhere**
   - Ensure all derived views (profiles, summaries, KG edges, procedural items) are versioned and provenance‑linked, not silently overwritten (Hindsight/Zep/Nested Learning lens).
7. **Utility feedback loops**
   - Instrument “memory helped vs hurt” and use it to adjust retrieval weights and consolidation/pruning schedules (Live‑Evo measurement discipline; MemBench RT/WT).

Roadmap framing (high level; consistent with a v0.7 memory overhaul):
- **v0.7 core**: typed memory objects + provenance + versioned corrections + MemoryPack compilation + write gating/quarantine + benchmark adapters.
- **v0.7.1+ hardening**: MINJA/poisoning regression harnesses; procedural memory firewall; capability‑scoped retrieval defaults.
- **later**: optional graph indices/communities (Zep‑like), deep research/JIT compilation modes (GAM‑like), programmable reading (RLM‑like) behind strict sandboxes.

## Appendix: Per‑paper deep dives (entry points)

Deep dives live in the root and are linked from `README.md`. If you want the “mechanism spec” for any paper, start with:
- `PUNCHLIST-academic-industry.md` (the complete list, with artifact paths)
- `README.md` (tables linking to each `references/*.md` and `ANALYSIS-arxiv-*.md`)
