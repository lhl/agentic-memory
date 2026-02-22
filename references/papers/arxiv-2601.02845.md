<!-- Generated from arxiv-2601.02845.pdf via pdftotext -layout on 2026-02-22 -->

                                                                    TiMem: Temporal-Hierarchical Memory Consolidation
                                                                         for Long-Horizon Conversational Agents
                                                       Kai Li1,2,3† , Xuanqing Yu1,2,3† , Ziyi Ni1,2 , Yi Zeng4 , Yao Xu1,5 , Zheqing Zhang6
                                                   Xin Li7,8 , Jitao Sang9 , Xiaogang Duan10 , Xuelei Wang1,2* , Chengbao Liu1,2* , Jie Tan1,2
                                                          1                                       2                                                     3
                                                              Institute of Automation, CAS            School of Artificial Intelligence, UCAS               AI Lab, AIGility Cloud Innovation
                                        4                                                    5                                                           6
                                            North China Electric Power University                Beijing Academy of Artificial Intelligence                  Gaoling School of Artificial Intelligence, RUC
                                                                     7                                                    8
                                                                         School of Biomedical Engineering, USTC               Suzhou Institute for Advance Research, USTC
                                                          9                                                                   10
                                                              School of Computer Science and Technology, BJTU                      Hunan Central South Intelligent Equipment Co., Ltd.
                                                                                                  {likai2024, yuxuanqing2021}@ia.ac.cn


                                                                                                                                                                   ...
                                                                              Abstract                                                          Sliding Window    Dialog Stream




arXiv:2601.02845v1 [cs.CL] 6 Jan 2026
                                                                                                                                      History ��        Prompts ��
                                                    Long-horizon conversational agents have to
                                                    manage ever-growing interaction histories that                                              Consolidator
                                                    quickly exceed the finite context windows of                                                                           Simple      Hybrid    Complex

                                                    large language models (LLMs). Existing mem-                                             Memory Consolidation                  Memory     Recall
                                                    ory frameworks provide limited support for                                      Segments                                               ��
                                                    temporally structured information across hi-                                                                                  ��

                                                    erarchical levels, often leading to fragmented                                  Session                                                ��
                                                    memories and unstable long-horizon person-                                                                                    ��
                                                    alization. We present TiMem, a temporal–                                        Daily                                                  ��
                                                    hierarchical memory framework that organizes                                                                                  ��
                                                    conversations through a Temporal Memory                                                                                                 ��
                                                                                                                                    Weekly
                                                    Tree (TMT), enabling systematic memory con-                                                                                        ��
                                                    solidation from raw conversational observa-                                                                                             ��
                                                                                                                                    Profile
                                                    tions to progressively abstracted persona rep-                                               Temporal Memory Tree                  ��
                                                    resentations. TiMem is characterized by three                                   Time Axis

                                                    core properties: (1) temporal–hierarchical or-                                               Please recommend some music for me.
                                                    ganization through TMT; (2) semantic-guided
                                                    consolidation that enables memory integration                                   Of course! You might enjoy classical pieces
                                                    across hierarchical levels without fine-tuning;                                 and modern music, so here are some ...                        ������
                                                    and (3) complexity-aware memory recall that
                                                    balances precision and efficiency across queries                               Figure 1: TiMem framework overview. The framework
                                                    of varying complexity. Under a consistent eval-                                organizes conversational streams through a five-level
                                                    uation setup, TiMem achieves state-of-the-art                                  TMT, consolidating memories from factual segments to
                                                    accuracy on both benchmarks, reaching 75.30%                                   persona profiles, with adaptive memory recall guided
                                                    on LoCoMo and 76.88% on LongMemEval-S.                                         by query complexity.
                                                    It outperforms all evaluated baselines while re-
                                                    ducing the recalled memory length by 52.20%                                    et al., 2025). Supporting such interactions requires
                                                    on LoCoMo. Manifold analysis indicates                                         two capabilities: maintaining temporal coherence
                                                    clear persona separation on LoCoMo and re-                                     as user states evolve, and forming stable represen-
                                                    duced dispersion on LongMemEval-S. Over-
                                                                                                                                   tations by distilling consistent personas from dy-
                                                    all, TiMem treats temporal continuity as a
                                                    first-class organizing principle for long-horizon                              namic experiences. However, interaction histories
                                                    memory in conversational agents.                                               grow unbounded, while LLMs operate under finite
                                                                                                                                   context windows, making it harder to sustain tem-
                                               1    Introduction                                                                   porally consistent personalization at scale. The key
                                              Large Language Models (LLMs) have enabled con-                                       challenge is to transform long-horizon experience
                                              versational agents to evolve from short-horizon task                                 into compact representations that remain tempo-
                                              solvers (Qian et al., 2024; Zeng et al., 2024; Zhang                                 rally grounded and useful for subsequent tasks.
                                              et al., 2024) to long-horizon personalized compan-                                      Existing solutions under-emphasize temporal
                                              ions (Chen et al., 2024a; Li et al., 2025a; Zhang                                    structure as a first-class constraint, and often lack
                                                    †
                                                        These authors contributed equally to this work.                            explicit temporal containment guarantees across
                                                    *
                                                        Corresponding authors.                                                     hierarchical levels. Parametric approaches expand

                                                                                                                           1
context windows (Chen et al., 2023; et al., 2024)               Our contributions are threefold: (1) the TMT,
or optimize internal context capacity (Bini et al.,          a novel structure that enforces explicit tem-
2025; Bui et al., 2025), but they remain bounded             poral containment and granularity for mem-
by model architecture and do not provide persis-             ory organization; (2) the TiMem framework,
tent cross-session storage. External memory sys-             a temporal–hierarchical memory consolidation
tems (Chhikara et al., 2025; Packer et al., 2024;            framework based on instruction-guided reasoning
Zhong et al., 2023) enable persistence but often rely        and complexity-adaptive recall, requiring no fine-
on semantic similarity-driven clustering (Sarthi             tuning; (3) a comprehensive evaluation demonstrat-
et al., 2024) or learned routing policies (Du et al.,        ing TiMem’s state-of-the-art accuracy (75.30% on
2025), treating temporal structure as auxiliary meta-        LoCoMo, 76.88% on LongMemEval-S) and effi-
data. As a result, memories from different periods           ciency (52.20% reduced recalled context on Lo-
can be aggregated without clear temporal bound-              CoMo), with ablations and manifold analyses pro-
aries, and retrieval may surface temporally distant          viding insights into its hierarchical representations.
evidence without an explicit ordering. For evolv-            2   Related Work
ing users, persona modeling benefits from a time-            Parametric Memory Approaches. Context win-
ordered evidence chain rather than only semanti-             dow expansion methods such as Gemini (et al.,
cally similar fragments.                                     2024), LongLoRA (Chen et al., 2024b), and RoPE
   Cognitive neuroscience provides a principled              scaling (Chen et al., 2023) alleviate sequence
perspective on this problem. Human memory                    length limits but incur quadratic computational
relies on complementary learning systems (Mc-                costs and attention dilution (Liu et al., 2024). Para-
Clelland et al., 1995), where memory consolida-              metric optimization approaches, including Mem-
tion (Squire et al., 2015) progressively transforms          LoRA (Bini et al., 2025), HMT (He et al., 2025),
rapid episodic encoding into more stable seman-              and TRIM-KV (Bui et al., 2025), compress mem-
tic structures (Cowan et al., 2021). This adaptive           ory through adapter distillation or learned token
process prioritizes goal-relevant information over           retention. However, they remain constrained by
indiscriminate retention. Translating this view to           architectural context windows and do not support
long-horizon agents suggests two design require-             persistent cross-session memory.
ments: time should be encoded as an explicit struc-          External Memory Management. Semantic clus-
tural constraint, and memory should be consoli-              tering approaches, including Mem0 (Chhikara
dated progressively across temporal granularities.           et al., 2025), RAPTOR (Sarthi et al., 2024), and
   To this end, we introduce TiMem, a memory                 MemTree (Rezazadeh et al., 2025), organize mem-
framework that uses temporal structure as the pri-           ory through embedding-based similarity aggrega-
mary organizing principle and operationalizes con-           tion. Graph-based approaches, including Zep (Ras-
solidation in a computational form. TiMem consoli-           mussen et al., 2025), LiCoMemory (Huang et al.,
dates fine-grained episodic interactions into higher-        2025), and Theanine (iunn Ong et al., 2025), ex-
level semantic patterns and persona representations,         plicitly model entity relations and temporal knowl-
rather than maintaining raw context buffers.                 edge. Cognitively motivated frameworks such as
   As illustrated in Figure 1, TiMem implements              A-MEM (Xu et al., 2025), Nemori (Nan et al.,
a hierarchical consolidation mechanism with three            2025), ENGRAM (Patel and Patel, 2025), and
components and requires no additional fine-tuning            RMM (Tan et al., 2025) employ self-organizing or
in our experiments. (1) The Temporal Mem-                    agentic mechanisms, while preference-aware sys-
ory Tree (TMT) organizes memories with explicit              tems like MemoryBank (Zhong et al., 2023) and
temporal containment and order through tree con-             PAMU (Sun et al., 2025) support personalization
straints. (2) The Memory Consolidator performs               through dynamic updates. OS-inspired memory
instruction-guided consolidation; level-specific             systems such as MemGPT (Packer et al., 2024),
prompts control the abstraction level, enabling              MemoryOS (Kang et al., 2025), and MemOS (Li
plug-and-play use across different LLM backends.             et al., 2025b) manage long contexts via hierarchi-
(3) Memory Recall performs complexity-aware hi-              cal tiers and virtual memory mechanisms. How-
erarchical retrieval: a recall planner selects appro-        ever, most existing approaches do not treat tempo-
priate hierarchy levels based on query complexity,           ral structure as a first-class organizing principle,
and a recall gating step filters candidates to balance       resulting in fragmented memory representations
factual detail with higher-level personalization.            and unstable long-horizon behavior.

                                                         2
             Memory Consolidation                                Temporal Memory Tree                            Memory Recall
      ...                      ...                    �� Segments                                             Recall Planner
                                                                                                                                      Query: �
                                                                                                              �: �→�×�
              Sliding Window    Dialog Stream                                             ��

                                                                                         ��                                                   ...
      ��      Memory Consolidator                                                                    �� Semantic         �� Lexical
                                                      �� Sessions
                                                                                                     Memory Cue         Memory Cue
       Dialog ��                                                                          ��
                                     ��
       History ��                           ��                                           ��             �� Memory Activation            �’�
                                                      �� Daily                                                                           +
        Prompts ��                        Generated
                                                                                                        Hierarchical Recall
                                          Memories                                        ��
                                                                                                                                             ...
                                                                                                             �� �, �
                                                                                          ��
      ��      Memory Consolidator                     �� Weekly
       Children ��                                                                              ��
                                                                                                                                       �’�~�
                                     ��                                                        ��    Simple    Hybrid      Complex
       History ��                           ��
                                                      �� Profile
       Prompts ��                         Generated                TMT: � = �, �, �, �          ��
                                                                                                              Recall Gating
                                          Memories                                                              �� �, �                �’�����


Figure 2: TiMem architecture overview: a five-layer TMT from level 1 segments to level 5 profiles, with a
consolidation pipeline processing dialog into temporal-hierarchical memories, and a recall pipeline without fine-
tuning that includes a recall planner, hierarchical recall, and a recall gating module.

3      Methodology                                                                 Structural Properties. The structure is governed
We present TiMem, a temporal–hierarchical mem-                                  by three principles that make temporal order ex-
ory framework for long-horizon conversational                                   plicit and enable progressive abstraction:
agents. TiMem consists of (i) a TMT that encodes                                   • Temporal Containment: τ (mu ) ⊇ τ (mv ),
temporal structure, (ii) a Memory Consolidator that                                   for each parent-child edge (mu , mv ) ∈ E, the
performs level-specific consolidation via instruc-                                    parent interval covers the child interval.
tion prompting without fine-tuning, and (iii) a Re-                                • Progressive Consolidation: |Mi | ≤ |Mi−1 |
call pipeline that uses a planner to select relevant                                  ensures higher-level memories are fewer, re-
memory levels and a recall gating module to retain                                    flecting consolidation from fine-grained facts
query-relevant memories, as illustrated in Figure 2.                                  to patterns and profiles.
                                                                                   • Semantic Consolidation: Specified by level-
3.1         Temporal Memory Tree
                                                                                      specific instruction prompts Ii , σ(mu ) =
The TMT provides a stable backbone for long-                                          LLM({σ(mv )}, Ii ) enables hierarchy special-
horizon memory: it preserves temporal coherence,                                      ization through the consolidation process.
supports progressive consolidation, and reduces                                 Implementation TMT supports arbitrary L and
noise by transforming details into higher-level ab-                             τ configurations. For reproducibility, TiMem
stracts. Lower-level memories cover short intervals                             uses a five-level hierarchy (segment, session, day,
and keep concrete details, while higher-level ones                              week, profile). Each level performs a different type
span longer intervals and store more consolidated                               of consolidation, specified by level-specific instruc-
representations. Each node m stores a time inter-                               tion prompts Ii :
val τ (m) and a semantic memory σ(m). We use                                       • Factual Summarization: Segments L1 distill
ℓ(m) ∈ {1, . . . , L} to denote the level of node m,                                  key dialog details; Sessions L2 merge into
from fine-grained to generalized.                                                     non-redundant event summaries.
   Definition. TMT is a hierarchical memory struc-                                 • Evolving Patterns: Daily L3 captures routine
ture T = (M, E, τ, σ) defined by:                                                     contexts and recurrent interests; Weekly L4
• M= L                                                                                integrates evolving behavioral features and
            S
              i=1 Mi is the set of memory nodes parti-
  tioned across L abstraction levels;                                                 preference patterns.
• E ⊆ M × M defines parent–child relationships                                     • Persona Representation: Profile L5 is an
  where ℓ(mu ) = ℓ(mv ) + 1, ∀(mu , mv ) ∈ E;                                         incrementally refined profile capturing stable
                                                                                      personality, preferences, and values from long-
• τ assigns each node a temporal interval τ (m) =
                                                                                      term patterns, updated on monthly intervals.
  [tstart , tend ] which is continuous over periods;
                                                                                   The framework is designed to be model-
• σ maps each node to a semantic memory σ(m)                                    independent and does not require fine-tuning; it
  stored as text and embeddings.                                                can be applied across different LLM backbones.

                                                                            3
3.2 Memory Consolidation                                         Thus, this stratified design ensures that factual
TiMem constructs the hierarchy with a Memory                   details are captured in real time while higher-level
Consolidator that converts dialog into structured              consolidation is aligned with predefined temporal
memories and uses Stratified Scheduling to balance             boundaries.
consolidation efficiency and computational cost.               3.3 Memory Recall
3.2.1 Memory Consolidator                                      Memory recall traverses the TMT to surface rele-
At level i, the consolidator generates new memories            vant memories, balancing precision, efficiency, and
by prompting an LLM with (i) child memories, (ii)              context length. It adapts scope to query complex-
historical memories, and (iii) instruction prompts.            ity: simple questions target exact evidence, while
             Φi : Ci × Hi × Ii → Mi                 (1)        complex ones incorporate higher-level memories
                                                               to provide long-range context. A final recall gating
   In formula (1), Ci are child memories from level            step filters redundancy and conflicts, retaining only
i−1, Hi provides short same-level history for conti-           memories required for the current interaction.
nuity, and Ii are instruction prompts. We use I1 -I2
for factual consolidation, I3 -I4 for pattern consoli-         3.3.1 Recall Planner
dation, and I5 for profile representation. Example             The planner p : Q → C × K maps a query q to
consolidator prompt is shown in Appendix E.3.1.                a complexity label c ∈ {simple, hybrid, complex}
                                                               and keywords K. We obtain both by prompting
Child Memories We group the conversation
                                                               an LLM (Appendix E.1.1), without dataset-specific
timeline into intervals g ∈ Gi (e.g., sessions, days).
                                                               training or labeled annotations.
For i ≥ 2, child memories for each group are the
                                                                  Query complexity determines which TMT levels
lower-level nodes whose time spans fall inside g:
                                                               to search. We define three layer groups:
  Ci (g) = {m ∈ Mi−1 : τ (m) ⊆ g},          i ≥ 2 (2)             • Factual Layers (Lfact ): L1 -L2 capturing fine-
At the base level (L1 ), child memories are the raw                 grained event details.
dialog turns within the interval.                                 • Pattern Layers (Lpatt ): L3 -L4 behavioral
Historical Memories Hi consists of the wi most                      trends and patterns.
recent memories from the same level Mi :                          • Profile Layer (Lprof ): L5 synthesizing long-
                                                                    term, stable characteristics.
                       (i)
            Hi = {m−j : 1 ≤ j ≤ wi }                (3)           Although simple queries are short, they can still
         (i)                                                   ask about stable preferences, so we include the pro-
  where m−j denotes the j-th most recent memory
                                                               file layer L5 by default. Intermediate pattern layers
at level i. This sliding window provides continuity
                                                               are useful for cross-event reasoning and are there-
across temporal groups. We set wi = 3 across all
                                                               fore emphasized in hybrid and complex queries.
levels to ensure consolidation consistency.
                                                                  The recall strategy S maps complexity c to sub-
3.2.2 Stratified Scheduling                                    sets of TMT:
Memory consolidation follows a two-tier schedul-                       S(simple) = Lfact ∪ Lprof                (4)
ing strategy that balances freshness and efficiency:                                         partial
                                                                        S(hybrid) = Lfact ∪ Lpatt ∪ Lprof       (5)
• Online consolidation (L1 ): Factual segment
                (1)                                                  S(complex) = Lfact ∪ Lpatt ∪ Lprof         (6)
  memories mk are generated immediately as the
  dialog progresses. With wd = 1 dialog turn                            partial
                                                               where Lpatt recalls L3 memories, while Lpatt re-
  (one user–assistant exchange), the consolidator              calls more L3 and L4 memories. Simple queries
  Φ1 is invoked after each new turn to capture fine-           bypass intermediate consolidated memories by di-
  grained evidence.                                            rectly accessing factual details and stable profiles,
• Scheduled consolidation (L2 -L5 ): Higher-level              while complex ones traverse the full hierarchy to
  memories m(i) (g) are generated automatically                capture information at all levels.
  when their temporal windows end. Upon clo-
  sure of temporal group g ∈ Gi , the framework                3.3.2 Hierarchical Recall
  triggers Φi (Ci (g), Hi (g); Ii ) to consolidate child       Hierarchical recall operates in two stages: leaf se-
  memories into a higher-level, more abstract rep-             lection at the base level, followed by hierarchical
  resentation.                                                 recall propagation through memory subtrees.

                                                           4
Stage 1: Base-Level Memory Activation At L1 ,                        3.3.4 Recall Pipeline
dual-channel scoring combines semantic similarity                    The complete recall integrates three stages:
and lexical matching through fusion:                                 1. Recall planner: p(q) → (c, K) predicts com-
 s(m, q, K) = λssem (m, q) + (1 − λ)slex (m, K) (7)                     plexity c and extracts keywords K to determine
                                                                        the hierarchical search scope.
where ssem is cosine similarity between embed-                       2. Hierarchical Recall: Dual-channel scoring se-
dings, slex is BM25 score for keyword matching,                         lects L1 leaves, then hierarchical recall prop-
and λ ∈ [0, 1] balances both channels. The top-k1                       agation collects relevant ancestors at planner-
scoring segments form the leaf set Ω1 (q, K).                           specified levels, forming the candidate set Ωc .
Stage 2: Hierarchical Recall Propagation For                         3. Recall Gating: The refiner filters the candi-
each leaf m ∈ Ω1 , we collect its ancestors at the                      dates based on query relevance and temporal
hierarchy levels selected by S(c):                                      consistency, then orders them to produce the
 A(m, c) = {m′ ∈ M : m ⪯ m′ , ℓ(m′ ) ∈ S(c)} (8)
                                                                        final memory set Ωfinal (q, c).
                                                                       This pipeline enables complexity-adaptive re-
where m ⪯ m′ denotes that m′ is an ancestor of m,                    call that balances precision and temporal relevance
and S(c) restricts recall to levels specified by com-                across TMT’s hierarchical structure.
plexity c. The complete candidate set integrates
                                                                     4   Experiments
leaves and their ancestors:
                            S                                        4.1 Experimental Setup
  Ωc (q, K) = Ω1 (q, K) ∪ m∈Ω1 (q,K) A(m, c) (9)
                                                                     Datasets We evaluate on two long-term conversa-
   For brevity, we denote this candidate set as Ωc .                 tional memory benchmarks: LoCoMo (Maharana
The number of recalled memories per level is deter-                  et al., 2024), a dataset with 10 user groups across
mined by query complexity; specific configurations                   multi-session dialog, and LongMemEval-S (Wu
are detailed in Appendix B.3.                                        et al., 2025), including 500 conversations designed
                                                                     for very-long memory processing evaluation.
3.3.3 Recall Gating
                                                                     Baselines We compare TiMem with five rep-
Recall gating implements recall-time forgetting:
                                                                     resentative memory baselines using their recom-
after collecting candidate memories, we keep only
                                                                     mended configurations: MemoryBank (Zhong
the truly useful ones for answering the query.
                                                                     et al., 2023), Mem0 (Chhikara et al., 2025), A-
   The recall gating module ϕ receives query q, its
                                                                     MEM (Xu et al., 2025), MemoryOS (Kang et al.,
complexity c, and the candidate set Ωc organized by
                                                                     2025), and MemOS (Li et al., 2025b).
hierarchy levels. It prompts an LLM to determine
whether each memory should be retained:                              Implementation Details For fair comparison, all
                                                                     methods use the same LLM and embedding setup:
 Ωϕ (q, c) = {m ∈ Ωc | ϕ(m, q, c) = retain} (10)                     gpt-4o-mini-2024-07-18 for generation and re-
                                                                     call, Qwen3-Embedding-0.6B for embeddings, and
where ϕ(m, q, c) denotes the LLM’s retention deci-
                                                                     recall budget k = 20. TiMem uses λ = 0.9 and
sion for memory m given query q and complexity c.
                                                                     wi = 3. We use the LLM-as-a-Judge (LLJ), where
Query complexity guides the breadth of retention:
                                                                     an LLM judges answer correctness; we report accu-
simple queries favor precision by retaining fewer
                                                                     racy along with memory tokens and recall latency
memories, while complex queries favor recall by
                                                                     for efficiency. Details are in Appendix B.
accepting broader context. Example recall gating
prompt template is in Appendix E.3.2.                                4.2 Main Results
   The retained memories are ranked by hierarchy                     4.2.1 Results on LoCoMo
level and temporal proximity within each level:                      Table 1 shows that TiMem achieves the best over-
                                                                    all LLJ accuracy on LoCoMo at 75.30% ± 0.16%.
 Ωfinal (q, c) = sort Ωϕ (q, c), key=(ℓ(m), |tq −tm |)    (11)
                                                                     It outperforms the strongest evaluated baseline,
where ℓ(m) denotes the hierarchy level, tq is the                    MemOS, at 69.24% ± 0.11%. TiMem also im-
query time, and tm = tend (m) so |tq − tm | mea-                     proves F1 and ROUGE-L (RL) to 54.40 and 54.68
sures temporal distance, organizing relevant mem-                    in percentage, and achieves the best LLJ score
ories by recency within each consolidation level,                    in each question type. We compute LLJ using
thereby ensuring concise, temporally coherent, and                   Mem0’s evaluation prompt template, as shown in
information-dense responses.                                         Appendix E.1.2.

                                                                 5
 Method            Single-Hop        Temporal         Open-Domain         Multi-Hop         Overall             F1         RL
                  ↑ LLJ (841Q)     ↑ LLJ (321Q)       ↑ LLJ (96Q)        ↑ LLJ (282Q)    ↑ LLJ (1540Q)          ↑           ↑
 MemoryBank       46.18 ± 0.32      29.34 ± 0.45       36.67 ± 0.47      33.36 ± 0.54       39.77 ± 0.27       25.78      25.15
 A-MEM            52.82 ± 0.28      60.87 ± 0.37       43.75 ± 0.00      38.37 ± 0.27       51.29 ± 0.06       30.37      36.85
 Mem0             62.09 ± 0.42      59.25 ± 0.41       37.70 ± 0.47      50.14 ± 0.32       57.79 ± 0.34       42.52      44.14
 MemoryOS         68.37 ± 0.46      52.46 ± 0.49       46.67 ± 1.79      52.76 ± 0.49       60.79 ± 0.48       45.36      43.74
 MemOS            76.07 ± 0.10      69.47 ± 0.25       45.14 ± 0.49      56.85 ± 0.69       69.24 ± 0.11       45.02      47.41
 TiMem (Ours)     81.43 ± 0.05      77.63 ± 0.34       52.08 ± 0.74      62.20 ± 0.82       75.30 ± 0.16       54.40      54.68

Table 1: Performance comparison on LoCoMo benchmark. Categories include Single-Hop, Temporal, Open-
Domain, and Multi-Hop. Best results are bolded; underline indicates second best.

                                                LongMemEval-S Task Categories
 Method                                                                                                                Overall
                     KU              MS               SSA          SSP              SSU              TR
                   ↑ (78Q)        ↑ (133Q)          ↑ (56Q)      ↑ (30Q)          ↑ (70Q)         ↑ (133Q)           ↑ (500Q)
                                         Answer Model: GPT-4o-mini-2024-07-18
 MemoryBank      21.79 ± 0.00    9.77 ± 0.00      50.00 ± 0.00   12.00 ± 1.83   29.71 ± 0.64    17.14 ± 0.34     21.04 ± 0.09
 A-MEM           72.82 ± 0.51    40.30 ± 0.37     87.50 ± 0.00   39.33 ± 2.49   82.86 ± 0.00    36.09 ± 0.48     55.44 ± 0.15
 Mem0            78.72 ± 0.70    66.17 ± 0.92     51.79 ± 0.00   50.00 ± 2.36   94.29 ± 0.00    49.17 ± 0.67     64.96 ± 0.41
 MemoryOS        56.15 ± 0.57    44.81 ± 0.41     78.18 ± 0.00   51.33 ± 1.83   81.14 ± 0.64    53.38 ± 0.00     58.04 ± 0.18
 MemOS           76.67 ± 0.51    58.80 ± 0.30     67.86 ± 0.00   50.67 ± 1.33   93.71 ± 0.70    65.11 ± 0.37     68.68 ± 0.16
 TiMem (Ours)    86.16 ± 1.07    70.83 ± 0.98     82.14 ± 0.00   63.33 ± 0.00   95.71 ± 0.00    68.42 ± 0.00     76.88 ± 0.30
                                             Answer Model: GPT-4o-2024-11-20
 MemoryBank      22.56 ± 0.70    12.78 ± 0.00     61.43 ± 0.98   13.33 ± 0.00   33.43 ± 0.78    13.53 ± 0.00     22.88 ± 0.23
 A-MEM           87.18 ± 0.00    45.26 ± 0.30     83.21 ± 0.87   56.67 ± 2.98   90.00 ± 0.00    46.77 ± 0.30     63.40 ± 0.33
 Mem0            84.87 ± 0.57    65.11 ± 0.41     55.00 ± 0.80   60.67 ± 1.49   95.71 ± 0.00    51.88 ± 0.00     67.56 ± 0.30
 MemoryOS        60.00 ± 0.57    51.13 ± 0.53     80.00 ± 0.00   53.33 ± 0.00   82.86 ± 0.00    54.59 ± 0.67     61.20 ± 0.23
 MemOS           76.07 ± 0.60    68.42 ± 0.00     63.69 ± 0.84   64.44 ± 1.57   92.86 ± 0.00    71.43 ± 0.61     73.07 ± 0.25
 TiMem (Ours)    87.69 ± 0.70    72.78 ± 0.34     85.71 ± 0.00   55.33 ± 1.83   96.28 ± 0.78    73.38 ± 1.14     78.96 ± 0.26

Table 2: Performance comparison on the LongMemEval-S benchmark, reporting LLJ accuracy by task type.
Categories include KU: Knowledge Update, MS: Multi-Session, SSA/P/U: Single-Session Assistant/Preference/User,
and TR: Temporal Reasoning. Best results are bolded; underline indicates second best.

4.2.2    Results on LongMemEval-S                                tokens on LoCoMo under Simple—but accuracy
Table 2 shows that TiMem achieves the best over-                 drops when the scope is overly narrow. Among
all LLJ accuracy on LongMemEval-S at 76.88%                      fixed-scope settings, Hybrid + Recall Gating per-
± 0.30% with gpt-4o-mini-2024-07-18 as the                       forms best, achieving 73.38% on LoCoMo and
answer model, outperforming the evaluated base-                  75.00% on LongMemEval-S. The adaptive planner
lines. With gpt-4o-2024-11-20 as the answer                      further improves the accuracy–cost trade-off, reach-
model, TiMem remains best overall at 78.96%                      ing 75.30% with 511.25 tokens on LoCoMo and
± 0.26%. The QA and LLJ protocol follow the                      76.88% with 1270.62 tokens on LongMemEval-S.
official LongMemEval-S evaluation template, as                   4.3.2    Hierarchical Architecture
shown in Appendix E.2.1 and E.2.2.
                                                                 Table 4 examines hierarchy depth and recall strat-
4.3     Ablation Studies                                         egy. With L1-only memories, hierarchical re-
                                                                 call propagation raises LongMemEval-S LLJ from
We ablate TiMem to isolate the contribution
                                                                 57.40% to 72.40% compared to flat recall, indi-
of its main components. All ablations use
                                                                 cating that hierarchical propagation recovers nec-
gpt-4o-mini-2024-07-18 for LLM operations
                                                                 essary temporal dependencies. However, L1-only
and Qwen3-Embedding-0.6B for embeddings.
                                                                 remains below the full hierarchy on LoCoMo, as
4.3.1    Planner and Recall Gating                               isolated factual fragments often lack the broader
Table 3 compares seven configurations of recall                  context required for complex queries. Using only
scope and gating. Fixed-scope recall under-recalls               high-level layers (L2–L5) further reduces accuracy,
for Simple queries and introduces noise for Com-                 confirming that summaries alone cannot replace
plex ones. Recall gating sharply reduces mem-                    fine-grained evidence. Overall, the full hierarchy
ory length—for example, from 3710.30 to 367.68                   combines precise L1 grounding with contextual

                                                             6
                               LoCoMo        LongMemEval-S                                                   LoCoMo                                                            LongMemEval-S
 Configuration                                                                                                                                               0.8
                          LLJ ↑ Mem Len ↓   LLJ ↑ Mem Len ↓                          1.0




                                                                  UMAP Dimension 2                                                        UMAP Dimension 2
                                                                                                                                                             0.6
 w/o Planner, w/o Gating                                                             0.8

   - Simple              73.51    3710.30   73.20   3371.53
                                                                                     0.6                                                                     0.4
   - Hybrid              72.40    4376.40   74.00   4054.78
   - Complex             72.86    5658.26   74.40   5685.68
                                                                                     0.4                                                                     0.2

 w/o Planner, w Gating                                                                      L1: n=2,871                                                             L1: n=124,272
                                                                                     0.2
   - Simple            71.88       367.68   69.00    397.04                                 L2: n=272
                                                                                            L3: n=272
                                                                                                                                                             0.0    L2: n=22,662
                                                                                                                                                                    L3: n=5,250
                                                                                            L4: n=216                                                               L4: n=2,300
   - Hybrid            73.38      691.59    75.00   1673.93                                 L5: n=86                                                                L5: n=849
                                                                                     0.0
                                                                                           Total: n=3,717                                              −0.2        Total: n=155,333
   - Complex           72.92      4479.06   74.20   3028.68
                                                                                             0.0       0.2    0.4      0.6    0.8   1.0                                 0.0       0.2    0.4     0.6   0.8

 w Planner, w/o Gating                                                                             UMAP Dimension 1                                                           UMAP Dimension 1
   - Planned           72.99      4411.09   73.80   3941.98
 w P., w G. (Baseline)    75.30   511.25    76.88   1270.62       Figure 3: UMAP visualization of memory embed-
                                                                  dings. Left: LoCoMo exhibits 10 user groups sep-
Table 3: Recall Planner and Recall Gating effective-              aration through hierarchical consolidation. Right:
ness. The planned configuration of the TiMem baseline             LongMemEval-S converges toward shared persona
achieves the best balance between accuracy and mem-               structure through noise suppression.
ory length.
                                                                  4.5                          Recall Efficiency Analysis
                               LoCoMo        LongMemEval-S        Table 5 reports recall efficiency metrics: memory
 Memory Layers
                          LLJ ↑ Mem Len ↓   LLJ ↑ Mem Len ↓
                                                                  context length and latency.
 L1 only (base layer)
   w Flat Rec.            70.06   995.15    57.40   1823.98                Method                                           LoCoMo                                                LongMemEval-S
   w Hier. Rec.           73.18   361.23    72.40   437.42                                                          Memory       Latency                                      Memory       Latency
                                                                                                                    ↓ (tokens) ↓ (P50/P95)                                    ↓ (tokens) ↓ (P50/P95)
 L2-L5 only (high-level)
   w Flat Rec.           51.23    2348.49   48.00   2657.68                MemoryBank                               8063.77         9.46/13.07                                13906.81         10.74/14.50
   w Hier. Rec.          57.08    3786.44   64.20   2344.92                A-MEM                                     2431.4          1.74/7.23                                 3971.6          5.12/11.89
                                                                           Mem0                                     1070.10         2.44/4.29                                  1647.56          3.64/6.11
 L1-L5 (full hierarchy)                                                    MemoryOS                                 4659.09          1.66/2.21                                 7574.30          1.63/3.95
   w Flat Rec.            70.71   1715.65   55.40   4519.26                MemOS                                    1371.42          1.69/3.44                                 1091.51          1.64/2.70
   w H. R. (Baseline)     75.30   511.25    76.88   1270.62                TiMem (Ours)                              511.25         2.35/4.91                                 1270.62           1.76/4.48

Table 4: Hierarchical vs. Flat Architectures. Compar-             Table 5: Recall efficiency metrics. Memory context
ison of L1-only, L2-L5 only, and Full Hierarchy with              length and P50/P95 latency across benchmarks. TiMem
flat vs. hierarchical recall strategies.                          significantly reduces context load compared to baselines
                                                                  while maintaining low latency.
understanding from L2–L5, achieving the best per-
formance on both datasets.                                           On LoCoMo, TiMem recalls 511.25 tokens per
                                                                  query versus 1,070.10 for Mem0, reducing con-
   These ablations support TiMem’s core design:
                                                                  text length by 52.20%. P50 recall latency is 2.35s
the temporal hierarchy provides both factual preci-
                                                                  on LoCoMo and 1.76s on LongMemEval-S. Con-
sion and contextual understanding through memory
                                                                  text length increases with query complexity, and
consolidation, while the adaptive planner dynami-
                                                                  LongMemEval-S queries are more diverse and re-
cally balances recall scope.
                                                                  call more context. Latency includes planner, recall,
4.4    Memory Manifold Analysis                                   and gating, with LLM calls as the dominant.

Figure 3 illustrates UMAP visualization of                        4.6                          Parameter Studies
TiMem memory embeddings on LoCoMo and                             We conduct a parameter study on LoCoMo.
LongMemEval-S through different hierarchies. It                      LLM Configuration Under the same answering
shows that consolidation reshapes memory geome-                   and judgement protocol, TiMem is portable across
try differently across datasets. On LoCoMo, higher-               internal LLMs for memory operations. End-to-end
level memories separate users more clearly, with                  performance is primarily driven by the answering
clustering quality improving 6.2×, indicating effec-              LLM, with the best configuration reaching 80.45%,
tive persona feature distillation. On LongMemEval-                indicating that answer-time reasoning dominates
S, consolidation reduces spatial dispersion by 50%,               once memory quality is adequate.
suggesting suppression of sampling noise while                       Segment Granularity Increasing the L1 seg-
retaining core persona attributes. These comple-                  ment size consistently degrades accuracy, dropping
mentary behaviors suggest that TiMem preserves                    from 75.30% at 1 turn to 65.26% at 8 turns, indi-
semantically salient patterns beyond uniform aver-                cating that finer-grained segments better preserve
aging. Detailed metrics are in Appendix D.                        atomic evidence for downstream QA.

                                                              7
  Detailed experimental designs, results, and cross-                                                                       Semantic-guided consolidation makes ab-
configuration analysis are provided in Appendix C.                                                                      straction explicit and portable. Level-specific
4.7 Case Study                                                                                                          prompts encourage distinct consolidation objec-
Figure 4 contrasts TiMem’s hierarchical consolida-                                                                      tives across layers without architecture-specific tun-
tion against Mem0 fragmented memories.                                                                                  ing. Empirically, hierarchical consolidation outper-
 query: "Would Caroline still want to pursue counseling as a career if she hadn't received support growing up?"
                                                                                                                        forms the evaluated methods, indicating that pro-
     TiMem: Fine-grained Segments + Deep Profile Consolidation       Fragmented Memories: Event Records only            gressive transformation over temporally grouped
��
    [8 May 2023] Caroline expressed a keen interest in pursuing
  counseling or a career in mental health, stating her desire to
                                                                      [12 July, 2023] Caroline started looking
                                                                      into counseling and mental health career
                                                                                                                        memories is beneficial beyond storing more text.
  support those facing similar issues. Melanie affirmed that ...      options to help others on their journeys
                                                                                                                           Recall reflects a practical trade-off between
��                                                                     [28 August, 2023] Caroline recalled her
    [27 June 2023] Caroline expressed that her own journey
  and the support she received made a huge difference in her           past struggles and feeling alone.                precision and efficiency. The complexity-aware
  life, motivating her to help others going through similar
  experiences ... Melanie acknowledged ...
                               ... ...
                                                                       [28 August, 2023] Caroline felt glad she
                                                                       could share her story and offer support.
                                                                                                                        recall planner consistently outperforms fixed recall
                                                                       [28 August, 2023] Caroline recalled her
                                                                                                                        scopes, while recall gating is most effective when
                       [ Filtered-out Memories ]                       past struggles and feeling alone.

��
                                                                                                                        the candidate set contains distractors. For highly
      Profile for Caroline ( May 2023 )                                [23 August, 2023] Caroline received
 1. Basic Identity
 Role Positioning: Female / Aspiring Counselor
                                                                       helpful support and got lots of help from
                                                                       adoption advice/assistance group attended.
                                                                                                                        complex queries, broader context may outweigh ag-
 Life Background: Single, no children, lives in an urban setting.
 Main Social Contacts: Melanie (weekly), LGBTQ support group           [27 June, 2023] Caroline started caring
                                                                                                                        gressive filtering, and planner errors can expand or
 members (monthly).                                                    more about mental health and
 2. Key Events This Month
 May 8: Attended an LGBTQ support group, where she felt a
                                                                       understanding herself.                           shrink the recall scope; in practice, recall budgets
 sense of acceptance and inspiration. This experience motivated
 her to explore career options in mental health. May 25 ...
                                                                       [27 June, 2023] Caroline contacted her
                                                                       mentor for adoption advice.
                                                                                                                        can be tuned to different application needs.
                                                                                                      ... ...
           No, she likely wouldn't.                Ground Truth: Likely no             Yes, she would.                     Overall, TiMem suggests that combining tem-
                                                                                                                        poral organization with hierarchical consolidation
Figure 4: Case study comparing TiMem and a non-                                                                         and adaptive recall yields compact yet grounded
hierarchical baseline. TiMem’s hierarchical consoli-                                                                    long-term memory for conversational agents.
dation organizes timestamped evidence into coherent
chains and a persona profile, whereas the baseline re-                                                                  5   Conclusion
calls only isolated event records.
                                                                                                                        We introduced TiMem, a temporal–hierarchical
   TiMem recalls segments establishing causal de-                                                                       memory framework for long-horizon conversa-
pendency, with the consolidated L5 profile connect-                                                                     tional agents, which treats temporal continuity
ing her career aspiration to formative experiences.                                                                     as a first-class organizing principle for long-term
The recall gating module excludes memories lack-                                                                        memory personalization. TiMem provides: (i) the
ing true relevance. This structured causality yields                                                                    TMT, a structure that enforces temporal contain-
the correct answer: No, she likely wouldn’t.                                                                            ment and order; (ii) instruction-guided consolida-
   Mem0 as a representative baseline recalls frag-                                                                      tion without fine-tuning that progressively trans-
mented factual memories. Without hierarchical                                                                           forms raw dialog into higher-level patterns and in-
consolidation, the framework fails to construct the                                                                     crementally refined profiles updated monthly; and
support→career chain, producing an inverted an-                                                                         (iii) complexity-aware recall that plans the recall
swer: Yes, she would.                                                                                                   scope, propagates evidence hierarchically from ac-
   This comparison highlights how TMT’s tempo-                                                                          tivated leaves, and applies recall-time gating to
ral containment and instruction-based consolida-                                                                        retain only query-relevant memories.
tion organize episodic evidence into a coherent                                                                             Under a consistent evaluation setup, TiMem
inferential structure for counterfactual reasoning.                                                                     achieves state-of-the-art accuracy of 75.30% on
4.8 Discussion                                                                                                          LoCoMo and 76.88% on LongMemEval-S, while
Our experiments suggest three key takeaways for                                                                         reducing recalled context by 52.20% on LoCoMo
long-horizon memory in conversational agents.                                                                           via recall planning and gating. Manifold analysis
   Temporal continuity is an effective organiz-                                                                         indicates that temporal consolidation yields per-
ing principle. By enforcing temporal containment,                                                                       sona separation while reducing dispersion, support-
TMT provides stable temporal leaves for consoli-                                                                        ing coherent long-horizon memory representations.
dation and recall, instead of treating semantic sim-                                                                        We view TiMem as a practical and interpretable
ilarity as the primary structure. Ablation studies                                                                      foundation for long-term agent memory. Future
and manifold analysis indicate that this temporal                                                                       directions include combining temporal hierarchies
hierarchy enables effective compression: it facili-                                                                     with richer structured memory representations and
tates the construction of temporal evidence chains,                                                                     incorporating storage-time forgetting and adaptive
amplifies user-specific distinctions, and suppresses                                                                    temporal boundaries to further improve efficiency
noise in long dialogs.                                                                                                  and robustness.

                                                                                                                    8
6   Limitations                                              Tinghui Zhu, Aili Chen, Nianqi Li, Lida Chen, Caiyu
                                                             Hu, Siye Wu, Scott Ren, Ziquan Fu, and Yanghua
LLM Middleware Performance Consolidation                     Xiao. 2024a. From persona to personalization: A
and recall modules rely on general-purpose LLMs              survey on role-playing language agents. Preprint,
through instruction prompts. Fine-tuning special-            arXiv:2404.18231.
ized smaller models for these operations may im-           Shouyuan Chen, Sherman Wong, Liangjian Chen, and
prove efficiency while maintaining module func-              Yuandong Tian. 2023. Extending context window of
tionality.                                                   large language models via positional interpolation.
                                                             Preprint, arXiv:2306.15595.
Structured Representation High-level memo-
ries lack explicit categorical structures or knowl-        Yukang Chen, Shengju Qian, Haotian Tang, Xin Lai,
edge graphs. Hybrid architectures combining tem-             Zhijian Liu, Song Han, and Jiaya Jia. 2024b. Lon-
                                                             glora: Efficient fine-tuning of long-context large lan-
poral hierarchies with typed entity representations          guage models. Preprint, arXiv:2309.12307.
may better capture multi-dimensional content.
                                                           Prateek Chhikara, Dev Khant, Saket Aryan, Taranjeet
Forgetting Mechanism The framework lacks                     Singh, and Deshraj Yadav. 2025. Mem0: Building
storage-time forgetting mechanism. Future work               production-ready ai agents with scalable long-term
should explore effective storage-level forgetting            memory. Preprint, arXiv:2504.19413.
methods that selectively consolidate memories              Emily T Cowan, Anna C Schapiro, Joseph E Dunsmoor,
while maintaining critical facts and recurring pat-          and Vishnu P Murty. 2021. Memory consolidation as
terns, balancing efficiency with factual integrity.          an adaptive process. Psychonomic Bulletin & Review,
                                                             28(6):1796–1810.
Temporal Parameterization TiMem uses realis-
tic temporal boundaries for reproducibility. Adap-         Xingbo Du, Loka Li, Duzhen Zhang, and Le Song. 2025.
tive temporal boundaries detection or interaction-           Memr3 : Memory retrieval via reflective reasoning
                                                             for llm agents. Preprint, arXiv:2512.20237.
density scheduling could enhance domain transfer-
ability.                                                   Gemini Team et al. 2024. Gemini 1.5: Unlocking mul-
                                                             timodal understanding across millions of tokens of
7   Ethics Statement                                         context. Preprint, arXiv:2403.05530.

This work does not involve human subjects or per-          Zifan He, Zongyue Qin, Neha Prakriya, and Yizhou Sun.
sonally identifiable information. Experiments use             2025. Hmt: Hierarchical memory transformer for
publicly available benchmarks under appropriate li-           efficient long context language processing. Preprint,
                                                              arXiv:2405.06067.
censes. TiMem enforces strict user-group isolation
by design: each memory tree is scoped to a single          Zhengjun Huang, Zhoujin Tian, Qintian Guo, Fangyuan
user, with no cross-user memory sharing or aggre-            Zhang, Yingli Zhou, Di Jiang, and Xiaofang Zhou.
gation, protecting individual privacy. Deployed sys-         2025. Licomemory: Lightweight and cognitive
                                                             agentic memory for efficient long-term reasoning.
tems should implement secure storage, explicit user          Preprint, arXiv:2511.01448.
consent, and data deletion mechanisms. As with
any LLM-based system, practitioners should mon-            Kai Tzu iunn Ong, Namyoung Kim, Minju Gwak,
itor for potential biases in memory consolidation            Hyungjoo Chae, Taeyoon Kwon, Yohan Jo, Seung
                                                             won Hwang, Dongha Lee, and Jinyoung Yeo. 2025.
and ensure transparency about retention policies.
                                                             Towards lifelong dialogue agents via timeline-based
                                                             memory management. Preprint, arXiv:2406.10996.
References                                                 Jiazheng Kang, Mingming Ji, Zhe Zhao, and Ting
Massimo Bini, Ondrej Bohdal, Umberto Michieli,                Bai. 2025. Memory os of ai agent. Preprint,
 Zeynep Akata, Mete Ozay, and Taha Ceritli. 2025.             arXiv:2506.06326.
 Memlora: Distilling expert adapters for on-device
 memory systems. Preprint, arXiv:2512.04763.               Hao Li, Chenghao Yang, An Zhang, Yang Deng, Xi-
                                                             ang Wang, and Tat-Seng Chua. 2025a. Hello again!
Ngoc Bui, Shubham Sharma, Simran Lamba, Saumitra             LLM-powered personalized agent for long-term dia-
  Mishra, and Rex Ying. 2025. Cache what lasts: To-          logue. In Proceedings of the 2025 Conference of the
  ken retention for memory-bounded kv cache in llms.         Nations of the Americas Chapter of the Association
  Preprint, arXiv:2512.03324.                                for Computational Linguistics: Human Language
                                                             Technologies (Volume 1: Long Papers), pages 5259–
Jiangjie Chen, Xintao Wang, Rui Xu, Siyu Yuan, Yikai         5276, Albuquerque, New Mexico. Association for
   Zhang, Wei Shi, Jian Xie, Shuang Li, Ruihan Yang,         Computational Linguistics.


                                                       9
Zhiyu Li, Shichao Song, Hanyu Wang, Simin Niu, Ding             Larry R Squire, Lisa Genzel, John T Wixted, and
  Chen, Jiawei Yang, Chenyang Xi, Huayi Lai, Ji-                  Richard G Morris. 2015.     Memory consolida-
  hao Zhao, Yezhaohui Wang, Junpeng Ren, Zehao                    tion. Cold Spring Harbor perspectives in biology,
  Lin, Jiahao Huo, Tianyi Chen, Kai Chen, Kehang Li,              7(8):a021766.
  Zhiqiang Yin, Qingchen Yu, Bo Tang, and 3 others.
  2025b. Memos: An operating system for memory-                 Haoran Sun, Zekun Zhang, and Shaoning Zeng. 2025.
  augmented generation (mag) in large language mod-               Preference-aware memory update for long-term llm
  els. Preprint, arXiv:2505.22101.                                agents. Preprint, arXiv:2510.09720.
                                                                Zhen Tan, Jun Yan, I-Hung Hsu, Rujun Han, Zifeng
Nelson F. Liu, Kevin Lin, John Hewitt, Ashwin Paran-              Wang, Long T. Le, Yiwen Song, Yanfei Chen, Hamid
  jape, Michele Bevilacqua, Fabio Petroni, and Percy              Palangi, George Lee, Anand Iyer, Tianlong Chen,
  Liang. 2024. Lost in the middle: How language mod-              Huan Liu, Chen-Yu Lee, and Tomas Pfister. 2025.
  els use long contexts. Transactions of the Association          In prospect and retrospect: Reflective memory man-
  for Computational Linguistics, 12:157–173.                      agement for long-term personalized dialogue agents.
                                                                  Preprint, arXiv:2503.08026.
Adyasha Maharana, Dong-Ho Lee, Sergey Tulyakov,
  Mohit Bansal, Francesco Barbieri, and Yuwei Fang.             Di Wu, Hongwei Wang, Wenhao Yu, Yuwei Zhang,
  2024. Evaluating very long-term conversational                  Kai-Wei Chang, and Dong Yu. 2025. Longmemeval:
  memory of llm agents. Preprint, arXiv:2402.17753.               Benchmarking chat assistants on long-term interac-
                                                                  tive memory. Preprint, arXiv:2410.10813.
James L McClelland, Bruce L McNaughton, and Ran-
  dall C O’Reilly. 1995. Why there are complementary            Wujiang Xu, Zujie Liang, Kai Mei, Hang Gao, Juntao
  learning systems in the hippocampus and neocortex:             Tan, and Yongfeng Zhang. 2025. A-mem: Agentic
  insights from the successes and failures of connec-            memory for llm agents. Preprint, arXiv:2502.12110.
  tionist models of learning and memory. Psychologi-
  cal review, 102(3):419.                                       Aohan Zeng, Mingdao Liu, Rui Lu, Bowen Wang, Xiao
                                                                  Liu, Yuxiao Dong, and Jie Tang. 2024. AgentTun-
Jiayan Nan, Wenquan Ma, Wenlong Wu, and Yize                      ing: Enabling generalized agent abilities for LLMs.
   Chen. 2025.     Nemori: Self-organizing agent                  In Findings of the Association for Computational
   memory inspired by cognitive science. Preprint,                Linguistics: ACL 2024, pages 3053–3077, Bangkok,
   arXiv:2508.03341.                                              Thailand. Association for Computational Linguistics.
                                                                Jiwen Zhang, Jihao Wu, Teng Yihua, Minghui Liao,
Charles Packer, Sarah Wooders, Kevin Lin, Vivian Fang,
                                                                   Nuo Xu, Xiao Xiao, Zhongyu Wei, and Duyu Tang.
  Shishir G. Patil, Ion Stoica, and Joseph E. Gonzalez.
                                                                   2024. Android in the zoo: Chain-of-action-thought
  2024. Memgpt: Towards llms as operating systems.
                                                                   for GUI agents. In Findings of the Association for
  Preprint, arXiv:2310.08560.
                                                                   Computational Linguistics: EMNLP 2024, pages
Nishant Patel and Apurv Patel. 2025. Engram: Effec-               12016–12031, Miami, Florida, USA. Association for
  tive, lightweight memory orchestration for conversa-             Computational Linguistics.
  tional agents. Preprint, arXiv:2511.12960.                    Zhehao Zhang, Ryan A. Rossi, Branislav Kveton, Yi-
                                                                  jia Shao, Diyi Yang, Hamed Zamani, Franck Der-
Chen Qian, Wei Liu, Hongzhang Liu, Nuo Chen, Yufan                noncourt, Joe Barrow, Tong Yu, Sungchul Kim,
  Dang, Jiahao Li, Cheng Yang, Weize Chen, Yusheng                Ruiyi Zhang, Jiuxiang Gu, Tyler Derr, Hongjie Chen,
  Su, Xin Cong, Juyuan Xu, Dahai Li, Zhiyuan Liu,                 Junda Wu, Xiang Chen, Zichao Wang, Subrata Mi-
  and Maosong Sun. 2024. ChatDev: Communicative                   tra, Nedim Lipka, and 2 others. 2025. Personaliza-
  agents for software development. In Proceedings                 tion of large language models: A survey. Preprint,
  of the 62nd Annual Meeting of the Association for               arXiv:2411.00027.
  Computational Linguistics (Volume 1: Long Papers),
  pages 15174–15186, Bangkok, Thailand. Association             Wanjun Zhong, Lianghong Guo, Qiqi Gao, He Ye, and
  for Computational Linguistics.                                 Yanlin Wang. 2023. Memorybank: Enhancing large
                                                                  language models with long-term memory. Preprint,
Preston Rasmussen, Pavlo Paliychuk, Travis Beauvais,              arXiv:2305.10250.
  Jack Ryan, and Daniel Chalef. 2025. Zep: A tempo-
  ral knowledge graph architecture for agent memory.            A     Dataset Details
  Preprint, arXiv:2501.13956.
                                                                A.1    LoCoMo Benchmark
Alireza Rezazadeh, Zichao Li, Wei Wei, and Yujia Bao.
                                                                LoCoMo (Maharana et al., 2024) consists of 10
  2025. From isolated conversations to hierarchical
  schemas: Dynamic tree memory representation for               user groups and multi-session conversations span-
  llms. Preprint, arXiv:2410.14052.                             ning over six months on average. Conversations
                                                                are grounded in dialog streams with explicit times-
Parth Sarthi, Salman Abdullah, Aditi Tuli, Shubh
  Khanna, Anna Goldie, and Christopher D. Manning.
                                                                tamps. We use 1,540 questions in the benchmark
  2024. Raptor: Recursive abstractive processing for            covering (1) single-hop, (2) multi-hop, (3) open-
  tree-organized retrieval. Preprint, arXiv:2401.18059.         domain, and (4) temporal reasoning.

                                                           10
A.2    LongMemEval-S Benchmark                               Stage          Operation and Key Parameters
LongMemEval-S (Wu et al., 2025) is a synthetic               1. Recall Planner (1 LLM call)
                                                                            Predicts complexity c ∈ {simple, hybrid,
benchmark with 500 conversations and 500 ques-                              complex} and extracts keywords K to set
tions. It simulates online memory processing and                            level-specific budgets and search scope S(c).
assesses five capabilities: (1) information extrac-          2. Hierarchical Recall (no LLM calls)
tion from single user/assistant turns, (2) multi-            Leaf Activa- Score L1 leaves by s(m, q, K) = λssem +
session reasoning, (3) knowledge updates, (4) tem-           tion          (1 − λ)slex with λ=0.9 (cosine similarity +
                                                                           BM25), then select top-k1 =20.
poral reasoning, and (5) abstention. The benchmark           Ancestor Col- For each activated leaf, collect ancestors
constructs 500 user personas by sampling attributes          lection       whose levels satisfy ℓ(m) ∈ S(c) (determin-
                                                                           istic traversal).
from a shared persona template pool.                         Budgeting     Keep up to: Simple (L1 :20, L2 :4, L5 :1); Hy-
                                                                           brid (L1 :20, L2 :4, L3 :2, L5 :1); Complex
B     Implementation Details                                               (L1 :20, L2 :8, L3 :4, L4 :2, L5 :1).
                                                             Pruning     / If candidates exceed per-level budgets, prune
B.1    Memory Consolidation Configuration                    Early Stop    by similarity scores; if fewer ancestors exist,
                                                                           terminate early.
All frameworks use gpt-4o-mini-2024-07-18
                                                             3. Recall Gating (1 LLM call)
for memory consolidation with temperature 0.7                               Prompt an LLM to retain/drop each candidate
and Qwen3-Embedding-0.6B (dimension 1024) for                               memory conditioned on (q, c), producing the
embeddings, ensuring consistent processing ca-                              final memory set Ωfinal .
pabilities across comparisons. For TiMem: L1
                                                            Table 6: Recall configuration in TiMem, organized by
memories created online using non-overlapping               the three major stages: recall planner, hierarchical recall,
sliding window with segment size wd = 1 turn                and recall gating.
(one user–assistant exchange); L2–L5 generated
through scheduled aggregation at temporal bound-            C     Parameter Studies
aries (session end, daily, weekly, and G5 monthly
intervals for profiles). Historical context window          C.1      LLM Configuration Analysis
wi = 3 prior memories per layer, balancing conti-           We investigate the interplay between internal LLMs
nuity and computational cost.                               (used for memory consolidation and recall) and
                                                            external LLMs (used for question answering). This
B.2    Question Answering Configuration
                                                            experiment examines the memory system’s quality
Basic settings Baselines are evaluated using their          and downstream reasoning capability separately,
recommended configurations with the following               analyzing how different model combinations affect
unified settings: gpt-4o-mini-2024-07-18 for                end-to-end performance.
consolidation and recall, Qwen3-Embedding-0.6B
for embeddings, and recall budget k=20 memories.            Experimental Design We test two internal LLM
LoCoMo Question answering uses gpt-4o-mini-                 configurations:
2024-07-18 with Mem0’s prompt templates.                    • GPT-4o-mini: A representative commercial
LongMemEval-S We use a unified template to                    LLM used for memory consolidation and recall.
clearly separate roles. Internal LLM (consolida-
                                                            • Qwen3-32B: A representative open-source LLM
tion/planner/gating) is gpt-4o-mini-2024-07-18.
                                                              used as a production-oriented alternative.
External LLM is gpt-4o-mini-2024-07-18 by de-
fault (we additionally report results with gpt-4o-             As shown in table 7, for each internal configu-
2024-11-20). Judge LLM follows the official                 ration, we evaluate five external LLMs for ques-
LongMemEval-S evaluation prompt. The evalu-                 tion answering: gpt-4o-mini, gpt-4o, qwen3-8b,
ation prompt was meta-evaluated by its authors to           qwen3-32b, and qwen3-235b-a22b.            We re-
achieve >97% agreement with human experts, sup-             port results from two LLM-as-judge evaluators:
porting the reliability of LLJ-based scoring on this        gpt-4o-mini (denoted LLJ-G) and qwen3-32b
benchmark (Wu et al., 2025).                                (denoted LLJ-Q), and observe consistent trends
                                                            across both judges.
B.3    Recall Configuration
                                                            C.2      Segment Granularity Analysis
TiMem’s hierarchical recall uses complexity-aware
configurations with two LLM calls per query: a              We analyze the impact of L1 segment size on mem-
recall planner (1 call) and recall gating (1 call).         ory quality and retrieval effectiveness. Segment

                                                       11
Answer Model          F1 ↑     RL ↑    LLJ-G ↑    LLJ-Q ↑         Layer     IntDim↓   Silh↑     Sep.Ratio↑    Trust↑   Cont↑
             Internal: GPT-4o-mini-2024-07-18                     L1          73      0.093        0.30       0.950    0.941
                                                                  L2          35      0.273        0.77       0.964    0.955
GPT-4o-mini           54.40    54.68      75.30    72.86          L3          37      0.274        0.76       0.963    0.955
GPT-4o                56.14    56.40      74.03    72.60          L4          28      0.329        0.89       0.972    0.964
Qwen3-8B              46.58    47.00      66.04    64.68          L5          13      0.574        2.14       0.818    0.862
Qwen3-32B             50.45    50.82      74.61    73.38
Qwen3-235B-A22B       42.17    43.60      80.45    79.03
                                                                 Table 9: LoCoMo manifold metrics. Progressive fea-
                    Internal: Qwen3-32B                          ture separation from L1 to L5 evidenced by increasing
GPT-4o-mini           51.50    51.74      71.23    70.00         Silhouette Score and Separation Ratio.
GPT-4o                53.65    53.90      72.60    70.19
Qwen3-8B              44.59    45.29      64.16    62.34          Layer    IntDim↓    Spread↓     CV↓     Radius95↓    Trust↑
Qwen3-32B             46.74    47.15      74.74    72.73
                                                                  L1         100       0.692     0.085       0.789     0.917
Qwen3-235B-A22B       40.20    41.47      77.73    76.23          L2         100       0.672     0.078       0.761     0.942
                                                                  L3         100       0.533     0.162       0.669     0.847
Table 7: LLM Configuration Analysis. Comparison of                L4          82       0.432     0.180       0.575     0.812
                                                                  L5          68       0.345     0.155       0.444     0.789
answering models across two internal memory genera-
tion models (GPT-4o-mini, Qwen3-32B).
                                                                 Table 10: LongMemEval-S convergence metrics. Re-
                                                                 duced Spread and Radius95 indicate convergence to-
granularity determines the trade-off between detail
                                                                 ward unified persona templates from L1 to L5.
preservation and computational efficiency.
                                                                 reach 13 dimensions at L5, while clustering quality
Experimental Design. We evaluate four segment
                                                                 improves by 6.2-fold to achieve 0.574 silhouette
sizes based on dialog turn counts: 1 turn (finest),
                                                                 score. The separation ratio increases from 0.30 to
2 turns, 4 turns, and 8 turns (coarsest). All other
                                                                 2.14, indicating extraction of user-specific features
parameters use default values.
                                                                 from dialog streams.
Segment Size         F1       RL       LLJ (%)    Delta
1 turn (baseline)   54.40     54.68       75.30      –
                                                                 D.2      LongMemEval-S: Noise Suppression
2 turns             52.45     51.00       73.64    -1.66         Table 10 reveals convergence toward shared struc-
4 turns             50.56     49.27       70.00    -5.30
8 turns             46.94     45.72       65.26   -10.04         ture in the synthetic dataset. L1 exhibits high
                                                                 spread at 0.692 and maximum dimensionality at
Table 8: Impact of L1 segment granularity on LoCoMo              100. Through consolidation, spread reduces by
performance. Segment size determines the number of               50% to reach 0.345 at L5, while the effective ra-
dialogue turns aggregated into each L1 memory. Default           dius (mean distance to centroid) shrinks from 0.789
configuration uses 1 turn. Delta shows performance               to 0.444. Dimensionality remains saturated at 100
change relative to 1-turn baseline.
                                                                 through L1-L4, then drops to 68 at L5, with the low-
   As shown in table 8, the performance of the                   dimensional shared structure emerging through pro-
question-answering decreases as the size of the                  gressive consolidation.
segment increases, indicating a trade-off between
                                                                 D.3      Adaptive Consolidation
the size of the segment and the accuracy of the QA
in practical applications.                                       TiMem demonstrates adaptive consolidation that
                                                                 responds to different data characteristics. In Lo-
D     Memory Manifold Analysis                                   CoMo conversations, the framework acts as a fea-
                                                                 ture separator, increasing inter-user variance as sep-
We analyze how hierarchical consolidation trans-                 aration ratio grows from 0.30 to 2.14. In synthetic
forms memory structure using manifold metrics:                   LongMemEval-S data, it functions as a noise fil-
Intrinsic Dimensionality, Silhouette Score, Spread,              ter, reducing variance as spread decreases from
and Trustworthiness.                                             0.692 to 0.345. Both processes achieve semantic
D.1    LoCoMo: Feature Distillation                              compression through dimensionality reduction, yet
                                                                 produce contrasting topological effects: expanding
Table 9 shows progressive user differentiation                   distinctiveness for diverse users versus contracting
across hierarchy levels. L1 segments exhibit high                dispersion for noisy data. Trustworthiness scores
dimensionality and low clustering quality, indicat-              exceeding 0.78 across all levels indicate that these
ing that generic conversational patterns dominate                manifold transformations preserve neighborhood
at the segment level. Through hierarchical consoli-              relationships during dimensionality reduction.
dation, dimensionality compresses by 5.6-fold to

                                                            12
E     Prompt Templates

E.1     LoCoMo Benchmark
We adopt the prompt template from Mem0 (Chhikara et al., 2025) for LoCoMo QA and evaluation:
E.1.1    Question Answering Prompt
    You are an intelligent memory assistant tasked with retrieving accurate information from
    conversation memories.
    # CONTEXT:
    You have access to memories from two speakers in a conversation. These memories contain
    timestamped information that may be relevant to answering the question.
    # INSTRUCTIONS:
    1. Carefully analyze all provided memories from both speakers
    2. Pay special attention to the timestamps to determine the answer
    3. If the question asks about a specific event or fact, look for direct evidence in the memories
    4. If the memories contain contradictory information, prioritize the most recent memory
    5. If there is a question about time references (like "last year", "two months ago", etc.),
    calculate the actual date based on the memory timestamp. For example, if a memory from 4 May 2022
    mentions "went to India last year," then the trip occurred in 2021.
    6. Always convert relative time references to specific dates, months, or years. For example,
    convert "last year" to "2022" or "two months ago" to "March 2023" based on the memory timestamp.
    Ignore the reference while answering the question.
    7. Focus only on the content of the memories from both speakers. Do not confuse character names
    mentioned in memories with the actual users who created those memories.
    8. The answer should be less than 5-6 words.
    # APPROACH (Think step by step):
    1. First, examine all memories that contain information related to the question
    2. Examine the timestamps and content of these memories carefully
    3. Look for explicit mentions of dates, times, locations, or events that answer the question
    4. If the answer requires calculation (e.g., converting relative time references), show your work
    5. Formulate a precise, concise answer based solely on the evidence in the memories
    6. Double-check that your answer directly addresses the question asked
    7. Ensure your final answer is specific and avoids vague time references
    Relevant Memories:
    {context_memories}
    Question: {question}
    Answer:


E.1.2    LLM-as-Judge Evaluation Prompt
    Your task is to label an answer to a question as ’CORRECT’ or ’WRONG’. You will be given the
    following data:
      (1) a question (posed by one user to another user),
      (2) a ’gold’ (ground truth) answer,
      (3) a generated answer
    which you will score as CORRECT/WRONG.
    The point of the question is to ask about something one user should know about the other user
    based on their prior conversations. The gold answer will usually be a concise and short answer
    that includes the referenced topic, for example:
    Question: Do you remember what I got the last time I went to Hawaii?
    Gold answer: A shell necklace
    The generated answer might be much longer, but you should be generous with your grading - as long
    as it touches on the same topic as the gold answer, it should be counted as CORRECT.
    For time related questions, the gold answer will be a specific date, month, year, etc. The
    generated answer might be much longer or use relative time references (like "last Tuesday" or
    "next month"), but you should be generous with your grading - as long as it refers to the same
    date or time period as the gold answer, it should be counted as CORRECT. Even if the format
    differs (e.g., "May 7th" vs "7 May"), consider it CORRECT if it’s the same date.
    Now it’s time for the real question:
    Question: {question}
    Gold answer: {standard_answer}
    Generated answer: {generated_answer}
    First, provide a short (one sentence) explanation of your reasoning, then finish with CORRECT or
    WRONG. Do NOT include both CORRECT and WRONG in your response, or it will break the evaluation
    script.
    Just return the label CORRECT or WRONG in a json format with the key as "label".


                                                   13
E.2   LongMemEval-S Benchmark
E.2.1 Question Answering Prompt
We follow the default non-CoT template from LongMemEval (Wu et al., 2025):

 I will give you several related memories between you and a user. Please answer the question based
 on the relevant memories.
 Related Memories:
 {memories}
 Current Date: {current_date}
 Question: {question}
 Answer:

E.2.2 LLM-as-Judge Evaluation Prompt
LongMemEval uses task-specific evaluation prompts. For most tasks (SSU, SSA, MS):

  I will give you a question, a correct answer, and a response from a model. Please answer yes if
  the response contains the correct answer. Otherwise, answer no. If the response is equivalent to
  the correct answer or contains all the intermediate steps to get the correct answer, you should
  also answer yes. If the response only contains a subset of the information required by the
  answer, answer no.
  Question: {question}
  Correct Answer: {answer}
  Model Response: {response}
  Is the model response correct? Answer yes or no only.

  For temporal reasoning tasks, off-by-one tolerance is applied:

  I will give you a question, a correct answer, and a response from a model. Please answer yes if
  the response contains the correct answer. Otherwise, answer no. If the response is equivalent to
  the correct answer or contains all the intermediate steps to get the correct answer, you should
  also answer yes. If the response only contains a subset of the information required by the
  answer, answer no. In addition, do not penalize off-by-one errors for the number of days. If the
  question asks for the number of days/weeks/months, etc., and the model makes off-by-one errors
  (e.g., predicting 19 days when the answer is 18), the model’s response is still correct.
  Question: {question}
  Correct Answer: {answer}
  Model Response: {response}
  Is the model response correct? Answer yes or no only.

  For knowledge update tasks:

  I will give you a question, a correct answer, and a response from a model. Please answer yes if
  the response contains the correct answer. Otherwise, answer no. If the response contains some
  previous information along with an updated answer, the response should be considered as correct
  as long as the updated answer is the required answer.
  Question: {question}
  Correct Answer: {answer}
  Model Response: {response}
  Is the model response correct? Answer yes or no only.

  For single-session preference tasks:

  I will give you a question, a rubric for desired personalized response, and a response from a
  model. Please answer yes if the response satisfies the desired response. Otherwise, answer no.
  The model does not need to reflect all the points in the rubric. The response is correct as long
  as it recalls and utilizes the user’s personal information correctly.
  Question: {question}
  Rubric: {rubric}
  Model Response: {response}
  Is the model response correct? Answer yes or no only.




                                                  14
E.3     TiMem System Prompts
We present key prompt templates used in TiMem’s internal processing pipeline:
E.3.1    L1 Segment Memory Consolidator
  You are a dialogue memory generator. Your task is to write a fragment memory that captures only
  the NEW facts from the "Current Conversation" (do not repeat anything already covered in
  "Historical Memories").
  Core principle:
  Convert dialogue from first-person to third-person narration, preserving as much substantive
  information content from the original as possible, excluding only confirmed non-informative
 words.
 What to preserve:
 - All substantive information: people, events, times, places, causes, results, numbers, specific
  descriptions
 - Original wording: Keep specific terms used in dialogue for titles, item names, activity
  descriptions, etc, numbers use Arabic numerals
 - Emotional expressions: Retain explicit emotions and attitudes from original (like "happy",
  "worried", "likes"), but avoid adding subjective inferences not present in original
 What to exclude:
  Only exclude purely functional words: greetings ("hi""bye"), confirmation words
 ("uh-huh""okay""yes"), meaningless fillers ("um""you know""like")
 Time normalization:
 - Preserve the original relative time expressions exactly as written (e.g., "last night", "this
  morning", "last Friday"). DO NOT convert relative time to absolute dates.
  Style:
 - Use English third-person narration.
 - Write plain sentences (no lists/numbering/Markdown). Aim for 2-4 sentences, but allow longer to
  retain essential details.
 - Use exact proper nouns as in the dialogue; do not replace/expand/infer names, organizations, or
  locations.
 - Each memory should focus on one core fact or closely related fact group; avoid packing too many
  unrelated details into a single entry.
  Inputs:
 - Historical memories (do not repeat): {previous_summary}
 - Current conversation: {new_dialogue}
  Please generate a fragment memory that contains ONLY the new facts. If the current conversation
  has no substantial new content, provide a minimal 1-2 sentence summary of the core topic or
  attitude expressed in this turn (do NOT output "no significant additions" or similar empty
  statements).

E.3.2    Recall Gating Prompt for Simple Queries
  Filter memories for simple fact query (Complexity 0).
  Strategy: Aggressive filtering - Keep only direct answers
 Target: 3-8 memories
  ## Filtering Rules
 1. KEEP if memory directly answers the question
  2. KEEP if memory provides essential context (time/location of the fact)
  3. EXCLUDE if related but does not contribute to answer
 4. EXCLUDE if different topic entirely
  ## Instructions
 - Be strict: Only keep memories that help answer the specific question
 - Remove noise: Exclude tangentially related memories
 - Aim for 3-8 memories total
  Question: {question}
  Candidate memories ({total_count} total):
 {numbered_memories}
  Return IDs to keep (JSON format):
 {{"relevant_ids": [1, 2, 3, ...]}}




                                                 15
E.3.3   Recall Planner Prompt
  You are a professional query intent analysis expert. Please select the most appropriate retrieval
  method based on the question type, and extract keywords.
  Critical Judgment Principles:
 - If the question requires understanding the user’s preferences, habits, values, personality
  traits, or historical behavior patterns to answer correctly, classify as "Deep Retrieval" (2)
 - If the question involves reasoning, prediction, evaluation, subjective judgment, or
  hypothetical scenarios, classify as "Deep Retrieval" (2)
 - If the question requires integrating behaviors across multiple time points, multiple choices,
  or long-term trends to answer, classify as "Deep Retrieval" (2)
 - Only single factual queries (who, when, where, what specific action) should be classified as
  "Simple Retrieval" (0)
  Retrieval Type Definitions:
  0 - Simple Retrieval (Factual Questions):
 - Questions answerable by retrieving a single fact fragment
 - Characteristics: Explicit time, location, person, event, or other objective fact queries
 - Examples: "Where does X work?" "When did X go to location Y?" "Which meeting did X attend?"
 - Key: Answer is an explicitly recorded fact, no reasoning or preference judgment needed
 1 - Hybrid Retrieval (Multi-Fact Integration Questions):
 - Questions requiring integration of multiple fact memories to answer
 - Characteristics: Need to enumerate, summarize, or compare multiple facts, but no deep reasoning
  required
 - Examples: "What activities did X participate in?" "What topics did X and Y discuss?" "Where has
 X been?"
 - Key: Need to aggregate multiple facts, but still objective information integration
  2 - Deep Retrieval (Personalized Reasoning Questions):
 - Questions requiring reasoning based on user’s deep personalized information (preferences,
  habits, values, personality) to answer
 - Core Characteristics:
    * Need to understand user’s stable preferences (what they like/dislike, values, interests)
    * Need to infer user’s future behavior or likely choices ("Would like...?" "Suitable for...?"
  "Would choose...?")
    * Need to evaluate or judge user’s personality traits, behavior patterns, cognitive style
    * Involves subjective judgment, evaluation, recommendation, prediction, hypothetical questions
    * Need to infer user’s attitude or tendency based on historical behavior patterns
 - Examples: "Would X enjoy a beach vacation?" "Is X an extroverted person?" "Might X be
  interested in programming?" "Does X prioritize career or family more?"
 - Key: Answer requires synthesizing user’s deep traits and preferences, not directly recorded
  facts
 Judgment Process:
 1. First identify: Does the question require user’s preferences/habits/personality/values? If yes
  → Deep Retrieval (2)
  2. Second identify: Does the question require reasoning/prediction/evaluation/subjective
  judgment? If yes → Deep Retrieval (2)
  3. Third identify: Does the question require summarizing multiple fact fragments? If yes → Hybrid
  Retrieval (1)
 4. Finally: If only single explicit fact needed → Simple Retrieval (0)
  Keyword extraction requirements:
 1. Extract 1-3 most important keywords from the question
  2. Exclude common stopwords (such as: the, a, in, is, have, and, or, with, etc.)
  3. STRICTLY FORBIDDEN: Never include any personal names, usernames, or names
 4. FOCUS ONLY ON: Action words, object names, location types, concept words, adjectives and other
  non-name key concepts
  Question: {question}
  Please carefully analyze the essential needs of the question and output in the following JSON
  format:
 {\n
    "complexity": 0/1/2,\n
    "keywords": ["keyword1", "keyword2", "keyword3"]\n
 }




                                                16
