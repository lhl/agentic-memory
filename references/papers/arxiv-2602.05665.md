<!-- Generated from arxiv-2602.05665.pdf via pdftotext -layout on 2026-02-22 -->

                                                                                                                                                                                          1




                                                              Graph-based Agent Memory:
                                                         Taxonomy, Techniques, and Applications
                                                Chang Yang† , Chuang Zhou† , Yilin Xiao† , Su Dong, Luyao Zhuang, Yujing Zhang, Zhu Wang
                                                Zijin Hong, Zheng Yuan, Zhishang Xiang, Shengyuan Chen‡ , Huachi Zhou‡ , Qinggang Zhang‡
                                                             Ninghao Liu, Jinsong Su, Xinrun Wang, Yi Chang, Xiao Huang



                                           Abstract—Memory emerges as the core module in the Large                        mathematical reasoning [2] to multi-agent tasks [3] and open-
                                        Language Model (LLM)-based agents for long-horizon complex                        world exploration [4]. The inherent language understanding,
                                        tasks (e.g., multi-turn dialogue, game playing, scientific discovery),            generation, and inference capabilities of LLMs enable LLM-




arXiv:2602.05665v1 [cs.AI] 5 Feb 2026
                                        where memory can enable knowledge accumulation, iterative
                                        reasoning and self-evolution. Among diverse paradigms, graph                      based agents to autonomously perceive environments and make
                                        stands out as a powerful structure for agent memory due to the                    decisions, which reduces manual intervention and reshapes the
                                        intrinsic capabilities to model relational dependencies, organize                 paradigm of intelligent systems [5].
                                        hierarchical information, and support efficient retrieval. This                      Despite notable advancements, LLM-based agents are still
                                        survey presents a comprehensive review of agent memory from the                   constrained by the intrinsic limitations of LLMs. (i) Knowledge
                                        graph-based perspective. First, we introduce a taxonomy of agent
                                        memory, including short-term vs. long-term memory, knowledge                      cutoff: LLMs are trained on static datasets with fixed time
                                        vs. experience memory, non-structural vs. structural memory,                      boundaries, resulting in knowledge cutoff issues that prevent
                                        with an implementation view of graph-based memory. Second,                        them from incorporating real-time information (e.g., current
                                        according to the life cycle of agent memory, we systematically                    financial data) or domain-specific knowledge beyond their pre-
                                        analyze the key techniques in graph-based agent memory, covering                  training corpora. This limitation undermines their ability to
                                        memory extraction for transforming the data into the contents,
                                        storage for organizing the data efficiently, retrieval for retrieving             adapt to dynamic environments and open-ended scenarios. (ii)
                                        the relevant contents from memory to support reasoning, and                       Tool incompetence: Although tool use represents a core capabil-
                                        evolution for updating the contents in the memory. Third, we                      ity of LLM-based agents [6], [7], existing LLMs demonstrate
                                        summarize the open-sourced libraries and benchmarks that                          limited capacity for efficiently learning and applying novel
                                        support the development and evaluation of self-evolving agent                     tools, which substantially constrains the agent performance. (iii)
                                        memory. We also explore diverse application scenarios. Finally,
                                        we identify critical challenges and future research directions. This              Performance saturation: LLM-based agents exhibit persistent
                                        survey aims to offer actionable insights to advance the development               failures in iterative, long-horizon tasks due to their inability
                                        of more efficient and reliable graph-based agent memory systems.                  to accumulate task-specific insights and leverage historical
                                        All the related resources, including research papers, open-                       experiences for refining decision strategies across extended
                                        source data, and projects, are collected for the community in                     interactions. Consequently, agents may repeatedly commit
                                        https://github.com/DEEP-PolyU/Awesome-GraphMemory.
                                                                                                                          similar errors without demonstrating learning behavior to
                                          Index Terms—Agent, Multi-Agent System, Agent Memory,                            correct the errors for successful task completion.
                                        Knowledge Graph, Self-Evolving, Graph-based Memory                                   To address these challenges, memory [8] has emerged as
                                                                                                                          a critical component for advancing LLM agents towards four
                                                                   I. I NTRODUCTION                                       key objectives: i) Personalization and Specification. [9]:
                                           The past few years witnessed the rapid development of                          Memory enables agents to capture user preferences, interaction
                                        Large Language Model (LLM)-based agents, which have                               histories, and task-specific contexts for tailored responses, such
                                        demonstrated remarkable success in complex, long-horizon                          as remembering workflow habits in software engineering or
                                        tasks across diverse domains, from software engineering [1] and                   communication styles in conversational scenarios. Memory
                                                                                                                          bridges general knowledge with specific context, storing both
                                              †Equal contribution.                                                        universal facts and particular histories to ground responses in
                                              ‡Corresponding authors: Qinggang Zhang, Huachi Zhou, Shengyuan              personalized, context-aware information [10]. ii) Long-term
                                        Chen.
                                              Chang Yang, Chuang Zhou, Yilin Xiao, Su Dong, Luyao Zhuang, Yujing          Reasoning beyond Context Window. While LLMs operate
                                        Zhang, Zhu Wang, Zijin Hong, Zheng Yuan, Shengyuan Chen, Huachi Zhou,             within finite context windows with static parametric knowledge,
                                        Qinggang Zhang, Ninghao Liu, and Xiao Huang are with the The Hong Kong            memory systems provide unbounded external storage that
                                        Polytechnic University, Hong Kong SAR, China (e-mail: {chang.yang, chuang-
                                        qqzj.zhou, yilin.xiao, su.dong, luyao.zhuang, yu-jing.zhang, juliazhu.wang,       enables continuous learning and adaptation. Memory allows
                                        zijin.hong, yzheng.yuan, huachi.zhou}@connect.polyu.hk, {sheng-yuan.chen,         agents to retain information across extended temporal horizons,
                                        qinggang.zhang, ninghao-prof.liu, xiao.huang}@polyu.edu.hk).                      accumulate post-deployment experiences including successes
                                              Jinsong Su and Zhishang Xiang are with the School of Informa-
                                        tion, Xiamen University, China (e-mail: xiangzhishang@stu.xmu.edu.cn,             and failures, and dynamically refine strategies without model re-
                                        jssu@xmu.edu.cn).                                                                 training. iii) Self-improving [11]: By accumulating experiential
                                              Xinrun Wang is with the School of Computing and Information Systems,        knowledge, reasoning patterns, and feedback, agent memory
                                        Singapore Management University, Singapore (e-mail: xrwang@smu.edu.sg).
                                              Yi Chang is with the School of Artificial Intelligence, Jilin University,   supports iterative enhancement of adaptability and performance,
                                        Changchun, China (e-mail: yichang@jlu.edu.cn).                                    thus enabling the self-improving of LLM-based Agents on
                                                                                                                                    2




Fig. 1: A diagram illustrating the workflow of an AI agent system, and the detailed implementations of the memory system.


the tasks without parameter updating. iv) Hallucination                   implementation view of graph-based memory (Section III).
mitigation [12]: Grounding outputs in structured, verifiable            • We systematically analyze the critical memory manage-
memory content reduces reliance on potentially unreliable                 ment techniques, covering memory extraction (Section IV),
parametric knowledge. In essence, memory transforms stateless             memory storage (Section V), memory retrieval (Sec-
reactive models into stateful adaptive entities capable of rela-          tion VI) and memory evolution (Section VII).
tionship building, trajectory-based learning, and increasingly          • We summarize open-sourced libraries and benchmarks
sophisticated personalized behavior.                                      (Section VIII) that support the development and evaluation
   Traditional implementations of agent memory primar-                    of self-evolving graph-based agent memory across diverse
ily adopt linear, unstructured, or simple key-value storage               application scenarios (Section IX).
paradigms, such as fixed-length token sequences, vector                 • We identify critical challenges and outline future research
databases, and log-based buffers [13], [14]. While these                  directions to advance efficient and reliable graph-based
frameworks enable basic information storage and retrieval,                agent memory systems (Section X).
agent memory demands more complex functionalities, such as             This survey aims to provide a holistic overview of graph-
relational modeling, hierarchical organization, and causal depen- based agent memory, offering valuable insights for researchers
dencies. Graph-based agent memory [15], [16] has emerged as to advance memory design and enabling practitioners to select
the frontier for 2025–2026 research, transitioning from a passive appropriate structures and techniques for specific applications.
‘log’ of facts to a structured topological model of experience
that preserves how information is connected over time. Unlike                              II. P RELIMINARIES
traditional linear or unstructured memory, graph-based memory
can naturally encode relational dependencies between memory Definition II.1 (AI Agents). An AI agent is an LLM-based
elements due to its intrinsic ability to model entity relationships, system formed by four core modules:
capture hierarchical semantics, and support flexible traversal          • Perception Module: sensing the environment and convert-
and reasoning. Even plain memory can be regarded as a                     ing external observations into internal representations.
degenerate graph with trivial relationships, positioning graph-         • Reasoning Module: decomposing complex tasks, reason-
based agent memory as a general and flexible framework                    ing about dependencies, interacting with memory, and
for agent memory design. Recently, there has been a surge                 formulating execution strategies.
of research into graph-based memory architectures for LLM               • Memory System: comprising short-term memory for im-
agents, including knowledge graphs (KG), temporal graphs,                 mediate reasoning and long-term memory for experience
hypergraphs, hierarchical trees/graphs and hybrid graphs [17],            retention to support the reasoning.
[18], which demonstrated the efficacy across diverse scenarios,         • Action Module: executing actions in the environments.
such as hierarchical task planning, multi-session conversational The objective of the AI agent is to maximize the desired
understanding, and neuro-symbolic reasoning.                         evaluation metrics, e.g., accuracies, success rates, and rewards.
   Therefore, we present a comprehensive survey that con-
                                                                       In this section, we present the preliminaries of AI agents.
solidates the state-of-the-art in graph-based agent memory,
                                                                     An AI agent is an LLM-based system to autonomously
categorizes their core techniques, synthesizes their applications,
                                                                     complete complex tasks by leveraging the LLM’s capabilities
and identifies open challenges. Our contributions are fourfold:
                                                                     for reasoning, memorizing and decision making. The formal
   • We propose a taxonomy of agent memory, including short- definition is presented in Definition II.1. A typical execution
      term vs. long-term memory, knowledge vs. experience paradigm of AI agents is perception-reasoning-action cycle,
      memory, non-structural vs. structural memory, with an where the AI agent receives the inputs from the environment
                                                                                                                                                                                                                       3



     Memory             Knowledge Memory (Passive & Static)                                                                            Experience Memory (Proactive & Dynamic)
      Types                                                                                            Evolving


 Application                 Reference Books        Global         Rules          Facts & Truths                                                  Footprints Feedbacks       Timeline         Trajectories & History
 Scenarios        Store objective laws, common sense, and independent information.                                                     Record actual interactions, observations, and feedbacks.

                          General Definition: “Lasagna is a baked Italian dish typically                                                  Interaction Log: User requested a recipe for lasagna but explicitly
    Chatbots              containing layers of pasta, ground meat, tomato sauce, and cheese.”                                             specified a vegetarian version, rejecting the standard "ground meat".


                                                                                                        General
                                                                                                                                          User Session Log: User repeatedly viewed the "Sony A7 IV" page, but
 Recommender              Product Database: Item "Sony A7 IV Camera" has attributes: [Type:
                                                                                                                                          abandoned cart and bought a cheaper model, indicating price sensitivity
    System                Mirrorless], [Sensor: Full-frame], [Price Bracket: High].
                                                                                                                                          towards the [Price Bracket: High] attribute.

      Code
                          Language API Documentation: The official Python documentation for           Understanding                       Project Debugging History: Commit log shows a fix for a
                          json.loads() states it deserializes a JSON formatted string into a                                              JSONDecodeError in the current project, caused by passing an empty
     Agents               Python dictionary object.                                                                                       string to json.loads(), which is not covered by the basic usage example.

                                                                                                                                          Trade Execution Log: Agent executed the standard “Mean Reversion”
    Financial             Standard Strategy: "Mean Reversion" dictates buying an asset when
                                                                                                                      Personalized
                                                                                                                                          strategy on Stock XYZ at a 20-day low, but the trade resulted in a 5% loss
     Agents               its current price deviates significantly below its historical average.                                          as the price continued to fall.

      Game                Game Mechanic Rule: The enemy type "Ice Golem" is immune to                                  Evolution          Player Combat Log: The player executed 4 Attempts, where Attempts 1-
     Agents               physical attacks but takes double damage from Fire-based spells.                                                3 with a sword failed, and Attempt 4 with a Fireball spell succeeded.

                                                                                                                                          Grasp Failure Log: #404: Robot attempted standard pinch grasp on a
   Robotics &             General Affordance Database: A "Ceramic Mug" is a graspable object,
                                                                                                                                          specific ceramic mug's handle in the kitchen but failed because the
  Embodied AI             typically lifted by applying a precision pinch grasp to its handle.
                                                                                                                                          handle was unexpectedly wet and slippery.

                          Chemical Principle: Palladium(II) acetate is established in literature as                                       Experiment Log: #RXN-99 Used standard Palladium(II) acetate with
    Science               a standard catalyst that typically accelerates cross-coupling reactions                                         novel substrate Z. Unexpectedly observed rapid reaction completion at
    Agents                only at elevated temperatures (>60°C).                                                                          room temperature 25°C, contrasting with general heating requirement.


Fig. 2: Two types of agent memory, i.e., Knowledge Memory and Experience Memory, and their application across different
agent scenarios. The synergy between static knowledge memory and dynamic experience memory enables agents to both
understand the world’s rules and adapt to personal interactions.


through its perception module, then reasoning with LLMs                                                      • Memory Extraction: The transformation of raw unstruc-
across the inputs, the LLM’s internal knowledge and the                                                        tured observations ot into structured memory units m.
contents stored in the memory system, and finally outputs the                                                • Memory    Storage: The organization and placement of
actions to execute into the environment. Within this paradigm,                                                 extracted units into the memory structure M through
the memory systems play an important role for the AI agent’s                                                   appropriate indexing and structural organization.
reasoning and action process. The basic operations of memory                                                 • Memory Retrieval: The mechanism of retrieving relevant
are defined in Definition II.2.                                                                                stored information Mrel ⊂ M in response to the query q.
                                                                                                             • Memory Evolution: The post-processing phase where
Definition II.2 (Basic Operations of Memory). The basic
operations of agent memory define the primitive actions that                                                   memory is refined, including internal self-evolving mech-
manipulate the memory M. These atomic operations include:                                                      anisms (e.g., consolidation, abstraction) and external self-
                               ′                                                                               exploration processes (e.g., new environmental feedback).
  • Write: Write(m, M) → M , adding a new memory unit
    m into the memory repository M.                                                                     This lifecycle ensures that memory remains current, relevant,
  • Read: Read(q, M) → Mq , retrieving relevant memory                                                and optimally structured for supporting the agent’s reasoning.
    units Mq ⊆ M based on query q.
                                 ′
  • Update: Update(m, M) → M , modifying existing mem-
                                                                                                                                     III. TAXONOMY OF AGENT M EMORY
    ory units based on new information.
                                   ′                                                                     In this section, we present a comprehensive taxonomy
  • Delete: Delete(m, M) → M , removing obsolete or
    irrelevant memory units from M.                                                                   for agent memory from different perspectives. Specifically,
                                                                                                      memory is categorized on the basis of multiple dimensions,
   These operations collectively enable the dynamic manage-                                           including temporal scope, functional roles and representational
ment and evolution of the agent’s memory system.                                                      structures. We then introduce the graph-based memory as a
   While the basic operations describe the atomic actions on                                          unified view of agent memory and conclude this section from
memory, understanding how these operations are orchestrated                                           an implementation perspective.
over time is crucial for the full functionality of agent memory
systems. Therefore, we further formalize the temporal dynamics
of memory through the concept of lifecycle, which characterizes                                       A. Long-term vs. Short-term Memory
how information flows through different processing stages.                                               One of the most straightforward categorization of memory
Definition II.3 (Lifecycle of Agent Memory). The Lifecycle                                            is the temporal dimension, i.e., information retention durations:
of Agent Memory describes the continuous, temporal flow of                                               • Short-term Memory: Maintains recent, immediately
information processing within the agent, defining how raw data                                              relevant information with rapid access and limited capacity.
is transformed into stored knowledge and how the knowledge                                                  This includes the current conversation context, active
evolves over time. The lifecycle L is defined as a cyclic process                                           reasoning traces, and transient state variables. Short-
consisting of four distinct stages:                                                                         term memory is volatile and typically discarded after the
                                                                                                                                                                                                                                                                                                                                                                                                        4



                                          Traditional Agent Memory                                                                                                                                                Graph-based Agent Memory
                 Memory Extraction                                                                                                          Memory Extraction
                                                                                                                                                                                                                              Session-1                                                                 Session-t                Session-t                                  Session-t
                                                              The user is having           The user’s family has a history of                                                                                                                                                 status                                                                            action        Prescription: PPI Trial
                                                                                                                                                                                                                                 Symptom: Stomachache                                                     Resolved                  Symptom: Heartburn
                                              Linear          stomachaches.                lactose intolerance
                                                                                                                                                                            Structured perceptual
                                            extraction                                                                                                                            extraction
                                                                                                                                                                                                                                                         Session-t
                                                                                                                                                                                                                                                                                                                                 Session-t                                Session-t
                                                                                                                                                                                                                                           reports                                                                                                             status
                                                                The agent suggested the user to start a food diary.                                                                                                                                           Symptom: Heartburn                                                    Symptom: Heartburn                      Active


                Interaction history                                             Extracted contents                                           Interaction history                                                                                                                                              Extracted contents
                Memory Storage                                                                                                              Memory Storage
                                                                                                                                                                                                                       Long-term memory                                                re
                                                                                                                                                                                           s                                                                       s                        po
                                                                                                                                                                                        ha                                                                      ha                             r   ts
                                                                                                       Implicit relations                                       Session-1                                                            Session-1
                                                                                                                                                                                                                                                                                            Session-t                                                                      Explicit node
                              Linear
                                                                                                                                                                                                      reports
                                                Dense vector                                                                                                       Lactose Intolerance
                                                                                                                                                                                                                                                                             reports
                                                                      Long-term memory                                                                                                                                                    Lactose Intolerance
                            memorization                                                                                                                             Family History                                                         Family History                                         Symptom: Heartburn                    Short-term memory     attributes and typed edges
                                                         Session-1
                                                         Session-2    Short-term memory
                                                                                                       Information                                                             Session-1                                                               Session-1                                                                     ac
                                                                                                     sparsely encoded                                                                                                                                                                                                                  t io
                                                                                                                                                                                                                                                                                                                        status
                                                           ……
                                                                                                                                                                                  Symptom: Stomachache                                                       Symptom: Stomachache
    Interaction history
                                                                                                                                                                                                                                                                                                                                         n
                                                         Session-t                                                                                     Structured                                                                                                                                                                        Session-t
                                                   Raw text                                                                                           memorization                      tu                 ac                                                  tu                  ac                                                                                         Information
                                                                                                                                                                                    st a
                                                                                                                                                                                          s
                                                                                                                                                                                                                t io                                             s
                                                                                                                                                                                                                                                              st a                     t io                          Session-t               Prescription:
                                                                                                                                                                            Session-1          Session-1
                                                                                                                                                                                                                 n
                                                                                                                                                                                                                                                 Session-t             Session-1
                                                                                                                                                                                                                                                                                            n
                                                                                                                                                                                                                                                                                                                       Active                  PPI Trial                 densely encoded
                                                                                                                                Interaction history                            Active            Prescription: Food Diary                          Resolved
                                          {User: family history of lactose intolerance, stomachache}                                                                                                                                                                     Prescription: Food Diary
                       Text/Vector 1
                                          { Agent: starting a food diary}


                  Memory Retrieval                                                                                                           Memory Retrieval
                                                                                                        Limited to                                                                                                                                                                                                                                                             Semantic and
                                                  Text/Vector         Similarity Type                 semantic search                                                                                                                         Path-1:                                                                                                                     relational search
                                                                                                                                Now
     Now                                    {User: stomachaches …        0.75      Short
                             Retrieval                                                                  Results are                                 Retrieval                                                    Reasoning                                                                                                                                                Results are
                                            {User: family history…       0.66      Long                                                                                                                            paths                                                                                                                                          connected subgraphs
                                                                                                    unrelated fragments                                                                                                               Path-2:
                                           {User: heartburn after…       0.66      Long
           User query                                                                                                                 User query                   Related subgraph
                                                     ……                  ……        ……                    Lack of                                                                                                                                                                                                                                                                Structured
                                                       Retrieved memory                             reasoning support                                                                                                                      Path-3:                                                                                                                       reasoning support

                  Memory Evolving                                                                                                            Memory Evolving
                                                                                                                                                                               Update nodes and edges within existing triples
                                                                                                     Updated memory
    1 Day Ago

                                       Text/Vector-t                    stomachaches                   stomachaches are         1 Day Ago
                                                                                                                                                                                                                                                                                                                                                                           Fine-grained
                                                                                                                                                    Structured graph
                                                                                                       much better now
                                                                                                                                                     memorization
                                                                                                                                                                                                                                                                                                                                                                  evolving operations:
       New memory                 Lookup                                                                                                                                                                                                               New triples                                                                                           Editing in nodes & edges level
                                                                                        Coarse-grained evolving                    New memory
                                                          Old
                                      Text/Vector-1      memory                      operations: entire chunks                                                                                                                                                                                                       Updated memory



                                                   Fig. 3: Comparison between traditional agent memory and graph-based agent memory

         immediate task completion, though significant elements                                                                                                 • Episodic Memory: Records the chronological sequence
         may be consolidated into long-term storage.                                                                                                              of past sessions. It transforms transient working memory
       • Long-term Memory: Stores persistent information across                                                                                                   into a persistent and queryable autobiographical history. For
         sessions, including accumulated knowledge, historical                                                                                                    instance, it notes that a customer requested a vegetarian
         interactions, learned patterns, and user preferences. Long-                                                                                              option or a canceled order. This allows the agent to recall
         term memory supports continuity across episodes, enables                                                                                                 “what happened and when,” providing temporal grounding.
         transfer learning, and provides the foundation for person-                                                                                             • Sentiment Memory: Captures the emotional tone or senti-
         alization and adaptive behavior over extended timescales.                                                                                                ment derived from interactions. By logging user feedback or
                                                                                                                                                                  frustration levels, the agent can adapt its empathy and style
B. Cognitive Structure of Memory                                                                                                                                  in future turns. This layer adds a qualitative dimension to
  We introduce the cognitive structure of the memory in [8]:                                                                                                      the raw interaction logs.
• Semantic Memory: Stores general, decontextualized world
  knowledge and factual information (e.g., “Paris is the capital
  of France”). Within the graph structure, this forms the stable C. Knowledge vs. Experience Memory
  ontology, providing common sense and domain-specific facts           To define agent memory concretely, we can draw a parallel
  that ground the agent’s reasoning.                                to the human cognitive system. Human memory is a structured
• Procedural Memory: Encodes skills, routines, and im- process involving the encoding, storage, and retrieval of
  mutable rules. It represents “how-to” knowledge, such as information, often categorized into different types. Similarly,
  standard operating procedures or game rules. In application, agent memory can be understood through two primary, com-
  this allows agents to execute complex tasks automatically plementary categories as shown in Figure 2:
  under standard conditions.                                        Knowledge Memory (Passive & Static): This represents the
• Associative Memory: Establishes latent links between              agent’s passive and static repository of objective, global, and
  different concepts or data points within the knowledge base. verifiable information. It functions as an internal reference
  By connecting related pieces of information (e.g., symptoms library or textbook, containing canonical facts, universal rules,
  to diagnoses, or products to categories), it facilitates creative established procedures, and general truths about the world.
  reasoning and analogy-making, acting as the connective This memory is typically pre-loaded, slowly updated, and
  tissue of the knowledge graph.                                    context-independent. Its purpose is to provide a stable, reliable
• Working Memory: Acts as the agent’s “mental scratchpad” foundation for reasoning and action. For instance, it stores the
  for immediate experience. It temporarily holds the current factual definition of concepts, the immutable rules of a game,
  conversation turn, intermediate reasoning steps, and transient or standard scientific principles. In applications, a shopping
  variables. While ephemeral, it is the entry point for all agent’s product database or a robot’s general affordance model
  experience memory, characterized by fast access and direct constitutes Knowledge Memory. Generally, this memory is
  influence on the immediate next action.                           passive, serving as a reliable, factual backbone for reasoning.
                                                                                                                                     5



Experience Memory (Proactive & Dynamic): This is the                   factual triples to general thematic clusters or subgraphs; ❸
agent’s personal logbook, actively recording its specific in-          Temporal and dynamic structuring, where time-aware edges
teractions, observations, and the outcomes of its actions. It          can capture event sequences, state transitions, and knowledge
includes user dialogue history, execution logs, trial-and-error        evolution; ❹ Efficient structured retrieval, enabling traversal,
trajectories, and feedback. For instance, it notes that a particular   subgraph extraction, and multi-hop relational queries beyond
user requested a vegetarian lasagna variant, that a trade based        mere semantic similarity.
on a mean-reversion strategy actually resulted in a loss, or              Notably, traditional memory forms can be viewed as degen-
that a standard grasping procedure failed on a wet mug. This           erate or simplified cases within the graph memory paradigm.
memory is dynamic, personalized, and forms the basis for               For instance, a linear buffer corresponds to a chain within
learning from practice and adapting to specific contexts.              a graph, and a vector memory can be interpreted as a fully-
                                                                       connected graph with similarity-weighted edges. Thus, graph-
D. Non-structural vs. Structural Memory                                based memory does not merely replace existing designs but
   Traditional agent memory systems commonly adopt simple              provides a unified and extensible framework.
storage paradigms, including:                                             In essence, graph-based agent memory elevates memory from
• Linear or buffer-based memory, such as fixed-length                  a passive, flat “log” to an active, structured “knowledge graph”
   token windows or conversation histories, which maintain             tailored to the agent’s lived experience. It not only records
   recent interactions but suffer from information loss and lack       “what happened” but, more importantly, models “how these
   relational context.                                                 things are connected.” This provides a powerful foundation
• Vector-based memory, which encodes experiences into                  for associative reasoning, modeling long-term dependencies,
   dense embeddings stored in vector databases, enabling               and achieving explainable agent behavior. Figure 3 summarizes
   semantic similarity search but struggling with structured           the key distinctions between traditional agent memory and
   reasoning and hierarchical relationships.                           graph-based agent memory. In summary, graph-based agent
• Key-value or log-based memory, which records events in               memory re-conceptualizes memory from a passive recording
   sequential logs or attribute-value pairs, supporting straight-      into an active, structured model of experience. By making
   forward lookup but offering limited capability for complex          relationships first-class citizens, it provides a powerful foun-
   querying or dynamic updates.                                        dation for the complex reasoning, long-term coherence, and
   A common thread among these traditional paradigms is                adaptive behavior required by sophisticated autonomous agents.
their treatment of memory as a sequential, flat, or implicitly         Graph-based memory architectures, such as knowledge graphs
structured store. While effective for certain patterns, they often     and hypergraphs, have demonstrated superior performance in
fall short in explicitly representing and efficiently reasoning        applications requiring multi-session coherence, personalized
over the complex web of relationships between pieces of                adaptation, complex task planning, and hallucination reduction.
knowledge, a capability critical for sophisticated planning,           The subsequent sections delve into the technical realization
causal understanding, and narrative coherence. More impor-             of such memory systems, covering construction, retrieval,
tantly, while these approaches enable basic recall and short-          updating, and domain-specific applications.
term context management, they exhibit notable limitations
in scenarios requiring hierarchical knowledge organization,
temporal tracking, and long-term adaptive learning. These
constraints become particularly evident in long-horizon tasks,         F. An Alternative View from Implementation
multi-session interactions, and domains where knowledge
                                                                  In this paper, we use the lifecycle to introduce the memory,
evolves dynamically.
                                                               however, we can also have an alternative view of the memory
                                                               from the implementation perspective, which can help readers
E. Graph-based Memory: A Unified and General Perspective to understand this paper as a researcher or engineer. Specifi-
   Graph-based agent memory emerges as a powerful general- cally, the framework begins with underlying structures, which
ization and enhancement of conventional memory frameworks. encompasses the foundational data representations including
The core idea of graph-based agent memory is modeling graph-based structures, embeddings, and temporal sequences
memory content as a dynamic, structured Memory Graph. In that form the basis of memory storage (Section V). The stored
this paradigm, memory units (e.g., events, entities, concepts, representations manifest as various memory contents, including
observations) are abstracted as nodes, and the semantic, conversational history, temporal records, and structured knowl-
temporal, causal, or logical relationships between them are edge bases. These contents are curated by memory processes
abstracted as edges. This explicit structural representation of extraction (Section IV) and evolution (Section VII), where
transforms memory from a flat list of entries or a hidden relevant information is filtered and refined based on context and
state vector into a rich, interconnected network of knowledge. usage patterns. Finally, the usage interface enables Retrieval
   By representing memory elements as nodes and their (Section VI) of relevant information and facilitates reasoning
relationships as edges, graph structures naturally support: tasks by accessing this curated memory. This implementation
❶ Explicit relationship modeling, allowing agents to reason view provides a systematic perspective from the implementation
over causal dependencies and semantic associations between on how language models maintain, process, and leverage
memory items; ❷ Hierarchical organization, from fine-grained memory to support the complex reasoning.
                                                                                                                                                            6



                                                                           LLM-Induce-Graph [19], Structural Memory [20], PersonaAgent [21], G-CoT [22],
                                               Textual Data
                                                                           HiAgent [23]
                            Extraction (§IV)   Sequential Data             Reflexion [24], Mem-α [25]

                                               Multimodal Data             MemoryVLA [26], Multi-Temporal [27], Optimus-1 [28]

                                               Knowledge Graph             MemLLM [29], AriGraph [30], Mem0 [31]

                                               Hierarchical Structure      DAMCS [32], G-Memory [33], ENGRAM [34], SGMem [35], Personalized Agents [36]

                            Storage (§V)       Temporal Graph              Zep [18], TReMu [37], MemoTime [38]

                                               Hypergraph Structure        HyperGraphRAG [39], HyperG [40]

                                               Hybrid Architectures        Optimus-1 [28], KG-Agent [41]

                                               Similarity-based            Multimodal Agent [42], Zep [18], Mem0 [31], G-Memory [33]




 Graph-based Agent Memory
                                               Rule-based                  MemInsight [43], FinMem [44], MyAgent [45], Neural Graph Memory [46], TReMu [37]

                                                                           Mem0 [31], Zep [18], SimGRAG [47], CAN [48], SGMem [35], H-MEM [49],
                                               Graph-based
                                                                           G-Memory [33], KG-Agent [41]
                                               Temporal-based              MemoTime [38], Mnemosyne [50], AssoMem [51], Zep [18], LiCoMemory [52]

                                                                           Personalized Agents [36], Memento [53], Mem-α [25], Memory-R1 [54], TGM [55],
                                               RL-based
                            Retrieval (§VI)                                MAQR [56], Reflective Memory [57]
                                                                           KG-HLM [58], GraphCogent [59], Omni Memory [60], Optimus-1 [28],
                                               Agent-based                 Cradle [61], DAMCS [32], MemGPT [62], CoALA [8], HiAgent [63], AriGraph [30],
                                                                           MAS-RL [64], Collabor Memory [65]
                                                                           Deep Research [66], Assistant Memory [67], RCR-Router [68], MemSearcher [69],
                                               Multi-round
                                                                           MemoTime [38], GITM [70], LEGOMem [71]

                                               Post-retrieval              SimGRAG [47], Mirix [72], MemGen [73]

                                               Hybrid-retreival            MEM1 [74], MemSearcher [69]

                                                                           Zep [18], Nemori [14], Mem-α [25], GraphRAG [75], RecallM [76], Agent KB [77],
                                               Internal Self-Evolving      Mem0 [31], FLEX [78], Reflexion [24], ToG [79], RRP [80], MemoryBank [81],
                                                                           RoG [82], Memory OS [83], MemGPT [62]
                            Evolution (§VII)
                                                                           MATRIX [84], Memory-R1 [54], Inside-Out [85], MemEvolve [86], Kimi K2.5 [87],
                                               External Self-Exploration
                                                                           ExpeL [88], Proactive Memory [89], AgentEvolver [90]

                                   Fig. 4: A Comprehensive Taxonomy of Graph-based Memory Management for LLM Agents.


  IV. M EMORY E XTRACTION : T RANSFORMING THE DATA                                    formal documentation, instructional texts, and other authorita-
                                                                                      tive corpora. In addition, a substantial portion of knowledge
   The process of memory extraction begins with the collection                        memory is implicitly acquired through pretraining on large-
and pre-processing of raw data. These raw inputs, which vary                          scale textual data, where factual and procedural information
widely in format and constitute the foundational material from                        becomes embedded in the model parameters. Information
which an agent’s internal memories are constructed. From this                         drawn from these sources is usually stable, context-independent,
perspective, memory extraction can be understood along two                            and broadly applicable. Consequently, knowledge memory
complementary dimensions: the source from which memory                                extraction focuses on distilling canonical facts, rules, and
is derived and the form in which the extracted memory is                              procedures into persistent representations that provide a reliable
ultimately encoded. Based on the definitions introduced in the                        foundation for reasoning across tasks and domains.
previous section, agent memory can be broadly categorized
into knowledge and experience memory, which differ primarily                             The underlying information shows up in many different
in their sources and roles within the system.                                         formats. These sources may appear as unstructured or semi-
   Experience memory is extracted from the agent’s own                                structured text such as documents, dialogue transcripts, and
interaction history and reflects the accumulation of situated,                        execution logs. Others may be non-textual, including images,
task-specific experience over time. Its primary sources in-                           sensory observations, or structured records generated during
clude multi-turn dialogues with users, action and observation                         interaction. This diversity in source modality means that raw
sequences produced during task execution, and explicit or                             information cannot be directly stored as memory. Instead, it
implicit feedback signals. Knowledge memory, in contrast,                             must be processed and abstracted in ways that reflect both
is extracted from sources that exist independently of the                             the characteristics of the source and the type of memory
agent’s personal experience and are intended to represent                             being constructed. As a result, different sources naturally
objective and generally valid information. Typical sources                            require different extraction strategies. The following outlines
include curated knowledge bases, domain-specific databases,                           the primary techniques used for different types of data sources.
                                                                                                                                                                                                                       7



                       Raw Data Sources                                                Specialized Extraction Techniques                                                 Functional Memory Types
                    Knowledge Memory Sources                                                     Extraction from Textual Sources
             Passive, Static, Objective, Context-independent                             (1)       Structured Information Extraction:
                                                                                               NER, relation extraction to form structured triples
                                                                                         (2)     Semantic Embedding Encoding:
                                                                                               Sentences-> Dense vector representations                               Semantic Memory           Procedural Memory
        Curated Knowledge Bases, Domain-specific Databases,                              (3)       Summarization:                                                 (General Knowledge & Fact      (Skills, Routines,
            Formal Documentation, Instructional Texts, …                                       LLMs to condense dialogues into concise memory fragments                 Information)           Immutable Rules …)
               Pretraining on Large-scale Textual Data
                                                                                          Extraction from Sequential Trajectories
          Raw Input Formats
                                                            Pre-
                                                                      (1) Event Segmentation &
  Unstructured        Semi-      Non-textual
                                                         processing         Timestamping
                                                                                                         (2) State Snapshotting            (3) Pattern Mining        Associative Memory          Working Memory
   Text Data       structured       Data                                   Discrete meaningful           Compact representations           Discover frequent            (Latent Links,        (Immediate Experience,
                   Text Data                                             events with precise time           at key moments              subsequences & routines        Connections …)             scratchpad…)

                    Experience Memory Sources                                                  Extraction from Multimodal Data
                 Proactive, Dynamic, Situated, Task-specific


                                                                                                            (2) Structured               (3) Joint Multimodal
                                                                      (1) Description Generation                                                                      Episodic Memory           Sentiment Memory
                                                                                                         Perceptual Extraction                Embedding
       Multi-turn Dialogues, Action & Observation Sequences,               Vision-language                 Object detectors,            CLIP for unified vector   (Chronological Sequences      (Emotional Tone,
               Explicit/Implicit Feedback Signals, …                     models for captioning          scene graphs generators         space representation          of Past Sessions)           Feedback, …)



Fig. 5: Overview of agent memory extraction. This figure illustrates a unified pipeline of agent memory construction from
various data resources. Raw inputs, originating from both experience and knowledge memory, are transformed into structured
and compact representations through specialized extraction techniques. These extracted units are then organized into distinct
functional memory types, enabling agents to support reasoning and downstream tasks.


      a) Extraction from Textual Sources: The extraction of (3) Joint multimodal embedding: Encoding data from different
memory from unstructured textual data, such as conversational modalities into a unified vector space using customized models,
logs or documents, focuses on identifying and structuring se- producing a joint embedding that serves as a compact memory
mantic information [19]. Key approaches include: (1) Structured representation of the multimodal experience [28].
information extraction: Using named entity recognition and             As shown in Figure 5, the raw data is transformed into
relation extraction models, or prompting large language models, structured and semantically enriched representations by the
to directly extract entities, attributes, and their relationships in extraction process. This transformation typically occurs across
the form of (entity-relation-entity) triples [20], [21]. (2) Seman- three levels of abstraction: from the original raw data flows,
tic embedding encoding: Encoding sentences or paragraphs into to intermediary extracted entities and relationships, and finally
dense vector representations using models such as Sentence- into organized functional memory types that serve specific
BERT, transforming semantic content into embeddings suitable cognitive and operational purposes within the agent, which is
for similarity-based retrieval [22]. (3) Summarization: Applying introduced in Section III.
extractive or abstractive summarization models, including large
language models, to condense lengthy texts or dialogue histories
                                                                           V. M EMORY S TORAGE : O RGANIZING THE M IND
into concise and informative memory fragments [23].
      b) Extraction from Sequential Trajectories: For time-            The extraction stage described above produces a set of
series interaction data, such as action-observation sequences, semantically enriched artifacts, including identified entities
extraction aims to capture temporal structure: (1) Event segmen- and relations, dense semantic embeddings, concise summaries,
tation and timestamping: Segmenting continuous trajectories segmented events with timestamps, and multimodal captions,
into discrete, meaningful events or episodes and annotating each which together form the operative substrate for downstream
with precise timestamps [24]. (2) Dynamic State Snapshots: memory architectures. A central challenge in building agent
Beyond static snapshots, this method captures the evolution memories is therefore to transform these heterogeneous ex-
of critical states. It involves periodically capturing and storing tracted artifacts into storage formats that preserve relevant
compact representations of the agent’s or environment’s state at semantics while supporting efficient retrieval and reliable
key moments, such as embeddings or feature vectors [25]. (3) updates. Unlike static knowledge bases, agent memories must
Pattern mining: Applying offline sequence mining or clustering also accommodate dynamics, personalization and experience
algorithms to discover frequently occurring successive sub- grounding, all of which shape how extracted information should
sequences or strategic routines, which are then abstracted into be encoded and maintained.
procedural memory templates.                                           Choosing a particular graph based memory structure amounts
      c) Extraction from Multimodal Data: For sensory data to explicit trade offs between competing design goals. Precision
such as vision or audio, extraction bridges the gap between and explicit multiple hop reasoning favor relational graphs;
raw signals and semantic meaning: (1) Description generation: compression and conceptual abstraction favor hierarchical
Using vision-language models [26] or audio captioning mod- or treelike summaries; temporal fidelity motivates temporal
els [27] to generate textual descriptions of visual scenes or knowledge graphs and time indexed episodes; and cross modal
auditory events, which are subsequently processed as text. generalization or fuzzy recall often favors vector stores or
(2) Interactive content: This process focuses on detecting hybrid systems. With these trade offs in mind, this section
objects or distilling information between an agent’s actions focuses first on Knowledge Graphs as a canonical relational
and environmental responses such as raw pixels or signals. substrate, explaining how triples are produced, integrated and
                                                                                                                                      8



maintained, and then surveys hierarchical, temporal, hyper-          This inherent property enables efficient top-down navigation
graph and hybrid architectures that address complementary            for querying abstract themes and bottom-up summarization
points along this design spectrum. Figure 6 summarizes the           for maintaining coherence across vast memory stores. Systems
construction paradigms discussed below.                              like MemTree adopt this approach by dynamically routing new
                                                                     information through the hierarchy, clustering similar content
A. Knowledge Graph Structure                                         under existing nodes while creating new branches for novel
                                                                     information, with all ancestor nodes recursively updating their
   The Knowledge Graph (KG) stands as a structured memory
                                                                     semantic summaries to reflect the integrated knowledge.
paradigm, explicitly designed to store and reason over factual
                                                                        The construction of hierarchical memory mainly relies
knowledge [29]. It represents information as a network of
                                                                     on two processes: semantic clustering for organization and
interconnected triples, where each triple takes the form (head
                                                                     recursive summarization for abstraction [34]. To maintain
entity, relation, tail entity). This relational structuring makes it
                                                                     the hierarchy’s value as a compressed knowledge schema, each
a powerful substrate for specific types of agent memory.
                                                                     parent node dynamically synthesizes a concise linguistic sum-
      a) KG Modeling: Constructing a KG for an agent involves
                                                                     mary of all information contained within its subtree. Beyond
the continuous extraction and integration of structured triples
                                                                     static factual knowledge mentioned above, such structure also
from unstructured interaction streams. The primary method
                                                                     manifests as Session or Sequence Memory. Here, individual
relies on Large Language Models serving as a powerful, open-
                                                                     sentences or dialogue turns, are linked primarily by their
vocabulary parsing engine. For instance, in the AriGraph world
                                                                     temporal order or conversational flow within a defined session.
model [30], the LLM parses each textual observation from
                                                                     This creates a timeline or narrative chain that is essential
the environment to identify relevant objects and extract their
                                                                     for modeling dialogue coherence and user intent evolution
relationships in the form of triplets. Similarly, systems like
                                                                     over a single interaction episode. The SGMEM [35] system
Mem0 [31] employ an LLM in their extraction phase to
                                                                     proposes a sentence-level tree for long-term conversational
convert conversation messages into entity-relation triplets. This
                                                                     agents, using the sequential and referential links between
approach outperforms traditional Named Entity Recognition
                                                                     utterances to construct a coherent interaction.
(NER) and relation classification pipelines, as LLMs can
generalize to novel fine-grained entity types and exploit implicit
relations based on contextual understanding.                         C. Temporal Graph Structure
   The extracted triples then enter an update phase, where they          Real-world interactions are inherently dynamic, where facts
are integrated into the persistent graph store. This phase is hold validity only within specific time windows. Temporal
non-trivial, involving operations such as conflict detection (e.g., Knowledge Graphs (TKGs) extend standard triples to quadru-
handling contradictory facts), relationship pruning, and schema ples (s, r, o, t), but simple timestamping is often insufficient
evolution. Mem0 explicitly models this through a dedicated for complex agentic workflows. Recent architectures have
update mechanism that evaluates new memories against similar introduced more granular temporal modeling to handle validity,
existing ones. This two-step process, LLM-based extraction ambiguity, and reasoning monotonicity.
followed by reasoned integration, forms the core pipeline for
                                                                           a) Bi-Temporal Modeling: A critical distinction in agent
building a dynamic, experience-driven knowledge graph from
                                                                     memory is between the time an event occurs (valid time)
an agent’s raw perceptions.
                                                                     and the time it is recorded (transaction time). Graphiti [18]
      b) Corresponding Memory Types: The triple-based struc-
                                                                     implements a bi-temporal model tracking two distinct timelines.
ture of a KG makes it exceptionally suitable for implementing
                                                                     This allows the system to manage evolving conversations where
long-term static memory types. This includes general world
                                                                     a fact introduced at t1 might retrospectively describe an event
facts (e.g., (Paris, Capital Of, France)) and immutable domain-
                                                                     at t2 . By explicitly tracking creation (t′created ) and expiration
specific concepts. The explicit relational format allows for effi-
                                                                     (t′expired ) timestamps alongside validity intervals, the system
cient storage and complex, multi-hop queries that are difficult
                                                                     can resolve contradictions through temporal invalidation rather
for vector-based retrievers. Furthermore, by augmenting triples
                                                                     than overwrites, maintaining a faithful history of state changes.
with temporal metadata or linking them to episodic events,
                                                                           b) Disentangling Mention and Event Time: In multi-
where episodic vertices are connected to triples extracted from
                                                                     session dialogues, relative temporal expressions (e.g., “last
the same observation, KGs can also support episodic memory.
                                                                     Friday”) often create ambiguity. TReMu [37] employs a time-
                                                                     aware memorization mechanism to decouple the mention time
B. Hierarchical Memory Structure                                     (session timestamp) from the inferred event time. TReMu
   The hierarchical structure is the most common and intuitive structures memory as “timeline summaries,” where events are
paradigm for organizing knowledge within agent memory grouped and indexed by their inferred absolute timesteps. This
systems [32], [33], [36]. By arranging information into multi- structure supports neuro-symbolic reasoning, where the agent
level trees, it provides a rationale hierarchy to compress generates Python code to perform precise arithmetic on dates
extensive experiences into manageable schema. The essence before retrieving the corresponding timeline nodes.
of a tree is a directed acyclic graph (DAG) that explicitly                c) Hierarchical Temporal Constraints: MemoTime [38]
models parent-child and containment relationships, allowing it is developed to prevent logical hallucinations in reasoning
to represent concepts ranging from broad categories to specific chains (e.g., retrieving an effect that occurred before its cause).
instances and from high-level goals to granular execution steps. This framework organizes the TKG reasoning process into a
                                                                                                                                                                                                                                                                         9



                                         Graph Structure                                                     Memory Role                          Storage Content                               Advantages                                Limitations
   Knowledge Graph
                                                                                                             Seman7c Memory               Stores objec+ve facts & conceptual     ☑ Explicit rela+ons, high interpretability   ☒ High construc+on& maintenance cost
            En7ty   En#ty: Stomachache, Ac#ve                                                                                             rela+ons. Structure is a network of    ☑ Supports complex reasoning                 ☒ Struggle with fuzzy or unstructured
          Extrac7on A2ribu#on: Symptom                                                                   Stores factual knowledge.        (head en+ty, rela+on, tail en+ty)      ☑ Easy to integrate external structured      informa+on
                      Rela#on: Status                                                                                                     triples.                               knowledge                                    ☒ Poor at dynamic updates: make real-
                                                                    Triples          Knowledge Graph
                                                                                                                                                                                                                              +me updates complex and costly
    Temporal Graph
                       t1     t2    t3                                                                      Episodic Memory               A set of nodes and hyperedges,         ☑ Na+ve representa+on of n-ary rela+ons:     ☒ Many graph algorithms are costly to
                                                                                                            Short-Term Memory             where each hyperedge connects an       naturally model an event involving mul+ple   run on hypergraph structures
           Event                                       Event snapshots                                                                    arbitrary subset of nodes (≥2).        par+cipants                                  ☒ Requires careful design to map
         Extrac7on
                                                                                                         Captures 7me sequences           Represented as an incidence matrix                                                  problems to hyperedges
                                                                                     Temporal Graph                                                                              ☑ Eﬃcient associa+ve retrieval
                Events with 7mestamps                    Time slicing                                    and transient events.            or bipar+te graph.

      Hypergraph
                                                                                                             Associa7ve Memory            Nodes represent events, tasks, or      ☑ Intui+ve layout                            ☒ Rigid structure struggles to represent
                                   :{         }
                                                                                                                                          concepts; directed edges denote        ☑ Eﬃcient top-down retrieval strategy        overlapped or non-hierarchical
          Iden7fy N-ary            :{         }     Hyperedge                                            Connects mul7ple en77es
                                                                                                                                          parent-child rela+onships. Organizes   ☑ Clear abstrac+on levels: summarizes        rela+onships
         Rela7on Groups            :{     }        Construc7on                                           implicitly.
                                                                                         Hypergraph                                       speciﬁc events, task steps, or         informa+on at diﬀerent granulari+es          ☒ Parent-node vulnerability
                     high-order dependencies                       Hyperedges                                                             knowledge into hierarchies.

   Hierarchical Graph
                                                                          Parent-Child                      Procedural Memory,            Nodes represent events or
                                                                          Rela/onships
                                                                                                            Episodic Memory
                                                                                                                                                                                 ☑ Explicit temporal modeling: +mestamps      ☒ Storage and computa+onal overhead
                                                                                                                                          en+ty states at speciﬁc +mes;
          Compress                       Cluster                   Summarize                                                                                                     ☑ Tracks evolu+on: model how en++es,         ☒ Temporal granularity dilemma: hard
                                                                                                                                          oVen incorporates +mestamps
                                                                                                         Encodes rou7nes and                                                     rela+onships, or knowledge states change     to retrieve the right +me for events
                                                                                                                                          as node/edge aXributes or uses
               Manageable contents
                                                  Hierarchical contents                                  organizes event snapshots.                                              over +me                                     ☒ Complex query processing over +me
                                                                                    Hierarchical Graph                                    +me-sliced graph snapshots.

     Hybrid Graph
                                                                                                            Seman7c Memory                Integrates mul+ple above graph
                                              Knowledge                                                                                                                          ☑ Integrate mul+-source, heterogeneous       ☒ Complex system design, requiring
                      Facts                                                                                 Episodic Memory
                                              component                                                                                   structures (e.g., knowledge triples,   memories                                     substan+al training data
          Router                                                                                            Working Memory
                                                                                                                                          dialogue sequences) via techniques     ☑ Leverage strong representa+onal            ☒ Poten+al noise in informa+on fusion
                      Working                  Working                                                   Integrates facts, experiences,   like GNNs for joint representa+on &    power of GNNs
                     experience               component                              Hybrid Graph
                                                                                                         and ac1ve processing.            reasoning


Fig. 6: A Comprehensive Taxonomy of Graph Construction Paradigms for Agent Memory Systems: Methodologies, Corresponding
Memory Functions, and Comparative Analysis of Advantages and Limitations.


hierarchical “Tree of Time.” Unlike flat retrieval, this structure                                                                                 inquiry, effectively simulating a human-like focus on relevant
enforces temporal monotonicity, ensuring that any retrieved                                                                                        data substructures.
reasoning path e1 → e2 → e3 strictly adheres to chronological
constraints (t1 ≤ t2 ≤ t3 ). This operator-aware design allows                                                                                     E. Hybrid Graph Architectures
the agent to prune semantically relevant but chronologically
                                                                                                                                                      Graph structures excel at precision and multi-hop reasoning
invalid evidence effectively.
                                                                                                                                                   but may lack the breadth of vector retrieval or the flexibility of
                                                                                                                                                   unstructured buffers. Hybrid architectures fuse graphs with
D. Hypergraph Structure                                                                                                                            other data structures to balance these trade-offs, typically
                                                                                                                                                   separating “static knowledge” from “dynamic experience.”
   While binary graphs (connecting two entities) are efficient,                                                                                          a) Knowledge-Experience Decoupling: A leading design
they suffer from information loss when representing complex,                                                                                       pattern is to separate world rules from agent trajectories.
multi-entity interactions (e.g., three drugs acting together to                                                                                    Optimus-1 [28] proposed a Hybrid Multimodal Memory for
cause a side effect). Hypergraphs address this by employing                                                                                        agent. It combines a Hierarchical Directed Knowledge Graph
hyperedges that can connect an arbitrary number of nodes,                                                                                          (HDKG) to store static, structured game mechanics (modeled as
preserving the integrity of n-ary relations.                                                                                                       directed acyclic graphs for crafting recipes) with an Abstracted
      a) Information Integrity in N-ary Relations: The primary                                                                                     Multimodal Experience Pool (AMEP). The AMEP functions
motivation for hypergraph memory is to prevent the sparsity                                                                                        as a dynamic vector store that retains multimodal success
and semantic fragmentation caused by decomposing com-                                                                                              and failure trajectories. This separation allows the agent to
plex facts into binary edges. HyperGraphRAG [39] demon-                                                                                            ground planning in rigid graph-based knowledge while refining
strates that hypergraph-structured representation is information-                                                                                  execution by retrieval-augmented experience from the pool.
theoretically more comprehensive than binary equivalents. By                                                                                             b) External Graph with Internal Working Memory:
treating a natural language knowledge fragment and all its asso-                                                                                   Another hybrid approach focuses on the interaction between an
ciated entities as a single hyperedge ei = (etext
                                             i    , {v1 , . . . , vn }),                                                                           external massive graph and an internal lightweight state. The
the system enables “dual-retrieval”, simultaneously retrieving                                                                                     KG-Agent framework [41] integrates an external knowledge
relevant entities and the hyperedges that bind them, thereby                                                                                       graph with an internal Knowledge Memory. Unlike purely graph-
accessing complete facts for generation.                                                                                                           based agents, KG-Agent maintains a structured scratchpad that
      b) Structural Dependency in Tabular Data: Hypergraphs                                                                                        iteratively updates the reasoning history, tool definitions, and
are particularly effective for structured data where relation-                                                                                     intermediate observations retrieved from the external KG. This
ships are inherently group-wise. HyperG [40] models tabular                                                                                        hybrid design enables the agent to navigate large-scale static
knowledge using hypergraphs. It constructs distinct hyperedges                                                                                     graphs using a flexible, evolving internal context, bridging
for rows, columns, and the entire table to capture high-order                                                                                      symbolic storage with neural reasoning.
dependencies, such as semantic consistency within columns                                                                                             In summary, different types of memory often require different
and the hierarchical relationship between captions and cells. To                                                                                   approaches to graph construction, and there is no single
enhance reasoning, HyperG utilizes a Prompt-Attentive Hyper-                                                                                       paradigm that fits all scenarios. Knowledge memory, which
graph Learning (PHL) module, which dynamically propagates                                                                                          is generally stable, structured, and context-independent, is
attention between nodes and hyperedges based on the specific                                                                                       well suited to graphs that emphasize relational or containment
                                                                                                                                   10




Fig. 7: Retrieval pipeline architecture integrating base operators and enhancement strategies. Left: User queries go through
preprocessing before retrieval. Top: Six base retrieval operators are organized into three paradigms: semantic, structured, and
policy-based retrieval, which interact with knowledge and experience memory types. Bottom: Retrieval enhancement strategies
layer on top of these operators: multi-round retrieval, post-retrieval, and hybrid-source retrieval coordinates internal memory
with external resources. Right: Final pruning and selection produce ranked retrieved evidence for downstream reasoning with
these operators and strategies.


structure, such as knowledge graphs. These graphs can capture memory. For knowledge memory, correctness and consistency
explicit relationships between factual entities, and enable are primary concerns.
efficient reasoning over globally valid information. In contrast,      Policy-based retrieval includes RL and agentic retrieval
experience memory is dynamic, personalized, and context- operators that treat retrieval as sequential decision-making.
specific, and often benefits from graphs that emphasize temporal The system selects which memory type to query and chooses
sequences, interaction trajectories, or user–action networks. which operators to apply. It allocates computational budgets
Such graphs capture the evolving patterns of agent interactions and decides when to stop retrieval. Policy-based retrieval is
or preferences over time. The choice of graph type is therefore especially important for experience memory, which is dynamic,
closely linked to the properties of the underlying memory. personalized, and time-sensitive in nature.
Factors such as sparsity, temporal dynamics, modality diversity,       In practice, systems commonly combine these basic oper-
and the need for incremental updates all influence how nodes ators, e.g., semantic anchoring → structured expansion →
and edges are defined. Moreover, hybrid or multi-layered policy-controlled stopping and pruning.
graphs are sometimes necessary to integrate both knowledge
and experience memory. Overall, constructing graphs requires A. Categorization of Retrieval Techniques
careful consideration of the characteristic of memory types.
                                                                       The retrieval process can be broken down into three basic
                                                                    operations: (i) query preprocessing, (ii) candidate retrieval, and
      VI. M EMORY R ETRIEVAL : R ECALLING THE PAST                  (iii) pruning. They are usually executed as a simple pipeline
                                                                    that extracts a small set of relevant evidence from the memory
   These construction choices directly shape the memory usage. graph. In this section, we introduce a set of base retrieval
Once memory structures are fixed, the system must decide operators that can be flexibly composed to implement the latter
how to access them to support downstream reasoning. This two operations. Together with preprocessing, these operators
motivates the retrieval stage, the next stage of the storage form an end-to-end retrieval pipeline. Beyond these operators,
pipeline. The retrieval stage manipulates graph memory by we also describe retrieval enhancement strategies, which are
defining executable operators. Base retrieval operators can be auxiliary practices layered on top of the base operators to
organized into three paradigms. These paradigms interact with improve retrieval quality.
the two memory roles: knowledge and experience.                        1) Similarity-based Operator: Similarity-based retrieval is
   Semantic retrieval including similarity-based operators a coarse retrieval operator to encode a user query into a vector
operates over extracted text or multimodal chunks and their and then retrieves the top-k most similar memory entries in
embeddings. It supports fuzzy matching and basic concept the embedding space [42].
alignment. It is often used as an candidate generator for              For knowledge memory, similarity-based operator primarily
knowledge and experience memory.                                    supports exact abstract concept or entity recall. For experience
   Structured retrieval includes rule-based operators, temporal memory, the operator functions as specific memory unit recall,
operators and graph-based operators. These operators execute e.g., episodes, summaries, or agent states which match the
explicit constraints over structured artifacts: knowledge graphs, current query. In practice, systems often combine similarity
hierarchies, temporal graphs, and hypergraphs. This enables retrieval with experience memory and knowledge memory [31].
verifiable and interpretable evidence selection: each retrieval For experience memory, systems use summary graphs where
decision is traceable through the underlying graph structure or the retriever first matches high-level summaries and then drills
rule set. Structured retrieval is particularly central to knowledge down to supporting raw corpus chunks. For knowledge memory,
                                                                                                                                   11



systems use knowledge graphs where retrieved entities or triples primarily serve as a filtering rule rather than as a core retrieval
serve as anchors for subsequent graph expansion.                     mechanism. For experience memory, which records interactions
    In simpler applications, direct similarity search can be and events whose relevance shifts with time, temporal operators
effective [18]. It can also play a supporting role. For instance, it become primary. A user’s interests evolve, recent tool failures
can use query-query [33] similarity to filter unrelated memories. matter more than old ones, and the system must distinguish
However, this approach has clear limitations:                        between what worked last week versus last year. Temporal
• Similarity does not guarantee relevance. Lexically or              operators therefore rank episodes by how recently they occurred,
   semantically similar text may not match the specific memory downweight outdated preferences as time passes, and retrieve
   needed for a task.                                                chains of events that form coherent narratives rather than
• Poor multi-hop reasoning. Answers to complex queries               isolated records from different time periods.
   often depend on entities not in the original query. Pure             In practice, Zep [18] maintains explicit time windows for
   similarity matching cannot bridge this gap.                       each fact, marking when it becomes valid and when it expires.
• Temporal awareness is often missing. Memory retrieval in           This enables the system to determine whether a fact still applies
   dynamic contexts requires understanding time and situational at query time. LiCoMemory [52] applies a decay function
   relevance, not just semantic proximity.                           during ranking that reduces the weight of older facts while
• Scalability introduces noise. As memory grows, the number          preserving highly relevant information. Systems also parse the
   of semantically similar segments increases. This leads to user’s query to infer the intended time range, such as extracting
   redundant or irrelevant retrievals, which degrade precision. ”last month” from ”What did I discuss last month?”, then limit
These challenges motivate more sophisticated retrieval beyond retrieval to that window [51]. These approaches improve recall
similarity search. Practical systems should leverage structured for questions that inherently depend on timing.
retrieval that align with the organization of memory. Moreover,         4) Graph-based Operator: Graph-based retrieval operator
retrieval should be policy-driven: an agent selects and composes traverses explicit relational links in experience or knowledge
operators conditioned on the underlying memory type.                 graph memories. It uses query-conditioned traversal to expand
    2) Rule-based Operator: Rule-based operator in graph from anchor nodes into a task-relevant subgraph in the same
memory uses symbolic rules, and executable filters to decide graph or another graph.
relevant memories rather than purely semantic similarity.               For knowledge memory, a graph makes reasoning support
    For knowledge memory, rule-based operator serves two roles. explicit by encoding facts as linked units. Retrieval can
It can act as a first-stage selector that preprocesses candidates enforce structured relational constraints and return justificatory
for downstream retrieval, or as a post-retrieval validator that structures such as short paths or induced subgraphs. It enables
prunes retrieved memory by enforcing hard constraints. For compositional queries that join multiple facts across the
experience memory, rule-based retrieval primarily supports tem- graph [41]. For experience memory, a graph supports reasoning
poral scoping over dynamic episodes such as dialogue histories by preserving the connectivity of episodes. It lets the agent
and execution trajectories, since experiences are noisy and reconstruct coherent state–action–reward chains and attribute
continually evolving [45]. In practice, for knowledge memory, rewards to specific conditions. It retrieves adjacent follow-up
rule-based operators can restrict candidates to compatible entity actions that are central to proactive adaptation [35].
or relation types, prioritize high-confidence triples, and exclude      In practice, knowledge and experience memory share a
triples flagged as conflicting by predefined rules. For experience common working scenario: first, identify key entities as anchors;
memory, they leverage common rules such as time-window second, expand candidates via neighborhood traversal, e.g.,
filters and task-phase constraints like execution [43].              within n hops; third, score and prune nodes or paths to obtain
    A common variant uses hand-crafted associative heuristics compact evidence. In knowledge memory, anchors are typically
inspired by Hebbian-style updates [46]: memories that are entities or concepts, and traversal is often relation-constrained
frequently co-retrieved may have their links strengthened, over a knowledge graph to support logic-like retrieval. In
and recently written or repeatedly referenced items can be experience memory, anchors are commonly situation descriptors
up-weighted over time. Such lightweight update rules can extracted from dialogue chunks and execution logs, such as
improve coherence by retrieving bundles of mutually associated tool outputs, or environment states, and traversal expands along
memories rather than isolated items [44].                            event and temporal links to recover episodic context [47].
    Rule-based retrieval also frequently applies deterministic            a) Intra-layer Traversal: For instance, Mem0 [31] fol-
symbolic filtering to satisfy explicit query constraints. In lows an entity-centric approach that expands relations around
structured backends, e.g., SQL databases, these constraints identified entities. Zep [18] augments retrieval with breadth-
can be compiled into executable queries or programs, e.g., first neighborhood expansion to collect candidate nodes or
SQL or Python code that queries and joins tables, improving edges within a bounded hop radius, which can then be re-
precision and making the retrieval pipeline auditable [37].          ranked by relevance. H-MEM [49] uses index-based routing on
    3) Temporal-Based Operator: Temporal-based operator is a hierarchical memory tree to retrieve relevant content layer by
essential for handling queries that depend on when events layer. Some approaches further employ GNN-based models to
occurred, tracking facts that change over time, and preserving obtain cross-layer representations for retrieval and scoring [48].
the sequence of interactions in conversations [38], [50].                 b) Inter-layer Traversal: In hierarchical graph memories,
    For knowledge memory, general truths remain valid re- traversal also operates across abstraction levels via inter-layer
gardless of when they were learned, so temporal operators edges, e.g., edges between summary nodes and dialogue chunks,
                                                                                                                                     12



enabling bottom-up abstraction. G-Memory [33] performs bi-            use [65]. This enables retrieval to extend beyond selecting from
directional traversal that synthesizes generalized strategies         a fixed knowledge base.
from an insight graph with detailed logs from an interaction             For knowledge memory, the agent traverses the knowledge
graph. LiCoMemory [52] uses explicit hyperlinks to traverse           graph to gather supporting facts via self-planning [59]. Graph
from abstract summaries to precise dialogue chunks containing         traversal allows the agent to discover chains of reasoning
supporting evidence. Trainable graph memory [55] aggregates           within the structured memory. When internal graph coverage is
cross-layer path strengths across its query, transition path, and     incomplete, the agent can leverage internal knowledge to justify
meta-cognition layers to derive relevance scores for retrieval.       information correctness. For experience memory, the agent
   5) Reinforcement Learning-based Operator: Reinforcement            does not traverse a graph but instead traces chains of actions
learning (RL) is increasingly used as a training operator to          across episodes to recover episodic context [8], [63]. Rather
learn adaptive retrieval policies by optimizing downstream task       than navigating structured relationships, the agent reconstructs
rewards defined by the underlying memories.                           events from timestamped logs to make decisions [47].
   The two memory types serve different purposes: knowledge              The action space includes selecting the corresponding store
memory mainly provides stable grounding and constraint for            and index and choosing between a knowledge-graph index
this operator, whereas experience memory supports context-            for rules or facts and a temporal or hypergraph index for
sensitive adaptation. Context-sensitive adaptation means adapt-       past episodes [61]. The agent navigates the selected memory
ing retrieval action to the agent’s current context, such as          structure by picking the next node or edge to visit or moving
the current task state, by recalling and ranking previously           across abstraction layers. The agent maintains a bounded
observed state-action-reward episodes that match the current          working memory that records the current question, the partial
state. They share the same purpose: to retrieve evidence that is      plan, which memory source each piece of evidence comes
consistently helpful while down-weighting evidence candidates         from, previously visited nodes, and the evidence collected so
that are semantically similar yet systematically misleading [25].     far. This enables closed-loop navigation decisions [28], [60].
This improves robustness beyond fixed similarity heuristics.             Beyond pre-defined action spaces, the agent can write
In practice, RL-based retrieval operator can be applied to any        API calls, e.g., SQL queries or search requests, to retrieve
structured memory systems whenever retrieval actions are well-        information on-demand actively. This aligns retrieval decisions
defined, a reward signal reflecting retrieval utility is available,   with the agent’s planning process [32], [62]. In complex
and the policy can be trained to balance performance gains            systems, responsibilities can be split across multiple agents,
against retrieval cost [56].                                          e.g., candidate proposal vs. ranking, to improve robustness.
   A common instantiation augments embedding-based candi-
date generation with a learned action-value function Q(s, a),
where the state s summarizes the current query and optionally         B. Retrieval Enhancement Strategies
the agent state. The action a corresponds to a retrieval decision        Beyond base retrieval operators, recent graph memory sys-
such as selecting memory items, choosing a graph-navigation           tems increasingly emphasize retrieval enhancement strategies.
step, or issuing a tool call [36], [53]                               These methods do not define a new operator by themselves.
   Beyond single-step selection, some works formulate retrieval       Instead, they improve retrieval by adding extra steps around a
as a sequential decision process and train a dedicated memory         base operator rather than one-shot look up. These strategies also
agent with policy optimization, e.g., PPO/GRPO [55]. In a             help in both the two memory roles discussed earlier. Knowledge
typical pipeline, the memory agent decides what to retrieve and       memory requires enhancement strategies that prioritize relia-
in some designs also what to write into memory. It then passes        bility and conflict handling, since stable facts and rules must
the retrieved memory Mret to a possibly frozen answer agent to        remain consistent across retrievals. Experience memory requires
produce the final response. Rewards are computed from task-           enhancement strategies that prioritize temporal coherence,
specific answer quality metrics, e.g., EM/F1 for QA, and used         personalization, and iterative evidence gathering, since it
to update the retrieval policy to maximize performance [54].          captures what actually happened to the agent and user.
   Since end-to-end online RL over LLMs can be expensive, an             In this survey, we group them into three classes: i) multi-
alternative is RL-free policy learning via retrospective labeling.    round retrieval, which increases search depth and coverage
In such schemes, an expert LLM evaluates which retrieved              via repeated retrieval; ii) post-retrieval, which makes the query
memories are genuinely useful, producing supervision signals to       clearer by first generating an intermediate representation, e.g.,
train a lightweight retriever, e.g., an MLP ranker. Another way       topic or intent description and then retrieving; and iii) hybrid-
is to use lightweight heuristic scorers to guide selection when       source retrieval, which improves answer completeness by
the candidate set is large [54], [64]. This offers a pragmatic        retrieving from both internal memory and external sources and
trade-off between adaptivity and training cost when large-scale       then combining the results.
online RL is impractical [57].                                           1) Multi-round Retrieval: Multi-round retrieval treats mem-
   6) Agent-based Operator: Agent-based operator treats re-           ory access as an iterative process rather than a single-pass query
trieval as an open planning-feedback loop where the agent can         over the memory [66]. Each round generates the next retrieval
step beyond the boundaries of internal memory graphs [30],            query conditioned on the original query and previously retrieved
[58]. The core distinction from RL-based approaches lies in the       memory, retrieves additional memories, and then aggregates and
ability to call external tools and APIs to supplement internal        evaluates whether the accumulated evidence is sufficient [68],
memory, then store verified results back into memory for future       [69]. If sufficient, it terminates; otherwise, it triggers another
                                                                                                                                 13



round. More broadly, multi-round retrieval can be implemented memory versus external retrieval and how to merge evidence
with policies that decide whether to re-query, how to refine or resolve conflicts across sources.
queries, and when to stop. This loop makes retrieval explicitly       Hybrid-source retrieval naturally supports knowledge mem-
feedback-driven rather than static [66], [67].                     ory and experience memory. External sources excel at providing
   Moreover, some systems decompose a complex query into information that changes frequently or extends beyond what
sub-queries [38] and perform retrieval at the sub-query level, the system has seen, which is closer to knowledge memory.
optionally rewriting each sub-query to make the queries more Internal experience mainly provides personal and local details,
expressive. This fine-grained decomposition can reduce seman- such as users’ previous purchase history or which tools failed
tic drift of query and enable targeted evidence gathering [15]. in past attempts. When the two disagree, the merge rule should
   For knowledge memory, extra rounds are often used to depend on what is being retrieved. If the system retrieves a
collect supporting facts or rules and to verify consistency across fact, it should prioritize evidence that can be verified through
retrieved items. For experience memory, extra rounds are often multiple independent sources and traced back to authoritative
used to reduce missing context, such as recent user requests, origins, since outdated or unreliable external data is worse than
recent failures, or the latest environment changes. In practice, trusted internal knowledge memory. If the system retrieves
this also changes the stopping rule: knowledge-oriented loops personal experience, it should prioritize internal records that
stop when evidence is consistent and well supported, while match both the correct user and the correct time period, since
experience-oriented loops stop when enough recent and relevant external data cannot capture this individual [74].
episodes have been gathered [70], [71].
   2) Post-retrieval: While most memory-augmented systems              VII. M EMORY E VOLUTION : L EARNING OVER T IME
retrieve memories before generation, post-retrieval follows a
generate-then-retrieve pattern. The system first produces an          As agent systems interact with dynamic environments over
intermediate representation, e.g., a topic, intent descriptor, extended periods, their memory must not remain static but
hypothesized entities and relations, or a draft structure, and evolve to incorporate new information, resolve inconsistencies,
then retrieves based on that intermediate representation. For and adapt to changing contexts. Graph-based memory structures
example, a model may generate a high-level topic prior to are particularly well-suited for evolution due to their explicit
answering and use it to retrieve memories, or transform a query modeling of relational connections, temporal dependencies, and
into an imagined subgraph and select candidate subgraphs that validity that enable direct updates through node/edge/subgraph
minimize graph distance [47]. This design is motivated by a operations. Drawing inspiration from cognitive science, where
common failure mode in interactive settings: user queries are human memory consolidates and adapts via mechanisms like
often ambiguous or poorly specified, and even LLM-based synaptic plasticity, graph-based agent memory evolves through
query rewriting may not reliably map such queries onto the internal self-reflection and external exploration. This dual
right memories. By interposing a topic-generation step, post- approach addresses conflicts between new and old memories
retrieval is less sensitive to superficial query phrasing [72].    (e.g., outdated facts versus recent observations) while enhancing
   Beyond explicit symbolic queries, there are also generative long-term coherence and adaptability. As shown in Figure
retrieval variants where the model uses its current latent 8, we categorize memory evolution into two complementary
reasoning state to generate a sequence of latent memory paradigms: i) internal self-evolving, which focuses on intrinsic
token representations. It then retrieves memories by embedding graph operations to maintain consistency without external
similarity in that latent space. The model can be trained using input; ii) external self-exploration, which leverages active
answer quality as the learning goal, encouraging latent memory interaction with the environment to ground and refine memory
token representations that surface more helpful memories [73]. automatically. These mechanisms transform passive knowledge
   For knowledge memory, the intermediate representation is repositories into proactive, learning systems.
often made closer to a canonical form so that the system can
match rules and facts and then verify them. For experience
memory, the intermediate representation often includes the A. Internal Self-Evolving
missing context that the user did not say explicitly, such as         Internal self-evolving treats the agent’s memory graph as a
the user goal, constraints, or what has already been tried. This closed-loop system capable of introspective refinement. This
is useful when the system must recover the right episode from process is analogous to human memory consolidation during
many similar logs.                                                 sleep or rest, where the brain organizes recent experiences,
   3) Hybrid-source Retrieval: Graph memory retrieval is abstracts general rules, and forgets trivial details without
increasingly studied in a hybrid-source setting, where the requiring new external sensory input. In the context of graph-
system coordinates internal memory with external resources. based agent memory, this involves reorganizing the graph
Here, external knowledge is treated as an additional retrievable topology to enhance retrieval efficiency, logical consistency,
resource alongside the memory store [69]. Examples include and generalization capabilities. Unlike traditional storage that
a local document index, online search APIs that return titles simply appends the logs, internal evolution applies structural
and snippets with URLs, and task environments that can be transformations to the graph, typically focusing on three
accessed through an agent interface. A key challenge is source key aspects: Memory Consolidation, Graph Reasoning and
selection. The system must decide when to rely on internal Graph Reorganization.
                                                                                                                                    14




Fig. 8: A taxonomy of Memory Evolution mechanisms. (Left) Internal Self-Evolving entails introspective refinement via
memory consolidation, graph reasoning, and reorganization. (Right) External Self-Exploration involves grounding memory
through environmental interaction, categorized into reactive feedback-driven adaptation and proactive active inquiry.


   1) Memory Consolidation: The core of internal evolution is         •  Inductive Knowledge Enrichment: Agents can employ
the abstraction of high-level knowledge from raw experiential            path-based reasoning to derive new attributes or facts.
data. Agents accumulate vast amounts of experience memory                By traversing the graph structure, the system identifies
(specific trajectories or interaction logs). Internal evolution          patterns and enriches the graph with inferred “covariates”
mechanisms [14], [18], [25] analyze these episodes to induce             or high-order relationships [75]. This effectively mitigates
generalized knowledge.                                                   the incompleteness of the initial memory construction,
                                                                         ensuring that future retrieval can access logically derivative
  • Generalization via Graph Merging: When an agent
                                                                         information that was never explicitly written into the logs.
    observes multiple similar distinct events, it can merge these
    subgraph instances into a generalized schema node [75].            3) Graph Reorganization: Infinite accumulation of memory
    This reduces storage redundancy and creates a canonical         leads to retrieval latency and noise. Internal self-evolving
    representation of ”skills” or ”facts” [76], [77]. More          implements “forgetting” mechanisms akin to biological systems
    advanced methods like Mem0 [31] and FLEX [78] employ            to maintain the graph’s health and quality.
    LLM-based semantic gating, where the model evaluates               • Significance-Based Pruning: Agents employ algorithms
    the information gain of new trajectories                             (e.g., PageRank variants or decay functions) to evaluate the
  • Inference and Conflict Resolution: Through internal                  utility of memory nodes. Nodes that are rarely accessed
    reasoning (e.g., logical inference or graph traversal), the          or have low contribution to recent decision-making are
    agent can detect implicit contradictions between nodes.              pruned or compressed [62], [81], [83].
    For instance, if node A implies B, but node C implies              • Topology Optimization: This involves restructuring the
    ¬B, the system triggers a self-correction process to                 edges to shorten the path length between frequently
    resolve the conflict based on confidence scores or temporal          associated concepts [76], [91]. By increasing the edge
    recency, updating the graph structure to maintain logical            weights or creating shortcuts between correlated nodes,
    coherence [24], [79], [80].                                          the agent optimizes the graph for faster future retrieval,
   2) Graph Reasoning: Beyond consolidating existing nodes,              compiling its experience into a more efficient structure.
internal evolution also entails discovering latent connections to
address memory sparsity. Agents actively scan their memory          B. External Self-Exploration
graphs to identify missing edges or infer new relationships that
                                                                       While internal evolution refines memory based on intrinsic
were not explicitly observed but can be deduced from existing
                                                                    consistency, it cannot verify the validity of knowledge against
facts. This process transforms the memory from a sparse set of
                                                                    the real world. External Self-Exploration bridges this gap
isolated trajectories into a densely connected knowledge web.
                                                                    by grounding memory evolution in environmental interaction.
  •   Latent Link Prediction: Utilizing the semantic capabili-      Instead of passively recording all events, effective exploration
      ties of LLMs, agents can predict potential relationships      uses environmental feedback (e.g., success signals, errors) to
      between disjoint subgraphs. For instance, if the memory       distinguish signal from noise and proactively seeks missing
                      cause              cause
      contains (A −−−→ B) and (B −−−→ C), the agent                 information. We categorize this broadly into feedback-driven
      can autonomously infer and insert a transitive edge           adaptation (reactive) and active inquiry (proactive).
          leads to
      (A −−−−−→ C) [79], [82]. This mechanism mimics the               The first paradigm, feedback-driven adaptation, focuses
      “associative thinking” in human cognition, allowing agents    on optimizing memory content and management policies based
      to “connect the dots” between temporally distant events       on the outcomes of past actions. In open-ended environments,
      without new external input.                                   raw interaction logs are often noisy; therefore, agents utilize
                                                                                                                             15



task execution results as supervisory signals to distill action- structures naturally couple with structured retrieval, enabling
able knowledge. Methods like ExpeL [88] and Matrix [84] multi-hop or relational queries essential for reasoning over
differentiate processing based on success or failure: successful entities, events, or concepts. In terms of functional coverage,
trajectories are crystallized into reusable skills, while failed OpenMemory and Mem0 [31] act as the most comprehen-
ones undergo comparative analysis to isolate causal errors, sive graph memory tools, supporting memory construction,
explicitly encoding “lessons learned” to favor high-utility interaction-driven updates, lifecycle management, temporal
behaviors. This evolutionary logic extends beyond content to awareness, and graph management. Graph-based memory
the memory management policy itself. Rather than relying on tools can be directly integrated into agent architectures to
fixed rules, systems like Memory-R1 [54] and Inside Out [85] dynamically leverage structured knowledge, supporting long-
treat memory operations (such as addition or deletion) as term retrieval, temporal reasoning, and multi-step task exe-
learnable actions within a Reinforcement Learning framework. cution. Cognee [92] provides queryable graph embeddings,
By receiving rewards for downstream task accuracy, the agent Mem0 [31] and OpenMemory support session-aware memory
autonomously learns an optimal policy for maintaining the updates, and Graphiti enables temporal graph reasoning for
graph. Similarly, MemEvolve [86] applies this feedback-driven multi-step planning. For non-graph memory systems, memory
principle to the architectural level, dynamically adjusting construction is predominantly interaction or session-driven,
storage structures and indexing mechanisms to tailor the system such as LangMem, LightMem [93], and O-Mem [60], with
to the changing complexity of the deployment environment.        mechanisms to update memory incrementally and support
   However, relying solely on reactive adaptation suffers from retrieval. While they provide retrieval functionalities funda-
coverage bias, where the agent’s knowledge remains limited to mentally based on embedding similarity. Although lightweight
the specific tasks it has been assigned. To overcome this, the tools like Memori and MemMachine focus on modular memory
second paradigm, active inquiry, transitions the agent from a management, prioritizing ease of integration and supporting
passive learner to a proactive explorer. Advanced frameworks agent conditioning through APIs.
empower agents to detect uncertainty in their current graph
and autonomously formulate goals to resolve it. For instance, B. Datasets and Benchmarks
ProMem [89] enables agents to critically self-reflect on missing    Unlike standard NLP tasks, evaluating agent memory should
nodes or ambiguous edges, subsequently generating specific account for information dispersed throughout extended interac-
queries to fill these knowledge gaps. AgentEvolver [90] expands tions and evolving system environments. Effective benchmarks
this capability to the task space by autonomously generating in this area prioritize an agent’s ability to reuse observed
new sub-tasks that force navigation through unexplored states, data despite the limitations of finite context windows and
preemptively populating memory with diverse experiences. To computational costs. In the following, we highlight key bench-
further accelerate this process, KIMI K2.5 [87] introduces a marks tailored for memory-augmented agents. These selections,
scalable swarm mechanism, spawning parallel sub-agents to summarized in Table I, are evaluated against a unified set of
explore disjoint branches of a problem space. This allows the criteria including modality, environment realism, and memory
central memory to rapidly ingest diverse perspectives and edge type to provide a comparative benchmark overview.
cases, transforming the system from a passive container of             a) Scenario taxonomy: We categorize existing bench-
experience into an active constructor of knowledge.              marks through a scenario-based taxonomy that reflects the
   Despite progress in feedback-driven adaptation and active diverse application settings of memory-augmented agents.
inquiry, explicitly leveraging graph structure for exploration This classification is based on three key aspects: interaction
remains underexplored. Here, we give some suggestions about patterns ranging from multi-turn dialogues to long-horizon
using the graph in self-exploration. First, topology-guided tasks, working interfaces including web-based or embodied and
exploration can prioritize sparsely-connected clusters or bridge tool-assisted environments, and the time spans of information
disconnected subgraphs to systematically improve knowledge reuse. Following this structure, we identify seven representative
coverage and connectivity. Then, multi-granularity strategies scenarios: Interaction, Personalization, Web, LongContext,
coordinate discovery across seeking high-level relational pat- Continual, Environments, and Tool/Gen.
terns while populating concrete instances through targeted          1) Interaction: Multi-turn and Cross-session Conversational
interactions. These approaches transform memory graphs from Memory: Benchmarks in the Interaction scenario focus on
passive repositories into active architectures that dynamically an agent’s ability to maintain continuity across multi-turn
construct and refine their own knowledge boundaries.             and cross-session dialogues. In these settings, relevant in-
                                                                 formation introduced early in the conversation must be ac-
   VIII. O PEN - SOURCED L IBRARIES AND B ENCHMARKS              curately recalled and applied later. This category includes
                                                                 datasets such as LoCoMo [94], LongMemEval [95], Memo-
A. Open-sourced Libraries                                        ryAgentBench [96], MEMTRACK [97], MADial-Bench [98],
   In Table IV in Appendix B, we provide a systematic MemSim [99], ChMapData [100], MSC [101], MMRC [102],
comparison of eleven representative open-source memory MemBench [103], StoryBench [104], DialSim [105], and
libraries across key functional dimensions.                      RealMem [106]. These benchmarks prioritize long-range
   Several libraries offer graph-based memory representation context, consistency across different sessions, and the retrieval
and utilization, including Cognee [92], Mem0 [31], Open- of previously mentioned user-provided facts during an ongoing
Memory, MemMachine, Memary, and Graphiti. Graph-based dialogue.
                                                                                                                                                                   16



                                            TABLE I: Agent memory benchmarks grouped by scenario.
Name                    Scenario          Modality         Feature                                         Environment   Memory type              Link(Feb 2026)
LoCoMo [94]           Interaction         Text+Image       Long conversational memory                          real      Factual                  • Website
LongMemEval [95]      Interaction         Text             Long-term interactive memory                     simulated    Factual                  • GitHub
MemoryAgentBench [96] Interaction         Text             Multi-turn interactions                          simulated    Factual + Experiential   • GitHub
MEMTRACK [97]         Interaction         Text+Code+Logs   Long-term interactive memory                     simulated    Factual + Experiential   • Website
MADial-Bench [98]     Interaction         Text             Memory-augmented dialogue generation             simulated    Factual                  • GitHub
MemSim [99]           Interaction         Text             Bayesian memory simulation                       simulated    Factual + Experiential   • GitHub
ChMapData [100]       Interaction         Text             Memory-aware proactive dialogue                  simulated    Factual                  • GitHub
MSC [101]             Interaction         Text             Multi-session chat                               simulated    Factual                  • Website
MMRC [102]            Interaction         Text+Image       Multi-modal real-world conversation              simulated    Factual                  • GitHub
MemBench [103]        Interaction         Text             Interactive scenarios                            simulated    Factual + Experiential   • GitHub
StoryBench [104]      Interaction         Text             Interactive fiction memory                         mixed      Factual + Experiential   • Website
DialSim [105]         Interaction         Text             Multi-dialogue understanding                        real      Factual + Experiential   • Website
RealMem [106]         Interaction         Text             Project-oriented long-term memory interaction    simulated    Factual + Experiential   • GitHub
PersonaMem [107]        Personalization   Text             Dynamic user profiling                           simulated    Factual                  • GitHub
PerLTQA [108]           Personalization   Text             Social personalized interactions                 simulated    Factual                  • Website
MemoryBank [81]         Personalization   Text             User memory updating                             simulated    Factual                  • GitHub
MPR [109]               Personalization   Text             User personalization                             simulated    Factual                  • GitHub
PrefEval [110]          Personalization   Text             Personal preferences                             simulated    Factual                  • Website
LOCCO [111]             Personalization   Text             Chronological conversations                      simulated    Factual                  • GitHub
WebChoreArena [112]     Web               Text+Image       Tedious web browsing                                real      Factual + Experiential   • GitHub
MT-Mind2Web [113]       Web               Text             Conversational web navigation                       real      Factual + Experiential   • GitHub
WebShop [114]           Web               Text+Image       E-commerce web interaction                       simulated    Experiential             • GitHub
WebArena [115]          Web               Text+Image       Web interaction                                     real      Experiential             • GitHub
MMInA [116]             Web               Text+Image       Multihop web agent                                  real      Factual + Experiential   • Website
NQ [117]                LongContext       Text             Natural question answering                       simulated    Factual                  • Website
TriviaQA [118]          LongContext       Text             Large-scale question answering                   simulated    Factual                  • Website
PopQA [119]             LongContext       Text             Adaptive retrieval augmentation                  simulated    Factual                  • GitHub
HotpotQA [120]          LongContext       Text             Explainable multi-hop QA                         simulated    Factual                  • Website
2wikimultihopQA [121]   LongContext       Text             Multi-hop QA                                     simulated    Factual                  • GitHub
Musique [122]           LongContext       Text             Multi-hop QA                                     simulated    Factual                  • GitHub
LongBench [123]         LongContext       Text             Long-context understanding                         mixed      Factual                  • GitHub
LongBench v2 [124]      LongContext       Text             Long-context multitasks                            mixed      Factual                  • GitHub
RULER [125]             LongContext       Text             Long-context retrieval                           simulated    Factual                  • GitHub
BABILong [126]          LongContext       Text             Long-context reasoning                           simulated    Factual                  • GitHub
MM-Needle [127]         LongContext       Text+Image       Multimodal needle retrieval                      simulated    Factual                  • Website
HaluMem [128]           LongContext       Text             Memory hallucination eval                        simulated    Factual                  • GitHub
MemoryBench [129]        Continual        Text             Continual learning                               simulated    Factual + Experiential   • GitHub
LifelongAgentBench [130] Continual        Text             Lifelong learning                                simulated    Factual + Experiential   • Website
StreamBench [131]        Continual        Text             Continuous online learning                       simulated    Factual + Experiential   • Website
Evo-Memory [132]         Continual        Text             Test-time learning                               simulated    Factual + Experiential   • Website
Ego4D [133]             Environments      Video+Audio      Egocentric episodic memory                          real      Experiential             • Website
EgoLife [134]           Environments      Video+Audio      Long-context life QA                                real      Experiential             • Website
ALFWorld [135]          Environments      Text             Household tasks                                  simulated    Factual + Experiential   • Website
BabyAI [136]            Environments      Text             Language navigation                              simulated    Experiential             • Website
ScienceWorld [137]      Environments      Text             Multi-step science experiments                   simulated    Factual + Experiential   • GitHub
AgentGym [138]          Environments      Text             Multiple environments                              mixed      Experiential             • Website
AgentBoard [139]        Environments      Text             Multi-round interaction                            mixed      Experiential             • GitHub
SWE-Bench [140]         Tool/Gen          Text+Code        Code repair                                         real      Experiential             • Website
GAIA [141]              Tool/Gen          Text             Deep research tasks                                 real      Experiential             • Website
xBench-DS [142]         Tool/Gen          Text+Image       Deep-search evaluation                              real      Experiential             • Website
ToolBench [143]         Tool/Gen          Text→API         API tool use                                        real      Experiential             • Website
GenAI-Bench [144]       Tool/Gen          Text+Image       Visual generation eval                              real      Experiential             • Website




   The evaluation typically centers on memory recall over ability to manage persistent user-centric facts and profile
extended histories, contextual reuse of information to produce attributes, as seen in PersonaMem [107], PerLTQA [108], Mem-
coherent responses, and consistency maintenance to avoid self- oryBank [81], MPR [109], PrefEval [110], and LOCCO [111].
contradiction. These capabilities are fundamental for assistant- These benchmarks evaluate whether an agent can build a
style agents where memory failures directly lead to a degraded stable user model and integrate new user information over
user experience. Common metrics include task-level accuracy, time. For real-world assistants, a primary challenge is avoiding
retrieval-oriented measures like Recall@k, and dialogue-level persona drift where the agent forgets or contradicts previously
consistency rates. Furthermore, some benchmarks track success established preferences. However, a current limitation of these
rates over multi-turn tasks to see if recalled information is tasks is their frequent reliance on clear supervision regarding
effectively integrated into responses. A notable limitation is what should be stored. In contrast, practical deployment
that many Interaction benchmarks lack explicit supervision necessitates selective writing and privacy-aware retention, both
for memory updates when dealing with conflicting facts. of which remain less addressed in existing efforts.
Consequently, the mechanism by which agents overwrite or
forget outdated information is less systematically evaluated        3) Web: Long-horizon Browsing and Multi-step Online Tasks:
than their ability to recall it.                                 Web   benchmarks evaluate memory within extended action
                                                                 trajectories where agents must track environmental states
   2) Personalization: User Profiling, Preferences, and Memory and intermediate results across numerous steps. Datasets like
Updates: Personalization benchmarks examine an agent’s WebShop [114] and WebArena [115] focus on e-commerce and
                                                                                                                                       17



functional website interactions. WebChoreArena [112] targets             7) Tool/Gen: Tool Use and Workflow Execution: Tool/Gen
complex browsing routines, while MT-Mind2Web [113] em-                benchmarks evaluate memory within workflows involving
phasizes conversational navigation and MMInA [116] assesses           external APIs and iterative reasoning. ToolBench [143] focuses
multi-hop web interactions. These tasks place heavy demands           on API invocation, while SWE-Bench [140] targets software
on experiential memory because agents must often cache page           engineering through iterative debugging. GAIA [141], xBench-
states to prevent redundant actions. They also highlight the          DS [142], and GenAI-Bench [144] measure complex research
necessity of resource-efficient memory given that excessive           and generation behaviors. These tasks emphasize process
tool calls can lead to high operational costs. A prevailing           memory or the ability to retain intermediate hypotheses and
challenge is that success in these benchmarks can sometimes           failed attempts. They also underscore operational issues, e.g.,
be achieved via simple heuristics, meaning that isolating the         traceability and the financial cost of retries. A significant hurdle
specific impact of memory requires controlled settings such as        is evaluation complexity because success hinges on environment
limiting memory capacity.                                             stability and the design of specialized scoring scripts.
   4) LongContext: Long-document Understanding and Re-                      a) Synthesis of Evaluation Landscapes: Overall, these
trieval: LongContext benchmarks measure agent performance             benchmarks provide a broad perspective on agent capabilities
under high-volume inputs and retrieval-intensive settings.            by testing them in interactive and long-horizon tasks. While
Established QA suites including NQ [117], TriviaQA [118],             memory is not always the only metric, success in these
PopQA [119], HotpotQA [120], 2wikimultihopQA [121],                   environments depends on the ability of an agent to store relevant
and Musique [122] test evidence aggregation and multi-step            data and use past experience for current decisions. Future
reasoning. More recent frameworks like LongBench [123]                studies can improve these evaluations by measuring the specific
and LongBench v2 [124] offer multi-task evaluations, while            impact of memory through ablation tests and focusing on how
RULER [125], BABILong [126], MM-Needle [127], and                     agents handle changing information in dynamic settings. By
HaluMem [128] focus on needle-in-a-haystack retrieval and             using clear efficiency metrics and ensuring that environments
hallucination evaluation. While these benchmarks are essential        are reproducible, these benchmarks help provide a better
for modeling evidence access, they are not always perfect             understanding of memory behaviors in practice.
indicators of agent memory. Many of these tasks remain single-              b) Strategic Benchmark Selection: Choosing the right
turn and do not require the agent to actively write to a persistent   benchmark depends on which memory capability is being
memory store, potentially conflating long-context processing          studied. Interaction and Personalization datasets are best for
with dedicated memory mechanisms.                                     testing conversational persistence. Web and Environments are
                                                                      more suitable for evaluating how agents manage long sequences
   5) Continual: Lifelong Learning and Test-time Adaptation:          of actions and experiential data. LongContext tasks remain the
Continual benchmarks assess whether agents can improve over           standard for checking fact retrieval in large inputs. For research
time without experiencing catastrophic forgetting, typically          on agents that learn over time, Continual benchmarks show
under streaming or sequential task distributions. Frameworks          how well information is kept, while Tool/Gen tasks evaluate
such as MemoryBench [129], LifelongAgentBench [130],                  memory during the execution of complex technical steps.
StreamBench [131], and Evo-Memory [132] capture elements
of online updates and test-time adaptation. This category repre-                            IX. A PPLICATIONS
sents lifelong memory in its strictest sense and requires models
                                                                         The applicability of (graph-based) agent memory ranges from
to maintain proficiency in earlier tasks while acquiring new
                                                                      conversational chatbots to embodied robots and science agents.
knowledge. Despite its importance, this area lacks standardized
                                                                      By addressing challenges, including long-term knowledge
reporting because metrics for forgetting and transfer gains
                                                                      retention, personalized interaction, multi-step reasoning, and
vary significantly. Furthermore, it is often difficult to discern
                                                                      self-evolution, memory can enhance the effectiveness and
whether performance gains stem from parametric updates or
                                                                      reliability of LLM agents in a wide range of application
retrieval over past logs.
                                                                      domains. This section systematically discusses both current
   6) Environments: Embodied and Interactive Worlds:                  and prospective applications.
Environment-based benchmarks evaluate agents in simulated
or physical interactive settings where memory must distill A. Conversational Agents
observations under partial observability. Ego4D [133] and
                                                                    Conversational agents, such as Claude1 and ChatGPT2 , are
EgoLife [134] focus on egocentric episodic memory and
                                                                 one of the most common use cases of LLM-based systems. The
multimodal life-logging. ALFWorld [135] and BabyAI [136]
                                                                 agents face challenges in maintaining coherent and personalized
emphasize instruction following and navigation, while Sci-
                                                                 dialogues within a context for a long period of time in a multi-
enceWorld [137] tests multi-step experimentation. Broader
                                                                 session dialogue and require sophisticated memory systems to
suites like AgentGym [138] and AgentBoard [139] offer
                                                                 effectively update their knowledge and user preferences.
multi-round evaluations using planning-centric analysis. These
                                                                    Early studies focused on the controllability and stability
benchmarks primarily test experiential memory and robustness
                                                                 of memory systems. The Memory Sandbox [145] and LD-
across environmental variations. However, since performance
                                                                 Agent [146] initiatives laid the foundation by highlighting the
is often tied to environment-specific skills, claiming memory-
related benefits requires carefully controlling for planning and     1 https://claude.ai/

tool-use variables.                                                  2 https://chatgpt.com/
                                                                                                                               18



transparency of memory systems and the distinction between        C. Recommender Systems
event memory and personality to enhance the credibility of the       Agent memory is applied in recommender systems to address
memory system. Contemporary studies on memory moved on            the issue of long and dynamic user histories that are difficult
to tackle the issue of context fragmentation in multi-session     to handle using recommendation agents [157]. In practice,
dialogue systems by using structural optimization methods.        recommendation agents often truncate histories, letting short-
SeCom [147] optimizes the dialogue structure by extracting        term noise, e.g., accidental interactions, override stable long-
topics in dialogue systems, while SGMem [35] relies on            term preferences. Meanwhile, fine-tuning agent parameters to
semantic graphs to connect fragmented dialogue sessions. These    track drifting user preferences is costly [158]. External memory
studies upgrade memory systems from simple linear structures      is a more efficient solution that alleviates the problem through
to knowledge graphs enabling more precise memory recall.          the reduction of retraining and token costs.
   Aside from memory storage, advanced memory-based dia-             The current agent-based recommender systems have adopted
logue agents need to be equipped with dynamic reasoning and       a three-level memory maintenance approach that starts with
time evolution capabilities. RMM [57] extends memory systems      coarse-grained retrieval and ends with fine-grained reasoning.
with reflection-based self-correction mechanisms, whereas         In the first level of history as memory, both MAP [159]
TReMu [37] uses temporal knowledge graphs to capture              and AgentCF++ [160] focus on scalability. For the latter, a
intricate time-based relationships. Nevertheless, the trend of    dual-layer approach is proposed for noise filtering and social
increasing memory system complexity is challenged by the          contextualization. For the second level of structured key-value
recent ENGRAM [34] project, which showed that an efficient        memory, interactions are structured into semantic structures.
memory system with a basic typed memory structure consisting      MemoCRS [161] and Agent4Rec [162] use entity-key pairs
of episodic, semantic, and procedural memory types can achieve    for rating association. Finally, in the third level of memory as
comparable performance to complex memory systems.                 cognition, memory is made active by reflection and planning.
                                                                  At this level, CRAVE [163] and AgentCF [164] summarize
B. Code Agents
                                                                  preference rules. RecMind [165] applies strategic multi-step
   The software engineering processes for code generation [148] planning. In order to make these dynamic systems concrete
and code simulation [149] pose a unique challenge for the and grounded in reality, KGLA [166] applies a Knowledge
memory component of the agent, as they require following Graph for concrete metadata injection. MR.Rec [167] uses RL
rigid structural requirements and logical flow of software pro- for adaptive memory retrieval and logical reasoning.
gramming. In the initial stages, the problem of task confusion
was addressed in both MetaGPT [150] and ChatDev [151]
by modeling conventional human workflows and definitions D. Financial Agents
of roles and responsibilities. SWE-agent [1] further enhanced        Financial markets are considered to be challenging for
this approach with the inclusion of Agent-Computer Interfaces, agent memory systems due to the information decay pattern,
which allow the agent to perform operations on source control heterogeneous data streams from various sources, and the need
systems. However, as the task becomes more intricate, linear to balance the patterns with the latest market conditions [168].
approaches are no longer sufficient. TALM [152] introduces Financial agents need memory systems with high priority
a new paradigm, moving away from conventional linear for recency and the ability to preserve patterns. Moreover,
workflows and towards a dynamic tree-based architecture. By financial decision-making also requires interpretability and
using divide and conquer approaches and taking advantage of risk management, where memory systems are essential for
the agent’s long-term memory, TALM demonstrates the need counterfactual reasoning, optimization, and adaptation.
for a hierarchical structure, which can handle the non-linear        The first attempts have been made in individual cognitive
dependencies involved in code generation.                         simulation, in which FinMem [44] tackles cognitive bottlenecks
   In addition to this orchestration of tasks, agents should through a layered memory structure inspired by human traders’
navigate the complex information space of software, which behavior. To address the natural bias in individual AI agents,
resembles a knowledge graph of dependencies and logic. While TradingGPT [169] has proposed an extension to collaborative
Reflexion [153] introduced a form of basic self-correction cognitive simulation, using inter-agent debate as a mechanism
through a verbal feedback loop, recent research has focused for de-biasing through collective intelligence. Progressing
on structural context. In this regard, RepoAudit [154] attempts toward professional capabilities, FinCon [170] has set up a
to solve issues related to the repository. An auditing agent is managerial structure for analysts, with agents empowered with
introduced that explores the codebase on its own. This is akin higher memory capabilities to maintain a history of actions,
to a graph traversal algorithm on file dependencies. As a result, profit-loss sequences, and changing investment beliefs for
an accurate analysis is guaranteed. MemGovern [155] and risk management strategies. Finally, FinAgent [171] bridges
Multi-Agent RL Debugging [156] are extensions that arrange the information gap by extending memory to multimodal
the external information gathered from the GitHub website perception, enabling agents to process K-line charts and tool-
and the feedback loop in the form of a retrievable knowledge augmented data for holistic market analysis.
base. This is a clear indication of the evolution of memory          Current implementations of memory-augmented financial
associated with software agents, which is moving away from agents remain relatively limited. Future graph-based memory
simple memory to more structured memory that allows for holds transformative potential in finance, e.g., hierarchical
basic reasoning about the topology.                               graphs can enhance multi-asset portfolio management by
                                                                                                                               19



modeling cross-asset correlations, and temporal graphs can        In a further step, STRAP [177] improves trajectory retrieval by
improve risk management and tail risk analysis.                   introducing a flexible memory that uses dynamic time warping
                                                                  to match variable-length motion sub-sequences within large
E. Game Agents                                                    and diverse datasets. In contrast, TrackVLA++ [178] uses a
                                                                  dual memory architecture to target perception stability and
   The game environment poses a major challenge for agents’
                                                                  address the long-term maintenance.
memory systems due to its dynamics, complex rules, and
                                                                     In conclusion, the memory systems used by embodied
long-term goals—especially in the open world that requires
                                                                  agents remain flat or weakly structured, making it difficult
multi-step reasoning and exploratory learning. Memory must
                                                                  to perform complex relational reasoning and hierarchical
store experiential and world knowledge (including successes
                                                                  abstraction. Future work could focus on graph-based memory
and failures) and allow efficient real-time access to support
                                                                  architectures that represent spatial relations between objects,
skill acquisition. Early research on game agents focused on
                                                                  hierarchical task structures, and action–effect causality.
mastering open-ended environments like Minecraft through
progressively richer memory and perception mechanisms. Ghost
in the Minecraft (GITM) [70] employed dictionary-based G. Medical and Health Agents
memory to capture spatial layouts and crafting knowledge           Healthcare agents need advanced memory systems to facil-
via text interactions. Voyager [4] advanced this paradigm by itate high-risk medical decision-making, longitudinal patient
introducing lifelong learning, using an ever-growing library care, and evidence-based diagnosis. Memory helps the health-
of executable code as procedural memory for skill acquisition care agents retain patient histories over multiple visits, integrate
and reuse. Jarvis-1 [172] further incorporated multimodal new knowledge in the medical field, perform differential
memory to align textual reasoning with visual perception, diagnosis, and provide personalized patient care while ensuring
enabling mastery of over 200 tasks in Minecraft. Most recently, safety and interpretability. Specifically, AgentClinic [179]
Optimus-1 [28] addressed long-horizon planning by organizing and AgentMental [180] focus on simulating physician–patient
experience into a hierarchical directed knowledge graph coupled interactions with a memory module to record and track
with an abstracted experience pool.                              diagnostic information over time, while AgentMental [180]
   Recently, the paradigm has shifted towards generalist agents employs a dynamic tree-structured memory to organize and
capable of operating across diverse environments via unified manage medical knowledge and conversation data. The memory
interfaces. Cradle [61] broke the boundaries of game-specific in healthcare agents reflects the importance of longitudinal
APIs by establishing a unified human-like interface by ground- medical histories and diagnostic accuracy in real clinical
ing interaction in screenshots and keyboard-mouse actions. settings, facilitating agents to keep previous information to give
This enables agents to play multiple commercial games and comprehensive suggestions. In contrast, AgentHospital [181]
requires episodic memory to retain cross-interaction context emphasizes a full-process virtual hospital environment, where
and accumulated gameplay experience. Following this direction, agents evolve through large-scale interactions across both
SIMA [173] and SIMA 2 [174] focus on instructable agents successful and failed cases, supported by richer data integration
capable of executing arbitrary natural-language commands and more comprehensive system functionalities.
across many 3D environments. The latest version further            Collectively, these studies underscore the importance of
extends this paradigm with higher-level reasoning and self- structured and interaction-aware memory for healthcare agents.
improvement, moving from passive instruction following to ac- Graph-based memory grounded in medical ontologies such
tive skill acquisition. These advances place increasing demands as UMLS [182] enables multi-hop clinical reasoning, explicit
on memory systems, including long-term episodic memory and modeling of drug interactions, and temporal tracking of disease
mechanisms for accumulating and reusing strategies across progression and treatments. Such structured representations
environments. Future research should focus on expressive provide a promising foundation for more robust medical agents
memory architectures such as dynamic and temporal graph with improved contextual reasoning, diagnostic planning, and
construction for latent skill hierarchy discovery and time-aware long-term decision support [183].
causal reasoning.
                                                                 H. Science Agents
F. Robotics and Embodied Agents                                    In scientific discovery, agents are increasingly shifting from
   Embodied agents must continuously ground their decision- passive data analysis to active experimental partners that can
making in the physical world, which is dynamic and partially efficiently search vast spaces and call some specific tools.
observable, and perform long-horizon manipulation tasks that Agent memory enables the iterative integration of theory and
span multiple interaction episodes. Therefore, agents embodied experiment within complex scientific workflows, functioning
in physical or virtual environments have special challenges that as a dynamic workspace rather than static information retrieval.
require advanced memory mechanisms. HELPER [175] and ChatNT [184], ChemCrow [185], and El Agente [186] represent
MAP-VLA [176] both leverage memory to bridge high-level domain-specific scientific research support agents. All focus
language instructions and executable actions, but they have on enhancing LLM capabilities for professional research tasks
different ways, such as key-value memory to map natural lan- while they have different scopes for research works such as
guage commands directly to robot code and a reusable memory biological sequence reasoning, chemical analysis, and quantum
library to retrieve and adapt specific manipulation strategies. chemistry simulations. These systems primarily function as
                                                                                                                                       20



intelligent tools that assist researchers in localized stages of      differential privacy mechanisms [198] tailored for graph
the scientific process rather than modeling the entire research       memory systems; (2) federated architectures enabling on-device
lifecycle. Furthermore, some complex agents are established as        processing to minimize data exposure; and (3) secure multi-
system-level scientific agents with complex environments. In bi-      party computation protocols that allow agents to benefit from
ological research domain, Biomni [187] advances beyond task-          collective experiences without compromising individual privacy.
level assistance by supporting complex biomedical research            Beyond privacy leakage, memory systems face emerging threats
workflows, enabling agents to automatically identify, com-            from adversarial attacks. Similar to prompt injection and data
pose, and execute multi-step experimental pipelines. Similaly,        poisoning attacks against LLMs [199], [200], adversaries can
CRESt [188] targets materials science field and closes the loop       manipulate memory contents to corrupt agent behavior or inject
between computational reasoning and physical experimentation,         malicious knowledge. Defense mechanisms such as memory
enabling agents to iteratively generate hypotheses and validate       content validation, anomaly detection, and robust auditing
them through robotic synthesis. Generally, VirtualLab [189]           protocols are essential to ensure memory integrity.
operates at the organizational level, simulating human research          Dynamic Schema Learning and Knowledge Transfer.
institutions through teams of collaborative agents, and rep-          Current graph schemas are often domain-specific with limited
resents a shift from individual scientific tools to collective        reusability, requiring substantial re-engineering for new appli-
scientific intelligence, as a comprehensive agent.                    cations [11]. Future systems should pursue dynamic schema
   Overall, this progression of existing scientific agents reflects   learning, where agents automatically identify relevant entity
a transition from localized scientific assistance toward holistic     types and relationship patterns from raw experiences. Meta-
and autonomous scientific systems and requires effective mem-         learning approaches could enable rapid adaptation to new do-
ory modules. As agent capabilities scale, memory requirements         mains [201], combining with universal graph ontologies [202]
become correspondingly more complex, demanding structured             and domain-agnostic abstraction mechanisms, to facilitate
integration, organization, and management of heterogeneous            effective knowledge transfer across tasks.
domain knowledge, for which graph-based memory structures                Interpretability and Trustworthy. For agents to be de-
provide a clear and effective solution.                               ployed in high-stakes domains, their memory systems must
                                                                      be both human-understandable and transparent in operation.
                                                                      Graph-based memory architectures offer unique advantages
        X. L IMITATIONS AND F UTURE D IRECTIONS
                                                                      for interpretability: their explicit relational structures naturally
   Despite significant progress in graph-based agent memory,          align with human mental models, enabling users to inspect and
several fundamental challenges present critical opportunities         comprehend how agents organize and utilize information [79],
for advancing the field.                                              [82], [191]. Critical directions include developing memory
   The Quality of Memory Graph. The quality of the memory             provenance tracking systems, creating interactive visualization
graph fundamentally constrains the performance, reliability,          interfaces that allow users to explore memory graphs at multiple
and adaptability of graph-based agent memory systems [190],           levels [145]. By ensuring human oversight and understanding
[191]. Unlike traditional memory systems, where quality is            of agent memory processes, the systems can foster appropriate
often related primarily to factual accuracy in downstream             trust calibration, enabling users to identify potential biases,
tasks, graph-based memory should introduce multidimensional           verify critical information, and maintain control over agent
quality criteria, including structural, semantic, temporal, and       behavior [180], [203].
operational aspects, each of which directly shapes agent                 Theoretical Foundations. Establishing rigorous mathemat-
capabilities [18], [103]. And there is a scarcity of metrics          ical frameworks remains essential for advancing the field.
designed to explicitly evaluate the intrinsic quality of the          Priority areas include formal models that provide completeness
memory graph [103], [192].                                            and consistency guarantees, complexity analysis establishing
   Scalability and Efficiency. As agents accumulate experi-           theoretical bounds on construction and retrieval operations,
ences over extended interactions, memory systems face compu-          and scaling laws of the memory-augmented AI agents [204].
tational bottlenecks, with graph operations exhibiting quadratic      Comparative analysis with human cognitive architectures could
or worse complexity [15]. Future research should explore              identify fundamental gaps and opportunities for architectural
memory compression techniques specifically designed for graph         improvements aligned with biological memory systems [205].
structures [193], incremental update algorithms that avoid full          Memory Coordination in Multi-Agent Systems. In multi-
recomputation [194], and approximate retrieval methods that           agent or agent-swarm settings, memory is no longer an isolated
trade precision for substantial efficiency gains [195]. Hardware      component but a shared resource that directly affects task
acceleration through specialized graph processing units [196]         completion and coordination efficiency. Ineffective memory
and distributed architectures [197] enable the management of          sharing or inconsistent memory updates can lead to conflicting
millions of nodes while maintaining rapid access.                     decisions. Designing mechanisms for memory synchronization,
   Privacy Protection and Security. Personal assistant appli-         role-aware memory access, and scalable coordination remains
cations require robust protection of sensitive information while      an open challenge, especially under communication constraints.
enabling meaningful personalization [9]. Graph-based memory
structures introduce unique vulnerabilities where relational pat-                       XI. C ONCLUSION
terns may inadvertently expose private data through inference           As LLM-based agents evolve toward increasingly au-
attacks. Critical research directions include: (1) developing         tonomous and general-purpose systems, memory emerges
                                                                                                                                                           21



as a critical component. Graph-based memory architectures                         [16] Z. Jia, J. Li, Y. Kang, Y. Wang, T. Wu, Q. Wang, X. Wang, S. Zhang,
represent a paradigm shift from simple storage mechanisms to                           J. Shen, Q. Li, S. Qi, Y. Liang, D. He, Z. Zheng, and S.-C. Zhu, “The
                                                                                       AI hippocampus: How far are we from human memory?” Transactions
structured, relational representations that enable sophisticated                       on Machine Learning Research, 2025.
reasoning, personalization, and continual learning. This survey                   [17] H. Sun and S. Zeng, “Hierarchical memory for high-efficiency long-term
comprehensively reviews agent memory from a graph-based                                reasoning in llm agents,” arXiv preprint arXiv:2507.22925, 2025.
                                                                                  [18] P. Rasmussen, P. Paliychuk, T. Beauvais, J. Ryan, and D. Chalef, “Zep:
perspective. First, it introduces an agent memory taxonomy,                            a temporal knowledge graph architecture for agent memory,” arXiv
including short-term vs. long-term memory, knowledge vs.                               preprint arXiv:2501.13956, 2025.
experience memory, non-structural vs. structural memory, with                     [19] R. B. Yousuf, A. Khatri, S. Xu, M. Sharma, and N. Ramakrishnan,
a focus on graph-based memory implementation. Second,                                  “Can an llm induce a graph? investigating memory drift and context
                                                                                       length,” arXiv preprint arXiv:2510.03611, 2025.
it systematically analyzes key graph-based agent memory                           [20] R. Zeng, J. Fang, S. Liu, and Z. Meng, “On the structural memory of
techniques by lifecycle, including extraction, storage, retrieval,                     llm agents,” arXiv preprint arXiv:2412.15266, 2024.
and evolution. Third, it summarizes open-source libraries,                        [21] S. Liang, Y. Zhang, and Y. Guo, “Personaagent with graphrag:
                                                                                       Community-aware knowledge graphs for personalized llm,” arXiv
datasets and benchmarks, and diverse application scenarios                             preprint arXiv:2511.17467, 2025.
for self-evolving agent memory. Finally, it identifies challenges                 [22] C. Huan, Z. Meng, Y. Liu, Z. Yang, Y. Zhu, Y. Yun, S. Li, R. Gu,
and future research directions. We hope this survey serves as                          X. Wu, H. Zhang et al., “Scaling graph chain-of-thought reasoning:
a valuable resource for researchers advancing the frontiers of                         A multi-agent framework with efficient llm serving,” arXiv preprint
                                                                                       arXiv:2511.01633, 2025.
agent memory systems and for practitioners seeking to build                       [23] M. Hu, T. Chen, Q. Chen, Y. Mu, W. Shao, and P. Luo, “Hiagent:
more capable, reliable, and trustworthy AI agents.                                     Hierarchical working memory management for solving long-horizon
                                                                                       agent tasks with large language model,” in Proceedings of the 63rd
                                                                                       Annual Meeting of the Association for Computational Linguistics
                                                                                       (Volume 1: Long Papers), 2025.
                              R EFERENCES                                         [24] N. Shinn, F. Cassano, A. Gopinath, K. Narasimhan, and S. Yao,
                                                                                       “Reflexion: language agents with verbal reinforcement learning,” in
  [1] J. Yang, C. E. Jimenez, A. Wettig, K. Lieret, S. Yao, K. Narasimhan,             Proceedings of the 37th International Conference on Neural Information
      and O. Press, “SWE-agent: agent-computer interfaces enable automated             Processing Systems, 2023.
      software engineering,” in NeurIPS, 2024.                                    [25] Y. Wang, R. Takanobu, Z. Liang, Y. Mao, Y. Hu, J. McAuley, and X. Wu,
  [2] Y. Lin, S. Tang, B. Lyu, J. Wu, H. Lin, K. Yang, J. Li, M. Xia, D. Chen,         “Mem-{\alpha}: Learning memory construction via reinforcement
      S. Arora et al., “Goedel-prover: A frontier model for open-source                learning,” arXiv preprint arXiv:2509.25911, 2025.
      automated theorem proving,” arXiv preprint arXiv:2502.07640, 2025.          [26] H. Shi, B. Xie, Y. Liu, L. Sun, F. Liu, T. Wang, E. Zhou, H. Fan,
  [3] Meta, A. Bakhtin, N. Brown, E. Dinan, G. Farina, C. Flaherty, D. Fried,          X. Zhang, and G. Huang, “Memoryvla: Perceptual-cognitive memory in
      A. Goff, J. Gray, H. Hu et al., “Human-level play in the game of                 vision-language-action models for robotic manipulation,” arXiv preprint
      diplomacy by combining language models with strategic reasoning,”                arXiv:2508.19236, 2025.
      Science, 2022.                                                              [27] J. H. Yeo, M. Kim, and Y. M. Ro, “Multi-temporal lip-audio memory
  [4] G. Wang, Y. Xie, Y. Jiang, A. Mandlekar, C. Xiao, Y. Zhu, L. Fan, and            for visual speech recognition,” ICASSP 2023 - 2023 IEEE International
      A. Anandkumar, “Voyager: An open-ended embodied agent with large                 Conference on Acoustics, Speech and Signal Processing (ICASSP),
      language models,” Transactions on Machine Learning Research, 2024.               2023.
  [5] Y. Su, D. Yang, S. Yao, and T. Yu, “Language agents: Foundations,           [28] Z. Li, Y. Xie, R. Shao, G. Chen, D. Jiang, and L. Nie, “Optimus-1:
      prospects, and risks,” in EMNLP: Tutorial Abstracts, 2024.                       Hybrid multimodal memory empowered agents excel in long-horizon
  [6] Z. Wang, Z. Cheng, H. Zhu, D. Fried, and G. Neubig, “What are tools              tasks,” Advances in neural information processing systems, 2024.
      anyway? a survey from the language model perspective,” in COLM,             [29] A. Modarressi, A. Köksal, A. Imani, M. Fayyaz, and H. Schütze,
      2024.                                                                            “Memllm: Finetuning llms to use an explicit read-write memory,” arXiv
  [7] Y. Qin, S. Liang, Y. Ye, K. Zhu, L. Yan, Y. Lu, Y. Lin, X. Cong, X. Tang,        preprint arXiv:2404.11672, 2024.
      B. Qian, S. Zhao, L. Hong, R. Tian, R. Xie, J. Zhou, M. Gerstein, dahai     [30] P. Anokhin, N. Semenov, A. Sorokin, D. Evseev, A. Kravchenko,
      li, Z. Liu, and M. Sun, “ToolLLM: Facilitating large language models             M. Burtsev, and E. Burnaev, “Arigraph: Learning knowledge graph
      to master 16000+ real-world APIs,” in ICLR, 2024.                                world models with episodic memory for llm agents,” arXiv preprint
  [8] T. Sumers, S. Yao, K. R. Narasimhan, and T. L. Griffiths, “Cognitive             arXiv:2407.04363, 2024.
      architectures for language agents,” Transactions on Machine Learning        [31] P. Chhikara, D. Khant, S. Aryan, T. Singh, and D. Yadav, “Mem0:
      Research, 2024.                                                                  Building production-ready ai agents with scalable long-term memory,”
  [9] Y. Li, H. Wen, W. Wang, X. Li, Y. Yuan, G. Liu, J. Liu, W. Xu, X. Wang,          arXiv preprint arXiv:2504.19413, 2025.
      Y. Sun et al., “Personal LLM agents: Insights and survey about the          [32] H. Yang, J. Chen, M. Siew, T. Lorido-Botran, and C. Joe-Wong,
      capability, efficiency and security,” arXiv preprint arXiv:2401.05459,           “Llm-powered decentralized generative agents with adaptive hierar-
      2024.                                                                            chical knowledge graph for cooperative planning,” arXiv preprint
 [10] C. Yang, X. Wang, Q. Zhang, Q. Jiang, and X. Huang, “Efficient                   arXiv:2502.05453, 2025.
      integration of external knowledge to llm-based world models via             [33] G. Zhang, M. Fu, G. Wan, M. Yu, K. Wang, and S. Yan, “G-memory:
      retrieval-augmented generation and reinforcement learning,” in Findings,         Tracing hierarchical memory for multi-agent systems,” arXiv preprint
      EMNLP, 2025, pp. 9484–9501.                                                      arXiv:2506.07398, 2025.
 [11] Y. Shang, Y. Li, K. Zhao, L. Ma, J. Liu, F. Xu, and Y. Li, “Agentsquare:    [34] D. Patel and S. Patel, “Engram: Effective, lightweight memory orches-
      Automatic LLM agent search in modular design space,” in ICLR, 2025.              tration for conversational agents,” arXiv preprint arXiv:2511.12960,
 [12] H. Ye, T. Liu, A. Zhang, W. Hua, and W. Jia, “Cognitive mirage:                  2025.
      A review of hallucinations in large language models,” arXiv preprint        [35] Y. Wu, Y. Zhang, S. Liang, and Y. Liu, “Sgmem: Sentence graph memory
      arXiv:2309.06794, 2023.                                                          for long-term conversational agents,” arXiv preprint arXiv:2509.21212,
 [13] H. Yu, T. Chen, J. Feng, J. Chen, W. Dai, Q. Yu, Y.-Q. Zhang, W.-Y. Ma,          2025.
      J. Liu, M. Wang et al., “Memagent: Reshaping long-context llm with          [36] Z. Wang, Z. Li, Z. Jiang, D. Tu, and W. Shi, “Crafting personalized
      multi-conv rl-based memory agent,” arXiv preprint arXiv:2507.02259,              agents through retrieval-augmented generation on editable memory
      2025.                                                                            graphs,” in Proceedings of the 2024 Conference on Empirical Methods
 [14] J. Nan, W. Ma, W. Wu, and Y. Chen, “Nemori: Self-organizing                      in Natural Language Processing, 2024.
      agent memory inspired by cognitive science,” arXiv preprint                 [37] Y. Ge, S. Romeo, J. Cai, R. Shu, Y. Benajiba, M. Sunkara, and Y. Zhang,
      arXiv:2508.03341, 2025.                                                          “Tremu: Towards neuro-symbolic temporal reasoning for llm-agents with
 [15] R. Zeng, J. Fang, S. Liu, and Z. Meng, “On the structural memory of              memory in multi-session dialogues,” in Findings of the Association for
      llm agents,” arXiv preprint arXiv:2412.15266, 2024.                              Computational Linguistics: ACL 2025, 2025.
                                                                                                                                                             22



[38] X. Tan, X. Wang, X. Xu, X. Yuan, L. Zhu, and W. Zhang, “Memotime:                 memory constraints via multi-agent collaboration in complex graph
     Memory-augmented temporal knowledge graph enhanced large language                 understanding,” arXiv preprint arXiv:2508.12379, 2025.
     model reasoning,” arXiv preprint arXiv:2510.13614, 2025.                     [60] P. Wang, M. Tian, J. Li, Y. Liang, Y. Wang, Q. Chen, T. Wang, Z. Lu,
[39] H. Luo, G. Chen, Y. Zheng, X. Wu, Y. Guo, Q. Lin, Y. Feng, Z. Kuang,              J. Ma, Y. E. Jiang et al., “Omni memory system for personalized, long
     M. Song, Y. Zhu et al., “Hypergraphrag: Retrieval-augmented generation            horizon, self-evolving agents,” arXiv preprint arXiv:2511.13593, 2025.
     via hypergraph-structured knowledge representation,” arXiv preprint          [61] W. Tan, W. Zhang, X. Xu, H. Xia, Z. Ding, B. Li, B. Zhou, J. Yue,
     arXiv:2503.21322, 2025.                                                           J. Jiang, Y. Li, R. An, M. Qin, C. Zong, L. Zheng, Y. Wu, X. Chai,
[40] S. Huang, H. Li, Y. Gu, X. Hu, Q. Li, and G. Xu, “Hyperg: Hypergraph-             Y. Bi, T. Xie, P. Gu, X. Li, C. Zhang, L. Tian, C. Wang, X. Wang, B. F.
     enhanced llms for structured knowledge,” in Proceedings of the 48th               Karlsson, B. An, S. YAN, and Z. Lu, “Cradle: Empowering foundation
     International ACM SIGIR Conference on Research and Development                    agents towards general computer control,” in ICML, 2025.
     in Information Retrieval, 2025.                                              [62] C. Packer, S. Wooders, K. Lin, V. Fang, S. G. Patil, I. Stoica, and
[41] J. Jiang, K. Zhou, W. X. Zhao, Y. Song, C. Zhu, H. Zhu, and J.-R.                 J. E. Gonzalez, “Memgpt: Towards llms as operating systems,” arXiv
     Wen, “Kg-agent: An efficient autonomous agent framework for complex               preprint arXiv:2310.08560, 2023.
     reasoning over knowledge graph,” in Proceedings of the 63rd Annual           [63] M. Hu, T. Chen, Q. Chen, Y. Mu, W. Shao, and P. Luo, “Hiagent:
     Meeting of the Association for Computational Linguistics (Volume 1:               Hierarchical working memory management for solving long-horizon
     Long Papers), 2025.                                                               agent tasks with large language model,” in Proceedings of the 63rd
[42] L. Long, Y. He, W. Ye, Y. Pan, Y. Lin, H. Li, J. Zhao, and W. Li,                 Annual Meeting of the Association for Computational Linguistics
     “Seeing, listening, remembering, and reasoning: A multimodal agent                (Volume 1: Long Papers), 2025.
     with long-term memory,” arXiv preprint arXiv:2508.09736, 2025.               [64] Z. Jia, J. Li, X. Qu, and J. Wang, “Enhancing multi-agent systems via
[43] R. Salama, J. Cai, M. Yuan, A. Currey, M. Sunkara, Y. Zhang, and                  reinforcement learning with llm-based planner and graph-based policy,”
     Y. Benajiba, “Meminsight: Autonomous memory augmentation for llm                  arXiv preprint arXiv:2503.10049, 2025.
     agents,” arXiv preprint arXiv:2503.21760, 2025.                              [65] A. Rezazadeh, Z. Li, A. Lou, Y. Zhao, W. Wei, and Y. Bao, “Collabo-
[44] Y. Yu, H. Li, Z. Chen, Y. Jiang, Y. Li, J. W. Suchow, D. Zhang, and               rative memory: Multi-user memory sharing in llm agents with dynamic
     K. Khashanah, “Finmem: A performance-enhanced llm trading agent                   access control,” arXiv preprint arXiv:2505.18279, 2025.
     with layered memory and character design,” IEEE Transactions on Big          [66] B. Yan, C. Li, H. Qian, S. Lu, and Z. Liu, “General agentic memory
     Data, 2025.                                                                       via deep research,” arXiv preprint arXiv:2511.18423, 2025.
[45] Y. Hou, H. Tamoto, and H. Miyashita, “” my agent understands me              [67] Y. Zhang, W. Yuan, and Z. Jiang, “Bridging intuitive associations
     better”: Integrating dynamic human-like memory recall and consolida-              and deliberate recall: Empowering llm personal assistant with graph-
     tion in llm-based agents,” in Extended Abstracts of the CHI Conference            structured long-term memory,” in Findings of the Association for
     on Human Factors in Computing Systems, 2024.                                      Computational Linguistics: ACL 2025, 2025.
[46] M. Fisher, “Neural graph memory: A structured approach to long-term          [68] J. Liu, Z. Kong, C. Yang, F. Yang, T. Li, P. Dong, J. Nanjekye, H. Tang,
     memory in multimodal agents,” 2025.                                               G. Yuan, W. Niu et al., “Rcr-router: Efficient role-aware context routing
[47] Y. Cai, Z. Guo, Y. Pei, W. Bian, and W. Zheng, “Simgrag: Leveraging               for multi-agent llm systems with structured memory,” arXiv preprint
     similar subgraphs for knowledge graphs driven retrieval-augmented gen-            arXiv:2508.04903, 2025.
     eration,” in Findings of the Association for Computational Linguistics:      [69] Q. Yuan, J. Lou, Z. Li, J. Chen, Y. Lu, H. Lin, L. Sun, D. Zhang,
     ACL 2025, 2025.                                                                   and X. Han, “Memsearcher: Training llms to reason, search and
[48] X. Wu, Y. Shen, C. Shan, K. Song, S. Wang, B. Zhang, J. Feng,                     manage memory via end-to-end reinforcement learning,” arXiv preprint
     H. Cheng, W. Chen, Y. Xiong et al., “Can graph learning improve                   arXiv:2511.02805, 2025.
     planning in llm-based agents?” Advances in Neural Information                [70] X. Zhu, Y. Chen, H. Tian, C. Tao, W. Su, C. Yang, G. Huang, B. Li,
     Processing Systems, 2024.                                                         L. Lu, X. Wang et al., “Ghost in the minecraft: Generally capable
[49] H. Sun and S. Zeng, “Hierarchical memory for high-efficiency long-term            agents for open-world environments via large language models with
     reasoning in llm agents,” arXiv preprint arXiv:2507.22925, 2025.                  text-based knowledge and memory,” arXiv preprint arXiv:2305.17144,
[50] A. Jonelagadda, C. Hahn, H. Zheng, and S. Penachio, “Mnemosyne:                   2023.
     An unsupervised, human-inspired long-term memory architecture for            [71] D. Han, C. Couturier, D. M. Diaz, X. Zhang, V. Rühle, and S. Rajmohan,
     edge-based llms,” arXiv preprint arXiv:2510.08601, 2025.                          “Legomem: Modular procedural memory for multi-agent llm systems
[51] K. Zhang, X. Zhang, E. Ahmed, H. Jiang, C. Kumar, K. Sun, Z. Lin,                 for workflow automation,” arXiv preprint arXiv:2510.04851, 2025.
     S. Sharma, S. Oraby, A. Colak et al., “Assomem: Scalable memory qa           [72] Y. Wang and X. Chen, “Mirix: Multi-agent memory system for llm-
     with multi-signal associative retrieval,” arXiv preprint arXiv:2510.10397,        based agents,” arXiv preprint arXiv:2507.07957, 2025.
     2025.                                                                        [73] G. Zhang, M. Fu, and S. Yan, “Memgen: Weaving generative latent
[52] Z. Huang, Z. Tian, Q. Guo, F. Zhang, Y. Zhou, D. Jiang, and X. Zhou,              memory for self-evolving agents,” arXiv preprint arXiv:2509.24704,
     “Licomemory: Lightweight and cognitive agentic memory for efficient               2025.
     long-term reasoning,” arXiv preprint arXiv:2511.01448, 2025.                 [74] Z. Zhou, A. Qu, Z. Wu, S. Kim, A. Prakash, D. Rus, J. Zhao,
[53] H. Zhou, Y. Chen, S. Guo, X. Yan, K. H. Lee, Z. Wang, K. Y. Lee,                  B. K. H. Low, and P. P. Liang, “Mem1: Learning to synergize
     G. Zhang, K. Shao, L. Yang et al., “Memento: Fine-tuning llm agents               memory and reasoning for efficient long-horizon agents,” arXiv preprint
     without fine-tuning llms,” arXiv preprint arXiv:2508.16153, 2025.                 arXiv:2506.15841, 2025.
[54] S. Yan, X. Yang, Z. Huang, E. Nie, Z. Ding, Z. Li, X. Ma, K. Kersting,       [75] D. Edge, H. Trinh, N. Cheng, J. Bradley, A. Chao, A. Mody, S. Truitt,
     J. Z. Pan, H. Schütze et al., “Memory-r1: Enhancing large language               D. Metropolitansky, R. O. Ness, and J. Larson, “From local to global:
     model agents to manage and utilize memories via reinforcement                     A graph rag approach to query-focused summarization,” arXiv preprint
     learning,” arXiv preprint arXiv:2508.19828, 2025.                                 arXiv:2404.16130, 2024.
[55] S. Xia, Z. Xu, J. Chai, W. Fan, Y. Song, X. Wang, G. Yin, W. Lin,            [76] B. Kynoch, H. Latapie, and D. van der Sluis, “Recallm: An adaptable
     H. Zhang, and J. Wang, “From experience to strategy: Empowering llm               memory mechanism with temporal understanding for large language
     agents with trainable graph memory,” arXiv preprint arXiv:2511.07800,             models,” arXiv preprint arXiv:2307.02738, 2023.
     2025.                                                                        [77] X. Tang, T. Qin, T. Peng, Z. Zhou, D. Shao, T. Du, X. Wei, P. Xia,
[56] M. Xu, G. Liang, K. Chen, W. Wang, X. Zhou, M. Yang, T. Zhao,                     F. Wu, H. Zhu et al., “Agent kb: Leveraging cross-domain experience
     and M. Zhang, “Memory-augmented query reconstruction for llm-based                for agentic problem solving,” arXiv preprint arXiv:2507.06229, 2025.
     knowledge graph reasoning,” arXiv preprint arXiv:2503.05193, 2025.           [78] Z. Cai, X. Guo, Y. Pei, J. Feng, J. Su, J. Chen, Y.-Q. Zhang, W.-Y. Ma,
[57] Z. Tan, J. Yan, I.-H. Hsu, R. Han, Z. Wang, L. Le, Y. Song, Y. Chen,              M. Wang, and H. Zhou, “Flex: Continuous agent evolution via forward
     H. Palangi, G. Lee et al., “In prospect and retrospect: Reflective memory         learning from experience,” arXiv preprint arXiv:2511.06449, 2025.
     management for long-term personalized dialogue agents,” in Proceedings       [79] J. Sun, C. Xu, L. Tang, S. Wang, C. Lin, Y. Gong, L. Ni, H.-Y. Shum,
     of the 63rd Annual Meeting of the Association for Computational                   and J. Guo, “Think-on-graph: Deep and responsible reasoning of large
     Linguistics (Volume 1: Long Papers), 2025.                                        language model on knowledge graph,” in The Twelfth International
[58] T. Kim, V. François-Lavet, and M. Cochez, “Leveraging knowledge                  Conference on Learning Representations, 2024.
     graph-based human-like memory systems to solve partially observable          [80] Y. Xiao, C. Zhou, Q. Zhang, B. Li, Q. Li, and X. Huang, “Reliable
     markov decision processes,” arXiv preprint arXiv:2408.05861, 2024.                reasoning path: Distilling effective guidance for llm reasoning with
[59] R. Wang, S. Liang, Q. Chen, Y. Huang, M. Li, Y. Ma, D. Zhang,                     knowledge graphs,” IEEE Transactions on Knowledge and Data
     K. Qin, and M.-F. Leung, “Graphcogent: Mitigating llms’ working                   Engineering, 2026.
                                                                                                                                                               23



 [81] W. Zhong, L. Guo, Q. Gao, H. Ye, and Y. Wang, “Memorybank: En-              [105] J. Kim, W. Chay, H. Hwang, D. Kyung, H. Chung, E. Cho, Y. Jo,
      hancing large language models with long-term memory,” in Proceedings              and E. Choi, “Dialsim: A real-time simulator for evaluating long-term
      of the AAAI Conference on Artificial Intelligence, 2024.                          multi-party dialogue understanding of conversation systems,” arXiv
 [82] L. LUO, Y.-F. Li, G. Haffari, and S. Pan, “Reasoning on graphs: Faithful          preprint arXiv:2406.13144, 2024.
      and interpretable large language model reasoning,” in The Twelfth           [106] H. Bian, Z. Yao, S. Hu, Z. Xu, S. Zhang, Y. Guo, Z. Yang, X. Han,
      International Conference on Learning Representations, 2024.                       H. Wang, and R. Chen, “Realmem: Benchmarking llms in real-world
 [83] J. Kang, M. Ji, Z. Zhao, and T. Bai, “Memory os of ai agent,” arXiv               memory-driven interaction,” arXiv preprint arXiv:2601.06966, 2026.
      preprint arXiv:2506.06326, 2025.                                            [107] B. Jiang, Z. Hao, Y.-M. Cho, B. Li, Y. Yuan, S. Chen, L. Ungar, C. J.
 [84] Z. Xu, R. Zhou, Y. Yin, H. Gao, M. Tomizuka, and J. Li, “Matrix:                  Taylor, and D. Roth, “Know me, respond to me: Benchmarking llms
      multi-agent trajectory generation with diverse contexts,” in 2024 IEEE            for dynamic user profiling and personalized responses at scale,” arXiv
      International Conference on Robotics and Automation (ICRA), 2024.                 preprint arXiv:2504.14225, 2025.
 [85] Z. Gekhman, E. B. David, H. Orgad, E. Ofek, Y. Belinkov, I. Szpektor,       [108] Y. Du, H. Wang, Z. Zhao, B. Liang, B. Wang, W. Zhong, Z. Wang,
      J. Herzig, and R. Reichart, “Inside-out: Hidden factual knowledge in              and K.-F. Wong, “Perltqa: A personal long-term memory dataset for
      llms,” arXiv preprint arXiv:2503.15299, 2025.                                     memory classification, retrieval, and synthesis in question answering,”
 [86] G. Zhang, H. Ren, C. Zhan, Z. Zhou, J. Wang, H. Zhu, W. Zhou, and                 arXiv preprint arXiv:2402.16288, 2024.
      S. Yan, “Memevolve: Meta-evolution of agent memory systems,” arXiv          [109] Z. Zhang, Y. Zhang, H. Tan, R. Li, and X. Chen, “Explicit vs implicit
      preprint arXiv:2512.18746, 2025.                                                  memory: Exploring multi-hop complex reasoning over personalized
 [87] Moonshot AI, “Kimi k2.5,” 2026. [Online]. Available: https:                       information,” arXiv preprint arXiv:2508.13250, 2025.
      //www.kimi.com/blog/kimi-k2-5.html                                          [110] S. Zhao, M. Hong, Y. Liu, D. Hazarika, and K. Lin, “Do LLMs recognize
 [88] A. Zhao, D. Huang, Q. Xu, M. Lin, Y.-J. Liu, and G. Huang, “Expel:                your preferences? evaluating personalized preference following in
      Llm agents are experiential learners,” in Proceedings of the AAAI                 LLMs,” in The Thirteenth International Conference on Learning
      Conference on Artificial Intelligence, 2024.                                      Representations, 2025.
 [89] C. Yang, Z. Sun, W. Wei, and W. Hu, “Beyond static summariza-               [111] Z. Jia, Q. Liu, H. Li, Y. Chen, and J. Liu, “Evaluating the long-term
      tion: Proactive memory extraction for llm agents,” arXiv preprint                 memory of large language models,” in Findings of the Association for
      arXiv:2601.04463, 2026.                                                           Computational Linguistics: ACL 2025, 2025.
 [90] Y. Zhai, S. Tao, C. Chen, A. Zou, Z. Chen, Q. Fu, S. Mai, L. Yu,            [112] A. Miyai, Z. Zhao, K. Egashira, A. Sato, T. Sunada, S. Onohara, H. Ya-
      J. Deng, Z. Cao et al., “Agentevolver: Towards efficient self-evolving            manishi, M. Toyooka, K. Nishina, R. Maeda et al., “Webchorearena:
      agent system,” arXiv preprint arXiv:2511.10395, 2025.                             Evaluating web browsing agents on realistic tedious web tasks,” arXiv
 [91] B. J. Gutiérrez, Y. Shu, W. Qi, S. Zhou, and Y. Su, “From RAG to                 preprint arXiv:2506.01952, 2025.
      memory: Non-parametric continual learning for large language models,”       [113] Y. Deng, X. Zhang, W. Zhang, Y. Yuan, S. K. Ng, and T.-S. Chua,
      in Forty-second International Conference on Machine Learning, 2025.               “On the multi-turn instruction following for conversational web agents,”
 [92] V. Markovic, L. Obradovic, L. Hajdu, and J. Pavlovic, “Optimizing the             in Proceedings of the 62nd Annual Meeting of the Association for
      interface between knowledge graphs and llms for complex reasoning,”               Computational Linguistics (Volume 1: Long Papers), 2024.
      arXiv preprint arXiv:2505.24478, 2025.                                      [114] S. Yao, H. Chen, J. Yang, and K. Narasimhan, “Webshop: Towards
 [93] J. Fang, X. Deng, H. Xu, Z. Jiang, Y. Tang, Z. Xu, S. Deng, Y. Yao,               scalable real-world web interaction with grounded language agents,”
      M. Wang, S. Qiao et al., “Lightmem: Lightweight and efficient memory-             Advances in Neural Information Processing Systems, 2022.
      augmented generation,” arXiv preprint arXiv:2510.18866, 2025.               [115] S. Zhou, F. F. Xu, H. Zhu, X. Zhou, R. Lo, A. Sridhar, X. Cheng,
 [94] A. Maharana, D.-H. Lee, S. Tulyakov, M. Bansal, F. Barbieri, and                  T. Ou, Y. Bisk, D. Fried et al., “Webarena: A realistic web environment
      Y. Fang, “Evaluating very long-term conversational memory of LLM                  for building autonomous agents,” in 12th International Conference on
      agents,” in ACL, 2024.                                                            Learning Representations, ICLR 2024, 2024.
 [95] D. Wu, H. Wang, W. Yu, Y. Zhang, K.-W. Chang, and D. Yu,                    [116] S. Tian, Z. Zhang, L.-Y. Chen, and Z. Liu, “Mmina: Benchmarking
      “LongMemEval: Benchmarking chat assistants on long-term interactive               multihop multimodal internet agents,” in Findings of the Association
      memory,” in ICLR, 2025.                                                           for Computational Linguistics, 2025.
 [96] Y. Hu, Y. Wang, and J. McAuley, “Evaluating memory in llm agents via        [117] T. Kwiatkowski, J. Palomaki, O. Redfield, M. Collins, A. Parikh,
      incremental multi-turn interactions,” arXiv preprint arXiv:2507.05257,            C. Alberti, D. Epstein, I. Polosukhin, J. Devlin, K. Lee et al., “Natural
      2025.                                                                             questions: a benchmark for question answering research,” Transactions
 [97] D. Deshpande, V. Gangal, H. Mehta, A. Kannappan, R. Qian, and                     of the Association for Computational Linguistics, 2019.
      P. Wang, “Memtrack: Evaluating long-term memory and state track-            [118] M. Joshi, E. Choi, D. S. Weld, and L. Zettlemoyer, “Triviaqa: A large
      ing in multi-platform dynamic agent environments,” arXiv preprint                 scale distantly supervised challenge dataset for reading comprehension,”
      arXiv:2510.01353, 2025.                                                           in Proceedings of the 55th Annual Meeting of the Association for
 [98] J. He, L. Zhu, R. Wang, X. Wang, G. Haffari, and J. Zhang, “Madial-               Computational Linguistics (Volume 1: Long Papers), 2017.
      bench: Towards real-world evaluation of memory-augmented dialogue           [119] A. Mallen, A. Asai, V. Zhong, R. Das, D. Khashabi, and H. Hajishirzi,
      generation,” in Proceedings of the 2025 Conference of the Nations of              “When not to trust language models: Investigating effectiveness of
      the Americas Chapter of the Association for Computational Linguistics:            parametric and non-parametric memories,” in Proceedings of the 61st
      Human Language Technologies (Volume 1: Long Papers), 2025.                        Annual Meeting of the Association for Computational Linguistics
 [99] Z. Zhang, Q. Dai, L. Chen, Z. Jiang, R. Li, J. Zhu, X. Chen,                      (Volume 1: Long Papers), 2023.
      Y. Xie, Z. Dong, and J.-R. Wen, “Memsim: A bayesian simulator               [120] Z. Yang, P. Qi, S. Zhang, Y. Bengio, W. Cohen, R. Salakhutdinov, and
      for evaluating memory of llm-based personal assistants,” arXiv preprint           C. D. Manning, “Hotpotqa: A dataset for diverse, explainable multi-
      arXiv:2409.20163, 2024.                                                           hop question answering,” in Proceedings of the 2018 conference on
[100] B. Wu, W. Wang, L. Lihaoran, Y. Deng, Y. Li, J. Yu, and B. Wang,                  empirical methods in natural language processing, 2018.
      “Interpersonal memory matters: A new task for proactive dialogue            [121] X. Ho, A.-K. D. Nguyen, S. Sugawara, and A. Aizawa, “Constructing
      utilizing conversational history,” in Proceedings of the 29th Conference          a multi-hop qa dataset for comprehensive evaluation of reasoning steps,”
      on Computational Natural Language Learning, 2025.                                 in Proceedings of the 28th International Conference on Computational
[101] J. Xu, A. Szlam, and J. Weston, “Beyond goldfish memory: Long-term                Linguistics, 2020.
      open-domain conversation,” in Proceedings of the 60th annual meeting        [122] H. Trivedi, N. Balasubramanian, T. Khot, and A. Sabharwal, “Musique:
      of the association for computational linguistics (volume 1: long papers),         Multihop questions via single-hop question composition,” Transactions
      2022.                                                                             of the Association for Computational Linguistics, 2022.
[102] H. Xue, F. Tang, M. Hu, Y. Liu, Q. Huang, Y. Li, C. Liu, Z. Xu, C. Zhang,   [123] Y. Bai, X. Lv, J. Zhang, H. Lyu, J. Tang, Z. Huang, Z. Du, X. Liu,
      C.-M. Feng et al., “Mmrc: A large-scale benchmark for understanding               A. Zeng, L. Hou et al., “Longbench: A bilingual, multitask benchmark
      multimodal large language model in real-world conversation,” arXiv                for long context understanding,” in Proceedings of the 62nd annual
      preprint arXiv:2502.11903, 2025.                                                  meeting of the association for computational linguistics (volume 1:
[103] H. Tan, Z. Zhang, C. Ma, X. Chen, Q. Dai, and Z. Dong, “Membench:                 Long papers), 2024.
      Towards more comprehensive evaluation on the memory of llm-based            [124] Y. Bai, S. Tu, J. Zhang, H. Peng, X. Wang, X. Lv, S. Cao, J. Xu,
      agents,” arXiv preprint arXiv:2506.21605, 2025.                                   L. Hou, Y. Dong et al., “Longbench v2: Towards deeper understanding
[104] L. Wan and W. Ma, “Storybench: A dynamic benchmark for evaluating                 and reasoning on realistic long-context multitasks,” in Proceedings of the
      long-term memory with multi turns,” arXiv preprint arXiv:2506.13356,              63rd Annual Meeting of the Association for Computational Linguistics
      2025.                                                                             (Volume 1: Long Papers), 2025.
                                                                                                                                                              24



[125] C.-P. Hsieh, S. Sun, S. Kriman, S. Acharya, D. Rekesh, F. Jia, and           [145] Z. Huang, S. Gutierrez, H. Kamana, and S. MacNeil, “Memory sandbox:
      B. Ginsburg, “RULER: What’s the real context size of your long-context             Transparent and interactive memory management for conversational
      language models?” in First Conference on Language Modeling, 2024.                  agents,” in Adjunct Proceedings of the 36th Annual ACM Symposium
[126] Y. Kuratov, A. Bulatov, P. Anokhin, I. Rodkin, D. Sorokin, A. Sorokin,             on User Interface Software and Technology, 2023.
      and M. Burtsev, “Babilong: Testing the limits of llms with long context      [146] H. Li, C. Yang, A. Zhang, Y. Deng, X. Wang, and T.-S. Chua, “Hello
      reasoning-in-a-haystack,” Advances in Neural Information Processing                again! llm-powered personalized agent for long-term dialogue,” in
      Systems, 2024.                                                                     Proceedings of the 2025 Conference of the Nations of the Americas
[127] H. Wang, H. Shi, S. Tan, W. Qin, W. Wang, T. Zhang, A. Nambi, T. Ganu,             Chapter of the Association for Computational Linguistics: Human
      and H. Wang, “Multimodal needle in a haystack: Benchmarking long-                  Language Technologies (Volume 1: Long Papers), 2025.
      context capability of multimodal large language models,” in Proceedings      [147] Z. Pan, Q. Wu, H. Jiang, X. Luo, H. Cheng, D. Li, Y. Yang, C.-Y. Lin,
      of the 2025 Conference of the Nations of the Americas Chapter                      H. V. Zhao, L. Qiu, and J. Gao, “Secom: On memory construction and
      of the Association for Computational Linguistics: Human Language                   retrieval for personalized conversational agents,” in ICLR, 2025.
      Technologies (Volume 1: Long Papers), 2025.                                  [148] Y. Dong, X. Jiang, J. Qian, T. Wang, K. Zhang, Z. Jin, and G. Li,
[128] D. Chen, S. Niu, K. Li, P. Liu, X. Zheng, B. Tang, X. Li, F. Xiong,                “A survey on code generation with llm-based agents,” arXiv preprint
      and Z. Li, “Halumem: Evaluating hallucinations in memory systems of                arXiv:2508.00083, 2025.
      agents,” arXiv preprint arXiv:2511.03506, 2025.                              [149] M. A. Islam, M. E. Ali, and M. R. Parvez, “Codesim: Multi-agent code
[129] Q. Ai, Y. Tang, C. Wang, J. Long, W. Su, and Y. Liu, “Memorybench:                 generation and problem solving through simulation-driven planning and
      A benchmark for memory and continual learning in llm systems,” arXiv               debugging,” arXiv preprint arXiv:2502.05664, 2025.
      preprint arXiv:2510.17281, 2025.                                             [150] S. Hong, M. Zhuge, J. Chen, X. Zheng, Y. Cheng, J. Wang, C. Zhang,
[130] J. Zheng, X. Cai, Q. Li, D. Zhang, Z. Li, Y. Zhang, L. Song, and Q. Ma,            Z. Wang, S. K. S. Yau, Z. Lin et al., “Metagpt: Meta programming for
      “Lifelongagentbench: Evaluating llm agents as lifelong learners,” arXiv            a multi-agent collaborative framework,” in The Twelfth International
      preprint arXiv:2505.11942, 2025.                                                   Conference on Learning Representations, 2023.
[131] C.-K. Wu, Z. R. Tam, C.-Y. Lin, Y.-N. Chen, and H.-y. Lee, “Stream-          [151] C. Qian, W. Liu, H. Liu, N. Chen, Y. Dang, J. Li, C. Yang, W. Chen,
      bench: Towards benchmarking continuous improvement of language                     Y. Su, X. Cong et al., “Chatdev: Communicative agents for software
      agents,” Advances in Neural Information Processing Systems, 2024.                  development,” in Proceedings of the 62nd Annual Meeting of the
[132] T. Wei, N. Sachdeva, B. Coleman, Z. He, Y. Bei, X. Ning, M. Ai, Y. Li,             Association for Computational Linguistics (Volume 1: Long Papers),
      J. He, E. H. Chi et al., “Evo-memory: Benchmarking llm agent test-time             2024.
      learning with self-evolving memory,” arXiv preprint arXiv:2511.20857,        [152] M.-T. Shen and Y.-J. Joung, “Talm: Dynamic tree-structured multi-agent
      2025.                                                                              framework with long-term memory for scalable code generation,” arXiv
[133] K. Grauman, A. Westbury, E. Byrne, Z. Chavis, A. Furnari, R. Girdhar,              preprint arXiv:2510.23010, 2025.
      J. Hamburger, H. Jiang, M. Liu, X. Liu et al., “Ego4d: Around the world      [153] N. Shinn, F. Cassano, A. Gopinath, K. Narasimhan, and S. Yao, “Re-
      in 3,000 hours of egocentric video,” in Proceedings of the IEEE/CVF                flexion: Language agents with verbal reinforcement learning,” Advances
      conference on computer vision and pattern recognition, 2022.                       in Neural Information Processing Systems, 2023.
                                                                                   [154] J. Guo, C. Wang, X. Xu, Z. Su, and X. Zhang, “Repoaudit: An
[134] J. Yang, S. Liu, H. Guo, Y. Dong, X. Zhang, S. Zhang, P. Wang, Z. Zhou,
                                                                                         autonomous llm-agent for repository-level code auditing,” arXiv preprint
      B. Xie, Z. Wang et al., “Egolife: Towards egocentric life assistant,” in
                                                                                         arXiv:2501.18160, 2025.
      Proceedings of the Computer Vision and Pattern Recognition Conference,
                                                                                   [155] Q. Wang, Z. Cheng, S. Zhang, F. Liu, R. Xu, H. Lian, K. Wang,
      2025.
                                                                                         X. Yu, J. Yin, S. Hu et al., “Memgovern: Enhancing code agents
[135] M. Shridhar, X. Yuan, M.-A. Cote, Y. Bisk, A. Trischler, and
                                                                                         through learning from governed human experiences,” arXiv preprint
      M. Hausknecht, “{ALFW}orld: Aligning text and embodied environ-
                                                                                         arXiv:2601.06789, 2026.
      ments for interactive learning,” in International Conference on Learning
                                                                                   [156] A. Krishnamoorthy, K. Ivatury, and B. Ahmadnia, “Multi-agent rein-
      Representations, 2021.
                                                                                         forcement learning for interactive code debugging with human feedback
[136] M. Chevalier-Boisvert, D. Bahdanau, S. Lahlou, L. Willems, C. Saharia,             and memory,” in Proceedings of the 15th International Conference on
      T. H. Nguyen, and Y. Bengio, “BabyAI: First steps towards grounded                 Recent Advances in Natural Language Processing-Natural Language
      language learning with a human in the loop,” in International Conference           Processing in the Generative AI Era, 2025.
      on Learning Representations, 2019.                                           [157] S. Cai, J. Zhang, K. Bao, C. Gao, Q. Wang, F. Feng, and X. He, “Agentic
[137] R. Wang, P. Jansen, M.-A. Côté, and P. Ammanabrolu, “Scienceworld:               feedback loop modeling improves recommendation and user simulation,”
      Is your agent smarter than a 5th grader?” in Proceedings of the 2022               in Proceedings of the 48th International ACM SIGIR conference on
      Conference on Empirical Methods in Natural Language Processing,                    Research and Development in Information Retrieval, 2025.
      2022.                                                                        [158] F. Liu, X. Lin, H. Yu, M. Wu, J. Wang, Q. Zhang, Z. Zhao, Y. Xia,
[138] Z. Xi, Y. Ding, W. Chen, B. Hong, H. Guo, J. Wang, X. Guo, D. Yang,                Y. Zhang, W. Li et al., “Recoworld: Building simulated environments
      C. Liao, W. He et al., “Agentgym: Evaluating and training large language           for agentic recommender systems,” arXiv preprint arXiv:2509.10397,
      model-based agents across diverse environments,” in Proceedings of the             2025.
      63rd Annual Meeting of the Association for Computational Linguistics         [159] J. Chen, “Memory assisted llm for personalized recommendation system,”
      (Volume 1: Long Papers), 2025.                                                     arXiv preprint arXiv:2505.03824, 2025.
[139] M. Chang, J. Zhang, Z. Zhu, C. Yang, Y. Yang, Y. Jin, Z. Lan, L. Kong,       [160] J. Liu, S. Gu, D. Li, G. Zhang, M. Han, H. Gu, P. Zhang, T. Lu,
      and J. He, “Agentboard: An analytical evaluation board of multi-turn               L. Shang, and N. Gu, “Agentcf++: Memory-enhanced llm-based agents
      llm agents,” Advances in neural information processing systems, 2024.              for popularity-aware cross-domain recommendations,” in Proceedings
[140] C. E. Jimenez, J. Yang, A. Wettig, S. Yao, K. Pei, O. Press, and K. R.             of the 48th International ACM SIGIR Conference on Research and
      Narasimhan, “SWE-bench: Can language models resolve real-world                     Development in Information Retrieval, 2025.
      github issues?” in The Twelfth International Conference on Learning          [161] Y. Xi, W. Liu, J. Lin, B. Chen, R. Tang, W. Zhang, and Y. Yu, “Memocrs:
      Representations, 2024.                                                             Memory-enhanced sequential conversational recommender systems with
[141] G. Mialon, C. Fourrier, T. Wolf, Y. LeCun, and T. Scialom, “Gaia:                  large language models,” in Proceedings of the 33rd ACM International
      a benchmark for general ai assistants,” in The Twelfth International               Conference on Information and Knowledge Management, 2024.
      Conference on Learning Representations, 2023.                                [162] A. Zhang, Y. Chen, L. Sheng, X. Wang, and T.-S. Chua, “On generative
[142] K. Chen, Y. Ren, Y. Liu, X. Hu, H. Tian, T. Xie, F. Liu, H. Zhang,                 agents in recommendation,” in Proceedings of the 47th international
      H. Liu, Y. Gong et al., “xbench: Tracking agents productivity scal-                ACM SIGIR conference on research and development in Information
      ing with profession-aligned real-world evaluations,” arXiv preprint                Retrieval, 2024.
      arXiv:2506.13651, 2025.                                                      [163] Y. Zhu, H. Steck, D. Liang, Y. He, N. Kallus, and J. Li, “Llm-based
[143] Y. Qin, S. Liang, Y. Ye, K. Zhu, L. Yan, Y. Lu, Y. Lin, X. Cong, X. Tang,          conversational recommendation agents with collaborative verbalized
      B. Qian, S. Zhao, L. Hong, R. Tian, R. Xie, J. Zhou, M. Gerstein,                  experience,” Proceedings of the Proc. of EMNLP Findings, 2025.
      dahai li, Z. Liu, and M. Sun, “ToolLLM: Facilitating large language          [164] J. Zhang, Y. Hou, R. Xie, W. Sun, J. McAuley, W. X. Zhao, L. Lin, and
      models to master 16000+ real-world APIs,” in The Twelfth International             J.-R. Wen, “Agentcf: Collaborative learning with autonomous language
      Conference on Learning Representations, 2024.                                      agents for recommender systems,” in Proceedings of the ACM Web
[144] B. Li, Z. Lin, D. Pathak, J. Li, Y. Fei, K. Wu, T. Ling, X. Xia, P. Zhang,         Conference 2024, 2024.
      G. Neubig et al., “Genai-bench: Evaluating and improving compositional       [165] Y. Wang, Z. Jiang, Z. Chen, F. Yang, Y. Zhou, E. Cho, X. Fan, Y. Lu,
      text-to-visual generation,” arXiv preprint arXiv:2406.13743, 2024.                 X. Huang, and Y. Yang, “Recmind: Large language model powered agent
                                                                                                                                                            25



      for recommendation,” in Findings of the Association for Computational     [187] K. Huang, S. Zhang, H. Wang, Y. Qu, Y. Lu, Y. Roohani, R. Li, L. Qiu,
      Linguistics: NAACL 2024, 2024.                                                  G. Li, J. Zhang et al., “Biomni: A general-purpose biomedical ai agent,”
[166] T. Guo, C. Liu, H. Wang, V. Mannam, F. Wang, X. Chen, X. Zhang,                 biorxiv, 2025.
      and C. K. Reddy, “Knowledge graph enhanced language agents for            [188] Z. Zhang, Z. Ren, C.-W. Hsu, W. Chen, Z.-W. Hong, C.-F. Lee, A. Penn,
      recommendation,” arXiv preprint arXiv:2410.19627, 2024.                         H. Xu, D. J. Zheng, S. Miao et al., “A multimodal robotic platform for
[167] J. Huang, X. Zou, L. Xia, and Q. Li, “Mr. rec: Synergizing memory               multi-element electrocatalyst discovery,” Nature, 2025.
      and reasoning for personalized recommendation assistant with llms,”       [189] K. Swanson, W. Wu, N. L. Bulaong, J. E. Pak, and J. Zou, “The virtual
      arXiv preprint arXiv:2510.14629, 2025.                                          lab of AI agents designs new SARS-CoV-2nanobodies,” Nature, 2025.
[168] H. Li, Y. Cao, Y. Yu, S. R. Javaji, Z. Deng, Y. He, Y. Jiang, Z. Zhu,     [190] Z. Xiong, Y. Lin, W. Xie, P. He, J. Tang, H. Lakkaraju, and Z. Xiang,
      K. Subbalakshmi, J. Huang et al., “Investorbench: A benchmark for               “How memory management impacts llm agents: An empirical study
      financial decision-making tasks with llm-based agent,” in Proceedings           of experience-following behavior,” arXiv preprint arXiv:2505.16067,
      of the 63rd Annual Meeting of the Association for Computational                 2025.
      Linguistics (Volume 1: Long Papers), 2025.                                [191] Y. Bei, W. Zhang, S. Wang, W. Chen, S. Zhou, H. Chen, Y. Li, J. Bu,
[169] Y. Li, Y. Yu, H. Li, Z. Chen, and K. Khashanah, “Tradinggpt: Multi-             S. Pan, Y. Yu et al., “Graphs meet ai agents: Taxonomy, progress, and
      agent system with layered memory and distinct characters for enhanced           future opportunities,” arXiv preprint arXiv:2506.18019, 2025.
      financial trading performance,” arXiv preprint arXiv:2309.03736, 2023.    [192] Y. Du, W. Huang, D. Zheng, Z. Wang, S. Montella, M. Lapata, K.-F.
                                                                                      Wong, and J. Z. Pan, “Rethinking memory in ai: Taxonomy, operations,
[170] Y. Yu, Z. Yao, H. Li, Z. Deng, Y. Jiang, Y. Cao, Z. Chen, J. Suchow,
                                                                                      topics, and future directions,” arXiv preprint arXiv:2505.00675, 2025.
      Z. Cui, R. Liu et al., “Fincon: A synthesized llm multi-agent system
                                                                                [193] J. Leskovec, K. J. Lang, A. Dasgupta, and M. W. Mahoney, “Community
      with conceptual verbal reinforcement for enhanced financial decision
                                                                                      structure in large networks: Natural cluster sizes and the absence of
      making,” Advances in Neural Information Processing Systems, 2024.
                                                                                      large well-defined clusters,” Internet Mathematics, 2009.
[171] W. Zhang, L. Zhao, H. Xia, S. Sun, J. Sun, M. Qin, X. Li, Y. Zhao,        [194] W. Fan, C. Hu, and C. Tian, “Incremental graph computations:
      Y. Zhao, X. Cai et al., “A multimodal foundation agent for financial            Doable and undoable,” in Proceedings of the 2017 ACM International
      trading: Tool-augmented, diversified, and generalist,” in Proceedings           Conference on Management of Data, 2017.
      of the 30th acm sigkdd conference on knowledge discovery and data         [195] Y. A. Malkov and D. A. Yashunin, “Efficient and robust approximate
      mining, 2024.                                                                   nearest neighbor search using hierarchical navigable small world graphs,”
[172] Z. Wang, S. Cai, A. Liu, Y. Jin, J. Hou, B. Zhang, H. Lin, Z. He,               IEEE transactions on pattern analysis and machine intelligence, 2018.
      Z. Zheng, Y. Yang et al., “Jarvis-1: Open-world multi-task agents with    [196] J. Ahn, S. Hong, S. Yoo, O. Mutlu, and K. Choi, “A scalable processing-
      memory-augmented multimodal language models,” IEEE Transactions                 in-memory accelerator for parallel graph processing,” in Proceedings
      on Pattern Analysis and Machine Intelligence, 2024.                             of the 42nd annual international symposium on computer architecture,
[173] M. A. Raad, A. Ahuja, C. Barros, F. Besse, A. Bolt, A. Bolton,                  2015.
      B. Brownfield, G. Buttimore, M. Cant, S. Chakera et al., “Scaling         [197] Y. Shao, H. Li, X. Gu, H. Yin, Y. Li, X. Miao, W. Zhang, B. Cui, and
      instructable agents across many simulated worlds,” arXiv preprint               L. Chen, “Distributed graph neural network training: A survey,” ACM
      arXiv:2404.10179, 2024.                                                         Computing Surveys, 2024.
[174] A. Bolton, A. Lerchner, A. Cordell, A. Moufarek, A. Bolt, A. Lampinen,    [198] T. T. Mueller, D. Usynin, J. C. Paetzold, D. Rueckert, and G. Kaissis,
      A. Mitenkova, A. O. Hallingstad, B. Vujatovic, B. Li et al., “Sima              “Sok: Differential privacy on graph-structured data,” arXiv preprint
      2: A generalist embodied agent for virtual worlds,” arXiv preprint              arXiv:2203.09205, 2022.
      arXiv:2512.04797, 2025.                                                   [199] A. Zou, Z. Wang, N. Carlini, M. Nasr, J. Z. Kolter, and M. Fredrikson,
[175] G. Sarch, Y. Wu, M. Tarr, and K. Fragkiadaki, “Open-ended instructable          “Universal and transferable adversarial attacks on aligned language
      embodied agents with memory-augmented large language models,” in                models,” arXiv preprint arXiv:2307.15043, 2023.
      Findings of the Association for Computational Linguistics: EMNLP          [200] N. Carlini, M. Jagielski, C. A. Choquette-Choo, D. Paleka, W. Pearce,
      2023, 2023.                                                                     H. Anderson, A. Terzis, K. Thomas, and F. Tramèr, “Poisoning web-
[176] R. Li, W. Guo, Z. Wu, C. Wang, H. Deng, Z. Weng, Y.-P.                          scale training datasets is practical,” in 2024 IEEE Symposium on Security
      Tan, and Z. Wang, “Map-VLA: Memory-augmented prompting for                      and Privacy (SP), 2024.
      vision-language-action model in robotic manipulation,” arXiv preprint     [201] C. Finn, P. Abbeel, and S. Levine, “Model-agnostic meta-learning for
      arXiv:2511.09516, 2025.                                                         fast adaptation of deep networks,” in ICML, 2017.
[177] M. Memmel, J. Berg, B. Chen, A. Gupta, and J. Francis, “STRAP:            [202] A. Hogan, E. Blomqvist, M. Cochez, C. d’Amato, G. D. Melo,
      Robot sub-trajectory retrieval for augmented policy learning,” in ICLR,         C. Gutierrez, S. Kirrane, J. E. L. Gayo, R. Navigli, S. Neumaier et al.,
      2025.                                                                           “Knowledge graphs,” ACM Computing Surveys, 2021.
[178] J. Liu, Y. Qi, J. Zhang, M. Li, S. Wang, K. Wu, H. Ye, H. Zhang,          [203] P. W. Battaglia, J. B. Hamrick, V. Bapst, A. Sanchez-Gonzalez,
      Z. Chen, F. Zhong et al., “TrackVLA++: Unleashing reasoning and                 V. Zambaldi, M. Malinowski, A. Tacchetti, D. Raposo, A. Santoro,
      memory capabilities in VLA models for embodied visual tracking,”                R. Faulkner et al., “Relational inductive biases, deep learning, and
      arXiv preprint arXiv:2510.07134, 2025.                                          graph networks,” arXiv preprint arXiv:1806.01261, 2018.
[179] S. Schmidgall, R. Ziaei, C. Harris, E. Reis, J. Jopling, and M. Moor,     [204] J. Kaplan, S. McCandlish, T. Henighan, T. B. Brown, B. Chess, R. Child,
      “Agentclinic: A multimodal agent benchmark to evaluate AI in simulated          S. Gray, A. Radford, J. Wu, and D. Amodei, “Scaling laws for neural
      clinical environments,” arXiv preprint arXiv:2405.07960, 2024.                  language models,” arXiv preprint arXiv:2001.08361, 2020.
[180] J. Hu, A. Wang, Q. Xie, H. Ma, Z. Li, and D. Guo, “Agentmental: An        [205] D. Hassabis, D. Kumaran, C. Summerfield, and M. Botvinick,
      interactive multi-agent framework for explainable and adaptive mental           “Neuroscience-inspired artificial intelligence,” Neuron, 2017.
      health assessment,” arXiv preprint arXiv:2508.11567, 2025.
[181] J. Li, Y. Lai, W. Li, J. Ren, M. Zhang, X. Kang, S. Wang, P. Li, Y.-Q.
      Zhang, W. Ma et al., “Agent hospital: A simulacrum of hospital with
      evolvable medical agents,” arXiv preprint arXiv:2405.02957, 2024.
[182] O. Bodenreider, “The unified medical language system (umls): integrat-
      ing biomedical terminology,” Nucleic acids research, 2004.
[183] M. Moritz, E. Topol, and P. Rajpurkar, “Coordinated ai agents for
      advancing healthcare,” Nature Biomedical Engineering, 2025.
[184] B. P. de Almeida, G. Richard, H. Dalla-Torre, C. Blum, L. Hexemer,
      P. Pandey, S. Laurent, C. Rajesh, M. Lopez, A. Laterre et al., “A
      multimodal conversational agent for dna, rna and protein tasks,” Nature
      Machine Intelligence, 2025.
[185] A. M. Bran, S. Cox, O. Schilter, C. Baldassari, A. D. White, and
      P. Schwaller, “Augmenting large language models with chemistry tools,”
      Nature Machine Intelligence, 2024.
[186] Y. Zou, A. H. Cheng, A. Aldossary, J. Bai, S. X. Leong, J. A. Campos-
      Gonzalez-Angulo, C. Choi, C. T. Ser, G. Tom, A. Wang et al., “El
      agente: An autonomous agent for quantum chemistry,” Matter, 2025.
                                                                                                                                  26



                         A PPENDIX A                               individual vertices, while neighborhood relations are induced by
                       P RELIMINARIES                              shared hyperedge membership rather than pairwise adjacency.
   This section provides foundational concepts and formal               d) Graph Variants: Several commonly used graph variants
definitions necessary for understanding graph-based agent          can  be  viewed as task-driven instantiations of the unified
memory systems. Since graphs serve as the fundamental              representation   G = (V, E, X), obtained by imposing specific
structure, we begin with graph theory fundamentals, then           constraints on  node  and edge definitions. Binary graphs restrict
introduce LLM-based agent architectures, and finally formalize     edge  values  to A ij ∈ {0, 1} and model relation existence only.

memory components. Before we give the formal definitions,          Text-attributed   graphs    associate nodes with textual features,
the frequent symbols are listed in Table II                        enabling  language-aware    representation   learning. Chunk-based
                                                                   graphs further decompose text into finer-grained units as
                                                                   nodes, with edges encoding contextual or semantic connec-
A. Graph Foundations                                               tions. Hierarchical graphs introduce structural constraints
      a) Graph Definition: We define a graph as G = to represent multi-level relationships. These variants share
(V, E, X), where V denotes a set of nodes, E ⊆ V × V the same underlying graph formulation and differ only in
denotes a set of edges encoding pairwise relations between how V , E, and X are instantiated for practical modeling
nodes, and X denotes node-associated features.                     purposes. These graph variants provide flexible abstractions for
   The graph structure is represented by an adjacency matrix retrieval, representation learning, and classification. In agent
A ∈ R|V |×|V | , where each entry Aij characterizes the relation graph memory systems, they support efficient organization and
between nodes vi and vj . If Aij ∈ {0, 1}, the graph is reasoning over heterogeneous information while maintaining a
unweighted and indicates the absence or presence of an edge. unified structural foundation.
If Aij ∈ R, the graph is weighted, and the corresponding edge         2) Graph Algorithms:
weight is denoted by wij .                                              a) Graph Embeddings: Graph embeddings aim to en-
   Node features X may consist of continuous vectors or code nodes into continuous vector spaces while preserving
unstructured texts. In text-attributed graphs, X corresponds to graph structural or semantic information. Given a graph
textual descriptions associated with nodes, and edge relations G = (V, E, X), node embeddings are defined as a mapping
are typically binary and undirected, such that eij = eji . In                                 f : V → Rd ,
knowledge graphs, node features may be represented as texts
or vectors, while edges encode semantic relations and are where each node vi ∈ V is associated with a d-dimensional
generally directed, such that eij ̸= eji . Knowledge graphs representation hi = f (vi ).
                                                                        b) Topology-based embeddings.: A representative tradi-
extensively use edge labels to represent relationship types (e.g.,
                                                                   tional approach is Node2Vec, which learns node embeddings
”located in,” ”has property”). When edge weights are present,
                                                                   by optimizing a Skip-gram objective over node sequences
they further quantify the strength or confidence of relations.
                                                                   generated by biased random walks. Formally, the embedding
   1) Different Graphs:
                                                                   hi is learned by maximizing log Pr(vj | vi ):
      a) Knowledge Graph: A knowledge graph is an instantia-
tion of the unified graph representation G = (V, E, X) in which                                         exp(h⊤ i hj )
                                                                                  Pr(vj | vi ) = P                 ⊤h )
                                                                                                                          ,
nodes correspond to entities and edges encode typed semantic                                          vk ∈V exp(h  i k
relations. It is commonly formalized as G = (E, R, T ), where where N (v ) denotes the context nodes of v induced by biased
                                                                            l i                                      i
E denotes entities, R denotes relation types, and T ⊆ E ×R×E random walks of length l. This formulation captures graph
is a set of relational triples. Each triple (h, r, t) corresponds structure through node co-occurrence patterns.
to a directed edge eij from vi = h to vj = t, with relation             c) GNN-based embeddings.: Graph Neural Networks
semantics attached to the edge. Knowledge graphs are typically compute node embeddings via iterative neighborhood aggrega-
directed and multi-relational, with node features X represented tion. At layer k, the embedding of node v is updated as
                                                                                                                    i
as textual descriptions, learned embeddings, or both.                                                                       
                                                                         (k+1)                               (k)
      b) Temporal Graph: A temporal graph extends the                  hi       = σ W(k) · AGG(k) {hj | vj ∈ N (vi )} ,
static graph G = (V, E, X) by associating edges with time-
                                                                   where AGG(·) is a permutation-invariant aggregation function,
dependent information drawn from a time domain T . Each
                                                                   W(k) is a learnable parameter matrix, and σ(·) denotes a
edge eij ∈ E is linked to a timestamp or interval τ (eij ) ⊆ T ,
                                                                   non-linear activation.
enabling the adjacency structure Aij to vary over time. This          LM-based embeddings. For a text-attributed node vi with
formulation supports dynamic neighborhood definitions and associated token sequence X , a Transformer-based language
                                                                                                    i
temporal reasoning over evolving interactions, event sequences, model encodes the input as
and state transitions, while preserving the same node feature
representation X.                                                                        Hi = Transformer(Xi ),
      c) Hypergraph: A hypergraph generalizes the pairwise where Hi ∈ RL×d denotes the final-layer token representations.
edge structure of G = (V, E, X) by allowing each edge to The node embedding is defined as
connect more than two nodes. Formally, edges are defined as
subsets of vertices, i.e., E ⊆ 2V , enabling the representation                               hi = Hi,[CLS] ,
of higher-order and multi-way relations that cannot be reduced i.e., the representation of the special classification token,
to binary interactions. Node features X remain associated with following standard practice in BERT-style models.
                                                                                                                                                     27



                                                     TABLE II: Notations for Graph Foundations
                      Symbol          Formal Definition            Meaning
                      G               G = (V, E, X)                Graph represented by node set, edge set, and node features
                      V               V = {v1 , . . . , v|V | }    Set of nodes (vertices)
                      E               E ⊆V ×V                      Set of edges encoding pairwise relations between nodes
                      X               X∈X                          Node feature set, consisting of vectors or unstructured texts
                      vi , vj         vi , v j ∈ V                 The i-th and j-th nodes
                      eij             eij = (vi , vj )             Edge from node vi to node vj
                      N (vi )         N (vi ) = {vj | eij ∈ E}     Neighborhood set of node vi
                      d(vi )          d(vi ) = |N (vi )|           Degree of node vi
                      A               A ∈ R|V |×|V |               Adjacency matrix representing graph structure
                      Aij             Aij ∈ {0, 1} or R            Adjacency matrix entry encoding the relation between vi and vj
                      wij             wij ∈ R                      Weight associated with edge eij (if applicable)
                      hi              hi ∈ R d                     d-dimensional embedding of node vi


                                                                                  Symbol      Description
      d) Graph Traversal: Graph traversal methods define
                                                                                  A           LLM-based agent
systematic or stochastic procedures for exploring the topology                    S           Environment state space
of a graph G = (V, E), with the goal of discovering reachable                     st          Environment state at time step t
nodes, structural paths, or task-relevant subgraphs that support                  Q           Task specification
retrieval, reasoning, and representation learning.                                t           Discrete interaction time step
                                                                                  at          Action selected by the agent at time t
• Breadth-first search (BFS) explores the graph in increas-
                                                                                  ot          Partial observation received by the agent at time t
  ing order of shortest-path distance from a source node                          rt          Feedback or reward signal at time t
  vi , iteratively visiting nodes in successive neighborhoods                     ht          Agent interaction history up to time t
  N1 (vi ), N2 (vi ), . . . , and is commonly used for local neigh-               Ψ           Environment transition process
  borhood expansion and shortest-path discovery in unweighted                     O(·)        Observation function
                                                                                  Mθ          Parameterized LLM policy with parameters θ
  graphs.                                                                         M           Agent memory module
• Depth-first search (DFS) recursively explores a path by                         ct          Retrieved memory context at time t
  traversing adjacent nodes as deeply as possible before back-                    qt          Memory query derived from task or observation
  tracking, enabling efficient enumeration of paths, connectivity                 MG          Graph-based memory module
  analysis, and cycle detection.                                                  Gt          Memory graph at time t
                                                                                  Vt          Set of memory nodes at time t
• Random walk defines a stochastic traversal process where
                                                                                  Et          Set of edges (relations) at time t
  a node sequence (v0 , v1 , . . . , vk ) is generated according to               Xt          Node and edge attributes of the memory graph
  transition probabilities                                                        vi          A memory node
                                                                                  eij         A directed or undirected relation between vi and vj
                                                   Av j v                         D           Static corpus/experience set for memory construction
               p(vj+1 = v | vj ) = P                           ,                  ∆t          Online memory update signal (ot , at , rt )
                                             u∈N (vj ) Avj u
                                                                                TABLE III: Notation used in the agent interaction loop and
  and serves as the theoretical foundation for classical node                   graph-based memory framework.
  embedding methods.
• Shortest-path traversal seeks a path P            = ⟨v0 =
  s, . . . , vk = t⟩ that minimizes the accumulated edge weight
                                                                                  1) Agent System: An LLM-based agent is a decision-
                            k−1
                            X                                                   making system that employs a large language model as its
                                      wvi vi+1 ,                                central reasoning component to interact with an environment
                                i=0                                             and accomplish a given task. Formally, an agent A operates
    where wij denotes the weight associated with edge eij .                     over an environment with state space S and task specification
•   Subgraph extraction identifies a local induced subgraph                     Q.
    centered at vi , typically defined as the k-hop neighborhood                  At each time step t, the agent selects an action at that drives
                                                                                the evolution of the environment via a transition process Ψ,
                Nk (vi ) = {vj ∈ V | d(vi , vj ) ≤ k},                          based on partial observations ot rather than full access to the
                                                                                underlying state. The agent’s behavior is governed by a policy
    which is widely used for localized retrieval and downstream                 induced by a parameterized language model, which integrates
    graph-based modeling.                                                       observations, interaction history ht , and optionally external
                                                                                memory or tools to support reasoning and decision-making,
                                                                                while the concrete operational procedures are specified by the
B. LLM-based Agents                                                             agent interaction loop introduced subsequently.
   Table III summarizes the key symbols used in the agent                            a) Agent Interaction Loop: Specifically, during the time
system and graph-based memory formulation, together with                        step t, the agent interacts with the environment through a
their semantic interpretations.                                                 structured perception–retrieval–reasoning–action-update loop:
                                                                                                                                   28



•   Perception. The agent receives an observation                     1) Memory as Graph Format: We formalize graph-based
                                                                    agent memory as a dynamic attributed graph
                         ot = O(st , ht , Q),
                                                                                      MG ≜ Gt = (Vt , Et , Xt ),
  which encodes partial information about the environment
  state st under task specification Q.                              where Vt denotes the set of memory nodes, Et ⊆ Vt × Vt
• Retrieval. Given the current observation and interaction          denotes the set of relations between nodes, and Xt represents
  history, the agent queries its external memory:                   node- and edge-associated attributes. This formulation is
                                                                    consistent with the basic graph foundation introduced earlier,
                     ct = Retrieve(M, ot , ht ),                    while allowing task-specific instantiations.
    where ct denotes the retrieved contextual information.             In details, each node vi ∈ Vt corresponds to a memory unit,
•   Reasoning. The LLM backbone integrates the observation,         such as an entity, event, concept, or textual chunk. Each edge
    retrieved memory, and history to perform reasoning and          eij ∈ Et represents a relation between memory units, which
    decision-making:                                                may encode semantic, temporal, or causal dependencies. Node
                                                                    attributes Xt (vi ) typically include textual content or vector
                        at ∼ Mθ (ot , ct , ht ).                    embeddings, while edge attributes may include relation types,
• Action. The selected action at is executed in the environment,    confidence scores, or temporal information.
    inducing a state transition                                        2) Graph Memory Mechanism:
                                                                          a) Graph Memory Construction: Memory construction
                      st+1 ∼ Ψ(st+1 | st , at ).                    refers to the initial formation of a graph-structured memory
•   Update. The agent incorporates new experience and feedback      from unstructured or semi-structured information, independent
    into memory:                                                    of online agent actions. Formally, given a corpus or experience
                                                                    set D, graph construction defines a mapping
                   M ← Update(M, ot , at , rt ).
                                                                                 Construct : D → G0 = (V0 , E0 , X0 ),
   The memory module M stores a collection of experience
tuples and knowledge representations, and supports retrieval        where nodes V0 are extracted memory units and edges E0
and update operations. Its internal structure is left unspecified   encode relations among them.
at this stage and may be instantiated as a key-value store,            Construction typically involves (i) node extraction, where
episodic buffer, or structured graph memory in later sections.      entities, events, concepts, or textual chunks are identified as
   2) Prompt Construction from Memory: In LLM-based                 nodes, and (ii) relation extraction, where semantic, temporal, or
agent systems, memory influences agent behavior primarily           structural relations are identified to form edges. The resulting
through prompt conditioning. At each time step t, the agent         graph may be represented as triples (vi , eij , vj ) and serves as
constructs a composite prompt that integrates system-level          the initial memory state.
instructions, retrieved memory content, and the current task              b) Graph Memory Retrieval: Memory retrieval corre-
context. Formally, the prompt can be abstracted as                  sponds to querying the graph to identify a relevant subset of
                                                                    nodes or subgraphs:
        Promptt = System(I) ⊕ Memory(ct ) ⊕ Task(ot ),
                                                                                     Retrieve : (q, Gt ) → St ⊆ Vt ,
where I specifies the agent’s role and operational constraints,
                                                                    where the query q may be textual, structural, or embedding-
ct denotes the retrieved memory context, and ot represents the
                                                                    based. Retrieval can be realized via semantic similarity over
current observation or query.
                                                                    node representations, graph traversal from query-relevant nodes,
   The memory context ct is obtained by querying the memory
                                                                    or their combination.
module with a task-dependent query qt , typically through
                                                                         c) Graph Memory Update: Memory update describes the
similarity-based retrieval:
                                                                   online evolution of an existing memory graph driven by the
                ct = TopKmi ∈M sim(qt , mi ) ,                      agent’s interaction with the environment. At time step t, the
                                                                    update signal
where mi denotes individual memory units and sim(·, ·) is
                                                                                           ∆t ≜ (ot , at , rt )
a similarity function defined over their representations. This
formulation provides a unified interface through which stored       is derived from the agent’s observation, action, and feedback.
experiences and knowledge are incorporated into the agent’s         Given the current memory graph Gt , the update operation is
reasoning process.                                                  defined as
                                                                                     Update : (Gt , ∆t ) → Gt+1 .
C. Graph-based Memory                                                  The update process integrates newly observed information
   In LLM-based agent systems, memory serves as a persis-           into the graph by adding or modifying nodes and edges,
tent mechanism for storing, organizing, and retrieving past         adjusting their attributes, or revising relations to reflect newly
experiences and knowledge. When memory is instantiated              acquired evidence. Unlike memory construction, which forms
in a structured form, it can be naturally represented as a          an initial graph from static data, memory update operates
graph, which enables relational modeling, efficient retrieval,      incrementally and enables continual adaptation of the memory
and incremental updates over time.                                  structure during agent interaction.
                                                                                                                                                                                    29



                       TABLE IV: Comparison of Open-sourced Libraries for Graph-based Memory Systems
 ID   Library            License        External    Interaction   Graph    Retrieval   Lifecycle   Temporality   Reasoning   Conditioning   Personalization   Hierarchy      Agent
                     Apache2.0   MIT   Construct.   Construct.    Memory                                                                                                  Integration
  1   Cognee3           ✓                  ✓                        ✓         ✓                                                                                               ✓
  2   LangMem4                   ✓                      ✓                     ✓           ✓                                       ✓               ✓                           ✓
  3   Mem05             ✓                               ✓           ✓         ✓           ✓                                       ✓               ✓              ✓            ✓
  4   LightMem6                  ✓                      ✓                     ✓           ✓                         ✓                             ✓              ✓            ✓
  5   O-Mem7            ✓                               ✓                     ✓           ✓                                       ✓               ✓              ✓            ✓
  6   OpenMemory8       ✓                  ✓            ✓           ✓         ✓           ✓            ✓                          ✓                              ✓            ✓
  7   Memori9           ✓                               ✓                     ✓                                     ✓
  8   MemMachine10      ✓                                           ✓                                               ✓
  9   Memary11                   ✓         ✓            ✓           ✓         ✓                                                   ✓               ✓                           ✓
 10   Graphiti12        ✓                  ✓            ✓           ✓         ✓                                     ✓
 11   Memvid13          ✓                  ✓            ✓                     ✓           ✓            ✓




  3) Graph Memory Quality: To systematically evaluate graph-
based memory in agent systems, it is necessary to assess both
the quality of memory retrieval and the structural properties
induced by the graph formulation, as well as their impact on
downstream task performance. We summarize representative
evaluation criteria along three complementary dimensions.
      a) Retrieval Effectiveness: Retrieval quality measures the
ability of the memory graph to surface relevant information
in response to a query. Common metrics include Precision@K
and Recall@K, which quantify relevance among the top-ranked
retrieved nodes, and Mean Reciprocal Rank (MRR), which
captures the ranking position of the first relevant memory.
     b) Graph Structural Quality: Graph quality metrics
evaluate whether the constructed memory graph provides
a coherent and faithful representation of stored knowledge.
Typical criteria include coherence, which reflects structural
consistency and connectivity; completeness, which measures
coverage of salient information; redundancy, which captures
unnecessary duplication; and temporal consistency, which
assesses whether temporal relations are correctly preserved.
     c) Task-level Utility: Task performance metrics evaluate
the functional usefulness of graph memory in agent decision-
making, including task success rate, interaction efficiency, and
generalization to unseen tasks or domains.




                              A PPENDIX B
                     O PEN - SOURCED L IBRARIES


   In Table IV, we provide a systematic comparison of
eleven representative open-source memory libraries across key
                                                                                               3 https://docs.cognee.ai/
functional dimensions. The columns capture essential aspects                                   4 https://langchain-ai.github.io/langmem/
of memory systems, including license type, construction mode                                   5 https://docs.mem0.ai/open-source/overview
(external knowledge-based or interaction-driven), support for                                  6 https://github.com/zjunlp/LightMem

graph-based memory, retrieval mechanisms, lifecycle manage-                                    7 https://github.com/OPPO-PersonalAI/O-Mem
                                                                                               8 https://github.com/CaviraOSS/OpenMemory
ment, temporal modeling, reasoning capabilities, conditioning,
                                                                                               9 https://github.com/GibsonAI/Memori
personalization, hierarchical structure, and integration with                                 10 https://github.com/MemMachine/MemMachine
agent frameworks. This structured overview allows for a                                       11 https://github.com/kingjulio8238/Memary
nuanced comparison of memory design choices in agent                                          12 https://github.com/getzep/graphiti

memory design.                                                                                13 https://github.com/memvid/memvid
