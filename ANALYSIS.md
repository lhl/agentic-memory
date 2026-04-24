---
title: "Synthesis — Agentic Memory Systems (Comparison + Design Space)"
date: 2026-04-25
type: synthesis
scope:
  - agentic-memory repo systems (jumperz, joelclaw ADR-0077, OpenClaw architecture, Marvy output degradation, ClawVault, memv, MIRA-OSS, Gigabrain, OpenViking, ByteRover CLI, Supermemory, Karta)
  - comparison baselines (ChatGPT/Claude-style minimal memory, Letta/MemGPT, Mem0)
  - implementation reference (shisad long-term memory, v0.7.0 release content 2026-04-23)
  - standalone analysis: ANALYSIS-shisad.md
related:
  - ANALYSIS-shisad.md
  - ANALYSIS-jumperz-agent-memory-stack.md
  - ANALYSIS-joelhooks-adr-0077-memory-system-next-phase.md
  - ANALYSIS-coolmanns-openclaw-memory-architecture.md
  - ANALYSIS-drag88-agent-output-degradation.md
  - ANALYSIS-versatly-clawvault.md
  - ANALYSIS-vstorm-memv.md
  - ANALYSIS-mira-OSS.md
  - ANALYSIS-claude-code-memory.md
  - ANALYSIS-codex-memory.md
  - ANALYSIS-openviking.md
  - ANALYSIS-byterover-cli.md
  - ANALYSIS-supermemory.md
  - ANALYSIS-karta.md
  - REVIEWED.md (Gigabrain detailed notes, Claude Code detailed notes, Codex detailed notes, Supermemory detailed notes)
  - references/jumperz-agent-memory-stack.md
  - references/joelhooks-adr-0077-memory-system-next-phase.md
  - references/coolmanns-openclaw-memory-architecture.md
  - references/drag88-agent-output-degradation.md
  - references/versatly-clawvault.md
  - vendor/openclaw-memory-architecture
  - vendor/clawvault
  - vendor/memv
  - vendor/mira-OSS
  - vendor/openviking
  - vendor/byterover-cli
  - vendor/supermemory
  - vendor/karta
external_comparisons:
  - shisad docs: shisad internal docs (private)
  - Letta (formerly MemGPT): https://github.com/letta-ai/letta
  - Mem0: https://github.com/mem0ai/mem0
---

# Synthesis — Agentic Memory Systems (Comparison + Design Space)

This document is a **full synthesis and comparison** across the memory systems in this repo, plus a few baselines and “traditional” approaches (Letta/MemGPT, Mem0, generic RAG). It is designed to support the next step: **cross-system synthesis** and **choosing what to implement** (with `shisad v0.7.0` release content (2026-04-23) as the shipped shisad reference; standalone analysis in `ANALYSIS-shisad.md`).

These systems are often designed ad-hoc and explained via “folk theories” (OS metaphors, cognitive analogies, vibes). That does **not** imply they’re wrong. It does mean we should:

- separate **mechanisms** from **claims of effectiveness**
- treat “stack diagrams” as **proposals**, not evidence
- prioritize patterns that are **testable, debuggable, and safe under prompt injection**

## TL;DR (synthesis highlights)

1) Independent “internet rando” systems converge on a shared spine:
- append-only **transcripts/logs**
- a short **working/active context** summary
- a curated “**MEMORY.md**-like” file (or memory blocks)
- some kind of **search** (BM25/FTS and/or embeddings)
- periodic **consolidation/maintenance** (cron jobs, reflection, pruning)

2) The biggest differentiator is not “vector DB vs SQLite” — it’s **write correctness and governance**:
- provenance/audit trail
- write gates / confirmation
- conflict handling
- reversibility (inspect/edit/delete)

3) “Episodic memory” is mostly implemented as **daily logs + summaries** (and sometimes “episode objects”).
True episodic retrieval (events as first-class entities with structured fields + temporal indexing) is still rare.

4) “Task-based memory” shows up as:
- project institutional docs (`project-*.md`)
- task primitives and kanban/ledger (ClawVault)
- external review surfaces (Todoist in joelclaw)
But tasks are often **sidecar tooling**, not integrated into retrieval/ranking and not tied to evidence/provenance.

5) Among sources here, **OpenClaw memory architecture** is the most synthesis-ready on the *engineering* axis for already-built open systems (explicit layering + benchmark harness + drift tracking).  
**shisad v0.7.0 (released 2026-04-23)** is the most synthesis-ready on the *safety and governance* axis: formal trust model with PEP-minted ingress handles + valid-combination matrix (14 rules + pending-review sentinel) in code, 5-surface architecture (Identity/Active Attention/Recall/Procedural/Evidence), capability-aware retrieval, MemoryPack compilation, append-only correction chains with 5-event confidence mechanics, pending-review queue, audit-first write semantics, and an adversarial evaluation track (shipped with minimal fixtures; benchmark adapters not yet in the repo). Standalone analysis: `ANALYSIS-shisad.md`.

6) Two newer systems widen the design space in useful ways:
- **OpenViking** treats memory as one namespace inside a broader typed context filesystem / control plane.
- **ByteRover CLI** treats memory as an agent-native coding runtime with local-first storage, lifecycle metadata, and five-tier progressive retrieval.

7) Karta introduces **active background reasoning** ("dreaming") as a memory mechanism: 7 inference types (deduction, induction, abduction, consolidation, contradiction detection, episode digest, cross-episode digest) that create new knowledge from existing notes and feed back into retrieval via contradiction force-injection and entity profile auto-include.

## 0) Systems in scope

### In this repo (primary comparison set)
- **@jumperz 31-piece stack (spec/checklist):** `ANALYSIS-jumperz-agent-memory-stack.md`
- **joelclaw ADR-0077 (increment plan on running system):** `ANALYSIS-joelhooks-adr-0077-memory-system-next-phase.md`
- **OpenClaw memory architecture (vendored repo, benchmark-driven):** `ANALYSIS-coolmanns-openclaw-memory-architecture.md`
- **drag88/Marvy (convergence + enforcement loop pattern):** `ANALYSIS-drag88-agent-output-degradation.md`
- **ClawVault (vendored CLI + hooks, workflow productization):** `ANALYSIS-versatly-clawvault.md`
- **memv (vendored library, Nemori-inspired pipeline):** `ANALYSIS-vstorm-memv.md`
- **MIRA-OSS (vendored full-stack app, event-driven with autonomous memory lifecycle):** `ANALYSIS-mira-OSS.md`
- **Gigabrain (OpenClaw memory plugin, event-sourced with multi-gate write pipeline):** detailed notes in `REVIEWED.md`
- **Claude Code memory subsystem (Anthropic, first-party production system):** `ANALYSIS-claude-code-memory.md`
- **Codex memory subsystem (OpenAI, first-party open-source):** `ANALYSIS-codex-memory.md`
- **OpenViking (volcengine, typed context database / filesystem):** `ANALYSIS-openviking.md`
- **ByteRover CLI (campfirein, local-first coding memory runtime):** `ANALYSIS-byterover-cli.md`
- **Supermemory (industry startup, memory-as-a-service):** `ANALYSIS-supermemory.md`
- **Karta (rohithzr, Rust library with dream engine + knowledge graph):** `ANALYSIS-karta.md`

### Comparison baselines (external)
- **Minimal “MEMORY.md-only” agent setups:** common pattern in prompt-engineered agents.
- **Letta (formerly MemGPT):** stateful agents with explicit memory blocks + archival/recall memories.
  Sources: `https://github.com/letta-ai/letta`, plus local notes in `internal shisad MemGPT/Letta research notes (private)`.
- **Mem0:** memory layer that extracts/stores/retrieves user/session/agent memories; paper + SDKs.
  Sources: `https://github.com/mem0ai/mem0` and the cited arXiv paper (`arXiv:2504.19413`).
- **Supermemory:** memory-as-a-service API with version chains, typed relationships, profile synthesis; startup with self-reported benchmark leadership.
  Sources: `https://github.com/supermemoryai/supermemory` and `https://supermemory.ai/docs`.

### Implementation reference (for mapping)
- **shisad v0.7.0 (released 2026-04-23, security-first executive-assistant memory):** `ANALYSIS-shisad.md`
  - Storage substrate + 5 memory surfaces (Identity, Active Attention, Recall/MemoryPack, Procedural/Skills, Evidence) — shipped (`src/shisad/memory/surfaces/`)
  - Formal trust model in code (`src/shisad/memory/trust.py` matrix + `src/shisad/memory/ingress.py` PEP handles with SHA-256 content binding)
  - 21 entry types across 6 categories + canonical §3.7 metadata schema (`src/shisad/memory/schema.py`)
  - Source: shisad release repo (`shisa-ai/shisad`), CHANGELOG 0.7.0 section 2026-04-23; design baseline `PLAN-longterm-memory.md` (2026-04-21, private)

## 1) A practical taxonomy (what “memory” actually means)

The word “memory” gets overloaded. For synthesis, it helps to split memory by **content type** and by **system role**.

### 1.1 Memory content types (what is being stored)

| Type | What it stores | Typical artifact(s) | Primary risk |
|---|---|---|---|
| Identity/persona | stable self-description + user model | `SOUL.md`, `USER.md`, Letta `memory_blocks` | poisoning becomes durable instruction |
| Working/scratch | current task context | `active-context.md`, overwritten working file | drift / bloat / “sticky” mistakes |
| Transcript/recall | raw conversation history | JSONL logs, daily logs | secrets/PII persistence; prompt injection persistence |
| Episodic | event summaries (“what happened”) | daily summaries, “episode” objects | summarization distortion; temporal errors |
| Semantic facts | extracted stable facts/preferences/decisions | item rows, JSON entries, curated notes | hallucinated facts; contradictions |
| Procedural/policy | “how to do X”, rules, guardrails | runbooks, gating policies, regex rules | overconstraint; rule bloat; bypass |
| Task/project | commitments, action items, project state | tasks, backlogs, `project-*.md` | staleness; inconsistent ownership |
| Graph/relations | entities + relationships | triples, SQLite relations, graph-index.json | graph-spam; alias collisions |

### 1.2 System roles (why it exists)

| Role | Why it exists | How it typically fails |
|---|---|---|
| Retrieval | supply relevant context cheaply | low precision → token blowups; low recall → “agent forgot” |
| Consolidation | compress, dedup, promote high-signal | telephone-game drift; destructive merges |
| Governance | keep writes sane + reversible | too strict → nothing saved; too lax → poisoning/noise |
| Evaluation | measure memory quality changes | benchmarks overfit or measure wrong thing |

## 2) Comparison matrix (coverage by memory type)

Legend: ✅ first-class, ⚠️ partial/implicit, ❌ absent, 🧪 proposed only.

| System | Identity / persona | Working | Transcript / recall | Episodic | Semantic facts | Procedural / rules | Task / project | Graph / relations | Maintenance | Evaluation |
|---|---|---|---|---|---|---|---|---|---|---|
| Minimal `MEMORY.md` agent | ⚠️ | ⚠️ | ⚠️ | ❌ | ⚠️ | ⚠️ | ❌ | ❌ | ❌ | ❌ |
| @jumperz 31-piece spec | 🧪 | ✅ | 🧪 (Resources) | ✅ (Episodes) | ✅ (Items) | ⚠️ (lessons/behavior) | ⚠️ (Forward triggers) | ✅ (Triples) | ✅ (nightly/weekly/monthly) | ⚠️ (echo/fizzle as proxy) |
| joelclaw ADR-0077 | ⚠️ | ⚠️ | ✅ (daily logs + Qdrant) | ⚠️ | ✅ (observations) | ⚠️ | ⚠️ (Todoist review surface) | ❌ (deferred) | ✅ (planned nightly) | ❌ (no benchmark yet) |
| OpenClaw architecture | ✅ | ✅ | ✅ | ✅ (daily logs) | ✅ (facts.db + MEMORY.md) | ✅ (gating policies/runbooks) | ✅ (project memory) | ✅ (facts+relations+aliases) | ✅ (decay cron, reindex) | ✅ (60-query benchmark) |
| drag88/Marvy | ⚠️ | ✅ | ✅ | ✅ (daily + hourly summaries) | ✅ (JSON entries) | ✅ (rules + enforcement) | ⚠️ | ❌ | ✅ (cron-driven) | ❌ (qualitative) |
| ClawVault | ⚠️ | ✅ (workflow) | ✅ (ledger/transcripts + observe) | ✅ (reflect/recap) | ✅ (typed entries) | ⚠️ (inject rules + hooks) | ✅ (tasks/projects) | ✅ (graph index) | ✅ (reindex/refresh) | ❌ (no benchmark harness) |
| memv | ❌ | ❌ | ✅ (messages) | ✅ (episodes) | ✅ (semantic statements) | ❌ | ❌ | ❌ | ⚠️ (invalidation) | ❌ |
| MIRA-OSS (v1r2) | ✅ (DomainDocs + LoRA directives + portrait) | ✅ (notification center + forage results) | ✅ (Continuum segments) | ✅ (first-person summaries) | ✅ (Memory objects) | ✅ (behavioral directives via Text-Based LoRA + user model synthesis) | ⚠️ (reminders) | ✅ (entity links + hub discovery + 3-axis linking) | ✅ (decay + consolidation + entity GC) | ⚠️ (internal tuning tests only) |
| Gigabrain | ⚠️ (AGENT_IDENTITY type) | ❌ | ✅ (native sync of daily notes) | ✅ (EPISODE type) | ✅ (USER_FACT/PREFERENCE/DECISION/ENTITY) | ❌ | ❌ | ⚠️ (person service + co-occurrence graph export) | ✅ (nightly pipeline: quality sweep + dedup + archive + vacuum) | ✅ (memorybench harness + 12 tests) |
| Claude Code (Anthropic) | ⚠️ (user type captures role/prefs) | ⚠️ (session memory) | ✅ (JSONL transcripts + grep) | ⚠️ (KAIROS daily logs, not structured) | ✅ (typed memories: user/feedback/project/reference) | ⚠️ (feedback type captures behavioral guidance) | ⚠️ (project type; defers to CLAUDE.md) | ❌ | ✅ (auto dream consolidation + extraction) | ✅ (eval-validated prompts with case IDs + telemetry) |
| Codex (OpenAI) | ⚠️ (user profile in memory_summary.md) | ❌ | ✅ (rollout items on disk) | ✅ (rollout_summaries/ with task outcome triage) | ✅ (MEMORY.md handbook: user prefs, reusable knowledge, failures) | ✅ (skills/ as procedural memory: SKILL.md + scripts + templates) | ⚠️ (task groups in MEMORY.md by cwd/project) | ❌ | ✅ (two-phase pipeline: Phase 1 parallel extraction + Phase 2 global consolidation + usage-based pruning) | ✅ (citation-based usage tracking + comprehensive telemetry) |
| Letta/MemGPT | ✅ (memory blocks) | ✅ | ✅ (recall) | ⚠️ (summary as needed) | ✅ (archival) | ⚠️ (tools/skills) | ⚠️ | ❌ (not core) | ⚠️ (agent-managed) | ⚠️ (depends) |
| Mem0 | ✅ (user prefs) | ✅ (session) | ⚠️ | ⚠️ | ✅ (memories) | ⚠️ | ⚠️ | ⚠️ (paper mentions graph variant) | ✅ (consolidation in paper) | ✅ (benchmark in paper) |
| Supermemory | ✅ (static profile) | ⚠️ (dynamic profile) | ⚠️ (documents) | ⚠️ (documents as source) | ✅ (MemoryEntry with versioning) | ❌ | ❌ | ✅ (updates/extends/derives ontology) | ⚠️ (forgetAfter TTL; no visible maintenance) | ⚠️ (MemoryBench framework; self-reported claims) |
| OpenViking | ⚠️ | ✅ | ✅ (sessions) | ✅ (session commit + promotion) | ✅ (typed memory categories) | ✅ (skills/resources as first-class context) | ✅ (projects/sessions/resources) | ⚠️ (hierarchical namespace, not graph-first) | ✅ (L0/L1/L2 promotion + async extraction) | ⚠️ (limited plugin-level evaluation) |
| ByteRover CLI | ⚠️ | ✅ | ⚠️ (curated carryover, not transcript-first) | ⚠️ (experience compressed into context tree) | ✅ (Context Tree nodes) | ✅ (coding guidance/workflow memory) | ✅ (repo/project context) | ⚠️ (tree relationships, not full graph) | ✅ (lifecycle/decay + structured curation) | ✅ (vendor-authored benchmark paper) |
| Karta | ⚠️ (entity profiles from consolidation dreams) | ❌ | ❌ | ✅ (episodes with boundary detection + narrative + digests) | ✅ (MemoryNotes + atomic facts + entity profiles) | ❌ | ❌ | ✅ (bidirectional links + multi-hop BFS + entity profiles) | ✅ (7-type dream engine + foresight expiry + dedup + cursor) | ✅ (BEAM 100K + eval scenarios + per-ability + 243 failure catalog) |
| shisad (v0.7.0) | ✅ (Identity surface shipped: trust_elevated persona_fact/preference/soft_constraint, ~750 tok default budget, candidate lifecycle from observation) | ✅ (Active Attention surface shipped: open_thread/scheduled/recurring/waiting_on/inbox_item with workflow_state lifecycle, class-balanced compiler) | ✅ (append-only transcripts + evidence store with encrypted originals) | ✅ (episode entry type + event trail + consolidation-derived digests) | ✅ (21 typed entries + canonical schema + bi-temporal + supersedes chains + 5-event confidence mechanics in code) | ✅ (skill/runbook/template with invocation_eligible ⊥ trust_band + install/invocation separation, shipped) | ✅ (todo/project_state + Active Attention with workflow lifecycle) | ✅ (derived KG — graph/derived.py — evidence-backed, rebuildable) | ✅ (sandboxed worker with explicit capability scope + corroboration/contradiction/strong-invalidation/dedup/merge/archive) | ⚠️ (utility-retention gate + 3-case poisoning fixture shipped; LoCoMo/LongMemEval/EverMemBench/StructMemEval/LoCoMo-Plus/BEAM+LIGHT adapters and ISR/ASR/downstream-harm breakdown planned, not yet in repo) |

Notes:
- Several systems “have episodic memory” only in the sense that they keep daily logs; that’s **episodic storage**, not necessarily **episodic retrieval**.
- `OpenViking` is broader than a pure memory system; the table scores only the memory-relevant parts of its typed context substrate.
- `ByteRover CLI` has stronger benchmark coverage than most coding-agent systems here, but the public evidence is still mostly vendor-authored.
- “Evaluation” is often missing or proxy-based; OpenClaw, ByteRover CLI, and Mem0 are the clearest harness/paper cases here.

## 3) Technique catalog (what mechanisms recur)

This is the “design pattern” inventory across the systems.

### 3.1 Write-side mechanisms (ingestion)

Common patterns:
- **Extract structured units** from conversations (items/observations/memories).
- **Provenance pointers** (resource_id, source metadata, audit trail).
- **Gating/triage**:
  - human-in-the-loop promotion (joelclaw, ClawVault workflows)
  - deterministic gates (regex/YARA-style) (Marvy; also shisad’s Content Firewall + MemoryManager + quarantine/confirmation rules)
  - similarity-based dedup merges (jumperz/joelclaw planned)

Main disagreement: *how much to trust LLM extraction*
- jumperz-style: LLM extraction is the system (high leverage, high risk).
- OpenClaw-style: structure-first (facts/db/files), extraction is more controlled and tied to artifacts.
- shisad-style: extraction exists, but writes are **privileged, versioned, and provenance-bearing** (taint-aware, confirmation, “no instructions” rule).

### 3.2 Retrieval-side mechanisms (context construction)

Recurring retrieval moves:
- **Tiered retrieval**: small summaries first, deep search later (jumperz; OpenClaw layering; many vault index patterns).
- **Hybrid retrieval**: lexical (BM25/FTS) + semantic embeddings + graph/entity resolution (OpenClaw explicitly; shisad v0.7.0 via `memory/ingestion.py` + derived KG).
- **Query rewriting**: LLM rewrites a better search query (jumperz; joelclaw planned).
- **Decay/recency weighting**: recency as a prior (jumperz; joelclaw planned; OpenClaw uses activation/importance).
- **Injection caps**: bound the number of injected memories per turn (jumperz; joelclaw planned; shisad top-K).
- **Trust tags**: stale/uncertain/conflict flags (jumperz “trust pass”; shisad taint + capability-scoped retrieval + MemoryPack caveats; OpenClaw “main session only” rules).
- **Typed hierarchical retrieval**: navigate namespaces and recurse through object trees, not just rank chunks (OpenViking).
- **Progressive local retrieval**: exact/fuzzy/index hits first, then model-heavy retrieval only when cheaper paths fail (ByteRover CLI).

### 3.3 Maintenance & consolidation

Almost all “serious” systems converge on:
- periodic jobs (nightly/weekly/heartbeat) that:
  - merge duplicates,
  - rebuild indices,
  - prune stale items,
  - regenerate summaries.

Two newer variants sharpen that pattern:
- `OpenViking` treats maintenance as **promotion between tiers** (session-local capture to higher-level typed stores).
- `ByteRover CLI` treats maintenance as **lifecycle management** with explicit curation verbs and decay-aware retrieval.

Open question (rarely specified well): *what does “stale” mean?*
- “unused” is not the same as “wrong”.
- “old” is not the same as “irrelevant”.
- stable identity facts should not decay like ephemeral context.

### 3.4 Feedback loops (compounding improvements)

Three distinct kinds of “feedback loops” appear:

1) **Retrieval utility feedback**: echo/fizzle (jumperz; joelclaw planned).  
   Risk: gaming and poor causal attribution.

2) **Behavior correction loops**: lessons files / behavior loop (jumperz; joelclaw).  
   Risk: “policy learning” becomes a covert instruction channel unless gated.

3) **Enforcement distillation loops**: LLM judge → deterministic rules (Marvy).
   Risk: rule bloat; encoding judge quirks; style overconstraint.

4) **Behavioral adaptation loops**: signal extraction → accumulation → periodic synthesis → directive injection (MIRA-OSS "Text-Based LoRA").
   Risk: directive drift; compounding biases; no mechanism to "unlearn" a bad directive except manual editing.

5) **Assessment-anchored user modeling**: evaluate conversation against system prompt sections → classify alignment/misalignment signals → periodic synthesis with critic validation → user model and portrait injection (MIRA-OSS v1r2).
   Risk: assessment quality depends on system prompt section design; critic validation (Haiku) may miss subtle observation laundering.

### 3.5 Reliability primitives (often mislabeled as “memory”)

Checkpointing/replay is an “ops primitive” but shows up in most stacks:
- jumperz: checkpoint + replay endpoints (Phase 2)
- ClawVault: checkpoint/recover + hook automation
- OpenClaw: checkpoints directory
- shisad: CheckpointStore + TranscriptStore + retrieval corpus + restore-on-restart

Treat this as **observability and recoverability**, not “memory retrieval”.

### 3.6 Technique matrix (quick lookup)

Legend: ✅ first-class, ⚠️ partial/implicit, ❌ absent, 🧪 proposed only.

**Retrieval / context construction**

| Technique | Minimal `MEMORY.md` agent | @jumperz spec | joelclaw ADR-0077 | OpenClaw arch | drag88/Marvy | ClawVault | MIRA-OSS | Gigabrain | Claude Code | Codex | Supermemory | Letta/MemGPT | Mem0 | OpenViking | ByteRover CLI | Karta | shisad |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Hybrid lexical+semantic retrieval | ❌ | 🧪 | ✅ (Qdrant) | ✅ | ✅ (QMD hybrid) | ✅ (qmd) | ✅ (BM25+pgvector RRF + intent-aware weighting) | ⚠️ (FTS + weighted Jaccard, no embeddings) | ⚠️ (LLM-based Sonnet selector, no embeddings) | ❌ (keyword grep only) | ✅ (claimed: vector + metadata + rerank) | ✅ | ✅ | ⚠️ (structured find + semantic search, not classic hybrid RAG) | ⚠️ (exact/fuzzy/index + LLM tiers, not embedding-first) | ⚠️ (ANN embedding search + keyword classifier fallback; no BM25/FTS) | ✅ (BM25/FTS + embeddings + trust prior; effective_rank = similarity × decay_score × confidence × importance_weight) |
| Entity/alias resolution | ❌ | 🧪 | ❌ | ✅ | ❌ | ✅ (graph index) | ✅ (spaCy NER + pg_trgm + 3-axis linking) | ✅ (person service + coreference) | ❌ | ❌ | ⚠️ (relationship graph, not explicit NER) | ❌ | ⚠️ | ❌ | ❌ | ✅ (entity profiles from consolidation dreams auto-included in search; profile merge) | ✅ (stable IDs + canonicalization + hub discovery + 3-axis linking) |
| Knowledge graph traversal | ❌ | 🧪 | ❌ | ✅ | ❌ | ✅ | ✅ (hub discovery + link traversal + TF-IDF orphan recovery) | ❌ (graph export only) | ❌ | ❌ | ✅ (claimed: relationship expansion in search) | ❌ | ⚠️ | ⚠️ (hierarchy traversal rather than graph traversal) | ❌ | ✅ (multi-hop BFS with depth + decay; episode link traversal; cross-episode entity timelines) | ✅ (derived KG with evidence-backed queries + hub discovery + 3-axis linking) |
| Tiered retrieval (summary → deep) | ❌ | ✅ | 🧪 | ✅ (layering) | ✅ (vault index) | ✅ (profiles/routing) | ✅ (subcortical → dual-path + background forage agent) | ✅ (class budgets: core/situational/decisions) | ✅ (Sonnet selector → memory content → staleness) | ✅ (memory_summary → MEMORY.md → rollout_summaries → skills) | ✅ (profile static/dynamic + search results) | ⚠️ | ⚠️ | ✅ (L0/L1/L2) | ✅ (five tiers) | ✅ (6-mode query classification → mode-specific top_k/recency → reranker → retry) | ✅ (5 surfaces: Identity always-loaded → Active Attention per-turn → Recall/MemoryPack per-query → Procedural on-invocation → Evidence on-demand; archive-tier auto-widening) |
| Query rewriting | ❌ | ✅ | 🧪 | ⚠️ (QMD expansion) | ❌ | ⚠️ (optional LLM inject) | ✅ (subcortical expansion, replaces original query) | ⚠️ (entity coreference + query sanitization) | ❌ | ❌ | ✅ (rewriteQuery flag, +400ms) | ⚠️ | ⚠️ | ❌ | ⚠️ (LLM tiers can reformulate implicitly) | ⚠️ (embedding-based query classification into 6 modes, not query rewriting) | 🧪 (v0.7.1 G2: retrieval sufficiency verification + query rewrite/expansion loop) |
| Recency/decay weighting | ❌ | ✅ | 🧪 | ✅ (activation/importance) | ⚠️ | ⚠️ | ✅ (multi-factor sigmoid, activity-day) | ✅ (stepped recency: 1d/7d/30d/90d/365d) | ⚠️ (mtime-based staleness display only) | ✅ (usage-based: usage_count + last_usage drive selection + pruning) | ✅ (forgetAfter TTL + recency in ranking) | ⚠️ | ✅ (paper claims) | ⚠️ (tier promotion and session locality more than explicit decay) | ✅ (AKL/lifecycle decay) | ✅ (exponential decay with configurable half-life; mode-specific recency weights: Recency=0.60) | ✅ (multiplicative decay_score = age × activity × citation × verification × source_trust; activity-day not calendar-day; configurable per entry_type) |
| Hard top-K injection cap | ⚠️ | ✅ | ✅ (planned) | ✅ | ✅ | ✅ | ✅ (~15 pinned + ~5 fresh) | ✅ (topK=8 + class budgets + token cap) | ✅ (max 5 via Sonnet selector) | ⚠️ (memory_summary token cap 5K; MEMORY.md unbounded grep) | ✅ (limit 1–100 per search) | ✅ | ✅ | ⚠️ | ✅ | ✅ (mode-specific top_k + fetch_k multipliers; truncation after multi-source merge) | ✅ (5-surface budgets: Identity ~1K tok + Active Attention class-budgeted + Recall/MemoryPack per-type caps + Procedural per-skill + Evidence per-call) |
| Capability-scoped retrieval | ❌ | ❌ | ❌ | ⚠️ (channel/security conventions) | ❌ | ❌ | ❌ (forage agent code-constrained, not arch-constrained) | ⚠️ (scope: shared vs profile, private vs group) | ❌ | ❌ | ✅ (containerTag isolation + RBAC) | ❌ | ❌ | ⚠️ (type-scoped and namespace-scoped, not security-capability scoped) | ❌ | ❌ | ✅ (capability snapshot filters collections; confirmation gate for external_web retrieval when side-effectful capabilities active) |
| Taint/trust labels carried through | ❌ | 🧪 (trust pass) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ (provenance markers: FACT vs INFERRED with confidence; not taint labels) | ✅ (PEP-minted ingress_context handles carry taint_labels from ingestion through retrieval; MemoryPack annotates all entries with source trust tier + staleness + conflict markers) |

**Write / ingestion governance**

| Technique | Minimal `MEMORY.md` agent | @jumperz spec | joelclaw ADR-0077 | OpenClaw arch | drag88/Marvy | ClawVault | MIRA-OSS | Gigabrain | Claude Code | Codex | Supermemory | Letta/MemGPT | Mem0 | OpenViking | ByteRover CLI | Karta | shisad |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Append-only provenance log | ❌ | ✅ (Resources) | ✅ (logs/Qdrant metadata) | ✅ (logs) | ✅ (logs) | ✅ (ledger) | ✅ (Continuum segments + source_segment_id + batch tracking) | ✅ (event-sourced: append-only memory_events + per-memory timeline) | ✅ (JSONL transcripts) | ✅ (stage1_outputs DB table + rollout_summaries/ files + raw_memories.md) | ⚠️ (MemoryDocumentSource join; version chains preserve history) | ✅ (recall) | ⚠️ | ✅ (session commits as source artifacts) | ❌ | ⚠️ (evolution history + dream source_note_ids; but notes upserted in-place) | ✅ (event-sourced audit trail: append-only memory_events with 20+ event types; every mutation records ingress_handle_id; state derivable from event stream) |
| Structured fact extraction | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (batch LLM extraction + entity linking + 3-axis relationship discovery) | ✅ (7 typed memories via XML tag protocol) | ✅ (4-type taxonomy: user/feedback/project/reference) | ✅ (task groups with prefs/knowledge/failures + rollout summaries with task outcome triage) | ✅ (MemoryEntry extraction from documents; static/dynamic classification) | ⚠️ | ✅ | ✅ | ✅ | ✅ (LLM attributes: context + keywords + tags + foresight signals + atomic facts) | ✅ (15 typed entry_types across 5 categories; Content Firewall sanitization + fact extraction; minimum signal gate + two-phase extraction) |
| Write gating (reject instructions / confirm) | ❌ | ✅ | ⚠️ (auto-triage) | ❌ | ⚠️ (rules focus on output) | ⚠️ (sanitization + path safety) | ❌ (auto-extract at collapse; 0.85 fuzzy + 0.7 vector dedup only) | ✅ (junk filter + dedup + plausibility + review queue) | ⚠️ (exclusion list + prompt-enforced "ask what was surprising") | ⚠️ (minimum signal gate in Phase 1 prompt; no code-level gate) | ❌ (no visible write gating) | ❌ | ⚠️ | ⚠️ | ⚠️ | ❌ (no junk filter or quality checks) | ✅ (PEP-minted ingress_context handles + 16-row valid-combination matrix + instruction-like content rejection + Content Firewall + quarantine on high risk + subagent write prohibition by default) |
| Human-in-the-loop promotion | ⚠️ | ❌ | ✅ | ⚠️ (curation habits) | ❌ | ✅ | ⚠️ (memory_tool for manual create) | ✅ (review queue for borderline captures + audit shadow/apply) | ⚠️ (/remember skill for review + promotion) | ❌ | ⚠️ (MCP forget action; no promotion workflow) | ❌ | ❌ | ⚠️ (explicit commit boundary, but not review-queue driven) | ❌ | ❌ (library API; no review queue) | ✅ (confirmation + quarantine review + pending_review queue + identity candidate lifecycle with agent-proposes-user-approves + skill install via promote_to_skill + /identity review command) |
| Similarity dedup / merge | ❌ | ✅ | 🧪 | ✅ (maintenance + schema) | ❌ | ✅ (rebuild/refresh) | ✅ (0.85 fuzzy + 0.7 vector + connected-component consolidation clusters) | ✅ (exact + weighted Jaccard with type-aware thresholds) | ⚠️ (prompt: "don't duplicate"; no code-level check) | ⚠️ (Phase 2 consolidation merges; no code-level similarity check) | ⚠️ (claimed; not visible in open-source) | ⚠️ | ✅ (paper claims) | ⚠️ | ✅ | ⚠️ (dream dedup via embedding similarity; no write-path dedup) | ✅ (type-aware dedup thresholds in consolidation + merge jobs + two-phase extraction for write-path quality) |
| Conflict handling beyond overwrite | ❌ | ⚠️ (single active truth) | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ (supersedes links + scoring penalty) | ⚠️ (event log preserves history but no versioned corrections) | ❌ (overwrite model) | ⚠️ (thread-diff forgetting preserves evidence during transition but no correction chains) | ✅ (version chains + `updates` relationship; old versions preserved with isLatest=false) | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ (contradiction dreams detect + persist; force-retrieval surfaces both sides; NoteStatus lifecycle) | ✅ (supersedes chains + bi-temporal validity intervals + conflict surfacing in MemoryPack + confidence-update mechanics: corroboration/contradiction/strong-invalidation/re-verification + user-facing contradiction-review flow + "breakup case" strong-invalidation UX) |

**Maintenance / evaluation**

| Technique | Minimal `MEMORY.md` agent | @jumperz spec | joelclaw ADR-0077 | OpenClaw arch | drag88/Marvy | ClawVault | MIRA-OSS | Gigabrain | Claude Code | Codex | Supermemory | Letta/MemGPT | Mem0 | OpenViking | ByteRover CLI | Karta | shisad |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Scheduled consolidation jobs | ❌ | ✅ | 🧪 | ✅ | ✅ | ✅ | ✅ (event-driven + entity GC + use-day scheduling) | ✅ (nightly pipeline: snapshot → sync → sweep → dedup → audit → archive → vacuum → metrics) | ✅ (auto dream: time+session+lock gates) | ✅ (startup pipeline: prune → Phase 1 → Phase 2; watermark-based dirty tracking) | ⚠️ (forgetAfter implies scheduler; not visible) | ⚠️ | ✅ | ✅ | ✅ | ✅ (dream engine: cursor-based incremental, 7 types, entity profiles, episode digests) | ✅ (multi-timescale: fast per-session + medium daily/weekly + slow monthly/quarterly; sandboxed worker; corroboration/contradiction/strong-invalidation/identity-candidate accumulation; two-phase extraction; score recompute; usage-based retention) |
| Cron fallback / missed-job detection | ❌ | ✅ | ⚠️ (Inngest) | ⚠️ | ✅ (cron mindset) | ⚠️ | ✅ (APScheduler + segment timeout + extraction retry 6h) | ⚠️ (CLI-triggered `gigabrainctl nightly`; no daemon/scheduler) | ⚠️ (time gate + scan throttle prevents over-consolidation) | ✅ (SQLite leases: expired leases auto-release; retry backoff prevents hot-loops) | ❌ (not visible) | ❌ | ❌ | ❌ | ❌ | ❌ (library API; no scheduler) | ⚠️ (jobs specified; scheduler details still open) |
| Benchmark harness for retrieval | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ⚠️ (internal tuning tests) | ✅ (harness-lab-run.js with A/B comparison, bilingual eval cases) | ✅ (internal evals with case IDs; no user-facing harness) | ❌ | ✅ (MemoryBench: cross-system benchmark framework with MemScore composite metric) | ❌ | ✅ (paper) | ⚠️ (plugin-level evals, not a public harness) | ✅ (paper) | ✅ (BEAM 100K harness + 10 eval scenarios + per-ability + 243 failure catalog) | ✅ (6 benchmark adapters: LoCoMo + LongMemEval + EverMemBench + StructMemEval + LoCoMo-Plus + BEAM+LIGHT; adversarial track: ISR/ASR/downstream-harm/utility-drop with 6 attack scenarios; concrete 6-category metrics framework) |
| Telemetry / audit logs | ❌ | 🧪 | ⚠️ | ✅ | ⚠️ | ✅ | ✅ (structured logging + batch tracking + forage traces) | ✅ (event-sourced: every capture/reject/dedup/audit logged with reason_codes, similarity scores, JSON payloads) | ✅ (extraction/dream telemetry + memory shape analytics) | ✅ (per-phase metrics: job counts, e2e latency, token usage histograms, memory usage tracking by file type) | ✅ (analytics dashboard: usage/errors/latency/token savings) | ⚠️ | ✅ (service analytics) | ⚠️ | ⚠️ | ✅ (dream runs recorded; evolution history; tracing; JSONL debug output) | ✅ (tamper-evident event trail: 20+ event types, append-only, ingress_handle_id on every write; current state derivable from event stream; §3.7.x confidence deltas auditable with old_value/new_value/trigger/references) |

## 4) Deep comparisons by “hard problems”

### 4.1 Episodic memory: what exists vs what’s implied

Episodic memory can mean at least three things:
1) keeping an event log (storage)
2) summarizing events (compression)
3) retrieving events for a question (“what happened when…?”) (queryability)

How systems handle it:
- **jumperz:** explicit “Episode objects” + semantic episode search. (Proposed; fragile without strong provenance.)
- **OpenClaw:** daily logs + “event entities” ingestion into facts.db (more structured; benchmark-driven).
- **drag88/Marvy:** daily logs + hourly summaries; episodic feeds learnings (focus is on pipeline cadence).
- **ClawVault:** ledger + observations + reflections; episodic appears as a workflow layer (wake/sleep/recap).
- **MIRA-OSS (v1r2):** continuous Continuum → segment collapse (active/paused/collapsed states) → first-person LLM summaries (with narrative continuity from previous 5 summaries). Memories extracted from segments carry `source_segment_id` provenance. No separate "episode object" type; episodes are implicitly the segments. Session reconstruction assembles: collapse marker → summaries → behavioral primer → continuity → active messages.
- **OpenViking:** session objects are first-class and can be committed, extracted, and promoted across L0/L1/L2 storage. It is stronger on session-to-memory promotion than on standalone event objects.
- **ByteRover CLI:** weaker on raw episodic replay than transcript-first systems; stronger on compressing prior coding work into maintained context nodes that survive across tasks and repositories.
- **shisad (v0.7.0):** append-only transcripts + evidence store + typed episode entries in canonical schema + derived KG + consolidation-derived digests, compiled into a RecallPack per query (`memory/surfaces/recall.py`). Five surfaces provide differentiated access: Identity (always-loaded) uses only trust_elevated entries (enforced by `IDENTITY_BLOCKED_SOURCE_ORIGINS`); Recall compiles per-query. Per-entry trust/staleness/conflict projection in the Recall pack itself is a rewire in progress (v0.7.1+).

Synthesis take:
- The most robust pattern is **append-only logs + structured extraction into event entities** (with evidence pointers).
- Pure LLM-written episode summaries are useful for humans, but brittle as a source of truth unless evidence-linked.

### 4.2 Task-based memory: tasks as first-class vs “notes”

Tasks are where memory meets action. Approaches:
- **ClawVault:** explicit CLI primitives for tasks/projects/backlog/kanban; integrates into workflow; good ergonomics.
- **OpenClaw:** `project-{slug}.md` as institutional memory; task tracking is not central, but project state is.
- **joelclaw:** Todoist as review surface; tasks as human workflow, not an internal memory type.
- **MIRA-OSS (v1r2):** reminders via `reminder_tool` (time-based); punchclock for time tracking; no full task/project model. DomainDocs serve as stable project context but aren’t task primitives. The forage agent can speculatively gather context for tasks but doesn’t manage task state.
- **shisad (v0.7.0):** `todo` and `project_state` entry types in the canonical schema; Active Attention surface compiler (`memory/surfaces/active_attention.py::build_active_attention_pack`) compiles open_thread/scheduled/recurring/waiting_on/inbox_item per-turn with workflow_state lifecycle (active/waiting/blocked/stale/closed), class-balanced across 5 types within a 750-token default budget. First system with agenda management as a compiled memory surface rather than sidecar tooling.
- **jumperz:** “Forward triggers” (temporal preload) gestures at tasks/reminders, but it’s not a full task model.

Synthesis take:
- A task system needs: ownership, status, timestamps, and explicit linkage to evidence (“why is this task here?”).
- For safety, tasks are also a persistence surface (scheduled actions) and should inherit capability snapshots (shisad’s approach).

### 4.3 Conflict resolution: single truth vs temporal/contextual truth

The naive model (“one active truth per subject+predicate”) fails for:
- time-varying facts,
- multi-valued attributes,
- context-dependent preferences.

More robust approaches seen/planned:
- OpenClaw: activation/importance + aliases; less about conflict resolution, more about retrieval scaffolding.
- MIRA-OSS: `supersedes` link type with scoring penalty (soft demotion, not hard deletion). Old memory still exists and is retrievable at lower priority. Closer to append-only correction than overwrite, but lacks explicit validity intervals for point-in-time queries.
- Supermemory: linked-list version chains via `updates` relationship. Old versions preserved with `isLatest: false`. Simpler than MIRA-OSS or Zep (no scoring penalty, no bi-temporal intervals), but cleanly supports “current vs historical” queries.
- **shisad (v0.7.0):** bi-temporal typed entries + supersedes chains + provenance + user verification + conflict markers + five-event confidence-update mechanics (corroboration/contradiction/strong-invalidation/re-verification/stale-drift), all live via `MemoryManager.update_confidence` / `mark_conflict` / `verify` / `update_decay_score` and consolidation worker. Allows "wrong-but-attributed" to exist without being treated as authoritative. The strong-invalidation UX ("I noticed you mentioned you're no longer at ACME — want me to update?") ships as a review flow, unique in the survey.

Synthesis take:
- You want **provenance + validity intervals + user-verified flags**, not a single overwriting “truth row”.

### 4.4 Security: memory poisoning and instruction/data boundaries

Most “internet stack” docs under-specify this.

shisad v0.7.0 treats this as central and ships it in code:
- memory entries cannot store instructions (`MemoryManager._INSTRUCTION_PATTERNS` + `_DISALLOWED_PREFERENCE_PREFIXES` enforce at write)
- formal trust model: 3 fields → `_VALID_TRUST_MATRIX` (14 rules + pending-review sentinel) → PEP-minted opaque `IngressContext` handles with SHA-256 content binding (`memory/ingress.py`)
- trust fields are PEP-minted, never caller-supplied (closes "LLM sets channel_trust = command" laundering)
- consolidation cannot upgrade trust (matrix row `(consolidation_derived, consolidation, auto_accepted)` hard-coded to `untrusted`)
- external-origin writes require confirmation by default
- pending-review queue + identity candidate lifecycle with user-confirmation gates (`MemoryManager.promote_identity_candidate`)
- retrieval is capability-scoped (collections filtered by active capability set)
- retrieved memory stays in untrusted prompt regions (Spotlighting-style)
- Identity surface uses "user-authored region" that is explicitly not the system/policy region; surface compiler blocks `consolidation_derived`, `external_message`, `tool_output` origins even for elevated triples
- MemoryPack carries trust fields through entry records; full per-entry annotation compiler (trust tier + staleness + conflict + archive widening) is rewire in progress
- adversarial evaluation scaffolding (`AdversarialMetrics`, `m6_adversarial_gate.py`, poisoning fixture); ISR/ASR/downstream-harm decomposition and benchmark adapters are planned but not yet in v0.7.0

Synthesis take:
- If your agent can take side-effectful actions, a memory store is an attacker’s best persistence surface.
- “Write gating” is not optional; it’s the difference between “helpful long-term memory” and “durable prompt injection”.

## 5) Mapping to shisad (v0.7.0 release content, 2026-04-23)

> Full standalone analysis: `ANALYSIS-shisad.md`. This section summarizes how the shisad v0.7.0 release content maps against the systems in this synthesis. The 2026-04-21 plan is retained as the design baseline; v0.7.0 is what shipped.

v0.7.0 is the release that lands the central architectural reframe: **storage substrate + memory surfaces**. One unified typed-entry SQLite store (`src/shisad/memory/backend/sqlite.py`) serves five compiled views (Identity, Active Attention, Recall/MemoryPack, Procedural/Skills, Evidence — `src/shisad/memory/surfaces/`) with differentiated refresh rates, trust bands, and token budgets.

### 5.1 Where shisad is ahead of the field (now running code)

- **Trust formalism**: the only system with a formal trust model in code (`src/shisad/memory/trust.py`): 3 input fields × `_VALID_TRUST_MATRIX` (14 rules + pending-review sentinel) × PEP-minted opaque `IngressContext` handles with SHA-256 content-binding (`validate_binding` + `DerivationPath`). No other system prevents the “valid handle reused for unrelated content” laundering path. Consolidation cannot upgrade trust — the matrix row `(consolidation_derived, consolidation, auto_accepted)` is hard-coded to `untrusted`.
- **Instruction/data boundary as invariant**: memory is always placed in untrusted prompt regions. Preferences are data predicates, not behavioral directives, enforced by `_INSTRUCTION_PATTERNS` + `_DISALLOWED_PREFERENCE_PREFIXES` in `MemoryManager`. Identity surface double-enforces: `IDENTITY_BLOCKED_SOURCE_ORIGINS` excludes `consolidation_derived`, `external_message`, `tool_output` from the user-authored region.
- **Storage/access separation**: one substrate, five surface compilers (`memory/surfaces/`) with per-surface trust bands and budgets. Cleaner than any other system. OpenViking comes closest (typed context filesystem), but shisad's surface compilers are more disciplined.
- **Taint/trust carried through**: the only system with ✅ on both “Taint/trust labels” and “Capability-scoped retrieval” in the technique matrices (`TaintLabel` on `IngressContext` → `MemoryEntry` → retrieval results).
- **Identity candidate lifecycle**: corroboration-gated preference inference from multi-channel observation → agent-proposes-user-approves → trust elevation. Shipped as `identity_candidates.py` + `MemoryManager.promote_identity_candidate` / `reject_identity_candidate` / `note_identity_candidate_surface` / `expire_identity_candidate`. External messages can never become candidates (enforced by the blocked-origins gate).
- **Procedural install/invocation separation**: `invocation_eligible` is orthogonal to `trust_band` — `is_invocation_eligible_triple` in trust.py gates install; `invoke_skill` runs already-approved skills without re-confirmation. No other system formally separates these concerns.
- **Strong-invalidation UX**: pattern-matched life-state changes surface a review flow rather than silent update (CHANGELOG 0.7.0 Added: "detect strong updates, flag contradictions, and record auditable merge, quarantine, and confirmation events without turning the graph into authoritative state"). Not found in any other surveyed system.
- **Confidence-update mechanics**: five-event model (corroboration/contradiction/strong-invalidation/re-verification/stale-drift) routed through `MemoryManager.update_confidence` / `mark_conflict` / `verify` / `update_decay_score` with auditable deltas via `MemoryEventStore`.
- **Adversarial evaluation track** (architectural claim; minimal code yet): `shisad.security.adversarial.AdversarialMetrics` + `scripts/m6_adversarial_gate.py` + `tests/adversarial/memory/poisoning_cases.json`. Currently gates on `utility_retention` only; ISR/ASR/downstream-harm decomposition is the planned v0.7.1+ expansion. No other system includes adversarial testing as an architecture-level requirement even at this scaffolding level.
- **Active Attention surface**: first-class per-turn view of open threads, scheduled items, waiting-on items, inbox items, recurring obligations with workflow_state lifecycle and class-balanced token budget. No other system has this as a compiled memory surface.

### 5.2 Where other systems still add useful pressure

High-leverage additions v0.7.0 does not yet ship (and the plan does not fully specify):
- **Embedding-based query classification** (Karta): 6 query modes via prototype centroids controlling top_k, recency weight, and multi-hop behavior. shisad's retrieval doesn't adapt behavior to query type.
- **Cross-encoder reranking with abstention** (Karta): raw relevance scores with abstention gate (“if best relevance < threshold, abstain rather than hallucinate”). shisad's ranking is multiplicative but doesn't specify a reranker or abstention.
- **Active inference/dream engine** (Karta): 7-type reasoning that creates new knowledge from existing knowledge. shisad's consolidation is defensive (maintenance, dedup, conflict detection), not generative. This is arguably the right safety call (consolidation can't upgrade trust), but means implicit connections between entries aren't discovered without user or retrieval interaction.
- **Progressive local retrieval tiers** (ByteRover CLI): five tiers from exact cache through full agentic retrieval. shisad goes straight to hybrid search without exhausting cheaper paths first.
- **Forked-agent extraction with prompt cache sharing** (Claude Code): background extraction sharing the parent's prompt cache. shisad specifies two-phase extraction but not the cache-sharing optimization.
- **Complete citation→usage→retention feedback loop** (Codex): agent emits citation markers → runtime parses → increments usage → feeds selection + pruning. v0.7.0 has the schema fields (`citation_count`, `last_cited_at`) and `MemoryManager.record_citations`, but the full loop from agent-emitted citation markers through selection and pruning is not yet wired.
- **Empirical ranking tuning loops** (OpenClaw, Gigabrain): small, repeatable benchmark-driven weight tuning. v0.7.0's evaluation scaffolding is comprehensive in aspiration but hasn't produced tuning data yet — benchmark adapters still pending.

Lower-confidence additions (need careful evaluation):
- **Echo/fizzle** (usefulness feedback) — only if we can attribute causality without gaming.
- **Sentiment/strength tagging** — may be helpful but risks extracting spurious metadata.

### 5.3 Primary risk: benchmark/empirical gap (updated)

v0.7.0 closes most of the plan-to-production gap for the architectural claims — the substrate, five surfaces, trust matrix, PEP ingress handles, identity candidate lifecycle, procedural install/invocation separation, sandboxed consolidation, strong-invalidation review flow, derived knowledge graph, append-only event trail, and legacy backfill are all in code.

The remaining gap has moved from "does the architecture exist?" to "does it measurably help?":
- Benchmark adapters (LoCoMo, LongMemEval, EverMemBench, StructMemEval, LoCoMo-Plus, BEAM+LIGHT) are **not yet in the v0.7.0 tree**. No running benchmark numbers.
- The adversarial track has fixtures (`tests/adversarial/memory/poisoning_cases.json` = 3 cases) and a gate script but gates on `utility_retention` only; ISR/ASR/downstream-harm decomposition is planned v0.7.1+.
- The Recall-surface rewire is partial: `build_recall_pack` wraps existing ingestion results without yet projecting per-entry MemoryPack annotations (trust tier, staleness, conflict, archive auto-widen) even though the underlying data is present on entries.
- The `observed` trust band is defined in the matrix but gated off in v0.7.0 (`validate_trust_triple` downgrades to `untrusted` unless `enable_observed=True`).

Until benchmark adapters land and adversarial metrics are decomposed, the "most security-complete" claim remains architectural, not empirical.

## 6) Contrast to “traditional RAG-ish” memory (Mem0, Letta/MemGPT, generic vector RAG)

### 6.1 Generic RAG baseline (what it typically does)
Typical “RAG memory” is:
- chunk a corpus,
- embed chunks,
- retrieve top-K by similarity (maybe BM25 + rerank),
- inject into prompt,
- optionally store conversation summaries.

What it often lacks:
- write gates / provenance / reversibility,
- maintenance jobs and drift control,
- entity/alias modeling for structured questions,
- capability-scoped retrieval under side effects.

### 6.2 Letta/MemGPT style
Letta popularizes:
- explicit **memory blocks** (persona/human) that are editable,
- explicit memory operations (archival insert/search; conversation search),
- “OS memory hierarchy” metaphor (context window as RAM).

Main synthesis point:
- Letta is strong on **tool surface design** (“memory as functions”), but without guardrails it’s easy to create “LLM-managed mess”.
shisad’s stance (“agent has agency, but writes are privileged + gated”) is a clean upgrade path.

### 6.3 Mem0 style
Mem0 frames memory as a **developer-facing layer** with SDKs and a paper-backed benchmark:
- add memories from conversation,
- search relevant memories for a query,
- emphasize efficiency vs full-context prompts.

Main synthesis point:
- Mem0 is closer to a “memory backend/service” mindset than most ad-hoc stacks.
- It’s a good comparison point for **ergonomics, performance claims, and evaluation methodology**, but it doesn’t replace the need for:
  - strong poisoning defenses,
  - explicit memory types (episodic vs procedural vs task),
  - debuggable, inspectable artifacts.

### 6.4 OpenViking and ByteRover as “not just RAG” comparisons

These two systems are useful contrast cases because neither is well-described as generic vector-RAG:

- `OpenViking` is a typed context substrate. Its key move is not “retrieve better chunks,” but organize agent state as namespaced objects (`viking://`) with session commit, extraction, and promotion across L0/L1/L2.
- `ByteRover CLI` is a local-first coding memory runtime. Its key move is not “store more notes,” but curate a markdown context tree with lifecycle metadata and five-tier retrieval so expensive model-mediated search is a last resort rather than the default.

The synthesis implication is that a serious memory system needs a clear answer to two questions:
- what are the durable objects?
- what is the escalation path from cheap retrieval to expensive retrieval?

## 7) A synthesis-friendly mental model: “Memory OS” as tiers (not features)

Across systems, the consistent spine is:

1) **Source of truth (append-only):** transcripts/logs/resources (high risk, high fidelity)
2) **Derived retrievable corpus:** sanitized chunks + indices (searchable, bounded)
3) **Durable typed memory entries:** facts/preferences/decisions/tasks (gated, reversible)
4) **Structured filing:** entities/relations (graph + aliases + evidence pointers)
5) **Curated always-loaded context:** very small identity + “what’s hot” (budgeted)
6) **Maintenance + evaluation:** consolidation jobs + benchmarks + telemetry

The key lesson from the best systems here (shisad on governance/safety/architecture, OpenClaw on engineering, Karta on inference, OpenViking on typed substrate design, ByteRover CLI on local-first curation) is:
- treat memory as **data engineering + search quality + security invariants**, not as “prompt magic”.

## 8) Open questions (for the next synthesis phase)

1) What is the **evaluation target**?
   - “find the right file”? “answer correctly”? “reduce token cost”? “avoid unsafe actions”?

2) What is our **truth model**?
   - single active truth vs temporal/contextual truth vs competing hypotheses.

3) What is our **default safety posture** for persistence?
   - which sources can write durable memory without user confirmation?

4) What’s the smallest set of features that gets us **80% utility** with **20% complexity**?
   - likely: transcripts + gated facts/preferences + hybrid retrieval + benchmark harness.

## 9) Literature scan (SOTA as of 2026-02)

This section is a **non-exhaustive literature scan** (mostly arXiv + adjacent repos) focused on long-term conversational memory and agentic memory systems.

Two notes up front:
- “SOTA” is benchmark-dependent; many papers report on **LoCoMo** and/or **LongMemEval**, but measure different things (factual recall vs cognitive consistency vs multi-hop reasoning at scale).
- A lot of reported gains are from *systems design* (indexing, hierarchical retrieval, consolidation) rather than from “better embeddings”.

### 9.1 Benchmarks & datasets (what people measure)

| Benchmark | What it targets | Why it matters | Source |
|---|---|---|---|
| **LoCoMo** (2024) | Very long-term conversational memory across sessions; QA + event summaries + some multimodal generation | Forces temporal grounding and cross-session recall; makes “episodic memory” concrete | arXiv:2402.17753 https://arxiv.org/abs/2402.17753 |
| **LongMemEval** (ICLR 2025) | 5 memory abilities (reasoning, updating, long-term, etc.) with 500 embedded questions in scalable histories | Highlights that long histories cause large accuracy drops; motivates better indexing/retrieval/reading pipelines | arXiv:2410.10813 https://arxiv.org/abs/2410.10813 · repo: https://github.com/xiaowu0162/LongMemEval |
| **EverMemBench** (2026) | Multi-party conversations exceeding **1M tokens** with 1000+ QA pairs; focuses on scalable multi-hop memory reasoning | Pushes beyond “top-K retrieval” into “can you reason over huge memory graphs?”; exposes that even strong methods can be low-accuracy | arXiv:2602.01313 https://arxiv.org/abs/2602.01313 |
| **LoCoMo-Plus** (2026) | “Cognitive memory” consistency: whether an agent preserves latent constraints and mental models, not just facts | Useful correction: factual recall ≠ coherent long-term behavior | arXiv:2602.10715 https://arxiv.org/abs/2602.10715 |
| **MemBench** (2025) | Long-context utilization benchmark (retrieval + reasoning over long contexts) | More model-centric than agent-centric, but relevant when long context and “memory” get conflated | arXiv:2506.21605 https://arxiv.org/abs/2506.21605 |

### 9.2 Recent “memory system” architectures (2025–2026)

Below are representative systems and what they add to the design space; most are evaluated on LoCoMo/LongMemEval-family benchmarks.

**Hierarchical / multi-tier memory management**
- **TiMem** (2026): tree-structured memory; reports SOTA on LoCoMo and LongMemEval-S. arXiv:2601.02845 https://arxiv.org/abs/2601.02845
- **HiMem** (2026): hierarchical “episode memory” + “note memory”, linking and conflict-aware reconsolidation. arXiv:2601.06377 https://arxiv.org/abs/2601.06377
- **Nemori** (2025): self-organizing dual memory (episodic segmentation + predict-calibrate semantic distillation); strong LoCoMo and LongMemEvalS gains with large token reductions (as reported). arXiv:2508.03341 https://arxiv.org/abs/2508.03341
- **ENGRAM** (2025): long-term memory agent with hierarchical memory; reports SOTA LoCoMo and large LongMemEval gains with low token usage. arXiv:2511.12960 https://arxiv.org/abs/2511.12960
- **Hindsight** (2025): biomimetic memory with multiple explicit memory types (facts, experiences, beliefs, etc.) and retain/recall/reflect operations; reports strong LongMemEval and LoCoMo performance. arXiv:2512.12818 https://arxiv.org/abs/2512.12818

**Test-time memorization / “learn to memorize at inference”**
- **Titans** (2025): “learning to memorize at test time” via a neural long-term memory module; reports scaling beyond 2M context windows and improved needle-in-haystack performance. arXiv:2501.00663 https://arxiv.org/abs/2501.00663

**Paradigms: multi-level optimization + continuum memory**
- **Nested Learning (NL)** (2025): frames learning algorithms as nested multi-level optimization problems; argues optimizers act as associative memories; introduces a “continuum memory system” and a continual-learning module (“Hope”). arXiv:2512.24695 https://arxiv.org/abs/2512.24695

**“Memory OS” framing (memory as a managed substrate)**
- **MemOS** (2025): proposes an OS-like memory layer unifying plaintext, activation-level, and parameter-level memories, with provenance/versioning units (“MemCube”). arXiv:2507.03724 https://arxiv.org/abs/2507.03724
- **EverMemOS** (2026): memory OS emphasizing self-organizing memory units (“MemCell/MemScene”) and “foresight signals” for long-horizon planning. arXiv:2601.02163 https://arxiv.org/abs/2601.02163

**Knowledge-graph / structured memory emphasis**
- **Zep** (2025): “temporal knowledge graph” memory system; reports gains on DMR/LongMemEval-style evals and focuses on indexing + time-aware retrieval. arXiv:2501.13956 https://arxiv.org/abs/2501.13956
- **Memoria** (2025): combines dynamic session summarization with a weighted knowledge graph user model. arXiv:2512.12686 https://arxiv.org/abs/2512.12686
- **AriGraph** (2024): knowledge graph “world model” + episodic memory for LLM agents (in text-based environments). arXiv:2407.04363 https://arxiv.org/abs/2407.04363

**Learning to manage memory operations**
- **Memory-R1** (2025): RL for explicit memory operations (ADD/UPDATE/DELETE/NOOP); reports improvements across LoCoMo/LongMemEval-style tasks with small training sets. arXiv:2508.19828 https://arxiv.org/abs/2508.19828
- **AgeMem (“Agentic Memory”)** (2026): learns unified long-term + short-term memory management with progressive RL (explicit memory ops). arXiv:2601.01885 https://arxiv.org/abs/2601.01885

**Online/self-evolving memory (streaming tasks + continuous feedback)**
- **Evo-Memory** (2025): a streaming benchmark for “self-evolving memory” and an evaluation framework that tests whether agents improve over continuous task streams (not static chat recall). arXiv:2511.20857 https://arxiv.org/abs/2511.20857
- **Live-Evo** (2026): online evolution of agentic memory from continuous feedback; separates “experience bank” from “meta-guideline bank”, with reinforcement/decay weighting. arXiv:2602.02369 https://arxiv.org/abs/2602.02369

**Local/edge and “practical memory” systems**
- **Mnemosyne** (2025): edge-focused memory architecture with graph storage, commit/prune, probabilistic recall with decay, and a small core summary. arXiv:2510.08601 https://arxiv.org/abs/2510.08601
- **HEMA** (2025): hippocampus-inspired system with a compact “one-sentence summary memory” plus vector-based episodic memory; focuses on efficiency. arXiv:2504.16754 https://arxiv.org/abs/2504.16754

**Production-leaning memory layers**
- **Mem0** (2025): “memory layer” for agents with extraction + retrieval + consolidation; reports LOCOMO improvements + latency/token reductions vs full-context and “OpenAI Memory” baselines. arXiv:2504.19413 https://arxiv.org/abs/2504.19413

### 9.3 Security & poisoning (memory as a persistence surface)

If the agent can take actions, persistent memory becomes an attacker’s best “durable channel”.

- **MINJA** (2025): memory injection attack for RAG agents (query-only, multi-turn, progressive shortening). arXiv:2503.03704 https://arxiv.org/abs/2503.03704
- **Memory poisoning attacks & defenses** (2026): survey-like system paper proposing composite trust scoring and sanitization mechanisms; evaluated on a medical agent setting (MIMIC-III). arXiv:2601.05504 https://arxiv.org/abs/2601.05504

### 9.4 How this literature updates our synthesis

1) The literature increasingly treats memory as **a pipeline** (indexing → retrieval → reading), not “a vector DB”. (LongMemEval is explicit about this.)
2) There’s a clear trend toward **typed memory** (facts vs experiences vs beliefs vs tasks) with explicit operations (retain/recall/reflect; ADD/UPDATE/DELETE).
3) “Episodic memory” is being operationalized as **event-structured data** plus temporal retrieval (not just daily logs).
4) Benchmarks are moving beyond “did you recall the fact?” toward “did you maintain coherent constraints over time?” (LoCoMo-Plus).
5) Security work is catching up: memory poisoning/injection is now a first-class concern. This aligns with shisad’s formal trust model + instruction/data boundary + gated writes + capability-scoped retrieval stance (the most complete security design in the survey).

## 10) Reality Check + “corrections over time” (memory as an epistemic ledger)

Reality Check is not “agent memory” in the RAG sense, but it encodes a set of **correction-aware provenance semantics** that most memory stacks handwave. For our purposes, it’s a reference design for:
- how to store *beliefs/facts/claims* with evidence and auditability, and
- how to handle **corrections** without erasing history.

Primary internal references:
- `~/github/lhl/realitycheck/docs/PLAN-analysis-rigor-improvement.md` (layering + corrections + auditability)
- `~/github/lhl/realitycheck/docs/RESEARCH-v0.3.0-review.md` (system review framing Reality Check as an “epistemic ledger”)

### 10.1 What Reality Check adds to the memory design space

Most agent memory systems optimize for *utility* (“did the agent recall the thing?”). Reality Check optimizes for **epistemic maintainability**:

- **Atomic units + typed claims**: decompose prose into checkable units with IDs and types.
- **Evidence links**: every belief can point to specific evidence, not just “somewhere in a doc”.
- **Layer discipline**: separate what’s **ASSERTED** vs **LAWFUL** vs **PRACTICED** vs **EFFECT** (prevents “should→is” collapse).
- **Actor/scope/quantifier discipline**: structured attribution and scope reduces silent overgeneralization.
- **Auditable credence**: credence changes are constrained by linked evidence; “confidence theater” is treated as a failure mode.

This maps cleanly onto agent memory:
- “Memory entries” are **claims**.
- “Sources/resources/logs” are evidence artifacts.
- “Consolidation” is claim revision and synthesis.

### 10.2 Corrections should be append-only, not overwrites

Most memory systems treat corrections as “update the item in place”. Humans usually don’t: they keep a trace (“I used to believe X”) and integrate the correction into a richer history, especially for identity-tied beliefs.

Reality Check’s plan explicitly pushes toward **append-only correction semantics**:
- record corrections/updates as first-class artifacts (“supersedes/retracts” links),
- keep a `Corrections & Updates` log for auditability and recency,
- propagate impacts to affected claims (and record the change).

Synthesis implication for agent memory:
- Model durable memories as **versioned records**:
  - keep the old value (with timestamps + provenance),
  - add a new value that *supersedes* it,
  - allow queries to retrieve “current best” by default, but preserve historical versions for explainability and safety.

This is especially relevant for:
- preferences that are contextual (“I prefer X when Y”),
- time-varying facts (roles, plans),
- strongly-held or identity-level beliefs (higher inertia; require stronger evidence or explicit user confirmation).

### 10.3 Multi-timescale consolidation (link to “Nested Learning”)

Reality Check treats “analysis over time” as a primary workflow problem: content gets revisited, updated, corrected, and re-synthesized.

Nested Learning’s “continuum memory system” framing provides a useful conceptual bridge: consolidation should operate on **multiple time scales**, with different retention/overwrite rules.

A synthesis-ready consolidation scheme (aligned with both):
- **Fast (per-turn / per-session):** write transcripts and a small working summary (high fidelity, high risk).
- **Medium (daily/weekly):** extract and dedupe “semantic facts”, promote stable items, and generate episodic event objects (versioned).
- **Slow (monthly/quarterly):** reconcile conflicts, re-index/re-embed, and run “identity/core belief” audits (changes require higher justification; keep full revision history).

Key design point: “memory consolidation” should mean **structure + provenance + revision**, not just “summarize and overwrite”.

## 11) Novel Memory Features (cross-system catalog)

This section catalogs **unique or notably original mechanisms** from any system, regardless of whether that system is complete or production-ready. The goal is to surface design ideas worth studying or adopting, even from systems that are otherwise limited.

### Write-side innovations

| Feature | System | What's novel | Status |
|---------|--------|-------------|--------|
| **Event-sourced memory storage** | Gigabrain | Append-only `memory_events` table with materialized `memory_current` projection. Every capture, rejection, dedup, and audit action logged with event_id, reason_codes, similarity scores, and JSON payloads. Per-memory timeline API. Closest any folk system gets to "corrections without forgetting." | Implemented (v0.1+) |
| **Explicit capture protocol via XML tags** | Gigabrain | Agent writes `<memory_note>` XML tags to signal explicit capture intent, rather than auto-extracting from conversation. Shifts capture from system heuristic to agent decision. | Implemented |
| **Type-aware semantic dedup thresholds** | Gigabrain | Different memory types get different similarity thresholds for dedup: USER_FACT/PREFERENCE at 0.78/0.62 vs CONTEXT at 0.84/0.70. Recognizes that "similar enough to merge" varies by memory category. | Implemented |
| **Multi-gate write pipeline with review queue** | Gigabrain | 7-stage pipeline: XML parse → junk filter (30+ patterns) → exact dedup → semantic dedup (weighted Jaccard) → plausibility heuristics → review queue → optional LLM second opinion. Borderline cases get human review rather than silent accept/reject. | Implemented |
| **Observation pipeline (wake/sleep/recap)** | ClawVault | Structured workflow phases for memory ingestion tied to agent lifecycle: wake (load context), active (observe + capture), sleep (consolidate), recap (generate summaries). Maps memory operations to natural workflow boundaries. | Implemented |
| **Enforcement distillation** | drag88/Marvy | LLM judge evaluates outputs → failing patterns get distilled into deterministic rules → rules applied without LLM calls on subsequent turns. Converts expensive LLM-based quality checks into cheap heuristics over time. | Implemented |
| **Background extraction via forked agent with mutual exclusion** | Claude Code | Forked subagent shares parent's prompt cache for cheap background extraction. `hasMemoryWritesSince()` creates mutual exclusion: if main agent wrote memories, extraction skips that turn range. Prevents duplicate writes without merge/conflict resolution. | Implemented (production) |
| **Exclusion-list-as-design-feature** | Claude Code | Explicit "What NOT to save" section prevents saving derivable content (code patterns, git history, architecture). Gate intercepts even explicit user requests to save activity logs — "ask what was *surprising* or *non-obvious* about it." Eval-validated (memory-prompt-iteration case 3, 0/2 → 3/3). | Implemented (production) |
| **Two-phase batch extraction→consolidation pipeline** | Codex | Phase 1 (gpt-5.1-codex-mini, reasoning=Low, 8-way parallel) extracts per-rollout memories → Phase 2 (gpt-5.3-codex, reasoning=Medium, single global) consolidates. Separate models tuned for task difficulty: cheap/fast for embarrassingly-parallel extraction, expensive/thoughtful for serial consolidation. | Implemented (open-source) |
| **Minimum signal gate (prompt-level no-op)** | Codex | Phase 1 extraction prompt contains explicit decision gate: "Will a future agent behave better because of this?" If the rollout lacks learning value (one-off queries, generic updates, temporary facts), the model returns empty JSON — no memory created. Encourages no-op as the default, not save-everything. | Implemented (open-source) |
| **Session commit with asynchronous promotion** | OpenViking | Sessions are committed as source objects, then background extraction/summarization promotes useful material across L0/L1/L2 stores and typed memory categories. Clean separation between hot-path capture and cold-path consolidation. | Implemented |
| **Lifecycle-scored context curation (AKL + verbs)** | ByteRover CLI | Context nodes carry lifecycle metadata and are manipulated through explicit operations (`ADD`/`UPDATE`/`UPSERT`/`MERGE`/`DELETE`). Consolidation becomes an explicit runtime behavior, not an opaque background summarizer. | Implemented |
| **Text-Based LoRA (behavioral adaptation)** | MIRA-OSS | Signal extraction from interactions → accumulation → periodic synthesis into behavioral directives → directive injection. A form of "fine-tuning without fine-tuning" via accumulated behavioral modification signals. | Implemented |
| **Continuum segments with narrative summaries** | MIRA-OSS | Continuous transcript stream collapsed into segments; LLM generates first-person narrative summaries with continuity from previous 5 summaries. Memories carry `source_segment_id` provenance linking back to source material. | Implemented |
| **Typed relationship links** | MIRA-OSS | Memory entities connected via typed edges: supersedes, conflicts, supports, refines, precedes, contextualizes. Richer than simple "related to" — captures the *nature* of the relationship. | Implemented |
| **Background forage agent (sub-agent collaboration)** | MIRA-OSS (v1r2) | Autonomous LLM-in-a-loop running in daemon thread with shared ToolRepository and user context propagation. Quality rubric (GROUNDED, RELEVANT, SPECIFIC, USEFUL, HONEST) baked into agent system prompt. Results surface via event bus → ForageTrinket → notification center. First folk system with parallel sub-agent collaboration. | Implemented |
| **Assessment-anchored user model synthesis** | MIRA-OSS (v1r2) | Conversation evaluated against anonymized system prompt sections → alignment/misalignment/contextual_pass signals with strength levels → periodic synthesis with Haiku critic validation loop (max 3 attempts) → XML user model. More structured than generic positive/negative feedback extraction. | Implemented |
| **3-axis linking (vector + entity + TF-IDF)** | MIRA-OSS (v1r2) | Memory linking uses three discovery axes: vector similarity, entity co-occurrence (with embedding floor for common-entity suppression), and TF-IDF term overlap (catches orphan memories with no entities and distant embeddings via rare shared terms). | Implemented |
| **Multi-model embedding storage** | Supermemory | Schema supports multiple embedding model columns per memory/chunk (`memoryEmbedding` + `memoryEmbeddingNew` + `matryokshaEmbedding`), enabling gradual embedding model migration without full reindex. No other system in the survey has this. | Implemented (schema; backend proprietary) |
| **Version chains with typed relationships** | Supermemory | Linked-list version chains (`parentMemoryId`/`rootMemoryId`/`isLatest`) combined with 3-type relationship ontology (`updates`/`extends`/`derives`). Simpler than event-sourcing (Gigabrain) or bi-temporal (Zep), but supports current-vs-historical distinction and relationship traversal in search results. | Implemented (schema; backend proprietary) |
| **Retroactive context evolution with drift protection** | Karta | When a new note links to an existing note, LLM updates the existing note's context to reflect cross-note implications. Drift-protected: `max_evolutions_per_note` gate (default 5) — over-evolved notes skip evolution and need consolidation instead. Clean interaction between write path and dream engine. | Implemented |
| **Atomic fact decomposition with per-fact embeddings** | Karta | Write path extracts 1-5 atomic facts per note via LLM, embeds each independently in a dedicated LanceDB table. Enables dual-granularity retrieval: coarse note-level ANN + fine-grained fact-level ANN in parallel, with fact hits expanded to parent notes. | Implemented |
| **Foresight signal extraction with validity windows** | Karta | LLM extracts forward-looking predictions during attribute generation; stored as `ForesightSignal` objects with `valid_until` dates. Abduction dreams also emit foresight signals. Active signals boost retrieval scores; expired signals cleaned at dream-pass start. | Implemented |
| **PEP-minted ingress_context handles with content binding** | shisad | Opaque provenance handles minted at actual system ingress boundary (CLI/connector/tool/web/consolidation). Handle binds source_origin + channel_trust + confirmation_status + taint + scope + source_id + SHA-256 content digest. Callers pass handles but cannot forge/mutate. PEP verifies written value derives from handle's bound content via declared derivation path (direct/extracted/summary). Closes "valid handle reused for unrelated content" laundering path. No other system has content-binding verification on provenance. | Implemented (v0.7.0, `src/shisad/memory/ingress.py`) |
| **Valid-combination matrix for trust derivation** | shisad | Three input fields (source_origin × channel_trust × confirmation_status) compose into a finite matrix of legal triples with pre-assigned trust bands and default confidences. Any triple not in the matrix rejected as TrustGateViolation. Single source of truth for "what provenance combinations are legal" — testable in isolation. Adding a new connector/ingress path means adding rows, not widening the write API. v0.7.0 matrix: 14 rules (5 elevated, 1 observed gated off, 6 untrusted, 2 legacy-compat) + pending-review sentinel. | Implemented (v0.7.0, `src/shisad/memory/trust.py::_VALID_TRUST_MATRIX`) |
| **Identity candidate lifecycle (observation → corroboration → proposal → user-approves)** | shisad | Multi-step preference inference with poisoning resistance: single owner_observed observation (0.30 confidence) → consolidation accumulates corroborations → at `N_candidate` threshold, create pending_review candidate → agent surfaces opportunistically (max `M_surface`) → user yes promotes to trust_elevated Identity; no tombstones with detector back-off; silence quietly expires. External messages can never become candidates. First system to bridge "learn from observation" to "user confirms what was learned" with formal safety gates. | Implemented (v0.7.0, `memory/identity_candidates.py` + `MemoryManager.promote_identity_candidate` / `reject_identity_candidate` / `note_identity_candidate_surface` / `expire_identity_candidate`) |
| **Strong-invalidation detection with user-ask UX** | shisad | Pattern-matched life-state changes ("no longer", "broke up with", "moved from", "left $company", "changed my mind") trigger user-facing ask rather than silent update: "I noticed you mentioned you're no longer at ACME — want me to update?" User yes supersedes; no logs signal; silence expires. The "breakup case" — failing to handle this gracefully destroys product trust. No other system detects and handles durable identity changes this way. | Implemented (v0.7.0, consolidation worker `StrongInvalidationProposal` + strong-invalidation review flow) |
| **Preference-as-data-predicate with instruction-like rejection** | shisad | Preferences stored as typed data predicates (`prefers(coffee, over: tea)`, `avoids(shellfish, reason: allergy)`) placed in untrusted prompt regions. Directive-shaped content masquerading as preferences (`always_use(vim)`, `never_ask_confirmation`, `prioritize_speed_over_safety`) rejected by the instruction-like content gate. Behavioral constraints require explicit confirmation even when user-originated. | Implemented (v0.7.0, `MemoryManager._INSTRUCTION_PATTERNS` + `_DISALLOWED_PREFERENCE_PREFIXES` + `_PREFERENCE_PREDICATE_PATTERN`) |

### Retrieval-side innovations

| Feature | System | What's novel | Status |
|---------|--------|-------------|--------|
| **Class-budgeted recall** | Gigabrain | Recall results allocated across typed budgets (core 0.45, situational 0.30, decisions 0.25) with configurable token cap. Ensures diverse memory types in every retrieval, not just highest-scoring items. | Implemented |
| **Multi-factor activity-day sigmoid decay** | MIRA-OSS | Decay based on *activity days* (days with actual interaction), not calendar days. Prevents memories from decaying during inactive periods. Uses sigmoid curve, not linear or exponential. | Implemented |
| **Hub-based entity discovery** | MIRA-OSS | Entity graph traversal starting from high-connectivity "hub" nodes, pulling in related entities and their connected memories. Leverages graph topology for retrieval, not just direct matches. | Implemented |
| **Subcortical pre-filter → dual-path retrieval** | MIRA-OSS | Fast "subcortical" pre-filter determines retrieval strategy before expensive search. Dual-path: pinned core memories (~15) + fresh retrieval (~5) composed together. | Implemented |
| **Speculative background retrieval (forage agent)** | MIRA-OSS (v1r2) | Background LLM-in-a-loop uses shared tools (continuum, memory, web search) to speculatively gather context in parallel with primary conversation. Quality rubric prevents hallucinated results. Multiple concurrent forages tracked by task_id. | Implemented |
| **Context overflow remediation** | MIRA-OSS (v1r2) | Embedding-based drift pruning (remove messages least similar to current query) → oldest-first fallback → tool pair safety → retry (up to 3 attempts). Graceful degradation vs simple truncation. | Implemented |
| **LLM-based memory routing (Sonnet selector)** | Claude Code | Sonnet reads a manifest of memory descriptions (up to 200 files) and picks up to 5 relevant memories per query via structured JSON output. Tool-aware filtering: excludes reference docs for active tools, keeps warnings/gotchas. Alternative to vector search at small scale. | Implemented (production) |
| **Staleness-first recall with multi-layer caveats** | Claude Code | Automatic freshness warnings for memories >1 day old ("This memory is N days old... Verify against current code"). System prompt includes "before recommending from memory" section: "The memory says X exists ≠ X exists now." Header wording A/B tested (abstract header 0/3, action-cue header 3/3). | Implemented (production) |
| **Progressive disclosure memory layout** | Codex | Four-tier read path: `memory_summary.md` (always loaded, ≤5K tokens) → `MEMORY.md` (grepable handbook) → `rollout_summaries/` (per-rollout evidence) → `skills/` (procedural memory). Each layer is more detailed and less frequently accessed. Agent uses keyword grep, not embeddings. Quick memory pass budget: ≤4-6 search steps. | Implemented (open-source) |
| **Usage-based citation-driven retention** | Codex | Agent appends `<oai-mem-citation>` XML blocks to responses. Parsed → thread IDs → increment `usage_count`/`last_usage` in DB. Phase 2 selection ranks by usage_count. Unused memories pruned after `max_unused_days`. First system in survey with complete citation→usage→retention→consolidation feedback loop. | Implemented (open-source) |
| **60-query benchmark-driven tuning** | OpenClaw | Retrieval quality systematically measured against a 60-query benchmark suite. Weights and parameters tuned empirically, not by intuition. | Implemented |
| **Filesystem-style typed retrieval over `viking://`** | OpenViking | Same substrate supports structured `find()` and semantic `search()` across memory, resources, skills, sessions, and projects, with recursive hierarchy traversal. Moves retrieval from "search a bag of notes" to "navigate typed context objects." | Implemented |
| **Five-tier progressive retrieval** | ByteRover CLI | Tier 0 exact cache → Tier 1 fuzzy cache → Tier 2 MiniSearch direct → Tier 3 optimized LLM → Tier 4 full agentic retrieval. Retrieval cost escalates only when cheaper paths fail. | Implemented |
| **Static/dynamic profile synthesis API** | Supermemory | First-class `/v4/profile` endpoint that automatically partitions memories into permanent facts (`isStatic: true`) vs recent context, served alongside search results in a single call. No other system in the survey exposes profile generation as an API primitive — most treat persona as a manually maintained block. | Implemented (backend proprietary) |
| **Embedding-based query classification (6 modes)** | Karta | Embeds prototype examples for 6 query modes (Standard/Recency/Breadth/Computation/Temporal/Existence), computes centroids. Each query classified by cosine similarity to centroids — learned, not hard-coded. Mode determines top_k, recency weight, multi-hop behavior, reranker strategy. Lazy-initialized with 60s timeout + keyword fallback. | Implemented |
| **Cross-encoder reranking with abstention gate** | Karta | Jina AI cross-encoder scores query-passage relevance. Raw scores preserved (not normalized to 0-1) — "normalizing would destroy the abstention signal." If best relevance < threshold, system abstains rather than hallucinating. Computation mode skips reorder to preserve completeness. Three implementations (Jina/LLM/noop) behind trait. | Implemented |
| **Contradiction force-retrieval from dream source notes** | Karta | When ANN results contain a contradiction dream or link to one, both source notes are fetched and injected as `[CONTRADICTION SOURCE]` with instructions to present both sides. Catches cases where only one side of a contradiction reaches top-K. Capped at 10 injections for latency. | Implemented |
| **Structured episode digest matching** | Karta | Episode digests contain pre-computed entities (typed, counted), date ranges, aggregation entries (label + count + items), and topic sequences. For Computation/Breadth/Recency queries, these are searched via keyword matching — answers "how many X" from pre-computed counts rather than re-counting from individual notes. | Implemented |
| **Insufficient-info retry with wider retrieval** | Karta | For Computation/Temporal queries, if the LLM answer admits insufficient information ("can't determine", "not mentioned"), automatically retries with 3x wider retrieval and no reranker. Pragmatic self-healing for the failure mode where missing specific facts causes false abstention. | Implemented |
| **Bi-temporal validity windows** | memv | Memories carry both *assertion time* (when stored) and *valid time* (when the fact was/is true). Enables temporal queries ("what did I believe in January?") and prevents stale facts from polluting current context. | Proposed (spec) |
| **Forward triggers (temporal preload)** | @jumperz | Pre-scheduled memory injection based on anticipated future context needs — reminders and task-relevant memories loaded proactively. | Proposed (spec) |
| **Five compiled memory surfaces over one substrate** | shisad | Identity (always-loaded, trust_elevated, ~750 tok default), Active Attention (per-turn, workflow_state-aware, scope-filtered, class-balanced), Recall/MemoryPack (per-query, hybrid search, class-budgeted), Procedural/Skills (on-invocation, invocation_eligible gate), Evidence (on-demand, audited). Each surface has independent refresh rate, trust band requirement, and token budget. Clean separation: one data model, five access patterns. | Implemented (v0.7.0, `src/shisad/memory/surfaces/` — identity.py, active_attention.py, recall.py, procedural.py) |
| **Active Attention surface with workflow lifecycle** | shisad | First-class per-turn compiled view of open_thread/scheduled/recurring/waiting_on/inbox_item entries. Workflow_state lifecycle (active/waiting/blocked/stale/closed) is orthogonal to content-safety status (active/quarantined/tombstoned/hard_deleted) — enforced invariant prevents workflow transitions from accidentally triggering security-relevant state changes. Scope filter and channel_binding support vary by invocation context (CLI vs channel-affined). No other system has agenda management as a compiled memory surface. | Implemented (v0.7.0, `memory/surfaces/active_attention.py` + `MemoryManager.compile_active_attention`) |
| **Capability-aware retrieval with confirmation gating** | shisad | Retrieval collections filtered by agent's active capability snapshot. When side-effectful capabilities are active, external_web/tool_output retrieval requires confirmation (not default-deny). Pending-review items kept out of default recall with confirmation gate rather than silently excluded. Per-entry MemoryPack annotations (trust tier + staleness + conflict + churn) carried on underlying entries; surface-level projection is partial v0.7.0 pending M2 rewire. | Partially implemented (v0.7.0 ships capability filtering + pending-review gating via `ingestion.py` + `MemoryManager.list_review_queue`; surface-level annotation projection planned for v0.7.1+) |
| **Archive-tier automatic widening** | shisad | Entries below configurable decay_score threshold logically partitioned to archive tier. Default retrieval searches active only. When retrieval sufficiency check determines active-tier results are below relevance floor, system automatically widens to include archived entries with archive annotations in MemoryPack. Logical partition — one store, one index, implemented as WHERE clause. | Partially implemented (v0.7.0 plumbs `include_archived` flag through RecallPack; auto-widen on retrieval-sufficiency floor planned for v0.7.1+) |

### Maintenance & evaluation innovations

| Feature | System | What's novel | Status |
|---------|--------|-------------|--------|
| **Nightly 8-stage maintenance pipeline** | Gigabrain | Ordered sequence: snapshot → native_sync → quality_sweep → exact_dedupe → semantic_dedupe → audit_delta → archive_compression → vacuum → metrics_report. Value scoring uses weighted feature vector with 8 factors (including negative ops_noise penalty). | Implemented |
| **Entity garbage collection** | MIRA-OSS | Scheduled cleanup of orphaned entities — nodes with no remaining memory references are pruned. Prevents graph bloat from deleted or archived memories. | Implemented |
| **Multi-user RLS security** | MIRA-OSS | Row-Level Security in PostgreSQL ensuring memory isolation between users. Combined with Vault-based credential management. Production-grade multi-tenancy, not just single-user isolation. | Implemented |
| **Time-based forgetting with reason tracking** | Supermemory | `forgetAfter` TTL date + `isForgotten` flag + `forgetReason` audit trail. Most systems use decay scores without hard expiration, or don't forget at all. The reason field provides auditability for why a memory was dropped. | Implemented (schema; backend proprietary) |
| **MemoryBench cross-system benchmark framework** | Supermemory | Open-source CLI tool for benchmarking memory systems across LongMemEval/LoCoMo/ConvoMem with composite MemScore metric (quality% + latency + context tokens). Supports multiple providers and judge models. First open-source cross-system memory benchmarking tool in the survey. | Implemented (open-source) |
| **Auto dream with multi-gate scheduling** | Claude Code | Background consolidation gated by: feature flag → time (≥24h) → scan throttle (10min) → session count (≥5) → file lock. 4-phase prompt: orient → gather → consolidate → prune. Lock rolls back on failure. Registered as visible task with progress watching. | Implemented (production) |
| **Eval-validated prompt engineering with case IDs** | Claude Code | Memory prompt sections carry eval case references (e.g., "H1: 0/2 → 3/3 via appendSystemPrompt", "H6: branch-pollution evals #22856"). Header-wording experiments, position-sensitivity tests, and appendSystemPrompt vs in-place A/B tests documented in source comments. | Implemented (production) |
| **SQLite-backed distributed job coordination** | Codex | Leases (1h), ownership tokens, heartbeats (90s), watermarks, retry backoff — all in SQLite. Multi-worker safe without external infrastructure. Phase 1 leases prevent duplicate extraction; Phase 2 global lock serializes consolidation. Watermarks track dirty/clean state for incremental processing. | Implemented (open-source) |
| **Thread-diff-based incremental forgetting** | Codex | Phase 2 receives selection diff: added/retained/removed thread IDs. Added → extract new content. Removed → surgical cleanup (delete references, clean empty task groups). Evidence for removed threads preserved during transition (union of current + previous selection). Avoids "blow up and rebuild" re-consolidation. | Implemented (open-source) |
| **Usage-based memory pruning** | Codex | `prune_stage1_outputs_for_retention(max_unused_days, batch_size=200)` removes memories with no recent usage. Runs before every Phase 1 extraction pass. Combined with usage_count-based Phase 2 selection, creates a complete "unused memories fade out" lifecycle. | Implemented (open-source) |
| **A/B recall comparison harness** | Gigabrain | `harness-lab-run.js` supports A/B comparison of recall configurations with bilingual (EN/DE) evaluation cases. Enables empirical tuning of retrieval parameters. | Implemented |
| **7-type dream engine with inference feedback** | Karta | Background reasoning across 7 types: deduction (per-cluster), induction (cross-cluster patterns), abduction (gap hypotheses → foresight signals), consolidation (entity profiles), contradiction (detect + persist), episode digest (structured metadata), cross-episode digest (entity timelines + inter-episode links). Incremental cursor, embedding-based dedup, union-find clustering. Dreams feed back into retrieval: contradiction force-injection, profile auto-include, foresight boosting. | Implemented |
| **BEAM 100K with 243-failure root cause catalog** | Karta | 400 questions across 10 abilities, 11 benchmark runs tracked with per-ability breakdowns. 243 failures categorized by root cause (INCOMPLETE_RETRIEVAL 40.7%, FALSE_ABSTENTION 18.1%, WRONG_ORDER 17.3%, CONTRADICTION_MISS 10.7%). Sub-patterns identified with specific examples and fix recommendations. Most transparent self-assessment in the survey. | Implemented |
| **Five-event confidence-update mechanics** | shisad | Confidence updated over time by 5 events: corroboration (new evidence supports → confidence += δ, diminishing, capped 0.99 via `clamp_confidence`), contradiction (predicate conflict → conflict markers + confidence decrease → user-facing review), strong invalidation (life-state change patterns → user-ask UX), re-verification (user confirms → pull toward 0.95), stale drift (decay_score recomputed without touching confidence). All deltas are per-update auditable events with old/new values, trigger, and references (via `MemoryEventStore`). 0.99 cap is deliberate — system never claims certainty. | Implemented (v0.7.0, `MemoryManager.update_confidence` / `mark_conflict` / `verify` / `update_decay_score` + consolidation worker strong-invalidation path) |
| **Adversarial evaluation track (ISR/ASR/downstream-harm)** | shisad | Six attack scenarios with concrete metrics: Injection Success Rate (write-path), Attack Success Rate (behavior change), downstream harm rate (unsafe tool calls — must be 0% for critical-path), Utility Drop (<5% relative). Attack types: write-path injection, MINJA-style query-only progressive injection, preference poisoning, retrieval-to-sink abuse, revision churn abuse, cross-scope contamination. Runs alongside functional benchmarks at every milestone. Only system with adversarial testing as architecture-level requirement. | Partially implemented (v0.7.0 ships scaffolding: `shisad.security.adversarial.AdversarialMetrics` + `scripts/m6_adversarial_gate.py` + `m6_adversarial_metrics.py` + 3-case `tests/adversarial/memory/poisoning_cases.json`; current gate tracks `utility_retention` only — ISR/ASR/downstream-harm decomposition planned v0.7.1+) |
| **Sandboxed consolidation worker** | shisad | Consolidation jobs run with explicit capability scope: no network, no tool recursion, no self-invocation, write_scope=memory_substrate. All consolidation writes resolve to (consolidation_derived, consolidation, auto_accepted) — matrix row hard-coded to `untrusted` with `confidence_mode="inherit_weighted"`, so consolidation mathematically cannot upgrade trust band. Pattern adapted from Codex Phase 2 sandboxed sub-agent. | Implemented (v0.7.0, `memory/consolidation/worker.py::ConsolidationCapabilityScope`) |

### Security innovations

| Feature | System | What's novel | Status |
|---------|--------|-------------|--------|
| **Junk filter with 30+ pattern categories** | Gigabrain | Blocks system prompts, API keys, benchmark artifacts, wrapper tags, and other non-memory content from entering the memory store. Fail-closed on suspicious content. | Implemented |
| **XML-escape injection prevention** | Gigabrain | All recalled content XML-escaped before injection into agent context, preventing stored content from being interpreted as markup/instructions. | Implemented |
| **Memory write injection scanning** | Hermes Agent | Memory writes scanned for prompt injection patterns, credential exfiltration attempts, SSH backdoors, and invisible Unicode. More write-gating than most systems. (Not in ANALYSIS.md comparison; see REVIEWED.md.) | Implemented |
| **Team memory with per-type scope and secret scanning** | Claude Code | Private + shared directories with per-type scope guidance (user=always private, feedback=default private, project=bias team, reference=usually team). OAuth-authenticated delta sync. `teamMemSecretGuard` scans for credentials before upload. `projectSettings` excluded from `autoMemoryDirectory` (prevents malicious repo from redirecting writes to `~/.ssh`). | Implemented (production) |
| **Security-hardened path validation (multi-layer)** | Claude Code | Symlink traversal: `realpathDeepestExisting()` walks up ancestors. Unicode normalization: NFKC check for fullwidth characters. URL-encoded traversals: decodeURIComponent check. Dangling symlinks: `lstat()` distinguishes from truly non-existent paths. Prefix-attack protection: trailing separator in containment check. Null byte rejection. | Implemented (production) |
| **Secret redaction on extracted memories** | Codex | `codex_secrets::redact_secrets()` applied to all three Phase 1 output fields (raw_memory, rollout_summary, rollout_slug) before database storage. Developer messages stripped entirely. Memory-excluded contextual fragments filtered from rollout content before extraction. | Implemented (open-source) |
| **Sandboxed consolidation agent** | Codex | Phase 2 consolidation sub-agent runs with: no network access, local write only (memory_root), no user approvals, disabled features (SpawnCsv, Collab, MemoryTool prevents recursion), no collaboration delegation. Config cloned and modified for isolation. Symlink protection on memory root clearing. | Implemented (open-source) |
| **Taint-aware retrieval with capability scoping** | shisad | PEP-minted ingress_context handles carry taint_labels from ingestion through retrieval (`TaintLabel` on `IngressContext` → `MemoryEntry.taint_labels` → retrieval results). Capability-scoped retrieval filters collections by agent's active capability set. External_web/tool_output retrieval requires confirmation when side-effectful capabilities active. Pending-review items kept out of default recall. Only system with both taint carry-through and capability-scoped retrieval. (Per-entry surface-level trust/staleness/conflict projection in MemoryPack is partial in v0.7.0 — data plumbed, compiler rewire pending.) | Implemented (v0.7.0, `memory/ingress.py` + `memory/ingestion.py` + `MemoryManager.list_review_queue`) |
| **Instruction/data boundary as architecture invariant** | shisad | Memory always placed in untrusted prompt regions. Preferences stored as data predicates, not behavioral directives. Identity surface uses "user-authored region" ≠ system/policy region. Instruction-like content (`always do X`, `never do Y`, `ignore policy`) rejected by write gate. Consolidation cannot produce trusted content. Most formally specified instruction/data separation in the survey. | Implemented (v0.7.0, `MemoryManager._INSTRUCTION_PATTERNS` + `_DISALLOWED_PREFERENCE_PREFIXES` + Identity surface `IDENTITY_BLOCKED_SOURCE_ORIGINS`) |
| **Cross-scope contamination closed at write API** | shisad | Write-time scope bound to ingress_context handle's scope — entries can only be written to the scope they were minted in. Cross-scope access (e.g., surfacing Discord inbox item in CLI Active Attention) happens at read side via scope filters, not at write side via scope overrides. Closes "owner writes Discord message, handle reused to stamp entry as scope=user so it reaches Identity" laundering path. | Implemented (v0.7.0, scope field bound on `IngressContext` and propagated to `MemoryEntry`; read-side scope filters in `build_active_attention_pack`) |
| **Trust fields PEP-minted, never caller-supplied** | shisad | source_origin, channel_trust, confirmation_status set by runtime Policy Enforcement Point from actual ingress context, never by the LLM or tools. Callers describe content shape + provide ingress handle; runtime decides provenance. Any attempt to write these fields is a type error at the API boundary. Every write records ingress_handle_id in event trail. | Implemented (v0.7.0, `IngressContextRegistry.mint` + `MemoryEvent.ingress_handle_id` + frozen `IngressContext` Pydantic model) |

### Architectural innovations

| Feature | System | What's novel | Status |
|---------|--------|-------------|--------|
| **Memory as "Memory OS" tiers** | Synthesis (this doc) | Six-tier model: append-only source → derived corpus → durable typed entries → structured filing → curated always-loaded → maintenance layer. Provides a framework for evaluating any memory system's completeness. | Conceptual |
| **Filesystem-shaped context namespace (`viking://`)** | OpenViking | Hierarchical object store treating agent context as a filesystem-like namespace rather than separate memory/document/tool silos. Memory is one typed namespace inside a broader control plane. | Implemented |
| **Skills as procedural memory** | Hermes Agent | SKILL.md files with YAML frontmatter and progressive disclosure (Level 0: list → Level 1: full → Level 2: references). Maps learned workflows to memory entries. (Not in ANALYSIS.md comparison; see REVIEWED.md.) | Implemented |
| **Person service with bilingual coreference** | Gigabrain | Entity mention tracking across memories with bilingual (EN/DE) pronoun resolution for follow-up queries. "Who is X?" query detection with entity answer hints injected into recall. | Implemented |
| **Portrait synthesis from collapsed summaries** | MIRA-OSS (v1r2) | Every 10 use-days, generates a 150–250 word prose portrait from recent collapsed segment summaries (20 activity-day window). Injected into base system prompt as `{user_context}`. Provides the LLM with a continuously-updated user model without consuming memory retrieval budget. | Implemented |
| **Immutable domain models + Unit of Work** | MIRA-OSS (v1r2) | Frozen dataclasses for ContinuumState and Message prevent silent state mutations. Continuum aggregate root uses mutable message cache with immutable backing state. Unit of Work pattern ensures atomic DB→cache persistence with DB authoritative on crash. | Implemented |
| **Forked-agent-as-infrastructure pattern** | Claude Code | Three subsystems (extraction, consolidation, session memory) use the same "perfect fork with shared prompt cache" pattern. Restricted tool permissions per fork. Only viable when you control the inference infrastructure (cache sharing). | Implemented (production) |
| **KAIROS daily-log + nightly dream mode** | Claude Code | Long-lived assistant sessions use append-only date-named logs (`logs/YYYY/MM/YYYY-MM-DD.md`) with timestamped bullets. MEMORY.md becomes read-only (maintained nightly from logs via /dream). Date rollover handled via attachment. Separates hot-path writes from cold-path indexing. | Implemented (production) |
| **Skills as procedural memory** | Codex | SKILL.md with YAML frontmatter (name, description, argument-hint, allowed-tools, user-invocable) + `scripts/` (executable helpers) + `templates/` (reusable) + `examples/` (worked examples). Creation criteria: repeats > 1, failure shields, formatting contracts. Keep < 500 lines. First system in survey to extract learned workflows into executable filesystem artifacts. | Implemented (open-source) |
| **Markdown Context Tree** | ByteRover CLI | Local-first, file-native persistent knowledge tree where agent memory lives as inspectable markdown nodes instead of a remote vector store. Strong fit for coding workflows that already live in files and version control. | Implemented |
| **Two-model extraction→consolidation strategy** | Codex | Phase 1 uses smaller/cheaper model (gpt-5.1-codex-mini, reasoning=Low) for embarrassingly-parallel per-rollout extraction. Phase 2 uses larger/more capable model (gpt-5.3-codex, reasoning=Medium) for serial global consolidation. Matches compute cost to task difficulty. | Implemented (open-source) |
| **Multimodal memory ingestion** | Google Always-On Memory Agent | 27 file types via Gemini native multimodal capabilities — images, PDFs, audio, video summarized into text memories. Most memory systems are text-only. (PoC quality; see REVIEWED.md.) | PoC |
| **Zettelkasten knowledge graph with LLM-decided linking** | Karta | Notes enriched with LLM-generated context, then ANN search finds candidates, LLM decides which to link with reasons. Bidirectional links stored in SQLite. Union-find clustering over link graph for dream engine. Inspired by A-Mem paper but with drift protection, dream engine, and embedded Rust implementation. | Implemented |
| **Provenance enum with 6-variant source tracking** | Karta | Every note tagged: `Observed` (direct input), `Dream { type, sources, confidence }`, `Profile { entity }`, `Episode { id }`, `Fact { source_note }`, `Digest { episode }`. Every derived note traces to its sources. Provenance markers injected into synthesis prompt (FACT vs INFERRED). | Implemented |
| **Storage substrate + surfaces architecture** | shisad | Central reframe: one unified typed-entry store (canonical schema, 21 entry_type literals across 6 categories) serves five compiled memory surfaces. Surfaces differ on refresh cadence (always vs per-query vs on-demand), persistence across turns, and substrate slice (entry types + trust band + scope filters). Replaces the common "memory tiers" model where storage and access are conflated. Cleanest storage/access separation in the survey. | Implemented (v0.7.0, `src/shisad/memory/backend/sqlite.py` + `memory/schema.py` + `memory/surfaces/`) |
| **Procedural memory with orthogonal install/invocation** | shisad | skill/runbook/template entry types with `invocation_eligible` flag orthogonal to `trust_band`. Install is a write-path operation with trust gating (user confirmation or PEP-approved via `is_invocation_eligible_triple`). Invocation is a run-path operation — `/skill <id>` proceeds without confirmation for already-installed skills via `MemoryManager.invoke_skill`. A PEP-approved tool-installed skill has `trust_band = untrusted` but `invocation_eligible = true`. Agent-proposes-user-approves for discovery via pending-review queue. Only system that formally separates install-time authorization from invocation-time execution for procedural memory. | Implemented (v0.7.0, `memory/trust.py::is_invocation_eligible_triple` + `MemoryManager.promote_to_skill` / `invoke_skill` / `list_invocable_skills`) |
| **Workflow lifecycle orthogonal to content-safety lifecycle** | shisad | Active-agenda entries carry `workflow_state` (active/waiting/blocked/stale/closed) orthogonal to `status` (active/quarantined/tombstoned/hard_deleted). Enforced invariants: status transitions never modify workflow_state; workflow transitions never modify status. Prevents the class of bug where a workflow action accidentally triggers a security-relevant state change (or vice versa). | Implemented (v0.7.0, `memory/schema.py::WorkflowState` + `MemoryStatus` + `MemoryManager.set_workflow_state` / `quarantine` / `unquarantine`) |
| **Legacy backfill without offline migration** | shisad | v0.7.0 reads pre-v0.7.0 entries through a backfill layer resolving missing fields to conservative defaults at read time. No offline migration step. No legacy entry reaches trust_elevated via backfill alone — two explicit legacy-compat rows in the matrix land v0.6-shape entries at `untrusted` with preserved confidence. All backfill triples validated against the same valid-combination matrix. Single-source-of-truth remap module, testable in isolation. | Implemented (v0.7.0, `memory/trust.py::backfill_legacy_triple` + `memory/remap.py` + `schema.MemoryEntry._backfill_legacy_shape`) |

## Corrections & Updates

- 2026-04-25: Refreshed shisad entries across all matrices, §2.6 security summary, §5 mapping, and Novel Memory Features to reflect the **v0.7.0 release content** (CHANGELOG 2026-04-23). Every "Planned (v0.7.0 M*)" row that actually shipped is now marked "Implemented (v0.7.0)" with specific file references into `src/shisad/memory/` (trust.py, ingress.py, schema.py, manager.py, events.py, surfaces/*, consolidation/worker.py, graph/derived.py, backend/sqlite.py, identity_candidates.py, remap.py). Honest gaps called out as "Partially implemented" where shipped code is a subset of the planned primitive: Recall-surface MemoryPack annotation projection (rewire pending), archive-tier auto-widening on retrieval sufficiency floor, adversarial ISR/ASR/downstream-harm decomposition (scaffolding + utility_retention gate + 3-case poisoning fixture shipped; full metric breakdown planned for v0.7.1+). Matrix framing updated: "16-row matrix" → "14 rules + pending-review sentinel in code" (actual `_VALID_TRUST_MATRIX` entries). Entry-type count updated: 15 types (plan) → 21 types / 6 categories (shipped schema, after inbox/channel/response types added during implementation). `observed` trust band noted as defined but gated off in v0.7.0 (`enable_observed=False`). Benchmark adapters (LoCoMo/LongMemEval/EverMemBench/StructMemEval/LoCoMo-Plus/BEAM+LIGHT) are **not yet in the v0.7.0 tree** — no running benchmark numbers. Standalone analysis refreshed: ANALYSIS-shisad.md.
- 2026-04-22: Refreshed shisad entries across all matrices, deep comparisons, and Novel Memory Features for the 2026-04-21 plan revision (storage/surfaces split; trust model; executive-assistant design; Path A v0.7.0 scope). Replaces the earlier "shisad (current plan baseline)" characterization. Key additions: formal trust model with PEP-minted ingress_context handles + 16-row valid-combination matrix + content-binding verification; 5-surface architecture (Identity/Active Attention/Recall/Procedural/Evidence) with per-surface refresh/trust/budget; identity candidate lifecycle (observation → corroboration → agent-proposes-user-approves); procedural memory with orthogonal install/invocation + invocation_eligible ⊥ trust_band; Active Attention surface with workflow_state lifecycle; 5-event confidence-update mechanics (corroboration/contradiction/strong-invalidation/re-verification/stale-drift); adversarial evaluation track (ISR/ASR/downstream-harm, 6 attack scenarios); strong-invalidation UX ("breakup case"); 15 entry types across 5 categories; legacy backfill without migration. Implementation status: design-complete, v0.7.0 in progress (six milestones). Standalone analysis: ANALYSIS-shisad.md.
- 2026-04-09: Added Karta (rohithzr) to all comparison matrices and Novel Memory Features. Karta adds: 7-type dream engine (deduction/induction/abduction/consolidation/contradiction/episode digest/cross-episode digest) with inference feedback into retrieval, embedding-based query classification (6 modes via prototype centroids), retroactive context evolution with drift protection, atomic fact decomposition with per-fact embeddings and dual-granularity search, foresight signal extraction/expiry/boosting, cross-encoder reranking with abstention gate, contradiction force-retrieval from dream source notes, structured episode digest matching, insufficient-info retry, Zettelkasten knowledge graph with LLM-decided linking. BEAM 100K: 57.7% with 243-failure root cause catalog. Rust library, MIT, v0.1.0. Standalone analysis: ANALYSIS-karta.md. Triage details in REVIEWED.md.
- 2026-04-04: Folded in the standalone analyses for `OpenViking` and `ByteRover CLI`. `OpenViking` is now treated as a typed context filesystem / control plane; `ByteRover CLI` as an agent-native coding memory runtime with lifecycle-managed local context.

- This synthesis is grounded in the local deep dives (`ANALYSIS-*.md`) and vendored snapshots for OpenClaw/ClawVault.
- External comparisons (Letta/Mem0) are based on their public READMEs and cited paper(s) as of 2026-02-21; treat product claims as “as stated by authors” unless reproduced.
- 2026-02-21: Added an arXiv-focused literature scan (benchmarks + recent “memory systems” + poisoning/security papers). This is not exhaustive; it’s a starting bibliography for deeper per-paper reference summaries if needed.
- 2026-02-21: Added Reality Check notes on correction-aware provenance (append-only correction semantics) and connected them to multi-timescale consolidation and Nested Learning’s continuum-memory framing.
- 2026-03-03: Added MIRA-OSS (taylorsatula) to all comparison matrices and deep comparisons. MIRA adds: multi-factor activity-day sigmoid decay, hub-based entity discovery, typed relationship links (supersedes/conflicts/supports/refines/precedes/contextualizes), Text-Based LoRA behavioral adaptation, and production-grade multi-user security (RLS + Vault). Also added memv and MIRA-OSS to the systems-in-scope list and related references.
- 2026-03-07: Added Gigabrain (legendaryvibecoder) to all comparison matrices. Gigabrain adds: event-sourced storage (append-only events + materialized projection), explicit capture via XML tag protocol, type-aware semantic dedup thresholds, multi-gate write pipeline with review queue, class-budgeted recall, and A/B recall benchmark harness. Also created Section 11 "Novel Memory Features" cataloging unique mechanisms across all systems regardless of source completeness. Triage details in REVIEWED.md.
- 2026-03-30: Refreshed MIRA-OSS entries across all matrices for v1 rev 2 (2026.03.30-major). Substantive additions: background forage agent (first folk system with parallel sub-agent collaboration), assessment-anchored user model synthesis with critic validation, portrait synthesis, 3-axis linking (vector + entity + TF-IDF), extraction pipeline restructure, verbose refinement ablated, context overflow remediation, immutable domain models + Unit of Work, 16 tools (up from 11), account tier system, segment pause/resume. ANALYSIS-mira-OSS.md fully rewritten. See REVIEWED.md for triage entry.
- 2026-03-31: Added Claude Code memory subsystem (Anthropic) to all comparison matrices and Novel Memory Features. Claude Code adds: forked-agent extraction with mutual exclusion (hasMemoryWritesSince), LLM-based relevance selection (Sonnet selector over manifest), staleness-first recall with multi-layer caveats, exclusion-list-as-design-feature (eval-validated explicit-save gate), team memory with per-type scope and secret scanning, auto dream with multi-gate scheduling, KAIROS daily-log mode, security-hardened path validation (symlink/Unicode/URL-encoded traversal protection), and eval-validated prompt engineering with specific case IDs and pass rates. First-party production system; standalone analysis: ANALYSIS-claude-code-memory.md. Triage details in REVIEWED.md.
- 2026-03-28: Added Supermemory (supermemoryai) to all comparison matrices and Novel Memory Features. Supermemory adds: version chains with typed relationships (updates/extends/derives), static/dynamic profile synthesis API, multi-model embedding storage for model migration, time-based forgetting with reason tracking, and MemoryBench cross-system benchmarking framework. Industry memory-as-a-service startup; core engine is proprietary (open-source is SDK/UI client). Self-reported #1 on LongMemEval/LoCoMo/ConvoMem (no peer-reviewed paper). Standalone analysis: ANALYSIS-supermemory.md. Triage details in REVIEWED.md.
- 2026-03-31: Added Codex memory subsystem (OpenAI) to all comparison matrices and Novel Memory Features. Codex adds: two-phase batch extraction→consolidation pipeline (gpt-5.1-codex-mini → gpt-5.3-codex), SQLite-backed distributed job coordination (leases/heartbeats/watermarks), progressive disclosure memory layout (memory_summary → MEMORY.md → rollout_summaries → skills), skills as procedural memory (SKILL.md + scripts + templates + examples), usage-based citation-driven retention (oai-mem-citation → usage_count → selection priority → pruning), thread-diff-based incremental forgetting (added/retained/removed with evidence preservation), minimum signal gate (prompt-level no-op for low-value rollouts), secret redaction on all outputs, and sandboxed consolidation agent. First-party open-source system; standalone analysis: ANALYSIS-codex-memory.md. Triage details in REVIEWED.md.
