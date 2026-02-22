<!-- Generated from arxiv-2503.21760.pdf via pdftotext -layout on 2026-02-22 -->

                                              MemInsight: Autonomous Memory Augmentation for LLM Agents


                                                 Rana Salama, Jason Cai, Michelle Yuan, Anna Currey, Monica Sunkara, Yi Zhang, Yassine Benajiba
                                                                                                 AWS AI
                                                      {ranasal, cjinglun, miyuan, ancurrey, sunkaral, yizhngn, benajiy }@amazon.com




                                                               Abstract                              actions (Zhang et al., 2024). However, the advan-
                                                                                                     tages of an LLM agent’s memory also introduce
                                             Large language model (LLM) agents have
                                                                                                     notable challenges (Wang et al., 2024b). As inter-




arXiv:2503.21760v2 [cs.CL] 31 Jul 2025
                                             evolved to intelligently process information,
                                             make decisions, and interact with users or tools.
                                                                                                     actions accumulate over time, retrieving relevant
                                             A key capability is the integration of long-term        information becomes increasingly difficult, espe-
                                             memory capabilities, enabling these agents to           cially in long-term or complex tasks. Raw his-
                                             draw upon historical interactions and knowl-            torical data grows rapidly and, without effective
                                             edge. However, the growing memory size                  memory management, can become noisy and im-
                                             and need for semantic structuring pose signif-          precise, hindering retrieval and degrading agent
                                             icant challenges. In this work, we propose an           performance. Moreover, unstructured memory lim-
                                             autonomous memory augmentation approach,
                                                                                                     its the agent’s ability to integrate knowledge across
                                             MemInsight, to enhance semantic data repre-
                                             sentation and retrieval mechanisms. By lever-           tasks and contexts. Therefore, structured knowl-
                                             aging autonomous augmentation to historical             edge representation is essential for efficient re-
                                             interactions, LLM agents are shown to deliver           trieval, enhancing contextual understanding, and
                                             more accurate and contextualized responses.             supporting scalable long-term memory in LLM
                                             We empirically validate the efficacy of our pro-        agents. Improved memory management enables
                                             posed approach in three task scenarios; con-            better retrieval and contextual awareness, making
                                             versational recommendation, question answer-
                                                                                                     this a critical and evolving area of research.
                                             ing and event summarization. On the LLM-
                                             REDIAL dataset, MemInsight boosts persua-
                                                                                                        Hence, in this paper we introduce an autonomous
                                             siveness of recommendations by up to 14%.               memory augmentation approach, MemInsight,
                                             Moreover, it outperforms a RAG baseline by              which empowers LLM agents to identify critical in-
                                             34% in recall for LoCoMo retrieval. Our empir-          formation within the data and proactively propose
                                             ical results show the potential of MemInsight           effective attributes for memory enhancements. This
                                             to enhance the contextual performance of LLM            is analogous to the human processes of attentional
                                             agents across multiple tasks                            control and cognitive updating, which involve se-
                                                                                                     lectively prioritizing relevant information, filtering
                                         1   Introduction
                                                                                                     out distractions, and continuously refreshing the
                                         LLM agents have emerged as an advanced frame-               mental workspace with new and pertinent data (Hu
                                         work to extend the capabilities of LLMs to im-              et al., 2024; Hou et al., 2024).
                                         prove reasoning (Yao et al., 2023; Wang et al.,                MemInsight autonomously generates aug-
                                         2024c), adaptability (Wang et al., 2024d), and self-        mentations that encode both relevant semantic
                                         evolution (Zhao et al., 2024a; Wang et al., 2024e;          and contextual information for memory. These
                                         Tang et al., 2025). A key component of these agents         augmentations facilitate the identification of
                                         is their memory module, which retains past inter-           memory components pertinent to various tasks.
                                         actions to allow more coherent, consistent, and             Accordingly, MemInsight can improve memory
                                         personalized responses across various tasks. The            retrieval by leveraging relevant attributes of
                                         memory of the LLM agent is designed to emu-                 memory, thereby supporting autonomous LLM
                                         late human cognitive processes by simulating how            agent adaptability and self-evolution.
                                         knowledge is accumulated and historical experi-
                                         ences are leveraged to facilitate complex reasoning         Our contributions can be summarized as fol-
                                         and the retrieval of relevant information to inform         lows:
    • We propose a structured autonomous ap-              et al., 2024b; Tack et al., 2024; Ge et al., 2025).
      proach that adapts LLM agents’ memory rep-          Common approaches involves generative retrieval
      resentations while preserving context across        models, which encode memory entries as dense
      extended conversations for various tasks.           vectors and retrieve the top-k most relevant docu-
                                                          ments using similarity search (Zhong et al., 2023;
    • We design and apply memory retrieval meth-          Penha et al., 2024). Similarity metrics such as co-
      ods that leverage the generated memory aug-         sine similarity (Packer et al., 2024) are widely used,
      mentations to filter out irrelevant memory          often in combination with dual-tower dense retriev-
      while retaining key historical insights.            ers, where memory entries are embedded indepen-
                                                          dently and indexed via tools like FAISS (Johnson
    • Our promising empirical findings demonstrate
                                                          et al., 2017) for efficient retrieval (Zhong et al.,
      the effectiveness of MemInsight on several
                                                          2023). Additionally, techniques such as Locality-
      tasks: conversational recommendation, ques-
                                                          Sensitive Hashing (LSH) are utilized to retrieve
      tion answering, and event summarization.
                                                          tuples containing related entries in memory (Hu
2    Related Work                                         et al., 2023b).

Well-organized and semantically rich memory               3     Autonomous Memory Augmentation
structures enable efficient storage and retrieval of
                                                          Our proposed model, MemInsight, encapsu-
information, allowing LLM agents to maintain con-
                                                          lates the agent’s memory M , offering a uni-
textual coherence and provide relevant responses.
                                                          fied framework for augmenting and retriev-
Developing an effective memory module in LLM
                                                          ing user–agent interactions represented as mem-
agents typically involves two critical components:
                                                          ory instances m.      As new interactions oc-
structural memory generation and memory retrieval
                                                          cur, they are autonomously augmented and in-
methods (Zhang et al., 2024; Wang et al., 2024a).
                                                          corporated into memory, forming an enriched
LLM Agents Memory Recent research in LLM                  set M = {m1<augmented> , . . . , mn<augmented> }.
agents memory focuses on storing and retrieving           As shown in Figure 1, MemInsight comprises three
prior interactions to improve adaptability and gen-       core modules: attribute mining, annotation, and
eralization (Packer et al., 2024; Zhao et al., 2024a;     memory retrieval.
Zhang et al., 2024; Zhu et al., 2023). Common
                                                          3.1    Attribute Mining and Annotation
approaches structure memory as summaries, tem-
poral events, or reasoning chains to reduce redun-        Attribute mining extracts structured and semanti-
dancy and highlight key information (Maharana             cally meaningful attributes from input dialogues
et al., 2024; Anokhin et al., 2024; Liu et al., 2023a).   for memory augmentation. The process follows a
Some methods enrich raw dialogues with seman-             principled framework guided by three key dimen-
tic annotations, such as event sequences (Zhong           sions:
et al., 2023; Maharana et al., 2024) or reusable          (1) Perspective, from which attributes are derived
workflows (Wang et al., 2024f). Recent models             (e.g., entity- or conversation-centric annotations)
like A-Mem(Xu et al., 2025) that uses manually            (2) Granularity, indicating the level of annotation
defined task-specific notes to structure an agent’s       detail (e.g., turn-level or session-level)
memory, while Mem0(Chhikara et al., 2025) of-             (3) Annotation, which ensures that extracted at-
fers a scalable, real-time memory pipeline for pro-       tributes are appropriately aligned with the corre-
duction use. However, most existing methods               sponding memory instance. A backbone LLM is
rely on unstructured memory or manually defined           leveraged to autonomously identify and generate
schemas. In contrast, MemInsight autonomously             relevant attributes.
discovers semantically meaningful attributes, en-
                                                          3.1.1 Attribute Perspective
abling structured memory representation without
                                                          An attribute perspective entails two main orienta-
human-crafted definitions.
                                                          tions: entity-centric and conversation-centric. The
LLM Agents Memory Retrieval Recent work                   entity-centric focuses on annotating specific items
has explored memory retrieval techniques to im-           referenced in memory, such as books or movies,
prove efficiency when handling large-scale histori-       using attributes that capture their key properties
cal context in LLM agents (Hu et al., 2023a; Zhao         (e.g., director, author, release year). In contrast, the
Figure 1: MemInsight framework comprising three core modules: Attribute Mining (including perspective and granularity),
Annotation (with attribute prioritization), and Memory Retrieval (including refined and comprehensive retrieval). These
components are triggered by various downstream tasks such as Question Answering, Event Summarization, and Conversational
Recommendation.


  Melanie: "Hey Caroline, since we last chatted, I've
                                                                                                                 versational context. Turn-level focuses on the spe-
  had a lot of things happening to me. I ran a charity
  race for mental health last Saturday it was really
                                                                                                                 cific content of individual turns to generate more
  rewarding. Really made me think about taking care of
  our minds.“                                            Turn Level Augmentation:                                nuanced and contextual attributes, while session-
  Caroline: "That charity race sounds great, Mel!
                                                         Turn 1: [event]:<charity race for mental health>
                                                         [time]: <"last saturday“> [emotion]:<"rewarding“>
                                                                                                                 level augmentation captures broader patterns and
  Making a difference & raising awareness for mental
                                                         [topic]: <mental health>
  health is super rewarding - I'm really proud of you
  for taking part!“
                                                                                                                 user intent across the interaction. Figure 2 illus-
  Melanie: "Thanks, Caroline! The event was really
                                                         Session Level Augmentation:
                                                         Melanie: [event]<ran charity race for mental health>,
                                                                                                                 trates this distinction, showing how both levels of-
  thought-provoking. I'm starting to realize that        [emotion]<rewarding>,[intent]<thinking about self-
  self-care is really important. It's a journey for      care>
                                                         Caroline:[event]<raising mental health awareness>,
                                                                                                                 fer complementary perspectives on a sample dia-
  me, but when I look after myself, I'm able to better
  look after my family.“                                 [emotion]<proud>
                                                                                                                 logue.
  Caroline: "I totally agree, Melanie. Taking care of
  ourselves is so important - even if it's not always
  easy. Great that you're prioritizing self-care.
                                                                                                                 3.1.3 Annotation and Attribute Prioritization
                                                                                                                 Subsequently, the generated attributes and their cor-
                                                                                                                 responding values are used to annotate the agent’s
Figure 2: An example for Turn level and Session level anno-                                                      memory. Annotation is done by aggregating at-
tations for a sample dialogue conversation from the LoCoMo
Dataset.                                                                                                         tributes and values in the relevant memory.
                                                                                                                 Given an interaction i, the module applies an LLM-
conversation-centric perspective captures attributes                                                             based extraction function FLLM to produce a set of
that reflect the overall user interaction with respect                                                           attribute–value pairs:
to users’ intent, preferences, sentiment, emotions,                                                                        A = FLLM (D) = {(aj , vj )}kj=1
motivations, and choices, thereby improving re-
sponse generation and memory retrieval. An illus-                                                                where: aj ∈ A represents the attribute (e.g.,
trative example is provided in Figure 4.                                                                         emotion, entity, intent) and vj ∈ V the value
                                                                                                                 of this attribute These attributes are then used
3.1.2            Attribute Granularity                                                                           to annotate the corresponding memory instance
Conversation-centric augmentations introduce the                                                                 mi , resulting in an augmented memory Ma :
notion of attribute granularity, which defines the                                                               Ma = {(A1 , m̃1 ), (A2 , m̃2 ), . . . , (Ai , m̃i )}, At-
level of details captured in the augmentation pro-                                                               tributes are typically aggregated using the Attribute
cess. The augmentation attributes can be analyzed                                                                Prioritization method, which can be classified into
at varying levels of abstraction, either at the level                                                            Basic and Priority. In Basic Augmentation, at-
of individual turns within a user conversation (turn-                                                            tributes are aggregated without a predefined or-
level), or across the entire dialogue session (session-                                                          der, resulting in an arbitrary sequence. In contrast,
level), each offering distinct insights into the con-                                                            Priority Augmentation sorts attribute-value pairs
according to their relevance to the memory being            multi-session dialogues between two speakers. It
augmented. This prioritization follows a structured         features five question types: Single-hop, Multi-hop,
order in which attribute (A1 , m̃1 ) holds the highest      Temporal reasoning, Open-domain, and Adversar-
significance, ensuring that more relevant attributes        ial, each annotated with the relevant dialogue turn
are processed first.                                        required for answering. LoCoMo also provides
                                                            event labels for each speaker in a session, which
3.2     Memory Retrieval                                    serve as ground truth for evaluating event summa-
MemInsight augmentations are employed to both               rization.
enrich memory representations and support the re-
trieval of contextually relevant memory. These              4.2    Experimental Setup
augmentations are utilized in one of two ways.              To evaluate our model, we begin by augmenting
(1) Comprehensive retrieval, retrieves all related          the datasets using zero-shot prompting to extract
memory instances along with their associated aug-           relevant attributes and their corresponding values.
mentations to support context-aware inference.              For attribute generation across tasks, we employ
(2) Refined retrieval, where the current context is         Claude Sonnet1 , LLaMA 32 , and Mistral3 . For the
augmented to extract task-specific attributes, which        Event Summarization task, we additionally utilize
then guide the retrieval process through one of the         Claude 3 Haiku4 . In embedding-based retrieval,
following methods:                                          we use the Titan Text Embedding model5 to gener-
a- Attribute-based Retrieval: which uses the current        ate embeddings of augmented memory, which are
attributes as filters to select memory instances with       indexed and searched using FAISS (Johnson et al.,
matching or related augmentations only. Given a             2017). To ensure consistency across all experi-
query session Q with attributes AQ , retrieve rele-         ments, we use the same base model for the primary
vant memories:                                              tasks: recommendation, answer generation, and
                                                            summarization, while varying the models used for
    Rattr (AQ , M) = Top-k {(Ak , Mk ) | match(AQ , Ak )}
                                                            memory augmentation. Claude Sonnet serves as
b- Embedding-based Retrieval where memory aug-              the backbone LLM in all baseline evaluations.
mentations are embedded as dense vectors. A query
embedding is derived from the current context’s             4.3    Evaluation Metrics
augmentations and used to retrieve the top-k most           We evaluate MemInsight using a combination of
similar memory entries via similarity search. Let           standard and LLM-based metrics. For Question
ϕ : Ak → Vd be the embedding function over                  Answering, we report F1-score for answer predic-
attributes. Then:                                           tion and recall for accuracy; for Conversational
                                 ϕ(AQ )·ϕ(A )               Recommendation, we use Recall@K, NDCG@K,
         sim(AQ , Ak ) = ∥ϕ(A )∥·∥ϕ(Ak )∥                   along with LLM-based metrics for genre matching.
                                    Q          k
                                                            We further incorporate subjective metrics, includ-
    Rembed (AQ , M) = Top-k {(Ak , Mk ) | sim(AQ , Ak )}
                                                            ing Persuasiveness (Liang et al., 2024), which
Finally, the retrieved memories are then integrated         measures how persuasive a recommendation aligns
into the current context to inform the ongoing              with the ground truth. Additionally, we introduce
interaction. Further implementation details of              a Relatedness metric where we prompt an LLM
embedding-based retrieval are provided in Ap-               to measure how comparable are recommendation
pendix C.                                                   attributes to the ground truth, categorizing them as
                                                            not comparable, comparable, or highly comparable.
4     Evaluation                                            For Event Summarization, we adopt G-Eval (Liu
4.1     Datasets                                            et al., 2023b), an LLM-based metric that evaluates
                                                            the relevance, consistency, and coherence of gener-
We evaluate MemInsight on two benchmarks:                   ated summaries against reference labels. Together,
LLM-REDIAL (Liang et al., 2024) and Lo-                     these metrics provide a comprehensive framework
CoMo (Maharana et al., 2024). LLM-REDIAL is a
                                                               1
dataset for conversational movie recommendation,                 claude-3-sonnet-20240229-v1
                                                               2
                                                                 llama3-70b-instruct-v1
comprising 10K dialogues and 11K movie men-                    3
                                                                 mistral-7b-instruct-v0
tions. LoCoMo is a dataset for evaluating Ques-                4
                                                                 claude-3-haiku-20240307-v1
                                                               5
tion Answering and Event Summarization, with 30                  titan-embed-text-v2:0
for evaluating both retrieval effectiveness and re-     temporal, and adversarial questions, which require
sponse quality.                                         more complex contextual reasoning. These results
                                                        highlight the effectiveness of memory augmenta-
5     Experiments                                       tion in enriching context and enhancing answer
5.1    Questioning Answering                            quality. MemInsight further outperforms all other
                                                        benchmark models across most question types,
Question Answering experiments are conducted
                                                        with the exception of multi-hop and temporal ques-
to evaluate the effectiveness of MemInsight in an-
                                                        tions in LoCoMo, where evaluation is based on a
swer generation. We evaluate the overall accuracy
                                                        partial-match F1 metric (Maharana et al., 2024).
to measure the system’s ability to retrieve and in-
tegrate relevant information using memory aug-             For embedding-based retrieval, we evaluate
mentations. The base model, which incorporates          MemInsight using both basic and priority augmen-
all historical dialogues without any augmentation,      tation, alongside the DPR baseline. MemInsight
serves as a baseline. Additionally, we report results   consistently outperforms all baselines, except in
on the LoCoMo benchmark using the same back-            temporal and adversarial questions, where DPR
bone model (Mistral v1) to ensure a fair evaluation.    achieves slightly higher accuracy. Nevertheless,
We also compare with stronger GPT-based base-           MemInsight maintains the highest overall accu-
lines, including MemoryBank(Zhong et al., 2023)         racy. Priority augmentation also consistently out-
and ReadAGent (Lee et al., 2024), which utilizes        performs basic augmentation across nearly all ques-
external memory modules to support long-term rea-       tion types, validating its effectiveness in improv-
soning. We also consider Dense Passage Retrieval        ing contextual relevance. Notably, MemInsight
(DPR) (Karpukhin et al., 2020) as a representative      demonstrates substantial gains on multi-hop ques-
baseline of RAG due to its scalability and retrieval    tions, which require reasoning over multiple pieces
efficiency.                                             of supporting evidence, highlighting its ability to
                                                        integrate dispersed information from historical di-
Memory Augmentation In this task, mem-                  alogue. As shown in Table 2, recall metrics fur-
ory is constructed from historical conversational       ther support this trend, with priority augmentation
dialogues, which requires the generation of             yielding a 35% overall improvement and consistent
conversation-centric attributes for augmentation.       gains across all categories.
Given that the ground-truth labels consist of dia-
logue turns relevant to the question, the dialogues
are annotated at the turn level. An LLM backbone        5.2   Conversational Recommendation
is prompted to generate augmentation attributes
for both conversation-centric and turn-level annota-    We simulate conversational recommendation by
tions.                                                  preparing dialogues for evaluation under the same
                                                        conditions proposed by Liang et al. (2024). This
Memory Retrieval To answer a given question,            process involves masking the dialogue and ran-
MemInsight first augments it to extract relevant at-    domly selecting n = 200 conversations for eval-
tributes, which guide memory retrieval. In attribute-   uation to ensure a fair comparison. Each conver-
based retrieval, dialogue turns with matching aug-      sational dialogue used is processed by masking
mentation attributes are retrieved. In embedding-       the ground truth labels, followed by a turn cut-off,
based retrieval, the question and its attributes are    where all dialogue turns following the first masked
embedded to perform a vector similarity search          turn are removed and retained as evaluation labels.
over indexed memory. The top-k most similar di-         Subsequently, the dialogues are augmented using a
alogue turns are then integrated into the current       conversation-centric approach to identify relevant
context to generate an answer.                          user interest attributes for retrieval. Finally, we
Experimental Results As shown in Table 1,               prompt the LLM model to generate a movie recom-
MemInsight achieves significantly higher overall        mendation that best aligns with the masked token,
accuracy on the question answering task com-            guided by the augmented movies retrieved based
pared to all baselines, using both attribute-based      on the user’s historical interactions.
and embedding-based memory retrieval. In the              The baseline for this evaluation is the results pre-
attribute-based setting, MemInsight with Claude-3-      sented in the LLM-REDIAL paper (Liang et al.,
Sonnet demonstrates notable gains in single-hop,        2024) which employs zero-shot prompting for rec-
                             Model                    Single-hop   Multi-hop    Temporal   Open-domain   Adversarial   Overall
             Baseline (Claude-3-Sonnet)                  15.0        10.0          3.3         26.0         45.3        26.1
             LoCoMo (Mistral v1)                         10.2        12.8         16.1         19.5         17.0        13.9
             ReadAgent (GPT-4o)                           9.1        12.6          5.3          9.6         9.81         8.5
             MemoryBank (GPT-4o)                          5.0         9.6          5.5          6.6          7.3         6.2
             Attribute-based Retrieval
             MemInsight (Claude-3-Sonnet)                18.0        10.3         7.5         27.0          58.3        29.1
             Embedding-Based Retrieval
             RAG Baseline (DPR)                          11.9        9.0          6.3         12.0          89.9        28.7
             MemInsight (Llama v3P riority )             14.3        13.4         6.0         15.8          82.7        29.7
             MemInsight (Mistral v1P riority )           16.1        14.1         6.1         16.7          81.2        30.0
             MemInsight (Claude-3-SonnetBasic )          14.7        13.8         5.8         15.6          82.1        29.6
             MemInsight (Claude-3-SonnetP riority )      15.8        15.8         6.7         19.7          75.3        30.1


Table 1: Results for F1 Score (%) for answer generation accuracy for attribute-based and embedding-based memory retrieval
methods. Baseline is Claude-3-Sonnet model to generate answers using all memory without augmentation, for Attribute-based
retrieval. In addition to the Dense Passage Retrieval(DPR) for Embedding-based retrieval. Evaluation is done with k = 5. Best
results per question category over all methods are in bold.

                           Model                      Single-hop   Multi-hop    Temporal   Open-domain   Adversarial   Overall
            RAG Baseline (DPR)                           15.7        31.4         15.4         15.4         34.9        26.5
            MemInsight (Llama v3P riority )              31.3        63.6         23.8         53.4         28.7        44.9
            MemInsight (Mistral v1P riority )            31.4        63.9         26.9         58.1         36.7        48.9
            MemInsight (Claude-3-SonnetBasic )           33.2        67.1         29.5         56.2         35.7        48.8
            MemInsight (Claude-3-SonnetP riority )       39.7        75.1         32.6         70.9         49.7        60.5


Table 2: Results for the RECALL@k=5 accuracy for Embedding-based retrieval for answer generation using LoCoMo dataset.
Dense Passage Retrieval(DPR) RAG model is the baseline. Best results are in bold.


           Statistic                                  Count                 of the effectiveness and relevance of MemInsight
           Total Movies                               9687
           Avg. Attributes                            7.39                  augmentations. To evaluate the quality of the gen-
           Failed Attributes                          0.10%                 erated attributes, Table 3 presents statistical data on
                                  Genre               9662                  the generated attributes, including the five most
                                  Release year        5998
           Top-5 Attributes       Director            5917                  frequently occurring attributes across the entire
                                  Setting             4302                  dataset. As shown in the table, the generated at-
                                  Characters          3603                  tributes are generally relevant, with "genre" being
Table 3:     Statistics of attributes generated for the LLM-                the most significant attribute based on its cumu-
REDIAL Movie dataset, which include total number of                         lative frequency across all movies (also shown in
movies, average number of attributes per item, number of                    Figure 5). However, the relevance of attributes
failed attributes, and the counts for the most frequent five at-
tributes.                                                                   vary, emphasizing the need for prioritization in
                                                                            augmentation. Additionally, the table reveals that
ommendation using the ChatGPT model6 . In addi-                             augmentation was unsuccessful for 0.1% of the
tion to the baseline model that uses memory with-                           movies, primarily due to the LLM’s inability to rec-
out augmentation.                                                           ognize certain movie titles or because the presence
   Evaluation includes direct matches between rec-                          of some words in the movie titles conflicted with
ommended and ground truth movie titles using RE-                            the LLM’s policy.
CALL@[1,5,10] and NDCG@[1,5,10]. Further-                                   Memory Retrieval For this task we evaluate
more, to address inconsistencies in movie titles                            attribute-based retrieval using the Claude-3-Sonnet
generated by LLMs, we incorporate an LLM-based                              model with both filtered and comprehensive set-
evaluation that assesses recommendations based                              tings. Additionally, we examine embedding-based
on genre similarity. Specifically, a recommended                            retrieval using all other models. For embedding-
movie is considered a valid match if it shares the                          based retrieval, we set k = 10, meaning that 10
same genre as the corresponding ground truth label.                         memory instances are retrieved (as opposed to 144
Memory Augmentation We initially augment                                    in the baseline).
the dataset with relevant attributes, primarily em-                         Experimental Results Table 4 shows the re-
ploying entity-centric augmentations for memory                             sults for conversational recommendation evaluating
annotation, as the memory consists of movies. In                            comprehensive setting, attribute-based retrieval and
this context, we conduct a detailed evaluation of the                       embedding-based retrieval. As shown in the table,
generated attributes to provide an initial assessment                       comprehensive memory augmentation tends to out-
   6
       https://openai.com/blog/chatgpt                                      perform the baseline and LLM-REDIAL model for
                                       Avg. Items
                  Model                                Direct Match (↑)                 Genre Match (↑)                          NDCG(↑)
                                       Retrieved
                                                    R@1     R@5     R@10           R@1         R@5        R@10          N@1         N@5         N@10
        Baseline (Claude-3-Sonnet)        144       0.000   0.010    0.015         0.320       0.57       0.660         0.005       0.007        0.008
        LLM-REDIAL Model                  144         -     0.000    0.005           -           -          -             -         0.000        0.001
        Attribute-Based Retrieval
        MemInsight (Claude-3-Sonnet)      15        0.005   0.015    0.015         0.270       0.540      0.640         0.005       0.007        0.007
        Embedding-Based Retrieval
        MemInsight (Llama v3)             10        0.000   0.005    0.028         0.380       0.580      0.670         0.000       0.002        0.001
        MemInsight (Mistral v1)           10        0.005   0.010    0.010         0.380       0.550      0.630         0.005       0.007        0.007
        MemInsight (Claude-3-Haiku)       10        0.005   0.010    0.010         0.360       0.610      0.650         0.005       0.007        0.007
        MemInsight (Claude-3-Sonnet)      10        0.005   0.015    0.015         0.400       0.600      0.64          0.005       0.010        0.010
        Comprehensive
        MemInsight (Claude-3-Sonnet)      144       0.010   0.020    0.025         0.300       0.590      0.690         0.010       0.015        0.017


Table 4: Results for Movie Conversational Recommendation using (1) Attribute-based retrieval with Claude-3-Sonnet model
(2) Embedding-based retrieval across models (Llama v3, Mistral v1, Claude-3-Haiku, and Claude-3-Sonnet) (3) Comprehensive
setting using Claude-3-Sonnet that includes ALL augmentations. Evaluation metrics include RECALL, NDCG, and an LLM-
based genre matching metric, with n = 200 and k = 10. Baseline is Claude-3-Sonnet without augmentation. Best results are in
bold.


recall and NDCG metrics. For genre match we find                            Raw Dialogues              LLM-based Event Summary
                                                                                                                                                 Baseline



the results to be comparable when considering all                                                                                                                LoCoMo
                                                                                                  Augmentations   Augmentations Dialogue                         Ground
                                                                                                                                                Evaluation
attributes. However, attributed-based filtering re-                                                                                                                Truth
                                                                                                                                                                  Labels


trieval still outperforms the LLM-REDIAL model                            Augmented Dialogue     Augmentation-based Event Summary
                                                                                                                                            Augmentation-based
and is comparable to the baseline with almost 90%                           Attribute Mining
                                                                                                         Attribute Granularity
                                                                                                                                                Summary

                                                                                                 Turn-Level             Session-Level
less memory retrieved.
   Table 5 presents the results of subjective LLM-                    Figure 3: Evaluation framework for event summarization
based evaluation for Persuasiveness and Related-                      with MemInsight, exploring augmentation at Turn and Ses-
ness. The findings indicate that memory augmen-                       sion levels, considering attributes alone or both attributes and
                                                                      dialogues for richer summaries.
tation enhances partial persuasiveness by 10–11%
using both comprehensive and attribute-based re-
trieval, while also reducing unpersuasive recom-                      summaries in the LoCoMo dataset.
mendations and increasing highly persuasive ones
by 4% in attribute-based retrieval. Furthermore, the                  Memory Augmentation In this experiment, we
results highlights the effectiveness of embedding-                    evaluate the effectiveness of augmentation granular-
based retrieval, which leads to a 12% increase                        ity; turn-level dialogue augmentations as opposed
in highly persuasive recommendations and en-                          to session-level dialogue annotations. We addition-
hances all relatedness metrics. This illustrates how                  ally, consider studying the effectiveness of using
MemInsight enriches the recommendation process                        only the augmentations to generate the event sum-
by incorporating condensed, relevant knowledge,                       maries as opposed to using both the augmentations
thereby producing more persuasive and related                         and their corresponding dialogue content.
recommendations. However, these improvements
were not reflected in recall and NDCG metrics.                        Experimental Results As shown in Table 6, our
                                                                      MemInsight model achieves performance compa-
5.3   Event Summarization                                             rable to the baseline, despite relying only on dia-
We evaluate the effectiveness of MemInsight in                        logue turns or sessions containing the event label.
enriching raw dialogues with relevant insights for                    Notably, turn-level augmentations provided more
event summarization. We utilize the generated an-                     precise and detailed event information, leading to
notations to identify key events within conversa-                     improved performance over both the baseline and
tions and hence use them for event summarization.                     session-level annotations.
We compare the generated summaries against Lo-                           For Claude-3-Sonnet, all metrics remain com-
CoMo’s event labels as the baseline. Figure 3 illus-                  parable, indicating that memory augmentations ef-
trates the experimental framework, where the base-                    fectively capture the semantics within dialogues at
line is the raw dialogues sent to the LLM model                       both the turn and session levels. This proves that
to generate an event summary, then both event                         the augmentations sufficiently enhance context rep-
summaries, from raw dialogues and augmentation                        resentation for generating event summaries. To fur-
based summaries, are compared to the ground truth                     ther investigate how backbone LLMs impact aug-
                                          Avg. Items
                     Model                Retrieved
                                                                    LLM-Persuasiveness %                         LLM-Relatedness%

                                                       Unpers*           Partially Pers.   Highly Pers.     Not Comp*     Comp     Match
           Baseline (Claude-3-Sonnet)        144        16.0                  64.0            13.0             57.0        41.0     2.0
           Attribute-Based Retrieval
           MemInsight (Claude-3-Sonnet)      15             2.0               75.0            17.0             40.5        54.0     2.0
           Embedding-Based Retrieval
           MemInsight (Llama v3)             10         11.3                  63.0            20.4             19.3        80.1     0.5
           MemInsight (Mistral v1)           10         16.3                  61.2            18.0             16.3        82.5     5.0
           MemInsight (Claude-3-Haiku)       10         1.6                   53.0            25.0             23.3        74.4     2.2
           MemInsight (Claude-3-Sonnet)      10          2.0                  59.5            20.0             29.5        68.0     2.5
           Comprehensive
           MemInsight (Claude-3-Sonnet)      144            2.0               74.0            12.0             42.5        56.0     1.0


Table 5: Movie Recommendations results (with similar settings to Table 4) using LLM-based metrics; (1) Persuasiveness— %
of Unpersuasive (lower is better), Partially, and Highly Persuasive cases. (2) Relatedness— % of Not Comparable (lower is
better), Comparable, and Exactly Matching cases. Best results are in bold. Comprehensive setting includes ALL augmentations.
Totals may NOT sum to 100% due to cases the LLM model could not evaluate.

          Model                          Claude-3-Sonnet                 Llama v3                    Mistral v1            Claude-3-Haiku
                                      Rel.    Coh.   Con.         Rel.     Coh.   Con.       Rel.     Coh.      Con.    Rel.   Coh.    Con.
         Baseline Summary             3.27    3.52   2.86         2.03     2.64   2.68       3.39      3.71     4.10    4.00     4.4   3.83
         MemInsight (TL)              3.08    3.33   2.76         1.57     2.17   1.95       2.54      2.53     2.49    3.93     4.3   3.59
         MemInsight (SL)              3.08    3.39   2.68          2.0     2.62   3.67       4.13      4.41     4.29    3.96    4.30   3.77
         MemInsight +Dialogues (TL)   3.29    3.46   2.92         2.45     2.19   2.87       4.30      4.53     4.60    4.23    4.52   4.16
         MemInsight +Dialogues (SL)   3.05    3.41   2.69         2.24     2.80   3.86       4.04      4.48     4.33    3.93    4.33   3.73


Table 6: Event Summarization results using G-Eval metrics (higher is better): Relevance, Coherence, and Consistency.
Comparing summaries generated with augmentations only at Turn-Level (TL) and Session-Level (SL) and summaries generated
using both augmentations and dialogues (MemInsight +Dialogues) at TL and SL. Best results are in bold.


   Model                                 G-Eval % (↑)                         Appendix F.
                                      Rel. Coh. Con.
   Baseline(Llama v3 )                2.03 2.64     2.68
   Llama v3 + Llama v3                2.45 2.19     2.87
   Claude-3-Sonnet + Llama v3         3.15 3.59     3.17                      6      Conclusion

Table 7: Results for Event Summarization using Llama                          This paper introduced MemInsight, an autonomous
v3, where the baseline is the model without augmentation as
opposed to the augmentation model (turn-level) using Claude-
                                                                              memory augmentation framework that enhances
3-Sonnet vs Llama v3.                                                         LLM agents’ memory through structured, attribute-
                                                                              based augmentations. While maintaining competi-
mentation quality, we employed Claude-3-Sonnet                                tive performance on standard metrics, MemInsight
as opposed to Llama v3 for augmentation while                                 achieves substantial improvements in LLM-based
still using Llama for event summarization. As pre-                            evaluation scores, demonstrating its effectiveness
sented in Table 7, Sonnet augmentations resulted                              in capturing semantic relevance and improving per-
in improved performance for all metrics, provid-                              formance across tasks and datasets. Experimen-
ing empirical evidence for the effectiveness and                              tal results show that both attribute-based filtering
stability of Sonnet in augmentation. Additional                               and embedding-based retrieval methods effectively
experiments and detailed analysis are provided in                             leverage the generated augmentations. Priority-
Appendix E.4.                                                                 based augmentation, in particular, improves similar-
                                                                              ity search and retrieval accuracy. MemInsight also
Qualitative Analysis To more rigorously assess                                complements traditional RAG models by enabling
the quality of the autonomously generated augmen-                             customized, attribute-guided retrieval, enhancing
tations, we conduct a qualitative analysis of the                             the integration of memory with LLM reasoning.
annotations produced by Claude-3 Sonnet. Us-                                  Moreover, in benchmark comparisons, MemInsight
ing the DeepEval hallucination metric (Yang et al.,                           consistently outperforms baseline models in overall
2024), we find that 99.14% of the annotations are                             accuracy and delivers stronger performance in rec-
grounded in the dialogue, demonstrating a high                                ommendation tasks, yielding more persuasive out-
level of factual consistency. The remaining 0.86%                             puts. Qualitative analysis further confirms the high
primarily consist of abstract or generic attributes,                          factual consistency of the generated annotations.
rather than explicit inaccuracies. Additional ex-                             These results highlight MemInsight’s potential as a
perimental details and examples are provided in                               scalable memory solution for LLM agents.
7   Limitations                                           long-horizon agent tasks with large language model.
                                                          Preprint, arXiv:2408.09559.
While MemInsight demonstrates strong perfor-
mance across multiple tasks and datasets, several       Jeff Johnson, Matthijs Douze, and Hervé Jégou. 2017.
limitations remain and highlight areas for future ex-      Billion-scale similarity search with gpus. Preprint,
                                                           arXiv:1702.08734.
ploration. Although the model autonomously gen-
erates augmentations, it may occasionally produce       Vladimir Karpukhin, Barlas Oğuz, Sewon Min, Patrick
abstract or overly generic annotations, especially        Lewis, Ledell Wu, Sergey Edunov, Danqi Chen,
in ambiguous dialogue contexts. While these are           and Wen tau Yih. 2020. Dense passage retrieval
                                                          for open-domain question answering. Preprint,
not factually incorrect, they may reduce retrieval        arXiv:2004.04906.
specificity in tasks requiring fine-grained memory
access. Additionally, MemInsight ’s performance         Kuang-Huei Lee, Xinyun Chen, Hiroki Furuta, John
                                                          Canny, and Ian Fischer. 2024. A human-inspired
is dependent on the capabilities of the underlying
                                                          reading agent with gist memory of very long contexts.
LLM used for attribute generation. Less capable or        Preprint, arXiv:2402.09727.
unaligned models may produce less consistent aug-
mentations. We also acknowledge that our current        Tingting Liang, Chenxin Jin, Lingzhi Wang, Wenqi Fan,
                                                           Congying Xia, Kai Chen, and Yuyu Yin. 2024. LLM-
implementation is limited to text-based interactions.
                                                           REDIAL: A large-scale dataset for conversational
Future work could extend MemInsight to support             recommender systems created from user behaviors
multimodal inputs, such as images or audio, en-           with LLMs. In Findings of the Association for Com-
abling richer and more comprehensive contextual            putational Linguistics: ACL 2024, pages 8926–8939,
representations.                                           Bangkok, Thailand. Association for Computational
                                                           Linguistics.

                                                        Lei Liu, Xiaoyan Yang, Yue Shen, Binbin Hu, Zhiqiang
References                                                Zhang, Jinjie Gu, and Guannan Zhang. 2023a.
Petr Anokhin, Nikita Semenov, Artyom Sorokin, Dmitry      Think-in-memory: Recalling and post-thinking en-
  Evseev, Mikhail Burtsev, and Evgeny Burnaev. 2024.      able llms with long-term memory.          Preprint,
  Arigraph: Learning knowledge graph world mod-           arXiv:2311.08719.
  els with episodic memory for llm agents. Preprint,
  arXiv:2407.04363.                                     Yang Liu, Dan Iter, Yichong Xu, Shuohang Wang,
                                                          Ruochen Xu, and Chenguang Zhu. 2023b. G-eval:
Prateek Chhikara, Dev Khant, Saket Aryan, Taranjeet       Nlg evaluation using gpt-4 with better human align-
  Singh, and Deshraj Yadav. 2025. Mem0: Building          ment. Preprint, arXiv:2303.16634.
  production-ready ai agents with scalable long-term
  memory. Preprint, arXiv:2504.19413.                   Adyasha Maharana, Dong-Ho Lee, Sergey Tulyakov,
                                                          Mohit Bansal, Francesco Barbieri, and Yuwei Fang.
Yubin Ge, Salvatore Romeo, Jason Cai, Raphael Shu,        2024. Evaluating very long-term conversational
  Monica Sunkara, Yassine Benajiba, and Yi Zhang.         memory of llm agents. Preprint, arXiv:2402.17753.
  2025. Tremu: Towards neuro-symbolic temporal rea-
  soning for llm-agents with memory in multi-session    Charles Packer, Sarah Wooders, Kevin Lin, Vivian Fang,
  dialogues. arXiv preprint arXiv:2502.01630.             Shishir G. Patil, Ion Stoica, and Joseph E. Gonzalez.
                                                          2024. Memgpt: Towards llms as operating systems.
Yuki Hou, Haruki Tamoto, and Homei Miyashita. 2024.       Preprint, arXiv:2310.08560.
  “my agent understands me better”: Integrating dy-
  namic human-like memory recall and consolidation      Gustavo Penha, Ali Vardasbi, Enrico Palumbo, Marco
  in llm-based agents. In Extended Abstracts of the       de Nadai, and Hugues Bouchard. 2024. Bridg-
  CHI Conference on Human Factors in Computing            ing search and recommendation in generative re-
  Systems, page 1–7. ACM.                                 trieval: Does one task help the other? Preprint,
Chenxu Hu, Jie Fu, Chenzhuang Du, Simian Luo, Junbo       arXiv:2410.16823.
  Zhao, and Hang Zhao. 2023a. Chatdb: Augmenting
                                                        Jihoon Tack, Jaehyung Kim, Eric Mitchell, Jinwoo
  llms with databases as their symbolic memory. arXiv
                                                           Shin, Yee Whye Teh, and Jonathan Richard Schwarz.
  preprint arXiv:2306.03901.
                                                           2024. Online adaptation of language models with
Chenxu Hu, Jie Fu, Chenzhuang Du, Simian Luo, Junbo        a memory of amortized contexts. arXiv preprint
  Zhao, and Hang Zhao. 2023b. Chatdb: Augment-             arXiv:2403.04317.
  ing llms with databases as their symbolic memory.
  Preprint, arXiv:2306.03901.                           Zhengyang Tang, Ziniu Li, Zhenyang Xiao, Tian Ding,
                                                          Ruoyu Sun, Benyou Wang, Dayiheng Liu, Fei Huang,
Mengkang Hu, Tianxing Chen, Qiguang Chen, Yao Mu,         Tianyu Liu, Bowen Yu, and Junyang Lin. 2025.
 Wenqi Shao, and Ping Luo. 2024. Hiagent: Hier-           Enabling scalable oversight via self-evolving critic.
  archical working memory management for solving          Preprint, arXiv:2501.05727.
Junlin Wang, Jue Wang, Ben Athiwaratkun, Ce Zhang,        Xizhou Zhu, Yuntao Chen, Hao Tian, Chenxin Tao, Wei-
  and James Zou. 2024a. Mixture-of-agents en-               jie Su, Chenyu Yang, Gao Huang, Bin Li, Lewei Lu,
  hances large language model capabilities. Preprint,       Xiaogang Wang, Yu Qiao, Zhaoxiang Zhang, and
  arXiv:2406.04692.                                         Jifeng Dai. 2023. Ghost in the minecraft: Gener-
                                                            ally capable agents for open-world environments via
Lei Wang, Chen Ma, Xueyang Feng, Zeyu Zhang, Hao            large language models with text-based knowledge
  Yang, Jingsen Zhang, Zhiyuan Chen, Jiakai Tang,           and memory. Preprint, arXiv:2305.17144.
  Xu Chen, Yankai Lin, Wayne Xin Zhao, Zhewei Wei,
  and Jirong Wen. 2024b. A survey on large language
  model based autonomous agents. Frontiers of Com-
  puter Science, 18(6).

Qineng Wang, Zihao Wang, Ying Su, Hanghang Tong,
  and Yangqiu Song. 2024c. Rethinking the bounds of
  llm reasoning: Are multi-agent discussions the key?
  Preprint, arXiv:2402.18272.

Qineng Wang, Zihao Wang, Ying Su, Hanghang Tong,
  and Yangqiu Song. 2024d. Rethinking the bounds of
  llm reasoning: Are multi-agent discussions the key?
  Preprint, arXiv:2402.18272.

Qineng Wang, Zihao Wang, Ying Su, Hanghang Tong,
  and Yangqiu Song. 2024e. Rethinking the bounds of
  llm reasoning: Are multi-agent discussions the key?
  Preprint, arXiv:2402.18272.

Zora Zhiruo Wang, Jiayuan Mao, Daniel Fried, and
  Graham Neubig. 2024f. Agent workflow memory.
  Preprint, arXiv:2409.07429.

Wujiang Xu, Kai Mei, Hang Gao, Juntao Tan, Zujie
 Liang, and Yongfeng Zhang. 2025. A-mem: Agentic
 memory for llm agents. Preprint, arXiv:2502.12110.

Yixin Yang, Zheng Li, Qingxiu Dong, Heming Xia, and
  Zhifang Sui. 2024. Can large multimodal models
  uncover deep semantics behind images? Preprint,
  arXiv:2402.11281.

Shunyu Yao, Jeffrey Zhao, Dian Yu, Nan Du, Izhak
  Shafran, Karthik Narasimhan, and Yuan Cao. 2023.
  React: Synergizing reasoning and acting in language
  models. Preprint, arXiv:2210.03629.

Zeyu Zhang, Xiaohe Bo, Chen Ma, Rui Li, Xu Chen,
  Quanyu Dai, Jieming Zhu, Zhenhua Dong, and Ji-
  Rong Wen. 2024. A survey on the memory mecha-
  nism of large language model based agents. Preprint,
  arXiv:2404.13501.

Andrew Zhao, Daniel Huang, Quentin Xu, Matthieu
  Lin, Yong-Jin Liu, and Gao Huang. 2024a. Ex-
  pel: Llm agents are experiential learners. Preprint,
  arXiv:2308.10144.

Andrew Zhao, Daniel Huang, Quentin Xu, Matthieu Lin,
  Yong-Jin Liu, and Gao Huang. 2024b. Expel: Llm
  agents are experiential learners. In Proceedings of
  the AAAI Conference on Artificial Intelligence, pages
  19632–19642.

Wanjun Zhong, Lianghong Guo, Qiqi Gao, He Ye, and
 Yanlin Wang. 2023. Memorybank: Enhancing large
  language models with long-term memory. Preprint,
  arXiv:2305.10250.
A     Ethical Consideration                            (1) Averaging Over Independent Embeddings
                                                       Each attribute and its corresponding value in the
We have thoroughly reviewed the licenses of all        generated augmentations is embedded indepen-
scientific artifacts, including datasets and mod-      dently. The resulting attribute embeddings are then
els, ensuring they permit usage for research and       averaged across all attributes to generate the final
publication purposes. To protect anonymity, all        embedding vector representation, as illustrated in
datasets used are de-identified. Our proposed          Figure 6 which are subsequently used in similarity
method demonstrates considerable potential in sig-     search to retrieve relevant movies.
nificantly reducing both the financial and environ-
mental costs typically associated with enhancing       (2) All Augmentations Embedding In this
large language models. By lessening the need for       method, all generated augmentations, including
extensive data collection and human labeling, our      all attributes and their corresponding values, are en-
approach not only streamlines the process but also     coded into a single embedding vector and stored for
provides an effective safeguard for user and data      retrieval as shown in Figure 6. Additionally, Fig-
privacy, reducing the risk of information leakage      ure 7 presents the cosine similarity results for both
during training corpus construction. Additionally,     methods. As depicted in the figure, averaging over
throughout the paper-writing process, Generative       all augmentations produces a more consistent and
AI was exclusively utilized for language checking,     reliable measure, as it comprehensively captures
paraphrasing, and refinement.                          all attributes and effectively differentiates between
                                                       similar and distinct characteristics. Consequently,
B     Autonomous Memory Augmentation                   this method was adopted in our experiments.

B.1    Attribute Mining                                D     Question Answering
Figure 4 illustrates examples for the two types        D.1    Prompts
of attribute augmentation: entity-centric and
conversation-centric. The entity-centric augmen-       Table 8 outlines the prompts used in the Question
tation represents the main attributes generated for    Answering task for generating augmentations in
the book entitled ’Already Taken’, where attributes    both questions and conversations.
are derived based on entity-specific characteristics
such as genre, author, and thematic elements. The      E     Conversational Recommendation
conversation-centric example illustrates the aug-      E.1    Prompts
mentation generated for a sample two turns dia-
logue from the LLM-REDIAL dataset, highlight-          Table 9 presents the prompts used in Conversational
ing attributes that capture contextual elements such   Recommendation for movie recommendations, in-
as user intent, motivation, emotion, perception, and   corporating both basic and priority augmentations.
genre of interest.
                                                       E.2    Evaluation Framework
   Furthermore, Figure 5 presents an overview of
the top five attributes across different domains in    Figure 8 presents the evaluation framework for the
the LLM-REDIAL dataset. These attributes repre-        Conversation Recommendation task. The process
sent the predominant attributes specific to each do-   begins with (1) augmenting all movies in memory
main, highlighting the significance of different at-   using entity-centric augmentations to enhance re-
tributes in augmentation generation. Consequently,     trieval effectiveness. (2) Next, all dialogues in the
the integration of priority-based embeddings has       dataset are prepared to simulate the recommenda-
led to improved performance.                           tion process by masking the ground truth labels
                                                       and prompting the LLM to find the masked labels
C     Embedding-based Retrieval                        based on augmentations from previous user inter-
                                                       actions. (3) Recommendations are then generated
In the context of embedding-based memory re-           using the retrieved memory, which may be attribute-
trieval, movies are augmented using MemInsight,        based—for instance, filtering movies by specific
and the generated attributes are embedded to re-       attributes such as genre or using embedding-based
trieve relevant movies from memory. Two main           retrieval. (4) Finally, the recommended movies are
embedding methods were considered:                     evaluated against the ground truth labels to assess
Figure 4: An example of entity-centric augmentation for the book ’Already Taken’, and a conversation-centric
augmentation for a sample dialogue from the LLM-REDIAL dataset.


                                                 Movies Augmentation Attributes                               Sports Augmentation Attributes
                                10000                                                         14000

                                                                                              12000
                                8000
                                                                                              10000




                   Frequency
                                6000
                                                                                                8000


                                4000                                                            6000

                                                                                                4000
                                2000
                                                                                                2000


                                      0                                                           0
                                                      re
                                                 lea
                                               Ye se
                                                  a
                                              Dir r
                                                 ec tor                                                        res         al      ory           rpond
                                                                                                                                                      se
                                               Se                                                       e                ter
                                          Ge
                                                  ttin
                                            Ch ara cte g
                                                                                                       Ty     atu            i   teg     Bra
                                                                                                                                               Co  lor
                                             n
                                                       rs                                                                                  Po
                                             ReRu  Plo  t                                                 p         Ma
                                                                                                                                              rta
                                                                                                                                             Pu
                                                                                                                                                  bil ity
                                             La
                                                  nti
                                                 Ac
                                                ng
                                                      me
                                                     tor s                                                    Fe             Ca            eq   Us  e
                                                 Wrua  ge
                                                     ite                                                                                      uip me   nt
                                                         r

                                                 Electronics Augmentation Attributes                                Books Augmentation Attributes
                               14000                                                           40000

                               12000                                                           35000

                                                                                               30000
                               10000




                   Frequency
                                                                                               25000
                                8000
                                                                                               20000
                                6000
                                                                                               15000
                                4000
                                                                                               10000
                                2000
                                                                                               5000
                                  0                                                               0

                                                             tiv       ity    Ma        l                 r                            r                      es               rs
                                            e     nd   lor      ity   bil    de   ter ial               tho        nre    Tit      sh            Se                      m
                                          Ty
                                                                             Fe
                                                                            Mo
                                                                                 atu                                          le      e             ttin     em    cte Pa ber
                                             p   Bra   Co         ati                res
                                                                                                       Au      Ge                                        g
                                                                                                                                                                         ge  s
                                                             ec                We   igh                                            bli      Pu               Th   ara  Se
                                                                                                                                                                        Nu
                                                                                                                                               b
                                                                                         t                                                                                rie
                                                            nn    mp         Ca teg  ory                                         Pu        Da licat
                                                                                                                                                                              s
                                                        Co                                                                                   te       ion         Ch     of
                                                                 Co

                                                                                         Attributes




Figure 5: Top 10 attributes by frequency in the LLM-REDIAL dataset across domains (Movies, Sports Items,
Electronics, and Books) using MemInsight Attribute Mining. Frequency indicates how often each attribute was
generated to augment different movies.


the accuracy and effectiveness of the retrieval and                                                rization quality. Table 11 shows the results of this
recommendation approach.                                                                           experiment. As illustrated, MemInsight consis-
                                                                                                   tently improves event summarization quality across
E.3     Event Summarization                                                                        models, with the best performance achieved when
E.3.1    Prompts                                                                                   augmentations are integreted with dialogue context
                                                                                                   highlighting the value of fine-grained annotations
Table 10 presents the prompt used in Event Sum-
                                                                                                   and contextual grounding. Overall, the findings
marization to augment dialogues by generating rel-
                                                                                                   confirm that MemInsight enhances the factual and
evant attributes. In this process, only attributes
                                                                                                   semantic quality of generated summaries.
related to events are considered to effectively sum-
marize key events from dialogues, ensuring a fo-
                                                                                                   F               Qualitative Analysis
cused and structured summarization approach.
                                                                                                   Figure 9 illustrates the augmentations generated
E.4     Additional Experiments                                                                     using different LLM models, including Claude-
In this experiment, we include an additional base-                                                 Sonnet, Llama, and Mistral for a dialogue turn
line for event summarization: raw summaries gen-                                                   from the LoCoMo dataset. As depicted in the fig-
erated directly by LLMs using zero-shot prompting,                                                 ure, augmentations produced by Llama include hal-
without any memory augmentation. This serves                                                       lucinations, generating information that does not
as a clear reference point to isolate the impact of                                                exist. In contrast, Figure 10 presents the augmen-
MemInsight ’s augmentation strategy on summa-                                                      tations for the subsequent dialogue turn using the
                                      Movie Augmentations

                                      [Attribute 1]<value> [Attribute 2]<value> [Attribute 3]<value> [Attribute 4]<value>         Movie


                                    (a) Averaging over Independent Embeddings                        (b) All Augmentations Embedding




                                                 Embedding Model

                                                                                                             Embedding Model




                                                            Averaging

                                                 Embedding Vector                                            Embedding Vector


                                Embedding-based Retrieval




Figure 6: Embedding methods for Embedding-based retrieval methods using generated Movie augmentations
including (a) Averaging over Independent Embeddings and (b) All Augmentations Embedding.

      Movie 1: The Departed                                                                       Movie 1: The Departed




      Movie 2: Shutter Island                                                                     Movie 2: Shutter Island




      Movie 3: The Hobbit                                                                         Movie 3: The Hobbit




                    (a) Averaging over Independent Embeddings                                                               (b) All Augmentations Embedding




Figure 7: An illustrative example of augmentation embedding methods for three movies: (1) The Departed, (2)
Shutter Island, and (3) The Hobbit. Movies 1 and 2 share similar attributes, whereas movies 1 and 3 differ. Te top 5
attributes of every movie were selected for a simplified illustration.


same models. Notably, Claude-Sonnet maintains
consistency across both turns, suggesting its stable
performance throughout all experiments. While
Mistral model tend to be less stable as it included
attributes that are not in the dialogue. A hallucina-
tion evaluation conducted using DeepEval yielded
a score of 99.14%, indicating strong factual consis-
tency. Table 12 presents examples of annotations
with lower scores. While these annotations are
more generic or abstract, they remain semantically
aligned with the original input.
                  Figure 8: Evaluation Framework for Conversation Recommendation Task.




Figure 9: Augmentation generated on a Turn-level for a sample dialogue turn from the LoCoMo dataset using
Claude-3-Sonnet, Llama v3 and Mistral v1 models.




                Figure 10: Augmentations generated for the turn following the turn in Figure 9
    using Claude-3-Sonnet, Llama v3 and Mistral v1 models. Hallucinations are presented in red.
   Question Augmentation
   Given the following question, determine what are the main inquiry attribute to look for and the person the question is for.
   Respond in the format: Person:[names]Attributes:[].
   Basic Augmentation
   You are an expert annotator who generates the most relevant attributes in a conversation. Given the conversation below,
   identify the key attributes and their values on a turn by turn level.
   Attributes should be specific with most relevant values only. Don’t include speaker name. Include value information
   that you find relevant and their names if mentioned. Each dialogue turn contains a dialogue id between [ ]. Make sure
   to include the dialogue the attributes and values are extracted form. Important: Respond only in the format [{speaker
   name:[Dialog id]:[attribute]<value>}].
   Dialogue Turn:{}
   Priority Augmentation
   You are an expert dialogue annotator, given the following dialogue turn generate a list of attributes and values for relevant
   information in the text.
   Generate the annotations in the format: [attribute]<value>where attribute is the attribute name and value is its corre-
   sponding value from the text.
   and values for relevant information in this dialogue turn with respect to each person. Be concise and direct.
   Include person name as an attribute and value pair.
   Please make sure you read and understand these instructions carefully.
   1- Identify the key attributes in the dialogue turn and their corresponding values.
   2- Arrange attributes descendingly with respect to relevance from left to right.
   3- Generate the sorted annotations list in the format: [attribute]<value>where attribute is the attribute name and value is
   its corresponding value from the text.
   4- Skip all attributes with none vales
   Important: YOU MUST put attribute name is between [ ] and value between <>. Only return a list of [at-
   tribute]<value>nothing else. Dialogue Turn: {}

Table 8: Prompts used in Question Answering for generating augmentations for questions. Also, augmentations for
conversations, utilizing both basic and priority augmentations.

   Basic Augmentation
   For the following movie identify the most important attributes independently. Determine all attributes that describe the
   movie based on your knowledge of this movie. Choose attribute names that are common characteristics of movies in
   general. Respond in the following format: [attribute]<value of attribute>. The Movie is: {}

   Priority Augmentation
   You are a movie annotation expert tasked with analyzing movies and generating key-attribute pairs. For the following
   movie identify the most important. Determine all attribute that describe the movie based on your knowledge of this
   movie. Choose attribute names that are common characteristics of movies in general. Respond in the following format:
   [attribute]<value of attribute>. Sort attributes from left to right based on their relevance. The Movie is:{}
   Dialogue Augmentation
   Identify the key attributes that best describe the movie the user wants for recommendation in the dialogue. These
   attributes should encompass movie features that are relevant to the user sorted descendingly with respect to user interest.
   Respond in the format: [attribute]<value>.

Table 9: Prompts used in Conversational Recommendation for recommending Movies utilizing both basic and
priority augmentations.

   Dialogue Augmentation
   Given the following attributes and values that annotate a dialogue for every speaker in the format [attribute]<value>,
   generate a summary for the event attributes only to describe the main and important events represented in these
   annotations. Refrain from mentioning any minimal event. Include any event-related details and speaker. Format: a bullet
   paragraph for major life events for every speaker with no special characters. Don’t include anything else in your response
   or extra text or lines. Don’t include bullets. Input annotations: {}

                        Table 10: Prompt used in Event Summarization to augment dialogues
       Model                                Llama v3               Mistral v1           Claude-3 Haiku         Claude-3 Sonnet
                                     Rel.     Coh.   Con.   Rel.    Coh.      Con.   Rel.   Coh.     Con.   Rel.    Coh.    Con.
       Baseline LLM Summary          2.23     2.66   2.63   3.34     3.77     4.11   3.97    4.33    3.79   3.27    3.64    2.78
       MemInsight (TL)               1.60     2.17   1.95   2.53     2.49     2.38   3.98    4.37    3.66   3.09    3.27    2.77
       MemInsight (SL)               1.80     2.62   3.67   4.09     4.38     4.19   3.94    4.31    3.69   3.08    3.39    2.68
       MemInsight + Dialogues (TL)   2.41     2.79   3.01   4.30     4.53     4.60   4.24    4.43    4.16   3.25    3.43    2.86
       MemInsight + Dialogues (SL)   2.01     2.70   3.86   4.04     4.48     4.34   3.95    4.33    3.71   3.02    3.37    2.73


Table 11: LLM-based evaluation scores for event summarization using relevance (Rel.), coherence (Coh.), and
consistency (Con.) across different models and augmentation settings. Baseline summaries are generated using
zero-shot prompting without memory augmentation. MemInsight is evaluated in both turn-level (TL) and session-
level (SL) configurations, with and without access to dialogue context.
 Input                                                 Augmentations                            Hall. Score
 ’Evan’:    [[“Evan’s son had an accident              "evan":{"[event]":"<son’s                0.66
 where he fell off his bike last Tuesday               accident>",     "[emotion]":"<worry>",
 but is doing better now.", D20:3], [“Evan             "[hobby]":"<hiking>",
 is supportive and encouraging towards Sam,            "[activity]":"<painting>"},
 giving advice to believe in himself and take          "sam":{"[emotion]":"<struggling>",
 things one day at a time.", D20:9], [“Evan            "[issue]":"<weight>",
 is a painter who finished a contemporary              "[emotion]":"<lack of confidence>",
 figurative painting emphasizing emotion and           "[action]":"<trying new things>"}}
 introspection.", D20:15], [“Evan had a
 painting published in an exhibition with the
 help of a close friend.", D20:17]], ’Sam’:
 [[“Sam used to love hiking but hasn’t had the
 chance to do it recently.", D20:6], [“Sam is
 struggling with weight and confidence issues,
 feeling like they lack motivation.", D20:8],
 [“Sam acknowledges that trying new things can
 be difficult.", D20:12]]
 {’James’: [[“James has a dog named Ned                {"james":{"[emotion]":"<excited>",       0.50
 that he adopted and can’t imagine life                "[intent]":"<socializing>",
 without.", D21:3], [“James is interested              "[topic]":"<dogs>",
 in creating a strategy game similar to                "[topic]":"<gaming>",
 Civilization.", D21:9], [“James suggested             "[topic]":"<starbucks>",
 meeting at Starbucks for coffee with John.",          "[topic]":"<pubMeeting>",
 D21:13]], ’John’: [[“John helps his younger           "[activity]":"<coffee>",
 siblings with programming and is proud of             "[activity]":"<beer>"},
 their progress", D21:2], [“John is working on         "john":{"[topic]":"<siblings>",
 a coding project with his siblings involving          "[topic]":"<programming>",
 a text-based adventure game.", D21:6], [“John         "[activity]":"<adventure
 prefers light beers over dark beers when going        game>",         "[emotion]":"<proud>",
 out.", D21:16], [“John agreed to meet James           "[intent]":"<socializing>"}}
 at McGee’s Pub after discussing different
 options.", D21:18]]}

Table 12: MemInsight annotations that scored below 1%
hallucination rate in the DeepEval hallucination evalua-
tion.
