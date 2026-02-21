---
title: "Synthesis — Agentic Memory Systems (Comparison + Design Space)"
date: 2026-02-21
type: synthesis
scope:
  - agentic-memory repo systems (jumperz, joelclaw ADR-0077, OpenClaw architecture, Marvy output degradation, ClawVault)
  - comparison baselines (ChatGPT/Claude-style minimal memory, Letta/MemGPT, Mem0)
  - implementation target (shisad long-term memory plans)
related:
  - ANALYSIS-jumperz-agent-memory-stack.md
  - ANALYSIS-joelhooks-adr-0077-memory-system-next-phase.md
  - ANALYSIS-coolmanns-openclaw-memory-architecture.md
  - ANALYSIS-drag88-agent-output-degradation.md
  - ANALYSIS-versatly-clawvault.md
  - references/jumperz-agent-memory-stack.md
  - references/joelhooks-adr-0077-memory-system-next-phase.md
  - references/coolmanns-openclaw-memory-architecture.md
  - references/drag88-agent-output-degradation.md
  - references/versatly-clawvault.md
  - vendor/openclaw-memory-architecture
  - vendor/clawvault
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

| Technique | Minimal `MEMORY.md` agent | @jumperz spec | joelclaw ADR-0077 | OpenClaw arch | drag88/Marvy | ClawVault | Letta/MemGPT | Mem0 | shisad |
|---|---|---|---|---|---|---|---|---|---|
| Hybrid lexical+semantic retrieval | ❌ | 🧪 | ✅ (Qdrant) | ✅ | ✅ (QMD hybrid) | ✅ (qmd) | ✅ | ✅ | ✅ |
| Entity/alias resolution | ❌ | 🧪 | ❌ | ✅ | ❌ | ✅ (graph index) | ❌ | ⚠️ | 🧪 |
| Knowledge graph traversal | ❌ | 🧪 | ❌ | ✅ | ❌ | ✅ | ❌ | ⚠️ | 🧪 |
| Tiered retrieval (summary → deep) | ❌ | ✅ | 🧪 | ✅ (layering) | ✅ (vault index) | ✅ (profiles/routing) | ⚠️ | ⚠️ | ✅ (trust tiers planned) |
| Query rewriting | ❌ | ✅ | 🧪 | ⚠️ (QMD expansion) | ❌ | ⚠️ (optional LLM inject) | ⚠️ | ⚠️ | ⚠️ |
| Recency/decay weighting | ❌ | ✅ | 🧪 | ✅ (activation/importance) | ⚠️ | ⚠️ | ⚠️ | ✅ (paper claims) | ✅ (TTL/decay planned) |
| Hard top-K injection cap | ⚠️ | ✅ | ✅ (planned) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Capability-scoped retrieval | ❌ | ❌ | ❌ | ⚠️ (channel/security conventions) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Taint/trust labels carried through | ❌ | 🧪 (trust pass) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

**Write / ingestion governance**

| Technique | Minimal `MEMORY.md` agent | @jumperz spec | joelclaw ADR-0077 | OpenClaw arch | drag88/Marvy | ClawVault | Letta/MemGPT | Mem0 | shisad |
|---|---|---|---|---|---|---|---|---|---|
| Append-only provenance log | ❌ | ✅ (Resources) | ✅ (logs/Qdrant metadata) | ✅ (logs) | ✅ (logs) | ✅ (ledger) | ✅ (recall) | ⚠️ | ✅ |
| Structured fact extraction | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| Write gating (reject instructions / confirm) | ❌ | ✅ | ⚠️ (auto-triage) | ❌ | ⚠️ (rules focus on output) | ⚠️ (sanitization + path safety) | ❌ | ⚠️ | ✅ |
| Human-in-the-loop promotion | ⚠️ | ❌ | ✅ | ⚠️ (curation habits) | ❌ | ✅ | ❌ | ❌ | ✅ (confirmation paths) |
| Similarity dedup / merge | ❌ | ✅ | 🧪 | ✅ (maintenance + schema) | ❌ | ✅ (rebuild/refresh) | ⚠️ | ✅ (paper claims) | ✅ (planned) |
| Conflict handling beyond overwrite | ❌ | ⚠️ (single active truth) | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ (provenance + user verification) |

**Maintenance / evaluation**

| Technique | Minimal `MEMORY.md` agent | @jumperz spec | joelclaw ADR-0077 | OpenClaw arch | drag88/Marvy | ClawVault | Letta/MemGPT | Mem0 | shisad |
|---|---|---|---|---|---|---|---|---|---|
| Scheduled consolidation jobs | ❌ | ✅ | 🧪 | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| Cron fallback / missed-job detection | ❌ | ✅ | ⚠️ (Inngest) | ⚠️ | ✅ (cron mindset) | ⚠️ | ❌ | ❌ | ✅ (daemon) |
| Benchmark harness for retrieval | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ (paper) | ✅ (tests + planned harness) |
| Telemetry / audit logs | ❌ | 🧪 | ⚠️ | ✅ | ⚠️ | ✅ | ⚠️ | ✅ (service analytics) | ✅ |

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
- **shisad:** transcript store + compaction summary prefix + summarizer extraction; event-centric KG planned.

Synthesis take:
- The most robust pattern is **append-only logs + structured extraction into event entities** (with evidence pointers).
- Pure LLM-written episode summaries are useful for humans, but brittle as a source of truth unless evidence-linked.

### 4.2 Task-based memory: tasks as first-class vs “notes”

Tasks are where memory meets action. Approaches:
- **ClawVault:** explicit CLI primitives for tasks/projects/backlog/kanban; integrates into workflow; good ergonomics.
- **OpenClaw:** `project-{slug}.md` as institutional memory; task tracking is not central, but project state is.
- **joelclaw:** Todoist as review surface; tasks as human workflow, not an internal memory type.
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

## Corrections & Updates

- This synthesis is grounded in the local deep dives (`ANALYSIS-*.md`) and vendored snapshots for OpenClaw/ClawVault.
- External comparisons (Letta/Mem0) are based on their public READMEs and cited paper(s) as of 2026-02-21; treat product claims as “as stated by authors” unless reproduced.
