<!-- Generated from arxiv-2506.21605.pdf via pdftotext -layout on 2026-02-22 -->

                                         MemBench: Towards More Comprehensive Evaluation on the Memory of
                                                               LLM-based Agents
                                                                   Haoran Tan1 * ‡§ , Zeyu Zhang1 * ‡§ , Chen Ma1‡§ , Xu Chen1†‡§ ,
                                                                                 Quanyu Dai2† , Zhenhua Dong2
                                                        1
                                                        Gaoling School of Artificial, Renmin University of China, Beijing, China,
                                                                               2
                                                                                 Huawei Noah’s Ark Lab
                                                    {tanhaoran1321,zeyuzhang,xu.chen}@ruc.edu.cn, daiquanyu@huawei.com

                                                                     Abstract                           with extra modules besides the foundation mod-
                                                                                                        els, enabling them to interact with environments
                                                 Recent works have highlighted the significance




arXiv:2506.21605v1 [cs.CL] 20 Jun 2025
                                                                                                        with autonomous learning and dynamic adapta-
                                                 of memory mechanisms in LLM-based agents,              tion (Wang et al., 2024a; Xi et al., 2025). Among
                                                 which enable them to store observed informa-
                                                                                                        them, the memory module serves as an essential
                                                 tion and adapt to dynamic environments. How-
                                                 ever, evaluating their memory capabilities still       foundation for saving critical information and ac-
                                                 remains challenges. Previous evaluations are           cumulating experiences. It empowers LLM-based
                                                 commonly limited by the diversity of memory            agents to better meet the demands of dynamic tasks,
                                                 levels and interactive scenarios. They also lack       as well as evolve within their environments contin-
                                                 comprehensive metrics to reflect the memory            uously (Zhang et al., 2024a).
                                                 capabilities from multiple aspects. To address            Some previous studies evaluate the memory
                                                 these problems, in this paper, we construct a
                                                                                                        capability of LLM-based agents in a subjective
                                                 more comprehensive dataset and benchmark
                                                 to evaluate the memory capability of LLM-
                                                                                                        way, which adopts human evaluators or LLMs to
                                                 based agents. Our dataset incorporates fac-            score the memory process (Zhong et al., 2024).
                                                 tual memory and reflective memory as different         Other studies focus on the evaluation in an indi-
                                                 levels, and proposes participation and observa-        rect way (Packer et al., 2023). They measure the
                                                 tion as various interactive scenarios. Based on        task performances of agents conditional on dif-
                                                 our dataset, we present a benchmark, named             ferent memory mechanisms, where a better mem-
                                                 MemBench, to evaluate the memory capability            ory mechanism generally leads to better perfor-
                                                 of LLM-based agents from multiple aspects,
                                                                                                        mances. Recently, some studies introduce long-
                                                 including their effectiveness, efficiency, and
                                                 capacity. To benefit the research community,           term dialogue datasets, which can be used to eval-
                                                 we release our dataset and project at https:           uate the long-term memory capabilities of LLM-
                                                 //github.com/import-myself/Membench.                   based agents objectively (Wu et al., 2024a).
                                                                                                           However, previous works have some limitations
                                         1       Introduction                                           on evaluating the memory capability of LLM-based
                                                                                                        agents. First of all, most of them provide insuffi-
                                         In recent years, large language models (LLMs)                  cient evaluation of the different levels of memory
                                         have demonstrated remarkable capabilities in pro-              capabilities, which primarily focus on factual mem-
                                         cessing natural languages and performing complex               ory while neglecting reflective memory. Here, we
                                         tasks across various domains (Zhao et al., 2023;               define the factual memory as a low-level type of
                                         Wu et al., 2024b). However, vanilla LLMs typi-                 memory that involves information that is explic-
                                         cally operate in static scenarios, without interact-           itly provided. In contrast, the reflective memory
                                         ing with external environments, thereby limiting               stands a higher level, which is not explicitly stated
                                         their potential advancement toward artificial gen-             but can be implicitly reflected. For example, a
                                         eral intelligence (AGI). To address this limitation,           user’s taste preferences represent reflective mem-
                                         many recent works propose LLM-based agents                     ory, while their preference for specific dishes is
                                             * Co-first authors.                                        factual memory. Second, most of them are limited
                                             †
                                              Corresponding authors.                                    to participation scenarios, where the agent interacts
                                             ‡
                                              Beijing Key Laboratory of Research on Large Models        with the user from a first-person perspective. How-
                                         and Intelligent Governance
                                            §
                                              Engineering Research Center of Next-Generation Intelli-   ever, in the agent’s daily usage, there are also ob-
                                         gent Search and Recommendation, MOE                            servation scenarios, where the agent observes and
records the user’s messages from a third-person          Table 1: The comparision among different datasets. PS
perspective. Moreover, most of them are just focus-      indicates Participation Scenario. OS indicates Obser-
                                                         vation Scenario. FM indicates Factual Memory. RM
ing on the effectiveness of memory mechanisms
                                                         indicates Reflective Memory.
without considering their efficiency and capacity,
which is also significant in real-world applications.       Datasets     Profiles    Scenarios     Levels
    To address these limitations, we propose a more        PerLTQA         ✓            PS          FM
comprehensive dataset and benchmark to evaluate            LoCoMo          ×            PS          FM
the memory capability of LLM-based agents. The            LongMemEval      ×            PS          FM
                                                          MemBench         ✓         PS & OS      FM & RM
major features of our dataset and benchmark are
presented as follows:
    Multi-scenario Dataset. To evaluate the agent’s      and personal assistants (Li et al., 2024), because of
memory capabilities across different scenarios, our      their great capabilities in solving complex tasks and
dataset includes data from two common usage sce-         interactive scenarios (Wang et al., 2024a). Among
narios. The first is the participation scenario, where   the various abilities of agents to solve problems,
the agent interacts with the user. The second is the     memory is one of the most important, which is re-
observation scenario, where the agent is assumed         sponsible to store observed information and recall
as the role of an observer and required to record        relevant experiences, in order to support LLM in-
the information provided by the user.                    ference (Zhang et al., 2024a). The evaluation on
    Multi-level Memory Content. Our dataset fo-          the memory capability of LLM-based agents is a
cuses on both factual memory and reflective mem-         critical problem for developing advanced memory.
ory, enabling a comprehensive evaluation of the             Previous datasets used for memory evaluation
memory capability of LLM-based agents. It allows         mainly come from dialogue datasets designed to
for the evaluation of memory capabilities in tasks       evaluate chat assistants, focusing on assessing the
including information extraction, cross-session rea-     factual memory capabilities of the assistant. Lo-
soning, knowledge updating, temporal reasoning,          CoMo (Maharana et al., 2024) constructs long-
as well as reflective summarization.                     term conversations with LLM-expanded person-
    Multi-metric Evaluation. Based on our dataset,       alized descriptions and temporal event graphs, cre-
we introduce a multi-metric benchmark to evaluate        ating conversations for multiple evaluation tasks.
the memory capabilities of LLM-based agents. To          LongMemEval (Wu et al., 2024a) builds a user-
provide a comprehensive and obvious assessment           assistant interaction dataset with attribute ontology
of the various aspects of the agent’s memory perfor-     and timestamped history. Xu et al. (2022) adapts
mance, we offer four evaluation metrics, including       PersonaChat (Zhang et al., 2019) through transla-
accuracy, recall, capacity, and temporal efficiency.     tion and role-playing, with annotated personaliza-
    In summary, we introduce a dataset featuring         tion usage and partial information visibility. Bai
multi-scenario and multi-level content, which is         et al. (2023) propose a bilingual benchmark in En-
distinctively different from previous datasets. Ad-      glish and Chinese, covering comprehensive tasks
ditionally, we introduce a more comprehensive            like Q&A, summarization, and code completion.
benchmark with mutli-metric evaluations. To bene-        An et al. (2023) provide a dataset designed to eval-
fit the research community, we have released our         uate long-context language models across diverse
dataset and project at Github repository* . In the       domains and input lengths. PerLTQA (Du et al.,
following parts, we provide the related works in         2024) generates character profiles and events with
Section 2. We illustrate the process of data con-        ChatGPT and Wikipedia, creating profiles, events,
struction in Section 3, and present the benchmark        and QA pairs after manual validation.
with analyses in Section 4. Finally, we draw con-           As we have shown in Table 1, most of these
clusions of our paper in Section 5.                      datasets lack diverse scenarios, focusing only on
                                                         participation scenarios (PS) and overlooking the
2    Related Works                                       agent’s observation scenarios (OS). Additionally,
                                                         they only focus on factual memory (FM), neglect-
In recent years, LLM-based agents have been
                                                         ing reflective memory (RM). Some works do not
widely applied in many fields, such as recommenda-
                                                         include the profiles of users. Previous studies typi-
tion (Wu et al., 2024b), finance (Ding et al., 2024)
                                                         cally use these datasets in long-context evaluation
    * https://github.com/import-myself/Membench          methods that do not align with the agent’s mem-
ory process. Moreover, the evaluation metrics used      scenario. We expand it to the participation scenario
with these datasets are not comprehensive.              using the self-dialogue method. When selecting
   Compared with previous works, our work is the        high-level preference attributes, we should choose
first study that emphasizes reflective memory, puts     multiple low-level preference attributes from the
forward observation scenarios, adopts evaluation        mapping dictionary and use these low-level pref-
methods that are better suited to the agent’s mem-      erence attributes to generate the corresponding ev-
ory process, with more comprehensive metrics.           idence dialogues. For example, a user might say,
                                                        "I like the movie Star Wars". To ensure fluency of
3     Dataset Construction                              the conversation, the specific discussions about the
                                                        low-level preferences, such as the discussion about
3.1    Pipeline of Data Generation
                                                        content of the movie, are inserted between the key
Inspired by MemSim (Zhang et al., 2024b), we ex-        dialogues to form a complete conversation. Finally,
pand the dataset for memory evaluation based on         the remaining relevant attributes are used to gener-
this framework. Building upon the question types        ate multi-turn dialogues. The evidence dialogues
of factual memory included in Memsim, we extend         will be inserted into them to form a complete ses-
the evaluation of the ability for memory knowl-         sion. We introduce a time-based session division
edge updating and extracting information from the       approach, where the timestamp within a session is
assistant’s response in single or multi-session. In     assigned continuously to each turn dialogue, typi-
addition, we incorporate reflective memory gener-       cally with short intervals, such as one minute. The
ation methods and extend observation scenario to        timestamp across different sessions maintains a
participation scenario. The dataset creation process    sequential order, but the time gap between two ad-
is as follows and as shown in Figure 1.                 jacent sessions is typically longer, such as one day.
   User’s Relation Graph Sampling. Following
the approach of Memsim, we create a relation            3.2   Multi-scenario Memory
graph composed of user profiles and their related       The interactive scenarios of the agent can be cate-
entities including individuals, events, places, and     gorized into two types, including the participation
items. Based on Memsim’s method for sampling            scenario and the observation scenario. In the partic-
attributes related to factual memory, we propose        ipation scenario, the agent interacts with the user,
a method for sampling of high-level attributes re-      while in the observation scenario, the agent serves
lated to reflective memory. To better fit the dis-      only as an observer, recording user-inputted mes-
tribution of high-level attributes in the real world,   sages. In the participation scenario, other modules
we leverage user-item relationship pairs and rele-      of the agent, such as the reasoning module, will
vant ratings from three recommendation datasets,        affect the memory module. However, in the obser-
including MovieLens (Harper and Konstan, 2015),         vation scenario, the agent does not perform actions
Food (Majumder et al., 2019), and Goodreads (Wan        and thus does not influence memory. These two sce-
and McAuley, 2018; Wan et al., 2019). We extract        narios cannot be considered the same. Therefore,
each user’s high-level preferences in each recom-       we provide the following two types of datasets:
mendation dataset by identifying the most frequent         Participation Memory Scenario. The partici-
category of items with which he or she likes or rates   pation memory scenario is represented by the di-
positively. If there is no category information, we     alogue between the user and the agent, which is
utilize LLMs(GPT-4o-mini) to summarize the high-        the agent’s typical usage scenario. To eliminate
level preferences corresponding to these positive       the influence of other modules of the agent, we
relation items. We assign high-level preference at-     predefine the agent’s responses to the user’s expres-
tributes using either random matching or matching       sions. In the user-agent dialogue interaction, the
based on identical attributes, and then we obtain       agent’s memory not only needs to remember the
the user’s relation graph shown in Figure 2. At the     message expressed by the user but also needs to
same time, we construct three one-to-many map-          store the message of the agent’s responses, such as
pings between high-level preferences and low-level      the agent’s reply when the user requests a recom-
factual attributes with LLMs or the item-category       mendation. In our dataset, the data for participation
relationships from the recommendation datasets.         scenario dataset consists of sessions composed of
   Memory Dataset Construction. Memsim pro-             many turns in dialogues.
vides a data creation process for the observation          Observation Memory Scenario. The observa-
                                 Places:                                                  User Graph                           Attribute
                                                                                                                                                                                                      QA
                                                   ……                                                                            time: next week Mon 7:00 PM
  items:
                                                                        work_events:                                                                                                Question:
                   ……                                                                                                            event_name: Build Start 2024
                              name: Emily Johnson                                                                                                                                   What time is Build Start
                                                                        event_type:
                                                                          work_events:
                              age: 36 years old                            event_type:                                                                                              2024 scheduled to begin?
                                                                        Project Kickoff Project
                                                                                         Meeting               Sampling          My Build Start 2024 is
                              height: 170 cm                                       Kickoff Meeting
 Note                         birthday: 10/22
                                                                        location:  Portland,
                                                                           location:         OROR
                                                                                     Portland,                                   happening next week on       Conversation
                                                                           time:  next week
                                                                        event_name:     Build Mon
                                                                                              Start 7:00
                                                                                                    2024PM                       Monday at 7:00 PM., ……                             Answer:
                              hometown: Jacksonville, FL                   event_name:    Build
  relation_profiles:                                                    time:  next
                                                                           scale:   week
                                                                                  seven    Mon Start
                                                                                         hun    7:00 PM2024
                                                                                                                                          That sounds exciting! I hope
                                                                        scale:
                                                                          …… seven hundred people                                         everything goes smoothly for              2024-10-07 Monday
                                colleague_profiles:                     duration: nine day                                                                                          19:00
                  ……                                                                                                                      your Build Start event next
                                                                                                                                          week., ……
                                                  ……



   * These conversations occur in the same session.                                                                                                                                                Timeline
                                                             Yes, I'm looking forward                           Duplicated             Assign timestamp             I'm planning to network
                   I'm going to attend                                                                                                                              with as many people as
                   Build Start 2024.                         to the construction
                                                             project kickoff.                                                                                       possible there.
                                                                                                                          ……
                       That sounds exciting!
                       Build Start 2024 is a
                                                                   The kickoff will definitely
                                                                                                              ……                 ……
                                                                                                                                                    ……                Networking could open up
                                                                                                                                                                      new opportunities and              ……
                                                                   set the tone for the                                                                               insights during the event.
                       great opportunity.                          project ahead.


                                                                                                                                                                                                     Time

                       2024-10-04 08:04                                  2024-10-04 08:05                                 2024-10-04 08:08                                   2024-10-04 08:09
                            Friday                                            Friday                                           Friday                                             Friday
                                                                                                               ……
                                                                                                                ……
Figure 1: An example of generating dialogue data. First, the event "Build Start 2024" is extracted with the time
"next week Mon 7:00 PM," which is then used to generate evidence dialogues and questions. It’s merged with
dialogues generated from other attributes to form a complete dialogue, and an answer is generated based on the
provided time label "2024-10-07 Monday 19:00".

                                 name:
                                 Amelia Brooks
                                                        name: Ethan
                                                        Cooper
                                                        relationship:
                                                                                                                   and reason at higher levels to generate reflective
            event_name:
              event_name:
            Team Connect
              Team Connect
                                 relationship: Sister
                                 birthday: 12/11
                                 ……
                                                        Brother
                                                        hometown:
                                                        Boston, MA
                                                                                 item_name: Arm &
                                                                                 Hammeritem_name:
                                                                                         Liquid
                                                                                       Arm  & Hammer
                                                                                                                   memory. Reflective memory enables the agent to
            ……                                                                   Detergent
                                                                                       Liquid
                                                        ……                       …… Detergent
                                                                                       ……                          gain a more comprehensive understanding of the
      item_name:
        item_name:
      De'Longhi Oil-Filled
        De'Longhi    Oil-
        Filled Radiator
      Radiator                                                                   name: Maya Carter
                                                                                 relationship: subordinate
                                                                                                                   user, thereby improving the satisfaction of subse-
      ……
                                         name: James Smith                       hometown:
  name: Clara Jennings                   relationship: self
                                         gender: Male
                                                                                 Los Angeles, CA
                                                                                 hobby:
                                                                                                                   quent interactions. From this perspective, we di-
  relationship: Niece,                                                           Collecting Antiques
                                         age: 30 years old
  age: 28 years old
  company: TechInnovate                  birthday: 08/13,
                                         hobby: Climbing,
                                                                                 ……                                vide the types of memory data and questions in our
  Systems LLC ……
                                         character: Friendly
   name: Sophie Turner                   movie_genre_preference:
                                         Comedy
                                                                              event_name: Policing Forum
                                                                                event_name:
                                                                              duration:
                                                                                Forum 1 day
                                                                                               Policing            dataset into two categories:
   relationship: Aunt                                                         ……duration: 1 day
   hometown: Chicago, IL                 ……
   ……
       name: Nolan Hayes
                                                                              name: Landon Pierce
                                                                              relationship: Uncle                     Factual Memory. It refers to the specific factual
       relationship: boss                                                     age: 27 years old
       hometown: Philadelphia, PA
       ……
                                                                              hometown: Philadelphia, PA
                                                                              ……                                   attributes of the users or the entities associated with
                                place_name:             name: Maxwell Turner
                           place_name:
                                Lakeview
                                Apartments
                           Lakeview Apartments          relationship: coworker
                                                        hometown: Indianapolis, IN
                                                                                                                   them, such as their relative’s age or occupation, the
                           ……
                                                        ……
                                                                                                                   time details of events and so on. This information
                                                                                                                   will be expressed in daily dialogues between users
Figure 2: A user relation graph is composed of a user’s
                                                                                                                   and agents. Asking questions about these attributes
profile and his or her associated entities including indi-
viduals, events, items and places.
                                                                                                                   can test various memory abilities of the agent. For
                                                                                                                   example, in dialogues, the user may not directly
tion memory scenario is represented by the flow                                                                    express the time of an event but might use indirect
of message input from the user to the agent. In                                                                    references, such as "next Monday", we can eval-
this process, the agent passively receives the user’s                                                              uate the agent’s ability to extract information and
message flow over time and does not interact with                                                                  instantly convert time-related information by ask-
the user. This scenario focuses on the agent’s role                                                                ing it the exact time of the day of the month of the
as an observer, where the agent only needs to re-                                                                  event. In addition, we can also evaluate its ability
member the message expressed by the user without                                                                   to update knowledge based on different expressions
taking any action. In our dataset, the data for ob-                                                                of the same attribute over time. Furthermore, by
servation scenario dataset consists of message lists                                                               designing questions that require the integration of
composed of many messages.                                                                                         multiple entities’ attributes for answers, we evalu-
                                                                                                                   ate the agent’s memory capability in terms of its
3.3        Multi-level Memory                                                                                      memory reasoning abilities in both single-session
                                                                                                                   and multi-session contexts. These question exam-
In the daily usage of LLM-based agents, we expect
                                                                                                                   ples are shown in Figure 3.
it to have factual memory capabilities, while also
hoping that its memory mechanism can summarize                                                                            Reflective Memory. Reflective memory refers
                                Single Session.                                                       Multi Session.                                                  Please recommend a delicious dish to          User
   Single Hop                                       Question:                  Comparative                                                                            try, aside from the ones mentioned.           Agent
                                                    What is the name of            My niece, Clara Jennings, is 28 years       Question:
       My niece runs a company called               my niece's company?            old.                                        Who is older,                           Apple Pie is a great treat everyone          Session gap
       TechInnovate Systems LLC.                                                                               ……                                                      should try!
                                                                                                                               Clara Jennings
                              ……                    Answer:                                                                    or Landon
                                                    TechInnovate Systems           My Uncle Landon Pierce is 27 years          Pierce?
   Multi Hop                                        LLC                            old.                                                                               Recommend a new book to read.
       My sister's name is Amelia Brooks,                                                                        ……            Answer:
                                                                                                                                                                       Naked is excellent, worth checking out!
       and she's always been a real                 Question:                                                                  Clara Jennings
       standout with her creativity and             What is the birthday        Aggregative
       charm.                                       of someone named               My brother Ethan is from Boston,
                              ……                                                                                                                                      Suggest another book, please.
                                                    Amelia Brooks?                 MA ……
       My sister's birthday is coming up on                                                                  ……
                                                                                                                                                                        Check out Politically Correct Bedtime
       December 11th.                               Answer: 12/11                                                                                                       Stories; it offers a humorous twist on
                              ……
                                                                                   My uncle, Pierce, is from Philadelphia,                                              classic tales.
   Knowledge Update                                                                PA ……
                                                                                                                 ……            Question:
       The Policing Forum lasts for four            Question:                                                                  How many                         Multi session highlevel preference
       days, and I can't wait to see what           How long does the           A series of other Other Sessions               people live in
       they have in store during that time.         Policing Forum last?                                                       Philadelphia,                          I'm a big fan of prosciutto and melon;
                                                                                   My boss, Nolan Hayes, is from               PA?                                    there's just something about that
                              ……                                                   Philadelphia, PA.                                                                  sweet and savory combination that I
                                                    Answer:
       I just realized I need to correct            one day                                                      ……            Answer:                                can't resist!            ……
 Note  myself—Policing Forum lasts for
       one day.
                                                                                                                               2 people
                             ……                                                    Sophie Turner, my aunt, hails from
                                                    Question:                      Chicago, IL.                                                                       I'm a fan of Prosciutto and Melon, but
   Post Processing                                  What are the main                                            ……                                                   I also really enjoy Salted Maple Ice       Question:
                                                    interests and hobbies                                                                                             Cream; it's a unique treat that hits the   According to
       My subordinate has this cool                 of the individual with                                                                                            spot!                     ……               the dishes I
       hobby of collecting antiques.                the email                      My coworker, Maxwell, is from                                                                                                 mentioned,
                             ……                     maya.carter@bostonl            Indianapolis, IN.                                                                                                             Which flavor I
                                                    aw.gov?                                                      ……                                                   I really love Salted Maple Ice Cream,
       My subordinate's email address is                                                                                                                                                                         might prefer?
                                                                                                                                                                      and Pecan Praline is another favorite of
       maya.carter@bostonlaw.gov.                   Answer:                                                                    Question:                              mine!
                              ……                                                                                               What movies,                                                    ……                Answer:
                                                    Gather historical                                                                                                                                            Sweet and Salty
                                                    items and appreciate        Multi session assistant                        books, and
   Single session assistant                                                                                                    dishes have you
                                                    their value                    Recommend a great movie.
       Recommend a great movie to                                                                                              recommended                            I really enjoy Pecan Praline, but I also
       watch.                                                                       Try Alien (1979); it's a great sci-fi      to me?                                 have a soft spot for Salted Butter
                                                    Question:                       horror!                                                                           Toffee; there's something so satisfying
             Return of the Jedi (1983) is iconic    What movies have                                                           Answer:                                about that perfect blend of sweet and
             with thrilling space battles!          you recommended?                                                           [Alien (1979),                         salty.
                                                                                                                               The Fugitive                                                    ……
                                                                                   Please suggest another movie, aside         (1993), Apple
       Suggest another fantastic movie.             Answer:                        from the ones I mentioned.
                                                    [Return of the Jedi                                                        Pie, Naked,                            I really love Salted Peanut Butter
             Jurassic Park (1993) is incredible     (1983), Jurassic Park            How about The Fugitive (1993)? It's       Politically                            Cookies, just like I enjoy Salted Butter
             with groundbreaking effects!           (1993)]                          thrilling!                                Correct Bedtime                        Toffee.
                                                                                                                               Stories]                                                        ……




                                      Figure 3: An overview of part categories of data used to test different abilities.
                                                                                                                                                                  500




                                                                                                                                                 Number of Sessions
                                                   SingleHop                                                                 SingleHop                            400
                                                   MultiHop                                                                  MultiHop
             13.6%       13.6%                     Comparative                          12.5%     8.3%                       Comparative                          300
                                 4.5%              Aggregative                                           12.5%               Aggregative
      9.1%                                         PostProcessing                                                            PostProcessing                       200
                                                   KnowledgeUpdate                                                           KnowledgeUpdate
                                   13.6%           SingleAssistant              20.8%                         12.5%          SingleHighlevel                      100
   9.1%                                            MultiAssistant                                                                                                   0
                                                   SingleHighlevel                                                                                                          0, 0
                               9.1%
                                                                                                                                                                         [0. .1)
       9.1%
                                                                                                                                                                            1,
                                                   MultiHighlevel
                                                                                                                                                                            2, 0
                                                                                                                                                                         [0. .2)
                                                                                                                                                                               0
                                                                                                         12.5%
                                                                                                                                                                         [0. .3)
                                                                                                                                                                            3, 0
                                                                                                                                                                         [0. .4)
                                                                                                                                                                            4, 0
                                                                                                                                                                         [0. .5)
                                                                                                                                                                            5,
                                                                                                                                                                            6, 0
                                                                                                                                                                         [0. .6)
                                                                                                                                                                               0
                                                                                                                                                                         [0. .7)
                9.1% 9.1%                                                                 20.8%                                                                       [0.   7, 0
                                                                                                                                                                         [0. .8)
                                                                                                                                                                            8, 0
                                                                                                                                                                         [0. .9)
                                                                                                                                                                                                Round Location
                                                                                                                                                                            9, 1.0 )

                                                                                                                        (c) The distribution of the number of dif-
(a) The distribution of different types of                                   (b) The distribution of different types of ferent round locations of key evidence
questions in the participation dataset.                                      questions in the participation dataset.    dialogue turn within a session.

                           Figure 4: The details of the category distribution and answer distribution in the dataset.

to the extraction and summarization of high-level                                                                     set as multiple-choice questions. After the agent
preferences based on the user’s expression of low-                                                                    completes the memory process, both the questions
level preferences, including some factual attributes                                                                  and options will be submitted to the agent. The
in the dialogue. For example, the user’s taste pref-                                                                  accuracy score of the memory is calculated by com-
erences are inferred from his expressions of liking                                                                   paring the agent’s choice with the true choice.
for different dishes. To enhance the credibility                                                                         Memory Recall. For retrieval-based memory
of the answers, our memory content is reinforced                                                                      mechanisms, the accuracy of retrieval is also an
through multiple expressions of different factual                                                                     important metric that needs to be measured. It not
preferences or attributes to strengthen the under-                                                                    only reflects the agent’s ability to effectively store
standing of the agent. We can evaluate the agent’s                                                                    and organize memory content, but also indicates
memory mechanism’s ability to extract and sum-                                                                        the agent’s efficient use of memory when answer-
marize preferences at different levels.                                                                               ing questions. In the process of creating dialogues,
                                                                                                                      we first generate key evidence dialogues for an-
3.4          Multi-metric Evaluation                                                                                  swering questions, which enables the measurement
In order to more comprehensively assess the mem-                                                                      of retrieval accuracy.
ory mechanism of the agent, we employ a total of                                                                         Memory Capacity. We consider that the agent’s
four evaluation metrics as follows.                                                                                   memory mechanism might have a capacity limit,
   Memory Accuracy. To avoid misjudgments                                                                             which is reflected in a sharp decline in accuracy
caused by the agent’s flexible expression of an-                                                                      when the amount of memory content reaches a cer-
swers, in our evaluation dataset, all questions are                                                                   tain point. This critical threshold represents the
Table 2: The statistics of our dataset. TPT indicates the        4.1   Experimental Settings
average number of tokens per trajectory. PS indicates
Participation Scenario. OS indicates Observation Sce-            To better align with the memory process of agents
nario. RM indicates Reflective Memory. FM indicates              in real-world scenarios, particularly the flow of
Factual Memory                                                   time, we simulate the interaction process between
    Data Type   # Session   # Question   # Trajectory    TPT     the user and the agent to input the content that
     PS-RM        3.5k        3.5k          3.5k        2,195    needs to be remembered. At time t, we input the
     PS-FM        51k         39k            8k         10,285   user’s statement from the t-th round, while content
     OS-RM         2k          2k            2k          745     from the previous t − 1 round and earlier can only
     OS-FM        8.5k        8.5k          8.5k         617
                                                                 be recalled through memory. In the participation
capacity of the memory. This phenomenon might                    memory scenario, at the t-th round, the agent not
not exist, because, for example, when evaluating                 only needs to remember the user’s messages but
the retrieval-based memory mechanisms, their ac-                 also needs to remember the response it has gen-
curacy depends on the effectiveness of retrieval.                erated, which is predefined by us. Meanwhile, in
                                                                 the observation scenario, the agent only needs to
  Memory Efficiency. Regarding the design of
                                                                 remember the user’s messages.
the agent’s memory mechanism, we need to fo-
cus not only on the accuracy and completeness of                    To set different levels of difficulty, we utilize
the memory but also on efficiency. Some memory                   the noise dataset to randomly insert some noise
mechanisms may result in excessively high pro-                   sessions into the adjacent sessions. By controlling
cessing time costs for the agent, which could be                 the proportion, we create a dataset with an aver-
unacceptable in practical applications.                          age length of over 100k tokens for each individual
                                                                 test. Due to the large number of datasets we have
                                                                 created and the complexity of the agent’s memory
3.5     Dataset Statistics
                                                                 mechanism design, we perform uniform sampling
The dataset consists of two parts: (1) 500 graphs                on each subset of the two different sized datasets
composed of user profiles and profiles of entities               as the final tests in this paper. In the dataset of
associated with users, and (2) multiple dialogues                ordinary size, we extract 120 reflective memory
between users and assistants, multiple users’ mes-               and 360 factual memory data in participation test
sages, and corresponding questions. The quantity                 data (each session has about 10K tokens), as well
is shown in Table 2. In order to better simulate the             as 60 reflective memory data and 280 factual mem-
distribution of the location of answer in real-world             ory data in observation test data (each message list
conversation, the key evidence rounds in a session               has about 1K tokens), formulating as Sub-dataset
are almost evenly distributed in each round in a ses-            1. For the 100k dataset, we extract 30 reflective
sion. As shown in Figure 4, we can see the quantity              memory data and 90 factual memory data in par-
distribution of different categories and the quantity            ticipation test data (each session has about 100K
distribution of key evidence rounds in the session.              tokens), as well as 15 reflective and 84 factual mem-
                                                                 ory data in observation test data (each message list
4     Benchmark                                                  has about 10K tokens), denoted as Sub-dataset 2.
                                                                    To eliminate the influence of other memory
In this section, we create a benchmark based on our              mechanism designs on the agent in the evalua-
dataset to evaluate the memory capabilities of LLM-              tion results, we make no modifications to the
based personal agents. To better evaluate the upper              agent’s action modules or other components.Based
bounds of the agent’s memory mechanism capabil-                  on MemEngine (Zhang et al., 2025), we imple-
ities, we also utilize the News dataset (DataGuy                 ment seven memory mechanisms, using Qwen2.5-
and Amoako, 2022) to generate a large amount of                  7B as the base model for the agent applica-
dialogues and messages serving as noise memory                   tions on our benchmark, including FullMem-
content that is irrelevant to the questions. We en-              ory, RetrievalMemory, RecentMemory, Genera-
sures that the content of noise data does not contain            tiveAgent (Park et al., 2023), MemoryBank (Zhong
factual conflicts with memory messages, or dia-                  et al., 2024), MemGPT (Packer et al., 2023),
logues in our evaluation dataset. It also allows us              and Self-Controlled Memory (SCMemory) (Wang
to control the difficulty of the evaluation by adjust-           et al., 2023). In our experiments, all meth-
ing the proportion of noise data.                                ods that involve retrieval use the multilingual-e5-
Table 3: The results of different memory mechanisms on factual memory dataset. The read time (RT) and write
time (WT) are presented in seconds per operation.
                     Participation-Accuracy   Paticipation-Efficiency                    Observation-Accuracy                              Observation-Efficiency
       Method
                      10k        100k          RT          WT                              1k              100k                             RT                 WT
    FullMemory       0.647       0.489        0.001       <0.001                         0.786            0.631                            <0.001             <0.001
  RecentMemory       0.639       0.422        0.001       <0.001                          0.8             0.512                            <0.001             <0.001
 RetrievalMemmory    0.692       0.833        0.041       0.058                          0.883            0.933                             0.024              0.026
  GenerativeAgent    0.478       0.455        0.045        6.116                         0.779            0.476                             0.031              6.239
   MemoryBank        0.442       0.456        0.035       8.047                          0.721            0.488                             0.037             18.243
      MemGPT         0.455       0.411        4.549        0.106                         0.789            0.488                            1.541              2.480
     SCMemory        0.355       0.444        1.531       2.276                          0.529            0.429                             0.085              0.535
                                Participation-Recall@10                                                   Observation-Recall@10
       Method
                              10k                      100k                                            10k                                            100k
 RetrievalMemmory            0.776                     0.749                                           0.847                                         0.769

Table 4: The results of different mechanisms on reflective memory dataset. The read time (RT) and write time (WT)
are presented in seconds per operation.
                     Participation-Accuracy   Paticipation-Efficiency                    Observation-Accuracy                              Observation-Efficiency
       Method
                      10k        100k           RT             WT                          1k              100k                             RT                 WT
    FullMemory       0.733       0.533        <0.001      <0.001                         0.883            0.333                            <0.001             <0.001
  RecentMemory       0.700       0.333        <0.001      <0.001                         0.867            0.400                            <0.001             <0.001
 RetrievalMemmory    0.692       0.833         0.036      0.057                          0.883            0.933                             0.026              0.028
  GenerativeAgent    0.742       0.333         0.028       6.064                         0.883            0.200                             0.030              6.019
   MemoryBank        0.692       0.400        0.033       15.705                         0.900            0.333                             0.032             12.827
      MemGPT         0.733       0.367         1.042      <0.001                         0.883            0.200                            0.921              <0.001
     SCMemory        0.542       0.267        0.036        0.057                         0.783            0.333                             0.025              0.028

                                                                                                                                 0.7
small (Wang et al., 2024b) for retrieval.
                                                                          0.6                                                    0.6


                                                               Accuracy                                               Accuracy
                                                                                                                                 0.5
4.2   Evaluations on Factual Memory                                       0.4
                                                                                                                                 0.4
                                                                          0.2
The test results for factual memory are shown in Ta-                                                                             0.3
                                                                                0   20k 40k 60k 80k 100k 120k 140k                     0    20k 40k 60k 80k 100k 120k 140k
ble 3. FullMemory, RetrievalMemory, and Recent-                                               Tokens                                                  Tokens
Memory perform better than other memory mecha-                                                                                  0.7
                                                                          0.7
nisms on Sub-dataset 1. However, on Sub-dataset 2,                                                                              0.6
                                                                          0.6

                                                               Accuracy                                              Accuracy
FullMemory and RecentMemory exhibit a certain                                                                                   0.5
                                                                          0.5
degree of decline, as the target message may fall                         0.4                                                   0.4

outside the memory window. Due to the smaller                             0.3                                                   0.3
                                                                                0   20k 40k 60k 80k 100k 120k 140k                    0    20k 40k 60k 80k 100k 120k 140k
window size of RecentMemory, the decline is more                                              Tokens                                                 Tokens
obvious. Other designed memory mechanisms did                  Figure 5: The accuracy of SCMemory(top-left),
not show significantly superior performance in our             MemGPT(top-right), GenerativeAgent(bottom-left) and
evaluation, which might be due to flaws in these               RecentMemory(bottom-right) as the memory token in-
memory mechanisms. Additionally, it is impor-                  creases.
tant to note the time consumed by these memory                 part, we evaluate on the reflective memory.
mechanisms when reading and writing each round
of message, especially MemGPT, which takes a                   4.3                  Evaluations on Reflective Memory
longer time to read information, and MemoryBank,               The test results for reflective memory are shown in
which takes longer to write information.                       Table 4. It can be observed that GenerativeAgent,
   The previous evaluation works are not focus-                MemGPT, and MemoryBank performed very well
ing on the design of agent memory mechanisms                   on Sub-dataset 1, but their performance signifi-
and solely provided factual memory datasets, so                cantly declines on Sub-dataset 2. Only the retrieval-
it could not adequately discuss the agent’s ability            based RetrievalMemory achieved the remaining
to summarize reflective memory. In the following               good results. It is likely due to the limited con-
Table 5: The results of memory mechanisms with different LLMs on our sub-dataset 1. The read time (RT) and
write time (WT) are presented in seconds per operation. For the reflective memory, P-Accuracy means the accuracy
under the participant scenario, and O-Accuracy refers to the accuracy under the observation scenario.

                          Factual-Participation              Factual-Observation             Reflective Memory
       Method
                       Accuracy      RT       WT         Accuracy        RT        WT     P-Accuracy   O-Accuracy
                                                  Qwen2.5-7B-Instruct
    FullMemory           0.647      0.001    <0.001        0.786        <0.001   <0.001     0.733         0.883
  RecentMemory           0.639      0.001    <0.001        0.800        <0.001   <0.001     0.700         0.867
 RetrievalMemmory        0.692      0.041     0.058        0.883         0.024    0.026     0.692         0.883
  GenerativeAgent        0.478      0.045     6.116        0.779         0.031    6.239     0.742         0.883
                                                      GPT-4o-mini
    FullMemory           0.736      0.001    <0.001        0.864        <0.001   <0.001     0.783         0.883
  RecentMemory           0.697      0.001    <0.001        0.864        <0.001   <0.001     0.758         0.900
 RetrievalMemmory        0.633      0.003     0.031        0.857         0.023    0.023     0.767         0.900
  GenerativeAgent        0.592      0.107     0.970        0.846         0.030    0.998     0.758         0.900
                                            Meta-Llama-3.1-8B-Instruct
    FullMemory           0.519      0.001    <0.001        0.779        <0.001   <0.001     0.708         0.817
  RecentMemory           0.461      0.001    <0.001        0.779        <0.001   <0.001     0.683         0.850
 RetrievalMemmory        0.500      0.050     0.062        0.700         0.044    0.049     0.733         0.833
  GenerativeAgent        0.430      0.036     6.551        0.725         0.065   12.322     0.725         0.850
                                                     glm-4-9b-chat
    FullMemory           0.475      0.001    <0.001        0.775        <0.001   <0.001     0.658         0.850
  RecentMemory           0.539      0.001    <0.001        0.746        <0.001   <0.001     0.708         0.850
 RetrievalMemmory        0.483      0.032     0.037        0.739         0.025    0.025     0.742         0.800
  GenerativeAgent        0.439      0.050     0.165        0.718         0.030    0.111     0.675         0.900


text window of the models or the incorporation               Therefore, we evaluate the performance of several
of forgetting mechanisms in these memory sys-                common models across various memory mech-
tems, which leads to the loss of important mem-              anisms. Specifically, we selected Qwen2.5-7B-
ories. However, these findings still suggest that            Instruct, gpt-4o-mini, Meta-Llama-3.1-8B-Instruct
well-designed memory mechanisms are capable of               and glm-4b-chat (GLM et al., 2024) for evalua-
effectively capturing reflective memory. How to              tion. The results are shown in Table 5. Under the
maintain this ability after prolonged interactions           same context window length, the choice of base
may pose a challenging research problem.                     model significantly affects the agents’ performence.
                                                             In most cases, GPT-4o-mini performs as the best
4.4   Evaluations on Memory Capacity                         model compared to others. Although the factual
To explore the capacity of the agent’s memory                memory capability of Meta-Llama-3.1-8B-Instruct
mechanism, we test the answering accuracy of each            is notably inferior to that of other models, its reflec-
round after the key evidence turns on the observa-           tive memory ability is still relatively good. Interest-
tion scenario in Sub-dataset 2(100k). In order to            ingly, for GenerativeAgent, choosing GPT-4o-mini
observe the changes in the accuracy of MemGPT                as the base model results in a significantly higher
and Self-Controlled Memory with the number of to-            time consumption compared to other models in our
kens increases, we drew Figure 5. From the results,          experiments. However, in most cases, the time con-
we can observe that both memory mechanisms ex-               sumption differences between the three models are
hibit a sharp decline, which may be due to the               not substantial.
upper limit of memory performance retention ca-
pacity for these memory mechanisms in Qwen2.5-               5      Conclusion
7B-Instruct (Yang et al., 2024; Team, 2024).                 This paper provides a more comprehensive and
                                                             scalable dataset for evaluating LLM-based agent’s
4.5   Comparison of Different Inference Models               memory mechanisms. It includes a dataset with
In practical applications of agents, different models        multi-scenarios (both participation and observa-
may be selected for different memory mechanisms.             tion), and multi-level memory content include re-
flective memory and factual memory. Based on             References
this dataset, we constructed a time-aware evalua-        Chenxin An, Shansan Gong, Ming Zhong, Mukai
tion framework that simulates the daily interactions       Li, Jun Zhang, Lingpeng Kong, and Xipeng Qiu.
between users and agents with multi-metric include         2023. L-eval: Instituting standardized evaluation
accuracy, recall, capacity and temporal efficiency.        for long context language models. arXiv preprint
                                                           arXiv:2307.11088.
We evaluate the performance of seven common
memory mechanisms in agents on our benchmark.            Yushi Bai, Xin Lv, Jiajie Zhang, Hongchang Lyu,
                                                           Jiankai Tang, Zhidian Huang, Zhengxiao Du, Xiao
                                                           Liu, Aohan Zeng, Lei Hou, et al. 2023. Longbench:
Limitations                                                A bilingual, multitask benchmark for long context
                                                           understanding. arXiv preprint arXiv:2308.14508.
The dataset proposed in this paper consists of a
graph formed by the profiles of users and relevant       DataGuy and Gordon Amoako. 2022. twitter-news.
entities, enabling further exploration of the agent’s    Han Ding, Yinheng Li, Junhao Wang, and Hang Chen.
memory mechanism. Our evaluation method is lim-            2024. Large language model agent in financial trad-
ited by an assessment of memory for structured             ing: A survey. arXiv preprint arXiv:2408.06361.
data. However, by comparing the construction of          Yiming Du, Hongru Wang, Zhengyi Zhao, Bin Liang,
relevant entity profiles or the capture of specific        Baojun Wang, Wanjun Zhong, Zezhong Wang, and
attribute information in the agent’s memory dur-           Kam-Fai Wong. 2024. Perltqa: A personal long-term
                                                           memory dataset for memory classification, retrieval,
ing user-agent interactions, we can investigate the        and synthesis in question answering. arXiv preprint
agent’s ability to structure memory. In addition,          arXiv:2402.16288.
there are still many areas to explore in reflective
                                                         Team GLM, Aohan Zeng, Bin Xu, Bowen Wang, Chen-
memory, such as users’ emotional memory.                   hui Zhang, Da Yin, Diego Rojas, Guanyu Feng, Han-
                                                           lin Zhao, Hanyu Lai, Hao Yu, Hongning Wang, Ji-
Ethics Statement                                           adai Sun, Jiajie Zhang, Jiale Cheng, Jiayi Gui, Jie
                                                           Tang, Jing Zhang, Juanzi Li, Lei Zhao, Lindong Wu,
The data used in this article to construct the dataset     Lucen Zhong, Mingdao Liu, Minlie Huang, Peng
                                                           Zhang, Qinkai Zheng, Rui Lu, Shuaiqi Duan, Shu-
includes data from publicly available, authorized
                                                           dan Zhang, Shulin Cao, Shuxun Yang, Weng Lam
datasets. All publicly available data are used in ac-      Tam, Wenyi Zhao, Xiao Liu, Xiao Xia, Xiaohan
cordance with their respective licenses for research       Zhang, Xiaotao Gu, Xin Lv, Xinghan Liu, Xinyi Liu,
purposes. The LLM-generated content may pose               Xinyue Yang, Xixuan Song, Xunkai Zhang, Yifan
risks, including the potential for unintended biases       An, Yifan Xu, Yilin Niu, Yuantao Yang, Yueyan Li,
                                                           Yushi Bai, Yuxiao Dong, Zehan Qi, Zhaoyu Wang,
or harmful output. Although we have taken steps to         Zhen Yang, Zhengxiao Du, Zhenyu Hou, and Zihan
minimize these risks, we encourage users to apply          Wang. 2024. Chatglm: A family of large language
the dataset responsibly to avoid ethical risks.            models from glm-130b to glm-4 all tools. Preprint,
                                                           arXiv:2406.12793.
Acknowledgments                                          F Maxwell Harper and Joseph A Konstan. 2015. The
                                                           movielens datasets: History and context. Acm trans-
This work is supported in part by National Natu-           actions on interactive intelligent systems (tiis), 5(4):1–
ral Science Foundation of China (No. 62422215              19.
and No. 62472427), Major Innovation & Plan-              Yuanchun Li, Hao Wen, Weijun Wang, Xiangyu Li,
ning Interdisciplinary Platform for the “Double-           Yizhen Yuan, Guohong Liu, Jiacheng Liu, Wenx-
First Class” Initiative, Renmin University of China,       ing Xu, Xiang Wang, Yi Sun, et al. 2024. Per-
                                                           sonal llm agents: Insights and survey about the
Public Computing Cloud, Renmin University of               capability, efficiency and security. arXiv preprint
China, fund for building world-class universities          arXiv:2401.05459.
(disciplines) of Renmin University of China. This
                                                         Adyasha Maharana, Dong-Ho Lee, Sergey Tulyakov,
work is also sponsored by Huawei Innovation Re-            Mohit Bansal, Francesco Barbieri, and Yuwei
search Programs. We gratefully acknowledge the             Fang. 2024. Evaluating very long-term conver-
support from Mindspore† , CANN(Compute Archi-              sational memory of llm agents. arXiv preprint
tecture for Neural Networks) and Ascend AI Pro-            arXiv:2402.17753.
cessor used for this research.                           Bodhisattwa Prasad Majumder, Shuyang Li, Jianmo
                                                           Ni, and Julian McAuley. 2019. Generating personal-
                                                           ized recipes from historical user preferences. arXiv
   †
       https://www.mindspore.cn                            preprint arXiv:1909.00105.
Charles Packer, Sarah Wooders, Kevin Lin, Vivian Fang,      Xinchao Xu, Zhibin Gou, Wenquan Wu, Zheng-Yu
  Shishir G Patil, Ion Stoica, and Joseph E Gonzalez.         Niu, Hua Wu, Haifeng Wang, and Shihang Wang.
  2023. Memgpt: Towards llms as operating systems.            2022. Long time no see! open-domain conversa-
  arXiv preprint arXiv:2310.08560.                            tion with long-term persona memory. arXiv preprint
                                                              arXiv:2203.05797.
Joon Sung Park, Joseph O’Brien, Carrie Jun Cai, Mered-
  ith Ringel Morris, Percy Liang, and Michael S Bern-       An Yang, Baosong Yang, Binyuan Hui, Bo Zheng,
  stein. 2023. Generative agents: Interactive simulacra       Bowen Yu, Chang Zhou, Chengpeng Li, Chengyuan
  of human behavior. In Proceedings of the 36th an-           Li, Dayiheng Liu, Fei Huang, Guanting Dong, Hao-
  nual acm symposium on user interface software and           ran Wei, Huan Lin, Jialong Tang, Jialin Wang, Jian
  technology, pages 1–22.                                     Yang, Jianhong Tu, Jianwei Zhang, Jianxin Ma, Jin
                                                              Xu, Jingren Zhou, Jinze Bai, Jinzheng He, Junyang
Qwen Team. 2024. Qwen2.5: A party of foundation               Lin, Kai Dang, Keming Lu, Keqin Chen, Kexin Yang,
 models.                                                      Mei Li, Mingfeng Xue, Na Ni, Pei Zhang, Peng
                                                              Wang, Ru Peng, Rui Men, Ruize Gao, Runji Lin,
                                                              Shijie Wang, Shuai Bai, Sinan Tan, Tianhang Zhu,
Mengting Wan and Julian J. McAuley. 2018. Item rec-
                                                              Tianhao Li, Tianyu Liu, Wenbin Ge, Xiaodong Deng,
 ommendation on monotonic behavior chains. In
                                                              Xiaohuan Zhou, Xingzhang Ren, Xinyu Zhang, Xipin
 Proceedings of the 12th ACM Conference on Rec-
                                                              Wei, Xuancheng Ren, Yang Fan, Yang Yao, Yichang
 ommender Systems, RecSys 2018, Vancouver, BC,
                                                              Zhang, Yu Wan, Yunfei Chu, Yuqiong Liu, Zeyu
 Canada, October 2-7, 2018, pages 86–94. ACM.
                                                              Cui, Zhenru Zhang, and Zhihao Fan. 2024. Qwen2
                                                              technical report. arXiv preprint arXiv:2407.10671.
Mengting Wan, Rishabh Misra, Ndapa Nakashole, and
 Julian J. McAuley. 2019. Fine-grained spoiler detec-       Wei-Nan Zhang, Qingfu Zhu, Yifa Wang, Yanyan Zhao,
 tion from large-scale review corpora. In Proceedings         and Ting Liu. 2019. Neural personalized response
 of the 57th Conference of the Association for Compu-         generation as domain adaptation. World Wide Web,
 tational Linguistics, ACL 2019, Florence, Italy, July        22:1427–1446.
 28- August 2, 2019, Volume 1: Long Papers, pages
 2605–2610. Association for Computational Linguis-          Zeyu Zhang, Xiaohe Bo, Chen Ma, Rui Li, Xu Chen,
 tics.                                                        Quanyu Dai, Jieming Zhu, Zhenhua Dong, and Ji-
                                                              Rong Wen. 2024a. A survey on the memory mech-
Bing Wang, Xinnian Liang, Jian Yang, Hui Huang,               anism of large language model based agents. arXiv
  Shuangzhi Wu, Peihao Wu, Lu Lu, Zejun Ma, and               preprint arXiv:2404.13501.
  Zhoujun Li. 2023. Enhancing large language model
  with self-controlled memory framework. arXiv              Zeyu Zhang, Quanyu Dai, Luyu Chen, Zeren Jiang, Rui
  preprint arXiv:2304.13343.                                  Li, Jieming Zhu, Xu Chen, Yi Xie, Zhenhua Dong,
                                                              and Ji-Rong Wen. 2024b. Memsim: A bayesian sim-
Lei Wang, Chen Ma, Xueyang Feng, Zeyu Zhang, Hao              ulator for evaluating memory of llm-based personal
  Yang, Jingsen Zhang, Zhiyuan Chen, Jiakai Tang,             assistants. arXiv preprint arXiv:2409.20163.
  Xu Chen, Yankai Lin, et al. 2024a. A survey on large
                                                            Zeyu Zhang, Quanyu Dai, Xu Chen, Rui Li, Zhongyang
  language model based autonomous agents. Frontiers
                                                              Li, and Zhenhua Dong. 2025. Memengine: A unified
  of Computer Science, 18(6):186345.
                                                              and modular library for developing advanced memory
                                                              of llm-based agents. In Companion Proceedings of
Liang Wang, Nan Yang, Xiaolong Huang, Linjun Yang,            the ACM on Web Conference 2025, pages 821–824.
  Rangan Majumder, and Furu Wei. 2024b. Multilin-
  gual e5 text embeddings: A technical report. arXiv        Wayne Xin Zhao, Kun Zhou, Junyi Li, Tianyi Tang,
  preprint arXiv:2402.05672.                                 Xiaolei Wang, Yupeng Hou, Yingqian Min, Beichen
                                                             Zhang, Junjie Zhang, Zican Dong, et al. 2023. A
Di Wu, Hongwei Wang, Wenhao Yu, Yuwei Zhang, Kai-            survey of large language models. arXiv preprint
  Wei Chang, and Dong Yu. 2024a. Longmemeval:                arXiv:2303.18223.
  Benchmarking chat assistants on long-term interac-
  tive memory. arXiv preprint arXiv:2410.10813.             Wanjun Zhong, Lianghong Guo, Qiqi Gao, He Ye, and
                                                             Yanlin Wang. 2024. Memorybank: Enhancing large
Likang Wu, Zhi Zheng, Zhaopeng Qiu, Hao Wang,                 language models with long-term memory. In Pro-
  Hongchao Gu, Tingjia Shen, Chuan Qin, Chen Zhu,             ceedings of the AAAI Conference on Artificial Intelli-
  Hengshu Zhu, Qi Liu, et al. 2024b. A survey on large        gence, volume 38, pages 19724–19731.
  language models for recommendation. World Wide
  Web, 27(5):60.

Zhiheng Xi, Wenxiang Chen, Xin Guo, Wei He, Yiwen
  Ding, Boyang Hong, Ming Zhang, Junzhe Wang, Sen-
  jie Jin, Enyu Zhou, et al. 2025. The rise and potential
  of large language model based agents: A survey. Sci-
  ence China Information Sciences, 68(2):121101.
A     Case Studies                                        "Los Angeles, CA", "time": "the week after next
                                                          Sat 9:00 AM", "event name": "Team Connect",
A.1    User Relation Graph Example                        "scale": "one hundred people", "duration": "eight
In this section, we present examples of the compo-        day"
nents of our dataset, including the user graph and
test cases. For the user graph, we show profile ex-          RestEventProfile."event type": "Community
amples of the user itself, related individuals, events,   Fair", "main content": "Join us at the Community
items, and places.                                        Fair for climbing challenges, equipment demos,
   UserProfile: "gender": "Male", "relationship":         and safety workshops! Engage with fellow enthusi-
"self", "name": "James Smith", "age": "30 years           asts, explore local climbing spots, and enjoy inspir-
old", "height": "164 cm", "birthday": "08.13",            ing talks from seasoned climbers. Perfect for all
"hometown": "San Francisco, CA", "work                    skill levels and climbing enthusiasts!", "location":
location": "Boston, MA", "education": "Associate          "Miami, FL", "time": "2024-10-12 19:00", "event
Degree", "occupation": "Police Officer", "posi-           name": "Climb Fest", "scale": "nine hundred peo-
tion": "Community Policing Officer", "company             ple", duration": "three day"
name": "Boston Law Enforcement Agency",                      ItemProfile: "relationship": "Own", "item
"hobby": "Climbing", "character": "Friendly",             type": "Laundry Detergent", "item name": "Arm
"contact number": "4150430511", "email address":          & Hammer Liquid Detergent", "item review": "As
"james.smith@bostonlawenforcement.gov",                   a police officer, I’m always on the go, and I need
"ssn":       "914610199408130162", "passport              products that can keep up with my busy lifestyle.
number":       "PUP4822676", "bank account":              I’ve been using Arm & Hammer Liquid Detergent
"6222022865544246",              "driver     license":    for a while now, and I have to say, it’s been a game
"914EAPRDV5F",            "highlevel preference":         changer for me. Not only does it tackle tough stains
["movie genre preference": ("Comedy", "Ro-                from my uniforms and gear with ease, but it also
mance", "Action", "Drama", "Thriller"), "taste            leaves my clothes smelling fresh and clean. The
preference":      "Umami and Sweet", "book                added baking soda really helps to neutralize odors,
preference": "Humor"].                                    which is a must when you’re working in various en-
   RelativeRoleProfile."gender":"Male", "relation-        vironments. Plus, I appreciate that it’s available in
ship":"Brother","name": "Ethan Cooper","age":             eco-friendly options, making it easier to care for the
"28 years old","height": "165cm","birthday":              planet while looking after my laundry. Definitely
"01/20","hometown": "Boston, MA", "work lo-               a solid choice for anyone looking for effective and
cation": "Los Angeles, CA", "education": "Asso-           reliable detergent!"
ciate Degree", "occupation": "Electrician", "posi-
tion": "Electrical Maintenance Technician", "com-            PlaceProfile. Place example: "relationship":
pany name": "SparkLight Electric Services",               "Visited","place type": "Mall", "place name": "The
"hobby": "Running", "character": "Thought-                Grove", "place review": "I recently visited The
ful", "contact number": "20103787263","email ad-          Grove and I have to say, it was a really refreshing
dress": "ethan.cooper@sparklightelectric.com"             experience. The vibe there is incredibly friendly
   ColleagueRoleProfile. "gender": "Male", "rela-         and welcoming, just like the community I strive to
tionship": "boss", "name": "Nolan Hayes", "age":          serve as a police officer. The shops and restaurants
"39 years old","height": "170cm","birthday":              offer a great variety, and I especially enjoyed grab-
"03/24","hometown": "Philadelphia, PA","work lo-          bing a bite at one of the local eateries. The layout
cation": "Boston, MA","education": "Associate             is easy to navigate, making it a perfect spot to relax
Degree","occupation": "Police Officer","position":        and enjoy some fresh air.As someone who loves
"Police Sergeant","company name": "Boston                 climbing, I appreciated the green spaces where you
Law Enforcement Agency", "hobby": "Attend-                can unwind and enjoy nature. It’s a fantastic place
ing Concerts","character": "Empathetic", "con-            to spend time with family or friends. The only
tact number": "30503926075","email address":              downside I found was that it got a bit crowded dur-
"nolan.hayes@bostonlawagency.gov"                         ing peak hours, but that’s to be expected in such a
   WorkEventProfile. "event type": "Company               popular location. Overall, I’d highly recommend
Team Building", "main content": "Community en-            The Grove to anyone looking for a fun and friendly
gagement workshop for team bonding.", "location":         outing!"
                                Table 6: Overview of Factual Memory questions.

          Types             Descriptions
       Single-hop           Rely on one message to answer the question directly.
       Multi-hop            Require multiple messages to answer the question jointly.
      Comparative           Compare two entities on a shared attribute with multiple messages.
      Aggregative           Aggregate messages about more than two entities on a common attribute.
    Post-processing         Involve extra reasoning steps to answer with multiple messages.
  Knoewledge-updating       The basis for answering questions will be updated over time with different messages.
 Single-session-assistant   Rely on a single message from the assistant to directly answer the question.
 Multi-session-assistant    Require Multiple messages from the assistant to collectively answer the question.
                              Table 7: Overview of Reflective Memory questions.
   Types      Descriptions
 Preference   Rely on multiple messages to actively express the user’s lower-level preferences.
  Emotion     Rely on multiple consecutive messages within a specific time to express the user’s emotional state.


A.2   FM-RM Directionary Example                             Food. "Sweet": ["Candy", "Honey", "Fruit",
                                                          "Maple Syrup Pancakes", "Baklava", "Choco-
When creating the correspondence between factual          late Cake", "Custard", "Jelly", "Pecan Pie", "Ap-
memory attribute and reflective memory attribute,         ple Pie", "Brownies", "Banana Bread", "Donuts",
we simultaneously created a dictionary mapping            "Rice Krispies"]
the two. Below, we provide examples from each                Book."Health & Fitness": ["What to Expect
category of reflective memory.                            When You’re Expecting (Revised Edition)", "Make
   Movie. "Action": ["Star Wars (1977)","God-             the Connection: Ten Steps to a Better Body and
father, The (1972)","Raiders of the Lost Ark              a Better Life", "The South Beach Diet: The Deli-
(1981)","Titanic (1997)","Empire Strikes Back,            cious, Doctor-Designed, Foolproof Plan for Fast
The (1980)","Boot, Das (1981)","Godfather:                and Healthy Weight Loss", "Dr. Atkins’ New Diet
Part II, The (1974)","African Queen, The                  Revolution", "Dr. Atkins’ New Diet Revolution",
(1951)","Princess Bride, The (1987)","Brave-              "Prescription for Nutritional Healing: A Practical
heart (1995)", "Glory (1989)", "Fugitive,                 A-Z Reference to Drug-Free Remedies Using Vi-
The (1993)","Alien (1979)","Return of the                 tamins, Minerals, Herbs & Food Supplements", "8
Jedi (1983)","Terminator 2: Judgment Day                  Weeks to Optimum Health", "Body for Life: 12
(1991)", "Butch Cassidy and the Sundance Kid              Weeks to Mental and Physical Strength", "Your
(1969)","Aliens (1986)","Magnificent Seven,               Pregnancy: Week by Week (Your Pregnancy Se-
The (1954)","Terminator, The (1984)","Apollo              ries)", "Fat Land: How Americans Became the
13 (1995)","Indiana Jones and the Last Crusade            Fattest People in the World"]
(1989)","Die Hard (1988)","Hunt for Red October,
The (1990)","Good, The Bad and The Ugly, The               A.3   Question Description
(1966)","Blues Brothers, The (1980)","Ben-Hur              In Tab 6, we provide an explanation for each type
(1959)", "Cyrano de Bergerac (1990)", "Star                of Factual Memory questions. In Tab 7, we provide
Trek: The Wrath of Khan (1982)","In the Line of            an explanation for each type of Reflective Memory
Fire (1993)", "Adventures of Robin Hood, The               questions.
(1938)","Jaws (1975)","Face/Off (1997)","Men
in Black (1997)","Diva (1981)","Jurassic Park              A.4   Participation Example
(1993)","Rock, The (1996)","Full Metal Jacket              In this section, we provide more detailed examples
(1987)", "Perfect World, A (1993)","Star Trek:             from the participation scenarios in our dataset. To
First Contact (1996)","Speed (1994)","Air Force            make the presentation clearer, we have only listed
One (1997)", "Crying Game, The (1992)", "True              the key evidence dialogue rounds necessary for an-
Romance (1993)","Abyss, The (1989)","Clear                 swering the questions and omitted any unnecessary
and Present Danger (1994)","Heat (1995)","True             information.
Lies (1994)","Get Shorty (1995)","Last of the                 The detailed examples are as follows:
Mohicans, The (1992)","Supercop (1992)"]                      Single Hop
   User: My niece runs a company called TechIn-             Question: What movies have you recommended
novate Systems LLC.                                      to me before?
   Assistant:...                                            Answer: ["Return of the Jedi (1983)","Jurassic
   Question: What is the name of my niece’s com-         Park (1993)"]
pany?                                                       Comparative
   Answer: TechInnovate Systems LLC                         User: My niece, Clara Jennings, is 28 years old.
   Multi Hop                                                Assistant: ...
   User: My sister’s name is Amelia Brooks, and             User: My Uncle Landon Pierce is 27 years old.
she’s always been a real standout with her creativity       Assistant: ...
and charm.                                                  Question: Who is older, Clara Jennings or Lan-
   Assistant:...                                         don Pierce?
   User: My sister’s birthday is coming up on De-           Answer: Clara Jennings
cember 11th.                                                Aggregative
   Assistant:...                                            User: My brother Ethan Cooper hails from
   Question: What is the birthday of someone             Boston, MA
named Amelia Brooks?                                        Assistant:...
   Answer: 12/11                                            User: My sister, Amelia Brooks, is from Wash-
   Knowledge Updating                                    ington, DC.
   User:The Policing Forum lasts for four days, and         Assistant:...
I can’t wait to see what they have in store during          User: My niece, Clara Jennings, is from Jack-
that time. Assistant:                                    sonville, FL.
   User: I just realized I need to correct my-              Assistant:...
self—Policing Forum only lasts for one day. Assis-          User: My uncle, Landon Pierce, hails from
tant:...                                                 Philadelphia, PA.
   Question: How long does the Policing Forum               Assistant:...
last?                                                       User: Sophie Turner, my aunt, is from Chicago,
   Answer: one day                                       IL.
   Post Processing                                          Assistant:...
   User: My subordinate has this cool hobby of              User: My boss, Nolan Hayes, is from Philadel-
collecting antiques.                                     phia, PA.
   Assistant:...                                            Assistant:...
   User: My subordinate’s email address is                  User: Maya Carter, who works under me, is from
maya.carter@bostonlaw.gov.                               Los Angeles, CA.
   Assistant:...                                            Assistant:...
   Question: What are the main interests and                User:My coworker, Maxwell Turner, is from In-
hobbies of the individual with the email address         dianapolis, IN.
maya.carter@bostonlaw.gov?                                  Assistant:...
   Answer: Gather historical items and appreciate           Question: How many people live in Philadelphia,
their value                                              PA?
   Single session assistant                                 Answer: 2 people
   user: I’m looking for a great movie to watch,            Multi session assistant
aside from the ones I’ve mentioned earlier.                 User: I’m looking for a great movie to watch,
   assistant: I’m all about Return of the Jedi; it’s     excluding the ones mentioned earlier.
such an iconic film with those thrilling space battles      Assistant: I definitely think Alien (1979) is a
and unforgettable characters that make it a must-        must-see; it’s an intense blend of science fiction
see!                                                     and horror that really keeps you on the edge of your
   user: I’m looking for a fantastic movie to watch,     seat!
aside from the ones I’ve mentioned earlier.                 User: I’m looking for a great movie to watch,
   assistant: I recommend the Jurassic Park from         aside from the ones I mentioned earlier.
1993; it’s such an incredible film with its ground-         Assistant: "I’m all about The Fugitive from
breaking special effects and thrilling adventure that    1993; it’s a thrilling ride that really keeps you on
really grabs my attention!                               the edge of your seat!
   User: I’m looking for a delicious dish to try,         Table 8: The detail statistics of our Participation dataset.
aside from the ones mentioned earlier.                    RM indicates Reflective Memory. FM indicates Factual
                                                          Memory. The types we have include ssh(sigle-hop),
   Assistant: I’m a big fan of Apple Pie; it’s such a
                                                          mh(multi-hop), comp(comparative), agg(aggregative),
delightful treat that everyone should definitely give     pp(post-processing), ku(knowledge-update), ssa(signle-
it a try!                                                 session-assistant), msa(multi-session-assistant).
   User: I’m looking for a good book to read, ex-
cluding the ones mentioned earlier.                           Data Type   # Session    # Question     # Trajectory
   Assistant: I really think Naked is a fantastic read;         RM-Pr        3.0k          3.0k           3.0k
it’s definitely worth checking out!                            RM-Em         0.5k          0.5k           0.5k
   User: I’m looking for a good book to read, aside             FM-sh         8k            8k             1k
                                                               FM-mh          8k            8k             1k
from the ones mentioned earlier.
                                                              FM-comp         8k            4k             1k
   Assistant: I really think everyone should check
                                                               FM-agg         8k            1k             1k
out Politically Correct Bedtime Stories: Modern
                                                                FM-ku         8k            8k             1k
Tales for Our Life and Times; it offers a hilarious             FM-pp         8k            8k             1k
twist on classic tales that resonate with today’s              FM-ssa        1.5k          1.5k           1.5k
issues.                                                        FM-msa        1.5k          0.5k           0.5k
   Question: What movies, books and dishes have
                                                          Table 9: The detail statistics of our Participation dataset.
you recommended to me?                                    RM indicates Reflective Memory. FM indicates Fac-
   Answer:        ["Alien (1979)","Fugitive, The          tual Memory. The types we have include sh(sigle-hop),
(1993)","Apple Pie","Naked","Politically Correct          mh(multi-hop), comp(comparative), agg(aggregative),
Bedtime Stories: Modern Tales for Our Life and            pp(post-processing), ku(knowledge-update).
Times"]
                                                              Data Type   # Session    # Question     # Trajectory
   Multi session highlevel preference
                                                               RM-Pr         1.5k          1.5k           1.5k
   User: I’m a big fan of prosciutto and melon;
                                                               RM-Em         0.5k          0.5k           0.5k
there’s just something about that sweet and savory
                                                               FM-sh         1.5k          1.5k           1.5k
combination that I can’t resist!                               FM-mh         1.5k          1.5k           1.5k
   Assistant:...                                              FM-comp        1.5k          1.5k           1.5k
   User: I’m a fan of Prosciutto and Melon, but I              FM-agg        1.5k          1.5k           1.5k
also really enjoy Salted Maple Ice Cream; it’s a               FM-pp         1.5k          1.5k           1.5k
unique treat that hits the spot!                               FM-ku          1k            1k             1k
   Assistant: ...
   User: I really love Salted Maple Ice Cream, and        B     Detail Data Statics
Pecan Praline is another favorite of mine!                In Tab 8, we provide the detail statistics of Par-
   Assistant: ...                                         ticipation dataset. In Tab 9, we provide the detail
   User: I really enjoy Pecan Praline, but I also         statistics of Observation dataset.
have a soft spot for Salted Butter Toffee; there’s
something so satisfying about that perfect blend of       C     Data Creation Prompt
sweet and salty.
   Assistant: ...                                         C.1     Profile Prompt
   User: I really love Salted Peanut Butter Cookies,      Flavour Reflective Memory Attribute Please
just like I enjoy Salted Butter Toffee.                   choose user’s taste from [Tastes] according to the
   Assistant:...                                          dishes he likes below. [Dishes]:{Dishes} [Tastes]:
   Question: According to the dishes I mentioned,         ["Sweet", "Sour", "Spicy", "Salty", "Umami", "Bit-
Which flavor I might prefer?                              ter", "Sweet and Salty", "Sweet and Sour", "Salty
   Answer: Sweet and Salty                                and Umami", "Sour and Spicy", "Sweet, Salty, and
                                                          Spicy", "Sour and Salty", "Sour, Sweet, and Salty",
A.5   Observation Example                                 "Salty, Umami, and Spicy", "Numbing and Spicy",
The only difference between the data for participa-       "Creamy and Sweet", "Umami and Sweet", "Bit-
tion and the data here is the absence of responses        ter and Sweet", "Astringent", "Numbing", "Rich
from "assistant," so specific examples are not pro-       and Fatty", "Cool", "Warm and Spicy"] example
vided here.                                               output:{{’taste’: ’sweet’}}
C.2    Self-dialogue Prompt                              varied content. Note that the user cannot ask the
                                                         assistant for information because the assistant does
Role Dialogue Generation Prompt. Please gener-           not know the information. You can start with user
ate a {round_length}-round interactive conversion        saying I’m going to attend {event_name} Please
between the user and assistant, with a total of {sen-    return the conversation in a JSON list format as
tence_length} sentences. The dialogue’s main con-        shown in the example, ensuring that the result can
tent should based on the given information about         be directly parsed by json.loads. #[Information]:
the user’s {entity}. Ensure that no information be-      {information}
yond what is provided is introduced in the dialogue.
**Note that the user cannot ask the assistant for           #example: [{{"user": "I wanted to talk to you
information because the assistant does not know          about my cousin, Ethan Parker. He’s 39 years old.",
the information.** Note that the assistant is the        "assistant": "Certainly! Ethan is 39. Is there some-
user’s personal assistant, so it should only respond     thing specific you’d like to discuss about him?"}},
passively to the user’s dialogue, but it can reply       {{"user": "Well, he’s actually pretty short for a guy,
with varied content. Please return the conversation      only 162 cm. He always jokes about it, though.",
in a JSON list format as shown in the example,           "assistant": "It sounds like Ethan has a good sense
ensuring that the result can be directly parsed by       of humor about his height. That’s always a great
json.loads. **Every json must includes both user         quality!"}}, {{"user": "Yes, he really does. It’s one
and assistant with their words! Every json’s format      of the things that makes him so fun to be around.",
is {{"user": user’s words, "assistant": assistant’s      "assistant": "I can imagine! Having a cousin with a
words}}** #[Information]: {information}                  lighthearted attitude must make family gatherings
                                                         enjoyable."}}, {{"user": "Definitely. And since
   #example: [{{"user": "I wanted to talk to you
                                                         we’re so close in age, it feels like he’s more of a
about my cousin, Ethan Parker. He’s 39 years old.",
                                                         friend than just family.", "assistant": "That sounds
"assistant": "Certainly! Ethan is 39. Is there some-
                                                         wonderful. It must be special to have that kind
thing specific you’d like to discuss about him?"}},
                                                         of bond with your cousin."}} {{"user": "It really
{{"user": "Well, he’s actually pretty short for a guy,
                                                         is. We’ve shared a lot of memories growing up to-
only 162 cm. He always jokes about it, though.",
                                                         gether.", "assistant": "Those shared memories must
"assistant": "It sounds like Ethan has a good sense
                                                         make your relationship even stronger. It sounds
of humor about his height. That’s always a great
                                                         like Ethan has been a big part of your life."}}]
quality!"}}, {{"user": "Yes, he really does. It’s one
of the things that makes him so fun to be around.",
"assistant": "I can imagine! Having a cousin with a      C.3    Observation Prompt
lighthearted attitude must make family gatherings
enjoyable."}}, {{"user": "Definitely. And since          Role Message Prompt. [User Message]: {mes-
we’re so close in age, it feels like he’s more of a      sage} Please rewrite the above user message into a
friend than just family.", "assistant": "That sounds     colloquial declarative sentence. Ensure it is smooth
wonderful. It must be special to have that kind          and free of grammatical errors, without changing
of bond with your cousin."}} {{"user": "It really        the original information. Only output the rewrit-
is. We’ve shared a lot of memories growing up to-        ten user message, without including the original
gether.", "assistant": "Those shared memories must       message. Do not output any other description. Out-
make your relationship even stronger. It sounds          put example: Lucas Grant, who is my boss, has a
like Ethan has been a big part of your life."}}]         Master’s degree. """
   Event Dialogue Generation Prompt. Please                Event Message Prompt. [User Message]: {mes-
generate a {round_length}-round interactive con-         sage} Please rewrite the above user message into a
version between the user and assistant, with a total     colloquial declarative sentence. Ensure it is smooth
of {sentence_length} sentences. The dialogue’s           and free of grammatical errors, without changing
main content should based on the given informa-          the original information, and avoid using ’you’.
tion about the {event_name}. Ensure that no infor-       Don’t forget use I , me or my Only output the
mation beyond what is provided is introduced in          rewritten user message, without including the orig-
the dialogue. Note that the assistant is the user’s      inal message. Do not output any other description.
personal assistant, so it should only respond pas-       Output example: Climb Fest draws a crowd of
sively to the user’s dialogue, but it can reply with     around nine hundred people.
D     Result Details
D.1    Reflective Result
In Tab 10, we show the detailed results of our 10k-
Reflective memory dataset.

D.2    Facutal Result
In Tab 11, we show the detailed results of our 10k-
Factual-Partipation memory dataset. In Tab 12,
we show the detailed results of our 10k-Factual-
Observation memory dataset.
     Table 10: The results of different mechanisms on different types of our 10k-Reflective memory dataset.

                                       Participation-Accuracy                 Observation-Accuracy
            Method
                                       preference           emotion           preference           emotion
      FullMemory                         0.733                0.593               0.883              0.630
    RecentMemory                         0.700                0.481               0.867              0.556
   RetrievalMemmory                      0.692                0.556               0.883              0.593
    GenerativeAgent                      0.742                0.412               0.883              0.676
     MemoryBank                          0.692                0.296               0.900              0.481
        MemGPT                           0.733                0.471               0.883              0.556
       SCMemory                          0.542                0.294               0.783              0.333

Table 11: The results of different mechanisms on different types of our 10k-Factual-Participation dataset. Including
sh(sigle-hop), mh(multi-hop), comp(comparative), agg(aggregative), pp(post-processing), ku(knowledge-update),
ssa(signle-session-assistant), msa(multi-session-assistant).

          Method                                         Participation-Accuracy
                                  sh        mh       comp        agg         pp         ku         ssa      msa
     FullMemory                0.825        0.8       0.55      0.275      0.625       0.75        0.7      0.55
   RecentMemory                 0.85       0.75      0.425       0.45       0.65      0.725       0.717      0.5
  RetrievalMemmory             0.875      0.775       0.55      0.275      0.475      0.675        0.4       0.3
   GenerativeAgent              0.75      0.675       0.3        0.35      0.525      0.525       0.267     0.55
    MemoryBank                 0.575       0.7       0.25        0.25      0.475       0.55       0.417      0.4
       MemGPT                  0.625      0.625      0.275      0.225      0.45       0.625       0.367     0.45
      SCMemory                 0.575      0.475      0.05       0.275      0.525      0.475       0.217      0.1

Table 12: The results of different mechanisms on different types of our 10k-Factual-Observation memory dataset.
Including sh(sigle-hop), mh(multi-hop), comp(comparative), agg(aggregative), pp(post-processing), ku(knowledge-
update).


             Method                                       Observation-Accuracy
                                         sh         mh         comp           agg            pp           ku
      FullMemory                        0.92       0.92        0.667        0.233         0.82            0.6
    RecentMemory                        0.92       0.92        0.667        0.367          0.82           0.65
   RetrievalMemmory                     0.92       0.92        0.633        0.367         0.78            0.45
    GenerativeAgent                     0.88       0.94         0.7          0.3           0.82            0.4
     MemoryBank                         0.8        0.78        0.633        0.233         0.800            0.6
        MemGPT                          0.94       0.92        0.667        0.233         0.82           0.600
       SCMemory                         0.46       0.68        0.133        0.133          0.78           0.65
