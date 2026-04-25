# Punchlist Addendum — Academic / Industry Memory Papers (from cross-check)

*Created: 2026-04-25*

This addendum extends `PUNCHLIST-academic-industry.md`. The main punchlist was closed as a batch; this file captures candidates surfaced by cross-referencing three community "awesome" lists against our catalog:

- [TsinghuaC3I/Awesome-Memory-for-Agents](https://github.com/TsinghuaC3I/Awesome-Memory-for-Agents)
- [AgentMemoryWorld/Awesome-Agent-Memory](https://github.com/AgentMemoryWorld/Awesome-Agent-Memory) (backs arXiv:2602.06052)
- [TeleAI-UAGI/Awesome-Agent-Memory](https://github.com/TeleAI-UAGI/Awesome-Agent-Memory)

Scoping rule used: only agentic memory **systems** and **benchmarks** — not parametric memory, not multimodal video/generation, not context-engineering-only. Out-of-scope entries (of which the lists contain many) are deliberately not tracked here.

Status legend: `[ ]` = not yet started · `[~]` = triaged only · `[x]` = fully deep-dived (see main PUNCHLIST).

## P2 — Priority deep-dive candidates (systems)

### [ ] arXiv:2510.18866 — LightMem: Lightweight and Efficient Memory-Augmented Generation — (ZJU NLP)
- Why: shared framework that our recently-analyzed StructMem (`ANALYSIS-arxiv-2604.21748-structmem.md`) lives inside. Both are LoCoMo baselines in the literature. Understanding LightMem sharpens our StructMem framing.
- Code: `github.com/zjunlp/LightMem`

### [ ] arXiv:2507.07957 — MIRIX: Multi-Agent Memory System for LLM-Based Agents
- Why: multi-agent memory architecture with real open-source code (`Mirix-AI/MIRIX`). We have no multi-agent-specific system deep-dive yet; MIRIX is the canonical one.

### [ ] arXiv:2508.06433 — Memp: Exploring Agent Procedural Memory
- Why: first paper that's explicitly about procedural agent memory. Procedural memory is a first-class shisad surface (`skill`/`runbook`/`template` entry types); having the research baseline documented would sharpen our procedural-memory comparison.

### [ ] arXiv:2508.16153 / 2512.22716 — Memento / Memento 2: Fine-tuning LLM Agents without Fine-tuning LLMs
- Why: the "stateful reflective memory" school. Memento is widely cited as an alternative to RL-based memory-manager training.
- Code: `Agent-on-the-Fly/Memento`, `Agent-on-the-Fly/Memento` (v2 branch).

### [ ] arXiv:2509.25911 — Mem-α: Learning Memory Construction via Reinforcement Learning
- Why: companion to Memory-R1 (`ANALYSIS-arxiv-2508.19828-memory-r1.md`) but with a different framing (memory *construction* vs memory *management*). Worth a head-to-head write-up.
- Code: `wangyu-ustc/Mem-alpha`

### [ ] arXiv:2509.25140 — ReasoningBank: Scaling Agent Self-Evolving with Reasoning Memory
- Why: frames memory around reasoning traces rather than facts/events. Different axis from LoCoMo-style benchmarks.

### [ ] arXiv:2509.24704 — MemGen: Weaving Generative Latent Memory for Self-Evolving Agents
- Why: generative latent memory bridges parametric (Titans/M+) and artifact memory (MemOS). Worth a read to see if the boundary is blurring.
- Code: `KANABOON1/MemGen`

### [ ] arXiv:2506.07398 — G-Memory: Tracing Hierarchical Memory for Multi-Agent Systems
- Why: complements MIRIX with a specifically *hierarchical* take on multi-agent memory.

### [ ] arXiv:2502.14802 — HippoRAG v2 (From RAG to Memory)
- Why: canonical "hippocampus-inspired" RAG-as-memory system. We have HEMA (`ANALYSIS-arxiv-2504.16754-hema.md`) but not HippoRAG despite its heavier citation weight.
- Code: `OSU-NLP-Group/HippoRAG`

### [ ] arXiv:2510.04851 — LEGOMem: Modular Procedural Memory for Multi-agent LLM Systems for Workflow Automation
- Why: modular procedural memory + workflow automation framing; complements Memp.

### [ ] arXiv:2510.04618 — Agentic Context Engineering: Evolving Contexts for Self-Improving Language Models
- Why: "context engineering" school is a distinct design space from "memory" school; worth one representative deep-dive.

### [ ] arXiv:2510.27246 — BEAM: a benchmark + Karta's 57.7% / 243-failure catalog
- Why: we cite Karta's BEAM 100K result in `ANALYSIS.md` and `ANALYSIS-karta.md` but never analyzed the benchmark itself. BEAM's failure taxonomy (INCOMPLETE_RETRIEVAL 40.7%, FALSE_ABSTENTION 18.1%, WRONG_ORDER 17.3%, CONTRADICTION_MISS 10.7%) is cited-worthy without an authoritative paper-level analysis on our side.
- Code: `mohammadtavakoli78/BEAM`, HF dataset: `Mohammadta/BEAM`

## P2 — Priority benchmark candidates

### [ ] arXiv:2511.10523 — ConvoMem: Why Your First 150 Conversations Don't Need RAG
- Why: Salesforce benchmark with a counter-intuitive framing (small-conversation regime doesn't need RAG). Useful negative result for retrieval-vs-context-window tuning in shisad's Recall surface.
- Code: `SalesforceAIResearch/ConvoMem`

### [ ] arXiv:2507.05257 — MemoryAgentBench: Evaluating Memory in LLM Agents via Incremental Multi-Turn Interactions
- Why: incremental-turn evaluation is closer to agent-native (as opposed to LoCoMo's session-replay framing). Would help triangulate claims across our benchmark set.
- Code: `HUST-AI-HYZ/MemoryAgentBench`

### [ ] arXiv:2511.03506 — HaluMem: memory hallucination benchmark
- Why: memory-specific hallucination measurement is a gap in our benchmark coverage (we have StructMemEval for structure, LoCoMo-Plus for cognitive consistency, but nothing for memory-hallucinations specifically).
- Code: `MemTensor/HaluMem`

### [ ] arXiv:2502.13270 — RealTalk: A 21-Day Real-World Dataset for Long-Term Conversation
- Why: real-world (non-synthetic) 21-day dialog. LoCoMo/LongMemEval are partly synthetic; a real dataset would ground our evaluation claims.
- Code: `danny911kr/REALTALK`

### [ ] arXiv:2505.11942 — LifelongAgentBench: Evaluating LLM Agents as Lifelong Learners
- Why: lifelong-learning framing (task sequences, not a single long conversation). Complements Evo-Memory (`ANALYSIS-arxiv-2511.20857-evo-memory.md`).
- Code: `caixd-220529/LifelongAgentBench`

## P3 — Lower-priority, surfaced-but-deferred

These are on the lists but likely not worth a full analysis unless they're cited in a system we're adopting:
- **Wormhole Memory** (arXiv:2501.14846) — novelty framing ("cross-dialogue retrieval cube") but no strong numbers visible.
- **MEM1** (arXiv:2506.15841) — "synergize memory and reasoning" — mostly a method on top of existing retrieval.
- **Cognitive Weave** (arXiv:2506.08098) — "spatio-temporal resonance graph" — flashy framing, worth a triage read only.
- **Agentic Context Engineering** (arXiv:2510.04618) — listed in P2 already; if we do one "context engineering" paper, this is it.
- **Taskcraft** (arXiv:2506.10055) — agentic task generation, adjacent but not memory-first.

## Notes

- The main `PUNCHLIST-academic-industry.md` is treated as a closed batch per its comment. New work lands here.
- P2 candidates should follow the same structure as the main punchlist: PDF + text snapshot + reference summary + analysis.
- The "awesome lists" themselves are linked from `README.md` under "Other catalogs" for future cross-referencing without re-doing the diff.
