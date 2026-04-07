---
title: "Is Mem0 Really SOTA in Agent Memory?"
author: Daniel Chalef, with contributions from Preston Rasmussen
source: https://blog.getzep.com/lies-damn-lies-statistics-is-mem0-really-sota-in-agent-memory/
published: 2025-05-06
fetched: 2026-04-07
note: Content extracted via WebFetch (AI-processed markdown, not raw copy)
---

# Is Mem0 Really SOTA in Agent Memory?

*By Daniel Chalef, with contributions from Preston Rasmussen | Published May 6, 2025*

---

## Summary

Mem0 published research claiming state-of-the-art (SOTA) performance in agent memory, benchmarking against competitors including Zep. However, Zep's own analysis reveals significant flaws in both the chosen benchmark and the implementation used to evaluate Zep.

> **Correction note:** Zep's corrected LoCoMo score is **75.14% ± 0.17**, outperforming Mem0 by ~10%.
> **Update (Dec 9, 2025):** New LoCoMo scores published — 80% at <200ms latency.

---

## Zep Outperforms Mem0 on LoCoMo (Correct Implementation)

When run with a proper Zep implementation, results differ dramatically from Mem0's paper:

| System | J Score |
|---|---|
| Zep (Correct) | 75.14% ± 0.17 |
| Mem0 Graph (best Mem0 config) | ~68% |
| Zep (as reported by Mem0) | 65.99% |

### Search Latency (p95)

| System | p95 Latency |
|---|---|
| Mem0 Base | 0.200s |
| Mem0 Graph | 0.657s |
| Zep (Mem0's flawed impl.) | 0.778s |
| Zep (Correct, concurrent) | 0.632s |

---

## Why LoCoMo Is a Flawed Benchmark

### 1. Insufficient Length and Complexity
Conversations average ~16,000–26,000 tokens — well within modern LLM context windows. Full-context baseline (~73%) outperforms Mem0's best (~68%).

### 2. Missing Key Memory Functions
No knowledge-update questions.

### 3. Data Quality Issues
- Category 5 unusable — missing ground truth answers
- Multimodal errors — BLIP descriptions lack needed info
- Incorrect speaker attribution
- Ambiguous questions with multiple valid answers

---

## Mem0's Flawed Evaluation of Zep

### 1. Incorrect User Model
Both conversation participants assigned to user role.

### 2. Improper Timestamp Handling
Timestamps appended to message content rather than via `created_at` field.

### 3. Sequential vs. Parallel Search
Searches run sequentially instead of in parallel, inflating latency.

---

## Why Zep Prefers LongMemEval

| Feature | LoCoMo | LongMemEval |
|---|---|---|
| Avg. conversation length | 16k–26k tokens | ~115k tokens |
| Tests knowledge updates | No | Yes |
| Temporal reasoning | Limited | Explicit |
| Curation method | Automated | Human-curated |
| Enterprise relevance | Low | High |

---

## Conclusion

Mem0's SOTA claim rests on a benchmark with documented quality issues and a competitor evaluation built on implementation errors. When Zep is correctly implemented, it outperforms Mem0 by approximately 10%.
