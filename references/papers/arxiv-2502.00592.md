<!-- Generated from arxiv-2502.00592.pdf via pdftotext -layout on 2026-02-22 -->

                                                    M+: Extending MemoryLLM with Scalable Long-Term Memory


                                                 Yu Wang 1 Dmitry Krotov 2 3 Yuanzhe Hu 1 Yifan Gao 4 Wangchunshu Zhou 5 Julian McAuley 1
                                                                      Dan Gutfreund 2 3 Rogerio Feris 2 3 Zexue He 1 2 3


                                                                 Abstract                                   abling direct retrieval and manipulation of information at the
                                             Equipping large language models (LLMs) with                    token level; and (2) Latent-space memory, where memory
                                             latent-space memory has attracted increasing at-               is stored as high-dimensional vectors in the hidden space,




arXiv:2502.00592v2 [cs.CL] 30 May 2025
                                             tention as they can extend the context window                  offering a more abstract and compact representation of in-
                                             of existing language models. However, retain-                  formation. Token-level memory provides adaptability (the
                                             ing information from the distant past remains a                base model can be easily replaced) and interpretability (text-
                                             challenge. For example, MemoryLLM (Wang                        based format is easy to understand for humans). However,
                                             et al., 2024a), as a representative work with latent-          such text-based memory could be redundant as text format
                                             space memory, compresses past information into                 may not be the most compressed method for representing
                                             hidden states across all layers, forming a mem-                information (Bellard, 2021; Belcak & Wattenhofer, 2024;
                                             ory pool of 1B parameters. While effective for                 Rahman et al., 2024), and resolving conflicting informa-
                                             sequence lengths up to 16k tokens, it struggles                tion in text-based memory can be challenging (Pham et al.,
                                             to retain knowledge beyond 20k tokens. In this                 2024). Meanwhile, as noted by Fedorenko et al. (2024);
                                             work, we address this limitation by introducing                Hao et al. (2024), human reasoning often transcends the
                                             M+, a memory-augmented model based on Mem-                     token level, leveraging deeper, integrated representations
                                             oryLLM that significantly enhances long-term in-               akin to latent spaces.
                                             formation retention. M+ integrates a long-term                 In contrast, Latent-Space Memory offers unique advantages:
                                             memory mechanism with a co-trained retriever,                  (1) Efficient Compression: Information is compressed into
                                             dynamically retrieving relevant information dur-               hidden states (Wang et al., 2024a), internalized into model
                                             ing text generation. We evaluate M+ on diverse                 parameters (Wang et al., 2024c), or stored in a more com-
                                             benchmarks, including long-context understand-                 pact latent space (Das et al., 2024). These methods reduce
                                             ing and knowledge retention tasks. Experimental                storage overhead, with some approaches even embedding
                                             results show that M+ significantly outperforms                 knowledge directly into model parameters, eliminating the
                                             MemoryLLM and recent strong baselines, extend-                 need for external storage (Wang et al., 2024c). (2) End-
                                             ing knowledge retention from under 20k to over                 to-End Training: Latent-space memory can be involved
                                             160k tokens with similar GPU memory overhead.                  in gradient-based optimization, allowing it to be updated
                                             We open-source our code at https://github.                     and refined during training. This enables the integration
                                             com/wangyu-ustc/MemoryLLM.                                     of memory into the training loop (Yin et al., 2024; Wang
                                                                                                            et al., 2023; Ge et al., 2024). (3) Similarity to Human
                                         1. Introduction                                                    Memory: As suggested by Fedorenko et al. (2024) and Hao
                                                                                                            et al. (2024), human reasoning relies on integrated repre-
                                         The integration of memory modules into large language              sentations beyond discrete tokens, akin to latent spaces. By
                                         models (LLMs) has gained increasing attention (Wang et al.,        encoding knowledge in latent representations, the methods
                                         2024b). Existing approaches for constructing memory mod-           with latent-space memory can more closely mimic the mech-
                                         ules can be broadly divided into two main categories: (1)          anisms of human memory, which store information within
                                         Token-level memory (Packer et al., 2023; Modarressi et al.,        neural activations.
                                         2024), where memory is represented as structured text, en-
                                                                                                            In this paper, we focus on Latent-Space Memory. Memo-
                                            Work done during the internship at MIT-IBM Waston Lab.          ryLLM (Wang et al., 2024a), as a representative work in this
                                         1
                                           UC, San Diego 2 MIT-IBM Waston Lab 3 IBM Research 4 Amazon       category, enhances a transformer-based language model by
                                         5
                                           OPPO. Correspondence to: Yu Wang <yuw164@ucsd.edu>,              incorporating a large number of memory tokens into each
                                         Zexue He <Zexue.He@ibm.com>.
                                                                                                            layer, creating a memory pool with 1 billion parameters.
                                         Proceedings of the 42 nd International Conference on Machine       This framework introduces a carefully designed update and
                                         Learning, Vancouver, Canada. PMLR 267, 2025. Copyright 2025        generate process, achieving superior performance compared
                                         by the author(s).

                                                                                                        1
                               M+: Extending MemoryLLM with Scalable Long-Term Memory

to the backbone model Llama-2-7B and other long-context               poses treating context and memory as analogous to tradi-
methods. However, MemoryLLM faces limitations in recall-              tional memory in operating systems, enabling more flexible
ing information injected beyond 20k tokens, restricting its           and organized memory structures. These approaches typi-
long-term retention capabilities. To address this limitation,         cally rely on text embeddings for memory retrieval, where
we propose M+, a novel model incorporating a long-term                queries can originate from either the current conversation
memory mechanism alongside MemoryLLM. Unlike pre-                     turn (Zhong et al., 2023; Zhou et al., 2023) or queries gener-
vious approaches such as H2O (Zhang et al., 2023) and                 ated by the language model itself (Packer et al., 2023). In
SnapKV (Li et al., 2024), which store keys and values from            contrast, ChatDB (Hu et al., 2023) stores knowledge in a
past contexts and perform retrieval separately for each query         database and performs retrieval using SQL queries, while
head and layer—leading to high latency—M+ optimizes                   MemLLM(Modarressi et al., 2024) fine-tunes the model to
retrieval in the space of hidden states via co-training the re-       generate function calls that initiate searches within a knowl-
triever and the language model. This allows M+ to retrieve            edge graph, referred to as “Triple Memory” by Modarressi
only once per layer for all query heads, significantly improv-        et al. (2024). These methods generally offer benefits such
ing efficiency. Furthermore, as the long-term memory is               as modularity (with the exception of MemLLM, which re-
stored on the CPU, M+ significantly extends long-term re-             quires fine-tuning) and interpretability (Yin et al., 2024),
tention capabilities without increasing GPU memory usage.             allowing for potential integration with external systems (Wu
                                                                      et al., 2022a). However, these approaches have limitations.
We evaluate M+ across a diverse set of benchmarks, in-
                                                                      Some require storing the raw text, which is not the most
cluding tasks such as long-book understanding, knowledge
                                                                      compressed method to store information (Rahman et al.,
retention, and question answering on relatively short docu-
                                                                      2024; Bellard, 2021; Belcak & Wattenhofer, 2024). Oth-
ments. Experimental results demonstrate that M+ achieves
                                                                      ers store knowledge in the form of triplets, which may be
significant performance improvements in all long bench-
                                                                      unsuitable for representing complex conversations that are
marks compared to previous memory-based methods while
                                                                      difficult to convert into triplets (Wang et al., 2024d).
operating within the same or even smaller inference memory
budget. In summary, our contributions are as follows:                 2.2. Latent-Space Memory

   • We enhance MemoryLLM by incorporating a long-                    Latent-space memory stores information in a compressed
     term memory mechanism and introducing a co-trained               format, embedding knowledge into soft prompts (Rako-
     retriever for efficient and effective memory retrieval.          tonirina & Baroni, 2024), hidden states (Khandelwal et al.,
                                                                      2019; Bulatov et al., 2022; 2023; Wang et al., 2024a),
   • We design a specialized data curriculum for long-
                                                                      model parameters (Wang et al., 2024c), or an external latent
     context training, enhancing the long-context modeling
                                                                      space (Das et al., 2024), among other methods. Some ap-
     ability of M+.
                                                                      proaches use memory slots to encode information (Al Adel
   • Through extensive experiments on multiple bench-                 & Burtsev, 2021), while others rely on key-value caches
     marks, we demonstrate that M+ significantly outper-              stored in memory pools for future retrieval (Wu et al., 2022b;
     forms the baselines while maintaining a similar or re-           Wang et al., 2023; He et al., 2024; Park & Bak, 2024).
     duced GPU memory footprint.                                      Notably, CamelLoT (He et al., 2024) and Memoria (Park
                                                                      & Bak, 2024) incorporate forgetting mechanisms to better
2. Related Work                                                       emulate human memory. Similarly, MemoryLLM (Wang
We classify memory-based methods into two categories:                 et al., 2024a) compresses knowledge into hidden states and
Token-Level Memory and Latent-Space Memory, which is                  employs random dropping to prevent unbounded memory
similar to the categorizations in Yin et al. (2024) where they        growth. The M3 method (Yang et al., 2024) also stores
classify methods into implicit memory and explicit memory.            memory in the hidden-state space, archiving a vast pre-
                                                                      training dataset comprising 1.1 × 108 text chunks. Dis-
2.1. Token-level Memory
                                                                      tinct from methods that utilize hidden states or key-value
Token-level memory refers to memory structures repre-                 caches, Larimar (Das et al., 2024) introduces a memory
sented in textual forms, which can include raw context,               matrix that supports read and write operations, demonstrat-
summaries (Zhong et al., 2023; Zhou et al., 2023), knowl-             ing effectiveness in knowledge-editing tasks. Furthermore,
edge graphs (Packer et al., 2023; Gutiérrez et al., 2024),           SELF-PARAM (Wang et al., 2024c) explores embedding
organized text with hierarchical or graph structures (Packer          knowledge directly into model parameters without degrad-
et al., 2023; Chen et al., 2024), or databases (Hu et al.,            ing the model’s capabilities or requiring additional param-
2023). Methods such as MemoryBank (Zhong et al., 2023),               eters. These latent-space memory techniques have shown
RecurrentGPT (Zhou et al., 2023) incorporate multiple                 promising results across various downstream tasks. By
components of memory, including both raw conversational               saving information in a compressed format and leveraging
data and summaries. MemGPT (Packer et al., 2023) pro-                 retrieval during generation, they enable substantial expan-

                                                                  2
                                 M+: Extending MemoryLLM with Scalable Long-Term Memory




Figure 1. The left side shows the Update and Generation Process of MemoryLLM (Wang et al., 2024a). We process the chunk with ϕl
to obtain new K tokens during the update process, which is perceived by ϕ using cross-attention during the generation process. The
right side shows the Update and Generation Process of M+. For layer l, during Update, the old memory pool θl is split into two parts: K
dropped tokens and N − K remaining tokens. The dropped tokens are stored in the long-term memory Θl while the remaining tokens
and new K tokens are combined to obtain the new memory pool θl′ . Then during generation, we use our co-trained retriever to retrieve
tokens from Θl , which is fed into the transformer layer ϕl along with the short-term memory θl and the query hidden states. The major
difference between MemoryLLM and M+ is the introduction of Long-Term Memory Θl .

sions of the context window without incurring excessive                Figure 1). Merging is achieved by randomly dropping K
GPU memory costs. Despite the advantages and potential                 tokens from θl and appending the new K tokens to the end.
of Latent-Space Memory, existing methods within this cate-             During generation, the memory pool θl is perceived using
gory typically fall short when dealing with extremely long             cross-attention.
input (Das et al., 2024; Wang et al., 2024c;a; He et al., 2024).
In contrast, M+ can have much longer retention compared                3.2. Equipping MemoryLLM with Long-Term Memory
to existing methods.                                                   In this section, we explain how we instantiate the long-term
                                                                       memory and how it integrates with the language model ϕ
3. Methodology                                                         and the original memory pool θ in MemoryLLM. In this
3.1. Preliminaries                                                     paper, we term the original memory pool θ as short-term
                                                                       memory to distinguish it from the new long-term memory.
We first introduce the structure of MemoryLLM (Wang et al.,
2024a), which serves as the base structure of M+. Memo-                3.2.1. M EMORY S TRUCTURES
ryLLM comprises two main components: θ (the memory                     We denote the long-term memory as Θ. Similarly, it has L
pool) and ϕ (a transformer-based decoder-only language                 layers {Θl }N l=1 . Each layer has a long-term memory pool
model). The memory pool θ consists of L layers: {θl }L   l=1           where the size is flexible. We specify a maximum size for
where L is the number of layers in the transformer ϕ. For              the long-term memory. The maximum size of the long-term
every layer, θl has N memory tokens, where each token                  memory is denoted as M and the size of long-term memory
is a vector in Rd , with d representing the hidden size of             is flexible. In practice, we choose M to be 150k. Then we
the language model. During the update process, the last K              introduce the update and generate process of M+:
tokens from the l-th layer’s memory pool, θl , are extracted
and combined with the chunk to be injected. The resulting              Update Process During the update process, note that in
new K tokens are then merged back into θl (illustrated in              the original MemoryLLM, K tokens are dropped from θ
                                                                       during updates and are permanently discarded. In M+, the

                                                                   3
                               M+: Extending MemoryLLM with Scalable Long-Term Memory

dropped K tokens are instead stored in the long-term mem-             are denoted as θ− . After that, we run a forward pass on xn
ory Θ, ensuring their retention for extended durations (as            to obtain the hidden states hn (Note that this is a general
illustrated in Figure 1). We assign each token the variable           notation for all layers). For the hidden states hn in each
“age” so that after retrieving tokens from Θ we can sort              layer, we train the retriever using the following objective:
these tokens according to age, ensuring that the tokens are
chronologically ordered. As for the new K tokens, they                              min − log(p+ ) − log(1 − p− ),
                                                                                    fq ,fk
are obtained with the same process as in MemoryLLM,
                                                                                    where p+ = ⟨fq (hn ), fk (θ+ )⟩,
described in Figure 1. When the memory tokens in the long-
term memory reach the maximum capacity, i.e., M tokens,                                      p− = ⟨fq (hn ), fk (θ− )⟩,
we would drop the tokens with the largest ages.
                                                                      i.e., we are maximizing the distance between hn and θ−
Generation Process During generation, at each layer, we               while minimizing the distance between xn and θ+ after
extract K0 tokens from the long-term memory Θl using a                applying fq and fk on hn and θ respectively.
retrieval mechanism described below, sort them by their
ages, and concatenate them with the short-term memory                 3.2.3. T RAINING D ETAILS
θl . This allows the query hidden states to access both the           Setting Configurations We build M+ on top of Llama-
extracted long-term memory and the short-term memory                  3.1-8B (Dubey et al., 2024) and train it using eight
using cross-attention, enabling the query to retrieve relevant        A100 GPUs. We tried FSDP, deepspeed-stage-2,
information from the memory.                                          and deepspeed-stage-3 and we finally choose
Multi-LoRA Design In our training, we use two sets of                 deepspeed-stage-2 due to resource limitation and li-
LoRA weights, one is activated during the update process,             brary incompatibility (see the details in Appendix A). Specif-
and the other is activated during the generation process (as          ically, we set K = 256, N = 10240 (N is the number of
shown in Figure 1). Intuitively, the update process com-              tokens in the short-term memory, see Section 3.1), and the
presses the information (similar to writing) while the gener-         number of tokens of extracted LTM in Figure 1 is set to
ating process loads the information (similar to reading), thus        2,560. The generation window (i.e., the maximum length of
having two LoRA weights could potentially make learning               generation) is set to be 2,048. Thus maximally we have the
easier for our model. This is similar to the intuition in T5          attention matrix of shape (12, 800+2, 048) by 2, 048, which
where they find sharing the weights of encoder and decoder            is fit into eight A100 GPUs using deepspeed-stage-2.
leads to slightly inferior performances (See Table 2 in Raffel        Although Llama-3.1-8B can practically handle a 128k con-
et al. (2020)).                                                       text window, it went through much more extensive training
                                                                      that we cannot afford. Should we have more GPUs and
3.2.2. R ETRIEVER D ESIGN AND T RAINING                               more budget, M+ could also be scaled to 128k level. Given
Retriever Design The retriever has two projectors: query              the constraint of GPU resources, we have scaled to 12,800
projector fq and key projector fk , which are all instantiated        memory tokens and 2,048 generation context window, re-
with a two-layer perceptron. The output dimension of both             lying on Llama-3.1-8B’s capability on a context window
projectors, denoted as dproj , is set to be a small number.           of 12, 800 + 2, 048 = 14, 848 tokens. Thus, for fair com-
In our experiments, we set dproj to be d/20 where d is                parisons, we mainly focus on Llama-3.1-8B-16k as the
the hidden size of the language model ϕ. When dropping                baseline.
tokens from θl into Θl (as shown in Figure 1), we apply
fk on top of the dropped memory tokens, thus we need an               3.2.4. DATA C URRICULUM
additional pool storing all the key vectors corresponding             The training process consists of three stages:
to the memory tokens in Θl . Note that the key vectors are            Continual Training of MemoryLLM (Stage 1) Differ-
the output from fk , and are of dimension dproj , requiring           ent from (Wang et al., 2024a) which starts from the back-
little additional memory footprint compared to the long-              bone model Llama-2-7B, we start with the backbone model
term memory. During generation, given the hidden states               Llama-3.1-8B, which serves as ϕ as shown in Figure 1.
from the query, we apply fq on the hidden states to get query         We equip ϕ with N = 12, 800 memory tokens in each
vectors and use them to retrieve tokens from Θl according             layer and set the generation context window as 2,048. We
to the dot product between query vectors and key vectors.             first continually train ϕ equipped with θ on the dataset
Training the Retriever To train the retriever, we first split         fineweb-edu (Penedo et al., 2024) for 1,200,000 steps
a document x into n chunks x1 , x2 , · · · , xn and we inject         over four weeks, establishing a strong foundation for han-
{x1 , · · · , xn−1 into the short-term memory. Then we can            dling short documents. This training stage consists of three
track the embeddings in the short-term memory that are                key sub-tasks as outlined in MemoryLLM (Wang et al.,
related to x1 , · · · , xn−1 which we denote as θ+ . Then the         2024a) (see details in Appendix D)).
memory tokens that are not related to x1 , · · · , xn−1 , i.e.,       Long-Context Modeling with Long Documents (Stage 2)
the tokens that were there before injecting x1 , · · · , xn−1 ,       Since most of the fineweb-edu dataset (used in Stage

                                                                  4
                                                  M+: Extending MemoryLLM with Scalable Long-Term Memory

                              Llama-3.2-3B-128k       Llama-3.1-8B-SnapKV                                         et al., 2024) and consists of 351 tuples in the format (book,
                              Llama-3.1-8B-16k        M+                                                          question, answer). Each book has an average input
                              Llama-3.1-8B-BM25
                      0.180                                                 0.25                                  length of 192k tokens. The task requires answering ques-
                                                                                                                  tions based on the entire book, and we use the QA-F1 score
                      0.175                                                 0.24                                  as the evaluation metric.




                                                                               Accuracy (Longbook-Event-QA)
                      0.170                                                 0.23



QA-F1 (Longbook-QA)
                                                                                                                  LongBook Event QA: We propose this new benchmark to
                      0.165                                                 0.22                                  evaluate the model’s ability to recall past events and reason
                                                                            0.21                                  chronologically. This dataset is constructed as follows: (1)
                      0.160                                                                                       We use the Named Entity Recognition (NER) tool from
                                                                            0.20                                  SpaCy to identify the ten most frequently mentioned char-
                      0.155
                                                                            0.19                                  acters in each of the first five books from the LongBook-QA
                      0.150                                                                                       dataset. (2) Each book is divided into 4096-token chunks
                                                                            0.18
                      0.145                                                                                       in chronological order, and events experienced by the main
                                  Longbook-QA          Longbook-Event-QA                                          characters are extracted using gpt-4o. This results in
  Figure 2. Overall Performance Comparison Longbook Question                                                      event lists with 1,016, 221, 644, 348, and 409 events for
  Answering. Best viewed in colors.                                                                               the five books, respectively. (3) For each event, we con-
                                                                                                                  struct a multi-choice question-answering task by prompting
  1 training) are short documents under 4k tokens, we need                                                        gpt-4o to generate five fake events as distractors. The
  to train on longer documents to enhance the model’s long-                                                       model is provided with the book text, five past events, and
  context modeling abilities. Thus, we extract documents                                                          asked to identify the ground-truth event from six options.
  from SlimPajama that range from 4k to 64k tokens and split                                                      We use accuracy as the evaluation metric.
  them into four categories based on their lengths: 4k-8k,
  8k-16k, 16k-32k, 32k-64k. The statistics of obtained                                                            We compare M+ against the following baselines: (1) Llama-
  dataset is shown in Appendix C. For each length range,                                                          3.1-8B-16k: The original model with context window fixed
  we randomly sample 200,000 examples, and they are com-                                                          as 16k. (2) Llama-3.1-8B-SnapKV, We processes a 32k
  bined with a snapshot of fineweb in equal proportions                                                           token input and dynamically selects 16k key-value caches
  (1:1:1:1:1), with each subset contributing to 20% of the total                                                  from the saved 32k caches with the techniques introduced
  data. We set this proportion to upsample longer documents,                                                      from SnapKV (Li et al., 2024). SnapKV incurs significant
  which is important for long context modeling as suggested                                                       memory overhead, as illustrated in Section 4.2. (3) Llama-
  by Fu et al. (2024). Training runs for one epoch with around                                                    3.1-3B-128k: A 3B parameter version of the Llama3 series.
  one week using the same training tasks in Stage 1.                                                              This model uses a 128k context window and consumes
                                                                                                                  comparable GPU memory to M+ because of its smaller size.
   Training with long-term memory (Stage 3) Building on
   Stage 2, we introduce long-term memory to enhance M+.                                                          (1) Llama-3.1-3B-128k: A 3B parameter version of the
   Note that in Stage 1 and Stage 2, there is only the short-                                                     Llama3 series. This model uses a 128k context window
   term memory θ where each layer θl has 12,800 tokens. In                                                        and consumes comparable GPU memory to M+ because
   stage 3, we adjust the configuration by setting θl to 10,240                                                   of its smaller size. (2) Llama-3.1-8B-16k: The original
   tokens and retrieving K0 = 2, 560 tokens from the long-                                                        model with context window fixed as 16k. (3) Llama-3.1-
   term memory, maintaining a total of 12,800 memory tokens                                                       8B-BM25: We use BM25 as the retriever. Specifically, we
   as in the previous stages. Now the structure of the memory                                                     process the entire book by dividing it into chunks of 4,096
   tokens becomes slightly different, as 2,560 tokens are from                                                    tokens and retrieve four relevant chunks for each question.
   the long-term memory, we design Stage 3 to ensure the                                                          The model Llama-3.1-8B is required to answer the question
   model ϕ understand the tokens from long-term memory – we                                                       with four retrieved chunks. (4) Llama-3.1-8B-SnapKV, We
   continuously train from the checkpoint obtained after Stage                                                    processes a 32k token input and dynamically selects 16k key-
   2 on a newly constructed dataset sampled from the same                                                         value caches from the saved 32k caches with the techniques
   long documents extracted from SlimPajama but distinct                                                          introduced from SnapKV (Li et al., 2024). SnapKV incurs
   from the instances used in Stage 2.                                                                            significant memory overhead, as illustrated in Section 4.2.

   4. Experiments                                                                                                 We present the primary results in the main paper, while defer-
                                                                                                                  ring extended discussions and supplementary experiments
  4.1. Long Book QA and Event QA
                                                                                                                  to the appendix. These include: similarities to attention-
  4.1.1. E XPERIMENTAL S ETTINGS                                                                                  based retrieval methods (Appendix E.1); the structure of
  We evaluate our model on two datasets designed to test long-                                                    long-term memory (Appendix E.2); latency and memory
  context understanding and long-term memory capabilities:                                                        consumption when scaling (Appendix E.3); FLOPs com-
   LongBook-QA: This dataset is part of ∞-Bench (Zhang                                                            parison (Appendix E.4); and the interpretability of memory

                                                                                                              5
                               M+: Extending MemoryLLM with Scalable Long-Term Memory

vectors (Appendix E.5).
                                                                     Table 1. GPU Memory Cost Comparison. MemoryLLM-8B is the
                                                                     model obtained after Stage 1 training, serving as an ablation study.
4.1.2. E XPERIMENTAL R ESULTS
                                                                      Method                             GPU Memory Cost (MB)
The results for both benchmarks are shown in Figure 2.
                                                                      Llama-3.1-8B-SnapKV                         32574.49
From the results, we observe the following: (1) M+ consis-
                                                                      Llama-3.2-3B-128k                           30422.70
tently outperforms all baselines, demonstrating its efficiency
                                                                      M+                                          21177.76
and effectiveness. In LongBook-QA, M+ achieves superior
                                                                      Llama-3.1-8B-16k                            19239.21
QA-F1 scores even while processing the least number of
                                                                      M+ (offload)                                17973.34
tokens (12,800 tokens in memory and 2,048 tokens in the
generation context window). Similarly, in LongBook Event              MemoryLLM-8B                                21176.24
QA, M+ excels at identifying ground-truth events, show-               MemoryLLM-8B (offload)                      17967.47
casing its ability to reason over long-term dependencies.
(2) Compared to Llama-3.1-3B-128k, the results on dataset
Longbook-Event-QA suggest that tasks requiring reasoning             out affecting the performance. This leads to “M+ (offload)”
capabilities benefit more from larger models with tailored           which achieves the least GPU memory consumption. We
structures for extended context windows rather than smaller          also include the GPU cost of MemoryLLM-8B, which is
models with longer context capacities. This highlights the           the model obtained after Stage 1 described in Section 3.2.4.
importance of balancing model size and memory mecha-                 This shows that the Long-Term Memory does not incur
nisms under fixed GPU memory budgets. (3) Llama-3.1-8B-              more GPU costs.
SnapKV underperforms Llama-3.1-8B-16k on LongBook-
QA, indicating that solely relying on attention scores to            4.3. Knowledge Retention Experiments
select key tokens may not consistently yield optimal results.
In contrast, M+ leverages a jointly trained retriever to iden-       4.3.1. E XPERIMENTAL S ETTINGS
tify and extract memory tokens, resulting in more effective          To evaluate the ability of M+ to recall long-term knowledge,
performance on both datasets. (4) M+ outperforms Llama-              we follow the experimental setup in MemoryLLM (Wang
3.1-8B with BM25 retriever, and Llama-3.1-8B with BM25               et al., 2024a) on datasets SQuAD and NaturalQA, for-
does not consistently outperform the original model Llama-           matted as (context, question, answer), where
3.1-8B-16k, particularly in tasks like Longbook-Event-QA             context and question are sentences, and answer is
which requires a more global understanding of the entire             the correct response to the question. Consistent with Wang
narrative. This highlights the limitations of chunk-level re-        et al. (2024a), we extract samples with answer lengths of
trieval in scenarios that demand long-range comprehension.           three tokens or fewer for SQuAD and four tokens or fewer
(5) Memory Efficiency: While M+ achieves state-of-the-art            for NaturalQA. After filtering out ambiguous examples that
results, it does so with a highly memory-efficient design.           gpt-4o-mini fails to answer, we select the first 100 ex-
Detailed memory cost comparisons are provided in Section             amples from the remaining answerable set to conduct our
4.2.                                                                 evaluation. To test the model’s long-term retention abil-
                                                                     ity, we insert distracting contexts between context and
4.2. GPU Cost Comparison                                             question. These distracting contexts are sampled from
In this section, we report the maximum GPU memory al-                the training set of SQuAD. Both NaturalQA and SQuAD are
located during the inference across both datasets for each           constructed from Wikipedia and they are within the same
method mentioned in Section 4.1. The results are shown in            domain. Moreover, the contexts in SQuAD training set
Table 1. From the results, we can find that M+ has the low-          are of more consistent lengths (around 300-500 tokens for
est GPU memory cost except for Llama-3.1-8B-16k. The                 each context), thus we sample the distracting contexts from
reason that M+ uses fewer tokens but costs more GPU is that          SQuAD training set for both NaturalQA and SQuAD.
we have 12,800 tokens in each layer, while Llama-3.1-8B-             We compare with the following baselines: MemoryLLM-
16k has only one layer of 16k tokens. Therefore, we propose          7B: The proposed model in Wang et al. (2024a), with the
to offload the memory tokens on CPU, and reload them into            backbone Llama2-7B, and trained with C4 dataset. Llama-
GPU when the calculation reaches a certain layer. By “CPU            3.1-8B-SnapKV: We fix the cache size to 16384 and dynam-
offloading”, we specifically mean offloading the memory              ically adjust the remaining key-value caches in the cache
vectors present in each layer of the model. It is important to       pool according to the newly injected distracting contexts
note that other models, such as Llama-3.1-8B do not have             (consistent with the settings from Section 4.1). The maxi-
memory vectors, so our CPU offloading can only be applied            mum prompt length is set to 49,152 (48k), which requires
to MemoryLLM and M+. With that, we can sacrifice some                over 70 GB of GPU memory. We use longer prompt length
I/O time cost but substantially decrease the GPU cost with-          here as we want to explore more knowledge retention abili-

                                                                 6
                                        M+: Extending MemoryLLM with Scalable Long-Term Memory


                                                    Table 2. Experimental Results on LongBench.
                                          2wikimqa      hotpotqa      qasper         musique    multifieldqa en     narrativeqa     Avg
                 MemoryLLM-7B (20k)         27.22         34.03           19.57       13.47           29.56            20.64       24.08
                  Llama3.1-8B (8k)          34.87         43.10           29.96       24.96           43.18            24.29       33.39
                  Llama3.1-8B (16k)         34.11         44.72           30.05       31.96           48.86            25.19       35.81
                       M+ (8k)              33.12         37.99           29.91       20.68           40.11            24.18       31.00
                       M+ (16k)             32.71         38.56           30.39       24.58           46.32            24.12       32.78


           0.7                                      M+                            window. The first 6k tokens (12 chunks) are compressed
                                                    MemoryLLM-7B                  into 256 + 256 ∗ N N  −K                      −K 11
                                                                                                            + · · · + 256 ∗ ( N N ) = 2755.6
           0.6                                      Llama-3.1-8B-SnapKV           tokens (with around 316.4 memory tokens dropped). For
           0.5                                      Borderline (0.09)

Accuracy
                                                                                  16k tokens, the first 14k tokens are compressed 5530 tokens
           0.4                                                                    (with around 1638 tokens dropped). As some tokens are
           0.3                                                                    dropped, the performance may get affected slightly. Note
           0.2                                                                    that this could lead to a longer context window while sacri-
           0.1                                                                    ficing some of the performance in relatively shorter context
                  10
                  20
                  30
                  40
                  50
                  60
                  70
                  80
                  90
                 10
                 11
                    0k
                    0k
                    0
                 12 k
                      k
                      k
                      k
                      k
                      k
                      k
                      k
                      k
                      k                                                           tasks. (2) Limited Cross-Chunk Attention: When process-
                    0
                 13 k
                                                                                  ing chunks into memory, M+ uses the last K tokens and
                    0
                 14 k
                    0
                 15 k
                    0
                 16 k
                    0k
                 Figure 3. Knowledge Retention Results on SQuAD.                  the hidden states from the new chunk as input (illustrated in
                                                                                  Figur e1). In contrast, Llama-3.1-8B processes each chunk
 ties of Llama-3.1-8B-SnapKV.                                                     with access to all previous tokens, enabling cross-attention
4.3.2. E XPERIMENTAL R ESULTS                                                     between chunks. While this approach allows Llama-3.1-8B
The experimental results on SQuAD are presented in Fig-                           to maintain full attention across chunks, it comes with sig-
ure 3. We present the results on NaturalQA in Appendix                            nificantly higher computational and memory costs due to
B.1 (Figure 8) as both figures have similar trends. From                          the quadratic scaling of transformer computations. In com-
these figures, key observations include: (1) M+ significantly                     parison, M+ achieves linear computational scaling, making
outperforms MemoryLLM-7B, demonstrating a substan-                                it more GPU-memory-efficient for processing extremely
tial improvement in knowledge retention compared with                             long inputs (see Section 4.2), albeit with some trade-off in
the last version. (2) M+ surpasses Llama-3.1-8B equipped                          performance in tasks with relatively shorter contexts.
with SnapK, indicating that storing knowledge directly in                         4.5. Ablation Study
memory is more effective than relying on key-value cache
mechanisms. (3) Even though Llama-3.1-8B-SnapKV is                                4.5.1. A BLATION S TUDY ON LONG - TERM MEMORY
given the context window 48k, it struggles to recall infor-                       In this section, we study the effectiveness of our long-term
mation injected more than 30k tokens earlier, highlighting                        memory to ensure that the observed performance improve-
the limitations of key-value cache methods for long-term                          ments over MemoryLLM-7B and Llama-3.1-8B-16k stem
knowledge retention.                                                              from the integration of LTM rather than solely from the ad-
                                                                                  ditional training. Recall from Section 3.2.4 that the first
 4.4. Experimental Results on (Relatively) Short                                  two training stages do not use long-term memory. We
      Documents                                                                   compare with three models: (1) MemoryLLM-8B: The
We evaluate the performance of M+ and Llama-3.1-8B on                             model obtained after Stage 1. It shares the same structure
relatively short documents using the LongBench benchmark,                         as MemoryLLM-7B (Wang et al., 2024a) but upgrades the
considering input lengths of 8k and 16k tokens. The eval-                         backbone from Llama-2-7B to Llama-3.1-8B and includes
uation metric is QA-F1, following Bai et al. (2023). The                          changes such as dataset shifts and multi-LoRA settings. (2)
results, presented in Table 2, show that M+ could match the                       MemoryLLM-8B-Long: The model obtained after Stage 2.
performance of Llama-3.1-8B on 4 out of 6 datasets, except                        (3) M+: The final model obtained after Stage 3.
for hotpotqa and musique. This performance differ-
ence can be attributed to two primary factors: (1) Random                         Long Context Modeling Ability Improves Over Stages
Dropping Mechanism: M+ employs a random dropping                                  We evaluate the three models on a held-out subset of Slim-
mechanism that can lead to partial information loss. For                          Pajama containing 1000 examples with lengths between
instance, processing an 8k input requires splitting it into                       32k and 64k tokens. We compute the validation loss for
12 chunks (each chunk being 512 tokens), while the last                           each model on this subset and report the results in Figure
2k tokens are directly included in the generation context                         4. The results demonstrate that long-context modeling abil-

                                                                             7
                                       M+: Extending MemoryLLM with Scalable Long-Term Memory

                                                                                   0.8                           M+ (Stage 3)
             1.70                     MemoryLLM-8B (Stage 1)                       0.7                           MemoryLLM-8B-Long (Stage 2)
             1.65                     MemoryLLM-8B-Long (Stage 2)                                                MemoryLLM-8B-Attn
                                      M+ (Stage 3)                                 0.6
             1.60                                                                                                Borderline (0.09)

                                                                        Accuracy
                                                                                   0.5
             1.55
Loss Value
                                                                                   0.4
             1.50                                                                  0.3
             1.45                                                                  0.2
             1.40                                                                  0.1
             1.35                                                                         10
                                                                                          20
                                                                                          30
                                                                                          40
                                                                                          50
                                                                                          60
                                                                                          70
                                                                                          800kk
                                                                                              k
                                                                                              k
                                                                                              k
                                                                                              k
                                                                                              k
                                                                                              k
             1.30
                                                                                          90
                                                                                         10
                                                                                         11 0k
                                                                                            0
                                                                                         12 k
                                                                                            0
                                                                                         13 k
                                                                                            0
                                                                                         14 k
                                                                                            0
                                                                                         15 k
                                                                                            0
                                                                                         16 k
                                                                                            0kk
                                                                                              k
                    0   10000   20000 30000 40000      50000                             Figure 5. Ablation Study on SQuAD dataset.
                                  Number of Tokens
Figure 4. Validation loss comparison on a held-out subset from          MemoryLLM-8B, which can be attributed to the inclusion
Slim-Pajama, consisting of 1,000 examples. The three models,            of longer training examples in Stage 2 (4k–64k), whereas
MemoryLLM-8B, MemoryLLM-8B-Long, and M+, are obtained                   fineweb-edu (used in Stage 1) contains very few exam-
after Stages 1, 2, and 3, respectively (Section 3.2.4).                 ples longer than 4k.

ity improves progressively across training stages, with M+              4.5.2. A BLATION S TUDY ON R ETRIEVER
achieving the lowest validation loss, indicating the strongest          We conduct an ablation study to evaluate the performance
performance on long-context inputs.                                     of our trained retriever compared to an attention-based re-
                                                                        trieval method. Using the SQuAD and NaturalQA datasets,
Long-term memory Significantly Improves Knowledge                       we compare M+ with an attention-based retrieval method
Retention We further assess MemoryLLM-8B-Long and                       inspired by H2O (Zhang et al., 2023). In the attention-based
M+ on knowledge retention tasks using SQuAD and Natu-                   method (M+-Attn), the key-value cache of past tokens is
ralQA datasets with the same setting as in Section 4.3. In              stored, and during generation, a fixed number of tokens are
our experiments, we find MemoryLLM-8B-Long performs                     retrieved from the cached keys and values based on their
marginally better than MemoryLLM-8B on knowledge re-                    attention scores. To match our approach, we use the same
tention tasks, thus for simplicity, we omit the results of              short-term memory as M+, but the memory tokens in the
MemoryLLM-8B here. The results for MemoryLLM-8B-                        long-term memory are retrieved according to the attention
Long and M+ on dataset SQuAD are presented in Figure 5                  scores rather than using our retriever. To implement this
and the results on NaturalQA are presented in Appendix B.2              method, we adapt M+ to store key-value caches instead of
(Figure 9). From the results, we can observe that (1) Despite           hidden states in the long-term memory to avoid any addi-
having only 12,800 memory tokens, MemoryLLM-8B-Long                     tional computation cost. During generation, for each token,
retains knowledge for up to 30 tokens in NaturalQA and                  we extract 2,560 keys and values for each head from the
50 tokens in SQuAD, demonstrating effective compression                 long-term memory, along with the 10,240 memory tokens in
of information into memory tokens. (2) Stage 3 signifi-                 the current memory pool. The results on SQuAD are shown
cantly enhances retention, extending the model’s ability to             in Figures 5 and the results on NaturalQA are shown in Ap-
recall knowledge from 50k to over 160 tokens. During                    pendix B.2 (Figure 9). From the figures we can see that M+
inference, 2,560 tokens are retrieved from long-term mem-               substantially outperforms M+-Attn, showing the advantages
ory, combined with 10,240 tokens from short-term memory,                of our trained retriever over the attention-based approach in
resulting in 12,800 effective memory tokens. These re-                  terms of knowledge retention and retrieval efficiency.
sults underscore the effectiveness of our long-term memory
mechanism in improving knowledge retention and handling                 4.6. Analysis
extremely long contexts.                                                4.6.1. M ODEL Q UALITY WITHIN C ONTEXT W INDOW
Long-term memory does not affect the performance on                     M+ uses 12,800 memory tokens alongside a 2,048-token
relatively short documents To show whether long-term                    generation context window. In this section, we evaluate
memory affects the model’s performances on relatively short             the model’s performance within the standard 2,048-token
documents, we conduct ablation study with models from                   context window to ensure that the addition of memory
three different stages on the dataset LongBench while fix-              does not degrade its base capability. We randomly select
ing the context window as 8k. The results are shown in                  1,000 examples from the fineweb-edu dataset (snapshot
Table 3. From the table we can see that M+ has similar                  CC-MAIN-2024-10), which does not overlap with the
performance as MemoryLLM-8B-Long on 8k context win-                     training data. For this evaluation, we cap the input sequence
dow. This means adding long-term memory does not af-                    length at 2,048 tokens and report perplexity for both M+
fect the performance on relatively short documents. Mean-               and LLaMA-3.1-8B. The results show that LLaMA-3.1-8B
while, MemoryLLM-8B-Long is significantly better than                   achieves a perplexity of 1.9734, while M+ records a sim-

                                                                    8
                                       M+: Extending MemoryLLM with Scalable Long-Term Memory


                                     Table 3. Ablation study of the effects of different stages on LongBench.
                                                 2wikimqa hotpotqa qasper musique multifieldqa en                                                narrativeqa   Avg
        MemoryLLM-8B (Stage 1, 8k)                      32.30           33.39          23.88                        12.37         35.91             21.46      26.55
      MemoryLLM-8B-Long (Stage 2, 8k)                   32.23           37.86          31.62                        20.35         42.16             23.49      31.29
             M+ (Stage 3, 8k)                           33.12           37.99          29.91                        20.68         40.11             24.18      31.00


250       Ground-truth Tokens                                                                                           Llama-3.1-8B
          Retrieved Tokens                                                                                     30
                                                                                                                        MemoryLLM 8B




                                                                                    Inference Time (seconds)
200
                                                                                                               25       M+
150                                                                                                                     MemoryLLM 8B (Offload)
                                                                                                               20       M+ (Offload)
100
                                                                                                               15
 50                                                                                                            10
  0
      10k 20k 30k 40k 50k 60k 70k 80k 90k 100k 110k 120k 130k 140k 150k 160k                                    5
                           Number of Tokens Injected
                                                                                                                0 16K            32K            64K                  128K
Figure 6. Number of ground-truth tokens in long-term memory
and the number of retrieved groud-truth tokens as more tokens are
                                                                                                                                   Sequence Length
injected into the memory.                                                                                                   Figure 7. Latency Analysis

                                                                                      focus on the following settings: (1) Llama-3.1-8B-128k.
ilar perplexity of 1.9828. These findings indicate that M+                            To analyze the latency, we use Llama-3.1-8B with a full
maintains competitive performance on documents shorter                                context window 128k; (2) MemoryLLM-8B (After Stage 1);
than 2,048 tokens, confirming that the base model’s quality                           (3) M+ (After Stage 3); (4) MemoryLLM-8B (Offload): we
within the context window remains intact.                                             offload the memory onto CPU and load the corresponding
                                                                                      memory tokens into GPU when the computation hits a cer-
4.6.2. R ETRIEVAL Q UALITY                                                            tain layer; (5) M+ (offload): Offloading the memory onto
In our implementation, the long-term memory is initially                              CPU and load them back when necessary. All experiments
of size 5120, and then it gradually increases to 80k in our                           in this section are conducted on a single H100 GPU. The
knowledge retention experiments (it hits 81,276 when there                            results are shown in Figure 7. From the figure, we could
160k tokens are injected). To access retrieval quality, we                            find that (1) MemoryLLM-8B has slightly higher latency
leverage the knowledge retention task with SQuAD dataset,                             than Llama-3.1-8B in relatively shorter documents (16k,
where the first K = 256 tokens are critical for answer-                               32k, 64k) but has lower latency on long documents (128k);
ing the questions. These K = 256 tokens are denoted as                                (2) M+ has higher latency than MemoryLLM-8B, where the
ground-truth tokens. We track the number of ground-truth                              latency is mainly introduced by the retrieval process. (3)
tokens in the long-term memory and how many tokens are                                Offloading the memory onto CPU introduces slightly more
retrieved back into the “Extracted LTM” pool in Figure 1                              latency, while it becomes negligible when the sequence
when queried after various numbers of tokens are injected.                            grows longer. In the case of 128k input, the introduced
We present the results in Figure 6, demonstrating the re-                             latency for M+ (offload) compared with M+ is 1 second,
trieval quality as more tokens are dropped from the memory                            leading to 3% additional computation time for M+.
pool to the long-term memory. From the figure we can see
that around 30% tokens are retrieved. For reference, random                            5. Conclusion and Future Work
retrieval would retrieve 2, 560/81, 276 = 3% tokens.
                                                                                       In this work, we present M+, an enhanced memory-
4.6.3. L ATENCY A NALYSIS                                                              augmented language model that extends the long-term re-
While M+ introduces additional computation due to the                                  tention abilities of MemoryLLM. By integrating a long-
memory token retrieval from the long-term memory, we                                   term memory (LTM) mechanism with a co-trained re-
perform a detailed analysis to quantify this latency. Specifi-                         triever, M+ effectively retrieves and utilizes past informa-
cally, we analyze latency under the setting of a 128k input.                           tion, significantly extending the knowledge retention abil-
For reference, we use the processing time of Llama-3.1-8B                              ities from MemoryLLM, achieve superior performances
performing a forward pass on 131,071 (=128k-1) tokens                                  in long-context understanding tasks compared with recent
to generate the final token. To ensure fairness, we inject                             baselines given the similar budget of GPU memory. In fu-
131,072 - 2,048 tokens into the memory and ask M+ to                                   ture work, we plan to reduce CPU-GPU communication
predict the last token using the remaining 2,047 tokens. We                            overhead, enabling more efficient generation with M+.

                                                                                9
                              M+: Extending MemoryLLM with Scalable Long-Term Memory

Impact Statement                                                      Larimar: Large language models with episodic memory
                                                                      control. In ICML. OpenReview.net, 2024.
This work introduces a memory-augmented approach for
Large Language Models (LLMs), enabling them to more                 Dubey, A., Jauhri, A., Pandey, A., Kadian, A., Al-Dahle, A.,
effectively retain and retrieve long-term information and             Letman, A., Mathur, A., Schelten, A., Yang, A., Fan, A.,
thereby offering potential benefits in areas such as educa-           Goyal, A., Hartshorn, A., Yang, A., Mitra, A., Sravanku-
tion, research, and industry. The increased memory capacity           mar, A., Korenev, A., Hinsvark, A., Rao, A., Zhang, A.,
could potentially raise concerns regarding AI safety, relia-          Rodriguez, A., Gregerson, A., Spataru, A., Rozière, B.,
bility, and fairness. If not carefully managed, these models          Biron, B., Tang, B., Chern, B., Caucheteux, C., Nayak,
could propagate biased content over extended text spans               C., Bi, C., Marra, C., McConnell, C., Keller, C., Touret,
or store sensitive information for unintended durations. It           C., Wu, C., Wong, C., Ferrer, C. C., Nikolaidis, C., Al-
is therefore crucial to employ robust safeguards, including           lonsius, D., Song, D., Pintz, D., Livshits, D., Esiobu, D.,
bias mitigation strategies and ongoing oversight, to prevent          Choudhary, D., Mahajan, D., Garcia-Olano, D., Perino,
misuse or the reinforcement of harmful content. Beyond                D., Hupkes, D., Lakomkin, E., AlBadawy, E., Lobanova,
considerations already inherent to LLMs, we do not foresee            E., Dinan, E., Smith, E. M., Radenovic, F., Zhang, F.,
other significant societal impacts arising from this work.            Synnaeve, G., Lee, G., Anderson, G. L., Nail, G., Mialon,
                                                                      G., Pang, G., Cucurell, G., Nguyen, H., Korevaar, H.,
References                                                            Xu, H., Touvron, H., Zarov, I., Ibarra, I. A., Kloumann,
                                                                      I. M., Misra, I., Evtimov, I., Copet, J., Lee, J., Geffert,
Al Adel, A. and Burtsev, M. S. Memory transformer with                J., Vranes, J., Park, J., Mahadeokar, J., Shah, J., van der
  hierarchical attention for long document processing. In             Linde, J., Billock, J., Hong, J., Lee, J., Fu, J., Chi, J.,
  2021 International Conference Engineering and Telecom-              Huang, J., Liu, J., Wang, J., Yu, J., Bitton, J., Spisak, J.,
  munication (En&T), pp. 1–7. IEEE, 2021.                             Park, J., Rocca, J., Johnstun, J., Saxe, J., Jia, J., Alwala,
                                                                      K. V., Upasani, K., Plawiak, K., Li, K., Heafield, K.,
Bai, Y., Lv, X., Zhang, J., Lyu, H., Tang, J., Huang, Z.,
                                                                      Stone, K., and et al. The llama 3 herd of models. CoRR,
  Du, Z., Liu, X., Zeng, A., Hou, L., et al. Longbench: A
                                                                      abs/2407.21783, 2024.
  bilingual, multitask benchmark for long context under-
  standing. arXiv preprint arXiv:2308.14508, 2023.                  Fedorenko, E., Piantadosi, S. T., and Gibson, E. A. Lan-
Belcak, P. and Wattenhofer, R. Tiny transformers excel at             guage is primarily a tool for communication rather than
  sentence compression. arXiv preprint arXiv:2410.23510,              thought. Nature, 630(8017):575–586, 2024.
  2024.                                                             Fu, Y., Panda, R., Niu, X., Yue, X., Hajishirzi, H., Kim, Y.,
Bellard, F. Nncp v2: Lossless data compression with trans-            and Peng, H. Data engineering for scaling language mod-
  former. Technical report, Technical report, Amarisoft,              els to 128k context. In Forty-first International Confer-
  2021.                                                               ence on Machine Learning, ICML 2024, Vienna, Austria,
                                                                      July 21-27, 2024. OpenReview.net, 2024. URL https:
Bulatov, A., Kuratov, Y., and Burtsev, M. S. Recurrent                //openreview.net/forum?id=TaAqeo7lUh.
  memory transformer. In NeurIPS, 2022.
                                                                    Ge, T., Hu, J., Wang, L., Wang, X., Chen, S., and Wei, F.
Bulatov, A., Kuratov, Y., Kapushev, Y., and Burtsev, M. S.            In-context autoencoder for context compression in a large
  Scaling transformer to 1m tokens and beyond with rmt.               language model. In The Twelfth International Conference
  arXiv preprint arXiv:2304.11062, 2023.                              on Learning Representations, ICLR 2024, Vienna, Austria,
Chen, X., Jiang, J.-Y., Chang, W.-C., Hsieh, C.-J., Yu,              May 7-11, 2024. OpenReview.net, 2024. URL https:
  H.-F., and Wang, W. MinPrompt: Graph-based min-                    //openreview.net/forum?id=uREj4ZuGJE.
  imal prompt data augmentation for few-shot question               Gutiérrez, B. J., Shu, Y., Gu, Y., Yasunaga, M., and Su,
  answering. In Ku, L.-W., Martins, A., and Srikumar,                Y. Hipporag: Neurobiologically inspired long-term
  V. (eds.), Proceedings of the 62nd Annual Meeting of                memory for large language models. arXiv preprint
  the Association for Computational Linguistics (Volume               arXiv:2405.14831, 2024.
 1: Long Papers), pp. 254–266, Bangkok, Thailand,
  August 2024. Association for Computational Linguis-               Hao, S., Sukhbaatar, S., Su, D., Li, X., Hu, Z., Weston,
  tics. doi: 10.18653/v1/2024.acl-long.16. URL https:                 J., and Tian, Y. Training large language models to
  //aclanthology.org/2024.acl-long.16/.                               reason in a continuous latent space. arXiv preprint
                                                                      arXiv:2412.06769, 2024.
Das, P., Chaudhury, S., Nelson, E., Melnyk, I., Swami-
  nathan, S., Dai, S., Lozano, A. C., Kollias, G., Chen-            He, Z., Karlinsky, L., Kim, D., McAuley, J., Krotov, D.,
  thamarakshan, V., Navrátil, J., Dan, S., and Chen, P.              and Feris, R. Camelot: Towards large language models

                                                               10
                              M+: Extending MemoryLLM with Scalable Long-Term Memory

  with training-free consolidated associative memory. arXiv          Rakotonirina, N. C. and Baroni, M. Memoryprompt: A light
  preprint arXiv:2402.13449, 2024.                                     wrapper to improve context tracking in pre-trained lan-
                                                                       guage models. arXiv preprint arXiv:2402.15268, 2024.
Hu, C., Fu, J., Du, C., Luo, S., Zhao, J., and Zhao, H.
  Chatdb: Augmenting llms with databases as their sym-               Simoulin, A. and Crabbé, B. How many layers and why?
  bolic memory. arXiv preprint arXiv:2306.03901, 2023.                 an analysis of the model depth in transformers. In Pro-
Jawahar, G., Sagot, B., and Seddah, D. What does bert                  ceedings of the 59th Annual Meeting of the Association
  learn about the structure of language? In ACL 2019-57th              for Computational Linguistics and the 11th International
  Annual Meeting of the Association for Computational                  Joint Conference on Natural Language Processing: Stu-
  Linguistics, 2019.                                                   dent Research Workshop, pp. 221–228, 2021.

Khandelwal, U., Levy, O., Jurafsky, D., Zettlemoyer, L.,             Wang, W., Dong, L., Cheng, H., Liu, X., Yan, X., Gao, J.,
  and Lewis, M. Generalization through memorization:                  and Wei, F. Augmenting language models with long-term
  Nearest neighbor language models. arXiv preprint                    memory. arXiv preprint arXiv:2306.07174, 2023.
  arXiv:1911.00172, 2019.
                                                                     Wang, Y., Gao, Y., Chen, X., Jiang, H., Li, S., Yang, J., Yin,
Li, Y., Huang, Y., Yang, B., Venkitesh, B., Locatelli,
                                                                      Q., Li, Z., Li, X., Yin, B., Shang, J., and McAuley, J. J.
  A., Ye, H., Cai, T., Lewis, P., and Chen, D. Snapkv:
                                                                      MEMORYLLM: towards self-updatable large language
  LLM knows what you are looking for before generation.
                                                                      models. In ICML. OpenReview.net, 2024a.
  CoRR, abs/2404.14469, 2024. doi: 10.48550/ARXIV.
  2404.14469. URL https://doi.org/10.48550/                          Wang, Y., Han, C., Wu, T., He, X., Zhou, W., Sadeq, N.,
  arXiv.2404.14469.                                                   Chen, X., He, Z., Wang, W., Haffari, G., Ji, H., and
Modarressi, A., Köksal, A., Imani, A., Fayyaz, M., and               McAuley, J. J. Towards lifespan cognitive systems. CoRR,
 Schütze, H. Memllm: Finetuning llms to use an explicit              abs/2409.13265, 2024b.
 read-write memory. arXiv preprint arXiv:2404.11672,
 2024.                                                               Wang, Y., Liu, X., Chen, X., O’Brien, S., Wu, J., and
                                                                      McAuley, J. Self-updatable large language models with
Packer, C., Fang, V., Patil, S. G., Lin, K., Wooders, S., and         parameter integration. arXiv preprint arXiv:2410.00487,
  Gonzalez, J. E. Memgpt: Towards llms as operating                   2024c.
  systems. CoRR, abs/2310.08560, 2023.
                                                                     Wang, Y., Wu, R., He, Z., Chen, X., and McAuley,
Park, S. and Bak, J. Memoria: Resolving fateful forgetting
                                                                      J. Large scale knowledge washing. arXiv preprint
  problem through human-inspired memory architecture,
                                                                      arXiv:2405.16720, 2024d.
  2024.
Penedo, G., Kydlı́cek, H., Allal, L. B., Lozhkov, A.,                Wu, X., Xiao, L., Sun, Y., Zhang, J., Ma, T., and He, L. A
  Mitchell, M., Raffel, C., von Werra, L., and Wolf, T.               survey of human-in-the-loop for machine learning. Future
  The fineweb datasets: Decanting the web for the finest              Generation Computer Systems, 135:364–381, 2022a.
  text data at scale. CoRR, abs/2406.17557, 2024. doi:
  10.48550/ARXIV.2406.17557. URL https://doi.                        Wu, Y., Rabe, M. N., Hutchins, D., and Szegedy, C.
  org/10.48550/arXiv.2406.17557.                                      Memorizing transformers. In The Tenth International
                                                                      Conference on Learning Representations, ICLR 2022,
Pham, Q. H., Ngo, H., Luu, A. T., and Nguyen, D. Q. Who’s             Virtual Event, April 25-29, 2022. OpenReview.net,
  who: Large language models meet knowledge conflicts                 2022b. URL https://openreview.net/forum?
  in practice. arXiv preprint arXiv:2410.15737, 2024.                 id=TrjbxzRcnf-.
Raffel, C., Shazeer, N., Roberts, A., Lee, K., Narang, S.,
                                                                     Yang, H., Lin, Z., Wang, W., Wu, H., Li, Z., Tang, B., Wei,
  Matena, M., Zhou, Y., Li, W., and Liu, P. J. Explor-
                                                                       W., Wang, J., Tang, Z., Song, S., Xi, C., Yu, Y., Chen,
  ing the limits of transfer learning with a unified text-
  to-text transformer. J. Mach. Learn. Res., 21:140:1–                 K., Xiong, F., Tang, L., and E, W. Memory3 : Language
  140:67, 2020. URL https://jmlr.org/papers/                           modeling with explicit memory. CoRR, abs/2407.01178,
  v21/20-074.html.                                                     2024.

Rahman, C. M., Sobhani, M. E., Rodela, A. T., and                    Yin, Z., Sun, Q., Guo, Q., Zeng, Z., Cheng, Q., Qiu, X., and
  Shatabda, S.      An enhanced text compression ap-                   Huang, X. Explicit memory learning with expectation
  proach using transformer-based language models. CoRR,                maximization. In EMNLP, pp. 16618–16635. Association
  abs/2412.15250, 2024.                                                for Computational Linguistics, 2024.

                                                                11
                              M+: Extending MemoryLLM with Scalable Long-Term Memory

Zhang, X., Chen, Y., Hu, S., Xu, Z., Chen, J., Hao, M., Han,
  X., Thai, Z., Wang, S., Liu, Z., et al. ∞bench: Extending
  long context evaluation beyond 100k tokens. In Proceed-
  ings of the 62nd Annual Meeting of the Association for
  Computational Linguistics (Volume 1: Long Papers), pp.
  15262–15277, 2024.
Zhang, Z., Sheng, Y., Zhou, T., Chen, T., Zheng, L., Cai, R.,
  Song, Z., Tian, Y., Ré, C., Barrett, C. W., Wang, Z., and
  Chen, B. H2O: heavy-hitter oracle for efficient generative
  inference of large language models. In NeurIPS, 2023.
Zhong, W., Guo, L., Gao, Q., and Wang, Y. Memorybank:
  Enhancing large language models with long-term mem-
  ory. arXiv preprint arXiv:2305.10250, 2023.
Zhou, W., Jiang, Y. E., Cui, P., Wang, T., Xiao, Z., Hou,
  Y., Cotterell, R., and Sachan, M. Recurrentgpt: Interac-
  tive generation of (arbitrarily) long text. arXiv preprint
  arXiv:2305.13304, 2023.




                                                                12
                                    M+: Extending MemoryLLM with Scalable Long-Term Memory

A. Justifications of using deepspeed-stage-2
Eight A100 GPUs support the following configurations:

  • Full fine-tuning with an 8k context window using Fully Sharded Data Parallel (FSDP).

  • 6k context window with full attention using deepspeed-stage-2.

  • 32k context window with full attention using accelerate and deepspeed-stage-3-offload. However,
    saving models in this configuration encountered version incompatibility issues and we haven’t found solutions online.

Based on these trails, we do not scale up the model with deepspeed-stage-3-offload or FSDP, but choose to use
deepspeed-stage-2 and set the cross-attention to be of the shape 2048 by 14848.

B. Experiments on datasets NaturalQA
B.1. Knowledge Retention Experiments on NaturalQA
The results of knowledge retention experiments on NaturalQA are shown in Figure 8.

                                  0.8
                                                                                 M+
                                  0.7                                            MemoryLLM-7B
                                                                                 Llama-3.1-8B-SnapKV
                                  0.6                                            Borderline (0.2)
                       Accuracy
                                  0.5
                                  0.4
                                  0.3
                                  0.2
                                         10
                                         20
                                         30
                                         40
                                         50
                                         60
                                         70
                                         800kk
                                             k
                                             k
                                             k
                                             k
                                             k
                                             k
                                         90
                                        10
                                        11 0k
                                           0
                                        12 k
                                           0
                                        13 k
                                           0
                                        14 k
                                           0
                                        15 k
                                           0
                                        16 k
                                           0kk
                                             k

                                         Figure 8. Knowledge Retention Results on NaturalQA.


B.2. Ablation Study on NaturalQA
The results of ablation study on NaturalQA are shown in Figure 9.


                                  0.7                                   M+ (Stage 3)
                                                                        MemoryLLM-8B-Long (Stage 2)
                                  0.6                                   MemoryLLM-8B-Attn
                                                                        Borderline (0.2)

                       Accuracy
                                  0.5
                                  0.4
                                  0.3
                                  0.2
                                         10
                                         20
                                         30
                                         40
                                         50
                                         60
                                         70
                                         800k
                                            k
                                            k
                                            k
                                            k
                                            k
                                            k
                                            k
                                         90
                                        10
                                        110k
                                          0
                                        12 k
                                          0
                                        13 k
                                          0
                                        14 k
                                          0
                                        15 k
                                          0
                                        16 k
                                          0kk
                                            k

                                            Figure 9. Ablation Study on NaturalQA dataset.


                                                                 13
                                      M+: Extending MemoryLLM with Scalable Long-Term Memory

C. Statistics of the Dataset of Long Documents
We go through the whole dataset SlimPajama-627B and extract all dataset that have more than 4k tokens using the tokenizer
of Llama-3.1-8B. The statistics are shown in Table 4. We show six categories here (4k-8k, 8k-16k,16k-32k,32k-64k,64k-
128k,128k+) but we only use the data within the first four categories (4k-8k, 8k-16k,16k-32k,32k-64k). This is because the
examples longer than 64k are mainly from the category Book and lack diversity.

 Range      Total             CommonCrawl              GitHub               ArXiv                   C4        StackExch.         Wikipedia              Book
 4k–8k      11,189,999     7,759,741 (69.35%)   692,224 (6.19%)    286,537 (2.56%)   1,825,018 (16.31%)   142,457 (1.27%)   481,854 (4.31%)     2,168 (0.02%)
 8k–16k     4,706,687      3,273,619 (69.55%)   270,369 (5.74%)   550,192 (11.69%)      439,143 (9.33%)    20,284 (0.43%)   146,545 (3.11%)     6,535 (0.14%)
 16k–32k    1,607,064        968,714 (60.28%)    95,445 (5.94%)   423,401 (26.35%)       70,223 (4.37%)     1,510 (0.09%)    34,323 (2.14%)    13,448 (0.84%)
 32k–64k    443,438          224,168 (50.55%)    32,653 (7.36%)   146,582 (33.06%)        3,413 (0.77%)       102 (0.02%)     5,940 (1.34%)    30,580 (6.90%)
 64k–128k   192,515           72,583 (37.70%)    11,753 (6.10%)    27,942 (14.51%)           38 (0.02%)         5 (0.00%)       507 (0.26%)   79,687 (41.39%)
 128k+      98,097            23,721 (24.18%)     4,523 (4.61%)      5,167 (5.27%)            0 (0.00%)         2 (0.00%)        49 (0.05%)   64,635 (65.89%)


                         Table 4. Number of examples by sequence-length range and source (counts and percentages).



D. Additional Training Details
In our training, we follow MemoryLLM (Wang et al., 2024a) and design three sub-tasks:

   • Two-Chunk Training: Given a document split into two chunks (x1 , x2 ), we inject x1 into the memory and update the
     transformer ϕ using the loss on x2 . Notably, we retain the gradients across both forward passes.

   • Multi-Chunk Training: For documents with multiple chunks (x1 , . . . , xn ), we inject x1 , . . . , xn−1 into the memory
     while detaching gradients, then update ϕ using the loss on xn .

   • Revisiting Cached Chunks: Since the memory is continually updated during training, we cache the last chunk xn
     of earlier documents and revisit it periodically. When revisiting xn , there are already many chunks injected between
     x1 , · · · , xn−1 and xn . We denote the number of injected chunks between xn−1 and xn as revisit distance. We carefully
     tune the probability of deleting and updating the cache after each training step, and we manage to maintain the average
     revisit distance to be around 60 for Stage 1 & Stage 2, and maintain the average distance to be around 200 for Stage 3.

E. Discussions
E.1. Similarities to Attention-Based Retrieval Methods
In M+, we use a co-trained retriever to retrieve the hidden states. In this process, we acknowledge that our method shares
some similarities with prior approaches that use attention to retrieve keys and values. However, there are critical differences
that make our approach unique and practically advantageous:

   • Efficiency: Methods such as SnapKV maintain and retrieve key-value pairs per head, which becomes extremely
     costly when scaled. In our setting—with 32 layers and 32 attention heads per layer—this requires 1024 retrievals per
     query, resulting in significant latency (as noted in line 59 of our paper). In contrast, M+ uses a co-trained retriever
     to retrieve memory tokens, which are compressed hidden states. This results in only 32 total retrievals—one per
     layer—dramatically reducing both computational cost and latency.

   • Performance: In Figure 6, the curve labeled MemoryLLM-8B-Attn follows the SnapKV-style approach of retrieving
     key-value pairs using attention per head. As shown in the figure, it performs substantially worse than M+, highlighting
     that our co-trained retriever not only improves efficiency but also yields better results in practice compared with
     attention-based retrievals.

   • Design: Note that our training setup includes both relevant and irrelevant documents (See details in Appendix D),
     making it well-suited for contrastive learning. This allows us to effectively train the retriever, which integrates naturally
     into our overall training framework.

                                                                             14
                             M+: Extending MemoryLLM with Scalable Long-Term Memory

E.2. The Form of Long-Term Memory (Hidden States vs. KV)
In our work, we choose the use hidden states as the latent-space memory instead of key-value (KV) caches. This is based on
the following two considerations:

  • Compression Efficiency: As detailed in the paper, we compress each 512-token chunk into 256 memory vectors per
    layer in a lossless manner. In contrast, KV-based methods often require downsampling—e.g., dropping half the keys
    and values—to control memory size, resulting in unavoidable information loss.

  • Retrieval Efficiency and Performance: As described above, hidden states can be effectively retrieved using our
    co-trained retriever, requiring only 32 retrievals for each query. In contrast, a KV-cache approach would demand up to
    1024 retrievals, significantly increasing computational cost. Furthermore, as shown in Figure 6, using hidden states
    yields better performance compared to using KV caches.

E.3. Latency and Memory Consumption while Scaling
We aim to discuss the scalability of M+ by analysing the latency and memory consumption when scaling up. Theoretically,
the end-to-end retrieval latency scales linearly with three key variables:

(1) Hidden size of the retriever, denoted by d. In M+, we set d = 256, whereas the base model uses d = 4096.

(2) Size of long-term memory, denoted by s. We cap this at 150k entries.

(3) Number of transformer layers, denoted by L. For LL A MA-3-8B, L = 32.

Hence,
                                                    latency ∝ d s L.

Because we hold the long-term memory size s fixed when scaling the model, s is effectively a constant:


                                                    latency ∝ d L.

Both d and L grow with the model size M , following

                                                       M ∝ d L,

which implies a linear relationship between retrieval latency and model size:

                                                     latency ∝ M.


Concrete Example Scaling from LL A MA-3-8B (d = 4096, L = 32) to LL A MA-3-70B (d = 8192, L = 80) yields

                                                    8192 × 80
                                                              = 5,
                                                    4096 × 32

i.e. a ∼ 5× increase in retrieval latency. For comparison, the parameter count rises by 70B
                                                                                         8B ≈ 8.75×, showing that latency
scales roughly linearly—rather than quadratically—with model size.

Memory Consumption The extra memory overhead from our method arises solely from the introduced memory tokens.
This overhead also scales linearly with both d and L; thus, the move from LL A MA-3-8B to LL A MA-3-70B incurs an
analogous ∼ 5× increase in memory usage, mirroring the latency scaling.

                                                           15
                              M+: Extending MemoryLLM with Scalable Long-Term Memory

E.4. FLOPs Comparison
We report the total FLOPs for generating one token after processing a sequence of varying lengths (from 2k to 128k), using
a single H100 GPU. We employ the torch.profiler library to capture FLOPs during inference. The results are as
follows:

                                  Sequence Length       LLaMA-3.1-8B            M+
                                         2048             5.68 × 1013      6.92 × 1013
                                         4096             1.13 × 1014      1.32 × 1014
                                         8192             2.26 × 1014      2.55 × 1014
                                        16384             4.48 × 1014      5.01 × 1014
                                        32768             8.88 × 1014      9.86 × 1014
                                        65536             1.75 × 1015      1.94 × 1015
                                        131072               OOM           3.78 × 1015

From the results, we observe that M+ and LLaMA-3.1-8B exhibit comparable FLOPs across all tested sequence lengths.
Notably, while LLaMA-3.1-8B runs out of memory (OOM) at the 128k setting, M+ remains functional, highlighting its
superior scalability for long-context inference.

E.5. Interpretability of Memory Vectors
Our memory vectors can be viewed as hidden states within the transformer layers, with the key difference being that they
may store more compressed information due to their persistent role across sequences. As such, the type of information they
capture should be similar to the representations observed in the intermediate layers of a transformer when processing text.
Across layers, we hypothesize that the memory vectors follow a similar pattern to what has been reported in prior work on
transformer interpretability (Jawahar et al., 2019; Simoulin & Crabbé, 2021):

  • Lower layers tend to encode more surface-level features,

  • Higher layers tend to encode more semantic or abstract information.

Regarding long-term memory, it is constructed by randomly dropping vectors from the short-term memory and storing
them for extended use. Importantly, long-term memory vectors are structurally identical to short-term ones. This means
that, at any point, swapping a vector between long-term and short-term memory has no immediate effect on model behavior.
In essence, the long-term memory acts as a cache that helps memory vectors persist over time rather than being overwritten
too quickly.




                                                            16
