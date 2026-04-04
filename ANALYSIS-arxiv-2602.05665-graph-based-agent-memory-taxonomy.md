---
title: "Analysis — Graph-based Agent Memory Survey (Yang et al., 2026)"
date: 2026-02-22
type: analysis
paper_id: "arxiv:2602.05665"
paper_title: "Graph-based Agent Memory: Taxonomy, Techniques, and Applications"
source:
  - references/yang-graph-based-agent-memory-taxonomy.md
  - references/papers/arxiv-2602.05665.pdf
related:
  - ANALYSIS-academic-industry.md
  - /home/lhl/github/shisa-ai/shisad-dev/planning/PLAN-longterm-memory.md
---

# Analysis — Graph-based Agent Memory Survey (Yang et al., 2026)

This paper is a graph-centric survey that’s useful less for its specific numbers (it’s not an evaluation paper) and more for its **vocabulary**: it decomposes agent memory into a lifecycle and enumerates graph storage/retrieval/evolution techniques with an implementation lens.

For `shisad`, it provides a clean way to reason about “graph memory” without conflating:
- graph *as an index/view* over evidence, vs
- graph *as the canonical store* (with all the safety/versioning consequences).

## TL;DR

- **Contribution type**: survey + taxonomy + resource list.
- **Key framing**: memory lifecycle = **extract → store → retrieve → evolve**.
- **Memory taxonomy axes** (as described):
  - short-term vs long-term,
  - knowledge vs experience memory,
  - non-structural vs structural memory,
  - graph-based memory as a unified perspective.
- **Basic memory ops**: `Write`, `Read`, `Update`, `Delete` (formalized as atomic operations).
- **Storage structures** covered**: knowledge graphs, temporal graphs (bi-temporal semantics), hypergraphs, hierarchical graphs, hybrid graphs.
- **Retrieval operators**: similarity-based, rule-based, graph-traversal-based, temporal-based, and agent-based retrieval.
- **Evolution**: consolidation/abstraction, graph reasoning, and graph reorganization/maintenance.
- **Most reusable takeaway for shisad**: treat graph memory as a derived, maintainable structure with provenance + validity semantics and explicit evolution jobs; don’t ship a graph without a maintenance story.

## Stage 1 — Descriptive (what the survey proposes)

### 1.1 Memory taxonomy (why graphs)

The survey argues graphs are useful because they can:
- model relational dependencies,
- organize hierarchical information,
- support efficient retrieval (via neighborhoods/paths),
and can unify knowledge memory (rules/facts) with experience memory (trajectories/episodes).

### 1.2 Lifecycle lens: extraction → storage → retrieval → evolution

The lifecycle decomposition is builder-friendly:

1. **Memory extraction**
   - transform raw observations/interactions into structured memory units.
2. **Memory storage**
   - place memory units into a graph structure with indexing and organization.
3. **Memory retrieval**
   - retrieve relevant subgraphs/units given a query; choose operators.
4. **Memory evolution**
   - refine the graph over time: consolidate, reason, reorganize.

This matches what we see across systems like Zep/Mem0/AriGraph and helps map disparate papers to the same “slots”.

### 1.3 Graph structures

The survey categorizes graph memory variants:
- **Knowledge graphs** (triples),
- **Temporal graphs** (adds time; references bi-temporal ideas via Graphiti/Zep),
- **Hypergraphs** (multi-ary relations),
- **Hierarchical graphs** (communities/levels),
- **Hybrid architectures** (mix graphs with other stores).

### 1.4 Retrieval operators

It distinguishes:
- similarity-based retrieval (vector similarity + graph),
- rule/constraint-based retrieval (SQL-like constraints),
- graph traversal operators (BFS/neighbor expansion),
- temporal retrieval (time windows, validity),
- agent-based retrieval (planner decides what to traverse / what sources to query).

This taxonomy is helpful for shisad because it turns “graph retrieval” into explicit operator choices rather than a vague “use a KG”.

### 1.5 Evolution mechanisms

The survey treats “evolution” as more than “add nodes”:
- consolidation (merge/summarize),
- reasoning (derive new nodes/edges),
- reorganization (health/quality maintenance; pruning; schema evolution).

## Stage 2 — Critical notes (builder lens)

### 2.1 What surveys often under-specify (and this one partly does)

Even with good taxonomy, a builder still needs:
- concrete schemas for nodes/edges and metadata (time, provenance, confidence, scope),
- conflict semantics and versioning (what happens when facts change),
- guardrails for poisoning (write-path gates; taint; isolation),
- maintenance triggers and costs (background jobs; invariants; repair).

The survey flags some of these as challenges/future directions, but it can’t resolve them alone.

### 2.2 A key practical warning: graphs amplify mistakes

Graph expansion (neighborhood traversal/community summaries) increases recall but can amplify:
- stale/incorrect nodes,
- poisoned nodes,
- cross-scope leakage,
unless you have:
- scoped subgraphs,
- taint/provenance propagation,
- and versioned validity semantics.

## Stage 3 — Mapping to shisad

### 3.1 Where this fits in shisad’s roadmap

For a v0.7 memory overhaul:

1. **Start with canonical evidence + versioning**
   - before building graph indices, define how shisad stores and corrects evidence (supersedes/invalidation).
2. **Add graph as a derived view**
   - build a graph index that can be rebuilt from evidence + derived notes.
3. **Define graph operators**
   - pick explicit retrieval operators (e.g., similarity → BFS expansion → temporal filtering) with token/latency budgets.
4. **Schedule evolution jobs**
   - consolidation and reorganization should be explicit background tasks with logs and metrics.

### 3.2 Concrete shisad primitives suggested by the survey

- `GraphNode` / `GraphEdge` with:
  - `scope` (tenant/project/user),
  - `time_range` / validity,
  - `provenance` (source refs),
  - `confidence` and taint metadata.
- `GraphOperator` (typed): `neighbor_expand`, `time_slice`, `path_query`, `community_summary`, `constraint_filter`.
- `GraphMaintenanceJob`: `merge`, `dedup`, `prune`, `rebuild`, `schema_migrate`.

## Notes / Corrections & Updates

- Capture date: 2026-02-22
- Paper version reviewed: arXiv v1 (2026-02-05)

