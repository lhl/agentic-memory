---
title: "Synthesis — Agentic Memory Systems (Comparison + Design Space)"
date: 2026-03-30
type: synthesis
scope:
  - agentic-memory repo systems (jumperz, joelclaw ADR-0077, OpenClaw architecture, Marvy output degradation, ClawVault, memv, MIRA-OSS, Gigabrain)
  - comparison baselines (ChatGPT/Claude-style minimal memory, Letta/MemGPT, Mem0)
  - implementation target (shisad long-term memory plans)
related:
  - ANALYSIS-jumperz-agent-memory-stack.md
  - ANALYSIS-joelhooks-adr-0077-memory-system-next-phase.md
  - ANALYSIS-coolmanns-openclaw-memory-architecture.md
  - ANALYSIS-drag88-agent-output-degradation.md
  - ANALYSIS-versatly-clawvault.md
  - ANALYSIS-vstorm-memv.md
  - ANALYSIS-mira-OSS.md
  - ANALYSIS-claude-code-memory.md
  - ANALYSIS-codex-memory.md
  - REVIEWED.md (Gigabrain detailed notes, Claude Code detailed notes, Codex detailed notes)
  - references/jumperz-agent-memory-stack.md
  - references/joelhooks-adr-0077-memory-system-next-phase.md
  - references/coolmanns-openclaw-memory-architecture.md
  - references/drag88-agent-output-degradation.md
  - references/versatly-clawvault.md
  - vendor/openclaw-memory-architecture
  - vendor/clawvault
  - vendor/memv
  - vendor/mira-OSS
external_comparisons:
  - shisad docs: /home/lhl/github/shisa-ai/shisad/docs
  - Letta (formerly MemGPT): https://github.com/letta-ai/letta
  - Mem0: https://github.com/mem0ai/mem0
---

# Synthesis — Agentic Memory Systems (Comparison + Design Space)

This document is a **full synthesis and comparison** across the memory systems in this repo, plus a few baselines and “traditional” approaches (Letta/MemGPT, Mem0, generic RAG). It is designed to support the next step: **cross-system synthesis** and **choosing what to implement** (e.g., in `~/github/shisa-ai/shisad/docs`).

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

5) Among sources here, **OpenClaw memory architecture** is the most synthesis-ready on the *engineering* axis (explicit layering + benchmark harness + drift tracking).  
**shisad** is the most synthesis-ready on the *safety* axis (taint-aware, capability-scoped retrieval; gated memory writes; instruction/data boundary).

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

### Comparison baselines (external)
- **Minimal “MEMORY.md-only” agent setups:** common pattern in prompt-engineered agents.
- **Letta (formerly MemGPT):** stateful agents with explicit memory blocks + archival/recall memories.  
  Sources: `https://github.com/letta-ai/letta`, plus local notes in `~/github/shisa-ai/shisad/docs/research/RESEARCH-memgpt-letta.md`.
- **Mem0:** memory layer that extracts/stores/retrieves user/session/agent memories; paper + SDKs.  
  Sources: `https://github.com/mem0ai/mem0` and the cited arXiv paper (`arXiv:2504.19413`).

### Implementation target (for mapping)
- **shisad plans (security-first long-term memory):**
  - Memory invariants + MemoryManager: `~/github/shisa-ai/shisad/docs/PLAN-security.md`
  - End-to-end long-term memory plan: `~/github/shisa-ai/shisad/docs/PLAN-longterm-memory.md`
  - v0.3 conversation memory summarizer + retrieval wiring: `~/github/shisa-ai/shisad/docs/v0.3/PLAN-v0.3.3.md`

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
| shisad (planned/partially implemented) | ✅ | ✅ | ✅ | ✅ (summaries + events planned) | ✅ (gated MemoryEntry) | ✅ (policy invariants) | ✅ (todos planned) | ✅ (knowledge graph planned) | ✅ (consolidation planned) | ✅ (security + adversarial tests) |

Notes:
- Several systems “have episodic memory” only in the sense that they keep daily logs; that’s **episodic storage**, not necessarily **episodic retrieval**.
- “Evaluation” is often missing or proxy-based; OpenClaw and Mem0 are the exceptions (benchmark harness / paper).

## 3) Technique catalog (what mechanisms recur)

This is the “design pattern” inventory across the systems.

### 3.1 Write-side mechanisms (ingestion)

Common patterns:
- **Extract structured units** from conversations (items/observations/memories).
- **Provenance pointers** (resource_id, source metadata, audit trail).
- **Gating/triage**:
  - human-in-the-loop promotion (joelclaw, ClawVault workflows)
  - deterministic gates (regex/YARA-style) (Marvy; also shisad’s ContentFirewall + MemoryManager invariants)
  - similarity-based dedup merges (jumperz/joelclaw planned)

Main disagreement: *how much to trust LLM extraction*
- jumperz-style: LLM extraction is the system (high leverage, high risk).
- OpenClaw-style: structure-first (facts/db/files), extraction is more controlled and tied to artifacts.
- shisad-style: extraction exists, but writes are **privileged** (taint-aware, confirmation, “no instructions” rule).

### 3.2 Retrieval-side mechanisms (context construction)

Recurring retrieval moves:
- **Tiered retrieval**: small summaries first, deep search later (jumperz; OpenClaw layering; many vault index patterns).
- **Hybrid retrieval**: lexical (BM25/FTS) + semantic embeddings + graph/entity resolution (OpenClaw explicitly; shisad planned).
- **Query rewriting**: LLM rewrites a better search query (jumperz; joelclaw planned).
- **Decay/recency weighting**: recency as a prior (jumperz; joelclaw planned; OpenClaw uses activation/importance).
- **Injection caps**: bound the number of injected memories per turn (jumperz; joelclaw planned; shisad top-K).
- **Trust tags**: stale/uncertain/conflict flags (jumperz “trust pass”; shisad taint + capability-scoped retrieval; OpenClaw “main session only” rules).

### 3.3 Maintenance & consolidation

Almost all “serious” systems converge on:
- periodic jobs (nightly/weekly/heartbeat) that:
  - merge duplicates,
  - rebuild indices,
  - prune stale items,
  - regenerate summaries.

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
- shisad: CheckpointStore + TranscriptStore + restore-on-restart

Treat this as **observability and recoverability**, not “memory retrieval”.

### 3.6 Technique matrix (quick lookup)

Legend: ✅ first-class, ⚠️ partial/implicit, ❌ absent, 🧪 proposed only.

**Retrieval / context construction**

| Technique | Minimal `MEMORY.md` agent | @jumperz spec | joelclaw ADR-0077 | OpenClaw arch | drag88/Marvy | ClawVault | MIRA-OSS | Gigabrain | Claude Code | Codex | Letta/MemGPT | Mem0 | shisad |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Hybrid lexical+semantic retrieval | ❌ | 🧪 | ✅ (Qdrant) | ✅ | ✅ (QMD hybrid) | ✅ (qmd) | ✅ (BM25+pgvector RRF + intent-aware weighting) | ⚠️ (FTS + weighted Jaccard, no embeddings) | ⚠️ (LLM-based Sonnet selector, no embeddings) | ❌ (keyword grep only) | ✅ | ✅ | ✅ |
| Entity/alias resolution | ❌ | 🧪 | ❌ | ✅ | ❌ | ✅ (graph index) | ✅ (spaCy NER + pg_trgm + 3-axis linking) | ✅ (person service + coreference) | ❌ | ❌ | ❌ | ⚠️ | 🧪 |
| Knowledge graph traversal | ❌ | 🧪 | ❌ | ✅ | ❌ | ✅ | ✅ (hub discovery + link traversal + TF-IDF orphan recovery) | ❌ (graph export only) | ❌ | ❌ | ❌ | ⚠️ | 🧪 |
| Tiered retrieval (summary → deep) | ❌ | ✅ | 🧪 | ✅ (layering) | ✅ (vault index) | ✅ (profiles/routing) | ✅ (subcortical → dual-path + background forage agent) | ✅ (class budgets: core/situational/decisions) | ✅ (Sonnet selector → memory content → staleness) | ✅ (memory_summary → MEMORY.md → rollout_summaries → skills) | ⚠️ | ⚠️ | ✅ (trust tiers planned) |
| Query rewriting | ❌ | ✅ | 🧪 | ⚠️ (QMD expansion) | ❌ | ⚠️ (optional LLM inject) | ✅ (subcortical expansion, replaces original query) | ⚠️ (entity coreference + query sanitization) | ❌ | ❌ | ⚠️ | ⚠️ | ⚠️ |
| Recency/decay weighting | ❌ | ✅ | 🧪 | ✅ (activation/importance) | ⚠️ | ⚠️ | ✅ (multi-factor sigmoid, activity-day) | ✅ (stepped recency: 1d/7d/30d/90d/365d) | ⚠️ (mtime-based staleness display only) | ✅ (usage-based: usage_count + last_usage drive selection + pruning) | ⚠️ | ✅ (paper claims) | ✅ (TTL/decay planned) |
| Hard top-K injection cap | ⚠️ | ✅ | ✅ (planned) | ✅ | ✅ | ✅ | ✅ (~15 pinned + ~5 fresh) | ✅ (topK=8 + class budgets + token cap) | ✅ (max 5 via Sonnet selector) | ⚠️ (memory_summary token cap 5K; MEMORY.md unbounded grep) | ✅ | ✅ | ✅ |
| Capability-scoped retrieval | ❌ | ❌ | ❌ | ⚠️ (channel/security conventions) | ❌ | ❌ | ❌ (forage agent code-constrained, not arch-constrained) | ⚠️ (scope: shared vs profile, private vs group) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Taint/trust labels carried through | ❌ | 🧪 (trust pass) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

**Write / ingestion governance**

| Technique | Minimal `MEMORY.md` agent | @jumperz spec | joelclaw ADR-0077 | OpenClaw arch | drag88/Marvy | ClawVault | MIRA-OSS | Gigabrain | Claude Code | Codex | Letta/MemGPT | Mem0 | shisad |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Append-only provenance log | ❌ | ✅ (Resources) | ✅ (logs/Qdrant metadata) | ✅ (logs) | ✅ (logs) | ✅ (ledger) | ✅ (Continuum segments + source_segment_id + batch tracking) | ✅ (event-sourced: append-only memory_events + per-memory timeline) | ✅ (JSONL transcripts) | ✅ (stage1_outputs DB table + rollout_summaries/ files + raw_memories.md) | ✅ (recall) | ⚠️ | ✅ |
| Structured fact extraction | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (batch LLM extraction + entity linking + 3-axis relationship discovery) | ✅ (7 typed memories via XML tag protocol) | ✅ (4-type taxonomy: user/feedback/project/reference) | ✅ (task groups with prefs/knowledge/failures + rollout summaries with task outcome triage) | ⚠️ | ✅ | ✅ |
| Write gating (reject instructions / confirm) | ❌ | ✅ | ⚠️ (auto-triage) | ❌ | ⚠️ (rules focus on output) | ⚠️ (sanitization + path safety) | ❌ (auto-extract at collapse; 0.85 fuzzy + 0.7 vector dedup only) | ✅ (junk filter + dedup + plausibility + review queue) | ⚠️ (exclusion list + prompt-enforced "ask what was surprising") | ⚠️ (minimum signal gate in Phase 1 prompt; no code-level gate) | ❌ | ⚠️ | ✅ |
| Human-in-the-loop promotion | ⚠️ | ❌ | ✅ | ⚠️ (curation habits) | ❌ | ✅ | ⚠️ (memory_tool for manual create) | ✅ (review queue for borderline captures + audit shadow/apply) | ⚠️ (/remember skill for review + promotion) | ❌ | ❌ | ❌ | ✅ (confirmation paths) |
| Similarity dedup / merge | ❌ | ✅ | 🧪 | ✅ (maintenance + schema) | ❌ | ✅ (rebuild/refresh) | ✅ (0.85 fuzzy + 0.7 vector + connected-component consolidation clusters) | ✅ (exact + weighted Jaccard with type-aware thresholds) | ⚠️ (prompt: "don't duplicate"; no code-level check) | ⚠️ (Phase 2 consolidation merges; no code-level similarity check) | ⚠️ | ✅ (paper claims) | ✅ (planned) |
| Conflict handling beyond overwrite | ❌ | ⚠️ (single active truth) | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ (supersedes links + scoring penalty) | ⚠️ (event log preserves history but no versioned corrections) | ❌ (overwrite model) | ⚠️ (thread-diff forgetting preserves evidence during transition but no correction chains) | ⚠️ | ⚠️ | ✅ (provenance + user verification) |

**Maintenance / evaluation**

| Technique | Minimal `MEMORY.md` agent | @jumperz spec | joelclaw ADR-0077 | OpenClaw arch | drag88/Marvy | ClawVault | MIRA-OSS | Gigabrain | Claude Code | Codex | Letta/MemGPT | Mem0 | shisad |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Scheduled consolidation jobs | ❌ | ✅ | 🧪 | ✅ | ✅ | ✅ | ✅ (event-driven + entity GC + use-day scheduling) | ✅ (nightly pipeline: snapshot → sync → sweep → dedup → audit → archive → vacuum → metrics) | ✅ (auto dream: time+session+lock gates) | ✅ (startup pipeline: prune → Phase 1 → Phase 2; watermark-based dirty tracking) | ⚠️ | ✅ | ✅ |
| Cron fallback / missed-job detection | ❌ | ✅ | ⚠️ (Inngest) | ⚠️ | ✅ (cron mindset) | ⚠️ | ✅ (APScheduler + segment timeout + extraction retry 6h) | ⚠️ (CLI-triggered `gigabrainctl nightly`; no daemon/scheduler) | ⚠️ (time gate + scan throttle prevents over-consolidation) | ✅ (SQLite leases: expired leases auto-release; retry backoff prevents hot-loops) | ❌ | ❌ | ✅ (daemon) |
| Benchmark harness for retrieval | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ⚠️ (internal tuning tests) | ✅ (harness-lab-run.js with A/B comparison, bilingual eval cases) | ✅ (internal evals with case IDs; no user-facing harness) | ❌ | ❌ | ✅ (paper) | ✅ (tests + planned harness) |
| Telemetry / audit logs | ❌ | 🧪 | ⚠️ | ✅ | ⚠️ | ✅ | ✅ (structured logging + batch tracking + forage traces) | ✅ (event-sourced: every capture/reject/dedup/audit logged with reason_codes, similarity scores, JSON payloads) | ✅ (extraction/dream telemetry + memory shape analytics) | ✅ (per-phase metrics: job counts, e2e latency, token usage histograms, memory usage tracking by file type) | ⚠️ | ✅ (service analytics) | ✅ |

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
- **shisad:** transcript store + compaction summary prefix + summarizer extraction; event-centric KG planned.

Synthesis take:
- The most robust pattern is **append-only logs + structured extraction into event entities** (with evidence pointers).
- Pure LLM-written episode summaries are useful for humans, but brittle as a source of truth unless evidence-linked.

### 4.2 Task-based memory: tasks as first-class vs “notes”

Tasks are where memory meets action. Approaches:
- **ClawVault:** explicit CLI primitives for tasks/projects/backlog/kanban; integrates into workflow; good ergonomics.
- **OpenClaw:** `project-{slug}.md` as institutional memory; task tracking is not central, but project state is.
- **joelclaw:** Todoist as review surface; tasks as human workflow, not an internal memory type.
- **MIRA-OSS (v1r2):** reminders via `reminder_tool` (time-based); punchclock for time tracking; no full task/project model. DomainDocs serve as stable project context but aren’t task primitives. The forage agent can speculatively gather context for tasks but doesn’t manage task state.
- **shisad:** explicit “todo” nodes and task-centric filing are requirements in `PLAN-longterm-memory.md`.
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
- shisad: typed entries + TTL/decay + provenance + user verification; allows “wrong-but-attributed” to exist without being treated as authoritative.

Synthesis take:
- You want **provenance + validity intervals + user-verified flags**, not a single overwriting “truth row”.

### 4.4 Security: memory poisoning and instruction/data boundaries

Most “internet stack” docs under-specify this.

shisad treats it as central:
- memory entries cannot store instructions
- external-origin writes require confirmation by default
- quarantines exist
- retrieval is capability-scoped
- retrieved memory stays in untrusted prompt regions (Spotlighting-like)

Synthesis take:
- If your agent can take side-effectful actions, a memory store is an attacker’s best persistence surface.
- “Write gating” is not optional; it’s the difference between “helpful long-term memory” and “durable prompt injection”.

## 5) Mapping to shisad (what we already cover vs what these systems add)

shisad’s memory work (as of v0.3.3 + long-term plan) already matches or exceeds many “rando stack” primitives, but with stronger security semantics.

### 5.1 Where shisad already aligns strongly
- **Append-only transcripts + blobs** (source of truth).
- **Checkpoint/restore** as a reliability primitive.
- **MemoryManager** with gating, TTL, provenance, and “no instructions”.
- **Agentic summarizer** that proposes memory writes and routes through gates.
- **Capability-aware retrieval** + taint propagation + untrusted prompt placement.

This is exactly where many ad-hoc stacks are weakest: semantics + governance.

### 5.2 Where the internet stacks suggest additions

High-leverage additions (if not already planned):
- **Benchmark harness** for retrieval quality changes (OpenClaw’s file-hit harness is a good starting point; extend to “answer correctness”).
- **Entity/alias layer** as a first-class primitive (graph retrieval for structured questions).
- **Operator ergonomics**: a human-readable view/edit surface (ClawVault/Obsidian-style) for memory inspection and correction.
- **Maintenance jobs**: dedup/decay/conflict detection with explicit invariants (already planned in shisad M4).

Lower-confidence additions (need careful evaluation):
- **Echo/fizzle** (usefulness feedback) — only if we can attribute causality without gaming.
- **Sentiment/strength tagging** — may be helpful but risks extracting spurious metadata.

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

## 7) A synthesis-friendly mental model: “Memory OS” as tiers (not features)

Across systems, the consistent spine is:

1) **Source of truth (append-only):** transcripts/logs/resources (high risk, high fidelity)
2) **Derived retrievable corpus:** sanitized chunks + indices (searchable, bounded)
3) **Durable typed memory entries:** facts/preferences/decisions/tasks (gated, reversible)
4) **Structured filing:** entities/relations (graph + aliases + evidence pointers)
5) **Curated always-loaded context:** very small identity + “what’s hot” (budgeted)
6) **Maintenance + evaluation:** consolidation jobs + benchmarks + telemetry

The key lesson from the best systems here (OpenClaw + shisad) is:
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
5) Security work is catching up: memory poisoning/injection is now a first-class concern. This aligns with shisad’s “instruction/data boundary + gated writes + capability-scoped retrieval” stance.

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
| **Text-Based LoRA (behavioral adaptation)** | MIRA-OSS | Signal extraction from interactions → accumulation → periodic synthesis into behavioral directives → directive injection. A form of "fine-tuning without fine-tuning" via accumulated behavioral modification signals. | Implemented |
| **Continuum segments with narrative summaries** | MIRA-OSS | Continuous transcript stream collapsed into segments; LLM generates first-person narrative summaries with continuity from previous 5 summaries. Memories carry `source_segment_id` provenance linking back to source material. | Implemented |
| **Typed relationship links** | MIRA-OSS | Memory entities connected via typed edges: supersedes, conflicts, supports, refines, precedes, contextualizes. Richer than simple "related to" — captures the *nature* of the relationship. | Implemented |
| **Background forage agent (sub-agent collaboration)** | MIRA-OSS (v1r2) | Autonomous LLM-in-a-loop running in daemon thread with shared ToolRepository and user context propagation. Quality rubric (GROUNDED, RELEVANT, SPECIFIC, USEFUL, HONEST) baked into agent system prompt. Results surface via event bus → ForageTrinket → notification center. First folk system with parallel sub-agent collaboration. | Implemented |
| **Assessment-anchored user model synthesis** | MIRA-OSS (v1r2) | Conversation evaluated against anonymized system prompt sections → alignment/misalignment/contextual_pass signals with strength levels → periodic synthesis with Haiku critic validation loop (max 3 attempts) → XML user model. More structured than generic positive/negative feedback extraction. | Implemented |
| **3-axis linking (vector + entity + TF-IDF)** | MIRA-OSS (v1r2) | Memory linking uses three discovery axes: vector similarity, entity co-occurrence (with embedding floor for common-entity suppression), and TF-IDF term overlap (catches orphan memories with no entities and distant embeddings via rare shared terms). | Implemented |

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
| **Bi-temporal validity windows** | memv | Memories carry both *assertion time* (when stored) and *valid time* (when the fact was/is true). Enables temporal queries ("what did I believe in January?") and prevents stale facts from polluting current context. | Proposed (spec) |
| **Forward triggers (temporal preload)** | @jumperz | Pre-scheduled memory injection based on anticipated future context needs — reminders and task-relevant memories loaded proactively. | Proposed (spec) |

### Maintenance & evaluation innovations

| Feature | System | What's novel | Status |
|---------|--------|-------------|--------|
| **Nightly 8-stage maintenance pipeline** | Gigabrain | Ordered sequence: snapshot → native_sync → quality_sweep → exact_dedupe → semantic_dedupe → audit_delta → archive_compression → vacuum → metrics_report. Value scoring uses weighted feature vector with 8 factors (including negative ops_noise penalty). | Implemented |
| **Entity garbage collection** | MIRA-OSS | Scheduled cleanup of orphaned entities — nodes with no remaining memory references are pruned. Prevents graph bloat from deleted or archived memories. | Implemented |
| **Multi-user RLS security** | MIRA-OSS | Row-Level Security in PostgreSQL ensuring memory isolation between users. Combined with Vault-based credential management. Production-grade multi-tenancy, not just single-user isolation. | Implemented |
| **Auto dream with multi-gate scheduling** | Claude Code | Background consolidation gated by: feature flag → time (≥24h) → scan throttle (10min) → session count (≥5) → file lock. 4-phase prompt: orient → gather → consolidate → prune. Lock rolls back on failure. Registered as visible task with progress watching. | Implemented (production) |
| **Eval-validated prompt engineering with case IDs** | Claude Code | Memory prompt sections carry eval case references (e.g., "H1: 0/2 → 3/3 via appendSystemPrompt", "H6: branch-pollution evals #22856"). Header-wording experiments, position-sensitivity tests, and appendSystemPrompt vs in-place A/B tests documented in source comments. | Implemented (production) |
| **SQLite-backed distributed job coordination** | Codex | Leases (1h), ownership tokens, heartbeats (90s), watermarks, retry backoff — all in SQLite. Multi-worker safe without external infrastructure. Phase 1 leases prevent duplicate extraction; Phase 2 global lock serializes consolidation. Watermarks track dirty/clean state for incremental processing. | Implemented (open-source) |
| **Thread-diff-based incremental forgetting** | Codex | Phase 2 receives selection diff: added/retained/removed thread IDs. Added → extract new content. Removed → surgical cleanup (delete references, clean empty task groups). Evidence for removed threads preserved during transition (union of current + previous selection). Avoids "blow up and rebuild" re-consolidation. | Implemented (open-source) |
| **Usage-based memory pruning** | Codex | `prune_stage1_outputs_for_retention(max_unused_days, batch_size=200)` removes memories with no recent usage. Runs before every Phase 1 extraction pass. Combined with usage_count-based Phase 2 selection, creates a complete "unused memories fade out" lifecycle. | Implemented (open-source) |
| **A/B recall comparison harness** | Gigabrain | `harness-lab-run.js` supports A/B comparison of recall configurations with bilingual (EN/DE) evaluation cases. Enables empirical tuning of retrieval parameters. | Implemented |

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
| **Taint-aware retrieval** | shisad | Retrieved memories carry taint labels indicating source trust level. Capability-scoped retrieval restricts what memory is visible to which agent/tool. | Planned |

### Architectural innovations

| Feature | System | What's novel | Status |
|---------|--------|-------------|--------|
| **Memory as "Memory OS" tiers** | Synthesis (this doc) | Six-tier model: append-only source → derived corpus → durable typed entries → structured filing → curated always-loaded → maintenance layer. Provides a framework for evaluating any memory system's completeness. | Conceptual |
| **Skills as procedural memory** | Hermes Agent | SKILL.md files with YAML frontmatter and progressive disclosure (Level 0: list → Level 1: full → Level 2: references). Maps learned workflows to memory entries. (Not in ANALYSIS.md comparison; see REVIEWED.md.) | Implemented |
| **Person service with bilingual coreference** | Gigabrain | Entity mention tracking across memories with bilingual (EN/DE) pronoun resolution for follow-up queries. "Who is X?" query detection with entity answer hints injected into recall. | Implemented |
| **Portrait synthesis from collapsed summaries** | MIRA-OSS (v1r2) | Every 10 use-days, generates a 150–250 word prose portrait from recent collapsed segment summaries (20 activity-day window). Injected into base system prompt as `{user_context}`. Provides the LLM with a continuously-updated user model without consuming memory retrieval budget. | Implemented |
| **Immutable domain models + Unit of Work** | MIRA-OSS (v1r2) | Frozen dataclasses for ContinuumState and Message prevent silent state mutations. Continuum aggregate root uses mutable message cache with immutable backing state. Unit of Work pattern ensures atomic DB→cache persistence with DB authoritative on crash. | Implemented |
| **Forked-agent-as-infrastructure pattern** | Claude Code | Three subsystems (extraction, consolidation, session memory) use the same "perfect fork with shared prompt cache" pattern. Restricted tool permissions per fork. Only viable when you control the inference infrastructure (cache sharing). | Implemented (production) |
| **KAIROS daily-log + nightly dream mode** | Claude Code | Long-lived assistant sessions use append-only date-named logs (`logs/YYYY/MM/YYYY-MM-DD.md`) with timestamped bullets. MEMORY.md becomes read-only (maintained nightly from logs via /dream). Date rollover handled via attachment. Separates hot-path writes from cold-path indexing. | Implemented (production) |
| **Skills as procedural memory** | Codex | SKILL.md with YAML frontmatter (name, description, argument-hint, allowed-tools, user-invocable) + `scripts/` (executable helpers) + `templates/` (reusable) + `examples/` (worked examples). Creation criteria: repeats > 1, failure shields, formatting contracts. Keep < 500 lines. First system in survey to extract learned workflows into executable filesystem artifacts. | Implemented (open-source) |
| **Two-model extraction→consolidation strategy** | Codex | Phase 1 uses smaller/cheaper model (gpt-5.1-codex-mini, reasoning=Low) for embarrassingly-parallel per-rollout extraction. Phase 2 uses larger/more capable model (gpt-5.3-codex, reasoning=Medium) for serial global consolidation. Matches compute cost to task difficulty. | Implemented (open-source) |
| **Multimodal memory ingestion** | Google Always-On Memory Agent | 27 file types via Gemini native multimodal capabilities — images, PDFs, audio, video summarized into text memories. Most memory systems are text-only. (PoC quality; see REVIEWED.md.) | PoC |

## Corrections & Updates

- This synthesis is grounded in the local deep dives (`ANALYSIS-*.md`) and vendored snapshots for OpenClaw/ClawVault.
- External comparisons (Letta/Mem0) are based on their public READMEs and cited paper(s) as of 2026-02-21; treat product claims as “as stated by authors” unless reproduced.
- 2026-02-21: Added an arXiv-focused literature scan (benchmarks + recent “memory systems” + poisoning/security papers). This is not exhaustive; it’s a starting bibliography for deeper per-paper reference summaries if needed.
- 2026-02-21: Added Reality Check notes on correction-aware provenance (append-only correction semantics) and connected them to multi-timescale consolidation and Nested Learning’s continuum-memory framing.
- 2026-03-03: Added MIRA-OSS (taylorsatula) to all comparison matrices and deep comparisons. MIRA adds: multi-factor activity-day sigmoid decay, hub-based entity discovery, typed relationship links (supersedes/conflicts/supports/refines/precedes/contextualizes), Text-Based LoRA behavioral adaptation, and production-grade multi-user security (RLS + Vault). Also added memv and MIRA-OSS to the systems-in-scope list and related references.
- 2026-03-07: Added Gigabrain (legendaryvibecoder) to all comparison matrices. Gigabrain adds: event-sourced storage (append-only events + materialized projection), explicit capture via XML tag protocol, type-aware semantic dedup thresholds, multi-gate write pipeline with review queue, class-budgeted recall, and A/B recall benchmark harness. Also created Section 11 "Novel Memory Features" cataloging unique mechanisms across all systems regardless of source completeness. Triage details in REVIEWED.md.
- 2026-03-30: Refreshed MIRA-OSS entries across all matrices for v1 rev 2 (2026.03.30-major). Substantive additions: background forage agent (first folk system with parallel sub-agent collaboration), assessment-anchored user model synthesis with critic validation, portrait synthesis, 3-axis linking (vector + entity + TF-IDF), extraction pipeline restructure, verbose refinement ablated, context overflow remediation, immutable domain models + Unit of Work, 16 tools (up from 11), account tier system, segment pause/resume. ANALYSIS-mira-OSS.md fully rewritten. See REVIEWED.md for triage entry.
- 2026-03-31: Added Claude Code memory subsystem (Anthropic) to all comparison matrices and Novel Memory Features. Claude Code adds: forked-agent extraction with mutual exclusion (hasMemoryWritesSince), LLM-based relevance selection (Sonnet selector over manifest), staleness-first recall with multi-layer caveats, exclusion-list-as-design-feature (eval-validated explicit-save gate), team memory with per-type scope and secret scanning, auto dream with multi-gate scheduling, KAIROS daily-log mode, security-hardened path validation (symlink/Unicode/URL-encoded traversal protection), and eval-validated prompt engineering with specific case IDs and pass rates. First-party production system; standalone analysis: ANALYSIS-claude-code-memory.md. Triage details in REVIEWED.md.
- 2026-03-31: Added Codex memory subsystem (OpenAI) to all comparison matrices and Novel Memory Features. Codex adds: two-phase batch extraction→consolidation pipeline (gpt-5.1-codex-mini → gpt-5.3-codex), SQLite-backed distributed job coordination (leases/heartbeats/watermarks), progressive disclosure memory layout (memory_summary → MEMORY.md → rollout_summaries → skills), skills as procedural memory (SKILL.md + scripts + templates + examples), usage-based citation-driven retention (oai-mem-citation → usage_count → selection priority → pruning), thread-diff-based incremental forgetting (added/retained/removed with evidence preservation), minimum signal gate (prompt-level no-op for low-value rollouts), secret redaction on all outputs, and sandboxed consolidation agent. First-party open-source system; standalone analysis: ANALYSIS-codex-memory.md. Triage details in REVIEWED.md.
