# Agentic Memory Research

Research collection on agent memory architectures, persistence patterns, and output quality maintenance for LLM-based agent systems.

## Reference Summaries

| Document | Author | Description |
|----------|--------|-------------|
| [jumperz-agent-memory-stack](references/jumperz-agent-memory-stack.md) | @jumperz | **31-piece memory architecture** split across 3 phases (Core → Reliability → Intelligence). Complete prompt/spec breakdowns for write pipeline, read pipeline, decay, knowledge graph, episodic memory, trust scoring, echo/fizzle feedback loops. The foundational reference that others build on. |
| [joelhooks-adr-0077-memory-system-next-phase](references/joelhooks-adr-0077-memory-system-next-phase.md) | @joelhooks | **ADR for joelclaw** (personal AI Mac Mini). Maps existing production system (~6 days running, Qdrant 1,343 points) against jumperz's 31 pieces. Plans 3 increments: retrieval quality (score decay, query rewriting), storage quality (dedup, nightly maintenance), feedback loop (echo/fizzle). Includes detailed gap analysis. |
| [coolmanns-openclaw-memory-architecture](references/coolmanns-openclaw-memory-architecture.md) | coolmanns | **12-layer production memory stack** for OpenClaw with 14 agents. SQLite+FTS5 knowledge graph (3,108 facts), llama.cpp GPU embeddings (768d, 7ms), three runtime plugins (continuity, stability, graph-memory). 100% recall on 60-query benchmark. Includes activation/decay system, domain RAG, session boot sequences. |
| [drag88-agent-output-degradation](references/drag88-agent-output-degradation.md) | @drag88 (Aswin) | **"Why Your Agent's Output Gets Worse Over Time"** — multi-agent convergence problem. 4-tier memory (working → episodic → semantic → procedural). 3-layer enforcement pipeline (YAML regex → Gemini LLM judge → self-learning loop). Core insight: convert expensive runtime LLM checks into free static regex rules over time. |
| [versatly-clawvault](references/versatly-clawvault.md) | Versatly (@drag88) | **ClawVault** npm CLI tool — structured markdown memory vault with observation pipeline, knowledge graph, session lifecycle (wake/sleep/checkpoint), task/project primitives, Obsidian integration, OpenClaw hooks. 449+ tests. v2.6.1. |

## Paper Reference Summaries (Academic / Industry)

| Document | Author | Description |
|----------|--------|-------------|
| [hu-evermembench](references/hu-evermembench.md) | Hu et al. | **EverMemBench** benchmark for >1M-token multi-party, multi-group interleaved conversations; diagnoses multi-hop collapse, temporal/versioning difficulty, and retrieval-bottlenecked “memory awareness”. |
| [li-locomoplus](references/li-locomoplus.md) | Li et al. | **LoCoMo-Plus**: evaluates beyond-factual “cognitive memory” (latent constraints like state/goals/values) under cue–trigger semantic disconnect, using constraint-consistency + LLM-judge evaluation. |
| [maharana-locomo](references/maharana-locomo.md) | Maharana et al. | **LoCoMo** dataset + benchmark for very long-term multi-session conversations (300 turns, multimodal) grounded in personas + temporal event graphs; evaluates QA + event summarization + multimodal generation. |
| [wu-longmemeval](references/wu-longmemeval.md) | Wu et al. | **LongMemEval** benchmark + design decomposition (**indexing → retrieval → reading**) and system optimizations (value granularity, key expansion, time-aware query expansion). |
| [chhikara-mem0](references/chhikara-mem0.md) | Chhikara et al. | **Mem0**: production-oriented long-term memory pipeline with explicit ops (**ADD/UPDATE/DELETE/NOOP**) and an optional **graph memory** variant; reports quality + token/latency tradeoffs on LoCoMo. |
| [rasmussen-zep](references/rasmussen-zep.md) | Rasmussen et al. | **Zep**: production memory layer built on **Graphiti**, a **bi-temporal** knowledge graph (episodes → entities/facts → communities) with validity intervals and invalidation-based corrections; evaluated on DMR + LongMemEval. |
| [li-memos](references/li-memos.md) | Li et al. | **MemOS**: OS-like memory control plane with MemCube (payload+metadata), lifecycle/scheduling, governance (ACL/TTL/audit), and multi-substrate memory (plaintext/activation/KV/parameter/LoRA). |
| [behrouz-nested-learning](references/behrouz-nested-learning.md) | Behrouz et al. | **Nested Learning / CMS / Hope**: reframes memory as **multi-timescale update dynamics** (continuum memory blocks updated at different frequencies) with implications for consolidation and “corrections without forgetting”. |
| [dong-minja](references/dong-minja.md) | Dong et al. | **MINJA**: practical **memory injection attack** on “memory-as-demonstrations” agents via query-only interaction (bridging steps + progressive shortening); motivates write-time gates, isolation, and safer memory representations. |
| [anokhin-arigraph](references/anokhin-arigraph.md) | Anokhin et al. | **AriGraph**: knowledge-graph world model that links **episodic observation nodes** to extracted semantic triplets; two-stage retrieval (semantic→episodic) for planning/exploration in text-game environments. |
| [behrouz-titans](references/behrouz-titans.md) | Behrouz et al. | **Titans**: long-context architecture with an online-updated **neural memory module** (test-time learning) plus persistent task memory; provides explicit primitives for surprise-based salience and forgetting. |
| [ahn-hema](references/ahn-hema.md) | Ahn | **HEMA**: hippocampus-inspired dual memory for long conversations (running compact summary + FAISS episodic vector store) with explicit prompt budgeting, pruning (“semantic forgetting”), and summary-of-summaries consolidation. |
| [tan-membench](references/tan-membench.md) | Tan et al. | **MemBench**: benchmark/dataset for agent memory covering **participation vs observation** scenarios and **factual vs reflective** memory, with metrics for accuracy/recall/capacity and read/write-time efficiency. |

## Deep Dive Analyses

Root-level critical analyses intended for synthesis work. These reference the summaries above, but focus on coherence, evidence quality, risks, and synthesis-ready claim framing.

| Synthesis | Based on | Focus |
|----------|----------|-------|
| [ANALYSIS](ANALYSIS.md) | `ANALYSIS-*.md` + shisad docs + Mem0/Letta baselines | Cross-system comparison (techniques + memory types), plus mapping to shisad and “traditional” RAG-ish memory |
| [ANALYSIS-academic-industry](ANALYSIS-academic-industry.md) | paper `ANALYSIS-arxiv-*.md` + shisad plan | Academic/industry synthesis: benchmarks vs systems vs attacks, with “what’s missing in shisad” framing |

| Analysis | Based on | Focus |
|----------|----------|-------|
| [ANALYSIS-jumperz-agent-memory-stack](ANALYSIS-jumperz-agent-memory-stack.md) | `references/jumperz-agent-memory-stack.md` | Checklist critique (semantics, failure modes, missing evaluation), synthesis-ready takeaways + claims table |
| [ANALYSIS-joelhooks-adr-0077-memory-system-next-phase](ANALYSIS-joelhooks-adr-0077-memory-system-next-phase.md) | `references/joelhooks-adr-0077-memory-system-next-phase.md` | Increment plan critique (decay, rewrite, dedup, echo/fizzle), validation plan + claims |
| [ANALYSIS-coolmanns-openclaw-memory-architecture](ANALYSIS-coolmanns-openclaw-memory-architecture.md) | `references/coolmanns-openclaw-memory-architecture.md` + `vendor/openclaw-memory-architecture/` | Layered stack critique with benchmark-method verification, operational risks, doc drift notes |
| [ANALYSIS-drag88-agent-output-degradation](ANALYSIS-drag88-agent-output-degradation.md) | `references/drag88-agent-output-degradation.md` | Convergence + enforcement pattern critique (judge→rule distillation), measurement gaps, risks |
| [ANALYSIS-versatly-clawvault](ANALYSIS-versatly-clawvault.md) | `references/versatly-clawvault.md` + `vendor/clawvault/` | Product/tooling critique (surface area, hooks, qmd dependency), security posture, missing benchmarks |

## Paper Deep Dive Analyses (Academic / Industry)

| Analysis | Based on | Focus |
|----------|----------|-------|
| [ANALYSIS-arxiv-2602.01313-evermembench](ANALYSIS-arxiv-2602.01313-evermembench.md) | `references/hu-evermembench.md` + `references/papers/arxiv-2602.01313.pdf` | Benchmark critique emphasizing version semantics, multi-party fragmentation, oracle diagnostics, and shisad mapping |
| [ANALYSIS-arxiv-2402.17753-locomo](ANALYSIS-arxiv-2402.17753-locomo.md) | `references/maharana-locomo.md` + `references/papers/arxiv-2402.17753.pdf` | Dataset/benchmark critique with episodic-memory implications (event graphs, multimodal, RAG harm) and shisad mapping |
| [ANALYSIS-arxiv-2410.10813-longmemeval](ANALYSIS-arxiv-2410.10813-longmemeval.md) | `references/wu-longmemeval.md` + `references/papers/arxiv-2410.10813.pdf` | Benchmark and system-design decomposition (indexing/retrieval/reading), with mapping to shisad primitives |
| [ANALYSIS-arxiv-2602.10715-locomoplus](ANALYSIS-arxiv-2602.10715-locomoplus.md) | `references/li-locomoplus.md` + `references/papers/arxiv-2602.10715.pdf` | Beyond-factual “cognitive memory” benchmark critique (latent constraints) and implications for safe constraint/procedural memory |
| [ANALYSIS-arxiv-2504.19413-mem0](ANALYSIS-arxiv-2504.19413-mem0.md) | `references/chhikara-mem0.md` + `references/papers/arxiv-2504.19413.pdf` | System deep dive emphasizing explicit memory ops, graph-memory tradeoffs, deployment metrics (tokens/p95), and shisad mapping (versioned corrections vs delete) |
| [ANALYSIS-arxiv-2501.13956-zep](ANALYSIS-arxiv-2501.13956-zep.md) | `references/rasmussen-zep.md` + `references/papers/arxiv-2501.13956.pdf` | System deep dive emphasizing bi-temporal validity semantics, episodic+semantic+community graph tiers, hybrid retrieval (BM25/embeddings/BFS), and implications for shisad versioned memory |
| [ANALYSIS-arxiv-2507.03724-memos](ANALYSIS-arxiv-2507.03724-memos.md) | `references/li-memos.md` + `references/papers/arxiv-2507.03724.pdf` | System deep dive emphasizing MemCube metadata, multi-substrate memory (plaintext/KV/parameter), lifecycle/scheduling/governance, and mapping to shisad primitives |
| [ANALYSIS-arxiv-2512.24695-nested-learning](ANALYSIS-arxiv-2512.24695-nested-learning.md) | `references/behrouz-nested-learning.md` + `references/papers/arxiv-2512.24695.pdf` | Conceptual deep dive on multi-timescale “continuum memory” and consolidation dynamics; mapping to shisad tiered memory + versioned corrections |
| [ANALYSIS-arxiv-2503.03704-minja](ANALYSIS-arxiv-2503.03704-minja.md) | `references/dong-minja.md` + `references/papers/arxiv-2503.03704.pdf` | Security deep dive on query-only memory injection attacks; implications for write-policy, provenance/taint, isolation, and “don’t store demonstrations” patterns |
| [ANALYSIS-arxiv-2407.04363-arigraph](ANALYSIS-arxiv-2407.04363-arigraph.md) | `references/anokhin-arigraph.md` + `references/papers/arxiv-2407.04363.pdf` | System deep dive emphasizing episodic↔semantic memory linking, graph-structured retrieval for planning/exploration, and implications for shisad episode objects + provenance + correction semantics |
| [ANALYSIS-arxiv-2501.00663-titans](ANALYSIS-arxiv-2501.00663-titans.md) | `references/behrouz-titans.md` + `references/papers/arxiv-2501.00663.pdf` | Architecture deep dive emphasizing test-time-learning neural memory (surprise/momentum/forgetting), Titans MAC/MAG/MAL variants, and how to translate salience/decay ideas into shisad’s external memory framework |
| [ANALYSIS-arxiv-2504.16754-hema](ANALYSIS-arxiv-2504.16754-hema.md) | `references/ahn-hema.md` + `references/papers/arxiv-2504.16754.pdf` | System deep dive emphasizing dual memory (summary + vector store), explicit prompt budgeting, pruning/consolidation policies, and evaluation-rigor cautions for shisad adoption |
| [ANALYSIS-arxiv-2506.21605-membench](ANALYSIS-arxiv-2506.21605-membench.md) | `references/tan-membench.md` + `references/papers/arxiv-2506.21605.pdf` | Benchmark deep dive emphasizing multi-scenario (participant vs observer) and multi-level (factual vs reflective) evaluation, plus latency/capacity metrics and implications for shisad eval harnesses |

## Source Threads & Links

| Source | URL |
|--------|-----|
| @jumperz memory stack thread | https://x.com/jumperz/status/2024841165774717031 |
| @joelhooks ADR tweet | https://x.com/joelhooks/status/2024947701738262773 |
| joelclaw ADR-0077 | https://joelclaw.com/adrs/0077-memory-system-next-phase |
| @drag88 article | https://x.com/drag88/status/2022551759491862974 |

## File Tree

```
agentic-memory/
├── README.md                          ← this file
├── ANALYSIS.md                         ← synthesis + comparison
├── ANALYSIS-academic-industry.md       ← academic/industry synthesis
├── ANALYSIS-jumperz-agent-memory-stack.md
├── ANALYSIS-joelhooks-adr-0077-memory-system-next-phase.md
├── ANALYSIS-coolmanns-openclaw-memory-architecture.md
├── ANALYSIS-drag88-agent-output-degradation.md
├── ANALYSIS-versatly-clawvault.md
├── PUNCHLIST-academic-industry.md     ← tracking checklist for paper deep dives
├── templates/                         ← templates for paper analyses/summaries
│
├── references/                        ← summarized reference docs (markdown w/ frontmatter)
│   ├── 1-full-agent-memory-build.jpg  ← jumperz card 1: memory storage
│   ├── 2-feeds-into.jpg               ← jumperz card 2: memory intelligence
│   ├── jumperz-agent-memory-stack.md
│   ├── joelhooks-adr-0077-memory-system-next-phase.md
│   ├── coolmanns-openclaw-memory-architecture.md
│   ├── drag88-agent-output-degradation.md
│   └── versatly-clawvault.md
│   ├── hu-evermembench.md
│   ├── li-locomoplus.md
│   ├── maharana-locomo.md
│   ├── wu-longmemeval.md
│   ├── chhikara-mem0.md
│   └── papers/                        ← archived PDFs + text snapshots
│       ├── README.md
│       ├── arxiv-*.pdf
│       └── arxiv-*.md
│
└── vendor/                            ← cloned source repos
    ├── openclaw-memory-architecture/  ← github.com/coolmanns/openclaw-memory-architecture
    │   ├── README.md
    │   ├── PROJECT.md
    │   ├── CHANGELOG.md
    │   ├── docs/
    │   │   ├── ARCHITECTURE.md        ← full 12-layer technical reference
    │   │   ├── knowledge-graph.md     ← graph search pipeline, benchmarks
    │   │   ├── context-optimization.md
    │   │   ├── embedding-setup.md
    │   │   ├── benchmark-process.md
    │   │   ├── benchmark-results.md
    │   │   ├── code-search.md
    │   │   └── COMPARISON.md
    │   ├── schema/
    │   │   └── facts.sql              ← SQLite schema for knowledge graph
    │   ├── scripts/                   ← init, seed, search, ingest, decay, benchmark, telemetry
    │   ├── templates/                 ← starter files (active-context, gating-policies, etc.)
    │   └── plugin-graph-memory/       ← OpenClaw plugin (JS)
    │
    └── clawvault/                     ← github.com/Versatly/clawvault
        ├── README.md
        ├── PLAN.md                    ← issue #4: ledger, reflect, replay, archive
        ├── CHANGELOG.md
        ├── SKILL.md
        ├── package.json               ← npm: clawvault, v2.6.1
        ├── src/
        │   ├── commands/              ← archive, context, inject, observe, reflect, replay, wake, sleep, task, project, ...
        │   ├── observer/              ← compressor, reflector, router, session-watcher
        │   ├── lib/                   ← vault, memory-graph, ledger, observation-format, session-utils
        │   └── cli/
        ├── bin/                       ← CLI entry + command registration modules
        ├── hooks/                     ← OpenClaw hook handler
        ├── dashboard/                 ← web dashboard (vault parser, graph diff)
        ├── schemas/
        ├── scripts/
        ├── templates/
        └── tests/
```

## Key Themes Across Sources

- **Phased build order matters**: Core memory first (write/read/decay), reliability second (dedup/maintenance/recovery), intelligence last (graphs/trust/cross-agent). Building out of order amplifies flaws.
- **Tiered retrieval**: Summary files first (fast, cheap), vector search fallback (thorough, expensive). Don't vector-search everything.
- **Score decay**: `final_score = relevance × exp(-λ × days)` — recency-weighted relevance is universal across all architectures.
- **Feedback loops**: Echo/fizzle (track which injected memories get used), behavior loops (extract corrections as lessons), learning loops (convert expensive LLM checks into cheap static rules).
- **SQLite over hosted vector DBs**: At current scales (1K-5K entries), SQLite + FTS5 + local embeddings outperforms hosted solutions on latency, cost, and operational simplicity.
- **Multi-agent convergence**: Shared memory creates homogenization pressure. Workspace isolation + file routing guards help but don't fully solve it.
- **Vault index pattern**: Single scannable manifest (one-line descriptions) → load individual entries on demand. One file read instead of N.
