<!-- Generated from arxiv-2512.10696.pdf via pdftotext -layout on 2026-02-22 -->

                                                     Remember Me, Refine Me: A Dynamic Procedural Memory
                                                        Framework for Experience-Driven Agent Evolution
                                                                Zouying Cao1,∗ , Jiaji Deng2 , Li Yu2 , Weikang Zhou2 ,
                                                                     Zhaoyang Liu2,† , Bolin Ding2 , Hai Zhao1,†
                                                            1
                                                              Shanghai Jiao Tong University, 2 Tongyi Lab , Alibaba Group
                                                     zouyingcao@sjtu.edu.cn, {dengjiaji.djj, jinli.yl, zhouweikang.zwk,
                                                       jingmu.lzy, bolin.ding}@alibaba-inc.com, zhaohai@cs.sjtu.edu.cn
                                                     github.com/agentscope-ai/ReMe                           reme.library             reme.website

                                                                Abstract                                  improvement without expensive parameter retrain-
                                                                                                          ing, procedural memory, which internalizes “how-
                                             Procedural memory enables large language




arXiv:2512.10696v1 [cs.AI] 11 Dec 2025
                                                                                                          to” knowledge from past interactions, has emerged
                                             model (LLM) agents to internalize “how-to”
                                             knowledge, theoretically reducing redundant                  as a critical substrate for agent evolution (Zhang
                                             trial-and-error. However, existing frameworks                et al., 2025b; Xu et al., 2025). By accumulating
                                             predominantly suffer from a “passive accumu-                 high-quality problem-solving experiences, agents
                                             lation” paradigm, treating memory as a static                can leverage prior successes and lessons to navi-
                                             append-only archive. To bridge the gap be-                   gate novel scenarios, theoretically reducing redun-
                                             tween static storage and dynamic reasoning,                  dant trial-and-error and circumventing local op-
                                             we propose ReMe (Remember Me, Refine Me),
                                                                                                          tima (Wang and Chen, 2025; Chen et al., 2025).
                                             a comprehensive framework for experience-
                                             driven agent evolution. ReMe innovates across
                                                                                                          Figure 1 contrasts how an agent completes one
                                             the memory lifecycle via three mechanisms: 1)                stock trading task with and without experiences.
                                             multi-faceted distillation, which extracts fine-                To bridge the gap between static storage and
                                             grained experiences by recognizing success pat-              dynamic reasoning, an ideal procedural memory
                                             terns, analyzing failure triggers and generat-               system must function not merely as a database, but
                                             ing comparative insights; 2) context-adaptive                as an evolving cognitive substrate satisfying three
                                             reuse, which tailors historical insights to new              core criteria: 1) High-quality Extraction: The sys-
                                             contexts via scenario-aware indexing; and 3)
                                                                                                          tem should distill generalized, reusable knowledge
                                             utility-based refinement, which autonomously
                                             adds valid memories and prunes outdated ones                 from noisy execution trajectories, rather than raw,
                                             to maintain a compact, high-quality experience               problem-specific observations. 2) Task-grounded
                                             pool. Extensive experiments on BFCL-V3 and                   Utilization: Retrieved memories should be dynam-
                                             AppWorld demonstrate that ReMe establishes a                 ically adapted to the specific requirements of the
                                             new state-of-the-art in agent memory system.                 current task, maximizing their utility in novel sce-
                                             Crucially, we observe a significant memory-                  narios. 3) Progressive Optimization: The memory
                                             scaling effect: Qwen3-8B equipped with ReMe
                                                                                                          pool should maintain its vitality through continu-
                                             outperforms larger, memoryless Qwen3-14B,
                                             suggesting that self-evolving memory pro-
                                                                                                          ous updates, autonomously reinforcing effective
                                             vides a computation-efficient pathway for life-              entries while removing outdated ones to prevent
                                             long learning. We release our code and the                   degradation over time.
                                             reme.library dataset to facilitate further re-                  However, current frameworks often fall short
                                             search.                                                      of these criteria, largely constrained by a “passive
                                                                                                          accumulation” paradigm. Prevailing approaches
                                         1   Introduction                                                 typically treat memory as inert, static storage, built
                                         The transition from static language models to au-                on either raw trajectories as experiences (Zheng
                                         tonomous agents marks a pivotal shift in artificial              et al., 2024; Hu et al., 2024) or summarized work-
                                         intelligence, enabling systems to handle complex,                flows corresponding to entire trajectories (Tang
                                         dynamic tasks through iterative reasoning and tool               et al., 2025; Liu et al., 2025). This introduces sev-
                                         use (Cheng et al., 2024; Tao et al., 2024; Gao et al.,           eral fundamental limitations. First, coarse-grained
                                         2025; Fang et al., 2025). To facilitate continuous               trajectory-level experiences may introduce irrele-
                                            ∗                                                             vant information that can prevent the agent from
                                              This work was done during Zouying Cao’s internship at
                                         Tongyi Lab, Alibaba Group.                                       grasping the core logic. Second, fetched experi-
                                            †
                                              Corresponding authors.                                      ences are applied without adaptation, leading to

                                                                                                      1
                                          Past Trajectory                                                                                 Experience
 Turn 1:
   User: I'm reviewing my account, and I'd like you to confirm the current balance and provide ...                    when to use: When a user wants to place an order
                                                                                                                      for a stock but specifies 'current market price'
  Assistant: [get_account_info()] … …
                                                                                                                      without providing a specific price.
 Turn 2:
   User: Subsequently, initiate a purchase order for 150 shares of TSLA at the prevailing market price ...            content: The assistant demonstrated a methodical
  Assistant: [get_stock_info(symbol='TSLA’)]                                                                          approach by first retrieving the current stock price
  Tool: {'price': 667.92, 'percent_change': -0.12, 'volume': 1.654, … }                                               using get_stock_info before placing an order.
  Assistant: place_order(order_type='Buy', symbol='TSLA', amount=150, price=250.0)]                                   This ensured that the user's request was
 Turn 3: … …                                                                                                          executed with precise, real-time data … ...


                                                                           LLM Agents
                                w/o experience                                                                          w/ experience
  Turn 1:                                                                                 Turn 1:
    User: I know the stock market updates its status at different points ...                User: I know the stock market updates ...➕ Related Experience
    Assistant: [get_current_time()] … ...                                                 Turn 2:
  Turn 2:                                                                                   User: ... 100 shares of the company with symbol AAPL at the prevailing price …
    User: I'm on the lookout for a stock ... 100 shares of the company with                Assistant: [get_stock_info(symbol='AAPL')]
  symbol AAPL at the prevailing market price? …                                            Tool: {'price': 227.16 , 'percent_change': 0.17, 'volume': 2.552, … }
    Assistant: [place_order(order_type='Buy',symbol='AAPL',price=190.50, … )] …            Assistant: [place_order(order_type='Buy',symbol='AAPL',price=227.16,…)] …
  Turn 3:                                                                                 Turn 3:
    User: Once you've set up the order, …                   The price of AAPL               User: Once you've set up the order, …
    …                                                       is fabricated!                  …
  Turn N:                                                                                 Turn N:
    User: I‘ve decided to back off from this particular order …                             User: I‘ve decided to back off from this particular order …



         Figure 1: Example of how agents complete one stock trading task with and without past experience.


failures in slightly shifted scenarios. Crucially, lack                                   our results reveal that memory quality can substi-
of timely update strategies causes the experience                                         tute for model scale: ReMe enables the Qwen3-8B
pool to degrade into a mixture of valid insights and                                      model to outperform larger size Qwen3-14B base-
toxic noise (Xiong et al., 2025).                                                         line (without memory), achieving average gains of
   To address these challenges, we propose ReMe                                           8.83% in Avg@4 and 7.29% in Pass@4. These
(Remember Me, Refine Me), a dynamic procedu-                                              findings suggest that a self-evolving memory mech-
ral memory framework that shifts the paradigm                                             anism paves the way for resource-efficient lifelong
from passive storage to feedback-driven evolution.                                        learning in LLM agents.
We introduce coordinated innovations across the                                              In summary, our contributions are as follows:
memory lifecycle to meet the criteria of an ideal                                              • We propose ReMe, a comprehensive frame-
system. First, ReMe employs a multi-faceted distil-                                              work for agent evolution that integrates
lation strategy for high-quality extraction. Through                                             multi-faceted experience distillation, context-
success pattern recognition, failure analysis and                                                adaptive reuse, and utility-based refinement.
comparative insight generation, the system distills                                              This closes the loop of procedural memory, re-
key steps from past execution trajectories into struc-                                           solving the “passive accumulation” dilemma
tured, reusable experiences. Second, we design a                                                 by enabling agents to autonomously distill,
comprehensive reuse pipeline for task-grounded                                                   adapt, and maintain high-quality reasoning
utilization. ReMe employs usage scenario index-                                                  patterns.
ing strategy for retrieval, supplemented by rerank-
ing and adaptive rewriting, aligning historical in-                                            • We release reme.library, a fine-grained pro-
sights with the specific constraints of new tasks.                                               cedural memory dataset constructed from di-
Finally, ReMe implements a utility-based refine-                                                 verse agentic tasks. Containing structured suc-
ment mechanism for progressive optimization. The                                                 cess patterns and failure lessons, this library
memory pool grows as new successful trajectories                                                 serves as a valuable resource for the commu-
contribute reliable experiences and failure attempts                                             nity to study procedure memory and optimize
trigger self-reflection to explore viable solutions                                              memory-augmented agents.
for potential insights. Concurrently, our framework                                            • Extensive experiments show that ReMe signifi-
tracks the utility of each experience during reuse,                                              cantly enhances agent performance across di-
periodically pruning low-utility entries to maintain                                             verse benchmarks. Crucially, we demonstrate
a compact and highly effective memory state.                                                     a memory-scaling effect, where smaller mod-
   Through extensive experiments on BFCL-V3                                                      els equipped with ReMe surpass larger base-
and AppWorld benchmarks, ReMe achieves state-                                                    lines, validating our framework as a compu-
of-the-art performance, demonstrating its effective-                                             tationally efficient pathway for lifelong agent
ness for memory-augmented agents. Most notably,                                                  learning.

                                                                                      2
2   Related Works                                          relevant knowledge in new tasks. These methods
                                                           neglect strategic experience removal mechanism,
Memory-enhanced LLM Agents. LLM-based                      since harmful experiences inevitably exist even
agents excel at handling complex tasks and in-             with human validation and initial helpful ones can
teractions, fueling their integration into diverse         also degrade over time (Xiong et al., 2025).
fields, such as finance (Ding et al., 2024), edu-
cation (Wang et al., 2024) and personalized as-            3     Methodology
sistant applications (Abbasian et al., 2023). Con-
temporary LLM agents employ memory systems                 3.1    Overview of ReMe
that store explored information and reuse these ex-        Our framework, ReMe, as illustrated in Figure 2,
periences, to enhance their reasoning capabilities         operates through three interconnected phases: ex-
and training efficiency (Mei et al., 2025). In gen-        perience acquisition, reuse, and refinement. In the
eral, memory-enhanced agents often leverage two            experience acquisition phase, a summarizer ana-
forms of memory: parametric memory and non-                lyzes agent generated trajectories (both successful
parametric memory (Zhang et al., 2024). Paramet-           and failed) and distills actionable knowledge into
ric memory refers to encoding long-term knowl-             a structured experience pool. During experience
edge within model weights, while non-parametric            reuse, given a novel task, a retriever recalls rele-
memory utilizes external resources like knowledge          vant experiences from the experience pool. These
bases and databases to enrich task contexts without        experiences then augment the agent’s context, en-
modifying model parameters. WKM (Qiao et al.,              hancing their reasoning and task-solving perfor-
2024) incorporates a parametric world-knowledge            mance. Finally, the experience refinement phase
model to facilitate agent planning. AWM (Wang              continuously optimizes the experience pool by in-
et al., 2025) enables agents to automatically induce       corporating new solid experiences and discarding
and use task workflows from past experiences, im-          outdated ones, ensuring long-term relevance and
proving their performance on web navigation tasks.         adaptability to shifting task demands.
MARK (Ganguli et al., 2025) constructs user pref-
erence memory to deliver personalized responses            3.2    Experience Acquisition
in conversational AI systems.                              We begin by defining agentic experiences E as
Experience Learning Strategies. Recent studies             structured, generalizable representations of agent
show LLMs can improve their decision-making                execution insights. Each individual experience
abilities through gathering experiences and recall-        E ∈ E is denoted as E = ⟨ω, e, κ, c, τ ⟩, where
ing relevant knowledge (Zhao et al., 2024; Tan             ω states the scenario when to use the experience,
et al., 2025). The core of experience learning in-         e represents the core experience content, κ =
volves extracting usable information to selectively        {κ1 , κ2 , ..., κm } is a set of relevant keywords for
update the experience pool and retrieving effective        categorization, c ∈ [0, 1] quantifies the confidence
experiences to help generate responses. Early ap-          score, and τ enumerates the tools utilized.
proaches, such as Synapse (Zheng et al., 2024) and            To construct the initial experience pool, the ex-
HiAgent (Hu et al., 2024), store complete trajec-          ecution agent LLMexecute interacts with the envi-
tories as experiences for retrieval. However, col-         ronment over time and across the training tasks,
lecting raw and long interaction histories is hard         incrementally accumulating informative trajecto-
to manage, and the lack of abstraction limits task         ries. For each task query q, we sample trajectories
generalization. Current works (Wang et al., 2025;          N times aiming to capture diverse execution paths
Chen et al., 2025) focus on summarizing structured         and thereby increase the likelihood of obtaining
knowledge from prior trajectories and implement-           valuable success/failure pairs for comparisons dur-
ing a context-aware retrieval system to reuse ex-          ing experience acquisition.
periences for task guidance. For instance, Agent              After collecting a set of exploration trajectories,
KB (Tang et al., 2025) captures generalizable expe-        a summarizer LLMsumm is instructed to transform
rience units and introduces a teacher-student dual-        them into structured, reusable experiences through
phase retrieval mechanism that enables complex             three complementary analyses: First, the summa-
agentic problem solving. CER (Liu et al., 2025)            rizer engages in success pattern recognition, identi-
distills fine-grained skills and environment dynam-        fying effective strategies and distilling the underly-
ics, allowing agents to augment themselves with            ing principles from succeeded trajectories. Concur-

                                                       3
                   Experience Acquisition                                                        Experience Reuse

                                                                                                                     Task Query
                         Prior Tasks                  AI Agents                                   Indexing
                                                                                                  Strategies          LLM-generated Field
     Trajectory
                                                                                                                      (e.g., when to use)
     Collection
                                              Execution
                                             Trajectories                       Recall              Retrieval
                                                                                                   Frequency
                                                                                                                   Task / Turn / Step Level


     Extraction        Trajectory-level            Keypoint-level
     Granularity
                                                                                                                          +
     Extraction        From Success
                                               From                          Rerank         Rewrite             Experience-driven Inference
     Strategies        From Failure         comparison



                           LLM As              Score
                                                                    ReMe
     Validation                                                                               Experience Refinement
                         Evaluator          Validation

                                                                                 Selective Addition

    Deduplication           Similarity-based Filtering
                                                                                    Failure-aware
                                                                                      Reflection

                         Task Experience
     task query     generalized query      experience content               Experience Record                       Utility-based Deletion
                                                                                freq += 1                            freq >= α &&
      query keywords     when to use       score       tool used                if task success: utility += 1        utility / freq < β




Figure 2: The ReMe framework comprises three alternating phases. The system first constructs the initial experience
pool from the agent’s past trajectories. For new tasks, relevant experiences are recalled and reorganized to guide
agent inference. After task execution, ReMe updates the pool, selectively adding new insights and removing outdated
ones.


rently, LLMsumm conducts failure analysis, scru-                          in a vector database, which we refer to as the expe-
tinizing unsuccessful attempts to derive valuable                         rience pool. The multi-faceted experience pool es-
lessons. These preventive insights discuss common                         tablishes a foundation for efficient retrieval and ap-
pitfalls, ineffective approaches, and critical errors                     plication of relevant knowledge in future problem-
that can be used to avoid repeating them in future                        solving scenarios, promoting the agent evolution
tasks. Additionally, LLMsumm performs compara-                            from trial-and-error to strategic reasoning.
tive analysis by jointly examining successful and
failed trajectories, identifying critical differences                     3.3      Experience Reuse
that distinguish effective from ineffective attempts.                     Equipped with the experience pool, we can retrieve
   Following the summarization, a validation step                         top-K relevant experiences based on task similar-
leveraging LLM-as-a-Judge (Zheng et al., 2023) is                         ity, which serve as a candidate set of in-context
further applied to assess whether the extracted ex-                       learning demonstrations to guide LLMexecute . To
periences are actionable, accurate, and valuable for                      be specific, the retriever utilizes advanced embed-
future agent executions. The designed prompt tem-                         ding models (e.g., text-embedding-v4 1 ) to encode
plate is presented in Appendix Table 9. Moreover,                         the current task query and computes cosine similar-
to keep the experience pool compact, validated                            ity scores to rank prior experiences. More retrieval
experiences undergo a similarity-based deduplica-                         details can be found in Appendix C.2. Upon fetch-
tion process which removes redundant experiences.                         ing the top-K experiences, we optionally employ a
This helps maintain the efficiency of the subsequent                      context-aware reranker LLMrerank to further refine
experience reuse phase and preserve the diversity                         the selection. This involves a nuanced evaluation
of retrieved experiences.                                                 of experience relevance in light of the current task’s
  All retained experiences are indexed by the em-                            1
                                                                             https://bailian.console.aliyun.com/?tab=model#/model-
bedding vector of usage scenario ω and then stored                        market/detail/text-embedding-v4


                                                                      4
specific context, constraints, and objectives, thus         to explore alternative strategies when encounter-
ensuring the most pertinent experiences are brought         ing new task failures. Specifically, LLMsumm an-
to the forefront.                                           alyzes this unsuccessful attempt, extracts key in-
   To better adapt the experiences to new task re-          sights about potential areas for improvement, and
quirements, we introduce the rewriting module to            then LLMexecute starts a new trial based on these
reorganize the original context (containing multiple        lessons. When such trial succeeds, the correspond-
experiences) into a cohesive, task-specific guidance        ing lessons are incorporated into memory; other-
that is more directly applicable. Since past expe-          wise, they are discarded without cluttering the ex-
riences may not always perfectly align with new             perience pool. To avoid falling into an endless loop
situations, this intelligent adaptation mechanism           caused by inherent model limitations, we limit the
not only increases the immediate utility of the re-         maximum number of self-reflections to 3.
trieved experiences but also empowers the agent to             Second, to prevent the accumulation of outdated
make more flexible and context-aware decisions.             or ineffective experiences, we employ a utility-
   The experience reuse phase extends beyond                based deletion strategy that removes any experi-
mere experience retrieval, acting as a cognitive            ence whose average utility across all its past recalls
bridge that dynamically connects past knowledge             falls below a predefined threshold β. Specifically,
with present challenges. By combining retrieval,            ReMe continuously records the status of existing
reranking and rewriting, it not only leverages prior        experiences, including the total retrievals f and the
wisdom but also encourages novel thinking when              historical utility u which increments by 1 each time
past experiences fall short, thereby achieving a bal-       its recall contributes to a successful task comple-
ance between exploitation and exploration.                  tion. An experience E ∈ E is considered to be
                                                            removed when it is frequently retrieved yet fails to
3.4   Experience Refinement                                 improve new task performance:
However, a static experience pool cannot adapt                                 ( h u(E)      i
to shifts in task distributions or improvements in                               1 f (E) ≤ β , if f (E) ≥ α,
                                                             ϕremove (E) =
model capability, making retrieved experiences in-                               0,               otherwise.
creasingly irrelevant. To address this, we introduce                                                           (1)
a experience refinement mechanism that dynam-               Note that we only consider an experience for re-
ically updates the experience pool via selective            moval after it has been retrieved at least α times.
addition and utility-based deletion.                           By integrating these components, ReMe facili-
   First, we carefully compare two distinct strate-         tates a self-evolving experience pool that retains
gies for adding new experiences to the pool: 1) full        high-quality experiences capable of shaping long-
addition, which incorporates experiences summa-             term agent behavior while adapting to new task
rized from all new trajectories regardless of out-          demands.
come; 2) selective addition, where only trajectories
that lead to success are distilled into experiences         4     Experiments
and stored. The empirical evidence indicates that           4.1    Experimental Settings
full addition often underperforms selective addi-
                                                            Datasets. We conduct experiments on two tool-
tion, which may be attributed to the quality of
                                                            augmented benchmarks: BFCL-V3 (Patil et al.,
failure-based experiences. During initial experi-
                                                            2025), AppWorld (Trivedi et al., 2024). For BFCL-
ence pool construction, multiple failed trajectories
                                                            V3, we randomly select 50 tasks from the base
can be collectively analyzed to extract meaningful
                                                            multi-turn category to construct the initial experi-
insights. However, in real-time task execution, a
                                                            ence pool since the default dataset does not provide
single failed trajectory often provides insufficient
                                                            training split. The remaining 150 tasks serve as
context for accurate failure analysis, potentially
                                                            the evaluation set. For AppWorld, 90 training tasks
leading to misguided experiences. In contrast, suc-
                                                            are used for the initial experience acquisition stage
cessful trajectories consistently yield more reliable
                                                            and we evaluate agents on test-normal set (168
and actionable insights, thereby making selective
                                                            tasks). Detailed information of the datasets are in
addition effective.
                                                            Appendix A.
   Additionally, we recognize the potential value
of learning from failures and introduce a failure-          Metrics. We report both Avg@4 and Pass@4
aware reflection mechanism that encourages agents           results: the average task success rate across four

                                                        5
                                           BFCL-V3                     AppWorld                   Avg
  Model          Methods
                                       Avg@4    Pass@4              Avg@4   Pass@4           Avg@4 Pass@4
                 No Memory           40.33±0.94    59.55±0.83      14.97±0.24   32.85±2.11    27.65     46.20
                 A-Mem               41.22±0.61    62.00±2.37      12.95±0.37   29.76±2.80    27.09     45.88
  Qwen3-8B       LangMem             44.11±0.28    65.55±1.13      11.46±0.53   26.79±0.84    27.79     46.17
                 ReMe (fixed)        44.50±0.85    65.77±0.63      17.06±0.25   36.31±1.29    30.78     51.04
                 ReMe (dynamic)      45.17±0.36    68.00±0.55      24.70±1.04   42.06±0.74    34.94     55.03
                 No Memory           48.66±1.51    68.22±0.63      22.57±0.19   41.07±0.84    35.62     54.65
                 A-Mem               47.44±0.44    69.77±0.63      18.95±0.31   37.70±0.57    33.20     53.74
  Qwen3-14B      LangMem             49.17±0.33    71.33±1.33      21.88±1.37   41.67±1.68    35.53     56.50
                 ReMe (fixed)        51.89±0.34    72.44±0.63      25.35±0.91   46.82±0.74    38.62     59.63
                 ReMe (dynamic)      55.00±0.72    74.44±0.83      34.32±0.81   52.98±1.29    44.66     63.71
                 No Memory           54.55±0.63    72.44±0.83      27.23±0.92   50.59±1.68    40.89     61.52
                 A-Mem               54.50±1.09    72.66±0.54      28.13±0.75   51.19±0.97    41.32     61.93
  Qwen3-32B      LangMem             52.27±1.13    72.22±1.91      24.55±0.57   47.02±1.56    38.41     59.62
                 ReMe (fixed)        56.05±1.26    74.89±0.63      31.50±0.67   58.13±1.40    43.78     66.51
                 ReMe (dynamic)      56.17±0.24    76.44±1.13      42.02±0.51   63.49±0.28    49.10     69.97

Table 1: Performance comparison (%) between ReMe and the baselines on BFCL-V3, AppWorld benchmarks. Bold
indicate the best results of each model. All results are computed as the average over three independent runs, with
the superscript showing the standard deviation.


independent trials, and the probability that at least        the experience acquisition phase, we set N = 8 and
one out of four independent task trials is successful.       temperature = 0.9 for trajectory sampling. The
Unless otherwise specified, all results are averaged         prompts used in this phase and more details can
over three independent runs and reported as mean             be found in Appendix C.1. In the experience reuse
with standard deviation.                                     phase, we use a top-K value of 5, retrieving the five
                                                             most relevant experiences for each task. The con-
Baselines. To evaluate the effectiveness of ReMe,            figuration difference between ReMe (fixed) and
we compare it against three baselines: (1) No Mem-           ReMe (dynamic) lies in whether the experience
ory, and two popular baseline memory systems (2)             pool is dynamically updated during agent execu-
A-Mem (Xu et al., 2025), an agentic memory sys-              tion. In the experience refinement phase, utility-
tem that enables LLM agents to dynamically orga-             based deletion is controlled by the retrieval thresh-
nize their memories for future action guidance, and          old α = 5 and the utility threshold β = 0.5. Ad-
(3) LangMem (LangChain, 2025), LangChain’s                   ditionally, the maximum number of iterations is
long-term memory module that provides tooling to             limited to 30, after which the agent terminates
extract important information from previous con-             regardless of task success or failure. To ensure
versations and optimize agent behavior through               fair comparison, we maintain these settings con-
prompt refinement. For fair comparison, all meth-            sistently across all experiments unless otherwise
ods perform experience retrieval only once at the            specified for ablation studies.
beginning of each task. Additionally, the mem-
ory addition operation for these systems is trig-            4.2   Main Results
gered only upon the collection of successful tra-
jectories. Further implementation details of the             Table 1 presents the main results of ReMe across
baseline methods are provided in Appendix B.                 Qwen3 family models on BFCL-V3 and AppWorld
                                                             benchmarks. Overall, ReMe achieves the highest av-
Implementation Details. We use the Qwen3 se-                 erage task success rate across three model sizes,
ries instruct models (Team, 2025) as LLMexecute              consistently outperforming the No Memory base-
and set LLMsumm = LLMexecute for experience-                 line and competitive baseline memory systems.
driven self-evolution. For experience indexing, we           Specifically, Qwen3-8B with ReMe surpasses the
employ Qwen3-Embedding (Zhang et al., 2025a)                 No Memory baseline by an improvement of 7.29%
with its default embedding dimension of 1024. In             Pass@4 and 8.83% Avg@4 on average. The gains

                                                         6
                     Qwen3-8B           Qwen3-14B                     Full   Selective                       BFCL-V3
 Granularity                                                                           Reflection Deletion
                 Avg@4(%) Pass@4(%) Avg@4(%) Pass@4(%)              Addition Addition                      Avg@4 Pass@4
 Trajectory-level 43.00+2.67 60.00+0.45 49.66+1.00 69.33+1.11             ✓        –        –         –      40.83%   62.00%
 Keypoint-level 44.50+4.17 65.77+6.22 51.89+4.23 72.44+4.22
                                                                          –        ✓        –         –      44.33%   64.66%
                                                                          –        ✓        ✓         –      45.00%   64.66%
Table 2: Ablation study on extraction granularity levels                  –        ✓        ✓         ✓      45.17%   68.00%
in the experience acquisition stage. The experimental
setting is ReMe (fixed), with subscript showing the                 Table 3: Ablation on key components. We compare the
performance gap compared with No Memory baseline.                   full addition and selective addition and assess the impact
                                                                    of failure-aware reflection and utility-based deletion. A
                                                                    checkmark (✓) indicates the component is used.
observed in Pass@4 indicate that retrieved experi-
ences are effective at broadening the exploration
                                                                    past experience guides the agent to correctly obtain
space, increasing the likelihood of finding at least
                                                                    real-time pricing before placing an order, success-
one successful solution among multiple attempts.
                                                                    fully completing the stock trading task. This case
Besides, the performance stability of our ReMe is
                                                                    demonstrates how experience-driven reasoning pre-
particularly evident when compared to the baseline
                                                                    vents agents from repeating earlier mistakes and
methods. For instance, while LangMem performs
                                                                    improves robustness across similar scenarios.
well on BFCL-V3, its performance drops signifi-
cantly on AppWorld, especially for smaller mod-                     4.3       Ablation Studies
els. Instead, ReMe (dynamic) shows remarkable
                                                                    Granularity Ablations. We compare two granu-
consistency across both BFCL-V3 and AppWorld
                                                                    larity levels for experience acquisition: trajectory-
benchmarks.
                                                                    level and keypoint-level. In Appendix D, we
   Notably, smaller models equipped with our                        present two experience examples illustrating the
ReMe can be comparable to, or even surpass,                         structural and content differences between these
larger models without memory. For example,                          granularity settings. As shown in Table 2, although
the average Pass@4 score for Qwen3-8B + ReMe                        the incorporation of trajectory-level experiences
(dynamic) exceeds that of the naive Qwen3-14B                       exhibits minor progress over No Memory base-
model (55.03% vs. 54.65%). Similarly, Qwen3-                        line, the performance gains brought by keypoint-
14B + ReMe (dynamic) exceeds the overall perfor-                    level experiences are substantially higher. This
mance of Qwen3-32B without memory (Avg@4:                           underscores that summarizing experiences at a fine-
44.66% vs. 40.89%; Pass@4: 63.71% vs. 61.52%).                      grained level enables more effective knowledge
This underscores that an effective memory mecha-                    transfer, leading to superior agent performance
nism can significantly narrow the performance gap                   across different tasks and model scales.
across model scales.
   Moreover, the dynamic version of ReMe consis-                    Component Ablations. Taking Qwen3-8B as an
tently outperforms its fixed counterpart across all                 example, Table 3 presents an ablation study on key
model sizes and benchmarks. This underscores the                    components of our ReMe framework. Firstly, replac-
importance of adaptive experience refinement dur-                   ing full addition with selective addition leads to
ing task execution. Furthermore, ReMe tends to re-                  substantial performance improvements, with gains
duce the standard deviation in performance across                   of 3.50% Avg@4 and 2.66% Pass@4 on BFCL-
runs, particularly for larger models. This suggests                 V3. This highlights the importance of experience
that ReMe not only improves overall performance                     quality over quantity in experience-driven agent
but also enhances the robustness and reliability of                 evolution. Moreover, the introduction of the failure-
model outputs.                                                      aware reflection module enhances the average task
                                                                    success rate, demonstrating the value of learning
   To gain deeper insights into how experience
                                                                    from unsuccessful attempts. Notably, incorporating
reuse influences agent reasoning, we compare two
                                                                    the utility-based deletion yields further improve-
agent trajectories on the same BFCL-V3 task, one
                                                                    ments, indicating that regularly discarding outdated
guided by retrieved experiences and one without.
                                                                    experiences is critical for agents to adapt to non-
As illustrated in Figure 1, without past experience,
                                                                    stationary environments.
the agent encounters a failure when purchasing Ap-
ple shares since it fabricates the current market                   Retrieval Key Ablations. Regarding the index-
price instead of fetching real-time data. With ReMe,                ing strategy, we explore four different retrieval keys

                                                                7
                                task query                           query keywords                                                                 Model: Qwen3-8B Dataset: BFCL-V3
                                generalized query                    usage scenario                                                                                  65.77 65.33                  65.33
                                                                                                                                   66                                            64.66 64.66
            57                                                  75                                                                                  64.0        64.0                         64.0
                                                                                                                                   64         63.33       63.33
            54                                                  72

Avg@4 (%)                                          Pass@4 (%)
            51                                                  69                                                                 62
            48                                                                                                                     60 59.55




                                                                                                           Agent Performance (%)
                                                                66
            45                                                                                                                                                      Pass@4               Avg@4
                                                                63                                                                 58
            42                                                                                                                     45                                        44.5
                         B        3-14B wen3-32B                             B        3-14B wen3-32B
                 Qwen3-8     Qwen      Q                             Qwen3-8     Qwen      Q
                                                                                                                                                                     44.16             44.0 44.16 44.16 44.0
                                                                                                                                   44                        43.5                                                        43.66
                                                                                                                                   43
  Figure 3: Ablation on retrieval keys. The experiments                                                                                              42.0
                                                                                                                                   42
  are evaluated on BFCL-V3 in ReMe (fixed) setting.
                                                                                                                                    41 40.33 40.33
                                                                                                                                   40   0       1     2       3      4     5     6     7                 8           9       10
                                                     BFCL-V3
      LLMexecute LLMsumm                                                                                                                                  Number of Experience Retrieved
                                             Avg@4 (%)     Pass@4 (%)
                         Qwen3-8B        44.50                                    65.77                        Figure 4: Effect of retrieved experience number on agent
      Qwen3-8B           Qwen3-14B 46.33 △ = 1.83 ↑                         66.00 △ = 0.23 ↑
                                                                                                               performance (%) in ReMe (fixed) setting.
                         Qwen3-32B 47.83 △ = 3.33 ↑                         68.00 △ = 2.23 ↑

                                                                                                                                   Model: Qwen3-8B                           22
 Table 4: Performance of different LLMsumm capabili-                                                                               Dataset: BFCL-V3                                                              Baseline
                                                                                                                                                                                       19
 ties with fixed LLMexecute in ReMe (fixed) setting.                                                                                                                                        16                   ReMe
                                                                                                                                                                                  14
                                                                                                                                                                                                 13 13


  to assess their impact on the performance of ReMe.                                                                                                                                                         4           4
  From Figure 3, it can be seen that using the raw                                                                                                                                                               2           2
  task description or their extracted keywords to in-
  dex experiences underperforms the LLM-generated
  fields (generalized query and usage scenario). The                                                                                           (a)                                               (b)
  usage scenario indexing strategy, which likely cap-
                                                                                                               Figure 5: Statistics of failed tasks with and without
  tures both the task context and potential application
                                                                                                               ReMe. (a) Left: shows overlapping and unique failure
  areas, proves to be the most effective in retrieving                                                         cases; (b) Right: displays the number of task failures
  relevant experiences from the database. For com-                                                             across different error categories.
  prehensive results, please refer to Appendix E.1.

  4.4             More Analysis                                                                                ing the number of in-context experiences achieves
Agent Gains More with Stronger LLMsumm .                                                                       steady performance gains that rise and then saturate.
Our main experiments have demonstrated that an                                                                 Beyond the saturation point, retrieving more may
agent can learn effectively through experience-                                                                degrade performance, primarily due to the higher
driven self-evolution, i.e., LLMsumm =LLMexecute .                                                             chance of incorporating irrelevant or noisy experi-
To investigate whether the agent gains more as                                                                 ences. This is why we select K = 5 in the main
LLMsumm capability increases, we scale the sum-                                                                experiments.
marization model from Qwen3-8B to Qwen3-32B
                                                                                                               Error Analysis. We conduct an analysis of the
with the fixed LLMexecute = Qwen3-8B. It can
                                                                                                               error patterns with and without ReMe for Qwen3-
be observed from Table 4 that stronger summa-
                                                                                                               8B on BFCL-V3 benchmark. The Venn diagram
rization capability yields clear performance im-
                                                                                                               (Figure 5a) reveals a reduction in the total number
provements in both Avg@4 and Pass@4 metrics
                                                                                                               of failure cases from 62 (No Memory Baseline)
(Avg@4: +1.83% → +3.33%; Pass@4: +0.23% →
                                                                                                               to 47 (ReMe). Notably, ReMe corrects 17 baseline-
+2.23%). These findings emphasize the critical role
                                                                                                               specific errors while introducing only 2 new ones.
of high-quality experience summarization in over-
                                                                                                               Further, we manually review and categorize each
all agent performance, highlighting the potential
                                                                                                               failure case to examine the impact of ReMe on dif-
for further gains through advanced summarization
                                                                                                               ferent error types (see Figure 5b). A substantial
techniques.
                                                                                                               decrease in Reasoning Error (22 → 14) suggests
  Effect of Retrieved Experience Number. To                                                                    that ReMe effectively leverages past experiences
  evaluate the relationship between retrieved experi-                                                          to strengthen its multi-step reasoning capabilities,
  ence number and performance, we vary the value                                                               leading to reduced propagation of earlier mistakes.
  K from 0 to 10. As shown in Figure 4, increas-                                                               ReMe also yields a moderate but meaningful reduc-

                                                                                                       8
tion in Action Omission errors, which helps the            Silin Chen, Shaoxin Lin, Xiaodong Gu, Yuling Shi,
agent recognize missing steps in multi-turn tasks,            Heng Lian, Longfei Yun, Dong Chen, Weiguo Sun,
                                                              Lin Cao, and Qianxiang Wang. 2025. Swe-exp:
especially those requiring sequential tool interac-
                                                              Experience-driven software issue resolution. arXiv
tions or state tracking.                                      preprint arXiv:2507.23361.

5   Conclusion                                             Yuheng Cheng, Ceyao Zhang, Zhengwen Zhang, Xi-
                                                             angrui Meng, Sirui Hong, Wenhao Li, Zihao Wang,
We introduce ReMe, a dynamic procedural memory               Zekai Wang, Feng Yin, Junhua Zhao, and 1 others.
framework that evolves agent reasoning from blind            2024. Exploring large language model based intel-
trial-and-error to strategic experience reuse. By            ligent agents: Definitions, methods, and prospects.
distilling structured knowledge from prior trajec-           arXiv preprint arXiv:2401.03428.
tories at a fine-grained level, ReMe enables agents        Han Ding, Yinheng Li, Junhao Wang, and Hang Chen.
to leverage critical insights, thus avoiding poten-          2024. Large language model agent in financial trad-
tial experience interference in coarse-grained ap-           ing: A survey. arXiv preprint arXiv:2408.06361.
proaches. Equipped with effective experience re-
finement, ReMe maintains a high-quality experience         Jinyuan Fang, Yanwen Peng, Xi Zhang, Yingxu Wang,
                                                              Xinhao Yi, Guibin Zhang, Yi Xu, Bin Wu, Siwei
pool for agent evolution. Extensive experiments               Liu, Zihao Li, and 1 others. 2025. A comprehensive
validate that ReMe significantly outperforms several          survey of self-evolving ai agents: A new paradigm
baselines, with ablation studies highlighting the             bridging foundation models and lifelong agentic sys-
value of each core component in ReMe.                         tems. arXiv preprint arXiv:2508.07407.

Limitations                                                Anish Ganguli, Prabal Deb, and Debleena Banerjee.
                                                             2025. Mark: Memory augmented refinement of
This paper focuses on procedural memory manage-              knowledge. arXiv preprint arXiv:2505.05177.
ment for agent self-evolution. Despite its promis-
                                                           Huan-ang Gao, Jiayi Geng, Wenyue Hua, Mengkang Hu,
ing performance, there are several limitations that          Xinzhe Juan, Hongzhang Liu, Shilong Liu, Jiahao
could be addressed in future work. First, ReMe               Qiu, Xuan Qi, Yiran Wu, and 1 others. 2025. A
currently employs a fixed retrieval strategy, where          survey of self-evolving agents: On path to artificial
experiences are retrieved once at the beginning of           super intelligence. arXiv preprint arXiv:2507.21046.
each task. Implementing a more flexible, context-
                                                           Mengkang Hu, Tianxing Chen, Qiguang Chen, Yao Mu,
aware retrieval mechanism could potentially im-             Wenqi Shao, and Ping Luo. 2024. Hiagent: Hier-
prove system performance, since dynamic experi-              archical working memory management for solving
ence incorporation promotes adaptive knowledge               long-horizon agent tasks with large language model.
utilization. Secondly, although the existing ex-             arXiv preprint arXiv:2408.09559.
perience validation process effectively filters out        LangChain. 2025.      Langmem: Modular mem-
low-quality experiences, relying primarily on an             ory for agentic systems. https://github.com/
LLM-as-judge approach may overlook nuanced as-               langchain-ai/langmem. Accessed: 2025-10-13.
pects of experience quality and relevance. In the
future, we can explore more sophisticated valida-          Yitao Liu, Chenglei Si, Karthik R Narasimhan, and
                                                             Shunyu Yao. 2025. Contextual experience replay for
tion techniques for more precise experience eval-            self-improvement of language agents. In Proceed-
uation. Furthermore, a larger-scale summarizer               ings of the 63rd Annual Meeting of the Association
brings greater performance gains in agent reason-            for Computational Linguistics (Volume 1: Long Pa-
ing, as shown in Section 4.4, which can be at-               pers), pages 14179–14198.
tributed to its stronger summarization capability.
                                                           Lingrui Mei, Jiayu Yao, Yuyao Ge, Yiwei Wang, Bao-
This indicates that designing advanced summariza-            long Bi, Yujun Cai, Jiazhi Liu, Mingyu Li, Zhong-Zhi
tion strategies with small models can further boost          Li, Duzhen Zhang, and 1 others. 2025. A survey of
agent self-evolution.                                        context engineering for large language models. arXiv
                                                             preprint arXiv:2507.13334.

References                                                 Shishir G Patil, Huanzhi Mao, Fanjia Yan, Charlie
                                                             Cheng-Jie Ji, Vishnu Suresh, Ion Stoica, and Joseph E
Mahyar Abbasian, Iman Azimi, Amir M Rahmani, and             Gonzalez. 2025. The berkeley function calling leader-
 Ramesh Jain. 2023. Conversational health agents: A          board (bfcl): From tool use to agentic evaluation of
 personalized llm-powered agent framework. arXiv             large language models. In Forty-second International
 preprint arXiv:2310.02374.                                  Conference on Machine Learning.


                                                       9
Shuofei Qiao, Runnan Fang, Ningyu Zhang, Yuqi Zhu,            Yanzhao Zhang, Mingxin Li, Dingkun Long, Xin Zhang,
  Xiang Chen, Shumin Deng, Yong Jiang, Pengjun Xie,             Huan Lin, Baosong Yang, Pengjun Xie, An Yang,
  Fei Huang, and Huajun Chen. 2024. Agent planning              Dayiheng Liu, Junyang Lin, Fei Huang, and Jingren
  with world knowledge model. Advances in Neural                Zhou. 2025a. Qwen3 embedding: Advancing text
  Information Processing Systems, 37:114843–114871.             embedding and reranking through foundation models.
                                                                arXiv preprint arXiv:2506.05176.
Zhen Tan, Jun Yan, I-Hung Hsu, Rujun Han, Zifeng
  Wang, Long Le, Yiwen Song, Yanfei Chen, Hamid               Zeyu Zhang, Quanyu Dai, Xiaohe Bo, Chen Ma, Rui Li,
  Palangi, George Lee, Anand Rajan Iyer, Tianlong               Xu Chen, Jieming Zhu, Zhenhua Dong, and Ji-Rong
  Chen, Huan Liu, Chen-Yu Lee, and Tomas Pfister.               Wen. 2024. A survey on the memory mechanism of
  2025. In prospect and retrospect: Reflective mem-             large language model based agents. ACM Transac-
  ory management for long-term personalized dialogue            tions on Information Systems.
  agents. In Proceedings of the 63rd Annual Meet-
  ing of the Association for Computational Linguistics        Zeyu Zhang, Quanyu Dai, Xiaohe Bo, Chen Ma, Rui Li,
  (Volume 1: Long Papers), pages 8416–8439.                     Xu Chen, Jieming Zhu, Zhenhua Dong, and Ji-Rong
                                                                Wen. 2025b. A survey on the memory mechanism of
Xiangru Tang, Tianrui Qin, Tianhao Peng, Ziyang Zhou,           large language model-based agents. ACM Transac-
  Daniel Shao, Tingting Du, Xinming Wei, Peng Xia,              tions on Information Systems, 43(6):1–47.
  Fang Wu, He Zhu, and 1 others. 2025. Agent kb:
                                                              Andrew Zhao, Daniel Huang, Quentin Xu, Matthieu
  Leveraging cross-domain experience for agentic prob-
                                                                Lin, Yong-Jin Liu, and Gao Huang. 2024. Expel:
  lem solving. arXiv preprint arXiv:2507.06229.
                                                                Llm agents are experiential learners. In Proceedings
Zhengwei Tao, Ting-En Lin, Xiancai Chen, Hangyu                 of the AAAI Conference on Artificial Intelligence,
  Li, Yuchuan Wu, Yongbin Li, Zhi Jin, Fei Huang,               volume 38, pages 19632–19642.
  Dacheng Tao, and Jingren Zhou. 2024. A survey               Lianmin Zheng, Wei-Lin Chiang, Ying Sheng, Siyuan
  on self-evolution of large language models. arXiv             Zhuang, Zhanghao Wu, Yonghao Zhuang, Zi Lin,
  preprint arXiv:2404.14387.                                    Zhuohan Li, Dacheng Li, Eric Xing, and 1 others.
                                                                2023. Judging llm-as-a-judge with mt-bench and
Qwen Team. 2025. Qwen3 technical report. Preprint,
                                                                chatbot arena. Advances in neural information pro-
 arXiv:2505.09388.
                                                                cessing systems, 36:46595–46623.
Harsh Trivedi, Tushar Khot, Mareike Hartmann, Ruskin          Longtao Zheng, Rundong Wang, Xinrun Wang, and
  Manku, Vinty Dong, Edward Li, Shashank Gupta,                 Bo An. 2024. Synapse: Trajectory-as-exemplar
  Ashish Sabharwal, and Niranjan Balasubramanian.               prompting with memory for computer control. In
  2024. Appworld: A controllable world of apps and              The Twelfth International Conference on Learning
  people for benchmarking interactive coding agents.            Representations.
  In Proceedings of the 62nd Annual Meeting of the
  Association for Computational Linguistics (Volume
  1: Long Papers), pages 16022–16076.
                                                              A    Dataset Details
                                                              BFCL-V3 Berkeley Function Calling Leader-
Shen Wang, Tianlong Xu, Hang Li, Chaoli Zhang,
  Joleen Liang, Jiliang Tang, Philip S Yu, and Qing-          board V3 (BFCL-V3) (Patil et al., 2025) is a bench-
  song Wen. 2024. Large language models for ed-               mark which assesses the function calling and tool-
  ucation: A survey and outlook. arXiv preprint               using capabilities of LLMs, particularly in multi-
  arXiv:2403.18105.                                           turn and multi-step scenarios. It provides over
Yu Wang and Xi Chen. 2025. Mirix: Multi-agent mem-            1,800 test tasks that require models to generate
  ory system for llm-based agents. arXiv preprint             precise API calls, handle various programming
  arXiv:2507.07957.                                           languages (Python, Java, JavaScript), and manage
Zora Zhiruo Wang, Jiayuan Mao, Daniel Fried, and              complex interactions like parallel function calls.
  Graham Neubig. 2025. Agent workflow memory. In              The evaluation employs both Abstract Syntax Tree
  Forty-second International Conference on Machine            (AST) matching to check syntactic correctness and
  Learning.                                                   executable testing to verify functional outcomes.
Zidi Xiong, Yuping Lin, Wenya Xie, Pengfei He, Jil-           In our experiments, a task is deemed successful
  iang Tang, Himabindu Lakkaraju, and Zhen Xiang.             when the agent makes the necessary function calls
  2025. How memory management impacts llm agents:             correctly and yields the expected outputs.
  An empirical study of experience-following behavior.
  arXiv preprint arXiv:2505.16067.                            AppWorld AppWorld (Trivedi et al., 2024) is a
                                                              benchmark designed to evaluate function calling
Wujiang Xu, Kai Mei, Hang Gao, Juntao Tan, Zu-
 jie Liang, and Yongfeng Zhang. 2025. A-mem:
                                                              and interactive coding agents. It simulates a world
 Agentic memory for llm agents. arXiv preprint                of 9 day-to-day applications (e.g., email, Spotify,
 arXiv:2502.12110.                                            Venmo) through 457 APIs and is populated with the

                                                         10
er for        task query: Access and retrieve the details of my                  when to use: When a user wants to place an order for
              most recent order, as I've misplaced the ID but need               a stock but without providing a specific price.
a             the latest transaction.                                            experience content: The assistant demonstrated a
                                                                                when    to use:
                                                                                 methodical      When abyuser
                                                                                              approach      firstwants to place
                                                                                                                  retrieving  theancurrent
                                                                                                                                     order for
nt            query keywords: ["order retrieval", "ambiguous                    astock
                                                                                   stockprice
                                                                                          but using
                                                                                               without  providing a specific  price.
hat           requests", "efficiency", "user experience"]                                            get_stock_info   and then   using that
                                                                                experience
                                                                                 price in the content:   Thefunction.
                                                                                               place_order    assistantThis
                                                                                                                        demonstrated
                                                                                                                             two-step a
              generalized query: Retrieve recent order details                  methodical    approach   by firstwith
                                                                                                                  retrieving  the current
              when order ID is unavailable.                                      process  ensures   compliance        the required
                                                                                stock price using get_stock_info and then using that
 ning         when to use: When users need order details without                 parameters of the place_order function while aligning
                                                                                price  in the
                                                                                 with the      place_order
                                                                                            user's intent forfunction. This two-step order.
                                                                                                               a market-price-based
rder.         explicit order IDs.                                               process ensures compliance with the required
              experience content: The higher-scoring approach                   parameters of the place_order function while aligning
              automatically retrieved and displayed the most recent             with the user's intent for a market-price-based order.
              order details (ID 12446) after fetching the history,                Figure 7: Experience example on BFCL-V3.
              while the lower-scoring response only listed order IDs            when to use: When interacting with APIs that require
quire         without immediate detail retrieval. This demonstrates             precise authentication parameters and data extraction.
ction.        efficiency in handling ambiguous user requests by                 content: The higher-scoring approach prioritized API
              combining history lookup with direct detail fetching.             when    to use:validation
                                                                                specification   When interacting     with APIs(e.g.,
                                                                                                           before execution      thatconfirming
                                                                                                                                       require
cution                                                                          precise   authentication
                                                                                phone login               parameters
                                                                                              requires phone    numberand as data  extraction.
                                                                                                                             username),
er as                                                                           experience
                                                                                implementedcontent:      The higher-scoring
                                                                                               robust error                    approach
                                                                                                              handling for authentication
                                                                                prioritized
                                                                                failures,    API
                                                                                           and    specification
                                                                                               used              validation
                                                                                                      precise data           before
                                                                                                                     extraction      execution
                                                                                                                                techniques
raction   Figure 6: Different indexing examples for the same                    (e.g., confirming phone login requires phone number as
                                                                                (search_notes with tags/query filters). The lower-scoring
 The      BFCL-V3 task experience.                                              username),
                                                                                approach madeimplemented
                                                                                                  repeatedrobust     error handling
                                                                                                             authentication   errors,for
                                                                                                                                       included
 tion                                                                           authentication
                                                                                explanatory text failures,
                                                                                                    in codeand  usedcausing
                                                                                                             blocks    precisesyntax
                                                                                                                               data extraction
                                                                                                                                       failures,
ausing                                                                          techniques   (search_notes
                                                                                and used inefficient    stringwith  tags/query
                                                                                                               parsing           filters). The
                                                                                                                         that retained
g that                                                                          lower-scoring
                                                                                metadata insteadapproach    made
                                                                                                     of clean      repeated authentication
                                                                                                              titles.
          digital activities of approximately 100 simulated                     errors, included explanatory text in code blocks causing
                                                                                syntax failures, and used inefficient string parsing that
          users. A key feature of AppWorld is its robust eval-                  retained metadata instead of clean titles.
          uation framework, which uses state-based unit tests
          to assess task completion and provides two metrics
          to measure performance: 1) Task Goal Completion                         Figure 8: Experience example on AppWorld.
          (TGC) measures percentage of tasks for which the
          agent passes all evaluation tests; 2) Scenario Goal               code, with slight prompt modifications to extract
          Completion (SGC) is the percentage of scenarios                   procedural memories.
          where the agent passes all the unit tests for all tasks
          from that scenario. In our experiments, we report                 C     Implementation Details
          Task Goal Completion metric, which naturally re-
          flects task success rate.                                         C.1     For Experience Acquisition
                                                                            First, we sample trajectories N = 8 times for each
          B       Baseline Details
                                                                            task query to obtain a diverse set of potential solu-
          LangMem LangMem (LangChain, 2025) is                              tions including both high-reward and low-reward
          Langchain’s long-term memory module that ex-                      results. Next, within each group corresponding
          tracts and stores key information from conversa-                  to the same task, all trajectories are sorted by
          tions for future retrieval. It provides both functional           their rewards and only the lowest-scoring and
          primitives compatible with any storage system and                 highest-scoring examples are selected to the fol-
          native integration with LangGraph’s storage layer,                lowing experience acquisition.
          enabling agents to continuously improve. In our ex-               • Success Pattern Recognition: Successful tra-
          periments, we adopt LangMem’s implementation                        jectories are defined as those exceeding a pre-
          of episodic memory2 , which helps the agent learn                   defined score threshold (empirically set to 1.0).
          from experience.                                                    Then, we prompt LLMsumm to identify the key
          A-Mem A-Mem (Xu et al., 2025) is a system de-                       point that contributes to the task success.
          signed to provide LLM agents with agentic mem-                    • Failure Analysis: Conversely, failed trajectories
          ory, allowing them to autonomously manage their                     trigger failure analysis by prompting LLMsumm
          own long-term knowledge. It constructs a memory-                    to determine the earliest key step that leads to
          centric knowledge graph for agents, actively decid-                 suboptimal outcomes.
          ing what information to store, recall, and update                 • Comparative Insight Generation: When the
          based on their goals and interaction. In our experi-                reward gap exists between the chosen two tra-
          ments, we reproduce A-Mem using its open-source                     jectories, we prompt LLMsumm to articulate
              2
              https://langchain-ai.github.io/langmem/guides/extract_          which specific decision or action distinguishes
          episodic_memories/                                                  higher-scoring from lower-scoring attempts.

                                                                       11
                               Trajectory-level Experience                                                             Keypoint-level Experience
    when to use: When a user needs to assess the current market status and make informed                  when to use: When a user wants to place an order for a
    trading decisions, such as buying or canceling an order.                                              stock but without providing a specific price.
    experience content:                                                                                   experience content: The assistant demonstrated a methodical
    1. Retrieve the current time using `get_current_time`.                                                approach by first retrieving the current stock price using
    2. Use the retrieved time to update and obtain the market status via `update_market_status`.          get_stock_info and then using that price in the place_order
    3. If the market is open and the user decides to trade, use `place_order` to execute the trade.       function. This two-step process ensures compliance with the
    4. If the user requests cancellation, call `cancel_order` with the appropriate order ID.              required parameters of the place_order function while
    5. Provide updates on account details through `get_account_info` if requested by the user.            aligning with the user's intent for a market-price-based order.



                       Figure 9: Comparison of trajectory-level and keypoint-level experience granularity.

                                    Trajectory-level Experience                                                       Keypoint-level Experience
   Three example prompts for experience acquisi- and usage scenario)                                                      across
                                                                                                          when to use: When           threeto place
                                                                                                                               a user wants      modelan orderscales
     when to use: When a user needs to assess the current market status and make informed
tion are
     tradingshown        in asTable
             decisions, such    buying or6, 7     and
                                          canceling  an 8.
                                                        order.To filter out            (Qwen3–8B,for         a stock but without providing a specific price.
                                                                                                           Qwen3–14B,               and    Qwen3–32B)
                                                                                                          content: The assistant demonstrated a methodical       on
     content:                                                                                             approach by first retrieving the current stock price
the 1. Retrieve
    generated         invalid
                 the current      experiences,
                              time using                 we employ the
                                         `get_current_time`.                            the BFCL-V3using    benchmark            under
                                                                                                                get_stock_info and         thethat
                                                                                                                                    then using   ReMe(fixed)
                                                                                                                                                     price in
     2. Use the retrieved time to update and obtain the market status via `update_market_status`.
                                                                                                          the place_order function. This two-step process
LLM-as-a-Judge
     3. If                 prompt
           the market is open and       in decides
                                   the user  Tableto9trade,
                                                          forusevalidation.             setting.
                                                                   `place_order` to execute the trade. Consistent       with     the   trends      observed in
                                                                                                          ensures compliance with the required parameters of
     4. If the user requests cancellation, call `cancel_order` with the appropriate order ID.
                                                                                        Figure            the place_order   functionmethods
                                                                                                                                    while aligning with the as raw
     5. Provide updates on account details through `get_account_info` if requested by the   user. 3, simple        indexing                        such
                                                                                                          user's intent for a market-price-based order.
C.2 For Experience Retrieval
                                                                                        task query and query keywords generally yield
When a new task is received, LLMexecute retrieves                                       lower performance. In contrast, LLM-generated
relevant experiences Er by matching the current                                         retrieval keys, particularly the usage scenario field,
task’s query qnew against the usage scenario field                                      exhibit consistently strong results across all mod-
w of stored experiences:                                                                els, achieving the highest or near-highest Avg@4
           Er = arg top [simcos (Ei , qnew )] .
                                  k                                          (2) and Pass@4 scores.
Here, simcos stands for the computation of co-                                             Model                 Retrieval Key                Avg@4          Pass@4
sine similarity between embeddings. In our exper-                                                                task query                   44.00%         63.33%
iments, past experiences are indexed using vector                                                                generalized query            42.50%         63.77%
                                                                                           Qwen3-8B
representations of the usage scenario field ϕ(w),                                                                query keywords               44.22%         65.33%
obtained from Qwen3-Embedding model ϕ(·).                                                                        usage scenario               44.50%         65.77%

                                         ϕ(w) · ϕ(qnew )                                                         task query                   50.11%         71.77%
       simcos (E, qnew ) =                                                   (3)                                 generalized query            50.49%         72.22%
                                        ∥ϕ(w)∥ ∥ϕ(qnew )∥                                  Qwen3-14B
                                                                                                                 query keywords               51.16%         71.11%
   In Section 4.3, we also explore more indexing                                                                 usage scenario               51.89%         72.44%
strategies for experience storage. The example in                                                                task query                   56.22%         72.22%
Figure 6 illustrates the differences among these                                                                 generalized query            55.33%         73.33%
                                                                                           Qwen3-32B
retrieval keys.                                                                                                  query keywords               56.89%         74.44%
                                                                                                                 usage scenario               56.05%         74.89%
D       Experience Examples
                                                                                                      Table 5: Ablation study of retrieve keys.
ReMe focuses on extracting keypoint-level expe-
riences from historical trajectories, with exam-
ples for BFCL-V3 and AppWorld illustrated in
Figure 7 and 8, respectively. To further inves-
tigate the impact of experience granularity, we
compare trajectory-level and keypoint-level acqui-
sition, as described in Section 4.3. In Figure 9,
we contrast the structural and content character-
istics of the two granularity levels, showing how
trajectory-level captures exhaustive procedural de-
tails, while keypoint-level emphasizes critical ac-
tions and omits less relevant steps.

E       Additional Experimental Results
E.1       Retrieval Key Analysis
Table 5 compares four retrieval key strategies
(task query, generalized query, query keywords,

                                                                                   12
Example Prompt for Success Pattern Recognition

You are an expert AI analyst reviewing successful step sequences from an AI agent execution.

Your task is to extract reusable, actionable step-level experiences that can guide future agent
executions.
Focus on identifying specific patterns, techniques, and decision points that contributed to success.

ANALYSIS FRAMEWORK:
• STEP PATTERN ANALYSIS: Identify the specific sequence of actions that led to success
• DECISION POINTS: Highlight critical decisions made during these steps
• TECHNIQUE EFFECTIVENESS: Analyze why specific approaches worked well
• REUSABILITY: Extract patterns that can be applied to similar scenarios

EXTRACTION PRINCIPLES:
• Focus on TRANSFERABLE TECHNIQUES and decision frameworks
• Frame insights as actionable guidelines and best practices

# Original Query
{query}

# Step Sequence Analysis
{step_sequence}

# Context Information
{context}

# Outcome
This step sequence was part of a successful trajectory.

OUTPUT FORMAT:
Generate 1-3 step-level success insights as JSON objects:
```json
[
  {{
   “when_to_use” : “Specific conditions when this success insight should be applied”,
   “task_query” : “Identify the specific task query from the original trajectory that this success
experience is most closely related to. Extract the exact query text.”,
   “generalized_query” : “Abstract the specific task query to create a more generalized task
representation.”,
   “experience” : “Detailed description of the successful step pattern and why it works”,
   “tags” : [“relevant", “keywords", “from", “the", “task", “query"],
   “confidence” : 0.8,
   “tools_used” : [“list", “of", “tools"]
  }}
]
```

                     Table 6: Example prompt for success pattern recognition.




                                               13
Example Prompt for Failure Analysis

You are an expert AI analyst reviewing failed step sequences from an AI agent execution.

Your task is to extract learning experiences from failures to prevent similar mistakes in future
executions.
Focus on identifying error patterns, missed opportunities, and alternative approaches.

ANALYSIS FRAMEWORK:
• FAILURE POINT IDENTIFICATION: Pinpoint where and why the steps went wrong
• ERROR PATTERN ANALYSIS: Identify recurring mistakes or problematic approaches
• ALTERNATIVE APPROACHES: Suggest what could have been done differently
• PREVENTION STRATEGIES: Extract actionable insights to avoid similar failures

EXTRACTION PRINCIPLES:
• Extract GENERAL PRINCIPLES as well as SPECIFIC INSTRUCTIONS
• Focus on PATTERNS and RULES as well as particular instances

# Original Query
{query}

# Step Sequence Analysis
{step_sequence}

# Context Information
{context}

# Outcome
This step sequence was part of a failed trajectory.

OUTPUT FORMAT:
Generate 1-3 step-level failure prevention insights as JSON objects:
```json
[
  {{
   “when_to_use” : “Specific situations where this lesson should be remembered”,
   “task_query” : “Identify the specific task query from the original trajectory that this lesson is
most closely related to. Extract the exact query text.”,
   “generalized_query” : “Abstract the specific task query to create a more generalized task
representation.”,
   “experience” : “Universal principle or rule extracted from the failure pattern”,
   “tags” : [“relevant", “keywords", “from", “the", “task", “query"],
   “confidence” : 0.8,
   “tools_used” : [“list", “of", “tools"]
  }}
]
```

                           Table 7: Example prompt for failure analysis.




                                                14
Example Prompt for Comparative Insights Generation

You are an expert AI analyst comparing higher-scoring and lower-scoring step sequences to extract
performance insights.

Your task is to identify the key differences between higher and lower performing approaches at the
step level.
Focus on what made the higher-scoring approach more effective, even when both approaches may
have had partial success.

SOFT COMPARATIVE ANALYSIS FRAMEWORK:
• PERFORMANCE FACTORS: Identify what specifically contributed to the higher score
• APPROACH DIFFERENCES: Compare methodologies and execution strategies
• EFFICIENCY ANALYSIS: Analyze why one approach was more efficient or effective
• OPTIMIZATION INSIGHTS: Extract lessons for improving performance

EXTRACTION PRINCIPLES:
• Focus on INCREMENTAL IMPROVEMENTS and performance optimization
• Extract QUALITY INDICATORS that differentiate better vs good approaches
• Identify REFINEMENT STRATEGIES that lead to higher scores
• Frame insights as PERFORMANCE ENHANCEMENT guidelines

# Higher-Scoring Step Sequence (Score: {higher_score})
{higher_steps}

# Lower-Scoring Step Sequence (Score: {lower_score})
{lower_steps}

OUTPUT FORMAT:
Generate 1-2 performance improvement insights as JSON objects:
```json
[
  {{
   “when_to_use” : “Specific scenarios where this performance insight applies”,
   “task_query” : “Identify the specific task query from the original trajectory that this
performance insight is most closely related to. Extract the exact query text.”,
   “generalized_query” : “Abstract the specific task query to create a more generalized task
representation.”,
   “experience” : “Detailed analysis of what made the higher-scoring approach more effective”,
   “tags” : [“relevant", “keywords", “from", “the", “task", “query"],
   “confidence” : 0.8,
   “tools_used” : [“list", “of", “tools"]
  }}
]
```

                  Table 8: Example prompt for comparative insights generation.




                                              15
Example Prompt for Experience Validation

You are an expert AI analyst tasked with validating the quality and usefulness of extracted
step-level experiences.

Your task is to assess whether the extracted experience is actionable, accurate, and valuable for
future agent executions.

VALIDATION CRITERIA:
• ACTIONABILITY: Is the experience specific enough to guide future actions?
• ACCURACY: Does the experience correctly reflect the patterns observed?
• RELEVANCE: Is the experience applicable to similar future scenarios?
• CLARITY: Is the experience clearly articulated and understandable?
• UNIQUENESS: Does the experience provide novel insights or common knowledge?

# Experience to Validate
Condition: condition
Experience Content: experience_content

OUTPUT FORMAT:
Provide validation assessment:
```json
{{
 “is_valid” : true/false,
 “score” : 0.8,
 “feedback” : “Detailed explanation of validation decision”,
 “recommendations” : “Suggestions for improvement if applicable”
}}
```
Score should be between 0.0 (poor quality) and 1.0 (excellent quality).
Mark as invalid if score is below 0.3 or if there are fundamental issues with the experience.



                       Table 9: Example prompt for experience validation.




                                              16
