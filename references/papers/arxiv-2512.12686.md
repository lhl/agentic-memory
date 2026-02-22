<!-- Generated from arxiv-2512.12686.pdf via pdftotext -layout on 2026-02-22 -->

                                          Memoria: A Scalable Agentic Memory Framework
                                                for Personalized Conversational AI
                                                      Samarth Sarin                         Lovepreet Singh                         Bhaskarjit Sarmah
                                                     BlackRock, Inc.                        BlackRock, Inc.                          BlackRock, Inc.
                                                   Gurgaon, HR, India                     Gurgaon, HR, India                      Gurgaon, HR, India
                                               samarth.sarin@blackrock.com           lovepreet.singh@blackrock.com          bhaskarjit.sarmah@blackrock.com

                                                                                                  Dhagash Mehta
                                                                                                  BlackRock, Inc.
                                                                                               New York, NY, USA
                                                                                           dhagash.mehta@blackrock.com




arXiv:2512.12686v1 [cs.AI] 14 Dec 2025
                                            Abstract—Agentic memory is emerging as a key enabler for         gathering, and fostering a more personalized dialogue expe-
                                         large language models (LLM) to maintain continuity, person-         rience. In domains like customer support, e-commerce, and
                                         alization, and long-term context in extended user interactions,     financial advisory, memory allows faster resolutions, cus-
                                         critical capabilities for deploying LLMs as truly interactive and
                                         adaptive agents. Agentic memory refers to the memory that           tomized recommendations, and long-term personalization.
                                         provides an LLM with agent-like persistence: the ability to            Agentic memory [2] refers to the capacity of an LLM
                                         retain and act upon information across conversations, similar       agent implementation to recall, adapt to, and reason over past
                                         to how a human would. We present Memoria, a modular                 interactions to simulate the behaviour of a coherent, goal-
                                         memory framework that augments LLM-based conversational             directed agent. It allows LLMs to move beyond reactive,
                                         systems with persistent, interpretable, and context-rich memory.
                                         Memoria integrates two complementary components: dynamic            stateless responses toward sustained, context-aware dialogues.
                                         session-level summarization and a weighted knowledge graph          Incorporating such memory into LLM-based systems is not
                                         (KG)-based user modelling engine that incrementally captures        only crucial for technical performance but also vital for
                                         user traits, preferences, and behavioral patterns as structured     enhancing user trust, reducing repetition, and improving long-
                                         entities and relationships. This hybrid architecture enables both   term engagement.
                                         short-term dialogue coherence and long-term personalization
                                         while operating within the token constraints of modern LLMs.           The development of agentic memory in LLM-based systems
                                         We demonstrate how Memoria enables scalable, personalized           has become a key research focus. Zhang et al. [2] provide
                                         conversational artificial intelligence (AI) by bridging the gap     a comprehensive survey categorizing memory types (textual,
                                         between stateless LLM interfaces and agentic memory systems,        parametric, structured) and operations like writing, retrieval,
                                         offering a practical solution for industry applications requiring   and forgetting, while calling for unified frameworks. A-MEM
                                         adaptive and evolving user experiences.
                                            Index Terms—Agentic Memory, Large Language Model Mem-
                                                                                                             [3], inspired by Zettelkasten note-taking [4], introduces graph-
                                         ory, Knowledge Graph, Conversation Summarization, Personal-         like memory structures that link atomic notes with contextual
                                         ized conversational assistants                                      descriptors, enabling dynamic memory evolution beyond flat
                                                                                                             storage systems.
                                                               I. I NTRODUCTION                                 On the systems side, knowledge-graph (KG)-based mem-
                                                                                                             ory architectures have gained traction in enabling persistent,
                                            Large Language Models (LLMs) [1] have significantly ad-          interpretable memory for conversational agents. Batching user
                                         vanced the capabilities of conversational AI, enabling human-       interactions into temporal KGs, as done in Ref. [5], demon-
                                         like interactions across a broad spectrum of applications.          strates a practical pathway for capturing evolving user states.
                                         However, most LLM-based chat systems operate without per-           Similarly, industrial frameworks such as LangGraph [6] and
                                         sistent memory, where each interaction is treated in isolation,     LlamaIndex [7] have begun adopting summarization, vector
                                         discarding previous context and failing to adapt over time.         retrieval, and graph-based profiling.
                                         This limits their ability to form coherent, context-rich, and          Existing LLM memory systems address components like
                                         personalized conversations.                                         vector retrieval, summarization, or temporal KGs in isolation.
                                            Incorporating persistent memory into LLM-powered sys-            Vector stores lack interpretability and conflict resolution, while
                                         tems offers substantial business and operational value by           graph-based systems struggle with recency and scalability. Few
                                         enhancing user experience, reducing interaction friction, and       frameworks integrate both short- and long-term memory with
                                         enabling context-aware automation. In customer support do-          incremental, recency-aware updates.
                                         mains, memory-equipped agents can retrieve prior user in-              To fill this gap, we propose Memoria, a (Python-based)
                                         teractions, historical issues, and stated preferences, thereby      memory augmentation framework that can be integrated into
                                         improving resolution speed, reducing redundant information          any LLM-driven chat interface. Memoria introduces a persis-
tent memory layer through two complementary components:             retention during active tasks. This transient memory enables
(1) dynamic chat summarization and (2) a weighted KG-               LLM-based agents to maintain intermediate computations,
based user persona engine. By combining these components,           dialogue states, and contextual dependencies across multiple
Memoria enables context retention and behavioral continuity         conversational turns. Analogous to human cognitive working
across sessions.                                                    memory, it allows the model to mentally track evolving
                                                                    information while formulating responses. Tasks such as it-
    II. BACKGROUND AND P ROPOSED M ETHODOLOGY
                                                                    erative code debugging, multi-step mathematical reasoning,
A. Background and Related Work                                      dynamic planning, or conversational task decomposition all
   Recent research has increasingly recognized agentic mem-         benefit from robust working memory mechanisms within LLM
ory as a critical capability for enhancing LLM-based conversa-      architectures.
tional systems. Traditional LLM deployments typically follow        Parametric Memory Parametric Memory [2] refers to the
a stateless architecture in which each user input is processed      knowledge encoded in the parameters of a language model dur-
independently, with prior interactions forgotten unless explic-     ing pre-training. It enables zero- and few-shot generalization
itly provided as input context. This design leads to repetitive,    by capturing patterns and facts from the training data. While
impersonal exchanges that fail to leverage historical user infor-   useful for tasks like explaining financial concepts without
mation. Agentic memory frameworks seek to overcome these            external context, it is static and cannot adapt to new user-
limitations by equipping models with mechanisms to retain,          specific interactions, limiting personalization.
retrieve, and reason over accumulated conversational histo-            These memory types form the foundation for agentic LLM
ries, enabling long-term personalization and adaptive dialogue      systems. Recent work on external memory such as Retrieval
behavior. By maintaining structured memory representations          Augmented Generation (RAG), summarization, and memory
such as KGs, session summaries, or retrieved interaction his-       graphs aims to bridge short- and long-term context. Memoria
tories, agentic systems can evolve beyond reactive responses to     builds on this by providing a developer-friendly framework
support proactive, goal-aligned interactions that more closely      that combines chat summarization, persistent logging, and KG-
resemble long-term human agency [2], [3], [5].                      based user modeling.
   Below are various types of agentic memories crucial for a
                                                                    B. Proposed Methodology
personalized conversational AI system:
Episodic Memory: Episodic memory [2], [8] encapsulates the             To overcome the limitations inherent in stateless LLM chat
agent’s ability to recall specific past interactions or events.     systems, particularly their inability to retain memory across
This type of memory mirrors the autobiographical memory of          sessions, personalize responses, or maintain coherent conver-
humans, allowing the model to reference details such as user        sations over time, we propose Memoria: a modular Python-
preferences, prior conversations, and historical decisions. For     based library engineered to furnish LLMs with structured and
example, if a user is previously identified as an equity trader,    persistent memory.
an agent equipped with episodic memory could incorporate               Memoria operates as an enhancement layer, integrating
this information to personalize future financial updates. Such      seamlessly into any LLM-driven conversational assistant archi-
capabilities support persistent personalization and conversa-       tecture. Its design revolves around four core modules, each ad-
tional continuity across sessions, both of which are critical for   dressing a specific facet of memory and context awareness: (1)
enhancing user engagement and interaction quality in long-          structured conversation logging, (2) dynamic user modeling,
term deployments.                                                   (3) real-time session summarization, and (4) context-aware
Semantic Memory: Semantic memory [2], [8] represents                retrieval. Together, these components form a unified memory
the model’s capacity to access and utilize structured, factual      framework that allows LLMs to simulate human-like memory
knowledge, including historical data, general world knowl-          retention and personalization. We propose solving the episodic
edge, domain-specific definitions, and taxonomic relationships.     and semantic memory capabilities of LLM applications. Our
This type of memory allows LLM-based agents to ground               approach does not involve finetuning of an LLM, hence there
their responses in verifiable information by integrating external   is no enhancement provided in the parametric memory, and
knowledge sources such as knowledge bases, ontologies, or           neither is there any enhancement provided by Memoria on
APIs. For instance, retrieving historical stock prices, referenc-   working memory.
ing regulatory definitions, or explaining financial instruments        1) Structured Conversation History with Database: The
exemplifies the application of semantic memory in financial         foundational layer of Memoria is a structured conversation
advisory contexts. By providing access to consistent and            logging system powered by a database. Every user interaction
externally validated information, semantic memory plays a           is persistently stored in this database with a well-defined
foundational role in ensuring response accuracy, factual con-       schema that includes:
sistency, and domain correctness, particularly in high-stakes          • Timestamps marking the exact time of each message;
professional environments.                                             • Session identifiers for differentiating between conversa-
Working Memory: Working memory [2], [9] refers to the                     tion instances;
short-term memory capacity that supports ongoing reason-               • Raw message content from both the user and the LLM;
ing, multi-step problem solving, and temporary information             • KG triplets extracted from the user messages.
  •   Summaries of conversational turns for downstream re-         current prompt. This enables the conversational assistant to
      trieval and compression; and,                                recall previously discussed topics, user-specific preferences,
   • Token usage statistics for monitoring efficiency and          and unfinished queries, allowing the conversation to resume
      performance.                                                 naturally and productively. Both approaches, i.e., session-level
This structured format transforms the interaction history into a   summary and KG generation of user persona, help to improve
queryable and temporally indexed memory bank. By maintain-         the episodic and semantic memory capabilities of any LLM
ing a comprehensive log of all interactions, Memoria enables       chat application.
the LLM to recall past user inputs even across different
                                                                   C. Holistic Personalization and Memory Retention
sessions. This persistent memory eliminates the need for users
to reintroduce themselves or repeat previous inputs, thereby          Each of the above four modules in Memoria is designed to
improving the continuity and flow of interaction. A key benefit    be independently functional yet synergistic when combined.
of structured conversation is that users no longer start from      Collectively, they form a holistic memory architecture that
scratch, and the LLM can continue conversations seamlessly         supports:
across sessions. This KG is saved in form of raw triplets in          • Personalization: By modeling individual users through
the SQL database and in form of vector embeddings in a                   KGs;
vector database along with relevant metadata used for filtering       • Retention: By persistently storing conversation history;
relevant set of triplets.                                             • Continuity: By linking sessions via intelligent retrieval
   2) Dynamic User Persona via KG: In addition to storing                and summarization; and,
conversation history, Memoria constructs a dynamic user               • Efficiency: By reducing redundancy and unnecessary
persona by incrementally building a KG based on user in-                 user input.
teractions. This KG captures:                                         Memoria functions as a plug-and-play memory extension
   • Recurring topics mentioned by the user;                       for any LLM-based conversational assistant. It redefines user
   • User preferences inferred from conversational patterns;       experience by transforming LLMs from forgetful responders
   • Named entities identified during interactions; and,           into intelligent, adaptive agents capable of learning and evolv-
   • Relationships and connections between various user-           ing through ongoing interactions.
      stated facts.                                                   Memoria upgrades the LLM and user interaction paradigm
   The KG evolves as new messages are processed, enabling          from isolated exchanges to ongoing relationships and conver-
the system to emulate a growing, adaptive memory. This             sations that evolve, adapt, and remember.
representation supports the generation of responses that are not
                                                                                   III. S YSTEM A RCHITECTURE
only contextually accurate but also deeply personalized, based
on the user’s history and interaction patterns. Some of the key       The Memoria framework is designed to function as a
benefits of this KG are that the conversations feel customized     modular memory enhancement layer for any LLM powered
to the end user, and meaningful responses are tailored rather      conversational system. Its architecture supports dynamic mem-
than generic.                                                      ory construction and retrieval based on the user’s session
   3) Session Level Memory for Real Time Context: To handle        status distinguishing between new and repeat users, as well as
short-term recall within an ongoing session, Memoria includes      new and ongoing sessions. Figure 1 illustrates two operational
a session summarization module. As the conversation pro-           scenarios that encapsulate Memoria’s working components.
gresses, this module dynamically generates summaries of the
                                                                   A. Scenario 1: New User or New Session
dialogue, which are then used to maintain continuity in real
time.                                                                 When a user interacts with the system for the first time,
   This feature ensures that the LLM retains a coherent under-     Memoria does not possess any prior memory, neither a session-
standing of prior turns within the same session, crucial for       level summary nor a users persona KG. As shown in the upper
multi-turn conversations where context evolves rapidly. By         half of Figure 1, only the user message (A) and the system
maintaining a live memory of the current session, Memoria          prompt (B) are passed to the LLM for response generation.
mitigates context loss and allows the LLM to respond intelli-      No triplets (E) are involved at this point due to the absence of
gently, even during extended dialogues.                            prior context. However, if the session is new but the user is a
   4) Seamless Retrieval for Context-Aware Responses:              repeat visitor, the system augments the prompt with additional
Memoria’s retrieval module enables the LLM to recall relevant      context derived from the user’s KG (E), alongside the user
past information when a user returns after a pause, whether the    message and system prompt. Thus, inclusion of the KG in the
gap is a few minutes or several days. This retrieval mechanism     prompt is conditional used only when prior user data exists
fuses two memory sources: (1) the structured conversation          from previous interactions.
history from the database; and, (2) the KG constructed from           Once a response is generated, the key memory update
prior interactions enhanced with weightage based on recency        engine of Memoria is activated. The system performs the
of conversations.                                                  following steps:
   By effectively combining these, the system provides the            • Extracts knowledge triplets via LLM from the user mes-
LLM with a relevant distilled context window tailored to the            sage and stores them:
                                            Fig. 1: Memoria System Architecture


       – In SQL for raw representation (subject, predicate,          The session summary and weighted triplets are ingested
          object).                                                   into the prompt and further passed into the LLM for an-
       – In vector database as vector embeddings, along with         swering the user query, considering the additional context
          metadata (e.g., timestamp, original sentence, user         as well.
          name).                                                   • Following response generation, the same update mecha-

   • Saves the user message and assistant response in SQL as         nism applies:
     raw messages for full traceability.                               – New triplets from the user query are appended to
   • Triggers summary generation using both the user and as-              SQL and embedded in the vector database.
     sistant messages via an LLM call. The resulting summary           – The raw messages and updated session summary are
     is stored against the session ID in SQL.                             saved back to SQL.
This forms the foundational memory layer for any follow-up         • This iterative loop continuously enriches both the long-
interactions within the same session.                                term persona model and short-term conversation memory.
                                                                   Memoria’s architecture ensures context-aware, consistent,
B. Scenario 2: Repeat User with Ongoing Session
                                                                 and evolving dialogue with users while significantly reducing
 In the case of a repeat user continuing an ongoing session,     token overhead by avoiding full-history prompting.
Memoria retrieves both:
 • A session summary that encapsulates recent conversation                       IV. W ORKING M ECHANISM
    turns.
 • A set of user-specific triplets representing their KG.
                                                                    Memoria’s architecture is designed to manage memory
 • As shown in the lower half of Figure 1, the summary
                                                                 across diverse user interaction patterns dynamically. This sec-
    and the top-K triplets (retrieved via semantic similarity    tion outlines how the framework handles memory operations,
    from vector DB) filtered for the user basis user name        including chat summarization, KG updating, and persistent
    are retrieved. These triplets are further weighted in real   storage across three distinct user scenarios in detail:
    time using an exponential decay function, giving higher        1) New User with New Session;
    priority to more recent triplets, ensuring that updated        2) Repeat User with New Session; and,
    preferences or contradictions are resolved contextually.       3) Repeat User with Continuing Session.
   Each scenario is processed through a consistent pipeline          •   Memory Update: As the conversation progresses,
involving summary retrieval, KG access, application response             Memoria continuously updates both the session-level
capture, memory updates, and storage.                                    summary and the KG, allowing downstream interactions
                                                                         to benefit from enriched memory and contextual ground-
A. New User with New Session                                             ing.
   When a user interacts with the system for the first time, the
following events take place:
   • Session Check: Memoria verifies that no past summary
     exists for the session ID since it is a new session.
     Therefore, the summary retrieval module returns a null
     response.
   • User Check: As this is a first-time user, no associated
     KG exists. The KG retrieval module confirms the absence                Fig. 3: Repeat User with New Session Flow
     of triplets or historical preferences.
   • Response Capture: The user’s query is passed to the           C. Repeat User with Continuing Session
     developer’s application, which generates a response. Both       Here, the user is continuing within an already active session:
     the query and the corresponding reply are captured by           • Memory Availability: Both session-level summaries and
     Memoria.                                                          the user’s KG are readily available from the outset.
   • Summary Generation: Since no previous summary ex-               • Retrieval and Prompt Construction: The summary and
     ists, a fresh session summary is constructed based on the         relevant triplets, filtered and weighted (explained in the
     user query and system response.                                   next section) are retrieved by the application and injected
   • KG Extraction: Relevant KG triplets are extracted solely          into the prompt to ensure deep context continuity (green
     from the user’s message. These triplets are embedded              dotted line in Figure 4).
     as dense vectors and stored in a vector database, along         • Enhanced Dialogue Flow: With both long-term (KG)
     with metadata such as timestamps, user name and source            and short-term (session summary) context available, the
     message references etc.                                           LLM is primed to deliver highly coherent, context-aware,
   • Follow-up Retrieval: For any subsequent queries within            and personalized responses that evolve fluidly with the
     the same session, both the generated summary and up-              ongoing interaction.
     dated KG are available. These can be retrieved using
     Memoria’s functions and used by the application devel-
     oper to augment the system or user prompt, enhancing
     the coherence and personalization of follow-up answers.



                                                                           Fig. 4: Repeat User with Repeat Session Flow

                                                                   This structured handling of different user scenarios ensures
          Fig. 2: New User with New Session Flow                   that Memoria offers scalable memory augmentation without
                                                                   compromising the user experience, regardless of whether the
B. Repeat User with New Session                                    interaction is the user’s first or hundredth.

  In this case, the user has interacted with the system before,    D. Memory Update Engine
but the current session is new:                                       The core of Memoria’s memory system lies in its dual
  • Session Summary: As it is a new session, no prior              update mechanisms: one for maintaining session-level sum-
     summary is available, and the retrieval returns an empty      maries and another for building a dynamic, personalized KG
     response.                                                     of the user. Both processes are tightly integrated with the
  • User Check: Memoria identifies the user as a returning         LLM, ensuring that memory is not only persistently stored but
     user and immediately retrieves the relevant user’s KG         also actively leveraged to support coherent and personalized
     triplets based on similarity from previous interactions       conversations.
     further assigned with weights (green dotted line in Figure       1) Session Summary Update: Upon receiving both the user
     3).                                                           query and the assistant’s response, Memoria first evaluates
  • Prompt Augmentation: The application developer has             whether a session-level summary already exists for the given
     access to these triplets from the first interaction of the    session ID. If a prior summary is present, it is updated
     session itself, enabling immediate personalization based      using the new pair of user and assistant messages through
     on known preferences, interests, or past topics.              a summarization routine powered by the LLM. If no such
summary exists, a new one is created by the LLM and stored          contribution of older triplets in the exponential weighting
in the database against the current session ID. This enables        process.
incremental construction of a coherent thread of dialogue              Without normalization, large values of x (which occur when
over time. Retrieval of summaries is direct and deterministic,      the triplet originates from significantly older conversations)
handled via session ID lookups through a dedicated library          would lead to the exponential term e−αx approaching zero.
function that returns the current summary for any session.          This would diminish the influence of otherwise important past
   2) KG Update and Semantic Retrieval: The KG component            interactions and effectively remove them from the model’s
in Memoria represents a significant advancement in modeling         context.
persistent user-specific memory. Unlike the summary, the               By applying min-max normalization across all triplets:
KG is constructed solely from the user’s input, excluding                                         x − xmin
assistant responses, to ensure that the representation accurately                        xnorm =              ,
                                                                                                 xmax − xmin
reflects the user’s intent, preferences, and identity. When
                                                                    we ensure that the exponential decay remains sensitive to
a user message is received, the system checks whether an
                                                                    relative recency, while preventing extreme suppression of older
existing KG is available for that user based on the username.
                                                                    triplet weights. This allows the system to retain a soft memory
Regardless of the graph’s prior existence, structured triplets
                                                                    of long-past interactions, especially when no newer, conflicting
(subject, predicate, object) are extracted from the user’s query.
                                                                    information exists.
If the graph already exists, the new triplets are intelligently
                                                                       A higher value of a results in a steeper decay, meaning
connected to existing nodes to form an evolving semantic
                                                                    older triplets lose influence more rapidly. Conversely, smaller
structure; otherwise, a new graph is instantiated if not KG
                                                                    values of a produce a gentler decay curve.
exists for the user and are saved in SQL database.
                                                                       To ensure that the weights are comparable and sum to 1,
   Each extracted triplet is embedded into a vector space and
                                                                    we normalize them across all retrieved triplets. The normalized
stored in a vector database along with rich metadata. This
                                                                    weight w̃i is computed as:
includes the source user message, the timestamp of the con-
versation, and raw use message etc. At the time of retrieval, the                         wi           e−a·xi
incoming user query is converted into an embedding vector,                         w̃i = PN        = PN           ,              (2)
                                                                                                            −a·xj
and semantic similarity is used to retrieve the top N most                                  j=1 wj    j=1 e

relevant triplets. These retrieved triplets provide contextual      where N is the total number of retrieved triplets. This nor-
grounding for the LLM.                                              malization ensures that:
   To dynamically prioritize KG triplets based on their recency,                              N
                                                                                              X
we apply an Exponential Weighted Average (EWA) scheme.                                              w̃i = 1                      (3)
This method assigns higher weights to more recent triplets,                                   i=1
while gradually decreasing the importance of older ones. Each          These normalized weights are attached to their correspond-
triplet is assigned a weight based on how recently it was de-       ing triplets when retrieved from the vector database. Dur-
rived from the user’s input messages. This approach prioritizes     ing prompt construction, they guide the LLM to prioritize
triplets that were mentioned more recently in the conversation,     triplets with higher weights, i.e., more recent and likely more
ensuring that the most up-to-date information is emphasized. It     relevant knowledge, thereby enhancing personalization and
is particularly effective in resolving conflicts where the user’s   factual accuracy in the conversation. If conflicting triplets are
latest inputs contradict earlier facts, enabling accurate memory    retrieved, this weighting system enables the model to resolve
updates and maintaining consistency in the KG. Such decay-          discrepancies in favor of the most current knowledge, having
based weighting ensures that the model emphasizes the user’s        higher weights.
latest preferences and facts, which is critical in adapting to
evolving contexts.                                                                        V. E XPERIMENTS
                                                                       To evaluate Memoria against existing agentic memory
E. Weight Calculation                                               systems, we compare its performance with A-Mem [3], a
   For each triplet i, we compute its raw weight wi using the       recently-proposed framework that organizes memory notes via
following exponential decay function:                               principles inspired by the Zettelkasten method. A-Mem auto-
                                                                    matically generates structured memory entries with contextual
                          wi = e−a·xi                        (1)    descriptions, tags, and embeddings, then dynamically links
                                                                    new memories to related historical entries and evolves its
where a > 0 is the decay rate that controls how quickly             memory graph over time.
the weight decreases over time, and xi is the number of
minutes between the current time and the creation date-time         A. Datasets
of triplet i. The values of x representing the number of minutes       For experimental evaluation, we utilized the LongMemEvals
between the current time and the creation time of a triplet are     dataset [10], which is designed to benchmark memory-
normalized to lie within the interval [0, 1]. This normalization    augmented language model systems in realistic business-
step is crucial to ensure numerical stability and meaningful        oriented settings. The dataset contains long-form conversations
paired with targeted questions, challenging the model’s ability          embedding strategy to have a direct comparison with
to retain and utilize contextual information along with ground           Memoria, though no other changes were made.
truth answers for evaluation. On average, each conversation          Memoria was tested using text-embedding-ada-002, with
spans approximately 115,000 tokens, sufficiently large to test    identical downstream configurations (GPT-4.1-mini, top-20
the boundaries of context retention while still falling within    retrieval, decay rate α = 0.02).
the token limits of current frontier LLMs [5].                       For a fair comparison, both Memoria and A-Mem were
   LongMemEvals includes six distinct question types: (1)         configured to retrieve the same number of triplets/ messages
single-session-user, (2) single-session-assistant, (3) single-    (K = 20) in both the experiments that is, the default embedder
session-preference, (4) multi-session, (5) knowledge-update,      (SentenceTransformers all-MiniLM-L6-v2) and modified ver-
and (6) temporal-reasoning. These categories represent various    sion (OpenAI text-embedding-ada-002). A-Mem does not im-
aspects of agentic memory and contextual reasoning. However,      plement a decay mechanism thus no weighting while Memoria
for this work, we restrict our analysis to the knowledge-update   applies its exponential decay-based weighting, a feature unique
and single-session-user categories, as they align most closely    to our system.
with the core capabilities of Memoria. The dataset file used is
longmemeval s available under LongMemEvals huggingface                                         VI. R ESULTS
[11].
                                                                     This section presents a comparative analysis of Memoria
B. Computational Details                                          and A-Mem on the LongMemEval dataset, evaluating accu-
   To align with the design goal of accessibility and open-       racy, token usage and latency performance.
source availability, Memoria has been implemented to op-
erate entirely without reliance on external or proprietary        A. Accuracy
databases. By default, the framework uses an on-premise             Table I presents the performance comparison across
SQLite3 database for storing raw user conversations, generated    four different approaches on two categories from the
summaries, and associated metadata. For semantic representa-      LongMemEvals dataset: single-session-user and
tion of user traits and preferences, KG triplets are embedded     knowledge-update. The evaluated methods include: (1)
and stored in a local instance of ChromaDB1 , enabling vector-    Full Context, where the LLM is prompted without memory
based retrieval with metadata support.                            augmentation, (2) Memoria, our proposed framework with
   We employ OpenAI’s text-embedding-ada-002 model to             summarization and KG retrieval, (3) A-Mem (ST), the original
generate embeddings for triplet storage and semantic              A-Mem setup using SentenceTransformers, and (4) A-Mem
similarity-based retrieval. The underlying language model used    (OpenAI), a modified A-Mem configuration using OpenAI
for generation and reasoning tasks is GPT-4.1-mini. During        embeddings. All experiments were conducted using GPT-
retrieval, we apply semantic top-K matching with K = 20,          4.1-mini as the language model backend and evaluated with
and assign temporal weights to retrieved triplets using an ex-    ground truth using LLM as a judge.
ponential decay function with a decay rate α=0.02, prioritizing
                                                                   Type               Full Conversation   A-Mem (ST)   A-Mem (OA)   Memoria
recent interactions.                                               Single-Session           85.7%           78.5%         84.2%      87.1%
   The experiments were conducted without the need for high-       Knowledge-Update         78.2%           76.2%         79.4%      80.8%

performance or GPU-backed computational hardware due to           TABLE I: Accuracy Comparison Across Memory Strategies
the use of closed-source LLMs accessed via API endpoints,
hence the system remains lightweight, cost-effective, and            The results in Table I highlight Memoria’s superior perfor-
deployable in resource-constrained environments.                  mance over both variants of A-Mem using SentenceTransform-
C. Evaluation Setup                                               ers (ST) and OpenAI (OA) embeddings across both Single-
   We evaluated both Memoria and A-Mem on                         Session and Knowledge-Update scenarios. While full-context
LongMemEvals’s          single-session-user               and     prompting performs reasonably well, it scales poorly due
knowledge-update subsets using GPT-4.1-mini as                    to latency and token cost. Memoria, by contrast, achieves
the LLM.                                                          the highest accuracy in both categories while significantly
   To provide a fair comparison, we executed two versions of      reducing prompt length by leveraging a weighted KG.
A-Mem:                                                               In our experiments, Memoria outperforms A-Mem by using
                                                                  recency-aware weighting for knowledge triplets. Unlike A-
   1) Default A-Mem: Cloned the official repository [12] and
                                                                  Mem’s unweighted retrieval, Memoria applies exponential
      ran experiments using its standard configuration, which
                                                                  decay to prioritize recent user inputs, resolve contradictions
      employs the all-MiniLM-L6-v2 [13] embedding model
                                                                  and emphasize updated information. This ensures coherent,
      from SentenceTransformers.
                                                                  up-to-date responses across sessions.
   2) Modified A-Mem: Updated the A-Mem embedding
                                                                     By combining structured long-term memory with adaptive
      component by replacing the default model with Ope-
                                                                  prioritization, Memoria demonstrates that intelligent memory
      nAI’s text-embedding-ada-002, aligning with Memoria’s
                                                                  curation—rather than exhaustive recall—is a more effective
 1 https://docs.trychroma.com/docs/overview/introduction          and scalable strategy for memory-augmented LLMs.
B. Latency Evaluation                                                                                VII. C ONCLUSION
   In addition to accuracy-based evaluations, we conducted                     We propose an agentic memory framework, called Memoria,
a latency test to assess the end-to-end execution time for                  for personalized conversational AI. By enabling structured and
processing the complete evaluation dataset. This dataset com-               persistent memory, Memoria allows LLMs to recall, reason,
prises a total of 148 data points, with 70 samples under                    and act upon past interactions, leading to more personalized
the single-session-user category and 78 under the                           and coherent conversations. This addresses the statelessness
knowledge-update category.                                                  problem commonly seen in traditional LLM deployments.
                                                                               We will be releasing the library soon as an open-source
   We compare two approaches:
                                                                            Python package, built for seamless integration into existing
  1) Baseline Approach (Full Context Prompting): In this                    infrastructures.
     setup, the entire historical conversation is appended to                  Future work will expand Memoria’s evaluation in key sys-
     the prompt along with the current question. The LLM                    tem dimensions, including memory footprint growth, retrieval
     is then queried to generate an answer based on this                    latency under load, and KG quality metrics. We also aim to
     complete conversational context.                                       extend its use to broader agentic systems such as retrieval-
  2) Memoria-Augmented Approach: In this setup, only the                    based recommenders and productivity tools. By modularizing
     current question is provided to the system. The response               its components, Memoria can support advanced memory tasks
     time is calculated by aggregating the execution times of               like temporal reasoning, user preference tracking, and multi-
     individual Memoria components, which include:                          sessioncoherence across diverse applications.
        • Retrieval of relevant KG triplets,
                                                                                                        R EFERENCES
        • Computation of semantic similarity and filtering,
        • Calculation of exponential decay-based weights for                 [1] Yupeng Chang, Xu Wang, Jindong Wang, Yuan Wu, Linyi Yang, Kaijie
                                                                                 Zhu, Hao Chen, Xiaoyuan Yi, Cunxiang Wang, Yidong Wang, et al. A
          each triplet,                                                          survey on evaluation of large language models. ACM transactions on
        • Construction of the prompt using the weighted                          intelligent systems and technology, 15(3):1–45, 2024.
          triplets,                                                          [2] Zeyu Zhang, Xiaohe Bo, Chen Ma, Rui Li, Xu Chen, Quanyu Dai,
                                                                                 Jieming Zhu, Zhenhua Dong, and Ji-Rong Wen. A survey on the
        • Final inference time from the LLM based on this                        memory mechanism of large language model based agents. arXiv
          constructed prompt.                                                    preprint arXiv:2404.13501, 2024.
                                                                             [3] Wujiang Xu, Kai Mei, Hang Gao, Juntao Tan, Zujie Liang, and Yongfeng
                                                                                 Zhang. A-mem: Agentic memory for llm agents. arXiv preprint
   Approach        Question Type       Inference Time   Avg. Token length        arXiv:2502.12110, 2025.
  Full Context   single-session-user      391 secs            115K           [4] Niklas Luhmann. Communicating with slip boxes. an empirical account.
    Memoria      single-session-user      260 secs             398               Two Essays by Niklas Luhmann, 1992.
  A-Mem (ST)     single-session-user      290 secs             958           [5] Preston Rasmussen, Pavlo Paliychuk, Travis Beauvais, Jack Ryan, and
  A-Mem (OA)     single-session-user      252 secs             934               Daniel Chalef. Zep: A temporal knowledge graph architecture for agent
  Full Context   knowledge-update         522 secs            115K               memory. arXiv preprint arXiv:2501.13956, 2025.
    Memoria      knowledge-update         320 secs             400           [6] Langgraph. https://www.langchain.com/langgraph, 2025. LangChain,
  A-Mem (ST)     knowledge-update         364 secs             933               accessed July 10, 2025.
  A-Mem (OA)     knowledge-update         328 secs             928
                                                                             [7] Jerry Liu and contributors. Llamaindex: Data framework for llm
                                                                                 applications. https://docs.llamaindex.ai/en/stable/, 2024. Accessed:
TABLE II: Inference and Token Length Comparison Results                          2025-06-14.
between Full Context and Memoria.                                            [8] Endel Tulving. Episodic and semantic memory. Organization of
                                                                                 Memory, pages 381–403, 1972.
                                                                             [9] Alan Baddeley. Working memory. Memory, pages 71–111, 2020.
   Table II presents the inference time and average prompt                  [10] Di Wu, Hongwei Wang, Wenhao Yu, Yuwei Zhang, Kai-Wei Chang,
token length for different memory strategies across the two                      and Dong Yu. Longmemeval: Benchmarking chat assistants on long-
                                                                                 term interactive memory. arXiv preprint arXiv:2410.10813, 2024.
evaluated question types. Full-context prompting, while con-                [11] Xiaowu, Pengcheng Yin, and Graham Neubig. Longmemeval: A bench-
textually rich, incurs the highest latency up to 522 seconds                     mark for long-term memory in language models. https://huggingface.
and processes over 115,000 tokens per query, resulting in                        co/datasets/xiaowu0162/longmemeval, 2024. Accessed: 2025-06-25.
                                                                            [12] Wujiang Xu, Zujie Liang, Kai Mei, Hang Gao, Juntao Tan, and Yongfeng
substantial computational and monetary overhead. In contrast,                    Zhang. A-mem: Agentic memory for llm agents. https://github.com/
Memoria reduces average token length to under 400 tokens                         agiresearch/A-mem, 2025. GitHub repository; last accessed 10 July
by retrieving only a curated set of weighted KG triplets and                     2025.
                                                                            [13] Nils Reimers and Iryna Gurevych. Sentence-transformers — all-minilm-
session summaries, achieving up to 38.7% reduction in latency                    l6-v2. https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2,
compared to full context prompting.                                              2020. Accessed: 2025-07-10.
   Even though A-Mem variants offer good reductions in
latency and prompt size compared to full context, their un-
weighted retrieval mechanism leads to less precise memory
usage and higher average token lengths (900+ tokens) as it
retrieves raw user messages for context. Memoria’s modu-
lar memory operations and recency-aware triplet weighting
preserve contextual fidelity while remaining cost-efficient and
scalable, particularly as session histories grow longer.
