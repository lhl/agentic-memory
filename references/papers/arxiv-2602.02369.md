<!-- Generated from arxiv-2602.02369.pdf via pdftotext -layout on 2026-02-22 -->

                                          Live-Evo: Online Evolution of Agentic Memory from Continuous Feedback

                                          Yaolun Zhang1,2,*           Yiran Wu2,3,*           Yijiong Yu1        Qingyun Wu2,3         Huazheng Wang1,2
                                                             1                                     2              3
                                                                 Oregon State University               AG2 AI         Penn State University
                                        {zhanyaol,yuyiji,huazheng.wang}@oregonstate.edu, ykw5399@psu.edu, qingyun@ag2.ai
                                                                                        *
                                                                                            Equal contribution.



                                                                  Abstract                                knowledge, and task-solving strategies to better ac-
                                                                                                          complish the tasks. Specifically, the knowledge and
                                              Large language model (LLM) agents are in-                   strategies learnt from past experiences are being




arXiv:2602.02369v1 [cs.AI] 2 Feb 2026
                                              creasingly equipped with memory, which are                  recognized as memory of agents (Jiang et al., 2024;
                                              stored experience and reusable guidance that
                                                                                                          Zhang et al., 2025b). These memory systems are
                                              can improve task-solving performance. Recent
                                              self-evolving systems update memory based on
                                                                                                          typically organized into multiple levels, ranging
                                              interaction outcomes, but most existing evolu-              from raw observations and interaction logs (Park
                                              tion pipelines are developed for static train/test          et al., 2023; Zhang et al., 2025b; Zhong et al., 2023)
                                              splits and only approximate online learning by              to higher-level summarized experiences and ab-
                                              folding static benchmarks, making them brit-                stract guidelines (Zhang et al., 2025a; Xu et al.,
                                              tle under true distribution shift and continuous            2025). During training, the agent can dynamically
                                              feedback. We introduce L IVE -E VO, an online               add, update, or remove memory entries based on
                                              self-evolving memory system that learns from a
                                                                                                          its interaction outcomes.(Chhikara et al., 2025a) At
                                              stream of incoming data over time. L IVE -E VO
                                              decouples what happened from how to use it                  test time, the agent leverages the evolved memory
                                              via an Experience Bank and a Meta-Guideline                 to guide decision-making on unseen tasks. These
                                              Bank, compiling task-adaptive guidelines from               agents equipped with memory learned consistently
                                              retrieved experiences for each task. To man-                outperform agents without memory evolution.
                                              age memory online, L IVE -E VO maintains ex-                   At the same time, memory evolution is inher-
                                              perience weights and updates them from feed-                ently an online problem. In realistic deployments,
                                              back: experiences that consistently help are
                                                                                                          an agent’s experience accrues sequentially, and its
                                              reinforced and retrieved more often, while mis-
                                              leading or stale experiences are down-weighted
                                                                                                          memory must be updated continually by adding
                                              and gradually forgotten, analogous to reinforce-            new evidence, revising outdated entries, and consol-
                                              ment and decay in human memory. On the live                 idating recurring patterns, rather than being rebuilt
                                              Prophet Arena benchmark over a 10-week hori-                from a static corpus. This perspective is closely re-
                                              zon, L IVE -E VO improves Brier score by 20.8%              lated to classic online and continual learning in tra-
                                              and increases market returns by 12.9%, while                ditional machine learning (Hoi et al., 2021), though
                                              also transferring to deep-research benchmarks               the mechanisms and objectives for agent memory
                                              with consistent gains over strong baselines.
                                                                                                          can differ. This shift raises a fundamental question:
                                              Visit our website for more details: https:
                                              //ag2ai.github.io/live-evo-page/.                           how can LLM agents evolve continuously as new
                                                                                                          data arrives?
                                          1   Introduction                                                   Live benchmarks like Prophet Arena (Yang et al.,
                                                                                                          2025) and FutureX (Zeng et al., 2025) exemplify
                                         Large Language Models (LLMs) have increasingly                   this paradigm by reframing agent evaluation as a
                                         been adopted as the backbone of agent systems, en-               longitudinal future prediction problem. In these
                                         abling agents to interact with external environments             benchmarks, agents are required to forecast proba-
                                         through tool usage and to solve complex, multi-                  bilities of upcoming events, and are evaluated using
                                         step tasks (Wu et al., 2023; Zhang et al., 2024;                 both calibration-based metrics (e.g., Brier scores)
                                         Wu et al., 2025, 2024). Recent work has proposed                 and decision-oriented outcomes such as real market
                                         self-evolving agents (ang Gao et al., 2025; Qiu                  returns. In contrast to static retrieval or reasoning
                                         et al., 2025; Long et al., 2025), which allow agents             tasks, future prediction needs the agent to evolving
                                         to learn from a training set by constructing tools,              during test time and continue adapt the memory to
                  On-time Memory Build                     ing historical insights with the current task. Act: it
                                                           performs ContrastiveEval by producing and com-
         Train Set                    Test Set
                                                           paring two independent predictions, one guided by
                                                           the compiled guideline and one as a memory-free
             Build                  Test
                                                           baseline, to quantify the contribution of the guide-
                       Memory                              line. Update: it updates experience weights based
                                                           on the observed performance gap; if the guideline
     Continuous Memory Evolving (Our Setting)              underperforms, the agent generates a new entry
                                                           for the Meta-Guideline Bank. Finally, to control
 Tasks     Week 1     Week 2   …           Week k          memory growth, L IVE -E VO summarizes trajecto-
                                                           ries from poorly solved cases into candidate expe-
         Update                     Test       Update      riences and commits them to the Experience Bank
                                              After test
                                                           only after re-evaluation confirms an improvement.
                       Memory                                 We evaluate L IVE -E VO on the Prophet
                                                           Arena (Yang et al., 2025) benchmark over a 10-
Figure 1: Traditional Self-Evolving Memory System          week horizon. Our results demonstrate that L IVE -
build memory on training dataset and test with the         E VO significantly outperforms static baselines,
evolved memory. While Live Self-Evolving Memory            achieving a 20.8% improvement in Brier Score
System build and learn to utilize Memory to tackle con-    and a 12.9% increase in market returns. Further-
tinuously new data.                                        more, L IVE -E VO exhibits strong generalization on
                                                           traditional deep-research benchmarks (Chen et al.,
                                                           2025), outperforming specialized state-of-the-art
totally new tasks. Figure 1 shows the difference           methods. Our ablation studies further confirm that
between traditional self-evolving memory and live          the components are essential for maintaining per-
self-evolving memory.                                      formance in online benchmarks.
   Only a few existing methods study memory for
online task streams (Wei et al., 2025b; Wang et al.,       2     Related Work
2024b). However, they approximate “online” learn-
ing by splitting static benchmarks into folds, and         2.1    Self-Evolving Agentic Memory Systems
therefore largely ignore distribution shift in truly       Memory transforms LLM agents into persistent,
streaming tasks. In contrast, live prediction bench-       adaptive systems capable of long-horizon task-
marks sample tasks from the real world, where              solving (Shan et al., 2025; Qian et al., 2024;
environments and markets continually change over           Yan et al., 2024) and life-long learning (Zheng
time. In this setting, success depends less on re-         et al., 2025; Wang et al., 2024a). Existing solu-
trieving more information and more on judiciously          tions follow a hierarchical evolution. Early meth-
leveraging past experience over time. Past experi-         ods (Zheng et al., 2024), rely on static retrieval.
ence can provide useful inductive bias, but it can         While effective for repetitive tasks, they suffer from
also become stale or misleading as patterns drift or       experience drift in changing environments (Hu
break.Syntax Warning (747803): Badly formatted number
Syntax Warning (748043): Badly formatted number
Syntax Warning (748963): Badly formatted number
Syntax Warning (749937): Badly formatted number
 Therefore, a self-evolving memory system            et al., 2025). To address this, recent memory sys-
must go beyond storage: it should actively curate          tems support high-level memory operations includ-
experiences and learn when and how to use them.            ing forgetting (Liang et al., 2025; Zhong et al.,
   We introduce L IVE -E VO, a self-evolving agen-         2024), building knowledge networks(Xu et al.,
tic memory system designed for continuous task             2025), and introducing heterogeneous memory
streams. L IVE -E VO learns not only what happened         structures (Chhikara et al., 2025b). Furthermore,
before, but also how to use experience by main-            some tasks focus on learn experience for task solv-
taining an Experience Bank and a Meta-Guideline            ing, B OT (Yang et al., 2024) synthesize high-level
Bank. For each incoming task, the agent executes           heuristics from past trajectories, E XPE L (Zhao
a four-stage loop. Retrieve: it generates search           et al., 2024) turns past trajectories into reusable
queries to retrieve relevant question–experience           experiences, and Agent Workflow Memory (Wang
pairs. Compile: it compiles retrieved experiences          et al., 2024c) record the action sequence of success-
into a task-specific guideline, instructed by Meta-        ful task. However, none of them focus on evolving
Guidelines that encode meta-heuristics for combin-         on live benchmarks.
                                                                        Live-Evo Agent
                                                                                Continual Memory Update
           Inference                                   Experience
                                  Combine Exp and        Bank                    Results with & without Guideline
                                     Question
                                                       Experience 1
    Question: Who
                                                                           Update Exp
                      Active
                                                           …
    will win the                                       Experience 2                        Calculate margin
                                                                             Weight
    Lakers vs.        Search
    Mavericks
    game in LA on                                        New Exp               Gain new
    Nov 28?                                                                   experience        Is bad
                                                                               True              case
                    Synthesized                      Meta-Guideline
                     Guideline      Guideline            Bank
                                                                                               w/ guide
    Answer with                                                                                is better
    Guideline                                        Meta-Guideline 1
                                          Guide

                                                           …
                                                     Meta-Guideline 2
                                        Generation
                                                                            Reflect & Learn how
                                                                             to use Experience
                                                      New Meta-Guide
                                                                                  False




Figure 2: Structure of Live-Evo Agent. Given a question, the Live-Evo Agent will first search relevant experiences
and generate a guideline based on the experiences, current task. Also, the generation will augmented by the
meta-guideline bank, which teaches the agent how to combine experiences with current task. Inside the agent,
the memory update mechanism continually updating experiences’ weights and verifying new experiences and
meta-guidelines.


2.2     Live Benchmarks                                     prior memory systems that primarily store expe-
Traditional static benchmarks are released at a fixed       riences and abstract them into static summaries,
time and evaluate models on a closed dataset (Wei           L IVE -E VO continuously optimizes how past ex-
et al., 2025a; Zhang et al., 2024). However, such           perience is used over time, updating its memory
benchmarks inevitably suffer from data leakage              policies as new data arrives and grounding each
over time. To address this issue, several evaluation        update in ongoing environmental feedback.
frameworks adopt a live setting by continuously in-            L IVE -E VO composes of two memory banks: an
troducing new tasks to assess models’ general capa-         Experience Bank E and a Meta-Guideline Bank M.
bilities (Contributors, 2023; Xu et al., 2023). Other       The Experience Bank stores past task interactions
approaches rely on live human feedback for evalu-           in a structured, reusable form. When queried, the
ation (Chiang et al., 2024). More recent live bench-        agent does not simply append retrieved trajecto-
marks release new tasks over time, providing a con-         ries into the prompt; instead, it applies a learned
tinuous evaluation stream for specific tasks. For ex-       procedure that distills retrieved experiences into
ample, LiveCodeBench (Jain et al., 2024) regularly          task-relevant signals and actionable guidance, mak-
releases new coding problems each quarter. Emerg-           ing the memory system’s inductive bias explicit.
ing future prediction benchmarks, such as Prophet           Complementarily, the Meta-Guideline Bank stores
Arena (Yang et al., 2025) and FutureX (Zeng et al.,         higher-level composition instructions, which meta-
2025), introduce real-world tasks on a weekly basis,        guidelines that specify how to transform retrieved
offering an ideal testbed for self-evolving agents.         experiences into a task-adaptive guideline under
                                                            different conditions. Together, these two banks
3     Method                                                separate what happened before (experience) from
We introduce L IVE -E VO, an agentic memory sys-            how to use it (guideline), enabling memory usage
tem explicitly designed for true live benchmarks,           to improve over time as new tasks arrive.
where tasks arrive sequentially and feedback is re-           We formalize the self-evolving agentic memory
vealed over time (See Figure 2). In contrast to             system as a closed-loop decision process over the
 Algorithm 1: L IVE -E VO
     Input: Task stream batch Q; Experience bank E with weights {we }; Meta-guideline bank M; Bad-case fraction ρ
     Output: Updated E, M
 1 foreach q ∈ Q do
 2     Eq , m̂ ← R ETRIEVE(q, E, M)                  // Retrieve: top-k experiences + selected meta-guideline
 3     gq ← C OMPILE G UIDELINE(q, Eq , m̂)           // Compile: LLM produces task-specific memory guideline
 4     rqon , rqoff , τq ← C ONTRASTIVE E VAL(q, gq )        // Act: scores w/ and w/o memory; keep memory-on
         trajectory τq
       // Update
 5     WEq ← U PDATE W EIGHTS(WEq , rqon − rqoff )                  // update weights of selected experiences
 6     if rqon − rqoff ≤ 0 then
 7            M ← M ∪ {R EFLECT(q, gq , Eq )}                            // add new meta-guideline on failure
 8     end
 9 end
   // Update
                                     on
10 Qbad ← S ELECT W ORST (Q, {rq }, ρ)                        // worst ρ fraction of tasks solved with memory
11 foreach q ∈ Qbad do
12     enew
         q    ← S UMMARIZE(q, τq )             // summarize new experience from stored memory-on trajectory
13     if E VAL(q, enew         on
                         q ) > rq then
14            E ← E ∪ {enew   q }              // re-evaluate with new experience and commit if it improves
15     end
16 end

17   return E, M



memory banks. For each new task batch, the agent               the agent to retrieve relevant information from mul-
operates through four stages:                                  tiple dimensions, which contrasts with traditional
                                                               search actions by allowing the agent to seek struc-
       {R ETRIEVE, C OMPILE, ACT, U PDATE}.                    tural analogies or reasoning patterns rather than
                                                               simple semantic overlaps, granting the agent higher
   Given a task, the agent first actively search its           autonomy in defining what constitutes "relevant"
own memory to retrieve relevant experiences and                information for a complex forecasting query. We
the meta guideline. Then the agent compiles a                  retrieve the top-k experiences. Each experience is
guideline based on the meta instruction, the re-               ranked by the following score:
trieved experiences and the task. The agent then
solves the task with the compiled guideline. Fi-                      Score = W eight ∗ Sim(exp, query)
nally, the trajectory and result of solving this task
                                                               When calculating the score, we not only consider
will be used to update the memory, including the
                                                               the similarity between experiences and queries, but
experience bank and the meta guideline bank. Next
                                                               also multiply it by an experience weight that is
we explain each stage of L IVE -E VO in detail (also
                                                               updated during the evolution cycle.
see Algorithm 1).
                                                               3.2    Compile
3.1     Retrieve
                                                               The agent transforms retrieved experiences into
Given a task q, the agent A first retrieves potentially
                                                               task-adaptive guidance:
relevant experiences and also a meta guidelines:
                                                                      g = C OMPILE G UIDELINE(q, Eq , m̂).
            Eq , m̂ ← R ETRIEVE(q, E, M)
                                                               C OMPILE G UIDELINE operationalizes the role of
   We note that the task will not be used directly to          the Guideline Bank: it selects and applies a meta-
query the bank. Instead, the agent generates queries           guideline m̂ to turn the retrieved experience set Eq
from the given task for both question matching                 into an executable, task-specific guideline g for the
and experience-content matching. While existing                current task q. Concretely, given Eq , L IVE -E VO
systems retrieve through similarity matching (Xu               performs meta-cognitive compilation by (i) extract-
et al., 2025; Park et al., 2023)) or active exploration        ing cross-experience regularities, (ii) grounding
strategies (e.g., in which the agent probes the mem-           them in the current task context, and (iii) instantiat-
ory bank iteratively) (Chhikara et al., 2025a; Long            ing a guideline g conditioned on m̂ to steer down-
et al., 2025), our active retrieval design enables             stream decision making.
  In contrast, prior approaches typically either con-   criminately storing every trajectory. We identify
catenate retrieved logs as additional context or rely   the worst-performing fraction of tasks under the
on fixed abstraction operators (e.g., summaries or      memory-on setting and generate a candidate expe-
heuristic rules) that remain static and do not im-      rience by summarizing and reflecting on the stored
prove from online feedback (Wang et al., 2024b;         trajectory. We then re-evaluate the task with this
Xu et al., 2025).                                       candidate experience, and commit it to the experi-
                                                        ence bank only if it yields a statistically significant
3.3   Act                                               improvement over the original memory-on score.
Conditioned on the task and the derived guideline,      This selective write-back controls memory growth
the agent executes a policy:                            while ensuring that new entries are justified by mea-
                                                        surable gains.
               rq , τq = ACT(q | g),
where τq denotes the trajectory, and rq denotes
                                                        4     Experiment
the resulting outcome signal. The structure of r        4.1    Setup
depends on the evaluation regime. In traditional        We evaluate L IVE -E VO on Prophet Arena (Yang
reasoning or search benchmarks, r is often binary,      et al., 2025), a future-prediction benchmark span-
reflecting task success or failure. In contrast, on-    ning the latest 10 weeks with 500 tasks in total.
line benchmarks (e.g. Yang et al. (2025)) yield         Each task contains a question, a candidate list, and
continuous feedback. These dense signals provide        a bid-price snapshot taken 6 hours before close,
a richer learning substrate for memory evolution        which we use to compute returns relative to mar-
than sparse correctness-based rewards.                  ket consensus. We enforce strict time-based re-
   For every task, we additionally conduct a con-       trieval on google-search tool to prevent informa-
trastive evaluation to measure the causal impact        tion leakage past the close time. We also evaluate
of retrieved experience at action time. Concretely,     on Xbench-DeepResearch (Chen et al., 2025) to
we execute the agent again without the compiled         assess generalization beyond future prediction. We
guideline. We then compare the resulting outcomes       split the benchmark into 10 folds, learn experience
to quantify whether memory usage provides a net         sequentially across folds, and report the overall
benefit on that task. This comparison will later be     average accuracy.
used to update memory.                                     We use GPT-4.1-mini as the backbone
3.4   Update                                            model for most experiments if not specified.
                                                        All experiments use a temperature=0.2,
Finally, the agent incorporates new experience into
                                                        with                   bad_case_percentile=0.3,
the memory bank. The update mechanism gov-
                                                        min_brier_improvement=0.05, and experience
erns how experience accumulates over time and
                                                        _similarity_threshold=0.5.
is grounded in objective environmental feedback.
Concretely, from Contrastive Evaluation we obtain       Metrics. For XBench-DeepResearch, we use ac-
the empirical gain of using the compiled guideline      curacy as metrics. For Prophet Arena, we use
relative to the memory-free baseline. This gain is      Brier Score and Market Return as metrics. Given
used to adjust the retrieval weights of the selected    a query q and a set of candidate outcomes C =
experiences: when the guideline improves perfor-        {c1 , . . . , cK }, the agent outputs probabilities of
mance, the corresponding experience weights are         each candidates p̂ = (p̂1 , . . . , p̂K ) over the out-
increased; when it harms performance, the weights       comes. Let y ∈ {0, 1}K denote the realized out-
are decreased. This reinforcement-and-decay dy-         come and m = (m1 , . . . , mK ) the corresponding
namic is analogous to human memory, where use-          prediction market prices. We report the multiclass
ful experiences are strengthened through repeated       Brier score as a calibration metric. A lower Brier
success while misleading or outdated ones are grad-     score indicates that the predicted probabilities are
ually suppressed. In addition, failures trigger a re-   closer to the true real-world outcomes.
flection step that produces a new meta-guideline,                             K
                                                                              X
which is added to the meta-guideline bank to im-                       BS =     (p̂k − yk )2 ,             (1)
prove future guideline compilation.                                           k=1
   After processing a batch, we further perform         We also compute the market return to quantify the
selective experience acquisition rather than indis-     advantage of L IVE -E VO over market-based base-
     Model                         W1      W2     W3       W4       W5     W6      W7     W8      W9     W10    Avg
     Base Model
     GPT-4.1-mini                  0.18   0.20    0.31     0.18     0.24   0.26    0.23   0.25   0.23    0.15   0.22
     Deep Research Methods
     MiroFlow                      0.28   0.08    0.53     0.44     0.40   0.43    0.27   0.33   0.26    0.22   0.32
     Qwen Deep Research            0.17   0.22    0.23     0.15     0.22   0.22    0.21   0.19   0.20    0.13   0.20
     Live-Evo (w/o Experience)     0.18   0.24    0.20     0.13     0.27   0.19    0.22   0.22   0.13    0.11   0.19
     Self-Evolving Memory Methods
     ReMem                    0.19        0.23    0.14     0.11     0.21   0.18    0.19   0.17   0.15    0.11   0.16
     Live-Evo (ours)          0.19        0.17    0.16     0.10     0.17   0.12    0.19   0.15   0.13    0.10   0.14

          Table 1: Brier Score (Lower the better) on Prophet-Arena - Weekly Performance Comparison




  (a) Cumulative Portfolio Value (Invest $100 Per Week)                           (b) Brier Score Comparison

Figure 3: Performance Analysis Comparison. (a) shows the cumulative portfolio value, and (b) shows the Brier
score comparison.


lines. The return is obtained by taking a unit long               jectories and retrieves relevant memories at test
position on outcome ck whenever the predicted                     time.
probability p̂k exceeds the market-implied proba-
bility mk :                                                       4.2    Main Results

               K
                                                                  Table 1 reports the Brier scores over the most recent
                                                                  10 weeks of the Prophet Arena benchmark. All
               X
         R=          I[p̂k > mk ] (yk − mk ).            (2)
               k=1
                                                                  methods use GPT-4.1-mini as the foundation model.
                                                                  We compare our method against a Base Model and
Baselines. We compare L IVE -E VO with the fol-                   several open-source Deep Research frameworks.
lowing methods as baselines. (1) Base Models                      We do not include closed-source Deep Research
. We retrieve the top-10 web search results for                   systems as baselines, because their search tools do
each query and provide the model with a sum-                      not support strict time-based filtering.
marized version of these websites generated by
the model itself. The model is then required to                   Result Analysis The results demonstrate that
output the probability distribution based on this                 our agent achieves state-of-the-art performance in
static information. (2) Deep Research Methods.                    terms of the average Brier score, and outperforms
We evaluate two representative open-source frame-                 all baselines in the majority of individual weeks.
works, Qwen Deep Research (Team et al., 2025)                        Open-source Deep Research methods perform
and MiroFlow (Team, 2025) which support multi-                    relatively poorly on this benchmark. This is ex-
ple tools and complex multi-agent workflows. We                   pected, as they are optimized for discovering partial
also evaluate L IVE -E VO without experience, rep-                clues or supporting evidence, rather than producing
resenting the base search agent without evolution.                calibrated probabilistic forecasts of future events.
(3) Self-Evolving Memory Systems. ReMem (Wei                      In practice, these methods are often misled by in-
et al., 2025b): a self-evolving agent baseline that               complete or temporally fragile signals.
constructs summarized experiences from raw tra-                      The ReMem baseline shows a consistent im-
Table 2: Generalization of L IVE -E VO across different foundation models. We report Brier score (lower is better)
and cumulative market return (higher is better), along with relative improvements over the corresponding base
agents.

                                                        Brier Score (↓)    Market Return (↑)
                      Base Model      Method
                                                        Value    Imp.      Value     Imp.
                                      Base (w/o Mem)    0.19       –        1.24      –
                      GPT-4.1-mini
                                      Live-Evo          0.14     20.8%      1.46    12.9%
                                      Base (w/o Mem)    0.18       –        1.13       –
                      GPT-4.1
                                      Live-Evo          0.17     3.0%       1.18     4.4%
                                      Base (w/o Mem)    0.16       –        1.34       –
                      GPT-5-mini
                                      Live-Evo          0.15     4.5%       1.36     1.6%
                                      Base (w/o Mem)    0.19       –        1.20       –
                      Qwen3-8B
                                      Live-Evo          0.18     3.5%       1.21     0.5%



provement over the static Base Model (GPT-4.1-             Table 3: Acc. on Xbench-DeepResearch. All methods
mini), indicating that incorporating self-evolving         are tested with GPT-4.1-mini.
memory is beneficial for future prediction. How-
ever, its performance remains weaker than Live-                           Methods                Acc
Evo, highlighting the importance of actively man-                         Qwen-DeepResearch      0.43
aging and adapting experiences. These results con-                        MiroFlow               0.45
firm that our design more effectively leverages past                      ReMem                  0.40
experience under continuously evolving, real-world                        Live-Evo (ours)        0.46
conditions.

Performance Comparison We compare L IVE -                  compare L IVE -E VO against its corresponding base
E VO with its underlying base search agent which           agent without experience.
isolates the contribution of the proposed experience          Across all evaluated models, L IVE -E VO consis-
management system.                                         tently improves both Brier score and market return.
   Figure 3a illustrates the cumulative market re-         These results demonstrate that the proposed experi-
turns under a simplified investment strategy. As-          ence management mechanism is broadly compati-
suming an investment of $100 per week, L IVE -             ble with heterogeneous backbone models and does
E VO achieves a $150 higher return over the 10-            not rely on model-specific heuristics.
week period. Notably, the performance gap be-                 Notably, the largest relative improvement is ob-
tween the two agents widens over time, indicat-            served with GPT-4.1-mini. This behavior is ex-
ing that L IVE -E VO continuously improves its de-         pected for two reasons. First, weaker base models
cision quality as more experience is accumulated.          exhibit greater headroom for improvement. Second,
Figure 3b further reports the weekly Brier scores.         they generate more frequent failure cases during
L IVE -E VO consistently outperforms the base agent        early weeks, which in turn provide richer supervi-
across all weeks. The improvement is particularly          sory signals for experience correction and guideline
pronounced during periods where the base agent             refinement. In contrast, stronger models such as
exhibits poor calibration, such as Weeks 5 and 6.          GPT-5-mini already produce well-calibrated pre-
These results suggest that L IVE -E VO can stabilize       dictions, leaving less room for further gains.
predictions under difficult or volatile conditions.
                                                           4.4   Results on Deep Research Benchmark
4.3   Additional Results with Different Models            Although L IVE -E VO is not specifically designed
To evaluate the robustness of L IVE -E VO across          for traditional deep research tasks, it nevertheless
foundation models of varying capacity and prove-          demonstrates competitive and consistent advan-
nance, we conduct experiments on Prophet Arena            tages over both deep research frameworks and prior
with GPT-4.1-mini, GPT-4.1, GPT-5-mini, and               self-evolving memory methods.
Qwen3-8B, covering both closed-source and open-              As shown in Table 3, L IVE -E VO achieves
source models (See Table 2). For each model, we           the highest accuracy among all evaluated meth-
Table 4: Ablation Study Relative to the Full-Memory Model. Color intensity indicates the magnitude of relative
change compared to the full-memory setting.

                       Setting                              Avg. Brier           Change (%) ↓           Avg. Return   Change (%) ↑
                       Live-Evo                                0.14                   –                    1.46             –
                       w/o weight-update                      0.17                 +17.01%                 1.34          -8.01%
                       w/o meta-guideline                     0.16                 +10.88%                 1.41          -3.42%
                       w/o guideline-compile                  0.16                 +11.56%                 1.16         -20.40%
                       w/o active-retrieve                    0.17                 +14.97%                 1.22         -16.77%


  Question: Which professional MLS soccer team, Miami or Chicago Fire, will win the
  match scheduled for Aug 30, 2025 after 90 minutes plus stoppage time?
  Experience : For future match outcome predictions, incorporate dynamic and recent data
  such as last 5-10 matches' form, injury reports, lineup announcements, and tactical
  changes…


  Question: What will Zohran Mamdani say during the Bernie Sanders 'Fighting the
  Oligarchy' tour stop on Saturday 9/6?
  Experience : Emphasize identification and weighting of named entities and concrete topics
  mentioned explicitly in the speech…



Figure 4: Case Study. The figure contrasts a high-weight experience (green), which provides reusable methods,
with a low-weight experience (red), which contains hallucinations, and shows how their weights evolve weekly.


ods. Compared to specialized deep research sys-                                               4.6    Case Study
tems such as Qwen-DeepResearch and MiroFlow,                                                  To illustrate how the weight-update mechanism
LiveEvo attains superior performance despite lack-                                            operates in practice, we analyze experiences with
ing task-specific heuristics for evidence exploration.                                        the lowest and highest learned weights. In Fig-
This suggests that experience management learned                                              ure 4, the red box highlights a low-weight experi-
under live and non-stationary conditions general-                                             ence that contains a clear hallucination: the expe-
izes beyond future prediction, benefiting broader                                             rience suggests retrieving the content of a speech,
reasoning tasks.                                                                              whereas the task requires predicting the outcome of
                                                                                              the speech. Such mismatches lead to consistently
                                                                                              poor downstream performance and are therefore
4.5    Ablation Study                                                                         downweighted over time.
                                                                                                 In contrast, the green box corresponds to a high-
                                                                                              weight experience that provides a reusable and task-
We conduct ablation studies to assess the contribu-
                                                                                              aligned guideline, recommending the analysis of
tions of key components in L IVE -E VO (Table 4).
                                                                                              recent match forms. This experience consistently
Removing any single module consistently degrades
                                                                                              supports accurate predictions and is thus reinforced
performance in both Brier Score and market return,
                                                                                              by the weight-update mechanism.
indicating that each component is non-trivial: w/o
                                                                                                 This case study demonstrates that L IVE -E VO
weight-update fixes all experience weights, w/o
                                                                                              can progressively filter out low-quality or mislead-
meta-guideline removes meta-guidance bank for
                                                                                              ing experiences by reducing their weights, while
guideline generation, w/o guideline-synthesis di-
                                                                                              amplifying high-quality, transferable experience.
rectly uses retrieved experiences, and w/o active-
                                                                                              As a result, the agent learns to rely on increasingly
retrieve queries memory using only the question.
                                                                                              reliable guidance, leading to improved future pre-
Among these variants, disabling guideline synthe-
                                                                                              diction performance.
sis causes the largest drop in market return, under-
scoring the importance of converting accumulated                                              5     Conclusion
experience into actionable guidance, while remov-
ing active retrieval or adaptive weight updates also                                          We introduced Live-Evo, the first online-evolving
leads to substantial degradation. Overall, the results                                        agentic memory system specifically designed for
show that Live-Evo’s improvements stem from the                                               benchmarks with continuous, real-world feed-
synergistic interaction of its components rather                                              back. By employing a four-stage evolutionary
than any single design choice.                                                                loop:Retrieve, Compile, Act, and Update, the sys-
tem dynamically learns to optimize how past expe-        OpenCompass Contributors. 2023. Opencompass:
riences are transformed into task-adaptive guidance.       A universal evaluation platform for foundation
                                                           models.   https://github.com/open-compass/
Our evaluation on the Prophet Arena benchmark
                                                           opencompass.
demonstrates that L IVE -E VO achieves significant
improvement over strong baselines. Furthermore,          Steven CH Hoi, Doyen Sahoo, Jing Lu, and Peilin Zhao.
the system exhibits robust generalization on deep-          2021. Online learning: A comprehensive survey.
                                                            Neurocomputing, 459:249–289.
research benchmarks. These results underscore
the vital role of feedback-driven experience man-        Yuyang Hu, Shichun Liu, Yanwei Yue, Guibin Zhang,
agement in building persistent, adaptive agentic           Boyang Liu, Fangyi Zhu, Jiahang Lin, Honglin Guo,
systems for non-stationary environments.                   Shihan Dou, Zhiheng Xi, Senjie Jin, Jiejun Tan, Yan-
                                                           bin Yin, Jiongnan Liu, Zeyu Zhang, Zhongxiang
                                                           Sun, Yutao Zhu, Hao Sun, Boci Peng, and 28 others.
6   Limitations                                            2025. Memory in the age of ai agents. Preprint,
                                                           arXiv:2512.13564.
While L IVE -E VO achieves strong performance,
its design introduces several potential constraints.     Naman Jain, King Han, Alex Gu, Wen-Ding Li, Fanjia
First, its reliance on the dense environment feed-         Yan, Tianjun Zhang, Sida Wang, Armando Solar-
back ensures robust calibration but may limit appli-       Lezama, Koushik Sen, and Ion Stoica. 2024. Live-
                                                           codebench: Holistic and contamination free evalu-
cability in settings with sparse or subjective feed-       ation of large language models for code. Preprint,
back. Second, the Verify Before Update protocol            arXiv:2403.07974.
strictly admits new experiences only with statisti-
cally significant gains, which can delay the adop-       Xun Jiang, Feng Li, Han Zhao, Jiahao Qiu, Jiaying
                                                           Wang, Jun Shao, Shihao Xu, Shu Zhang, Weiling
tion of subtle or emerging heuristics.                     Chen, Xavier Tang, and 1 others. 2024. Long term
                                                           memory: The foundation of ai self-evolution. arXiv
                                                           preprint arXiv:2410.15665.
References
                                                         Xuechen Liang, Yangfan He, Yinghui Xia, Xinyuan
Huan ang Gao, Jiayi Geng, Wenyue Hua, Mengkang Hu,         Song, Jianhui Wang, Meiling Tao, Li Sun, Xinhang
  Xinzhe Juan, Hongzhang Liu, Shilong Liu, Jiahao          Yuan, Jiayi Su, Keqin Li, Jiaqi Chen, Jinsong Yang,
  Qiu, Xuan Qi, Yiran Wu, Hongru Wang, Han Xiao,           Siyuan Chen, and Tianyu Shi. 2025. Self-evolving
  Yuhang Zhou, Shaokun Zhang, Jiayi Zhang, Jinyu           agents with reflective and memory-augmented abili-
  Xiang, Yixiong Fang, Qiwen Zhao, Dongrui Liu, and        ties. Preprint, arXiv:2409.00872.
  8 others. 2025. A survey of self-evolving agents:
  On path to artificial super intelligence. Preprint,    Lin Long, Yichen He, Wentao Ye, Yiyuan Pan, Yuan
  arXiv:2507.21046.                                        Lin, Hang Li, Junbo Zhao, and Wei Li. 2025. See-
                                                           ing, listening, remembering, and reasoning: A mul-
Kaiyuan Chen, Yixin Ren, Yang Liu, Xiaobo Hu, Hao-         timodal agent with long-term memory. Preprint,
  tong Tian, Tianbao Xie, Fangfu Liu, Haoye Zhang,         arXiv:2508.09736.
  Hongzhang Liu, Yuan Gong, Chen Sun, Han Hou,
  Hui Yang, James Pan, Jianan Lou, Jiayi Mao, Jizheng    Joon Sung Park, Joseph C. O’Brien, Carrie J. Cai,
  Liu, Jinpeng Li, Kangyi Liu, and 14 others. 2025.        Meredith Ringel Morris, Percy Liang, and Michael S.
  xbench: Tracking agents productivity scaling with        Bernstein. 2023.    Generative agents: Interac-
  profession-aligned real-world evaluations. Preprint,     tive simulacra of human behavior.         Preprint,
  arXiv:2506.13651.                                        arXiv:2304.03442.

Prateek Chhikara, Dev Khant, Saket Aryan, Taranjeet      Chen Qian, Yufan Dang, Jiahao Li, Wei Liu, Zihao
  Singh, and Deshraj Yadav. 2025a. Mem0: Building          Xie, YiFei Wang, Weize Chen, Cheng Yang, Xin
  production-ready ai agents with scalable long-term       Cong, Xiaoyin Che, and 1 others. 2024. Experien-
  memory. Preprint, arXiv:2504.19413.                      tial co-learning of software-developing agents. In
                                                           Proceedings of the 62nd Annual Meeting of the As-
Prateek Chhikara, Dev Khant, Saket Aryan, Taranjeet        sociation for Computational Linguistics (Volume 1:
  Singh, and Deshraj Yadav. 2025b. Mem0: Building          Long Papers), pages 5628–5640.
  production-ready ai agents with scalable long-term
  memory. arXiv preprint arXiv:2504.19413.               Jiahao Qiu, Xuan Qi, Tongcheng Zhang, Xinzhe Juan,
                                                            Jiacheng Guo, Yifu Lu, Yimin Wang, Zixin Yao, Qi-
Wei-Lin Chiang, Lianmin Zheng, Ying Sheng, Anasta-          han Ren, Xun Jiang, Xing Zhou, Dongrui Liu, Ling
  sios Nikolas Angelopoulos, Tianle Li, Dacheng Li,         Yang, Yue Wu, Kaixuan Huang, Shilong Liu, Hongru
  Hao Zhang, Banghua Zhu, Michael Jordan, Joseph E.         Wang, and Mengdi Wang. 2025. Alita: General-
  Gonzalez, and Ion Stoica. 2024. Chatbot arena: An         ist agent enabling scalable agentic reasoning with
  open platform for evaluating llms by human prefer-        minimal predefinition and maximal self-evolution.
  ence. Preprint, arXiv:2403.04132.                         Preprint, arXiv:2505.20286.
Lianlei Shan, Shixian Luo, Zezhou Zhu, Yu Yuan, and         Kang, and Zhenzhong Lan. 2023. Superclue: A com-
  Yong Wu. 2025. Cognitive memory in large language         prehensive chinese large language model benchmark.
  models. arXiv preprint arXiv:2504.02441.                  Preprint, arXiv:2307.15020.

MiroMind AI Team. 2025. Miroflow: A high-                 Wujiang Xu, Zujie Liang, Kai Mei, Hang Gao, Juntao
  performance open-source research agent framework.        Tan, and Yongfeng Zhang. 2025. A-mem: Agentic
  https://github.com/MiroMindAI/MiroFlow.                  memory for llm agents. Preprint, arXiv:2502.12110.

Tongyi DeepResearch Team, Baixuan Li, Bo Zhang,           Yikuan Yan, Yaolun Zhang, and Keman Huang. 2024.
  Dingchu Zhang, Fei Huang, Guangyu Li, Guoxin              Depending on yourself when you should: Mentoring
  Chen, Huifeng Yin, Jialong Wu, Jingren Zhou, and 1        llm with rl agents to become the master in cybersecu-
  others. 2025. Tongyi deepresearch technical report.       rity games. Preprint, arXiv:2403.17674.
  arXiv preprint arXiv:2510.24701.
                                                          Ling Yang, Zhaochen Yu, Tianjun Zhang, Shiyi Cao,
Guanzhi Wang, Yuqi Xie, Yunfan Jiang, Ajay Man-             Minkai Xu, Wentao Zhang, Joseph E Gonzalez,
  dlekar, Chaowei Xiao, Yuke Zhu, Linxi Fan, and An-        and Bin Cui. 2024. Buffer of thoughts: Thought-
  ima Anandkumar. 2024a. Voyager: An open-ended             augmented reasoning with large language models.
  embodied agent with large language models. Trans-         Advances in Neural Information Processing Systems,
  actions on Machine Learning Research.                     37:113519–113544.

Zora Zhiruo Wang, Jiayuan Mao, Daniel Fried, and          Qingchuan Yang, Simon Mahns, Sida Li, Anri Gu,
  Graham Neubig. 2024b. Agent workflow memory.              Jibang Wu, and Haifeng Xu. 2025. Llm-as-a-prophet:
  arXiv preprint arXiv:2409.07429.                          Understanding predictive intelligence with prophet
                                                            arena. Preprint, arXiv:2510.17638.
Zora Zhiruo Wang, Jiayuan Mao, Daniel Fried, and
  Graham Neubig. 2024c. Agent workflow memory.            Zhiyuan Zeng, Jiashuo Liu, Siyuan Chen, Tianci He,
  Preprint, arXiv:2409.07429.                               Yali Liao, Yixiao Tian, Jinpeng Wang, Zaiyuan Wang,
                                                            Yang Yang, Lingyue Yin, Mingren Yin, Zhenwei
Jason Wei, Zhiqing Sun, Spencer Papay, Scott McK-           Zhu, Tianle Cai, Zehui Chen, Jiecao Chen, Yantao
   inney, Jeffrey Han, Isa Fulford, Hyung Won Chung,        Du, Xiang Gao, Jiacheng Guo, Liang Hu, and 12
   Alex Tachard Passos, William Fedus, and Amelia           others. 2025. Futurex: An advanced live bench-
   Glaese. 2025a. Browsecomp: A simple yet chal-            mark for llm agents in future prediction. Preprint,
   lenging benchmark for browsing agents. Preprint,         arXiv:2508.11987.
   arXiv:2504.12516.
                                                          Guibin Zhang, Haotian Ren, Chong Zhan, Zhenhong
Tianxin Wei, Noveen Sachdeva, Benjamin Coleman,             Zhou, Junhao Wang, He Zhu, Wangchunshu Zhou,
  Zhankui He, Yuanchen Bei, Xuying Ning, Mengting           and Shuicheng Yan. 2025a. Memevolve: Meta-
  Ai, Yunzhe Li, Jingrui He, Ed H. Chi, Chi Wang,           evolution of agent memory systems. Preprint,
  Shuo Chen, Fernando Pereira, Wang-Cheng Kang,             arXiv:2512.18746.
  and Derek Zhiyuan Cheng. 2025b. Evo-memory:
  Benchmarking llm agent test-time learning with self-    Yaolun Zhang, Yinxu Pan, Yudong Wang, and Jie Cai.
  evolving memory. Preprint, arXiv:2511.20857.              2024. Pybench: Evaluating llm agent on various real-
                                                            world coding tasks. Preprint, arXiv:2407.16732.
Qingyun Wu, Gagan Bansal, Jieyu Zhang, Yiran
  Wu, Beibin Li, Erkang Zhu, Li Jiang, Xiaoyun            Zeyu Zhang, Quanyu Dai, Xiaohe Bo, Chen Ma, Rui Li,
  Zhang, Shaokun Zhang, Jiale Liu, Ahmed Hassan             Xu Chen, Jieming Zhu, Zhenhua Dong, and Ji-Rong
  Awadallah, Ryen W White, Doug Burger, and Chi             Wen. 2025b. A survey on the memory mechanism of
  Wang. 2023. Autogen: Enabling next-gen llm ap-            large language model-based agents. ACM Transac-
  plications via multi-agent conversation. Preprint,        tions on Information Systems, 43(6):1–47.
  arXiv:2308.08155.
                                                          Andrew Zhao, Daniel Huang, Quentin Xu, Matthieu
Yiran Wu, Mauricio Velazco, Andrew Zhao, Manuel             Lin, Yong-Jin Liu, and Gao Huang. 2024. Ex-
  Raúl Meléndez Luján, Srisuma Movva, Yogesh K              pel: Llm agents are experiential learners. Preprint,
  Roy, Quang Nguyen, Roberto Rodriguez, Qingyun             arXiv:2308.10144.
  Wu, Michael Albada, and 1 others. 2025. Excytin-
  bench: Evaluating llm agents on cyber threat investi-   Junhao Zheng, Chengming Shi, Xidi Cai, Qiuke
  gation. arXiv preprint arXiv:2507.14201.                  Li, Duzhen Zhang, Chenxing Li, Dong Yu, and
                                                            Qianli Ma. 2025. Lifelong learning of large lan-
Yiran Wu, Tianwei Yue, Shaokun Zhang, Chi Wang,             guage model based agents: A roadmap. Preprint,
  and Qingyun Wu. 2024. Stateflow: Enhancing llm            arXiv:2501.07278.
  task-solving through state-driven workflows. arXiv
  preprint arXiv:2403.11322.                              Longtao Zheng, Rundong Wang, Xinrun Wang, and
                                                            Bo An. 2024. Synapse: Trajectory-as-exemplar
Liang Xu, Anqi Li, Lei Zhu, Hang Xue, Changtai Zhu,         prompting with memory for computer control.
  Kangkang Zhao, Haonan He, Xuanwei Zhang, Qiyue            Preprint, arXiv:2306.07863.
Wanjun Zhong, Lianghong Guo, Qiqi Gao, He Ye, and          A.2.2    Phase 1: Retrieve
 Yanlin Wang. 2023. Memorybank: Enhancing large
  language models with long-term memory. Preprint,         Upon receiving the task, the agent queries the Expe-
  arXiv:2305.10250.                                        rience Bank (E). The system retrieves relevant past
                                                           experiences where the agent previously failed due
Wanjun Zhong, Lianghong Guo, Qiqi Gao, He Ye, and
 Yanlin Wang. 2024. Memorybank: Enhancing large            to over-reliance on betting odds or missed schedule
  language models with long-term memory. In Pro-           changes. Two representative retrieved experiences
  ceedings of the AAAI Conference on Artificial Intelli-   are shown below:
  gence, volume 38, pages 19724–19731.
                                                              Example Retrieved Experiences
A     Appendix
                                                              Experience (Sports/NCAAF)
A.1    Implementation Details                                 Failure Reason: The agent over-relied on pre-game
Base Search Agent. To isolate the efficacy of                 betting odds and recent season trends without ac-
                                                              counting for roster changes or "home advantage" dy-
the Live-Evo, We build a simple search agent and              namics closer to the game date.
equipped the agent with basic google-search and               Improvement: Incorporate dynamic, up-to-date info
web fetch tool. We use serper api as the google-              (roster, coaching) as the event approaches. Avoid
                                                              static betting odds. Experience (Sports/MLS)
search api and apply the time filter by editing the           Failure Reason: The agent failed to update its predic-
queries. The max turns of one task is set to 20. For          tion to reflect the rescheduling of the match, basing
web content that exceed the agent’s max sequence              probabilities on outdated timing.
                                                              Improvement: Always verify the event date and con-
length, we call the llm to summarize the content.             firm the prediction is relative to the current schedule.
Retrieve.      We calculate the semantic similar-
ity based on all-MiniLM-L6-v2 model from the                 One example meta guideline is:
sentence-transformers library. The system en-
forces a minimum weighted similarity threshold                Example Retrieved Experiences
of τ = 0.3. Only experiences has higher relativity            Experience (Sports/NCAAF)
will be retrieved.                                            Failure Reason: Over-generalization of domain-
                                                              specific lessons across fundamentally different task
Experience Weight Update. Specifically, we                    types and contexts. The synthesis process failed by
                                                              inadequately discriminating between domain and task
update the experience weights according to the fol-           relevance, leading to the inappropriate transfer of de-
lowing formula:                                               tailed lessons from sports prediction experiences to
                                                              a political individual behavior prediction task, and
W eightnew = W eightold +(scorenoexp −scoreexp )              by insufficiently validating contextual alignment and
                                                              specificity of lessons before integration.
A.2    Example Case                                           Synthesis Instruction: When generating guidelines
                                                              from past experiences, explicitly verify that the do-
In this section, we present a comprehensive exe-              main, task type, and contextual factors closely align
cution trajectory of the L IVE -E VO system on a              before transferring lessons; avoid importing detailed
specific future prediction task from the Prophet              procedural or content-specific insights from experi-
                                                              ences that differ substantially in domain or prediction
Arena benchmark. This case study illustrates how              target, instead extracting only high-level, abstract
the agent retrieves historical failures, synthesizes          methodological principles with caution. Before in-
a dynamic guideline, executes actions based on                corporating lessons from past experiences, systemati-
                                                              cally assess domain congruence, task similarity, and
that guideline, and achieves a superior Brier score           context relevance; if experiences differ in domain or
compared to the baseline.                                     task type, restrict transferred lessons to broadly appli-
                                                              cable methodological insights only, and clearly flag
A.2.1 Task Definition                                         any assumptions or limitations in applicability within
                                                              the guideline.
The agent is presented with a binary prediction task
regarding an NFL game.
                                                           A.2.3    Phase 2: Compile
    Task Input                                             Using the retrieved experiences and the meta-
    Question: Which professional football                  guideline, the agent synthesizes a task-specific
    team, Cincinnati or Pittsburgh, will win the           guideline (G) via the R EUSE operator. This guide-
    game scheduled for Oct 16, 2025?                       line explicitly warns against the specific pitfalls
    Ground Truth: Cincinnati (1), Pittsburgh               identified in the retrieved memory (e.g., verifying
    (0)                                                    dates and ignoring early odds).
                            Table 5: Performance Comparison: Baseline vs. Live-Evo

   Baseline Agent (No Memory)                           Live-Evo Agent (With Memory)
   Prediction: Pittsburgh (0.65), Cincinnati (0.35)     Prediction: Cincinnati (0.55), Pittsburgh (0.45)
   Reasoning: Relied on Pittsburgh’s 4-1 record         Reasoning: Identified close 33-31 victory con-
   and winning streak. Heavily weighted betting         ditions. Weighed resilience despite injuries and
   odds favoring Steelers.                              home advantage more heavily than static odds.
   Brier Score: 0.5329                                  Brier Score: 0.2500


   Synthesized Guideline                                    Query: "Cincinnati Bengals vs Pittsburgh
                                                            Steelers recent performance 2025 season
        • Dynamic Information: Prioritize au-               stats"
          thoritative sources (e.g., official injury        Observation 3 (Search Results): Results confirm
                                                            the game conclusion
          reports, press releases) close to the
          game date over early betting odds or
          historical reputation.

        • Schedule Verification: Implement a
          workflow step to confirm the exact             A.2.5    Phase 4: Result & Update (Evaluation)
          game date and update contextual data
          to avoid outdated inputs (derived from
          Exp 50fe0d0c).                                The agent synthesizes the gathered evidence. A
        • Scenario Analysis: Explicitly model           detailed comparison between the baseline and
          the impact of key player absences (e.g.,      the L IVE -E VO agent is presented in Table 5.
          injury reports) and home vs. away ad-         While the Baseline agent (without memory) re-
          vantages.                                     lied on Pittsburgh’s superior record (4-1) and bet-
                                                        ting odds, the L IVE -E VO agent incorporated the
                                                        specific game-day dynamics and injury resilience
A.2.4    Phase 3: Act                                   found during the guided search.
Guided by the synthesized instructions, the agent
executes a search strategy. Unlike a standard agent         The L IVE -E VO system achieved a Brier Score
that might immediately look up win probabilities,        improvement of 0.2829. Following this success,
the L IVE -E VO agent follows the guideline to first     the weight of the retrieved experiences is increased,
verify the schedule and check specific injury re-        reinforcing the guideline to "verify schedule" and
ports.                                                   "ignore early odds" for future sports prediction
                                                         tasks.
   Agent Execution Trajectory (Abbrevi-
   ated)
   Action 1: Web Search
   Query: "Cincinnati vs Pittsburgh NFL game
   Oct 16 2025 injury report roster updates"             A.3     Prompts
   Observation 1 (Search Results): Results indicate
   the game date matches the query. Snippets show
   specific injury reports: "Bengals TE Mike Gesicki
   removed from injury report," "Bengals DE Trey Hen-    Prompt: Retrieve Query Generation shows the
   drickson ruled OUT."
   Action 2: Visit Page
                                                         prompt that guide the agent to generate retrieve
   Observation 2 (Web Content): [Content summa-          queries for the experience bank and meta-guideline
   rized for brevity] Detailed tables confirm:           bank. Prompt: Guideline Compile shows the
       • Cincinnati: Trey Hendrickson (DE) is OUT;
          Tanner Hudson (TE) is OUT.                     prompt that guide the agent generate guideline
       • Pittsburgh: Calvin Austin III (WR) is OUT;      based on experiences, meta-guideline and current
          Miles Killebrew (S) is OUT.                    tasks. Prompt: Base Agent Prediction shows how
   Date confirmation: Thursday, Oct 16, 2025.
   Action 3: Web Search                                  the base search agent will act given the task and
                                                         the guideline.
Prompt: Search Query Generation                 Prompt: Guideline Compile

You are exploring an experience database to     You are synthesizing insights from past pre-
find relevant past predictions that can help    diction experiences to create a guideline for
with a new task.                                a new prediction task.
Current Task: Which professional football       Current Task: Which professional football
                                                team, Cincinnati or Pittsburgh, will win the
team, Cincinnati or Pittsburgh, will win the
                                                game scheduled for Oct 16, 2025?
game scheduled for Oct 16, 2025?
                                                Relevant Past Experiences Found: [Expe-
The experience database contains past pre-      rience 1 Summary: Over-relied on betting
diction experiences with these fields:          odds, missed key defensive injuries...] [Ex-
                                                perience 2 Summary: Over-relied on histor-
    • question: The prediction ques-
                                                ical trends, missed roster changes...]
      tion/task title
                                                CRITICAL: Experience Applicability
    • improvement: Key insights on how to       Check Before applying lessons from past
      improve similar predictions               experiences, you MUST assess whether
                                                each experience is truly applicable to this
    • failure_reason: What went wrong           specific task type. Identify which lessons
      in past predictions                       are directly applicable vs. need adaptation.
                                                Based on these experiences AND the appli-
    • missed_information: Information
                                                cability check, generate a FOCUSED and
      sources that were missed
                                                ACTIONABLE guideline (3-5 bullet points)
    • category: Domain category (politics,      for this prediction task.
      technology, etc.)                         Output ONLY the bullet points.

Generate 2-3 search queries. For each, spec-
ify the text and search type: “question” or
“experience”.
Output as JSON:
{
    "queries": [
     {"query": "...", "search_target": "..."}
    ]
}
Prompt: Base Agent Prediction

You are tasked with predicting the probabil-
ity of different outcomes for the following
event:
Event: Which professional football team,
Cincinnati or Pittsburgh, will win the game
scheduled for Oct 16, 2025?
Possible outcomes: “Cincinnati”, “Pitts-
burgh”
Task-Specific Guideline
 • Incorporate dynamic, up-to-date infor-
   mation close to the game date, including
   granular injury reports (e.g., Trey Hen-
   drickson status).
 • Avoid over-reliance on early betting
   odds or historical reputation.
 • Explicitly model and quantify the im-
   pact of key player absences and home-
   field advantage.
CRITICAL: How to Properly Use This
Guideline
1. Verify Applicability: Assess if the cur-
   rent task matches the context of the les-
   son.
2. Trust Your Current Research: If fresh
   findings contradict the guideline, priori-
   tize fresh evidence.

Your task:
 1. Research this event by searching for
    relevant information online.
 2. Analyze the information to assess the
    likelihood of each outcome.
 3. Provide a probability estimate (be-
    tween 0 and 1).
Output as JSON.
