---
title: "LoCoMo Benchmark Audit"
author: dial481
source: https://github.com/dial481/locomo-audit
fetched: 2026-04-07
note: Content extracted via WebFetch (AI-processed markdown, not raw copy)
---

# LoCoMo Benchmark Audit

Independent audit of the LoCoMo benchmark and the EverMemOS evaluation framework, covering ground truth errors, methodology differences, token cost claims, judge leniency, and reproducibility failures.

---

## Key Findings

| Finding | Detail |
|---|---|
| **Ground truth errors** | 99 of 1,540 questions (6.4%) carry wrong golden answers; theoretical ceiling 93.57% |
| **Per-category statistical validity** | Sample sizes span 96–841 (8.8× ratio); 56% of adjacent-pair comparisons statistically indistinguishable |
| **Token cost** | EverMemOS README: 2,298 avg tokens/question; paper Table 8: 6,669 (2.9× higher). Actual reduction 67%, not 89% |
| **Judge leniency** | 62.81% of intentionally wrong vague-but-topical answers accepted |
| **Scores exceed corrupted ceiling** | EverMemOS single-hop 95.96% exceeds category ceiling 95.72%; multi-hop 91.37% exceeds 90.07% |
| **Not apples-to-apples** | EverMemOS uses 2–3 LLM calls + 729-token CoT + agentic retrieval; others use 1 call, simple prompt |
| **Reproducibility failures** | Third parties report 38.38% vs. claimed 92.32% (EverMemOS#73) |
| **Full-context baseline exceeds EverMemOS** | GPT-4.1-mini with `answer_prompt_cot` on full context: 92.62% > EverMemOS 92.32% |
| **Category 5 evaluation gap** | 446 adversarial questions (22.5%) unevaluated in all published results |

---

## Repository Structure

```
locomo-audit/
├── data/locomo10.json              # Original dataset (SHA256-verified)
├── audit/                          # Per-conversation audit packages + error files
├── results-audit/                  # Score impact analysis across 5 published systems
├── ap-baseline/                    # Judge leniency stress test
│   ├── v1/                         # Specific-but-wrong strategy (10.61%)
│   └── v2/                         # Vague-but-topical strategy (62.81%)
├── fc-baseline/                    # 4 independent full-context runs
├── methodology/                    # Token efficiency, prompts, reproducibility
├── evaluation/config/prompts.yaml
├── errors.json
├── AUDIT_REPORT.md
└── README.md
```

---

## Provenance

| File | Source | License |
|---|---|---|
| `data/locomo10.json` | snap-research/locomo | CC BY-NC 4.0 |
| `evaluation/config/prompts.yaml` | EverMind-AI/EverMemOS | Apache 2.0 |

Both verified byte-for-byte against upstream (Feb 2026).

---

## Prior Work

Extends errors first reported in snap-research/locomo#27 (29 errors). Systematic review identified 156 total issues: 99 score-corrupting, 57 citation-only.
