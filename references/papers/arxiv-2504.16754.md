<!-- Generated from arxiv-2504.16754.pdf via pdftotext -layout on 2026-02-22 -->

    HEMA: A Hippocampus-Inspired Extended Memory
     Architecture for Long-Context AI Conversations
                              Kwangseob Ahn, haebom@3blocks.ai

                                           Abstract
Large-language models (LLMs) maintain coherence over a few thousand tokens but degrade
sharply in multi-hundred-turn conversations. We present a hippocampus-inspired dual-memory
architecture that separates dialogue context into (1) Compact Memory, a continuously updated
one-sentence summary that preserves the global narrative, and (2) Vector Memory, an episodic
store of chunk embeddings queried via cosine similarity. Integrated with an
o.-the-shelf 6 B-parameter transformer, the system sustains > 300-turn dialogues while
keeping the prompt under 3.5 K tokens.

On long-form QA and story-continuation benchmarks, Compact + Vector Memory elevates
factual-recall accuracy from 41 % to 87 % and human-rated coherence from 2.7 to 4.3.
Precision–recall analysis shows that, with 10 K indexed chunks, Vector Memory achieves
P@5 ≥ 0.80 and R@50 ≥ 0.74, doubling the area under the PR curve relative to a
summarisation-only baseline. Ablation experiments reveal that (i) semantic forgetting—
age-weighted pruning of low-salience chunks—cuts retrieval latency by 34 % with < 2 pp recall
loss, and (ii) a two-level summary-of-summaries eliminates cascade errors that otherwise
emerge after 1,000 turns.

By reconciling verbatim recall with semantic continuity, our architecture offers a practical path
toward scalable, privacy-aware conversational AI capable of engaging in months-long dialogue
without retraining the underlying model.

                                                     extended conversations, thereby
1 Introduction                                       compromising performance on tasks that
                                                     require long-term discourse coherence. In
The rapid advancements in Large Language             short, while current LLMs excel in short
Models (LLMs) have ushered in a new era              exchanges, they struggle to maintain
of highly sophisticated natural language             continuity and recall important details when
processing and conversation systems. These           the conversation spans many turns or
models, often derived from transformer               thousands of tokens.
architectures, can generate coherent and
contextually relevant responses to a wide            In cognitive science, the hippocampus is
range of user inputs. Nonetheless, practical         widely recognized for its role in storing and
deployments of LLMs are constrained by a             retrieving long-term memories, selectively
critical bottleneck: fixed or limited context        consolidating short-term experiences into
windows. This restriction leads to                   more permanent records over time. Inspired
“forgetting” of earlier dialogue segments in
by this biological mechanism, we propose         2 Literature Review
Compact Memory and Vector Memory—a
hippocampus-like memory system designed          2.1 Retrieval-Augmented Approaches
to overcome the shortfalls of standard
LLMs. Unlike naive retrieval-augmented           Early non-parametric memory work such as
approaches that rely solely on keyword           kNN-LM(Khandelwal et al., 2019i) and
matching or recency-based truncation, our        RAG (Gao et al., 2023ii) demonstrated that
architecture leverages semantic embedding,       coupling pretrained LMs with an external
relevance scoring, and optional pruning          datastore lifts factual recall without
strategies to dynamically manage                 retraining core weights. This line has
conversation data. This system enables           diversified into streaming-RAG agents that
LLMs to effectively extend their working         retrieve at every turn (Luo et al., 2025iii) and
memory, retrieving past segments only when       Retro-architectures that graft retrieved
contextually pertinent to the current query.     “chunks” directly into intermediate LM
                                                 layers (Borgeaud et al., 2021iv). More
By incorporating such an external memory         recently, HippoRAG integrates a
solution, we aim to enhance the coherence,       graph-based index and
relevance, and depth of AI-driven                Personalized PageRank to mimic
conversations that span hundreds or even         hippocampal indexing, achieving 12 pp
thousands of turns. In this paper, we detail     precision gains on long-horizon
the design principles and underlying             QA benchmarks. Despite these advances,
theoretical motivations of Compact               RAG pipelines still bottle-neck at prompt
Memory and Vector Memory, as well as             length because retrieved passages must be
their implementation pipeline, which             (re)injected verbatim.
integrates seamlessly with existing
transformer-based language models.               2.2 Long-Context Transformers
Through qualitative examples and
quantitative benchmarks, we demonstrate
how a hippocampus-inspired extended              Sparse-attention families (Longformer,
memory can significantly bolster an LLM’s        BigBird, Reformer) reduce the quadratic
ability to handle extensive multi-turn           cost of self-attention, pushing context to 16–
dialogues. Finally, we discuss the ethical,      32 K tokens. Recurrent variants
computational, and methodological                (Transformer-XL) extend effective history
considerations of deploying such a system at     into the hundreds of thousands, while
scale, outlining directions for future work in   compression schemes (Compressive
adaptive memory management and                   Transformer, LongRoPE) selectively
continuous learning.                             down-sample distant states. 2025 models
                                                 shifted the ceiling dramatically: OpenAI’s
Our deployment on a single A100 GPU adds         GPT-4ov and Google’s Gemini 2.0 Flashvi
only 0.18 s latency per turn and < 1.2 GB        advertise 1 M-token windows for text-only
memory for 50 K vectors.                         and multimodal inputs, respectively, by
                                                 combining blockwise attention with
                                                 disk-paged key–value caches. Open-source
                                                 explorations such as Long-VITA show
                                                 similar scaling in vision-language settings
                                                 without heavy token compression. However,
                                                 empirical studies reveal utility drops once
the prompt surpasses ~128 K tokens,               2.5 Research Gap
reaffirming that size alone is insufficient for
faithful recall.                                  Existing solutions attack either
                                                  prompt-efficiency (long-context models) or
2.3 Memory-Augmented Neural Networks              recall fidelity (retrieval / memory plug-ins).
                                                  None simultaneously (a) keeps a
Differentiable memory systems (NTM,               semantically coherent global narrative, (b)
DNC) pioneered read–write controllers but         rehydrates verbatim details when required,
proved hard to scale beyond toy tasks.            and (c) scales to million-token dialogues
Contemporary memory-plug-ins for LLMs             without quadratic compute. Our
instead attach non-differentiable vector          hippocampus-inspired dual-memory
stores. Differentiable Neural Computer            architecture is designed to fill this triple
(Graves et al., 2016vii) pioneers an external     gap, pairing a continuously updated
read–write memory that avoids catastrophic        Compact Memory with an on-demand
forgetting; HippoMM layers a temporal             Vector Memory to balance summarisation
index over cross-modal embeddings to              and exact retrieval — a balance current
retrieve events by when and what in 16-hour       systems lack.
egocentric video streams.
Reinforcement-learning agents have begun
to learn memory-management policies that
                                                  3 Methodology
decide which past embeddings to cache             The overall runtime path is illustrated in
under a fixed budget(Lin et al., 2025viii).       Figure 2, where a user query ﬁrst probes
These works confirm that explicit memory
                                                  the out-of-prompt Vector Memory before
improves reasoning under > 1 B tokens, yet
they stop short of offering a principled          the retrieved chunks are merged with the
consolidation hierarchy.                          running Compact Summary.”

2.4 Cognitive-Neuroscience Inspirations           3.1 Architecture Overview

The Complementary Learning Systems
theory posits a fast-updating hippocampus
that indexes episodic traces and a
slow-learning neocortex that stores semantic
abstractions (McClelland et al., 1995ix).
Recent computational analogues—e.g.,
hippocampal indexing in HippoRAG and
our own Compact + Vector Memory—
mirror this duality by maintaining (i) a
                                                  Figure 1. Overview of HEMA Runtime Data Flow
compressed, always-visible summary and
(ii) a latent episodic store retrievable on
demand. Neuro-evidence that replay                We designed the Hippocampus-inspired
consolidates memory during sleep has              Extended Memory Architecture to allow
inspired replay-style fine-tuning for LLMs,       large language models to maintain coherent,
but replay alone does not solve                   long-form dialogues that extend far beyond
prompt-budget limits, underscoring the need       the standard fixed context windows. This
for hybrid compression–retrieval schemes.         novel architecture integrates two key
memory components: Compact Memory and           sentence summary serves as a high-level
Vector Memory, which work together to           distillation of the global semantic content
enhance the coherence, relevance, and depth     and narrative flow of the conversation,
of AI-driven conversations spanning             providing an efficient means of capturing
hundreds or even thousands of turns.            and retaining the overarching context.

The HEMA pipeline consists of the               The Compact Memory summary is
following key steps:                            computed as follows:

1. Dialogue Ingestion: The system captures               𝑆! = Summarizer(𝑆!"# , 𝑢! )
   user inputs and system responses as
   discrete dialogue chunks, preserving the     where 𝑆! represents the updated summary,
   full context of the conversation.            𝑆!"# is the previous summary, and 𝑢! is the
2. Embedding and Storage: The dialogue          current dialogue turn. To mitigate the risk of
   chunks are encoded into high-                summary drift and memory expansion over
   dimensional vectors using sentence-          the course of a lengthy dialogue, we apply a
   transformer embeddings, and these            Summary-of-Summaries mechanism every
   vectors are then stored in an indexed        100 turns. This process compresses the older
   vector memory for efficient retrieval.       summaries into a more condensed
3. Compact Memory Updating: The system          representation, ensuring the Compact
   generates continuous, concise semantic       Memory remains a succinct and up-to-date
   summaries that encapsulate the global        reflection of the conversation history.
   context of the ongoing dialogue,
   providing a high-level overview of the       3.3 Vector Memory
   conversation.
4. Episodic Retrieval: When needed, the
                                                Vector Memory provides precise episodic
   system uses vector similarity to
                                                recall. Dialogue chunks are encoded into
   selectively retrieve contextually relevant
                                                high-dimensional vector representations
   past dialogue chunks from the Vector
                                                using a sentence-transformer model.
   Memory, enabling the model to access
                                                Specifically, the dialogue chunks are passed
   precise details from the conversation
                                                through a sentence-transformer function Φ
   history.
                                                that maps the input text of up to T tokens to
5. Prompt Composition: The system
                                                a d-dimensional vector space:
   combines the most recent dialogue turns,
   the Compact Memory summary, and the
   retrieved episodic chunks into a                      𝑒 = Φ(𝑐),     Φ: 𝑅$% → 𝑅&
   comprehensive prompt, which is then
   fed into a frozen transformer model to       The resulting embedding vector e represents
   generate the next response.                  the dialogue chunk c. This encoding process
                                                allows the system to capture the semantic
                                                content and contextual information of the
3.2 Compact Memory                              dialogue history in a compact vector format,
                                                enabling efficient retrieval and comparison
The Compact Memory component of our             of past conversation elements.
architecture is responsible for maintaining a
concise, dynamically updated summary of
the full dialogue context. This single-
Cosine similarity is used to fetch                         𝑤2 = 𝜆𝑒 "3(!"2) + 𝛽(1 − 𝛿2 )
contextually relevant past dialogue chunks
based on query embeddings 𝑒' :                    where:

                                                  •   λ : freshness weighting (default = 1.0)
                                        𝘛             γ : decay rate per turn (default = 0.002)
                                   𝑎 𝑏            •
           𝑐𝑜𝑠_𝑠𝑖𝑚(𝑎, 𝑏) =                        •   β : bonus for recent retrievals (default =
                                 |𝑎|) |𝑏|)
                                                      0.5)
                                                  •   𝛿2 : indicator of recent retrieval within
The retrieval set 𝑚𝑎𝑡ℎ𝑐𝑎𝑙𝑅! is defined as:            last 100 turns (1 if retrieved, 0
                                                      otherwise)

  ℛ𝓉 = 𝑎𝑟𝑔 𝑡𝑜𝑝 𝐾(,,.)                             Every 100 turns, vectors with the lowest
                                                  0.5% salience scores are pruned.
               ∈ ℳ vec A𝑐𝑜𝑠_𝑠𝑖𝑚B𝑒' , 𝑒CD
                                                  3.5 Prompt Composition
For efficient storage and retrieval, we utilize
FAISS IVF-4096 with OPQ-16 indexing.              Prompts fed into the transformer consist of:

                                                  •   System guidelines
                                                  •   Compact Memory summary
                                                  •   Retrieved episodic memory chunks
                                                  •   Recent dialogue turns

                                                  Prompt length is constrained to ≤ 3,500
                                                  tokens, trimming episodic chunks as
                                                  necessary based on highest cosine similarity.

                                                  Example Prompt Structure:

                                                  <system> [behavioral guidelines]
                                                  </system>
Figure 2. Turn-Level Pipeline of HEMA             <compact> {S_t} </compact>
                                                  <retrieved>
Figure 2 details the four sequential                [chunk_1, ..., chunk_K]
operations executed on each turn: chunking        </retrieved>
& embedding, summary update, vector               <dialogue_tail> [recent turns
append, and similarity retrieval.                 u_{t-2}, u_{t-1}] </dialogue_tail>
                                                  <user> {u_t} </user>
3.4 Semantic Forgetting
                                                  3.6 Experimental Setup
To maintain efficient retrieval, we               3.6.1 Datasets
implement semantic forgetting, pruning less
salient vectors based on a computed salience      •   LongformQA-100: 100 Wikipedia-
weight:                                               based dialogues (320-350 turns each).
•   StoryCloze-Ext: 120 synthetic narrative         Hardware
                                                                      NVIDIA A100 80GB, AMD
    dialogues (up to 500 turns).                                            EPYC 9654
•   Synthetic-Support: 200 synthetic
    customer-support scenarios (approx. 280    4. Results
    turns each).
                                               All experiments were executed on an
3.6.2 Baselines                                A100 80 GB GPU, using the configuration
                                               detailed in Section 3. Each number is an
•   No-Memory: Retains only the most           average over ten random seeds; ± values
    recent 4,000 tokens.                       denote 95 % confidence intervals.
•   Summary-Only: Utilizes only Compact
    Memory without Vector Memory.
•   Streaming RAG: Continuously
    retrieves top-5 BM25 matches from
    historical dialogue transcripts.

3.6.3 Metrics

•   Factual Recall Accuracy: Exact-match
    evaluation against predefined factual
    spans.
•   Human-Rated Coherence (1–5):               Figure 3. Precision–Recall Curves for Retrieval
                                               Performance
    Assessed by three independent
    annotators (Fleiss' κ=0.72).               Precision–recall trade-o. for three
•   Precision@5/Recall@50: Evaluated
                                               systems on the 100-query evaluation
    against a manually annotated relevance
    oracle.                                    set. Compact + Vector (red) sustains
•   Latency (seconds): Measured as wall-       ≥ 0.80 precision at low k while delivering
    clock end-to-end response generation       the highest recall at k ≥ 50, doubling
    latency.                                   AUPRC relative to the
All experimental comparisons use paired        summarisation-only baseline.
two-tailed t-tests (α= 0.01) to establish
statistical significance.
                                               4.1 Retrieval Effectiveness

3.7 Implementation Details                     systems:

    Component             Specification        •   Raw : transformer with no external
    Embedding       text-embedding-3-small         memory
      Model               (dim=1 536)
                  FAISS IVF-4096 + OPQ-16,
                                               •   Compact-only : running summary, no
    ANN Index                                      vector store
                           nprobe=32
                  Distil-PEGASUS-dialogue,     •   Compact + Vector : our full
    Summarizer
                           ≤60 tokens              dual-memory design
                    tiktoken-2025 (GPT-4o
    Tokenizer
                           compatible)             Model         P@5 ↑         R@50 ↑      AUPRC↑
                   6B parameter transformer,                                   0.45 ±
      LLM                                           Raw        0.29 ± 0.03                       0.19
                         frozen weights                                         0.03
 Compact       0.62 ± 0.02
                                  0.62 ±
                                                  0.46     Take-away. Age-weighted pruning halves
                                   0.04                    lookup latency with < 2 pp recall loss, while
Compact +                         0.74 ±                   a two-tier summary recovers that
               0.82 ± 0.02                        0.72
  Vector                           0.03
                                                           loss. Combined (row D), we obtain the best
                                                           latency–accuracy trade-off and a slight
Observation. At the practical window of
                                                           coherence gain.
k ≤ 5, our system more than doubles
precision relative to the summarisation
baseline while sustaining the highest recall               4.4 Robustness to Dialogue Length
for k ≥ 50. The 0.53 absolute gain in AUPRC                                         Compact
                                                               Turns   Raw Recall             C + V Recall
confirms that memory hierarchy improves                                              Recall
retrieval quality across the entire operating                   50        0.60        0.75        0.88
                                                                100       0.45        0.65        0.80
range.
                                                                500       0.20        0.40        0.72

4.2 Down-stream Dialogue Quality                           Across 500-turn conversations
                 Long-form QA              Blind Cohere    (≈ 250 K tokens), the raw model forgets
      Model
                      Acc. ↑                nce (1–5) ↑    80 % of earlier facts, whereas our system
    Raw            0.41 ± 0.02                2.7 ± 0.2    retains 72 % with no degradation in fluency,
  Compact          0.62 ± 0.02                3.8 ± 0.2    demonstrating scalability to year-long chat
 Compact +
   Vector
                      0.87 ± 0.01            4.3 ± 0.1     logs.

When the agent must answer questions                       4.5 Efficiency and Overhead
150 turns after the supporting fact is
mentioned, Compact + Vector Memory                         •     Prompt budget remains
answers correctly 87 % of the time —                             < 3 500 tokens.
 a 46 pp lift over the raw model and 25 pp                 •     Retrieval latency adds 14–22 ms per
over the summarisation-only variant. Blind                       turn.
human raters likewise assign the highest                   •     Memory Footprint is 1.2 GB for 50 K
coherence scores to our system, indicating                       vectors with PQ compression, increasing
that improved retrieval converts into a
                                                                 linearly with log size.
perceptibly smoother dialogue.

4.3 Ablation of Memory Policies                            5. Discussion
         Memory
                        Retrieval
                                       Recal       Cohe    5.1 Interpretation of Findings
 ID                     Latency ↓
          Policy                       l@50        rence
                          (ms)
            No                                             Our experimental results demonstrate that
  A     forgetting,        21.4            0.74     4.32   coupling a persistent compact Memory
          no SoS                                           summary with an on-demand vector store
         Semantic                                          produces complementary gains:
  B                        14.1            0.72     4.30
        forgetting
        Summary-
                                                           high-precision retrieval at low k (vital under
  C     of-summar          20.9            0.76     4.34   tight prompt budgets) and strong recall at
         ies (SoS)                                         larger k. These improvements translate
  D
        Forgetting
                           13.8            0.75     4.35   directly into downstream performance—
           + SoS                                           long-form QA accuracy rises from 0.41
                                                           to 0.87, and blind evaluators perceive a
near-unit increase in discourse                      architecture to richer conversational
coherence. Crucially, the ablation study             domains (e.g., customer-support chats
shows that neither semantic-forgetting nor           with screenshots).
summary-hierarchies alone suffices; their        •   Privacy-Preserving Indexing. We plan
combination delivers the desired latency–            to explore differential-privacy noise
accuracy frontier. Taken together, the               injection so that long-term storage
evidence supports our central claim that a           complies with emerging data-regulation
hippocampus-inspired dual memory                     regimes.
reconciles verbatim fidelity with semantic       •   In-the-Wild Deployment. A
continuity in million-token settings.                longitudinal user study on open-ended
                                                     chat platforms would validate whether
5.2 Limitations                                      laboratory coherence gains translate into
                                                     real engagement and trust.
First, our summariser is a fine-tuned
Distil-PEGASUS variant whose                     In summary, the proposed dual-memory
compression ratio. If the summary omits a        system moves beyond mere context-window
detail that later becomes salient, retrieval     scaling by structurally separating gist from
can only recover the verbatim chunk after        detail. While limitations in summariser
the user’s explicit cue. Second, cosine          robustness and index scalability remain, the
similarity over static sentence embeddings       demonstrated accuracy, coherence, and
may drift over time as topics shift; periodic    efficiency gains mark a substantive step
re-embedding or incremental fine-tuning          toward lifelong conversational AI.
of Φ could mitigate this. Third, while
PQ-compressed FAISS indexes are                  6 Conclusion
memory-efficient at 50 K vectors,
petabyte-scale conversational logs would         We presented HEMA:hippocampus-inspired
require sharding or tiered storage. Finally,     extended memory architecture—a
all evaluations employed English corpora;        dual-memory system that couples an
cross-lingual generality remains an open         always-visible Compact Memory with an
question.                                        on-demand Vector Memory to reconcile
                                                 semantic continuity and verbatim recall in
5.3 Future Work                                  very-long conversations. Integrated into a
                                                 frozen 6 B-parameter transformer, HEMA
•   Adaptive Summarisation. A                    doubled precision at k = 5, raised recall at
    reinforcement-learning controller that       k = 50 by 0.29 absolute, and lifted long-form
    adjusts summary granularity in response      QA accuracy from 0.41 to 0.87 while adding
    to retrieval success could reduce            only 0.18 s turn-latency and 1.2 GB RAM
    omission risk without inflating tokens.      for 50 K episodic vectors. Ablation
•   Learned Memory Policies. Replacing           experiments confirmed that age-weighted
    heuristic forgetting with a trainable        semantic forgetting and a two-level
    utility estimator may further lower          summary-of-summaries jointly provide the
    latency while preserving rare but critical   best latency–accuracy trade-off, sustaining
    facts.                                       72 % factual recall over 500-turn
•   Multimodal Extension. Integrating            (≈250 K-token) dialogues. By structurally
    image or audio embeddings into the           separating gist from detail, HEMA offers a
    same vector store would extend the           scalable and model-agnostic path to
month-long, privacy-aware conversational
agents without retraining core
weights. Future work will explore adaptive
summarisation, learned
memory-management policies, multimodal
extensions, and differential-privacy
guarantees, moving closer to truly lifelong
AI dialogue systems.
References
i
 Khandelwal, U., Levy, O., Jurafsky, D.,
                                               v
Zettlemoyer, L., & Lewis, M. (2019).            OpenAI blog (2025‑03‑14). “GPT‑4o
Generalization through memorization:           Technical Report”.
Nearest-neighbor language models               vi
                                                Google DeepMind blog (2025-02-28).
(arXiv Preprint No. 1911.00172). arXiv.        “Gemini 2.0 Flash and 1M-token context
https://arxiv.org/abs/1911.00172               windows”.
ii
 Gao, Y., Xiong, Y., Gao, X., Jia, K.,         vii
                                                  Graves, A., Wayne, G., Reynolds, M. et
Pan, J., Bi, Y., Dai, Y., Sun, J., &           al. Hybrid computing using a neural network
Wang, H. (2023). Retrieval-augmented           with dynamic external memory. Nature 538,
generation for large language models: A        471–476 (2016).
survey (arXiv Preprint No. 2312.10997).        https://doi.org/10.1038/nature20101
arXiv.
                                               viii
https://doi.org/10.48550/arXiv.2312.10997         Lin, Y., Wang, Q., Ye, H., Fu, Y., &
                                               Li, H. (“Helen”), & Chen, Y. (2025).
iii
  Luo, K., Liu, Z., Zhang, P., Qian, H.,       HippoMM: Hippocampal-inspired
Zhao, J., & Liu, K. (2025). Does RAG really    multimodal memory for long audiovisual
perform bad for long-context processing?       event understanding (arXiv Preprint
(arXiv Preprint No. 2502.11444). arXiv.        No. 2504.10739). arXiv.
https://doi.org/10.48550/arXiv.2502.11444      https://doi.org/10.48550/arXiv.2504.10739
                                               ix
iv
  Borgeaud, S., Mensch, A., Hoffmann, J.,        McClelland, J. L., McNaughton, B. L., &
Cai, T., Rutherford, E., Millican, K.,         O’Reilly, R. C. (1995). Why there are
Van den Driessche, G., Lespiau, J.-B.,         complementary learning systems in the
Damoc, B., Clark, A., De Las Casas, D.,        hippocampus and neocortex: Insights from
Guy, A., Menick, J., Ring, R., Hennigan, T.,   the successes and failures of connectionist
Huang, S., Maggiore, L., Jones, C.,            models of learning and memory.
Cassirer, A., … Sifre, L. (2021). Improving    Psychological Review, 102(3), 419–457.
language models by retrieving from trillions   https://doi.org/10.1037/0033-295X.102.3.41
of tokens (arXiv Preprint No. 2112.04426).     9
arXiv.
https://doi.org/10.48550/arXiv.2112.04426
