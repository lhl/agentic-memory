---
title: "Analysis — Recursive Language Models (Zhang et al., 2026)"
date: 2026-02-22
type: analysis
paper_id: "arxiv:2512.24601"
paper_title: "Recursive Language Models"
source:
  - references/zhang-recursive-language-models.md
  - references/papers/arxiv-2512.24601.pdf
related:
  - ANALYSIS-academic-industry.md
  - /home/lhl/github/shisa-ai/shisad/docs/PLAN-longterm-memory.md
---

# Analysis — Recursive Language Models (Zhang et al., 2026)

Recursive Language Models (RLMs) are not a “memory system” in the typical sense (persisting user facts/preferences across time), but they are highly relevant to agentic memory because they propose a different solution to the **reading/compilation** problem:

> Given an arbitrarily long evidence store (a prompt/history), how do you do *semantic work* over it without stuffing it into the model context window?

Their answer is to treat the prompt as an **external environment** and let the LLM write and execute code that recursively calls itself over programmatically selected snippets, storing intermediate results in a persistent REPL state.

## TL;DR

- **Problem**: Long prompts exceed context windows; common “long-context scaffolds” (RAG/BM25/summary agents) lose fine-grained information or fail on information-dense tasks.
- **Core idea**: RLM inference scaffold:
  - prompt lives outside the LLM window as a symbolic handle,
  - model generates code in a persistent REPL,
  - code can slice/transform the prompt and invoke sub‑RLM calls recursively,
  - intermediate values live in environment variables, not in the root context.
- **Key primitives / operations**:
  - persistent REPL state with `Final` output variable,
  - `sub_RLM` function callable from code,
  - metadata-only root prompting (avoid prompt pollution),
  - recursion inside symbolic code (loops, programmatic sub-calls).
- **Evaluation (as reported)**: CodeQA (23K–4.2M tokens), BrowseComp+ (6M–11M), OOLONG (131K), OOLONG‑Pairs (32K); compares base models, CodeAct, summary agents, and RLM variants.
- **Main caveats**: executing model-generated code is a security boundary; trajectories can be long-tailed in cost/runtime; this does not directly solve “persistent autobiographical memory”.
- **Most reusable takeaway for shisad**: treat “memory reading/compilation” as a programmable process over a large evidence store, but only in a heavily sandboxed, policy‑gated mode.

## Stage 1 — Descriptive (what the paper proposes)

### 1.1 RLM scaffold (Algorithm 1)

An RLM wraps a base model `M` with context window `K` and runs a loop in a persistent environment `E`:
- initialize a REPL with the user prompt `P` stored as a variable,
- register a function that can invoke a sub‑RLM on a constructed prompt,
- iteratively:
  - call `M` on a small history (metadata + prior steps),
  - execute generated code in the REPL,
  - append metadata about stdout,
  - stop when `Final` is set.

The key enforcement is that `M` never gets `P` directly, so it must manipulate `P` symbolically via the REPL and sub‑calls.

### 1.2 Why “prompt as handle” matters (Algorithm 2 critique)

The paper contrasts RLMs with a “deceptively similar” scaffold that:
- loads `P` into the context window,
- asks for a `Finish` action that directly emits the answer,
- uses “sub-LLM” calls only in a non-programmatic way.

They argue these choices reintroduce the context window limitation and prevent symbolic recursion (no loops over slices; no Ω(|P|) semantic work).

### 1.3 Training a natively recursive model

At small scale, the paper post-trains **RLM‑Qwen3‑8B** on filtered trajectories to improve its ability to:
- manipulate REPL state,
- issue sub-calls,
- and generally behave like an RLM (as described).

## Stage 2 — Evaluative (what it measures, what’s missing, what breaks)

### 2.1 Main results (as reported)

Table 1 compares performance and API cost across tasks. Selected highlights:

GPT‑5 (RLM):
- CodeQA: **62.0** at **$0.11 ± $0.10** (vs base 24.0* at $0.13 ± $0.07).
- BrowseComp+ (1K): **91.3** at **$0.99 ± $1.22** (vs base 0.0*).
- OOLONG: **56.5** at **$0.43 ± $0.85** (vs base 44.0 at $0.14 ± $0.02).
- OOLONG‑Pairs: **58.0** at **$0.33 ± $0.20** (vs base 0.1 at $0.16 ± $0.10).

Qwen3‑8B (base vs RLM vs fine-tuned RLM):
- CodeQA: base 4.0* → RLM 26.0 → **RLM (fine‑tuned) 32.0** (very low reported costs).

The paper emphasizes “two orders of magnitude” beyond context windows on some tasks and comparable average costs, with long-tailed cost distributions (Figure 3 discussion).

### 2.2 Strengths (for memory builders)

- Shows that “reading” can be reframed as programmable, recursive interaction with a large evidence store.
- Provides an explicit critique of common scaffold design flaws (prompt pollution; non-programmatic subcalls).
- Includes cost measurements, acknowledging that inference-time scaling is a tradeoff, not a free lunch.

### 2.3 Limitations / open questions (builder lens)

- **Security**: executing generated code is extremely sensitive; safe deployment requires a strict sandbox, filesystem/network policies, and audit logging.
- **Reproducibility**: trajectories can vary widely (long-tailed cost/runtime).
- **Not a persistence solution**: RLMs help *process* long inputs; they don’t define how to store, version, correct, and scope long-term agent memories across sessions/users.

## Stage 3 — Synthesis hooks (how this fits + what we steal)

### 3.1 Relation to agent memory systems

RLMs can be viewed as a powerful “reading/compilation engine” that could sit downstream of:
- a page-store (GAM) or episodic log store (Zep),
- a retrieval layer (Mem0/SimpleMem),
and then do deeper processing when needed.

In other words: retrieval supplies candidate evidence; RLM supplies a programmable way to do complex aggregation and transformation over that evidence *and/or* over the full store.

### 3.2 Mapping to shisad (`PLAN-longterm-memory.md`)

If shisad is implementing a v0.7 memory overhaul, RLM suggests:

1. **Separate “memory retrieval” from “memory compilation”**
   - compilation can be multi-step and programmable, not a single prompt.
2. **Add a sandboxed “analysis runtime” mode**
   - allow code execution only in controlled environments, with strict resource limits.
3. **Use recursion as an optional accelerator**
   - treat RLM-like recursion as a costly mode reserved for hard cases (multi-hop, aggregation, audits).

### 3.3 Concrete takeaways (actionable)

**Primitives to add**
- `CompilationPlan` / `CompilationTrace`: structured logs of multi-step reading/aggregation.
- `SandboxPolicy`: explicit allowlists for tools the compiler can call.

**Tests / eval adapters to add**
- Cost/latency tail monitoring: p50 vs p95 for compilation traces.
- Prompt-injection red team tests specifically targeting code execution paths.

## Notes / Corrections & Updates

- Capture date: 2026-02-22
- Paper version reviewed: arXiv v2 (2026-01-28)

