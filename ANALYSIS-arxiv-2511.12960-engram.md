---
title: "Analysis — ENGRAM (Patel et al., 2026)"
date: 2026-02-22
type: analysis
paper_id: "arxiv:2511.12960"
paper_title: "ENGRAM: Effective, Lightweight Memory Orchestration for Conversational Agents"
source:
  - references/patel-engram.md
  - references/papers/arxiv-2511.12960.pdf
related:
  - ANALYSIS-academic-industry.md
  - /home/lhl/github/shisa-ai/shisad-dev/planning/PLAN-longterm-memory.md
---

# Analysis — ENGRAM (Patel et al., 2026)

ENGRAM is a “simplicity wins” memory system paper. Its argument is that you do not need an OS-like scheduler or a complex knowledge graph to get strong long-horizon conversational memory. Instead, you can:

1) **type** memories (episodic / semantic / procedural),  
2) use a small router + per-type extractors to normalize records, and  
3) do straightforward dense retrieval with a strict evidence budget.

The reported results are strong on LoCoMo and LongMemEval, especially when you include token/latency numbers.

## TL;DR

- **Problem**: Long-horizon assistants need to remember events, facts/preferences, and “how-to” instructions, but many systems add complexity (graphs, schedulers) that’s hard to reproduce and operate.
- **Core idea**: Use three canonical memory types (**episodic / semantic / procedural**) with a single router + single dense retriever; merge results with simple set ops; inject as evidence.
- **Memory types covered**:
  - episodic (event timeline),
  - semantic (stable facts/preferences),
  - procedural (instructions/workflows).
- **Key primitives / operations**:
  - routing mask `b_t ∈ {0,1}^3`,
  - typed record schemas with temporal anchors,
  - per-type top-`k` retrieval + merge/dedup/truncate to final budget (default K=25).
- **Write path**: per-turn routing → per-type extraction prompt → embed + persist record (SQLite).
- **Read path**: query embedding → per-type top-`k` neighbors → merge/dedup/truncate → serialize as `timestamp: text` → answer with deterministic template.
- **Maintenance**: largely “budgeting + dedup at read-time”; does not emphasize versioning/corrections/TTL.
- **Evaluation (as reported)**:
  - LoCoMo: overall LLM-judge 77.55 (gpt-4o-mini backbone), beating several baselines with ~916 memory tokens.
  - LongMemEvalS: overall 71.40 vs 56.20 full-context while using ~1.0–1.2k tokens vs ~101k.
  - Latency: median total 1.487s on LoCoMo with p95 1.819s.
- **Main caveats**: “lightweight” refers to orchestration simplicity, not necessarily on-device inference; correction semantics and security are not central.
- **Most reusable takeaway for shisad**: typed memory stores + strict evidence budgets are high-leverage and implementable early; add shisad-grade provenance/versioning and write-policy gating on top.

## Stage 1 — Descriptive (what the paper proposes)

### 1.1 Architecture summary

ENGRAM has five steps (their Figure 1):
1. **Router**: decide which store(s) a turn updates (3-bit mask).
2. **Typed extractors**: convert the turn into normalized JSON for each selected type + request an embedding.
3. **Per-type dense retrieval**: at query time, retrieve top-`k` by cosine similarity from each store.
4. **Aggregation**: merge + dedup across stores and truncate to a fixed total budget (default K=25).
5. **Prompt injection**: serialize records and answer via a fixed template.

### 1.2 Data model: typed records with temporal anchors

The key operational decision is to force memories into typed schemas:

- Episodic record: `(title, summary, timestamp, embedding)`
- Semantic record: `(fact, timestamp, embedding)`
- Procedural record: `(title, content, timestamp, embedding)`

The episodic extractor prompt puts special emphasis on temporal normalization (convert “yesterday” into an absolute timestamp based on conversation timestamp, and avoid relative words in the summary).

### 1.3 Read path: representational coverage via per-type top-k

Per-type retrieval guarantees each “evidence mode” is present in the final evidence set before truncation:
- events/timeline evidence from episodic,
- stable facts/preferences from semantic,
- protocols/instructions from procedural.

Then a deterministic formatting step serializes each record as `timestamp: text(record)` and injects it into the answering prompt.

### 1.4 What ENGRAM implicitly assumes

- Dense similarity search over normalized records is “good enough” for long-horizon QA if you:
  - enforce typing (reduce competition within a store),
  - keep a strict evidence budget (avoid noise flooding),
  - and use a strong answering model.
- Long-horizon “memory” for benchmarks like LoCoMo/LongMemEval can be treated mostly as a **retrieval + reading** problem; explicit maintenance semantics are not a first-class objective.

## Stage 2 — Evaluative (what it measures, what’s missing, what breaks)

### 2.1 Evaluation setup (as reported)

LoCoMo:
- Backbone: gpt-4o-mini (held fixed across baselines, per paper).
- Metrics: LLM-as-a-judge (mean ± stdev), plus token-level F1 and BLEU-1 as diagnostics.
- Baselines: Mem0, MemOS, Zep, LangMem, OpenAI memory, RAG (various chunk sizes and `k`), full-context control.
- Reports “Chunk/Mem Tok” (average evidence token count) and latency (p50/p95 search + total).

LongMemEvalS:
- Uses the same ENGRAM config validated on LoCoMo (“freeze config”).
- Compares only vs full-context to isolate horizon scaling effects.

### 2.2 Main results (as reported)

LoCoMo overall (Table 1 and Table 2):

| Method | Overall Judge | Avg memory tokens | Total p50 | Total p95 |
|---|---:|---:|---:|---:|
| full-context | 72.60 ± 0.07 | (full history) | 9.940s | 17.832s |
| memOS (Top-k=20) | 72.99 ± 0.14 | 1593 | 4.965s | 7.957s |
| mem0 (Top-k=20) | 64.73 ± 0.17 | 1177 | 0.718s | 1.630s |
| ENGRAM (Top-k=20) | **77.55 ± 0.13** | **916** | **1.487s** | **1.819s** |

LongMemEvalS overall (Table 3):
- Full-context (101K tokens): Overall judge 56.20%
- ENGRAM (1.0K–1.2K tokens): Overall judge 71.40%

Ablations (Appendix Table 4):
- Collapsing typed stores into a single undifferentiated store yields overall 46.56% (vs ENGRAM 77.55%).

Budgeting (Appendix A.2):
- Accuracy grows with K, but token cost grows much faster; the paper argues a “knee” around **K≈25**.

### 2.3 Strengths

- Builder clarity: the primitives are minimal and easy to re-implement (router + schemas + cosine retrieval + merge).
- Reports latency and evidence token budgets, making the trade-offs concrete.
- Demonstrates that typed separation is not just cosmetic via strong ablations.

### 2.4 Limitations / open questions (builder lens)

- **Correction semantics**: without explicit update/versioning, the system can accumulate conflicting facts (“user likes X” then later “user dislikes X”). Temporal anchors help, but the conflict policy is not explicit.
- **Security / poisoning**: write-time extraction is LLM-driven, so an adversary could inject instruction-like content into “procedural” memory unless write policies gate it.
- **Metric dependence**: the reported wins are primarily on an LLM-as-a-judge metric; judge prompts and models can introduce hidden variance.
- **“Lightweight” scope**: the orchestration is lightweight, but the evaluation uses cloud models (gpt-4o-mini, text-embedding-3-small), so edge viability is not established by this paper alone.

## Stage 3 — Dialectical / Synthesis hooks (how this fits + what we steal)

### 3.1 Comparison to adjacent work

- Compared to MemOS/Mem0/Zep: ENGRAM trades away rich lifecycle semantics and graphs in exchange for:
  - strict, typed representation,
  - fixed evidence budgets,
  - and deterministic composition.
- Compared to Memory-R1: ENGRAM is not trying to learn policies; it’s a strong “static baseline” with good engineering hygiene and ablations.

### 3.2 Mapping to shisad (`PLAN-longterm-memory.md`)

What to copy into shisad’s v0.7 memory overhaul:
- Add **typed memory views** (episodic / semantic / procedural) with explicit schemas and budgets per type.
- Add a router (even heuristic first) that decides where a write goes, and keep the decision auditable.
- Separate `k_retrieve_per_type` from `k_final` (`merge → dedup → truncate`) to prevent any one type from dominating.
- Add speaker-attributed banks when evaluating multi-party memory.

What shisad must add beyond ENGRAM:
- Versioned corrections and provenance (don’t rely only on temporal anchors).
- Write-policy gating and taint tracking (especially for procedural memory).

### 3.3 Concrete takeaways (actionable)

**Primitives to add**
- Typed record schemas with explicit `temporal_anchor` rules (absolute timestamps, not “yesterday”).
- Budget objects: `k_per_type` + `k_total`, with token caps and logging.

**Tests / eval adapters to add**
- K-scaling sweep in shisad eval harness (J vs tokens vs latency).
- “Conflict update” tests (preference flips, factual corrections) to see if typed retrieval needs explicit invalidation/supersedes.

## Notes / Corrections & Updates

- Capture date: 2026-02-22
- Paper version reviewed: arXiv v2 (2026-02-03)

