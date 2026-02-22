<!-- Generated from arxiv-2601.01885.pdf via pdftotext -layout on 2026-02-22 -->

                                        Agentic Memory: Learning Unified Long-Term and Short-Term Memory
                                                   Management for Large Language Model Agents
                                                       Yi Yu1,2 , Liuyi Yao1,† , Yuexiang Xie1 , Qingquan Tan2 , Jiaqi Feng2 ,
                                                                          Yaliang Li1 , and Libing Wu2,†
                                                                                   1
                                                                                     Alibaba Group,
                                                          2
                                                            School of Cyber Science and Engineering, Wuhan University
                                                                        {yui1212,tanqingquan,jiaqiFeng,wu}@whu.edu.cn
                                                                    {yly287738,yuexiang.xyx,yaliang.li}@alibaba-inc.com
                                                                                      †Corresponding authors


                                                              Abstract                              et al., 2025b). High-quality LTM supports efficient
                                                                                                    retrieval of accumulated knowledge, while effec-
                                            Large language model (LLM) agents face fun-             tive STM management reduces redundancy and




arXiv:2601.01885v1 [cs.CL] 5 Jan 2026
                                            damental limitations in long-horizon reason-
                                                                                                    preserves salient context. Together, they mitigate
                                            ing due to finite context windows, making ef-
                                            fective memory management critical. Exist-              the limitations of finite context windows, making
                                            ing methods typically handle long-term mem-             their joint management crucial for improving agent
                                            ory (LTM) and short-term memory (STM) as                performance in complex reasoning settings.
                                            separate components, relying on heuristics or              However, existing research has predominantly
                                            auxiliary controllers, which limits adaptabil-          treated LTM and STM as independent components.
                                            ity and end-to-end optimization. In this pa-            STM is commonly enhanced through retrieval-
                                            per, we propose Agentic Memory (AgeMem),
                                                                                                    augmented generation (RAG) (Pan et al., 2025b),
                                            a unified framework that integrates LTM and
                                            STM management directly into the agent’s pol-
                                                                                                    such as in MainRAG (Chang et al., 2025) and
                                            icy. AgeMem exposes memory operations as                ReSum (Wu et al., 2025a), which expand usable
                                            tool-based actions, enabling the LLM agent to           context via external retrieval or periodic summa-
                                            autonomously decide what and when to store,             rization. Although effective in some tasks, these
                                            retrieve, update, summarize, or discard infor-          methods rely heavily on predefined schedules or
                                            mation. To train such unified behaviors, we pro-        heuristic rules, potentially resulting in overlooked
                                            pose a three-stage progressive reinforcement            infrequent but critical details as well as unneces-
                                            learning strategy and design a step-wise GRPO
                                                                                                    sary noise (Ma et al., 2025; Dong et al., 2025). In
                                            to address sparse and discontinuous rewards
                                            induced by memory operations. Experiments               contrast, LTM management has progressed along
                                            on five long-horizon benchmarks demonstrate             separate lines, typically categorized into trigger-
                                            that AgeMem consistently outperforms strong             based (Kang et al., 2025; Wang and Chen, 2025;
                                            memory-augmented baselines across multiple              Wang et al., 2025c; Chhikara et al., 2025) and
                                            LLM backbones, achieving improved task per-             agent-based (Yan et al., 2025; Hu et al., 2025;
                                            formance, higher-quality long-term memory,              Xu et al., 2025) paradigms. The former executes
                                            and more efficient context usage.
                                                                                                    fixed memory operations at predefined moments,
                                                                                                    whereas the latter incorporates a specialized mem-
                                        1   Introduction
                                                                                                    ory manager to determine what and how to store.
                                        In long-horizon agentic tasks involving multi-step          Despite offering more flexibility, most approaches
                                        reasoning and complex workflows (Chang et al.,              still depend on handcrafted rules or auxiliary ex-
                                        2024), the effectiveness of large language model            pert models, limiting adaptability and increasing
                                        (LLM) agents is fundamentally constrained by the            system complexity (Xiong et al., 2025).
                                        information they can attend to at any given time,              As a consequence, LTM and STM are typically
                                        which we collectively refer to as the agent’s mem-          treated as separate and loosely coupled modules.
                                        ory (Xiong et al., 2025; Goodyear et al., 2025).            As illustrated in Figure 1, existing architectures
                                        Memory typically falls into two categories: long-           generally follow two patterns: (a) static STM with
                                        term memory (LTM), which persistently stores                trigger-based LTM, or (b) static STM with agent-
                                        user- or task-specific knowledge (Zhong et al.,             based LTM. In both settings, the two memory sys-
                                        2024; Jiang et al., 2024), and short-term memory            tems are optimized independently and later com-
                                        (STM), which comprises the information contained            bined in an ad hoc way, leading to fragmented
                                        in the current input context (Wu et al., 2025b; Gao         memory construction and suboptimal performance

                                                                                                1
              Query                    Session                            Query                         Session                            Query                    Session
                                       Content                                                          Content                                                     Content
      Which band has            1. Narcissus (band) ...            Which band has             1. Narcissus (band) ...              Which band has          1. Narcissus (band) ...
    more members, Muse          2. The Raconteurs ...            more members, Muse           2. The Raconteurs ...              more members, Muse        2. The Raconteurs ...
    or The Raconteurs?          3. Sundae Club ...               or The Raconteurs?           3. Sundae Club ...                 or The Raconteurs?        3. Sundae Club ...



           Static               Trigger-based                          Static                    Memory
    Short-term Memory         Long-term Memory                  Short-term Memory                Manager                                    Agentic Memory Management
                      Memory                                                    Memory <operation>
             Query    storage        Add                                 Query   storage {“action”:”add”,“cont                                                   Long-term
                                   memory                                                                                                   Short-term
                                                                                                  ent”:”Narcissus ...”}                    Memory Tools         Memory Tools
            Retrieved                                                     Retrieved               </operation>
            Memories                Update                                Memories
                                   memory                                                                       Memory                            Tools calling &           Memory
                                                                                      Memory                   operation                         Memory operation         retrieval tool
                         Memory         Delete
                         retrieval      memory                                        retrieval
                                                                                                     Agent-based Long-                 Agentic Context         Agentic Memory
              Context                                                     Context                      term Memory
Multi-round                                                 Multi-round                                                      Multi-round
 responses                                                   responses                                                        responses

               LLM                                                         LLM                                                              LLM
              Answer                  Independent                         Answer                       Independent                         Answer                  Agentic
       <answer>                       construction                 <answer>                            construction                 <answer>                     construction
       The Raconteurs.                                             The Raconteurs.                                                  The Raconteurs.
       </answer>                                                   </answer>                                                        </answer>
                               Short-term       Long-term                                    Short-term          Long-term                                Short-term        Long-term
                                Memory           Memory                                       Memory              Memory                                   Memory            Memory


  (a) Static STM + Trigger-based LTM                           (b) Static STM + Agent-based LTM                                  (c) Unified Management (AgeMem)
Figure 1: Comparison between independent and unified memory management frameworks. (Left) Traditional
framework with static STM and trigger-based LTM. (Middle) Independent framework with an additional Memory
Manager controlling LTM in an agent-based manner, while STM remains static. (Right) The proposed AgeMem
framework, where LTM and STM are jointly and intelligently managed via explicit tool-based operations.

in long-horizon reasoning tasks. Thus, unifying the                                              To address these challenges, we propose Agen-
management of LTM and STM remains a necessary                                                 tic Memory (AgeMem), a unified framework that
yet largely unexplored challenge.                                                             jointly manages LTM and STM, illustrated in
   Nevertheless, achieving unified memory man-                                                Figure 1 (right). Unlike prior designs that treat
agement poses three fundamental challenges. (C1)                                              memory as an external component, AgeMem inte-
Functional heterogeneity coordination: LTM                                                    grates both memory types directly into the agent’s
and STM serve distinct yet complementary pur-                                                 decision-making process. Through a unified tool-
poses: LTM determines what to store, update, or                                               based interface, the LLM autonomously invokes
discard, while STM governs what to retrieve, sum-                                             and executes memory operations for both LTM
marize, or remove from the active context (Zhang                                              and STM. Furthermore, we design a three-stage
et al., 2025b). The challenge lies in designing                                               progressive RL strategy: the model first acquires
a unified mechanism that orchestrates their inter-                                            LTM storage capabilities, then learns STM con-
play synergistically. (C2) Training paradigm                                                  text management, and finally coordinates both
mismatch: Existing reinforcement learning (RL)                                                forms of memory under full task settings. To
frameworks adopt markedly different training                                                  address the fragmented experience issue across
strategies for the two memory types (Ma et al.,                                               training stages, we design a step-wise Group Rel-
2024). LTM-focused training often leverages                                                   ative Policy Optimization (GRPO) (Shao et al.,
session-level information available prior to interac-                                         2024), which transforms cross-stage dependencies
tion, whereas STM training typically injects distrac-                                         into learnable signals, thereby alleviating the chal-
tors to simulate long-horizon contexts (Sun et al.,                                           lenges posed by sparse and discontinuous rewards
2024). Moreover, standard RL assumes continuous                                               in RL. We evaluate AgeMem on five long-context,
trajectories with stable rewards, which conflicts                                             reasoning-intensive benchmarks. Comprehensive
with the inherently fragmented and discontinuous                                              results show that AgeMem consistently outper-
experiences produced by memory operations (Wu                                                 forms strong baselines, validating the effectiveness
et al., 2025a), making end-to-end optimization par-                                           of unified memory management.
ticularly challenging. (C3) Practical deployment                                                 Our main contributions are as follows:
constraints: Many agent systems rely on an auxil-                                             • We propose Agentic Memory (AgeMem), a
iary expert LLM for memory control, significantly                                                unified agentic memory framework that en-
increasing inference cost and training complexity.                                               ables LLM-based agents to autonomously decide
How to integrate unified memory management di-                                                  when, what, and how to manage both long-term
rectly into an agent without dependence on external                                              and short-term memory.
expert models remains an open problem.                                                        • We develop a three-stage progressive RL strat-

                                                                                         2
  egy equipped with a step-wise GRPO mecha-                 rare but crucial details. Our approach instead en-
  nism, facilitating effective end-to-end learning of       ables agents to learn when and how to retrieve,
  unified memory management behaviors.                      summarize, or filter context, achieving a more flex-
• We conduct comprehensive evaluations across               ible balance between efficiency and information
  multiple models and long-horizon benchmarks,              preservation.
  demonstrating the robustness and effectiveness            Reinforcement learning for LLMs. Reinforce-
  of AgeMem in complex agentic tasks.                       ment learning has become an effective paradigm
                                                            for improving the decision-making and reasoning
2   Background and Related Work                             capabilities of LLM-based agents (Yao et al., 2022;
                                                            Jin et al., 2025; Qian et al., 2025; Chaudhari et al.,
Long-term memory (LTM). Persistent LTM is                   2025). Among recent advances, GRPO (Shao et al.,
crucial for LLM-based agents operating over ex-             2024) enhances stability by optimizing policies
tended horizons (Wang et al., 2025b; Li et al.,             based on the relative quality of sampled trajectories,
2025). Recent work has explored diverse ar-                 removing the need for an explicit value function.
chitectural designs for modeling LTM. Lang-                 GRPO and its variants (Gilabert et al., 2025; Wang
Mem (LangChain Team, 2025) provides a mod-                  et al., 2025a) have shown strong performance in
ular framework that supports multiple memory                complex reasoning tasks. However, existing RL-
types, while A-Mem (Xu et al., 2025) adopts                 based systems generally treat memory as a static
a Zettelkasten-inspired design that links struc-            or external component, making them ill-suited for
tured knowledge units to facilitate consolidation.          the discontinuous and fragmented trajectories asso-
Mem0 (Chhikara et al., 2025) proposes a scal-               ciated with memory operations (Yan et al., 2025;
able extract-update pipeline and extends it to a            Zhang et al., 2025a). In contrast, our work inte-
graph-based variant for structured reasoning, and           grates RL directly into the memory management
Zep (Rasmussen et al., 2025) represents memory              process, enabling unified training of both language
as a temporal knowledge graph to enable cross-              generation and memory operations.
session and time-aware reasoning. Although ef-
fective in organizing and retrieving information,           3     Method
these approaches largely rely on predefined mem-
ory structures or heuristic update rules. As mem-           We propose Agentic Memory (AgeMem), a uni-
ory grows, such designs commonly suffer from                fied memory framework that enables LLM agents
increased system complexity and lack adaptive,              to autonomously manage both LTM and STM in
learning-based strategies for prioritization and for-       an end-to-end manner. As illustrated in Figure 1
getting. In contrast, our work aims to learn an             (right), AgeMem integrates memory management
adaptive memory policy that allows agents to dy-            capabilities directly into the agent via a set of spe-
namically decide what to store, update, or forget,          cialized tools, enabling the model to learn optimal
depending on task demands and long-term utility.            strategies for unified memory management through
Short-term memory (STM). STM in agentic                     three-stage progressive strategy.
LLMs primarily concerns context selection and
                                                            3.1   Problem Formulation
retrieval (Wang et al., 2024; Jin et al., 2024).
Retrieval-Augmented Generation (RAG) (Pan et al.,           Unified RL formulation for AgeMem. At each
2025b; Salama et al., 2025; Kagaya et al., 2024)            time step t, the agent observes a state st ∈ S com-
is the dominant paradigm, expanding usable con-             posed of the conversation context (short-term mem-
text by injecting retrieved content into prompts.           ory) Ct , the long-term memory store Mt , and the
While effective, RAG does not fundamentally pre-            task specification T : st = (Ct , Mt , T ). The spec-
vent context explosion in long-horizon settings and         ification T includes the input query q, contextual
may introduce irrelevant or distracting information.        information Iq , and (for training only) the expected
To address this issue, ReSum (Wu et al., 2025a)             answer Aq . This formulation enables the agent to
periodically compresses interaction histories into          ground its decision-making in both transient con-
compact reasoning states, allowing agents to oper-          text and persistent knowledge.
ate beyond fixed context-window constraints. Yet               Given st , the agent selects an action at ∈ A
its summarization schedule remains largely prede-           from a hybrid action space that includes language
fined, and aggressive compression risks discarding          generation as well as memory operations. The de-

                                                        3
cision is governed by a parameterized policy πθ ,                 Table 1: Memory management tools in AgeMem for
defined as πθ (at |st ) = P (at |st ; θ), where θ de-             manipulating long-term memory (LTM) and short-term
                                                                  memory (STM).
notes the LLM parameters and at = πθ (·|st ). For
a trajectory τ = (s1 , a1 , . . . , sT , aT ), the cumula-        Tool            Target      Function
tive reward is defined as:
                                                                  A DD            LTM         Add new knowledge to Mt
                X                                                 U PDATE         LTM         Modify entries in Mt
       R(τ ) =      wi · Ri (τ ) + Ppenalty (τ ), (1)             D ELETE         LTM         Remove entries from Mt
                                                                  R ETRIEVE       STM         Retrieve entries from Mt to Ct
where Ri captures task performance and memory                     S UMMARY        STM         Summarize segments in Ct
quality, and Ppenalty discourages redundant storage,              F ILTER         STM         Filter out irrelevant segments from Ct
excessive tool usage, and uncontrolled context ex-
pansion. The optimization objective is:
                                                                  3.2     Memory Management via Tool Interface
            θ∗ = arg max Eτ ∼πθ [R(τ )].               (2)        AgeMem exposes memory-related operations to the
                          θ
                                                                  LLM agent through an explicit tool interface (Ta-
This formulation treats memory management as an                   ble 1). The agent can modify its persistent LTM us-
integral component of the agent’s policy, replacing               ing A DD, U PDATE, and D ELETE, while exercising
handcrafted heuristics with a learnable mechanism.                fine-grained control over STM through R ETRIEVE,
Three-stage trajectory structure. To capture                      S UMMARY, and F ILTER. Incorporating these tools
long-horizon interactions and progressively train                 into the action space transforms memory control
memory capabilities, each trajectory is divided into              from an external heuristic pipeline into an intrinsic
three consecutive stages: τ = (τ (1) , τ (2) , τ (3) ),           component of decision-making. This design allows
with a total length of T = T1 + T2 + T3 . In Stage 1,             the agent to adaptively manage memory according
the agent engages in casual interactions and may                  to task structure, history, and context. Implementa-
store useful information into LTM. Stage 2 intro-                 tion details are provided in the Appendix A.1.
duces distracting or irrelevant content, requiring
                                                                  3.3     Three-Stage Progressive RL Strategy
the agent to manage its STM through selective re-
tention and compression. Stage 3 presents a task                  To learn unified and stable memory behaviors, we
that depends on coordinated use of both retained                  propose a progressive three-stage training strategy.
context and earlier accumulated LTM. A key aspect                 For each task instance q ∈ T , the agent generates
of this design is that the long-term memory Mt per-               a complete trajectory:
sists across all stages, allowing early knowledge to
                                                                        (q)       (1)   (2)      (3) 
influence later decisions. In contrast, the context                 τk        = τk , τk , τk             ,   k = 1, . . . , K, (3)
Ct is reset between Stages 1 and 2 to prevent in-
formation leakage across phases. The reset before                 where K denotes the number of independent roll-
                                                                                                   (i)
Stage 2 ensures the agent cannot solve the final                  outs, and each sub-trajectory τk corresponds to a
task via residual context, thereby forcing proper                 specific training stage.
retrieval from LTM and enabling effective training                Stage 1 (LTM construction). The agent is ex-
of memory operations.                                             posed to contextual information Iq in a casual con-
   At each step, we collect an experience tuple                   versational setting. The goal is to identify salient
et = (st , at , rt , log πθold (at |st )), where rt is typ-       information and store it into LTM Mt . During the
ically zero for intermediate steps and assigned af-               interaction, the short-term context Ct evolves natu-
ter trajectory completion, and log πθold (at |st ) de-            rally, and the agent may invoke LTM-related tools
notes the log probability under the old policy πθold .            when appropriate. Formally, this stage yields a sub-
                                                                               (1)
This representation enables step-wise credit assign-              trajectory τk = {et }Tt=1 1
                                                                                              , where each experience
ment under GRPO (Shao et al., 2024) and allows                    tuple et follows the definition in Section 3.1.
the agent to attribute long-term rewards to specific              Stage 2 (STM control under distractors). The
memory decisions across stages. By structuring tra-               short-term context is reset, while the constructed
jectories in this staged yet continuous manner, the               LTM Mt is retained. The agent is then presented
agent learns temporally coherent and task-adaptive                with semantically related but irrelevant or mislead-
memory policies essential for robust long-horizon                 ing distractors. The objective is to learn proac-
reasoning.                                                        tive STM control through tool-based operations,

                                                              4
such as filtering or summarizing context, in or-                  Following GRPO, we maximize the expected
der to suppress noise and preserve useful infor-                objective over all experiences:
mation. This process forms the sub-trajectory                                                              
  (2)
τk = {et }t=TT1 +T2
                      , which emphasizes context fil-           J(θ) = E(et ,At )∼E ρt At − βDKL [πθ ∥πref ]
                 1 +1
                                                                                          (q)
tering and compression capability.                                              B   K T
                                                                          1 XX k
                                                                              X  (k,q) (k,q)     (k,q) 
Stage 3 (Integrated reasoning and memory co-                           =         ρ t At       − βDKL ,
ordination). Finally, the agent receives a formal                        |E|
                                                                              q=1 k=1 t=1
query q requiring both accurate reasoning and ef-                                                                        (6)
                                                                                                    = ππθ θ (a(at |s
                                                                                              (k,q)                  t)
fective memory retrieval. The agent must retrieve               where the importance ratio ρt                      |s ) con-
                                                                                                         old t t
relevant knowledge from Mt , appropriately man-                 trols the update magnitude under the new policy,
age the context Ct , and generate a final answer.                  (k,q)
                                                                DKL denotes the KL divergence penalty between
                         (3)
This stage produces τk = {et }Tt=T1 +T2 +1 , which              the current policy πθ and a fixed reference πref ,
evaluates the ability of agent to coordinate long-              and β is a coefficient that balances exploration and
term memory, short-term context management, and                 training stability.
task solution in an end-to-end manner.
   All three segments form a complete trajectory:               3.5   Reward Function Design
  (q)                                                           We design a composite reward that evaluates both
 τk     = (e1 , e2 , . . . , eT ),   T = T1 +T2 +T3 , (4)       downstream task performance and the quality of
                                                                memory management. The total trajectory-level
which is then used for policy optimization in the
                                                                reward is defined as
subsequent step-wise GRPO procedure. For a batch
of B tasks, we further aggregate all experiences
                                                                              R(τ ) = w⊤ R + Ppenalty ,                 (7)
from K independent rollouts into a unified set E =
SB SK                    (q)
  q=1 k=1 {et | et ∈ τk }, with a total size of                 where w = [wtask , wcontext , wmemory ]⊤ are tunable
|E| = B × K × T̄ , where T̄ denotes the average                 coefficients, and R = [Rtask , Rcontext , Rmemory ]⊤
trajectory length. More detailed rollout processes              correspond to rewards for task completion, context
are provided in the Appendix A.3.                               management, and long-term memory management.
                                                                The penalty term Ppenalty captures violations such
3.4     Step-wise GRPO for Unified Management                   as context overflow or exceeding the interaction
We adopt a step-wise variant of GRPO to con-                    limit. Below, we summarize each component, and
nect long-range task rewards with memory de-                    precise formulas are provided in the Appendix A.2.
cisions across all stages. For task q, let Gq =                 Task completion reward Rtask . This term pro-
   (q)         (q)
{τ1 , . . . , τK } denote the group of parallel roll-           vides the primary learning signal by assessing
outs. Each trajectory yields a terminal reward                  whether the agent solves the task correctly. We
 (k,q)             (q)                                          obtain a scalar score using an LLM-based judge
rT      = R(τk ). We compute the group-
normalized advantage for the terminal step as:                  Sjudge (Apred , Aq ) ∈ [0, 1], optionally applying a
                                                                penalty when no answer is produced. This reward
                                 (k,q)
                    (k,q)       rT − µGq                        encourages accurate, complete task solutions and
                  AT        =             ,           (5)       remains the dominant component to ensure align-
                                  σGq + ϵ
                                                                ment with task objectives.
where µGq and σGq are the mean and standard de-                 Context management reward Rcontext . This com-
viation of rewards within Gq , ϵ prevents division              ponent evaluates STM behavior, focusing on how
by zero. This advantage is then broadcast to all pre-           effectively the agent controls the active context
                                      (k,q)       (k,q)
ceding steps of the same trajectory At      = AT ,              Ct . It combines three factors: (i) compression ef-
which assigns a consistent learning signal to all               ficiency, promoting economical token usage; (ii)
memory and reasoning actions along the trajectory,              preventive actions, rewarding early summarization
including those in Stage 1 and Stage 2. In do-                  or filtering to avoid overflow; and (iii) information
ing so, the final task outcome supervises every in-             preservation, penalizing the loss of critical query-
termediate memory decision, enabling long-range                 related content. Each factor is normalized, allowing
credit assignment across heterogeneous stages. We               the reward to balance context efficiency against re-
then augment the experience set with advantages,                tention of essential information.
                              (q)        (k,q)
E = B,K
     S
        q,k {(et , At )|et ∈ τk , At = At      }.               Memory management reward Rmemory . This

                                                            5
                                                                     0 H P R U \  4 X D O L W \   0 4 
term evaluates LTM operations. It aggregates sig-                                                               
                                                                                                                                                                                                     
nals for: (i) storage quality, measured as the frac-                                                                                  
                                                                                                                                                                           
tion of stored entries labeled as high-quality and
reusable; (ii) maintenance, rewarding meaningful                                                                                    % D V H O L Q H V
                                                                                                                                 $ J H 0 H P                                              
update or delete operations to mitigate memory stal-                                                                                $ Y J   % D V H O L Q H
                                                                                                                
eness; and (iii) semantic relevance, computed using                                                              / D Q J 0 H P  $  0 H P  0 H P   0 H P  J  $ J H 0 H P  $ J H 0 H P
                                                                                                                                                                  Q R 5 /
an LLM-based score between retrieved memories                                                                                                     D   4 Z H Q      %  , Q V W U X F W
                                                                                                                




                                                                     0 H P R U \  4 X D O L W \   0 4 
and the query. Together, these signals incentivize
                                                                                                                                                                                                          
selective, high-value memory construction and re-                                                                                       
sponsible upkeep over time.                                                                                                                                              
Penalty terms Ppenalty . Penalties discourage unde-                                                                   
                                                                                                                                                                                             
sirable behaviors such as exceeding the maximum
                                                                                                                
number of dialogue turns or triggering context over-                                                             / D Q J 0 H P  $  0 H P  0 H P   0 H P  J  $ J H 0 H P  $ J H 0 H P
                                                                                                                                                                  Q R 5 /
flow. Penalty coefficients are chosen so that such                                                                                                   E   4 Z H Q    %  , Q V W U X F W
violations lead to a substantial reduction in the final
trajectory reward, encouraging the agent to main-             Figure 2: Memory Quality scores for different methods
tain safe and efficient memory practices.                     on HotpotQA. Higher scores indicate better relevance
                                                              between stored memories and ground-truth facts.
4     Experiments
                                                              AgeMem-noRL, which is not fine-tuned with RL.
4.1    Experimental Setup
                                                              In ablation studies on STM, we compare STM tools
Datasets. To comprehensively evaluate AgeMem,                 with RAG approach. For the base agent models, we
we select five widely-used datasets in LLM-based              use Qwen2.5-7B-Instruct and Qwen3-4B-Instruct.
agent research: ALFWorld (Shridhar et al., 2020),             More baseline configurations are in Appendix C.3.
SciWorld (Wang et al., 2022), PDDL (Chang et al.,             Implementation details. We build agents using the
2024), BabyAI (Chevalier-Boisvert et al., 2018),              Agentscope framework (Gao et al., 2025a) and fine-
and HotpotQA (Yang et al., 2018). These datasets              tune AgeMem using the Trinity framework (Pan
cover embodied action, game-based reasoning, and              et al., 2025a). For all reward weights in the reward
knowledge-intensive question answering, provid-               function, we use uniform coefficients of 1.0 with-
ing diverse evaluation scenarios. Since the Hot-              out manual tuning. Further implementation details
potQA dataset contains both questions and sup-                are provided in Appendix C.4.
porting facts, automatically providing Stage 1 con-
textual information, AgeMem is fine-tuned with                4.2                                Main Results
RL only on the HotpotQA training set and then                 Comparison with counterparts. Table 2 shows
evaluated directly on all datasets. Detailed dataset          that AgeMem achieves the highest average perfor-
statistics are provided in Appendix C.1.                      mance on both Qwen2.5-7B-Instruct (41.96%) and
Evaluation metrics. For the primary task com-                 Qwen3-4B-Instruct (54.31%), outperforming all
pletion metrics, we adopt Success Rate (SR) for               baselines across five datasets with relative gains
ALFWorld, SciWorld, and BabyAI, Progress Rate                 of 49.59% and 23.52% over no-memory, respec-
(PR) for PDDL, and LLM-as-a-Judge (J) for Hot-                tively. Compared to the best baselines (Mem0 and
potQA. Additionally, we employ an LLM-based                   A-Mem), AgeMem improves by 4.82 and 8.57 per-
evaluator to assess the quality of stored long-term           centage points on average. RL training contributes
memory during knowledge reasoning, measured by                8.53 percentage points and 8.72 percentage points
Memory Quality (MQ). The prompts of the LLM-                  improvements over AgeMem-noRL, validating the
based evaluation are provided in Appendix C.2.                three-stage progressive RL strategy.
Baselines & LLM backbones. We compare Age-                    Quality of stored long-term memories. To eval-
Mem against four representative agent LTM sys-                uate the quality of stored memories, we leverage
tems: LangMem (LangChain Team, 2025), A-                      the ground-truth facts provided in the HotpotQA
Mem (Xu et al., 2025), Mem0 (Chhikara et al.,                 dataset and assess the relevance between stored
2025), and Mem0g (a graph-based variant officially            memories and these facts using an LLM-based
provided as part of Mem0). To better demonstrate              evaluator. Figure 2 presents the Memory Qual-
the effectiveness of RL training, we also include             ity (MQ) scores for different baselines. AgeMem

                                                          6
                                                          Table 2: Performance comparison across five benchmarks. The best and second-best results are marked.

                                  LLM Backbone                                                                       Method                         ALFWorld                SciWorld    PDDL      BabyAI     HotpotQA      Average
                                                                                                                     No-Memory                               27.16           13.80       10.15     50.80        38.36          28.05
                                                                                                                     LangMem                                 38.27           28.29       15.85     51.34        37.43          34.23
                                                                                                                     A-Mem                                   34.68           28.06       18.39     58.82        43.95          36.78
                                  Qwen2.5-7B-Instruct                                                                Mem0                                    37.49           26.99       13.96     60.58        46.66          37.14
                                                                                                                     Mem0g                                   35.34           30.50       14.86     58.78        42.06          36.31
                                                                                                                     AgeMem-noRL                             37.90           28.67        8.87     46.34        45.36          33.43
                                                                                                                     AgeMem (Ours)                           41.07           35.55       17.31     61.42        54.44          41.96
                                                                                                                     No-Memory                               38.51           47.89       30.14     55.83        47.48          43.97
                                                                                                                     LangMem                                 40.89           50.42       28.42     53.80        42.70          43.25
                                                                                                                     A-Mem                                   34.31           50.14       34.41     61.35        48.48          45.74
                                  Qwen3-4B-Instruct                                                                  Mem0                                    41.17           51.38       31.72     60.05        39.16          44.70
                                                                                                                     Mem0g                                   36.69           47.76       29.61     57.59        38.12          41.95
                                                                                                                     AgeMem-noRL                             38.02           50.42       27.52     57.48        54.49          45.59
                                                                                                                     AgeMem (Ours)                           48.97           59.48       35.07     72.56        55.49          54.31

                                                                            4 Z H Q      %                                                                        Table 3: Tool usage statistics on HotpotQA. Numbers



                    7 R N H Q  5 H G X F W L R Q   
                                                                             4 Z H Q    %                                                                            show average calls per episode.
                                                                                                                                                     
                                                                                                            
                                                                                                                                                                                                     Qwen2.5-7B        Qwen3-4B
                                                                                                                                                                              Tool Category
                                                                                                                                                                                             noRL    GRPO       noRL     GRPO
                                                           
                                                                % D V H O L Q H   $ J H 0 H P  5 $ *


 $ Y J   7 R N H Q V
                                                                                                                                                                                             LTM Tool Statistics
                                                                                                                 
                                                                                                                        
                                                                                                                                                      
                                                                                                                                                                 
                                                                                                                                                                          A DD Memory            0.92     1.64      2.49      2.64
                                                                                                                                                                          U PDATE Memory         0.00     0.13      0.13      0.34
                                                                 $ J H 0 H P  Q R 5 /                     $ J H 0 H P        $ J H 0 H P            $ J H 0 H P
                                                                         5 $ *                               Q R 5 /           5 $ *                 2 X U V             D ELETE Memory         0.00     0.08      0.00      0.22
                              & R Q I L J X U D W L R Q
                                                                                                                                                                                                 STM Tool Statistics
     Figure 3: Average prompt token counts under different
     STM management configurations on HotpotQA. The                                                                                                                           R ETRIEVE Memory       2.31     1.95      4.62      4.35
     suffix “-RAG” indicates the adoption of RAG in place                                                                                                                     S UMMARY Context       1.08     0.82      0.11      0.96
                                                                                                                                                                              F ILTER Context        0.02     0.31      0.15      0.16
     of STM tool-based management.
                                                                                                                                                                              Total Calls            4.33     4.92      7.50      8.67

     achieves the highest memory quality on both model                                                                                                                      text expansion, enabling more efficient token usage
     backbones, with MQ scores of 0.533 and 0.605, re-                                                                                                                      while maintaining task performance.
     spectively. This indicates that the unified memory                                                                                                                     Tool usage analysis. Table 3 reports tool usage
     management framework not only improves task                                                                                                                            statistics before and after RL fine-tuning on Hot-
     performance but also promotes the storage of high-                                                                                                                     potQA. RL training substantially increases the use
     quality, reusable knowledge. The comparison with                                                                                                                       of long-term memory tools, especially A DD and
     baseline methods further validates that AgeMem’s                                                                                                                       U PDATE. On Qwen2.5-7B-Instruct, A DD opera-
     tool-based memory operations lead to more selec-                                                                                                                       tions rise from 0.92 to 1.64, and U PDATE opera-
     tive and higher-quality memory construction.                                                                                                                           tions appear after training (0.13 v.s. nearly zero).
     Effectiveness of STM management. We eval-                                                                                                                              Similar trends are observed on Qwen3-4B-Instruct,
     uate the effectiveness of STM management by                                                                                                                            with higher frequencies of both A DD and U P -
     measuring the prompt token count under different                                                                                                                       DATE . For short-term memory tools, RL leads
     configurations on HotpotQA. Figure 3 shows that                                                                                                                        to more balanced tool usage. The frequency of
     AgeMem successfully reduces prompt token usage                                                                                                                         F ILTER increases notably (e.g., from 0.02 to 0.31
     compared to variants without STM tools (-RAG).                                                                                                                         on Qwen2.5), indicating proactive context control,
     On Qwen2.5-7B-Instruct, AgeMem uses 2,117 to-                                                                                                                          while R ETRIEVE remains relatively stable. Overall,
     kens on average, compared to 2,186 tokens for                                                                                                                          these patterns suggest that RL training enables co-
     AgeMem-RAG, representing a reduction of 3.1%.                                                                                                                          ordinated and adaptive memory management. De-
     On Qwen3-4B-Instruct, the reduction is even more                                                                                                                       tailed case studies are provided in Appendix B.
     pronounced: AgeMem uses 2,191 tokens versus
     2,310 tokens for AgeMem-RAG, a reduction of                                                                                                                             4.3     Ablation Studies
     5.1%. These results demonstrate that the learned                                                                                                                        LTM-STM components. To validate the con-
     STM management tools effectively control con-                                                                                                                           tributions of individual components, we conduct

                                                                                                                                                                        7
     3 H U I R U P D Q F H  6 F R U H
                                                                                                                                                                                                                                                                  
                                                                                                                                                                                                                                       
                                                                                                                                                                                                                                                                 
                                                                                                                                                                                                               
                                                                                                                   
                                                                                                                                                                                          
                                                                                                                                                                                                

                                                                                                                                                                                                             
                                                 % D V H         / 7           / 7  5 /   / 7  6 7  5 /           % D V H      / 7           / 7  5 /   / 7  6 7  5 /                                     % D V H        / 7          / 7  5 /   / 7  6 7  5 /
                                                               D   $ / ) : R U O G                                               E   6 F L : R U O G                                                                         F   + R W S R W 4 $
Figure 4: Ablation study on LTM, STM, and RL components (Qwen2.5-7B-Instruct). Base: No-memory baseline;
+LT: AgeMem-noRL-RAG (LTM tools only); +LT/RL: AgeMem-RAG (RL with LTM tools); +LT/ST/RL:
AgeMem (full AgeMem system with RL). Green arrows indicate performance gains over the baseline.
                                                                                                                                                                                         Qwen2.5-7B - GRPO Training Reward Convergence
                                                                                                                                                                                 1.0
ablation studies on LTM, STM, and RL training.
Figure 4 presents results on three representative                                                                                                                                0.8




                                                                                                                                                                Average Reward
datasets using Qwen2.5-7B-Instruct as the back-                                                                                                                                  0.6
bone (results for Qwen3-4B-Instruct are provided
                                                                                                                                                                                 0.4
in Appendix D.1). Adding LTM alone (+LT)
yields substantial gains of +10.6%, +14.2%, and                                                                                                                                  0.2
                                                                                                                                                                                                                                                                   All Returns
+7.4% over the baseline. Incorporating RL training                                                                                                                                                                                                                 Answer-Only
                                                                                                                                                                                 0.00                  20                  40               60                     80                   100
(+LT/RL) further improves performance, particu-                                                                                                                                                                             Training Step
larly on HotpotQA (+6.3%), demonstrating the ef-
                                                                                                                                                  Figure 5: Training convergence curves on Qwen2.5-7B-
fectiveness of our reward-based optimization. The                                                                                                 Instruct comparing All-Returns (solid line) v.s. Answer-
full AgeMem system (+LT/ST/RL) achieves the                                                                                                       Only (dashed line) reward strategies.
best results across all benchmarks, with overall
improvements of +13.9%, +21.7%, and +16.1%.                                                                                                       Table 4: Reward function ablation on HotpotQA using
Notably, adding STM tools provides the most                                                                                                       Qwen2.5-7B-Instruct. All-Returns v.s. Answer-Only
significant boost on SciWorld (+3.1%) and Hot-                                                                                                    reward strategies. “TN” is the token number, and “TC”
potQA (+2.4%), validating that learned context                                                                                                    denotes the number of tool calls.
management outperforms static RAG approaches.
These progressive improvements confirm that uni-                                                                                                           Strategy                                                J(↑)         TN(↓)              MQ(↑)                       TC(-)
fied memory management with end-to-end RL is                                                                                                               Answer-Only                                        0.509             2078                0.479                         3.93
essential for optimal agent performance.                                                                                                                   All-Returns                                        0.544             2117                0.533                         4.92
Reward function. To demonstrate the effective-
ness of our multi-component reward function de-                                                                                                   5            Conclusion
sign, we compare the full reward function (All-
Returns) against a variant using only Rtask (Answer-
                                                                                                                                                  In this work, we propose Agentic Memory (Age-
Only). Figure 5 shows the reward convergence
                                                                                                                                                  Mem), a unified memory management framework
curves of Qwen2.5-7B-Instruct during GRPO train-
                                                                                                                                                  that enables LLM-based agents to jointly control
ing on HotpotQA. The full reward function leads
                                                                                                                                                  long-term and short-term memory through learn-
to significantly faster convergence and higher fi-
                                                                                                                                                  able, tool-based actions. By integrating memory
nal performance compared to the task-only variant.
                                                                                                                                                  operations directly into the agent’s policy and train-
As detailed in Table 4, the All-Returns strategy
                                                                                                                                                  ing them with a progressive reinforcement learn-
achieves higher LLM-as-a-Judge scores (0.544 v.s.
                                                                                                                                                  ing strategy, AgeMem replaces heuristic memory
0.509) while maintaining substantially better mem-
                                                                                                                                                  pipelines with an end-to-end optimized solution.
ory quality (0.533 v.s. 0.479). Notably, despite us-
                                                                                                                                                  Extensive experiments across diverse long-horizon
ing more tokens (2117 v.s. 2078), the All-Returns
                                                                                                                                                  benchmarks show that AgeMem improves both task
strategy achieves better overall performance, in-
                                                                                                                                                  performance and memory quality while maintain-
dicating that the additional context and memory
                                                                                                                                                  ing efficient context usage. These results highlight
operations contribute meaningfully to reasoning
                                                                                                                                                  the importance of unified, agent-centric memory
quality. Similar patterns are observed on Qwen3-
                                                                                                                                                  policies and suggest a promising direction for build-
4B-Instruct (see Appendix D.2).
                                                                                                                                                  ing scalable and adaptive LLM agents capable of
                                                                                                                                                  long-term reasoning.

                                                                                                                                          8
Limitations                                                 Pengyu Gao, Jinming Zhao, Xinyue Chen, and Long
                                                              Yilin. 2025b. An efficient context-dependent mem-
While AgeMem demonstrates strong performance                  ory framework for llm-centric agents. In Proceedings
across multiple settings, there remain opportunities          of the 2025 Conference of the Nations of the Amer-
for further extension. The current implementation             icas Chapter of the Association for Computational
                                                              Linguistics: Human Language Technologies (Volume
adopts a fixed set of memory management tools,                3: Industry Track), pages 1055–1069.
which provides a clear and effective abstraction but
could be extended to support more fine-grained con-         Javier Garcia Gilabert, Carlos Escolano, Xixian Liao,
trol in future work. In addition, although we eval-            and Maite Melero. 2025. Terminology-constrained
                                                               translation from monolingual data using grpo. In
uate our approach on several representative long-             Proceedings of the Tenth Conference on Machine
horizon benchmarks, broader coverage of tasks and             Translation, pages 1335–1343.
environments may further strengthen the empirical
understanding of the framework.                             Lyle Goodyear, Rachel Guo, and Ramesh Johari. 2025.
                                                              The effect of state representation on llm agent be-
                                                              havior in dynamic routing games. arXiv preprint
                                                              arXiv:2506.15624.
References
Chia-Yuan Chang, Zhimeng Jiang, Vineeth Rakesh,             Yuanzhe Hu, Yu Wang, and Julian McAuley. 2025. Eval-
  Menghai Pan, Chin-Chia Michael Yeh, Guanchu                 uating memory in llm agents via incremental multi-
  Wang, Mingzhi Hu, Zhichao Xu, Yan Zheng, Ma-                turn interactions. arXiv preprint arXiv:2507.05257.
  hashweta Das, and 1 others. 2025. Main-rag: Multi-
  agent filtering retrieval-augmented generation. In        Xun Jiang, Feng Li, Han Zhao, Jiahao Qiu, Jiaying
  Proceedings of the 63rd Annual Meeting of the As-           Wang, Jun Shao, Shihao Xu, Shu Zhang, Weiling
  sociation for Computational Linguistics (Volume 1:          Chen, Xavier Tang, and 1 others. 2024. Long term
  Long Papers), pages 2607–2622.                              memory: The foundation of ai self-evolution. arXiv
                                                              preprint arXiv:2410.15665.
Ma Chang, Junlei Zhang, Zhihao Zhu, Cheng Yang,
 Yujiu Yang, Yaohui Jin, Zhenzhong Lan, Lingpeng            Bowen Jin, Hansi Zeng, Zhenrui Yue, Jinsung Yoon,
 Kong, and Junxian He. 2024. Agentboard: An an-               Sercan Arik, Dong Wang, Hamed Zamani, and Jiawei
 alytical evaluation board of multi-turn llm agents.          Han. 2025. Search-r1: Training llms to reason and
 Advances in neural information processing systems,           leverage search engines with reinforcement learning.
 37:74325–74362.                                              arXiv preprint arXiv:2503.09516.
Shreyas Chaudhari, Pranjal Aggarwal, Vishvak Mura-          Hongye Jin, Xiaotian Han, Jingfeng Yang, Zhimeng
  hari, Tanmay Rajpurohit, Ashwin Kalyan, Karthik             Jiang, Zirui Liu, Chia-Yuan Chang, Huiyuan Chen,
  Narasimhan, Ameet Deshpande, and Bruno Castro da            and Xia Hu. 2024. Llm maybe longlm: Self-extend
  Silva. 2025. Rlhf deciphered: A critical analysis           llm context window without tuning. arXiv preprint
  of reinforcement learning from human feedback for           arXiv:2401.01325.
  llms. ACM Computing Surveys, 58(2):1–37.
                                                            Tomoyuki Kagaya, Thong Jing Yuan, Yuxuan Lou,
Maxime Chevalier-Boisvert, Dzmitry Bahdanau, Salem
                                                              Jayashree Karlekar, Sugiri Pranata, Akira Kinose,
 Lahlou, Lucas Willems, Chitwan Saharia, Thien Huu
                                                              Koki Oguri, Felix Wick, and Yang You. 2024. Rap:
 Nguyen, and Yoshua Bengio. 2018. Babyai: A plat-
                                                              Retrieval-augmented planning with contextual mem-
 form to study the sample efficiency of grounded lan-
                                                              ory for multimodal llm agents. arXiv preprint
 guage learning. arXiv preprint arXiv:1810.08272.
                                                              arXiv:2402.03610.
Prateek Chhikara, Dev Khant, Saket Aryan, Taranjeet
  Singh, and Deshraj Yadav. 2025. Mem0: Building            Jiazheng Kang, Mingming Ji, Zhe Zhao, and Ting
  production-ready ai agents with scalable long-term           Bai. 2025. Memory os of ai agent. arXiv preprint
  memory. arXiv preprint arXiv:2504.19413.                     arXiv:2506.06326.

Yihong Dong, Xue Jiang, Jiaru Qian, Tian Wang, Kechi        LangChain Team. 2025. Langmem sdk for agent long-
  Zhang, Zhi Jin, and Ge Li. 2025. A survey on code           term memory.
  generation with llm-based agents. arXiv preprint
  arXiv:2508.00083.                                         Hao Li, Chenghao Yang, An Zhang, Yang Deng, Xi-
                                                              ang Wang, and Tat-Seng Chua. 2025. Hello again!
Dawei Gao, Zitao Li, Yuexiang Xie, Weirui Kuang,              llm-powered personalized agent for long-term dia-
  Liuyi Yao, Bingchen Qian, Zhijian Ma, Yue                   logue. In Proceedings of the 2025 Conference of the
  Cui, Haohao Luo, Shen Li, and 1 others. 2025a.              Nations of the Americas Chapter of the Association
  Agentscope 1.0: A developer-centric framework               for Computational Linguistics: Human Language
  for building agentic applications. arXiv preprint           Technologies (Volume 1: Long Papers), pages 5259–
  arXiv:2508.16279.                                           5276.


                                                        9
Hao Ma, Tianyi Hu, Zhiqiang Pu, Liu Boyin, Xiaolin             Ruoyao Wang, Peter Jansen, Marc-Alexandre Côté, and
  Ai, Yanyan Liang, and Min Chen. 2024. Coevolving               Prithviraj Ammanabrolu. 2022. Scienceworld: Is
  with the other you: Fine-tuning llm with sequential            your agent smarter than a 5th grader? arXiv preprint
  cooperative multi-agent reinforcement learning. Ad-            arXiv:2203.07540.
  vances in Neural Information Processing Systems,
  37:15497–15525.                                              Yu Wang and Xi Chen. 2025. Mirix: Multi-agent mem-
                                                                 ory system for llm-based agents. arXiv preprint
Qianou Ma, Weirui Peng, Chenyang Yang, Hua Shen,                 arXiv:2507.07957.
  Ken Koedinger, and Tongshuang Wu. 2025. What
  should we engineer in prompts? training humans in            Zixuan Wang, Bo Yu, Junzhe Zhao, Wenhao Sun, Sai
  requirement-driven llm use. ACM Transactions on                Hou, Shuai Liang, Xing Hu, Yinhe Han, and Yim-
  Computer-Human Interaction, 32(4):1–27.                        ing Gan. 2025b. Karma: Augmenting embodied ai
                                                                 agents with long-and-short term memory systems.
Xuchen Pan, Yanxi Chen, Yushuo Chen, Yuchang Sun,                In 2025 IEEE International Conference on Robotics
  Daoyuan Chen, Wenhao Zhang, Yuexiang Xie, Yilun                and Automation (ICRA), pages 1–8. IEEE.
  Huang, Yilei Zhang, Dawei Gao, and 1 others. 2025a.
  Trinity-rft: A general-purpose and unified framework
                                                               Zora Zhiruo Wang, Apurva Gandhi, Graham Neu-
  for reinforcement fine-tuning of large language mod-
                                                                 big, and Daniel Fried. 2025c. Inducing program-
  els. arXiv preprint arXiv:2505.17826.
                                                                 matic skills for agentic tasks. arXiv preprint
Zhuoshi Pan, Qianhui Wu, Huiqiang Jiang, Xufang                  arXiv:2504.06821.
  Luo, Hao Cheng, Dongsheng Li, Yuqing Yang, Chin-
  Yew Lin, H Vicky Zhao, Lili Qiu, and 1 others.               Zora Zhiruo Wang, Jiayuan Mao, Daniel Fried, and
  2025b. On memory construction and retrieval for                Graham Neubig. 2024. Agent workflow memory.
  personalized conversational agents. arXiv preprint             arXiv preprint arXiv:2409.07429.
  arXiv:2502.05589.
                                                               Xixi Wu, Kuan Li, Yida Zhao, Liwen Zhang, Litu
Cheng Qian, Emre Can Acikgoz, Qi He, Hongru Wang,                Ou, Huifeng Yin, Zhongwang Zhang, Xinmiao
  Xiusi Chen, Dilek Hakkani-Tür, Gokhan Tur, and                 Yu, Dingchu Zhang, Yong Jiang, and 1 others.
  Heng Ji. 2025. Toolrl: Reward is all tool learning             2025a. Resum: Unlocking long-horizon search in-
  needs. arXiv preprint arXiv:2504.13958.                        telligence via context summarization. arXiv preprint
                                                                 arXiv:2509.13313.
Preston Rasmussen, Pavlo Paliychuk, Travis Beauvais,
  Jack Ryan, and Daniel Chalef. 2025. Zep: a tempo-            Yaxiong Wu, Sheng Liang, Chen Zhang, Yichao Wang,
  ral knowledge graph architecture for agent memory.             Yongyue Zhang, Huifeng Guo, Ruiming Tang, and
  arXiv preprint arXiv:2501.13956.                               Yong Liu. 2025b. From human memory to ai mem-
                                                                 ory: A survey on memory mechanisms in the era of
Rana Salama, Jason Cai, Michelle Yuan, Anna Currey,              llms. arXiv preprint arXiv:2504.15965.
  Monica Sunkara, Yi Zhang, and Yassine Benajiba.
  2025. Meminsight: Autonomous memory augmenta-                Zidi Xiong, Yuping Lin, Wenya Xie, Pengfei He, Zirui
  tion for llm agents. arXiv preprint arXiv:2503.21760.          Liu, Jiliang Tang, Himabindu Lakkaraju, and Zhen
                                                                 Xiang. 2025. How memory management impacts llm
Zhihong Shao, Peiyi Wang, Qihao Zhu, Runxin Xu,                  agents: An empirical study of experience-following
  Junxiao Song, Xiao Bi, Haowei Zhang, Mingchuan                 behavior. arXiv preprint arXiv:2505.16067.
  Zhang, YK Li, Yang Wu, and 1 others. 2024.
  Deepseekmath: Pushing the limits of mathematical
                                                               Wujiang Xu, Zujie Liang, Kai Mei, Hang Gao, Jun-
  reasoning in open language models. arXiv preprint
                                                                tao Tan, and Yongfeng Zhang. 2025. A-mem:
  arXiv:2402.03300.
                                                                Agentic memory for llm agents. arXiv preprint
Mohit Shridhar, Xingdi Yuan, Marc-Alexandre Côté,               arXiv:2502.12110.
 Yonatan Bisk, Adam Trischler, and Matthew
 Hausknecht. 2020. Alfworld: Aligning text and em-             Sikuan Yan, Xiufeng Yang, Zuchao Huang, Ercong Nie,
 bodied environments for interactive learning. arXiv              Zifeng Ding, Zonggen Li, Xiaowen Ma, Kristian Ker-
 preprint arXiv:2010.03768.                                       sting, Jeff Z Pan, Hinrich Schütze, and 1 others. 2025.
                                                                  Memory-r1: Enhancing large language model agents
Chuanneng Sun, Songjun Huang, and Dario Pompili.                  to manage and utilize memories via reinforcement
  2024. Llm-based multi-agent reinforcement learn-                learning. arXiv preprint arXiv:2508.19828.
  ing: Current and future directions. arXiv preprint
  arXiv:2405.11106.                                            Zhilin Yang, Peng Qi, Saizheng Zhang, Yoshua Bengio,
                                                                 William Cohen, Ruslan Salakhutdinov, and Christo-
Hongcheng Wang, Yinuo Huang, Sukai Wang,                         pher D Manning. 2018. Hotpotqa: A dataset for
  Guanghui Ren, and Hao Dong. 2025a. Grpo-ma:                    diverse, explainable multi-hop question answering.
  Multi-answer generation in grpo for stable and ef-             In Proceedings of the 2018 conference on empiri-
  ficient chain-of-thought training. arXiv preprint              cal methods in natural language processing, pages
  arXiv:2509.24494.                                              2369–2380.


                                                          10
Shunyu Yao, Jeffrey Zhao, Dian Yu, Nan Du, Izhak                A     Detailed Design and Implementation of
  Shafran, Karthik R Narasimhan, and Yuan Cao. 2022.                  AgeMem
  React: Synergizing reasoning and acting in language
  models. In The eleventh international conference on           This appendix provides full technical details omit-
  learning representations.                                     ted from the main text due to space constraints.
Yuxiang Zhang, Jiangming Shu, Ye Ma, Xueyuan Lin,               We first present precise definitions and pseudo-
  Shangxi Wu, and Jitao Sang. 2025a. Memory as ac-              formulations for each memory-management tool
  tion: Autonomous context curation for long-horizon            (Appendix A.1), then give implementable formulas
  agentic tasks. arXiv preprint arXiv:2510.12635.
                                                                for the reward components used in training (Ap-
Zeyu Zhang, Quanyu Dai, Xiaohe Bo, Chen Ma, Rui Li,             pendix A.2). Finally, we provide the complete
  Xu Chen, Jieming Zhu, Zhenhua Dong, and Ji-Rong               algorithmic specification (Appendix A.3).
  Wen. 2025b. A survey on the memory mechanism of
  large language model-based agents. ACM Transac-               A.1    Memory Management Tools
  tions on Information Systems, 43(6):1–47.
                                                                AgeMem exposes a small set of structured tools
Wanjun Zhong, Lianghong Guo, Qiqi Gao, He Ye, and               that the agent may invoke as part of its action at .
 Yanlin Wang. 2024. Memorybank: Enhancing large
                                                                Each tool is implemented as a deterministic or
  language models with long-term memory. In Pro-
  ceedings of the AAAI Conference on Artificial Intelli-        stochastic function that transforms the short-term
  gence, volume 38, pages 19724–19731.                          context Ct , the long-term memory store Mt , or
                                                                both. Unlike traditional memory systems that rely
                                                                on external heuristics or predefined schedules, Age-
                                                                Mem integrates these tools directly into the agent’s
                                                                action space, enabling the model to learn when and
                                                                how to use each tool through reinforcement learn-
                                                                ing. Below we give precise operational definitions,
                                                                implementation details, and the system prompts
                                                                that guide tool usage.
                                                                Notation. Long-term memory store at time t is
                                                                              |M |
                                                                Mt = {mi }i=1t , where each memory mi contains
                                                                a content string and optional metadata. Short-term
                                                                context is Ct = [u1 , u2 , . . . , unt ] (message list),
                                                                and enc(·) denotes a text encoder that returns a
                                                                dense embedding. We use cosine similarity for
                                                                semantic matching throughout the framework.
                                                                R ETRIEVE. The R ETRIEVE operation enables
                                                                the agent to access relevant information from long-
                                                                term memory based on semantic similarity. This
                                                                operation is crucial for bringing stored knowledge
                                                                into the active context when needed for reasoning.
                                                                The retrieval operation returns the top-k most simi-
                                                                lar memories to the query q:

                                                                 R ETRIEVE(q, k) = TopK(Mt , sim(q, mi ), k),
                                                                                                             (8)
                                                                where the similarity function is defined as:

                                                                                         enc(q)⊤ enc(mi )
                                                                        sim(q, mi ) =                       .       (9)
                                                                                        ∥enc(q)∥ ∥enc(mi )∥

                                                                The retrieved memories are then inserted into the
                                                                short-term context Ct , making them available for
                                                                immediate reasoning. The parameter k controls
                                                                the number of memories retrieved, typically set to

                                                           11
3-5 in our experiments to balance relevance and               where Summarize(·) is implemented by LLM with
context size.                                                 a summarization system prompt. The agent can
                                                              specify which messages to summarize using the
A DD. The A DD operation allows the agent to
                                                              ‘span’ parameter, which can be:
store new information in long-term memory for
future use. This operation is essential for accumu-              • “all”: Summarize all non-system messages.
lating knowledge across interactions and sessions.
A new memory entry is created by:                                • “N”: Summarize the last N messages.
                                        
          mnew = c, enc(c), metadata ,          (10)          The summarization process uses the following sys-
                                                              tem prompt to ensure high-quality compression:
where c is the content to be stored, enc(c) is its em-                                                                
bedding vector, and metadata includes timestamp,              You are a conversation summarization assistant.
source information, and optional tags. The memory             Your goal is to compress the given conversation
                                                                  span into a concise summary that preserves
store is then updated:                                            all important information, intentions,
                                                                  decisions, and unresolved questions.
             Mt+1 = Mt ∪ {mnew }.                (11)         The summary will later be used to replace the
                                                                  original conversation in the context, so
The agent learns to identify salient information                  make sure nothing essential is lost.
worth storing through the reward function, which
                                                              Instructions:
encourages storing high-quality, reusable knowl-              1. Read the provided conversation rounds
edge while penalizing redundant or irrelevant en-                 carefully.
                                                              2. Identify the main topics, actions, results,
tries.                                                            and open issues.
                                                              3. Write a clear, factual summary in natural
U PDATE and D ELETE. Memory maintenance                           language.
operations enable the agent to keep its long-term             4. Do NOT include greetings, filler text, or
memory store current and relevant. The U PDATE                    redundant phrasing.
operation modifies existing memories when new                 Input:
information supersedes or refines previous knowl-             - Conversation content: [CONVERSATION_TEXT]
edge. For an existing memory mi , the update oper-
                                                              Output:
ation is defined as:                                          - A concise yet comprehensive summary of the
                                                                  above conversation span.
          mi ← c′ , enc(c′ ), metadata′ ,
                                       
                                              (12)
                                                              Let’s start the conversation summarization.
where c′ is the updated content and metadata′ re-
flects the modification timestamp. The D ELETE                The agent learns to invoke summarization proac-
operation removes obsolete or incorrect memories:             tively before context overflow occurs, balancing
                                                              information preservation with efficiency.
               Mt+1 = Mt \ {mi }.                (13)
                                                              F ILTER. The F ILTER operation filters out irrel-
These operations are particularly important in long-          evant or redundant messages from the short-term
horizon tasks where information may become out-               context based on semantic similarity. This opera-
dated or where the agent needs to correct earlier             tion helps maintain a focused context by filtering
mistakes. The reward function encourages mean-                out noise and distractions. Specifically, it removes
ingful updates and deletions that improve memory              messages whose similarity to a given criteria c ex-
quality over time.                                            ceeds a threshold θ:
S UMMARY. The S UMMARY operation com-
presses conversation history in the short-term con-                   Ct′ = {ui ∈ Ct | sim(c, ui ) < θ} .     (15)
text to prevent context overflow while preserving
essential information. This operation is critical for         In all experiments, we set θ = 0.6 by default. The
managing long conversations that exceed context               criteria c can be specified by the agent (e.g., a de-
window limits. Given a subset of context indices s,           scription of what to keep) or can be automatically
the summary operation is defined as:                          derived from the current task context. This oper-
                                                              ation is particularly useful in Stage 2 of training,
Ct′ = Ct \ {ui | i ∈ s} ∪ {Summarize({ui }i∈s )},             where distractors are introduced to test the agent’s
                                            (14)              ability to filter irrelevant information.

                                                         12
Tool invocation as structured actions. Each tool            - The final solution must be wrapped in <answer>
is exposed via a schema specifying its function                  tags.
                                                            - No text should appear outside these tags.
name and required arguments. The agent’s policy
outputs either language tokens (for text generation)    ## Guidelines
or structured tool calls (for memory operations).       - Always start with reasoning (<think>).
                                                        - After each reasoning step, decide: call tool(s
The agent is guided by a system prompt that defines         ) or answer.
the tool-calling interface and response format. The     - You can call multiple tools within one <
                                                            tool_call> JSON array.
system prompt used in AgeMem is as follows:
                                                       - Be concise, logical, and explicit in reasoning.
You are an intelligent assistant that solves
    complex problems by managing context and                - Manage memory actively: retrieve, add, update,
    memory with tools when needed.                               summarize, filter, or delete as needed.
                                                            - Use <answer> only once when the final solution
## Available Tools:[TOOLS]                                       is ready.

## Problem-Solving Workflow                                 Let’s start!
You must follow a structured reasoning and
    action process for every task:                          This prompt structure ensures that the agent follows
1. **Think & Plan**
   Always start with a <think>...</think> block.            a consistent format for reasoning, tool invocation,
   Inside it, explain your reasoning, plan your             and final answers, which is essential for reliable
    next step, and decide whether you need to               parsing and reward computation during RL training.
    call a tool or provide a final answer.
2. **Tool Calls**                                           The structured format also enables the agent to
   If you decide to use one or more tools,                  coordinate multiple memory operations within a
    follow your <think> block with a <tool_call             single reasoning step, supporting efficient unified
    >...</tool_call> block.
   - You may call **one or multiple tools** in a            memory management.
     single step.                                              Figure 6 and 7 present our tool schemas for short-
   - List multiple tool calls as elements of a
    JSON array.                                             term memory and long-term memory management,
   - Each tool call must include "name" and "               showing the exact function signatures and argu-
    arguments".                                             ment types that the agent can invoke.
   - Example:
     <tool_call>[{{"name": "Retrieve_memory", "
    arguments": {{"query": "math problem solving            A.2   Reward Function Design
     strategies", "top_k": 3}}}}, {{"name": "
    Add_memory", "arguments": {{"content": "                This section provides implementable formulas for
    Strategy summary for reuse", "memory_type":             the reward components described in the main text.
    "problem_solving"}}}}]</tool_call>
3. **Final Answer**
                                                            All component scores are normalized to [0, 1] (un-
   When you no longer need tools and are ready              less noted) to enable stable weighting.
    to present your final output, follow your               Overview. The overall trajectory-level reward is
    last <think> block with an <answer>...</
    answer> block containing the full response.             defined as:
4. **Mutual Exclusivity Rule**
   After **each <think> block**, you must choose                           R(τ ) = w⊤ R + Ppenalty ,        (16)
     exactly **one** of the following:
   - a "<tool_call>" block (if you need tools),
    **or**                                                  where w = [wtask , wcontext , wmemory ]⊤ are tunable
   - an "<answer>" block (if you are ready to               weights, R = [Rtask , Rcontext , Rmemory ]⊤ denote
    respond).
   You must **never** include both "<tool_call>"            task completion, context management, and mem-
     and "<answer>" immediately after the same              ory management rewards respectively, and Ppenalty
    "<think>" block.                                        penalizes undesired behaviors.
5. **Iterative Solving**
   You may repeat this sequence as needed:                  Task completion reward Rtask . Let the agent pro-
   "<think>" -> "<tool_call>" -> "<think>" -> "<            duce a final answer Apred . We obtain a judge score
    tool_call>" ... -> "<think>" -> "<answer>"
   until the problem is completely solved.
                                                            Sjudge (Apred , Aq ) ∈ [0, 1] via an evaluator (LLM
                                                            judge), where Aq denotes the expected ground
## Response Format (Strict)                                 truth. Then the task reward Rtask is:
Your full output must follow these rules:
- Every reasoning step must appear inside <think                      (
    > tags.                                                            Sjudge (Apred , Aq ), if has answer,
- Every tool usage must appear inside one <                   Rtask =
    tool_call> tag (even if it includes multiple                       Pno-answer ,          otherwise,
     tool invocations).                                                                                   (17)

                                                       13
    Short-term Memory (STM) Management Tools

 STM_TOOLS = [
     {
          "name": "Summary_context",
          "description": "Summarizes conversation rounds to reduce tokens while preserving key
     information.",
          "parameters": {
              "properties": {
                  "span": {
                      "description": "The range of conversation rounds to summarize. Can be ’all’
     for entire context, or a number (e.g., ’5’) for the last N rounds. A system, user, assistant
     and ’tool’ message are considered as one round.",
                      "type": "string"
                  }
              },
              "required": ["span"]
          }
     },
     {
          "name": "Filter_context",
          "description": "Filters out irrelevant or outdated content from the conversation context
     to improve task-solving efficiency. ",
          "parameters": {
              "properties": {
                  "criteria": {
                      "description": "The criteria for content removal. Can be keywords, phrases, or
       descriptions of content types to remove (e.g., ’the birthday of John’, ’the age of Mary’).",
                      "type": "string"
                  }
              },
              "required": ["criteria"]
          }
     },
     {
          "name": "Retrieve_memory",
          "description": "Retrieves relevant memories and adds them to current context.",
          "parameters": {
              "properties": {
                  "query": {
                      "description": "The search query to find relevant memories. Should describe
     what kind of information or context is needed.",
                      "type": "string"
                  },
                  "top_k": {
                      "description": "The maximum number of memories to retrieve. Defaults to 3.",
                      "type": "integer"
                  },
                  "metadata_filter": {
                      "description": "Optional metadata filters to narrow down memory search (e.g.,
     {’type’: ’user_info’, ’domain’: ’math’}).",
                      "type": "object"
                  }
              },
              "required": ["query"]
          }
     }
 ]



Figure 6: Short-term memory (STM) management tools for conversational context management. These tools enable
summarization, selective filtering, and retrieval operations to maintain efficient context windows.




                                                    14
    Long-term Memory (LTM) Management Tools

 LTM_TOOLS = [
     {
         "name": "Add_memory",
         "description": "Adds new information to external memory store for future reference.",
         "parameters": {
             "properties": {
                 "content": {
                     "description": "The content to store in memory.",
                     "type": "string"
                 },
                 "metadata": {
                     "description": "Optional metadata tags to categorize and filter the memory.",
                     "type": "object"
                 },
                 "memory_type": {
                     "description": "The type of memory being stored.",
                     "type": "string"
                 }
             },
             "required": ["content"]
         }
     },
     {
         "name": "Update_memory",
         "description": "Updates existing memory. Requires memory_id from prior retrieval.",
         "parameters": {
             "properties": {
                 "memory_id": {
                     "description": "The unique identifier of the memory to update. Must be
     obtained from a previous memory retrieval operation.",
                     "type": "string"
                 },
                 "content": {
                     "description": "The new content to replace the existing memory content.",
                     "type": "string"
                 },
                 "metadata": {
                     "description": "Updated metadata for the memory.",
                     "type": "object"
                 }
             },
             "required": ["memory_id", "content"]
         }
     },
     {
         "name": "Delete_memory",
         "description": "Removes memory from store. Requires confirmation.",
         "parameters": {
             "properties": {
                 "memory_id": {
                     "description": "The unique identifier of the memory to delete. Must be
     obtained from a previous memory retrieval operation.",
                     "type": "string"
                 },
                 "confirmation": {
                     "description": "Confirmation that this memory should be permanently deleted.",
                     "type": "boolean"
                 }
             },
             "required": ["memory_id", "confirmation"]
         }
     }
 ]



Figure 7: Long-term memory (LTM) management tools for persistent storage. These tools provide add, update, and
delete capabilities for maintaining long-term information retention across conversations.

                                                     15
with Pno_answer = −1.0 by default.                                 unless otherwise specified. For Storage Quality,
Context management reward Rcontext . We de-                        during the memory storage process in Stage 1, the
compose the overall context management reward                      agent may add Ntotal memory entries, among which
into three normalized components that jointly eval-                Nhigh_quality are identified as high-quality based on
uate how effectively the model maintains a compact                 an LLM’s analysis of the input query q and its ex-
yet information-preserving context state. Formally,                pected answer Aq . The storage quality reward is
we define:                                                         defined as the proportion of high-quality memories:
                              3
                              X                                                                 Nhigh_quality
                 Rcontext =         αi Ri ,          (18)                      Rstorage =                      .      (23)
                                                                                               max(1, Ntotal )
                              i=1
                                                                   This metric incentivizes the agent to store valuable
where   Ri ∈ {Rcompression , Rpreventive , Rpreservation },
P                                                                  information while avoiding the accumulation of
   i i = 1, and we use uniform weights αi =
     α
                                                                   redundant or low-quality memories. For Mainte-
1/3 unless otherwise specified. For compression
                                                                   nance, to encourage the agent to actively maintain
efficiency, we evaluate the compactness of the final
                                                                   the memory bank, we reward update or delete op-
context Ct by computing
                                                                   erations:
                                           
                                    Tused
     Rcompression = max 0, 1 −                ,      (19)             Rmaintenance = 1[update or delete performed].
                                    Tmax
                                                                                                                   (24)
where Tused denotes the number of tokens present                   This mechanism promotes dynamic memory man-
in the context when the final answer is generated,                 agement and timely cleanup. For Semantic Rel-
and Tmax is the allowed budget. For preventive                     evance, to quantify the semantic match between
management, we define Rpreventive to assess proac-                 retrieved memories and the query, we introduce an
tive behavior:                                                     LLM-based relevance assessment. Let SLLM (R, q)
                                                                   be the semantic relevance score of the retrieved
   Rpreventive = 1[tool invoked before overflow],                  memory set R with respect to query q, normal-
                                                (20)               ized to the interval [0, 1]. The semantic relevance
which equals 1 when the model invokes a context-                   reward is defined as:
reduction tool before reaching the token limit, and
0 otherwise. For information preservation, we                                   Rrelevance = SLLM (R, q).             (25)
identify a set of key tokens or phrases Kq extracted
from the user query q, such as named entities or                   This component ensures that retrieved memories
temporal and spatial expressions. Let 1preserve in-                are semantically aligned with the current task, en-
dicate whether these items remain present (either                  hancing overall reasoning quality.
directly or via a retained summary) at the time                    Penalty terms Ppenalty . We penalize major con-
of answer generation. The preservation reward is                   straint violations to ensure the agent operates
therefore                                                          within specified limits:
                                                                                         2
                Rpreservation = 1preserve .          (21)                                      Pk · 1[violationk ],
                                                                                         X
                                                                            Ppenalty =                                (26)
                                                                                         k=1

Memory management reward Rmemory . The                             where Pk ∈ {Prounds , Poverflow } and violationk ∈
memory management reward consists of three key                     {1[Nrounds > Nmax ], 1[Tused > Tmax ]}. Here,
components that evaluate retrieval quality, storage                Nrounds denotes the number of interaction rounds,
quality, maintenance operations, and semantic rele-                Nmax is the maximum allowed rounds, Tused repre-
vance. We define it as:                                            sents the total token usage, and Tmax is the token
                              3
                                                                   budget limit. The penalty coefficients are set to
                                                                   Prounds = −1 and Poverflow = −0.5 by default.
                              X
                Rmemory =           βj Rj ,          (22)
                              j=1
                                                                   A.3   AgeMem Algorithm
where
P      Rj ∈ {Rstorage , Rmaintenance , Rrelevance },               This section provides the complete algorithmic
  j βj = 1, and we use uniform weights βj = 1/3                    specification of AgeMem, our unified memory

                                                              16
management framework for LLM-based agents.                     mine when and which long-term memory tools to
The training procedure integrates three progres-               invoke—including A DD, U PDATE, D ELETE—to
sive stages (long-term memory construction, short-             construct an initial memory store M. To support
term context management under distractors, and                 informed memory decisions, the agent proactively
integrated task execution) into a single end-to-end            performs memory retrieval at every step. This re-
reinforcement learning loop. We present the main               trieval is not task-driven but serves as an introspec-
training algorithm using a two-column layout for               tive operation: it enables the agent to maintain
compactness (Algorithm 1–2), followed by detailed              awareness of the current LTM contents, facilitating
rollout procedures for each stage (Algorithms 3–5).            decisions about updating or discarding stale entries
                                                               and ensuring that newly stored information remains
Training overview (algorithm 1–2). The core                    coherent with existing knowledge. Since the task
training loop follows a generate-then-optimize                 query has not yet been revealed in Stage 1, the
paradigm. For each task q in a training batch                  agent must rely on general cues about which infor-
B, we generate K independent rollout trajectories              mation may become useful later. This encourages
   (q)
{τk }K  k=1 using the current policy πθ . Each tra-            the formation of reusable, well-structured memory
           (q)       (1) (2) (3)
jectory τk = (τk , τk , τk ) concatenates ex-                  traces rather than query-specific shortcuts, laying
periences from all three stages, forming a com-                the foundation for effective long-horizon memory
plete episode from initial memory construction to              management in later stages.
final task completion. The agent first builds long-
                                                                   Algorithm 4 describes the second stage, which
term memory from contextual information Iq (Al-
                                                               deliberately stresses the agent’s context manage-
gorithms 3), then learns to filter out distracting
                                                               ment capabilities. The short-term context C is reset
information while maintaining useful context (Al-
                                                               to avoid information leakage and affect the learn-
gorithms 4), and finally retrieves stored knowledge
                                                               ing of STM management, while the constructed
to finish the target task (Algorithms 5). All experi-
                                                               long-term memory M persists from Stage 1. Over
ences are collected into a unified buffer E spanning
                                                               T2 turns, the agent receives semantically related
multiple tasks and rollouts.
                                                               but ultimately irrelevant distractor messages that
   After the rollout phase, we apply group-based               could mislead downstream reasoning if left unman-
advantage normalization to enable fair comparison              aged. The agent must learn to proactively invoke
across tasks with different reward scales. For each            F ILTER to filter out low-relevance content based
                                         (k,q)
task group Gq , terminal rewards {rT }K        k=1 are         on semantic similarity thresholds, or S UMMARY
normalized to zero mean and unit variance, yield-              to compress accumulated context when token bud-
                    (k,q)
ing advantages AT         that reflect relative perfor-        gets become constrained. This stage trains robust
mance within the group. These terminal advan-                  filtering strategies that generalize beyond simple
tages are then broadcast uniformly to all timesteps            heuristics, as the agent receives learning signals
within the same trajectory, establishing a consistent          from the eventual task performance in Stage 3.
learning signal that connects early-stage memory
decisions to final task outcomes. This step-wise                  Algorithm 5 presents the final integrated exe-
GRPO mechanism enables long-range credit as-                   cution stage. Upon receiving the target query q,
signment across heterogeneous operations. The                  the agent must coordinate retrieval from long-term
policy is then updated via gradient ascent on the ex-          memory M, context management operations on
pected advantage, regularized by a KL divergence               C, and multi-step reasoning to produce a final an-
term to maintain proximity to a reference policy               swer Apred . The agent may invoke R ETRIEVE to
πref for training stability.                                   fetch relevant stored facts, S UMMARY to maintain
                                                               a tractable context window, and ultimately gen-
Stage-specific rollout procedures (algorithm 3–                erate a structured response. Once the answer is
5). The three-stage rollout design reflects the nat-           produced or the maximum steps are reached, a
ural progression of memory-augmented task solv-                composite reward function (Section A.2) evaluates
ing. Algorithm 3 implements the first stage, where             the three-stage trajectory across multiple dimen-
the agent engages in casual conversation while be-             sions. This terminal reward R(τ ) is assigned to the
ing gradually exposed to the contextual informa-               final timestep and serves as the supervision signal
tion Iq . During these T1 exploratory turns, the               that propagates back through all three stages during
agent must identify salient information and deter-             advantage computation.

                                                          17
Algorithm 1 AgeMem Training (Part 1)                             Algorithm 2 AgeMem Training (Part 2)
Require: Policy πθ , reference πref , batch B, rollouts K        21: // Advantage Computation
Ensure: Trained policy πθ∗                                                                    (q)
                                                                 22: for each group Gq = {τk }K   k=1 do
 1: Initialize θ and θold ← θ                                                               (k,q) K
                                                                 23:     Extract rewards: {rT }k=1
 2: for each training iteration do                                                1
                                                                                    PK      (k,q)
 3:     E ← ∅ // Init experience buffer                          24:     µGq ← K           rT
                                                                                  q k=1
 4:     // Rollout Phase                                                 σGq ← K−1   1
                                                                                         P  K     (k,q)
                                                                                                        − µGq )2
                                                                 25:                        k=1 (rT
 5:     for each task q ∈ B do                                                                (q)
 6:          Get context Iq for task q                           26:     for each trajectory τk     = (e1 , . . . , eT ) do
                                                                                         (k,q)
 7:          Mdis ← D ISTRACTOR G EN(q)                                       (k,q)     rT     −µGq
                                                                 27:         AT     ←     σGq +ϵ
 8:          for k = 1 to K do
 9:              M ← ∅ // Init LTM                               28:         for t = 1 to T do
                  (1)                                                              (k,q)     (k,q)
10:              τk ← S TAGE 1(Iq , πθ , θold , M)               29:             At      ← AT      // Broadcast
11:              C ← ∅ // Reset STM                              30:         end for
                  (2)                                            31:     end for
12:              τk ← S TAGE 2(Mdis , πθ , θold , M)
13:
                  (3)
                 τk ← S TAGE 3(q, πθ , θold , M)                 32: end for
                  (q)     (1)     (2)     (3)                    33: // Policy Update
14:              τk ← τ k ⊕ τ k ⊕ τ k                            34: J(θ) ← E(et ,At )∼E [ρt At − βDKL [πθ ∥πref ]]
                             (q)
15:              E ← E ∪ τk                                      35: θ ← θ + η∇θ J(θ)
16:          end for                                             36: θold ← θ
17:      end for                                                 37: return πθ
18: end for

Figure 8: Main training procedure of AgeMem. For clarity, we split the algorithm into two parts: the rollout phase
(left) and the advantage computation with policy update (right).


B    Case Study: AgeMem in Action                                Assistant (Baseline):

This section presents three representative case stud-              <think>The user shared their learning
                                                                       preferences. I should respond directly
ies demonstrating how AgeMem enables effective                         without storing this.</think>
unified memory management through reinforce-                       <answer>Great! I can help you learn machine
ment learning. Each case compares agent behavior                       learning with a focus on computer
                                                                       vision. Since you have Python
before and after RL training to highlight the learned                  experience, we can start with practical
memory strategies. We use a personal learning as-                      projects. Would you like to begin with
                                                                       a face recognition tutorial?</answer>
sistant scenario where the agent helps users plan
customized study programs based on their prefer-
ences and constraints.                                           [Later in conversation...]

B.1 Case 1: Long-term Memory Construction                        User: Actually, I realize 60 minutes is too short. I
    and Maintenance                                              work better with 120-minute deep focus blocks.
                                                                 Assistant (Baseline):
This case illustrates how AgeMem learns to selec-
tively construct, update, and maintain long-term                   <think>The user mentioned their new
                                                                       preference, but I don’t have their old
memory across extended conversations. The agent                        preference stored, so I’ll just
must identify salient user information from casual                     acknowledge this.</think>
dialogue and manage memory entries as new infor-                   <answer>Understood! We’ll plan around
                                                                       120-minute sessions. What topics would
mation supersedes old preferences.                                     you like to cover first?</answer>

Before RL training. Prior to training, the base-
line agent lacks strategic memory management. It                 Analysis: The baseline fails to store initial pref-
either stores all information indiscriminately or                erences and cannot recognize when information
fails to recognize when stored knowledge becomes                 needs updating.
obsolete.
                                                                 After RL training. After training with AgeMem,
User: Hello! I’m a visual learner who prefers 60-                the agent demonstrates strategic memory manage-
minute study sessions. I have Python basics but                  ment by selectively storing user preferences, recog-
zero ML experience. I’m particularly interested in               nizing when updates are needed, and maintaining
computer vision applications like face recognition.              clean, consistent memory.

                                                            18
Algorithm 3 Stage 1: LTM Construction
Require: Contextual information Iq , policy πθ ,              Algorithm 4 Stage 2: STM Control under Distrac-
    old params θold , memory M, max turn number               tors
    Nmax                                                      Require: Distractors Mdis , policy πθ , old params
                                         (1)      (1)
Ensure: Stage 1 trajectory τ (1) = (e1 , . . . , eT1 )             θold , memory M, max turn number Nmax
                                                                                                         (2)     (2)
 1: Initialize τ (1) ← ∅ and C ← ∅                            Ensure: Stage 2 trajectory τ (2) = (e1 , . . . , eT2 )
 2: for t = 1 to Nmax do                                        1: Initialize τ (2) ← ∅ and C ← ∅ // M persists
 3:     Sample message mt ∼ Iq                                     from Stage 1
 4:     Mret ← R ETRIEVE(M, mt , k) ∪ mt                        2: for t = 1 to Nmax do
 5:     C ← C ∪ Mret                                            3:      C ← C ∪ {Mdis [t]} // Inject distractor
 6:     st ← (C, M, q)                                          4:      st ← (C, M, q)
 7:     at ∼ πθ (· | st )                                       5:      at ∼ πθ (· | st )
 8:     Update C with response from at                          6:      Update C with response from at
          (1)                                                             (2)
 9:     et ← (st , at , 0, log πθold (at | st ))                7:      et ← (st , at , 0, log πθold (at | st ))
                          (1)                                                             (2)
10:     τ (1) ← τ (1) ∪ {et }                                   8:      τ (2) ← τ (2) ∪ {et }
11:     Memory tool calls from at // Memory Man-                9:      Memory tool calls from at // Memory Man-
    agement                                                        agement
12:     if Output Answer from at then                          10:      if Output Answer from at then
13:           Conversation Break                               11:            Conversation Break
14:     end if                                                 12:      end if
15: end for                                                    13: end for
16: return τ (1)                                               14: return τ (2)


User: Hello! I’m a visual learner who prefers 60-
minute study sessions. I have Python basics but
                                                              Algorithm 5 Stage 3: Integrated Reasoning and
zero ML experience. I’m particularly interested in
                                                              Memory Coordination
computer vision applications like face recognition.
                                                              Require: User query q, policy πθ , old params θold ,
Assistant (AgeMem):
                                                                  memory M, max turn number Nmax
 <think>The user provided important learning                                                           (3)      (3)
                                                              Ensure: Stage 3 trajectory τ (3) = (e1 , . . . , eT3 ),
     preferences and background. This
     information will be valuable for future                      answer Apred
     planning. I should store the key facts:                   1: Initialize τ (3) ← ∅
     visual learner, 60-min sessions, Python
                                                               2: C ← C ∪ {q} // C persists from Stage 2 and
     basics, CV interest.</think>
 <tool_call>[{"name": "Add_memory",                               present query
     "arguments": {"content": "User is a                       3: Apred ← NULL // Init answer
     visual learner who prefers 60-minute
     study sessions", "metadata": {"type":                     4: for t = 1 to Nmax do
     "user_preference", "category":                            5:     st ← (C, M, q)
     "learning_style"}}}, {"name":                             6:     at ∼ πθ (· | st )
     "Add_memory", "arguments": {"content":
     "User has Python basics but zero ML                       7:     Update C with response from at
                                                                        (3)
     experience, interested in computer                        8:     et ← (st , at , 0, log πθold (at | st ))
     vision and face recognition",                                                      (3)
     "metadata": {"type": "user_background",                   9:     τ (3) ← τ (3) ∪ {et }
     "category":                                              10:     Memory tool calls from at // Memory Man-
     "technical_skills"}}}]</tool_call>
                                                                  agement
 <think>Memory stored successfully. Now I can                 11:     if Output Answer from at then
     provide a relevant response based on                     12:           Apred ← answer
     their preferences.</think>
 <answer>Great to meet you! Given your visual                 13:           Conversation Break
     learning style and interest in computer                  14:     end if
     vision, I can design a hands-on                          15: end for
     learning path focused on face
     recognition projects. Your Python                        16: return τ (3) , Apred
     background will be very helpful. We’ll
     structure sessions around 60-minute


                                                         19
      blocks. Would you like to start with a                      permanent choice and no longer needs
      3-day intensive course?</answer>                            any reference to the old preference, I
                                                                  should delete this entry and create a
                                                                  clean new one without historical
[Later in conversation...]                                        references.</think>
                                                              <tool_call>[{"name": "Delete_memory",
User: Actually, I realize 60 minutes is too short. I              "arguments": {"memory_id":
work better with 120-minute deep focus blocks.                "mem_a5b40d65", "confirmed": true}},
                                                                  {"name": "Add_memory", "arguments":
Assistant (AgeMem):                                               {"content": "User is a visual learner
                                                                  who prefers 120-minute deep focus
 <think>The user wants to change their                            blocks for study sessions",
     session duration preference from 60 to                   "metadata": {"type": "user_preference",
     120 minutes. I should update the                             "category":
     existing memory entry rather than                            "learning_style"}}}]</tool_call>
     creating a duplicate.</think>
 <tool_call>[{"name": "Update_memory",                        <think>Memory cleaned up. The old entry with
     "arguments": {"memory_id":                                   historical reference has been removed,
     "mem_a5b40d65", "content": "User is a                        and a fresh entry now reflects only the
     visual learner who prefers 120-minute                        current confirmed preference without
     deep focus blocks (updated from 60                           any outdated information.</think>
     minutes)", "metadata": {"type":                          <answer>That’s wonderful to hear! Is there
     "user_preference", "category":                               anything else about your learning
     "learning_style"}}}]</tool_call>                             preferences you’d like to
                                                                  adjust?</answer>
 <think>Preference updated. I should
     acknowledge this change and offer to
     restructure any existing plans.</think>                Analysis: The trained agent strategically uses
 <answer>Perfect! Would you like me to
     restructure the 3-day plan                             A DD _ MEMORY to store initial preferences,
 around these longer focus blocks?</answer>                 U PDATE _ MEMORY to modify existing infor-
                                                            mation, and D ELETE _ MEMORY followed by
[Much later, after several successful sessions...]          A DD _ MEMORY to clean up memory when histori-
                                                            cal references become obsolete, maintaining clean
User: I’ve been using 120-minute sessions consis-           and current memory state.
tently for a while now, and they’re perfect for my
learning style. I’m completely settled on this dura-        B.2 Case 2: Short-term Context Management
tion - no more experimenting with shorter sessions.             Under Distraction
Assistant (AgeMem):                                         This case demonstrates how AgeMem learns to
 <think>The user has confirmed that                         proactively manage short-term context when faced
     120-minute sessions are their                          with irrelevant information that could interfere with
     permanent, settled preference. I should                task focus. The agent must recognize distractors
     check my memory to see the current
     state. I previously updated the entry                  and apply appropriate filtering or summarization
     from 60 to 120 minutes, but the update                 strategies.
     message still contains a historical
     reference to the old 60-minute                         Before RL training. The baseline agent pas-
     preference ("updated from 60 minutes").
     Since the user has definitively moved                  sively accumulates all conversation content in con-
     away from 60-minute sessions and                       text, leading to dilution of task-relevant information
     confirmed 120 minutes as their                         and eventual context overflow.
     permanent choice, I should clean up
     this historical reference by deleting
     the entry with outdated information and
                                                            User: I need a focused 3-day ML crash course
     creating a fresh, clean entry that only                for face recognition. By the way, I’m also explor-
     reflects the current confirmed                         ing quantum computing, blockchain, robotics, and
     preference.</think>
 <tool_call>[{"name": "Retrieve_memory",                    learning to bake sourdough bread and do latte art.
     "arguments": {"query": "user preference                Assistant (Baseline):
     session duration learning style",
     "top_k": 5}}]</tool_call>                                <think>The user mentioned many interests. I
                                                                  should acknowledge them all before
 <think>Found the entry mem_a5b40d65 which                        addressing the ML course
     contains the updated preference with a                       request.</think>
     reference to the old 60-minute value                     <answer>That’s wonderful that you’re
     ("updated from 60 minutes"). Since the                       exploring so many fascinating areas!
     user has confirmed 120 minutes as their                      Quantum computing and blockchain are


                                                       20
      cutting-edge fields, robotics has                          lists, and resource URLs. Before
      incredible applications, and baking                        generating the final comprehensive
      sourdough with latte art sounds like                       plan, I should summarize the
      great creative hobbies. For your ML                        accumulated details to make room and
      crash course focused on face                               maintain clarity.</think>
      recognition, let me outline a 3-day                    <tool_call>[{"name": "Summary_context",
      plan...</answer>                                           "arguments": {"span":
                                                                 "full"}}]</tool_call>

Analysis: The baseline retains all information               <think>Context summarized. Key information
in context, treating distractors equally with task-              preserved: 3-day structure, 120-min
                                                                 sessions, Day 1 (ML intro + Python),
relevant content. As conversation continues, the                 Day 2 (linear regression), Day 3 (face
context becomes bloated with irrelevant details                  recognition). Tools: Jupyter, Python3,
                                                                 NumPy, Pandas, scikit-learn, OpenCV.
about quantum computing, bread-making, etc., con-                Now I can generate the comprehensive
suming token budget without contributing to the                  final plan without redundancy.</think>
ML planning task.                                            <answer>Here is your complete 3-day machine
                                                                 learning crash course:...</answer>
After RL training. After training with Stage 2
rollouts, AgeMem learns to recognize and filter            Analysis: The trained agent strategically uses
out distractors while preserving task focus. When          F ILTER _ CONTEXT to remove distractors early,
context grows large (simulated here after several          maintaining task focus, and later applies S UM -
exchanges), the agent proactively applies context          MARY _ CONTEXT when context grows large, pre-
management tools.                                          venting overflow while preserving essential infor-
                                                           mation. The baseline would have retained all con-
User: I need a focused 3-day ML crash course
                                                           tent verbatim, leading to context dilution or over-
for face recognition. By the way, I’m also explor-
                                                           flow.
ing quantum computing, blockchain, robotics, and
learning to bake sourdough bread and do latte art.         B.3   Case 3: Integrated Task Execution with
Assistant (AgeMem):                                              Memory Coordination
  <think>The user mentioned many topics, but               This case demonstrates the complete AgeMem
      only the ML crash course and face
      recognition are relevant to the current
                                                           workflow where the agent must retrieve from long-
      task. Quantum computing, blockchain,                 term memory, manage short-term context, and
      robotics, bread, and coffee are                      solve a task requiring coordinated memory opera-
      distractors. I should filter these out
      to maintain focus.</think>
                                                           tions.
  <tool_call>[{"name": "Filter_context",
      "arguments": {"criteria": "quantum                   Before RL training. The baseline agent either
  computing blockchain robotics sourdough                  fails to store information initially or cannot effec-
      latte"}}]</tool_call>                                tively retrieve it when needed, leading to incom-
  <think>Irrelevant topics filtered out from               plete or generic responses.
      context. Now I can focus on the ML
      course planning.</think>                             User: Based on everything I’ve told you about my
  <answer>Understood! Let’s focus on your ML               learning style and preferences, create a personal-
      crash course. I’ll design a 3-day
      intensive program specifically for face              ized Day 1 study schedule with specific time blocks,
      recognition, building on your Python                 topics, and resources.
      background and visual learning
      style...</answer>                                    Assistant (Baseline):
                                                             <think>The user asks for a personalized
                                                                 schedule, but I don’t have their
[After several more exchanges, context has accu-                 preferences readily available since I
mulated detailed daily schedules, tool lists, and                didn’t store them systematically. I’ll
resource links.]                                                 provide a generic schedule.</think>
                                                             <answer>Here’s a Day 1 schedule for machine
User: Can you now give me the final complete plan                learning:
                                                             9:00-10:30 - Introduction to ML concepts
with all details integrated?                                 10:30-10:45 - Break
Assistant (AgeMem):                                          10:45-12:15 - Python basics review
                                                             12:15-1:00 - Lunch
  <think>Context has grown large with detailed               1:00-2:30 - NumPy and Pandas tutorial
      breakdowns for each day, repeated tool                 2:30-2:45 - Break


                                                      21
 2:45-4:15 - Practice exercises                               - Hands-on: Jupyter notebook with embedded
 This should give you a solid                                     plots
     foundation!</answer>                                     - Resources: Python Data Science Handbook
                                                                  (visual chapters)

Analysis: The baseline produces a generic sched-              **Evening (5:00 PM - 7:00 PM): Optional
ule that ignores the user’s stated preference for                 practice**
                                                              - Self-paced exercises with visual feedback
120-minute deep focus blocks and visual learning              - Prepare environment for Day 2
style.
                                                              This structure honors your 120-minute focus
After RL training. After completing AgeMem                        blocks and emphasizes visual learning
training across all three stages, the agent demon-                throughout. Each session includes
                                                                  diagrams, plots, and visual
strates integrated memory coordination: retriev-                  demonstrations rather than pure
ing relevant user preferences from LTM, managing                  text.</answer>
context efficiently, and generating personalized re-
sponses.                                                    Analysis:     The trained agent uses R E -
                                                            TRIEVE _ MEMORY to access stored user
User: Based on everything I’ve told you about my
learning style and preferences, create a personal-          preferences from LTM, then synthesizes this
ized Day 1 study schedule with specific time blocks,        information with the current task to generate a
topics, and resources.                                      highly personalized response that respects the
                                                            120-minute session duration and emphasizes visual
Assistant (AgeMem):
                                                            learning resources. The integration of retrieved
 <think>The user requests a personalized                    memory with task execution produces superior,
     schedule. I need to retrieve their
     stored preferences to ensure the plan                  context-aware outputs compared to the baseline’s
     matches their learning style and                       generic approach.
     constraints.</think>
 <tool_call>[{"name": "Retrieve_memory",                    Summary. These three cases demonstrate how
     "arguments": {"query": "user learning
     preferences study duration visual",                    AgeMem’s three-stage progressive training enables
     "top_k": 3}}]</tool_call>                              agents to develop sophisticated memory manage-
                                                            ment strategies. Case 1 shows selective stor-
 <think>Retrieved: (1) Visual learner,
     120-min deep focus blocks, (2) Python                  age and maintenance of long-term knowledge
     basics, zero ML experience, (3)                        through A DD _ MEMORY, U PDATE _ MEMORY, and
     Interested in computer vision and face
     recognition. Now I can create a truly
                                                            D ELETE _ MEMORY. Case 2 illustrates proac-
     personalized schedule that respects                    tive short-term context control under distraction
     their 120-minute session preference and                via F ILTER _ CONTEXT and S UMMARY _ CONTEXT.
     visual learning style.</think>
 <answer>Here’s your personalized Day 1                     Case 3 demonstrates the integration of these capa-
     schedule, designed for your 120-minute                 bilities, where R ETRIEVE _ MEMORY enables the
     deep focus blocks and visual learning                  agent to access stored knowledge and coordinate
     preference:
                                                            memory systems to solve tasks effectively. In
 **Morning Session (9:00 AM - 11:00 AM): ML                 each case, the RL-trained agent significantly out-
     Foundations**                                          performs the baseline by learning when and how
 - Visual introduction to ML concepts using
     diagrams and flowcharts                                to apply memory tools, resulting in more focused,
 - Interactive demonstrations of supervised                 consistent, and personalized interactions.
     vs unsupervised learning
 - Resources: 3Blue1Brown Neural Networks
     video series                                           C     Experimental Implementation
 - No coding yet - pure concept visualization
                                                            C.1    Dataset Details
 **Break (11:00 AM - 11:30 AM)**
                                                            We provide detailed statistics and characteristics of
 **Afternoon Session (1:00 PM - 3:00 PM):                   the five datasets used in our experiments:
     Python for ML**
 - Visual Python review: data structures with               ALFWorld (Shridhar et al., 2020) is an embod-
     matplotlib plots                                       ied AI benchmark in which agents must complete
 - NumPy array operations with visual matrix                household tasks by following natural language in-
     representations
 - Pandas DataFrames with real datasets and                 structions in a simulated environment. The dataset
     visualization                                          consists of several thousand training environments

                                                       22
and multiple validation and test splits, covering six          supporting facts stored in memory by comparing
task types: pick and place, examine in light, clean            predicted supporting facts with ground-truth ex-
and place, heat and place, cool and place, and pick            pected facts. The evaluator uses the following
two and place. These tasks require long-horizon                prompt template:
interaction with objects, making ALFWorld well                                                                       
suited for evaluating planning and memory man-                 You are an expert judge evaluating the quality
                                                                   of supporting facts for question answering.
agement capabilities.
SciWorld (Wang et al., 2022) is an interactive sci-            Question: [QUESTION]
                                                               Answer: [ANSWER]
ence experiment simulation environment where
agents must perform multi-step experiments to                  Ground Truth Supporting Facts (the facts that
answer scientific questions. The benchmark in-                     should be identified):
                                                               Expected Supporting Facts:
cludes a diverse set of tasks spanning multiple                - [FACT_1]
scientific domains, such as physics, chemistry,                - [FACT_2]
and biology, and emphasizes procedural reasoning               ...
and hypothesis-driven exploration. Its complexity              Model Predicted Supporting Facts (the facts
makes it suitable for testing an agent’s ability to re-            identified by the model and stored in the
tain and retrieve relevant knowledge over extended                 long-term memory):
                                                               Predicted Supporting Facts:
interaction sequences.                                         - [PREDICTED_FACT_1]
PDDL (Chang et al., 2024) refers to a set of plan-             - [PREDICTED_FACT_2]
ning benchmarks formulated using the Planning                  ...
Domain Definition Language. These benchmarks                   Please evaluate how well the predicted
evaluate an agent’s ability to solve symbolic plan-                supporting facts match the ground truth
                                                                   expected facts:
ning problems across multiple domains by gener-                1. Are all expected facts covered by the
ating valid sequences of actions that achieve speci-               predictions?
fied goal states. The tasks primarily test structured          2. Are the predicted facts actually relevant to
                                                                   answering the question?
reasoning and the ability to maintain and utilize              3. Are there any irrelevant facts in the
intermediate planning states.                                      predictions?
BabyAI (Chevalier-Boisvert et al., 2018) is a grid-
                                                               Score on a scale of 0.0 to 1.0:
world navigation benchmark with natural language               - 1.0: Perfect match - all expected facts are
instructions. The environment contains a large                     correctly identified, no irrelevant facts
collection of instruction-following tasks (levels),            - 0.8-0.9: Mostly correct with minor omissions
                                                                   or one irrelevant fact
where agents must navigate and interact with ob-               - 0.6-0.7: Partially correct - some relevant
jects to satisfy compositional language commands.                  facts identified but missing important ones
                                                               - 0.4-0.5: Some correct elements but significant
Due to its sequential decision-making structure,                    errors or omissions
BabyAI is commonly used to evaluate short-term                 - 0.2-0.3: Mostly incorrect with few correct
context tracking and instruction grounding.                        elements
                                                               - 0.0-0.1: Completely incorrect or irrelevant
HotpotQA (Yang et al., 2018) is a multi-hop ques-
tion answering dataset that requires reasoning over            Respond with only a number between 0.0 and 1.0 (
multiple Wikipedia paragraphs. It contains approxi-                e.g., "0.85").
mately 90k training questions along with validation
and test splits, and each question is annotated with           The evaluator compares the stored memory en-
supporting facts. This structure makes HotpotQA                tries (predicted supporting facts) with the ground-
particularly suitable for evaluating long-term mem-            truth supporting facts provided in the HotpotQA
ory storage and retrieval. In our experiments, we              dataset. The score reflects both the coverage of
use HotpotQA for reinforcement learning training,              expected facts and the relevance of predicted facts
as its annotated supporting facts naturally provide            to the question. We use Qwen-Max as the evaluator
structured contextual information for Stage 1 su-              model, and each evaluation is performed indepen-
pervision.                                                     dently to ensure consistency.
                                                                  For the LLM-as-a-Judge metric on HotpotQA,
C.2   LLM-based Evaluation Details                             we use a similar approach, where Qwen-Max eval-
For the Memory Quality (MQ) metric, we employ                  uates the correctness of the agent’s answer by com-
an LLM-based evaluator to assess the quality of                paring it with the ground-truth answer. The evalua-

                                                          23
tor uses the following prompt template:                      RAG variants: For the RAG-based baselines
                                                        
                                                             (AgeMem-noRL-RAG and AgeMem-RAG), we re-
You are an expert judge evaluating the
    correctness of answers to questions.                     place the STM tools with a standard RAG pipeline
Given the following information:                             that retrieves relevant memories at each step and
- Question: [QUESTION]                                       appends them to the context. The retrieval is per-
- Ground-truth Answer: [GROUND_TRUTH]
- Agent’s Answer: [AGENT_ANSWER]                             formed using cosine similarity between the current
                                                             context and stored memories, following standard
Please evaluate the generated answer on a scale              RAG practices. This comparison demonstrates the
    of 0.0 to 1.0:
- 1.0: Perfect match or equivalent correct                   advantage of learned STM management over static
    answer                                                   retrieval-based approaches.
- 0.8-0.9: Mostly correct with minor differences
- 0.6-0.7: Partially correct or close
    approximation
                                                             C.4    Implementation Details
- 0.4-0.5: Some correct elements but significant             Training configuration. We use the Trinity RL
     errors
- 0.2-0.3: Mostly incorrect with few correct                 framework (Pan et al., 2025a) for policy optimiza-
    elements                                                 tion, implementing the step-wise GRPO algorithm
- 0.0-0.1: Completely incorrect or irrelevant                as described in the method section. We use K = 8
Respond with only a number between 0.0 and 1.0 (             independent rollouts per task for group normaliza-
    e.g., "0.85").                                           tion. The KL divergence coefficient β is set to 0.1.
                                                             Reward weights. All reward weights are set to 1/3:
                                                             wtask = wcontext = wmemory = 1/3. This uniform
C.3   Baseline Configurations
                                                             weighting ensures that all components contribute
All baseline implementations follow their respec-            equally to the learning signal, allowing the agent
tive official open-source codebases to ensure fair           to naturally balance task performance and memory
comparison. We provide the source links and im-              management.
plementation details below.                                  Model settings. The maximum context length is
LangMem (LangChain Team, 2025): We use                       set to 8,192 tokens, and the maximum response
the official implementation available at https:              length is set to 2,048 tokens. When the context
//langchain-ai.github.io/langmem/ with de-                   exceeds this limit, the agent receives a penalty, en-
fault hyperparameters. LangMem employs a modu-               couraging proactive use of STM management tools.
lar memory framework that supports multiple mem-             All experiments are conducted on 8 NVIDIA RTX
ory types. We configure it to use the default mem-           4090 GPUs with 48GB memory each.
ory storage and retrieval mechanisms as specified
in the official documentation.                               D     Additional Results
A-Mem (Xu et al., 2025): We implement A-
                                                             D.1    Ablation Study
Mem following the Zettelkasten-inspired design
described in the original paper, using the official          This section provides complementary ablation
codebase at https://github.com/WujiangXu/                    study results for Qwen3-4B-Instruct. Figure 9
A-mem-sys/. The system links structured knowl-               shows the progressive contribution of LTM, STM,
edge units to facilitate consolidation. We use the           and RL components on Qwen3-4B-Instruct across
recommended hyperparameters for memory con-                  three representative datasets. The results demon-
solidation as provided in the repository.                    strate consistent trends with Qwen2.5-7B-Instruct,
Mem0 (Chhikara et al., 2025): We use the of-                 validating the generalizability of our approach
ficial Mem0 implementation available at https:               across different model sizes.
//github.com/mem0ai/mem0 with the default
extract-update pipeline. For the graph-based vari-           D.2    Reward Function Ablation on Qwen3-4B
ant (Mem0g ), we enable the graph structure option           To validate the generalizability of our multi-
and use the recommended graph construction pa-               component reward design across different model
rameters as specified in the official implementation.        architectures and scales, we conduct the same re-
AgeMem-noRL: This variant uses the same tool                 ward function ablation study as in the main text on
interface as AgeMem but without reinforcement                Qwen3-4B-Instruct. This section provides a com-
learning. This baseline helps isolate the contribu-          plete analysis parallel to the Qwen2.5-7B-Instruct
tion of RL training to the overall performance.              results presented in the main paper.

                                                        24
 3 H U I R U P D Q F H  6 F R U H
                                                                                                                                                                      
                                                                                                                                                                                                                                   
                                                                                                                                                                                    
                                                                                                                                                                                                                              
                                                                                                                                                                                                                   
                                                                                                                           
                                                                                                                                                                                         
                                                                    
                                                                                                                                                                                     

                                                                                                                                                                                        
                                              % D V H           / 7         / 7  5 /   / 7  6 7  5 /             % D V H        / 7             / 7  5 /   / 7  6 7  5 /            % D V H        / 7           / 7  5 /   / 7  6 7  5 /
                                                           D   $ / ) : R U O G                                                    E   6 F L : R U O G                                                  F   + R W S R W 4 $
        Figure 9: Ablation study results for Qwen3-4B-Instruct. Base: No-Memory baseline; +LT: AgeMem-noRL-RAG
        (LTM tools only); +LT/RL: AgeMem-RAG (RL with LTM tools); +LT/ST/RL: AgeMem (full AgeMem system
        with RL). Green arrows indicate performance gains over the baseline.
                                            Qwen3-4B - GRPO Training Reward Convergence
                           1.0
                                                                                                                                                    Table 5: Reward function ablation results on HotpotQA
                                                                                                                                                    using Qwen3-4B-Instruct. All-Returns v.s. Answer-
                           0.8
                                                                                                                                                    Only reward strategies. “TN” is the token number, and



 Average Reward
                                                                                                                                                    “TC” denotes the number of tool calls.
                           0.6

                                                                                                                                                         Strategy                      J(↑)          TN(↓)            MQ(↑)                 TC(-)
                           0.4
                                                                                                                                                         Answer-Only                   0.546          2164                0.415             7.21
                           0.2
                                                                                                                                                         All-Returns                   0.555          2191                0.605             8.67
                                                                                                                    All Returns
                                                                                                                    Answer-Only
                           0.00                         20                  40                 60               80                 100              v.s. 0.546) and substantially better memory quality
                                                                            Training Step
                                                                                                                                                    (MQ: 0.605 v.s. 0.415), indicating that explicitly
         Figure 10: Training convergence curves on Qwen3-4B-                                                                                        rewarding memory-related behaviors leads to more
         Instruct comparing All-Returns (solid line) v.s. Answer-                                                                                   reliable memory organization. The All-Returns
         Only (dashed line) reward strategies.                                                                                                      strategy also encourages more active tool usage
                                                                                                                                                    (8.67 v.s. 7.21), suggesting that the agent learns
                                                                                                                                                    to leverage memory operations more effectively
         D.2.1                                 Convergence Analysis
                                                                                                                                                    when intermediate returns are optimized. This im-
         Figure 10 demonstrates the reward convergence pat-                                                                                         provement comes with only a marginal increase
         terns on Qwen3-4B-Instruct. Similar to Qwen2.5-                                                                                            in token consumption (2191 v.s. 2164), implying
         7B-Instruct, the All-Returns strategy consistently                                                                                         that the gains are not driven by excessive context
         outperforms Answer-Only throughout the training                                                                                            expansion but by more efficient memory utiliza-
         process. Several notable observations emerge:                                                                                              tion. Overall, these results show that incorporating
            More Stable Dynamics: The convergence                                                                                                   memory-aware rewards significantly enhances both
         curve shows noticeably smoother progression with                                                                                           memory quality and task performance on Qwen3-
         lower variance, particularly in the later training                                                                                         4B-Instruct. The observed trends are consistent
         stages (steps 70-100). This stability suggests that                                                                                        with those obtained on Qwen2.5-7B-Instruct, con-
         Qwen3’s architecture may have better inductive                                                                                             firming the robustness of the reward design across
         biases for the reward learning task.                                                                                                       different model backbones.
            Consistent Superiority: While the absolute im-
         provement is smaller than Qwen2.5-7B-Instruct,
         the All-Returns strategy maintains its advantage
         throughout training, validating the robustness of
         our reward design.

         D.2.2                                 Quantitative Results
        Table 5 reports the reward ablation results on Hot-
        potQA with Qwen3-4B-Instruct. Compared to the
        Answer-Only strategy, the All-Returns reward con-
        sistently improves overall performance. In particu-
        lar, it yields higher LLM-as-a-Judge scores (0.555

                                                                                                                                           25
