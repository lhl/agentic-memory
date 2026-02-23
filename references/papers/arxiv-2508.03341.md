<!-- Generated from arxiv-2508.03341.pdf via pdftotext -layout on 2026-02-23 -->

                                             N EMORI : S ELF -O RGANIZING AGENT M EMORY I NSPIRED BY
                                                                 C OGNITIVE S CIENCE


                                                                      Jiayan Nan*,†     Wenquan Ma*,‡        Wenlong Wu**       Yize Chen***
                                                               †
                                                              School of Computer Science and Technology, Tongji University, Shanghai, China
                                                   ‡
                                                   School of Statistics and Data Science, Shanghai University of Finance and Economics, Shanghai, China




arXiv:2508.03341v3 [cs.AI] 27 Aug 2025
                                                      **
                                                         School of Instrumentation and Optoelectronic Engineering, Beihang University, Beijing, China
                                                                                                ***
                                                                                                    Tanka AI
                                                 {njy@tongji.edu.cn, wenquan.ma@stu.sufe.edu.cn, wlw@buaa.edu.cn, chenyize@tanka.ai}




                                                                                                  A BSTRACT
                                                       Large Language Models (LLMs) demonstrate remarkable capabilities, yet their inability to maintain
                                                       persistent memory in long contexts limits their effectiveness as autonomous agents in long-term inter-
                                                       actions. While existing memory systems have made progress, their reliance on arbitrary granularity
                                                       for defining the basic memory unit and passive, rule-based mechanisms for knowledge extraction
                                                       limits their capacity for genuine learning and evolution. To address these foundational limitations, we
                                                       present Nemori, a novel self-organizing memory architecture inspired by human cognitive principles.
                                                       Nemori’s core innovation is twofold: First, its Two-Step Alignment Principle, inspired by Event
                                                       Segmentation Theory, provides a principled, top-down method for autonomously organizing the
                                                       raw conversational stream into semantically coherent episodes, solving the critical issue of memory
                                                       granularity. Second, its Predict-Calibrate Principle, inspired by the Free-energy Principle, enables
                                                       the agent to proactively learn from prediction gaps, moving beyond pre-defined heuristics to achieve
                                                       adaptive knowledge evolution. This offers a viable path toward handling the long-term, dynamic
                                                       workflows of autonomous agents. Extensive experiments on the LoCoMo and LongMemEvalS
                                                       benchmarks demonstrate that Nemori significantly outperforms prior state-of-the-art systems, with its
                                                       advantage being particularly pronounced in longer contexts.

                                         Code: The MVP implementation of Nemori is available as open-source software at https://github.com/
                                         nemori-ai/nemori.


                                         1       Introduction

                                         The amnesia of Large Language Models (LLMs) stands as the core bottleneck to the grander vision of autonomous
                                         agents capable of genuine learning and intelligent self-evolution. For instance, LLMs exhibit a striking, seemingly
                                         personalized contextual ability within a single interaction; however, this illusion shatters with new sessions, as the agent,
                                         devoid of prior history, greets the user as a stranger. This inability to maintain long-term memory primarily stems from
                                         two core technical constraints: their limited context window, rooted in quadratic O(n2 ) attention complexity [1], and the
                                         Lost in the Middle phenomenon, hindering effective information utilization in long contexts [2]. Consequently, unless
                                         long-term memory of user interactions can be effectively addressed, the grander vision of human-like self-evolution for
                                         agents will remain unattainable [3, 4, 5].
                                         Fortunately, the solution to this amnesia lies in selective information provision via In-Context Learning (ICL, 6), a
                                         principle most prominently realized at scale by the Retrieval-Augmented Generation (RAG, 7) framework. Analogous
                                         to human selective recall, the key lies in storing vast information in an organized manner for efficient, contextual
                                         retrieval [8]. RAG effectively grounds LLMs in external factual documents, mitigating hallucination and providing
                                             1*
                                                  Equal contribution.
                                             2
                                                 Corresponding author: Jiayan Nan (njy@tongji.edu.cn).
                                                                                                                        Nemori – arXiv Preprint


domain-specific knowledge [9, 10]. This paradigm’s success is built upon a powerful, retrieval-centric philosophy [11].
This naturally raises a compelling question: could this powerful philosophy also be repurposed to augment an agent’s
memory of its own past, solving its amnesia?
However, RAG’s core characteristics, designed for static knowledge bases, fundamentally misalign with the demands
of dynamic conversation, giving rise to Memory-Augmented Generation (MAG, 12), a new paradigm focused on the
self-organization of an agent’s own lived experience. This misalignment manifests on three critical levels: its stateless
information patch approach prevents stateful learning [13, 14]; its reliance on offline indexing is antithetical to online
conversational stream processing [15]; and its focus on fact retrieval proves insufficient for the complex, local-global
reasoning inherent in dialogue [16]. This profound paradigm mismatch highlights MAG’s necessity, transforming
traditional retrieval from static libraries into an autonomous process of organizing an agent’s lived, temporal experiences
into an optimized representation [5]. MAG is essential not only for coherent conversations but also as a foundational
component for achieving the long-term goal of agent self-evolution.
While the MAG paradigm represents a significant step beyond traditional RAG, existing methods have yet to unlock
the full potential of human-like self-organization. We argue that this stems from a fundamental neglect of the self
aspect of self-organization. The quality of a final memory unit, y, is critically limited by a lack of self, which manifests
as two sequential challenges, y = f (x): the input chunks (x) and the organizing mechanism itself (f ). The first
challenge concerns the input chunks (x). Existing MAG systems often adopt arbitrary or unspecified segmentation,
inherently leading to a loss of contextual information. The root cause of this is the failure to leverage the agent’s
own self capabilities to autonomously convert the raw stream into semantically coherent chunks. The second, more
advanced problem is the organizing function itself (f ). Existing methods struggle to balance retaining details with
forming abstractions, resulting in redundant or incomplete memory representations. This stems from a failure to
recognize that memory naturally follows a dual cognitive structure, which separates episodic details from semantic
knowledge. Crucially, (f ) also lacks a proactive self -learning mechanism to bridge the gap between memory and the
raw conversation. Existing systems within a pre-defined prompt are limited to what fits the preset schema, highlighting
the need for an end-to-end, proactive process that intrinsically focuses on non-redundant content generation.
To address these fundamental challenges, we introduce Nemori, a novel self-organizing memory architecture built
upon a dual-pillar cognitive framework. This framework offers a principled solution to the sequential challenges
of defining the input chunks (x) and designing the organizing function (f ). First, for the input chunking problem
(x), the framework’s Two-Step Alignment Principle offers a principled, top-down solution. It begins with the
Boundary Alignment step, which, inspired by Event Segmentation Theory [17], autonomously organizes the raw
conversational stream into semantically coherent experience chunks. Computationally, we achieve this by adapting and
simplifying techniques from dialogue topic segmentation, allowing Nemori to move beyond arbitrary segmentation.
Second, the challenge of the organizing function (f ) is addressed through a two-pronged approach. The initial step is
Representation Alignment (a sub-principle of the Two-Step Alignment Principle), which simulates the natural human
narration of Episodic Memory [18] to transform raw chunks into rich, narrative memory. This is complemented by our
Predict-Calibrate Principle, a proactive learning mechanism inspired by the Free-energy Principle [19]. This principle



                                           Input Chunks                            Organizing Function
                          Problem               (x)                                        (f)


                                                      Two-Step Alignment


                                                                       Representation               Predict-Calibrate
                          Principle     Boundary Alignment
                                                                        Alignment                       Principle




                                                                       Episodic Memory              Semantic Mem-
                        Computation     Topic Segmentation
                                                                          Generation                ory Generation



Figure 1: The conceptual framework of Nemori, illustrating the mapping from problem to principle to computation.
The framework addresses two core challenges: defining appropriate input chunks (x) and designing an effective
organizing function (f ). The Two-Step Alignment Principle (comprising Boundary Alignment and Representation
Alignment) solves the input chunking and initial representation problem. Concurrently, the Predict-Calibrate Principle
provides a proactive mechanism for the organizing function, which operationalizes them via three core modules: Topic
Segmentation, Episodic Memory Generation, and Semantic Memory Generation, as illustrated here.


                                                                   2
                                                                                                Nemori – arXiv Preprint


posits that genuine learning stems from actively distilling prediction gaps, analogous to the effective human strategy
of attempting a task before reflecting on discrepancies against a standard, which fosters deeper understanding than
passively reviewing solutions. Together, these principles form a synergistic, complementary learning system [20] that
underpins Nemori’s architecture, which operationalizes them via three core modules: Topic Segmentation, Episodic
Memory Generation, and Semantic Memory Generation, illustrated in Figure 1. Our main contributions are as
follows: (1) We propose a novel, dual-pillar framework for dynamic conversational memory, inspired by cognitive
science: the Two-Step Alignment Principle for faithful experience representation and the Predict-Calibrate Principle
for proactive knowledge distillation. (2) We design and implement Nemori, a complete memory architecture that
operationalizes this framework, incorporating technical innovations like a top-down intelligent boundary detector and an
asynchronous predict-calibrate pipeline. (3) We demonstrate Nemori’s effectiveness and robustness through extensive
experiments, confirming it significantly outperforms prior state-of-the-art systems on the LoCoMo and LongMemEvalS
benchmarks, with its advantage being particularly pronounced in longer contexts.

2     Related Works
2.1   Beyond Static RAG: The Frontier of Streaming Memory

Our work is situated within the broad paradigm of non-parametric memory, which enhances LLMs with an external
memory store, distinct from parametric memory [21] or hybrid approaches [22]. Within this domain, Retrieval-
Augmented Generation (RAG, 7) is dominant, designed for retrieving from static knowledge bases to ground LLMs in
external facts and provide domain-specific knowledge [9, 10]. In contrast, our work contributes to Memory-Augmented
Generation (MAG), a distinct current focusing on constructing and retrieving from a dynamic memory of an agent’s
own lived, temporal experiences [5].

2.2   The Input Chunk Challenge (x): Solving the Granularity Gap in Agent Memory

A foundational, yet often overlooked, challenge within the MAG paradigm is defining the basic unit of experience,
the input chunk (x). Cognitive science suggests an ideal memory unit should correspond to a coherent event[17], yet
prior work reveals a spectrum of heuristic-based and incomplete approaches that neglect the agent’s self capability to
autonomously define these units.
Prevailing methods often adopt arbitrary or heuristic segmentation. The most primitive approaches use a Single
Message (an independent user input or system output, 23, 24) or an Interaction Pair (a bundled “user input + system
response”, 25, 26), resulting in fragmented memories that lack broader semantic context. To improve coherence, other
systems employ external structures like Pre-defined Sessions (external structures, 27, 28) or outsource the task via
User-defined Chunks (outsourcing the definition to human users, 29). While producing higher-quality chunks, these
methods compromise scalability due to significant operational overhead and limited automation.
Concurrently, a significant body of work focuses on memory storage and retrieval, treating the memory unit as an
Unspecified Unit or a black box [30, 31, 32, 12]. These systems advance memory management but do not address the
foundational issue of how meaningful units are formed in the first place. Figure 2 visually illustrates the limitations of
these approaches compared to our proposed episodic method.
This brings us to the frontier: the Self-organized Episode. Pioneering work like EM-LLM operationalized this via
a bottom-up, token-level mechanism based on predictive surprise [33], which contrasts with the top-down reasoning
required for holistic social interactions. While techniques from dialogue topic segmentation exist [34], their purpose
is general topic analysis, not creating memory units for agents. This calls for a fully automated, top-down, cognitive-
grounded approach to model underlying events, a challenge our Two-Step Alignment Principle is designed to solve,
beginning with its Boundary Alignment step.

2.3   The Organizing Function Challenge (f ): From Passive Storage to Proactive Learning

Beyond the granularity of input chunks (x), the second key challenge is the organizing function (f ), which governs
how memory is structured and evolved. Dual-memory systems, which typically maintain raw episodic memories and
abstracted semantic knowledge, form a prominent approach, theoretically rooted in the Complementary Learning
Systems theory (CLS, 20) which posits that the brain uses complementary fast-learning (episodic) and slow-learning
(semantic) systems.
However, pioneering systems applying this concept, such as HEMA [25] and Mem0 [26], address the organizing
function (f ) with significant limitations. Early work like HEMA applied CLS theory by using passive summarization to
create global summaries from raw dialogue. Mem0 advanced this by extracting consolidated factual entries, which


                                                            3
                                                                                                                                             Nemori – arXiv Preprint


enhances semantic queryability but often comes at the cost of compromising the original episodic context. Consequently,
for memory representation, both approaches rely on simplified transformations rather than a principled, cognitively-
inspired method for narrative generation, a challenge our Representation Alignment principle addresses. More
critically, their mechanism for knowledge evolution remains a passive, extraction-based process. This reveals an
unaddressed gap: the absence of a proactive learning mechanism for the agent to autonomously evolve its knowledge
base. Our work fills this gap with the Predict-Calibrate Principle. Inspired by the Free-energy Principle [19], it moves
beyond passive extraction(e.g. pre-defined extraction rules) by actively distilling prediction gaps, enabling the system
to learn from its own errors for a truly synergistic, complementary learning process.

3     Methodology
The Nemori methodology provides a concrete computational implementation of our dual-pillar cognitive framework: the
Two-Step Alignment Principle and the Predict-Calibrate Principle. As illustrated in Figure 3, the system is composed
of three core modules: Topic Segmentation, Episodic Memory Generation, and Semantic Memory Generation, all
supported by a unified retrieval system. The first two modules, Topic Segmentation and Episodic Memory Generation,
work in concert to operationalize the Two-Step Alignment Principle for faithful experience representation. The
third module, Semantic Memory Generation, is designed to realize the Predict-Calibrate Principle for proactive
knowledge evolution. In the following sections, we will detail the mechanisms of each component in accordance with
this principle-driven structure.

3.1     The Two-Step Alignment Principle in Practice

The first principle is operationalized through two sequential modules: a boundary detector that realizes semantic
Boundary Alignment, and an episode generator that realizes narrative Representation Alignment.

3.1.1    Boundary Alignment via Intelligent Detection.
The process of identifying episodic boundaries begins with a message buffer, denoted as Bu for each user u, which
accumulates incoming conversational messages. The sequence of messages in the buffer at a given time t is represented
as M = {m1 , m2 , . . . , mt }, where each message mi is a tuple (ρi , ci , τi ) containing the role ρi ∈ {user, assistant},
the message content ci , and the timestamp τi .
For each new incoming message mt+1 , an LLM-based boundary detector, fθ , is invoked to determine if a meaningful
semantic boundary has been crossed. Rather than a simple probability, the detector’s output is a structured response
containing both a boolean decision and a confidence score:
                                                            (bboundary , cboundary ) = fθ (mt+1 , M )                                                            (1)
where bboundary ∈ {True, False} and cboundary ∈ [0, 1]. The function fθ makes this determination by evaluating several
factors, including contextual coherence (i.e., the semantic similarity between messages), temporal markers (e.g., by the
way), shifts in user intent(e.g., from asking for information to making a decision), and other structural signals.


                                 Standard RAG                             Interaction Pair                     Episode

                             [2024-12-01] User: What color is apple?      What color is apple?             What color is apple?
                             [2024-12-01] Assistant: It is red.
                             [2024-12-01] User: Yes! I love it.
                                                                                           It is red.                          It is red.


                                                                                                           Yes!I love it.


                            [2024-12-01] Assistant: It is very healthy!   Yes!I love it.
                                                                                                                       It is very healthy!
                            [2024-12-02] User: Good morning!
                                                                                     It is very healthy!

                                                                                                            Good morning!




Figure 2: An illustration of different conversation segmentation methods. Standard RAG (left) often relies on arbitrary,
fixed-size chunking, which can break the semantic integrity of a dialogue (as shown by the split in the apple discussion).
The Interaction Pair model (middle) groups user-assistant turns but can still separate related user messages. In contrast,
our proposed Episodic segmentation (right), guided by semantic boundary detection, correctly groups the entire
conversation about the apple into a single, coherent episode, preserving the interaction’s logical flow.


                                                                                           4
                                                                                                                                   Nemori – arXiv Preprint


Topic segmentation is triggered when either of two conditions is met: a high-confidence semantic shift is detected, or
the buffer reaches its capacity. This is formally expressed as:
                                   T = (bboundary ∧ cboundary > σboundary ) ∨ (|M | ≥ βmax )                                                           (2)
where σboundary is a configurable confidence threshold, |M | is the number of messages in buffer M , and βmax is a
predefined maximum buffer size. Upon triggering (i.e., when T = True), the message sequence M is passed to the next
module for episodic memory generation, leaving the new message mt+1 to initialize the subsequent buffer.

3.1.2    Representation Alignment via Narrative Generation.
The Episodic Memory Generation module receives the Segmented Conversation, denoted as M , upon the detection of a
boundary. Its purpose is to transform this raw segment into a structured episodic memory, e. This transformation is
performed by an LLM-based Episode Generator, gϕ , which reframes the segmented dialogue into a coherent, narrative
representation. The output of this process is a structured tuple:
                                                     e = (ξ, ζ) = gϕ (M )                                                                              (3)

where ξ represents a concise title that encapsulates the episode’s core theme, and ζ is a detailed third-person narrative
that preserves the salient information and context of the interaction. This structured format of combining a title with a
rich narrative aligns with our Representation Alignment principle. Subsequently, the complete episodic memory e is
stored in the Episodic Memory Database, while its title ξ is passed to the Semantic Memory Generation module to
initiate the learning cycle.

3.2     The Predict-Calibrate Principle in Practice

The second, proactive learning principle, Predict-Calibrate, is operationalized by the Semantic Memory Generation
module. This component serves as the core of agent learning and evolution, implementing a novel mechanism for
incremental knowledge acquisition inspired by the Free Energy Principle from cognitive science [19]. As depicted in
Figure 3, this learning process operates in a three-stage cycle.

3.2.1    Stage 1: Prediction.
The cycle begins when the module receives the title ξ of a newly generated episode enew = (ξ, ζ). The first stage of the
cycle is to forecast the episode’s content based on existing knowledge. This process unfolds in two main parts: first
retrieving relevant memories, and then making the prediction.

Memory Retrieval. To identify relevant knowledge from the Semantic Memory Database K, the system retrieves a
set of relevant memories, Krelevant , for the new episode’s content. This retrieval is performed by our unified retrieval
mechanism, which takes the embedding of the new episode’s concatenated title and content as a query, along with the


                             Topic Segmentation       Episodic Memory Generation            Semantic Memory Generation
                                                                                                                 Semantic
                                                                                                                 Memory
                                     New                              TITLE       TITLE                              Semantic
                                    Message                                                                         Memory DB

                                                                      Content Episodic
                                                                              Memory      Episode     Possible
                                                                                          Predictor   Episode?
                                  Message Buffer
                                                    Episodic Memory
                                                          DB
                                                                               Episode         Predicted
                                                                              Generator        Episode
                                                                                                                        Semantic
                                     Topic                                                                              Memory
                                    Change?
                                                                                                           What's
                                                                                                           Gap?




                                Boundary Detector            Segmented Conversation       Semantic Knowledge
                                                                                               Distiller



Figure 3: The Nemori system features three modules: Topic Segmentation, Episodic Memory Generation, and Semantic
Memory Generation. It segments conversations into Episodic Memory, then uses a Predict-Calibrate cycle to distill new
Semantic Memory from prediction gaps against original conversations.


                                                                       5
                                                                                                 Nemori – arXiv Preprint


semantic memory database K, a maximum number of results m, and a configurable similarity threshold σs . The result
is the definitive set of relevant memories:

                                      Krelevant = Retrieve(embed(ξ ⊕ ζ), K, m, σs )                                     (4)

This ensures high-quality contextual information for the subsequent prediction stage.

Episode Prediction. With the relevant knowledge retrieved, an LLM-based Episode Predictor, hψ , then forecasts the
episode’s content, ê, based on the episode’s title ξ and the final set of relevant knowledge Krelevant :

                                                    ê = hψ (ξ, Krelevant )                                             (5)

3.2.2    Stage 2: Calibration.
In the calibration stage, the predicted content ê is compared against the ground truth of the interaction. Crucially, this
ground truth is not the generated episodic narrative ζ, but the original, unprocessed Segmented Conversation block,
M . An LLM-based Semantic Knowledge Distiller, rω , processes this comparison to identify the prediction gap—the
novel or surprising information that the existing knowledge base failed to predict. From this gap, a new set of semantic
knowledge statements, Knew , is distilled:
                                                      Knew = rω (ê, M )                                                (6)

3.2.3    Stage 3: Integration.
Finally, the newly generated and validated knowledge statements, Knew , are integrated into the main Semantic Memory
Database K. This completes the learning cycle, enriching the agent’s knowledge base and refining its internal model of
the world.

3.3     Unified Memory Retrieval

The system employs a unified vector-based retrieval approach, denoted as Retrieve(q, D, m, σs ), optimized for
accessing both episodic and semantic memories. This function takes a query q, a memory database D, a maximum
number of results m, and an optional similarity threshold σs to return a set of relevant memories. The retrieval
mechanism uses dense vector search with cosine similarity to identify semantically relevant memories through a
three-stage process: similarity computation, candidate selection, and threshold-based filtering.


4     Experiment

In this section, we conduct a series of experiments on two benchmark datasets to investigate the effectiveness of Nemori.
Our research is designed to address the following key research questions (RQs):
RQ1: How does Nemori perform in long-term conversational memory tasks compared to state-of-the-art methods?
RQ2: What are the contributions of Nemori’s key components to its overall performance?
RQ3: How does the model’s performance change with adjustments to the number of retrieved episodic memories?
RQ4: How well does Nemori scale to significantly longer and more challenging conversational contexts?

4.1     Experimental Setup

4.1.1    Datasets.
We evaluate Nemori on two distinct benchmarks to ensure a comprehensive validation of our approach.

         • LoCoMo [35]: 10 dialogues with 24K average tokens, featuring 1,540 questions across four reasoning
           categories.
         • LongMemEvalS [36]: 500 conversations with 105K average tokens. While structurally similar to LoCoMo, it
           presents significantly greater challenges through longer, more realistic conversational contexts, allowing us to
           assess scalability under demanding conditions.


                                                              6
                                                                                                                                                            Nemori – arXiv Preprint


4.1.2                Baselines.
We benchmark Nemori against five powerful and representative baselines, categorized as follows:

                    • Standard Method: Full Context, which provides the entire dialogue history to the LLM, representing the
                      theoretical upper bound of information availability.
                    • Retrieval-Augmented Method: RAG-4096, a standard retrieval-augmented generation approach that chunks
                      dialogues into 4096-token segments for dense retrieval.
                    • Memory-Augmented Systems: We compare against three state-of-the-art memory systems: LangMem [37],
                      which uses a hierarchical memory structure; Zep [38], a commercial solution based on temporal knowledge
                      graphs; and Mem0 [26], a system that extracts and maintains personalized memories.

4.1.3                Evaluation Metrics.
On the LoCoMo dataset, our primary evaluation metric is the LLM-judge score, where we employ gpt-4o-mini as the
judge. We supplement this with F1 and BLEU-1 scores for a more complete picture. For the LongMemEvalS dataset,
we also use the LLM-judge score, but with prompts adapted to its specific question-answering format.

4.1.4                Reproducibility.
To ensure fair comparison, Mem0 and Zep utilize their commercial APIs to retrieve memory contexts, which are then
fed to gpt-4o-mini and gpt-4.1-mini for answer generation. All other methods, including Nemori, employ gpt-4o-mini
and gpt-4.1-mini as both internal backbone models and answer generation models. For Nemori specifically, embeddings
are generated with text-embedding-3-small. Key hyperparameters were set as follows: similarity threshold σs = 0.0,
boundary detection confidence σboundary = 0.7, and max buffer size βmax = 25. For retrieval settings across all
experiments, we maintain a fixed ratio between episodic and semantic memory retrieval: we retrieve top-k episodic
memories and top-m = 2k semantic memories. In the main experiments, k = 10 (thus m = 20), while in RQ3’s
hyperparameter analysis, k varies from 2 to 20. To balance informativeness and efficiency, only the top-2 episodic
memories include their original conversation text, as higher-similarity episodes tend to be more useful.

4.2               Main Results (RQ1)

To answer RQ1, we report the performance comparison on the LoCoMo dataset in Table 1. Our observations are as
follows: Superior Performance Across the Board. Nemori consistently outperforms all baseline methods across both

                                     Temporal Reasoning                  Open Domain                       Multi-Hop                        Single-Hop                          Overall
               Method
                                LLM Score       F1     BLEU-1    LLM Score       F1     BLEU-1    LLM Score       F1     BLEU-1    LLM Score       F1     BLEU-1    LLM Score        F1    BLEU-1
               FullContext     0.562 ± 0.004   0.441    0.361   0.486 ± 0.005   0.245    0.172   0.668 ± 0.003   0.354    0.261   0.830 ± 0.001   0.531    0.447   0.723 ± 0.000   0.462    0.378


gpt-4o-mini
               LangMem         0.249 ± 0.003   0.319   0.262    0.476 ± 0.005   0.294   0.235    0.524 ± 0.003   0.335   0.239    0.614 ± 0.002   0.388   0.331    0.513 ± 0.003   0.358   0.294
               Mem0            0.504 ± 0.001   0.444   0.376    0.406 ± 0.000   0.271   0.194    0.603 ± 0.000   0.343   0.252    0.681 ± 0.000   0.444   0.377    0.613 ± 0.000   0.415   0.342
               RAG             0.237 ± 0.000   0.195   0.157    0.326 ± 0.005   0.190   0.135    0.313 ± 0.003   0.186   0.117    0.320 ± 0.001   0.222   0.186    0.302 ± 0.000   0.208   0.164
               Zep             0.589 ± 0.003   0.448   0.381    0.396 ± 0.000   0.229   0.157    0.505 ± 0.007   0.275   0.193    0.632 ± 0.001   0.397   0.337    0.585 ± 0.001   0.375   0.309
               Nemori (Ours)   0.710 ± 0.000   0.567   0.466    0.448 ± 0.005   0.208   0.151    0.653 ± 0.002   0.365   0.256    0.821 ± 0.002   0.544   0.432    0.744 ± 0.001   0.495   0.385
               FullContext     0.742 ± 0.004   0.475    0.400   0.566 ± 0.010   0.284    0.222   0.772 ± 0.003   0.442    0.337   0.869 ± 0.002   0.614    0.534   0.806 ± 0.001   0.533    0.450


gpt-4.1-mini
               LangMem         0.508 ± 0.003   0.485   0.409    0.590 ± 0.005   0.328   0.264    0.710 ± 0.002   0.415   0.325    0.845 ± 0.001   0.510   0.436    0.734 ± 0.001   0.476   0.400
               Mem0            0.569 ± 0.001   0.392   0.332    0.479 ± 0.000   0.237   0.177    0.682 ± 0.003   0.401   0.303    0.714 ± 0.001   0.486   0.420    0.663 ± 0.000   0.435   0.365
               RAG             0.274 ± 0.000   0.223   0.191    0.288 ± 0.005   0.179   0.139    0.317 ± 0.003   0.201   0.128    0.359 ± 0.002   0.258   0.220    0.329 ± 0.002   0.235   0.192
               Zep             0.602 ± 0.001   0.239   0.200    0.438 ± 0.000   0.242   0.193    0.537 ± 0.003   0.305   0.204    0.669 ± 0.001   0.455   0.400    0.616 ± 0.000   0.369   0.309
               Nemori (Ours)   0.776 ± 0.003   0.577   0.502    0.510 ± 0.009   0.258   0.193    0.751 ± 0.002   0.417   0.319    0.849 ± 0.002   0.588   0.515    0.794 ± 0.001   0.534   0.456



Table 1: Detailed performance comparison on LoCoMo dataset by question type. Bold indicates the best performance
for each metric.

backbone models. With gpt-4o-mini, Nemori achieves an overall LLM score of 0.744, which already surpasses the
Full Context baseline’s score of 0.723. With gpt-4.1-mini, Nemori further improves to 0.794. This demonstrates the
powerful capability of Nemori’s self-organizing memory system. Moreover, the system scales up effectively as the
underlying model capabilities strengthen.
Exceptional Temporal Reasoning. The advantage of our method is especially pronounced in the Temporal Reasoning
category, where Nemori achieves scores of 0.710 and 0.776. This validates the effectiveness of our episode-based
memory structure, which naturally preserves the chronological flow. A key reason for this superiority is Nemori’s
ability to perform “reasoning during memory formation.” For instance, when faced with the question “When did Jon
receive mentorship?”, the Full-Context baseline, confused by the term “yesterday” in the original text, incorrectly
answered with the conversation date (June 16). In contrast, Nemori’s dual memory system retrieved both the relevant
episodic memory and a semantic memory that had already processed the temporal information into a clear fact: “Jon


                                                                                                     7
                                                                                               Nemori – arXiv Preprint


was mentored on June 15, 2023.” By combining episodic context with pre-reasoned semantic facts, Nemori transforms
complex reasoning tasks into simple information retrieval, significantly boosting accuracy.


                                              Method        LLM Score Tokens Search   Total
                                                                               (ms)    (ms)
                                              FullContext        0.723 23,653      – 5,806
                                              LangMem            0.513    125 19,829 22,082
                                              Mem0               0.613 1,027     784 3,539
                                              RAG-4096           0.302 3,430     544 2,884
                                              Zep                0.585 2,247     522 3,255
                                              Nemori             0.744 2,745     787 3,053
               Table 2: Performance and efficiency comparison on LoCoMo dataset with gpt-4o-mini.


Efficiency Advantages. Table 2 highlights Nemori’s efficiency. While delivering superior performance, Nemori uses
only 2,745 tokens on average, an 88% reduction compared to the 23,653 tokens required by the Full Context baseline.
This demonstrates that Nemori not only improves accuracy but does so with remarkable computational efficiency.


4.3   Ablation Study (RQ2)

To answer RQ2, we conducted an ablation study to quantify the contribution of each key component in Nemori. The
results, summarized in Table 3, lead to several key insights:


                                                                     Overall Performance
                                                Method
                                                                LLM Score      F1     BLEU-1
                                                w/o Nemori        0.006      0.005     0.009


                               gpt-4o-mini
                                                Nemori-s          0.518      0.346     0.272
                                                w/o e             0.615      0.434     0.340
                                                w/o s             0.705      0.470     0.370
                                                Nemori            0.744      0.495     0.385
                                                w/o Nemori        0.012      0.016     0.015


                               gpt-4.1-mini
                                                Nemori-s          0.623      0.391     0.322
                                                w/o e             0.696      0.461     0.396
                                                w/o s             0.756      0.501     0.435
                                                Nemori            0.794      0.534     0.456
                   Legend: w/o Nemori = without Nemori framework; w/o e = without episodic retrieval;
                              w/o s = without semantic retrieval; Nemori = full framework
             Table 3: Ablation study on Nemori components. Nemori-s uses direct semantic extraction.


Core Framework Necessity. Removing the entire Nemori framework (w/o Nemori) causes performance to collapse to
near-zero. This confirms the fundamental necessity of a structured memory architecture for performing these tasks.
Validation of the Predict-Calibrate Principle. An important finding comes from comparing Nemori (w/o e) with
Nemori-s. Both configurations rely solely on semantic memory, but differ critically in how that memory is generated.
Nemori (w/o e) uses our proposed Predict-Calibrate Principle to proactively distill knowledge, while Nemori-s relies
on naive, direct extraction from raw conversation logs. The performance gap between them is substantial (e.g., a score
of 0.615 for Nemori (w/o e) vs. 0.518 for nemori-s on gpt-4o-mini). This result provides a direct empirical validation
of our principle, demonstrating that proactively learning from prediction gaps produces a significantly more effective
knowledge base than simple, reactive extraction.
Complementary Roles of Memory Types. Removing either episodic memory (w/o e) or semantic memory (w/o s)
from the full Nemori model leads to performance degradation. The larger drop from removing episodic memory (from
0.744 to 0.615) compared to semantic memory (from 0.744 to 0.705) highlights the complementary and essential roles
of both memory systems in our dual-memory architecture.


                                                                     8
                                                                                                                                                          Nemori – arXiv Preprint


                                                                 GPT-4o-mini                                                     GPT-4.1-mini

                                                                                                             0.82
                                 0.76

                                                                                                             0.80
                                 0.74


                     LLM Score                                                                   LLM Score
                                 0.72                                                                        0.78


                                 0.70                                                                        0.76

                                                                        Nemori Performance                                               Nemori Performance
                                 0.68                      default      Full Context Baseline                0.74           default      Full Context Baseline

                                        2       5            10     15    20               30                       2   5     10     15    20               30
                                                               Top-k Episodes                                                   Top-k Episodes


Figure 4: Impact of top-k episodes on LLM score across different models. Both models show performance rises sharply
until k=10 and then plateaus. The red dashed lines represent Full Context baseline performance for comparison.


4.4   Hyperparameter Analysis (RQ3)

To answer RQ3, we conducted a sensitivity analysis on the number of retrieved episodic memories, k, to understand
its impact on model performance. Throughout this analysis, we maintained the semantic memory retrieval count at
m = 2k to preserve the relative balance between memory types. The results, shown in Figure 4, reveal a clear and
consistent pattern: performance rises sharply as k increases from 2 to 10 (with m correspondingly increasing from 4
to 20), and then largely plateaus, with minimal marginal gains for k > 10. This observation of diminishing returns
is insightful. It demonstrates that the model’s performance is not contingent on retrieving an ever-larger number of
memories, but rather can achieve near-optimal performance within a relatively small, targeted retrieval window.
Model-Dependent Performance Ceiling Analysis. An intriguing observation from Figure 4 is the differential
relationship between Nemori and the Full Context baseline across different model capabilities. With gpt-4o-mini,
Nemori achieves a clear performance advantage over Full Context (0.744 vs 0.723), while with gpt-4.1-mini, Nemori
approaches but does not substantially exceed the baseline (0.794 vs 0.806). This pattern suggests an interesting
interaction between model capacity and memory system effectiveness. For more capable models, the LoCoMo
dataset may represent a relatively straightforward task where raw processing power can effectively utilize extensive
context without sophisticated memory organization. However, as we demonstrate in RQ4 with the more challenging
LongMemEvalS benchmark, both models benefit significantly from Nemori’s structured memory approach when facing
truly complex, long-context scenarios. This finding highlights a crucial design principle: the value of intelligent memory
systems becomes more pronounced as task complexity increases, particularly in resource-constrained environments
where computational efficiency is paramount.


                                                           Question Type                         Full-context      Nemori
                                                                                                (101K tokens) (3.7-4.8K tokens)
                                                           single-session-preference                      6.7%                        46.7%
                                                           single-session-assistant                      89.3%                        83.9%


                                            gpt-4o-mini
                                                           temporal-reasoning                            42.1%                        61.7%
                                                           multi-session                                 38.3%                        51.1%
                                                           knowledge-update                              78.2%                        61.5%
                                                           single-session-user                           78.6%                        88.6%
                                                           Average                                       55.0%                        64.2%
                                 single-session-preference     16.7%            86.7%



                                            gpt-4.1-mini
                                 single-session-assistant      98.2%            92.9%
                                 temporal-reasoning            60.2%            72.2%
                                 multi-session                 51.1%            55.6%
                                 knowledge-update              76.9%            79.5%
                                 single-session-user           85.7%            90.0%
                                 Average                       65.6%            74.6%
             Note: Nemori achieves higher accuracy while using 95-96% less context than Full-context baseline.
            Table 4: Performance comparison on LongMemEvalS dataset across different question types.




                                                                                                 9
                                                                                                Nemori – arXiv Preprint


4.5   Generalization Study (RQ4)

To answer RQ4, we evaluated Nemori on the LongMemEvalS dataset [36]. While structurally similar to LoCoMo in
its conversational nature, LongMemEvalS presents a significantly greater challenge in terms of scale, with an average
context length of 105K tokens. This serves as a crucial stress test for long-term memory retention and generalization.
The results in Table 4 demonstrate Nemori’s strong performance under these demanding conditions. A closer analysis
reveals two key findings. First, Nemori shows superior performance on user preference tasks. This is because its
concise, high-quality structured memory enables the model to focus more effectively on user habits and inclinations,
which are often diluted within the baseline’s extensive context. Second, the baseline’s better performance on single-
session-assistant tasks suggests that Nemori can lose some fine-grained details, a potential limitation to be addressed in
future work.

5     Conclusion
In this work, we introduced Nemori, a cognitively-inspired memory architecture that offers a principled solution to
agent amnesia. By integrating the Two-Step Alignment Principle for coherent experience segmentation and the novel
Predict-Calibrate Principle for proactive knowledge distillation, Nemori reframes memory construction as an active
learning process. Extensive experiments demonstrate its effectiveness: Nemori not only significantly outperforms state-
of-the-art systems on the LoCoMo and LongMemEvals benchmarks but also surpasses the Full Context baseline with
88% fewer tokens, while showing strong generalization in contexts up to 105K tokens. By shifting the paradigm from
passive storage to active knowledge evolution, Nemori provides a foundational component for developing autonomous
agents capable of genuine, human-like learning.

References
 [1] Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N Gomez, Łukasz Kaiser, and
     Illia Polosukhin. Attention is all you need. Advances in neural information processing systems, 30, 2017.
 [2] Nelson F Liu, Kevin Lin, John Hewitt, Ashwin Paranjape, Michele Bevilacqua, Fabio Petroni, and Percy Liang.
     Lost in the middle: How language models use long contexts. arXiv preprint arXiv:2307.03172, 2023.
 [3] Lei Wang, Chen Ma, Xueyang Feng, Zeyu Zhang, Hao Yang, Jingsen Zhang, Zhiyuan Chen, Jiakai Tang, Xu Chen,
     Yankai Lin, et al. A survey on large language model based autonomous agents. Frontiers of Computer Science,
     18(6):186345, 2024.
 [4] Sébastien Bubeck, Varun Chandrasekaran, Ronen Eldan, Johannes Gehrke, Eric Horvitz, Ece Kamar, Peter Lee,
     Yin Tat Lee, Yuanzhi Li, Scott Lundberg, et al. Sparks of artificial general intelligence: Early experiments with
     gpt-4. arXiv preprint arXiv:2303.12712, 2023.
 [5] Joon Sung Park, Joseph O’Brien, Carrie Jun Cai, Meredith Ringel Morris, Percy Liang, and Michael S Bernstein.
     Generative agents: Interactive simulacra of human behavior. In Proceedings of the 36th annual acm symposium
     on user interface software and technology, pages 1–22, 2023.
 [6] Tom Brown, Benjamin Mann, Nick Ryder, Melanie Subbiah, Jared D Kaplan, Prafulla Dhariwal, Arvind Nee-
     lakantan, Pranav Shyam, Girish Sastry, Amanda Askell, et al. Language models are few-shot learners. Advances
     in neural information processing systems, 33:1877–1901, 2020.
 [7] Patrick Lewis, Ethan Perez, Aleksandra Piktus, Fabio Petroni, Vladimir Karpukhin, Naman Goyal, Heinrich
     Küttler, Mike Lewis, Wen-tau Yih, Tim Rocktäschel, et al. Retrieval-augmented generation for knowledge-
     intensive nlp tasks. Advances in neural information processing systems, 33:9459–9474, 2020.
 [8] Zihong He, Weizhe Lin, Hao Zheng, Fan Zhang, Matt W Jones, Laurence Aitchison, Xuhai Xu, Miao Liu, Per Ola
     Kristensson, and Junxiao Shen. Human-inspired perspectives: A survey on ai long-term memory. arXiv preprint
     arXiv:2411.00489, 2024.
 [9] Ziwei Ji, Nayeon Lee, Rita Frieske, Tiezheng Yu, Dan Su, Yan Xu, Etsuko Ishii, Ye Jin Bang, Andrea Madotto,
     and Pascale Fung. Survey of hallucination in natural language generation. ACM computing surveys, 55(12):1–38,
     2023.
[10] Yunfan Gao, Yun Xiong, Xinyu Gao, Kangxiang Jia, Jinliu Pan, Yuxi Bi, Yixin Dai, Jiawei Sun, Haofen Wang,
     and Haofen Wang. Retrieval-augmented generation for large language models: A survey. arXiv preprint
     arXiv:2312.10997, 2(1), 2023.
[11] Samuel J Gershman, Ila Fiete, and Kazuki Irie. Key-value memory in the brain. Neuron, 113(11):1694–1707,
     2025.


                                                           10
                                                                                          Nemori – arXiv Preprint


[12] Zhiyu Li, Shichao Song, Chenyang Xi, Hanyu Wang, Chen Tang, Simin Niu, Ding Chen, Jiawei Yang, Chunyu Li,
     Qingchen Yu, et al. Memos: A memory os for ai system. arXiv preprint arXiv:2507.03724, 2025.
[13] Yuanzhe Hu, Yu Wang, and Julian McAuley. Evaluating memory in llm agents via incremental multi-turn
     interactions. arXiv preprint arXiv:2507.05257, 2025.
[14] Akari Asai, Zeqiu Wu, Yizhong Wang, Avirup Sil, and Hannaneh Hajishirzi. Self-rag: Learning to retrieve,
     generate, and critique through self-reflection. arXiv preprint arXiv:2310.11511, 2023.
[15] Guangxuan Xiao, Yuandong Tian, Beidi Chen, Song Han, and Mike Lewis. Efficient streaming language models
     with attention sinks. arXiv preprint arXiv:2309.17453, 2023.
[16] Darren Edge, Ha Trinh, Newman Cheng, Joshua Bradley, Alex Chao, Apurva Mody, Steven Truitt, Dasha
     Metropolitansky, Robert Osazuwa Ness, and Jonathan Larson. From local to global: A graph rag approach to
     query-focused summarization. arXiv preprint arXiv:2404.16130, 2024.
[17] Jeffrey M Zacks and Barbara Tversky. Event structure in perception and conception. Psychological bulletin,
     127(1):3, 2001.
[18] Endel Tulving et al. Episodic and semantic memory. Organization of memory, 1(381-403):1, 1972.
[19] Karl Friston. The free-energy principle: a unified brain theory? Nature reviews neuroscience, 11(2):127–138,
     2010.
[20] James L McClelland, Bruce L McNaughton, and Randall C O’Reilly. Why there are complementary learning
     systems in the hippocampus and neocortex: insights from the successes and failures of connectionist models of
     learning and memory. Psychological review, 102(3):419, 1995.
[21] Zeyu Zhang, Quanyu Dai, Xiaohe Bo, Chen Ma, Rui Li, Xu Chen, Jieming Zhu, Zhenhua Dong, and Ji-Rong Wen.
     A survey on the memory mechanism of large language model based agents. ACM Transactions on Information
     Systems, 2024.
[22] Hongli Yu, Tinghong Chen, Jiangtao Feng, Jiangjie Chen, Weinan Dai, Qiying Yu, Ya-Qin Zhang, Wei-Ying Ma,
     Jingjing Liu, Mingxuan Wang, et al. Memagent: Reshaping long-context llm with multi-conv rl-based memory
     agent. arXiv preprint arXiv:2507.02259, 2025.
[23] Kai Mei, Xi Zhu, Wujiang Xu, Wenyue Hua, Mingyu Jin, Zelong Li, Shuyuan Xu, Ruosong Ye, Yingqiang Ge,
     and Yongfeng Zhang. Aios: Llm agent operating system. arXiv preprint arXiv:2403.16971, 2024.
[24] Charles Packer, Vivian Fang, Shishir_G Patil, Kevin Lin, Sarah Wooders, and Joseph_E Gonzalez. Memgpt:
     Towards llms as operating systems. 2023.
[25] Kwangseob Ahn. Hema: A hippocampus-inspired extended memory architecture for long-context ai conversations.
     arXiv preprint arXiv:2504.16754, 2025.
[26] Prateek Chhikara, Dev Khant, Saket Aryan, Taranjeet Singh, and Deshraj Yadav. Mem0: Building production-
     ready ai agents with scalable long-term memory. arXiv preprint arXiv:2504.19413, 2025.
[27] Derong Xu, Yi Wen, Pengyue Jia, Yingyi Zhang, Yichao Wang, Huifeng Guo, Ruiming Tang, Xiangyu Zhao,
     Enhong Chen, Tong Xu, et al. Towards multi-granularity memory association and selection for long-term
     conversational agents. arXiv preprint arXiv:2505.19549, 2025.
[28] Wanjun Zhong, Lianghong Guo, Qiqi Gao, He Ye, and Yanlin Wang. Memorybank: Enhancing large language
     models with long-term memory. In Proceedings of the AAAI Conference on Artificial Intelligence, volume 38,
     pages 19724–19731, 2024.
[29] Ryan Yen and Jian Zhao. Memolet: Reifying the reuse of user-ai conversational memories. In Proceedings of the
     37th Annual ACM Symposium on User Interface Software and Technology, pages 1–22, 2024.
[30] Yu Wang and Xi Chen. Mirix: Multi-agent memory system for llm-based agents. arXiv preprint arXiv:2507.07957,
     2025.
[31] Guibin Zhang, Muxin Fu, Guancheng Wan, Miao Yu, Kun Wang, and Shuicheng Yan. G-memory: Tracing
     hierarchical memory for multi-agent systems. arXiv preprint arXiv:2506.07398, 2025.
[32] Akash Vishwakarma, Hojin Lee, Mohith Suresh, Priyam Shankar Sharma, Rahul Vishwakarma, Sparsh Gupta, and
     Yuvraj Anupam Chauhan. Cognitive weave: Synthesizing abstracted knowledge with a spatio-temporal resonance
     graph. arXiv preprint arXiv:2506.08098, 2025.
[33] Zafeirios Fountas, Martin A Benfeghoul, Adnan Oomerjee, Fenia Christopoulou, Gerasimos Lampouras,
     Haitham Bou-Ammar, and Jun Wang. Human-like episodic memory for infinite context llms. arXiv preprint
     arXiv:2407.09450, 2024.


                                                       11
                                                                                        Nemori – arXiv Preprint


[34] Haoyu Gao, Rui Wang, Ting-En Lin, Yuchuan Wu, Min Yang, Fei Huang, and Yongbin Li. Unsupervised dialogue
     topic segmentation with topic-aware contrastive learning. In Proceedings of the 46th International ACM SIGIR
     Conference on Research and Development in Information Retrieval, SIGIR ’23, page 2481–2485, New York, NY,
     USA, 2023. Association for Computing Machinery.
[35] Adyasha Maharana, Dong-Ho Lee, Sergey Tulyakov, Mohit Bansal, Francesco Barbieri, and Yuwei Fang. Evaluat-
     ing very long-term conversational memory of LLM agents. In Lun-Wei Ku, Andre Martins, and Vivek Srikumar,
     editors, Proceedings of the 62nd Annual Meeting of the Association for Computational Linguistics (Volume 1:
     Long Papers), pages 13851–13870, Bangkok, Thailand, August 2024. Association for Computational Linguistics.
[36] Di Wu, Hongwei Wang, Wenhao Yu, Yuwei Zhang, Kai-Wei Chang, and Dong Yu. Longmemeval: Benchmarking
     chat assistants on long-term interactive memory. In The Thirteenth International Conference on Learning
     Representations, 2025.
[37] Harrison Chase. Langchain. https://github.com/langchain-ai/langchain, 2022. Accessed: 2025-07-20.
[38] Preston Rasmussen, Pavlo Paliychuk, Travis Beauvais, Jack Ryan, and Daniel Chalef. Zep: a temporal knowledge
     graph architecture for agent memory. arXiv preprint arXiv:2501.13956, 2025.




                                                       12
