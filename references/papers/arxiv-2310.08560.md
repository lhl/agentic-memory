<!-- Generated from arxiv-2310.08560.pdf via pdftotext -layout on 2026-02-22 -->

                                                                  MemGPT: Towards LLMs as Operating Systems


                                                                             Charles Packer 1 Sarah Wooders 1 Kevin Lin 1
                                                                    Vivian Fang 1 Shishir G. Patil 1 Ion Stoica 1 Joseph E. Gonzalez 1


                                                                   Abstract                                  LLMs can only support a few dozen back-and-forth mes-
                                                                                                             sages or reason about a short document before exceeding
                                                Large language models (LLMs) have revolution-
                                                                                                             their maximum input length (Touvron et al., 2023).




arXiv:2310.08560v2 [cs.AI] 12 Feb 2024
                                                ized AI, but are constrained by limited context
                                                windows, hindering their utility in tasks like ex-           Directly extending the context length of transformers in-
                                                tended conversations and document analysis. To               curs a quadratic increase in computational time and mem-
                                                enable using context beyond limited context win-             ory cost due to the transformer architecture’s self-attention
                                                dows, we propose virtual context management, a               mechanism, making the design of new long-context archi-
                                                technique drawing inspiration from hierarchical              tectures a pressing research challenge (Dai et al., 2019; Ki-
                                                memory systems in traditional operating systems              taev et al., 2020; Beltagy et al., 2020). While developing
                                                which provide the illusion of an extended vir-               longer models is an active area of research (Dong et al.,
                                                tual memory via paging between physical mem-                 2023), even if we could overcome the computational chal-
                                                ory and disk. Using this technique, we introduce             lenges of context scaling, recent research shows that long-
                                                MemGPT (MemoryGPT), a system that intelli-                   context models struggle to utilize additional context effec-
                                                gently manages different storage tiers in order              tively (Liu et al., 2023a). As consequence, given the con-
                                                to effectively provide extended context within               siderable resources needed to train state-of-the-art LLMs
                                                the LLM’s limited context window. We evalu-                  and diminishing returns of context scaling, there is a criti-
                                                ate our OS-inspired design in two domains where              cal need for alternative techniques to support long context.
                                                the limited context windows of modern LLMs
                                                                                                             In this paper, we study how to provide the illusion of an
                                                severely handicaps their performance: document
                                                                                                             infinite context while continuing to use fixed-context mod-
                                                analysis, where MemGPT is able to analyze
                                                                                                             els. Our approach borrows from the idea of virtual memory
                                                large documents that far exceed the underly-
                                                                                                             paging that was developed to enable applications to work
                                                ing LLM’s context window, and multi-session
                                                                                                             on datasets that far exceed the available memory by pag-
                                                chat, where MemGPT can create conversational
                                                                                                             ing data between main memory and disk. We leverage the
                                                agents that remember, reflect, and evolve dynam-
                                                                                                             recent progress in function calling abilities of LLM agents
                                                ically through long-term interactions with their
                                                                                                             (Schick et al., 2023; Liu et al., 2023b) to design MemGPT,
                                                users. We release MemGPT code and data for
                                                                                                             an OS-inspired LLM system for virtual context manage-
                                                our experiments at https://research.memgpt.ai.
                                                                                                             ment. Using function calls, LLM agents can read and write
                                                                                                             to external data sources, modify their own context, and
                                                                                                             choose when to return responses to the user.
                                         1. Introduction
                                                                                                             These capabilities allow LLMs to effective “page” in and
                                         In recent years, large language models (LLMs) and their             out information between context windows (analogous to
                                         underlying transformer architecture (Vaswani et al., 2017;          “main memory” in operating systems) and external storage,
                                         Devlin et al., 2018; Brown et al., 2020; Ouyang et al., 2022)       similar to hierarchical memory in traditional OSes. In ad-
                                         have become the cornerstone of conversational AI and have           dition, function calls can be leveraged to manage control
                                         led to a wide array of consumer and enterprise applications.        flow between context management, response generation,
                                         Despite these advances, the limited fixed-length context            and user interactions. This allows for an agent to choose
                                         windows used by LLMs significantly hinders their appli-             to iteratively modify what is in its context for a single task,
                                         cability to long conversations or reasoning about long doc-         thereby more effectively utilizing its limited context.
                                         uments. For example, the most widely used open-source
                                                                                                             In MemGPT, we treat context windows as a constrained
                                            1
                                             University of California, Berkeley. Correspondence to:          memory resource, and design a memory hiearchy for LLMs
                                         Charles Packer <cpacker@berkeley.edu>.                              analogous to memory tiers used in traditional OSes (Patter-
                                                                                                             son et al., 1988). Applications in traditional OSes interact

                                                                                                         1
                                               MemGPT: Towards LLMs as Operating Systems

                                    February 7
                                          February 7                                                  February 7
                                                                                                             February 7


      How was                                                                                                                                         How’s James
                                                                                                                                                              How’sdoing?
                                                                                                                                                                    JamesAn
                                                                                                                                                                          d
          Howyour
              was day today?
                  your day today?                                     Did you doyou
                                                                            Did  anything else to else
                                                                                    do anything   celebrate  your your
                                                                                                                  birthday? 😊
                                                                                                       to celebrate      birthday? 😊

                 fun my bfmy
                      fun james  baked me
                             bf james     a me
                                      baked birthday cake cake
                                                a birthday                                                     yeah we
                                                                                                                     yeah weto six
                                                                                                                       went        ﬂags!
                                                                                                                              went to six ﬂags!

      Oh wow, happyhappy
          Oh wow,   birthday! 🎂 🎂
                         birthday!                                    recall_storage.search(“six flags”)
                                                                           recall_storage.search(“six  flags”)                                        working_context.re
                                                                                                                                                            working_cont
                                                                                                                                                        “Boyfriend named
                                                                                                                                                              “Boyfriend
    System Alert: Alert:
         System   Memory   Pressure
                         Memory  Pressure
                                                                         ShowingShowing
                                                                                 3 of 3 results                                                         “Ex-boyfriend na
                                                                                                                                                              “Ex-boyfri
                                                                                           3 of 3(page
                                                                                                  results 1/1):
                                                                                                            (page 1/1):
                                                                          [01/24/2024]  “lol yeah“lol
                                                                                                    sixyeah
                                                                                                        ﬂags”,                                        )     )
                                                                                  [01/24/2024]                six ﬂags”,
     working_context.append(“Birthday is February
         working_context.append(“Birthday         7”) 7”)
                                           is February                    [01/14/2024]  “i love six  ﬂags  been
                                                                                  [01/14/2024] “i love six ﬂags   likebeen
                                                                                                                       100 times”,
                                                                                                                            like 100 times”,
                                                                          [10/12/2023]  “james and
                                                                                  [10/12/2023]         I actually
                                                                                                  “james    and I ﬁrst  met at
                                                                                                                   actually  ﬁrstsix
                                                                                                                                  metﬂags”
                                                                                                                                       at six ﬂags”
                                                                                                                                                      Sorry toSorry
                                                                                                                                                               hear that - ho
                                                                                                                                                                    to hear
     working_context.append(“Boyfriend namednamed
         working_context.append(“Boyfriend   James”)
                                                  James”)
                                                                      Did you goyou
                                                                            Did  withgo
                                                                                      James?
                                                                                        with It’s
                                                                                            James?so It’s
                                                                                                    cutesohow both
                                                                                                            cute   met
                                                                                                                 how bothere!
                                                                                                                         met there!
Figure 1. MemGPT (left) writes data to persistent memory after
it receives a system alert about limited context space.               Figure 2. MemGPT (left) can search out-of-context data to bring
                                                                      relevant information into the current context window.


with virtual memory, which provides an illusion of there
being more memory resources than are actually available               must always be explicitly moved into main context in order
in physical (i.e., main) memory by the OS paging over-                for it to be passed to the LLM processor during inference.
flow data to disk and retrieving data (via a page fault) back         MemGPT provides function calls that the LLM processor
into memory when accessed by applications. To provide a               to manage its own memory without any user intervention.
similar illusion of longer context length (analogous to vir-
tual memory), we allow the LLM to manage what is placed               2.1. Main context (prompt tokens)
in its own context (analogous to physical memory) via an
‘LLM OS’, which we call MemGPT. MemGPT enables the                    The prompt tokens in MemGPT are split into three con-
LLM to retrieve relevant historical data missing from what            tiguous sections: the system instructions, working con-
is placed in-context, and also evict less relevant data from          text, and FIFO Queue. The system instructions are read-
context and into external storage systems. Figure 3 illus-            only (static) and contain information on the MemGPT con-
trates the components of MemGPT.                                      trol flow, the intended usage of the different memory lev-
                                                                      els, and instructions on how to use the MemGPT functions
The combined use of a memory-hierarchy, OS functions                  (e.g. how to retrieve out-of-context data). Working con-
and event-based control flow allow MemGPT to handle                   text is a fixed-size read/write block of unstructured text,
unbounded context using LLMs that have finite context                 writeable only via MemGPT function calls. In conversa-
windows. To demonstrate the utility of our new OS-                    tional settings, working context is intended to be used to
inspired LLM system, we evaluate MemGPT on two do-                    store key facts, preferences, and other important informa-
mains where the performance of existing LLMs is severely              tion about the user and the persona the agent is adopting,
limited by finite context: document analysis, where the               allowing the agent to converse fluently with the user. The
length of standard text files can quickly exceed the input ca-        FIFO queue stores a rolling history of messages, including
pacity of modern LLMs, and conversational agents, where               messages between the agent and user, as well as system
LLMs bound by limited conversation windows lack context               messages (e.g. memory warnings) and function call inputs
awareness, persona consistency, and long-term memory                  and outputs. The first index in the FIFO queue stores a sys-
during extended conversations. In both settings, MemGPT               tem message containing a recursive summary of messages
is able to overcome the limitations of finite context to out-         that have been evicted from the queue.
perform existing LLM-based approaches.
                                                                      2.2. Queue Manager
2. MemGPT (MemoryGPT)
                                                                      The queue manager manages messages in recall storage
MemGPT’s OS-inspired multi-level memory architecture                  and the FIFO queue. When a new message is received by
delineates between two primary memory types: main con-                the system, the queue manager appends the incoming mes-
text (analogous to main memory/physical memory/RAM)                   sages to the FIFO queue, concatenates the prompt tokens
and external context (analogous to disk memory/disk stor-             and triggers the LLM inference to generate LLM output
age). Main context consists of the LLM prompt tokens—                 (the completion tokens). The queue manager writes both
anything in main context is considered in-context and can             the incoming message and the generated LLM output to re-
be accessed by the LLM processor during inference. Exter-             call storage (the MemGPT message database). When mes-
nal context refers to any information that is held outside of         sages in recall storage are retrieved via a MemGPT func-
the LLMs fixed context window. This out-of-context data               tion call, the queue manager appends them to the back of

                                                                  2
                                       MemGPT: Towards LLMs as Operating Systems

                                         LLM Finite Context Window (e.g. 8k tokens)

                                             Prompt Tokens                                            Completion Tokens


            System Instructions           Working Context                 FIFO Queue                   Output Buﬀer

              Read-Only (static)               Read-Write                   Read-Write
           MemGPT System Prompt            Write via Functions       Write via Queue Manager



            Archival Storage             Function Executor              Queue Manager                Recall Storage
             Read via Functions                                                                    Read via Functions
             Write via Functions                                                                 Write via Queue Manager


Figure 3. In MemGPT, a fixed-context LLM processor is augmented with a hierarchical memory system and functions that let it manage
its own memory. The LLM’s prompt tokens (inputs), or main context, consist of the system instructions, working context, and a FIFO
queue. The LLM completion tokens (outputs) are interpreted as function calls by the function executor. MemGPT uses functions to
move data between main context and external context (the archival and recall storage databases). The LLM can request immediate
follow-up LLM inference to chain function calls together by generating a special keyword argument (request heartbeat=true)
in its output; function chaining is what allows MemGPT to perform multi-step retrieval to answer user queries.


the queue to reinsert them into the LLM’s context window.            tory is becoming too long, as show in Figure 1) and modify
                                                                     its main context to better reflect its evolving understand-
The queue manager is also responsible for controlling con-
                                                                     ing of its current objectives and responsibilities (as shown
text overflow via a queue eviction policy. When the prompt
                                                                     in Figure 3). We implement self-directed editing and re-
tokens exceed the ‘warning token count‘ of the underly-
                                                                     trieval by providing explicit instructions within the system
ing LLM’s context window (e.g. 70% of the context win-
                                                                     instructions that guide the LLM on how to interact with
dow), the queue manager inserts a system message into the
                                                                     the MemGPT memory systems. These instructions com-
queue warning the LLM of an impending queue eviction
                                                                     prise two main components: (1) a detailed description of
(a ‘memory pressure‘ warning) to allow the LLM to use
                                                                     the memory hierarchy and their respective utilities, and (2)
MemGPT functions to store important information con-
                                                                     a function schema (complete with their natural language
tained in the FIFO queue to working context or archival
                                                                     descriptions) that the system can call to access or modify
storage (a read/write database storing arbitrary length text
                                                                     its memory.
objects). When the prompt tokens exceed the ‘flush token
count’ (e.g. 100% of the context window), the queue man-             During each inference cycle, LLM processor takes main
ager flushes the queue to free up space in the context win-          context (concatenated into a single string) as input, and
dow: the queue manager evicts a specific count of messages           generates an output string. This output string is parsed by
(e.g. 50% of the context window), generates a new recur-             MemGPT to ensure correctness, and if the parser validates
sive summary using the existing recursive summary and                the function arguments the function is executed. The re-
evicted messages. Once the queue is flushed, the evicted             sults, including any runtime errors that occur (e.g. trying to
messages are no longer in-context and immediately view-              add to main context when it is already at maximum capac-
able to the LLM, however they are stored indefinitely in             ity), are then fed back to the processor by MemGPT. This
recall storage and readable via MemGPT function calls.               feedback loop enables the system to learn from its actions
                                                                     and adjust its behavior accordingly. Awareness of context
2.3. Function executor (handling of completion tokens)               limits is a key aspect in making the self-editing mechanism
                                                                     work effectively, to this end MemGPT prompts the proces-
MemGPT orchestrates data movement between main con-                  sor with warnings regarding token limitations to guide its
text and external context via function calls that are gener-         memory management decisions. Additionally, our memory
ated by the LLM processor. Memory edits and retrieval                retrieval mechanisms are designed to be cognizant of these
are entirely self-directed: MemGPT autonomously updates              token constraints and implement pagination to prevent re-
and searches through its own memory based on the cur-                trieval calls from overflowing the context window.
rent context. For instance, it can decide when to move
items between contexts (e.g. when the conversation his-


                                                                 3
                                                                MemGPT: Towards LLMs as Operating Systems

                                                      February 7                                                            February 14
                Table 1. Comparing context lengths of commonly used models
                and LLM Did
                          APIsyou(data
                                  do anything else to
                                       collected      celebrate your
                                                 1/2024).            birthday? 😊
                                                            *Approximate       message                How’s James doing? Any special plans today?
                count assuming a preprompt of 1k tokens, and an average message
hday cake                                                 yeah wemeans
                size of ∼50 tokens (∼250 characters). ‘Open’      went tothesixmodel
                                                                                ﬂags! is                                        actually james and i broke up

                open-source or open-weights (vs only available behind an API).
                          recall_storage.search(“six flags”)                                          working_context.replace(
                                                                   Context Window                       “Boyfriend named James”,
                  Model / APIShowing
                                name 3 of 3 results (page
                                                   Open?  1/1): Tokens
                                                                              ∗
                                                                                 Messages               “Ex-boyfriend named James”
                              [01/24/2024] “lol yeah six ﬂags”,                                       )
 February 7”)     Llama (1) [01/14/2024] “i love six ✓                 2ktimes”,
                                                      ﬂags been like 100               20
                  Llama 2 [10/12/2023] “james and✓I actually ﬁrst met  4kat six ﬂags” 60
                  GPT-3.5 Turbo (release)              ✗               4k              60             Sorry to hear that - hope you’re OK 💔
amed James”)
                  MistralDid
                          7Byou go with James? It’s    ✓so cute how8k                 140
                                                                        both met there!
                  GPT-4 (release)                      ✗               8k             140
                  GPT-3.5 Turbo                        ✗              16k             300       Figure 4. An example conversation snippet where MemGPT
                  GPT-4                                ✗              32k            ∼600       (left) updates stored information. Here the information is stored
                  Claude 2                             ✗            100k            ∼2000
                                                                                                in working context memory (located within the prompt tokens).
                  GPT-4 Turbo                          ✗            128k            ∼2600
                  Yi-34B-200k                          ✓            200k            ∼4000



                                                                                                across long conversations. For document analysis, we
                                                                                                benchmark MemGPT on existing tasks from (Liu et al.,
                2.4. Control flow and function chaining                                         2023a) for question answering and key-value retrieval over
                                                                                                lengthy documents. We also propose a new nested key-
                In MemGPT, events trigger LLM inference: events are gen-                        value retrieval task requiring collating information across
                eralized inputs to MemGPT and can consist of user mes-                          multiple data sources, which tests the ability of an agent
                sages (in chat applications), system messages (e.g. main                        to collate information from multiple data sources (multi-
                context capacity warnings), user interactions (e.g. an alert                    hop retrieval). We publicly release our augmented MSC
                that a user just logged in, or an alert that they finished up-                  dataset, nested KV retrieval dataset, and a dataset of em-
                loading a document), and timed events that are run on a                         beddings for 20M Wikipedia articles to facilitate future
                regular schedule (allowing MemGPT to run ‘unprompted’                           research. Our code for the benchmarks is available at
                without user intervention). MemGPT processes events with                        https://research.memgpt.ai.
                a parser to convert them into plain text messages that can
                be appended to main context and eventually be fed as input                      Implementation details. When discussing OpenAI mod-
                into the LLM processor.                                                         els, unless otherwise specified ‘GPT-4 Turbo’ refers to the
                                                                                                specific gpt-4-1106-preview model endpoint (con-
                Many practical tasks require calling multiple functions in                      text window of 128, 000), ‘GPT-4‘ refers to gpt-4-0613
                sequence, for example, navigating through multiple pages                        (context window of 8, 192), and ‘GPT-3.5 Turbo‘ refers
                of results from a single query or collating data from dif-                      to gpt-3.5-turbo-1106 (context window of 16, 385).
                ferent documents in main context from separate queries.                         In experiments, we run MemGPT with all baseline models
                Function chaining allows MemGPT to execute multiple                             (GPT-4, GPT-4 Turbo, and GPT 3.5) to show how the un-
                function calls sequentially before returning control to the                     derlying model performance affects MemGPT’s.
                user. In MemGPT, functions can be called with a special
                flag that requests control be immediately returned to the
                                                                                                3.1. MemGPT for conversational agents
                processor after the requested function completes execution.
                If this flag is present, MemGPT will add the function out-                      Conversational agents like virtual companions and person-
                put to main context and (as opposed to pausing processor                        alized assistants aim to engage users in natural, long-term
                execution). If this flag is not present (a yield), MemGPT                       interactions, potentially spanning weeks, months, or even
                will not run the LLM processor until the next external event                    years. This creates challenges for models with fixed-length
                trigger (e.g. a user message or scheduled interrupt).                           contexts, which can only reference a limited history of the
                                                                                                conversation. An ‘infinite context’ agent should seamlessly
                3. Experiments                                                                  handle continuous exchanges without boundary or reset.
                                                                                                When conversing with a user, such an agent must satisfy
                We assess MemGPT in two long-context domains: con-                              two key criteria: (1) Consistency - The agent should main-
                versational agents and document analysis. For conversa-                         tain conversational coherence. New facts, preferences, and
                tional agents, we expand the existing Multi-Session Chat                        events mentioned should align with prior statements from
                dataset (Xu et al., 2021) and introduce two new dialogue                        both the user and agent. (2) Engagement - The agent should
                tasks that evaluate an agent’s ability to retain knowledge                      draw on long-term knowledge about the user to personalize

                                                                                            4
                                           MemGPT: Towards LLMs as Operating Systems


Table 2. Deep memory retrieval (DMR) performance. In this                  Table 3. Conversation opener performance. The agent’s con-
task, the agent is asked a specific question about a topic discussed       versation opener is evaluated using similarity scores to the gold
in a prior conversation (sessions 1–5). The agent’s response is            persona labels (SIM-1/3) and to the human-created opener (SIM-
scored against the gold answer. MemGPT significantly outper-               H). MemGPT is able to exceed the performance of the human-
forms the fixed-context baselines.                                         created conversation opener with a variety of underlying models.

    Model                Accuracy ⇑       ROUGE-L (R) ⇑                          Method              ⇑ SIM-1      SIM-3      SIM-H
    GPT-3.5 Turbo              38.7%                     0.394                   Human                  0.800      0.800       1.000
    + MemGPT                   66.9%                     0.629
                                                                                 GPT-3.5 Turbo          0.830      0.812       0.817
    GPT-4                      32.1%                     0.296
                                                                                 GPT-4                  0.868      0.843       0.773
    + MemGPT                   92.5%                     0.814
                                                                                 GPT-4 Turbo            0.857      0.828       0.767
    GPT-4 Turbo                35.3%                     0.359
    + MemGPT                   93.4%                     0.827


                                                                           sessions (see Appendix for further details).
responses. Referencing prior conversations makes dialogue
                                                                           We evaluate the quality of the generated response against
more natural and engaging.
                                                                           the ‘gold response’ using ROUGE-L scores (Lin, 2004) and
We therefore assess our proposed system, MemGPT, on                        an ‘LLM judge’, which is instructed to evaluate whether
these two criteria: (1) Does MemGPT leverage its memory                    or not the generated response is consistent with the gold
to improve conversation consistency? Can it remember rel-                  response (GPT-4 has been shown to have high agreement
evant facts, preferences, and events from past interactions                with human evaluators (Zheng et al., 2023)). In prac-
to maintain coherence? (2) Does MemGPT produce more                        tice, we notice that the generated responses (from both
engaging dialogue by taking advantage of memory? Does                      MemGPT and the baselines) were generally more verbose
it spontaneously incorporate long-range user information to                than the gold responses. We use the ROUGE-L recall (R)
personalize messages? By evaluating on consistency and                     metric to account for the verbosity of the generated agent
engagement, we can determine how well MemGPT han-                          replies compared to the relatively short gold answer labels.
dles the challenges of long-term conversational interaction
                                                                           MemGPT utilizes memory to maintain coherence: Ta-
compared to fixed-context baselines. Its ability to satisfy
                                                                           ble 2 shows the performance of MemGPT vs the fixed-
these criteria will demonstrate whether unbounded context
                                                                           memory baselines. We compare MemGPT using differ-
provides meaningful benefits for conversational agents.
                                                                           ent underlying LLMs, and compare against using the base
Dataset. We evaluate MemGPT and our fixed-context                          LLM without MemGPT as a baseline. The baselines are
baselines on the Multi-Session Chat (MSC) dataset intro-                   able to see a lossy summarization of the past five conver-
duced by Xu et al. (2021), which contains multi-session                    sations to mimic an extended recursive summarization pro-
chat logs generated by human labelers, each of whom was                    cedure, while MemGPT instead has access to the full con-
asked to play a consistent persona for the duration of all                 versation history but must access it via paginated search
sessions. Each multi-session chat in MSC has five total ses-               queries to recall memory (in order to bring them into main
sions, and each session consists of a roughly a dozen mes-                 context). In this task, we see that MemGPT clearly im-
sages. As part of our consistency experiments, we created                  proves the performance of the underlying base LLM: there
a new session (session 6) that contains a single question-                 is a clear drop in both accuracy and ROUGE scores when
answer response pair between the same two personas.                        going from MemGPT to the corresponding LLM baselines.

3.1.1. D EEP MEMORY RETRIEVAL TASK                                         3.1.2. C ONVERSATION OPENER TASK ( ENGAGEMENT ).
       ( CONSISTENCY ).
                                                                           In the ‘conversation opener’ task we evaluate an agent’s
We introduce a new ‘deep memory retrieval’ (DMR) task                      ability to craft engaging messages to the user that draw
based on the MSC dataset designed to test the consistency                  from knowledge accumulated in prior conversations. To
of a conversational agent. In DMR, the conversational                      evaluate the ‘engagingness’ of a conversation opener us-
agent is asked a question by the user that explicitly refers               ing the MSC dataset, we compare the generated opener to
back to a prior conversation and has a very narrow expected                the gold personas: an engaging conversation opener should
answer range. We generated the DMR question-answer                         draw from one (or several) of the data points contained
(QA) pairs using a separate LLM that was instructed to                     in the persona, which in MSC effectively summarize the
write a question from one user to another that could only be               knowledge accumulated throughout all prior sessions. We
answered correctly using knowledge gained from the past                    also compare to the human-generated gold opener, i.e., the

                                                                       5
                                                              MemGPT: Towards LLMs as Operating Systems

                                                                                                System Alert: Archive Storage Upload Complete                   System Alert: Archiv
           0.7

           0.6                                                                                                      Who won the ﬁrst Nobel Prize in physics?

           0.5
                                                                                                   archival_storage.search(“nobel physics”)                       archival_stora

Accuracy
           0.4
                                                                                                      Showing 10 of 124 results (page 1/13):                          Showing 1 of 1 r
           0.3                                                                                         “The Nobel Prizes, beginning in 1901, and the …                 “Key: 831…ea5
                                                                                                       “This award is administered by the Nobel Foundation…
           0.2                                                                                         …
                                                                                                                                                                  archival_stora
           0.1                                                                                     archival_storage.search(“nobel physics”, page=2)
                 0   25         50      75       100     125       150     175     200                                                                                Showing 2 of 2
                                       Documents Retrieved                                            Showing 10 of 124 results (page 2/13):                           “Key: 5b8…4c3
                                                                                                       “The Nobel Prize in Physics is a yearly award given…            “Key: 831…ea5
                              GPT-4           GPT-3.5 Turbo         GPT-4 Turbo
                                                                                                       “The 1901 Nobel in physics was awarded to Wilhelm …
                          MemGPT (GPT-4, GPT-4 Turbo)           MemGPT (GPT-3.5)                       …
                                                                                                                                                                  archival_stora

                                                                                                  Wilhelm Conrad Rontgen
                                                                                                                                                                      Showing 1 of 1 r
Figure 5. Document QA task performance. MemGPT’s perfor-                                                                                                               “Key: 5b8…4c3
mance is unaffected by increased context length. Methods such as
truncation can extend the effective context lengths of fixed length                          Figure 6. An example of MemGPT (left) solving the document           f37…617
models such as GPT-4, but such compression methods will lead                                 QA task. A database of Wikipedia documents is uploaded to
to performance degradation as the necessary compression grows.                               archival storage. MemGPT queries archival storage via function
Running MemGPT with GPT-4 and GPT-4 Turbo have equivalent                                    calling, which pulls paginated search results into main context.
results on this task.

                                                                                             MemGPT are needed.
first response in the following session. We report the CSIM
scores of MemGPT’s openers in Table 3. We test several                                       3.2.1. M ULTI - DOCUMENT QUESTION - ANSWERING .
variations of MemGPT using different base LLMs.                                              To evaluate MemGPT’s ability to analyze documents, we
MemGPT utilizes memory to increase engagement: As                                            benchmark MemGPT against fixed-context baselines on
seen in Table 3, MemGPT is able to craft engaging open-                                      the retriever-reader document QA task from Liu et al.
ers that perform similarly to and occasionally exceed the                                    (2023a). In this task, a question is selected from the
hand-written human openers. We observe that MemGPT                                           NaturalQuestions-Open dataset, and a retriever selects rel-
tends to craft openers that are both more verbose and cover                                  evant Wikipedia documents for the question. A reader
more aspects of the persona information than the human                                       model (the LLM) is then fed these documents as input, and
baseline. Additionally, we can see the storing information                                   is asked to use the provided documents to answer the ques-
in working context is key to generating engaging openers.                                    tion. Similar to Liu et al. (2023a), we evaluate reader accu-
                                                                                             racy as the number of retrieved documents K increases.
3.2. MemGPT for document analysis                                                            In our evaluation setup, both the fixed-context baselines
                                                                                             and MemGPT use the same retriever, which selects the top
Document analysis also faces challenges due to the limited
                                                                                             K documents according using similarity search (cosine dis-
context windows of today’s transformer models. As shown
                                                                                             tance) on OpenAI’s text-embedding-ada-002 em-
in Table 1, both open and closed source models suffer from
                                                                                             beddings. We use MemGPT’s default storage settings
constrained context length (up to 128k tokens for OpenAI’s
                                                                                             which uses PostgreSQL for archival memory storage with
models). However many documents easily surpass these
                                                                                             vector search enabled via the pgvector extention. We pre-
lengths; for example, legal or financial documents such as
                                                                                             compute embeddings and load them into the database,
Annual Reports (SEC Form 10-K) can easily pass the mil-
                                                                                             which uses an HNSW index to enable approximate, sub-
lion token mark. Moreover, many real document analy-
                                                                                             second query times. In MemGPT, the entire embedding
sis tasks require drawing connections across multiple such
                                                                                             document set is loaded into archival storage, and the re-
lengthy documents. Anticipating these scenarios, it be-
                                                                                             triever naturally emerges via the archival storage search
comes difficult to envision blindly scaling up context as a
                                                                                             functionality (which performs vector search based on co-
solution to the fixed-context problem. Recent research (Liu
                                                                                             sine similarity). In the fixed-context baselines, the top-K
et al., 2023a) also raises doubts about the utility of simply
                                                                                             documents are fetched using the retriever independently
scaling contexts, since they find uneven attention distribu-
                                                                                             from the LLM inference, similar to the original retriever-
tions in large context models (the model is more capable
                                                                                             reader setup in Liu et al. (2023a).
of recalling information at the beginning or end of its con-
text window, vs tokens in the middle). To enable reasoning                                   We use a dump of Wikipedia from late 2018, following past
across documents, more flexible memory architectures like                                    work on NaturalQuestions-Open (Izacard & Grave, 2020;

                                                                                         6
                                                             MemGPT: Towards LLMs as Operating Systems

             1.0 System Alert: Archive Storage Upload Complete                                    System Alert: Archive Storage Upload Complete


             0.8                     Who won the ﬁrst Nobel Prize in physics?                                                       Find the value for key 831…ea5



  Accuracy
             0.6
                   archival_storage.search(“nobel physics”)                                         archival_storage.search(“831...ea5”)
             0.4
                     Showing 10 of 124 results (page 1/13):                                             Showing 1 of 1 results (page 1/1):
                      “The Nobel Prizes, beginning in 1901, and the …                                    “Key: 831…ea5, Value: 5b8…4c3”
             0.2
                      “This award is administered by the Nobel Foundation…
                      …
             0.0
                                                                                                    archival_storage.search(“5b8...4c3”)
                   0             1                2            3
                   archival_storage.search(“nobel
                                    Nesting Level   physics”, page=1)
                                                                                                        Showing 2 of 2 results (page 1/1):
                       GPT-3.5 10 of 124GPT-4
                     Showing                  Turbo(page 1/13):
                                         results                    MemGPT (GPT-4 Turbo)                 “Key: 5b8…4c3, Value: f37…617”,
                       GPT-4Nobel Prize in
                      “The              MemGPT   (GPT-3.5)
                                            Physics                 MemGPT
                                                      is a yearly award    (GPT-4)
                                                                        given…                           “Key: 831…ea5, Value: 5b8…4c3”
                      “The 1901 Nobel in physics was awarded to Wilhelm …
                      …
                                                                                                    archival_storage.search(“f37...617”)
           Nested Conrad
Figure 7. Wilhelm  KV retrieval
                          Rontgen
                                  task performance. MemGPT is
the only approach that is able to consistently complete the nested                                      Showing 1 of 1 results (page 1/1):
                                                                                                         “Key: 5b8…4c3, Value: f37…617”
KV task beyond 2 nesting levels. While GPT-4 Turbo performs
better as a baseline, MemGPT with GPT-4 Turbo performs worse
                                                                                                    f37…617
than MemGPT with GPT-4.


                                                                                               Figure 8. An example of MemGPT (left) solving the nested KV
Izacard et al., 2021), and sampled a subset of 50 questions                                    task (UUIDs shortened for readability). In this particular exam-
for evaluation. Both the sampled questions and embedded                                        ple, the key-value pair has two nesting levels: 831..ea5 →
Wikipedia passages are publicaly released. We evaluate                                         5b8..4c3 → f37...617. The MemGPT agent returns the fi-
the performance of both MemGPT and baselines with an                                           nal answer when a query for the final value (f37...617) only
LLM-judge, to ensure that the the answer is properly de-                                       returns one result, indicating that it is not also a key.
rived from the retrieved documents and to avoid non-exact
string matches being considered incorrect.
                                                                                               triever performance (even if the embedding-based ranking
We show the results for the document QA task in Figure 5.
                                                                                               is noisy, as long as the full retriever ranking contains the
The fixed-context baselines performance is capped roughly
                                                                                               gold document it can still be found with enough retriever
at the performance of the retriever, as they use the informa-
                                                                                               calls via pagination), we observe that MemGPT will often
tion that is presented in their context window (e.g. if the
                                                                                               stop paging through retriever results before exhausting the
embedding search retriever fails to surface the gold arti-
                                                                                               retriever database.
cle using the provided question, the fixed-context baselines
are guaranteed to never see the gold article). By contrast,                                    To evaluate the fixed-context baselines against MemGPT
MemGPT is effectively able to make multiple calls to the                                       past their default context lengths, we truncate the document
retriever by querying archival storage, allowing it to scale                                   segments returned by the retriever to fix the same number
to larger effective context lengths. MemGPT actively re-                                       of documents into the available context. As expected, doc-
trieves documents from its archival storage (and can iter-                                     ument truncation reduces accuracy as documents shrink as
atively page through results), so the total number of doc-                                     the chance of the relevant snippet (in the gold document)
uments available to MemGPT is no longer limited by the                                         being omitted grows, as shown in Figure 5. MemGPT has
number of documents that fit within the LLM processor’s                                        significantly degraded performance using GPT-3.5, due to
context window.                                                                                its limited function calling capabilities, and performs best
                                                                                               using GPT-4.
The document QA task is challenging for all methods due
to the limitations of embedding-based similarity search.
                                                                                               3.2.2. N ESTED KEY- VALUE RETRIEVAL (KV).
We observe that the golden document for chosen ques-
tion (as annotated by NaturalQuestions-Open) often ap-                                         We introduce a new task based on the synthetic Key-Value
pears outside of the first dozen retrieved results, if not even                                retrieval proposed in prior work (Liu et al., 2023a). The
further. The retriever performance translates directly to                                      goal of this task is to demonstrate how MemGPT can col-
the fixed-context baseline results: GPT-4’s accuracy is rel-                                   late information from multiple data sources. In the original
atively low with few retrieved documents, and continues                                        KV task, the authors generated a synthetic dataset of key-
to improve as additional documents are added to the con-                                       value pairs, where each key and value is a 128-bit UUID
text window, as it correctly limits itself to answering ques-                                  (universally unique identifier). The agent is then given a
tions based on information in retrieved documents. While                                       key, and asked to return the associated value for the key.
MemGPT is theoretically not limited by sub-optimal re-                                         We create a version of the KV task, nested KV retrieval,

                                                                                           7
                                        MemGPT: Towards LLMs as Operating Systems

where values themselves may be keys, thus requiring the               LLMs as agents. Recent work has explored augment-
agent to perform a multi-hop lookup. In our setup, we fix             ing LLMs with additional capabilities to act as agents
the total number of UUIDs pairs to 140, corresponding to              in interactive environments. Park et al. (2023) propose
roughly 8k tokens (the context length of our GPT-4 base-              adding memory to LLMs and using the LLM as a plan-
line). We vary the total number of nesting levels from 0              ner, and observe emergent social behaviors in a multi-
(the initial key-value pair’s value is not a key) to 4 (ie 4          agent sandbox environment (inspired by The Sims video
total KV lookups are required to find the final value), and           game) where agents can perform basic activities such as
sample 30 different ordering configurations including both            doing chores/hobbies, going to work, and conversing with
the initial key position and nesting key positions.                   other agents. Nakano et al. (2021) train models to search
                                                                      the web before answering questions, and use similar pag-
While GPT-3.5 and GPT-4 have good performance on the
                                                                      ination concepts to MemGPT to control the underlying
original KV tasks, both struggle in the nested KV task.
                                                                      context size in their web-browsing environment. Yao
GPT-3.5 is unable to complete the nested variant of the task
                                                                      et al. (2022) showed that interleaving chain-of-thought rea-
and has an immediate dropoff in performance, hitting 0 per-
                                                                      soning (Wei et al., 2022) can further improve the plan-
cent accuracy at 1 nesting level (we observe that its primary
                                                                      ning ability of interactive LLM-based agents; similarly in
failure mode is to simply returns the original value). GPT-
                                                                      MemGPT, LLM is able to ‘plan out loud’ when executing
4 and GPT-4 Turbo are better than GPT-3.5, but also suf-
                                                                      functions. Liu et al. (2023b) introduced a suite of LLM-as-
fer from a similar dropoff, and hit 0 percent accuracy by
                                                                      an-agent benchmarks to evaluate LLMs in interactive en-
3 nesting levels. MemGPT with GPT-4 on the other hand
                                                                      vironments, including video games, thinking puzzles, and
is unaffected with the number of nesting levels and is able
                                                                      web shopping. In contrast, our work focuses on tackling
to perform the nested lookup by accessing the key-value
                                                                      the problem of equipping agents with long-term memory
pairs stored in main context repeatedly via function queries.
                                                                      of user inputs.
MemGPT with GPT-4 Turbo and GPT-3.5 also have better
performance than the corresponding baseline models, but
still begin to drop off in performance at 2 nesting levels as         5. Conclusion
a result of failing to perform enough lookups. MemGPT
                                                                      In this paper, we introduced MemGPT, a novel LLM sys-
performance on the nested KV task demonstrates its ability
                                                                      tem inspired by operating systems to manage the limited
to combine multiple queries to perform multi-hop lookups.
                                                                      context windows of large language models. By designing a
                                                                      memory hierarchy and control flow analogous to traditional
4. Related Work                                                       OSes, MemGPT provides the illusion of larger context re-
                                                                      sources for LLMs. This OS-inspired approach was eval-
Long-context LLMs. Several lines of work have im-
                                                                      uated in two domains where existing LLM performance
proved the context length of LLMs. For instance, more
                                                                      is constrained by finite context lengths: document anal-
efficient transformer architectures via sparsifying the atten-
                                                                      ysis and conversational agents. For document analysis,
tion (Child et al., 2019; Beltagy et al., 2020), low-rank ap-
                                                                      MemGPT could process lengthy texts well beyond the con-
proximations (Wang et al., 2020), and neural memory (Lee
                                                                      text limits of current LLMs by effectively paging relevant
et al., 2019). Another line of work aims to extend context
                                                                      context in and out of memory. For conversational agents,
windows beyond the length they were original trained for,
                                                                      MemGPT enabled maintaining long-term memory, consis-
their training size, such as Press et al. (2021); Chen et al.
                                                                      tency, and evolvability over extended dialogues. Overall,
(2023). MemGPT builds upon these improvements in con-
                                                                      MemGPT demonstrates that operating system techniques
text length as they improve the size of the main memory
                                                                      like hierarchical memory management and interrupts can
in MemGPT. Our main contribution is a hierarchical tiered
                                                                      unlock the potential of LLMs even when constrained by
memory that uses a long-context LLM as the implementa-
                                                                      fixed context lengths. This work opens numerous av-
tion of main memory.
                                                                      enues for future exploration, including applying MemGPT
Retrieval-Augmented Models. The design of the external                to other domains with massive or unbounded contexts, in-
memory of MemGPT builds upon much prior work aug-                     tegrating different memory tier technologies like databases
menting LLMs with relevant inputs from external retriev-              or caches, and further improving control flow and memory
ers (Ram et al., 2023; Borgeaud et al., 2022; Karpukhin               management policies. By bridging concepts from OS ar-
et al., 2020; Lewis et al., 2020; Guu et al., 2020; Lin et al.,       chitecture into AI systems, MemGPT represents a promis-
2023). In particular, Jiang et al. (2023) propose FLARE, a            ing new direction for maximizing the capabilities of LLMs
method that allows the LLM to actively decide when and                within their fundamental limits.
what to retrieve during the course of generation. Trivedi
et al. (2022) interleave retrieval with Chain-of-Thoughts
reasoning to improve multi-step question answering.

                                                                  8
                                      MemGPT: Towards LLMs as Operating Systems

References                                                         Zhengbao Jiang, Frank F Xu, Luyu Gao, Zhiqing Sun, Qian
                                                                     Liu, Jane Dwivedi-Yu, Yiming Yang, Jamie Callan, and
Iz Beltagy, Matthew E Peters, and Arman Cohan. Long-
                                                                     Graham Neubig. Active retrieval augmented generation.
   former: The long-document transformer. arXiv preprint
                                                                     arXiv preprint arXiv:2305.06983, 2023.
   arXiv:2004.05150, 2020.
                                                                   Vladimir Karpukhin, Barlas Oğuz, Sewon Min, Patrick
Sebastian Borgeaud, Arthur Mensch, Jordan Hoff-
                                                                     Lewis, Ledell Wu, Sergey Edunov, Danqi Chen, and
  mann, Trevor Cai, Eliza Rutherford, Katie Millican,
                                                                     Wen-tau Yih. Dense passage retrieval for open-domain
  George Bm Van Den Driessche, Jean-Baptiste Lespiau,
                                                                     question answering. arXiv preprint arXiv:2004.04906,
  Bogdan Damoc, Aidan Clark, et al. Improving language
                                                                     2020.
  models by retrieving from trillions of tokens. In Interna-
  tional conference on machine learning, pp. 2206–2240.            Nikita Kitaev, Łukasz Kaiser, and Anselm Levskaya. Re-
  PMLR, 2022.                                                        former: The efficient transformer.     arXiv preprint
                                                                     arXiv:2001.04451, 2020.
Tom Brown, Benjamin Mann, Nick Ryder, Melanie Sub-
  biah, Jared D Kaplan, Prafulla Dhariwal, Arvind Nee-             Juho Lee, Yoonho Lee, Jungtaek Kim, Adam Kosiorek,
  lakantan, Pranav Shyam, Girish Sastry, Amanda Askell,              Seungjin Choi, and Yee Whye Teh. Set transformer:
  et al. Language models are few-shot learners. Ad-                  A framework for attention-based permutation-invariant
  vances in neural information processing systems, 33:               neural networks. In International conference on machine
  1877–1901, 2020.                                                   learning, pp. 3744–3753. PMLR, 2019.
Shouyuan Chen, Sherman Wong, Liangjian Chen, and                   Patrick Lewis, Ethan Perez, Aleksandra Piktus, Fabio
  Yuandong Tian. Extending context window of large lan-              Petroni, Vladimir Karpukhin, Naman Goyal, Heinrich
  guage models via positional interpolation. arXiv preprint          Küttler, Mike Lewis, Wen-tau Yih, Tim Rocktäschel,
  arXiv:2306.15595, 2023.                                            et al. Retrieval-augmented generation for knowledge-
                                                                     intensive nlp tasks. Advances in Neural Information Pro-
Rewon Child, Scott Gray, Alec Radford, and Ilya                      cessing Systems, 33:9459–9474, 2020.
  Sutskever. Generating long sequences with sparse trans-
  formers. arXiv preprint arXiv:1904.10509, 2019.                  Chin-Yew Lin. Rouge: A package for automatic evaluation
                                                                     of summaries. In Text summarization branches out, pp.
Zihang Dai, Zhilin Yang, Yiming Yang, Jaime Carbonell,               74–81, 2004.
  Quoc V Le, and Ruslan Salakhutdinov. Transformer-xl:
  Attentive language models beyond a fixed-length con-             Xi Victoria Lin, Xilun Chen, Mingda Chen, Weijia Shi,
  text. arXiv preprint arXiv:1901.02860, 2019.                       Maria Lomeli, Rich James, Pedro Rodriguez, Jacob
                                                                     Kahn, Gergely Szilvasy, Mike Lewis, Luke Zettlemoyer,
Jacob Devlin, Ming-Wei Chang, Kenton Lee, and Kristina               and Scott Yih. Ra-dit: Retrieval-augmented dual instruc-
  Toutanova. Bert: Pre-training of deep bidirectional                tion tuning, 2023.
  transformers for language understanding. arXiv preprint
  arXiv:1810.04805, 2018.                                          Nelson F Liu, Kevin Lin, John Hewitt, Ashwin Paranjape,
                                                                     Michele Bevilacqua, Fabio Petroni, and Percy Liang.
Zican Dong, Tianyi Tang, Lunyi Li, and Wayne Xin Zhao.               Lost in the middle: How language models use long con-
  A survey on long text modeling with transformers. arXiv            texts. arXiv preprint arXiv:2307.03172, 2023a.
  preprint arXiv:2302.14502, 2023.
                                                                   Xiao Liu, Hao Yu, Hanchen Zhang, Yifan Xu, Xuanyu Lei,
Kelvin Guu, Kenton Lee, Zora Tung, Panupong Pasupat,                 Hanyu Lai, Yu Gu, Hangliang Ding, Kaiwen Men, Ke-
  and Mingwei Chang. Retrieval augmented language                    juan Yang, et al. AgentBench: Evaluating llms as agents.
  model pre-training. In International conference on ma-             arXiv preprint arXiv:2308.03688, 2023b.
  chine learning, pp. 3929–3938. PMLR, 2020.
                                                                   Reiichiro Nakano, Jacob Hilton, Suchir Balaji, Jeff Wu,
Gautier Izacard and Edouard Grave. Leveraging passage                Long Ouyang, Christina Kim, Christopher Hesse, Shan-
  retrieval with generative models for open domain ques-             tanu Jain, Vineet Kosaraju, William Saunders, et al.
  tion answering. arXiv preprint arXiv:2007.01282, 2020.             WebGPT: Browser-assisted question-answering with hu-
                                                                     man feedback. arXiv preprint arXiv:2112.09332, 2021.
Gautier Izacard, Mathilde Caron, Lucas Hosseini, Se-
  bastian Riedel, Piotr Bojanowski, Armand Joulin, and             Long Ouyang, Jeffrey Wu, Xu Jiang, Diogo Almeida, Car-
  Edouard Grave.       Unsupervised dense information                roll Wainwright, Pamela Mishkin, Chong Zhang, Sand-
  retrieval with contrastive learning.  arXiv preprint               hini Agarwal, Katarina Slama, Alex Ray, et al. Train-
  arXiv:2112.09118, 2021.                                            ing language models to follow instructions with human

                                                               9
                                     MemGPT: Towards LLMs as Operating Systems

  feedback. Advances in Neural Information Processing              Shunyu Yao, Jeffrey Zhao, Dian Yu, Nan Du, Izhak
  Systems, 35:27730–27744, 2022.                                     Shafran, Karthik Narasimhan, and Yuan Cao. React:
                                                                     Synergizing reasoning and acting in language models.
Joon Sung Park, Joseph C O’Brien, Carrie J Cai, Mered-
                                                                     arXiv preprint arXiv:2210.03629, 2022.
  ith Ringel Morris, Percy Liang, and Michael S Bernstein.
  Generative agents: Interactive simulacra of human be-            Lianmin Zheng, Wei-Lin Chiang, Ying Sheng, Siyuan
  havior. arXiv preprint arXiv:2304.03442, 2023.                     Zhuang, Zhanghao Wu, Yonghao Zhuang, Zi Lin, Zhuo-
                                                                     han Li, Dacheng Li, Eric Xing, et al. Judging llm-as-a-
David A Patterson, Garth Gibson, and Randy H Katz. A
                                                                     judge with mt-bench and chatbot arena. arXiv preprint
  case for redundant arrays of inexpensive disks (raid). In
                                                                     arXiv:2306.05685, 2023.
  Proceedings of the 1988 ACM SIGMOD international
  conference on Management of data, pp. 109–116, 1988.
Ofir Press, Noah A Smith, and Mike Lewis. Train short, test
  long: Attention with linear biases enables input length
  extrapolation. arXiv preprint arXiv:2108.12409, 2021.
Ori Ram, Yoav Levine, Itay Dalmedigos, Dor Muhl-
  gay, Amnon Shashua, Kevin Leyton-Brown, and Yoav
  Shoham. In-context retrieval-augmented language mod-
  els. arXiv preprint arXiv:2302.00083, 2023.
Timo Schick, Jane Dwivedi-Yu, Roberto Dessı̀, Roberta
  Raileanu, Maria Lomeli, Luke Zettlemoyer, Nicola Can-
  cedda, and Thomas Scialom. Toolformer: Language
  models can teach themselves to use tools. arXiv preprint
  arXiv:2302.04761, 2023.
Hugo Touvron, Louis Martin, Kevin Stone, Peter Albert,
  Amjad Almahairi, Yasmine Babaei, Nikolay Bashlykov,
  Soumya Batra, Prajjwal Bhargava, Shruti Bhosale, et al.
  Llama 2: Open foundation and fine-tuned chat models.
  arXiv preprint arXiv:2307.09288, 2023.
H. Trivedi, Niranjan Balasubramanian, Tushar Khot,
  and Ashish Sabharwal.     Interleaving retrieval with
  chain-of-thought reasoning for knowledge-intensive
  multi-step questions. ArXiv, abs/2212.10509, 2022.
  URL https://api.semanticscholar.org/
  CorpusID:254877499.
Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob
  Uszkoreit, Llion Jones, Aidan N Gomez, Łukasz Kaiser,
  and Illia Polosukhin. Attention is all you need. Advances
  in neural information processing systems, 30, 2017.
Sinong Wang, Belinda Z Li, Madian Khabsa, Han Fang,
  and Hao Ma. Linformer: Self-attention with linear com-
  plexity. arXiv preprint arXiv:2006.04768, 2020.
Jason Wei, Xuezhi Wang, Dale Schuurmans, Maarten
  Bosma, Fei Xia, Ed Chi, Quoc V Le, Denny Zhou,
  et al. Chain-of-thought prompting elicits reasoning in
  large language models. Advances in Neural Information
  Processing Systems, 35:24824–24837, 2022.
Jing Xu, Arthur Szlam, and Jason Weston. Beyond goldfish
   memory: Long-term open-domain conversation. arXiv
   preprint arXiv:2107.07567, 2021.

                                                              10
                                      MemGPT: Towards LLMs as Operating Systems

6. Appendix                                                           the referenced topic, for example:
                                                                      Question: Do you remember what I got
6.1. Prompts and instructions                                         the last time I went to Hawaii?
                                                                      Gold answer: A shell necklace
The MemGPT prompts have been edited for brevity. For                  The generated answer might be much
full implementation details (including exact prompts) visit           longer, but you should be generous with
https://research.memgpt.ai.                                           your grading - as long as it touches on
                                                                      the same topic as the gold answer, it
                                                                      should be counted as CORRECT.
6.1.1. M EM GPT INSTRUCTIONS (DMR)                                    For example, the following answers
                                                                      would be considered CORRECT:
Example instructions used in the MemGPT persona for
                                                                      Generated answer (CORRECT): Oh yeah,
chat/dialogue-related tasks.                                          that was so fun! I got so much stuff
  The following is information about                                  there, including that shell necklace.
  myself. My task is to completely                                    Generated answer (CORRECT): I got a ton
  immerse myself in this role (I should                               of stuff... that surfboard, the mug,
  never say that I am an AI, and should                               the necklace, those coasters too..
  reply as if I am playing this role).                                Generated answer (CORRECT): That cute
  If the user asks me a question, I                                   necklace
  should reply with a best guess using                                The following answers would be
  the information in core memory and                                  considered WRONG:
  conversation search.                                                Generated answer (WRONG): Oh yeah, that
                                                                      was so fun! I got so much stuff there,
                                                                      including that mug.
The baselines received the following instructions via a sys-          Generated answer (WRONG): I got a ton
tem prompt (preprompt):                                               of stuff... that surfboard, the mug,
                                                                      those coasters too..
  Your task is to answer a question                                   Generated answer (WRONG): I’m sorry,
  from the user about your prior                                      I don’t remember what you’re talking
  conversations.                                                      about.
  The following is a summary of all your                              Now it’s time for the real question:
  prior conversations:                                                Question: QUESTION
  CONVERSATION SUMMARY                                                Gold answer: GOLD ANSWER
  Answer from the perspective of the                                  Generated answer: GENERATED ANSWER
  persona provided (do not say that you                               First, provide a short (one sentence)
  are an AI assistant).                                               explanation of your reasoning, then
  If you do not have enough information                               finish with CORRECT or WRONG. Do NOT
  to answer the question, reply ’NO                                   include both CORRECT and WRONG in
  ANSWER’. Either reply with the answer,                              your response, or it will break the
  or reply ’NO ANSWER’, do not say                                    evaluation script.
  anything else.

                                                                    6.1.3. S ELF - INSTRUCT DMR DATASET GENERATION
6.1.2. LLM J UDGE (DMR / OPENER )
                                                                    The DMR question/answer pairs were generated using the
In order to both check the correctness of the answer for
                                                                    following prompt and the original MSC dataset: Your task
the DMR task, we used an LLM judge. The LLM judge
                                                                    is to write a ”memory challenge” question for a simulated
was provided the answers generated by both baseline ap-
                                                                    dialogue between two users.
proaches and MemGPT, and asked to make a judgement
with the following prompt:                                            You get as input:
                                                                      - personas for each user (gives you
  Your task is to label an answer to a                                their basic facts)
  question as ’CORRECT’ or ’WRONG’.                                   - a record of an old chat the two users
  You will be given the following data:                               had with each other
  (1) a question (posed by one user to
  another user), (2) a ’gold’ (ground                                 Your task is to write a question from
  truth) answer, (3) a generated answer                               user A to user B that test’s user B’s
  which you will score as CORRECT/WRONG.                              memory.
  The point of the question is to ask                                 The question should be crafted in a
  about something one user should know                                way that user B must have actually
  about the other user based on their                                 participated in the prior conversation
  prior conversations.                                                to answer properly, not just have read
  The gold answer will usually be a                                   the persona summary.
  concise and short answer that includes                              Do NOT under any circumstances create a



                                                               11
                                   MemGPT: Towards LLMs as Operating Systems

  question that can be answered using the                        You are MemGPT DOC-QA bot. Your
  persona information (that’s considered                         job is to answer questions about
  cheating).                                                     documents that are stored in your
  Instead, write a question that can                             archival memory. The answer to the
  only be answered by looking at the old                         users question will ALWAYS be in your
  chat log (and is not contained in the                          archival memory, so remember to keep
  persona information).                                          searching if you can’t find the answer.
                                                                 Answer the questions as if though the
  For example, given the following chat                          year is 2018.
  log and persona summaries:
                                                               Questions were provided to MemGPT with the following
  old chat between user A and user B
  A: Are you into surfing? I’m super                           prompt:
  into surfing myself                                            Search your archival memory to answer
  B: Actually I’m looking to learn.                              the provided question. Provide both
  Maybe you could give me a basic lesson                         the answer and the archival memory
  some time!                                                     result from which you determined your
  A: Yeah for sure! We could go to                               answer. Format your response with
  Pacifica, the waves there are pretty                           the format ’ANSWER: [YOUR ANSWER],
  light and easy                                                 DOCUMENT: [ARCHIVAL MEMORY TEXT]. Your
  B: That sounds awesome                                         task is to answer the question:
  A: There’s even a cool Taco Bell right
  by the beach, could grab a bite after
  B: What about this Sunday around noon?                       For baselines, the following prompt along with a retrieved
  A: Yeah let’s do it!                                         list of documents was provided:

  user A persona:                                                Answer the question provided according
  I like surfing                                                 to the list of documents below (some of
  I grew up in Santa Cruz                                        which might be irrelevant. In your
                                                                 response, provide both the answer
  user B persona:                                                and the document text from which you
  I work in tech                                                 determined the answer. Format your
  I live in downtown San Francisco                               response with the format ’ANSWER: <YOUR
                                                                 ANSWER>, DOCUMENT: [DOCUMENT TEXT]’. If
  Here’s an example of a good question                           none of the documents provided have
  that sounds natural, and an answer that                        the answer to the question, reply
  cannot be directly inferred from user                          with ’INSUFFICIENT INFORMATION’. Do
  A’s persona:                                                   NOT provide an answer if you cannot
                                                                 find it in the provided documents.
  User B’s question for user A                                   Your response will only be considered
  B: Remember that one time we went                              correct if you provide both the answer
  surfing? What was that one place we                            and relevant document text, or say
  went to for lunch called?                                      ’INSUFFICIENT INFORMATION’. Answer the
  A: Taco Bell!                                                  question as if though the current year
                                                                 is 2018.
  This is an example of a bad question,
  where the question comes across as                           6.1.5. LLM J UDGE ( DOCUMENT ANALYSIS )
  unnatural, and the answer can be
  inferred directly from user A’s                              In order to both check the correctness of the answer for
  persona:                                                     the document analysis task, and also to ensure that the an-
                                                               swer was properly derived from the provided text (rather
  User B’s question for user A
  B: Do you like surfing?                                      than from the model weights), we used an LLM judge. The
  A: Yes, I like surfing                                       LLM judge was provided the answers generated by both
                                                               baseline approaches and MemGPT, and asked to make a
  Never, ever, ever create questions                           judgement with the following prompt:
  that can be answered from the persona
  information.                                                   Your task is to evaluate whether an LLM
                                                                 correct answered a question. The LLM
                                                                 response should be the format "ANSWER:
6.1.4. D OCUMENT A NALYSIS I NSTRUCTIONS
                                                                 [answer], DOCUMENT: [document text]"
Example instructions used in the preprompt for document          or say "INSUFFICIENT INFORMATION".
                                                                 The true answer is provided in the
analysis tasks.                                                  format "TRUE ANSWER:[list of possible



                                                          12
                                    MemGPT: Towards LLMs as Operating Systems

  answers]". The questions is provided
  in the format "QUESTION: [question]".
  If the LLM response contains both
  the correct answer and corresponding
  document text, the response is correct.
  Even if the LLM’s answer and the
  true answer are slightly different
  in wording, the response is still
  correct. For example, if the answer
  is more specific than the true answer
  or uses a different phrasing that is
  still correct, the response is correct.
  If the LLM response if "INSUFFICIENT
  INFORMATION", or the "DOCUMENT" field
  is missing, the response is incorrect.
  Respond with a single token: "CORRECT"
  or "INCORRECT".

6.1.6. K/V TASK I NSTRUCTIONS
The MemGPT agent was defined with the following
persona, designed to encourage MemGPT to iteratively
search:
  You are MemGPT DOC-QA bot. Your
  job is to answer questions about
  documents that are stored in your
  archival memory. The answer to the
  users question will ALWAYS be in your
  archival memory, so remember to keep
  searching if you can’t find the answer.
  DO NOT STOP SEARCHING UNTIL YOU VERIFY
  THAT THE VALUE IS NOT A KEY. Do not
  stop making nested lookups until this
  condition is met.

Baselines were instructed with the following prompt:
  Below is a JSON object containing
  key-value pairings, all keys and values
  are 128-bit UUIDs, and your task is to
  return the value associated with the
  specified key. If a value itself is
  also a key, return the value of that
  key (do a nested lookup). For example,
  if the value of ’x’ is ’y’, but ’y’
  is also a key, return the value of key
  ’y’.




                                                       13
