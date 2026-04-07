---
title: "Benchmarking AI Agent Memory: Is a Filesystem All You Need?"
author: Letta Research Team
source: https://www.letta.com/blog/benchmarking-ai-agent-memory
published: 2025-08-12
fetched: 2026-04-07
note: Content extracted via WebFetch (AI-processed markdown, not raw copy)
---

# Benchmarking AI Agent Memory: Is a Filesystem All You Need?

**Published:** August 12, 2025 | **By:** Letta Research Team

---

## Summary

Letta agents using `gpt-4o-mini` hit **74.0% accuracy** on the LoCoMo benchmark by storing conversation histories in plain files — no specialized memory tooling required.

---

## Background: Memory for AI Agents

MemGPT (2023) created a memory hierarchy modeled after traditional operating systems:
- **Core memory** — what stays in immediate context
- **Conversational memory** — recent interaction history
- **Archival memory** — longer-term external storage
- **External files** — retrievable as needed

---

## The Problem with Current Memory Benchmarks

An agent's memory quality depends more on the agentic system's ability to manage context and call tools than on the memory tools themselves.

### The Mem0 Controversy

Mem0 published benchmark results claiming to have run MemGPT on LoCoMo. The Letta research team could not determine how LoCoMo data was backfilled into MemGPT. Mem0 did not respond to clarification requests (github.com/mem0ai/mem0/issues/3004).

---

## The Experiment: Letta Filesystem on LoCoMo

**Setup:**
- LoCoMo conversational histories placed into files, uploaded to agents
- Files automatically parsed and embedded for semantic search
- Model: `gpt-4o-mini`

**Agent tools:**
- `grep` — text matching
- `search_files` — semantic (vector) search
- `open` / `close` — file navigation
- `answer_question` — response termination

**Tool rules:**
- Must begin with `search_files`
- Continues searching until calling `answer_question`
- Number of iterations determined autonomously

**Result: 74.0% accuracy** vs. Mem0's best of 68.5%.

---

## Why Does a Filesystem Beat Specialized Memory Tools?

1. **Query reformulation** — agents generate their own search queries
2. **Iterative retrieval** — agents keep searching until relevant data is found
3. **Familiarity** — simpler tools more likely in training data
4. **Post-training optimization** — modern models optimized for agentic coding tasks

---

## Key Takeaway

Agent capabilities in using tools matters more than which retrieval mechanism underlies those tools.

---

## How to Properly Evaluate Agent Memory

### 1. Letta Memory Benchmark (Letta Leaderboard)
- Holds framework and tools constant; varies the model
- Evaluates memory management dynamically
- Creates memory interactions on-the-fly

### 2. Task-Based Evaluation (e.g., Terminal-Bench)
- Long-running tasks requiring memory for state tracking
- Letta's OSS agent: #4 overall, #1 open-source on Terminal-Bench

---

## Resources

- [Letta Memory Benchmark](https://www.letta.com/blog/letta-leaderboard)
- [LoCoMo benchmark code](https://github.com/letta-ai/letta-leaderboard/blob/main/leaderboard/locomo/locomo_benchmark.py)
