# Benchmarking Agentic Memory Systems

Best practices, known pitfalls, and lessons learned from benchmarking AI agent memory — compiled from public disputes, independent audits, and our own analysis.

**TL;DR:** The agentic memory benchmarking space is immature and riddled with methodological problems. Headline numbers are frequently incomparable across systems due to metric confusion, dataset quality issues, and non-reproducible methodology. Read benchmark *code*, not just headline numbers.

**See also: [MELT — Memory Evaluation for Lifecycle Testing](https://github.com/shisa-ai/MELT)** — our design for a benchmark that actually tests memory lifecycle mechanics (decay, consolidation, contradiction resolution, core memory stability) rather than static retrieval. Separate repo; draft status.

## Table of Contents

- [The Core Problem](#the-core-problem)
- [Popular Benchmarks and Their Limitations](#popular-benchmarks-and-their-limitations)
- [Common Benchmarking Failures](#common-benchmarking-failures)
- [Best Practices for Memory System Developers](#best-practices-for-memory-system-developers)
  - [Which Benchmarks to Use](#which-benchmarks-to-use)
  - [Contamination Prevention](#contamination-prevention)
  - [Making Results Comparable](#making-results-comparable)
  - [What Benchmarks Actually Measure (and Don't)](#what-benchmarks-actually-measure-and-dont)
  - [The Landmines (Quick Reference)](#the-landmines-quick-reference)
- [Sources](#sources)

---

## The Core Problem

There is no widely accepted, high-quality benchmark for agentic memory. Existing benchmarks test retrieval from static conversation histories, not dynamic memory management. Meanwhile, vendors routinely:

- Compare retrieval recall against end-to-end QA accuracy in the same table
- Overfit to test sets, then publish the overfitted score as the headline
- Misconfigure competitors' systems (intentionally or not) in comparative evaluations
- Claim scores that exceed the mathematical ceiling of corrupted datasets

The result: published benchmark numbers are largely unreliable for cross-system comparison without careful methodology review.

---

## Popular Benchmarks and Their Limitations

### LoCoMo (Maharana et al., 2024)

The most-cited benchmark for memory systems. Tests QA over 10 fictional long conversations.

**Known issues:**

| Issue | Impact | Source |
|-------|--------|--------|
| **~99 incorrect golden answers** (6.4% of 1,540 questions) | Hard accuracy ceiling of ~93.57% — a true 100% is mathematically impossible | [locomo-audit](https://github.com/dial481/locomo-audit) |
| **Category 5 (adversarial) is broken** — missing ground truth, broken formatter | 446 questions (22.5%) are never evaluated by any published system | locomo-audit |
| **Small sample sizes per category** — 96 to 841 questions (8.8× ratio) | 56% of adjacent-pair comparisons are statistically indistinguishable | locomo-audit |
| **Conversations are only 16k–26k tokens** | Well within modern context windows; a full-context baseline (~73%) outperforms some memory systems | Zep blog |
| **No knowledge-update questions** | Misses a critical real-world memory capability | Zep blog |
| **Speaker attribution errors, ambiguous questions** | Multiple valid answers exist for some questions | Zep blog, Mem0 response |
| **LLM judge is gameable** — vague-but-topical wrong answers accepted 62.8% of the time | ~6× leniency gap depending on answer strategy | locomo-audit |

**Bottom line:** LoCoMo is useful as a directional signal but unsuitable for precise cross-system ranking. Scores above ~93% are suspect. Category-level comparisons require confidence interval analysis.

### LongMemEval (Wu et al., 2024)

A larger, human-curated benchmark with ~500 questions over ~115k-token conversations. Includes temporal reasoning and knowledge-update question types.

**Strengths vs. LoCoMo:**
- 4–7× longer conversations
- Tests knowledge updates (absent in LoCoMo)
- Human-curated (vs. LoCoMo's automated generation)
- Explicit temporal reasoning evaluation

**Known issues:**

| Issue | Impact | Source |
|-------|--------|--------|
| **Retrieval recall vs. QA accuracy confusion** | Systems reporting R@5 (retrieval) cannot be compared with systems reporting end-to-end QA accuracy | MemPalace benchmarks, Penfield analysis |
| **LongMemEval-S vs. -M variants** have different difficulty | Cross-variant comparisons are invalid | MemPalace #39 |
| **Overfitting risk** — small test set invites targeted patches | MemPalace achieved 100% R@5 by hard-coding fixes for 3 specific failing questions, then reported a clean held-out score of 98.4% on 450 questions | MemPalace BENCHMARKS.md |

**Bottom line:** Currently the best available static-conversation benchmark, but metric type (retrieval vs. QA) must be specified in any comparison.

### ConvoMem (Salesforce)

75K+ QA pairs testing conversational memory. Less widely cited but provides useful category breakdowns (user facts, assistant facts, implicit connections, preferences, abstention).

### Other Benchmarks

| Benchmark | Focus | Notes |
|-----------|-------|-------|
| **MemBench** (ACL 2025) | Multi-category memory evaluation | Limited published results |
| **EverMemBench** (Hu et al.) | >1M-token multi-party conversations | Diagnoses multi-hop collapse and retrieval bottlenecks |
| **StructMemEval** (Shutova et al.) | Memory *organization* (trees/ledgers/state tracking) | Tests structure, not just retrieval |
| **LoCoMo-Plus** (Li et al.) | "Cognitive memory" — latent constraints, goals, values | Beyond-factual memory evaluation |
| **Terminal-Bench** | Long-running tasks requiring memory for state tracking | Tests dynamic memory, not static retrieval |
| **Letta Leaderboard** | Dynamic memory interactions created on-the-fly | Varies models while holding framework constant |

---

## Common Benchmarking Failures

### 1. Metric Confusion (Apples-to-Oranges)

The most pervasive problem. Systems reporting different metrics are placed in the same comparison table.

| Metric | What it measures | Who uses it |
|--------|-----------------|-------------|
| **R@k (Recall at k)** | Whether the gold document appears in top-k retrieved results | MemPalace, dense retrievers |
| **End-to-end QA accuracy** | Retrieve → generate answer → LLM judge scores correctness | Mem0, Zep, Letta, EverMemOS |
| **J-Score** | LoCoMo's specific judged accuracy metric | Mem0, Zep |

A system with 96.6% R@5 is **not** outperforming a system with 73% QA accuracy — they measure fundamentally different things. Retrieval recall is a substantially easier task than end-to-end QA.

**Rule: Never compare scores across different metric types.**

### 2. Structural Bypasses (Trivializing the Benchmark)

Setting parameters that bypass the system being tested:

- **top_k > number of sessions:** When top_k=50 against conversations with at most 32 sessions, "the embedding retrieval step is bypassed entirely" — the system is just doing reading comprehension, not retrieval.
- **Full-context baselines:** Dumping entire conversation history into an LLM context window isn't memory — it's a baseline that should be explicitly labeled.

**Rule: Report honest constrained results alongside any unconstrained ones. If top_k exceeds the number of retrievable units, say so.**

### 3. Test-Set Overfitting

Analyzing which specific questions fail, then adding targeted fixes:

- MemPalace's hybrid v4 achieved 100% by hard-coding patches for 3 specific failing questions (quoted phrases, a person named Rachel, a high school reunion pattern). Their own BENCHMARKS.md calls this "teaching to the test."
- The honest held-out score (98.4% on 450 never-tuned questions) is the real generalization number.

**Rule: Always report a held-out or cross-validation score alongside any tuned result. Disclose which questions were used for development.**

### 4. Competitor Misconfiguration

Vendors testing competitors' systems with incorrect implementations:

| Case | Claimed | Corrected | Issue |
|------|---------|-----------|-------|
| **Mem0 testing Zep** | Zep scores 65.99% | Zep scores 75.14% ±0.17 | Wrong user model, improper timestamps, sequential instead of parallel search |
| **Zep testing Zep** | Zep scores 84% | Zep scores 75.14% | Calculation included excluded adversarial category |
| **Mem0 testing MemGPT** | Published results | Letta unable to determine how data was backfilled | No response to clarification requests |

**Rule: Any competitor evaluation should be reviewed and ideally reproduced by the competitor. Publish full configuration and code.**

### 5. Claims-vs-Code Gap

Published claims that don't match what the code actually does:

- "30× lossless compression" measured at 3.84× with a 12.4pp retrieval quality drop
- "Contradiction detection" with zero occurrences of "contradict" in the codebase
- Benchmark scores attributed to a novel architecture that are actually measured on a vanilla vector DB baseline

**Rule: Read the benchmark runner code, not just the README. Verify which code paths are actually exercised during evaluation.**

### 6. Single-Run Reporting

Most systems report a single run, masking variance. LLM-based evaluation introduces meaningful randomness.

- Mem0 claims to average 10 independent runs with standard deviations
- Zep confirmed 10 runs with ±0.17 variance
- Most other systems: single run, no error bars

**Rule: Report mean ± standard deviation over multiple runs (≥5, ideally 10). Single-run point estimates are not reliable for ranking.**

### 7. Misleading Token/Cost Claims

Token efficiency numbers that don't match paper methodology:

- EverMemOS README claimed 2,298 avg tokens/question; paper Table 8 reported 6,669 (~2.9× higher)
- Claimed 89% token reduction vs. actual ~67%

**Rule: Token/cost claims should reference specific measurements with reproducible methodology, not cherry-picked examples.**

---

## Best Practices for Memory System Developers

If you're building a memory system and want to evaluate it honestly, this section is the practical guide. The benchmarking landscape is full of landmines — here's how to navigate them.

### Which Benchmarks to Use

Not all benchmarks test what you think they test. Here's a practical recommendation matrix:

| Benchmark | Use for | Don't use for | Comparability | Recommendation |
|-----------|---------|---------------|---------------|----------------|
| **LongMemEval** | Retrieval quality, temporal reasoning, knowledge updates | Dynamic memory management, agent tool use | High — widely reported, human-curated | **Use this first.** Best available static benchmark. Report both R@k and end-to-end QA. |
| **LoCoMo** | Directional signal, comparing against published baselines | Precise ranking, category-level claims | Medium — widely cited but flawed dataset | **Use with caveats.** Exclude Category 5. Note 93.57% ceiling. Don't trust score differences <5pp. |
| **ConvoMem** | Category-level diagnostics (facts, preferences, abstention) | Cross-system ranking | Low — few systems report it | **Use for internal diagnostics**, not headline numbers. |
| **EverMemBench** | Stress-testing at >1M tokens, multi-party conversations | Comparison with most published systems | Low — newer, less adoption | **Use if your system targets very long contexts.** |
| **StructMemEval** | Testing memory *organization* (does your system structure what it stores?) | Retrieval quality | Low — niche | **Use if your system has explicit structure** (graphs, hierarchies, ledgers). |
| **LoCoMo-Plus** | Testing "cognitive" memory (goals, values, latent constraints) | Standard retrieval evaluation | Low — newer | **Use for advanced memory capabilities** beyond factual recall. |
| **Terminal-Bench** | Real-world agentic memory under task pressure | Isolated retrieval quality | Medium — growing adoption | **Best available test of dynamic memory.** Use if you can run it. |
| **Letta Leaderboard** | Dynamic memory interactions, model comparison | Comparing non-Letta frameworks | Low — framework-specific | **Use the methodology pattern** (on-the-fly memory interactions) even if not on Letta. |

**What's missing from all of them:** No current benchmark adequately tests the full memory lifecycle — write quality, maintenance/decay, contradiction resolution, and retrieval together. You'll need to combine benchmarks or build supplementary evaluations for the capabilities you care about.

### Contamination Prevention

The #1 way to silently invalidate your results is to let test data leak into development decisions. This has happened to every major system that reported "perfect" scores.

**The contamination ladder** (from obvious to subtle):

1. **Direct memorization** — training on test questions/answers. Nobody does this intentionally, but if your embedding model was fine-tuned on data that includes the benchmark conversations, you have a problem.
2. **Test-set-guided heuristics** — analyzing which questions fail, then adding targeted patches. MemPalace's hybrid v4 did exactly this: hard-coded fixes for 3 specific failing questions to hit 100%. Their honest held-out score was 98.4%.
3. **Hyperparameter tuning on the test set** — adjusting top_k, similarity thresholds, boost weights, reranker thresholds while watching the test score. This is the most common form and the easiest to do accidentally.
4. **Architecture decisions informed by error analysis** — "temporal questions are weak, so let's add a temporal boost." Legitimate engineering, but the resulting score on those temporal questions is no longer clean.
5. **Prompt tuning against test questions** — adjusting the system prompt or retrieval template to improve test performance. The Mem0/Zep dispute centered partly on this: Zep used a different prompt than Mem0's standardized one.

**How to stay clean:**

- **Split early.** Before any development begins, partition the benchmark into dev (≤10% for error analysis), validation (for tuning), and held-out test (never touched until final evaluation). The held-out score is your real number.
- **Log every time you look at test data.** If you examine a failing question to understand *why* it failed, that question is contaminated. Move it to the dev partition.
- **Freeze the system before the held-out run.** No parameter changes after you start the final evaluation. One shot.
- **Report both scores.** The tuned/dev score shows your ceiling. The held-out score shows generalization. Both are informative; only the held-out one is clean.

### Making Results Comparable

If you want your numbers to mean something next to published results, you need to match methodology exactly — or document every deviation.

**Methodology checklist (report all of these):**

```
Benchmark:        [name + version/variant, e.g., "LongMemEval-S"]
Metric:           [R@1, R@5, R@10, NDCG@k, QA accuracy, J-Score]
Embedding model:  [name + version, e.g., "all-MiniLM-L6-v2"]
Reranker:         [model or "none"]
LLM (retrieval):  [model used at retrieval time, or "none"]
LLM (answer gen): [model used to generate answers, or "none"]
LLM (judge):      [model used for evaluation, or "keyword match"]
top_k:            [value — and whether it exceeds the number of retrievable units]
Prompt template:  [link to exact prompt or inline it]
LLM calls/query:  [number of LLM invocations per question]
Runs:             [number of independent runs]
Score:            [mean ± std]
Hardware:         [CPU/GPU, RAM]
Date:             [when the evaluation was run]
Code:             [link to exact benchmark runner]
```

**Comparability traps:**

- **LongMemEval-S vs. -M:** Different difficulty. Don't compare across variants.
- **LoCoMo with vs. without Category 5:** Some systems exclude it (broken ground truth), some include it. Always state which categories you evaluated.
- **R@5 vs. QA accuracy:** These cannot be compared. Period. If the published numbers you're comparing against used a different metric, you need to run both metrics on your system.
- **Different judge models:** GPT-4 and GPT-4o-mini produce different leniency profiles. Match the judge or report the difference.
- **Different number of LLM calls:** A system using 3 sequential LLM calls per question is solving a different problem than one using 1. Report this in your comparison table.

### What Benchmarks Actually Measure (and Don't)

This is the gap that matters most for building a real memory system.

**What current benchmarks test well:**
- Retrieval over static, pre-loaded conversation history
- Factual recall (who said what, when)
- Basic temporal reasoning (before/after, sequencing)
- Knowledge updates (LongMemEval only)

**What no current benchmark tests adequately:**

| Capability | Why it matters | Closest available test |
|------------|---------------|----------------------|
| **Write quality** — does the system extract and store the right information at ingest time? | Garbage in, garbage out. If extraction is lossy, retrieval quality is capped. | ConvoMem categories indirectly test this |
| **Memory maintenance** — does the system consolidate, merge, decay, or prune over time? | Real memory systems need to manage growth and staleness | None — all benchmarks are point-in-time snapshots |
| **Contradiction resolution** — when facts change, does the system handle updates correctly? | Users change jobs, preferences evolve, facts get corrected | LongMemEval "knowledge update" category (limited) |
| **Abstention** — does the system know when it doesn't know? | False confidence is worse than no answer | LoCoMo Category 5 (broken); ConvoMem abstention category |
| **Multi-hop reasoning** — can the system combine facts from different memories? | Real questions often require synthesis across sessions | LoCoMo multi-hop (small sample), EverMemBench |
| **Dynamic tool use** — can the agent effectively use the memory system as a tool? | Letta showed tool-use effectiveness > retrieval mechanism | Terminal-Bench, Letta Leaderboard pattern |
| **Cost/latency at scale** — what happens at 10K, 100K, 1M stored memories? | Benchmarks use small corpora that fit in context windows | EverMemBench (>1M tokens); otherwise DIY |
| **Adversarial robustness** — can the system handle misleading, contradictory, or noisy input? | Real conversations are messy | LoCoMo adversarial (broken); LoCoMo-Plus |

**Implication for development:** Don't optimize solely for benchmark scores. A system that scores 95% on LongMemEval retrieval but can't handle fact updates or memory consolidation is not a good memory system — it's a good search engine. Use benchmarks to validate retrieval, but build supplementary tests for the capabilities that matter to your use case.

### The Landmines (Quick Reference)

Things that will silently invalidate your results or mislead you during development:

| Landmine | What happens | How to detect |
|----------|-------------|---------------|
| **top_k ≥ session count** | Retrieval is bypassed; you're just testing reading comprehension | Check max sessions per conversation in the dataset vs. your top_k |
| **Tuning on the test set** | Your score doesn't generalize; you've memorized the benchmark | Run a held-out split; if it's >2pp lower, you have contamination |
| **Reporting R@k as "accuracy"** | Readers assume end-to-end QA; your number looks 10-30pp better than it is | Always label the metric explicitly |
| **Wrong baseline attribution** | Your "novel architecture" score is actually your embedding model's score | Run the benchmark with raw embeddings and no architecture; compare |
| **LLM judge leniency** | Vague answers score ~63% on wrong-answer stress tests | Run intentionally wrong answers through your judge; measure false positive rate |
| **Single-run reporting** | Variance hides behind a point estimate; lucky runs look like improvements | Run ≥5 times; check if your "improvement" survives the error bars |
| **LoCoMo ceiling** | 6.4% of golden answers are wrong; 100% is impossible; >93% is suspect | Check the [locomo-audit error catalog](https://github.com/dial481/locomo-audit) |
| **Cross-variant comparison** | LongMemEval-S and -M have different difficulty; LoCoMo ±Category 5 differs | Always state exact variant and included categories |
| **Prompt sensitivity** | A different system prompt can swing scores by 10+ points | Report your exact prompt; test sensitivity with 2-3 prompt variants |
| **Embedding model mismatch** | Comparing "my system" on bge-large vs. "their system" on MiniLM is meaningless | Match embedding models or report both |

### Supplementary Guidance

#### For Benchmark Producers (Creating New Benchmarks)

1. **Validate ground truth.** Multiple independent annotators. Publish error rates and correction logs.
2. **Sufficient sample sizes per category.** Wilson Score confidence intervals should separate adjacent systems. ≥200 questions per category.
3. **Include knowledge updates.** Real memory requires handling contradictions and fact evolution.
4. **Exceed modern context windows.** Benchmarks under ~128k tokens are trivially solved by full-context baselines.
5. **Test dynamic memory management.** Create memory interactions on-the-fly rather than testing lookup over pre-loaded history.
6. **Evaluate abstention.** Systems must know when they don't know.
7. **Stress-test the judge.** Measure false-positive rates with intentionally wrong answers.

#### For Evaluating Competitor Claims

1. **Read the benchmark runner code**, not the README.
2. **Check the comparison table metrics.** Same metric? Same dataset variant?
3. **Look for held-out vs. tuned scores.** The held-out score is the real one.
4. **Check for structural bypasses.** Does top_k exceed retrievable units?
5. **Verify competitor implementations.** Were they configured correctly?
6. **Check dataset quality.** Known error rates set a hard ceiling. Scores above the ceiling are red flags.
7. **Look for error bars.** No variance = single run = unreliable for ranking.

---

## One Genuine Finding Worth Preserving

Across multiple independent evaluations, **raw verbatim text with default embeddings consistently outperforms LLM-extraction approaches** at session-level retrieval:

| System/Mode | LongMemEval R@5 | LLM Required |
|-------------|-----------------|--------------|
| Raw ChromaDB (all-MiniLM-L6-v2) | 96.6% | None |
| Mem0 RAG (LLM-extracted memories) | 30–45% (ConvoMem) | Yes |
| Block extraction | 57–71% (ConvoMem) | Yes |

This suggests the field may be over-engineering memory extraction. LLM-based extraction discards original context; verbatim storage retains everything and lets the search model find it. This finding required no novel architecture — just measuring the simple baseline that nobody tried.

Similarly, Letta demonstrated that a filesystem-based agent using `grep` and `search_files` on gpt-4o-mini achieved 74.0% on LoCoMo, outperforming Mem0's specialized memory system (68.5%). Their analysis: agent capability in using tools matters more than which retrieval mechanism underlies those tools, and simpler tools (found abundantly in LLM training data) are used more effectively.

---

## Sources

All sources are archived in [`sources/`](sources/) as AI-extracted markdown snapshots (fetched 2026-04-07). These are not verbatim copies — they were processed through WebFetch or `gh` CLI.

| Source | Local Copy | Key Contribution |
|--------|-----------|-----------------|
| [MemPalace BENCHMARKS.md](https://github.com/milla-jovovich/mempalace/blob/main/benchmarks/BENCHMARKS.md) | [sources/mempalace-benchmarks-md.md](sources/mempalace-benchmarks-md.md) | Detailed score progression with honest overfitting disclosure; verbatim-vs-extraction comparison |
| [Zep: "Lies, Damn Lies & Statistics"](https://blog.getzep.com/lies-damn-lies-statistics-is-mem0-really-sota-in-agent-memory/) | [sources/zep-blog-lies-damn-lies.md](sources/zep-blog-lies-damn-lies.md) | Competitor misconfiguration case study; LoCoMo critique; LongMemEval advocacy |
| [Mem0 response (zep-papers #5)](https://github.com/getzep/zep-papers/issues/5) | [sources/zep-papers-issue-5.md](sources/zep-papers-issue-5.md) | Counter-arguments on methodology; calculation error dispute; prompt consistency debate |
| [Letta: "Benchmarking AI Agent Memory"](https://www.letta.com/blog/benchmarking-ai-agent-memory) | [sources/letta-blog-benchmarking.md](sources/letta-blog-benchmarking.md) | Tool-use effectiveness > retrieval mechanism; filesystem baseline; dynamic benchmark advocacy |
| [Penfield Labs analysis](https://penfieldlabs.substack.com/p/milla-jovovich-just-released-an-ai) | [sources/penfield-mempalace-analysis.md](sources/penfield-mempalace-analysis.md) | Claims-vs-code gap analysis; structural bypass identification; metric confusion documentation |
| [LoCoMo audit](https://github.com/dial481/locomo-audit) | [sources/locomo-audit-readme.md](sources/locomo-audit-readme.md) | Ground truth error catalog; judge leniency testing; statistical validity analysis; token cost verification |
| [MemPalace #27](https://github.com/milla-jovovich/mempalace/issues/27) | [sources/mempalace-issue-27.md](sources/mempalace-issue-27.md) | README-vs-code comparison table; independent verification of claims-vs-code gap |
| [MemPalace #39](https://github.com/milla-jovovich/mempalace/issues/39) | [sources/mempalace-issue-39.md](sources/mempalace-issue-39.md) | Independent benchmark reproduction on M2 Ultra; per-mode regression analysis; AAAK compression testing |

See also: our own analysis files in the parent directory for deeper dives on individual systems and papers.
