<!-- Generated from arxiv-2508.19828.pdf via pdftotext -layout on 2026-02-22 -->

                                             Memory-R1: Enhancing Large Language Model Agents to Manage and
                                                       Utilize Memories via Reinforcement Learning
                                                         Sikuan Yan*1,2 , Xiufeng Yang*3 , Zuchao Huang1 , Ercong Nie1,2 ,
                                                    Zifeng Ding2,4 , Zonggen Li5 , Xiaowen Ma1 , Jinhe Bi1 , Kristian Kersting6 ,
                                                         Jeff Z. Pan7 , Hinrich Schuetze1,2 , Volker Tresp1,2 , Yunpu Ma†1,2
                                                 1
                                                   Ludwig Maximilian University of Munich, 2 Munich Center for Machine Learning,
                                              3
                                                Technical University of Munich, 4 University of Cambridge, 5 University of Hong Kong,
                                                            6
                                                              Technical University of Darmstadt, 7 University of Edinburgh
                                                                            s.yan@campus.lmu.de, cognitive.yunpu@gmail.com


                                                                Abstract                              representation layers to model episodic, semantic,
                                              Large Language Models (LLMs) have demon-                and working memory (Tresp et al., 2023). Recent




arXiv:2508.19828v5 [cs.CL] 14 Jan 2026
                                              strated impressive capabilities across a wide           studies augment LLMs with explicit external mem-
                                              range of NLP tasks, but they remain funda-              ory modules (Zhang et al., 2024), most of which
                                              mentally stateless, constrained by limited con-         adopt the retrieval-augmented generation (RAG)
                                              text windows that hinder long-horizon reason-           paradigm (Pan et al., 2025; Salama et al., 2025),
                                              ing. Recent efforts to address this limitation          appending retrieved memory entries to the model’s
                                              often augment LLMs with an external memory
                                                                                                      input prompt. While this extends access to past
                                              bank, yet most existing pipelines are static and
                                              heuristic-driven, lacking a learned mechanism
                                                                                                      information, it also creates a fundamental retrieval
                                              for deciding what to store, update, or retrieve.        challenge: heuristics may return too few entries,
                                              We present Memory-R1, a reinforcement learn-            omitting crucial context, or too many, flooding the
                                              ing (RL) framework that equips LLMs with                model with irrelevant information and degrading
                                              the ability to actively manage and utilize exter-       performance (Liu et al., 2023). In this paradigm,
                                              nal memory through two specialized agents: a            retrieved memories are passed to the LLM without
                                              Memory Manager that learns structured oper-             meaningful filtering or prioritization, forcing the
                                              ations, including ADD, UPDATE, DELETE,
                                                                                                      model to reason over both relevant and irrelevant
                                              and NOOP; and an Answer Agent that pre-
                                              selects and reasons over relevant entries. Both         content, which makes it prone to distraction by
                                              agents are fine-tuned with outcome-driven RL            noise. Humans, by contrast, retrieve broadly but
                                              (PPO and GRPO), enabling adaptive memory                then filter, integrating only the most useful pieces
                                              management with minimal supervision. With               to maintain coherent, evolving knowledge.
                                              only 152 training QA pairs, Memory-R1 outper-              Equally important is the challenge of memory
                                              forms strong baselines and generalizes across           management: deciding what to remember, up-
                                              diverse question types, three benchmarks (Lo-
                                                                                                      date, or discard. Some systems (Packer et al.,
                                              CoMo, MSC, LongMemEval), and multiple
                                              model scales (3B–14B).
                                                                                                      2023; Modarressi et al., 2024; Xiong et al.,
                                                                                                      2025) adopt CRUD-style operations, namely cre-
                                                                                                      ate, read, update, and delete, which are adapted
                                         1    Introduction
                                                                                                      from databases (Martin, 1983). A more re-
                                         Large Language Models (LLMs) have shown re-                  cent work (AIOS Foundation, 2024) augments
                                         markable ability in understanding and generat-               this paradigm with a search operator, while
                                         ing natural language, making them central to re-             Mem0 (Chhikara et al., 2025) investigates the
                                         cent advances in AI (OpenAI et al., 2024; Qwen               operator set {ADD, UPDATE, DELETE, NOOP}. We
                                         et al., 2025). Yet, they remain fundamentally state-         adopt this setting, as it provides a minimal yet
                                         less (Yu et al., 2025; Fan et al., 2025; Goodyear            expressive framework for modeling memory dy-
                                         et al., 2025): their memory is bounded by a fi-              namics. Existing approaches mainly rely on vanilla
                                         nite context window and any information that falls           LLMs to choose operations from in-context instruc-
                                         outside this window is forgotten, preventing them            tions without any learning signal tied to correct-
                                         from maintaining knowledge across long conver-               ness (Packer et al., 2023; Chhikara et al., 2025).
                                         sations or evolving tasks (Wang et al., 2024; Fei            Even simple cases can fail. Figure 1, a simplified
                                         et al., 2023).                                               example drawn from a LoCoMo conversation (Ma-
                                            One early effort is the Tensor Brain framework,           harana et al., 2024), shows how a user says “I
                                         which uses a bilayer tensor network with index and           adopted a dog named Buddy” and later adds “I

                                                                                                  1
Figure 1: Comparison of Memory-R1 and a vanilla LLM memory system. (Left) In a multi-session dialogue, the
user mentions adopting two dogs across sessions. (Middle) The vanilla Memory Manager misinterprets this as a
contradiction and issues DELETE+ADD, fragmenting memory. (Right) The RL-trained Memory Manager issues a
single UPDATE to consolidate the fact, while the Answer Agent distills 60 retrieved memories down to the relevant
one (“Andrew adopted 2 dogs named Buddy and Scout”) and correctly answers “2 dogs.”


adopted another dog named Scout”. A vanilla                  Retrieval-Augmented Generation (RAG) and rea-
system misinterprets this as a contradiction, issu-          son over the selected entries to produce answers.
ing DELETE+ADD and overwriting the original mem-             Both agents are fine-tuned using PPO (Schul-
ory. A trained agent instead consolidates with an            man et al., 2017) or GRPO (Shao et al., 2024),
UPDATE: “Andrew adopted two dogs, Buddy and                  achieving strong performance with as few as 152
Scout.” Appendix A.1 provides a real dialogue trace          question–answer pairs. On the LoCoMo bench-
illustrating this case in practice.                          mark (Maharana et al., 2024), Memory-R1 delivers
    These challenges of retrieving and managing              substantial gains over the most competitive base-
memory remain largely unsolved. Supervised fine-             line, Mem0 (Chhikara et al., 2025). Using the
tuning provides limited help because it is imprac-           LLaMA-3.1-8B-Instruct backbone, Memory-R1-
tical to label every memory operation or retrieval           GRPO achieves relative improvements of 28% in
decision. Reinforcement learning (RL), in contrast,          F1, 34% in BLEU-1, and 30% in LLM-as-a-Judge.
has recently shown strong potential for aligning             These improvements set a new state of the art on
LLM behavior with high-level objectives, includ-             LoCoMo and underscore Memory-R1’s ability to
ing tool use (Qian et al., 2025; Wang et al., 2025),         achieve large performance gains with minimal su-
web navigation (Wei et al., 2025), and search opti-          pervision, highlighting its efficiency.
mization (Jin et al., 2025; Song et al., 2025). Build-          Our contributions are summarized as follows:
ing on this success, we argue that RL is the missing         (1) We introduce Memory-R1, the first RL frame-
ingredient for adaptive memory in LLM agents.                work for memory-augmented LLMs, consisting of
By optimizing outcome-based rewards, models can              a Memory Manager to perform structured memory
learn when to add, update, delete, or retain infor-          operations and an Answer Agent to filter and reason
mation and how to use retrieved memories for rea-            over memories retrieved via RAG. (2) We develop
soning.                                                      a data-efficient fine-tuning strategy using PPO and
    In this paper, we present Memory-R1, an RL               GRPO that enables Memory-R1 to achieve strong
fine-tuned, memory-augmented LLM framework                   performance with as few as 152 question–answer
with two specialized agents: (1) a Memory Man-               pairs, demonstrating that large memory improve-
ager that performs structured memory operations              ments can be achieved with minimal supervision.
to maintain and evolve the memory bank, and                  (3) We provide in-depth analysis of RL choices,
(2) an Answer Agent that applies a Memory Dis-               model size, and memory design, offering action-
tillation policy to filter memories retrieved via            able insights for building the next generation of

                                                         2
memory-aware, reasoning-capable LLM agents.                 2024) optimizes agents to select better reasoning
                                                            paths. These approaches demonstrate that RL can
2     Related Work                                          improve complex behavior sequences in LLMs.
                                                            However, memory management and utilization in
2.1    Memory Augmented LLM-based Agents
                                                            LLMs remain underexplored in the RL setting. Ex-
LLMs have emerged as powerful general-purpose               isting memory-augmented LLM systems (Chhikara
reasoners, capable of engaging in multi-turn dia-           et al., 2025; Packer et al., 2023) typically rely on
logues, decomposing tasks into actionable steps,            heuristics to control memory operations, lacking
and leveraging prior context to guide decision mak-         adaptability and long-term optimization. Our work,
ing (Brown et al., 2020; Chowdhery et al., 2022;            Memory-R1, is among the first to frame memory
OpenAI et al., 2024). However, their reliance on            operation selection, and the utilization of relevant
fixed-length context windows limits their ability           memories as an RL problem.
to retain information over extended interactions.
To overcome this, recent work augments LLM                  3     Method
agents with external memory modules, enabling
long-horizon reasoning and persistent knowledge             We present Memory-R1, a reinforcement learn-
accumulation through selective storage, retrieval,          ing framework for multi-session dialogue tasks,
and updating of information. Several approaches             where each dialogue contains multiple sessions
illustrate this trend. LoCoMo (Maharana et al.,             (separate interactions occurring at different times)
2024) introduces a benchmark to evaluate agents’            and each session consists of several turns (a back-
ability to retrieve and reason over temporally dis-         and-forth exchange between two users). Answer-
tant conversational history. ReadAgent (Lee et al.,         ing a question always requires synthesizing infor-
2024) proposes a human-inspired reading agent               mation spread across sessions, posing a strong
that uses gist-based memory for reasoning over              challenge for long-horizon memory management
very long contexts. MemoryBank (Zhong et al.,               and reasoning. Figure 2 illustrates the overall
2024) proposes a compositional memory controller            pipeline. At each dialogue turn, the LLM extracts
for lifelong agent memory. MemGPT (Packer et al.,           and summarizes information worth remembering,
2023) introduces working and long-term buffers              then retrieves related entries from the memory bank
with scheduling policies. For a broader perspective,        as part of the Retrieval-Augmented Generation
we refer readers to the recent survey on memory             (RAG) framework. The Memory Manager decides
systems in AI agents (Du et al., 2025). While most          whether to ADD, UPDATE, DELETE, or NOOP, thereby
existing approaches rely on static memory designs,          maintaining and evolving the memory state. For
our work instead develops a learnable memory sys-           question answering, the Answer Agent applies a
tem trained with reinforcement learning.                    memory distillation policy over retrieved memo-
                                                            ries to filter noise and reason over the most relevant
2.2    LLM and Reinforcement Learning                       content. Both agents are fine-tuned with PPO or
The intersection of LLM and RL has received in-             GRPO, enabling outcome-driven learning of mem-
creasing attention as researchers seek to move be-          ory operations and selective utilization. Further
yond static supervised fine-tuning and enable mod-          implementation details, such as model hyperparam-
els to learn from dynamic, interactive feedback.            eters, optimization schedule, and training setup, are
Reinforcement Learning from Human Feedback                  provided in Appendix D.
(RLHF) (Ouyang et al., 2022) is a foundational
                                                            3.1   RL Fine-tuning for Memory Manager
method used to align LLM outputs with human
preferences. Recent works extend RL to more                 Task Formulation The Memory Manager main-
structured decision-making tasks for LLMs. For in-          tains the memory bank by selecting one of ADD,
stance, Toolformer (Schick et al., 2023) and ReAct-         UPDATE, DELETE, NOOP for each new piece of infor-
style agents (Yao et al., 2023) frame tool use as           mation extracted from a dialogue, outputting both
an RL problem, where the LLM learns when to                 the operation and updated content m′ . Training
query external tools or APIs. Search-R1 (Jin et al.,        uses (i) a partially constructed memory bank and
2025) trains LLMs to issue web search queries               (ii) a new dialogue turn with information relevant
using RL to maximize final answer correctness.              to downstream QA. The goal is to learn which op-
Similarly, the Trial and Error approach (Song et al.,       eration produces a memory state that enables the

                                                        3
Figure 2: Overview of the Memory-R1 framework. Stage 1 (blue) constructs and updates the memory bank via the
RL-fine-tuned Memory Manager, which chooses operations {ADD, UPDATE, DELETE, NOOP} for each new
dialogue turn. Stage 2 (green) answers user questions via the Answer Agent, which applies a Memory Distillation
policy to reason over retrieved memories.


Answer Agent to answer correctly. Formally, the             avoids an explicit value function while maintaining
Memory Manager is modeled as a policy πθ that               PPO-style stability. For a state s = (x, Mold ), the
takes extracted information x and retrieved memo-           GRPO objective is:
ries Mold as input, and outputs an operation o with
content m′ :                                                              "   G
                                                                                                                 #
                                                                          1 X (i)
                                                              J (θ) = E          ρθ Ai − β DKL [πθ ∥ πref ] ,
            (o, m′ ) ∼ πθ(· | x, Mold ),          (1)                     G
                                                                             i=1
                                                                                                                   (3)
where x is the new information and Mold the cur-
                                                            where each candidate i yields reward ri , Ai =
rent memory bank. The data construction details             ri −mean(r)
                                                                std(r)  , r = {r1 , . . . , rG }, is its standardized
are provided in Appendix B.2.
                                                                                                (i)
                                                            group-relative advantage, and ρθ is the per-action
PPO for Memory Manager We fine-tune the
                                                            importance ratio. The KL term regularizes updates
Memory Manager with Proximal Policy Optimiza-
                                                            to prevent policy drift away from the reference πref .
tion (PPO; Schulman et al., 2017). Given candidate
memory x and memory bank Mold , the manager                 Reward Design for Memory Manager We use
samples an operation o and updated content m′               an outcome-driven reward: the Memory Manager’s
from policy πθ , applies it to the memory bank, and         operations are judged by their effect on downstream
forwards the result to the frozen Answer Agent. An-         QA. After applying operation o with proposed con-
swer correctness provides a scalar reward r, from           tent m′ , the updated memory bank is passed to the
which we estimate an advantage A. The clipped               frozen Answer Agent, and the reward is based on
PPO objective is:                                           answer correctness:

                                                                     Ranswer = EM(ypred , ygold )              (4)
J (θ) = E min ρθ A, clip(ρθ , 1 − ϵ, 1 + ϵ)A ,
                                                  (2)       where ypred is the predicted answer and ygold the
               πθ (o,m′ |x,Mold )                           ground truth. This exact-match signal requires no
where ρθ = πold (o,m′ |x,Mold ) is the importance ra-
tio, A is the advantage estimated from the answer-          manual labels, remains scalable, and is sufficient
based reward r, and ϵ is the clipping threshold for         to teach effective memory operations.
stable updates.                                             3.2   RL Fine-Tuning for Answer Agent
GRPO for Memory Manager We also train the                   Task Formulation The Answer Agent leverages
Memory Manager with Group Relative Policy Opti-             the memory bank maintained by the Memory Man-
mization (GRPO; Shao et al., 2024), which samples           ager to answer questions in multi-session dia-
a group of G candidate actions per state and com-           logues. Following (Chhikara et al., 2025), 60 can-
putes their relative advantages. This formulation           didate memories are retrieved for each question

                                                        4
via similarity-based RAG, and the agent performs             els are trained only on LoCoMo and evaluated zero-
memory distillation to select the most relevant en-          shot on MSC and LongMemEval. We use LLaMA-
tries before generating an answer.                           3.1-8B-Instruct and Qwen-2.5 Instruct backbones
   We model the agent as a policy πθ mapping the             (3B, 7B, 14B). Dataset construction details are pro-
question q and retrieved set Mret to an answer y:            vided in Appendix B.

               y ∼ πθ (· | q, Mret ).              (5)       Evaluation Metrics We evaluate performance
                                                             using three metrics: token-level F1 (F1), BLEU-1
PPO for Answer Agent We fine-tune the An-                    (B1), and LLM-as-a-Judge (J). F1 and B1 measure
swer Agent using the same PPO algorithm as in                lexical overlap with ground-truth answers, while
Section 3.1. The agent takes the question q and              J uses a separate LLM to assess semantic correct-
retrieved memories Mret and generates an answer              ness, relevance, completeness, and contextual ap-
y. The objective mirrors Equation (2), applied to            propriateness. Implementation details for LLM-as-
the generated sequence. The importance ratio is:             a-Judge are provided in Appendix C.

                           πθ (y | q, Mret )                 Baselines To evaluate the effectiveness of
         ρθ (q, Mret ) =                       ,   (6)       M EMORY -R1, we compare it against several estab-
                           πold (y | q, Mret )
                                                             lished baselines for multi-session dialogue reason-
where y is the generated answer. Advantages derive           ing: (1) LoCoMo (Maharana et al., 2024), a RAG-
from final answer quality (e.g., exact match), and           style framework that converts entire dialogues into
clipping ensures stable updates.                             chunks and retrieves relevant segments for answer-
                                                             ing questions, serving as the benchmark baseline
GRPO for Answer Agent We also fine-tune the                  for long-range, multi-session conversation reason-
Answer Agent with GRPO, following the formu-                 ing; (2) A-Mem (Xu et al., 2025), a dynamic agen-
lation in Section 3.1. For each (q, Mret ), the pol-         tic memory system that creates, links, and updates
icy samples G candidate answers {yi }G   i=1 . Their         structured memories to enhance reasoning across
exact-match rewards against ygt are normalized into          sessions; (3) Mem0 (Chhikara et al., 2025), a mod-
group-relative advantages. GRPO uses the same                ular memory system with explicit in context mem-
importance ratio as PPO, computed per candidate,             ory operations designed for scalable deployment;
and stabilizes training without a value function by          (4) MemoryOS (Kang et al., 2025), a system-level
comparing candidates within each group.                      framework that treats memory as an operating sys-
Reward Design for Answer Agent We use the                    tem abstraction for LLMs, providing unified mech-
Exact Match (EM) score between the generated                 anisms for memory read, write, and management
answer ypred and ground truth ygold as the reward.           across sessions to support long-horizon reasoning;
This design directly ties the reward to the correct-         (5) Memory-SFT. To isolate the effect of RL, we
ness of the final answer, encouraging the agent              implement a supervised fine-tuning variant of our
to select and reason over memories in a way that             framework. Memory-SFT uses the same architec-
yields accurate outputs rather than optimizing for           ture and training data as Memory-R1 but replaces
intermediate steps.                                          RL optimization with behavior cloning from GPT-
                                                             5-generated trajectories.
4     Experiments                                               For a fair comparison, we re-implemented all
                                                             baselines using both the LLaMA-3.1-8B-Instruct
4.1    Experimental Setup                                    and Qwen-2.5-7B-Instruct models as backbones,
Dataset and Model We evaluate Memory-R1                      with temperature set to 0 and a maximum token
on three benchmarks: LoCoMo (Maharana et al.,                limit of 2048. This consistent setup ensures repro-
2024), MSC (Packer et al., 2023), and Long-                  ducibility and allows us to assess how each method
MemEval (Wu et al., 2024). LoCoMo contains                   performs across different model architectures.
long multi-session dialogues (about 600 turns, 26k
tokens) with QA pairs covering single-hop, multi-            4.2   Main Results
hop, open-domain, and temporal reasoning. Fol-               Table 1 reports the performance of Memory-R1
lowing prior work (Chhikara et al., 2025), we ex-            across LLaMA-3.1-8B-Instruct and Qwen-2.5-7B-
clude the adversarial subset and use a 1:1:8 train/-         Instruct models on the LoCoMo benchmark, cover-
validation/test split (152/81/1307 questions). Mod-          ing diverse question types including single-hop,

                                                         5
 Model           Method                 Single Hop              Multi-Hop             Open Domain                   Temporal                 Overall
                                  F1↑      B1↑     J↑     F1↑     B1↑     J↑        F1↑   B1↑    J↑         F1↑       B1↑    J↑      F1↑      B1↑       J↑
                 LoCoMo (RAG)     12.25    9.77   13.81   13.69   10.96   20.48    11.59     8.30   15.96   9.38      8.15    4.65   11.41     8.71    13.62
  LLaMA-3.1-8B
                 A-Mem            21.62   16.93   44.76   13.82   11.45   34.93    34.67    29.13   49.38   25.77    22.14   36.43   29.20    24.40    44.76
                 Mem0             27.29   18.63   43.93   18.59   13.86   37.35    34.03    24.77   52.27   26.90    21.06   31.40   30.41    22.22    45.68
                 MemoryOS         31.89   23.05   52.72   13.80   12.78   31.33    40.74    33.67   57.36   28.74    21.44   23.64   35.04    27.99    48.20
    Instruct
                 Memory-SFT       34.64   23.73   56.90   20.80   16.26   37.35    46.47    37.35   63.27   47.18    34.58   54.65   42.81    32.98    58.76
                 Memory-R1-PPO    32.52   24.47   53.56   26.86   23.47   42.17    45.30    39.18   64.10   41.57    26.11   47.67   41.05    32.91    57.54
                 Memory-R1-GRPO   35.73   27.70   59.83   35.65   30.77   53.01    47.42    41.24   68.78   49.86    38.27   51.55   45.02    37.51    62.74
                 LoCoMo (RAG)      9.57    7.00   15.06   11.84   10.02   19.28    8.67      6.52   12.79   8.35      8.74    5.43   8.97      7.27    12.17
  Qwen-2.5-7B    A-Mem            18.96   12.86   40.78   14.73   12.66   31.32    30.58    26.14   46.90   23.67    20.67   28.68   26.08    21.78    40.78
                 Mem0             24.96   18.05   61.92   20.31   15.82   48.19    32.74    25.27   65.20   33.16    26.28   38.76   30.61    23.55    53.30
                 MemoryOS         29.55   22.59   48.12   21.03   18.41   38.55    40.85    36.26   63.14   26.26    19.70   24.81   34.64    29.36    51.26
   Instruct      Memory-SFT       27.81   20.25   57.74   24.62   22.28   46.99    43.33    34.06   66.85   44.41    34.32   52.71   39.51    30.84    61.13
                 Memory-R1-PPO    34.22   23.61   57.74   32.87   29.48   53.01    44.78    38.72   66.99   42.88    30.30   42.25   41.72    33.70    59.53
                 Memory-R1-GRPO   33.64   26.06   62.34   23.55   20.71   40.96    46.86    40.92   67.81   47.75    38.49   49.61   43.14    36.44    61.51


Table 1: Evaluation results of Memory-R1 and baselines across LLaMA-3.1-8B-Instruct and Qwen-2.5-7B-Instruct
on the LoCoMo benchmark dataset. Models are evaluated on F1, BLEU-1 (B1), and LLM-as-a-Judge (J) across
Single Hop, Multi-Hop, Open Domain, and Temporal questions. Higher values indicate better performance. The
best results are marked in bold.




Figure 3: Scalability of Memory-R1 across model sizes (Qwen-2.5-3B, 7B, 14B-Instruct). Both PPO- and GRPO-
tuned variants consistently outperform the base models across F1, BLEU-1 (B1), and LLM-as-a-Judge (J) metrics,
showing strong scaling behavior.


                                                                                  the strongest overall performance, improving F1
                                                                                  by 28.5%, B1 by 34.0%, and J by 30.2% rel-
                                                                                  atively over the strongest baseline MemoryOS.
                                                                                  Similarly, Memory-R1-PPO also yields substan-
                                                                                  tial improvements, raising overall F1, B1, and J
                                                                                  scores by 17.2%, 17.6%, and 19.4%, respectively.
                                                                                  When applied to Qwen-2.5-7B-Instruct, Memory-
                                                                                  R1-GRPO again emerges as the top performer, sur-
Figure 4: Generalization analysis of Memory-R1 across
                                                                                  passing MemoryOS by margins of 24.5% (F1),
three benchmarks (LoCoMo, MSC, and LongMemEval),                                  24.1% (B1), and 20.0% (J). PPO remains competi-
using LLaMA-3.1-8B-Instruct (left) and Qwen-2.5-7B-                               tive, delivering strong gains over all non-RL base-
Instruct (right) as backbones.                                                    lines. Notably, while Memory-SFT benefits from
                                                                                  guidance by a powerful teacher model (GPT-5), our
                                                                                  reinforcement learning approach still outperforms
multi-hop, open-domain, and temporal reason-                                      it, highlighting the effectiveness of outcome-driven
ing. We evaluate two variants of Memory-R1,                                       optimization over purely supervised imitation.
one fine-tuned with PPO and another with GRPO,
and benchmark them against leading memory-                                        4.3      Generalization and Scalability
augmented baselines, including LoCoMo (RAG),                                      We further investigate the robustness of Memory-
A-Mem, Mem0, MemoryOS and Memory-SFT.                                             R1 across model scales and datasets. Figure 3
   Across both model families, Memory-R1 consis-                                  shows results on the Qwen-2.5 family (3B, 7B,
tently achieves new state-of-the-art performance.                                 14B). Memory-R1 consistently outperforms the
On LLaMA-3.1-8B, Memory-R1-GRPO delivers                                          base model at every scale, with PPO and GRPO

                                                                           6
Figure 5: Ablation analysis of Memory-R1. Each subfigure shows the effect of removing one component: (a)
Memory Manager, (b) Answer Agent, (c) Memory Distillation, and (d) the full pipeline. Performance drops in all
ablations, demonstrating that each component contributes to the final results. Grey dashed lines indicate the baseline
pipeline without RL fine-tuning.


delivering clear gains in F1, BLEU-1, and J                   ing scores decrease to 37.5, 30.6, and 52.9. These
scores. These improvements persist as models                  results confirm that outcome-driven RL enables
scale, demonstrating that reinforcement learning              more effective memory operations than scripted
remains effective in teaching LLMs memory man-                control.
agement regardless of backbone capacity.
   To evaluate cross-task generalization, we apply            Effect of Answer Agent Figure 5 (b,d) shows
the pipeline fine-tuned only on LoCoMo directly               that RL fine-tuning the Answer Agent substantially
to two additional benchmarks: MSC and Long-                   improves answer quality. Without the Memory-R1
MemEval. As shown in Figure 4, Memory-R1                      Answer Agent, PPO achieves F1, BLEU-1, and J
with both PPO and GRPO continues to achieve                   scores of 32.5, 24.6, and 59.4, while GRPO reaches
consistent improvements across all three datasets             33.0, 24.9, and 59.9. With the full pipeline, PPO
and metrics, despite never being trained on MSC               improves to 41.0, 32.9, and 57.5, and GRPO fur-
or LongMemEval. This zero-shot transfer high-                 ther increases performance to 45.0, 37.5, and 62.7.
lights the robustness of Memory-R1 and shows its              This demonstrates that reward-driven fine-tuning
ability to generalize beyond its training distribu-           enhances answer quality beyond static retrieval. A
tion. The gains extend across single-hop, multi-              case study is provided in Appendix A.2.
hop, open-domain, and temporal questions, demon-
                                                              Effect of Memory Distillation We evaluate
strating Memory-R1 as a generalizable framework
                                                              memory distillation by comparing Answer Agents
for adaptive, memory-augmented LLMs capable
                                                              trained with and without distillation (Figure 5 (c,d)).
of long-horizon reasoning. Detailed results on Lo-
                                                              With distillation enabled, PPO improves from 39.3,
CoMo, MSC, and LongMemEval, with type-level
                                                              30.9, and 57.4 to 41.0, 32.9, and 57.5 on F1, BLEU-
breakdowns, are provided in Appendix F.
                                                              1, and J, respectively. GRPO shows larger gains,
4.4   Ablation Studies                                        increasing from 41.0, 34.4, and 60.1 to 45.0, 37.5,
                                                              and 62.7. These results indicate that filtering irrele-
We conduct ablation studies to assess the contribu-           vant memories reduces noise and improves reason-
tion of each component in Memory-R1, isolating                ing.
the effects of the Memory Manager, the Answer
Agent, and the Memory Distillation mechanism.                 RL-Fine-Tuned Answer Agent Gains More with
We also compare the training dynamics of PPO and              Stronger Memory Manager We test whether
GRPO.                                                         Answer Agent gains depend on Memory Manager
                                                              quality. Figure 6 compares PPO/GRPO agents with
Effect of Memory Manager We compare the                       a LLaMA-3.1-8B manager versus a stronger GPT-
full Memory-R1 pipeline with an ablated variant               4o-mini manager. Improvements are larger with the
without RL fine-tuning of the Memory Manager,                 stronger manager (F1: +10.10 vs. +19.72; BLEU-1:
both using LLaMA-3.1-8B-Instruct. As shown in                 +10.81 vs. +18.19; J: +5.05 vs. +15.76), showing
Figure 5 (a,d), removing the RL-fine-tuned Mem-               that Memory-R1 compounds benefits and the An-
ory Manager consistently degrades performance.                swer Agent scales with memory quality.
Under PPO, F1, BLEU-1, and LLM-as-a-Judge
drop from 41.0, 32.9, and 57.5 to 34.5, 28.1, and             Comparison of RL Policies We compare PPO
49.0, respectively. Under GRPO, the correspond-               and GRPO for training the Answer Agent, using

                                                          7
                                                            Figure 7: Training reward curves for PPO and GRPO
                                                            on the Answer Agent using exact match as the reward.
                                                            GRPO converges faster initially, and both reach similar
Figure 6: Performance gains of Answer Agent increase        final rewards.
when paired with stronger Memory Managers, showing
compounding benefits from higher memory quality.


  Method                        F1↑     B1↑      J↑
  PPO (J-based reward model)    33.69   23.36   63.58
  PPO (EM-based reward model)   41.05   32.91   57.54

Table 2: Reward Design Choice Comparison. PPO with
J-based reward achieves higher J scores but lower F1        Figure 8: Accuracy and latency comparison across dif-
and B1 due to verbose outputs, while the EM-based           ferent inference pipelines: Base, Base + Reranker, and
reward yields balanced performance across metrics.          Memory-R1 (GRPO).


                                                            Comparison of Learned Memory Distillation
exact match against ground-truth answers as the
                                                            and Reranking We compare learned memory
reward signal. As shown in Figure 7, GRPO ex-
                                                            distillation in Memory-R1 with reranker-based
hibits faster initial convergence, likely due to its
                                                            pipelines in terms of accuracy and inference latency
grouped return normalization providing stronger
                                                            across three settings: Base, Base + Reranker, and
early guidance. However, as training progresses,
                                                            Memory-R1 with a GRPO-trained Answer Agent
both methods steadily improve and ultimately reach
                                                            (Figure 8). While reranking provides modest accu-
comparable final reward levels.
                                                            racy gains, it incurs substantial latency overhead.
                                                            In contrast, Memory-R1 achieves higher accuracy
Reward Design Analysis We experimented with                 with lower median and tail latency, demonstrating
different reward models for fine-tuning the Answer          a more favorable accuracy–latency trade-off. Addi-
Agent. As shown in Table 2, using the LLM-                  tional analyses are provided in Appendix G.
as-a-Judge value as reward leads to the highest
J score (63.58), but performs poorly on F1 and              5   Conclusion
BLEU-1. This is because the reward encourages
longer, descriptive answers, which misaligns with           We presented Memory-R1, a reinforcement learn-
string-overlap metrics. For example, when asked             ing framework that enables LLM-based agents
“Did John and James study together?”, the EM-               to effectively manage and utilize external mem-
based model outputs “Yes”, while the LLM-as-a-              ory. Unlike heuristic pipelines, Memory-R1 learns
Judge–based model produces “Yes, John and James             memory operations as well as memory distillation
studied together, as they were part of the same on-         and usage for answering. With only 152 training
line programming group, as implied by the memo-             examples, it achieves state-of-the-art results on Lo-
ries above.” Although both are semantically correct,        CoMo, scales across model sizes, and generalizes
the latter is penalized under F1 and BLEU-1. This           to MSC and LongMemEval without retraining. Ab-
makes direct comparison with baselines difficult,           lation studies confirm that reinforcement learning
since responses are no longer length-controlled.            improves every component of the system. Over-
To avoid bias from relying on a single metric, we           all, Memory-R1 highlights reinforcement learning
adopt the EM reward, which yields balanced im-              as a promising direction for adaptive and agentic
provements across all three metrics.                        memory in LLMs.

                                                        8
Limitations                                                   window of large language models via semantic com-
                                                              pression. Preprint, arXiv:2312.09571.
Our evaluation focuses on dialogue-centric datasets.
While these benchmarks cover a wide range of rea-           Lyle Goodyear, Rachel Guo, and Ramesh Johari. 2025.
soning types, extending Memory-R1 to multimodal               The effect of state representation on llm agent be-
                                                              havior in dynamic routing games. arXiv preprint
data may introduce challenges beyond the scope of             arXiv:2506.15624.
this work. Additionally, we train the Memory Man-
ager and Answer Agent separately to ensure stabil-          Bowen Jin, Hansi Zeng, Zhenrui Yue, Jinsung Yoon,
ity under sparse rewards. This separation is nec-             Sercan Arik, Dong Wang, Hamed Zamani, and Jiawei
essary but makes the process less straightforward.            Han. 2025. Search-r1: Training llms to reason and
                                                              leverage search engines with reinforcement learning.
An end-to-end multi-agent reinforcement learning              arXiv preprint arXiv:2503.09516.
approach could simplify training and enable richer
coordination, which we view as a promising direc-           Jiazheng Kang, Mingming Ji, Zhe Zhao, and Ting
tion for future work.                                          Bai. 2025. Memory os of ai agent. arXiv preprint
                                                               arXiv:2506.06326.

                                                            Kuang-Huei Lee, Xinyun Chen, Hiroki Furuta, John
References                                                    Canny, and Ian Fischer. 2024. A human-inspired
AIOS Foundation. 2024. Aios agent sdk: Memory api.            reading agent with gist memory of very long contexts.
  https://docs.aios.foundation/aios-docs/                     arXiv preprint arXiv:2402.09727.
  aios-agent-sdk/memory-api. Accessed: 2025-
  08-29.                                                    Nelson F. Liu, Kevin Lin, John Hewitt, Ashwin Paran-
                                                              jape, Michele Bevilacqua, Fabio Petroni, and Percy
Tom B. Brown, Benjamin Mann, Nick Ryder, Melanie              Liang. 2023. Lost in the middle: How language mod-
  Subbiah, Jared Kaplan, Prafulla Dhariwal, Arvind            els use long contexts. Preprint, arXiv:2307.03172.
  Neelakantan, Pranav Shyam, Girish Sastry, Amanda
  Askell, Sandhini Agarwal, Ariel Herbert-Voss,             Adyasha Maharana, Dong-Ho Lee, Sergey Tulyakov,
  Gretchen Krueger, Tom Henighan, Rewon Child,                Mohit Bansal, Francesco Barbieri, and Yuwei
  Aditya Ramesh, Daniel M. Ziegler, Jeffrey Wu,               Fang. 2024. Evaluating very long-term conver-
  Clemens Winter, and 12 others. 2020.        Lan-            sational memory of llm agents. arXiv preprint
  guage models are few-shot learners. Preprint,               arXiv:2402.17753.
  arXiv:2005.14165.
                                                            James Martin. 1983. Managing the Data-base Environ-
Prateek Chhikara, Dev Khant, Saket Aryan, Taranjeet           ment. Prentice-Hall, Englewood Cliffs, New Jersey.
  Singh, and Deshraj Yadav. 2025. Mem0: Building
  production-ready ai agents with scalable long-term        Ali Modarressi, Abdullatif Köksal, Ayyoob Imani,
  memory. arXiv preprint arXiv:2504.19413.                    Mohsen Fayyaz, and Hinrich Schütze. 2024. Mem-
                                                              llm: Finetuning llms to use an explicit read-write
Aakanksha Chowdhery, Sharan Narang, Jacob Devlin,             memory. arXiv preprint arXiv:2404.11672.
  Maarten Bosma, Gaurav Mishra, Adam Roberts,
  Paul Barham, Hyung Won Chung, Charles Sutton,
                                                            OpenAI, Josh Achiam, Steven Adler, Sandhini Agarwal,
  Sebastian Gehrmann, Parker Schuh, Kensen Shi,
                                                              Lama Ahmad, Ilge Akkaya, Florencia Leoni Ale-
  Sasha Tsvyashchenko, Joshua Maynez, Abhishek
                                                              man, Diogo Almeida, Janko Altenschmidt, Sam Alt-
  Rao, Parker Barnes, Yi Tay, Noam Shazeer, Vin-
                                                              man, Shyamal Anadkat, Red Avila, Igor Babuschkin,
  odkumar Prabhakaran, and 48 others. 2022. Palm:
                                                              Suchir Balaji, Valerie Balcom, Paul Baltescu, Haim-
  Scaling language modeling with pathways. Preprint,
                                                              ing Bao, Mohammad Bavarian, Jeff Belgum, and
  arXiv:2204.02311.
                                                              224 others. 2024. Gpt-4 technical report. Preprint,
Yiming Du, Wenyu Huang, Danna Zheng, Zhaowei                  arXiv:2303.08774.
  Wang, Sebastien Montella, Mirella Lapata, Kam-Fai
  Wong, and Jeff Z. Pan. 2025. Rethinking memory in         Long Ouyang, Jeff Wu, Xu Jiang, Diogo Almeida, Car-
  ai: Taxonomy, operations, topics, and future direc-         roll L. Wainwright, Pamela Mishkin, Chong Zhang,
  tions. Preprint, arXiv:2505.00675.                          Sandhini Agarwal, Katarina Slama, Alex Ray, John
                                                              Schulman, Jacob Hilton, Fraser Kelton, Luke Miller,
Siqi Fan, Xiusheng Huang, Yiqun Yao, Xuezhi Fang,             Maddie Simens, Amanda Askell, Peter Welinder,
  Kang Liu, Peng Han, Shuo Shang, Aixin Sun, and              Paul Christiano, Jan Leike, and Ryan Lowe. 2022.
  Yequan Wang. 2025. If an llm were a character,              Training language models to follow instructions with
  would it know its own story? evaluating lifelong            human feedback. Preprint, arXiv:2203.02155.
  learning in llms. arXiv preprint arXiv:2503.23514.
                                                            Charles Packer, Vivian Fang, Shishir_G Patil, Kevin
Weizhi Fei, Xueyan Niu, Pingyi Zhou, Lu Hou, Bo Bai,          Lin, Sarah Wooders, and Joseph_E Gonzalez. 2023.
  Lei Deng, and Wei Han. 2023. Extending context              Memgpt: Towards llms as operating systems. ArXiv.


                                                        9
Zhuoshi Pan, Qianhui Wu, Huiqiang Jiang, Xufang                Cangqing Wang, Yutian Yang, Ruisi Li, Dan Sun,
  Luo, Hao Cheng, Dongsheng Li, Yuqing Yang, Chin-               Ruicong Cai, Yuzhu Zhang, Chengqian Fu, and Lil-
  Yew Lin, H Vicky Zhao, Lili Qiu, and 1 others.                 lian Floyd. 2024. Adapting llms for efficient con-
  2025. On memory construction and retrieval for                 text processing through soft prompt compression.
  personalized conversational agents. arXiv preprint             Preprint, arXiv:2404.04997.
  arXiv:2502.05589.
                                                               Hongru Wang, Cheng Qian, Wanjun Zhong, Xiusi Chen,
Cheng Qian, Emre Can Acikgoz, Qi He, Hongru Wang,                Jiahao Qiu, Shijue Huang, Bowen Jin, Mengdi Wang,
  Xiusi Chen, Dilek Hakkani-Tür, Gokhan Tur, and                 Kam-Fai Wong, and Heng Ji. 2025. Acting less is
  Heng Ji. 2025. Toolrl: Reward is all tool learning             reasoning more! teaching model to act efficiently.
  needs. Preprint, arXiv:2504.13958.                             Preprint, arXiv:2504.14870.

Qwen, An Yang, Baosong Yang, Beichen Zhang,                    Zhepei Wei, Wenlin Yao, Yao Liu, Weizhi Zhang, Qin
 Binyuan Hui, Bo Zheng, Bowen Yu, Chengyuan                      Lu, Liang Qiu, Changlong Yu, Puyang Xu, Chao
 Li, Dayiheng Liu, Fei Huang, Haoran Wei, Huan                   Zhang, Bing Yin, Hyokun Yun, and Lihong Li.
 Lin, Jian Yang, Jianhong Tu, Jianwei Zhang, Jianxin             2025. Webagent-r1: Training web agents via end-
 Yang, Jiaxi Yang, Jingren Zhou, Junyang Lin, and                to-end multi-turn reinforcement learning. Preprint,
 24 others. 2025. Qwen2.5 technical report. Preprint,            arXiv:2505.16421.
 arXiv:2412.15115.                                             Di Wu, Hongwei Wang, Wenhao Yu, Yuwei Zhang,
                                                                 Kai-Wei Chang, and Dong Yu. 2024. Longmemeval:
Rana Salama, Jason Cai, Michelle Yuan, Anna Currey,              Benchmarking chat assistants on long-term interac-
  Monica Sunkara, Yi Zhang, and Yassine Benajiba.                tive memory. arXiv preprint arXiv:2410.10813.
  2025. Meminsight: Autonomous memory augmenta-
  tion for llm agents. Preprint, arXiv:2503.21760.             Zidi Xiong, Yuping Lin, Wenya Xie, Pengfei He, Jil-
                                                                 iang Tang, Himabindu Lakkaraju, and Zhen Xiang.
Timo Schick, Jane Dwivedi-Yu, Roberto Dessì, Roberta             2025. How memory management impacts llm agents:
  Raileanu, Maria Lomeli, Luke Zettlemoyer, Nicola               An empirical study of experience-following behavior.
  Cancedda, and Thomas Scialom. 2023. Toolformer:                arXiv preprint arXiv:2505.16067.
  Language models can teach themselves to use tools.
  Preprint, arXiv:2302.04761.                                  Jing Xu, Arthur Szlam, and Jason Weston. 2021. Be-
                                                                  yond goldfish memory: Long-term open-domain con-
John Schulman, Filip Wolski, Prafulla Dhariwal,                   versation. arXiv preprint arXiv:2107.07567.
  Alec Radford, and Oleg Klimov. 2017. Proxi-
  mal policy optimization algorithms. arXiv preprint           Wujiang Xu, Kai Mei, Hang Gao, Juntao Tan, Zujie
  arXiv:1707.06347.                                             Liang, and Yongfeng Zhang. 2025. A-mem: Agentic
                                                                memory for llm agents. Preprint, arXiv:2502.12110.
Zhihong Shao, Peiyi Wang, Qihao Zhu, Runxin Xu,
  Junxiao Song, Xiao Bi, Haowei Zhang, Mingchuan               Shunyu Yao, Jeffrey Zhao, Dian Yu, Nan Du, Izhak
  Zhang, YK Li, and 1 others. 2024. Deepseekmath:                Shafran, Karthik Narasimhan, and Yuan Cao. 2023.
  Pushing the limits of mathematical reasoning in open           React: Synergizing reasoning and acting in language
  language models. arXiv preprint arXiv:2402.03300.              models. Preprint, arXiv:2210.03629.
                                                               Lingfan Yu, Jinkun Lin, and Jinyang Li. 2025. Stateful
Guangming Sheng, Chi Zhang, Zilingfeng Ye, Xibin
                                                                 large language model serving with pensieve. In Pro-
  Wu, Wang Zhang, Ru Zhang, Yanghua Peng, Haibin
                                                                 ceedings of the Twentieth European Conference on
  Lin, and Chuan Wu. 2025. Hybridflow: A flexible
                                                                 Computer Systems, pages 144–158.
  and efficient rlhf framework. In Proceedings of the
  Twentieth European Conference on Computer Sys-               Zeyu Zhang, Quanyu Dai, Xiaohe Bo, Chen Ma, Rui Li,
  tems, pages 1279–1297.                                         Xu Chen, Jieming Zhu, Zhenhua Dong, and Ji-Rong
                                                                 Wen. 2024. A survey on the memory mechanism of
Huatong Song, Jinhao Jiang, Yingqian Min, Jie Chen,              large language model based agents. ACM Transac-
  Zhipeng Chen, Wayne Xin Zhao, Lei Fang, and Ji-                tions on Information Systems.
  Rong Wen. 2025. R1-searcher: Incentivizing the
  search capability in llms via reinforcement learning.        Wanjun Zhong, Lianghong Guo, Qiqi Gao, He Ye, and
  arXiv preprint arXiv:2503.05592.                              Yanlin Wang. 2024. Memorybank: Enhancing large
                                                                 language models with long-term memory. Proceed-
Yifan Song, Da Yin, Xiang Yue, Jie Huang, Sujian                 ings of the AAAI Conference on Artificial Intelligence,
  Li, and Bill Yuchen Lin. 2024. Trial and error:                38(17):19724–19731.
  Exploration-based trajectory optimization for llm
  agents. Preprint, arXiv:2403.02502.

Volker Tresp, Sahand Sharifzadeh, Hang Li, Dario
  Konopatzki, and Yunpu Ma. 2023. The tensor brain:
  A unified theory of perception, memory, and seman-
  tic decoding. Neural Computation, 35(2):156–227.


                                                          10
A   Case Study of Behavior of Agents                        “adopted a dog named Buddy” and “adopted an-
    before and after Fine-tuning                            other dog named Scout”, and assumed that the
                                                            differing dog names implied the new statement
A.1 From In-context Memory Manager to RL
                                                            replaced the old one. As a result, it deleted the first
    fine-tuned Memory Manager
                                                            dog (“Buddy”) and added the second (“Scout”),
To demonstrate how RL fine-tuning improves mem-             leaving the memory fragmented and inaccurate. In
ory operations, we present two real representative          contrast, the RL fine-tuned Memory Manager rec-
examples. In the first case, the user initially men-        ognized the events as complementary and consoli-
tions adopting a dog named Buddy, and later states          dated them with a single UPDATE, maintaining a co-
that they have adopted another dog named Scout.             herent memory bank and enabling the system to an-
Dialogue Excerpts:                                          swer correctly. This case illustrates how reinforce-
                                                            ment learning enhances the Agent to understand
    • Audrey: That’s great news!
                                                            the nuance between ADD, UPDATE, and DELETE, al-
    What’s the pup’s name?
                                                            lowing the model to handle overlapping or related
    • Andrew: It took us a while
                                                            information more intelligently.
    to decide, but we ended up
                                                               To further demonstrate how RL fine-tuning im-
    going with ’Scout’ for our pup
                                                            proves memory operations, we present another real-
    - it seemed perfect for their
                                                            world example from a user-agent dialogue involv-
    adventurous spirit.
                                                            ing Joanna’s feelings about pets and her allergies,
Vanilla Memory Manager Actions (failed):                    particularly toward turtles.
                                                            Dialogue Excerpts:
    **Operations Issued:**
    • DELETE: "Andrew adopted a new                              • Joanna:     I wish I wasn’t
    dog from a shelter and named him                             allergic! I would get two turtles
    Buddy because he is his buddy."                              today if I could!        I found
    • DELETE: "Andrew enjoys taking                              out recently I’m allergic to
    walks with his newly adopted                                 cockroaches as well, so who knows
    dog, Buddy, as a way to spend                                if I’ll ever get a pet. • Nate:
    quality time together and get                                Sorry!   Maybe there are other
    fresh air."                                                  animals you could consider! In
    • ADD: "Andrew adopted a new                                 the meantime though, I’ll be sure
    dog and named the pup ’Scout’                                to send you pics of my turtles
    because the name seemed perfect                              so you can still watch them grow
    for their adventurous spirit."                               without getting too close.

                                                            Vanilla Memory Manager Actions (failed):
Memory-R1 Memory Manager Actions (success-                       **Operations Issued:**
ful):                                                            • DELETE: "Joanna is allergic to
    **Operations Issued:**                                       most reptiles and animals with
    • UPDATE: "Andrew adopted a new                              fur, which causes her face to get
    dog from a shelter and named him                             puffy and itchy. Despite this,
    Buddy because he is his buddy."                              she finds other ways to be happy."
    -> "Andrew adopted a dog from                                • DELETE: "Joanna finds turtles
    a shelter and named him Buddy                                peaceful and believes they bring
    because he is his buddy, and                                 calm and joy."
    later adopted another dog named                              • DELETE: "Joanna thinks having
    Scout."                                                      pets   must    be   a    wonderful
                                                                 experience."
                                                                 • ADD: "Joanna is allergic to
Discussion: The vanilla LLM-based memory man-                    turtles and cockroaches, which
ager misinterpreted the second adoption as a con-                affects her ability to have
tradiction because it saw two separate statements:               pets."

                                                       11
Memory-R1 Memory Manager Actions (success-                    A.2    From Vanilla LLM to Memory-Distilled
ful):                                                                RL Answer Agent
                                                              To illustrate how RL fine-tuned Answer Agent with
                                                              Memory Distillation improves answer accuracy, we
     **Operations Issued:**                                   compare the original model’s output with the RL
     • UPDATE: "Joanna is allergic to                         fine-tuned model on a representative example from
     most reptiles and animals with                           LoCoMo. The prompt provided to the model is
     fur, which causes her face to                            shown in Figure 11.
     get puffy and itchy.      Despite
                                                              Question: Does John live close to a beach or the
     this, she finds other ways to be
                                                              mountains?
     happy." -> "Joanna is allergic to
                                                              Original Model Output (Before Fine-Tuning):
     most reptiles, including turtles
     and cockroaches, and animals with                              **Answer:**       He     lives      near
     fur, which causes her face to get                              mountains.
     puffy and itchy. Additionally,
     she is also allergic to turtles                          Memory-R1 Output (After RL Fine-Tuning
     and cockroaches, which affects                           with Memory Distillation):
     her ability to have pets."
     • UPDATE: "Joanna finds turtles                                **Memories      selected      as
     peaceful and believes they bring                               relevant:**
     calm and joy." -> "Joanna finds                                • 8:30 pm on 1 January, 2023:
     turtles peaceful and believes                                  John has a nostalgic memory of
     they bring calm and joy, but she                               having a film camera as a kid
     is allergic to them."                                          and taking many pictures at the
                                                                    beach.
                                                                    • 1:24 pm on 25 May, 2023:
Discussion: The vanilla Memory Manager misin-                       John shared a picture of his
terpreted the new allergy information in two as-                    family at the beach, expressing
pects. First, it viewed the difference between “al-                 a sense of making a difference
lergic to most reptiles and animals with fur” and                   and commitment to continue their
“allergic to turtles and cockroaches” as a contradic-               efforts.
tion in allergy type—failing to recognize the latter                **Answer:** beach
as a more specific elaboration rather than a con-
flicting statement. Second, it interpreted Joanna’s           Discussion: The original model consumed all re-
expressed fondness for turtles as incompatible with           trieved memories indiscriminately and defaulted to
her allergy to them, incorrectly assuming that emo-           “mountains,” likely influenced by irrelevant men-
tional attachment and physical limitations cannot             tions of mountaineering. In contrast, Memory-R1
coexist. As a result, it issued a series of DELETE op-        filtered out distractors, surfaced only beach-related
erations followed by a single ADD, discarding valu-           memories, and generated the correct answer. This
able emotional context such as Joanna’s admiration            case highlights how Memory Distillation helps the
for turtles and her general enthusiasm toward pets.           model discard noise, focus on true signals, and
In contrast, the RL fine-tuned Memory Manager                 improve factual accuracy.
recognized that these pieces of information were
complementary: Joanna likes turtles but cannot                B     Dataset Details
keep them due to her allergies. It updated the rele-
vant memories accordingly using targeted UPDATE               B.1    Test Data
operations, preserving both factual accuracy and              LoCoMo. LoCoMo (Maharana et al., 2024) is a
emotional nuance. This case demonstrates how re-              benchmark of long-term multi-session dialogues,
inforcement learning equips the model to reason               with conversations averaging 300 turns and 9k to-
about overlapping and evolving information more               kens, spanning up to 35 sessions. It serves as our
intelligently, favoring memory consolidation over             primary experimental dataset, on which we conduct
fragmentation.                                                and report detailed results.

                                                         12
MSC. We further evaluate on the Multi-Session               Algorithm 1 Data Construction for Memory-R1
Chat (MSC) dataset (Xu et al., 2021), which con-            Training
tains open-domain dialogues spanning multiple ses-           1: Input: LoCoMo multi-turn dialogues D
sions. Following MemGPT (Packer et al., 2023),               2: Output:                  Training          tuples
we use a modified version of MSC tailored to the                for        the        Memory            Manager
memory-augmented evaluation setting, where ques-                (dialogue turn, temporal memory bank, QA)
tions depend on information distributed across ear-          3: for each dialogue d ∈ D do
lier sessions. This dataset tests whether models can         4:     for each turn t in d do
maintain continuity across temporally separated              5:         Build a temporal memory bank using
interactions.                                                   the previous 50 turns with GPT-4o-mini
LongMemEval We also evaluate on Long-                        6:         Combine (i) the temporal memory
MemEval (Wu et al., 2024), a benchmark designed                 bank, (ii) the current turn t, and (iii) any QA
to test long-term memory capabilities of LLMs. It               pairs linked to t
covers diverse tasks including factual recall, tem-          7:         Store the combined package as a single
poral reasoning, and entity tracking, with questions            training tuple
requiring integration of information from long and           8:     end for
                                                             9: end for
sparse contexts. LongMemEval complements Lo-
CoMo and MSC by emphasizing broader general-
ization beyond dialogue-centric settings.                   to distill the relevant entries and generate concise,
                                                            correct responses.
B.2   Training Data
                                                            C     Prompts
We construct separate training datasets for the Mem-
ory Manager and the Answer Agent from the Lo-               In developing our Memory Manager Prompt, an-
CoMo multi-turn dialogues. The LoCoMo dataset               swer generation agent prompt, and LLM-as-a-
is publicly released under the CC BY-NC 4.0 li-             Judge prompt, we adapt elements from the prompt
cense. We slightly modify it for dialogue segmen-           released by prior work (Packer et al., 2023;
tation to fit our reinforcement learning pipeline,          Chhikara et al., 2025)
while preserving its original license terms and
using it solely for non-commercial research pur-            C.1    Memory Manager Prompt
poses. All other datasets used in this paper (MSC           For training the Memory Manager, we use a de-
and LongMemEval) are publicly available research            tailed prompt that instructs the model how to
benchmarks and are used in accordance with their            perform four memory operations: ADD, UPDATE,
respective licenses.                                        DELETE, and NOOP. The full prompt spans multiple
                                                            figures for readability.
Memory Manager Training Data. For each dia-
logue turn t, GPT-4o-mini builds a temporal mem-
ory bank from the preceding 24 turns. The cur-              C.2    Answer Agent Prompt
rent turn t is fused with this snapshot to form the         We provide the full prompt used to instruct the An-
input. Unlike supervised annotation of memory               swer Agent in our case study. This prompt defines
operations, we do not provide explicit labels (ADD,         the reasoning process, memory selection criteria,
UPDATE, DELETE, NOOP). Instead, the Memory Man-             and formatting requirements for the model’s re-
ager is optimized via reinforcement learning, where         sponses. Figure 11 shows the complete instructions,
the correctness of the downstream Answer Agent’s            context, and representative retrieved memories.
answer provides the learning signal. The full pro-
cedure is given in Algorithm 1.                             C.3    LLM-as-a-Judge (J) Prompt
Answer Agent Training Data. For each question               For evaluating the correctness of generated an-
q in LoCoMo, we retrieve 60 candidate memories              swers, we employ an LLM-as-a-Judge prompt.
using retrieval-augmented search (RAG) over the             The judge model is asked to label each answer
temporal memory bank. The retrieved set, paired             as CORRECT or WRONG based on comparison with
with the question and gold answer, serves as the            the gold answer. The complete prompt template is
training input for the Answer Agent, which learns           shown in Figure 12.

                                                       13
Memory Manager Prompt (Part 1): Overview and ADD/UPDATE Instruction

You are a smart memory manager which controls the memory of a system.
You can perform four operations: (1) add into the memory, (2) update the
memory, (3) delete from the memory, and (4) no change.

Based on the above four operations, the memory will change.

Compare newly retrieved facts with the existing memory. For each new fact,
decide whether to:
- ADD: Add it to the memory as a new element
- UPDATE: Update an existing memory element
- DELETE: Delete an existing memory element
- NONE: Make no change (if the fact is already present or irrelevant)

1. **Add**: If the retrieved facts contain new information not present
in the memory, then you have to add it by generating a new ID in the id field.

- Example:
    Old Memory:
        [
            {"id" : "0", "text" : "User is a software engineer"}
        ]
    Retrieved facts: ["Name is John"]

    New Memory:
        {
            "memory" : [
                {"id" : "0", "text" : "User is a software engineer", "event" : "NONE"},
                {"id" : "1", "text" : "Name is John", "event" : "ADD"}
            ]
        }
2. **Update**: If the retrieved facts contain information that is already
present in the memory but the information is totally different, then
you have to update it.

If the retrieved fact contains information that conveys the same thing as
the memory, keep the version with more detail.

Example (a) – if the memory contains "User likes to play cricket" and the
retrieved fact is "Loves to play cricket with friends", then update the
memory with the retrieved fact.

Example (b) – if the memory contains "Likes cheese pizza" and the
retrieved fact is "Loves cheese pizza", then do NOT update it because they
convey the same information.

Important: When updating, keep the same ID and preserve old_memory.

- Example:
    Old Memory:
        [
            {"id" : "0", "text" : "I really like cheese pizza"},
            {"id" : "2", "text" : "User likes to play cricket"}
        ]
    Retrieved facts: ["Loves chicken pizza", "Loves to play cricket with friends"]

    New Memory:
        {
        "memory" : [
            {"id" : "0", "text" : "Loves cheese and chicken pizza", "event" : "UPDATE",
             "old_memory" : "I really like cheese pizza"},
            {"id" : "2", "text" : "Loves to play cricket with friends", "event" : "UPDATE",
             "old_memory" : "User likes to play cricket"}
        ]
        }



Figure 9: Memory Manager Prompt (Part 1): Overview and ADD/UPDATE operation instruction.




                                                       14
       Memory Manager Prompt (Part 2): DELETE/NO_OPERATION Instructions

       3. **Delete**: If the retrieved facts contain information that contradicts
       the memory, delete it. When deleting, return the same IDs — do not generate new IDs.

       - Example:
           Old Memory:
               [
                   {"id" : "1", "text" : "Loves cheese pizza"}
               ]
           Retrieved facts: ["Dislikes cheese pizza"]

           New Memory:
               {
               "memory" : [
                   {"id" : "1", "text" : "Loves cheese pizza", "event" : "DELETE"}
               ]
               }

       4. **No Change**: If the retrieved facts are already present, make no change.

       - Example:
           Old Memory:
               [
                   {"id" : "0", "text" : "Name is John"}
               ]
           Retrieved facts: ["Name is John"]

           New Memory:
               {
               "memory" : [
                   {"id" : "0", "text" : "Name is John", "event" : "NONE"}
               ]
               }



             Figure 10: Memory Manager Prompt (Part 2): DELETE/NO_OPERATION instructions.


Algorithm 2 Data Construction for Answer Agent                    14B, which requires 8 GPUs. The total batch size
Training                                                          is 128 with a micro-batch size of 2 per GPU. The
 1: Input:    LoCoMo multi-turn dialogues D,                      maximum prompt and response lengths are set to
    trained Memory Manager                                        4096 and 2048 tokens, respectively.
 2: Output: Training tuples for the Answer Agent                     Prompts for memory operations and memory-
    (question, retrieved memories, gold answer)                   augmented answer generation are adapted
 3: for each dialogue d ∈ D do                                    from Chhikara et al. (2025). Reinforcement
 4:     Use the Memory Manager to maintain an                     learning fine-tuning is performed using PPO and
    up-to-date memory bank across turns                           GRPO within the VERL framework (Sheng et al.,
 5: end for                                                       2025). For PPO, actor and critic networks are
 6: for each question q in d do                                   jointly trained with learning rates of 1 × 10−6
 7:     Use the question q as a query to retrieve                 and 1 × 10−5 , respectively, using a constant
    the top 30 most relevant candidate memories                   warmup schedule. GRPO updates only the actor
    for each participant from the memory bank                     via grouped return normalization.
 8:     Pair (i) the question q, (ii) the 60 retrieved               During RL training, we use a decoding tempera-
    memories, and (iii) the gold answer agold                     ture of τ = 1.0 to encourage exploration and col-
 9:     Store the triplet as a single training tuple              lect diverse reward signals, which helps stabilize
    for Answer Agent fine-tuning                                  policy learning. For validation and testing, greedy
10: end for                                                       decoding (τ = 0) is applied to ensure deterministic
                                                                  outputs and consistent metric evaluation.

D   Implementation Details                                        E    Alogirthm
We fine-tune M EMORY-R1 on LLaMA-3.1-8B-                          The overall Memory-R1 pipeline contains two com-
Instruct and Qwen-2.5-3B, 7B, and 14B-Instruct                    plementary procedures, outlined in Algorithm 3
models to evaluate robustness across architectures.               and Algorithm 4. Algorithm 3 (Memory Bank Con-
Experiments are primarily conducted on 4 NVIDIA                   struction) governs how the system incrementally
H100 GPUs (80GB each), except for Qwen-2.5-                       builds and refines the external memory bank as

                                                             15
       Full Prompt and Retrieved Memories

       You are an intelligent memory assistant tasked with retrieving
       accurate information from conversation memories.

       # CONTEXT:
       You have access to memories from two speakers in a conversation.
       These memories contain timestamped information that may be relevant
       to answering the question.

       # INSTRUCTIONS:
       1. Carefully analyze all provided memories from both speakers
       2. Pay special attention to the timestamps to determine the answer
       3. If the question asks about a specific event or fact, look for direct evidence
       4. If the memories contain contradictory information, prioritize the most recent memory
       5. If there is a question about time references (like "last year", "two months ago"),
          calculate the actual date based on the memory timestamp.
       6. Always convert relative time references to specific dates, months, or years.
       7. Focus only on the content of the memories. Do not confuse character names
       8. The answer should be less than 5-6 words.
       9. IMPORTANT: Select memories you found that are useful for answering the questions,
       and output it before you answer questions.
       10. IMPORTANT: Output the final answer after **Answer:**

       # APPROACH (Think step by step):
       1. Examine all relevant memories
       2. Examine the timestamps carefully
       3. Look for explicit mentions that answer the question
       4. Convert relative references if needed
       5. Formulate a concise answer
       6. Double-check the answer correctness
       7. Ensure the final answer is specific
       8. First output the memories that you found are important before you answer questions

       Memories for user John:
       - 7:20 pm on 16 June, 2023: John has a special memory of a vacation to California where he experienced a
       gorgeous sunset and an enjoyable night strolling the shore, creating meaningful memories with loved ones.
       - 6:13 pm on 10 April, 2023: John explored the coast in the Pacific Northwest and visited some national
       parks, finding the beauty of nature absolutely breathtaking.
       - 3:14 pm on 13 August, 2023: John enjoys spending time outdoors with his family, including activities
       such as hiking, hanging out at the park, and having picnics. He also values indoor family activities like
       playing board games and having movie nights at home.
       ... (In total 30 most relevant memories from John's Memory Bank are provided) ...

       Memories for user Maria:
       - 6:29 pm on 7 July, 2023: John experienced a severe flood in his old area last week, which caused
       significant damage to homes due to poor infrastructure.
       - 1:24 pm on 25 May, 2023: Maria appreciates the beauty of small, meaningful moments in life, as reflected
       in her reaction to a family beach photo shared by John.
       - 3:14 pm on 13 August, 2023: Maria appreciates family bonding and is interested in the activities that
       John and his family enjoy doing together.
       ... (In total 30 most relevant memories from Maria's Memory Bank are provided) ...

       Question: Does John live close to a beach or the mountains?



     Figure 11: Prompt and retrieved memories used in the case study, showing all instructions, context, and
     memory entries provided to the model.


new dialogue turns arrive. For each dialogue in-                  retrieves the top-k relevant memory candidates,
put, an LLM extracts key information, retrieves                   concatenates them with the question to form a
semantically related entries from the memory bank                 memory-augmented prompt, and applies the An-
via retrieval-augmented generation (RAG), and in-                 swer Agent’s Memory Distillation policy to filter
vokes the RL fine-tuned Memory Manager to clas-                   for the most relevant facts. The distilled memory
sify the update action as one of {ADD, UPDATE,                    context, along with the query, is then passed to
DELETE, NOOP}. Depending on the chosen action,                    the Answer Agent to produce the final response,
the memory store is updated accordingly—either                    which is added to the answer set. Together, these
inserting a new entry, merging information into                   algorithms enable Memory-R1 to jointly manage
an existing one, pruning contradictory content, or                memory and generate memory augmented answers.
leaving the memory unchanged.                                        Training in Memory-R1 is performed in two
   Algorithm 4 (Memory-augmented Answer Gen-                      stages, with the Memory Manager and Answer
eration) describes how the system leverages                       Agent optimized separately. When training the
the constructed memory bank to generate an-                       Memory Manager, the Answer Agent is frozen and
swers. Given an incoming question, the model                      used only to provide outcome-based rewards: the

                                                             16
       LLM-as-a-Judge Prompt Template

       Your task is to label an answer to a question as 'CORRECT' or 'WRONG'.
       You will be given the following data:
           (1) a question (posed by one user to another user),
           (2) a 'gold' (ground truth) answer,
           (3) a generated answer,
       which you will score as CORRECT or WRONG.

       The point of the question is to ask about something one user should know about the other user based on their
       prior conversations.

       The gold answer will usually be a concise and short answer that includes the referenced topic, for example:
       Question: Do you remember what I got the last time I went to Hawaii?
       Gold answer: A shell necklace

       The generated answer might be longer, but you should be generous with your grading — as long as it touches
       on the same topic as the gold answer, it should be counted as CORRECT.

       For time-related questions, the gold answer will be a specific date, month, or year. The generated answer
       might include relative references (e.g., "last Tuesday"), but you should be generous — if it refers to
       the same time period as the gold answer, mark it CORRECT, even if the format differs (e.g., "May 7th" vs.
       "7 May").

       Now it's time for the real question:
       Question: {question}
       Gold answer: {gold_answer}
       Generated answer: {generated_answer}

       First, provide a short (one sentence) explanation of your reasoning, then finish with CORRECT or WRONG.
       Do NOT include both CORRECT and WRONG in your response, or it will break the evaluation script.

       Return the label in JSON format with the key as "label".



     Figure 12: LLM-as-a-Judge prompt used to evaluate model answers. The judge model labels each
     generated answer as CORRECT or WRONG based on comparison with the gold answer, with explicit
     instructions for handling time references and topic matching.


Manager’s operations are reinforced if the resulting              critical. Memory-R1 shows substantial gains on
memory state improves the Answer Agent’s ability                  tasks requiring factual recall (SSU) and temporal
to answer correctly. Conversely, when training the                reasoning (TR), while also yielding steady improve-
Answer Agent, the Memory Manager is fixed to en-                  ments in knowledge update (KU) and open-domain
sure a stable memory input. Algorithm 5 illustrates               QA. Across reasoning types, GRPO generally out-
this process for the Memory Manager, where dia-                   performs PPO, particularly in scenarios involving
logue turns are processed sequentially, candidate                 reasoning over multiple or noisy memory entries.
operations are sampled, the memory bank is up-                       In addition to type-level analysis, Table 5 reports
dated, and policy gradients (via PPO or GRPO) are                 overall performance on the LongMemEval bench-
applied based on downstream answer correctness.                   mark, including all baseline methods as well as
This decoupled setup avoids attribution ambiguity                 Memory-R1 variants. Importantly, Memory-R1 is
while still allowing both components to co-adapt                  fine-tuned only on the LoCoMo dataset and eval-
over alternating training phases.                                 uated on LongMemEval without any additional
                                                                  training. Despite this zero-shot transfer setting,
F   Extended Results and Type-Level                               Memory-R1-GRPO outperforms all baseline sys-
    Analysis                                                      tems across both LLaMA-3.1-8B and Qwen-2.5-7B
                                                                  backbones. Together, these results complement the
Tables 3 and 4 provide detailed type-level evalua-
                                                                  main findings in Section 4, further reinforcing that
tion on the LoCoMo and LongMemEval bench-
                                                                  Memory-R1 generalizes robustly across reasoning
marks. On LoCoMo (Table 3), Memory-R1
                                                                  types, model families, and benchmark tasks.
achieves consistent improvements across all rea-
soning types, with the largest gains on multi-hop                 G    Latency Analysis
and temporal questions, confirming its ability to
maintain and integrate long-range information.                    We provide a detailed latency analysis to better un-
   On LongMemEval (Table 4), improvements are                     derstand the efficiency characteristics of Memory-
most pronounced in multi-session scenarios where                  R1 and its individual components. All latency
continuity across temporally distant interactions is              results are reported using median (p50) and tail

                                                             17
    Model        Method            Single Hop                  Multi-Hop               Open Domain                  Temporal                 Overall
                             F1↑      B1↑     J↑         F1↑     B1↑     J↑          F1↑   B1↑    J↑        F1↑       B1↑    J↑      F1↑      B1↑       J↑
                 BASE       19.82    15.78     46.44    11.57     10.22     24.10   25.37   20.04   45.67   28.94    24.19   29.46   24.18    19.46    41.24
     Qwen
                 PPO        28.60    19.02     50.63    26.57     22.72     40.96   41.06   35.60   58.73   43.92    29.73   50.00   38.42    30.59    54.40
     2.5-3B
                 GRPO       30.10    20.00     49.37    25.29     22.69     44.58   43.01   37.39   65.06   47.69    33.36   50.00   40.45    32.48    57.92
                 BASE       23.61    17.78     60.67    17.86     14.40     43.37   31.39   24.34   65.75   32.66    27.51   40.31   29.36    23.14    58.38
     Qwen
                 PPO        34.92    25.69     59.00    25.30     22.66     42.17   43.51   38.00   65.34   42.52    30.10   41.86   40.59    33.21    58.07
     2.5-7B
                 GRPO       33.98    25.54     58.16    25.50     21.63     46.99   44.72   48.99   64.65   43.54    35.52   39.92   41.31    34.74    57.46
                 BASE       34.60    26.82     55.23    24.24     21.45     38.55   39.79   34.53   56.95   34.98    29.39   33.33   36.91    31.28    50.80
     Qwen-
                 PPO        37.59    31.92     63.18    28.21     24.57     50.60   48.46   42.44   72.76   43.78    34.73   50.78   44.26    37.86    65.26
     2.5-14B
                 GRPO       38.32    30.64     63.18    22.71     20.40     42.17   46.70   41.70   67.13   50.50    36.60   60.47   44.40    37.32    63.50


Table 3: Extended evaluation of Memory-R1 with Qwen-2.5 model family as backbones on the LoCoMo bench-
mark. Results are reported across question types (Single-Hop, Multi-Hop, Open-Domain, Temporal) and overall
performance. Best scores are highlighted in bold.

  Task                                         LLaMA-3.1-8B                                                           Qwen-2.5-7B
                            BASE                   PPO                          GRPO                 BASE                PPO                     GRPO
  SSU (F1/B1/J)          61.9/53.2/80.0        78.9/75.6/87.1             76.0/70.3/87.1       64.4/54.6/90.0         70.8/65.5/80.0         80.9/76.3/91.4
  SSP (F1/B1/J)           7.4/0.1/46.7          9.6/1.6/50.0               11.5/3.8/63.3       13.9/2.5/53.3          14.9/2.2/66.7          12.6/2.0/66.7
  OD (F1/B1/J)           17.9/16.6/19.6        30.6/24.6/33.9             31.2/25.3/33.9       14.1/14.4/16.1         23.5/21.1/19.6         26.8/23.0/26.8
  MS (F1/B1/J)           20.8/19.6/33.1        43.1/43.6/54.1             50.0/48.1/57.9       30.2/26.9/54.9         32.4/35.1/36.1         51.7/48.5/63.2
  KU (F1/B1/J)           36.0/27.9/51.3        46.4/43.1/55.1             38.5/35.5/52.6       40.5/33.5/59.0         52.3/48.2/65.4         54.4/51.3/65.4
  TR (F1/B1/J)           34.0/23.1/42.1        37.0/29.2/49.6             41.5/30.3/45.1       36.5/24.5/44.4         38.1/26.3/38.4         35.1/25.8/41.4
  O (F1/B1/J)            31.3/25.0/44.2        43.6/39.5/55.2             45.2/39.3/55.4       35.5/28.3/53.2         40.3/35.5/47.4         46.7/41.1/57.8

Table 4: Extended evaluation of Memory-R1 on the LongMemEval benchmark using LLaMA and Qwen backbones.
Each cell shows F1/B1/J for a given model-method combination, reported with one decimal precision. Task types
are abbreviated as: SSU = Single-Session-User, SSP = Single-Session-Preference, OD = Open Domain, MS =
Multi-Session, KU = Knowledge Update, TR = Temporal Reasoning, and O = Overall. The best value for each
metric (F1, B1, J) within a task row is highlighted in bold.


 Base Model     Method              Overall F1 ↑   Overall B1 ↑   Overall J ↑
                                                                                     cases, GRPO-trained variants achieve lower tail
                LoCoMo (RAG)           20.55           15.17        21.00
                A-Mem                  38.36           33.30        54.20            latency than both the base model and PPO variants,
                Mem0                   31.41           21.69        41.20
 LLaMA-3.1-8B   Memory-SFT             43.89           36.72        54.80            indicating that reinforcement learning can improve
                Memory-R1-PPO          43.60           39.50        55.20            not only accuracy but also inference efficiency.
                Memory-R1-GRPO         45.20           39.30        55.40
                LoCoMo (RAG)           18.27           14.57        22.20
                A-Mem
                Mem0
                                       41.55
                                       38.44
                                                       36.58
                                                       34.53
                                                                    54.80
                                                                    46.80
                                                                                     Memory Manager Latency For the Memory
 Qwen-2.5-7B    Memory-SFT             43.16           35.04        54.80            Manager component, latency remains relatively
                Memory-R1-PPO          40.30           35.50        47.40
                Memory-R1-GRPO         46.70           41.10        57.80
                                                                                     stable across Base, PPO, and GRPO variants. On
                                                                                     LLaMA-3.1-8B, median latency ranges narrowly
Table 5: Overall results on the LongMemEval bench-                                   between 1.98 s and 2.17 s, with p95 latency around
mark. We report the mean scores across all six evalua-                               3.4-3.6 s. Similar behavior is observed on Qwen-
tion dimensions. The best results are marked in bold.
                                                                                     2.5-7B, where p50 latency stays below 1.4 s across
                                                                                     all variants. These results suggest that RL fine-
(p95) inference time, measured across three compo-                                   tuning does not materially increase the computa-
nents of the pipeline: the Memory Manager, Mem-                                      tional cost of memory operation selection.
ory Search, and the Answer Agent. We compare
the base model, PPO-trained variants, and GRPO-                                      Memory Search Latency Memory Search ex-
trained variants on both LLaMA-3.1-8B and Qwen-                                      hibits consistently low latency across all settings.
2.5-7B backbones.                                                                    On both backbones, median latency remains below
                                                                                     0.35 s, and p95 latency remains under 0.65 s. Dif-
Overall Trends Across both model families,                                           ferences between Base, PPO, and GRPO variants
Memory-R1 does not introduce prohibitive latency                                     are minimal, indicating that improvements in down-
overhead despite incorporating explicit memory                                       stream accuracy are not driven by more expensive
management and reasoning components. In many                                         retrieval operations.

                                                                                18
Algorithm 3 Memory Bank Construction via Mem-                              Algorithm 5 Memory-R1 Pipeline for Memory
ory Manager                                                                Manager
 1: Input: Multi-turn dialogue D = {t1 , t2 , . . . , tn }; Initial         1: Input: Dataset D of tuples: dialogue turns ds, question-
    empty memory bank M                                                        answer pairs (qi , ai ); Temp memory bank M ; Memory
 2: Output: Updated memory bank M                                              Manager LLM Lm ; Answer LLM La ; Reward Function
 3: procedure C ONSTRUCT M EMORY BANK(D, M )                                   F; Generation instruction text t
 4:    for each dialogue turn ti ∈ D do                                     2: Output: Fine-tuned Memory Manager LLM Lm
 5:        Extract key info: fi ← LLMExtract(ti )                           3: procedure T RAIN M EMORY M ANAGER(D, Lm , La , F )
 6:        Retrieve memories:Mold ← TopK(fi , M )                           4:    for each tuple (ds, qi , ai ) ∈ D do
 7:        Determine operation:                                             5:        M ← {}
 8:        oi ← MemoryManager(fi , Mold ) where oi ∈                        6:        for di ∈ ds do
    {ADD, UPDATE, DELETE, NOOP}                                             7:            Facts Extraction: fi ← LLMExtract(di )
 9:        if oi = ADD then                                                 8:            Memory Retrieval: Mret ← TopK(fi , M )
10:             M ← M ∪ {fi }                                               9:            Determine operation: oi ∼ Lm (fi , Mret )
11:        else if oi = UPDATE then                                        10:            if oi = ADD then
12:             Mtmp ← Merge(Mold , fi )                                   11:                M ← M ∪ {fi }
13:             M ← M \ Mold ∪ Mtmp                                        12:            else if oi = UPDATE then
14:        else if oi = DELETE then                                        13:                Mtmp ← Merge(Mret , fi )
15:             M ← M \ Mold                                               14:                M ← M ∪ Mtmp
16:        else if oi = NOOP then                                          15:            else if oi = DELETE then
17:             M ←M                                                       16:                M ← M \ Mret
18:        end if                                                          17:            else if oi = NOOP then
19:    end for                                                             18:                M ←M
20:    return M                                                            19:            end if
21: end procedure                                                          20:        end for
                                                                           21:        Get Context: Cret ← TopK(qi , M )
                                                                           22:        Update Prompt: pi ← Concat(t, qi , Cret )
Algorithm 4 Memory-augmented Generation via                                23:        Get Response: ri ∼ La (pi )
Answer Agent                                                               24:        Policy Update: Lm ← RLstep (Lm , F, ai , ri ),
                                                                           25:        where RL ∈ {P P O, GRP O}
 1: Input: Question set Q = {q1 , q2 , . . . , qm }; Memory                26:    end for
    bank M ; Generation instruction text t                                 27:    return Lm
 2: Output: Answer set Â                                                  28: end procedure
 3: procedure G ENERATE A NSWERS(Q, M, t)
 4:    Â ← {}
 5:    for each question qi ∈ Q do
 6:        Mret ← TopK(qi , M )                                            higher accuracy while simultaneously reducing
 7:        pi ← Concat(t, qi , Mret )     ▷ pi is the memory               both median and tail latency. This behavior in-
    augmented prompt                                                       dicates a Pareto improvement rather than a trade-
 8:        Mdistill , âi ← AnswerAgent(pi )
 9:        Â ← Â ∪ {âi }
                                                                           off, where learned memory distillation and policy
10:    end for                                                             optimization enable the model to reason more effi-
11:    return Â                                                           ciently without sacrificing correctness.
12: end procedure
                                                                              Overall, these results demonstrate that Memory-
                                                                           R1 improves inference efficiency in addition to
                                                                           accuracy, especially in the Answer Agent compo-
Answer Agent Latency The Answer Agent
                                                                           nent, and that reinforcement learning can lead to
shows the most pronounced latency differences
                                                                           more streamlined reasoning behavior rather than
across methods. On LLaMA-3.1-8B, the GRPO-
                                                                           increased computational cost.
trained Answer Agent achieves substantially lower
median and tail latency, with p50 and p95 of 0.34 s
and 0.67 s, compared to 0.65 s and 3.07 s for the
base model and 0.91 s and 4.67 s for PPO. A similar
pattern holds on Qwen-2.5-7B, where GRPO re-
duces p95 latency to 0.83 s, compared to 1.06 s for
the base model and 2.60 s for PPO. This reduction
suggests that GRPO encourages more concise and
efficient reasoning paths during answer generation.

Accuracy-Latency Relationship Figures 13
and 14 further illustrate the relationship between ac-
curacy and latency across components. In contrast
to retrieval-heavy pipelines, Memory-R1 achieves

                                                                      19
Figure 13: Latency-accuracy comparison across
pipeline components on LLaMA-3.1-8B-Instruct.
Points show median (p50) and tail (p95) latency ver-
sus accuracy (F1, BLEU-1, and LLM-as-a-Judge) for
the base model and RL-trained variants (PPO, GRPO).




Figure 14: Latency-accuracy comparison across
pipeline components on Qwen-2.5-7B-Instruct. Points
represent median (p50) and tail (p95) latency versus
accuracy for the base model and RL-trained variants
(PPO, GRPO).




                                                       20
