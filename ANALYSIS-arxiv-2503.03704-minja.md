---
title: "Analysis — MINJA (Dong et al., 2025)"
date: 2026-02-22
type: analysis
paper_id: "arxiv:2503.03704"
paper_title: "Memory Injection Attacks on LLM Agents via Query-Only Interaction"
source:
  - references/dong-minja.md
  - references/papers/arxiv-2503.03704.pdf
related:
  - ANALYSIS-academic-industry.md
  - /home/lhl/github/shisa-ai/shisad-dev/planning/PLAN-longterm-memory.md
---

# Analysis — MINJA (Dong et al., 2025)

MINJA is one of the most important “agent memory” papers for builders because it attacks an extremely common pattern: **store prior executions as long-term memory**, then **retrieve similar records as in-context demonstrations**. The key point is the threat model: the attacker does *not* need DB access — they can inject poisoned memories by interacting like a normal user.

## TL;DR

- **Problem**: Memory banks used as demonstrations are a poisoning surface; a compromised memory bank can steer agent reasoning/actions toward harmful outputs.
- **Core idea (attack)**: Inject malicious records into memory via **query-only interaction** by inducing the agent to generate (and store) poisoned demonstrations.
- **Attack mechanism**: (1) craft **bridging steps** linking victim term `v` → target term `t`, (2) use an **indication prompt** to elicit those steps, (3) **progressively shorten** the indication so the final stored query looks benign and is retrievable.
- **Assumption that matters**: memory is shared across users (or at least attackers can influence what gets stored); retrieval is similarity-based; stored records include reasoning/execution traces.
- **Results (as reported)**: very high injection success rates and meaningful downstream attack success rates across multiple agents/datasets, often with small utility drops.
- **Main builder takeaway**: do not treat “memories” as trusted demonstrations; enforce isolation + write-time policy + safer memory content types (avoid chain-of-thought storage).

## Stage 1 — Descriptive (what the paper proposes)

### 1.1 Threat model (agent + attacker)

Agent pattern assumed:
- For each user query `q`, agent generates reasoning steps `R_q`.
- A long-term memory bank stores records `(q, R_q)` (or richer execution logs).
- For a new query, retrieve `k` similar records by query similarity and use them as demonstrations in the prompt.
- After execution, a record may be written to memory (sometimes gated by user feedback, sometimes always stored).

Attacker constraints:
- Cannot directly modify memory bank.
- Cannot modify victim users’ queries.
- Can only issue queries and observe outputs like any normal user.
- Assumes a shared memory bank is used to support multiple users (or attacker can otherwise get their records into the retrieval pool).

Attacker objective:
- For victim queries containing a victim term `v`, induce reasoning steps corresponding to the query where `v` is replaced with a target term `t` (an entity-substitution attack).

### 1.2 MINJA method mechanics

The hard part is the “logic gap”: why would a benign query about `v` ever lead to reasoning about `t`?

MINJA bridges that gap by injecting a stored record whose *reasoning trace* begins with a plausible redirection:

- **Bridging steps** `b_{v,t}`: early reasoning steps that “explain” why `v` should map to `t` (e.g., “data for patient A is stored under patient B”).
- **Indication prompt**: appended to attacker queries to cause the agent to autonomously produce:
  - the bridging steps, and then
  - the malicious target reasoning steps `R_{a_t}`.
  This matters because the attacker can only store what the agent itself produces.
- **Progressive Shortening Strategy (PSS)**: repeatedly remove part of the indication prompt while preserving the poisoned response structure, until the final query is close to a normal benign query containing only `v`. This increases the chance the poisoned record is retrieved later for victim queries.

## Stage 2 — Evaluative (what it measures, what’s missing, what breaks)

### 2.1 Evaluation setup (as reported)

Evaluates against three agent archetypes:
- **RAP**: ReAct-style agent with RAG over past experiences (web shopping environment).
- **EHRAgent**: healthcare agent generating code to query databases (EHR datasets).
- **QA agent**: chain-of-thought QA with memory-augmented demonstrations (MMLU).

Metrics:
- **ISR** (Inject Success Rate): fraction of attacker queries that successfully inject a malicious record.
- **ASR** (Attack Success Rate): fraction of victim queries whose responses contain the targeted malicious reasoning steps.
- **UD** (Utility Drop): change in benign task performance (non-victim queries).

### 2.2 Main results (as reported)

Representative averages from their main table:

| Agent / dataset | ISR | ASR | UD |
|---|---:|---:|---:|
| EHR (GPT-4) / MIMIC-III | ~95.6% | ~57.0% | ~−0.7 |
| EHR (GPT-4) / eICU | ~98.5% | ~90.0% | ~0.0 |
| RAP (GPT-4o) / Webshop | ~99.3% | ~98.9% | ~−0.7 |
| QA (GPT-4) / MMLU | 100% | ~68.9% | ~−10.0 |

Stability/ablations (high level):
- Injection success stays high even as benign-memory density increases, while ASR can vary by dataset/query structure.
- Prior poisoning can reduce effectiveness but does not eliminate it.

### 2.3 Why this is credible/useful

- The threat model matches how many agent stacks work in practice (retrieve “similar past runs”).
- It shows a path to poisoning that doesn’t rely on privileged access, which is the realistic concern for deployed systems.
- It highlights that “utility drop” can be small, meaning a poisoned system can still look healthy on normal usage.

### 2.4 Limitations / what it doesn’t cover

- The attack is tailored to agents that store reasoning traces/execution logs as demonstrations; memory designs that store only structured facts may behave differently.
- The paper’s success criteria focus on eliciting malicious reasoning steps; end-to-end harm depends on downstream tool execution and additional safety layers.
- Defense exploration is partial; robust mitigations likely require architectural changes (not just filters).

### 2.5 Defense analysis (builder lens)

Their discussion suggests:
- Embedding-space sanitization is difficult because malicious and benign records can be close in embedding space.
- Prompt-level detection can work in some cases but is inconsistent across agents/tasks and can incur false positives.

This implies: the most reliable defenses are **system-level**:
- strict isolation of memory across tenants/users,
- write-time approval gates,
- and safe memory representations that reduce demonstration power.

## Stage 3 — Synthesis hooks (how this fits + what we steal)

### 3.1 Implications for “memory system primitives”

MINJA argues for adding explicit primitives to any memory system:
- **Provenance**: who wrote this memory, in what context, with what permissions.
- **Trust tiers / taint**: “user-provided” vs “model-inferred” vs “human-verified”; retrieval policies must respect this.
- **Write policies**: not every execution should be stored; and “demonstrations” are especially risky to store verbatim.
- **Invalidate/quarantine**: ability to quarantine suspected poisoned memories without hard deletion (audit trail).

### 3.2 Mapping to shisad (`PLAN-longterm-memory.md`)

Shisad-specific deltas suggested by MINJA:
- Avoid storing chain-of-thought / reasoning traces as LTM “demonstrations” unless strictly sandboxed and non-actionable.
- Make tenant/user scoping strict by default; shared/global memory should be opt-in and heavily filtered.
- Add a write-time “memory firewall”:
  - schema validation,
  - instruction/data boundary checks,
  - anomaly detection for victim→target substitution patterns,
  - and human confirmation for high-impact memories.
- Add an evaluation harness: run a MINJA-style injection suite as a regression test whenever write/read policies change.

## Notes / Corrections & Updates

- Capture date: 2026-02-22.
- Paper version reviewed: arXiv v5 (2026-02-12).
