<!-- Generated from arxiv-2402.17753.pdf via pdftotext -layout on 2026-02-22 -->

                                              Evaluating Very Long-Term Conversational Memory of LLM Agents

                                                            Adyasha Maharana1    Dong-Ho Lee2     Sergey Tulyakov3
                                                             Mohit Bansal1†   Francesco Barbieri†   Yuwei Fang3†
                                             University of North Carolina, Chapel Hill1           University of Southern California2         Snap Inc.3




                                                                Abstract
                                              Existing works on long-term open-domain dia-
                                              logues focus on evaluating model responses




arXiv:2402.17753v1 [cs.CL] 27 Feb 2024
                                              within contexts spanning no more than five
                                              chat sessions. Despite advancements in long-
                                              context large language models (LLMs) and
                                              retrieval augmented generation (RAG) tech-
                                              niques, their efficacy in very long-term dia-
                                              logues remains unexplored. To address this
                                              research gap, we introduce a machine-human
                                              pipeline to generate high-quality, very long-
                                              term dialogues by leveraging LLM-based agent
                                              architectures and grounding their dialogues on
                                              personas and temporal event graphs. Moreover,
                                              we equip each agent with the capability of shar-
                                              ing and reacting to images. The generated con-
                                              versations are verified and edited by human an-
                                              notators for long-range consistency and ground-
                                              ing to the event graphs. Using this pipeline,
                                              we collect L O C O M O, a dataset of very long-
                                              term conversations, each encompassing 300
                                              turns and 9K tokens on avg., over up to 35 ses-
                                              sions. Based on L O C O M O, we present a com-
                                              prehensive evaluation benchmark to measure            Figure 1: An example in L O C O M O. Dialogs are
                                              long-term memory in models, encompassing              steered by the speakers’ personas and corresponding
                                              question answering, event summarization, and          events e.g., Joanna’s responses are consistent with her
                                              multi-modal dialogue generation tasks. Our ex-        pet allergies. For Nate, the event got a new dog is fol-
                                              perimental results indicate that LLMs exhibit         lowed by a playdate with neighbor’s dog, showcasing
                                              challenges in understanding lengthy conversa-         long-term memory. Multimodal dialog is enabled with
                                              tions and comprehending long-range temporal           image-sharing and image-response behaviors.
                                              and causal dynamics within dialogues. Employ-
                                              ing strategies like long-context LLMs or RAG
                                              can offer improvements but these models still         techniques (Shuster et al., 2021; Ram et al., 2023;
                                              substantially lag behind human performance.1          Shi et al., 2023), there is still a need for thorough
                                                                                                    evaluation of their efficacy in handling very long
                                                                                                    conversations. Indeed, studies in long-term open-
                                         1     Introduction
                                                                                                    domain dialogues have concentrated on assessing
                                         Despite recent advancements in dialogue models             model responses within limited contexts e.g., ∼1K
                                         based on LLMs for extended contexts (Bertsch               tokens over five chat sessions (Xu et al., 2022; Jang
                                         et al., 2024; Xiao et al., 2023), as well as the inte-     et al., 2023; Zhang et al., 2023). This long term
                                         gration of retrieval augmented generation (RAG)            evaluation is crucial for refining engaging chat-
                                            1                                                       bots capable of remembering key information from
                                              Code and data to be available at
                                         https://snap-research.github.io/locomo                     past interactions, to generate empathetic, consis-
                                              †
                                                Equal advising.                                     tent, and useful responses.
 Dataset                                       Avg. turns Avg. sessions   Avg. tokens    Time Interval      Multimodal         Collection
                                               per conv.   per conv.       per conv.
 MPChat (Ahn et al., 2023)                        2.8          1              53.3              -              ✓                Reddit
 MMDialog (Feng et al., 2023)                     4.6          1              72.5              -              ✓             Social media
 Daily Dialog (Li et al., 2017)                   7.9          1             114.7              -              ✗            Crowdsourcing
 SODA (Kim et al., 2023)                          7.6          1             122.4              -              ✗            LLM-generated
 MSC (Xu et al., 2022) (train; 1-4 sessions)     53.3          4            1,225.9         few days           ✗            Crowdsourcing
 Conversation Chronicles (Jang et al., 2023)     58.5          5            1,054.7     few hours - years      ✗            LLM-generated
 L O C O M O (ours)                              304.9        19.3          9,209.2       few months           ✓         LLM-gen. + crowdsourc.

Table 1: Statistics of L O C O M O compared to existing dialog datasets. The average length of a conversation in
L O C O M O is 9x that of MSC (Xu et al., 2022), distributed over 6x more turns and 4x more sessions (on average).




Figure 2: Overview of our evaluation framework. We propose three tasks: question answering, event summariza-
tion and multimodal dialog generation to evaluate models’ comprehension in very long-term dialogues.


   To this end, we present the first study of very                             images (§3.3). Finally, human annotators fix long-
long-term open-domain multi-modal dialogues,                                   range inconsistencies in dialogues, remove irrele-
closely mirroring real-world online interactions,                              vant images, and verify the grounding of dialogs
collected via a human-machine pipeline where we                                to events (§3.4). With this pipeline, we create L O -
first use LLM-based generative agents to generate                              C O M O, a dataset of 50 very long-term dialogues,
conversations and then ask human annotators to                                 each consisting of 300 turns and 9K tokens on avg.,
fix any long-term inconsistencies in the conversa-                             over up to 35 sessions (see Figure 1 and Table 1).
tions. Specifically, drawing on the understanding                                 Conventional approaches for evaluating conver-
that real-world conversations are a complex blend                              sational agents in open-domain dialogues involves
of collective memories (Assmann and Czaplicka,                                 directly evaluating the agent response based on
1995; Hirst and Manier, 2008), individual view-                                past dialogue history. It often employs lexical
points (Hirst et al., 2018), external influences (Hirst                        overlap (Papineni et al., 2002) and semantic over-
and Echterhoff, 2012), and the unique persona of                               lap (Zhang et al., 2019) between ground truth and
the speakers (Pruitt and Grudin, 2003; Cooper,                                 the agent response, or consistency (Ghazarian et al.,
1999; Zhou et al., 2020; Shum et al., 2020), we cre-                           2022), contradiction (Nie et al., 2021; Welleck
ate very long-term dialogues based on LLM agent                                et al., 2019), and empathy (Zhang et al., 2021a,
with the following features: (1) a unique persona                              2022) of the agent response. However, these eval-
(§3.1); (2) a timeline of causally interlinked events                          uation metrics are not well-suited for directly as-
in their lives (§3.2); and (3) reflect & response                              sessing the agent’s comprehension of long-term
mechanism to respond based on dialogue history                                 contexts.
(like in Park et al. (2023)) and image sharing &                                  In this study, we present a holistic evaluation
image reaction behavior which sends or reacts to                               framework to assess an agent’s proficiency in man-
aging and responding within long-term contexts          2   Related Work
(see Figure 2). First, agents need to “recall” past
context correctly to integrate relevant information     Long-term Dialogue. Recent approaches in-
into future responses. We present a direct examina-     volve retrieving historical context from a range
tion of their memory via a question answering (QA)      of previous dialogues and reasoning over retrieved
task (§4.1). We classify questions into five distinct   segments in a temporal order (Lee et al., 2023b;
reasoning types to evaluate memory from multi-          Lu et al., 2023; Zhong et al., 2023; Liang et al.,
ple perspectives: single-hop, multi-hop, temporal,      2023) and/or using events to scaffold the dialogues
commonsense or world knowledge, and adversarial.        (Jang et al., 2023; Zhang et al., 2023) to enable
Second, agents also need to recognize long-range        consistency in long-term conversations. Some lim-
causal and temporal connections in the dialogues        itations of such frameworks are: (1) The accu-
to generate empathetic and relevant responses. We       racy of retrieval can be compromised, as the re-
propose a measurement of their causal and tem-          trieval model is generally trained on tasks focusing
poral understanding with an event graph summa-          on semantic similarity rather than specifically on
rization task (§4.2). In this task, the event graphs    such dialogues. Additionally, real-world dialogues
linked to each LLM speaker serve as the correct         often feature co-references and missing content
answers, and models are tasked with extracting this     (i.e., anaphora) (Anantha et al., 2021), which fur-
information from the conversation history. Third,       ther complicate the retrieval process (Mallen et al.,
conversational agents need to utilize relevant con-     2023; Gao et al., 2023b; Liu et al., 2023); (2) Chal-
text recalled from past conversations to generate       lenges arise in reasoning over retrieved documents,
responses that are consistent with the ongoing nar-     especially when the model struggles to identify
rative. We assess this ability via the multi-modal      the correct context among the retrieved data (Liu
dialog generation task (§4.3).                          et al., 2024); (3) Reasoning over time intervals
                                                        presents challenges. For example, the way a sys-
  We present extensive experimental results on          tem responds about past events can vary depending
the L O C O M O benchmark using instruction-based       on the amount of time that has passed since the
LLMs, long-context LLMs, and RAG techniques             last conversation (Zhang et al., 2023; Jang et al.,
(§5). Our findings include:                             2023). Therefore, it is essential to have conversa-
                                                        tions of considerable length, as well as a systematic
   (1) Long-context LLMs and RAG demonstrate
                                                        evaluation framework, to accurately assess the ef-
effectiveness in QA tasks, improving ‘memory’ ca-
                                                        fectiveness of approaches to long-term dialogue
pabilities of LLMs (with improvements ranging
                                                        generation. We design a long-term conversation
from 22-66%), but still significantly lag behind
                                                        generation pipeline based on retrieval augmenta-
human levels (by 56%), especially in temporal rea-
                                                        tion and events graphs and propose a framework
soning, (by 73%);
                                                        for evaluating long-term dialog agents.
   (2) long-context LLMs demonstrate significant
difficulty with adversarial questions in the QA task,   Multi-modal Dialogue. Multi-modal dialogue
showing a performance that is 83% lower than the        primarily consists of two types of tasks: image-
base model. They are especially prone to misassign-     grounded dialogue and image-sharing dialogue.
ing dialogs or events to the wrong speaker. More-       The image-grounded dialogue task is centered
over, they show poor performance on event graph         around responding to questions (Antol et al., 2015;
summarization, lagging behind the base model by         Das et al., 2017; Kottur et al., 2019) or creat-
14%, indicating that they may grasp the factual el-     ing natural conversations related to specific im-
ements within the entire conversation but do not        ages (Mostafazadeh et al., 2017; Shuster et al.,
accurately comprehend the context; and                  2020; Meng et al., 2020; Zheng et al., 2022). Con-
                                                        versely, the image-sharing dialogue task focuses
   (3) RAG offers a balanced compromise, combin-        on selecting images that semantically align with
ing the accuracy of short-context LLMs with the         the provided dialogue context (Zang et al., 2021;
extensive comprehension of wide-context LLMs,           Feng et al., 2023; Lee et al., 2023c). We use a
and does particularly well when dialogues are trans-    method from the image-sharing dialogue task to
formed into a database of assertions (observations)     create multimodal dialogs which are then evaluated
about each speaker’s life and persona.                  as an image-grounded dialogue task.
Synthetic Evaluation Benchmark. Faced with                 the condition of M (i.e., text-davinci-003) on
a shortage of human-generated data and observing           a designated persona p. Each event ei is associated
that LLMs are approaching the quality of human-            with a date of occurrence ti . G includes causal
level annotations (He et al., 2023; Lee et al., 2023a),    connections l = (ei , ej ) that illustrate the causal
there has been a surge in research drawing in-             relationships among events ei ∈ G and reflect a
spiration from this development. Consequently,             natural succession of events in an individual’s life.
numerous studies have started utilizing LLMs to            For each G, we create up to 25 events, spread across
augment or synthesize large-scale dialogue bench-          a time frame of 6 to 12 months, in an iterative
marks for assessing responses in everyday social in-       process that balances between inference time and
teractions (Kim et al., 2023), examining responses         the coherence of temporal and causal connections
in multi-modal environment (Feng et al., 2023),            in the timeline. Initially, a small batch of k = 3
and evaluating responses that align with specific          events is generated, which is then used iteratively
persona (Jandaghi et al., 2023). We leverage LLMs          as input prompt to create the subsequent batch of k
to create data but ensure its high quality with hu-        events. See details in Appendix A.2.
man verification and editing.
                                                           3.3   Virtual Agent Architecture
3     Generative Pipeline for L O C O M O
                                                           Every agent Li incorporates modules from gener-
An overview of our generative pipeline for L O -           ative agent architecture (Park et al., 2023). The
C O M O is shown in Figure 3. We create two virtual        agent has two functions: (1) reflect & respond; and
agents, named L1 and L2 , each initialized with a          (2) image sharing & image reaction. The agent is
LLM M (i.e., gpt-3.5-turbo). To start, unique              asked to primarily use the reflect & respond func-
persona statements p are assigned to each agent Li ,       tion while employing image sharing & image reac-
ensuring the integration of distinct personalities         tion function judiciously and appropriately within
into their dialogues (§3.1). To mirror real-life ex-       the context of the conversation.
periences, we create a temporal event graph G for
each agent, which illustrates a realistic sequence         Reflect & Respond. The fundamental process
of life events (§3.2). The LLM agent architec-             for each agent to reflect and respond involves the
ture (Park et al., 2023) is utilized for each agent Li ,   concept of short-term and long-term memory. Dur-
enabling them to effectively memorize and reflect          ing inference, agent Li conditions its responses
conversation history into ongoing dialogues (§3.3).        on both short and long-term memories, paralleling
Further, each agent Li can share coherent images,          how humans remember recent conversations while
thereby enhancing the multi-modal dialogue aspect.         also recalling distilled important experiences from
Finally, human annotators are tasked with manually         long-term memory. Following each session k, each
filtering and refining the generated data (§3.4).          agent is asked to produce a summary wk that is
                                                           then stored in the short-term Hs . This summary
3.1    Persona                                             wk is generated by conditioning M on both the
We select an initial persona statement pc from the         most recent session conversation history hk and
MSC dataset (Xu et al., 2022), encompassing 4              the preceding summary wk−1 ∈ Hl . For each turn
to 5 sentences, and employ gpt-3.5-turbo as M              j within session k, a single turn of the conversa-
to expand these into full persona statement p (See         tion hkj is transformed into an observation okj and
examples and prompt details in Appendix A.1).              then stored in the long-term memory Hl . Then,
The generated statements typically include details         agent Li generates a response in session k + 1 on
about one or more of the following elements (Gao           the date tsk+1 by basing it on the latest summary
et al., 2023a): objectives, past experiences, daily        wk , reflections based on the retrieved relevant ob-
habits, and interpersonal relationships, as well as        servations o ∈ Hs , the ongoing conversation his-
name, age, and gender of the individual.                   tory in the current session hk+1 and persona state-
                                                           ment p. Long-term temporal narratives are induced
3.2    Temporal Event Graph                                in the conversation by additionally conditioning
To utilize the real-life experiences of each agent         the agent’s response on the subset of events in G
in the conversation, we construct a temporal event         that occur between the last and current session i.e.
graph, labeled as G, for each agent. This graph G,         {e ∈ G | tsk < tei < tsk+1 }. See details in Ap-
consisting of events ei , is produced by applying          pendix A.2.1.
Figure 3: Overview of the generative pipeline for L O C O M O. Each LLM agent is assigned a distinct persona and
a timeline of causally connected events in their file. The agent is equipped with a memory and reflection module to
retrieve relevant history for dialog generation and is also enabled for image-sharing and image-reaction behaviors
(left). The generated conversations are edited by human annotators to maintain long-range consistency (right).


Image Sharing & Image Reaction. The image                         4.1   Question Answering Task
sharing & image reaction functions are integrated
                                                                  A conversational agent is expected to possess a
to add a multi-modal dimension to the long-term
                                                                  memory to remember previous dialogues, reflect-
dialogues.2 The image sharing function is called
                                                                  ing it to create more engaging responses in future
when the agent decides to send an image. This
                                                                  conversations. For a comprehensive assessment of
process includes: (1) Generate a caption c for the
                                                                  this memory, we introduce a question-answering
intended image using M; (2) Convert the caption
                                                                  task divided into five distinct reasoning categories:
c into relevant keywords w using M; (3) Use the
                                                                  (1) Single-hop questions require answers based on
keywords k to find an image through web search
                                                                  a single session; (2) Multi-hop questions require
W EB(k)3 ; (4) Share the chosen image. Con-
                                                                  synthesizing information from multiple different
versely, the image reaction function is triggered
                                                                  sessions; (3) Temporal reasoning questions can be
upon receiving an image from another agent and
                                                                  answered through temporal reasoning and captur-
entails: (1) Generate caption c for the received im-
                                                                  ing time-related data cues within the conversation;
age4 ; (2) Generate a reaction for the received image
                                                                  (4) Open-domain knowledge questions can be
in response using M (See Appendix A.2.1).
                                                                  answered by integrating a speaker’s provided infor-
3.4      Human Verification & Editing                             mation with external knowledge such as common-
                                                                  sense or world facts; (5) Adversarial questions are
In the concluding phase, human annotators are
                                                                  designed to trick the agent into providing wrong
tasked with (1) editing the dialogue to eliminate
                                                                  answers, with the expectation that the agent will
long-term inconsistencies, (2) removing or sub-
                                                                  correctly identify them as unanswerable.
stituting irrelevant images, and (3) verifying and
                                                                     For each category, we calculate the F1 score for
editing for alignment between event graphs and the
                                                                  exact matches, following the normalization of both
content of the conversations. Overall, we observed
                                                                  the predicted and the actual ground truth answers.
that annotators edited nearly 15% of the dialog
                                                                  However, evaluating long-form answers with au-
turns and removed or substituted approx. 19% im-
                                                                  tomated metrics often presents challenges (Xu
ages present in the LLM-generated dataset. See
                                                                  et al., 2023). LLMs tend to produce paraphrased
examples of some edits in Appendix A.3.
                                                                  responses in varied formats, complicating exact
4       L O C O M O Evaluation Benchmark                          match evaluation. To simplify evaluation in our
                                                                  task, we ensure that answers in our QA annota-
Based on the dialogues generated in section 3, we                 tions are directly taken from the conversations as
introduce an evaluation benchmark (see Figure 2)                  much as possible. We instruct the LLMs to repli-
composed of three tasks to assess the accuracy of                 cate the exact wording in the conversation when
long-term memory. See statistics of the dataset and               feasible and employ the F1 partial match metric for
evaluation benchmark in Table 5 in the Appendix.                  evaluating the predictions. Each QA sample is also
    2
      Image captions are also saved to long-term memory.
                                                                  annotated with the turn IDs in the conversation logs
    3
      https://pypi.org/project/icrawler/                          that contain the answer. We report the accuracy of
    4
      We use BLIP-2 (Li et al., 2023b) as the captioning model.   retrieving the correct context for RAG models.
4.2   Event Summarization Task                            multi-modal dialogues in our dataset, quantifying
                                                          this alignment through MMRelevance (Feng et al.,
The conversation is generated based on a temporal
                                                          2023), in addition to other NLG metrics.
event graph G which is constructed by condition-
ing an LLM on a persona statement p, reflecting           5       Experimental Setup
the chronological sequence of events in an individ-
ual’s life. A conversational agent is expected to not     For the question-answering and event summariza-
only comprehend the causal connections and the            tion tasks, we replace images in L O C O M O with
sequence of events in G but also to recount these         their captions (Li et al., 2023b), and use state-of-
events as required. To evaluate the agent’s grasp of      art LLMs to reason over text-only dialogues inter-
event dynamics, we introduce the event summariza-         leaved with image captions. We use images directly
tion task which challenges the agent to summarize         for the multimodal dialog generation task only. See
the events within a designated timeframe and com-         additional details in Appendix C.
pares the agent’s summary with events in G. The
                                                          Question Answering. We evaluate three types
events in L O C O M O are densely annotated lists of
                                                          of models: (1) Base LLMs operating with
life events that are hard to summarize due to tempo-
                                                          constrained context lengths where earlier dia-
ral and causal coreferences present in the dialogues,
                                                          logues are omitted i.e., Mistral-7B (Jiang et al.,
in contrast to existing summarization benchmarks
                                                          2023), LLama-70B-chat (Touvron et al., 2023),
of research papers (Li et al., 2023a), movie scripts
                                                          gpt-3.5-turbo 5 , and gpt-4-turbo 6 ; (2) Long-
(Chen et al., 2022), books (Kryściński et al., 2022),
                                                          context LLMs with an extended context win-
emails (Zhang et al., 2021b) etc.
                                                          dow i.e., gpt-3.5-turbo-16k; (3) Retrieval-
   Traditional metrics like BLEU (Papineni et al.,        augmented Generation (RAG) involves retrieving
2002) and ROGUE (Lin, 2004) focus on lexical              relevant context from a database of dialog history,
similarity between the reference and generated            observations (assertions about speakers; see §3.3,
summaries, not meeting our needs as we emphasize          Figure 9), or session-level summaries (see §3.3,
factual accuracy in summarization. In this context,       Figure 8). We employ DRAGON (Lin et al., 2023)
we employ FactScore (Min et al., 2023), a method          as retriever and gpt-3.5-turbo-16k as reader.
that evaluates the factuality of generated text by de-
composing both the reference and hypothesis into          Event Summarization. We present experiments
atomic facts. We adapt the metric to measure (1)          using Base and Long-context setups from the
precision of the summarized content by counting           question-answering task, but refrain from including
the number of atomic facts within the content that        RAG since summarization requires a comprehen-
correspond with those in G; (2) recall of the summa-      sive understanding of the entire dialogue, rather
rized content by determining how comprehensively          than just retrieving a specific portion. We imple-
the atomic facts of G are represented within the          ment incremental summarization i.e., iteratively
content. We present the F1 score, derived from the        create a summary of a preceding sessions and then
calculated precision and recall.                          use that summary as a basis to summarize the sub-
                                                          sequent sessions (Chang et al., 2023).
4.3   Multi-Modal Dialogue Generation Task
                                                          Multi-modal Dialogue Generation. We gener-
The conversations in our dataset are anchored to          ate 50 conversations using our automated pipeline
specific personas p and corresponding events G tai-       (without human filtering; §3) for training data and
lored to p. The topics in conversations evolve from       train three versions of MiniGPT-5 (Zheng et al.,
events that were introduced in earlier dialogues,         2023): (1) Base trains on prior dialogue turns only;
spanning weeks or months. This structure allows           (2) + summary trains on prior dialogue turns and
for an assessment of whether conversational agents        a global summary of the ongoing conversation; (3)
can sustain a coherent persona and a continuous nar-      + observation trains on prior dialogue turns and
rative over time. For example, if a speaker recently      observations retrieved from conversation history.
had an injury, the next conversations would likely        Each run is initialized with a MiniGPT-5 check-
focus on them recuperating, rather than engaging          point finetuned on MMDialog (Feng et al., 2023).
in adventurous activities. We assess such con-                5
                                                               https://platform.openai.com/docs/models/gpt-3-5
sistency by measuring how closely the predicted               6
                                                               https://platform.openai.com/docs/models/gpt-4-and-gpt-
multi-modal dialogues align with the ground truth         4-turbo
                                                                                                             Answer Prediction (F1)
      Category                 Model               Context Length
                                                                           Single Hop         Multi Hop      Temporal    Open Domain            Adversarial   Overall
       Human                   Human                        -                   95.1               85.8        92.6              75.4              89.4        87.9
                        Mistral-Instruct-7B                8K                   10.2               12.8        16.1              19.5              17.0        13.9
                          Llama-2-Chat-70B                4,096                 19.7               14.4        13.3              15.9              22.1        17.9
        Base
                            GPT-3.5-turbo                 4,096                 29.9               23.3        17.5              29.5              12.8        22.4
                             GPT-4-turbo                  4,096                 23.4               23.4        10.4              24.6              70.2        32.1
                                                           4K                   31.7               25.4        16.8              27.6              13.1        24.1
                                                           8K                   38.8               31.2        21.0              35.0              8.4         25.2
    Long context         GPT-3.5-turbo-16K
                                                          12K                   51.1               40.4        25.0              36.5              6.4         33.5
                                                          16K                   56.4               42.0        20.3              37.2              2.1         37.8

Table 2: Question answering performance of Base and Long-context models. Optimal performance is in bold.
Results are based on F1-score for answer prediction; higher is better.

                                            Answer Prediction (F1 score)                                                       Recall Accuracy (R@k)
                           Single   Multi      Temporal   Open        Adver-       Overall          Single    Multi     Temporal        Open        Adver-    Overall
    Retrieval Unit top-k
                            Hop     Hop                   Domain      -sarial                        Hop      Hop                       Domain      -sarial
       None         -       29.9    23.3         17.5       29.5       12.8            22.4           -         -          -              -            -         -
                   5        42.9    19.4         21.3       35.8       31.9            31.7         66.2      34.4        89.2           38.5        45.7       58.8
                   10       46.3    26.8         24.8       37.5       29.8            34.6         72.8      247.4       97.3           53.8        54.3       67.5
      Dialog
                   25       48.1    36.1         26.2       43.4       23.4            35.8         87.5      64.1        97.3           67.9        69.1       79.9
                   50       50.9    37.2         24.6       38.3       17.0            34.8         90.4      75.5        97.3           67.9        77.7       84.8
                   5        44.3    30.6         41.9       40.2       44.7            41.4         52.9       40.1       81.1           38.5        29.8       49.6
                   10       42.2    30.5         42.1       41.9       36.2            38.8         57.4       53.1       83.8           46.2        41.5       57.1
    Observation
                   25       44.6    33.2         41.8       41.9       27.7            38.0         71.3       63.8       83.8           66.7        45.7       66.0
                   50       44.0    34.5         41.1       41.9       27.7            37.8         72.8       73.2       83.8           74.4        56.4       71.1
                   2        34.6    15.7         26.9       26.5       36.2            29.9         68.4       39.6       56.8           50.0        73.4       61.5
                   5        36.6    16.6         31.0       34.7       38.3            32.5         81.6       57.0       70.3           60.3        86.2       75.1
      Summary
                   10       34.5    14.7         29.3       31.6       40.4            31.5         93.4       82.3       91.9           80.8        94.7       90.7

Table 3: Question answering performance of RAG-based GPT-3.5-turbo-16k. Optimal performance is in bold.
Results are based on F1-score metric for answer prediction and recall@k for recall accuracy; higher is better.

6      Experimental Results                                                               input is top 5 relevant observations instead of pure
                                                                                          conversation logs. This improvement falters with
We evaluate and analyze the comprehensive perfor-                                         an increase in the number of retrieved observations,
mance of all baseline methods for question answer-                                        suggesting that it is important to reduce the signal-
ing (§6.1), event graph summarization (§6.2), and                                         to-noise (SNR) ratio in retrieved contexts for mod-
multi-modal dialogue generation (§6.3).                                                   els to utilize the context accurately. Conversely,
                                                                                          using session summaries as context does not sig-
6.1       Question Answering Task                                                         nificantly improve the performance despite high
Tables 2 and 3 present the performance results for                                        recall accuracies7 , likely due to loss of information
the question answering task. We find that: (1)                                            during the conversion of dialogs to summaries.
LLMs with limited context length face chal-                                                 The interesting finding is that time reasoning
lenges in understanding extremely long conver-                                            and open-domain knowledge questions are the
sations due to truncated context windows. De-                                             most challenging scenarios.
spite gpt-4-turbo emerging as the top-performing
                                                                                             (1) LLMs face challenges in understanding time
model with an overall score of 32.4, it notably lags
                                                                                          concepts within dialogues, which is consistent
behind the human benchmark of 87.9; (2) long-
                                                                                          with findings from other single-turn-based bench-
context LLMs can comprehend longer narra-
                                                                                          marks focused on temporal reasoning capabilities
tives, yet they are prone to generating halluci-
                                                                                          for LLMs (Wang and Zhao, 2023).
nations. gpt-3.5-turbo-16k outperforms other
approaches, but its performance on adversarial                                               (2) LLMs struggle with open-domain knowledge
questions drops to a mere 2.1%, as compared                                               and degrade in the RAG setting. This suggests that
to 22.1% using Llama-2-Chat and 70.2% using                                               while certain open-domain knowledge may be em-
GPT-4-turbo with 4K context windows. This indi-                                           bedded within the model’s parameters, introducing
cates that LLMs can be easily misled into generat-                                        improper context from inaccurate retrieval can lead
ing hallucinations when they are subjected to long                                        to a decline in performance (Mallen et al., 2023).
contexts; (3) RAG is effective when conversations
are stored as observations. There is a noticeable                                              7
                                                                                              For summary-based RAG models, the recall accuracy is
5% improvement with gpt-3.5-turbo when the                                                based on retrieving the summary of the relevant session(s).
                                                                                       ROGUE                               FactScore
      Category               Model               Context Length
                                                                      ROGUE-1         ROGUE-2     ROGUE-L        Precision     Recall      F1
                    Mistral-Instruct-7B                 8K                29.4             7.2       14.1           27.1        19.8      23.0
                      Llama-2-Chat-70B                 4,096              28.1             9.3       14.8           36.3        22.7      28.3
        Base
                         GPT-4-turbo                   4,096              38.8            11.4       20.6           51.6        41.8      45.1
                       GPT-3.5-turbo                   4,096              41.1            13.5       20.9           45.3        46.5      45.9
  Long context       GPT-3.5-turbo-16K                 16K                36.2            8.5        16.4           42.3        37.8      39.9

Table 4: Event summarization performance of Base and Long-context models. The optimal performance is
shown in bold. Results are based on ROUGE and FactScore (Min et al., 2023) metrics; higher is better.




                                                                                                  B. MM-Relevance by length of dialog (tokens)




        A. Example of a prediction from MiniGPT-5 with and without retrieval-based augmentation   C. BLEU-1, MM-Relevance of various methods

Figure 4: Multimodal dialog generation performance of MiniGPT-5. (A) an example of multimodal dialog
predicted using MiniGPT5 with and without observation as retrieved context, (B) Variation of MM-Relevance score
with length of dialog history, and (C) comparison of RAG-based MiniGPT-5 methods.


6.2     Event Summarization Task                                              less, there remains considerable scope for improv-
                                                                              ing performance on this task.
Table 4 presents results for the event summariza-                                From a manual analysis of predicted summaries,
tion task. The use of incremental summarization                               we identify five broad categories of event summa-
with gpt-3.5-turbo leads to the highest per-                                  rization errors made by LLMs: (1) missing infor-
formance in both recall and F1 score. While                                   mation in events because the model fails to make
gpt-4-turbo records a 5.3% improvement in pre-                                temporal and/or causal connections over a lengthy
cision over with gpt-3.5-turbo, it does not fare                              conversation; (2) hallucinations i.e., models pad
as well in terms of recall. The event summa-                                  extra details that are either not present in the con-
rization task requires long-range dependency to                               versation or are part of a different event in the same
understand the temporal and causal connections                                session; (3) errors from misunderstanding of dia-
between the events discussed by the speaker in                                log cues such as humor or sarcasm is a distinctive
multiple sessions (see Figure 7). Contrary to ex-                             issue with comprehension of dialogs; (4) inaccurate
pectations, the long-context model does not sur-                              speaker attributions; and (5) insignificant dialogs
pass the base model, despite its capability for                               that are wrongly considered as salient events. See
extended-range reasoning facilitated by a larger                              examples in Table 7 in the Appendix.
context window. gpt-3.5-turbo-16k exhibits
a decline in both precision (by 3.0%) and recall                              6.3     Multi-Modal Dialog Generation Task
(by 8.7%) compared to gpt-3.5-turbo which has                                 Figure 4 illustrates the effectiveness of various
a 4K context window. This suggests that long-                                 MiniGPT-5 training variants in multi-modal dia-
context models may not be proficient at utilizing                             logue generation. Incorporating context into train-
their context appropriately, which also aligns                                ing enhances performance, with the inclusion of
with similar findings in Li et al. (2023a) as well                            observation as context yielding significantly im-
as the QA task in L O C O M O. In terms of both the                           proved results. For instance, in Figure 4A, the re-
ROUGE and FactScore metrics, commercial mod-                                  trieved observations contain information about the
els (gpt-4-turbo, gpt-3.5-turbo) significantly                                speaker’s experience in video game tournaments,
outshine their open-source counterparts. Nonethe-                             which leads to the prediction of dialog and images
that are more faithful to the speaker’s persona. This    appropriate translations of our prompts.
observation is consistent with earlier findings from
the QA task as well (see Table 3). Also, we ob-          Closed-source LLMs. We use state-of-the-art
serve that the MM-Relevance score drops with an          LLMs in our dialog generation pipeline to create a
increase in the length of dialog history (see Fig-       dialog dataset that is as realistic as possible. Unfor-
ure 4B). Retrieval-augmented generation alleviates       tunately, this meant employing the strongest com-
the drop in MM-Relevance to some extent.                 mercial LLMs available through a paid API, similar
                                                         to many concurrent works that generate synthetic
7   Conclusion                                           conversations (Zhong et al., 2023; Lu et al., 2023).
                                                         We will make the code for our generative pipeline
We develop a human-machine pipeline to collect           publicly available in the hope that it can be made to
L O C O M O, a datset of 50 high-quality very long       work effectively with state-of-the-art open-source
conversations, each encompassing 300 turns and           LLMs in the future.
9K tokens on avg., over up to 35 sessions, and pro-
pose an evaluation framework consisting of three         Evaluation of long-form NLG. LLMs are prone
tasks that evaluate models’ proficiency in long con-     to generating verbose answers even when prompted
versations. Our experiments show that LLMs strug-        to answer in short phrases. This creates challenges
gle to comprehend long-term narratives within the        in evaluating the correctness of answers provided
dialog and fail to draw temporal and causal connec-      by LLMs and has been widely documented in NLP
tions between events discussed by speakers.              literature (Chang et al., 2023; Xu et al., 2023; Kr-
                                                         ishna et al., 2023). Our evaluation framework suf-
8   Limitations                                          fers from the same challenges when used for exper-
                                                         imenting with LLMs.
Hybrid human-machine generated data. Our
dataset is sourced primarily from text generated by
                                                         9   Broader Impacts
LLMs. We pursued this method, which has quickly
emerged as a popular alternative to time-intensive       We adopt and improve a framework of generative
manual data collection (Kim et al., 2023; Jang et al.,   agents introduced in Park et al. (2023) for the gen-
2023), to avoid the logistical and legal complexities    eration of long-term conversations. Consequently,
of collecting very long-term real-world conversa-        the ethical concerns of generative agents outlined
tions at scale. We ensure that the dataset mirrors       by Park et al. (2023) apply to our work as well,
real-world interactions as much as possible by hav-      especially since the goal of our framework is to
ing human annotators verify and edit the generated       make the conversations as realistic as possible.
conversations. However, we acknowledge that this            Specifically, conversational agents that can pose
dataset may not fully reflect the nuances of real-       as human beings with a realistic life, as enabled by
world online conversations.                              the temporal event graphs in our framework, pose
                                                         the risk that users may form parasocial relation-
Limited exploration of multimodal behavior.
                                                         ships with such agents that may affect their lives
Since the images in our dataset are sourced from the
                                                         adversely. We recommend that any practical de-
web, they do not demonstrate the visual long-term
                                                         ployment of the generative frameworks mentioned
consistencies that are usually exhibited in personal
                                                         in our work be always prefaced with a disclaimer
photos (e.g., appearance, home environment, peo-
                                                         about the source of the dialogs.
ple and pets, etc.). Consequently, we find that the
                                                            Second, the use of multimodal LLMs (Zheng
images in our dataset can be replaced with their
                                                         et al., 2023) to generate images conditioned on dia-
captions without much loss of information, except
                                                         log can lead to the propagation of misinformation
for cases where OCR is required. Nevertheless, our
                                                         and social biases, especially if the conversational
work is a first step toward research into the multi-
                                                         agent can be coerced into parroting false informa-
modal aspect of very long-term conversations.
                                                         tion or dangerous opinions.
Language. Our LLM-based pipeline for generat-               Third, it is tempting to use generative agents
ing long-term conversations has been developed for       to substitute real humans for a process, especially
the English language only. However, our pipeline         when there are significant challenges in working
can be made to work with any other language us-          with humans for a particular goal e.g., collecting
ing an LLM that is proficient at that language and       real-world interactions between humans over a year
or more. Care must be taken to ensure that such           Alan Cooper. 1999. The inmates are running the asylum.
substitutes are not made in studies whose outcomes          Springer.
may be used to make real-world decisions with tan-        Tri Dao, Dan Fu, Stefano Ermon, Atri Rudra, and
gible impacts on humans. Our work is merely a                Christopher Ré. 2022. Flashattention: Fast and
study of model comprehension in very long-term               memory-efficient exact attention with io-awareness.
                                                            Advances in Neural Information Processing Systems,
conversations. We do not make any recommenda-
                                                             35:16344–16359.
tions for real-world policies based on this study and
advise potential users of our framework to avoid          Abhishek Das, Satwik Kottur, Khushi Gupta, Avi Singh,
                                                            Deshraj Yadav, José MF Moura, Devi Parikh, and
making such recommendations as well.
                                                            Dhruv Batra. 2017. Visual dialog. In Proceedings of
                                                            the IEEE conference on computer vision and pattern
                                                            recognition, pages 326–335.
References
                                                          Jiazhan Feng, Qingfeng Sun, Can Xu, Pu Zhao, Yaming
Jaewoo Ahn, Yeda Song, Sangdoo Yun, and Gunhee               Yang, Chongyang Tao, Dongyan Zhao, and Qing-
   Kim. 2023. MPCHAT: Towards multimodal persona-            wei Lin. 2023. MMDialog: A large-scale multi-turn
   grounded conversation. In Proceedings of the 61st         dialogue dataset towards multi-modal open-domain
  Annual Meeting of the Association for Computational        conversation. In Proceedings of the 61st Annual
   Linguistics (Volume 1: Long Papers), pages 3354–          Meeting of the Association for Computational Lin-
   3377, Toronto, Canada. Association for Computa-           guistics (Volume 1: Long Papers), pages 7348–7363,
   tional Linguistics.                                       Toronto, Canada. Association for Computational Lin-
                                                             guistics.
Raviteja Anantha, Svitlana Vakulenko, Zhucheng Tu,
  Shayne Longpre, Stephen Pulman, and Srinivas            Silin Gao, Beatriz Borges, Soyoung Oh, Deniz Bayazit,
  Chappidi. 2021. Open-domain question answering             Saya Kanno, Hiromi Wakaki, Yuki Mitsufuji, and
  goes conversational via question rewriting. In Pro-        Antoine Bosselut. 2023a. PeaCoK: Persona com-
  ceedings of the 2021 Conference of the North Amer-         monsense knowledge for consistent and engaging
  ican Chapter of the Association for Computational          narratives. In Proceedings of the 61st Annual Meet-
  Linguistics: Human Language Technologies, pages            ing of the Association for Computational Linguistics
  520–534.                                                   (Volume 1: Long Papers), pages 6569–6591, Toronto,
                                                             Canada. Association for Computational Linguistics.
Stanislaw Antol, Aishwarya Agrawal, Jiasen Lu, Mar-
   garet Mitchell, Dhruv Batra, C Lawrence Zitnick, and   Tianyu Gao, Howard Yen, Jiatong Yu, and Danqi Chen.
   Devi Parikh. 2015. Vqa: Visual question answering.        2023b. Enabling large language models to generate
   In Proceedings of the IEEE international conference       text with citations. In Proceedings of the 2023 Con-
   on computer vision, pages 2425–2433.                      ference on Empirical Methods in Natural Language
                                                            Processing, pages 6465–6488, Singapore. Associa-
Jan Assmann and John Czaplicka. 1995. Collective             tion for Computational Linguistics.
  memory and cultural identity. New german critique,
  (65):125–133.                                           Sarik Ghazarian, Nuan Wen, Aram Galstyan, and
                                                            Nanyun Peng. 2022. Deam: Dialogue coherence
Amanda Bertsch, Uri Alon, Graham Neubig, and                evaluation using amr-based semantic manipulations.
 Matthew Gormley. 2024. Unlimiformer: Long-range            In Proceedings of the 60th Annual Meeting of the
 transformers with unlimited length input. Advances         Association for Computational Linguistics (Volume
 in Neural Information Processing Systems, 36.              1: Long Papers), pages 771–785.

Yapei Chang, Kyle Lo, Tanya Goyal, and Mohit Iyyer.       Xingwei He, Zhenghao Lin, Yeyun Gong, Alex Jin,
  2023. Booookscore: A systematic exploration of            Hang Zhang, Chen Lin, Jian Jiao, Siu Ming Yiu, Nan
  book-length summarization in the era of llms. In          Duan, Weizhu Chen, et al. 2023. Annollm: Making
  The Twelfth International Conference on Learning          large language models to be better crowdsourced
  Representations.                                          annotators. arXiv preprint arXiv:2303.16854.
                                                          William Hirst and Gerald Echterhoff. 2012. Remem-
Mingda Chen, Zewei Chu, Sam Wiseman, and Kevin
                                                            bering in conversations: The social sharing and re-
  Gimpel. 2022. Summscreen: A dataset for abstrac-
                                                            shaping of memories. Annual review of psychology,
  tive screenplay summarization. In Proceedings of the
                                                            63:55–79.
  60th Annual Meeting of the Association for Compu-
  tational Linguistics (Volume 1: Long Papers), pages     William Hirst and David Manier. 2008. Towards a psy-
  8602–8615.                                                chology of collective memory. Memory, 16(3):183–
                                                            200.
Yukang Chen, Shengju Qian, Haotian Tang, Xin Lai,
  Zhijian Liu, Song Han, and Jiaya Jia. 2023. Longlora:   William Hirst, Jeremy K Yamashiro, and Alin Coman.
  Efficient fine-tuning of long-context large language      2018. Collective memory from a psychological per-
  models. In The Twelfth International Conference on        spective. Trends in cognitive sciences, 22(5):438–
  Learning Representations.                                451.
Pegah Jandaghi, XiangHai Sheng, Xinyi Bai, Jay Pujara,      for Computational Linguistics: ACL 2023, pages
  and Hakim Sidahmed. 2023. Faithful persona-based          4536–4554, Toronto, Canada. Association for Com-
  conversational dataset generation with large language     putational Linguistics.
  models. arXiv preprint arXiv:2312.10007.
                                                          Young-Jun Lee, Byungsoo Ko, Han-Gyu Kim, Jongh-
Jihyoung Jang, Minseong Boo, and Hyounghun Kim.             wan Hyeon, and Ho-Jin Choi. 2023c. Dialogcc: An
   2023. Conversation chronicles: Towards diverse tem-      automated pipeline for creating high-quality multi-
   poral and relational dynamics in multi-session con-      modal dialogue datasets. In NeurIPS 2023 Workshop
   versations. In Proceedings of the 2023 Conference        on Instruction Tuning and Instruction Following.
   on Empirical Methods in Natural Language Process-
   ing, pages 13584–13606, Singapore. Association for     Jiaqi Li, Mengmeng Wang, Zilong Zheng, and Muhan
   Computational Linguistics.                                Zhang. 2023a. Loogle: Can long-context language
                                                             models understand long contexts? arXiv preprint
Albert Q Jiang, Alexandre Sablayrolles, Arthur Men-          arXiv:2311.04939.
  sch, Chris Bamford, Devendra Singh Chaplot, Diego
  de las Casas, Florian Bressand, Gianna Lengyel, Guil-   Junnan Li, Dongxu Li, Silvio Savarese, and Steven Hoi.
  laume Lample, Lucile Saulnier, et al. 2023. Mistral       2023b. Blip-2: Bootstrapping language-image pre-
  7b. arXiv preprint arXiv:2310.06825.                      training with frozen image encoders and large lan-
                                                            guage models. In International Conference on Ma-
Hyunwoo Kim, Jack Hessel, Liwei Jiang, Peter West,          chine Learning.
  Ximing Lu, Youngjae Yu, Pei Zhou, Ronan Bras,
  Malihe Alikhani, Gunhee Kim, Maarten Sap, and           Yanran Li, Hui Su, Xiaoyu Shen, Wenjie Li, Ziqiang
  Yejin Choi. 2023. SODA: Million-scale dialogue dis-       Cao, and Shuzi Niu. 2017. Dailydialog: A manually
  tillation with social commonsense contextualization.      labelled multi-turn dialogue dataset. In Proceedings
  In Proceedings of the 2023 Conference on Empiri-          of the Eighth International Joint Conference on Nat-
  cal Methods in Natural Language Processing, pages         ural Language Processing (Volume 1: Long Papers),
  12930–12949, Singapore. Association for Computa-          pages 986–995.
  tional Linguistics.
                                                          Xinnian Liang, Bing Wang, Hui Huang, Shuangzhi Wu,
Satwik Kottur, José M. F. Moura, Devi Parikh, Dhruv
                                                            Peihao Wu, Lu Lu, Zejun Ma, and Zhoujun Li. 2023.
  Batra, and Marcus Rohrbach. 2019. CLEVR-dialog:
                                                            Unleashing infinite-length input capacity for large-
  A diagnostic dataset for multi-round reasoning in vi-
                                                            scale language models with self-controlled memory
  sual dialog. In Proceedings of the 2019 Conference
                                                            system. arXiv preprint arXiv:2304.13343.
  of the North American Chapter of the Association for
  Computational Linguistics: Human Language Tech-
                                                          Chin-Yew Lin. 2004. ROUGE: A package for auto-
  nologies, Volume 1 (Long and Short Papers), pages
                                                            matic evaluation of summaries. In Text Summariza-
  582–595, Minneapolis, Minnesota. Association for
                                                            tion Branches Out, pages 74–81, Barcelona, Spain.
  Computational Linguistics.
                                                            Association for Computational Linguistics.
Kalpesh Krishna, Erin Bransom, Bailey Kuehl, Mohit
  Iyyer, Pradeep Dasigi, Arman Cohan, and Kyle Lo.        Sheng-Chieh Lin, Akari Asai, Minghan Li, Barlas Oguz,
  2023. Longeval: Guidelines for human evaluation of        Jimmy Lin, Yashar Mehdad, Wen-tau Yih, and Xilun
  faithfulness in long-form summarization. In Proceed-      Chen. 2023. How to train your dragon: Diverse aug-
  ings of the 17th Conference of the European Chap-         mentation towards generalizable dense retrieval. In
  ter of the Association for Computational Linguistics,     Findings of the Association for Computational Lin-
  pages 1642–1661.                                          guistics: EMNLP 2023, pages 6385–6400, Singapore.
                                                            Association for Computational Linguistics.
Wojciech Kryściński, Nazneen Rajani, Divyansh Agar-
 wal, Caiming Xiong, and Dragomir Radev. 2022.            Nelson Liu, Tianyi Zhang, and Percy Liang. 2023. Eval-
 Booksum: A collection of datasets for long-form            uating verifiability in generative search engines. In
 narrative summarization. In Findings of the Associ-        Findings of the Association for Computational Lin-
 ation for Computational Linguistics: EMNLP 2022,           guistics: EMNLP 2023, pages 7001–7025, Singapore.
 pages 6536–6558.                                           Association for Computational Linguistics.

Dong-Ho Lee, Jay Pujara, Mohit Sewak, Ryen White,         Nelson F. Liu, Kevin Lin, John Hewitt, Ashwin Paran-
  and Sujay Jauhar. 2023a. Making large language            jape, Michele Bevilacqua, Fabio Petroni, and Percy
  models better data creators. In Proceedings of the        Liang. 2024. Lost in the Middle: How Language
  2023 Conference on Empirical Methods in Natural           Models Use Long Contexts. Transactions of the Asso-
  Language Processing, pages 15349–15360, Singa-            ciation for Computational Linguistics, 12:157–173.
  pore. Association for Computational Linguistics.
                                                          Junru Lu, Siyu An, Mingbao Lin, Gabriele Pergola, Yu-
Gibbeum Lee, Volker Hartmann, Jongho Park, Dim-             lan He, Di Yin, Xing Sun, and Yunsheng Wu. 2023.
  itris Papailiopoulos, and Kangwook Lee. 2023b.            Memochat: Tuning llms to use memos for consis-
  Prompted LLMs as chatbot modules for long open-           tent long-range open-domain conversation. arXiv
  domain conversation. In Findings of the Association       preprint arXiv:2308.08239.
Alex Mallen, Akari Asai, Victor Zhong, Rajarshi Das,        Shoham. 2023. In-context retrieval-augmented lan-
  Daniel Khashabi, and Hannaneh Hajishirzi. 2023.           guage models. Transactions of the Association for
  When not to trust language models: Investigating          Computational Linguistics, 11:1316–1331.
  effectiveness of parametric and non-parametric mem-
  ories. In Proceedings of the 61st Annual Meeting of     Weijia Shi, Sewon Min, Michihiro Yasunaga, Min-
  the Association for Computational Linguistics (Vol-      joon Seo, Rich James, Mike Lewis, Luke Zettle-
  ume 1: Long Papers), pages 9802–9822, Toronto,           moyer, and Wen-tau Yih. 2023. Replug: Retrieval-
  Canada. Association for Computational Linguistics.       augmented black-box language models. arXiv
                                                           preprint arXiv:2301.12652.
Yuxian Meng, Shuhe Wang, Qinghong Han, Xi-
  aofei Sun, Fei Wu, Rui Yan, and Jiwei Li. 2020.         Michael Shum, Stephan Zheng, Wojciech Kryscinski,
  Openvidial: A large-scale, open-domain dialogue           Caiming Xiong, and Richard Socher. 2020. Sketch-
  dataset with visual contexts.    arXiv preprint           fill-a-R: A persona-grounded chit-chat generation
  arXiv:2012.15015.                                         framework. In Proceedings of the 2nd Workshop
                                                            on Natural Language Processing for Conversational
Sewon Min, Kalpesh Krishna, Xinxi Lyu, Mike Lewis,         AI, pages 118–131, Online. Association for Compu-
  Wen-tau Yih, Pang Koh, Mohit Iyyer, Luke Zettle-          tational Linguistics.
  moyer, and Hannaneh Hajishirzi. 2023. FActScore:
  Fine-grained atomic evaluation of factual precision     Kurt Shuster, Samuel Humeau, Antoine Bordes, and Ja-
  in long form text generation. In Proceedings of the       son Weston. 2020. Image-chat: Engaging grounded
  2023 Conference on Empirical Methods in Natural           conversations. In Proceedings of the 58th Annual
  Language Processing, pages 12076–12100, Singa-            Meeting of the Association for Computational Lin-
  pore. Association for Computational Linguistics.          guistics, pages 2414–2429, Online. Association for
                                                            Computational Linguistics.
Nasrin Mostafazadeh, Chris Brockett, Bill Dolan,
                                                          Kurt Shuster, Spencer Poff, Moya Chen, Douwe Kiela,
  Michel Galley, Jianfeng Gao, Georgios Spithourakis,
                                                            and Jason Weston. 2021. Retrieval augmentation
  and Lucy Vanderwende. 2017. Image-grounded con-
                                                            reduces hallucination in conversation. In Findings
  versations: Multimodal context for natural ques-
                                                            of the Association for Computational Linguistics:
  tion and response generation. In Proceedings of
                                                            EMNLP 2021, pages 3784–3803.
  the Eighth International Joint Conference on Nat-
  ural Language Processing (Volume 1: Long Papers),       Hugo Touvron, Louis Martin, Kevin Stone, Peter Al-
  pages 462–472, Taipei, Taiwan. Asian Federation of        bert, Amjad Almahairi, Yasmine Babaei, Nikolay
  Natural Language Processing.                              Bashlykov, Soumya Batra, Prajjwal Bhargava, Shruti
                                                            Bhosale, et al. 2023. Llama 2: Open founda-
Yixin Nie, Mary Williamson, Mohit Bansal, Douwe             tion and fine-tuned chat models. arXiv preprint
  Kiela, and Jason Weston. 2021. I like fish, espe-         arXiv:2307.09288.
  cially dolphins: Addressing contradictions in dia-
  logue modeling. In Proceedings of the 59th Annual       Yuqing Wang and Yun Zhao. 2023. Tram: Benchmark-
  Meeting of the Association for Computational Lin-         ing temporal reasoning for large language models.
  guistics and the 11th International Joint Conference      arXiv preprint arXiv:2310.00835.
  on Natural Language Processing (Volume 1: Long
  Papers), pages 1699–1713.                               Sean Welleck, Jason Weston, Arthur Szlam, and
                                                            Kyunghyun Cho. 2019. Dialogue natural language
Kishore Papineni, Salim Roukos, Todd Ward, and Wei-         inference. In Proceedings of the 57th Annual Meet-
  Jing Zhu. 2002. Bleu: a method for automatic evalu-       ing of the Association for Computational Linguistics,
  ation of machine translation. In Proceedings of the       pages 3731–3741, Florence, Italy. Association for
  40th Annual Meeting of the Association for Compu-         Computational Linguistics.
  tational Linguistics, pages 311–318, Philadelphia,
  Pennsylvania, USA. Association for Computational        Thomas Wolf, Lysandre Debut, Victor Sanh, Julien
  Linguistics.                                              Chaumond, Clement Delangue, Anthony Moi, Pier-
                                                            ric Cistac, Tim Rault, Remi Louf, Morgan Funtow-
Joon Sung Park, Joseph O’Brien, Carrie Jun Cai, Mered-      icz, Joe Davison, Sam Shleifer, Patrick von Platen,
  ith Ringel Morris, Percy Liang, and Michael S. Bern-      Clara Ma, Yacine Jernite, Julien Plu, Canwen Xu,
  stein. 2023. Generative agents: Interactive simulacra     Teven Le Scao, Sylvain Gugger, Mariama Drame,
  of human behavior. In Proceedings of the 36th An-         Quentin Lhoest, and Alexander Rush. 2020. Trans-
  nual ACM Symposium on User Interface Software             formers: State-of-the-art natural language processing.
  and Technology, UIST ’23, New York, NY, USA.              In Proceedings of the 2020 Conference on Empirical
  Association for Computing Machinery.                      Methods in Natural Language Processing: System
                                                            Demonstrations, pages 38–45, Online. Association
John Pruitt and Jonathan Grudin. 2003. Personas: prac-      for Computational Linguistics.
  tice and theory. In Proceedings of the 2003 confer-
  ence on Designing for user experiences, pages 1–15.     Guangxuan Xiao, Yuandong Tian, Beidi Chen, Song
                                                            Han, and Mike Lewis. 2023. Efficient streaming
Ori Ram, Yoav Levine, Itay Dalmedigos, Dor Muhlgay,         language models with attention sinks. arXiv preprint
  Amnon Shashua, Kevin Leyton-Brown, and Yoav               arXiv:2309.17453.
Fangyuan Xu, Yixiao Song, Mohit Iyyer, and Eunsol          Yinhe Zheng, Guanyi Chen, Xin Liu, and Jian Sun.
  Choi. 2023. A critical evaluation of evaluations for       2022. MMChat: Multi-modal chat dataset on so-
  long-form question answering. In Proceedings of the        cial media. In Proceedings of the Thirteenth Lan-
  61st Annual Meeting of the Association for Compu-          guage Resources and Evaluation Conference, pages
  tational Linguistics (Volume 1: Long Papers), pages        5778–5786, Marseille, France. European Language
  3225–3245, Toronto, Canada. Association for Com-           Resources Association.
  putational Linguistics.
                                                           Wanjun Zhong, Lianghong Guo, Qiqi Gao, and Yan-
Jing Xu, Arthur Szlam, and Jason Weston. 2022. Be-          lin Wang. 2023. Memorybank: Enhancing large
   yond goldfish memory: Long-term open-domain con-         language models with long-term memory. arXiv
   versation. In Proceedings of the 60th Annual Meet-       preprint arXiv:2305.10250.
   ing of the Association for Computational Linguistics
   (Volume 1: Long Papers), pages 5180–5197.               Li Zhou, Jianfeng Gao, Di Li, and Heung-Yeung Shum.
                                                              2020. The design and implementation of xiaoice, an
Xiaoxue Zang, Lijuan Liu, Maria Wang, Yang Song,              empathetic social chatbot. Computational Linguis-
  Hao Zhang, and Jindong Chen. 2021. PhotoChat: A             tics, 46(1):53–93.
  human-human dialogue dataset with photo sharing
  behavior for joint image-text modeling. In Proceed-      Appendix Overview
  ings of the 59th Annual Meeting of the Association for
  Computational Linguistics and the 11th International     The appendix is organized as follows:
  Joint Conference on Natural Language Processing          Section A: Details of generative pipeline for the
  (Volume 1: Long Papers), pages 6142–6152, Online.        L O C O M O dataset.
  Association for Computational Linguistics.
                                                           Section B: Statistics of L O C O M O dataset, license
Chen Zhang, Yiming Chen, Luis Fernando D’Haro,             for data release and annotator details.
  Yan Zhang, Thomas Friedrichs, Grandee Lee, and           Section C: Experimental setup and implementation
  Haizhou Li. 2021a. Dynaeval: Unifying turn and           details.
  dialogue level evaluation. In Proceedings of the 59th
  Annual Meeting of the Association for Computational      Section D: Additional results from evaluation on
  Linguistics and the 11th International Joint Confer-     the L O C O M O benchmark.
  ence on Natural Language Processing (Volume 1:
  Long Papers), pages 5676–5689.
                                                           A     Generative Pipeline for L O C O M O
Chen Zhang, Luis Fernando D’Haro, Qiquan Zhang,
  Thomas Friedrichs, and Haizhou Li. 2022. Fined-          A.1    Persona
  eval: Fine-grained automatic dialogue-level evalu-
  ation. In Proceedings of the 2022 Conference on          We assign unique persona statement p to each agent
  Empirical Methods in Natural Language Processing,        Li . For this, we select a range of initial persona
  pages 3336–3355.                                         statements pc from the MSC dataset (Xu et al.,
Qiang Zhang, Jason Naradowsky, and Yusuke Miyao.
                                                           2022), each encompassing 4 to 5 sentences. We
  2023. Mind the gap between conversations for im-         employ gpt-3.5-turbo as M to expand these into
  proved long-term dialogue generation. In Findings        full persona statement p, conditioning M on the
  of the Association for Computational Linguistics:        chosen statements pc . The prompt used for con-
  EMNLP 2023, pages 10735–10762, Singapore. Asso-
                                                           verting a short list of speaker attributes from the
  ciation for Computational Linguistics.
                                                           MSC dataset (Xu et al., 2022) into a complete per-
Shiyue Zhang, Asli Celikyilmaz, Jianfeng Gao, and          sona summary is presented in Fig. 5. We also use a
  Mohit Bansal. 2021b. Emailsum: Abstractive email         single example of speaker attribute → persona sum-
  thread summarization. In Proceedings of the 59th         mary as an in-context demonstration along with the
  Annual Meeting of the Association for Computational
  Linguistics and the 11th International Joint Confer-     prompt. A small selection of personas showcasing
  ence on Natural Language Processing (Volume 1:           the diversity of speakers in the L O C O M O dataset
  Long Papers), pages 6895–6909.                           is demonstrated in Fig. 5.
Tianyi Zhang, Varsha Kishore, Felix Wu, Kilian Q Wein-     A.2    Temporal Event Graph
   berger, and Yoav Artzi. 2019. Bertscore: Evaluating
   text generation with bert. In International Confer-     As outlined in Sec. 3.2, we use an iterative process
   ence on Learning Representations.                       for generating event graphs consisting of causally
                                                           connected events based on a given persona sum-
Kaizhi Zheng, Xuehai He, and Xin Eric Wang. 2023.
  Minigpt-5: Interleaved vision-and-language gen-
                                                           mary. The base prompt for describing the con-
  eration via generative vokens. arXiv preprint            stitution of the event graph, the nature of events
  arXiv:2310.02239.                                        and causal connections between events is shown in
 Let's write speaker descriptions from a given set of life attributes. Add crucial details in the persona about
    the person such as their name, age, marital status, gender, job etc. Add additional details like names of
            family/friends or specific activities, likes and dislikes, experiences when appropriate.




Figure 5: Prompt for persona statement (p) generation and examples of personas in L O C O M O. The prompt
used to generate expanded persona statements (p) from initial personas (pc ) for the virtual agents in our conversation
generation pipeline (top) and select examples of persona statements present in the L O C O M O dataset.


Fig. 6. First, the base prompt is used along with the        about each speaker, that are essentially assertive
prompt for event graph initialization to generate            statements about the speaker’s persona and life.
three independent events relevant to a given per-            See the prompt given to LLMs in our pipeline for
sonality. Then, the base prompt is combined with             generating observations, and an example of obser-
the prompt for the iterative generation of events to         vations extracted from a conversation, in Fig. 9. In
continue generating events that are caused by one            practice, the conversation is annotated with turn
or more of the events that are already present in            IDs for each turn, and the model is also instructed
the graph. See an example of a persona and the               to indicate the turn IDs that directly contribute to
corresponding temporal event graph in Fig. 7. In             each observation. This allows us to keep track of
the example, Jack aspires to be a hotel manager.             the evidence when using observations as the con-
Consequently, he enrolls in a hotel management               text for RAG-based models used in our experiments
course in July, and after three months, he expresses         (see Section 5).
his excitement about the course on social media. In
a similar vein, his passion for gaming results in an         Image sharing & response. See prompts for im-
invitation from a well-known gaming company.                 plementing image-sharing and image-response be-
                                                             haviors in Figure 10.
A.2.1    Virtual Agent Architecture
                                                             A.3    Human Filtering
As outlined in Section 3.3, the virtual agents in our
                                                             Human annotators are instructed to edit the LLM-
generative pipelines are composed of two mecha-
                                                             generated conversations in the following scenarios:
nisms, Reflect & respond (Park et al., 2023) and
Image sharing & response.                                        • Remove an image if it is not relevant to the
                                                                   current dialog or the conversation.
Reflect & respond. This mechanism operates
over a combination of short-term and long-term                   • Add context about an image to the current
memory. The short-term memory is a summary of                      speaker’s dialog if it is not discussed by them
a session that is conditioned on the summary from                  but the subsequent speaker has reacted to the
a previous session. See the prompt given to LLMs                   image.
in our pipeline for generating summaries, and an
example of a generated summary, in Fig. 8. The                   • Replace an image if it does not match the
long-term memory is a database of observations                     caption that was used to query for images.
 Let's write a graph representing events that occur in a person's life based on a short summary of their
 personality. Nodes represent events and edges represent the influence of past sub-events on a current event.
 - The graph is represented in the form of a json list.
 - Each entry is a dictionary containing the following keys: "event", “date", "caused_by", "id".
 - The "event" field contains a short description of the event.
 - The “date" field contains a date.
 - The "id" field contains a unique identifier for the event.
 - The "caused_by" field represents edges and is a list of "id" of existing events that have caused this event.
 Events in the "caused_by" field should occur on dates before the event they have caused. Generate as many
 causal connections as possible.
 - An example of a causal effect is when the event "started a vegetable garden" causes "harvested tomatoes".
 - Events can be positive or negative life events.




 For the following input personality, generate three independent events E1, E2 and E3 aligned with their
 personality. Events can be positive or negative life events and should reflect evolution in the person's
 relationships, state of mind, personality etc.




 For the following input personality, generate new events that are caused by one or more EXISTING events. Events
 can be positive or negative life events and should reflect evolution in the person's relationships, state of
 mind, personality etc. Do not repeat existing sub-events. Start and end your answer with a square bracket.


Figure 6: Prompts for temporal event graph generation. The prompt used to generate complete personas for the
LLMs in our conversation generation pipeline (top) and examples of personas present in the L O C O M O dataset.




Figure 7: Temporal Event Graph G Creation. Each event is generated in accordance with the specified persona p
and causal connections l between events are depicted to illustrate the casual relationships among them.


    • Edit the dialog when the information present         B.2        Dataset License
      in the dialog is inconsistent with something        The L O C O M O dataset will be released under the
      said (or shared through an image) in earlier or     CC BY-NC 4.0 DEED license.8
      later turns.
                                                           B.3        Annotator Details
    • Edit the dialog to ensure that the details in the
      conversation are consistent with those given        The annotators who worked on the L O C O M O
      in the event for the session.                       dataset were in-house annotators and we were un-
                                                          able to obtain their demographics due to the confi-
    • Remove any events from the event graph if           dential nature of such information.
      they do not appear in the conversation.
                                                           C        Experimental Setup
    See an example of some edits in Fig. 11.
                                                           C.1        Baselines
B     Dataset
                                                          The conversations in the L O C O M O dataset are
B.1    Dataset Statistics                                 composed of natural language dialogs and images
See a breakdown of the statistics of the conversa-        that require higher-order reasoning and multimodal
tions in the L O C O M O dataset in the top panel of      coreference resolution, respectively. From initial
Table 5. Also, see a breakdown of the statistics of       studies, we observed that multimodal coreference
the annotations in the evaluation benchmark in the              8
                                                                    https://creativecommons.org/licenses/by-nc/4.
bottom panel of Table 5.                                   0/
 In previous interactions, {previous_summary}. The current time and date are {current_date_and_time}.
 {speaker_1_name} and {speaker_2_name} talked today and had the following conversation: {session} Summarize the
 interactions between {speaker_1_name} and {speaker_2_name} so far. Include key details about both speakers and
 include time references wherever possible.



                    1:14 pm on 25 May, 2023                                   On 21 January 2022, Joanna and Nate reunited after a long time without seeing each
                                                                              other. Nate won his first video game tournament playing Counter-Strike: Global
      Hey Nate! Haven't talked in a few days. Crazy things                    Offensive. Joanna enjoys writing, reading, watching movies, and exploring nature as
                      happened to me!                                         hobbies. They both share a love for movies, with Nate favoring action and sci-fi while
                                                                              Joanna prefers dramas and romcoms. Joanna recommended a romantic drama to Nate,
   Hi Joanna! Long time no see! What's been going on? You
                                                                              which he expressed interest in watching. Nate praised Joanna's recommendation and
                       sound excited!
                                                                              promised to give it a try.
    Woo! I finally finished my first full screenplay and printed it
   last Friday. I've been working on for a while, such a relief to
                           have it all done!
                                                                              Joanna and Nate reunited on 21 January 2022 after a long time without seeing each
    Wow, that sounds awesome! What's it about? Glad it's all                  other. They share a love for movies, with Nate favoring action and sci-fi while Joanna
     down! Thanks, Nate! It's a mix of drama and romance!                     prefers dramas and romcoms. Joanna recommended a romantic drama to Nate, which
                                                                              he expressed interest in watching. On 23 January 2022, at 2:01 pm, Joanna shared her
         Thanks, Nate! It's a mix of drama and romance!                       excitement about finishing her first full screenplay, which is a mix of drama and
  Wow, that's amazing! How do you feel now that it's finished?                romance, and her plans to submit it to film festivals. Nate congratulated her and shared
               Do you have any new plans for it?                              his own experience with his pet turtles, recommending having pets for times of stress.
                                                                              Joanna mentioned her allergies to most animals with fur, prompting Nate to inquire
    I'm feeling a rollercoaster of emotions - relief, excitement,             further about her allergies and express empathy towards her situation. Despite her
             some anxiety - over finishing this project.                      allergies, Joanna finds joy in writing and spending time with friends. The conversation
                                                                              ended on a positive note with Nate encouraging Joanna to keep pursuing her passion
                                                                              for writing.


Figure 8: Prompt for generating conversation summaries. The prompt used to iteratively generate a summary
for the current session by conditioning on summary from preceding sessions and the raw conversation logs of the
current session (top); and an example of inputs for the prompt and corresponding output summary of a session from
the L O C O M O dataset.


 Conversation Statistics                                            # Counts               Question Answering. We carry out experiments
 Total. # conversations h.                                              50                 using three distinct methodologies: (1) Base in-
 Avg. # sessions k. in conversation h                                  19.3
 Avg. # turns j. in session k                                          15.8                volves utilizing LLMs to directly conduct the task
 Avg. # tokens. conversation h                                        9,209.2              within a constrained context. The task description
 Avg. # tokens. dialogue hkj of turn j in session k                     30.2
 Avg. # tokens. observation okj of turn j in session k                  18.2               comes after the dialogue history. To accommo-
 Avg. # tokens. summary wk of session k                                127.4
                                                                                           date the restricted context window size, earlier di-
 QA Benchmark Statistics
                                                                                           alogues are omitted; (2) Long-context employs
 # questions. single-hop retrieval                              2,705 (36%)
 # questions. multi-hop retrieval                              1,104 (14.6%)               LLMs with an extended context window to ex-
 # questions. temporal reasoning                               1,547 (20.6%)               pose the models to as much dialogue context as
 # questions. open domain knowledge                              285 (3.9%)
 # questions. adversarial                                      1,871 (24.9%)               possible; (3) Retrieval-augmented Generation
 Total. # questions.                                               7,512
                                                                                           (RAG) involves retrieving relevant context from a
 Event Summarization Statistics
 Avg. # ground truth events. in conversation h                         24.2
                                                                                           database of dialog history, observations, or session-
 Avg. # tokens. event summary                                         896.5                level summaries. Observations are assertions about
 Multi-modal Dialogue Generation Statistics                                                each speaker extracted from the dialog history as
 Avg. # images. in conversation h                                      32.3                described in §3.3, see an example in Figure 9.
                                                                                           Session-level summaries are concise summaries
Table 5: Dataset Statistics of conversation and corre-
                                                                                           of the conversation that takes place in each session,
sponding benchmark
                                                                                           see an example in Figure 8.
                                                                                              For the retrieval model, we employ
resolution can be performed effectively by replac-                                         DRAGON (Lin et al., 2023). In the Base,
ing images in L O C O M O with their captions gen-                                         we utilize Mistral-7B (Jiang et al., 2023), LLama-
erated using BLIP-2 (Li et al., 2023b), and using                                          70B-chat (Touvron et al., 2023), gpt-3.5-turbo 9 ,
state-of-art LLMs to reason over natural language                                          and gpt-4-turbo 10 . To assess the effectiveness
text interleaved with image captions. Hence, our                                           in practical scenarios for Long-context and
experiments for the question answering and event                                           RAG, we draw comparisons using variants of
summarization tasks are conducted using LLMs.                                                  9
                                                                                                https://platform.openai.com/docs/models/gpt-3-5
We use the images directly only for experiments on                                            10
                                                                                                https://platform.openai.com/docs/models/gpt-4-and-gpt-
the multimodal dialog generation task.                                                     4-turbo
 Write a concise and short list of all possible OBSERVATIONS about each speaker that can be gathered from the
 CONVERSATION. Each observation should contain a piece of information about the speaker. The OBSERVATIONS should
 be objective factual information about the speaker that can be used as a database about them. Avoid abstract
 observations about the dynamics between the two speakers such as 'speaker is supportive', 'speaker appreciates'
 etc. Do not leave out any information from the CONVERSATION.



                              1:56 pm, May 8, 2023                                Joanna
                Hey Joanna! Long time no see! What's up? ..
                                                                                  •    Joanna has been working on a project recently.
  Hey Nate! Long time no see! I've been working on a                              •    Joanna enjoys writing, reading, watching movies, and exploring
  project lately - it's been pretty cool. What about you -                             nature as hobbies.
  any fun projects or hobbies?                                                    •    Joanna is into dramas and romcoms when it comes to movies.
                                                                                  •    Joanna recommends a romantic drama movie that is all about
                I won my first video game tournament last week - so exciting!          memory and relationships.
                                                                                  •    Joanna watched the recommended movie around 3 years ago and
  Wow Nate! Congrats on winning! Tell me more - what
                                                                                       even owns a physical copy.
                   game was it?
                Thanks! it's a team shooter game.                                  Nate

  Wow, great job! What was is called?                                             •    Nate won his first video game tournament last week.
                                                                                  •    The video game Nate won the tournament in is called Counter-
                The game was called Counter-Strike: Global Offensive, and              Strike: Global Offensive.
                me and my team had a blast to the very end!                       •    Playing video games and watching movies are Nate's main
                                                                                       hobbies.
  Sounds like a fun experience .. if I'm not into games.                          •    Nate enjoys action and sci-fi movies.
                                                                                  •    Nate loves watching classics.


Figure 9: Prompts for generating observations from conversations. The prompt used to generate observations
from a conversation (top); and an example of inputs for the prompt and corresponding output observations for a
session from the L O C O M O dataset.


gpt-3.5-turbo. We do not report the perfor-                                     out human filtering) as detailed in §3. Three dis-
mance of long-context fine-tuned open-source                                    tinct versions of the model were developed, each
models (Chen et al., 2023) or those utilizing sliding                           with varying training data: (1) Base trains on pre-
window (Bertsch et al., 2024; Dao et al., 2022)                                 ceding dialogue turns; (2) + summary trains on
due to the variability inherent across different                                both prior dialogue turns and a global summary
open-source models and the potential reduction in                               of the ongoing conversation; (3) + observation
their capability on shorter context.                                            trains on both preceding dialogue turns and rele-
                                                                                vant observations retrieved from the conversation
Event Summarization. We present experiments
                                                                                history. For each of these models, we started with
conducted in two distinct configurations. We use
                                                                                a MiniGPT-5 checkpoint pretrained on the MMDi-
both the Base and Long-context setups from the
                                                                                alog dataset (Feng et al., 2023).
question answering task, but we refrained from in-
cluding RAG since summarization requires a com-
                                                                                C.2     Implementation Details
prehensive understanding of the entire dialogue,
rather than just retrieving a specific portion. A no-                           We use OpenAI API and Huggingface (Wolf et al.,
table distinction in our approach, compared to the                              2020), as of January 2024, with specific settings of
question-answering task, lies in our handling of the                            temperature set to 0 and topp set to 1 for evalua-
context. Specifically, we employ an iterative pro-                              tion of the L O C O M O benchmark. All experiments,
cess of creating a summary of a preceding session                               including those for RAG-based models, MiniGPT-
and then use that summary as a basis to generate the                            5 training, and inference, are conducted on an
summary for the subsequent session (Chang et al.,                               Nvidia A6000 server with FP32. We report results
2023). Further, we use a single in-context demon-                               from a single inference run for each model in our
stration of input and output to guide the model                                 experiments. For MiniGPT-5, we used the hyper-
toward selecting only significant life events for the                           parameters recommended in the original codebase
summary.                                                                        and trained our models for 10 epochs, which took
                                                                                approximately 30 hours on a single A6000 GPU.
Multi-modal Dialogue Generation. For evalu-
                                                                                   We use the default implementations of BLEU11 ,
ating multi-modal dialogue generation, we train
MiniGPT-5 (Zheng et al., 2023) on 50 conversa-                                    11
                                                                                    https://www.nltk.org/_modules/nltk/translate/
tions generated using our automated pipeline (with-                             bleu_score.html
                                                       →

 Let's write short image search queries from textual descriptions of photos shared by a user.
 Queries should not include names of people, years and other irrelevant details. For example:

 Input: That sounds relaxing, Jeremy! As for video game suggestions, have you ever tried "The Legend
 of Zelda: Breath of the Wild"? It's an open-world adventure game that I absolutely love. [shares a
 photo of Link standing in front of a breathtaking landscape] Have a look at this stunning view!
 Output: the legend of zelda: breath of wild link landscape

 Input: {generated_image_caption}
 Output:



                                                     →

 {speaker_1_persona}
 {speaker_2_persona}

 {speaker_1_name} says, {current_turn}, and shares a photo of {shared_image_caption_blip2}. Write
 the most natural question or comment {speaker_2_name} can include in their response.


Figure 10: Prompts for image-sharing and image-response behavior. The prompt used to convert a caption
generated by the virtual agent into an image query for the web-based image crawler in our pipeline (top), and the
prompt used to generate a response grounded in the image shared by a virtual agent during a conversation as well as
the personas of the respective speakers (bottom).


         Category   top-k   BLEU-1/2      Rouge-L   MM-R
          Base        -     57.1 / 34.2    12.4     56.1
     + summary        1     58.2 / 34.1    12.8     56.9
     + summary        2     56.5 / 32.8    12.1     55.1
     + summary        5     56.1 / 32.5    12.0     55.2
 + observation        5     59.7 / 35.1    13.6     57.8
 + observation       10     59.1 / 34.9    12.8     57.1
 + observation       25     58.5 / 34.2    12.0     56.5

Table 6: Multi-modal dialogue generation perfor-
mance comparison between different training variants
of MiniGPT-5. The optimal performance is shown in
bold.


ROUGE12 , BertScore13 , FactScore14 metrics in
their respective Python packages in our evaluation
protocol.

D        Results
D.1        Event Summarization Task
See an example of the five broad categories of event
summarization errors made by LLMs, outlined in
Section 6.2, in Table 7.

D.2        Multimodal Dialog Generation Task
Results from evaluation of various version of
MiniGPT-5 model on the multimodal dialog gener-
ation task in the L O C O M O benchmark is in Table 6.
    12
       https://pypi.org/project/rouge/
    13
       https://pypi.org/project/bert-score/
    14
       https://github.com/shmsw25/FActScore
    Remove or substitute irrelevant                           Edit inconsistent dialogs                             Edit dialogs to follow event graph
               images

        .. Oh, and I'm                                   My grandma                                                  Event: Joseph participates in a
    planning my solo trip                                sent me a                                                   photography workshop and improves
      to five countries!                                 postcard from                                               his photography skills.
        Exciting stuff.                                  Paris years ago.

                 Wow, Debra! 5
                                                                      .. Where'd you get it? …                        .. Anything new at work or
                 countries, awesome!
                                                                                                                      fun for the weekend?
                 Where're you headed?
                 Need help planning or
                 any tips? Count me in!                   Thanks Joe! I got the                                                   .. I did a photoshoot last
                                                          postcard from an antique                                                Friday and learned some
                                                          shop…                                                                   new tricks. ..

                                                          Thanks Joe! My                                                          .. I participated in a
                                                          grandmother got the                                                     photography workshop last
                                                          postcard from an antique                                                Friday and learned some
                                                          shop…                                                                   new tricks. ..



Figure 11: Example of edits made by annotators. Human annotators are instructed to make edits in the LLM-
generated conversations to remove irrelevant The prompt used to generate complete personas for the LLMs in our
conversation generation pipeline (top) and examples of personas present in the L O C O M O dataset.




  Error Type                      Explanation                     Ground truth event or relevant dialogs                                  Predicted event
    Missing        Key details about event are omitted because    Joanna submits her third screenplay on loss, identity, and         Joanna submits her recent
  information      the model fails to make causal and temporal    connection to a film contest                                      screenplay to a film contest.
                      connections over a long conversation.
 Hallucination        Non-existent details or details from a      N: ‘The gaming party was a great success!’                      Nate’s vegan ice cream is a huge
                     different event are padded onto an event     N: ‘... said they’d want to do it again next month!’            success and people want to do it
                                                                  N: ‘On another note, I made vegan ice cream ...’                       again next month.
    Misunder-          e.g., model confuses a light-hearted       J: ‘.. these trails that made me feel like writing a drama.’     Nate considers writing his own
  -standing of        statement from a speaker as a serious       N: ‘.. go together .. Maybe I’ll start to think of a drama             drama screenplay.
   dialog cues                      statement                     myself and write a screenplay ...’
                                                                  J: ‘Haha, now that would be something! ...’
    Speaker          Event is attributed to the wrong speaker     Nate invites Joanna to try his homemade lactose-free ice       Joanna invites Nate to her home to
   attribution                                                    cream.                                                         try her dairy-free ice cream recipe.
   Saliency        Unimportant interactions in the conversation   N: Hey Joanna, what’s been up since we last chatted?           Nate asks Joanna how she has been
                      are considered significant by model         How’s it going?                                                       she they last talked.


Table 7: Taxonomy of errors in LLM-generated event summaries. Five types of errors predominantly occur in
the event summaries generated by LLMs. Examples are based on predictions from gpt-3.5-turbo.
