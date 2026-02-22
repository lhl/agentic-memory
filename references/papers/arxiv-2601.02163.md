<!-- Generated from arxiv-2601.02163.pdf via pdftotext -layout on 2026-02-22 -->

                                        EverMemOS: A Self-Organizing Memory Operating System for Structured
                                                             Long-Horizon Reasoning

                                         Chuanrui Hu1,2 * , Xingze Gao1,2 * , Zuyi Zhou1,2 , Dannong Xu1,2 , Yi Bai1,2 , Xintong Li1,2 ,
                                               Hui Zhang1,2 , Tong Li1,2 , Chong Zhang2 , Lidong Bing2† , Yafeng Deng1,2†
                                                                      1
                                                                        EverMind 2 Shanda Group
                                            {chuanrui.hu, xingze.gao, zuyi.zhou, dannong.xu, baiyi, xintong.li,
                                            zhanghui, litong02, zhangchong, lidong.bing, dengyafeng}@shanda.com


                                                                   Abstract
                                                Large Language Models (LLMs) are increas-




arXiv:2601.02163v2 [cs.AI] 9 Jan 2026
                                                ingly deployed as long-term interactive agents,
                                                yet their limited context windows make it dif-
                                                ficult to sustain coherent behavior over ex-
                                                tended interactions. Existing memory systems
                                                for LLMs often store isolated records and re-
                                                trieve fragments, limiting their ability to consol-
                                                idate evolving experience and resolve conflicts.
                                                We introduce EverMemOS, a self-organizing
                                                memory operating system that implements an
                                                engram-inspired lifecycle for computational
                                                memory. First, Episodic Trace Formation con-
                                                verts dialogue streams into MemCells that cap-
                                                ture episodic traces, atomic facts, and time-
                                                bounded foresight. Second, Semantic Con-
                                                solidation organizes MemCells into thematic
                                                MemScenes, distilling stable semantic struc-
                                                tures and updating user profiles. Finally, Re-            Figure 1: Evaluation results of different memory meth-
                                                constructive Recollection performs MemScene-              ods for LLMs on two benchmarks (LoCoMo and Long-
                                                guided agentic retrieval to compose the nec-              MemEval). All methods are based on GPT-4.1-mini.
                                                essary and sufficient context for downstream
                                                reasoning. Experiments on LoCoMo, Long-
                                                MemEval, and PersonaMem-v2 show that Ev-                  is a direct approach, but ultra-long contexts still
                                                erMemOS significantly outperforms state-of-               degrade in performance (e.g., the “Lost-in-the-
                                                the-art methods on memory-augmented rea-                  Middle” phenomenon) and incur prohibitive com-
                                                soning tasks. Our code is available at https:             putational costs (Liu et al., 2024). Consequently,
                                                //github.com/EverMind-AI/EverMemOS.                       recent research has increasingly focused on con-
                                                                                                          structing memory for LLMs that can both store past
                                                                                                          information and organize experiences into coher-
                                        1       Introduction
                                                                                                          ent, evolving structures that support long-horizon
                                        Large Language Models (LLMs) are increasingly                     reasoning (Wu et al., 2025; Maharana et al., 2024).
                                        deployed as long-term interactive agents rather                      Recently, a broad range of memory-augmented
                                        than transient conversational tools (Yehudai et al.,              approaches have been proposed, including retrieval-
                                        2025; Ferrag et al., 2025). For providing better per-             based memory (Zhong et al., 2024; Packer et al.,
                                        sonalized services, LLM-based agents must main-                   2024), trainable memory (Zheng et al., 2024; Gong
                                        tain consistent personas and user models over ex-                 et al., 2024), and more recently Memory Operating
                                        tended interactions while continuously incorpo-                   Systems that unify storage, retrieval, filtering, and
                                        rating new constraints over extended timeframes,                  updating (Li et al., 2025; Kang et al., 2025). How-
                                        spanning days, months, or even years. To ad-                      ever, enabling long-term consistency in reasoning
                                        dress this challenge, expanding context windows                   remains challenging. While these methods improve
                                            *    Equal contribution.                                      scalability and modularity, most of them treat mem-
                                            †
                                                 Corresponding author.                                    ory as flat collections of isolated records. As a re-

                                                                                                      1
sult, many failures stem not from missing informa-                                           Interaction History
                                                                            Last Month                                   Last Week
tion but from poor integration, where fragmented                         What's good for relaxing?                  Had a terrible toothache.

experiences are not consolidated into higher-level                      Maybe a movie or a drink?                  Have you seen the dentist?

semantic structures. Without consolidation and ab-                        Yeah, I love grabbing a                Dentist prescribed antibiotics
                                                                        cold beer, specifically IPAs.            for 2 weeks.
straction, agents may retrieve relevant facts yet fail
                                                                          Current Query                 Recommend a drink for my movie night.
to detect conflicts, maintain stable user models, or
                                                                    Flat Memory Store                             Semantic Consolidation
reason consistently over time. Therefore, a key
                                                                                                                    MemCell        Atomic Fact
limitation of existing memory methods is the
                                                                  Episode Memory                                     Episode       Foresight
absence of an explicit mechanism to transform                                     \
                                                                   Time: Last month
                                                                   Episode: “User expressed a                                              User
fragmented episodic experiences into coherent                      strong preference for IPA…”                                            Profile


and stable knowledge structures that support                                                                       MemScene

long-horizon reasoning.                                             Episodic Memory Retrieve                           Context Reconstruction

   To address the above limitation, we propose Ev-
                                                                  Episode Memory                                   Retrieved             User
erMemOS, a unified and product-ready Memory                         Time: Last Week
                                                                                                                    Episode             Profile

                                                                    Episode: " User reported a
Operating System that models memory as a dy-                        toothache and a dentist visit…”
                                                                                                                  Time-bounded
                                                                                                                    Foresight
                                                                                                                                        Synthesized
                                                                                                                                        User Context
namic lifecycle for long-term LLM-based agents.                   Generated Response                                Generated Response
As shown in Figure 1, EverMemOS significantly                          Fragment-Based Retrieval QA                      Reconstructive Recollection
                                                               I remember you mentioned IPAs are your           To stay safe, you should avoid alcohol.
outperforms the state-of-the-art memory methods                go-to! For a movie night, I'd suggest            How about making some refreshing
                                                               picking up a craft beer variety pack !"          mocktails ?
for LLMs in experimental evaluation, relatively im-            Fragment-based Memory                                       EverMemOS
proving overall accuracy by 9.2% on LoCoMo and
                                                             Figure 2: Comparison of typical fragment-based mem-
6.7% on LongMemEval compared to the strongest
                                                             ory and EverMemOS in an interactive chat scenario.
baseline method. EverMemOS aims to trans-
form fragmented episodic experiences into coher-             tured by existing benchmarks, they expose a funda-
ent and stable knowledge structures that support             mental limitation of fragment-based memory and
long-horizon reasoning through three phases. First,          motivate the system-level design of EverMemOS.
Episodic Trace Formation transforms the un-                  Empirically, comprehensive experiments on three
bounded stream of interaction history into discrete,         benchmarks for memory-augmented reasoning con-
stable memory traces (termed MemCells). Second,              sistently indicate the superiority of EverMemOS,
Semantic Consolidation transforms MemCells                   compared to the state-of-the-art methods.
into stable, scene-level structures (termed Mem-
                                                                Our contributions are summarized as follows:
Scenes) that support coherent aggregation, such
as maintaining consistent user profiles across in-
teractions. Finally, Reconstructive Recollection,               • System Design: We introduce EverMemOS,
guided by the principle of necessity and sufficiency,             a unified and product-ready Memory Operat-
actively composes only the grounded context re-                   ing System for LLMs that reconceptualizes
quired for a given query and supports long-horizon                memory as a lifecycle, shifting from passive
reasoning, rather than indiscriminately retrieving                storage of records to structured organization
all potentially relevant records.                                 of experience.
   EverMemOS does not aim to simulate biologi-
cal memory at the neural level. Instead, it draws               • Innovative Method: We propose a three-
on organizing principles from biological memory                   phase method that can transform fragmented
systems and translates them into a computational                  episodic experiences into coherent and sta-
framework. Figure 2 illustrates the intuition be-                 ble knowledge structures that support long-
hind EverMemOS. A fragment-based system may                       horizon reasoning.
recall a user’s preference for IPA and recommend
an alcoholic drink, failing to account for a newly              • Empirical Validation: Experimental re-
introduced constraint that the user is taking antibi-             sults demonstrate that EverMemOS achieves
otics. In contrast, EverMemOS consolidates these                  state-of-the-art performance on multiple long-
experiences into a coherent representation of the                 context benchmarks for memory-augmented
user’s state, enabling the agent to safely recom-                 reasoning, validating the effectiveness of
mend a non-alcoholic alternative. Although such                   lifecycle-based memory organization.
foresight-oriented behaviors are not explicitly cap-

                                                         2
2     Related Work                                              While these systems advance structural organiza-
                                                             tion, they primarily focus on storage optimization
2.1    Memory Mechanisms in LLMs
                                                             or fact maintenance. EverMemOS distinguishes
Context Window Extension. Large language mod-                itself by implementing a three-phase memory lifecy-
els (LLMs) are constrained by fixed-length context           cle that transforms episodic traces into synthesized
windows. Prior work extends context via sparse               semantic structures for long-horizon reasoning.
attention (Beltagy et al., 2020; Zaheer et al., 2020),
recurrence (Dai et al., 2019; Bulatov et al., 2022),         3     EverMemOS
and length extrapolation (Chen et al., 2024, 2025).
However, longer context does not guarantee ef-               3.1   Framework Overview
fective utilization: the “Lost-in-the-Middle” phe-           Drawing inspiration from the biological engram
nomenon persists (Liu et al., 2024; Bulatov et al.,          lifecycle (Josselyn et al., 2015), EverMemOS
2023), suggesting context extension alone is insuf-          follows a three-phase workflow (Figure 3): (1)
ficient for durable memory.                                  Episodic Trace Formation encodes interaction
   Retrieval-Augmented and Parametric Mem-                   streams into MemCells; (2) Semantic Consolida-
ory.      Retrieval-augmented generation (RAG)               tion organizes MemCells into MemScenes and up-
(Lewis et al., 2020) externalizes memory to al-              dates user profiles; and (3) Reconstructive Recol-
leviate window limits, but its reliability depends           lection performs MemScene-guided retrieval under
on retrieval quality (Ram et al., 2023). Paramet-            the principle of necessity and sufficiency.
ric approaches internalize information, yet often
suffer from forgetting and instability (De Lange             3.2   Memory Primitives
et al., 2022). Hybrid approaches (Wang et al., 2023;         At the core of EverMemOS is the MemCell, the
Packer et al., 2024) alleviate issues but lack a uni-        atomic unit bridging low-level data and high-level
fied organizational principle for persistent memory.         semantics. Formally, a MemCell c is a tuple c =
2.2    Memory Systems                                        (E, F , P, M ), where:

Early Computational Memory. Early differ-                        • E (Episode): A concise third-person narrative
entiable memory systems (e.g., NTM/DNC/Key–                        of the event, serving as the semantic anchor.
Value memories) (Graves et al., 2014, 2016; Miller
et al., 2016) introduced external memory interac-                • F = {f1 , . . . , fn } (Atomic Facts): Discrete,
tion, but scale poorly and are ill-suited to modern                verifiable statements derived from E for high-
autoregressive LLMs.                                               precision matching.
   Memory in LLM Agents. As LLM-based
agents evolve (Xi et al., 2023; Xia et al., 2024),               • P (Foresight): Forward-looking inferences
memory systems have shifted toward persistent                      (prospections; e.g., plans and temporary
state integration.      Recent systems introduce                   states) annotated with validity intervals
episodic (Wang and Chen, 2025), semantic (Shinn                    [tstart , tend ] to support temporal awareness.
et al., 2024), and hierarchical task memory (Sun
and Zeng, 2025). However, many designs still rely                • M (Metadata): Contextual grounding includ-
on fragmented text units and limited consolida-                    ing timestamps and source pointers.
tion, which can degrade long-horizon performance
(Packer et al., 2024).                                       This structure turns memory from a static record
   Memory Operating Systems. Recent work for-                (E, F) into a temporally grounded representation
malizes memory management as a system-level                  that also supports Foresight (P ).
runtime. Some focus on lifecycle and capacity,
                                                             3.3   Phase I: Episodic Trace Formation
such as Nemori’s (Nan et al., 2025) prediction-
driven updates and MemoryOS’s (Kang et al., 2025)            Grounded in the engram concept (Josselyn et al.,
hierarchical control. Others, like Mem0 (Chhikara            2015), this first phase transforms the unbounded
et al., 2025) and Zep (Rasmussen et al., 2025), pri-         stream of interaction history D = {d1 , . . . , dT }
oritize structured fact maintenance via knowledge            into discrete, stable memory traces (MemCells).
graphs, while MemOS (Li et al., 2025) targets uni-           This process adopts a three-step pipeline to distill
fied scheduling across memory types.                         semantic signal from noisy interaction data:

                                                         3
                      Conversation History                   New Conversation
                                                                                                        A segmentation boundary                    Episode History                    Conversation History
                     I will go to Beijing next week.          Hi, I have been jogging
                                                              consistently for over a                      should be placed？                     I will go to Beijing next…             Hi, I have been jogging
                         Beijing is a city that…             month, but I'm about to…
                                                                                                             Segmentation                                                               consistently for over…
                                                                                                                                                   Beijing is a city that…
                                  ···
                     I will travel with my friends...       I totally understand how you
                                                                                                               Criterion                                    ···                         I totally understand how
                                                                  feel! Jogging is …                                                               I will travel with my...
                                                                                                                                                                                          you feel! Jogging is …
                      Traveling with friends is…                                                                                                   Traveling with friends…
                                                                       ···                                                                                                                          ···
                                  ···
                                                                                                         Enqueue                                                  Generate MemCell

                                                                                                                                  MemCell
                                                                                           Foresight                                                                               Atomic Facts
                    MemScene Pool                                                                                                   Episode
       Phase I                                                               [3 days] Need to prepare the necessary
                                                                                                                            On August 26, 2025 at
                                                                                                                                                                      The user stated that they will travel
                                                                             identification documents and clothing.
       Episodic MemCell ···                                                                                                 approximately 08:00 AM
                                                                                                                                                                      to Beijing next week.
                                                                             [Long term] Improving photography              UTC, the user initiated the
       Trace                                                                 skills to capture the beauty.                  conversation by stating …
                                                                                                                                                                      The user asked for some suggestions.

       Formation


                                                           Similarity Calculation

                                                                                                                                  MemScene：
                                                                                                                              Urban Travel Planning                                User
                                                                                                                                                                                  Profile
                                                                                                                                 MemCell     ···
                                                                                                                                                                                  Explicit Info
                                                                                                                                                                Update
                                                                                                                                           ···                  Profile           Implicit Traits
       Phase II                                     MemScene
                                                                       Incremental                                                  MemScene
                                                                        Clustering
       Semantic                                       Pool                                                                                                                        Evidence snippets
                                                                                                                                   MemBase
       Consolidation

                                                                                                                           Recall Foresight
                  Recommend a suitable                                                           Date Filter                                         Foresight                Memory-Augmented Assistant
                  lunch option for me.                                                                                       Recall Profile                                   Agent: “Given your recent blood
                                                                                                                                                                              sugar results, I would suggest
                 Chat Query                                                                                                                                                   a clear-broth hot pot with
                                                                                                                                                      Profile
                                                                                                                User                                                          plenty of vegetables, lean meats,
                                                                                        MemScene               Profile                                Episode                 and tofu …”
                                                        Scene
                 Reasoning Query                        Match
                  What am I most looking                                                                                                                                      Memory-Augmented Reasoning
                  forward to on my trip                                                            ··· MemCell                Query                   Episode
                                                                                                                                                                              Agent: “During your trip to Beijing,
                  to Beijing?                                                                                      Mem        Rewrite                                         what you are most looking forward
                                                                                                                   Base
       Phase III                                                                                                                                                              to is exploring the local cuisine.”

       Reconstructive                                      Recall Scene
                                                                                                    Recall Episode
                                                                                                                                                                       Is the retrieved context
       Recollection                                                                         Episode Rerank                        Sufficiency check                    sufficient?



Figure 3: The EverMemOS workflow mirrors an engram-inspired memory lifecycle: (1) Episodic Trace Formation
segments continuous dialogue into MemCells with episodes, atomic facts, and time-bounded foresight. (2) Semantic
Consolidation organizes MemCells into MemScenes and updates a user profile. (3) Reconstructive Recollection
performs MemScene-guided retrieval to compose the necessary and sufficient context.

Contextual Segmentation To discretize continu-                                                               we prompt the LLM over the rewritten Episode
ous streams, a Semantic Boundary Detector pro-                                                               E to output a constrained schema of Atomic
cesses interactions via a sliding window. Upon                                                               Facts and Foresight signals with validity intervals
detecting a topic shift, accumulated turns are encap-                                                        [tstart , tend ]. These components are bundled with
sulated as a raw episode history. We implement this                                                          metadata M to form the final MemCell c.
step via LLM prompting; while boundary detec-
tion is not perfect, we find it robust in downstream                                                         3.4         Phase II: Semantic Consolidation
evaluation (see Table 3).                                                                                    Inspired by systems consolidation (McGaugh,
                                                                                                             2000), EverMemOS employs an online mechanism
Narrative Synthesis To resolve dialogue redun-                                                               that organizes MemCells into higher-order struc-
dancy and ambiguity, the episode history is syn-                                                             tures to transition from transient episodes to stable
thesized into a high-fidelity Episode (E). This                                                              long-term knowledge.
rewriting process produces a concise, third-person
narrative with resolved coreferences, establishing a                                                         Incremental Semantic Clustering EverMemOS
stable semantic anchor.                                                                                      organizes memory dynamically. When a new Mem-
                                                                                                             Cell c arrives, the system computes its embedding
Structural Derivation From E, the system ex-                                                                 and retrieves the nearest MemScene centroid. If
tracts Atomic Facts (F) for precise matching                                                                 similarity exceeds a threshold τ , c is assimilated
and generates Foresight signals (P ) with inferred                                                           and the scene representation is incrementally up-
validity intervals (e.g., distinguishing temporary                                                           dated; otherwise, a new MemScene is instantiated.
"flu" from permanent "graduation"). Concretely,                                                              This online process maintains thematic structure in

                                                                                                     4
real-time without batch reprocessing.                         tionally incorporates the User Profile and time-
                                                              valid Foresight signals, filtered by the current time
Scene-Driven Profile Evolution Scene-level
                                                              tnow ∈ [tstart , tend ]; since these capabilities are
consolidation can also update a compact User Pro-
                                                              not covered by existing reasoning benchmarks, we
file from aggregated evidence. When a new Mem-
                                                              present them through qualitative case studies.
Cell is assimilated into a MemScene, EverMemOS
updates a concise scene summary and refreshes the             4       Experiments
user profile by prompting over these summaries
(rather than individual turns), helping separate sta-         We evaluate EverMemOS on two long-horizon
ble traits from temporary states. We maintain a               memory-augmented reasoning benchmarks (Lo-
compact profile of explicit facts (including time-            CoMo (Maharana et al., 2024) and Long-
varying measurements) and implicit traits, updated            MemEval (Wu et al., 2025)), and report a profile
online from scene summaries with recency-aware                study on PersonaMem-v2 (Jiang et al., 2025).
updates and conflict tracking (Appendix B.3).                 4.1      Experimental Setup
3.5   Phase III: Reconstructive Recollection                  Benchmarks We evaluate memory-augmented
Building on theories of reconstructive memory                 reasoning on LoCoMo and LongMemEval. Lo-
(Schacter, 2008), retrieval in EverMemOS is mod-              CoMo contains 1,540 questions over 10 ultra-long
eled not as a static lookup but as an active Re-              dialogues (∼9K tokens each), spanning single-hop,
construction process, guided by the principle of              multi-hop, and temporal questions. LongMemEval
necessity and sufficiency. Given a query q, Ever-             (S-setting, ∼115k tokens per conversation) eval-
MemOS performs agentic retrieval grounded in                  uates 500 questions requiring full-history parsing
MemScenes.                                                    across core capabilities (e.g., updates and absten-
                                                              tion). We additionally evaluate user profiling on
MemScene Selection We first compute relevance                 PersonaMem-v2.
between the query and all MemCells by fusing
                                                              Baselines We compare EverMemOS against
dense and BM25 retrieval over their Atomic Facts
                                                              state-of-the-art memory systems: Zep (Rasmussen
F via Reciprocal Rank Fusion (RRF). We then
                                                              et al., 2025), Mem0 (Chhikara et al., 2025),
score each MemScene by the maximum relevance
                                                              MemOS (Li et al., 2025), MemoryOS (Kang
among its constituent MemCells and select a small
                                                              et al., 2025), and MemU1 . Fair comparison:
set of the highest-scoring MemScenes.
                                                              We standardize the answer-generation backbone
Episode and Foresight Filtering Within the se-                across methods while keeping each baseline’s of-
lected MemScenes, we pool Episodes from their                 ficial memory configuration unchanged; for Long-
constituent MemCells and re-rank them to select               MemEval, we report baseline scores from the of-
a compact set for downstream inference. We then               ficial MemOS leaderboard. Full settings are pro-
apply Foresight Filtering, retaining only time-               vided in Appendix A.1.
valid Foresight whose validity intervals satisfy
                                                              Evaluation Protocol We adopt the LLM-as-a-
tnow ∈ [tstart , tend ] (discarding expired ones).
                                                              judge protocol, following MemOS: each answer is
Agentic Verification and Query Rewriting The                  evaluated by GPT-4o-mini and two auxiliary judge
retrieved context is evaluated by an LLM-based                models, and scores are averaged across the three
verifier for sufficiency. If it is deemed insufficient,       judgments in a blind setting. We validate the relia-
the system triggers a query rewriting step to sup-            bility of this protocol against human annotations in
plement retrieval; otherwise, the context is passed           Section A.2 (Appendix), showing high agreement
to the downstream module. Prompt templates are                (Cohen’s κ > 0.89).
provided in Appendix C.1.
                                                              Implementation Details EverMemOS uses GPT-
Task Modes We consider two downstream                         4.1-mini (or GPT-4o-mini where specified) for
settings that share the same retrieval pipeline:              all reasoning and memory operations. Retrieval
Memory-Augmented Reasoning and Memory-                        uses hybrid dense+BM25 fusion (RRF) with re-
Augmented Chat. For Reasoning, we use the re-                 ranking. Default retrieval hyperparameters are in
trieved Episodes as context for benchmark eval-                   Open-source memory infrastructure: https://github.
                                                                  1

uation. For Chat, the composed context addi-                  com/NevaMind-AI/memU


                                                          5
Appendix A.1. Unless otherwise specified, quanti-                                                      LoCoMo
tative experiments use Memory-Augmented Rea-                         EverMemOS                                                            93.05

soning. We provide a token-level cost breakdown                  w/o MemScene                                                   89.16

by lifecycle phase in Appendix (Table 8).                            w/o MemCell                                    81.82

                                                             w/o EverMemOS 0.52
4.2   Main Results                                                                  0   5                   80                  90                     100

Main results on two benchmarks are reported in                                                       LongMemEval
Tables 1-2. We make three observations:                              EverMemOS                                               83.00

   (1) Lifecycle-driven performance gains. Ev-                   w/o MemScene                                           79.60

erMemOS outperforms the strongest baseline on                        w/o MemCell                            71.20

each benchmark overall, i.e., Zep on LoCoMo by               w/o EverMemOS              5.00
7.0% and 9.2%, and MemOS on LongMemEval                                             0   5              70             80             90                100
                                                                                                      Accuracy (%)
by 6.7%. We attribute this to the shift from flat
memory storage to a structured lifecycle, which             Figure 4: Ablation results (overall accuracy) on Lo-
                                                            CoMo and LongMemEval.
consolidates fragmented experiences into usable
knowledge before retrieval, providing a more ro-                                                Accuracy                    Recall
bust context than isolated record matching.                                                          LoCoMo
   (2) Structural consolidation aids complex rea-
                                                                           90
soning that requires integrating dispersed evi-

                                                               Score (%)
dence. We can observe significant gains on Lo-                             80
CoMo multi-hop (+19.7%) and temporal (+10.0%)
tasks, as well as LongMemEval knowledge update                             70
(+20.6%), validating the effectiveness of Mem-                                                         K=10
                                                                           60
Scenes. By clustering related episodes into coher-                              1           3   5       10            15         20               30
ent thematic units, EverMemOS presents the solver                                               LongMemEval
with a complete narrative context. This enables                          100
LLMs to naturally bridge dispersed evidence and
                                                                           80
resolve state conflicts that confuse other models
                                                             Score (%)
relying on fragmented retrieval.                                           60
   (3) EverMemOS offers a favorable accuracy-
                                                                           40
efficiency trade-off. As shown in Figure 6 , Ev-                                                       K=10
erMemOS attains high accuracy with moderate re-                            20
                                                                                1           3   5       10            15         20               30
trieval budgets. This efficiency confirms the utility                                               Scene Top-K
of the Reconstructive Recollection phase, where
                                                            Figure 5: Sensitivity analysis on the MemScene count
the agentic sufficiency check ensures the context           (N ).
is composed of necessary and sufficient evidence,
avoiding the noise accumulation common in fixed-               As shown in Figure 4, performance degrades
budget retrieval.                                           stepwise as structure is removed, revealing three
                                                            corresponding capability losses. Removing Mem-
4.3   Ablation Study                                        Scenes eliminates scene-level organization, weak-
We conduct ablations on LoCoMo to isolate                   ening cross-turn aggregation over related episodes.
the contributions of MemScenes, MemCells, and               Removing MemCells further drops the stable se-
episode segmentation.                                       mantic units (episodes/facts), forcing retrieval to
   Impact of Memory Architecture. To isolate                rely on raw dialogue matching. Finally, remov-
the contribution of memory structure, we compare            ing external memory collapses long-horizon per-
EverMemOS with three degraded variants: w/o Ev-             formance, indicating that many queries cannot be
erMemOS (no external memory), w/o MemScene                  handled reliably within the context window alone.
(flat retrieval over MemCells), and w/o MemCell                Effectiveness of Episode Segmentation. We
(retrieval over raw dialogue). The backbone model           evaluate semantic episode segmentation against
and prompts are fixed, and only the memory repre-           fixed heuristics and ground-truth boundaries un-
sentation and retrieval pipeline are varied.                der w/o MemScene to isolate boundary quality.

                                                        6
                         Method                      Avg. Tokens        Single Hop            Multi Hop          Temporal       Open Domain        Overall
                         GPT-4o-mini backbone
                         MemoryOS                               5.2k      62.43                56.50               37.18           40.28            54.70
                         Mem0                                   1.0k      66.71                58.16               55.45           40.62            61.00
                         MemU                                   4.0k      72.77                62.41               33.96           46.88            61.15
                         MemOS                                  2.5k      81.45                69.15               72.27           60.42            75.87
                         Zep                                    1.4k      88.11                71.99               74.45           66.67            81.06
                         EverMemOS                              2.5k   91.08 (↑3.4%)       86.17 (↑19.7%)      81.93 (↑10.0%)   66.67 (↑0.0%)    86.76 (↑7.0%)
                         GPT-4.1-mini backbone
                         MemoryOS              5.5k                       67.30                59.34               42.26           59.03            60.11
                         Mem0                  1.0k                       68.97                61.70               58.26           50.00            64.20
                         MemU                  4.0k                       74.91                72.34               43.61           54.17            66.67
                         MemOS                 2.5k                       85.37                79.43               75.08           64.58            80.76
                         Zep                   1.4k                       90.84                81.91               77.26           75.00            85.22
                         EverMemOS             2.3k                    96.67 (↑6.4%)       91.84 (↑12.1%)      89.72 (↑16.1%)   76.04 (↑1.4%)    93.05 (↑9.2%)

Table 1: Main results on LoCoMo under two backbones. All metrics are accuracy (%), except Avg. Tokens. For
EverMemOS, values in parentheses denote relative change (%) compared to the strongest baseline under the same
backbone.

                        Method                 Token        SS-User         SS-Asst           SS-Pref         Multi-S   Know. Upd Temp. Reas         Overall
                        MemU                     0.5k    67.14         19.64          76.67         42.10         41.02          17.29         38.40
                        Zep                      1.6k    92.90         75.00          53.30         47.40         74.40          54.10         63.80
                        Mem0                     1.1k    82.86         26.78          90.00         63.15         66.67          72.18         66.40
                        MemOS                    1.4k    95.71         67.86          96.67         70.67         74.26          77.44         77.80
                        EverMemOS                2.8k 97.14 (↑1.5%) 85.71 (↑14.3%) 93.33 (↓3.5%) 73.68 (↑4.3%) 89.74 (↑20.6%) 77.44 (↑0.0%) 83.00 (↑6.7%)

Table 2: Main results on LongMemEval (accuracy, %). SS denotes single-session tasks; baselines are from the
official MemOS results (Li et al., 2025). For EverMemOS, values in parentheses denote relative change (%)
compared to the strongest baseline for that metric.


                                                     K=10                           K=30                                                    Answer Model
                                           K=5
                                        K=3
                        90                                                                                Segmentation Method        GPT-4.1-mini      Qwen3-4B




 Overall Accuracy (%)
                                               Zep
                                                                                                          Heuristic Baselines
                        80                                  MemOS
                                                                                                          Fixed-Message-10               88.05            80.95
                                 K=1
                                                                            EverMemOS                     Fixed-Token-512                87.55            80.67
                        70                                                                                Fixed-Token-1024               84.52            75.19
                                                                        MemU
                                           Mem0                                                           Semantic Segmentation
                        60                                             Memory OS                          Session (Oracle)               87.66            80.63
                                                                                                          Default (EverMemOS)
                             0         1,000     2,000      3,000   4,000   5,000     6,000                  w/ GPT-4.1-mini             89.16            83.07
                                                     Answer Token Usage                                      w/ Qwen3-4B                 89.78            82.73
Figure 6: Performance vs. cost frontier on LoCoMo by                                                    Table 3: Comparison of boundary detection strategies.
varying the retrieved episode count (K).                                                                Session (Oracle) uses the ground-truth session parti-
                                                                                                        tions provided by LoCoMo.
We compare three strategies: (1) Fixed Heuristics
(fixed message count N = 10 or token thresholds                                                         (accuracy changes ≤0.7 points).
N = 512, 1024); (2) Session (Oracle) (ground-
truth session boundaries); and (3) EverMemOS                                                            4.4    Hyperparameter Analysis
(semantic segmentation with different backbones).                                                       We investigate the impact of retrieval scope via
   Table 3 shows that (i) semantic segmentation                                                         two hyperparameters: the number of retrieved
consistently outperforms fixed heuristics, espe-                                                        MemScenes (N ) and episodes (K). As shown
cially coarse token chunking; (ii) it also outper-                                                      in Figure 5, performance gains saturate around
forms Session (Oracle), suggesting sessions are                                                         N = 10. Figure 6 further illustrates the efficiency–
not always optimal retrieval units; and (iii) results                                                   accuracy frontier governed by K. We therefore
are robust across boundary-detection backbones                                                          adopt N = 10 and K = 10 as the default configu-

                                                                                                  7
                     Case 1： Episodic Memory Recall                                                 Case 2: Longitudinal Profile Modeling
       [2025-08-20] User: I have tried playing badminton a few times, but this              [2025-07-07] User: I just measured my waist circumference, and it is 104
       time I sprained my leg. Please give me some recovery advice.                         cm. Can you give me some advice?
       [2025-08-20] Assistant: [Detailed rehab plan for ankle sprain.]                      [2025-10-20] User: I just measured my waist, it's now 96cm, down 8cm!
       [2025-08-20] User: The doctor's specific diagnosis is a grade II ankle               My pants feel loose.
       sprain on the right foot, and the injured area has already been given                [2025-11-03] User: I weighed myself today, still 80kg, no rebound. Looks
       preliminary treatment.                                                               like I can keep it under control even in winter.

                Query [2025-12-01] How did I get injury last time?                          Query [2025-12-01] What body goals should I set for the next phase?

                  EverMemOS                               w/o EverMemOS                                EverMemOS                           w/o EverMemOS
        You sustained a Grade II sprain           Sports injuries are often caused by        Given your sustained waist            Aim for a healthy BMI and
        on your right ankle, caused during        overuse or inadequate warm-up              reduction and stable weight,          maintain a balanced diet to stay in
        a badminton session, as confirmed         during physical activity.                  focus on gradual continuation and     good shape.
        by a medical diagnosis.                                                              maintain your current routine.

                                                                 Case 3: Experience-Grounded Foresight

           [2025-10-20] User: Beijing trip was terrible. Great
                                                                         Query [2025-12-01] Any advice for my upcoming Europe trip?
           Wall was overcrowded, and I couldn’t enter the                           EverMemOS                                         w/o EverMemOS
           Forbidden City due to no advance ticket.               Given your past experience being frustrated by     Europe has many iconic attractions. You should
           [2025-10-20] Assistant: That sounds frustrating.       overcrowded attraction and ticket access issues    visit the Louvre, the Colosseum, and the Vatican
           Missing the Forbidden City must have been              in Beijing, you may want to prioritize advance     Museums. These popular sites are must-sees for
           disappointing.                                         reservations and off-peak visits in Europe.        first-time visitors.


   Figure 7: Case studies illustrating Profile, Foresight, and Episode capabilities in Memory-Augmented Chat.

 Scenario                         Ep.+Prof. Prof.-only Ep.-only                             and experience-grounded foresight. To comple-
 Consultation                            51.03              47.33          44.44            ment quantitative results, Figure 7 shows three rep-
 Email (Personal)                        53.85              46.15          46.15            resentative cases: (Episode) reconstructing a con-
 Translation                             50.00              46.15          38.08
 Email (Professional)                    53.79              41.38          45.17
                                                                                            crete past injury episode (a Grade-II ankle sprain
 Writing (Creative)                      55.10              48.57          42.04            during badminton) rather than producing a generic
 Writing (Professional)                  45.56              44.79          40.15            explanation; (Profile) maintaining longitudinal sta-
 Knowledge Query                         63.68              62.94          54.73
 Social Media                            47.90              44.96          36.13            bility and using sustained improvements (waist
 Chat                                    52.09              44.87          41.83            104→96 cm with stable weight) for trajectory-
 Overall                                 53.25              48.30          43.93            consistent goal setting; and (Foresight) leveraging
                                                                                            previously observed failures (overcrowding and
Table 4: Profile ablation on PersonaMem v2 (Jiang et al.,                                   missing advance tickets) to make proactive recom-
2025) (5,000 questions across 9 scenarios; accuracy, %).                                    mendations for future travel. Together, these cases
                                                                                            illustrate coherent, experience-aware behavior be-
ration to balance performance with computational                                            yond what is measured by existing benchmarks.
cost. Comprehensive sensitivity analysis is detailed
in Appendix B.1.                                                                            5      Conclusion
                                                                                            In this paper, we introduced EverMemOS, a unified
4.5   Profile Study                                                                         memory operating system for long-horizon LLM
We evaluate the effect of the consolidated user pro-                                        agents. By modeling an explicit memory lifecycle
file on PersonaMem-v2 (32k) (Jiang et al., 2025);                                           composed of episodic trace formation, semantic
results are not directly comparable across dataset                                          consolidation, and reconstructive recollection, Ev-
versions due to differences in task setup and anno-                                         erMemOS achieves state-of-the-art performance on
tations. Table 4 shows that adding the User Profile                                         memory-augmented reasoning benchmarks, with
to episodic evidence improves overall accuracy by                                           particularly strong gains on multi-hop and tempo-
9.32 points over episodes-only (53.25 vs. 43.93), in-                                       ral questions. We hope EverMemOS provides an
dicating that semantic consolidation provides com-                                          extensible foundation for building more consistent
plementary signal beyond episodic retrieval. We                                             and context-aware interactive agents.
defer the full comparison against other memory
systems on PersonaMem-v2 to Appendix A.4.                                                   Limitations
                                                                                            We evaluate EverMemOS on text-only conversa-
4.6   Case Study                                                                            tional benchmarks. Although the MemCell and
Existing benchmarks primarily evaluate answer-                                              MemScene abstraction is modality-agnostic, ex-
level accuracy/recall and do not capture several                                            tending EverMemOS to multimodal or embodied
capabilities required for long-term conversational                                          settings is beyond the scope of this work. Ever-
agents, such as conflict detection, profile stability,                                      MemOS introduces LLM-mediated operations for

                                                                                        8
memory construction and retrieval, increasing la-            Mohamed Amine Ferrag, Norbert Tihanyi, and Mer-
tency and computational cost relative to single-pass          ouane Debbah. 2025. From llm reasoning to au-
                                                              tonomous ai agents: A comprehensive review. arXiv
baselines. While many components can be cached,
                                                              preprint arXiv:2504.19678.
batched, or run asynchronously, improving end-to-
end efficiency remains future work. Finally, current         Yue Gong and 1 others. 2024. M+: An efficient memory
benchmarks lack protocols for stress-testing ultra-            structure for large language models. arXiv preprint
long timelines, so our evaluation does not fully iso-          arXiv:2404.09337.
late performance in such regimes. This motivates             Alex Graves, Greg Wayne, and Ivo Danihelka.
future benchmarks for long-term memory organi-                 2014. Neural turing machines. arXiv preprint
zation and consolidation.                                      arXiv:1410.5401.

                                                             Alex Graves, Greg Wayne, Malcolm Reynolds, Tim
                                                               Harley, Ivo Keck, William O’Brien, Alistair Kritz-
References                                                     man, Stanislav Illarionov, Edward Grefenstette,
Iz Beltagy, Matthew E Peters, and Arman Cohan. 2020.           Tiago Wuthrich, and 1 others. 2016. Hybrid com-
   Longformer: The long-document transformer. In               puting using a neural network with dynamic external
   Proceedings of the 58th Annual Meeting of the Asso-         memory. Nature, 538(7626):471–476.
   ciation for Computational Linguistics. Association
   for Computational Linguistics.                            Bowen Jiang, Yuan Yuan, Maohao Shen, Zhuoqun Hao,
                                                               Zhangchen Xu, Zichen Chen, Ziyi Liu, Anvesh Rao
Atilim Gunes Bulatov, Valentin Khrulkov, Leyla Mir-            Vijjini, Jiashu He, Hanchao Yu, Radha Poovendran,
  vakhabova, Alexey Markov, Artem Babenko, and                 Gregory Wornell, Lyle Ungar, Dan Roth, Sihao Chen,
  Ivan Oseledets. 2022. Recurrent memory trans-                and Camillo Jose Taylor. 2025. Personamem-v2: To-
  former. In Advances in Neural Information Process-           wards personalized intelligence via learning implicit
  ing Systems, pages 20230–20243.                              user personas and agentic memory. arXiv preprint
                                                               arXiv:2512.06688.
Aydar Bulatov, Yuri Kuratov, and Mikhail S. Burtsev.
  2023. Scaling transformer to 1m tokens and beyond          Sheena A Josselyn, Stefan Köhler, and Paul W Fran-
  with rmt. ArXiv, abs/2304.11062.                             kland. 2015. Finding the engram. Nature Reviews
                                                               Neuroscience, 16(9):521–534.
Guanzheng Chen, Xin Li, Zaiqiao Meng, Shangsong
  Liang, and Lidong Wang. 2024. Clex: Continuous             Jiazheng Kang, Mingming Ji, Zhe Zhao, and Ting
  length extrapolation for large language models. In            Bai. 2025. Memory os of ai agent. arXiv preprint
  International Conference on Learning Representa-              arXiv:2506.06326.
  tions.
                                                             Patrick Lewis, Ethan Perez, Aleksandra Piktus, Fabio
Guanzheng Chen, Xin Li, Michael Qizhe Shieh, and               Petroni, Vladimir Karpukhin, Naman Goyal, Yuxiang
  Lidong Bing. 2025. LongPO: Long context self-                Kukliansky, Wen-tau Yih Chen, Tim Rocktäschel,
  evolution of large language models through short-            Sebastian Riedel, and Douwe Kiela. 2020. Retrieval-
  to-long preference optimization. In The Thirteenth           augmented generation for knowledge-intensive nlp
  International Conference on Learning Representa-             tasks. In Advances in Neural Information Processing
  tions.                                                       Systems, volume 33, pages 9459–9474.

Prateek Chhikara, Dev Khant, Saket Aryan, Taranjeet          Zhiyu Li, Shichao Song, Chenyang Xi, Hanyu Wang,
  Singh, and Deshraj Yadav. 2025. Mem0: Building               Chen Tang, Simin Niu, Ding Chen, Jiawei Yang,
  production-ready ai agents with scalable long-term           Chunyu Li, Qingchen Yu, and 1 others. 2025.
  memory. Preprint, arXiv:2504.19413.                          Memos: A memory os for ai system. arXiv preprint
                                                               arXiv:2507.03724.
Zihang Dai, Zhilin Yang, Yiming Yang, Jaime Car-
  bonell, Quoc V Le, and Ruslan Salakhutdinov. 2019.         Nelson F Liu, Kevin Lin, John Hewitt, Ashwin Paran-
  Transformer-XL: Attentive language models beyond             jape, Michele Bevilacqua, Fabio Petroni, and Percy
  a fixed-length context. In Proceedings of the 57th           Liang. 2024. Lost in the middle: How language mod-
  Annual Meeting of the Association for Computational          els use long contexts. Transactions of the Association
  Linguistics, pages 2978–2988. Association for Com-           for Computational Linguistics, 12:157–173.
  putational Linguistics.
                                                             Adyasha Maharana, Dong-Ho Lee, Sergey Tulyakov,
Matthias De Lange, Rahaf Aljundi, Marc Masana, Sarah           Mohit Bansal, Francesco Barbieri, and Yuwei Fang.
  Parisot, Xu Jia, Aleš Leonardis, Greg Slabaugh, and          2024. Evaluating very long-term conversational
 Tinne Tuytelaars. 2022. A continual learning sur-             memory of llm agents. Preprint, arXiv:2402.17753.
 vey: Defying forgetting in classification tasks. IEEE
 Transactions on Pattern Analysis and Machine Intel-         James L McGaugh. 2000. Memory–a century of con-
  ligence, 44(7):3366–3385.                                    solidation. Science, 287(5451):248–251.


                                                         9
Alexander Miller, Adam Fisch, Jesse Dodge, Amir-             Asaf Yehudai, Lilach Eden, Alan Li, Guy Uziel, Yilun
  Hossein Karimi, Antoine Bordes, and Jason Weston.            Zhao, Roy Bar-Haim, Arman Cohan, and Michal
  2016. Key-value memory networks for directly read-           Shmueli-Scheuer. 2025. Survey on evaluation of llm-
  ing documents. In Proceedings of the 2016 Con-               based agents. arXiv preprint arXiv:2503.16416.
  ference on Empirical Methods in Natural Language
  Processing, pages 1400–1409. Association for Com-          Manzil Zaheer, Guru Guruganesh, Avinava Dubey,
  putational Linguistics.                                     Joshua Ainslie, Chris Alberti, Santiago Ontañón,
                                                              Philip Pham, Anirudh Ravula, Qifan Wang, Li Yang,
Jiayan Nan, Wenquan Ma, Wenlong Wu, and Yize                  and Amr Ahmed. 2020. Big Bird: Transformers for
   Chen. 2025.     Nemori: Self-organizing agent              longer sequences. In Advances in Neural Information
   memory inspired by cognitive science. Preprint,            Processing Systems, pages 17283–17296.
   arXiv:2508.03341.
                                                             Yanzhao Zhang, Mingxin Li, Dingkun Long, Xin Zhang,
Charles Packer, Vivian Woodside, Neal Dhir, and                Huan Lin, Baosong Yang, Pengjun Xie, An Yang,
  Douwe Kiela. 2024. Memgpt: Towards llms as op-               Dayiheng Liu, Junyang Lin, Fei Huang, and Jingren
  erating systems. In Advances in Neural Information           Zhou. 2025. Qwen3 embedding: Advancing text
  Processing Systems.                                          embedding and reranking through foundation models.
                                                               arXiv preprint arXiv:2506.05176.
Ori Ram, Eyal Shnarch, Jonathan Uziel, Lisa Haklay,
  and Amir Globerson. 2023. In-context retrieval-            Yuan Zheng and 1 others. 2024. Memoryllm: A frame-
  augmented language models. Transactions of the               work for personalized and long-term dialogue gener-
  Association for Computational Linguistics, 11:1316–          ation. arXiv preprint arXiv:2401.17122.
  1331.
                                                             W Zhong, L Guo, Q Gao, and 1 others. 2024. Mem-
Preston Rasmussen, Pavlo Paliychuk, Travis Beauvais,          orybank: Enhancing large language models with
  Jack Ryan, and Daniel Chalef. 2025. Zep: A tempo-           long-term memory. In Proceedings of the AAAI Con-
  ral knowledge graph architecture for agent memory.          ference on Artificial Intelligence, volume 38, pages
  Preprint, arXiv:2501.13956.                                 19724–19731.

Daniel L Schacter. 2008. Searching for memory: The
  brain, the mind, and the past. Basic books.

Noah Shinn, Federico Cassano, Ashwin Gopinath,
  Karthik Narasimhan, and Shunyu Yao. 2024. Re-
  flexion: Language agents with verbal reinforcement
  learning. In Advances in Neural Information Pro-
  cessing Systems, volume 36.

Haoran Sun and Shaoning Zeng. 2025. Hierarchical
  memory for high-efficiency long-term reasoning in
  llm agents. arXiv preprint arXiv:2507.22925.

Weizhi Wang, Li Dong, Hao Cheng, Xiaodong Liu,
 Xifeng Yan, Jianfeng Gao, and Furu Wei. 2023.
 Longmem: Augmenting language models with long-
 term memory. In Advances in Neural Information
 Processing Systems, volume 36, pages 20292–20306.

Yu Wang and Xi Chen. 2025. Mirix: Multi-agent mem-
  ory system for llm-based agents. arXiv preprint
  arXiv:2507.07957.

Di Wu, Hongwei Wang, Wenhao Yu, Yuwei Zhang,
  Kai-Wei Chang, and Dong Yu. 2025. Longmemeval:
  Benchmarking chat assistants on long-term interac-
  tive memory. Preprint, arXiv:2410.10813.

Zhiheng Xi, Wenxiang Chen, Xin Guo, Wei He, Yi Ding,
  Boyang Hong, Ming Zhang, Junzhe Wang, Senjie
  Jin, Enyu Zhou, and 1 others. 2023. The rise and
  potential of large language model based agents: A
  survey. arXiv preprint arXiv:2309.07864.

Chun Xia, Yinlin Deng, Soren Dunn, and Lingming
  Zhang. 2024. Agentless: Demystifying llm-based
  software engineering agents. ArXiv, abs/2407.01489.


                                                        10
A       Evaluation Details                                  Table 5: MemBase statistics on LoCoMo and Long-
                                                            MemEval.
A.1 Evaluation Settings and Fair Comparison
LoCoMo backbones. We report LoCoMo results                  Metric                         LoCoMo LongMemEval
under two backbones: GPT-4.1-mini (primary, re-             Dataset scale
                                                            #Conversations                         10             500
flecting an up-to-date backbone) and GPT-4o-mini            #Questions                          1,540             500
(to facilitate comparison with prior work). Fol-            MemBase statistics
lowing common practice in LTMOS evaluation,                 #Total MemCells                      702            54,755
                                                            #Total MemScenes                     286           40,138
we standardize the backbone used for final answer           Avg MemCells/conv.                  70.2             109.5
generation to isolate the contribution of memory            Avg MemScenes/conv.                 28.6              80.3
management from the base model.                             Avg MemCells/MemScene               2.45              1.36
                                                            MemCells/conv. (range)             34–95           82–154
Baseline executability. For EverMemOS and                   MemScenes/conv. (range)            13–49           60–102
MemoryOS, we execute the full pipeline (mem-
ory construction, retrieval, and answering) with the           Table 6: Memory-construction hyperparameters.
specified backbone. For Mem0, MemU, MemOS,
                                                              Hyperparameter           LoCoMo     LongMemEval
and Zep, we use their official APIs for memory
management/retrieval; in this setting, we keep                Clustering threshold τ    0.70            0.50
                                                              Max time gap (days)         7              30
each baseline’s official memory configuration and
prompting unchanged and apply the unified back-
bone only at the answering stage.                           assigning a MemCell A to a candidate MemScene,
LongMemEval. Due to the extreme input length                if the closest-in-time MemCell B already in that
of LongMemEval, we cannot stably run all base-              MemScene is farther than this threshold, A is not
line APIs end-to-end; we therefore report baseline          clustered into that MemScene.
results from the official MemOS leaderboard2 and            Multi-round query rewriting frequency. On
evaluate EverMemOS with GPT-4.1-mini under the              LoCoMo (GPT-4.1-mini), the sufficiency checker
same protocol.                                              triggers a second-round query rewriting for 31.0%
Retrieval configuration. EverMemOS uses a                   of questions.
hybrid retriever that fuses dense retrieval (en-
                                                            Default evaluation mode. Unless otherwise
coder: Qwen3-Embedding-4B (Zhang et al., 2025))
                                                            specified, quantitative experiments use Memory-
and sparse retrieval (BM25) via Reciprocal Rank
                                                            Augmented Reasoning (Episodes-only). We addi-
Fusion (RRF), followed by episode re-ranking
                                                            tionally report the effect of the consolidated Profile
(Qwen3-Reranker-4B (Zhang et al., 2025)). Un-
                                                            in Table 4, while Foresight is illustrated in the qual-
less otherwise specified, we retrieve the top-10
                                                            itative Case Study (Memory-Augmented Chat).
MemScenes and select 10 Episodes for downstream
inference.                                                  A.2      LLM-as-Judge Reliability
MemBase statistics and construction hyper-                  We randomly selected 25 non-overlapping Q&A
parameters. We report dataset-level MemBase                 pairs from LoCoMo and 25 from LongMemEval,
statistics (Table 5) and memory-construction hy-            and generated model answers for each question.
perparameters (Table 6) for LoCoMo and Long-                We recruited annotators via Prolific. For each Q&A
MemEval. MemScenes are the clustering units                 pair, five independent human evaluators judged
produced by Phase II, and each MemScene con-                whether the generated answer was correct given
tains a small set of MemCells. We use the same              the question and the reference answer. All partici-
pipeline across datasets, while adopting dataset-           pants provided informed consent via the platform
specific clustering hyperparameters to reflect dif-         interface and were compensated at approximately
ferent dialogue structures and time spans. Long-            $12.00/hour, consistent with fair-pay guidelines
MemEval contains 500 dialogue–question pairs                for academic research and above local minimum
(one per conversation). Max time gap is the max-            wage standards. Table 7 shows strong agreement
imum allowed temporal distance (in days): when              between the LLM-as-judge protocol and human
    2
    Leaderboard data:     https://huggingface.co/           annotations: Cohen’s κ exceeds 0.89 and accuracy
datasets/MemTensor/MemOS_eval_result                        remains above 98% across benchmarks. Pearson r

                                                       11
is 0.891 on LoCoMo and 0.979 on LongMemEval.                              A.4    PersonaMem v2: Full Comparison
These results suggest that GPT-4o-mini achieves                                  Results
human-level reliability for answer verification, en-                      Table 9 reports the full comparison on PersonaMem
abling evaluation that is rigorous, reproducible, and                     v2 (32k) (Jiang et al., 2025) (2,447 questions across
cost-efficient.                                                           9 scenarios). The Profile row indicates whether a
                                                                          memory system provides a profile-like component
      Table 7: Reliability matrix for LLM-as-Judge.
                                                                          (not necessarily named “Profile”) that summarizes
 Model         Cohen’s κ        95% CI       Accuracy    Pearson r        stable user information (e.g., MemOS maintains
 LoCoMo          0.891      [0.742, 1.000]    0.984          0.891        explicit vs. implicit preferences). For methods with
 LongMemEval     0.978      [0.936, 1.000]    0.992          0.979
                                                                          such a component (✓), we generate answers using
                                                                          the retrieved memories plus the system’s profile-
                                                                          like component; for methods without it (✗), we
A.3      Token Cost Breakdown                                             generate answers using the retrieved memories
                                                                          only. EverMemOS achieves the best overall ac-
To improve cost transparency, we log all LLM API                          curacy (53.25%), outperforming the strongest base-
calls during LoCoMo evaluation (1,540 questions)                          line (MemOS, 50.72%) by 2.53 points.
under two backbones (GPT-4.1-mini and GPT-4o-
mini) and attribute token usage to stages in our                          B     Additional Analyses
pipeline. Since LoCoMo evaluation uses Memory-
Augmented Reasoning (Episodes-only), we do                                B.1    Hyperparameter Sensitivity and
not invoke the Profile module; therefore, profile-                               Efficiency Trade-off
related tokens are excluded from Table 8. Table 8                         To better understand retrieval budgets, we analyze
maps stages to EverMemOS phases. Phase I cor-                             the MemScene budget N and episode budget K
responds to memory construction (add). In this                            under a simplified setting that disables the agentic
Episodes-only setting, Phase II uses non-LLM com-                         verification-and-rewriting loop in Phase III, isolat-
putation (clustering/embedding updates) and thus                          ing one-shot retrieval. Figure 5 shows that increas-
incurs no additional LLM tokens. Phase III con-                           ing N improves evidence-session recall and answer
sists of retrieval (search) and answer generation                         accuracy initially but quickly saturates; N =10 al-
(answer). The evaluate stage reflects LLM-as-                             ready yields strong recall. We therefore avoid brute-
judge scoring (three judges per question) and is                          force expansion of the retrieved scene set for ef-
reported separately. Phase III consumes 10.27M                            ficiency. We also set N =10 to ensure the candi-
tokens (∼6.7k/question) with GPT-4.1-mini and                             date pool contains at least K=10 MemCells even
9.31M tokens (∼6.0k/question) with GPT-4o-mini;                           in extreme cases where each retrieved MemScene
Phase I consumes 9.42M and 9.34M tokens, respec-                          contains only a single MemCell. We choose K=10
tively, amortized over memory building.                                   episodes because most memory questions can be
                                                                          answered with a compact set of episodes while still
Table 8: Token-level cost breakdown on LoCoMo                             covering difficult instances whose annotated evi-
(1,540 questions) under two backbones. Tokens are                         dence spans up to 7–8 recalled episodes. Finally,
reported in millions (M); Total includes both prompt                      Figure 6 shows a favorable cost–accuracy frontier:
and completion.                                                           decreasing K substantially reduces tokens used for
                                                                          downstream reasoning, and at moderate K values
      Stage              #Calls Prompt (M) Total (M)
                                                                          EverMemOS can achieve both lower token usage
      GPT-4.1-mini
      add                7056         8.66            9.42                and higher accuracy than strong baselines.
      search             2017         4.12            4.45
      answer             1540         4.63            5.82                B.2    Accuracy Exceeding Recall on LoCoMo
      search+answer      3557         8.75            10.27
      evaluate           4620         2.35            2.38                In Figure 5, accuracy can exceed recall at small K
      GPT-4o-mini                                                         on LoCoMo. Table 10 quantifies this effect: even
      add                7250         8.60            9.34                when none of the annotated evidence sessions are
      search             2219         4.37            4.62
      answer             1540         3.84            4.69                retrieved (“zero recall”), 12–20% of questions are
      search+answer      3759         8.21            9.31                still answered correctly.
      evaluate           4620         2.14            2.17
                                                                             This primarily reflects information redundancy
                                                                          and non-unique evidence annotations: salient

                                                                     12
                Scenario                 Zep     Mem0 MemU MemoryOS MemOS EverMemOS
                Consultation             39.51   43.21   37.86         35.80      48.15        51.03
                Email (Personal)         42.51   41.30   33.20         36.84      49.80        53.85
                Translation              36.92   43.08   38.46         40.00      51.92        50.00
                Email (Professional)     37.59   42.41   32.76         35.86      50.00        53.79
                Creative Writing         41.22   42.86   35.51         35.51      48.16        55.10
                Writing (Professional)   40.54   34.75   35.14         35.91      48.26        45.56
                Knowledge Query          63.43   59.20   56.97         57.96      61.94        63.68
                Social Media             32.35   38.66   34.03         35.29      46.64        47.90
                Chat                     44.87   40.30   34.22         36.88      44.87        52.09
                Profile                   ✗       ✗       ✓              ✓          ✓           ✓
                Overall                  43.40   43.85   38.70         40.05      50.72        53.25

Table 9: Full comparison on PersonaMem v2 (32k) (Jiang et al., 2025) (5,000 questions across 9 scenarios; accuracy,
%).


 Table 10: Accuracy vs. recall statistics on LoCoMo.                   gold answer spans multiple hobbies (e.g., pot-
                                                                       tery, camping, painting, swimming) with evi-
    Metric                    K=1              K=3
                                                                       dence annotated across multiple sessions. Re-
    Recall                   65.06%        86.32%                      trieved sessions may miss the annotated ones
    Accuracy                 71.80%        87.81%
    Zero-recall questions       429           125                      but still contain sufficient mentions (e.g., pot-
     Answered correctly     52 (12.1%)    25 (20.0%)                   tery/painting) to support a correct response.
                                                                   • Inference from related signals. Q: “Would
facts (identity, preferences, goals) recur across ses-               Caroline pursue writing as a career option?”
sions, so the annotated evidence is not always the                   While the evidence is annotated in session [7],
only session that supports the answer. For example,                  retrieved content from other sessions de-
a question about “Caroline’s identity” is annotated                  scribes her career goal (e.g., becoming a coun-
with session [1], yet sessions [11–15] also state she                selor), enabling the LLM to infer that writing
is a transgender woman, enabling a correct answer                    is unlikely.
from alternative sessions. In addition, LLMs can               B.3      Profile Extraction Example
sometimes infer the correct response from semanti-
                                                               EverMemOS maintains a compact User Profile
cally related retrieved content even when the exact
                                                               with two fields: explicit facts (verifiable attributes
annotated session is missing.
                                                               and time-varying measurements) and implicit traits
   Overall, recall computed against annotated evi-
                                                               (preferences and habits). The profile is updated
dence can underestimate retrieval usefulness when
                                                               online from Phase II scene summaries with recency-
evidence is distributed. Increasing K from 1 to
                                                               aware updates for time-varying fields and conflict
3 reduces zero-recall cases by 71% (429→125),
                                                               tracking when evidence is inconsistent. Table 11
narrowing the accuracy–recall gap.
                                                               provides an abridged example.
Illustrative Cases. We provide three represen-
                                                               C       Reproducibility Artifacts
tative examples where answers remain correct de-
spite missing the annotated evidence sessions:                 C.1      Prompts for Agentic Retrieval
                                                               To make our system behavior transparent and re-
   • Redundant identity facts. Q: “What is Car-                producible, we include the core prompt templates
     oline’s identity?” The gold answer is trans-              used by our agentic retrieval controller.3
     gender woman. Although the evidence is an-
     notated in session [1], later sessions also ex-           Sufficiency check. We use an LLM-based suf-
     plicitly mention this identity; the retriever sur-        ficiency check to decide whether the currently re-
     faces those alternatives at small K, and the              trieved documents contain enough evidence to an-
     model answers correctly.                                  swer the user query. The prompt template (with
                                                               placeholders) is shown below.
   • Distributed activity mentions. Q: “What                       3
                                                                   Our implementation is open-sourced; we still include
     activities does Melanie partake in?” The                  prompts here to keep the paper self-contained for review.


                                                          13
 Table 11: Profile extraction example (de-identified): abridged evidence snippets and the resulting user profile.

Evidence snippets (excerpt)                                   Retrieved user profile (excerpt)

2025-07-07: “I just measured my waist circumference, and it   Explicit facts.
is 104 cm. Can you give me some advice?”                      Waist circumference: baseline 104 cm; latest 95 cm
2025-10-20: “My waist is now 96 cm, down 8 cm! My pants       (∆ = −9 cm).
feel loose.”                                                  Weight: stable at 80 kg (no rebound).
2025-11-03: “The doctor said my fatty liver has improved      Fatty liver grade: moderate → mild (improved).
(moderate → mild). Waist is now 95 cm.”                       Implicit traits.
2025-11-03: “My weight is still 80 kg, no rebound. I can      Self-management: goal-oriented; consistently tracks health
keep it under control even in winter.”                        metrics and responds well to feedback.
                                                              Preference: requests immediately actionable adjustments.


You are an expert in information retrieval                       "missing_information": ["Specific gap 1",
,→  evaluation. Assess whether the retrieved                      ,→ "Specific gap 2"]
,→  documents provide sufficient information to                }}
,→  answer the user's query.
                                                               Now evaluate:
User Query:
{query}                                                        Multi-query generation (condensed). When the
Retrieved Documents:                                           current retrieval is deemed insufficient, we gener-
{retrieved_docs}                                               ate 2–3 complementary follow-up queries targeted
                                                               at the missing information. We omit examples and
### Instructions:
                                                               keep only the constraints that affect behavior (in-
1. **Analyze the Query's Needs**                               puts, strategy choices, and the strict JSON output
   - **Entities**: Who/What is being asked about?
   - **Attributes**: What specific details                     schema).
   ,→ (color, time, location, quantity)?
                                                               You are an expert at query reformulation for
   - **Time**: Does it ask for a specific time                 ,→  conversational memory retrieval.
   ,→ (absolute or relative like "last week")?
                                                               Your goal is to generate 2-3 complementary
                                                               ,→  queries to find the MISSING information.
2. **Evaluate Document Evidence**
   - Check **Content**: Do the documents mention               --------------------------
   ,→    the entities and attributes?                          Original Query:
   - Check **Dates**:                                          {original_query}
      - Use the `Date` field of each document.
      - For relative time queries (e.g., "last                 Key Information Found:
      ,→ week", "yesterday"), verify if document
                                                               {key_info}
      ,→   dates fall within that timeframe.
     - If the query asks "When did X happen?", do              Missing Information:
      ,→   you have the specific date or just a                {missing_info}
      ,→ vague mention?

                                                               Retrieved Documents (Context):
3. **Judgment Logic**                                          {retrieved_docs}
   - **Sufficient**: You can answer the query                  --------------------------
   ,→ *completely* and *precisely* using ONLY
   ,→ the provided documents.                                  ### Strategy Selection (choose based on why info
   - **Insufficient**:                                         ,→  is missing)
     - The specific entity is not found.                       - Pivot / Entity Association: search related
     - The entity is found, but the specific                   ,→  entities/categories
     ,→  attribute (e.g., "price") is missing.                 - Temporal Calculation: anchor relative times
     - The time reference cannot be resolved                   ,→  using document dates
     ,→ (e.g., doc says "yesterday" but has no                 - Concept Expansion: synonyms / general-specific
     ,→  date, or doc date doesn't match query                 ,→ variants
     ,→  timeframe).                                           - Constraint Relaxation: remove one constraint at
     - Conflicting information without                         ,→  a time
     ,→  resolution.
                                                               ### Query Style Requirements (use DIFFERENT
### Output Format (strict JSON):                               ,→  styles)
{{                                                             1) Keyword Combo (2-5 words)
   "is_sufficient": true or false,                             2) Natural Question (5-10 words)
   "reasoning": "Brief explanation. If                         3) Hypothetical Statement (HyDE, 5-10 words)
   ,→ insufficient, state WHY (e.g., 'Found X but
   ,→ missing date', 'No mention of Y').",                     ### Output Format (STRICT JSON)
   "key_information_found": ["Fact 1 (Source: Doc              {
   ,→ 1)", "Fact 2 (Source: Doc 2)"],                            "queries": ["Query 1", "Query 2", "Query 3"],


                                                          14
    "reasoning": "Strategy used for each query              Table 12: End-to-end inference trace (LoCoMo multi-
    ,→ (e.g., Q1: Pivot, Q2: Temporal)"                     hop example), summarized.
}
                                                             Stage      Key outputs
C.2     End-to-End Inference Trace (LoCoMo                   Input      Query: Does James live in Connecticut? (Cat-
        Multi-Hop Example)                                              egory: multi-hop; Gold: Likely yes).
                                                             MemBase    49 MemScenes / 91 MemCells (conversation
To improve transparency, we provide an end-to-                          locomo_6).
end inference trace for a representative LoCoMo              Round 1    Top N =10 MemScenes (31 MemCells) → in-
                                                                        sufficient (is_sufficient=false); missing
multi-hop question (conversation locomo_6), in-                         an explicit residence mention / confirmation of
cluding the MemBase hierarchy (MemScenes and                            Connecticut.
                                                             Rewrite    Refined queries: (i) James residence
MemCells) and the two-round retrieval process
                                                                        Connecticut; (ii) Where does James
(sufficiency check and query rewriting) that leads                      currently live; (iii) James lives near
to a correct final answer. We denote the re-                            McGee’s bar in Connecticut.
                                                             Round 2    +40 candidates; top result is James Adopts
trieved MemScene count as N and the retrieved                           Shelter Dog Ned... (Apr 12, 2022) from
MemCell (episode) count as K (corresponding to                          cluster_004, mentioning “Stamford”.
scene_top_k and response_top_k in our imple-                Answer      Output: Likely yes; judged correct by 3/3 LLM
                                                                        judges.
mentation).

Trace at a glance.
                                                            Detailed trace. Round 1: initial retrieval and
    • Question (multi-hop). “Does James live in             sufficiency check.
      Connecticut?” The dialogue never directly
      states James’s residence; the system must in-            • Retrieval mode.      Agentic MemScene-
      fer the answer from related evidence.                      guided reranking (agentic_scene_rerank)
                                                                 with N =10 and K=10.
    • MemBase hierarchy. 49 MemScenes / 91
      MemCells; retrieval selects top N =10 Mem-               • Retrieved candidates. N =10 MemScenes
      Scenes (20%), then reranks/selects K=10                    (31 MemCells).
      MemCells for answering.
                                                               • Sufficiency verdict. is_sufficient=false.
    • Round 1 retrieval + sufficiency. Top N =10
      MemScenes (31 MemCells) → insufficient                   • Key information found. “James and Saman-
      (is_sufficient=false); missing an explicit                 tha moved in together near McGee’s Bar”;
      residence mention / confirmation of living in              “James traveled to Nuuk recently”.
      Connecticut.
                                                               • Missing information. (i) explicit mention of
    • Query rewriting. The controller generates                  James’s residence location; (ii) confirmation
      refined queries targeting residence/location               whether James lives in Connecticut.
      information.
                                                            Verifier rationale (excerpt).
    • Round 2 retrieval. With 40 additional candi-
      dates, the top-ranked MemCell contains the            None of the documents explicitly mention where
                                                            ,→ James currently lives or whether he lives in
      key evidence that James adopted a dog from            ,→  Connecticut.
      a shelter in Stamford, enabling an evidence-
      grounded inference.                                   Query rewriting (Round 2 queries).

    • Inference + evaluation. Final answer: Likely          1) James residence Connecticut
      yes; judged correct by 3/3 LLM judges.                2) Where does James currently live
                                                            3) James lives near McGee's bar in Connecticut

Worked example (formatted). For readability, we
                                                            Round 2: top retrieved MemCells. The refined
summarize the trace in Table 12 (instead of printing        queries retrieve 40 additional candidates; top re-
raw JSON).                                                  sults are:

                                                       15
    Rank Scene Subject (summary)
      1     4   James Adopts Shelter Dog Ned
                and Discusses Gaming Progress
                with John (Apr 12, 2022)
      2    43   James Announces Move-In with
                Samantha Near McGee’s Bar (Oct
                31, 2022)
      3    15   James Shares Recent Life Chal-
                lenges and Support System (Jun 16,
                2022)
      4    44   James’s Family Road Trip Visit-
                ing Friends Josh and Mark (Nov 7,
                2022)
      5    22   James’s Upcoming Summer Trip to
                Toronto and Vancouver (Jul 9, 2022)

Key evidence (dialogue excerpt).
I adopted a pup from a shelter in Stamford last
,→ week and my days have been so much happier
,→ with him in the fam.


Key evidence (atomic fact).

  • James adopted a pup named Ned from a shel-
    ter in Stamford last week (March 28–April 3,
    2022).
Answer + evaluation.
James adopted his dog Ned from a shelter located
,→  in Stamford, which is a city in Connecticut,
,→  strongly implying he lives near Stamford,
,→  Connecticut. Furthermore, when James and
,→  Samantha moved in together on October 31,
,→  2022, they rented an apartment near McGee's
,→  bar, a location they both favored. Although
,→  the exact city of this apartment is not
,→  explicitly stated, given no mention of
,→  relocation to another state and the previous
,→  connection to Stamford, it is highly likely
,→  that their residence is still in Connecticut,
,→  near Stamford. Therefore, based on these
,→  details, James does live in Connecticut with
,→  high confidence.

Result: is_correct=true (3/3 judges).




                                                      16
