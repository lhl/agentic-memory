# Revisiting Zep’s 84% LoCoMo Claim: Corrected Evaluation & 58.44% Accuracy

Source: https://github.com/getzep/zep-papers/issues/5

Hey Zep Team,

I am Deshraj, Co-founder and CTO at [Mem0](https://mem0.ai).

At Mem0, we believe that fair, reproducible benchmarking is the cornerstone of progress in AI memory. When challenges arise, we see them as opportunities to elevate everyone’s work.

We have reviewed your recent blog post regarding the Mem0 benchmark and would like to address some important methodological concerns. While we appreciate your team’s engagement, we identified several discrepancies in your evaluation setup. After carefully replicating your benchmark with the correct settings and standardized configurations, our analysis shows that Zep achieves 58.44 % accuracy—not the 84 % reported. This significant gap stems from technical inconsistencies in the evaluation process. Below, we share our detailed findings:

---

## 1. Critical Miscalculation of Accuracy

A critical oversight was identified in Zep's evaluation methodology: their calculation included all questions, including those from the explicitly excluded adversarial category. This methodological oversight has significant implications for the reported accuracy metrics.

**Detailed Analysis of the Issue**

- **Category Inclusion Error:** The evaluation incorrectly incorporated questions from the adversarial (5th) category, which was specifically designated for exclusion in the benchmark protocol.
- **Mathematical Discrepancy:** The calculation erroneously used a denominator that excluded Category 5 questions while including Category 5 correct answers in the numerator.
- **Correct Methodology:** The benchmark explicitly requires evaluation only on Categories 1-4, with a precise calculation of (correct answers from Categories 1-4) ÷ (total questions from Categories 1-4).

**Impact Analysis**

- **Statistical Distortion:** This calculation error artificially inflated the reported accuracy by approximately 25.56 percentage points (84% vs. actual 58.44%).
- **Verification Protocol:** Our team has documented this discrepancy through multiple independent evaluation runs and preserved all calculation artifacts for verification.
- **Methodological Implications:** This fundamental error raises concerns about the rigor applied to other aspects of their evaluation process and the reliability of their broader performance claims.

---

## 2. Inconsistent Baseline Configuration

In research, maintaining consistent experimental settings across baselines is crucial for fair comparisons. Your modifications to both the `system_prompt` and the retrieval `TEMPLATE` deviate from the settings used by all other baselines in the paper:

1. **Prompt Tampering**: Alterations to `system_prompt` that favor Zep's model, invalidating direct comparisons.
    1. Original Prompt Used For Evaluation: https://github.com/mem0ai/mem0/blob/2b58775c17eb1c1b7532242b7154af6744102280/evaluation/prompts.py#L110
    2. Modified Prompt By Zep to rig evaluation: https://github.com/getzep/zep-papers/blob/3f846211d7ed7dad0d2c65565d477d865aafd7e4/kg_architecture_agent_memory/locomo_eval/zep_locomo_responses.py#L20-L60
2. **Template Drift**: You replaced the retrieval template from your prior DMR benchmarks against MemGPT, introducing an unnecessary variable.
    1. Original template used in MemGPT benchmarking on DMR dataset: https://github.com/getzep/zep-papers/blob/3f846211d7ed7dad0d2c65565d477d865aafd7e4/kg_architecture_agent_memory/zep_memgpt_eval.ipynb#L391
    2. Updated template variable by Zep: https://github.com/getzep/zep-papers/blob/3f846211d7ed7dad0d2c65565d477d865aafd7e4/kg_architecture_agent_memory/locomo_eval/zep_locomo_search.py#L15-L32
3. **Single-Runs Only**: While our paper reports the average of **10 independent runs** for each baseline—including standard deviations—you published just one run for Zep, obscuring your system's true variability.
    1. Code for single run: https://github.com/getzep/zep-papers/blob/3f846211d7ed7dad0d2c65565d477d865aafd7e4/kg_architecture_agent_memory/locomo_eval/zep_locomo_eval.py

These practices exemplify superficial benchmarking and fail to meet the community's standards for reproducible research.

---

## 3. Re-Evaluation Under Consistent Conditions

To ensure the community has accurate, reproducible results, we incorporated our published protocol into your latest evaluation code and reran the benchmark. Specifically, we:

- Restricted accuracy calculations to the first four validated LoCoMo categories.
- Aligned the `system_prompt` with the one used across all models in the Mem0 paper.
- Averaged results over ten independent runs to report both mean performance and variance.

With these adjustments, Zep’s mean accuracy is **58.44 % ± 0.20**, versus **65.99 % ± 0.16** for previous version of Zep’s algorithm reported in the Mem0 paper. Our revised evaluation scripts and JSON outputs are available for full transparency, and we welcome you to replicate this process.

Corrected evaluation code: https://github.com/getzep/zep-papers/pull/4

---

## Detailed Responses to Your Concerns about Zep’s Implementation in Mem0 Paper

### Concern 1: User Role Confusion

> “Mem0 utilized a user graph structure designed for single user-assistant interactions but assigned the user role to both participants…”
> 

**Our Response:**

At the time of the evaluation, we followed the documentation and evaluation code available on Zep’s developer documentation and evaluation on DMR dataset. We directly followed Zep’s own DMR benchmark reference, which designates roles “A” and “B” to distinguish participants. We then mapped those to the LoCoMo labels and set `role_type="user"` per Zep’s documentation. Our memory calls (`zep.memory.add`) mirror Zep’s own examples, ensuring a perfectly faithful implementation.

**Reference:**

- https://github.com/getzep/zep-papers/blob/3f846211d7ed7dad0d2c65565d477d865aafd7e4/kg_architecture_agent_memory/zep_memgpt_eval.ipynb#L209
- https://help.getzep.com/memory

### Concern 2: Timestamp Handling

> “Timestamps were appended to messages instead of using Zep’s `created_at` field.”
> 

**Our Response:**

The `created_at` field wasn’t available when we ran our benchmarks—it was introduced later in the Zep SDK. At the time of our experiments, the latest release was `zep-cloud==2.10.1`, which did **not** accept a `created_at` parameter in `zep.memory.add`. We verified this in Zep’s SDK documentation and therefore embedded timestamps directly into each message to preserve the correct order. Only on May 1, 2025—well after our paper was published—did Zep add `created_at` support in `zep-cloud==2.12.1`. This post-hoc SDK update cannot retroactively justify the flaws in Zep’s evaluation.

![Image](https://github.com/user-attachments/assets/e8f46d48-e609-4d9b-b3ea-ff6e184d79ab)

<img width="1479" alt="Image" src="https://github.com/user-attachments/assets/3e1b4bf5-c491-4598-8cff-76a397d8d7ce" />

Reference:
- https://help.getzep.com/sdk-reference/memory/add
- https://pypi.org/project/zep-cloud/
- https://help.getzep.com/memory

### Concern 3: Sequential vs. Parallel Searches

> “Sequential searches inflated Zep’s latency unfairly.”
> 

**Our Response:**

Our goal was to simulate real-world user interactions—think of someone typing into Slack or WhatsApp, sending one message at a time, waiting for a response before composing the next. Because users naturally interact sequentially, we measured every system under identical, sequential workloads to ensure our latency figures reflect genuine deployment realities rather than best-case lab scenarios. Moreover, if one chooses to evaluate in parallel, that same parallel evaluation framework must be applied uniformly to all algorithms under test; without that consistency, any claimed performance advantage is simply not a fair comparison.

---

## Conclusion

Shortly after the Mem0 paper’s launch, Zep issued a critique without fully reviewing our methodology or verifying the facts, leading to basic calculation errors, inconsistent configurations, and one-off runs. We have now addressed each issue through a transparent, reproducible re-evaluation—complete with scripts and data for community review.

Our team at Mem0 has a strong track record of publishing peer-reviewed research at top venues such as NeurIPS, CVPR, ECML, AAAI, ICLR, and WACV, and we remain committed to the highest standards of methodological rigor and openness. We welcome constructive dialogue that helps advance the field of memory in AI agents.

---

**Comment by @danielchalef** (2025-05-09T04:28:58Z):

Thanks for sharing your feedback. We're digging in and will respond over the next few days.

---

**Comment by @danielchalef** (2025-05-12T17:59:44Z):

@deshraj Thanks for pointing out the error in our calculation of Zep's LoCoMo score. The corrected score is 75.14% +/- 0.17 (over 10 runs), with Zep outperforming Mem0 by ~10%. We've added a note to [our blog post](https://blog.getzep.com/lies-damn-lies-statistics-is-mem0-really-sota-in-agent-memory/). We encourage you to review [our results](https://github.com/getzep/zep-papers/tree/locomo-fix/kg_architecture_agent_memory/locomo_eval/data), in particular, the context retrieved from Zep, latency data, and "LLM as Judge" results.

We stand by our critique of your methodology, experimental setup of Zep, and your selection of the flawed LoCoMo evaluation.

> Inconsistent Baseline Configuration

- The original prompt you used didn't correctly reflect how Zep timestamps events (timestamps mark when events occurred, not when they were mentioned). Our adjusted prompt clarified this, ensuring fair evaluation. Using Zep's prompt with Mem0 or vice versa wouldn't be optimal, as each system handles context differently. It's common practice to transparently document differences in experimental design, especially when adjustments better align with the intended treatment.
- There isn't a mandated prompt for LoCoMo benchmarks; clarity matters more than uniformity if systems handle data differently. You're welcome to use our clarified prompt with any baseline for accurate comparisons.
- We performed 10 independent runs for Zep, not just one as you suggested.

> Re-Evaluation Under Consistent Conditions

Your revised code doesn't reflect how Zep works. Did you reload the data using our ingestion script and run our evaluation scripts? We're struggling to see how you got to a revised 58.44%. For transparency and clarity, could you please share your resulting datasets, as we've provided ours above?

> User Role Confusion

The current best practice for implementing Zep is as we described in our blog post. 

> Timestamp Handling

The `created_at` field has been available in the `Message` type since https://github.com/getzep/zep-python/pull/171, dated May 8, 2024. See our [implementation](https://github.com/getzep/zep-papers/blame/main/kg_architecture_agent_memory/zep_longmem_eval.ipynb#L177) for the LongMemEval benchmark. 

> Sequential vs. Parallel Searches

I think you misunderstood us here. When building the context value for Zep's evaluation, two search queries needed to be executed. You ran these in series, rather than parallel, significantly penalizing latency results. Our corrected code is here:

https://github.com/getzep/zep-papers/blob/d7401e89325dd5e4bd1d52cf1bb47782caf84aef/kg_architecture_agent_memory/locomo_eval/zep_locomo_search.py#L66-L68

As we've previously noted, benchmarking competitor services can be fraught. For a robust comparison, we encourage you to evaluate Mem0 using the LongMemEval benchmark, which avoids the critical flaws we identified in LoCoMo. We've also published our own results for LongMemEval, saving you from having to evaluate Zep.

---

**Comment by @danielchalef** (2025-05-19T20:48:47Z):

Closing due to inactivity. Happy to reopen if further discussion is required.
