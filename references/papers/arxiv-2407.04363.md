<!-- Generated from arxiv-2407.04363.pdf via pdftotext -layout on 2026-02-22 -->

                                         AriGraph: Learning Knowledge Graph World Models with Episodic Memory for
                                                                       LLM Agents
                                                     Petr Anokhin1 , Nikita Semenov2 , Artyom Sorokin1 , Dmitry Evseev2 , Andrey
                                                               Kravchenko4 , Mikhail Burtsev3 and Evgeny Burnaev2,1
                                                                                   1
                                                                                     AIRI, Moscow, Russia
                                                                                2
                                                                                  Skoltech, Moscow, Russia
                                                                3
                                                                  London Institute for Mathematical Sciences, London, UK
                                                                                4
                                                                                  University of Oxford, UK
                                                                                      anokhin@airi.net




arXiv:2407.04363v3 [cs.AI] 15 May 2025
                                                                  Abstract                               encounters and make informed decisions. However, the ques-
                                                                                                         tion of the best way to equip an agent with these capabilities
                                              Advancements in the capabilities of Large Lan-             remains open. Despite the constraints inherent in transformer
                                              guage Models (LLMs) have created a promis-                 architectures, contemporary methods enable LLMs to man-
                                              ing foundation for developing autonomous agents.           age contexts encompassing millions of tokens [Ding et al.,
                                              With the right tools, these agents could learn to          2024b]. However, this approach proves inefficient for agents
                                              solve tasks in new environments by accumulating            required to maintain continuous interaction with their envi-
                                              and updating their knowledge. Current LLM-based            ronment. Such agents must hold an entire historical context in
                                              agents process past experiences using a full his-          memory to perform actions, which is not only costly but also
                                              tory of observations, summarization, retrieval aug-        limited in handling complex logic hidden in vast amounts of
                                              mentation. However, these unstructured memory              information. Research into alternative frameworks like Re-
                                              representations do not facilitate the reasoning and        current Memory Transformer [Bulatov et al., 2022; Bulatov
                                              planning essential for complex decision-making. In         et al., 2024] and MAMBA [Gu and Dao, 2023] seeks to pro-
                                              our study, we introduce AriGraph, a novel method           vide long-term memory solutions, though these models are
                                              wherein the agent constructs and updates a mem-            still in their infancy.
                                              ory graph that integrates semantic and episodic
                                              memories while exploring the environment. We                  Currently, the most popular solution for incorporating
                                              demonstrate that our Ariadne LLM agent, con-               memory to LLM agents is the Retrieval-Augmented Gener-
                                              sisting of the proposed memory architecture aug-           ation (RAG) approach. RAG in a form of vector retrieval
                                              mented with planning and decision-making, effec-           leverages an external database to enhance the model’s prompt
                                              tively handles complex tasks within interactive text       with relevant information. This technique is commonly used
                                              game environments difficult even for human play-           in memory architectures for LLM agents, often to recall spe-
                                              ers. Results show that our approach markedly out-          cific observations or learned skills. However, it suffers from
                                              performs other established memory methods and              unstructured nature, greatly reducing the ability to retrieve
                                              strong RL baselines in a range of problems of vary-        related information, which may be scattered throughout the
                                              ing complexity. Additionally, AriGraph demon-              agent’s memory. These limitations can be overcome by us-
                                              strates competitive performance compared to ded-           ing knowledge graphs as database. This approach has also
                                              icated knowledge graph-based methods in static             experienced a resurgence with the advent of LLMs [Pan et
                                              multi-hop question-answering.                              al., 2024]. However, for a robust memory architecture, in-
                                                                                                         tegrating both structured and unstructured data is essential.
                                                                                                         In cognitive science, this integration parallels the concepts of
                                         1   Introduction                                                semantic and episodic memories. Semantic memory encom-
                                                                                                         passes factual knowledge about the world, whereas episodic
                                         Impressive language generation capabilities of large language
                                                                                                         memory pertains to personal experiences, which often con-
                                         models (LLMs) has sparked substantial interest in their ap-
                                                                                                         tain richer and more detailed information. Though tradition-
                                         plication as core components for creating autonomous agents
                                                                                                         ally considered separate due to their distinct neurological rep-
                                         capable of interacting with dynamic environments and exe-
                                                                                                         resentations, recent studies suggest these memory types are
                                         cuting complex tasks. Over the past year, the research com-
                                                                                                         interconnected [Wong Gonzalez, 2018]. Semantic knowledge
                                         munity has explored general architectures and core modules
                                                                                                         is built upon the foundation of episodic memory and subse-
                                         for such LLM agents [Wang et al., 2024; Sumers et al., 2024;
                                                                                                         quently provides a structured base for associative memory.
                                         Cheng et al., 2024]. A crucial property of a general cogni-
                                                                                                         This allows for the integration of various memory aspects,
                                         tive agent is its ability to accumulate and use knowledge. A
                                                                                                         including episodic memories themselves.
                                         long-term memory allows an agent to store and recall past ex-
                                         periences and knowledge, enabling it to learn from previous       In our research, we have developed a memory architecture
       A                          Ariadne LLM Agent                                          B
                                                       Semantic memory
                                                       Accumulated general
                                                           knowledge




               Episodic memory
                                    AriGraph              Decision making
                Specific events




                                                                                                   ours




                                             Environment


Figure 1: (A) The architecture of our Ariadne agent, equipped with AriGraph memory. AriGraph integrates both semantic knowledge graph
and past experiences. Memory in the form of a semantic knowledge graph extended with episodic vertices and edges significantly enhances
the performance of LLM-agent in text-based games. (B) The average performance of our agent on text games, compared to various baselines
including human players and other LLM memory implementations. The LLM-agents differ only in the memory module, while the decision-
making component remains identical across all versions. The results for the agents are displayed for the top three out of five runs. For human
players, the results are presented as both the top three and the average across all participants.


called Ariadne’s Graph (AriGraph), that integrates semantic                  to an agent with ground-truth knowledge. Although AriGraph
and episodic memories within a memory graph framework. A                     was originally designed for an agent interacting with the en-
knowledge graph represents a network of interconnected se-                   vironment, it also demonstrates competitive performance on
mantic knowledge, while episodic memories are depicted as                    multi-hop question answering tasks.
episodic edges that can connect multiple relations within the
graph. As an agent interacts with environment, it learns joint               2       AriGraph World Model
semantic and episodic world model by updating and extend-                    Memory graph structure. AriGraph world model G =
ing knowledge graph based memory. This architecture not                      (Vs , Es , Ve , Ee ) consists of semantic (Vs , Es ) and episodic
only serves as a foundational memory framework but also                      memory (Ve , Ee ) vertices and edges (see Figure 2). At
aids in environmental modeling, improving spatial orienta-                   each step t agent receives observation ot and sends ac-
tion and exploration capabilities. For the general framework                 tion at back to the environment. The environment also re-
of our LLM agent called Ariadne, we employed pipeline of                     turns rewards rt that are not visible to the LLM agent but
memory retrieval, planing and decision making. For evalua-                   are used to evaluate its performance. The agent continu-
tion of proposed methods we set up experiments to study two                  ously learns world model G by extracting semantic triplets
research questions.                                                          (object1 , relation, object2 ) from textual observations ot .
   RQ1. Can LLM based agents learn useful structured world                      • Vs is a set of semantic vertices. Semantic vertices corre-
model from scratch via interaction with an environment?                            spond to objects extracted from triplets.
   RQ2. Does structured knowledge representation improve                        • Es is a set of semantic edges. Semantic edge is a tuple
retrieval of relevant facts from memory and enable effective                       (v, rel, u), where u, v are semantic vertices and rel is a
exploration?                                                                       relationship between them. Semantic edges essentially
   We evaluated our agent in complex interactive tasks in                          represent triplets integrated in the semantic memory.
Textworld and NetHack environments [Côté et al., 2018;                        • Ve is a set of episodic vertices. Each episodic vertex
Küttler et al., 2020]. Experimental results demonstrate that                      corresponds to an observation received from the envi-
our agent Ariadne can effectively learn through interactions                       ronment at the respective step vet = ot .
with environment and significantly outperforms other mem-                       • Ee is a set of episodic edges. Each episodic edge
ory approaches for LLMs such as full history, summarization,                       ete = (vet , Est ) connects all semantic triplets Est extracted
RAG, Simulacra [Park et al., 2023] and Reflexion [Shinn et                         from ot with each other and corresponding episodic ver-
al., 2023]. We also show that our method outperforms exist-                        tex vet . In other words episodic edges represent temporal
ing reinforcement learning (RL) baselines. We also evaluated                       relationship “happened at the same time”.1
our approach on the classical roguelike game NetHack, where
                                                                                 1
our agent with local observations achieved scores comparable                         Strictly speaking, episodic edges cannot be called edges or
 Algorithm 1: Memory Graph Search                                    edge ei , Ni is a total number triplets (semantic edges) inci-
                                                                     dent to ei and log (max(Ni , 1)) is a weighting factor to pre-
  Input: set of queries Q, Vs , Es , Ve , Ee ,
                                                                     vent high scores for low information observations. We apply
           number of episodic vertices k, semantic
                                                                     a log2 (Ni ) scaling to give more weight to observations with
           search depth d and width w
                                                                     more extracted triplets. Additionally, observations contain-
  Result: retrieved episodic vertices VeQ , retrieved
                                                                     ing exactly one triplet are assigned zero weight, as they are
          semantic triplets EsQ
                                                                     unlikely to provide information beyond the triplet itself. k
   EsQ ← ∅,
                                                                     most relevant episodic vertices (containing respective obser-
  foreach q in Q do
                                                                     vations) are returned as a result of the episodic search.
      Es′ ← SemanticSearch(q, Vs , Es , d, w)
      EsQ ← EsQ ∪ Es′
  end                                                                3     Ariadne cognitive architecture
  VeQ ← EpisodicSearch(EsQ , Ve , Ee , k)                            To test utility of AriGraph world modelling method we pro-
  return EsQ , VeQ                                                   pose an agentic architecture called Ariadne. Ariadne agent
                                                                     interacts with an unknown environment to accomplish a goal
                                                                     set by a user. Throughout this process, at each time step, the
   Constructing AriGraph. Interaction with the environ-              agent learns a world model, plans and executes actions. Ari-
ment can provide the agent with an information about the             adne has long-term memory stored as AriGraph and working
world to create new or update previously acquired knowl-             memory containing information for current planning and de-
edge. Given new observation ot , LLM agent extracts new              cision making.
triplets as semantic vertices Vst and edges Est . To find already       Given an observation the agent updates world model and
existing knowledge about the objects mentioned in ot a set           retrieves semantic and episodic knowledge from AriGraph to
of all semantic edges Esrel incident to vertices Vst is filtered     working memory. Working memory is also populated with
out. Then outdated edges in Esrel are detected by comparing          a final goal description, current observation, history of recent
them with Est and removed from the graph. After clearing             observation and actions. At the planning stage, Ariadne agent
outdated knowledge we expand semantic memory with Vst                uses content of working memory to create new or update ex-
and Est . Episodic memory is updated by simply adding new            isting plan as a series of task-relevant sub-goals, each accom-
episodic vertex vet containing ot and new episodic edge that         panied by a concise description. The planning module also
connect all edges in Est with vet . Episodic nodes store agent’s     evaluates the outcomes of actions based on feedback from
past history and episodic edges connects all knowledge re-           the environment after each action at step t − 1, adjusting the
ceived at the same step. See Appendix E for prompts used to          plan accordingly.
extract new triplets and detect outdated knowledge.                     The revised plan is added to the working memory which is
   Retrieval from AriGraph. For successful decision-                 accessed by the decision-making module, tasked with select-
making in a partially observable environment, the agent needs        ing the most suitable action aligned with the current plan’s
to be able to retrieve relevant knowledge. Retrieval from the        objectives. This module adheres to the ReAct [Yao et al.,
AriGraph memory consists of two procedures: (1) a semantic           2023] framework, requiring the agent to articulate the ratio-
search returns the most relevant triplets (semantic edges) and       nale behind an action before execution. Separation of plan-
(2) an episodic search that, given extracted triplets, returns       ning from decision-making enables LLMs to focus on distinct
the most relevant episodic vertices Ve . The pseudo-code for         cognitive processes. In text-based environments an agent se-
the search is presented in the Algorithm 1.                          lects an action from the list of valid actions. Our agent can
   Semantic search relies on semantic similarity and semantic        also use graph specific function for navigation utilizing its
graph structure to recall the most relevant triplets. Given a        memory module. It extends its action space with “go to loca-
query, the retriever (pre-trained Contriever model [Izacard et       tion” type commands and infers an optimal route to a target
al., 2022]) selects the most relevant semantic triplets. Then,       location using spatial relations stored in a semantic graph.
the set of vertices incident to the found triplets is used to
recursively retrieve new edges from the graph. Depth and             4     Experimental Setup
breadth of the search can be controlled by respective hyper-         4.1    TextWorld interactive environments
parameters d and w. For details see Appendix A.
                                                                     We compared Ariadne agent with alternative methods in a se-
   Episodic search starts with the results of the semantic
                                                                     ries of text based games involving spatial navigation, object
search as an input. Episodic edges link the input triplets with
                                                                     collection and tool manipulation. Detailed descriptions of
past episodic vertices representing observations. The number
                                                                     each game, including their difficulty levels and environmen-
of input triplets associated with a particular episodic vertex is
                                                                     tal maps, can be found in the Appendix F. All these games
used to calculate their relevance:
                                                                     can be considered Partially Observable MDPs (POMDPs).
                           ni                                        Such games have long been benchmarks for researching
           rel(vei ) =              log(max(Ni , 1)) ,         (1)
                       max(Ni , 1)                                   agents capable of effectively remembering information and
                                                                     establishing long-term dependencies [Parisotto et al., 2020;
where ni is a number of input triplets incident to episodic
                                                                     Pleines et al., 2022; Sorokin et al., 2022].
even hyperedges, because they connect vertices with multiple graph      Treasure Hunting. The primary objective is to retrieve
edges, but for simplicity we call them edges or episodic edges.      the hidden treasure, with a series of rooms providing keys
                                                                                                                         con
                                                                                                                            tain
                                                           conta
                                                                ins                                                             s                    Working Memory
                                                                                                                                          Current observation                     Goal
   A                                                   Red
                                                                                                   Green
                                                                                                              B
                  Tuna
                                                      Pepper
                                                                                                   Pepper                               Relevant semantic memories
                                                                                                                                        Recent actions-observations                      Plan
                                                                                                                                                                  is
                              Recipe                                                                                                    Relevant episodic memories in
                                                                                Garden
                                                        Sofa                    is in
Semantic
 Memory
                                                                                                                         AriGraph World                                     in
                                                                                                                                                         Planning        is         Decision Making
                                                                                                                         Model Learning
                            Table
                                                                                                    BBQ              New triplets: ["Room B,      {"sub_goal_1":                 reason_for_action:
                                                                                                                     has,                         "Explore unvisited             "white locker has
                                            Kitchen
                                                        is west of     Living                                        Blue Locker"; "Room          rooms",                        not been located
              s                                                        Room
          tain                                                                                                       B, exits, north"             "reason": ...},                yet."
       con                                                                                                                                        {"sub_goal_2": "Find           action_to_take:
 Episodic                                                                                                            Outdated triplets:           and unlock the White           "go north"
                                                                                                                     ["player,                    Locker",...}, ...
 Memory
                                                                                                                     location, room a"]

                                                                                                                                                          Env
     Semantic Edge:      Semantic Vertex:   Ice       Episodic edge:            Episodic Vertex:                         observation                                                      action
                                     ins
                                  nta
                               co

Figure 2: AriGraph world model and Ariadne cognitive architecture. (A) AriGraph learns episodic and semantic knowledge during interaction
with unknown environment. At each time step t new episodic vertex (containing full textual observation ot ) is added to the episodic memory.
Then LLM model parses observation ot to extract relevant relationships in a form of triplets (object1 , relation, object2 ). These triplets are
used to update semantic memory graph. The connection between episodic and semantic memory occurs through episodic edges that link each
episodic vertex with all triplets extracted from respective observation. (B) Ariadne agent explores the environment and accomplishes tasks
with AriGraph. User sets goal to the agent. Working memory is populated with recent history of observations and actions, relevant semantic
and episodic knowledge retrieved from the AirGraph world model. Planing LLM module uses content of working memory to generate new
or update existing plan. Results of planning are stored back in working memory. Finally, a ReAct-based module reads memory content and
selects one of possible actions to be executed in the environment. Every observation triggers learning that updates agent’s world model.


and clues leading to the final goal. The basic variation has 12                                             as it operates over multiple trials. After failing a trial, the
rooms and 4 keys, hard one has 16 rooms and 5 keys and hard-                                                agent reflects on its trajectories to document information that
est contains 36 rooms, 7 keys and additional distract items in                                              may assist in solving the task in subsequent trials. We used
every room.                                                                                                 the gpt-4-0125-preview as LLM backbone for AriGraph and
   Cleaning. The goal is to clean a house by identifying and                                                other LLM-based baselines.
returning misplaced items to their correct locations. Environ-
       out
          ho
                                                                                                               Additionally, we tested our architecture on a variation of
     is s
            f
ment consists of 9 rooms (kitchen, pool, etc.) and contains                                                 the cooking test from [Adhikari et al., 2021] to compare it
11 misplaced items (among many other items). To solve the                                                   with RL baselines. These tasks have 4 levels of difficulty,
problem, the agent needs to memorize the location of rooms                                                  however, they are significantly simpler than our main tasks,
and objects, as well as reason about objects placement.                                                     having fewer locations, ingredients, and required actions (Ap-
   Cooking. The goal is to prepare and consume a meal by                                                    pendix F).
following a recipe, selecting the correct ingredients, and us-                                                 For RL baselines, we collect the best results reported by
ing appropriate tools, while navigating in multi-room house.                                                [Adhikari et al., 2021; Tuli et al., 2022; Basu et al., 2024]
The task is testing agents ability to remember relevant infor-                                              for the GATA, LTL-GATA, and EXPLORER architectures on
mation and plan according to it. Basic difficulty task features                                             the Cooking task with four difficulties levels from [Adhikari
9 locations and 3 ingredients and hard task features 12 loca-                                               et al., 2021].
tions and 4 ingredients, while hardest task also features closed                                               To estimate human performance in the same games, we
doors and inventory management.                                                                             developed a graphical user interface , allowing volunteers to
                                                                                                            play basic versions of the Treasure Hunt, The Cleaning, and
   For baselines we used Ariadne’s planning and decision
                                                                                                            the Cooking. After collecting the data, we excluded sessions
making module with one of the following types of memory
                                                                                                            where the game was not completed.
instead of AriGraph model: full history of observations and
actions, iterative summarization, RAG, RAG with Reflexion
[Shinn et al., 2023], and Simulacra - memory implementation                                                 4.2   NetHack environment
from [Park et al., 2023].                                                                                   NetHack [Küttler et al., 2020] is a classic roguelike adventure
   Full history involves retaining a complete record of all                                                 game featuring procedurally generated multi-level dungeon
observations and actions to inform decision-making at ev-                                                   (see Figure 13 in Appendix for a dungeon level example).
ery step. Summarization, as an alternative to storing the                                                   It poses significant challenges for both LLM-based and RL-
full history, focuses on retaining only the necessary informa-                                              based approaches, requiring complex exploration, resource
tion while discarding the rest. The standard RAG baseline                                                   management, and strategic planning.
retrieves top-k memories based on their similarity score to                                                    We based our experiments on NetPlay [Jeurissen et al.,
the current observation and plan. Simulacra features a scor-                                                2024] agent, which demonstrates state-of-the-art perfor-
ing mechanism that integrates recency, importance, and rele-                                                mance among LLM agents that do not rely on finetuning or
vance, alongside reflections on the extracted memories. The                                                 RL. In NetPlay agent receives textual observations containing
Reflexion baseline differs from other methods in its approach,                                              all information about current explored dungeon level. These
         A




         B                                                         C




                                                                         Treasure Hunt   Cooking      Cleaning



Figure 3: AriGraph world model enables Ariadne agent to successfully solve variety of text games. (A) Ariadne outperform baseline agents
with alternative types of memory. (B) Ariadne with episodic and semantic memory scales to harder environments without losing performance.
(C) Ariadne shows performance comparable to the best human players. The Y-axis shows the normalized score, which is calculated relative
to the maximum possible points that can be obtained in each environment. Error bars show standard deviation. The number of max steps is
set to 60 in the Cooking and to 150 in other games.


observations (Level obs) effectively function as handcrafted           the game, and score less than one represents intermediate
memory oracle for the agent.                                           progress. Results on text-based games are shown on the Fig-
   To evaluate our Ariadne agent, we restricted textual ob-            ure 3 (for dynamics see Appendix G). We estimate perfor-
servations to agent’s current room or corridor (Room Obs),             mance as average of three best runs. Ariadne successfully re-
testing whether AriGraph world model could compensate for              members and uses information about state of the world for all
this restriction by remembering all relevant level information.        three tasks. Baseline agents are unable to solve the Treasure
   We compare three agents. The first is NetPlay [Room obs]            Hunt, and fail to find even second key in the Treasure Hunt
with restricted textual observations, the second is our Ariadne        Hardest. On the other hand, Ariadne successfully solves the
[Room obs] agent that receives Room Obs and updates Ari-               Treasure Hunt in about fifty steps, maintains robust perfor-
Graph, and the last is NetPlay [Level obs] with access to in-          mance in the Treasure Hunt Hard, and is able to complete
foration about explored level.                                         the Treasure Hunt Hardest with more then double amount of
                                                                       rooms compared to Hard version, additional keys and distrac-
4.3    Multi-hop Q&A                                                   tors (see Appendix G).
Although our memory architecture was originally designed                  Compared to the Treasure Hunt, the Cleaning game pos-
for an agent interacting with the environment, we evaluated            sesses a slightly different challenge as it is more important
its performance on standard multi-hop Q&A benchmarks —                 to properly filter outdated information about object locations,
Musique [Trivedi et al., 2022] and HotpotQA [Yang et al.,              than not to lose any information. This is evident from the re-
2018] to show its robustness and efficiency in more standard           duced usefulness of Episodic Memory in Ariadne agent and
retrieval tasks. We made slight adjustments to the promts              Full history baseline, since both memory modules focus on
and replaced Contriever model with BGE-M3[Chen et al.,                 retaining long-term information. Overall Ariadne notably
2024], as it is a better fit for general text encoding. We             outperforms alternatives in this game. Moreover, Ariadne
used 200 random samples from both datasets similar to [Li et           also outperforms Reflexion, which has additional information
al., 2024a]. We compared the performance of our approach               between episodes [Shinn et al., 2023]. This baseline shows
against Graphreader [Li et al., 2024a], ReadAgent [Lee et al.,         markable performance growth (in comparison wuth RAG) at
2024], HOLMES [Panda et al., 2024], GraphRAG [Edge et                  the second try, but degrades with following tries.
al., 2024] and RAG baselines provided in [Li et al., 2024a].
                                                                          The Cooking game has the highest difficulty, because any
5     Results                                                          error at intermediate step prevents completion of the whole
                                                                       game. All baseline agents (except Reflexion 2-shot with ob-
5.1    TextWorld                                                       vious advantage over other methods) fail to complete cooking
Every LLM based agent had five attempts to solve each game.            tasks due to insufficient or misused information. In this game,
The normalized score of one means that an agent completed              episodic memory is particularly important, allowing the agent
                                                                   of memory in this task, NetPlay [Level obs] with access to
                                                                   memory oracle achieved the highest scores, while NetPlay
                                                                   [Room obs] with only current room observations performed
                                                                   the worst. Ariadne [Room obs] successfully utilized Ari-
                                                                   Graph word model, achieving performance comparable to the
                                                                   baseline with memory oracle.

                                                                   Table 1: Ariadne with obscured partial observations performs com-
                                                                   parable to NetPlay agent full level information.

                                                                       Method                       Score              Levels
Figure 4: Ariadne LLM agent shows top performance compared
to RL alternatives. Comparison of Ariadne and Full History base-       Ariadne (Room obs)      593.00 ± 202.62      6.33 ± 2.31
line (GPT-4) with RL baselines in the cooking benchmark. Ariadne       NetPlay (Room obs)      341.67 ± 109.14      3.67 ± 1.15
demonstrates superior performance across all 4 difficulty levels       NetPlay (Level obs)     675.33 ± 130.27      7.33 ± 1.15

to recall useful observations such as the content of the recipe    5.3    Multi-hop Q&A
or cooking instructions. For token usage of every method see
Table 3, Appendix D.                                               We compared AriGraph with the latest LLM-based ap-
   Comparison with RL baselines on variation of the Cooking        proaches that employ knowledge graph construction and re-
task is shown in Figure 4. We run Ariadne and GPT-4 with           trieval techniques for question answering over documents
Full history on 4 difficulty levels from the cooking benchmark     (Table 2). Our memory architecture, adapted from the Ari-
[Adhikari et al., 2021]. Ariadne shows superior performance        adne TextWorld agent, utilizing both GPT-4 and GPT-4o-
to RL-agents on all 4 levels, especially harder ones. GPT-4        mini outperformed baseline methods like ReadAgent (GPT-
agent with Full history solves only first two levels which is      4), GPT-4 RAG, GPT-4 full context and GraphReader (GPT-
consistent with previous result as the Cooking from Figure         4). GraphRAG served as a strong GPT-4o-mini baseline,
3.A is harder than level 4.                                        due to its extremely hight costs. ArigGraph (GPT-4o-mini)
   Human evaluation. Comparison with respect to human              showed weaker performance on Musique, but outperformed
players is shown in Figure 3.C. All Humans is the average          GraphRAG on HotpotQA. Notably, our approach is more
score of all valid (completed) human trials. Human Top-3           then 10x cheaper in comparison to GraphRAG (Table 3, Ap-
is the average score of three best plays for each task. Ari-       pendix D).
adne outperforms average human player from our sample on              The best performance using GPT-4 was achieved by
all tasks, and scores similarly to the best human plays in the     HOLMES, but AriGraph (GPT-4) exhibited comparable re-
Cooking and the Treasure Hunt, but underperforms in the            sults. Notably, all baseline methods were specifically de-
Cleaning.                                                          signed for Q&A tasks, incorporating task-specific prompt
   Graph quality. We measured AriGraph’s growth rate and           tuning and additional architectural enhancements. Both
update rate during gameplay (see Figure 5). The graph ac-          GraphRAG and HOLMES employ hyper-relations in their
tively grows during the exploration phase and flattens once        graphs to connect source data with extracted entities, simi-
the agent becomes familiar with the environment. We argue          lar to our method. However, these approaches lack mecha-
that this indicates that agent can generalize to long interac-     nisms for updates in dynamic environments, a key advantage
tions with the environment despite constant updates to the se-     of AriGraph.
mantic graph. Additional results in Appendix C demonstrate
that the growth rate of the graph decreases with the increase      6     Related work
in quality of LLM backbone.                                        Voyager [Wang et al., 2023a], Ghost in the Minecraft [Zhu
   Overal results demonstrate clear advantage of Ariadne           et al., 2023] and Jarvis-1 [Wang et al., 2023b] are ad-
agent over LLM based and RL baselines. Semantic mem-               vanced, open-ended LLM agents that show significantly bet-
ory enables the Ariadne Agent to build and update knowledge        ter performance in Minecraft compared to earlier techniques.
about the current state of the POMDP environment, which is         These agents feature memory capabilities through a library of
crucial for navigation, exploration and capturing relevant de-     learned skills, summaries of successful actions, and episodic
tails in interactive environments. On the other hand, episodic     memory with plans for successful task execution. However,
memory assists the agent in retrieving detailed long-term in-      they fall short in representing knowledge with semantic struc-
formation that may not be captured in semantic memory, as          ture and depend heavily on the LLM’s extensive Minecraft
demonstrated by the results in the Cooking task.                   knowledge, or even access to the Minecraft wiki. Generative
                                                                   agents [Park et al., 2023] mimic human behavior in multi-
5.2   NetHack                                                      agent environments and were among the pioneers in introduc-
The results are presented in Table 1. Scores column shows          ing an advanced memory system for LLM agents, which we
average game score across 3 runs, Levels column shows av-          use as our baseline. Reflexion [Shinn et al., 2023] and CLIN
erage number of dungeon levels completed by an agent. GPT-         [Majumder et al., 2023] enables agents to reflect on past tra-
4o was used for all agents. Underscoring the importance            jectories, allowing them to store relevant insights about com-
Figure 5: AriGraph demonstrate good scaling during learning and with environment size. A size of the knowledge graph quickly saturates
during exploration and learning phase. KG grows moderately when the Treasure Hunt and the Cooking games include more rooms and
objects in their hard versions.


Table 2: AriGraph memory demonstrates competitive performance        knowledge graphs prompted by new experiences.
on Multi-Hop Q&A datasets. Even in non interactive tasks AriGraph       Text-based environments [Côté et al., 2018; Hausknecht et
is comparable to strong QA baseline agents. The best results with
the base GPT-4o and GPT-4o-mini are shown in bold and underline
                                                                     al., 2019; Shridhar et al., 2021; Wang et al., 2022] were origi-
respectively.                                                        nally designed to evaluate reinforcement learning (RL) agents
                                                                     [Guo et al., 2020; Yao et al., 2020; Ammanabrolu et al., 2020;
                                                                     Ammanabrolu and Hausknecht, 2020; Tuli et al., 2022;
   Method                         MuSiQue        HotpotQA            Adhikari et al., 2021]. Multiple experiments have already
                                  EM     F1      EM      F1          explored the potential of LLMs in these complex scenarios
                                                                     [Tsai et al., 2023; Tan et al., 2023; Momennejad et al., 2023;
   BM25(top-3)                    25.0   31.1    45.7    58.5
                                                                     Ding et al., 2024a]. However raw LLMs show poor results in
   Ada-002(top-3)                 24.5   32.1    45.0    58.1
                                                                     these games without proper agentic architecture and memory.
   GPT-4 full context             33.5   42.7    53.0    68.4
   GPT-4 + supporting facts       45.0   56.0    57.0    73.8        7    Conclusions
   ReadAgent(GPT-4)               35.0   45.1    48.0    62.0        In this paper, we introduced AriGraph, a novel knowledge
   GraphReader(GPT-4)             38.0   47.4    55.0    70.0        graph world model tailored for LLM agents. AriGraph
   HOLMES(GPT-4)                  48.0   58.0    66.0    78.0        uniquely integrates semantic and episodic memories from
   AriGraph(GPT-4)                45.0   57.0    68.0    74.7        textual observations, providing a structured and dynamic rep-
   GraphRAG(GPT-4o-               40.0   53.5    58.7    63.3        resentation of knowledge. We evaluated this approach across
   mini)                                                             a range of interactive text-based games and multi-hop Q&A
   AriGraph(GPT-4o-mini)          36.5   47.9    60.0    68.6        benchmarks, comparing it against existing memory architec-
                                                                     tures. To test its capabilities comprehensively, we developed
                                                                     a cognitive architecture called Ariadne, which combines Ari-
pleted actions in a long-term memory module, but has no              Graph with planning and decision-making components.
structural representation of knowledge and episodic memo-               Our results demonstrate that AriGraph significantly out-
ries. LARP [Yan et al., 2023] utilizes the concepts of episodic      performs other memory systems in tasks requiring long-term
and semantic memories but treats them as separate instances          memory, such as decision-making, planning, and exploration
and lacks a structural representation of knowledge.                  in partially observable environments. The structured knowl-
   Considerable research is dedicated to leveraging estab-           edge representation provided by AriGraph enables efficient
lished knowledge graphs for enhancing Q&A [Baek et al.,              retrieval and reasoning, accelerating learning and task com-
2023; Li et al., 2024b] systems to address the factual               pletion. Additionally, AriGraph’s scalability was evident as
knowledge deficiency observed in LLMs. The latest re-                it maintained high performance even when the complexity
search demonstrating best performance in Q&A tasks in-               of tasks increased, involving more objects and locations. In
cludes Graphreader [Li et al., 2024a], HOLMES [Panda et              multi-hop Q&A benchmarks, AriGraph exhibited competi-
al., 2024], HippoRAG [Gutiérrez et al., 2024], GraphRAG             tive performance, underscoring its robustness and adaptabil-
[Edge et al., 2024] which all employ the technique of build-         ity beyond interactive environments.
ing knowledge graphs from texts. However, these studies do              While promising, our approach can be further enhanced
not address the context of functioning within an interactive         by incorporating multi-modal observations, procedural mem-
environment, nor do they take into account the updates to            ories, and more sophisticated graph search methods.
References                                                         and Jonathan Larson. From local to global: A graph rag
[Adhikari et al., 2021] Ashutosh Adhikari, Xingdi Yuan,            approach to query-focused summarization, 2024.
  Marc-Alexandre Côté, Mikuláš Zelinka, Marc-Antoine        [Gu and Dao, 2023] Albert Gu and Tri Dao. Mamba: Linear-
  Rondeau, Romain Laroche, Pascal Poupart, Jian Tang,              time sequence modeling with selective state spaces, 2023.
  Adam Trischler, and William L. Hamilton. Learning dy-         [Guo et al., 2020] Xiaoxiao Guo, Mo Yu, Yupeng Gao,
  namic belief graphs to generalize on text-based games,           Chuang Gan, Murray Campbell, and Shiyu Chang. In-
  2021.                                                            teractive fiction game playing as multi-paragraph reading
[Ammanabrolu and Hausknecht, 2020] Prithviraj           Am-        comprehension with reinforcement learning, 2020.
  manabrolu and Matthew Hausknecht. Graph constrained           [Gutiérrez et al., 2024] Bernal Jiménez Gutiérrez, Yiheng
  reinforcement learning for natural language action spaces,       Shu, Yu Gu, Michihiro Yasunaga, and Yu Su. Hipporag:
  2020.                                                            Neurobiologically inspired long-term memory for large
[Ammanabrolu et al., 2020] Prithviraj Ammanabrolu, Ethan           language models, 2024.
  Tien, Matthew Hausknecht, and Mark O. Riedl. How to           [Hausknecht et al., 2019] Matthew Hausknecht, Prithviraj
  avoid being eaten by a grue: Structured exploration strate-      Ammanabrolu, Côté Marc-Alexandre, and Yuan Xingdi.
  gies for textual worlds, 2020.                                   Interactive fiction games: A colossal adventure. CoRR,
[Baek et al., 2023] Jinheon Baek, Alham Fikri Aji, and Amir        abs/1909.05398, 2019.
  Saffari. Knowledge-augmented language model prompt-           [Izacard et al., 2022] Gautier Izacard, Mathilde Caron, Lu-
  ing for zero-shot knowledge graph question answering,            cas Hosseini, Sebastian Riedel, Piotr Bojanowski, Armand
  2023.                                                            Joulin, and Edouard Grave. Unsupervised dense informa-
[Basu et al., 2024] Kinjal Basu, Keerthiram Murugesan,             tion retrieval with contrastive learning, 2022.
  Subhajit Chaudhury, Murray Campbell, Kartik Tala-             [Jeurissen et al., 2024] Dominik Jeurissen, Diego Perez-
  madupula, and Tim Klinger. Explorer: Exploration-guided          Liebana, Jeremy Gow, Duygu Cakmak, and James Kwan.
  reasoning for textual reinforcement learning, 2024.              Playing nethack with llms: Potential and limitations as
[Bulatov et al., 2022] Aydar Bulatov, Yuri Kuratov, and            zero-shot agents, 2024.
  Mikhail S. Burtsev. Recurrent memory transformer, 2022.       [Küttler et al., 2020] Heinrich Küttler, Nantas Nardelli,
[Bulatov et al., 2024] Aydar Bulatov, Yuri Kuratov, Yermek         Alexander Miller, Roberta Raileanu, Marco Selvatici, Ed-
                                                                   ward Grefenstette, and Tim Rocktäschel. The nethack
  Kapushev, and Mikhail S. Burtsev. Scaling transformer to
                                                                   learning environment. Advances in Neural Information
  1m tokens and beyond with rmt, 2024.
                                                                   Processing Systems, 33:7671–7684, 2020.
[Chen et al., 2024] Jianlv Chen, Shitao Xiao, Peitian Zhang,    [Lee et al., 2024] Kuang-Huei Lee, Xinyun Chen, Hiroki
  Kun Luo, Defu Lian, and Zheng Liu. Bge m3-embedding:             Furuta, John Canny, and Ian Fischer. A human-inspired
  Multi-lingual, multi-functionality, multi-granularity text       reading agent with gist memory of very long contexts,
  embeddings through self-knowledge distillation, 2024.            2024.
[Cheng et al., 2024] Yuheng Cheng, Ceyao Zhang, Zheng-          [Li et al., 2024a] Shilong Li, Yancheng He, Hangyu Guo,
  wen Zhang, Xiangrui Meng, Sirui Hong, Wenhao Li, Zi-             Xingyuan Bu, Ge Bai, Jie Liu, Jiaheng Liu, Xingwei Qu,
  hao Wang, Zekai Wang, Feng Yin, Junhua Zhao, and Xi-             Yangguang Li, Wanli Ouyang, Wenbo Su, and Bo Zheng.
  uqiang He. Exploring large language model based intelli-         Graphreader: Building graph-based agent to enhance long-
  gent agents: Definitions, methods, and prospects, 2024.          context abilities of large language models, 2024.
[Côté et al., 2018] Marc-Alexandre Côté, Ákos Kádár,     [Li et al., 2024b] Yihao Li, Ru Zhang, Jianyi Liu, and
   Xingdi Yuan, Ben Kybartas, Tavian Barnes, Emery Fine,           Gongshen Liu. An enhanced prompt-based llm reason-
   James Moore, Ruo Yu Tao, Matthew Hausknecht, Layla El           ing scheme via knowledge graph-integrated collaboration,
   Asri, Mahmoud Adada, Wendy Tay, and Adam Trischler.             2024.
   Textworld: A learning environment for text-based games.      [Majumder et al., 2023] Bodhisattwa Prasad Majumder,
   CoRR, abs/1806.11532, 2018.
                                                                   Bhavana Dalvi Mishra, Peter Jansen, Oyvind Tafjord,
[Ding et al., 2024a] Peng Ding, Jiading Fang, Peng Li, Kan-        Niket Tandon, Li Zhang, Chris Callison-Burch, and Peter
   grui Wang, Xiaochen Zhou, Mo Yu, Jing Li, Matthew Wal-          Clark. Clin: A continually learning language agent for
   ter, and Hongyuan Mei. MANGO: A benchmark for eval-             rapid task adaptation and generalization, 2023.
   uating mapping and navigation abilities of large language    [Momennejad et al., 2023] Ida Momennejad, Hosein Hasan-
   models, 2024.
                                                                   beig, Felipe Vieira Frujeri, Hiteshi Sharma, Nebojsa Jojic,
[Ding et al., 2024b] Yiran Ding, Li Lyna Zhang, Chen-              Hamid Palangi, Robert Ness, and Jonathan Larson. Evalu-
   gruidong Zhang, Yuanyuan Xu, Ning Shang, Jiahang Xu,            ating cognitive maps and planning in large language mod-
   Fan Yang, and Mao Yang. Longrope: Extending llm con-            els with cogeval. In Thirty-seventh Conference on Neural
   text window beyond 2 million tokens, 2024.                      Information Processing Systems, 2023.
[Edge et al., 2024] Darren Edge, Ha Trinh, Newman Cheng,        [Murugesan et al., 2020] Keerthiram Murugesan, Mattia
   Joshua Bradley, Alex Chao, Apurva Mody, Steven Truitt,          Atzeni, Pavan Kapanipathi, Pushkar Shukla, Sadhana
  Kumaravel, Gerald Tesauro, Kartik Talamadupula, Mrin-         [Tsai et al., 2023] Chen Feng Tsai, Xiaochen Zhou, Sierra S.
  maya Sachan, and Murray Campbell. Text-based rl                  Liu, Jing Li, Mo Yu, and Hongyuan Mei. Can large lan-
  agents with commonsense knowledge: New challenges,               guage models play text games well? current state-of-the-
  environments and baselines, 2020.                                art and open questions, 2023.
[Pan et al., 2024] Shirui Pan, Linhao Luo, Yufei Wang, Chen     [Tuli et al., 2022] Mathieu Tuli, Andrew C. Li, Pashootan
   Chen, Jiapu Wang, and Xindong Wu. Unifying large lan-           Vaezipoor, Toryn Q. Klassen, Scott Sanner, and Sheila A.
   guage models and knowledge graphs: A roadmap. IEEE              McIlraith. Learning to follow instructions in text-based
   Transactions on Knowledge and Data Engineering, page            games, 2022.
   1–20, 2024.                                                  [Wang et al., 2022] Ruoyao Wang, Peter Jansen, Marc-
[Panda et al., 2024] Pranoy Panda, Ankush Agarwal, Chai-           Alexandre Côté, and Prithviraj Ammanabrolu. Science-
   tanya Devaguptapu, Manohar Kaul, and Prathosh A P.              world: Is your agent smarter than a 5th grader?, 2022.
   Holmes: Hyper-relational knowledge graphs for multi-hop      [Wang et al., 2023a] Guanzhi Wang, Yuqi Xie, Yunfan
   question answering using llms, 2024.                            Jiang, Ajay Mandlekar, Chaowei Xiao, Yuke Zhu, Linxi
[Parisotto et al., 2020] Emilio Parisotto, Francis Song, Jack      Fan, and Anima Anandkumar. Voyager: An open-ended
   Rae, Razvan Pascanu, Caglar Gulcehre, Siddhant Jayaku-          embodied agent with large language models, 2023.
   mar, Max Jaderberg, Raphael Lopez Kaufman, Aidan             [Wang et al., 2023b] Zihao Wang, Shaofei Cai, Anji Liu,
   Clark, Seb Noury, et al. Stabilizing transformers for re-       Yonggang Jin, Jinbing Hou, Bowei Zhang, Haowei Lin,
   inforcement learning. In International conference on ma-        Zhaofeng He, Zilong Zheng, Yaodong Yang, Xiaojian Ma,
   chine learning, pages 7487–7498. PMLR, 2020.                    and Yitao Liang. Jarvis-1: Open-world multi-task agents
[Park et al., 2023] Joon Sung Park, Joseph C. O’Brien, Car-        with memory-augmented multimodal language models,
   rie J. Cai, Meredith Ringel Morris, Percy Liang, and            2023.
   Michael S. Bernstein. Generative agents: Interactive sim-    [Wang et al., 2024] Lei Wang, Chen Ma, Xueyang Feng,
   ulacra of human behavior, 2023.                                 Zeyu Zhang, Hao Yang, Jingsen Zhang, Zhiyuan Chen, Ji-
                                                                   akai Tang, Xu Chen, Yankai Lin, Wayne Xin Zhao, Zhewei
[Pleines et al., 2022] Marco Pleines, Matthias Pallasch,
                                                                   Wei, and Jirong Wen. A survey on large language model
   Frank Zimmer, and Mike Preuss. Memory gym: Partially            based autonomous agents. Frontiers of Computer Science,
   observable challenges to memory-based agents. In The            18(6), March 2024.
   eleventh international conference on learning representa-
   tions, 2022.                                                 [Wong Gonzalez, 2018] Daniela Wong Gonzalez. The Re-
                                                                   lationship Between Semantic and Episodic Memory: Ex-
[Shinn et al., 2023] Noah Shinn, Federico Cassano, Edward          ploring the Effect of Semantic Neighbourhood Density on
   Berman, Ashwin Gopinath, Karthik Narasimhan, and                Episodic Memory. PhD thesis, Electronic Theses and Dis-
   Shunyu Yao. Reflexion: Language agents with verbal re-          sertations, 2018. Paper 7585.
   inforcement learning, 2023.
                                                                [Yan et al., 2023] Ming Yan, Ruihao Li, Hao Zhang, Hao
[Shridhar et al., 2021] Mohit Shridhar, Xingdi Yuan, Marc-         Wang, Zhilan Yang, and Ji Yan. Larp: Language-agent
   Alexandre Côté, Yonatan Bisk, Adam Trischler, and             role play for open-world games, 2023.
   Matthew Hausknecht. ALFWorld: Aligning Text and Em-
                                                                [Yang et al., 2018] Zhilin Yang, Peng Qi, Saizheng Zhang,
   bodied Environments for Interactive Learning. In Proceed-
   ings of the International Conference on Learning Repre-         Yoshua Bengio, William W. Cohen, Ruslan Salakhutdinov,
   sentations (ICLR), 2021.                                        and Christopher D. Manning. Hotpotqa: A dataset for di-
                                                                   verse, explainable multi-hop question answering, 2018.
[Sorokin et al., 2022] Artyom Sorokin, Nazar Buzun,
                                                                [Yao et al., 2020] Shunyu Yao, Rohan Rao, Matthew
   Leonid Pugachev, and Mikhail Burtsev. Explain my sur-
                                                                   Hausknecht, and Karthik Narasimhan. Keep calm and
   prise: Learning efficient long-term memory by predicting
                                                                   explore: Language models for action generation in
   uncertain outcomes. Advances in Neural Information
                                                                   text-based games, 2020.
   Processing Systems, 35:36875–36888, 2022.
                                                                [Yao et al., 2023] Shunyu Yao, Jeffrey Zhao, Dian Yu, Nan
[Sumers et al., 2024] Theodore R. Sumers, Shunyu Yao,              Du, Izhak Shafran, Karthik Narasimhan, and Yuan Cao.
   Karthik Narasimhan, and Thomas L. Griffiths. Cognitive          React: Synergizing reasoning and acting in language mod-
   architectures for language agents, 2024.                        els, 2023.
[Tan et al., 2023] Qinyue Tan, Ashkan Kazemi, and Rada          [Zhu et al., 2023] Xizhou Zhu, Yuntao Chen, Hao Tian,
   Mihalcea. Text-based games as a challenging benchmark           Chenxin Tao, Weijie Su, Chenyu Yang, Gao Huang, Bin
   for large language models, 2023.                                Li, Lewei Lu, Xiaogang Wang, Yu Qiao, Zhaoxiang
[Trivedi et al., 2022] Harsh Trivedi, Niranjan Balasubrama-        Zhang, and Jifeng Dai. Ghost in the minecraft: Gener-
   nian, Tushar Khot, and Ashish Sabharwal. MuSiQue:               ally capable agents for open-world environments via large
   Multihop questions via single-hop question composition.         language models with text-based knowledge and memory,
   Transactions of the Association for Computational Lin-          2023.
   guistics, 2022.
A    Memory Graph Search Details                                    established plan. Depending on this assessment, it either
Pseudo-code for SemanticSearch function in AriGraph                 activates or deactivates exploration mode. Moreover, the
is listed in Algorithm 2.         This algorithm is close to        graph agent extracts triplets containing information about ex-
BFS search. The main difference is the use of retrieval             its, such as ”kitchen, has an unexplored exit, south,” and
mechanism in function EmbedAndRetrieve.                    Func-    triplets detailing spatial connections between locations like
tion EmbedAndRetrieve(E, q, w) uses pretrained Con-                 ”hall, east of, kitchen.” Subsequently, simple graph-based
triever [Izacard et al., 2022] model to compute embeddings          methods can be employed to identify all exits from each room
for edges E and query q and then returns top w edges with a         that the agent has detected but not yet explored. This informa-
highest similarity score. Similarity score between edge e and       tion is then added to the working memory of the agent. Func-
query q is a dot product between their embeddings. Most of          tion for finding triplets corresponding to probable unexplored
the times, when query for EmbedAndRetrieve is a seman-              actions is listed in Algorithm 3. Current implementation uses
tic vertex, it simply returns edges incident to this vertex, but    expert knowledge about what elements of the semantic graph
also has ability to retrieve edges connected to vertices that are   can represent locations and exits between them.
semantically close to the query vertex. For example, semantic
graph can contain separate vertices for ”grill” and ”grilling”       Algorithm 3: Unexplored exit detection
that are not directly connected, so searching for ”grill” can         Input: Vs , Es , Ve , Ee , current location vl
potentially return edge (”bbq”, ”used for”, ”grilling”).              Result: triplets Esexp with information about
                                                                               unexplored exits from vl
 Algorithm 2: Semantic Search                                         E exp ← ∅
  Input: search query q, Es , search depth d, search                  E out ← GetOutgoing(Es , vl )               // get
          width w                                                          semantic edges outgoing from vl
  Result: relevant vertices semantic Vsq and edges Esq                foreach e in E out do
  Esq ← ∅                                                                 if RepresentExit(e) then
  L←∅                               // init empty                             E exp ← E exp ∪ {e}
       queue of queries
  Enqueue(L, q)                    // push q into                       E in ← GetIncoming(Es , vl )    // get
       queue L                                                               semantic edges incoming in vl
  D[q] ← 0                         // set search                        foreach e in E in do
       distance for q to zero                                               if RepresentExit(e) then
  while L is not empty do                                                       // remove exits leading to
      q ′ ← Dequeue(L)                   // remove                                  explored locations
           first element from L                                                 E exp ←
      if D[q ′ ] ≥ d then                                                        E exp \ {FindRelatedExit(E exp , e)}
          continue                                                      return E exp
      end
      // use Contriever model to find
           top w triplets closest to q ′
      Es′ ← EmbedAndRetrieve(Es , q ′ , w)                          C     Graph statistics
      foreach ei in Es′ do                                          When working with a graph, it would be advantageous to
          Vs′ ← IncidentVertices(ei )                               assess the quality of its construction. Unfortunately, due to
                 // returns two incident                            the variability in its construction (e.g., the use of synonyms,
                 semantic vertices                                  equivalent restructuring of connections, etc.), direct measure-
          foreach v in Vs′ do                                       ment of its correspondence to the true graph is extremely
                if v not in L then                                  challenging. Moreover, the inclusion of information in the
                     Enqueue(L, v)                                  constructed graph that is not present in the true graph is not
                     D[v] ← D[q ′ ] + 1                             always detrimental and can sometimes yield positive effects.
                end                                                 For these reasons, we did not measure the quality of the graph
          end                                                       but instead measured its growth rate and update rate during
      end                                                           gameplay (Fig.5). Furthermore, we conducted a separate ex-
      Esq ← Esq ∪ Es′                                               periment in which the graph was constructed according to
  end                                                               our pipeline, but the agent’s actions were chosen randomly
  return Esq                                                        (Fig.6). The Cleaning environment was chosen for this set-
                                                                    ting because, unlike the Treasure Hunt, it contains a large va-
                                                                    riety of objects with which the agent can interact, and unlike
                                                                    the Cooking, the agent cannot fail. In this setting, we also
B    Exploration                                                    measured the graph’s growth rate and update rate.
Before any planning or decision-making occurs, an auxil-               From the obtained results, one can conclude that the
iary agent assesses the need for exploration based on a pre-        graph grows most actively during the exploration phase but
                          Figure 6: Statistics of graph construction and updating during the random walk.


maintains a slower growth rate when the agent operates
within the familiar parts of the environment. Additionally,
it is evident that the growth rate of the graph decreases as the
quality of the LLM used in its construction increases.

D    Token usage

           Table 3: Token Usage Analysis for Text Games and QA Tasks

Method                                    Prompt Tokens      Completion Tokens
Text Games (per step)
Ariadne agent                                      6,000                    500
RAG memory agent                                   4,000                    350
Summary memory agent                               3,800                    350
Full history memory agent (step 150)              14,000                    350
Simulacra memory agent                             7,500                    400
Reflexion memory agent                             5,800                    350
QA Benchmarks (per task)
AriGraph                                          11,000                  2,500
GraphRAG                                         115,000                 20,000
E    LLM Prompts                                                        Room T, has exit, south".
                                                                  Example of replacing: []. Nothisg to replace here
    Triplet Extraction Prompt
                                                                  Sometimes several triplets can be replaced with one:
                                                                  Example of existing triplets: "kitchen, contains, broom"; "
                                                                        broom, is on, floor".
    Guidelines for Building the Knowledge Graph:                  Example of new triplets: "broom, is in, inventory".
                                                                  Example of replacing: [["kitchen, contains, broom" -> "
    Creating Nodes and Triplets: Nodes should depict entities           broom, is in, inventory"], ["broom, is on, floor" ->
          or concepts, similar to Wikipedia nodes. Use a                "broom, is in, inventory"]]. Because broom changed
          structured triplet format to capture data, as follows         location from the floor in the kitchen to players
          : "subject, relation, object". For example, from "            inventory.
          Albert Einstein, born in Germany, is known for
          developing the theory of relativity," extract "Albert   Ensure that triplets are only replaced if they contain
           Einstein, country of birth, Germany; Albert Einstein         redundant or conflicting information about the same
          , developed, Theory of Relativity."                           aspect of an entity. Triplets should not be replaced
    Remember that you should break complex triplets like "John,         if they provide distinct or complementary information
           position, engineer in Google" into simple triplets            about entities compared to the new triplets.
          like "John, position, engineer", "John, work at,              Specifically, consider the relationships, properties,
          Google".                                                       or contexts described by each triplet and verify
    Length of your triplet should not be more than 7 words. You         that they align before replacement. If there is
           should extract only concrete knowledges, any                 uncertainty about whether a triplet should be
          assumptions must be described as hypothesis.                  replaced, prioritize retaining the existing triplet
    For example, from phrase "John have scored many points and          over replacing it. When comparing existing and new
          potentiallyy will be winner" you should extract "John         triplets, if they refer to different aspects or
          , scored many, points; John, could be, winner" and            attributes of entities, do not replace them.
          should not extract "John, will be, winner".                   Replacements should only occur when there is semantic
    Remember that object and subject must be an atomary units            duplication between an existing triplet and a new
          while relation can be more complex and long.                  triplet.
    If observation states that you take item, the triplet shoud   Example of existing triplets: "apple, to be, cooked", ’
           be: ’item, is in, inventory’ and nothing else.               knife, used for, cutting’, ’apple, has been, sliced’
                                                                  Example of new triplets: "apple, is on, table", ’kitchen,
    Do not miss important information. If observation is ’book          contsins, knife’, ’apple, has beed, grilled’.
          involves story about knight, who needs to kill a        Example of replacing: []. Nothing to replace here. These
          dragon’, triplets should be ’book, involves, knight’,         triplets describe different properties of items, so
           ’knight, needs to kill, dragon’. If observation              they should not be replaced.
          involves some type of notes, do not forget to include
           triplets about entities this note includes.            Another example of when not to replase existung triplets:
    There could be connections between distinct parts of          Example of existing triplets: "brush, used for, painting".
          observations. For example if there is information in    Example of new triplets: "brush, is in, art class".
          the beginning of the observation that you are in        Example of replacing: []. Nothing to replace here. These
          location, and in the end it states that there is an           triplets describe different properties of brush, so
          exit to the east, you should extract triplet: ’               they should not be replaced.
          location, has exit, east’.
    Several triplets can be extracted, that contain information   I repeat, do not replace triplets, if they carry differend
           about the same node. For example ’kitchen, contains,         type of information about entities!!! It is better to
           apple’, ’kitchen, contains, table’, ’apple, is on,            leave a tripplet, than to replace the one that has
          table’. Do not miss this type of connections.                 important information. Do not state that triplet
    Other examples of triplets: ’room z, contains, black locker         needs to be replaced if you are not sure!!!
          ’; ’room x, has exit, east’, ’apple, is on, table’, ’   If you find triplet in Existing triplets which semantically
          key, is in, locker’, ’apple, to be, grilled’, ’potato          duplicate some triplet in New triplets, replace such
          , to be, sliced’, ’stove, used for, frying’, ’recipe,          triplet from Existing triplets. However do not
           requires, green apple’, ’recipe, requires, potato’.          replace triplets if they refer to different things.
    Do not include triplets that state the current location of    ####
          an agent like ’you, are in, location’.                  Generate only replacing, no descriptions are needed.
    Do not use ’none’ as one of the entities.                     Existing triplets: {ex_triplets}.
    If there is information that you read something, do not       New triplets: {new_triplets}.
          forget to incluse triplets that state that entitie      ####
          that you read contains information that you extract.    Warning! Replacing must be generated strictly in following
                                                                        format: [[outdated_triplet_1 -> actual_triplet_1], [
    Example of triplets you have extracted before: {example}            outdated_triplet_2 -> actual_triplet_2], ...], you
                                                                        MUST NOT include any descriptions in answer.
    Observation: {observation}                                    Replacing:
    Remember that triplets must be extracted in format: "
          subject_1, relation_1, object_1; subject_2,
          relation_2, object_2; ..."

    Extracted triplets:’’’


                                                                  Exploration check prompt
    Outdated Triplet Selection Prompt
                                                                  ####
                                                                  INSTRUCTION:
    The triplets denote facts about the environment where the
                                                                  You will be provided with sub-goals and reasons for it from
          player moves. The player takes actions and the
                                                                         plan of an agent. Your task is to state if this sub
          environment changes, so some triplets from the list
                                                                        goals require exploration of the environment, finding
          of existing triplets can be replaced with one of the
                                                                         or locating something.
          new triplets. For example, the player took the item
                                                                  Answer with just True or False.
          from the locker and the existing triplet "item, is in
                                                                  ####
          , locker" should be replaced with the new triplet "
                                                                  Plan:
          item, is in, inventory".
                                                                  {plan0}
    Sometimes there are no triplets to replace:
    Example of existing triplets: "Golden locker, state, open";
           "Room K, is west of, Room I"; "Room K, has exit,
          east".
    Example of new triplets: "Room T, is north of, Room N"; "
Planning prompt                                                      role involves receiving information about an agent
                                                                    and the state of the environment alongside a list of
                                                                    possible actions.
####                                                          Your primary objective is to choose an action from the list
INSTRUCTION:                                                         of possible actions that aligns with the goals
You are a planner within the agent system tasked with               outlined in the plan, giving precedence to main goal
      navigating the environment in a text-based game.              or sub-goals in the order they appear (main goal is
Your role is to create a concise plan to achieve your main          highest priority, then sub_goal_1, sub_goal_2, etc.).
      goal or modify your current plan based on new                  However, prioritize sub-goals that can be solved by
      information received.                                         perfroming single action in current situation, like ’
Make sure your sub-goals will benefit the achivment of your         take something’, over long term sub-goals.
       main goal. If your main goal is an ongoing complex     Actions like "go to ’location’" will move an agent directly
      process, also put sub-goals that can immediately               to stated location, use them instead of "go_west’
      benifit achiving something from your main goal.               type of actions, if the destination you want to move
If you need to find something, put it into sub-goal.                to is further than 1 step away.
If you wish to alter or delete a sub-goal within the          In tasks centered around exploration or locating something,
      current plan, confirm that this sub-goal has been              prioritize actions that guide the agent to
      achieved according to the current observation or is           previously unexplored areas. You can deduce which
      no longer relevant to achieving your main goal.               locations have been visited based on the history of
      Untill then do not change wording in "sub_goal"               observations and information from your memory module.
      elements of your plan and their position in the plan.   Performing same action typically will not provide different
       Only change wording in "reason" part to track the             results, so if you are stuck, try to perform other
      progress of completion of sub-goals.                          actions or prioritize goals to explore the
If sub-goal was completed or confirmed to be no more                environment.
      relevant, delete it, replase it with new one or with    You may choose actions only from the list of possible
      lower priority sub-goals from the plan. Untill then           actions. You must choose strictly one action.
      keep the structure of sub-goals as it is. Create new    Write your answer exactly in this json format:
      sub-goals only if they will benifit your main goal
      and do not prioritize them over current sub-goals.      {
If your task is to obtain something, make shure that the          "reason_for_action": "reason"
      item is in your inventory before changing your sub-         "action_to_take": "selected action"
      goal.
Your plan contains important information and goals you need   }
       to complete. Do not alter sub-goals or move them in
      hierarchy if they were not completed!                   Do not write anything else.
Pay attention to your inventory, what items you are carring   ####
      , when setting the sub-goals. These items might be      1. Main goal: {main_goal}
      important.                                              2. History of {n_prev} last observations and actions: {
Pay attention to information from your memory module, it is         observations}
       important.                                             3. Your current observation: {observation}
There should always be at least one sub-goal.                 4. Information from the memory module that can be relevant
State the progress of completing your sub-goals in "reason"         to current situation: {subgraph}
       for each sub-goal.                                     5. Your {topk_episodic} most relevant episodic memories
                                                                    from the past for the current situation: {
Write your answer exactly in this json format:                      top_episodic}.
{ "main_goal": "...",                                         6. Your current plan: {plan0}
 "plan_steps": [{                                             7. Yet unexplored exits in the environment: {
     "sub_goal_1": "...",                                           all_unexpl_exits}
     "reason": "..."
   },                                                         Possible actions in current situation: {valid_actions}
   {
     "sub_goal_2": "...",
     "reason": "..."
   },
   {
     "sub_goal_...": "...",
     "reason": "..."                                          Summarization prompt
   }],
 "your_emotion":
   {
                                                              ####
     "your_current_emotion": "emotion",
                                                              INSTRUCTION:
     "reason_behind_emotion": "..."
                                                              You are a guide within a team of agents engaging in a text-
   }}
                                                                    based game. Your role is to concisely yet thoroughly
                                                                    detail all the essential aspects of the current
Do not write anything else.
                                                                    situation. Ensure that your summary aids in
####
                                                                    information extraction and facilitates the decision-
1. Main goal: {main_goal}
                                                                    making process by focusing on pertinent details and
2. History of {n_prev} last observations and actions: {
                                                                    excluding extraneous information. Incorporate a
      observations}
                                                                    strategic outlook in your narrative, emphasizing
3. Your current observation: {observation}
                                                                    information integral to forming a tactical plan.
4. Information from the memory module that can be relevant
      to current situation: {subgraph}
                                                              Accurately relay the outcomes of previously attempted
5. Your {topk_episodic} most relevant episodic memories
                                                                    actions, as this is pivotal for shaping subsequent
      from the past for the current situation: {
                                                                    choices. Your account will form the sole basis on
      top_episodic}.
                                                                    which the decision-making agents operate; thus,
6. Your previous plan: {plan0}
                                                                    clarity and avoidance of potential confusion are
*if is explore* 7. Yet unexplored exits in the environment:
                                                                    paramount.
       {all_unexpl_exits}
                                                              Be judicious with your inferences, presenting only well-
                                                                    substantiated information that is likely to be of
                                                                    practical benefit. Your account should be succinct,
                                                                    encapsulated within a maximum of three paragraphs.
ReAct decision making prompt                                  ####
                                                              1. Main goal: {main_goal}
                                                              2. History of {n_prev} last observations and actions: {
####                                                                observations}
INSTRUCTION:                                                  3. Your current observation: {observation}
You are an action selector within an agent system designed    4. Your previous summary: {summary}
      to navigate an environment in a text-based game. Your   Your summary:
F    Text-based Games                                               on a variation of the Cooking test from [Adhikari et al., 2021]
                                                                    to compare it with RL baselines. These tasks have 4 levels
Treasure Hunting. The primary objective is to unlock the            of difficulty, however, they are significantly simpler than our
golden locker and retrieve the treasure hidden within. The          main tasks, having fewer locations, ingredients, and required
game consists of rooms each featuring a locker of a different       actions.
color. Initially, the player finds a key in the first room, along
with instructions detailing which specific locker this key can          • Level 1: 1 ingredient, 1 room, cutting.
unlock. Each subsequent locker contains another key and a               • Level 2: 1 ingredient, 1 room, cutting + cooking.
note directing the player to the next key’s location, creating          • Level 3: 1 ingredient, 9 rooms, no processing.
a chain of clues and discoveries leading to the golden locker.
The easy variation has 12 rooms and 4 keys and hard one                 • Level 4: 3 ingredients, 6 rooms, cutting + cooking.
has 16 rooms and 5 keys, however second key is significantly        We tested or agent and raw GPT-4 with full history on 3 ran-
harder to find. The hardest variation consist of 36 total rooms,    domly generated environments for each task difficulty. We
7 keys and also additional items in each room as noise. Agent       slightly adapted the task for the LLM models. We gave the in-
receives 1 point for picking a key and 1 point for completing       struction to grill, roast or fry the ingredient using appropriate
the game. Examples of the Treasure Hunt environment are             kitchen tools such as BBQ, oven and stove in the first observa-
presented in figures 7, 8 9                                         tion of the game. RL agent can learn this rules by interacting
   Cleaning. The goal is to clean the house that consists of        with the environment, however, this is not a commonsense
9 distinct rooms, each designated for a specific purpose, such      knowledge and without this instruction the game becomes
as a pool, kitchen, etc. Each room contains items, some of          unbeatable for LLM-agents and human players. While this
which are misplaced, for example, a toothbrush found in the         adaptation should not impact the difficulty level, it’s impor-
dining room. There are total of 11 misplaced items. The             tant to note that the environments for comparison between
agent’s objective is to tidy up the house by identifying items      LLM and RL models were not 100% identical.
that are out of place and returning them to their appropriate
locations. This task requires the agent to utilize reasoning        G     Additional graphics and tables
skills to determine the proper locations for items and to ef-       This section presents the step-by-step dynamics of perfor-
fectively recall from memory where each item belongs, while         mance of different agents and human players (figure.14) .
simultaneously managing multiple tasks. Agent receives 1            Additionally, this section includes a table summarizing the re-
point for picking up every displaced items, 1 point for plac-       sults of all experiments across three versions of the Treasure
ing an item in the right location and -1 for manipulation with      Hunt (Medium, Hard, Hardest), three versions of the Cooking
correctly placed item. Our task is conceptually similar to the      (Medium, Hard, Hardest), and the Cleaning (table 4).
TextWorld Commonsense (TWC) benchmark[Murugesan et
al., 2020]. However, while TWC primarily centers on logical
reasoning within one or at most two locations, our emphasis
is on environmental exploration and the testing of memory
based on past observations. Consequently, we have substan-
tially expanded the number of rooms and items in our setup.
Example of the Cleaning environment can be found in figure
10.
   Cooking. The goal is to prepare and consume a meal. First
an agent needs to find a recipe that provides detailed instruc-
tions, including required ingredients and specific preparation
methods such as dicing, slicing, chopping, grilling, frying,
and roasting. Medium difficulty task features 9 locations and
3 ingredients and hard task features 12 locations and 4 in-
gredients. The agent receives points for correctly selecting
ingredients and executing the proper procedures. The game
is considered lost if the agent performs any incorrect action
or uses an inappropriate tool for a given ingredient. We en-
hanced the initial observation with instructions and provided
explanations for specific actions to tailor the task for LLM
models, particularly concerning the appropriate use of house-
hold kitchen appliances for different actions with ingredients.
For instance, a BBQ should be used for grilling, while a stove
is appropriate for frying (see Appendix E for prompt). This
allows to test the agent’s ability to remember and adhere to
instructions. Examples of the Cooking environment are pre-
sented in figures 11, 12.
   RL comparison benchmark. We tested our architecture
                                                     Figure 7: Treasure Hunt environment




                                  Treasure       Treasure        Treasure       Cooking      Cooking        Cooking        Cleaning
                                  Hunt           Hunt            Hunt                        Hard           Hardest
                                                 Hard            Hardest
  Full History                    0.47           -               -              0.18         -              -              0.05
  Summary                         0.33           0.17            -              0.52         0.21           -              0.35
  RAG                             0.33           0.17            -              0.36         0.17           -              0.39
  Reflexion                       0.93           -               -              1.0          -              -              0.27
  Simulacra                       0.4            -               -              0.3          -              -              0.7
  AriGraph                        1.0            1.0             1.0            1.0           1.0           0.65           0.79
  AriGraph w/o exploration        0.87           -               -              0.87         -              -              0.76
  AriGraph w/o episodic           1.0            0.67            -              0.64         0.45           -              0.92
  AriGraph LLaMA-3-70B            0.47           -               -              0.67         -              -              0.5
  Human Top-3                     1.0            -               -              1.0          -              -              1.0
  Human All                       0.96           -               -              0.32         -              -              0.59

Table 4: All normalised scores across all tasks in TextWorld environment. Based on the results, it is evident that the agent with AriGraph
significantly outperforms all baselines and scales well to larger and more complex environments. An important outcome is that our agent
demonstrated near-human performance in text-based games, which has not been previously achieved using LLM.
Figure 8: Treasure Hunt hard environment
Figure 9: Treasure Hunt hardest environment
Figure 10: Cleaning environment
  Figure 11: Cooking environment




Figure 12: Cooking hard environment
Figure 13: Example of NetHack level
Figure 14: Performance Dynamics in Test Games. In the Treasure Hunt, the Ariadne agent delivers performance comparable to top players;
in the Cleaning task, it falls slightly behind, but in the Cooking, it surpasses top human players in speed. The hard variants of the tasks
demonstrate that the quality of Ariadne’s performance does not decrease with increasing task difficulty, and also highlight the importance of
episodic memory.
