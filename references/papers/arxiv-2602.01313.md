<!-- Generated from arxiv-2602.01313.pdf via pdftotext -layout on 2026-02-22 -->

                                         EverMemBench: Benchmarking Long-Term Interactive Memory
                                                        in Large Language Models
                                                             Chuanrui Hu∗                                                        Tong Li∗                                       Xingze Gao
                                                     chuanrui.hu@shanda.com                                           litong02@shanda.com                               xingze.gao@shanda.com
                                                     EverMind, Shanda Group                                          EverMind, Shanda Group                             EverMind, Shanda Group

                                                             Hongda Chen                                                           Yi Bai                                      Dannong Xu
                                                     hongda.chen@shanda.com                                             baiyi@shanda.com                                dannong.xu@shanda.com
                                                      EverMind, Shanda Group                                         EverMind, Shanda Group                             EverMind, Shanda Group

                                                                Tianwei Lin                                                   Xinda Zhao                                       Xiaohong Li




arXiv:2602.01313v2 [cs.CL] 3 Feb 2026
                                                      tianwei.lin@shanda.com                                         xinda.zhao@shanda.com                              xiaohong.li@shanda.com
                                                      EverMind, Shanda Group                                         EverMind, Shanda Group                             EverMind, Shanda Group

                                                              Yunyun Han                                                         Jian Pei†                                    Yafeng Deng†
                                                      hanyunyun@shanda.com                                                  j.pei@duke.edu                              dengyafeng@shanda.com
                                                      EverMind, Shanda Group                                                Duke University                             EverMind, Shanda Group

                                        Abstract                                                                                        ACM Reference Format:
                                        Long-term conversational memory is essential for LLM-based as-                                  Chuanrui Hu, Tong Li, Xingze Gao, Hongda Chen, Yi Bai, Dannong Xu,
                                                                                                                                        Tianwei Lin, Xinda Zhao, Xiaohong Li, Yunyun Han, Jian Pei, and Yafeng
                                        sistants, yet existing benchmarks focus on dyadic, single-topic di-
                                                                                                                                        Deng. 2018. EverMemBench: Benchmarking Long-Term Interactive Memory
                                        alogues that fail to capture real-world complexity. We introduce                                in Large Language Models. In Proceedings of Make sure to enter the correct
                                        EverMemBench, a benchmark featuring multi-party, multi-group                                    conference title from your rights confirmation email (Conference acronym ’XX).
                                        conversations spanning over 1 million tokens with temporally                                    ACM, New York, NY, USA, 10 pages. https://doi.org/XXXXXXX.XXXXXXX
                                        evolving information, cross-topic interleaving, and role-specific
                                        personas. EverMemBench evaluates memory systems across three
                                        dimensions through 1,000+ QA pairs: fine-grained recall, memory
                                                                                                                                        1    Introduction
                                        awareness, and user profile understanding. Our evaluation reveals
                                        critical limitations: (1) multi-hop reasoning collapses in multi-party                          Large language models are increasingly used as conversational
                                        settings, with even oracle models achieving only 26%; (2) temporal                              agents in settings where interactions extend over time and across
                                        reasoning remains unsolved, requiring version semantics beyond                                  contexts [3, 13]. In realistic scenarios such as workplace collabora-
                                        timestamp matching; (3) memory awareness is bottlenecked by                                     tion and personal assistance, conversations are often multi-party,
                                        retrieval, where current similarity-based methods fail to bridge                                topics are interleaved and revisited, and previously stated infor-
                                        the semantic gap between queries and implicitly relevant memo-                                  mation is frequently revised. A memory-capable system in these
                                        ries. EverMemBench provides a challenging testbed for developing                                environments must do more than retrieve a past fact on demand. It
                                        next-generation memory architectures.                                                           must retain fine-grained details, recognize when earlier information
                                                                                                                                        becomes relevant in a new situation, and respond in a way that is
                                        CCS Concepts                                                                                    consistent with user preferences and social context.
                                                                                                                                           Although long-context modeling and memory-augmented agents
                                        • Computing methodologies → Information extraction.
                                                                                                                                        have advanced rapidly, evaluation remains a bottleneck. Many
                                                                                                                                        benchmarks treat memory as recall over long inputs and implicitly
                                        Keywords
                                                                                                                                        equate stronger memory with the ability to handle more tokens
                                        long context, memory                                                                            [14, 19, 23, 26, 28]. However, real failures often come from different
                                        ∗ Equal contribution.                                                                           sources: confusion about who said what in group chats, interference
                                        † Corresponding author.                                                                         across closely related topics, inconsistency in persona and style,
                                                                                                                                        and inability to update beliefs when plans change. Meanwhile, re-
                                        Permission to make digital or hard copies of all or part of this work for personal or
                                        classroom use is granted without fee provided that copies are not made or distributed           cent memory-augmented systems [5, 16, 18, 22, 25] increasingly
                                        for profit or commercial advantage and that copies bear this notice and the full citation       attach external or structured memory to LLMs for long-horizon
                                        on the first page. Copyrights for components of this work owned by others than the              personalization and task continuity, typically storing user facts
                                        author(s) must be honored. Abstracting with credit is permitted. To copy otherwise, or
                                        republish, to post on servers or to redistribute to lists, requires prior specific permission   and preferences and retrieving and updating them over time. Their
                                        and/or a fee. Request permissions from permissions@acm.org.                                     rapid adoption makes realistic and diagnostic benchmarks more
                                        Conference acronym ’XX, Woodstock, NY                                                           urgent, since it remains unclear which designs improve behavior
                                        © 2018 Copyright held by the owner/author(s). Publication rights licensed to ACM.
                                        ACM ISBN 978-1-4503-XXXX-X/2018/06                                                              under realistic conversational dynamics rather than only improv-
                                        https://doi.org/XXXXXXX.XXXXXXX                                                                 ing recall in constructed long contexts. This mismatch between
Conference acronym ’XX, June 03–05, 2018, Woodstock, NY                                                                            Hu et al.




Figure 1: Existing benchmarks vs. EverMemBench. Prior benchmarks adopt dyadic settings with isolated topic sessions.
EverMeBench introduces multi-party collaboration across interdependent groups, where relevant information is scattered
across speakers, channels, and time—demanding cross-group reasoning and temporal tracking absent in dyadic scenarios.


existing benchmarks and realistic memory demands is summarized             EverMemBench also provides an evaluation suite that decom-
in Table 1.                                                             poses memory competence into three task families: fine-grained
   A common limitation of existing benchmarks is the reliance on        detailed recall, memory awareness, and user profile understanding.
simplified interaction structures [11]. Many focus on dyadic con-       Detailed recall tests precise extraction of specific facts. Memory
versations, while real interactions frequently involve multiple roles   awareness tests whether the system can identify when historical
contributing to a single decision. Many construct long contexts by      information is relevant and use it appropriately in a new scenario.
adding topic-irrelevant distractors, which tests noise tolerance but    User profile understanding tests whether the system can infer and
does not reflect how real conversations evolve, where topic transi-     maintain consistent personalization aligned with the user and the
tions are usually coherent and interleaved [4, 23]. Persona modeling    social setting. Together, these tasks evaluate not only what the
is often shallow, despite the fact that communication style depends     system remembers, but also when memory should be activated and
on role, expertise, and social power relations. Finally, most bench-    how it should shape behavior.
marks assume stationary facts, whereas real user knowledge is              In summary, our contributions are as follows:
non-stationary and requires explicit update and conflict resolution.
   To address these gaps, we introduce EverMemBench, a memory               • We introduce EverMemBench, the first memory bench-
benchmark designed to better match real conversational dynamics               mark designed for multi-party, multi-group settings, featur-
and to evaluate memory beyond surface recall. EverMemBench                    ing high information density dialogues across 5 topics with
is built from high information density multi-party dialogues in               each spanning 1 million tokens, coherent cross-topic inter-
which multiple roles meaningfully participate. The dialogues ex-              actions, role-conditioned personas, and dynamic knowledge
hibit coherent cross-topic interactions, including interleaving and           updates.
returning to earlier threads, rather than abrupt topic jumps or un-         • We decompose memory competence into three evaluation
related padding. The benchmark includes diverse personas with                 dimensions—fine-grained recall, memory awareness, and
distinct skills and communication styles, and it models style shifts          user profile understanding—moving beyond simple recall to
conditioned on social context and role relations. Crucially, it sup-          assess when memory should be activated and how it should
ports dynamic user knowledge updates, where earlier information               shape personalized responses.
can be revised as constraints change. The dialogues are additionally        • We conduct systematic evaluation revealing that multi-
grounded with realistic references such as news and calendar-like             hop reasoning collapses in multi-party settings, temporal
temporal structure, improving realism of both content and tim-                reasoning requires version semantics beyond retrieval, and
ing. An overview comparison with prior benchmarks is shown in                 memory awareness is bottlenecked by semantic gaps in
Figure 1.                                                                     similarity-based retrieval.
EverMemBench: Benchmarking Long-Term Interactive Memory in Large Language Models                                             Conference acronym ’XX, June 03–05, 2018, Woodstock, NY



 Aspects                              LoCoMo               LongMemEval                 PersonaMem-v1                  PersonaMem-v2                    EverMemBench (Ours)

 Dialogue Characteristics

 Interaction Type                     Dyadic                User–Assistant               User–Assistant                 User–Assistant                   Multi-party Group
 Task Structure                    Single-session             Long-term                   Personalized                 Preference-based               Long-term Interdependent
 Dialogue Turns                        326.8                    493.5                        313.6                           448.5                            10,204.6
 Context Length                          9K                     1.5M                          1M                             128K                                1M
 Personas per Batch                       2                       1                            1                               1                                37.6

 Dialogue Features

 High-Info Dialog Flow                     ✗                          ✗                            ✗                              ✗                              ✓
 Diverse Persona Interaction               ✗                          ✗                            ✗                              ✗                              ✓
 Cross-Topic Interaction                   ✗                          ✗                            ✗                              ✗                              ✓
 User Knowledge Update                     ✗                          ✗                            ✓                              ✓                              ✓

 Evaluation Dimensions

 Fine-Grained Recall                       ✓                          ✓                            ✓                              ✓                              ✓
 Memory Awareness                          ✗                          ✗                            ✓                              ✓                              ✓
 Profile Understanding†                    ✗                          ✗                            ✗                              ✗                              ✓
                                    † Profile Understanding denotes implicit user modeling from long-term dialogue, not explicit profile retrieval.

Table 1: Comparison with prior conversational memory benchmarks. EverMemBench uniquely supports multi-party group
conversations with long-term interdependent tasks, high information density, and diverse persona interactions.



2    Related Work                                                                               with designs ranging from pragmatic memory layers to more au-
Long-Context Conversational Memory Benchmarks. Recent                                           tonomous organization and OS-level management. Mem0 [5] and
benchmarks evaluate long-horizon conversational memory from                                     MemInsight [25] propose scalable persistent memory layers that ex-
complementary angles, including long multi-session interaction,                                 tract salient information from conversational histories and retrieve
capability-factorized assistant memory, and dynamic personaliza-                                it when needed, reporting gains on long-term memory evaluation
tion. LoCoMo [19] focuses on very long multi-session conversations                              such as LoCoMo [19]. Beyond persistent stores, A-MEM [29] frames
with tasks such as question answering and event summarization.                                  memory as an agentic module that decides what to store and how
LongMemEval [28] decomposes chat-assistant memory into abili-                                   to use it, while Nemori [22] proposes self-organizing memory that
ties including information extraction, multi-session and temporal                               emphasizes structured organization and evolution. Another line
reasoning, knowledge updates, and abstention. PersonaMem [14]                                   elevates memory to an infrastructure abstraction: MemOS [18] and
emphasizes dynamic user profiling and personalization over multi-                               MemoryOS [16] treat memory as an OS-like resource, aiming to
session user–LLM histories. More recent efforts broaden coverage                                unify heterogeneous memories with scheduling and lifecycle man-
of memory abilities and dialogue settings, including MemBench                                   agement. Many such systems adopt retrieval-augmented generation
[26], MADial-Bench [9], and BEAM [27]. A common simplifying                                     as a core mechanism for accessing external or long-range infor-
assumption across many benchmarks is that interactions are dyadic                               mation [2, 4, 8, 17, 30, 31], and RAG-style indexing and retrieval
or centered on a single assistant and a single user, which can under-                           often serve as a backbone for conversational memory pipelines.
stress realistic collaborative phenomena such as dense multi-party                              While these systems are typically evaluated in dyadic or single-user
attribution, coherent cross-topic interleaving, persona shifts un-                              settings, EverMemBench offers a multi-party, high-density envi-
der social context, and non-stationary user knowledge that must                                 ronment that more directly stresses attribution, cross-topic linkage,
be updated and reconciled. EverMemBench complements these                                       persona consistency under social context shifts, and dynamic knowl-
benchmarks by explicitly targeting multi-party group chat with                                  edge update handling, enabling more diagnostic comparisons of
high information density, complex cross-topic interactions, diverse                             memory mechanisms.
personas shaped by role relations, and dynamic user knowledge
updates, together with tasks that separate detailed recall, memory
                                                                                                3 EverMemBench
awareness, and user profile understanding.
Memory-Augmented Systems and Architectures. Memory-                                             3.1 Evaluation Dimensions
augmented systems increasingly treat memory as an explicit com-                                 EverMemBench aims to evaluate LLMs as long-term collabora-
ponent that can be persisted, structured, retrieved, and updated,                               tors in complex, dynamic environments. Unlike prior dyadic bench-
                                                                                                marks [14, 15, 19, 28], real-world collaboration requires navigating
Conference acronym ’XX, June 03–05, 2018, Woodstock, NY                                                                              Hu et al.




Figure 2: Data curation pipeline of EverMemBench. Stage 1 instantiates a synthetic organization and generates agent profiles,
including stable attributes (e.g., roles and hard skills), context-dependent communication styles, and role-consistent sub-tasks.
Stage 2 constructs a globally consistent, calendar-aligned timeline from project plans and dated public news, and incrementally
synthesizes long-horizon group-chat dialogue blocks conditioned on profiles and rolling summaries; each block is iteratively
validated and repaired via programmatic and semantic checks. Stage 3 generates evidence-grounded QA items targeting fine-
grained recall, memory awareness, and user-profile understanding, and filters them through a three-phase quality control
procedure: LLM blind testing, answerability/uniqueness verification, and human audit.


dense multi-party coordination, adapting to evolving constraints,        3.2    Task Formulation
and maintaining role-dependent consistency. We instantiate these         We evaluate memory systems via a streaming multi-group protocol.
challenges in a high-fidelity workplace simulation, as it naturally      The benchmark comprises 5 projects spanning diverse domains to
concentrates the core difficulties of realistic memory.                  assess cross-domain adaptability; each project maintains isolated
  To systematically diagnose these capabilities, we decompose            dialogue history, memory state, and evaluation queries. Within
memory competence into three complementary task families:                each project, 𝑁 groups engage in a simulated year of daily con-
                                                                         versations. During the ingestion phase, the system receives raw
                                                                         multi-party conversations organized by day and group: on each day
     • Fine-grained Recall evaluates direct memory lookups, an-
                                                                         𝑑, it observes the daily batch {𝑀𝑑,𝑔 }𝑔=1
                                                                                                               𝑁 , where 𝑀
                                                                                                                              𝑑,𝑔 denotes the
       choring queries to specific factual details with definitive an-
                                                                         chronologically ordered multi-party message list of group 𝑔 on day
       swers derived from stored records. Sub-tasks include: Single-
                                                                         𝑑. The system must autonomously process these interleaved multi-
       hop for direct entity retrieval; Multi-hop for cross-group
                                                                         party exchanges to build and maintain its memory state. After full
       reasoning across personas or channels; and Temporal for
                                                                         ingestion, the evaluation phase poses queries against the com-
       chronological reasoning about version histories.
                                                                         plete history. Queries take two forms: (1) multiple-choice questions
     • Memory Awareness tests whether the system can mobilize
                                                                         scored by exact option matching, and (2) open-ended questions
       existing memories to solve problems in unseen situations,
                                                                         scored by an LLM judge. Each question targets one of the three
       differentiating active comprehension from passive storage.
                                                                         evaluation dimensions and is annotated with evidence spans for
       Sub-tasks include: Constraint for applying implicit rules from
                                                                         diagnostic analysis.
       prior conversations; Proactivity for surfacing relevant con-
       text when evaluating proposed actions; and Updating for
       identifying current valid states when earlier decisions have      3.3    Data Construction
       been superseded.                                                  Generating coherent long-horizon multi-party dialogues poses
     • Profile Understanding assesses the ability to maintain            three key challenges: (1) context-window limits force truncation of
       distinct user personas by mining implicit habits and long-        early history; (2) logical inconsistencies emerge as conversations
       term traits from dialogue history. Sub-tasks include: Style       grow; (3) persona and temporal coherence degrade over extended
       for matching communication patterns; Skill for determin-          interactions. To address these, we decompose data construction
       ing responses based on professional expertise; and Title for      into three stages (Figure 2): Stage 1 generates a global blueprint
       inferring focus areas from organizational role.                   encoding organizational structure, individual persona profiles, and
EverMemBench: Benchmarking Long-Term Interactive Memory in Large Language Models                             Conference acronym ’XX, June 03–05, 2018, Woodstock, NY


a project timeline with main and auxiliary storylines; Stage 2 syn-                   the previous day. This multi-scale context compresses unbounded
thesizes dialogues in chunks conditioned on the blueprint; Stage 3                    history into a fixed-size window without losing temporal structure.
generates evidence-grounded QA pairs from the dialogues and blue-                        To avoid error accumulation from turn-by-turn decoding and
print. This separation ensures global consistency while enabling                      to enable the model to plan coherent multi-party dynamics holisti-
scalable, chunk-wise generation. All generation processes (blue-                      cally, we generate each group’s full daily conversation in a single
print, dialogue, and QA) employ Gemini-2.5-Pro [6] as the backbone                    pass. Given the scheduled sub-tasks T𝑝,𝑗(𝑑 ) for day 𝑑, the dialogue is
model.                                                                                synthesized as:
                                                                                                                                                               
                                                                                              (𝑑 )
3.3.1 Preliminaries. We first establish the shared foundation                               𝐶𝑝,𝑗   = LLMdialog T𝑝,𝑗(𝑑 ) , 𝑊𝑝,𝑗
                                                                                                                            (𝑑 )    (𝑑 )
                                                                                                                                 , 𝑀𝑝,𝑗     (𝑑 )
                                                                                                                                         , 𝐿𝑝,𝑗  , {𝜋𝑒 }𝑒 ∈ E𝑝,𝑗 . (6)
for data generation. We predefine an organizational skeleton 𝑆
comprising 300 employees E = {𝑒 1, . . . , 𝑒 300 } across 7 departments,                 Since LLMs inevitably exhibit hallucination [12], we apply a
structured in a three-tier hierarchy (1 CEO, 7 directors, 292 staff),                 three-stage quality verification to each generated dialogue to en-
and five projects about different domains P = {𝑝 1, . . . , 𝑝 5 }. Given              sure data reliability. First, a logic check verifies that the dialogue is
𝑆, we utilize LLM to generate a persona profile for each employee:                    consistent with the sub-task specification—correct participants are
                                                                                     involved and task details are accurately discussed. Second, a profile
                𝜋𝑒 = rank𝑒 , dept𝑒 , role𝑒 , s𝑒 , c𝑒 ,                (1)             check ensures that each utterance aligns with the speaker’s per-
where s𝑒 is a skill set (40–60 competencies) and c𝑒 is an 8-dimensional               sona, including communication style and domain expertise. Third,
communication style vector.                                                           a progress check validates that task completion status matches the
                                                                                      scheduled timeline—tasks should neither finish prematurely nor be
3.3.2 Blueprint Generation. For each project 𝑝 ∈ P, we con-                           delayed without justification. Dialogues failing any check are re-
struct an independent blueprint 𝐵𝑝 that guides all subsequent dia-                    generated until all constraints are satisfied. After acceptance, leader
logue generation. The blueprint encodes:                                                             (𝑑+1)
                                                                                      instructions 𝐿𝑝,𝑗    are extracted for the next day, and the process
                  𝐵𝑝 = E𝑝 , {(E𝑝,𝑗 , T𝑝,𝑗 )}3𝑗=1 ,
                                                
                                                               (2)                    repeats until the project concludes. The complete conversation
                                                                                      corpus for project 𝑝 is then:
where E𝑝 ⊂ E is the project team (a subset of 20–60 employees                                             (𝑑 )
selected from the full pool), and for each of the three sub-projects                               C𝑝 = 𝐶𝑝,𝑗     : 𝑗 ∈ {1, 2, 3}, 𝑑 ∈ {1, . . . , 𝐷} .      (7)
𝑗 ∈ {1, 2, 3}: E𝑝,𝑗 ⊆ E𝑝 is the assigned member set (with possible                    3.3.4 Q&A Generation. We construct evaluation items as QAE
overlaps across sub-projects), and T𝑝,𝑗 is the set of sub-tasks gener-                triples (𝑞, 𝑎, 𝑒), where 𝑞 is a question, 𝑎 is the answer, and 𝑒 ⊂ C𝑝 de-
ated based on member profiles and sub-project goals. Together with                    notes the evidence spans from the dialogue corpus that support the
the shared foundation (𝑆, Π), the blueprint 𝐵𝑝 enforces decision-                     answer. We generate QA pairs through three specialized pipelines
logic consistency, persona consistency, and temporal coherence                        corresponding to the three evaluation dimensions, each employing
during dialogue generation.                                                           task-specific strategies for both question generation and distractor
   We construct 𝐵𝑝 through the following steps: (1) select a project                  design.
team E𝑝 (20–60 members) from the employee pool via skill match-
ing; (2) decompose project 𝑝 into 3 concurrent sub-projects; (3)                         Fine-grained Recall. We adopt an outline-driven protocol com-
assign members to each sub-project E𝑝,𝑗 , where one member may                        bining structure mining and contextual injection. Given blueprint 𝐵𝑝
participate in 1–3 sub-projects; (4) generate sub-tasks T𝑝,𝑗 for each                 and dialogue corpus C𝑝 , we traverse the task structure to identify
sub-project based on member profiles and project requirements.                        reasoning patterns (e.g., cross-group information chains, temporal
                                                                                      update sequences) and extract associated dialogue spans as evidence
3.3.3 Conversation Generation. Dialogues are generated incre-                         𝑒. An LLM then generates (𝑞, 𝑎) pairs grounded in 𝑒. For scenarios
mentally for each project 𝑝 over a simulated timeline of 𝐷 days.                      requiring constraints absent in the base narrative, we apply non-
Each sub-project 𝑗 ∈ {1, 2, 3} maintains a dedicated group chat;                      conflicting implantation: supplementary evidence derived from 𝐵𝑝
however, since all three serve the same parent project, cross-group                   is embedded into C𝑝 without altering existing content, enabling
information sharing naturally emerges through overlapping mem-                        controlled probing of corner cases while preserving conversational
bership and inter-dependent sub-tasks.                                                coherence.
   A key challenge is maintaining coherence over hundreds of
days while respecting LLM context limits. We address this through                        Memory Awareness. We adopt a scenario-construction pipeline.
                                      (<𝑑 )        (1)             (𝑑 −1)             For Updating, we locate state transitions in C𝑝 where new informa-
hierarchical summarization. Let 𝐶𝑝,𝑗         = {𝐶𝑝,𝑗    , . . . , 𝐶𝑝,𝑗    } denote
                                                                                      tion supersedes previous states; distractors represent stale infor-
the conversation history of sub-project 𝑗 before day 𝑑. We compute:
                                                                                      mation. For Constraint, we extract implicit rules (e.g., “always use
             (𝑑 )                  (𝑑 −7:𝑑 −1)
                                               , T𝑝,𝑗(𝑑 −7:𝑑 −1) ,                    Python for data tasks”) and construct scenarios requiring their ap-
                                                                   
          𝑊𝑝,𝑗    = Summarize 𝐶𝑝,𝑗                                              (3)
             (𝑑 )                  (𝑑 −30:𝑑 −1)       (𝑑 −30:𝑑 −1)                   plication; distractors involve incorrect rules or constraint violations.
          𝑀𝑝,𝑗 = Summarize 𝐶𝑝,𝑗                 , T𝑝,𝑗                 ,        (4)   To increase difficulty, we apply adversarial perturbation: key-
             (𝑑 )
           𝐿𝑝,𝑗                     (𝑑 −1)
                  = Extractleader 𝐶𝑝,𝑗
                                           
                                             ,                                  (5)   word substitution removes surface-level cues, and parameter removal
                                                                                      strips explicit triggers, forcing reliance on semantic understanding
        (𝑑 )                                                 (𝑑 )
where 𝑊𝑝,𝑗   is a weekly summary capturing recent progress, 𝑀𝑝,𝑗                      over lexical matching.
                                                                  (𝑑 )
is a monthly summary preserving high-level milestones, and 𝐿𝑝,𝑗                         Profile Understanding. We extract user traits from interaction
contains leader instructions (e.g., task assignments) extracted from                  patterns in C𝑝 and generate questions requiring inference of these
Conference acronym ’XX, June 03–05, 2018, Woodstock, NY                                                                                     Hu et al.


traits. Distractors are designed to isolate genuine comprehension                Evaluation Metrics. For Fine-Grained Recall, answers are concrete
from heuristic shortcuts. For Style, we construct an adversarial ma-         facts (names, numbers, timestamps) that may vary in surface form
trix with options varying along two dimensions (Fact Correctness             while remaining semantically correct; we use LLM-as-a-judge [32]
× Style Match); this 2×2 design separates style comprehension from           to assess semantic equivalence. For Memory Awareness and Pro-
factual accuracy, with deliberate length-bias in incorrect options.          file Understanding, the challenge lies in distinguishing genuine
For Skill and Title, distractors are generated via reasoning chains          memory recall from plausible fabrication—a system without true
to be “plausible but wrong” (e.g., attributing design tool usage to a        memory access could still generate reasonable-sounding responses
backend engineer), testing understanding of role boundaries and              by leveraging general knowledge. To isolate actual recall ability, we
professional expertise.                                                      use multiple-choice format with carefully constructed distractors
                                                                             that are contextually plausible but factually inconsistent with the
3.3.5 Q&A Quality Control. We implement a three-phase filter-                conversation history.
ing pipeline to ensure benchmark validity: samples must require
memory access and be uniquely grounded in specific evidence.                 4.2    Performance across Different Tasks
  Phase I: Blind Test. A sample (𝑞, 𝑎) is discarded if an LLM can            Table 4 presents evaluation results across three task families. We
predict 𝑎 given only 𝑞 without any dialogue context. This filters            highlight several key findings.
out: (1) parametric memorization, i.e., answers derivable from world
knowledge in model weights; and (2) annotation artifacts, i.e., low-            Finding 1: Multi-hop reasoning collapses under multi-party inter-
quality distractors that make correct answers guessable.                     leaving. While all systems achieve reasonable single-hop perfor-
                                                                             mance (Gemini-3-Flash: 97.65%, memory systems: 49–86%), multi-
   Phase II: Evidence Grounding. We partition C𝑝 into segments               hop questions cause universal collapse. Gemini-3-Flash drops to
S = {𝑆 1, . . . , 𝑆𝑛 } based on dialogue subtasks. For each (𝑞, 𝑎, 𝑒), let   26.51%; the best memory system (EverMemOS) achieves only 17.27%.
𝑆 + denote the segment containing evidence 𝑒, and 𝑆 − = S \ {𝑆 + }.             This reveals that both long-context LLMs and memory systems
We enforce dual verification:                                                struggle with the interleaved information structure of multi-party
      • Sufficiency: LLM must correctly derive 𝑎 from (𝑞, 𝑆 + ), en-         communication. Unlike dyadic settings where facts appear in single
        suring 𝑒 is self-contained.                                          exchanges, multi-party scenarios scatter related information across
      • Uniqueness: LLM must fail to derive 𝑎 from (𝑞, 𝑆 𝑗 ) for all         speakers, groups, and time points. A decision may be proposed by
        𝑆 𝑗 ∈ 𝑆 − , ensuring no unintended solution paths.                   one person, debated in another channel, and finalized by a third
                                                                             party days later. Neither brute-force context access nor retrieval-
   Phase III: Human Audit. Expert annotators review samples sur-             based memory handles this fragmentation adequately.
viving automated filters for: (1) logical incoherence, i.e., structurally
valid but semantically nonsensical questions; and (2) pragmatic im-             Finding 2: Temporal reasoning remains unsolved. Temporal ques-
plausibility, i.e., distractors trivially dismissible via common sense       tions yield uniformly poor performance: Gemini-3-Flash achieves
despite satisfying formal constraints.                                       only 45.00%, GPT-4.1-mini scores 7.00%, and memory systems range
                                                                             from 2.67% to 21.00%.
4     Experiments                                                               In realistic collaboration, decisions evolve—a budget proposed
                                                                             Monday may be revised Wednesday and finalized Friday. Answer-
We evaluate LLMs and memory-augmented systems on EverMem-                    ing “What is the final budget?” requires not just locating mentions
Bench to diagnose how they handle multi-party, high-density con-             but understanding version semantics: which statement supersedes
versational dynamics.                                                        which, and what counts as “final.” Current architectures treat mem-
                                                                             ory as a flat store rather than a versioned timeline, leaving temporal
4.1     Experimental Setup                                                   reasoning largely unsolved.
  Evaluated Systems. We evaluate two categories: (1) Long-context
LLMs that receive complete conversation history—we select both                   Finding 3: Memory awareness requires both precise retrieval and
commercial models (Gemini-3-Flash [7], GPT-4.1-mini [1]) and                 robust reasoning. Results on Memory Awareness (Table ??) reveal
open-source models (LLaMA-4-Scout [21]) that support ultra-long              a striking gap: Gemini-3-Flash with full context achieves 96–100%
context windows; (2) Memory-augmented systems (Zep [24], Mem0 [5],           across all three subtasks, while memory-augmented systems range
MemOS [18], MemoBase [20], EverMemOS [10]) that selectively                  from 55–89% (Constraint), 37–90% (Proactivity), and 19–85% (Up-
persist and retrieve information, with retrieval configured at top-          dating).
𝑘=10. Unless otherwise specified, all memory-augmented systems                   The upper-bound performance confirms that LLMs possess the
use GPT-4.1-mini as the default answer model.                                reasoning capability for memory awareness when provided with
                                                                             strong evidence (i.e., complete context containing all relevant in-
   Oracle Evaluation. To establish upper-bound performance, we               formation). However, retrieval-based systems surface only weak
construct an oracle setting where ground-truth evidence spans are            evidence: fragments scattered across the conversation history that
provided directly to the LLM. For each question, we extract the mini-        are semantically related but lack explicit connections. Operating on
mal set of conversation segments that contain the answer, bypassing          such incomplete information demands stronger reasoning to rec-
the retrieval process entirely. This isolates the LLM’s reasoning ca-        ognize latent relevance. This creates a dual bottleneck: (1) retrieval
pability from retrieval quality, revealing whether performance gaps          quality, as current embedding-based methods fail when relevance
stem from retrieval failures or fundamental reasoning limitations.           is inferential rather than lexical (e.g., connecting a restaurant query
EverMemBench: Benchmarking Long-Term Interactive Memory in Large Language Models                       Conference acronym ’XX, June 03–05, 2018, Woodstock, NY



                                 Fine-Grained Recall                 Memory Awareness                     Profile Understanding
 Models / Methods                                                                                                                                   AVG
                                 Single Multi            Temp        Const Proact Update                   Style       Skill         Title

                                                                  GPT-4.1-mini

 Vanilla                          83.57       2.41        7.00       63.43         25.06       42.54      39.20 35.50                38.27          37.44
      + Zep                      73.71 8.03              13.00       67.16 47.54              43.66       26.70 35.50                44.39         39.97
      + Mem0                     55.40 11.24              6.33       66.17 52.46              51.87       22.73 31.36                36.22         37.09
      + MemOS                    67.14 14.06             19.00       64.93 54.10              35.82       28.98 40.83                49.49         41.59
      + MemoBase                 55.87 14.06             17.67       54.73 37.00              28.73       11.36 25.44                36.22         31.23
      + EverMemOS                86.38 13.25             18.00       75.87 51.52              45.15       30.11 34.91                45.92         44.57

                                                   Llama-4-Scout-17B-16E-Instruct

 Vanilla                          77.93       0.00        1.67       60.45         43.79      67.91       27.84       39.64          42.35          40.18
      + Zep                      71.36        4.02        7.00       67.41 52.69               35.45      27.84       46.15          46.43         39.82
      + Mem0                     55.40        3.21        3.33       66.17 63.00               45.90      23.30       51.48          44.39         39.58
      + MemOS                    64.79        2.01       11.67       65.17 62.06               35.07      30.68       52.66          51.53         41.74
      + MemoBase                 52.11        4.42       10.33       58.71 49.41               18.66      21.59       45.56          40.82         33.51
      + EverMemOS                83.57        9.24        9.33       72.64 62.53               42.54      29.55       50.30          43.37         44.79

                                                                 Gemini-3-flash

 Vanilla                         97.65 26.51             45.00       96.77 98.36             100.00 67.05 53.25                      68.88         72.61
      + Zep                       68.54       6.02       11.00       85.82         82.44       78.36      34.66 60.95                66.33          54.90
      + Mem0                      56.34       5.62        2.67       79.60         84.54       85.45      36.93 56.21                61.73          52.12
      + MemOS                     65.26       5.62       21.00       79.10         87.35       83.58      31.82 60.36                65.31          55.49
      + MemoBase                  49.30       3.21       15.00       82.34         87.35       80.97      38.64 56.21                64.29          53.03
      + EverMemOS                 85.92      17.27       18.33       89.30         90.16       75.75      57.95 56.80                69.90          62.38
Table 2: Main evaluation results on the EverMemBench dataset. Results are grouped by the answer model used. “Vanilla” uses
the full dialogue context as input, while memory-augmented methods utilize only retrieved information. The best results per
metric within each group are highlighted in bold.



to a colleague’s dietary restriction mentioned weeks ago); and (2)                 compared to 25–61% on Skill and 36–70% on Title. Even Gemini-3-
reasoning robustness, as models must infer correct answers from                    Flash reaches only 67.05%.
partial cues rather than explicit statements. Improving memory                        The difficulty is fundamental: communication style is not a
awareness thus requires advances on both fronts: retrieval systems                 discrete fact but an emergent pattern across many interactions.
capable of reasoning about latent relevance, and LLMs robust to                    Whether a user is directive versus collaborative, formal versus ca-
evidence sparsity.                                                                 sual, cannot be captured by any single snippet—it requires aggregat-
                                                                                   ing signals distributed across the entire history. Current paradigms,
                                                                                   designed to retrieve discrete memories, are structurally ill-suited
  Finding 4: Communication style resists extraction under current
                                                                                   for pattern abstraction.
memory paradigms. Among Profile Understanding subtasks, Style
proves most challenging: memory systems achieve only 11–58%,
Conference acronym ’XX, June 03–05, 2018, Woodstock, NY                                                                                     Hu et al.



                                                          Fine-Grained Recall                      Memory Awareness
            Models / Methods                                                                                                                AVG
                                                 Single-Hop Multi-Hop Temporal Constraint Proactivity Updating
                                                             Large Language Models
           GPT-4.1-mini                              99.53        97.99       60.00           96.77           86.65           98.51         89.91
   Llama-4-Scout-17B-16E-Instruct                    96.24        37.35       34.00           93.53           90.87           96.64         74.77
           Gemini-3-flash                            98.14        88.37       54.33           99.26           98.12           99.23         89.58
                            Table 3: Oracle performance with ground-truth evidence spans provided directly.



   Finding 5: Retrieval compensates weak models but bottlenecks                   Method           T1       T2      T3       T4        T5
strong ones. Models with weaker long-context reasoning (GPT-4.1-
mini, LLaMA-4-Scout) gain 1–7% accuracy with memory augmenta-                     Zep             47.46   48.80    48.72   52.27      48.47
tion: retrieval filters noise and helps these models focus on relevant            Mem0            47.38   44.95    53.20   48.83      48.95
content. In contrast, Gemini-3-Flash drops from 72.61% to 52–62%,                 MemOS           49.98   50.77    53.74   50.17      51.73
as retrieval discards information the model could otherwise exploit.              MemoBase        41.78   41.86    44.07   41.77      40.26
However, for strong models, memory systems enable deployment                      EverMemOS       49.16   53.04    57.07   51.59      52.62
where full-context processing is infeasible, trading accuracy for           Table 4: Performance across five topics (T1–T5: Technology,
scalability. This suggests practitioners should match memory strat-         Operations, Marketing, Financial Services, Governance). Bold
egy to backbone capability: use retrieval to boost weak models,             indicates each system’s best-performing topic; underline in-
but for strong models, weigh accuracy loss against deployment               dicates second-best.
constraints.




                                                                            4.3    Performance across Different Topics
    Finding 6: Multi-hop reveals retrieval fidelity as the new bottleneck
                                                                            Table 4 reports performance across five project domains. Cross-
for strong models. A striking inversion occurs in multi-hop reason-
                                                                            domain difficulty remains stable: average performance ranges from
ing: GPT-4.1-mini improves from 2.41% to 8–14% with memory
                                                                            47.2% (T1) to 51.4% (T3), confirming that the benchmark does
augmentation, while Gemini-3-Flash collapses from 26.51% to 3–6%
                                                                            not favor particular domains. System rankings are also consistent:
with most memory systems. This paradox—where a stronger model
                                                                            EverMemOS ranks first and MemoBase ranks last on all five do-
performs worse than a weaker one under memory augmentation—
                                                                            mains, indicating that capability gaps are fundamental rather than
signals a fundamental shift in the evaluation bottleneck from model
                                                                            domain-dependent. Notably, four of five systems perform best on T3
reasoning to retrieval fidelity.
                                                                            (retail/supply-chain), possibly because this domain features more
    For weaker answer models, memory systems primarily serve to
                                                                            standardized information structures (e.g., performance metrics, ver-
“feed relevant information to the model,” and system rankings reflect
                                                                            sion numbers) that are easier to retrieve precisely. Cross-domain
basic retrieval effectiveness. However, when the answer model
                                                                            stability varies across systems: MemOS shows the smallest variance
approaches the reasoning upper bound, strong models become
                                                                            (Δ=3.8%), while Mem0 exhibits the largest (Δ=8.3%).
acutely sensitive to retrieval-induced artifacts: noise from irrelevant
snippets, version conflicts from outdated information, and loss of
implicit cues from aggressive compression. If retrieval sacrifices          4.4    Discussion
contextual coherence for top-𝑘 coverage, it actively interferes with        We analyze performance bounds to diagnose system limitations.
the model’s native reasoning capabilities.                                  Table 3 reports oracle performance where ground-truth evidence
    Notably, EverMemOS achieves 17.27% on Gemini-3-Flash—sub-               spans are provided directly, isolating reasoning capability from
stantially outperforming other memory systems (3–6%)—because                retrieval quality.
its event-boundary segmentation preserves complete episodic units              The oracle results reveal a clear dichotomy between retrieval-
rather than fragmenting conversations into isolated snippets. This          bound and reasoning-bound tasks. For Memory Awareness, oracle
demonstrates that for strong models, retrieval granularity and co-          performance reaches 87–99% across all models, while memory-
herence preservation matter more than raw recall volume. The                augmented systems achieve only 29–76% (Table ??). This confirms
“chaotic” rankings on Gemini-3-Flash are thus diagnostically valu-          that retrieval quality is the primary bottleneck: LLMs possess suffi-
able: they reveal which memory systems damage critical implicit             cient reasoning capability when provided with relevant evidence,
cues and version semantics during compression and retrieval, vali-          but current retrieval methods fail to surface the right information.
dating that EverMemBench remains discriminative even for high-                 In contrast, Temporal reasoning remains challenging even with
capability models.                                                          oracle evidence. The best model (GPT-4.1-mini) achieves only 60%,
EverMemBench: Benchmarking Long-Term Interactive Memory in Large Language Models                           Conference acronym ’XX, June 03–05, 2018, Woodstock, NY


while LLaMA-4 reaches just 34%. This reveals a fundamental reason-                 References
ing limitation: temporal information in multi-party conversations                   [1] Josh Achiam, Steven Adler, Sandhini Agarwal, Lama Ahmad, Ilge Akkaya, et al.
is inherently fragmented—a decision may be proposed on Monday,                          2024. GPT-4 Technical Report. arXiv preprint arXiv:2303.08774 (2024).
                                                                                    [2] Sebastian Borgeaud, Arthur Mensch, Jordan Hoffmann, Trevor Cai, Eliza Ruther-
questioned on Wednesday, and finalized on Friday, with each men-                        ford, Katie Millican, George van den Driessche, Jean-Baptiste Lespiau, Bogdan
tion scattered across different speakers and threads. Even when all                     Damoc, Aidan Clark, Diego de Las Casas, Aurelia Guy, Jacob Menick, Roman
                                                                                        Ring, Tom Hennigan, Saffron Huang, Loren Maggiore, Chris Jones, Albin Cassirer,
relevant snippets are provided, LLMs struggle to reconstruct the                        Andy Brock, Michela Paganini, Geoffrey Irving, Oriol Vinyals, Simon Osindero,
true temporal narrative from these dispersed cues. The challenge                        Karen Simonyan, Jack W. Rae, Erich Elsen, and Laurent Sifre. 2022. Improving
is not merely recognizing that later statements supersede earlier                       language models by retrieving from trillions of tokens. arXiv:2112.04426 [cs.CL]
                                                                                        https://arxiv.org/abs/2112.04426
ones, but synthesizing a coherent timeline from information that                    [3] Michelle Brachman, Amina El-Ashry, Casey Dugan, and Werner Geyer. 2025.
was never presented as a unified sequence.                                              Current and Future Use of Large Language Models for Knowledge Work.
    For Multi-Hop, oracle dramatically improves performance for                         arXiv:2503.16774 [cs.HC] https://arxiv.org/abs/2503.16774
                                                                                    [4] Jun Chen, Dannong Xu, Junjie Fei, Chun-Mei Feng, and Mohamed Elhoseiny.
strong models (GPT-4.1-mini: from 2.41% to 97.99%; Gemini-3-Flash:                      2024. Document Haystacks: Vision-Language Reasoning Over Piles of 1000+
from 26.51% to 88.37%), but LLaMA-4 still achieves only 37.35% even                     Documents. arXiv:2411.16740 [cs.CV] https://arxiv.org/abs/2411.16740
                                                                                    [5] Prateek Chhikara, Dev Khant, Saket Aryan, Taranjeet Singh, and Deshraj Yadav.
with oracle evidence. We observe that LLaMA-4 frequently refuses                        2025. Mem0: Building Production-Ready AI Agents with Scalable Long-Term
to answer or hedges when presented with oracle snippets, interpret-                     Memory. arXiv:2504.19413 [cs.CL] https://arxiv.org/abs/2504.19413
ing the fragmented dialogue segments as incomplete information.                     [6] Gheorghe Comanici, Eric Bieber, Mike Schaekermann, Ice Pasupat, Noveen
                                                                                        Sachdeva, Inderjit Dhillon, et al. 2025. Gemini 2.5: Pushing the Frontier with
This behavioral tendency—being overly cautious about answering                          Advanced Reasoning, Multimodality, Long Context, and Next Generation Agentic
with perceived partial evidence—significantly degrades accuracy.                        Capabilities. arXiv:2507.06261 [cs.CL] https://arxiv.org/abs/2507.06261
The finding highlights that oracle evaluation with extracted snip-                  [7] Google. 2025. Introducing Gemini 3 Flash: Benchmarks, Global Availability.
                                                                                        https://blog.google/products/gemini/gemini-3-flash/.
pets may disadvantage models that are trained to be conservative                    [8] Kelvin Guu, Kenton Lee, Zora Tung, Panupong Pasupat, and Ming-Wei
when context appears incomplete, even when sufficient information                       Chang. 2020. REALM: Retrieval-Augmented Language Model Pre-Training.
                                                                                        arXiv:2002.08909 [cs.CL] https://arxiv.org/abs/2002.08909
is actually present.                                                                [9] Junqing He, Liang Zhu, Rui Wang, Xi Wang, Reza Haffari, and Jiaxing Zhang.
                                                                                        2024. MADial-Bench: Towards Real-world Evaluation of Memory-Augmented
                                                                                        Dialogue Generation. arXiv:2409.15240 [cs.CL] https://arxiv.org/abs/2409.15240
5    Conclusion                                                                    [10] Chuanrui Hu et al. 2026. EverMemOS: A Self-Organizing Memory Operating
We presented EverMemBench, a high-realism benchmark for long-                           System for Structured Long-Horizon Reasoning. arXiv:2601.02163 [cs.CL] https:
                                                                                        //arxiv.org/abs/2601.02163
term conversational memory built from multi-party workplace                        [11] Zhongtian Hu, Qi He, Ronghan Li, Meng Zhao, and Lifang Wang. 2025. Advanc-
chats grounded in project timelines and public events. Its curation                     ing Multi-Party Dialogue Framework with Speaker-ware Contrastive Learning.
pipeline yields traceable dialogue logs and QA items that stress                        arXiv:2501.11292 [cs.CL] https://arxiv.org/abs/2501.11292
                                                                                   [12] Lei Huang, Weijiang Yu, Weitao Ma, Weihong Zhong, Zhangyin Feng, Haotian
realistic memory demands, beyond mere context length. Based                             Wang, Qianglong Chen, Weihua Peng, Xiaocheng Feng, Bing Qin, and Ting
on this, we introduced an evaluation suite that factors memory                          Liu. 2025. A Survey on Hallucination in Large Language Models: Principles,
                                                                                        Taxonomy, Challenges, and Open Questions. ACM Transactions on Information
competence into detailed recall, memory awareness, and user profile                     Systems 43, 2 (Jan. 2025), 1–55. doi:10.1145/3703155
understanding. EverMemBench thus offers a controlled yet realistic                 [13] Zhaopei Huang, Qifeng Dai, Guozheng Wu, Xiaopeng Wu, Kehan Chen, Chuan
testbed for analyzing memory architectures and retrieval strategies,                    Yu, Xubin Li, Tiezheng Ge, Wenxuan Wang, and Qin Jin. 2025. Mem-PAL: Towards
                                                                                        Memory-based Personalized Dialogue Assistants for Long-term User-Agent In-
and we hope it will serve as a shared benchmark to drive progress                       teraction. arXiv:2511.13410 [cs.CL] https://arxiv.org/abs/2511.13410
toward robust, socially aware long-horizon agents.                                 [14] Bowen Jiang, Zhuoqun Hao, Young-Min Cho, Bryan Li, Yuan Yuan, Sihao Chen,
                                                                                        Lyle Ungar, Camillo J. Taylor, and Dan Roth. 2025. Know Me, Respond to Me:
                                                                                        Benchmarking LLMs for Dynamic User Profiling and Personalized Responses at
6    Limitations                                                                        Scale. arXiv:2504.14225 [cs.CL] https://arxiv.org/abs/2504.14225
                                                                                   [15] Bowen Jiang, Yuan Yuan, Maohao Shen, Zhuoqun Hao, Zhangchen Xu, Zichen
   Synthetic Data. EverMemBench dialogues are generated by Gemini-                      Chen, Ziyi Liu, Anvesh Rao Vijjini, Jiashu He, Hanchao Yu, Radha Poovendran,
2.5-Pro rather than collected from real human conversations. While                      Gregory Wornell, Lyle Ungar, Dan Roth, Sihao Chen, and Camillo Jose Taylor.
                                                                                        2025. PersonaMem-v2: Towards Personalized Intelligence via Learning Implicit
our multi-stage pipeline with quality verification ensures logical                      User Personas and Agentic Memory. arXiv:2512.06688 [cs.CL] https://arxiv.org/
consistency and persona coherence, synthetic dialogues may differ                       abs/2512.06688
from natural human communication in subtle ways—such as the                        [16] Jiazheng Kang, Mingming Ji, Zhe Zhao, and Ting Bai. 2025. Memory OS of AI
                                                                                        Agent. arXiv:2506.06326 [cs.AI] https://arxiv.org/abs/2506.06326
distribution of disfluencies, implicit social cues, or domain-specific             [17] Patrick Lewis, Ethan Perez, Aleksandra Piktus, Fabio Petroni, Vladimir Karpukhin,
jargon. Future work could validate findings on human-generated                          Naman Goyal, Heinrich Küttler, Mike Lewis, Wen tau Yih, Tim Rocktäschel,
corpora.                                                                                Sebastian Riedel, and Douwe Kiela. 2021. Retrieval-Augmented Generation for
                                                                                        Knowledge-Intensive NLP Tasks. arXiv:2005.11401 [cs.CL] https://arxiv.org/abs/
                                                                                        2005.11401
   Domain Scope. The benchmark focuses on workplace collabora-                     [18] Zhiyu Li, Shichao Song, Hanyu Wang, Simin Niu, Ding Chen, Jiawei Yang,
tion scenarios, which naturally concentrate multi-party coordina-                       Chenyang Xi, Huayi Lai, Jihao Zhao, Yezhaohui Wang, Junpeng Ren, Zehao
                                                                                        Lin, Jiahao Huo, Tianyi Chen, Kai Chen, Kehang Li, Zhiqiang Yin, Qingchen Yu,
tion and information updates. However, conversational memory                            Bo Tang, Hongkang Yang, Zhi-Qin John Xu, and Feiyu Xiong. 2025. MemOS: An
demands also arise in personal assistance, social groups, and ed-                       Operating System for Memory-Augmented Generation (MAG) in Large Language
ucational settings, where interaction dynamics may differ. The                          Models. arXiv:2505.22101 [cs.CL] https://arxiv.org/abs/2505.22101
                                                                                   [19] Adyasha Maharana, Dong-Ho Lee, Sergey Tulyakov, Mohit Bansal, Francesco
organizational framing, while providing controlled evaluation, may                      Barbieri, and Yuwei Fang. 2024. Evaluating Very Long-Term Conversational
not fully generalize to all memory-relevant domains.                                    Memory of LLM Agents. arXiv:2402.17753 [cs.CL] https://arxiv.org/abs/2402.
                                                                                        17753
                                                                                   [20] Memodb Team. 2025. MemoBase: User Profile-Based Long-Term Memory for AI
Acknowledgments                                                                         Chatbot Applications. https://github.com/memodb-io/memobase.
To Robert, for the bagels and explaining CMYK and color spaces.
Conference acronym ’XX, June 03–05, 2018, Woodstock, NY                                                                                                         Hu et al.


[21] Meta AI. 2025. The Llama 4 Herd: The Beginning of a New Era of Na-                   https://arxiv.org/abs/2510.27246
     tively Multimodal AI Innovation. https://ai.meta.com/blog/llama-4-multimodal-   [28] Di Wu, Hongwei Wang, Wenhao Yu, Yuwei Zhang, Kai-Wei Chang, and Dong Yu.
     intelligence/.                                                                       2025. LongMemEval: Benchmarking Chat Assistants on Long-Term Interactive
[22] Jiayan Nan, Wenquan Ma, Wenlong Wu, and Yize Chen. 2025.                             Memory. arXiv:2410.10813 [cs.CL] https://arxiv.org/abs/2410.10813
     Nemori: Self-Organizing Agent Memory Inspired by Cognitive Science.             [29] Wujiang Xu, Zujie Liang, Kai Mei, Hang Gao, Juntao Tan, and Yongfeng Zhang.
     arXiv:2508.03341 [cs.AI] https://arxiv.org/abs/2508.03341                            2025. A-MEM: Agentic Memory for LLM Agents. arXiv:2502.12110 [cs.CL]
[23] Elliot Nelson, Georgios Kollias, Payel Das, Subhajit Chaudhury, and Soham            https://arxiv.org/abs/2502.12110
     Dan. 2024. Needle in the Haystack for Memory Based Large Language Models.       [30] Zhongyu Yang, Jun Chen, Dannong Xu, Junjie Fei, Xiaoqian Shen, Liangbing
     arXiv:2407.01437 [cs.CL] https://arxiv.org/abs/2407.01437                            Zhao, Chun-Mei Feng, and Mohamed Elhoseiny. 2025. WikiAutoGen: Towards
[24] Preston Rasmussen, Pavlo Paliychuk, Travis Beauvais, Jack Ryan, and Daniel           Multi-Modal Wikipedia-Style Article Generation. arXiv:2503.19065 [cs.CV] https:
     Chalef. 2025. Zep: A Temporal Knowledge Graph Architecture for Agent Memory.         //arxiv.org/abs/2503.19065
     arXiv:2501.13956 [cs.AI] https://arxiv.org/abs/2501.13956                       [31] Zhongyu Yang, Yingfang Yuan, Xuanming Jiang, Baoyi An, and Wei Pang. 2025.
[25] Rana Salama, Jason Cai, Michelle Yuan, Anna Currey, Monica Sunkara, Yi Zhang,        InEx: Hallucination Mitigation via Introspection and Cross-Modal Multi-Agent
     and Yassine Benajiba. 2025. MemInsight: Autonomous Memory Augmentation               Collaboration. arXiv:2512.02981 [cs.CV] https://arxiv.org/abs/2512.02981
     for LLM Agents. arXiv:2503.21760 [cs.CL] https://arxiv.org/abs/2503.21760       [32] Lianmin Zheng, Wei-Lin Chiang, Ying Sheng, Siyuan Zhuang, Zhanghao Wu,
[26] Haoran Tan, Zeyu Zhang, Chen Ma, Xu Chen, Quanyu Dai, and Zhenhua Dong.              Yonghao Zhuang, Zi Lin, Zhuohan Li, Dacheng Li, Eric P. Xing, Hao Zhang,
     2025. MemBench: Towards More Comprehensive Evaluation on the Memory of               Joseph E. Gonzalez, and Ion Stoica. 2023. Judging LLM-as-a-Judge with MT-Bench
     LLM-based Agents. arXiv:2506.21605 [cs.CL] https://arxiv.org/abs/2506.21605          and Chatbot Arena. arXiv:2306.05685 [cs.CL] https://arxiv.org/abs/2306.05685
[27] Mohammad Tavakoli, Alireza Salemi, Carrie Ye, Mohamed Abdalla, Hamed
     Zamani, and J Ross Mitchell. 2025. Beyond a Million Tokens: Benchmark-          Received 20 February 2007; revised 12 March 2009; accepted 5 June 2009
     ing and Enhancing Long-Term Memory in LLMs. arXiv:2510.27246 [cs.CL]
