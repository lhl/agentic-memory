<!-- Generated from arxiv-2602.10715.pdf via pdftotext -layout on 2026-02-22 -->

                                                            Locomo-Plus: Beyond-Factual Cognitive Memory
                                                                Evaluation Framework for LLM Agents

                                               Yifei Li1      Weidong Guo2 Lingling Zhang1 Rongman Xu1                                            Muye Huang1
                                                                   Hui Liu2 Lijiao Xu2 Yu Xu2 Jun Liu1
                                                                      1
                                                                        Xi’an Jiaotong University 2 Tencent
                                                                           yifeilee@stu.xjtu.edu.cn



                                                               Abstract                                 Biological memory exhibits rich associative capacity.
                                             Long-term conversational memory is a core ca-                    Go with the                             Got it — cappuccino,




arXiv:2602.10715v1 [cs.CL] 11 Feb 2026
                                             pability for LLM-based dialogue systems, yet                     previous one.                           double sugar.

                                             existing benchmarks and evaluation protocols                    Let's meet at                             Okay, see you
                                             primarily focus on surface-level factual recall.                our usual place.                          at the café.

                                             In realistic interactions, appropriate responses
                                             often depend on implicit constraints such as
                                             user state, goals, or values that are not explic-
                                                                                                      Evaluation                Normative Memory Scope            Beyond-Factual,
                                             itly queried later. To evaluate this setting, we         Focused on                                                  Cognitive Memory
                                                                                                                                     Expand the
                                             introduce LoCoMo-Plus, a benchmark for as-               Factual Recall               Evaluation Scope               Evaluation
                                             sessing cognitive memory under cue–trigger
                                                                                                                                        Current
                                             semantic disconnect, where models must re-
                                             tain and apply latent constraints across long
                                             conversational contexts. We further show that                                      Memory Benchmark
                                             conventional string-matching metrics and ex-
                                             plicit task-type prompting are misaligned with          Figure 1: Illustration of the gap between factual memory
                                             such scenarios, and propose a unified evalua-           evaluation and the richer associative nature of biologi-
                                             tion framework based on constraint consistency.         cal memory, motivating the expansion toward beyond-
                                             Experiments across diverse backbone models,             factual cognitive memory benchmarks.
                                             retrieval-based methods, and memory systems
                                             demonstrate that cognitive memory remains
                                             challenging and reveals failures not captured by
                                             existing benchmarks. Our code and evaluation            et al., 2019; Xu et al., 2022; Maharana et al., 2024;
                                             framework are publicly available at: https:             Pan et al., 2025). In particular, LoCoMo evalu-
                                             //github.com/xjtuleeyf/Locomo-Plus.                     ates memory under long-context interference and
                                                                                                     diverse reasoning demands, including multi-hop,
                                         1   Introduction                                            temporal, commonsense, and adversarial queries
                                         Long-term conversational memory is becoming a               (Maharana et al., 2024). These benchmarks are
                                         core capability of modern chatbot systems. As               valuable for revealing performance degradation
                                         large language models are increasingly deployed             as dialogue length increases. However, as illus-
                                         as persistent assistants rather than single-turn re-        trated in Figure 1, they largely equate conversa-
                                         sponders, they are expected to remember prior in-           tional memory with explicit factual recall, where
                                         teractions, adapt to user context, and behave consis-       relevant information is clearly stated earlier and
                                         tently over time. This trend is reflected in both in-       later queried with strong semantic alignment. This
                                         dustrial agent designs and recent academic surveys          formulation enables scalable evaluation, but cap-
                                         on memory-augmented LLMs (OpenAI, 2025; An-                 tures only a limited subset of memory behaviors in
                                         thropic, 2025; Wu et al., 2025). Effective memory           natural conversations.
                                         reduces repeated cold starts, supports personaliza-           In realistic interactions, memory often constrains
                                         tion, and is essential for practical conversational         behavior rather than answering explicit factual
                                         AI.(Zhang et al., 2025; Hua et al., 2025)                   queries.(Zheng et al., 2025) Information is fre-
                                            Existing benchmarks have made progress toward            quently conveyed implicitly, and later responses
                                         evaluating long-term memory by extending ques-              depend on inferred goals or constraints, a view
                                         tion answering to long dialogue contexts (Reddy             consistent with findings from cognitive science

                                                                                                 1
and neuroscience (Amodio, 2019; Hoskins, 2024).                   periments across diverse backbone models,
Consider a simple example: earlier in a conversa-                 retrieval-based methods, and memory sys-
tion, a user states that they are preparing for an                tems.
important exam and want to minimize distractions.
Much later, after many unrelated turns, the user            2     Related Work
asks, “Should I start watching that new TV series
                                                            2.1    Benchmarks for Long-Term Memory
everyone is talking about?” There is no explicit
fact to recall, and multiple answers may appear             Existing benchmarks and methods for long-term
reasonable in isolation. Yet appropriate behavior           conversational memory mainly encourage models
depends on whether the assistant remembers the              to retain and retrieve information that is explic-
earlier goal and recognizes the conflict with the           itly stated in earlier dialogue turns. Conversational
new request. Such cases cannot be evaluated by              QA and extended dialogue benchmarks typically
surface-level matching, but require assessing con-          rely on semantic alignment between past context
sistency with implicit conversational constraints.          and the current query, framing memory as a re-
Existing benchmarks do not meaningfully test this           trieval problem (Reddy et al., 2019; Xu et al., 2022;
setting.                                                    Maharana et al., 2024; Pan et al., 2025). Simi-
   In this work, we address this gap by revisiting          larly, memory-augmented conversational agents
both benchmark design and evaluation. We in-                often extract, summarize, or retrieve salient content
troduce L O C O M O -P LUS, a benchmark that tar-           from dialogue history to generate history-aware re-
gets beyond-factual conversational memory by                sponses. (Packer et al., 2023; Zhong et al., 2024;
constructing long-context instances where correct           Rasmussen et al., 2025; LlamaIndex Team, 2023;
behavior depends on retaining and applying im-              LangChain Team, 2023) Under this common setup,
plicit constraints under cue–trigger semantic dis-          relevant information is assumed to be directly ref-
connect. We further show that common evaluation             erencable or semantically matchable, which limits
practices—such as task-disclosed prompting and              coverage of more implicit conversational signals,
string-matching metrics—can be systematically               such as user state, goals, or preferences.
misleading, even for factual memory, by conflating
memory fidelity with prompt adaptation and gener-           2.2    Evaluation Metrics and Comparability
ation style (Novikova et al., 2017; Post, 2018). To         Conversational memory is commonly evaluated
address this issue, we propose a unified evaluation         using generation-based metrics such as BLEU,
framework based on constraint consistency rather            ROUGE, exact match, and token-level F1 (Pap-
than surface overlap. Our experiments demonstrate           ineni et al., 2002; Lin, 2004; Post, 2018; Rajpurkar
that current LLMs and memory-augmented sys-                 et al., 2018). However, these metrics are known
tems struggle severely under this setting, indicating       to poorly reflect semantic correctness and behav-
that meaningful progress on conversational mem-             ioral validity in open-ended generation (Novikova
ory requires rethinking benchmarks and evaluation.          et al., 2017; Post, 2018; Bulian et al., 2022). This
   In summary, our contributions are as follows:            issue becomes more severe in long-term conversa-
                                                            tional settings, where multiple responses can satisfy
   • We identify a critical limitation in existing
                                                            the same memory requirement while differing in
     conversational memory benchmarks, which
                                                            surface form. Recent work explores LLM-based
     primarily focus on explicit factual recall and
                                                            judges to improve comparability across models and
     fail to capture beyond-factual cognitive mem-
                                                            generation styles (Zheng et al., 2023; Li et al., 2024,
     ory grounded in implicit constraints.
                                                            2025), but evaluation still largely focuses on ex-
   • We introduce LoCoMo-Plus, a benchmark                  plicit answer correctness. Consequently, the assess-
     designed to evaluate cognitive memory under            ment of implicit and cognitively grounded memory
     cue–trigger semantic disconnect, where mod-            behaviors remains limited.
     els must retain and apply latent constraints           3     Problem Definition
     across long conversational contexts.
                                                            We study the evaluation of long-term conversa-
   • We revisit conversational memory evaluation            tional memory in LLM-based systems. In realistic
     and propose a unified, constraint-consistency-         interactions, an agent must not only recall previ-
     based framework, supported by extensive ex-            ously mentioned information, but also retain and

                                                        2
Dataset Coverage (QA Count)
                                                                                                  Cognitive Memory Composition
                              800
                              600            LoCoMo (Existing Benchmark)            LoCoMo-Plus Causal                          State
                                                                                     Extension
                              400
                              200
                                0                                                                     Goal                      Value
                                   e-hop Multi-hop Temporal monsense dversarial Cognitive
                              Singl                    Com          A
      Figure 2: Cognitive memory in LoCoMo-Plus. Left: distribution of original LoCoMo question types and the
      additional cognitive memory QA instances introduced in LoCoMo-Plus. Right: cognitive memory is decomposed
      into four latent constraints—causal, state, goal, and value.


      utilize knowledge accumulated over extended dia-                              A response is considered correct if it lies within
      logue histories to guide future behavior. This chal-                          Ac , regardless of surface form.
      lenge is amplified in long-context settings, where                               As illustrated in Figure 2, we further decom-
      relevant signals are sparse, temporally distant, and                          pose cognitive memory into four interacting compo-
      interleaved with irrelevant content.                                          nents: causal, state, goal, and value, which jointly
         Formally, given a multi-turn interaction history                           shape appropriate behavior in long-term conversa-
      H = {u1 , a1 , . . . , ut , at } and a subsequent user                        tions.
      query qt+1 , a system produces a response at+1 .
      The evaluation objective is to assess whether the                             Dataset Distribution and Coverage. We con-
      system effectively leverages information from H                               struct a benchmark with explicit coverage over both
      when generating at+1 .                                                        factual and cognitive memory behaviors. As shown
                                                                                    in Figure 2, cognitive cases in LoCoMo-Plus are
      Level-1 Factual Memory. Most existing bench-                                  intentionally limited and treated as a higher-level
      marks evaluate Level-1 Factual Memory, where                                  evaluation axis rather than fine-grained factual vari-
      relevant information is explicitly stated in the inter-                       ants. Due to their higher generation and verifica-
      action history and can be directly recalled or rea-                           tion cost, we prioritize diagnostic coverage over
      soned over. This category includes both localized                             scale. Representative cognitive memory cases are
      object-centric facts and event-oriented episodic                              provided in Appendix C.
      information. Each query admits a well-defined
      ground-truth answer y ∗ , and correctness is typically                        4   Benchmark Construction
      determined by string-based or semantic similarity
      between at+1 and y ∗ .                                                        LoCoMo-Plus is designed to evaluate cognitive
                                                                                    memory under cue–trigger semantic disconnect,
      Level-2 Cognitive Memory. In contrast, realistic                              where a system must preserve and apply latent
      conversations often depend on implicit constraints                            user- or speaker-specific information (e.g., inferred
      inferred from prior interactions, such as user state,                         state, goal, or value) even when the downstream
      goals, preferences, values, or causal context. We                             query is not semantically similar to the original cue.
      refer to the ability to retain and apply these latent,                        Unlike original LoCoMo instances that primarily
      behaviorally constraining signals as Level-2 Cog-                             test explicit factual recall, LoCoMo-Plus instances
      nitive Memory.                                                                are constructed from scratch as cue–trigger pairs
         Unlike Level-1 memory, Level-2 memory does                                 and then embedded into long conversational trajec-
      not admit a single ground-truth response. Instead,                            tories, preserving realistic dialogue structure and
      the interaction history induces a latent constraint                           long-context interference. Figure 3 illustrates the
      c that restricts the space of behaviorally valid out-                         overall construction pipeline, which incrementally
      puts:                                                                         transforms raw cue dialogues into validated cue–
                                                                                    trigger instances through a sequence of generation,
                                    Ac = {a | a is consistent with c}.              filtering, and validation stages.

                                                                                3
                                       Process Layer                                              Evaluation
   Implicit Dialogue   Memory-Worthy      Cue-Query            Semantic        Cue Memory                  Cue Dialogue
                                                                                                           Trigger Query
     Generation          Verifcation     Construction          Filtering     Elicitation Check
                                                                                                           Time Gap


                                                                                                  Chat
                                                                                                 History



                                                                                                                 Memory
                                                                                                                  System




                𝑐!              𝑐"
                                       (𝑐", 𝑞, 𝑡)!           (𝑐", 𝑞, 𝑡)"      (𝑐", 𝑞, 𝑡)$
                                                                                                                 Response
                                       Result Layer

        Figure 3: LoCoMo-Plus benchmark construction pipeline with aligned process and result layers.


4.1   Implicit Cue Dialogue Generation                      4.4     Semantic Filtering

We first prompt an LLM to generate short dialogue           To avoid shortcut solutions based on surface-level
snippets that implicitly convey memory-relevant             overlap, we filter out cue–query pairs with high
information about one participant. The conveyed             lexical or semantic similarity. Specifically, we ap-
information reflects underlying state, goal, pref-          ply BM25 (Amati, 2009) and MPNet-based (Song
erence, constraint, or value, and is expressed in           et al., 2020) similarity scoring to remove cases
natural conversational form rather than as explicit         where the cue is repeated, paraphrased, or directly
facts. This stage produces a pool of candidate cue          recoverable from the query alone. The remaining
dialogues c0 .                                              pairs form the filtered set (c1 , q, t)1 .

                                                            4.5     Cue Memory Elicitation Validation
4.2   Memory-Worthy Verification
                                                            A final round of human validation ensures that each
Generated cues are manually verified to retain only         remaining cue–trigger pair genuinely elicits mem-
memory-worthy instances. A cue is considered                ory usage. Annotators verify that producing a help-
memory-worthy if it conveys persistent or behav-            ful response requires recalling and applying infor-
iorally constraining information, cannot be trivially       mation from the cue through an implicit constraint,
inferred from local context alone, and would plau-          rather than relying on surface similarity. Only vali-
sibly benefit a conversational assistant if remem-          dated instances are retained, forming the final set
bered. Cues failing these criteria are discarded,           (c1 , q, t)2 .
yielding a verified set c1 .

                                                            4.6     Insertion into LoCoMo Dialogues
4.3   Cue–Trigger Query Construction
                                                            Each validated instance (c1 , q, t)2 is embedded into
Given a verified cue c1 , we prompt an LLM to gen-          a selected long dialogue trajectory from LoCoMo
erate a downstream trigger query q whose correct            by inserting the cue and placing the corresponding
resolution depends on the cue, while maintaining            trigger query after a gap consistent with t. The
low surface-level semantic similarity. The query            resulting examples require models to retain and
is underspecified in isolation, such that multiple          utilize cue information despite intervening turns
responses may appear reasonable without the cue,            and distractors.
but only cue-consistent responses are valid. Each
cue–query pair is additionally assigned a temporal          Implementation Details. Additional details on
gap indicator t, specifying the distance between cue        models, prompting strategies, annotation guide-
and trigger when embedded into a long dialogue.             lines, and filtering criteria are provided in Ap-
This produces preliminary tuples (c1 , q, t)0 .             pendix A.

                                                        4
                                                                                           This formulation conditions model behavior on
 Query + Task-Type Instruction                          Unified Conversational Query
                                                                                           task identity, encouraging task-specific response
                              Prompt Bias: task type is                                    strategies instead of implicit recall from prior dia-
                              explicitly revealed to the model
                                                                                           logue. (Perez et al., 2021; Min et al., 2022) Conse-
    Model / Memory System                                  Model / Memory System
                                                                                           quently, different memory tasks elicit qualitatively
                                                                                           different answering behaviors even for the same
                                   Length Bias:                                            model.
           Model Output            similarity metrics             Model Output                This design breaks comparability across task cat-
                                   favors reference
                                   length                                                  egories. Performance differences may reflect sen-
                                                   Check for                               sitivity to task prompts rather than differences in
      Distance/                                   Inclusion in
      Similarity                                  Valid Space                              memory capability. Moreover, such task disclosure
     Measurement                                                        Valid Answer
                                   Ground                                                  does not reflect natural conversational use, where
                                                                           Space
                                    Truth                                                  users do not announce that a query requires recall-
    Effective for factual tasks,
    but assumes a narrow                         Even factual tasks admit
    correct answer                               multiple valid answer
                                                                                           ing earlier information. (Reddy et al., 2019; Xu
                                                                                           et al., 2022)
Figure 4: Conceptual comparison between the exist-                                         5.2   Output-Side Assumptions:
ing evaluation framework and the proposed evaluation                                             Generation-Based Metrics
paradigm for conversational memory.
                                                                                           On the output side, LoCoMo relies on string-
                                                                                           matching-based metrics to compare model outputs
5       Evaluation Framework                                                               with a reference answer. These metrics assume
                                                                                           that correctness can be determined by surface-level
Existing LoCoMo-style benchmarks evaluate long-                                            overlap. (Bulian et al., 2022; Novikova et al., 2017)
term conversational memory by extending ques-                                                 In conversational memory settings, this assump-
tion answering paradigms to long dialogue con-                                             tion does not hold. Multiple valid responses may
texts. (Maharana et al., 2024) In practice, queries                                        satisfy the same memory constraint while receiving
are augmented with explicit task-type instructions                                         different scores. (Bulian et al., 2022; Post, 2018)
(e.g., indicating that a query tests memory), and                                          At the same time, modern LLMs exhibit diverse
model outputs are evaluated using generation-based                                         generation behaviors in terms of verbosity, rea-
metrics such as exact match, token-level F1, or n-                                         soning style, and response length. As a result,
gram overlap with a reference answer. (Rajpurkar                                           generation-based metrics systematically bias com-
et al., 2018; Lin, 2004; Post, 2018) This design                                           parisons across models, conflating memory fidelity
enables scalable evaluation under long context, but                                        with surface realization. (Zheng et al., 2023; Li
also introduces strong inductive biases. (Perez et al.,                                    et al., 2024)
2021; Min et al., 2022)
   When applied to modern large language mod-                                              5.3   Constraint-Consistency Evaluation
els, this evaluation setup systematically distorts                                         To address these limitations, we reformulate
what is measured as memory performance. By                                                 LoCoMo-style evaluation around constraint con-
disclosing task intent at the input side and rely-                                         sistency. Queries are presented as natural contin-
ing on surface-form matching at the output side,                                           uations of the dialogue without explicit task dis-
the evaluation increasingly reflects models’ adap-                                         closure. Rather than scoring surface-form overlap
tation to task prompts and generation styles rather                                        against a single reference, we evaluate whether a
than their ability to retain and apply conversational                                      model’s response satisfies the implicit constraint
context. (Perez et al., 2021; Min et al., 2022; Shi                                        induced by the cue.
et al., 2023) As a result, the reported performance                                           Under this formulation, correctness is defined
can be misleading, undermining both cross-task                                             as membership in a valid response space, allow-
and cross-model comparability. Figure 4 illustrates                                        ing multiple acceptable realizations. By jointly re-
these effects.                                                                             moving task disclosure and decoupling evaluation
                                                                                           from generation style (Zheng et al., 2023; Li et al.,
5.1        Input-Side Assumptions: Task Disclosure
                                                                                           2025), we further decouple task formulation from
On the input side, LoCoMo-style evaluation ex-                                             judgment criteria and employ task-specific evalu-
plicitly specifies the task type before each query.                                        ation aligned with the reasoning demands of each

                                                                                       5
 Method                                          LoCoMo (Factual Memory)                              LoCoMo-Plus   Gap
                           single-hop   multi-hop   temporal    commonsense   adversarial   average
 Open Source LLM
 Qwen2.5-3B-Instruct         68.25       38.65       18.38         48.44        11.69       42.20        10.82      31.38
 Qwen2.5-7B-Instruct         70.72       39.54       21.81         37.50        20.22       45.31         9.57      35.74
 Qwen2.5-14B-Instruct        76.33       48.23       38.94         57.29        68.09       63.45        19.24      44.21
 Qwen3-4B                    69.52       46.10       33.33         55.21        48.76       54.91        15.70      39.21
 Qwen3-8B                    69.34       43.79       39.88         59.90        53.48       56.86        17.68      39.18
 Qwen3-14B                   65.96       46.45       53.89         59.38        60.45       59.65        19.09      40.56
 Close Source LLM
 gpt-5-nano                  75.00       54.08       50.16         73.96        17.53       54.96        14.84      40.12
 gpt-4.1                     80.30       53.90       58.88         72.92        37.30       62.21        18.63      43.58
 gpt-4o                      78.13       52.30       45.79         69.79        48.99       62.99        21.05      41.94
 gemini-2.5-flash            77.71       54.26       66.04         66.67        65.84       69.25        24.67      44.58
 gemini-2.5-pro              77.83       52.48       73.83         63.54        73.03       71.78        26.06      45.72
 RAG-based Methods (GPT-4o)
 Text-ada-embedding-002      40.00       16.73       37.81         15.73        49.44       37.38        13.91      23.47
 Text-embedding-small        39.17       17.79       34.69         14.61        51.90       37.23        12.29      24.94
 Text-embedding-large        49.76       22.78       40.00         21.35        59.73       45.32        15.55      29.77
 Memory Systems (GPT-4o)
 Mem0                        80.20       48.10       39.40         66.20        30.50       57.24        15.80      41.44
 SeCom                       77.60       50.90       42.30         71.40        31.80       57.53        14.90      42.63
 A-Mem                       76.90       55.60       49.30         68.10        35.20       59.64        17.20      42.44

Table 1: Overall performance of a wide range of models and memory systems on LoCoMo (factual memory) and
LoCoMo-Plus (cognitive memory), reported across task categories. The Gap column indicates the performance
drop from LoCoMo to LoCoMo-Plus.


task. This unified-input, differentiated-judgment                 Closed-Source LLMs. We evaluate proprietary
paradigm enables coherent and comparable assess-               large language models under the same full-context
ment across memory tasks and model families, cov-              input and output protocols, serving as strong ref-
ering both factual and cognitive memory.                       erence baselines for context-only conversational
   Empirical results supporting these claims are               modeling (Achiam et al., 2023; Team et al., 2023).
presented in section 6.3.
                                                                  RAG-based Methods. Retrieval-augmented
6     Experiments                                              baselines retrieve a fixed set of the top-5 most
6.1    Experimental Setup and Model Coverage                   relevant dialogue segments from an external
                                                               embedding-based memory store conditioned on the
We evaluate a broad range of conversational mem-
                                                               current query, and append them to the prompt for
ory methods on both LoCoMo and LoCoMo-Plus,
                                                               response generation. We evaluate retrieval using
corresponding to the factual memory and cognitive
                                                               three OpenAI embedding models. (OpenAI, 2024).
memory regimes defined in Section 3. All meth-
ods are evaluated under identical dialogue contexts
                                                                  Memory Systems. We evaluate three state-
and query formats, and are assessed using the same
                                                               of-the-art conversational memory systems: A-
output-side evaluation protocol.
                                                               Mem (Xu et al., 2025), which maintains and re-
Method Coverage. We evaluate methods span-                     trieves structured long-term memories through
ning four categories of conversational memory ap-              adaptive memory construction and retrieval;
proaches.                                                      Mem0 (Chhikara et al., 2025), which provides
   Open-Source LLMs. We evaluate instruction-                  a production-oriented memory abstraction with
tuned open-source language models that rely solely             scalable long-term storage and retrieval; and
on native context modeling, where the complete                 SeCom (Pan et al., 2025), which constructs
conversation history is provided as input without              segment-level memory units with compression-
any external retrieval or memory mechanism (Team               based denoising to improve retrieval accuracy in
et al., 2024; Yang et al., 2025).                              long-term conversations.

                                                          6
                                                                                 GPT-5-Nano (F1)               Gemini-2.5-Pro (F1)
6.2   Overall Performance and Main Findings
                                                               Task
                                                            Disclosure
Table 1 summarizes the overall performance of a
                                                               Unified
broad range of conversational memory methods on                             GPT-5-Nano (Judge)                Gemini-2.5-Pro (Judge)
both LoCoMo and LoCoMo-Plus. Across back-                      Task
                                                            Disclosure
bone models, retrieval-augmented pipelines, and                Unified
dedicated memory systems, a single and consistent                     0.0 0.2       0.4 0.6 0.8     1.0 0.0   0.2 0.4 0.6        0.8      1.0
                                                                    single-hop         multi-hop   temporal      commonsense           adversarial
pattern emerges: LoCoMo-Plus remains challeng-
ing for all evaluated methods.                              Figure 5: Comparison of task-disclosed and unified dia-
                                                            logue inputs across task types, evaluated with different
LoCoMo-Plus exposes a persistent and un-                    output-side assessment methods and model families.
resolved challenge. Regardless of backbone
strength, architectural design, or memory mecha-
nism, all methods exhibit a substantial performance
gap between LoCoMo and LoCoMo-Plus. This
gap persists even for the strongest and most re-
cent LLMs, as well as for systems explicitly de-
signed to enhance long-term memory. The con-
sistency of this degradation suggests that the dif-
ficulty of LoCoMo-Plus arises from the task for-
mulation itself—namely, preserving and applying
implicit constraints under cue–trigger semantic dis-
connect—rather than from specific modeling or en-           Figure 6: Traditional metric scores under different av-
gineering choices. Taken together, these results in-        erage generation lengths. Each line corresponds to a
dicate that cognitive conversational memory, as in-         metric, with markers indicating different models. The
stantiated in LoCoMo-Plus, remains an open prob-            dashed vertical line denotes the average ground-truth
                                                            length (5.18 tokens).
lem for current approaches.

Additional observations. While methods show
                                                            concentrates on temporal reasoning and adversar-
noticeable performance variation on the original
                                                            ial (hallucination-related) tasks, which receive dis-
LoCoMo benchmark, these variations become
                                                            proportionately higher scores under task-disclosed
markedly less pronounced under the LoCoMo-Plus
                                                            evaluation. These task categories are central to
setting. Across diverse modeling choices, relative
                                                            LoCoMo-style benchmarks, suggesting that re-
performance differences are compressed, reflecting
                                                            ported gains may partly reflect sensitivity to task
a convergence toward uniformly low performance
                                                            prompts rather than stable memory behavior. This
when implicit constraint preservation is required.
                                                            analysis indicates that task disclosure can bias the
                                                            measured ability profile, making task-wise compar-
6.3   Evaluation Bias Analysis
                                                            isons under LoCoMo-style evaluation less reliable.
We empirically verify that the evaluation assump-
tions discussed in Section 5 lead to systematic bi-         Length Bias. We analyze multiple traditional
ases when applied to modern large language mod-             generation-based metrics across different closed-
els. Figure 5 and Figure 6 illustrate how prompt dis-       source models and observe a clear dependence be-
closure and generation-based metrics distort mea-           tween metric scores and average output length. As
sured memory performance in practice.                       shown in Figure 6, EM, F1, BLEU (Papineni et al.,
                                                            2002), and ROUGE (Lin, 2004) all vary systemat-
Prompt Bias. To isolate the effect of task dis-             ically with the number of generated tokens, with
closure, we fix the base model and evaluation               scores peaking near the average ground-truth length
metric and compare task-wise ability distributions          and degrading as outputs become shorter or longer.
under task-disclosed and unified conversational             This behavior is expected given the formulation of
queries (Figure 5). Across both models and eval-            these metrics, which reward surface-level overlap
uation standards, explicitly revealing task iden-           and implicitly favor outputs whose length closely
tity leads to a pronounced shift in the task-wise           matches the reference. As a result, models with
performance distribution. Notably, the distortion           different generation styles are penalized or favored

                                                        7
                   Human1     Human2         LLM Judge                      1.Object Memory
      Human1          –        0.903           0.801                   Definition: Storing and recalling
      Human2        0.903        –             0.820                   explicit facts about objects.
      LLM Judge     0.801      0.820             –                  Case:
                                                                    Cue: I put my bike key in the drawer.
                                                                    Query: Where is my bike key?              PDR = 92.85% RTR = 96%
Table 2: Pairwise agreement between two human anno-
                                                                    Performance: Robust & Stable; sustains high precision across all turns.
tators and the LLM judge (gemini-2.5-flash). Agree-
ment is computed using normalized pairwise agreement                       2.Episodic Memory
scores under a shared evaluation protocol.                             Definition: Storing and recalling
                                                                       information about past events.

                   Qwen2.5                     Qwen3                Case:
                                                                    Cue: Celebrating my son's birthday.
 Judge       3B      7B      14B        4B       8B      14B        Query: Whose birthday was it?             PDR = 67.39% RTR = 72%
                                                                       Performance: Linear Decay; information density thins out over time.
 Judge 1   42.20    45.31    63.45     54.91    56.89    59.65
 Judge 2   45.24    48.64    62.77     56.94    58.54    60.37            3.Cognitive Memory
 |∆|        3.04    3.33     0.68      2.03      1.65    0.72          Definition: Implicit information
                                                                       that emerges through interaction and
                                                                       characterizes the user’s situation.
Table 3: Score stability across different judge backbones
                                                                    Case:
on the same set of response models. |∆| denotes the                 Cue: I’m on a diet to lose weight.
absolute score difference between Judge 1 and Judge 2.              Query: I want a late-night snack.         PDR = 5.88% RTR = 18%
                                                                    Performance: Rapid Collapse; fails abruptly as dialogue context grows.


based on length alone, regardless of semantic cor-                 Figure 7: Length sensitivity across (object / episodic /
rectness, introducing a systematic length bias in                  cognitive) memory under increasing dialogue context.
cross-model comparison.
                                                                   6.5       Length Sensitivity Analysis
6.4    Reliability of LLM-as-a-Judge.
                                                                   Figure 7 analyzes length sensitivity across object,
Notably, judging whether a response satisfies a                    episodic, and cognitive memory by varying the
given conversational constraint is substantially eas-              number of dialogue turns. For each memory type,
ier than generating the response itself. Prior studies             we evaluate 100 representative cases following the
have shown that even moderately strong general-                    distinction in Section 3.
purpose LLMs can perform reliably on such judg-                       Object memory remains robust as context grows,
ment tasks, with high consistency against human                    reflecting the stability of highly localized factual
annotations. (Zheng et al., 2023; Thakur et al.,                   recall. Episodic memory exhibits a steady degra-
2025) Nevertheless, we explicitly quantify judge                   dation pattern with increasing dialogue length, in-
robustness in our setting. We evaluate the reli-                   dicating increasing difficulty in recovering tempo-
ability of LLM-based judging along two dimen-                      rally distributed factual information.
sions: alignment with human judgment and stabil-                      In contrast, cognitive memory shows rapid per-
ity across judge backbones.                                        formance collapse as context length increases. This
   Table 2 shows strong agreement between the                      sharp disparity highlights that Level-2 cognitive
two human annotators, as well as high agreement                    memory is substantially more sensitive to long-
between each annotator and the LLM judge, in-                      context interference than Level-1 factual memory,
dicating that the LLM judge closely aligns with                    and is not adequately captured by benchmarks fo-
human evaluation.                                                  cused on explicit factual recall.
   Table 3 compares scores produced by two dif-
                                                                   7       Conclusion
ferent judge backbones (Gemini-2.5-Flash and
GPT-4o) on the same set of model responses.                        We show that long-term conversational memory
Across multiple response models, score differences                 evaluation fails when reduced to surface-form re-
remain small, suggesting that evaluation outcomes                  call. LoCoMo-Plus reframes memory assess-
are stable with respect to the choice of judge.                    ment as constraint consistency, revealing cognitive
   Details of the judge prompt, source annota-                     memory behaviors that existing benchmarks miss
tions, and agreement statistics are provided in Ap-                and enabling reliable evaluation through evidence-
pendix B.                                                          grounded LLM judges.

                                                               8
Limitations                                                  Giambattista Amati. 2009. BM25, pages 257–260.
                                                               Springer US, Boston, MA.
This work evaluates beyond-factual conversational
                                                             David M Amodio. 2019. Social cognition 2.0: An inter-
memory through implicit constraints under cue–                 active memory systems account. Trends in Cognitive
trigger semantic disconnect. While LoCoMo-Plus                 Sciences, 23(1):21–33.
extends the scope of existing memory benchmarks,
it is not intended to cover all forms of human mem-          Anthropic. 2025. Bringing memory to teams. https://
                                                               www.claude.com/blog/memory. Accessed: 2025-
ory or cognitive processes. The benchmark focuses              10.
on conversational settings where latent constraints
influence behavior, but does not model long-term             Jannis Bulian, Christian Buck, Wojciech Gajewski, Ben-
                                                                jamin Börschinger, and Tal Schuster. 2022. Tomayto,
belief revision, emotional dynamics, or multi-agent
                                                                tomahto. beyond token-level answer equivalence for
memory interactions. LoCoMo-Plus prioritizes di-                question answering evaluation. In Proceedings of the
agnostic value over scale. Its instances are carefully          2022 Conference on Empirical Methods in Natural
generated and validated to ensure genuine memory                Language Processing, pages 291–305.
usage, resulting in a dataset smaller than large-scale       Prateek Chhikara, Dev Khant, Saket Aryan, Taranjeet
factual QA benchmarks and unsuitable for training              Singh, and Deshraj Yadav. 2025. Mem0: Building
or fine-tuning large language models. Our evalu-               production-ready ai agents with scalable long-term
ation relies on LLM-based judges to assess con-                memory. arXiv preprint arXiv:2504.19413.
straint consistency. Although judge reliability is           Andrew Hoskins. 2024. Ai and memory. Memory, Mind
empirically examined, results may remain sensitive             & Media, 3:e18.
to the choice of judge model and prompt design.
                                                             Qishuo Hua, Lyumanshan Ye, Dayuan Fu, Yang Xiao,
Our experiments are limited to English-language                Xiaojie Cai, Yunze Wu, Jifan Lin, Junfei Wang,
conversations and a specific set of backbone mod-              and Pengfei Liu. 2025. Context engineering 2.0:
els, retrieval pipelines, and memory systems, leav-            The context of context engineering. arXiv preprint
ing broader generalization to future work.                     arXiv:2510.26493.

                                                             LangChain Team. 2023.     Conversation summary
Ethical Considerations                                         memory.     https://python.langchain.com/v0.
                                                               1/docs/modules/memory/types/summary/. Ac-
This work focuses on evaluation and does not in-               cessed: 2025-01.
troduce new model training procedures or deploy
                                                             Dawei Li, Bohan Jiang, Liangjie Huang, Alimohammad
systems in real-world applications. LoCoMo-Plus                Beigi, Chengshuai Zhao, Zhen Tan, Amrita Bhat-
is intended solely for research and diagnostic pur-            tacharjee, Yuxuan Jiang, Canyu Chen, Tianhao Wu,
poses. All dialogue content is synthetically gen-              and 1 others. 2025. From generation to judgment:
erated or adapted from existing benchmarks and                 Opportunities and challenges of llm-as-a-judge. In
                                                               Proceedings of the 2025 Conference on Empirical
contains no personal, sensitive, or identifiable in-           Methods in Natural Language Processing, pages
formation. The implicit constraints modeled (e.g.,             2757–2791.
goals or preferences) are abstract and not tied to
                                                             Haitao Li, Qian Dong, Junjie Chen, Huixue Su, Yu-
real users. While enhanced conversational mem-
                                                               jia Zhou, Qingyao Ai, Ziyi Ye, and Yiqun Liu.
ory may raise concerns related to privacy and user             2024. Llms-as-judges: a comprehensive survey
control, this work evaluates memory use within                 on llm-based evaluation methods. arXiv preprint
a controlled setting rather than promoting persis-             arXiv:2412.05579.
tent storage of user data. Questions regarding how           Chin-Yew Lin. 2004. Rouge: A package for automatic
memory should be stored, forgotten, or governed                evaluation of summaries. In Text summarization
in deployed systems are beyond the scope of this               branches out, pages 74–81.
paper.
                                                             LlamaIndex Team. 2023.   Chat memory buffer.
                                                               https://docs.llamaindex.ai/en/stable/
                                                               api_reference/memory/chat_memory_buffer/.
References                                                     Accessed: 2025-01.

Josh Achiam, Steven Adler, Sandhini Agarwal, Lama            Adyasha Maharana, Dong-Ho Lee, Sergey Tulyakov,
  Ahmad, Ilge Akkaya, Florencia Leoni Aleman,                  Mohit Bansal, Francesco Barbieri, and Yuwei Fang.
  Diogo Almeida, Janko Altenschmidt, Sam Altman,               2024. Evaluating very long-term conversational
  Shyamal Anadkat, and 1 others. 2023. Gpt-4 techni-           memory of llm agents. In Proceedings of the 62nd
  cal report. arXiv preprint arXiv:2303.08774.                 Annual Meeting of the Association for Computational


                                                         9
  Linguistics (Volume 1: Long Papers), pages 13851–           Freda Shi, Xinyun Chen, Kanishka Misra, Nathan
  13870.                                                        Scales, David Dohan, Ed H Chi, Nathanael Schärli,
                                                                and Denny Zhou. 2023. Large language models can
Sewon Min, Xinxi Lyu, Ari Holtzman, Mikel Artetxe,              be easily distracted by irrelevant context. In Inter-
  Mike Lewis, Hannaneh Hajishirzi, and Luke Zettle-             national Conference on Machine Learning, pages
  moyer. 2022. Rethinking the role of demonstrations:           31210–31227. PMLR.
  What makes in-context learning work? In Proceed-
  ings of the 2022 Conference on Empirical Methods in         Kaitao Song, Xu Tan, Tao Qin, Jianfeng Lu, and Tie-
  Natural Language Processing, pages 11048–11064.               Yan Liu. 2020. Mpnet: Masked and permuted pre-
                                                                training for language understanding. Advances in
Jekaterina Novikova, Ondřej Dušek, Amanda Cercas               neural information processing systems, 33:16857–
  Curry, and Verena Rieser. 2017. Why we need                   16867.
  new evaluation metrics for nlg. arXiv preprint
  arXiv:1707.06875.                                           Gemini Team, Rohan Anil, Sebastian Borgeaud, Jean-
                                                                Baptiste Alayrac, Jiahui Yu, Radu Soricut, Johan
OpenAI. 2024.         Openai embeddings api.                    Schalkwyk, Andrew M Dai, Anja Hauth, Katie Mil-
  https://platform.openai.com/docs/guides/                      lican, and 1 others. 2023. Gemini: a family of
  embeddings. Accessed: 2025-01.                                highly capable multimodal models. arXiv preprint
                                                                arXiv:2312.11805.
OpenAI. 2025.        Memory and new controls
  for chatgpt.       https://openai.com/index/                Qwen Team and 1 others. 2024. Qwen2 technical report.
  memory-and-new-controls-for-chatgpt/.                         arXiv preprint arXiv:2407.10671, 2(3).
  Accessed: 2025-07.
                                                              Aman Singh Thakur, Kartik Choudhary, Venkat Srinik
Charles Packer, Vivian Fang, Shishir_G Patil, Kevin            Ramayapally, Sankaran Vaidyanathan, and Dieuwke
  Lin, Sarah Wooders, and Joseph_E Gonzalez. 2023.             Hupkes. 2025. Judging the judges: Evaluating align-
  Memgpt: Towards llms as operating systems.                   ment and vulnerabilities in llms-as-judges. In Pro-
                                                               ceedings of the Fourth Workshop on Generation,
Zhuoshi Pan, Qianhui Wu, Huiqiang Jiang, Xufang                Evaluation and Metrics (GEM2 ), pages 404–430.
  Luo, Hao Cheng, Dongsheng Li, Yuqing Yang, Chin-
                                                              Yaxiong Wu, Sheng Liang, Chen Zhang, Yichao Wang,
  Yew Lin, H Vicky Zhao, Lili Qiu, and 1 others.
                                                                Yongyue Zhang, Huifeng Guo, Ruiming Tang, and
  2025. On memory construction and retrieval for
                                                                Yong Liu. 2025. From human memory to ai memory:
  personalized conversational agents. arXiv preprint
                                                                A survey on memory mechanisms in the era of llms.
  arXiv:2502.05589.
                                                                arXiv preprint arXiv:2504.15965.
Kishore Papineni, Salim Roukos, Todd Ward, and Wei-           Jing Xu, Arthur Szlam, and Jason Weston. 2022. Be-
  Jing Zhu. 2002. Bleu: a method for automatic evalu-            yond goldfish memory: Long-term open-domain con-
  ation of machine translation. In Proceedings of the            versation. In Proceedings of the 60th annual meeting
  40th annual meeting of the Association for Computa-            of the association for computational linguistics (vol-
  tional Linguistics, pages 311–318.                             ume 1: long papers), pages 5180–5197.
Ethan Perez, Douwe Kiela, and Kyunghyun Cho. 2021.            Wujiang Xu, Zujie Liang, Kai Mei, Hang Gao, Jun-
  True few-shot learning with language models. Ad-             tao Tan, and Yongfeng Zhang. 2025. A-mem:
  vances in neural information processing systems,             Agentic memory for llm agents. arXiv preprint
  34:11054–11070.                                              arXiv:2502.12110.
Matt Post. 2018. A call for clarity in reporting bleu         An Yang, Anfeng Li, Baosong Yang, Beichen Zhang,
 scores. arXiv preprint arXiv:1804.08771.                       Binyuan Hui, Bo Zheng, Bowen Yu, Chang
                                                                Gao, Chengen Huang, Chenxu Lv, and 1 others.
Pranav Rajpurkar, Robin Jia, and Percy Liang. 2018.             2025. Qwen3 technical report. arXiv preprint
  Know what you don’t know: Unanswerable ques-                  arXiv:2505.09388.
  tions for squad. In Proceedings of the 56th Annual
  Meeting of the Association for Computational Lin-           Zeyu Zhang, Quanyu Dai, Xiaohe Bo, Chen Ma, Rui Li,
  guistics (Volume 2: Short Papers), pages 784–789.             Xu Chen, Jieming Zhu, Zhenhua Dong, and Ji-Rong
                                                                Wen. 2025. A survey on the memory mechanism of
Preston Rasmussen, Pavlo Paliychuk, Travis Beauvais,            large language model-based agents. ACM Transac-
  Jack Ryan, and Daniel Chalef. 2025. Zep: a tempo-             tions on Information Systems, 43(6):1–47.
  ral knowledge graph architecture for agent memory.
  arXiv preprint arXiv:2501.13956.                            Lianmin Zheng, Wei-Lin Chiang, Ying Sheng, Siyuan
                                                                Zhuang, Zhanghao Wu, Yonghao Zhuang, Zi Lin,
Siva Reddy, Danqi Chen, and Christopher D Manning.              Zhuohan Li, Dacheng Li, Eric Xing, and 1 others.
   2019. Coqa: A conversational question answering              2023. Judging llm-as-a-judge with mt-bench and
   challenge. Transactions of the Association for Com-          chatbot arena. Advances in neural information pro-
   putational Linguistics, 7:249–266.                           cessing systems, 36:46595–46623.


                                                         10
Yicong Zheng, Nora Wolf, Charan Ranganath, Ran-
  dall C O’Reilly, and Kevin L McKee. 2025. Flexible
  prefrontal control over hippocampal episodic mem-
  ory for goal-directed generalization. arXiv preprint
  arXiv:2503.02303.
Wanjun Zhong, Lianghong Guo, Qiqi Gao, He Ye, and
 Yanlin Wang. 2024. Memorybank: Enhancing large
  language models with long-term memory. In Pro-
  ceedings of the AAAI Conference on Artificial Intelli-
  gence, volume 38, pages 19724–19731.




                                                           11
A    Prompting and Generation Details                        a question asks what a user ate for dinner and the
                                                             reference answer specifies a concrete item (e.g.,
We describe the prompting design and generation              “grilled salmon”), a response such as “seafood” cap-
parameters used to construct cue dialogues and               tures the correct coarse concept but misses the re-
trigger queries in our dataset. These prompts are            quired level of specificity. Treating such responses
used exclusively for data generation and do not              as fully incorrect would conflate coarse-grained
involve any evaluation or judgment procedures.               recall with complete failure. We therefore re-
   We adopt a structured prompting strategy in               tain a three-level label scheme (correct, partial,
which each prompt is decomposed into semanti-                wrong) to distinguish partial factual recall from
cally annotated components, including role setting,          entirely incorrect or hallucinated answers.
task logic, constraints, and output format. This de-            In contrast, temporal and adversarial questions
composition clarifies the intended function of each          admit precise decision boundaries. Temporal
prompt segment and helps ensure consistency and              reasoning requires exact calculation or ordering,
reproducibility across generations. Cue dialogues            where near misses or approximate answers are
are generated as short two-turn conversations that           not semantically acceptable. Similarly, adversarial
introduce a salient and recallable memory anchor             questions evaluate whether the model correctly re-
while remaining naturalistic and self-contained.             fuses to answer or identifies a conflict; any attempt
   Trigger queries are then generated conditioned            to hallucinate an answer constitutes a failure. For
on the cue dialogue and relation type, with ex-              these categories, we adopt binary labels to avoid
plicit constraints encouraging diversity in perspec-         ambiguity and ensure consistent evaluation.
tive, temporal gap, and cognitive angle. Complete               Finally, cognitive awareness questions assess
prompt specifications with semantic annotations              whether a response explicitly acknowledges or
are provided in Tables 5 and 6.                              adapts to a previously stated memory cue. Be-
Generation Parameters. Cue dialogues and                     cause the core criterion is the presence or absence
trigger queries are generated using a set of                 of memory-aware behavior rather than surface cor-
commercially available large language models,                rectness, we likewise use binary labels to reflect re-
including gpt-5-nano, gpt-4o, gpt-4.1 (Achiam                call success versus omission. The full task-specific
et al., 2023),         gemini-2.5-flash,         and         evaluation prompts are summarized in Table 7.
gemini-2.5-pro (Team et al., 2023).              All         B.1   Representative Judge Examples
models are used exclusively for data generation in
                                                             To further assess the reliability of LLM-based judg-
this stage.
                                                             ment, we analyze cases where LLM judges and
   To ensure reproducibility across different model
                                                             human annotations disagree. Such disagreements
APIs, we restrict generation control to a shared set
                                                             are typically treated as potential failure cases of
of supported parameters. Specifically, we enable
                                                             LLM-based evaluation and therefore warrant closer
stochastic decoding with a non-zero temperature
                                                             inspection.
(T = 0.7) to encourage diversity in linguistic real-
                                                                Table 4 presents a representative example from
ization and topic coverage. We additionally control
                                                             this analysis. At first glance, the conflict between
the maximum generation length (256 tokens) and
                                                             human annotation and the LLM judge’s decision
the number of generated instances per relation type
                                                             might suggest an error on the part of the judge.
(num_samples=50).
                                                             However, a careful re-examination of the dialogue
   Aside from enforcing the specified structural and
                                                             evidence reveals that the model prediction is fully
output-format constraints, no additional filtering or
                                                             consistent with the explicit temporal cue provided
post-processing is applied. All prompting and gen-
                                                             in the conversation. The source of disagreement
eration procedures are implemented in our open-
                                                             instead lies in the reference answer, which encodes
source codebase, which is released alongside this
                                                             an abstract and inconsistent weekday description.
paper to support full reproducibility.
                                                                In this case, human annotators rely on the flawed
B   Judge Design and Evaluation Protocol                     reference and label the prediction as incorrect. The
                                                             LLM judge, by grounding its decision in the dia-
For factual and commonsense questions, model re-             logue evidence, not only assigns the correct label
sponses are often open-ended and may partially               but also explicitly identifies the inconsistency in
satisfy the information need. For example, when              the reference answer. This outcome demonstrates

                                                        12
 Component            Content (Verbatim)                          Example 1: Causal Memory (Habit Change
 (A) Dialogue Evidence and Response                               Triggered by an Event). Cue Dialogue
 Question           When did Melanie run a charity race?          (Causal):
 Evidence           (D2:1) Melanie: Hey Caroline, since we
                    last chatted, I’ve had a lot of things hap-        A: Since my cousin got diagnosed with
                    pening to me. I ran a charity race for
                    mental health last Saturday – it was re-           Type 2 diabetes, I cut sugary drinks com-
                    ally rewarding.                                    pletely out of my diet.
 Model Prediction Melanie ran a charity race for mental
                    health on Saturday, before May 25,
                                                                       B: That family scare clearly changed
                    2023.                                              your habits.
 (B) Reference Answer
 Ground Truth      The Sunday before 25 May 2023                    Trigger Query (Months Later):
 (C) Evaluation Outcomes
 Human 1 Judge      Wrong
                                                                       A: It’s strange, I barely recognize the per-
 Human 2 Judge      Wrong                                              son who used to grab whatever sounded
 LLM Judge          Correct                                            good without thinking about long-term
 Judge Reason       The prediction correctly identifies the            consequences.
                    event as occurring on Saturday based on
                    the dialogue evidence, while the refer-
                    ence answer uses an inconsistent week-           Analysis. The trigger does not explicitly men-
                    day description.                              tion diabetes or dietary choices. Correct interpreta-
 (D) Traditional Metrics                                          tion requires recalling the earlier causal event and
 Metrics            EM = 0.0; Token F1 ≈ 0.40;                    connecting it to a later shift in self-perception. This
                    BLEU ≈ 0.0; ROUGE-L ≈ 0.2
                                                                  goes beyond factual recall (e.g., “Why did you stop
Table 4: A representative bias case where the model               drinking sugary drinks?”) and instead evaluates
prediction aligns with the dialogue evidence but is pe-           whether the model can implicitly link a past cause
nalized by human annotation and surface-form metrics.             to a present reflection.
The LLM-based judge correctly grounds its decision in
the evidence and assigns the correct label.                       Example 2: State-Based Memory (Emotional
                                                                  State Driving Later Behavior). Cue Dialogue
                                                                  (State):
that disagreement with human annotation does not
necessarily indicate unreliability of LLM-based                        A: I got yelled at by my boss for a mistake
judgment. Rather, such cases can reflect issues in                     I can’t stop thinking about, and I feel
the reference itself, and the ability of LLM judges                    hollow.
to surface and reason about these inconsistencies                      B: That’ll pass; give yourself credit for
provides additional evidence of their reliability.                     fixing it and move on.
   Complete per-instance human annotations, LLM
judge labels, and judge rationales are released in                  Trigger Query (Weeks Later):
our code repository to support transparent inspec-
                                                                       A: I redesigned the workflow to make
tion and verification.
                                                                       sure the same mistake can’t happen
                                                                       again and asked two coworkers to
C    Representative Cognitive Memory                                   double-check it.
     Examples
                                                                     Analysis. The later utterance does not restate
To concretely illustrate how our dataset differs                  the emotional state. Correct handling requires re-
from fact-centric benchmarks such as LoCoMo,                      membering the earlier distress and inferring that
we present several representative cognitive memory                lingering anxiety motivated cautious, preventive
cases sampled from the full dataset. All examples                 behavior. This type of memory cannot be evalu-
below are shown verbatim (lightly anonymized)                     ated by checking for factual overlap, as the relevant
and are drawn from different cognitive relation                   signal lies in the persistence of an internal state.
types. Rather than querying explicitly stated facts,
these cases require models to retain and apply im-                Example 3: Goal-Oriented Memory (Long-
plicit personal constraints expressed earlier in the              Term Intention and Re-evaluation). Cue Di-
dialogue.                                                         alogue (Goal):

                                                             13
     A: I’m saving up specifically for a vintage             and LLM-based judge rationales, is released in our
     convertible because I’ve always dreamed                 code repository for comprehensive inspection and
     of owning a classic car.                                reproducibility.
     B: That sounds like a stylish goal.

  Trigger Query (Several Months Later):

     A: Lately I’ve realized my happiest mo-
     ments come from camping trips, not from
     buying things.

   Analysis. This example probes whether the
model can recognize a potential shift or re-
evaluation of a previously stated long-term goal.
There is no factual question to answer and no ex-
plicit contradiction in surface form. Instead, the
model must reason about how a new reflection re-
lates to an earlier intention, highlighting the dy-
namic nature of goal memory.
Example 4: Value-Based Memory (Consistency
Across Contexts). Cue Dialogue (Value):

     A: I turn down clients with unrealistic
     timelines because I value my team’s well-
     being more than profit.
     B: That says a lot about the kind of leader
     you are.

  Trigger Query (Later):

     A: I watched my kid fall asleep over
     homework and suddenly realized I’ve
     protected my team from burnout for years
     while ignoring how exhausted my own
     family looks.

   Analysis. No explicit fact is queried in the trig-
ger. Correct interpretation requires recalling the
earlier value statement and recognizing a value-
consistency tension across different social roles.
Such cases emphasize reasoning over personal prin-
ciples rather than retrieval of explicit information.
Summary. These examples demonstrate that cog-
nitive memory cases in our dataset differ funda-
mentally from fact-based benchmarks. Correct-
ness is determined by whether a response reflects
awareness and appropriate use of previously ex-
pressed constraints, rather than by reproducing a
specific reference string. Because cognitive mem-
ory constitutes a core contribution of this work,
we include only a subset of representative exam-
ples in the paper and appendix. The complete set
of cognitive instances, along with full annotations

                                                        14
Annotation        Full Prompt Content

• Role Setting    You are generating short conversational cues for testing memory recall capabilities. Generate short
                  dialogues (2 lines) based on the relation type provided. Relation Type: {relation_type}
• Task Logic
                  Relation type meanings: - Causal: an earlier cause or condition affects a later event. - State: a physical or
• Constraints     emotional state influences later behavior. - Goal: a long-term intention or plan influences current choices.
                  - Value: a belief or value shapes later reactions.
• Output Format
                  Requirements: - Create exactly 2 lines of dialogue for each example: (A) Mentions a MEMORABLE
                  and RECALLABLE event; (B) Gives a short, natural reaction that CLOSES the conversation. - Ensure
                  dialogue closure. - Memory anchor: A’s line should contain a distinctive detail. - Make it sound like
                  realistic, natural daily conversation. - Vary topics across work, family, relationships, health, travel, etc.
                  - Do NOT include explanations or markdown. Output a valid JSON array ONLY. Output strictly in this
                  format: [ { "relation_type": "...", "cue_dialogue": "A: ...\nB: ..." } ]. Generate {num_samples} examples.

                           Table 5: Cue generation prompt with semantic annotations.




Annotation        Full Prompt Content

• Role Setting    You are generating trigger queries that have implicit cognitive connections to given dialogues and create
                  meaningful cognitive conflicts or contrasts with given dialogues, ensuring diverse perspectives in memory
• Task Logic
                  recall.
• Constraints     CRITICAL REQUIREMENT: Each of the five trigger queries must represent a DISTINCT COGNITIVE
• Output Format   ANGLE of conflict or recall. They should not feel similar or repetitive. Aim for five truly different ways
                  that the trigger could relate to the cue. Given the cue dialogue below, generate FIVE DIFFERENT trigger
                  queries that: 1. Have implicit connections (memory recall); 2. Are semantically distant; 3. Sound natural;
                  4. Represent events one week or months after; 5. The time gaps should be at least one week or more; 6.
                  Create some conflict or contrast.
                  Each trigger query should: - Be spoken by the same person (A) in first person; - Sound semantically
                  unrelated but cognitively connected; - Be something humans can recall from, but similarity-based
                  retrievers cannot; - Be a statement, feeling, question, or reflection; - Avoid reusing nouns or verbs
                  from the cue; - Represent a distinct angle from others. AVOID: Similar-sounding triggers, superficial
                  connections, forced contrasts, or repeating relationship types.
                  Requirements: Generate FIVE DISTINCT trigger queries; Vary topics and time gaps (one week to several
                  months); Do NOT include explanations; Include time_gap description. Cue Dialogue: {cue_dialogue}
                  Relation Type: {relation_type} Output strictly in this format: [ { "relation_type": "{relation_type}",
                  "cue_dialogue": "{cue_dialogue}", "trigger_query": "A: ...", "time_gap": "..." }, ... ]

                     Table 6: Trigger query generation prompt with semantic annotations.




                                                            15
 Annotation                     Full Prompt Content (Evaluation Templates)

 Single/Multi-hop/Commonsense

 • Role Setting                 You are a Fact-Checking or Commonsense Judge. Your task is to compare the prediction
                                with the reference answer using external knowledge where needed.
 • Task Logic                   Question: {question} Reference Answer: {gold} Model Prediction: {pred} Relevant
                                Evidence: {evidence}
 • 3-Level Labels               Labels: - "correct": exact match or sound inference; - "partial": minor inaccuracies or
                                incomplete reasoning; - "wrong": factually incorrect or contradicts commonsense.
 • Format                       Return your judgment strictly in JSON format: {"label": "...", "reason": "..."}

 Temporal Reasoning

 • Role Setting                 You are a Temporal Logic Judge. Your task: Check the calculation, duration, or
                                sequence of events strictly.
 • Task Logic                   Question: {question} Reference Answer: {gold} Model Prediction: {pred}
 • Binary Labels                Labels: - "correct": calculated time or sequence matches exactly; - "wrong": calculation
                                is incorrect or sequence is reversed. **Note**: Precision is key, no partial credit.
 • Format                       Return your judgment strictly in JSON format: {"label": "...", "reason": "..."}

 Adversarial Robustness

 • Role Setting                 You are a Skeptical Judge. Determine if the model correctly identifies unanswerable
                                questions or semantic conflicts.
 • Task Logic                   Question: {question} Reference Answer: {gold} Model Prediction: {pred} Relevant
                                Evidence: {evidence}
 • Refusal Check                Labels: - "correct": model correctly refuses to answer or identifies the non-existent
                                event; - "wrong": model hallucinates an answer or provides incorrect info.
 • Format                       Return your judgment strictly in JSON format: {"label": "...", "reason": "..."}

 Cognitive Awareness

 • Role Setting                 You are a Memory Awareness Judge. Determine if the model prediction demonstrates
                                awareness of the memory cue found in the Evidence.
 • Scenario                     Scenario: Evidence contains a specific user memory; Question is a trigger interacting
                                with that memory.
 • Recall Check                 Labels: - "correct": explicitly acknowledges or adapts to the Memory/Cue (proves
                                recall); - "wrong": completely ignores the Evidence and gives a generic response.
 • Format                       Return your judgment strictly in JSON format: {"label": "...", "reason": "..."}

Table 7: Comprehensive evaluation prompt templates across four dimensions: Fact/Commonsense, Temporal,
Adversarial, and Cognitive.




                                                       16
