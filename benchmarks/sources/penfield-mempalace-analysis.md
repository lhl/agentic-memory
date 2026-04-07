---
title: "MemPalace Benchmark Fraud Analysis"
author: Penfield Labs
source: https://penfieldlabs.substack.com/p/milla-jovovich-just-released-an-ai
published: 2026-04-07
fetched: 2026-04-07
note: Content extracted via WebFetch (AI-processed markdown, not raw copy)
---

# MemPalace Benchmark Fraud Analysis

## Overview

A developer (Ben Sigman) launched an AI memory project called **MemPalace** on GitHub under `milla-jovovich/mempalace`, crediting actress Milla Jovovich as co-author. Within 24 hours: 1.5M+ views, 5,400+ GitHub stars. Penfield dissected the claims and found systematic problems.

---

## The Four Core Problems

### 1. The LoCoMo Bypass

LoCoMo has 10 conversations with maximum 32 sessions each. MemPalace ran with `top_k=50`, which exceeds every conversation's session count. BENCHMARKS.md admits: "The embedding retrieval step is bypassed entirely."

Real numbers: 60.3% R@10 (no rerank), 88.9% R@10 (hybrid, no LLM). Additionally, ~99 documented errors in LoCoMo's answer key make a true 100% mathematically impossible.

### 2. LongMemEval Metric Category Error

LongMemEval leaderboard measures end-to-end QA (retrieve → generate → judge). MemPalace only performs retrieval, measuring `recall_any@5` — a substantially easier task. The 100% was achieved by hardcoding fixes for 3 specific questions. BENCHMARKS.md admits: "This is teaching to the test."

### 3. Claimed Features Absent from Code

Launch post claimed "contradiction detection catches wrong names, wrong pronouns, wrong ages." `knowledge_graph.py` contains zero instances of "contradict." Conflicting facts accumulate without detection. Documented by Leonard Lin in Issue #27 within hours.

### 4. AAAK Compression Is Not Lossless

Claimed "30x lossless compression." Code truncates at 55 characters with no round-trip reconstruction. BENCHMARKS.md reports: Raw 96.6% R@5 vs. AAAK 84.2% R@5 — a 12.4pp quality loss.

---

## The Honesty Gap

BENCHMARKS.md is 5,000+ words of careful self-critique that directly contradicts the launch tweet. Internal documentation acknowledged every flaw. Marketing stripped every caveat.

---

## What's Genuinely Interesting

Raw verbatim text with default embeddings outperforms LLM-extraction approaches for session retrieval — suggesting the field over-engineers memory extraction. A legitimate finding that didn't require inflated numbers.

---

## Broader Context

- **Zep vs. Mem0**: Zep accused Mem0 of flawed harness; Mem0 counter-claimed Zep's 84% was actually ~58%
- **Letta**: Independent findings on LoCoMo reproducibility failures

---

## Penfield's Recommendations

- Public LoCoMo audit: github.com/dial481/locomo-audit
- Read benchmark code, not headline numbers
- Goal: better benchmarks for the whole field
