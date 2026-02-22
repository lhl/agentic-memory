<!-- Generated from arxiv-2602.11243.pdf via pdftotext -layout on 2026-02-22 -->

                                         Preprint. Work in progress.



                                         E VALUATING M EMORY S TRUCTURE IN LLM AGENTS
                                             Alina Shutova ∗ †       Alexandra Olenina † ‡        Ivan Vinogradov ‡ ⋆        Anton Sinitsin †

                                                                                       A BSTRACT
                                                    Modern LLM-based agents and chat assistants rely on long-term memory frame-
                                                    works to store reusable knowledge, recall user preferences, and augment reasoning.
                                                    As researchers create more complex memory architectures, it becomes increasingly
                                                    difficult to analyze their capabilities and guide future memory designs. Most long-
                                                    term memory benchmarks focus on simple fact retention, multi-hop recall, and
                                                    time-based changes. While undoubtedly important, these capabilities can often be
                                                    achieved with simple retrieval-augmented LLMs and do not test complex memory
                                                    hierarchies. To bridge this gap, we propose StructMemEval — a benchmark that




arXiv:2602.11243v1 [cs.LG] 11 Feb 2026
                                                    tests the agent’s ability to organize its long-term memory, not just factual recall.
                                                    We gather a suite of tasks that humans solve by organizing their knowledge in
                                                    a specific structure: transaction ledgers, to-do lists, trees and others. Our initial
                                                    experiments show that simple retrieval-augmented LLMs struggle with these tasks,
                                                    whereas memory agents can reliably solve them if prompted how to organize
                                                    their memory. However, we also find that modern LLMs do not always recognize
                                                    the memory structure when not prompted to do so. This highlights an important
                                                    direction for future improvements in both LLM training and memory frameworks.


                                         1      I NTRODUCTION
                                         As Large Language Models (LLMs) keep improving, we trust them with increasingly longer and
                                         more difficult tasks (Kwa et al., 2025). Frontier models assist users over long stretches of time (Xu
                                         et al., 2022; Jang et al., 2023; Wang et al., 2025a), work with large documents (Packer et al., 2023;
                                         Chevalier et al., 2023), perform long-form reasoning (ARC Prize Foundation, 2024; Phan et al., 2025)
                                         and agentic tasks (Erdogan et al., 2025; Merrill et al., 2026). To solve these tasks, a model needs to
                                         process vast amounts of information, both input sources and its own workings. As LLMs deal with
                                         harder problems, it becomes infeasible to keep all that information in their working memory.
                                         Recent works circumvent this by equipping the LLM with long-term memory: allowing the agent
                                         to offload its knowledge from working memory to an external database and retrieve it only when
                                         necessary (Packer et al., 2023; OpenAI, 2024). Memory designs vary between methods: from simple
                                         look-up dictionaries (Packer et al., 2023; Wang et al., 2024b) to complex frameworks (Chhikara et al.,
                                         2025; Rasmussen et al., 2025) and entire operating systems (Li et al., 2025; Kang et al., 2025).
                                         To compare between memory architectures, researchers and practitioners evaluate them on specialized
                                         benchmarks like LOCOMO (Maharana et al., 2024) and LongMemEval (Wu et al., 2024). These
                                         benchmarks typically let the LLM process a scenario (e.g. personal assistant, corporate, agent), then
                                         ask questions to test its recall: single-hop, multi-hop, time-sensitive updates and more. However,
                                         recent works have found that simple memory recall often does not require complex memory architec-
                                         ture (Zhou & Han, 2025; Ai et al., 2025). In one such work, Zhou & Han (2025) demonstrates that
                                         simple retrieval can outperform complex memory hierarchies on both LOCOMO and LongMemEval.
                                         This leads to a question: what kinds of problems do require complex memory hierarchies?
                                         In this work, we focus on one answer: that memory allows LLM agents to organize their knowledge.
                                         Instead of retrieving messages as-is, memory-augmented LLMs can extract knowledge and assemble
                                         it into a structure that best fits their task. We analyze scenarios that require not just factual recall
                                         (where retrieval is enough), but high-level memory organization. To that end, we gather a suite of
                                         tasks that a “notepad-augmented human” would solve by maintaining ledgers, drawing trees, tracking
                                         states and similar. We find that even simple tasks of this kind prove difficult for retrieval-augmented
                                         agents, but proper memory-augmented agents fare significantly better. When we explicitly prompt
                                         LLM agents to organize their memory, they can reliably solve tasks on a scale that retrieval-augmented
                                         LLMs struggle with, but the same agents perform less reliably without such “hints”. Informally,
                                         LLMs that can solve abstract algorithmic tasks often fail to recognize the same structure patterns in
                                         the wild. We release our task suite at https://github.com/yandex-research/StructMemEval.
                                         ∗
                                             HSE University, † Yandex, ‡ YSDA, ⋆ New Economic School. Correspondence to: ant.sinitsin@gmail.com .


                                                                                             1
Preprint. Work in progress.




2       BACKGROUND
Transformer Working Memory. Transformer LLMs normally store task-specific information in
the form of a Key-Value (KV) cache. This cache contains token-level vector representations used
by attention layers on every inference step (Vaswani et al., 2017). For modern LLMs, this cache is
limited to few ×104−5 tokens with a few extreme cases going over a million tokens (GLM et al.,
2024; Yang et al., 2025). While this limit can be extended (Peng et al., 2024; Li et al., 2023; Pekelis
et al., 2024), a large KV cache fills accelerator memory1 and slows down inference.
If the LLM needs to process more information than its KV cache allows, there are two main strategies
for achieving this: either compressing the KV cache or using external long-term memory. The former
includes KV quantization (Liu et al., 2024; Hooper et al., 2024; Shutova et al., 2025), pruning (Zhang
et al., 2023b; Xiao et al., 2023), offloading techniques (Lee et al., 2024) and other techniques that
reduce the overhead from having a large KV cache. The latter bypasses the need for large KV cache
by allowing the LLM to offload its knowledge to an external database and retrieve it later.
Memory-Augmented LLMs. Even before the LLMs, NLP researchers have allowed their models to
retrieve relevant knowledge from a corpora to give it access to additional knowledge and improve
factuality (Guu et al., 2020; Karpukhin et al., 2020; Lewis et al., 2020). However, not all problems
can be solved with a static database: for instance, when dealing with user preferences or working
memory, the model must be able to update its knowledge to maintain relevant information (Wu et al.,
2022). To address this, Packer et al. (2023) propose MemGPT — an external memory system that
equips LLM agents with tools to create and update memory entries for later retrieval.
Since then, multiple lines of work propose extensions to this idea using knowledge graphs (Rasmussen
et al., 2025; Chhikara et al., 2025; Wang et al., 2024a), hierarchy (Sun & Zeng, 2025; Kirmayr et al.,
2025; Zhang et al., 2026a) insights from cognitive science (Nan et al., 2025), note taking (Xu et al.,
2025; Tekparmak & Ömer Kaya, 2025), and others (Gao et al., 2025; Fang et al., 2025; MemMachine
Contributors, 2025). Aside from storing user preferences, agentic memory is also used for knowledge
updates (Wang et al., 2024b; 2025b), iterative “evolutionary” problem solving (Agrawal et al., 2025;
Zhang et al., 2026b), programming (Gandhi et al., 2025; Shen & Joung, 2025), embodied and virtual
agents (Glocker et al., 2025; Lei et al., 2025; Wang et al., 2024c; Qi et al., 2025). Recent works
propose even more complex memory frameworks and operating systems (Li et al., 2025; Kang et al.,
2025) or fine-tuning the LLM to a specific memory type (Modarressi et al., 2024; Yan et al., 2026).
Benchmarking Long-term Memory frameworks is an inherently difficult task. Two of the most pop-
ular benchmarks for memory agents are LOCOMO (Maharana et al., 2024) and LongMemEval (Wu
et al., 2024), focus on a chat assistant use case where the agent is expected to recall individual
facts, do multi-hop look-ups and update its knowledge over time as the context changes. Other
benchmarking scenarios are based on interactive conversations with user feedback (Kim et al., 2024;
Wan & Ma, 2025; Ai et al., 2025) or convert existing long-context datasets (Hu et al., 2025). Other
more specialized benchmarks target test-time learning (Wei et al., 2025), personalization and oth-
ers (Kim et al., 2025; Jiang et al., 2025; Jia et al., 2025). However, recent works have found that
many of these evaluation tasks do not use complex memory hierarchies (Zhou & Han, 2025; Ai
et al., 2025; Rasmussen et al., 2025). Notably, Zhou & Han (2025) introduces EMem and Emem-G:
simple retrieval baselines that outperform more complex memory structures on both LOCOMO and
LongMemEval. We hypothesize that these benchmarks do not test the more advanced components of
agentic memory, making it harder to analyze their effectiveness.

3       S TRUCT M EM E VAL
In this work, we create a benchmark for evaluating one specific capability of memory agents: how
well can they structure their long-term memory for a given problem. The main difficulty for such
benchmark is that we cannot rely on a specific internal memory architecture. As we discussed in
Section 2, modern memory frameworks use varied internal representations from look-up dictionaries,
Zettelkasten notes, to graphs and temporal databases. Given the same task, Mem0g and Zep will
map the desired knowledge structure into a graph database, whereas A-Mem and MemAgent would
use interlinked notes. To compare different memory frameworks, we need our task suite to be
implementation-agnostic. To that end, we only evaluate the final answers, not the internal structure,
but we design our problems in such a way that solving them requires the agent to organize its memory.
    1
        E.g. storing 1M tokens for Qwen2.5-7B-Instruct-1M in bfloat16 takes up over 180GiB GPU memory.


                                                     2
Preprint. Work in progress.




Another important consideration is that our tasks need to benchmark the memory structure specifically.
For instance, if we were to give the LLM an extremely difficult programming task with limited context
window, the agent would have to use long-term memory. However, it would also require programming
and design capabilities, which would contaminate our results. If an agent failed to solve the problem,
it would be unclear if the error was caused by bad memory organization or simple coding error. To
decouple our benchmark from other capabilities, we deliberately select tasks that are simple given
correct memory organization but nearly impossible without it. For convenience, we organize our
benchmark around specific memory organization patterns that humans have already used: trees,
ledgers, to-do lists, indexes and others. For each pattern, we gather problems where a human expert
would follow that structure in their notes. We discuss each structure type below.
Tree-structured problems require the agent to maintain hierarchical knowledge such as taxonomies,
family trees, corporate hierarchies or codebases. To test this ability, we design problems based on
family trees and corporate hierarchies. The memory agent is given a sequence of messages that
encode relations (“A is B’s stepdaughter”) and is expected to maintain the full graph. Some of the
relations are implied (e.g. if “C is B’s wife”, then the last example also implies that “C is A’s parent”).
Notably, we found that such indirect queries often confuse purely retrieval-based LLMs.
State tracking problems are tasks where one or multiple entities can change their state over time. A
practical example is when someone moves cities, they are then no longer neighbors with those left
behind. A similar state transition can happen with tasks on KANBAN boards or functions during
codebase refactoring. In our evaluation, we gather tasks where individual messages only matter in
context of their state and keeping track of state transition is important for answering the question.
Counting problems are tasks that involve maintaining and reconciling totals. For example, an
accountant may use offsetting or netting diagrams to determine final settlement amounts (i.e., which
party owes how much), alongside other task-specific organization practices (Kieso et al., 2020).
Similarly, a personal recommender assistant would keep track of their user’s experiences to determine
which activity it should recommend, a scientist would keep statistics of their observations. We gather
tasks where the agent observes a history of transactions (e.g. “A supplied $X for B”) between multiple
parties, and must then compute the final settlement after netting (i.e. canceling circular debts).
Data curation. We gather scenarios using both human annotators and LLM augmentation with
human verifiers. Every scenario consists of a conversation history and a set of evaluation questions
asked at different conversation depths: testing if two people are related for trees, evaluating the
final debt settlement amount, etc. Using synthetic scenarios allows us to release tasks themed after
sensitive user and business applications without data privacy risks (Feretzakis et al., 2024; Goyal &
Mahmoud, 2024). We evaluate accuracy using exact match when possible (e.g. yes/no or numeric
answers) and LLM-as-a-judge (Zheng et al., 2023) for questions without a clear answer format.
Overall, we gathered 73 unique evaluation scenarios (conversations) with 544 evaluation questions.
We include additional details on data gathering and curation for every task type in Appendix A. In
future, we plan to extend this with additional problems: ordered lists for to-do queues and finding the
K best candidates, assignment maps for calendars and resource allocations, and others.
Memory organization hints. For each scenario, we provide an optional “memory organization
hint”: an informal text prompt that explains how a human would organize their knowledge for the
task at hand. We evaluate StructMemEval in two modes: with and without hints. Our main setup is
evaluating without hints. Instead, we use structure hints to diagnose error modes: if an agent fails to
solve a given problem as is, but then solves it reliably with the hint, then its original mistake stemmed
from poor knowledge structure. If, however, that agent still fails even with “hints”, then the error is
not due to wrong memory organization strategy, but in poor execution: failing to maintain the chosen
memory structure or failing to properly utilize it when answering the test questions.
In our analysis, we evaluate the following memory frameworks: 1) retrieval-augmented LLM based on
OpenAI embeddings2 (OpenAI, 2023) with different retrieval budgets, 2) markdown-based memory
from Mem-agent (Tekparmak & Ömer Kaya, 2025) and 3) Mem0 agentic memory (Chhikara et al.,
2025). Appendix B contains additional details and configurations for each memory framework.
We run our main experiments using gemini-2.5-pro and gemini-3-pro (Comanici et al., 2025)
backbone LLM, depending on the experiment. We evaluate other LLM backbones in Appendix C.
We evaluate memory frameworks with default hyperparameters, leaving room for future tuning.
   2
       We use text-embedding-3-large model and the retrieval baseline code from Chhikara et al. (2025)


                                                     3
Preprint. Work in progress.




                        Tree-based tasks                                   State tracking tasks                                   Count-based tasks
                        gemini 2.5 pro                                       gemini 2.5 pro                                         gemini 3 pro
 1.00
                                79.4%                                                   78.6%           81.0%
 0.75                                           74.1%
                                                                            64.3%               61.9%                                     60.0%          64.3%
                        50.6%                                                                                                     53.3%
 0.50                                   48.1%
                                                                                                                          40.0%
 0.25         18.3%                                                21.4%
                                                                                                                                                  6.7%
 0.00
            Retrieval               Mem-agent (w/o hint)               Mem-agent (with hint)                    Mem0 (w/o hint)               Mem0 (with hint)
 1.00                                                1.00                                                       1.00

 0.75                                                   0.75                                                    0.75

 0.50                                                   0.50                                                    0.50

 0.25                                                   0.25                                                    0.25

 0.00                                                   0.00                                                    0.00
        0      50 100 150 200 250                              0       1      2        3      4       5                   10 20                     50
            Tree-based tasks: number of edges                   State tracking tasks: num. transitions                 Count-based tasks: num. transactions
Figure 1: Top: accuracies across task types for retrieval-augmented LLM, Mem-agent, and Mem0.
Bottom: detailed accuracies per difficulty level (see X axis label) using the same colors as above.

4       E XPERIMENTS
We evaluate our task suite with both simple retrieval and memory agents. Figure 1 summarizes our
results for gemini 2.5 & 3 pro LLM and text-embedding-3-large retrieval. We use gemini-3
for count-based tasks because gemini 2.5 has too many hallucinations (see Table 2). The retrieval
system uses top-15/10/5 search for tree-based, count-based and state tracking respectively. We report
additional models (gemini-3-flash and gpt-4o-mini) and top-k configurations in Appendix C.
As expected, simple retrieval-augmented agents can solve small-scale problems, but fall off when the
task exceeds their retrieval budget. For state tracking problems, retrieval often takes messages out of
context. For instance, in a scenario where 1) the user interacted with their neighbors, then 2) moved
to a different location and interacted with new neighbors there, before 3) returning to their original
place, retrieval often prioritizes mentions of the term “neighbor” from stage (2) even though these
are no longer the user’s neighbors due to stage (3). In contrast, both Mem-agent and Mem0 score
much better across all three problem types when given a memory organization hint. Without the hint,
both agents still outperform retrieval, but their answers are less reliable. This seems counterintuitive
because LLMs are known to solve complex programming tasks using similar data structures: trees,
heaps, state machines (Chen et al., 2021; Jain et al., 2025). We hypothesize that LLMs were simply
not trained to apply algorithmic knowledge to their own memory and may improve with fine-tuning.
Curiously, the gap between memory agents with and without hints is far larger than the difference
between Mem0 and mem-agent. When evaluating other models in Appendix C, we found that this gap
persists. Newer model generations are better at following hints, but they still often fail to properly
organize their memory without hints. After analyzing LLM behavior that led to incorrect answers, we
found two main failure modes: either (i) the LLM does not organize its memory, especially when not
hinted or (ii) the LLM hallucinates spurious memories, which happens rarely in normal use, but more
often when the LLM performs hundreds of consecutive memory updates. See Appendix D for details.

5       D ISCUSSION & F UTURE W ORK
In this work, we study how well modern memory agents can organize their knowledge. We introduce
StructMemEval — a benchmark suite evaluating an agent’s ability to organize memory into structures
that facilitate specific tasks. We evaluate on three distinct problem subsets and find that memory
agents can significantly outperform simple retrieval if they adhere to an appropriate memory structure.
However, we also observe that modern LLMs do not always structure their memory correctly unless
explicitly prompted to do so. This highlights two critical directions for future research: training
(or prompting) backbone LLMs to better structure knowledge within existing frameworks, and
designing memory systems that intrinsically facilitate this capability. In future work, we aim to
extend StructMemEval with additional memory patterns—such as ordered (to-do) lists, DAGs,
assignment maps, indexes, as well as tasks that require managing multiple structures simultaneously.


                                                                                    4
Preprint. Work in progress.




Acknowledgements. Authors would like to thank Gleb Rodionov for his help with the evaluation
setup and paper presentation. We also thank Olga Vysotskaya for her guidance on accounting
practices and terminology. Finally, we thank Denis Mazur, Alexander Rostov, Artyom Eliseev, and
Denis Kuznedelev for helpful discussions and brainstorming ideas for benchmark scenarios.

R EFERENCES
Lakshya A. Agrawal, Shangyin Tan, Dilara Soylu, Noah Ziems, Rishi Khare, Krista Opsahl-Ong,
  Arnav Singhvi, Herumb Shandilya, Michael J. Ryan, Meng Jiang, Christopher Potts, Koushik
  Sen, Alexandros G. Dimakis, Ion Stoica, Dan Klein, Matei Zaharia, and Omar Khattab. Gepa:
  Reflective prompt evolution can outperform reinforcement learning. CoRR, abs/2507.19457, 2025.
  URL https://arxiv.org/abs/2507.19457.
Qingyao Ai, Yichen Tang, Changyue Wang, Jianming Long, Weihang Su, and Yiqun Liu. Memory-
  bench: A benchmark for memory and continual learning in llm systems. CoRR, 2025.
ARC Prize Foundation. Openai’s new o3 system scores breakthrough on arc-agi-pub, 2024. URL
 https://arcprize.org/blog/oai-o3-pub-breakthrough. Accessed: 2025.03.28.

Mark Chen, Jerry Tworek, Heewoo Jun, Qiming Yuan, Henrique Ponde de Oliveira Pinto, Jared
 Kaplan, Harri Edwards, Yuri Burda, Nicholas Joseph, Greg Brockman, Alex Ray, Raul Puri,
 Gretchen Krueger, Michael Petrov, Heidy Khlaaf, Girish Sastry, Pamela Mishkin, Brooke Chan,
 Scott Gray, Nick Ryder, Mikhail Pavlov, Alethea Power, Lukasz Kaiser, Mohammad Bavarian,
 Clemens Winter, Philippe Tillet, Felipe Petroski Such, Dave Cummings, Matthias Plappert, Fotios
 Chantzis, Elizabeth Barnes, Ariel Herbert-Voss, William Hebgen Guss, Alex Nichol, Alex Paino,
 Nikolas Tezak, Jie Tang, Igor Babuschkin, Suchir Balaji, Shantanu Jain, William Saunders,
 Christopher Hesse, Andrew N. Carr, Jan Leike, Josh Achiam, Vedant Misra, Evan Morikawa,
 Alec Radford, Matthew Knight, Miles Brundage, Mira Murati, Katie Mayer, Peter Welinder, Bob
 McGrew, Dario Amodei, Sam McCandlish, Ilya Sutskever, and Wojciech Zaremba. Evaluating
 large language models trained on code. CoRR, 2021.
Alexis Chevalier, Alexander Wettig, Anirudh Ajith, and Danqi Chen. Adapting language models to
  compress contexts. In Houda Bouamor, Juan Pino, and Kalika Bali (eds.), Proceedings of the 2023
  Conference on Empirical Methods in Natural Language Processing, pp. 3829–3846, Singapore,
  December 2023. Association for Computational Linguistics. doi: 10.18653/v1/2023.emnlp-main.
  232. URL https://aclanthology.org/2023.emnlp-main.232.
Prateek Chhikara, Dev Khant, Saket Aryan, Taranjeet Singh, and Deshraj Yadav. Mem0: Building
  production-ready ai agents with scalable long-term memory. arXiv preprint arXiv:2504.19413,
  2025.
Gheorghe Comanici, Eric Bieber, Mike Schaekermann, Ice Pasupat, Noveen Sachdeva, Inderjit
  Dhillon, Marcel Blistein, Ori Ram, Dan Zhang, Evan Rosen, Luke Marris, Sam Petulla, Colin
  Gaffney, Asaf Aharoni, Nathan Lintz, Tiago Cardal Pais, Henrik Jacobsson, Idan Szpektor, Nan-
 Jiang Jiang, Krishna Haridasan, Ahmed Omran, Nikunj Saunshi, Dara Bahri, Gaurav Mishra, Eric
  Chu, Toby Boyd, Brad Hekman, Aaron Parisi, Chaoyi Zhang, Kornraphop Kawintiranon, Tania
  Bedrax-Weiss, Oliver Wang, Ya Xu, Ollie Purkiss, Uri Mendlovic, Ilaï Deutel, Nam Nguyen, Adam
  Langley, Flip Korn, Lucia Rossazza, Alexandre Ramé, Sagar Waghmare, Helen Miller, Nathan
  Byrd, Ashrith Sheshan, Raia Hadsell, Sangnie Bhardwaj, Pawel Janus, Tero Rissa, Dan Horgan,
 Alvin Abdagic, Lior Belenki, James Allingham, Anima Singh, Theo Guidroz, Srivatsan Srinivasan,
  Herman Schmit, Kristen Chiafullo, Andre Elisseeff, Nilpa Jha, Prateek Kolhar, Leonard Berrada,
  Frank Ding, Xiance Si, Shrestha Basu Mallick, Franz Och, Sofia Erell, Eric Ni, Tejasi Latkar, Sherry
 Yang, Petar Sirkovic, Ziqiang Feng, Robert Leland, Rachel Hornung, Gang Wu, Charles Blundell,
  Hamidreza Alvari, Po-Sen Huang, Cathy Yip, Sanja Deur, Li Liu, Gabriela Surita, Pablo Duque,
  Dima Damen, Johnson Jia, Arthur Guez, Markus Mircea, Animesh Sinha, Alberto Magni, Paweł
  Stradomski, Tal Marian, Vlado Galić, Wenhu Chen, Hisham Husain, Achintya Singhal, Dominik
  Grewe, François-Xavier Aubet, Shuang Song, Lorenzo Blanco, Leland Rechis, Lewis Ho, Rich
  Munoz, Kelvin Zheng, Jessica Hamrick, Kevin Mather, Hagai Taitelbaum, Eliza Rutherford, Yun
  Lei, Kuangyuan Chen, Anand Shukla, Erica Moreira, Eric Doi, Berivan Isik, Nir Shabat, Dominika
  Rogozińska, Kashyap Kolipaka, Jason Chang, Eugen Vušak, Srinivasan Venkatachary, Shadi


                                                  5
Preprint. Work in progress.




  Noghabi, Tarun Bharti, Younghoon Jun, Aleksandr Zaks, Simon Green, Jeshwanth Challagundla,
  William Wong, Muqthar Mohammad, Dean Hirsch, Yong Cheng, Iftekhar Naim, Lev Proleev,
  Damien Vincent, Aayush Singh, Maxim Krikun, Dilip Krishnan, Zoubin Ghahramani, Aviel Atias,
  Rajeev Aggarwal, Christo Kirov, Dimitrios Vytiniotis, Christy Koh, Alexandra Chronopoulou,
  Pawan Dogra, Vlad-Doru Ion, Gladys Tyen, Jason Lee, Felix Weissenberger, Trevor Strohman,
  Ashwin Balakrishna, Jack Rae, Marko Velic, Raoul de Liedekerke, Oded Elyada, Wentao Yuan,
  Canoee Liu, Lior Shani, Sergey Kishchenko, Bea Alessio, Yandong Li, Richard Song, Sam
  Kwei, Orion Jankowski, Aneesh Pappu, Youhei Namiki, Yenai Ma, Nilesh Tripuraneni, Colin
  Cherry, Marissa Ikonomidis, Yu-Cheng Ling, Colin Ji, Beka Westberg, Auriel Wright, Da Yu,
  David Parkinson, Swaroop Ramaswamy, Jerome Connor, Soheil Hassas Yeganeh, Snchit Grover,
  George Kenwright, Lubo Litchev, Chris Apps, Alex Tomala, Felix Halim, Alex Castro-Ros,
  Zefei Li, Anudhyan Boral, Pauline Sho, Michal Yarom, Eric Malmi, David Klinghoffer, Rebecca
  Lin, Alan Ansell, Pradeep Kumar S, Shubin Zhao, Siqi Zuo, Adam Santoro, Heng-Tze Cheng,
  Solomon Demmessie, Yuchi Liu, Nicole Brichtova, Allie Culp, Nathaniel Braun, Dan Graur,
  Will Ng, Nikhil Mehta, Aaron Phillips, Patrik Sundberg, Varun Godbole, Fangyu Liu, Yash
  Katariya, David Rim, Mojtaba Seyedhosseini, Sean Ammirati, Jonas Valfridsson, Mahan Malihi,
  Timothy Knight, Andeep Toor, Thomas Lampe, Abe Ittycheriah, Lewis Chiang, Chak Yeung,
  Alexandre Fréchette, Jinmeng Rao, Huisheng Wang, Himanshu Srivastava, Richard Zhang, Rocky
  Rhodes, Ariel Brand, Dean Weesner, Ilya Figotin, Felix Gimeno, Rachana Fellinger, Pierre
  Marcenac, José Leal, Eyal Marcus, Victor Cotruta, Rodrigo Cabrera, Sheryl Luo, Dan Garrette,
  Vera Axelrod, Sorin Baltateanu, David Barker, Dongkai Chen, Horia Toma, Ben Ingram, Jason
  Riesa, Chinmay Kulkarni, Yujing Zhang, Hongbin Liu, Chao Wang, Martin Polacek, Will Wu,
  Kai Hui, Adrian N Reyes, Yi Su, Megan Barnes, Ishaan Malhi, Anfal Siddiqui, Qixuan Feng,
  Mihai Damaschin, Daniele Pighin, Andreas Steiner, Samuel Yang, Ramya Sree Boppana, Simeon
  Ivanov, Arun Kandoor, Aditya Shah, Asier Mujika, Da Huang, Christopher A. Choquette-Choo,
  Mohak Patel, Tianhe Yu, Toni Creswell, Jerry, Liu, Catarina Barros, Yasaman Razeghi, Aurko
  Roy, Phil Culliton, Binbin Xiong, Jiaqi Pan, Thomas Strohmann, Tolly Powell, Babi Seal, Doug
  DeCarlo, Pranav Shyam, Kaan Katircioglu, Xuezhi Wang, Cassidy Hardin, Immanuel Odisho,
  Josef Broder, Oscar Chang, Arun Nair, Artem Shtefan, Maura O’Brien, Manu Agarwal, Sahitya
  Potluri, Siddharth Goyal, Amit Jhindal, Saksham Thakur, Yury Stuken, James Lyon, Kristina
  Toutanova, Fangxiaoyu Feng, Austin Wu, Ben Horn, Alek Wang, Alex Cullum, Gabe Taubman,
  Disha Shrivastava, Chongyang Shi, Hamish Tomlinson, Roma Patel, Tao Tu, Ada Maksutaj Oflazer,
  Francesco Pongetti, Mingyao Yang, Adrien Ali Taïga, Vincent Perot, Nuo Wang Pierse, Feng Han,
  Yoel Drori, Iñaki Iturrate, Ayan Chakrabarti, Legg Yeung, Dave Dopson, Yi ting Chen, Apoorv
  Kulshreshtha, Tongfei Guo, Philip Pham, Tal Schuster, Junquan Chen, Alex Polozov, Jinwei
  Xing, Huanjie Zhou, Praneeth Kacham, Doron Kukliansky, Antoine Miech, Sergey Yaroshenko,
  Ed Chi, Sholto Douglas, Hongliang Fei, Mathieu Blondel, Preethi Myla, Lior Madmoni, Xing
  Wu, Daniel Keysers, Kristian Kjems, Isabela Albuquerque, Lijun Yu, Joel D’sa, Michelle Plantan,
  Vlad Ionescu, Jaume Sanchez Elias, Abhirut Gupta, Manish Reddy Vuyyuru, Fred Alcober, Tong
  Zhou, Kaiyang Ji, Florian Hartmann, Subha Puttagunta, Hugo Song, Ehsan Amid, Anca Stefanoiu,
  Andrew Lee, Paul Pucciarelli, Emma Wang, Amit Raul, Slav Petrov, Isaac Tian, Valentin Anklin,
  Nana Nti, Victor Gomes, Max Schumacher, Grace Vesom, Alex Panagopoulos, Konstantinos
  Bousmalis, Daniel Andor, Josh Jacob, Yuan Zhang, Bill Rosgen, Matija Kecman, Matthew Tung,
  Alexandra Belias, Noah Goodman, Paul Covington, Brian Wieder, Nikita Saxena, Elnaz Davoodi,
  Muhuan Huang, Sharath Maddineni, Vincent Roulet, Folawiyo Campbell-Ajala, Pier Giuseppe
  Sessa, Xintian, Wu, Guangda Lai, Paul Collins, Alex Haig, Vytenis Sakenas, Xiaowei Xu, Marissa
  Giustina, Laurent El Shafey, Pichi Charoenpanit, Shefali Garg, Joshua Ainslie, Boone Severson,
  Montse Gonzalez Arenas, Shreya Pathak, Sujee Rajayogam, Jie Feng, Michiel Bakker, Sheng Li,
  Nevan Wichers, Jamie Rogers, Xinyang Geng, Yeqing Li, Rolf Jagerman, Chao Jia, Nadav Olmert,
  David Sharon, Matthew Mauger, Sandeep Mariserla, Hongxu Ma, Megha Mohabey, Kyuyeun Kim,
  Alek Andreev, Scott Pollom, Juliette Love, Vihan Jain, Priyanka Agrawal, Yannick Schroecker,
  Alisa Fortin, Manfred Warmuth, Ji Liu, Andrew Leach, Irina Blok, Ganesh Poomal Girirajan,
  Roee Aharoni, Benigno Uria, Andrei Sozanschi, Dan Goldberg, Lucian Ionita, Marco Tulio
  Ribeiro, Martin Zlocha, Vighnesh Birodkar, Sami Lachgar, Liangzhe Yuan, Himadri Choudhury,
  Matt Ginsberg, Fei Zheng, Gregory Dibb, Emily Graves, Swachhand Lokhande, Gabriel Rasskin,
  George-Cristian Muraru, Corbin Quick, Sandeep Tata, Pierre Sermanet, Aditya Chawla, Itay Karo,
  Yan Wang, Susan Zhang, Orgad Keller, Anca Dragan, Guolong Su, Ian Chou, Xi Liu, Yiqing Tao,
  Shruthi Prabhakara, Marc Wilson, Ruibo Liu, Shibo Wang, Georgie Evans, David Du, Alfonso
  Castaño, Gautam Prasad, Mona El Mahdy, Sebastian Gerlach, Machel Reid, Jarrod Kahn, Amir


                                               6
Preprint. Work in progress.




  Zait, Thanumalayan Sankaranarayana Pillai, Thatcher Ulrich, Guanyu Wang, Jan Wassenberg,
  Efrat Farkash, Kiran Yalasangi, Congchao Wang, Maria Bauza, Simon Bucher, Ting Liu, Jun Yan,
  Gary Leung, Vikas Sindhwani, Parker Barnes, Avi Singh, Ivan Jurin, Jichuan Chang, Niket Kumar
  Bhumihar, Sivan Eiger, Gui Citovsky, Ben Withbroe, Zhang Li, Siyang Xue, Niccolò Dal Santo,
  Georgi Stoyanov, Yves Raimond, Steven Zheng, Yilin Gao, Vít Listík, Sławek Kwasiborski, Rachel
  Saputro, Adnan Ozturel, Ganesh Mallya, Kushal Majmundar, Ross West, Paul Caron, Jinliang Wei,
  Lluis Castrejon, Sharad Vikram, Deepak Ramachandran, Nikhil Dhawan, Jiho Park, Sara Smoot,
  George van den Driessche, Yochai Blau, Chase Malik, Wei Liang, Roy Hirsch, Cicero Nogueira dos
  Santos, Eugene Weinstein, Aäron van den Oord, Sid Lall, Nicholas FitzGerald, Zixuan Jiang, Xuan
  Yang, Dale Webster, Ali Elqursh, Aedan Pope, Georges Rotival, David Raposo, Wanzheng Zhu, Jeff
  Dean, Sami Alabed, Dustin Tran, Arushi Gupta, Zach Gleicher, Jessica Austin, Edouard Rosseel,
  Megh Umekar, Dipanjan Das, Yinghao Sun, Kai Chen, Karolis Misiunas, Xiang Zhou, Yixian Di,
  Alyssa Loo, Josh Newlan, Bo Li, Vinay Ramasesh, Ying Xu, Alex Chen, Sudeep Gandhe, Radu
  Soricut, Nikita Gupta, Shuguang Hu, Seliem El-Sayed, Xavier Garcia, Idan Brusilovsky, Pu-Chin
  Chen, Andrew Bolt, Lu Huang, Alex Gurney, Zhiying Zhang, Alexander Pritzel, Jarek Wilkiewicz,
  Bryan Seybold, Bhargav Kanagal Shamanna, Felix Fischer, Josef Dean, Karan Gill, Ross Mcilroy,
  Abhishek Bhowmick, Jeremy Selier, Antoine Yang, Derek Cheng, Vladimir Magay, Jie Tan, Dhriti
  Varma, Christian Walder, Tomas Kocisky, Ryo Nakashima, Paul Natsev, Mike Kwong, Ionel
  Gog, Chiyuan Zhang, Sander Dieleman, Thomas Jimma, Andrey Ryabtsev, Siddhartha Brahma,
  David Steiner, Dayou Du, Ante Žužul, Mislav Žanić, Mukund Raghavachari, Willi Gierke, Zeyu
  Zheng, Dessie Petrova, Yann Dauphin, Yuchuan Liu, Ido Kessler, Steven Hand, Chris Duvarney,
  Seokhwan Kim, Hyo Lee, Léonard Hussenot, Jeffrey Hui, Josh Smith, Deepali Jain, Jiawei Xia,
  Gaurav Singh Tomar, Keyvan Amiri, Du Phan, Fabian Fuchs, Tobias Weyand, Nenad Tomasev,
  Alexandra Cordell, Xin Liu, Jonathan Mallinson, Pankaj Joshi, Andy Crawford, Arun Suggala,
  Steve Chien, Nick Fernando, Mariella Sanchez-Vargas, Duncan Williams, Phil Crone, Xiyang Luo,
  Igor Karpov, Jyn Shan, Terry Thurk, Robin Strudel, Paul Voigtlaender, Piyush Patil, Tim Dozat, Ali
  Khodaei, Sahil Singla, Piotr Ambroszczyk, Qiyin Wu, Yifan Chang, Brian Roark, Chaitra Hegde,
  Tianli Ding, Angelos Filos, Zhongru Wu, André Susano Pinto, Shuang Liu, Saarthak Khanna,
  Aditya Pandey, Siobhan Mcloughlin, Qiujia Li, Sam Haves, Allan Zhou, Elena Buchatskaya,
  Isabel Leal, Peter de Boursac, Nami Akazawa, Nina Anderson, Terry Chen, Krishna Somandepalli,
  Chen Liang, Sheela Goenka, Stephanie Winkler, Alexander Grushetsky, Yifan Ding, Jamie Smith,
  Fan Ye, Jordi Pont-Tuset, Eric Li, Ruichao Li, Tomer Golany, Dawid Wegner, Tao Jiang, Omer
  Barak, Yuan Shangguan, Eszter Vértes, Renee Wong, Jörg Bornschein, Alex Tudor, Michele
  Bevilacqua, Tom Schaul, Ankit Singh Rawat, Yang Zhao, Kyriakos Axiotis, Lei Meng, Cory
  McLean, Jonathan Lai, Jennifer Beattie, Nate Kushman, Yaxin Liu, Blair Kutzman, Fiona Lang,
  Jingchen Ye, Praneeth Netrapalli, Pushkar Mishra, Myriam Khan, Megha Goel, Rob Willoughby,
  David Tian, Honglei Zhuang, JD Chen, Zak Tsai, Tasos Kementsietsidis, Arjun Khare, James
  Keeling, Keyang Xu, Nathan Waters, Florent Altché, Ashok Popat, Bhavishya Mittal, David
  Saxton, Dalia El Badawy, Michael Mathieu, Zheng Zheng, Hao Zhou, Nishant Ranka, Richard
  Shin, Qingnan Duan, Tim Salimans, Ioana Mihailescu, Uri Shaham, Ming-Wei Chang, Yannis
  Assael, Nishanth Dikkala, Martin Izzard, Vincent Cohen-Addad, Cat Graves, Vlad Feinberg,
  Grace Chung, DJ Strouse, Danny Karmon, Sahand Sharifzadeh, Zoe Ashwood, Khiem Pham,
  Jon Blanton, Alex Vasiloff, Jarred Barber, Mark Geller, Aurick Zhou, Fedir Zubach, Tzu-Kuo
  Huang, Lei Zhang, Himanshu Gupta, Matt Young, Julia Proskurnia, Ronny Votel, Valentin Gabeur,
  Gabriel Barcik, Aditya Tripathi, Hongkun Yu, Geng Yan, Beer Changpinyo, Filip Pavetić, Amy
  Coyle, Yasuhisa Fujii, Jorge Gonzalez Mendez, Tianhao Zhou, Harish Rajamani, Blake Hechtman,
  Eddie Cao, Da-Cheng Juan, Yi-Xuan Tan, Valentin Dalibard, Yilun Du, Natalie Clay, Kaisheng
  Yao, Wenhao Jia, Dimple Vijaykumar, Yuxiang Zhou, Xinyi Bai, Wei-Chih Hung, Steven Pecht,
  Georgi Todorov, Nikhil Khadke, Pramod Gupta, Preethi Lahoti, Arnaud Autef, Karthik Duddu,
  James Lee-Thorp, Alexander Bykovsky, Tautvydas Misiunas, Sebastian Flennerhag, Santhosh
  Thangaraj, Jed McGiffin, Zack Nado, Markus Kunesch, Andreas Noever, Amir Hertz, Marco
  Liang, Victor Stone, Evan Palmer, Samira Daruki, Arijit Pramanik, Siim Põder, Austin Kyker,
  Mina Khan, Evgeny Sluzhaev, Marvin Ritter, Avraham Ruderman, Wenlei Zhou, Chirag Nagpal,
  Kiran Vodrahalli, George Necula, Paul Barham, Ellie Pavlick, Jay Hartford, Izhak Shafran, Long
  Zhao, Maciej Mikuła, Tom Eccles, Hidetoshi Shimokawa, Kanav Garg, Luke Vilnis, Hanwen Chen,
  Ilia Shumailov, Kuang-Huei Lee, Abdelrahman Abdelhamed, Meiyan Xie, Vered Cohen, Ester
  Hlavnova, Dan Malkin, Chawin Sitawarin, James Lottes, Pauline Coquinot, Tianli Yu, Sandeep
  Kumar, Jingwei Zhang, Aroma Mahendru, Zafarali Ahmed, James Martens, Tao Chen, Aviel
  Boag, Daiyi Peng, Coline Devin, Arseniy Klimovskiy, Mary Phuong, Danny Vainstein, Jin Xie,


                                                7
Preprint. Work in progress.




  Bhuvana Ramabhadran, Nathan Howard, Xinxin Yu, Gitartha Goswami, Jingyu Cui, Sam Shleifer,
  Mario Pinto, Chih-Kuan Yeh, Ming-Hsuan Yang, Sara Javanmardi, Dan Ethier, Chace Lee, Jordi
  Orbay, Suyog Kotecha, Carla Bromberg, Pete Shaw, James Thornton, Adi Gerzi Rosenthal, Shane
  Gu, Matt Thomas, Ian Gemp, Aditya Ayyar, Asahi Ushio, Aarush Selvan, Joel Wee, Chenxi Liu,
  Maryam Majzoubi, Weiren Yu, Jake Abernethy, Tyler Liechty, Renke Pan, Hoang Nguyen, Qiong,
  Hu, Sarah Perrin, Abhinav Arora, Emily Pitler, Weiyi Wang, Kaushik Shivakumar, Flavien Prost,
  Ben Limonchik, Jing Wang, Yi Gao, Timothee Cour, Shyamal Buch, Huan Gui, Maria Ivanova,
  Philipp Neubeck, Kelvin Chan, Lucy Kim, Huizhong Chen, Naman Goyal, Da-Woon Chung,
  Lu Liu, Yao Su, Anastasia Petrushkina, Jiajun Shen, Armand Joulin, Yuanzhong Xu, Stein Xudong
  Lin, Yana Kulizhskaya, Ciprian Chelba, Shobha Vasudevan, Eli Collins, Vasilisa Bashlovkina,
  Tony Lu, Doug Fritz, Jongbin Park, Yanqi Zhou, Chen Su, Richard Tanburn, Mikhail Sushkov,
  Mitchelle Rasquinha, Jinning Li, Jennifer Prendki, Yiming Li, Pallavi LV, Shriya Sharma, Hen
  Fitoussi, Hui Huang, Andrew Dai, Phuong Dao, Mike Burrows, Henry Prior, Danfeng Qin, Golan
  Pundak, Lars Lowe Sjoesund, Art Khurshudov, Zhenkai Zhu, Albert Webson, Elizabeth Kemp, Tat
  Tan, Saurabh Agrawal, Susie Sargsyan, Liqun Cheng, Jim Stephan, Tom Kwiatkowski, David Reid,
  Arunkumar Byravan, Assaf Hurwitz Michaely, Nicolas Heess, Luowei Zhou, Sonam Goenka, Viral
  Carpenter, Anselm Levskaya, Bo Wang, Reed Roberts, Rémi Leblond, Sharat Chikkerur, Stav
  Ginzburg, Max Chang, Robert Riachi, Chuqiao, Xu, Zalán Borsos, Michael Pliskin, Julia Pawar,
  Morgane Lustman, Hannah Kirkwood, Ankit Anand, Aditi Chaudhary, Norbert Kalb, Kieran
  Milan, Sean Augenstein, Anna Goldie, Laurel Prince, Karthik Raman, Yanhua Sun, Vivian Xia,
  Aaron Cohen, Zhouyuan Huo, Josh Camp, Seher Ellis, Lukas Zilka, David Vilar Torres, Lisa Patel,
  Sho Arora, Betty Chan, Jonas Adler, Kareem Ayoub, Jacky Liang, Fayaz Jamil, Jiepu Jiang, Simon
  Baumgartner, Haitian Sun, Yael Karov, Yaroslav Akulov, Hui Zheng, Irene Cai, Claudio Fantacci,
  James Rubin, Alex Rav Acha, Mengchao Wang, Nina D’Souza, Rohit Sathyanarayana, Shengyang
  Dai, Simon Rowe, Andrey Simanovsky, Omer Goldman, Yuheng Kuang, Xiaoyue Pan, Andrew
  Rosenberg, Tania Rojas-Esponda, Praneet Dutta, Amy Zeng, Irina Jurenka, Greg Farquhar, Yamini
  Bansal, Shariq Iqbal, Becca Roelofs, Ga-Young Joung, Parker Beak, Changwan Ryu, Ryan Poplin,
  Yan Wu, Jean-Baptiste Alayrac, Senaka Buthpitiya, Olaf Ronneberger, Caleb Habtegebriel, Wei Li,
  Paul Cavallaro, Aurora Wei, Guy Bensky, Timo Denk, Harish Ganapathy, Jeff Stanway, Pratik Joshi,
  Francesco Bertolini, Jessica Lo, Olivia Ma, Zachary Charles, Geta Sampemane, Himanshu Sahni,
  Xu Chen, Harry Askham, David Gaddy, Peter Young, Jiewen Tan, Matan Eyal, Arthur Bražinskas,
  Li Zhong, Zhichun Wu, Mark Epstein, Kai Bailey, Andrew Hard, Kamyu Lee, Sasha Goldshtein,
  Alex Ruiz, Mohammed Badawi, Matthias Lochbrunner, JK Kearns, Ashley Brown, Fabio Pardo,
  Theophane Weber, Haichuan Yang, Pan-Pan Jiang, Berkin Akin, Zhao Fu, Marcus Wainwright, Chi
  Zou, Meenu Gaba, Pierre-Antoine Manzagol, Wendy Kan, Yang Song, Karina Zainullina, Rui Lin,
  Jeongwoo Ko, Salil Deshmukh, Apoorv Jindal, James Svensson, Divya Tyam, Heri Zhao, Christine
  Kaeser-Chen, Scott Baird, Pooya Moradi, Jamie Hall, Qiuchen Guo, Vincent Tsang, Bowen Liang,
  Fernando Pereira, Suhas Ganesh, Ivan Korotkov, Jakub Adamek, Sridhar Thiagarajan, Vinh Tran,
  Charles Chen, Chris Tar, Sanil Jain, Ishita Dasgupta, Taylan Bilal, David Reitter, Kai Zhao, Giulia
  Vezzani, Yasmin Gehman, Pulkit Mehta, Lauren Beltrone, Xerxes Dotiwalla, Sergio Guadarrama,
  Zaheer Abbas, Stefani Karp, Petko Georgiev, Chun-Sung Ferng, Marc Brockschmidt, Liqian Peng,
  Christoph Hirnschall, Vikas Verma, Yingying Bi, Ying Xiao, Avigail Dabush, Kelvin Xu, Phil
  Wallis, Randall Parker, Qifei Wang, Yang Xu, Ilkin Safarli, Dinesh Tewari, Yin Zhang, Seungyeon
  Kim, Andrea Gesmundo, Mackenzie Thomas, Sergey Levi, Ahmed Chowdhury, Kanishka Rao,
  Peter Garst, Sam Conway-Rahman, Helen Ran, Kay McKinney, Zhisheng Xiao, Wenhao Yu,
  Rohan Agrawal, Axel Stjerngren, Catalin Ionescu, Jingjing Chen, Vivek Sharma, Justin Chiu, Fei
  Liu, Ken Franko, Clayton Sanford, Xingyu Cai, Paul Michel, Sanjay Ganapathy, Jane Labanowski,
  Zachary Garrett, Ben Vargas, Sean Sun, Bryan Gale, Thomas Buschmann, Guillaume Desjardins,
  Nimesh Ghelani, Palak Jain, Mudit Verma, Chulayuth Asawaroengchai, Julian Eisenschlos, Jitendra
  Harlalka, Hideto Kazawa, Don Metzler, Joshua Howland, Ying Jian, Jake Ades, Viral Shah, Tynan
  Gangwani, Seungji Lee, Roman Ring, Steven M. Hernandez, Dean Reich, Amer Sinha, Ashutosh
  Sathe, Joe Kovac, Ashleah Gill, Ajay Kannan, Andrea D’olimpio, Martin Sevenich, Jay Whang,
  Been Kim, Khe Chai Sim, Jilin Chen, Jiageng Zhang, Shuba Lall, Yossi Matias, Bill Jia, Abe
  Friesen, Sara Nasso, Ashish Thapliyal, Bryan Perozzi, Ting Yu, Anna Shekhawat, Safeen Huda,
  Peter Grabowski, Eric Wang, Ashwin Sreevatsa, Hilal Dib, Mehadi Hassen, Parker Schuh, Vedrana
  Milutinovic, Chris Welty, Michael Quinn, Ali Shah, Bangju Wang, Gabe Barth-Maron, Justin Frye,
  Natalie Axelsson, Tao Zhu, Yukun Ma, Irene Giannoumis, Hanie Sedghi, Chang Ye, Yi Luan,
  Kevin Aydin, Bilva Chandra, Vivek Sampathkumar, Ronny Huang, Victor Lavrenko, Ahmed
  Eleryan, Zhi Hong, Steven Hansen, Sara Mc Carthy, Bidisha Samanta, Domagoj Ćevid, Xin


                                                 8
Preprint. Work in progress.




  Wang, Fangtao Li, Michael Voznesensky, Matt Hoffman, Andreas Terzis, Vikash Sehwag, Gil
  Fidel, Luheng He, Mu Cai, Yanzhang He, Alex Feng, Martin Nikoltchev, Samrat Phatale, Jason
  Chase, Rory Lawton, Ming Zhang, Tom Ouyang, Manuel Tragut, Mehdi Hafezi Manshadi, Arjun
  Narayanan, Jiaming Shen, Xu Gao, Tolga Bolukbasi, Nick Roy, Xin Li, Daniel Golovin, Liviu
  Panait, Zhen Qin, Guangxing Han, Thomas Anthony, Sneha Kudugunta, Viorica Patraucean,
  Aniket Ray, Xinyun Chen, Xiaochen Yang, Tanuj Bhatia, Pranav Talluri, Alex Morris, Andrija
  Ražnatović, Bethanie Brownfield, James An, Sheng Peng, Patrick Kane, Ce Zheng, Nico Duduta,
  Joshua Kessinger, James Noraky, Siqi Liu, Keran Rong, Petar Veličković, Keith Rush, Alex Goldin,
  Fanny Wei, Shiva Mohan Reddy Garlapati, Caroline Pantofaru, Okwan Kwon, Jianmo Ni, Eric
  Noland, Julia Di Trapani, Françoise Beaufays, Abhijit Guha Roy, Yinlam Chow, Aybuke Turker,
  Geoffrey Cideron, Lantao Mei, Jon Clark, Qingyun Dou, Matko Bošnjak, Ralph Leith, Yuqing
  Du, Amir Yazdanbakhsh, Milad Nasr, Chester Kwak, Suraj Satishkumar Sheth, Alex Kaskasoli,
  Ankesh Anand, Balaji Lakshminarayanan, Sammy Jerome, David Bieber, Chun-Te Chu, Alexandre
  Senges, Tianxiao Shen, Mukund Sridhar, Ndaba Ndebele, Benjamin Beyret, Shakir Mohamed,
  Mia Chen, Markus Freitag, Jiaxian Guo, Luyang Liu, Paul Roit, Heng Chen, Shen Yan, Tom Stone,
  JD Co-Reyes, Jeremy Cole, Salvatore Scellato, Shekoofeh Azizi, Hadi Hashemi, Alicia Jin, Anand
  Iyer, Marcella Valentine, András György, Arun Ahuja, Daniel Hernandez Diaz, Chen-Yu Lee,
  Nathan Clement, Weize Kong, Drew Garmon, Ishaan Watts, Kush Bhatia, Khyatti Gupta, Matt
  Miecnikowski, Hugo Vallet, Ankur Taly, Edward Loper, Saket Joshi, James Atwood, Jo Chick,
  Mark Collier, Fotis Iliopoulos, Ryan Trostle, Beliz Gunel, Ramiro Leal-Cavazos, Arnar Mar
  Hrafnkelsson, Michael Guzman, Xiaoen Ju, Andy Forbes, Jesse Emond, Kushal Chauhan, Ben
  Caine, Li Xiao, Wenjun Zeng, Alexandre Moufarek, Daniel Murphy, Maya Meng, Nitish Gupta,
  Felix Riedel, Anil Das, Elijah Lawal, Shashi Narayan, Tiberiu Sosea, James Swirhun, Linda Friso,
  Behnam Neyshabur, Jing Lu, Sertan Girgin, Michael Wunder, Edouard Yvinec, Aroonalok Pyne,
  Victor Carbune, Shruti Rijhwani, Yang Guo, Tulsee Doshi, Anton Briukhov, Max Bain, Ayal
  Hitron, Xuanhui Wang, Ashish Gupta, Ke Chen, Cosmo Du, Weiyang Zhang, Dhruv Shah, Arjun
  Akula, Max Dylla, Ashyana Kachra, Weicheng Kuo, Tingting Zou, Lily Wang, Luyao Xu, Jifan
  Zhu, Justin Snyder, Sachit Menon, Orhan Firat, Igor Mordatch, Yuan Yuan, Natalia Ponomareva,
  Rory Blevins, Lawrence Moore, Weijun Wang, Phil Chen, Martin Scholz, Artur Dwornik, Jason
  Lin, Sicheng Li, Diego Antognini, Te I, Xiaodan Song, Matt Miller, Uday Kalra, Adam Raveret,
  Oscar Akerlund, Felix Wu, Andrew Nystrom, Namrata Godbole, Tianqi Liu, Hannah DeBalsi,
  Jewel Zhao, Buhuang Liu, Avi Caciularu, Lauren Lax, Urvashi Khandelwal, Victoria Langston,
  Eric Bailey, Silvio Lattanzi, Yufei Wang, Neel Kovelamudi, Sneha Mondal, Guru Guruganesh,
  Nan Hua, Ofir Roval, Paweł Wesołowski, Rishikesh Ingale, Jonathan Halcrow, Tim Sohn, Christof
  Angermueller, Bahram Raad, Eli Stickgold, Eva Lu, Alec Kosik, Jing Xie, Timothy Lillicrap,
  Austin Huang, Lydia Lihui Zhang, Dominik Paulus, Clement Farabet, Alex Wertheim, Bing Wang,
  Rishabh Joshi, Chu ling Ko, Yonghui Wu, Shubham Agrawal, Lily Lin, XiangHai Sheng, Peter
  Sung, Tyler Breland-King, Christina Butterfield, Swapnil Gawde, Sumeet Singh, Qiao Zhang, Raj
  Apte, Shilpa Shetty, Adrian Hutter, Tao Li, Elizabeth Salesky, Federico Lebron, Jonni Kanerva,
  Michela Paganini, Arthur Nguyen, Rohith Vallu, Jan-Thorsten Peter, Sarmishta Velury, David
  Kao, Jay Hoover, Anna Bortsova, Colton Bishop, Shoshana Jakobovits, Alessandro Agostini,
  Alekh Agarwal, Chang Liu, Charles Kwong, Sasan Tavakkol, Ioana Bica, Alex Greve, Anirudh GP,
  Jake Marcus, Le Hou, Tom Duerig, Rivka Moroshko, Dave Lacey, Andy Davis, Julien Amelot,
  Guohui Wang, Frank Kim, Theofilos Strinopoulos, Hui Wan, Charline Le Lan, Shankar Krishnan,
  Haotian Tang, Peter Humphreys, Junwen Bai, Idan Heimlich Shtacher, Diego Machado, Chenxi
  Pang, Ken Burke, Dangyi Liu, Renga Aravamudhan, Yue Song, Ed Hirst, Abhimanyu Singh,
  Brendan Jou, Liang Bai, Francesco Piccinno, Chuyuan Kelly Fu, Robin Alazard, Barak Meiri,
  Daniel Winter, Charlie Chen, Mingda Zhang, Jens Heitkaemper, John Lambert, Jinhyuk Lee,
  Alexander Frömmgen, Sergey Rogulenko, Pranav Nair, Paul Niemczyk, Anton Bulyenov, Bibo Xu,
  Hadar Shemtov, Morteza Zadimoghaddam, Serge Toropov, Mateo Wirth, Hanjun Dai, Sreenivas
  Gollapudi, Daniel Zheng, Alex Kurakin, Chansoo Lee, Kalesha Bullard, Nicolas Serrano, Ivana
  Balazevic, Yang Li, Johan Schalkwyk, Mark Murphy, Mingyang Zhang, Kevin Sequeira, Romina
  Datta, Nishant Agrawal, Charles Sutton, Nithya Attaluri, Mencher Chiang, Wael Farhan, Gregory
  Thornton, Kate Lin, Travis Choma, Hung Nguyen, Kingshuk Dasgupta, Dirk Robinson, Iulia
  Comşa, Michael Riley, Arjun Pillai, Basil Mustafa, Ben Golan, Amir Zandieh, Jean-Baptiste
  Lespiau, Billy Porter, David Ross, Sujeevan Rajayogam, Mohit Agarwal, Subhashini Venugopalan,
  Bobak Shahriari, Qiqi Yan, Hao Xu, Taylor Tobin, Pavel Dubov, Hongzhi Shi, Adrià Recasens,
  Anton Kovsharov, Sebastian Borgeaud, Lucio Dery, Shanthal Vasanth, Elena Gribovskaya, Linhai
  Qiu, Mahdis Mahdieh, Wojtek Skut, Elizabeth Nielsen, CJ Zheng, Adams Yu, Carrie Grimes


                                                 9
Preprint. Work in progress.




  Bostock, Shaleen Gupta, Aaron Archer, Chris Rawles, Elinor Davies, Alexey Svyatkovskiy, Tomy
  Tsai, Yoni Halpern, Christian Reisswig, Bartek Wydrowski, Bo Chang, Joan Puigcerver, Mor Hazan
  Taege, Jian Li, Eva Schnider, Xinjian Li, Dragos Dena, Yunhan Xu, Umesh Telang, Tianze Shi,
  Heiga Zen, Kyle Kastner, Yeongil Ko, Neesha Subramaniam, Aviral Kumar, Pete Blois, Zhuyun
  Dai, John Wieting, Yifeng Lu, Yoel Zeldes, Tian Xie, Anja Hauth, Alexandru Ţifrea, Yuqi Li, Sam
  El-Husseini, Dan Abolafia, Howard Zhou, Wen Ding, Sahra Ghalebikesabi, Carlos Guía, Andrii
  Maksai, Ágoston Weisz, Sercan Arik, Nick Sukhanov, Aga Świetlik, Xuhui Jia, Luo Yu, Weiyue
  Wang, Mark Brand, Dawn Bloxwich, Sean Kirmani, Zhe Chen, Alec Go, Pablo Sprechmann,
  Nithish Kannen, Alen Carin, Paramjit Sandhu, Isabel Edkins, Leslie Nooteboom, Jai Gupta, Loren
  Maggiore, Javad Azizi, Yael Pritch, Pengcheng Yin, Mansi Gupta, Danny Tarlow, Duncan Smith,
  Desi Ivanov, Mohammad Babaeizadeh, Ankita Goel, Satish Kambala, Grace Chu, Matej Kastelic,
  Michelle Liu, Hagen Soltau, Austin Stone, Shivani Agrawal, Min Kim, Kedar Soparkar, Srinivas
  Tadepalli, Oskar Bunyan, Rachel Soh, Arvind Kannan, DY Kim, Blake JianHang Chen, Afief
  Halumi, Sudeshna Roy, Yulong Wang, Olcan Sercinoglu, Gena Gibson, Sijal Bhatnagar, Motoki
  Sano, Daniel von Dincklage, Qingchun Ren, Blagoj Mitrevski, Mirek Olšák, Jennifer She, Carl
  Doersch, Jilei, Wang, Bingyuan Liu, Qijun Tan, Tamar Yakar, Tris Warkentin, Alex Ramirez,
  Carl Lebsack, Josh Dillon, Rajiv Mathews, Tom Cobley, Zelin Wu, Zhuoyuan Chen, Jon Simon,
  Swaroop Nath, Tara Sainath, Alexei Bendebury, Ryan Julian, Bharath Mankalale, Daria Ćurko,
  Paulo Zacchello, Adam R. Brown, Kiranbir Sodhia, Heidi Howard, Sergi Caelles, Abhinav Gupta,
  Gareth Evans, Anna Bulanova, Lesley Katzen, Roman Goldenberg, Anton Tsitsulin, Joe Stanton,
  Benoit Schillings, Vitaly Kovalev, Corey Fry, Rushin Shah, Kuo Lin, Shyam Upadhyay, Cheng
  Li, Soroush Radpour, Marcello Maggioni, Jing Xiong, Lukas Haas, Jenny Brennan, Aishwarya
  Kamath, Nikolay Savinov, Arsha Nagrani, Trevor Yacovone, Ryan Kappedal, Kostas Andriopoulos,
  Li Lao, YaGuang Li, Grigory Rozhdestvenskiy, Kazuma Hashimoto, Andrew Audibert, Sophia
  Austin, Daniel Rodriguez, Anian Ruoss, Garrett Honke, Deep Karkhanis, Xi Xiong, Qing Wei,
  James Huang, Zhaoqi Leng, Vittal Premachandran, Stan Bileschi, Georgios Evangelopoulos,
  Thomas Mensink, Jay Pavagadhi, Denis Teplyashin, Paul Chang, Linting Xue, Garrett Tanzer,
  Sally Goldman, Kaushal Patel, Shixin Li, Jeremy Wiesner, Ivy Zheng, Ian Stewart-Binks, Jie
  Han, Zhi Li, Liangchen Luo, Karel Lenc, Mario Lučić, Fuzhao Xue, Ryan Mullins, Alexey
  Guseynov, Chung-Ching Chang, Isaac Galatzer-Levy, Adam Zhang, Garrett Bingham, Grace Hu,
  Ale Hartman, Yue Ma, Jordan Griffith, Alex Irpan, Carey Radebaugh, Summer Yue, Lijie Fan,
  Victor Ungureanu, Christina Sorokin, Hannah Teufel, Peiran Li, Rohan Anil, Dimitris Paparas,
  Todd Wang, Chu-Cheng Lin, Hui Peng, Megan Shum, Goran Petrovic, Demetra Brady, Richard
  Nguyen, Klaus Macherey, Zhihao Li, Harman Singh, Madhavi Yenugula, Mariko Iinuma, Xinyi
  Chen, Kavya Kopparapu, Alexey Stern, Shachi Dave, Chandu Thekkath, Florence Perot, Anurag
  Kumar, Fangda Li, Yang Xiao, Matthew Bilotti, Mohammad Hossein Bateni, Isaac Noble, Lisa Lee,
  Amelio Vázquez-Reina, Julian Salazar, Xiaomeng Yang, Boyu Wang, Ela Gruzewska, Anand Rao,
  Sindhu Raghuram, Zheng Xu, Eyal Ben-David, Jieru Mei, Sid Dalmia, Zhaoyi Zhang, Yuchen Liu,
  Gagan Bansal, Helena Pankov, Steven Schwarcz, Andrea Burns, Christine Chan, Sumit Sanghai,
  Ricky Liang, Ethan Liang, Antoine He, Amy Stuart, Arun Narayanan, Yukun Zhu, Christian Frank,
  Bahar Fatemi, Amit Sabne, Oran Lang, Indro Bhattacharya, Shane Settle, Maria Wang, Brendan
  McMahan, Andrea Tacchetti, Livio Baldini Soares, Majid Hadian, Serkan Cabi, Timothy Chung,
  Nikita Putikhin, Gang Li, Jeremy Chen, Austin Tarango, Henryk Michalewski, Mehran Kazemi,
  Hussain Masoom, Hila Sheftel, Rakesh Shivanna, Archita Vadali, Ramona Comanescu, Doug Reid,
  Joss Moore, Arvind Neelakantan, Michaël Sander, Jonathan Herzig, Aviv Rosenberg, Mostafa
  Dehghani, JD Choi, Michael Fink, Reid Hayes, Eric Ge, Shitao Weng, Chia-Hua Ho, John Karro,
  Kalpesh Krishna, Lam Nguyen Thiet, Amy Skerry-Ryan, Daniel Eppens, Marco Andreetto, Navin
  Sarma, Silvano Bonacina, Burcu Karagol Ayan, Megha Nawhal, Zhihao Shan, Mike Dusenberry,
  Shantanu Thakoor, Sagar Gubbi, Duc Dung Nguyen, Reut Tsarfaty, Samuel Albanie, Jovana
  Mitrović, Meet Gandhi, Bo-Juen Chen, Alessandro Epasto, Georgi Stephanov, Ye Jin, Samuel
  Gehman, Aida Amini, Jack Weber, Feryal Behbahani, Shawn Xu, Miltos Allamanis, Xi Chen,
  Myle Ott, Claire Sha, Michal Jastrzebski, Hang Qi, David Greene, Xinyi Wu, Abodunrinwa Toki,
  Daniel Vlasic, Jane Shapiro, Ragha Kotikalapudi, Zhe Shen, Takaaki Saeki, Sirui Xie, Albin
  Cassirer, Shikhar Bharadwaj, Tatsuya Kiyono, Srinadh Bhojanapalli, Elan Rosenfeld, Sam Ritter,
  Jieming Mao, João Gabriel Oliveira, Zoltan Egyed, Bernd Bandemer, Emilio Parisotto, Keisuke
  Kinoshita, Juliette Pluto, Petros Maniatis, Steve Li, Yaohui Guo, Golnaz Ghiasi, Jean Tarbouriech,
  Srimon Chatterjee, Julie Jin, Katrina, Xu, Jennimaria Palomaki, Séb Arnold, Madhavi Sewak,
  Federico Piccinini, Mohit Sharma, Ben Albrecht, Sean Purser-haskell, Ashwin Vaswani, Chongyan
  Chen, Matheus Wisniewski, Qin Cao, John Aslanides, Nguyet Minh Phu, Maximilian Sieb, Lauren


                                                10
Preprint. Work in progress.




  Agubuzu, Anne Zheng, Daniel Sohn, Marco Selvi, Anders Andreassen, Krishan Subudhi, Prem
  Eruvbetine, Oliver Woodman, Tomas Mery, Sebastian Krause, Xiaoqi Ren, Xiao Ma, Jincheng Luo,
  Dawn Chen, Wei Fan, Henry Griffiths, Christian Schuler, Alice Li, Shujian Zhang, Jean-Michel
  Sarr, Shixin Luo, Riccardo Patana, Matthew Watson, Dani Naboulsi, Michael Collins, Sailesh
  Sidhwani, Emiel Hoogeboom, Sharon Silver, Emily Caveness, Xiaokai Zhao, Mikel Rodriguez,
  Maxine Deines, Libin Bai, Patrick Griffin, Marco Tagliasacchi, Emily Xue, Spandana Raj Babbula,
  Bo Pang, Nan Ding, Gloria Shen, Elijah Peake, Remi Crocker, Shubha Srinivas Raghvendra, Danny
  Swisher, Woohyun Han, Richa Singh, Ling Wu, Vladimir Pchelin, Tsendsuren Munkhdalai, Dana
  Alon, Geoff Bacon, Efren Robles, Jannis Bulian, Melvin Johnson, George Powell, Felipe Tiengo
  Ferreira, Yaoyiran Li, Frederik Benzing, Mihajlo Velimirović, Hubert Soyer, William Kong, Tony,
  Nguyên, Zhen Yang, Jeremiah Liu, Joost van Amersfoort, Daniel Gillick, Baochen Sun, Nathalie
  Rauschmayr, Katie Zhang, Serena Zhan, Tao Zhou, Alexey Frolov, Chengrun Yang, Denis Vnukov,
  Louis Rouillard, Hongji Li, Amol Mandhane, Nova Fallen, Rajesh Venkataraman, Clara Huiyi
  Hu, Jennifer Brennan, Jenny Lee, Jerry Chang, Martin Sundermeyer, Zhufeng Pan, Rosemary
  Ke, Simon Tong, Alex Fabrikant, William Bono, Jindong Gu, Ryan Foley, Yiran Mao, Manolis
  Delakis, Dhruva Bhaswar, Roy Frostig, Nick Li, Avital Zipori, Cath Hope, Olga Kozlova, Swaroop
  Mishra, Josip Djolonga, Craig Schiff, Majd Al Merey, Eleftheria Briakou, Peter Morgan, Andy
  Wan, Avinatan Hassidim, RJ Skerry-Ryan, Kuntal Sengupta, Mary Jasarevic, Praveen Kallakuri,
  Paige Kunkle, Hannah Brennan, Tom Lieber, Hassan Mansoor, Julian Walker, Bing Zhang, Annie
  Xie, Goran Žužić, Adaeze Chukwuka, Alex Druinsky, Donghyun Cho, Rui Yao, Ferjad Naeem,
  Shiraz Butt, Eunyoung Kim, Zhipeng Jia, Mandy Jordan, Adam Lelkes, Mark Kurzeja, Sophie
  Wang, James Zhao, Andrew Over, Abhishek Chakladar, Marcel Prasetya, Neha Jha, Sriram
  Ganapathy, Yale Cong, Prakash Shroff, Carl Saroufim, Sobhan Miryoosefi, Mohamed Hammad,
  Tajwar Nasir, Weijuan Xi, Yang Gao, Young Maeng, Ben Hora, Chin-Yi Cheng, Parisa Haghani,
  Yoad Lewenberg, Caden Lu, Martin Matysiak, Naina Raisinghani, Huiyu Wang, Lexi Baugher,
  Rahul Sukthankar, Minh Giang, John Schultz, Noah Fiedel, Minmin Chen, Cheng-Chun Lee,
  Tapomay Dey, Hao Zheng, Shachi Paul, Celine Smith, Andy Ly, Yicheng Wang, Rishabh Bansal,
  Bartek Perz, Susanna Ricco, Stasha Blank, Vaishakh Keshava, Deepak Sharma, Marvin Chow,
  Kunal Lad, Komal Jalan, Simon Osindero, Craig Swanson, Jacob Scott, Anastasija Ilić, Xiaowei
  Li, Siddhartha Reddy Jonnalagadda, Afzal Shama Soudagar, Yan Xiong, Bat-Orgil Batsaikhan,
  Daniel Jarrett, Naveen Kumar, Maulik Shah, Matt Lawlor, Austin Waters, Mark Graham, Rhys
  May, Sabela Ramos, Sandra Lefdal, Zeynep Cankara, Nacho Cano, Brendan O’Donoghue, Jed
  Borovik, Frederick Liu, Jordan Grimstad, Mahmoud Alnahlawi, Katerina Tsihlas, Tom Hudson,
  Nikolai Grigorev, Yiling Jia, Terry Huang, Tobenna Peter Igwe, Sergei Lebedev, Xiaodan Tang,
  Igor Krivokon, Frankie Garcia, Melissa Tan, Eric Jia, Peter Stys, Shikhar Vashishth, Yu Liang,
  Balaji Venkatraman, Chenjie Gu, Anastasios Kementsietsidis, Chen Zhu, Junehyuk Jung, Yunfei
  Bai, Mohammad Javad Hosseini, Faruk Ahmed, Aditya Gupta, Xin Yuan, Shereen Ashraf, Shitij
  Nigam, Gautam Vasudevan, Pranjal Awasthi, Adi Mayrav Gilady, Zelda Mariet, Ramy Eskander,
  Haiguang Li, Hexiang Hu, Guillermo Garrido, Philippe Schlattner, George Zhang, Rohun Saxena,
  Petar Dević, Kritika Muralidharan, Ashwin Murthy, Yiqian Zhou, Min Choi, Arissa Wongpanich,
  Zhengdong Wang, Premal Shah, Yuntao Xu, Yiling Huang, Stephen Spencer, Alice Chen, James
  Cohan, Junjie Wang, Jonathan Tompson, Junru Wu, Ruba Haroun, Haiqiong Li, Blanca Huergo,
  Fan Yang, Tongxin Yin, James Wendt, Michael Bendersky, Rahma Chaabouni, Javier Snaider,
  Johan Ferret, Abhishek Jindal, Tara Thompson, Andrew Xue, Will Bishop, Shubham Milind Phal,
  Archit Sharma, Yunhsuan Sung, Prabakar Radhakrishnan, Mo Shomrat, Reeve Ingle, Roopali Vij,
  Justin Gilmer, Mihai Dorin Istin, Sam Sobell, Yang Lu, Emily Nottage, Dorsa Sadigh, Jeremiah
  Willcock, Tingnan Zhang, Steve Xu, Sasha Brown, Katherine Lee, Gary Wang, Yun Zhu, Yi Tay,
  Cheolmin Kim, Audrey Gutierrez, Abhanshu Sharma, Yongqin Xian, Sungyong Seo, Claire Cui,
  Elena Pochernina, Cip Baetu, Krzysztof Jastrz˛ebski, Mimi Ly, Mohamed Elhawaty, Dan Suh,
  Eren Sezener, Pidong Wang, Nancy Yuen, George Tucker, Jiahao Cai, Zuguang Yang, Cindy
  Wang, Alex Muzio, Hai Qian, Jae Yoo, Derek Lockhart, Kevin R. McKee, Mandy Guo, Malika
  Mehrotra, Artur Mendonça, Sanket Vaibhav Mehta, Sherry Ben, Chetan Tekur, Jiaqi Mu, Muye
  Zhu, Victoria Krakovna, Hongrae Lee, AJ Maschinot, Sébastien Cevey, HyunJeong Choe, Aijun
  Bai, Hansa Srinivasan, Derek Gasaway, Nick Young, Patrick Siegler, Dan Holtmann-Rice, Vihari
  Piratla, Kate Baumli, Roey Yogev, Alex Hofer, Hado van Hasselt, Svetlana Grant, Yuri Chervonyi,
  David Silver, Andrew Hogue, Ayushi Agarwal, Kathie Wang, Preeti Singh, Four Flynn, Josh
  Lipschultz, Robert David, Lizzetth Bellot, Yao-Yuan Yang, Long Le, Filippo Graziano, Kate
  Olszewska, Kevin Hui, Akanksha Maurya, Nikos Parotsidis, Weijie Chen, Tayo Oguntebi, Joe
  Kelley, Anirudh Baddepudi, Johannes Mauerer, Gregory Shaw, Alex Siegman, Lin Yang, Shravya


                                               11
Preprint. Work in progress.




  Shetty, Subhrajit Roy, Yunting Song, Wojciech Stokowiec, Ryan Burnell, Omkar Savant, Robert
  Busa-Fekete, Jin Miao, Samrat Ghosh, Liam MacDermed, Phillip Lippe, Mikhail Dektiarev, Zach
  Behrman, Fabian Mentzer, Kelvin Nguyen, Meng Wei, Siddharth Verma, Chris Knutsen, Sudeep
  Dasari, Zhipeng Yan, Petr Mitrichev, Xingyu Wang, Virat Shejwalkar, Jacob Austin, Srinivas
  Sunkara, Navneet Potti, Yan Virin, Christian Wright, Gaël Liu, Oriana Riva, Etienne Pot, Greg
  Kochanski, Quoc Le, Gargi Balasubramaniam, Arka Dhar, Yuguo Liao, Adam Bloniarz, Divyansh
  Shukla, Elizabeth Cole, Jong Lee, Sheng Zhang, Sushant Kafle, Siddharth Vashishtha, Parsa
  Mahmoudieh, Grace Chen, Raphael Hoffmann, Pranesh Srinivasan, Agustin Dal Lago, Yoav Ben
  Shalom, Zi Wang, Michael Elabd, Anuj Sharma, Junhyuk Oh, Suraj Kothawade, Maigo Le,
  Marianne Monteiro, Shentao Yang, Kaiz Alarakyia, Robert Geirhos, Diana Mincu, Håvard Garnes,
  Hayato Kobayashi, Soroosh Mariooryad, Kacper Krasowiak, Zhixin, Lai, Shibl Mourad, Mingqiu
  Wang, Fan Bu, Ophir Aharoni, Guanjie Chen, Abhimanyu Goyal, Vadim Zubov, Ankur Bapna,
  Elahe Dabir, Nisarg Kothari, Kay Lamerigts, Nicola De Cao, Jeremy Shar, Christopher Yew, Nitish
  Kulkarni, Dre Mahaarachchi, Mandar Joshi, Zhenhai Zhu, Jared Lichtarge, Yichao Zhou, Hannah
  Muckenhirn, Vittorio Selo, Oriol Vinyals, Peter Chen, Anthony Brohan, Vaibhav Mehta, Sarah
  Cogan, Ruth Wang, Ty Geri, Wei-Jen Ko, Wei Chen, Fabio Viola, Keshav Shivam, Lisa Wang,
  Madeleine Clare Elish, Raluca Ada Popa, Sébastien Pereira, Jianqiao Liu, Raphael Koster, Donnie
  Kim, Gufeng Zhang, Sayna Ebrahimi, Partha Talukdar, Yanyan Zheng, Petra Poklukar, Ales
  Mikhalap, Dale Johnson, Anitha Vijayakumar, Mark Omernick, Matt Dibb, Ayush Dubey, Qiong
  Hu, Apurv Suman, Vaibhav Aggarwal, Ilya Kornakov, Fei Xia, Wing Lowe, Alexey Kolganov,
  Ted Xiao, Vitaly Nikolaev, Steven Hemingray, Bonnie Li, Joana Iljazi, Mikołaj Rybiński, Ballie
  Sandhu, Peggy Lu, Thang Luong, Rodolphe Jenatton, Vineetha Govindaraj, Hui, Li, Gabriel
  Dulac-Arnold, Wonpyo Park, Henry Wang, Abhinit Modi, Jean Pouget-Abadie, Kristina Greller,
  Rahul Gupta, Robert Berry, Prajit Ramachandran, Jinyu Xie, Liam McCafferty, Jianling Wang,
  Kilol Gupta, Hyeontaek Lim, Blaž Bratanič, Andy Brock, Ilia Akolzin, Jim Sproch, Dan Karliner,
  Duhyeon Kim, Adrian Goedeckemeyer, Noam Shazeer, Cordelia Schmid, Daniele Calandriello,
  Parul Bhatia, Krzysztof Choromanski, Ceslee Montgomery, Dheeru Dua, Ana Ramalho, Helen
  King, Yue Gao, Lynn Nguyen, David Lindner, Divya Pitta, Oleaser Johnson, Khalid Salama, Diego
  Ardila, Michael Han, Erin Farnese, Seth Odoom, Ziyue Wang, Xiangzhuo Ding, Norman Rink,
  Ray Smith, Harshal Tushar Lehri, Eden Cohen, Neera Vats, Tong He, Parthasarathy Gopavarapu,
  Adam Paszke, Miteyan Patel, Wouter Van Gansbeke, Lucia Loher, Luis Castro, Maria Voitovich,
  Tamara von Glehn, Nelson George, Simon Niklaus, Zach Eaton-Rosen, Nemanja Rakićević,
  Erik Jue, Sagi Perel, Carrie Zhang, Yuval Bahat, Angéline Pouget, Zhi Xing, Fantine Huot,
  Ashish Shenoy, Taylor Bos, Vincent Coriou, Bryan Richter, Natasha Noy, Yaqing Wang, Santiago
  Ontanon, Siyang Qin, Gleb Makarchuk, Demis Hassabis, Zhuowan Li, Mandar Sharma, Kumaran
  Venkatesan, Iurii Kemaev, Roxanne Daniel, Shiyu Huang, Saloni Shah, Octavio Ponce, Warren,
  Chen, Manaal Faruqui, Jialin Wu, Slavica Andačić, Szabolcs Payrits, Daniel McDuff, Tom Hume,
  Yuan Cao, MH Tessler, Qingze Wang, Yinan Wang, Ivor Rendulic, Eirikur Agustsson, Matthew
  Johnson, Tanya Lando, Andrew Howard, Sri Gayatri Sundara Padmanabhan, Mayank Daswani,
  Andrea Banino, Michael Kilgore, Jonathan Heek, Ziwei Ji, Alvaro Caceres, Conglong Li, Nora
  Kassner, Alexey Vlaskin, Zeyu Liu, Alex Grills, Yanhan Hou, Roykrong Sukkerd, Gowoon Cheon,
  Nishita Shetty, Larisa Markeeva, Piotr Stanczyk, Tejas Iyer, Yuan Gong, Shawn Gao, Keerthana
  Gopalakrishnan, Tim Blyth, Malcolm Reynolds, Avishkar Bhoopchand, Misha Bilenko, Dero
  Gharibian, Vicky Zayats, Aleksandra Faust, Abhinav Singh, Min Ma, Hongyang Jiao, Sudheendra
  Vijayanarasimhan, Lora Aroyo, Vikas Yadav, Sarah Chakera, Ashwin Kakarla, Vilobh Meshram,
  Karol Gregor, Gabriela Botea, Evan Senter, Dawei Jia, Geza Kovacs, Neha Sharma, Sebastien
  Baur, Kai Kang, Yifan He, Lin Zhuo, Marija Kostelac, Itay Laish, Songyou Peng, Louis O’Bryan,
  Daniel Kasenberg, Girish Ramchandra Rao, Edouard Leurent, Biao Zhang, Sage Stevens, Ana
  Salazar, Ye Zhang, Ivan Lobov, Jake Walker, Allen Porter, Morgan Redshaw, Han Ke, Abhishek
  Rao, Alex Lee, Hoi Lam, Michael Moffitt, Jaeyoun Kim, Siyuan Qiao, Terry Koo, Robert Dadashi,
  Xinying Song, Mukund Sundararajan, Peng Xu, Chizu Kawamoto, Yan Zhong, Clara Barbu,
  Apoorv Reddy, Mauro Verzetti, Leon Li, George Papamakarios, Hanna Klimczak-Plucińska, Mary
  Cassin, Koray Kavukcuoglu, Rigel Swavely, Alain Vaucher, Jeffrey Zhao, Ross Hemsley, Michael
  Tschannen, Heming Ge, Gaurav Menghani, Yang Yu, Natalie Ha, Wei He, Xiao Wu, Maggie
  Song, Rachel Sterneck, Stefan Zinke, Dan A. Calian, Annie Marsden, Alejandro Cruzado Ruiz,
  Matteo Hessel, Almog Gueta, Benjamin Lee, Brian Farris, Manish Gupta, Yunjie Li, Mohammad
  Saleh, Vedant Misra, Kefan Xiao, Piermaria Mendolicchio, Gavin Buttimore, Varvara Krayvanova,
  Nigamaa Nayakanti, Matthew Wiethoff, Yash Pande, Azalia Mirhoseini, Ni Lao, Jasmine Liu,
  Yiqing Hua, Angie Chen, Yury Malkov, Dmitry Kalashnikov, Shubham Gupta, Kartik Audhkhasi,


                                              12
Preprint. Work in progress.




  Yuexiang Zhai, Sudhindra Kopalle, Prateek Jain, Eran Ofek, Clemens Meyer, Khuslen Baatarsukh,
  Hana Strejček, Jun Qian, James Freedman, Ricardo Figueira, Michal Sokolik, Olivier Bachem,
  Raymond Lin, Dia Kharrat, Chris Hidey, Pingmei Xu, Dennis Duan, Yin Li, Muge Ersoy, Richard
  Everett, Kevin Cen, Rebeca Santamaria-Fernandez, Amir Taubenfeld, Ian Mackinnon, Linda
  Deng, Polina Zablotskaia, Shashank Viswanadha, Shivanker Goel, Damion Yates, Yunxiao Deng,
  Peter Choy, Mingqing Chen, Abhishek Sinha, Alex Mossin, Yiming Wang, Arthur Szlam, Susan
  Hao, Paul Kishan Rubenstein, Metin Toksoz-Exley, Miranda Aperghis, Yin Zhong, Junwhan Ahn,
  Michael Isard, Olivier Lacombe, Florian Luisier, Chrysovalantis Anastasiou, Yogesh Kalley, Utsav
  Prabhu, Emma Dunleavy, Shaan Bijwadia, Justin Mao-Jones, Kelly Chen, Rama Pasumarthi,
  Emily Wood, Adil Dostmohamed, Nate Hurley, Jiri Simsa, Alicia Parrish, Mantas Pajarskas,
  Matt Harvey, Ondrej Skopek, Yony Kochinski, Javier Rey, Verena Rieser, Denny Zhou, Sun Jae
  Lee, Trilok Acharya, Guowang Li, Joe Jiang, Xiaofan Zhang, Bryant Gipson, Ethan Mahintorabi,
  Marco Gelmi, Nima Khajehnouri, Angel Yeh, Kayi Lee, Loic Matthey, Leslie Baker, Trang
  Pham, Han Fu, Alex Pak, Prakhar Gupta, Cristina Vasconcelos, Adam Sadovsky, Brian Walker,
  Sissie Hsiao, Patrik Zochbauer, Andreea Marzoca, Noam Velan, Junhao Zeng, Gilles Baechler,
  Danny Driess, Divya Jain, Yanping Huang, Lizzie Tao, John Maggs, Nir Levine, Jon Schneider,
  Erika Gemzer, Samuel Petit, Shan Han, Zach Fisher, Dustin Zelle, Courtney Biles, Eugene Ie,
  Asya Fadeeva, Casper Liu, Juliana Vicente Franco, Adrian Collister, Hao Zhang, Renshen Wang,
  Ruizhe Zhao, Leandro Kieliger, Kurt Shuster, Rui Zhu, Boqing Gong, Lawrence Chan, Ruoxi
  Sun, Sujoy Basu, Roland Zimmermann, Jamie Hayes, Abhishek Bapna, Jasper Snoek, Weel Yang,
  Puranjay Datta, Jad Al Abdallah, Kevin Kilgour, Lu Li, SQ Mah, Yennie Jun, Morgane Rivière,
  Abhijit Karmarkar, Tammo Spalink, Tao Huang, Lucas Gonzalez, Duc-Hieu Tran, Averi Nowak,
  John Palowitch, Martin Chadwick, Ellie Talius, Harsh Mehta, Thibault Sellam, Philipp Fränken,
  Massimo Nicosia, Kyle He, Aditya Kini, David Amos, Sugato Basu, Harrison Jobe, Eleni Shaw,
  Qiantong Xu, Colin Evans, Daisuke Ikeda, Chaochao Yan, Larry Jin, Lun Wang, Sachin Yadav,
  Ilia Labzovsky, Ramesh Sampath, Ada Ma, Candice Schumann, Aditya Siddhant, Rohin Shah,
  John Youssef, Rishabh Agarwal, Natalie Dabney, Alessio Tonioni, Moran Ambar, Jing Li, Isabelle
  Guyon, Benny Li, David Soergel, Boya Fang, Georgi Karadzhov, Cristian Udrescu, Trieu Trinh,
  Vikas Raunak, Seb Noury, Dee Guo, Sonal Gupta, Mara Finkelstein, Denis Petek, Lihao Liang,
  Greg Billock, Pei Sun, David Wood, Yiwen Song, Xiaobin Yu, Tatiana Matejovicova, Regev Cohen,
  Kalyan Andra, David D’Ambrosio, Zhiwei Deng, Vincent Nallatamby, Ebrahim Songhori, Rumen
  Dangovski, Andrew Lampinen, Pankil Botadra, Adam Hillier, Jiawei Cao, Nagabhushan Baddi,
  Adhi Kuncoro, Toshihiro Yoshino, Ankit Bhagatwala, Marcáurelio Ranzato, Rylan Schaeffer,
  Tianlin Liu, Shuai Ye, Obaid Sarvana, John Nham, Chenkai Kuang, Isabel Gao, Jinoo Baek,
  Shubham Mittal, Ayzaan Wahid, Anita Gergely, Bin Ni, Josh Feldman, Carrie Muir, Pascal
  Lamblin, Wolfgang Macherey, Ethan Dyer, Logan Kilpatrick, Víctor Campos, Mukul Bhutani,
  Stanislav Fort, Yanif Ahmad, Aliaksei Severyn, Kleopatra Chatziprimou, Oleksandr Ferludin,
  Mason Dimarco, Aditya Kusupati, Joe Heyward, Dan Bahir, Kevin Villela, Katie Millican, Dror
  Marcus, Sanaz Bahargam, Caglar Unlu, Nicholas Roth, Zichuan Wei, Siddharth Gopal, Deepanway
  Ghoshal, Edward Lee, Sharon Lin, Jennie Lees, Dayeong Lee, Anahita Hosseini, Connie Fan, Seth
  Neel, Marcus Wu, Yasemin Altun, Honglong Cai, Enrique Piqueras, Josh Woodward, Alessandro
  Bissacco, Salem Haykal, Mahyar Bordbar, Prasha Sundaram, Sarah Hodkinson, Daniel Toyama,
  George Polovets, Austin Myers, Anu Sinha, Tomer Levinboim, Kashyap Krishnakumar, Rachita
  Chhaparia, Tatiana Sholokhova, Nitesh Bharadwaj Gundavarapu, Ganesh Jawahar, Haroon Qureshi,
  Jieru Hu, Nikola Momchev, Matthew Rahtz, Renjie Wu, Aishwarya P S, Kedar Dhamdhere, Meiqi
  Guo, Umang Gupta, Ali Eslami, Mariano Schain, Michiel Blokzijl, David Welling, Dave Orr,
  Levent Bolelli, Nicolas Perez-Nieves, Mikhail Sirotenko, Aman Prasad, Arjun Kar, Borja De Balle
  Pigem, Tayfun Terzi, Gellért Weisz, Dipankar Ghosh, Aditi Mavalankar, Dhruv Madeka, Kaspar
  Daugaard, Hartwig Adam, Viraj Shah, Dana Berman, Maggie Tran, Steven Baker, Ewa Andrejczuk,
  Grishma Chole, Ganna Raboshchuk, Mahdi Mirzazadeh, Thais Kagohara, Shimu Wu, Christian
  Schallhart, Bernett Orlando, Chen Wang, Alban Rrustemi, Hao Xiong, Hao Liu, Arpi Vezer, Nolan
  Ramsden, Shuo yiin Chang, Sidharth Mudgal, Yan Li, Nino Vieillard, Yedid Hoshen, Farooq
  Ahmad, Ambrose Slone, Amy Hua, Natan Potikha, Mirko Rossini, Jon Stritar, Sushant Prakash,
  Zifeng Wang, Xuanyi Dong, Alireza Nazari, Efrat Nehoran, Kaan Tekelioglu, Yinxiao Li, Kartikeya
  Badola, Tom Funkhouser, Yuanzhen Li, Varun Yerram, Ramya Ganeshan, Daniel Formoso, Karol
  Langner, Tian Shi, Huijian Li, Yumeya Yamamori, Amayika Panda, Alaa Saade, Angelo Scorza
  Scarpati, Chris Breaux, CJ Carey, Zongwei Zhou, Cho-Jui Hsieh, Sophie Bridgers, Alena Butryna,
  Nishesh Gupta, Vaibhav Tulsyan, Sanghyun Woo, Evgenii Eltyshev, Will Grathwohl, Chanel
  Parks, Seth Benjamin, Rina Panigrahy, Shenil Dodhia, Daniel De Freitas, Chris Sauer, Will Song,


                                               13
Preprint. Work in progress.




  Ferran Alet, Jackson Tolins, Cosmin Paduraru, Xingyi Zhou, Brian Albert, Zizhao Zhang, Lei
  Shu, Mudit Bansal, Sarah Nguyen, Amir Globerson, Owen Xiao, James Manyika, Tom Hennigan,
  Rong Rong, Josip Matak, Anton Bakalov, Ankur Sharma, Danila Sinopalnikov, Andrew Pierson,
  Stephen Roller, Geoff Brown, Mingcen Gao, Toshiyuki Fukuzawa, Amin Ghafouri, Kenny Vassigh,
  Iain Barr, Zhicheng Wang, Anna Korsun, Rajesh Jayaram, Lijie Ren, Tim Zaman, Samira Khan,
  Yana Lunts, Dan Deutsch, Dave Uthus, Nitzan Katz, Masha Samsikova, Amr Khalifa, Nikhil
  Sethi, Jiao Sun, Luming Tang, Uri Alon, Xianghong Luo, Dian Yu, Abhishek Nayyar, Bryce
  Petrini, Will Truong, Vincent Hellendoorn, Nikolai Chinaev, Chris Alberti, Wei Wang, Jingcao Hu,
  Vahab Mirrokni, Ananth Balashankar, Avia Aharon, Aahil Mehta, Ahmet Iscen, Joseph Kready,
  Lucas Manning, Anhad Mohananey, Yuankai Chen, Anshuman Tripathi, Allen Wu, Igor Petrovski,
  Dawsen Hwang, Martin Baeuml, Shreyas Chandrakaladharan, Yuan Liu, Rey Coaguila, Maxwell
  Chen, Sally Ma, Pouya Tafti, Susheel Tatineni, Terry Spitz, Jiayu Ye, Paul Vicol, Mihaela Rosca,
  Adrià Puigdomènech, Zohar Yahav, Sanjay Ghemawat, Hanzhao Lin, Phoebe Kirk, Zaid Nabulsi,
  Sergey Brin, Bernd Bohnet, Ken Caluwaerts, Aditya Srikanth Veerubhotla, Dan Zheng, Zihang
  Dai, Petre Petrov, Yichong Xu, Ramin Mehran, Zhuo Xu, Luisa Zintgraf, Jiho Choi, Spurthi Amba
  Hombaiah, Romal Thoppilan, Sashank Reddi, Lukasz Lew, Li Li, Kellie Webster, KP Sawhney,
  Lampros Lamprou, Siamak Shakeri, Mayank Lunayach, Jianmin Chen, Sumit Bagri, Alex Salcianu,
  Ying Chen, Yani Donchev, Charlotte Magister, Signe Nørly, Vitor Rodrigues, Tomas Izo, Hila
  Noga, Joe Zou, Thomas Köppe, Wenxuan Zhou, Kenton Lee, Xiangzhu Long, Danielle Eisenbud,
  Anthony Chen, Connor Schenck, Chi Ming To, Peilin Zhong, Emanuel Taropa, Minh Truong, Omer
  Levy, Danilo Martins, Zhiyuan Zhang, Christopher Semturs, Kelvin Zhang, Alex Yakubovich, Pol
  Moreno, Lara McConnaughey, Di Lu, Sam Redmond, Lotte Weerts, Yonatan Bitton, Tiziana Refice,
  Nicolas Lacasse, Arthur Conmy, Corentin Tallec, Julian Odell, Hannah Forbes-Pollard, Arkadiusz
  Socala, Jonathan Hoech, Pushmeet Kohli, Alanna Walton, Rui Wang, Mikita Sazanovich, Kexin
  Zhu, Andrei Kapishnikov, Rich Galt, Matthew Denton, Ben Murdoch, Caitlin Sikora, Kareem
  Mohamed, Wei Wei, Uri First, Tim McConnell, Luis C. Cobo, James Qin, Thi Avrahami, Daniel
  Balle, Yu Watanabe, Annie Louis, Adam Kraft, Setareh Ariafar, Yiming Gu, Eugénie Rives, Charles
  Yoon, Andrei Rusu, James Cobon-Kerr, Chris Hahn, Jiaming Luo, Yuvein, Zhu, Niharika Ahuja,
  Rodrigo Benenson, Raphaël Lopez Kaufman, Honglin Yu, Lloyd Hightower, Junlin Zhang, Darren
  Ni, Lisa Anne Hendricks, Gabby Wang, Gal Yona, Lalit Jain, Pablo Barrio, Surya Bhupatiraju,
  Siva Velusamy, Allan Dafoe, Sebastian Riedel, Tara Thomas, Zhe Yuan, Mathias Bellaiche, Sheena
  Panthaplackel, Klemen Kloboves, Sarthak Jauhari, Canfer Akbulut, Todor Davchev, Evgeny
  Gladchenko, David Madras, Aleksandr Chuklin, Tyrone Hill, Quan Yuan, Mukundan Madhavan,
  Luke Leonhard, Dylan Scandinaro, Qihang Chen, Ning Niu, Arthur Douillard, Bogdan Damoc,
  Yasumasa Onoe, Fabian Pedregosa, Fred Bertsch, Chas Leichner, Joseph Pagadora, Jonathan
  Malmaud, Sameera Ponda, Andy Twigg, Oleksii Duzhyi, Jingwei Shen, Miaosen Wang, Roopal
  Garg, Jing Chen, Utku Evci, Jonathan Lee, Leon Liu, Koji Kojima, Masa Yamaguchi, Arunkumar
  Rajendran, AJ Piergiovanni, Vinodh Kumar Rajendran, Marco Fornoni, Gabriel Ibagon, Harry
  Ragan, Sadh MNM Khan, John Blitzer, Andrew Bunner, Guan Sun, Takahiro Kosakai, Scott
  Lundberg, Ndidi Elue, Kelvin Guu, SK Park, Jane Park, Arunachalam Narayanaswamy, Chengda
  Wu, Jayaram Mudigonda, Trevor Cohn, Hairong Mu, Ravi Kumar, Laura Graesser, Yichi Zhang,
  Richard Killam, Vincent Zhuang, Mai Giménez, Wael Al Jishi, Ruy Ley-Wild, Alex Zhai, Kazuki
  Osawa, Diego Cedillo, Jialu Liu, Mayank Upadhyay, Marcin Sieniek, Roshan Sharma, Tom
  Paine, Anelia Angelova, Sravanti Addepalli, Carolina Parada, Kingshuk Majumder, Avery Lamp,
  Sanjiv Kumar, Xiang Deng, Artiom Myaskovsky, Tea Sabolić, Jeffrey Dudek, Sarah York, Félix
  de Chaumont Quitry, Jiazhong Nie, Dee Cattle, Alok Gunjan, Bilal Piot, Waleed Khawaja, Seojin
  Bang, Simon Wang, Siavash Khodadadeh, Raghavender R, Praynaa Rawlani, Richard Powell,
  Kevin Lee, Johannes Griesser, GS Oh, Cesar Magalhaes, Yujia Li, Simon Tokumine, Hadas Natalie
  Vogel, Dennis Hsu, Arturo BC, Disha Jindal, Matan Cohen, Zi Yang, Junwei Yuan, Dario de Cesare,
  Tony Bruguier, Jun Xu, Monica Roy, Alon Jacovi, Dan Belov, Rahul Arya, Phoenix Meadowlark,
  Shlomi Cohen-Ganor, Wenting Ye, Patrick Morris-Suzuki, Praseem Banzal, Gan Song, Pranavaraj
  Ponnuramu, Fred Zhang, George Scrivener, Salah Zaiem, Alif Raditya Rochman, Kehang Han,
  Badih Ghazi, Kate Lee, Shahar Drath, Daniel Suo, Antonious Girgis, Pradeep Shenoy, Duy Nguyen,
  Douglas Eck, Somit Gupta, Le Yan, Joao Carreira, Anmol Gulati, Ruoxin Sang, Daniil Mirylenka,
  Emma Cooney, Edward Chou, Mingyang Ling, Cindy Fan, Ben Coleman, Guilherme Tubone,
  Ravin Kumar, Jason Baldridge, Felix Hernandez-Campos, Angeliki Lazaridou, James Besley,
  Itay Yona, Neslihan Bulut, Quentin Wellens, AJ Pierigiovanni, Jasmine George, Richard Green,
  Pu Han, Connie Tao, Geoff Clark, Chong You, Abbas Abdolmaleki, Justin Fu, Tongzhou Chen,
  Ashwin Chaugule, Angad Chandorkar, Altaf Rahman, Will Thompson, Penporn Koanantakool,


                                               14
Preprint. Work in progress.




  Mike Bernico, Jie Ren, Andrey Vlasov, Sergei Vassilvitskii, Maciej Kula, Yizhong Liang, Dahun
  Kim, Yangsibo Huang, Chengxi Ye, Dmitry Lepikhin, and Wesley Helmholz. Gemini 2.5: Pushing
  the frontier with advanced reasoning, multimodality, long context, and next generation agentic
  capabilities, 2025. URL https://arxiv.org/abs/2507.06261.
Lutfi Eren Erdogan, Nicholas Lee, Sehoon Kim, Suhong Moon, Hiroki Furuta, Gopala Anu-
  manchipalli, Kurt Keutzer, and Amir Gholami. Plan-and-act: Improving planning of agents
  for long-horizon tasks. In Proceedings of the 42nd International Conference on Machine Learning
  (ICML 2025), pp. 15419–15462. PMLR, 2025.
Jizhan Fang, Xinle Deng, Haoming Xu, Ziyan Jiang, Yuqi Tang, Ziwen Xu, Shumin Deng, Yunzhi
   Yao, Mengru Wang, Shuofei Qiao, Huajun Chen, and Ningyu Zhang. Lightmem: Lightweight and
   efficient memory-augmented generation. CoRR, abs/2510.18866, 2025. URL https://arxiv.
   org/abs/2510.18866.

Georgios Feretzakis, Konstantinos Papaspyridis, Aris Gkoulalas-Divanis, and Vassilios S. Verykios.
  Privacy-preserving techniques in generative ai and large language models: A narrative review.
  Information, 15(11), 2024. ISSN 2078-2489. doi: 10.3390/info15110697. URL https://www.
  mdpi.com/2078-2489/15/11/697.

Shubham Gandhi, Dhruv Shah, Manasi Patwardhan, Lovekesh Vig, and Gautam Shroff. Research-
  codeagent: An llm multi-agent system for automated codification of research methodologies.
  CoRR, abs/2504.20117, 2025. URL https://arxiv.org/abs/2504.20117.
Pengyu Gao, Jinming Zhao, Xinyue Chen, and Long Yilin. An efficient context-dependent memory
  framework for llm-centric agents. In Proceedings of NAACL-HLT 2025: Conference of the North
  American Chapter of the Association for Computational Linguistics (Industry Track), pp. 1055–
  1069, Albuquerque, New Mexico, April 2025. Association for Computational Linguistics. doi: 10.
  18653/v1/2025.naacl-industry.80. URL https://aclanthology.org/2025.naacl-industry.
  80.

Team GLM, :, Aohan Zeng, Bin Xu, Bowen Wang, Chenhui Zhang, Da Yin, Dan Zhang, Diego
  Rojas, Guanyu Feng, Hanlin Zhao, Hanyu Lai, Hao Yu, Hongning Wang, Jiadai Sun, Jiajie
  Zhang, Jiale Cheng, Jiayi Gui, Jie Tang, Jing Zhang, Jingyu Sun, Juanzi Li, Lei Zhao, Lindong
  Wu, Lucen Zhong, Mingdao Liu, Minlie Huang, Peng Zhang, Qinkai Zheng, Rui Lu, Shuaiqi
  Duan, Shudan Zhang, Shulin Cao, Shuxun Yang, Weng Lam Tam, Wenyi Zhao, Xiao Liu, Xiao
  Xia, Xiaohan Zhang, Xiaotao Gu, Xin Lv, Xinghan Liu, Xinyi Liu, Xinyue Yang, Xixuan Song,
  Xunkai Zhang, Yifan An, Yifan Xu, Yilin Niu, Yuantao Yang, Yueyan Li, Yushi Bai, Yuxiao
  Dong, Zehan Qi, Zhaoyu Wang, Zhen Yang, Zhengxiao Du, Zhenyu Hou, and Zihan Wang.
  Chatglm: A family of large language models from glm-130b to glm-4 all tools, 2024. URL
  https://arxiv.org/abs/2406.12793.

Marc Glocker, Peter Hönig, Matthias Hirschmanner, and Markus Vincze. Llm-empowered embodied
 agent for memory-augmented task planning in household robotics. CoRR, abs/2504.21716, 2025.
 URL https://arxiv.org/abs/2504.21716.
Mandeep Goyal and Qusay H. Mahmoud. A systematic review of synthetic data generation techniques
 using generative ai. Electronics, 13(17), 2024. ISSN 2079-9292. doi: 10.3390/electronics13173509.
 URL https://www.mdpi.com/2079-9292/13/17/3509.
Kelvin Guu, Kenton Lee, Zora Tung, Panupong Pasupat, and Mingwei Chang. Retrieval augmented
  language model pre-training. In Hal Daum0̆0e9 III and Aarti Singh (eds.), Proceedings of the 37th
  International Conference on Machine Learning, volume 119 of Proceedings of Machine Learning
  Research, pp. 3929–3938. PMLR, 13–18 Jul 2020. URL https://proceedings.mlr.press/
  v119/guu20a.html.

Coleman Hooper, Sehoon Kim, Hiva Mohammadzadeh, Michael W. Mahoney, Yakun Sophia
  Shao, Kurt Keutzer, and Amir Gholami. Kvquant: Towards 10 million context length llm
  inference with kv cache quantization. In A. Globerson, L. Mackey, D. Belgrave, A. Fan,
  U. Paquet, J. Tomczak, and C. Zhang (eds.), Advances in Neural Information Process-
  ing Systems, volume 37, pp. 1270–1303. Curran Associates, Inc., 2024. doi: 10.52202/
  079017-0040. URL https://proceedings.neurips.cc/paper_files/paper/2024/file/
  028fcbcf85435d39a40c4d61b42c99a4-Paper-Conference.pdf.


                                                15
Preprint. Work in progress.




Yuanzhe Hu, Yu Wang, and Julian McAuley. Evaluating memory in llm agents via incremental
  multi-turn interactions. arXiv preprint arXiv:2507.05257, 2025.
Yuyang Hu, Shichun Liu, Yanwei Yue, Guibin Zhang, Boyang Liu, Fangyi Zhu, Jiahang Lin, Honglin
  Guo, Shihan Dou, Zhiheng Xi, Senjie Jin, Jiejun Tan, Yanbin Yin, Jiongnan Liu, Zeyu Zhang,
  Zhongxiang Sun, Yutao Zhu, Hao Sun, Boci Peng, Zhenrong Cheng, Xuanbo Fan, Jiaxin Guo,
  Xinlei Yu, Zhenhong Zhou, Zewen Hu, Jiahao Huo, Junhao Wang, Yuwei Niu, Yu Wang, Zhenfei
  Yin, Xiaobin Hu, Yue Liao, Qiankun Li, Kun Wang, Wangchunshu Zhou, Yixin Liu, Dawei
  Cheng, Qi Zhang, Tao Gui, Shirui Pan, Yan Zhang, Philip Torr, Zhicheng Dou, Ji-Rong Wen,
  Xuanjing Huang, Yu-Gang Jiang, and Shuicheng Yan. Memory in the age of ai agents, 2026. URL
  https://arxiv.org/abs/2512.13564.

Naman Jain, King Han, Alex Gu, Wen-Ding Li, Fanjia Yan, Tianjun Zhang, Sida Wang, Armando
  Solar-Lezama, Koushik Sen, and Ion Stoica. Livecodebench: Holistic and contamination free
  evaluation of large language models for code. In The Thirteenth International Conference on
  Learning Representations, 2025. URL https://openreview.net/forum?id=chfJJYC3iL.
Jihyoung Jang, Minseong Boo, and Hyounghun Kim. Conversation chronicles: Towards di-
   verse temporal and relational dynamics in multi-session conversations. In Houda Bouamor,
   Juan Pino, and Kalika Bali (eds.), Proceedings of the 2023 Conference on Empirical Meth-
   ods in Natural Language Processing, pp. 13584–13606, Singapore, December 2023. Associ-
   ation for Computational Linguistics. doi: 10.18653/v1/2023.emnlp-main.838. URL https:
   //aclanthology.org/2023.emnlp-main.838/.

Zixi Jia, Qinghua Liu, Hexiao Li, Yuyan Chen, and Jiqiang Liu. Evaluating the long-term memory of
  large language models. In Findings of the Association for Computational Linguistics: ACL 2025,
  pp. 19759–19777, Vienna, Austria, July 2025. Association for Computational Linguistics. doi:
  10.18653/v1/2025.findings-acl.1014. URL aclanthology.org/2025.findings-acl.1014/.
Bowen Jiang, Yuan Yuan, Maohao Shen, Zhuoqun Hao, Zhangchen Xu, Zichen Chen, Ziyi Liu,
  Anvesh Rao Vijjini, Jiashu He, Hanchao Yu, Radha Poovendran, Gregory Wornell, Lyle Ungar, Dan
  Roth, Sihao Chen, and Camillo Jose Taylor. Personamem-v2: Towards personalized intelligence
  via learning implicit user personas and agentic memory. arXiv preprint arXiv:2512.06688, 2025.
Brennan Jones, Kelsey Stemmler, Emily Su, Young-Ho Kim, and Anastasia Kuzminykh. Users’
  expectations and practices with agent memory. In Proceedings of the Extended Abstracts of the CHI
  Conference on Human Factors in Computing Systems, CHI EA ’25, New York, NY, USA, 2025.
  Association for Computing Machinery. ISBN 9798400713958. doi: 10.1145/3706599.3720158.
  URL https://doi.org/10.1145/3706599.3720158.
Jiazheng Kang, Mingming Ji, Zhe Zhao, and Ting Bai. Memory os of ai agent, 2025. URL
   https://arxiv.org/abs/2506.06326.

Vladimir Karpukhin, Barlas Oguz, Sewon Min, Patrick Lewis, Ledell Wu, Sergey Edunov, Danqi
  Chen, and Wen-tau Yih. Dense passage retrieval for open-domain question answering. In Proceed-
  ings of the 2020 Conference on Empirical Methods in Natural Language Processing (EMNLP), pp.
  6769–6781, Online, November 2020. Association for Computational Linguistics. doi: 10.18653/
  v1/2020.emnlp-main.550. URL https://aclanthology.org/2020.emnlp-main.550/.
Donald E. Kieso, Jerry J. Weygandt, and Terry D. Warfield. Intermediate Accounting: IFRS Edition.
  John Wiley & Sons, Hoboken, NJ, 4 edition, 2020. ISBN 978-1119577729.
Jiho Kim, Woosog Chay, Hyeonji Hwang, Daeun Kyung, Hyunseung Chung, Eunbyeol Cho, Yeonsu
   Kwon, Yohan Jo, and Edward Choi. Dialsim: A dialogue simulator for evaluating long-term
   multi-party dialogue understanding of conversational agents. arXiv:2406.13144, 2024.
Minyeong Kim, Minchan Kim, Seungone Kim, et al. Mip-bench: Can llms implicitly personalize
 answers for different users by implicitly leveraging long-term memory?, 2025.
Johannes Kirmayr, Lukas Stappen, Phillip Schneider, Florian Matthes, and Elisabeth André.
  Carmem: Enhancing long-term memory in llm voice assistants through category-bounding. CoRR,
  abs/2501.09645, 2025. URL https://arxiv.org/abs/2501.09645.


                                               16
Preprint. Work in progress.




Thomas Kwa, Ben West, Joel Becker, Amy Deng, Katharyn Garcia, Max Hasin, Sami Jawhar, Megan
  Kinniment, Nate Rush, Sydney Von Arx, Ryan Bloom, Thomas Broadley, Haoxing Du, Brian
  Goodrich, Nikola Jurkovic, Luke Harold Miles, Seraphina Nix, Tao Lin, Neev Parikh, David Rein,
  Lucas Jun Koba Sato, Hjalmar Wijk, Daniel M. Ziegler, Elizabeth Barnes, and Lawrence Chan.
  Measuring ai ability to complete long tasks, 2025. URL https://arxiv.org/abs/2503.14499.
Wonbeom Lee, Jungi Lee, Junghwan Seo, and Jaewoong Sim. Infinigen: Efficient generative
 inference of large language models with dynamic kv cache management. CoRR, 2024. URL
 https://arxiv.org/abs/2406.19707.

Mingcong Lei, Honghao Cai, Yuyuan Yang, Yimou Wu, Jinke Ren, Zezhou Cui, Liangchen Tan,
 Junkun Hong, Gehan Hu, Shuangyu Zhu, Shaohan Jiang, Ge Wang, Junyuan Tan, Zhenglin Wan,
 Zheng Li, Zhen Li, Shuguang Cui, Yiming Zhao, and Yatong Han. Robomemory: A brain-inspired
 multi-memory agentic framework for interactive environmental learning in physical embodied
 systems. CoRR, abs/2508.01415, 2025. URL https://arxiv.org/abs/2508.01415.
Patrick Lewis, Ethan Perez, Aleksandra Piktus, Fabio Petroni, Vladimir Karpukhin, Naman Goyal,
  Heinrich Küttler, Mike Lewis, Wen tau Yih, Tim Rocktäschel, Sebastian Riedel, and Douwe
  Kiela. Retrieval-augmented generation for knowledge-intensive NLP tasks. In Advances in
  Neural Information Processing Systems 33: Annual Conference on Neural Information Pro-
  cessing Systems 2020, 2020. URL https://proceedings.neurips.cc/paper/2020/hash/
  6b493230205f780e1bc26945df7481e5-Abstract.html.

Dacheng Li, Rulin Shao, Anze Xie, Ying Sheng, Lianmin Zheng, Joseph Gonzalez, Ion Stoica,
  Xuezhe Ma, and Hao Zhang. How long can context length of open-source LLMs truly promise?
  In NeurIPS 2023 Workshop on Instruction Tuning and Instruction Following, 2023. URL https:
 //openreview.net/forum?id=LywifFNXV5.

Zhiyu Li, Chenyang Xi, Chunyu Li, Ding Chen, Boyu Chen, Shichao Song, Simin Niu, Hanyu
  Wang, Jiawei Yang, Chen Tang, Qingchen Yu, Jihao Zhao, Yezhaohui Wang, Peng Liu, Zehao
  Lin, Pengyuan Wang, Jiahao Huo, Tianyi Chen, Kai Chen, Kehang Li, Zhen Tao, Huayi Lai,
  Hao Wu, Bo Tang, Zhengren Wang, Zhaoxin Fan, Ningyu Zhang, Linfeng Zhang, Junchi Yan,
  Mingchuan Yang, Tong Xu, Wei Xu, Huajun Chen, Haofen Wang, Hongkang Yang, Wentao Zhang,
  Zhi-Qin John Xu, Siheng Chen, and Feiyu Xiong. Memos: A memory os for ai system, 2025.
  URL https://arxiv.org/abs/2507.03724.
Zirui Liu, Jiayi Yuan, Hongye Jin, Shaochen (Henry) Zhong, Zhaozhuo Xu, Vladimir Braverman,
  Beidi Chen, and Xia Hu. Kivi: a tuning-free asymmetric 2bit quantization for kv cache. In
  Proceedings of the 41st International Conference on Machine Learning, ICML’24. JMLR.org,
  2024.
Adyasha Maharana, Dong-Ho Lee, Sergey Tulyakov, Mohit Bansal, Francesco Barbieri, and Yuwei
  Fang. Evaluating very long-term conversational memory of LLM agents. In Lun-Wei Ku, Andre
  Martins, and Vivek Srikumar (eds.), Proceedings of the 62nd Annual Meeting of the Association
  for Computational Linguistics (ACL 2024, Long Papers), pp. 13851–13870, Bangkok, Thailand,
 August 2024. Association for Computational Linguistics. doi: 10.18653/v1/2024.acl-long.747.
  URL https://aclanthology.org/2024.acl-long.747/.
MemMachine Contributors. Memmachine: A memory-centric computing framework. https:
 //github.com/MemMachine/MemMachine, 2025. Accessed: 2025-10-01.

Mike A. Merrill, Alexander G. Shaw, Nicholas Carlini, Boxuan Li, Harsh Raj, Ivan Bercovich,
 Lin Shi, Jeong Yeon Shin, Thomas Walshe, E. Kelly Buchanan, Junhong Shen, Guanghao Ye,
 Haowei Lin, Jason Poulos, Maoyu Wang, Marianna Nezhurina, Jenia Jitsev, Di Lu, Orfeas Menis
 Mastromichalakis, Zhiwei Xu, Zizhao Chen, Yue Liu, Robert Zhang, Leon Liangyu Chen, Anurag
 Kashyap, Jan-Lucas Uslu, Jeffrey Li, Jianbo Wu, Minghao Yan, Song Bian, Vedang Sharma,
 Ke Sun, Steven Dillmann, Akshay Anand, Andrew Lanpouthakoun, Bardia Koopah, Changran Hu,
 Etash Guha, Gabriel H. S. Dreiman, Jiacheng Zhu, Karl Krauth, Li Zhong, Niklas Muennighoff,
 Robert Amanfu, Shangyin Tan, Shreyas Pimpalgaonkar, Tushar Aggarwal, Xiangning Lin, Xin
 Lan, Xuandong Zhao, Yiqing Liang, Yuanli Wang, Zilong Wang, Changzhi Zhou, David Heineman,
 Hange Liu, Harsh Trivedi, John Yang, Junhong Lin, Manish Shetty, Michael Yang, Nabil Omi,
 Negin Raoof, Shanda Li, Terry Yue Zhuo, Wuwei Lin, Yiwei Dai, Yuxin Wang, Wenhao Chai,


                                              17
Preprint. Work in progress.




  Shang Zhou, Dariush Wahdany, Ziyu She, Jiaming Hu, Zhikang Dong, Yuxuan Zhu, Sasha Cui,
  Ahson Saiyed, Arinbjörn Kolbeinsson, Jesse Hu, Christopher Michael Rytting, Ryan Marten, Yixin
  Wang, Alex Dimakis, Andy Konwinski, and Ludwig Schmidt. Terminal-bench: Benchmarking
  agents on hard, realistic tasks in command line interfaces, 2026. URL https://arxiv.org/abs/
  2601.11868.

Ali Modarressi, Abdullatif Köksal, Ayyoob Imani, Mohsen Fayyaz, and Hinrich Schütze. Memllm:
  Finetuning llms to use an explicit read-write memory. CoRR, abs/2404.11672, 2024. URL
  https://arxiv.org/abs/2404.11672.

Jiayan Nan, Wenquan Ma, Wenlong Wu, and Yize Chen. Nemori: Self-organizing agent memory
   inspired by cognitive science. CoRR, abs/2508.03341, 2025. URL https://arxiv.org/abs/
   2508.03341.

OpenAI. Embeddings – openai api. https://platform.openai.com/docs/guides/embeddings,
  2023. Accessed: 2026-02-09.
OpenAI.    Memory and new controls for chatgpt.         https://openai.com/index/
  memory-and-new-controls-for-chatgpt/, 2024. Accessed: 2025-10-01.

Charles Packer, Sarah Wooders, Kevin Lin, Vivian Fang, Shishir G. Patil, Ion Stoica, and Joseph E.
  Gonzalez. Memgpt: Towards llms as operating systems. CoRR, abs/2310.08560, 2023. URL
  https://arxiv.org/abs/2310.08560.

Arjun Panickssery, Samuel R. Bowman, and Shi Feng. Llm evaluators recognize and favor their own
  generations, 2024. URL https://arxiv.org/abs/2404.13076.
Leonid Pekelis, Michael Feil, Forrest Moret, Mark Huang, and Tiffany Peng.  Llama
  3 gradient:   A series of long context models.        https://gradient.ai/blog/
  scaling-rotational-embeddings-for-long-context-language-models, 2024. Gradient
  AI blog post.
Bowen Peng, Jeffrey Quesnelle, Honglu Fan, and Enrico Shippole. YaRN: Efficient context win-
  dow extension of large language models. In The Twelfth International Conference on Learning
  Representations, 2024. URL https://openreview.net/forum?id=wHBfxhZu1u.
Long Phan, Alice Gatti, Ziwen Han, Nathaniel Li, Josephina Hu, Hugh Zhang, Chen Bo Calvin
  Zhang, Mohamed Shaaban, John Ling, Sean Shi, Michael Choi, Anish Agrawal, Arnav Chopra,
  Adam Khoja, Ryan Kim, Richard Ren, Jason Hausenloy, Oliver Zhang, Mantas Mazeika, Dmitry
  Dodonov, Tung Nguyen, Jaeho Lee, Daron Anderson, Mikhail Doroshenko, Alun Cennyth Stokes,
  Mobeen Mahmood, Oleksandr Pokutnyi, Oleg Iskra, Jessica P. Wang, John-Clark Levin, Mstyslav
  Kazakov, Fiona Feng, Steven Y. Feng, Haoran Zhao, Michael Yu, Varun Gangal, Chelsea Zou,
  Zihan Wang, Serguei Popov, Robert Gerbicz, Geoff Galgon, Johannes Schmitt, Will Yeadon,
  Yongki Lee, Scott Sauers, Alvaro Sanchez, Fabian Giska, Marc Roth, Søren Riis, Saiteja Utpala,
  Noah Burns, Gashaw M. Goshu, Mohinder Maheshbhai Naiya, Chidozie Agu, Zachary Giboney,
  Antrell Cheatom, Francesco Fournier-Facio, Sarah-Jane Crowson, Lennart Finke, Zerui Cheng,
  Jennifer Zampese, Ryan G. Hoerr, Mark Nandor, Hyunwoo Park, Tim Gehrunger, Jiaqi Cai, Ben
  McCarty, Alexis C Garretson, Edwin Taylor, Damien Sileo, Qiuyu Ren, Usman Qazi, Lianghui
  Li, Jungbae Nam, John B. Wydallis, Pavel Arkhipov, Jack Wei Lun Shi, Aras Bacho, Chris G.
  Willcocks, Hangrui Cao, Sumeet Motwani, Emily de Oliveira Santos, Johannes Veith, Edward
  Vendrow, Doru Cojoc, Kengo Zenitani, Joshua Robinson, Longke Tang, Yuqi Li, Joshua Vendrow,
  Natanael Wildner Fraga, Vladyslav Kuchkin, Andrey Pupasov Maksimov, Pierre Marion, Denis
  Efremov, Jayson Lynch, Kaiqu Liang, Aleksandar Mikov, Andrew Gritsevskiy, Julien Guillod,
  Gözdenur Demir, Dakotah Martinez, Ben Pageler, Kevin Zhou, Saeed Soori, Ori Press, Henry Tang,
  Paolo Rissone, Sean R. Green, Lina Brüssel, Moon Twayana, Aymeric Dieuleveut, Joseph Marvin
  Imperial, Ameya Prabhu, Jinzhou Yang, Nick Crispino, Arun Rao, Dimitri Zvonkine, Gabriel
  Loiseau, Mikhail Kalinin, Marco Lukas, Ciprian Manolescu, Nate Stambaugh, Subrata Mishra, Tad
  Hogg, Carlo Bosio, Brian P Coppola, Julian Salazar, Jaehyeok Jin, Rafael Sayous, Stefan Ivanov,
  Philippe Schwaller, Shaipranesh Senthilkuma, Andres M Bran, Andres Algaba, Kelsey Van den
  Houte, Lynn Van Der Sypt, Brecht Verbeken, David Noever, Alexei Kopylov, Benjamin Myklebust,
  Bikun Li, Lisa Schut, Evgenii Zheltonozhskii, Qiaochu Yuan, Derek Lim, Richard Stanley, Tong
  Yang, John Maar, Julian Wykowski, Martí Oller, Anmol Sahu, Cesare Giulio Ardito, Yuzheng Hu,


                                               18
Preprint. Work in progress.




  Ariel Ghislain Kemogne Kamdoum, Alvin Jin, Tobias Garcia Vilchis, Yuexuan Zu, Martin Lackner,
  James Koppel, Gongbo Sun, Daniil S. Antonenko, Steffi Chern, Bingchen Zhao, Pierrot Arsene,
  Joseph M Cavanagh, Daofeng Li, Jiawei Shen, Donato Crisostomi, Wenjin Zhang, Ali Dehghan,
  Sergey Ivanov, David Perrella, Nurdin Kaparov, Allen Zang, Ilia Sucholutsky, Arina Kharlamova,
  Daniil Orel, Vladislav Poritski, Shalev Ben-David, Zachary Berger, Parker Whitfill, Michael Foster,
  Daniel Munro, Linh Ho, Shankar Sivarajan, Dan Bar Hava, Aleksey Kuchkin, David Holmes,
  Alexandra Rodriguez-Romero, Frank Sommerhage, Anji Zhang, Richard Moat, Keith Schneider,
  Zakayo Kazibwe, Don Clarke, Dae Hyun Kim, Felipe Meneguitti Dias, Sara Fish, Veit Elser,
  Tobias Kreiman, Victor Efren Guadarrama Vilchis, Immo Klose, Ujjwala Anantheswaran, Adam
  Zweiger, Kaivalya Rawal, Jeffery Li, Jeremy Nguyen, Nicolas Daans, Haline Heidinger, Maksim
  Radionov, Václav Rozhoň, Vincent Ginis, Christian Stump, Niv Cohen, Rafał Poświata, Josef
  Tkadlec, Alan Goldfarb, Chenguang Wang, Piotr Padlewski, Stanislaw Barzowski, Kyle Mont-
  gomery, Ryan Stendall, Jamie Tucker-Foltz, Jack Stade, T. Ryan Rogers, Tom Goertzen, Declan
  Grabb, Abhishek Shukla, Alan Givré, John Arnold Ambay, Archan Sen, Muhammad Fayez Aziz,
  Mark H Inlow, Hao He, Ling Zhang, Younesse Kaddar, Ivar Ängquist, Yanxu Chen, Harrison K
  Wang, Kalyan Ramakrishnan, Elliott Thornley, Antonio Terpin, Hailey Schoelkopf, Eric Zheng,
  Avishy Carmi, Ethan D. L. Brown, Kelin Zhu, Max Bartolo, Richard Wheeler, Martin Stehberger,
  Peter Bradshaw, JP Heimonen, Kaustubh Sridhar, Ido Akov, Jennifer Sandlin, Yury Makarychev,
  Joanna Tam, Hieu Hoang, David M. Cunningham, Vladimir Goryachev, Demosthenes Patramanis,
  Michael Krause, Andrew Redenti, David Aldous, Jesyin Lai, Shannon Coleman, Jiangnan Xu,
  Sangwon Lee, Ilias Magoulas, Sandy Zhao, Ning Tang, Michael K. Cohen, Orr Paradise, Jan Hen-
  drik Kirchner, Maksym Ovchynnikov, Jason O. Matos, Adithya Shenoy, Michael Wang, Yuzhou
  Nie, Anna Sztyber-Betley, Paolo Faraboschi, Robin Riblet, Jonathan Crozier, Shiv Halasyamani,
  Shreyas Verma, Prashant Joshi, Eli Meril, Ziqiao Ma, Jérémy Andréoletti, Raghav Singhal, Jacob
  Platnick, Volodymyr Nevirkovets, Luke Basler, Alexander Ivanov, Seri Khoury, Nils Gustafsson,
  Marco Piccardo, Hamid Mostaghimi, Qijia Chen, Virendra Singh, Tran Quoc Khánh, Paul Rosu,
  Hannah Szlyk, Zachary Brown, Himanshu Narayan, Aline Menezes, Jonathan Roberts, William
  Alley, Kunyang Sun, Arkil Patel, Max Lamparth, Anka Reuel, Linwei Xin, Hanmeng Xu, Jacob
  Loader, Freddie Martin, Zixuan Wang, Andrea Achilleos, Thomas Preu, Tomek Korbak, Ida Bosio,
  Fereshteh Kazemi, Ziye Chen, Biró Bálint, Eve J. Y. Lo, Jiaqi Wang, Maria Inês S. Nunes, Jeremiah
  Milbauer, M Saiful Bari, Zihao Wang, Behzad Ansarinejad, Yewen Sun, Stephane Durand, Hossam
  Elgnainy, Guillaume Douville, Daniel Tordera, George Balabanian, Hew Wolff, Lynna Kvistad,
  Hsiaoyun Milliron, Ahmad Sakor, Murat Eron, Andrew Favre D. O., Shailesh Shah, Xiaoxiang
  Zhou, Firuz Kamalov, Sherwin Abdoli, Tim Santens, Shaul Barkan, Allison Tee, Robin Zhang,
  Alessandro Tomasiello, G. Bruno De Luca, Shi-Zhuo Looi, Vinh-Kha Le, Noam Kolt, Jiayi Pan,
  Emma Rodman, Jacob Drori, Carl J Fossum, Niklas Muennighoff, Milind Jagota, Ronak Pradeep,
  Honglu Fan, Jonathan Eicher, Michael Chen, Kushal Thaman, William Merrill, Moritz Firsching,
  Carter Harris, Stefan Ciobâcă, Jason Gross, Rohan Pandey, Ilya Gusev, Adam Jones, Shashank
  Agnihotri, Pavel Zhelnov, Mohammadreza Mofayezi, Alexander Piperski, David K. Zhang, Kos-
  tiantyn Dobarskyi, Roman Leventov, Ignat Soroko, Joshua Duersch, Vage Taamazyan, Andrew Ho,
  Wenjie Ma, William Held, Ruicheng Xian, Armel Randy Zebaze, Mohanad Mohamed, Julian Noah
  Leser, Michelle X Yuan, Laila Yacar, Johannes Lengler, Katarzyna Olszewska, Claudio Di Fratta,
  Edson Oliveira, Joseph W. Jackson, Andy Zou, Muthu Chidambaram, Timothy Manik, Hector
  Haffenden, Dashiell Stander, Ali Dasouqi, Alexander Shen, Bita Golshani, David Stap, Egor
  Kretov, Mikalai Uzhou, Alina Borisovna Zhidkovskaya, Nick Winter, Miguel Orbegozo Rodriguez,
  Robert Lauff, Dustin Wehr, Colin Tang, Zaki Hossain, Shaun Phillips, Fortuna Samuele, Fredrik
  Ekström, Angela Hammon, Oam Patel, Faraz Farhidi, George Medley, Forough Mohammadzadeh,
  Madellene Peñaflor, Haile Kassahun, Alena Friedrich, Rayner Hernandez Perez, Daniel Pyda,
  Taom Sakal, Omkar Dhamane, Ali Khajegili Mirabadi, Eric Hallman, Kenchi Okutsu, Mike
  Battaglia, Mohammad Maghsoudimehrabani, Alon Amit, Dave Hulbert, Roberto Pereira, Simon
  Weber, Handoko, Anton Peristyy, Stephen Malina, Mustafa Mehkary, Rami Aly, Frank Reidegeld,
  Anna-Katharina Dick, Cary Friday, Mukhwinder Singh, Hassan Shapourian, Wanyoung Kim, Mar-
  iana Costa, Hubeyb Gurdogan, Harsh Kumar, Chiara Ceconello, Chao Zhuang, Haon Park, Micah
  Carroll, Andrew R. Tawfeek, Stefan Steinerberger, Daattavya Aggarwal, Michael Kirchhof, Linjie
  Dai, Evan Kim, Johan Ferret, Jainam Shah, Yuzhou Wang, Minghao Yan, Krzysztof Burdzy, Lixin
  Zhang, Antonio Franca, Diana T. Pham, Kang Yong Loh, Joshua Robinson, Abram Jackson, Paolo
  Giordano, Philipp Petersen, Adrian Cosma, Jesus Colino, Colin White, Jacob Votava, Vladimir
  Vinnikov, Ethan Delaney, Petr Spelda, Vit Stritecky, Syed M. Shahid, Jean-Christophe Mourrat,
  Lavr Vetoshkin, Koen Sponselee, Renas Bacho, Zheng-Xin Yong, Florencia de la Rosa, Nathan


                                                19
Preprint. Work in progress.




  Cho, Xiuyu Li, Guillaume Malod, Orion Weller, Guglielmo Albani, Leon Lang, Julien Laurendeau,
  Dmitry Kazakov, Fatimah Adesanya, Julien Portier, Lawrence Hollom, Victor Souza, Yuchen Anna
  Zhou, Julien Degorre, Yiğit Yalın, Gbenga Daniel Obikoya, Rai, Filippo Bigi, M. C. Boscá, Oleg
  Shumar, Kaniuar Bacho, Gabriel Recchia, Mara Popescu, Nikita Shulga, Ngefor Mildred Tanwie,
  Thomas C. H. Lux, Ben Rank, Colin Ni, Matthew Brooks, Alesia Yakimchyk, Huanxu, Liu,
  Stefano Cavalleri, Olle Häggström, Emil Verkama, Joshua Newbould, Hans Gundlach, Leonor
  Brito-Santana, Brian Amaro, Vivek Vajipey, Rynaa Grover, Ting Wang, Yosi Kratish, Wen-Ding
  Li, Sivakanth Gopi, Andrea Caciolai, Christian Schroeder de Witt, Pablo Hernández-Cámara,
  Emanuele Rodolà, Jules Robins, Dominic Williamson, Vincent Cheng, Brad Raynor, Hao Qi, Ben
  Segev, Jingxuan Fan, Sarah Martinson, Erik Y. Wang, Kaylie Hausknecht, Michael P. Brenner,
  Mao Mao, Christoph Demian, Peyman Kassani, Xinyu Zhang, David Avagian, Eshawn Jessica
  Scipio, Alon Ragoler, Justin Tan, Blake Sims, Rebeka Plecnik, Aaron Kirtland, Omer Faruk
  Bodur, D. P. Shinde, Yan Carlos Leyva Labrador, Zahra Adoul, Mohamed Zekry, Ali Karakoc,
  Tania C. B. Santos, Samir Shamseldeen, Loukmane Karim, Anna Liakhovitskaia, Nate Resman,
  Nicholas Farina, Juan Carlos Gonzalez, Gabe Maayan, Earth Anderson, Rodrigo De Oliveira
  Pena, Elizabeth Kelley, Hodjat Mariji, Rasoul Pouriamanesh, Wentao Wu, Ross Finocchio, Ismail
  Alarab, Joshua Cole, Danyelle Ferreira, Bryan Johnson, Mohammad Safdari, Liangti Dai, Siriphan
  Arthornthurasuk, Isaac C. McAlister, Alejandro José Moyano, Alexey Pronin, Jing Fan, Angel
  Ramirez-Trinidad, Yana Malysheva, Daphiny Pottmaier, Omid Taheri, Stanley Stepanic, Samuel
  Perry, Luke Askew, Raúl Adrián Huerta Rodríguez, Ali M. R. Minissi, Ricardo Lorena, Krishna-
  murthy Iyer, Arshad Anil Fasiludeen, Ronald Clark, Josh Ducey, Matheus Piza, Maja Somrak, Eric
  Vergo, Juehang Qin, Benjámin Borbás, Eric Chu, Jack Lindsey, Antoine Jallon, I. M. J. McInnis,
  Evan Chen, Avi Semler, Luk Gloor, Tej Shah, Marc Carauleanu, Pascal Lauer, Tran Ðuc Huy,
  Hossein Shahrtash, Emilien Duc, Lukas Lewark, Assaf Brown, Samuel Albanie, Brian Weber,
  Warren S. Vaz, Pierre Clavier, Yiyang Fan, Gabriel Poesia Reis e Silva, Long, Lian, Marcus
  Abramovitch, Xi Jiang, Sandra Mendoza, Murat Islam, Juan Gonzalez, Vasilios Mavroudis, Justin
  Xu, Pawan Kumar, Laxman Prasad Goswami, Daniel Bugas, Nasser Heydari, Ferenc Jeanplong,
  Thorben Jansen, Antonella Pinto, Archimedes Apronti, Abdallah Galal, Ng Ze-An, Ankit Singh,
  Tong Jiang, Joan of Arc Xavier, Kanu Priya Agarwal, Mohammed Berkani, Gang Zhang, Zhehang
  Du, Benedito Alves de Oliveira Junior, Dmitry Malishev, Nicolas Remy, Taylor D. Hartman, Tim
  Tarver, Stephen Mensah, Gautier Abou Loume, Wiktor Morak, Farzad Habibi, Sarah Hoback, Will
  Cai, Javier Gimenez, Roselynn Grace Montecillo, Jakub Łucki, Russell Campbell, Asankhaya
  Sharma, Khalida Meer, Shreen Gul, Daniel Espinosa Gonzalez, Xavier Alapont, Alex Hoover, Gun-
  jan Chhablani, Freddie Vargus, Arunim Agarwal, Yibo Jiang, Deepakkumar Patil, David Outevsky,
  Kevin Joseph Scaria, Rajat Maheshwari, Abdelkader Dendane, Priti Shukla, Ashley Cartwright,
  Sergei Bogdanov, Niels Mündler, Sören Möller, Luca Arnaboldi, Kunvar Thaman, Muhammad Re-
  han Siddiqi, Prajvi Saxena, Himanshu Gupta, Tony Fruhauff, Glen Sherman, Mátyás Vincze,
  Siranut Usawasutsakorn, Dylan Ler, Anil Radhakrishnan, Innocent Enyekwe, Sk Md Salauddin,
  Jiang Muzhen, Aleksandr Maksapetyan, Vivien Rossbach, Chris Harjadi, Mohsen Bahaloohoreh,
  Claire Sparrow, Jasdeep Sidhu, Sam Ali, Song Bian, John Lai, Eric Singer, Justine Leon Uro,
  Greg Bateman, Mohamed Sayed, Ahmed Menshawy, Darling Duclosel, Dario Bezzi, Yashaswini
  Jain, Ashley Aaron, Murat Tiryakioglu, Sheeshram Siddh, Keith Krenek, Imad Ali Shah, Jun Jin,
  Scott Creighton, Denis Peskoff, Zienab EL-Wasif, Ragavendran P V, Michael Richmond, Joseph
  McGowan, Tejal Patwardhan, Hao-Yu Sun, Ting Sun, Nikola Zubić, Samuele Sala, Stephen Ebert,
  Jean Kaddour, Manuel Schottdorf, Dianzhuo Wang, Gerol Petruzella, Alex Meiburg, Tilen Medved,
  Ali ElSheikh, S Ashwin Hebbar, Lorenzo Vaquero, Xianjun Yang, Jason Poulos, Vilém Zouhar,
  Sergey Bogdanik, Mingfang Zhang, Jorge Sanz-Ros, David Anugraha, Yinwei Dai, Anh N. Nhu,
  Xue Wang, Ali Anil Demircali, Zhibai Jia, Yuyin Zhou, Juncheng Wu, Mike He, Nitin Chandok,
  Aarush Sinha, Gaoxiang Luo, Long Le, Mickaël Noyé, Michał Perełkiewicz, Ioannis Pantidis,
  Tianbo Qi, Soham Sachin Purohit, Letitia Parcalabescu, Thai-Hoa Nguyen, Genta Indra Winata,
  Edoardo M. Ponti, Hanchen Li, Kaustubh Dhole, Jongee Park, Dario Abbondanza, Yuanli Wang,
  Anupam Nayak, Diogo M. Caetano, Antonio A. W. L. Wong, Maria del Rio-Chanona, Dániel
  Kondor, Pieter Francois, Ed Chalstrey, Jakob Zsambok, Dan Hoyer, Jenny Reddish, Jakob Hauser,
  Francisco-Javier Rodrigo-Ginés, Suchandra Datta, Maxwell Shepherd, Thom Kamphuis, Qizheng
  Zhang, Hyunjun Kim, Ruiji Sun, Jianzhu Yao, Franck Dernoncourt, Satyapriya Krishna, Sina
  Rismanchian, Bonan Pu, Francesco Pinto, Yingheng Wang, Kumar Shridhar, Kalon J. Overholt,
  Glib Briia, Hieu Nguyen, David, Soler Bartomeu, Tony CY Pang, Adam Wecker, Yifan Xiong,
  Fanfei Li, Lukas S. Huber, Joshua Jaeger, Romano De Maddalena, Xing Han Lù, Yuhui Zhang,
  Claas Beger, Patrick Tser Jern Kon, Sean Li, Vivek Sanker, Ming Yin, Yihao Liang, Xinlu Zhang,


                                              20
Preprint. Work in progress.




  Ankit Agrawal, Li S. Yifei, Zechen Zhang, Mu Cai, Yasin Sonmez, Costin Cozianu, Changhao
  Li, Alex Slen, Shoubin Yu, Hyun Kyu Park, Gabriele Sarti, Marcin Briański, Alessandro Stolfo,
  Truong An Nguyen, Mike Zhang, Yotam Perlitz, Jose Hernandez-Orallo, Runjia Li, Amin Sha-
  bani, Felix Juefei-Xu, Shikhar Dhingra, Orr Zohar, My Chiffon Nguyen, Alexander Pondaven,
  Abdurrahim Yilmaz, Xuandong Zhao, Chuanyang Jin, Muyan Jiang, Stefan Todoran, Xinyao
  Han, Jules Kreuer, Brian Rabern, Anna Plassart, Martino Maggetti, Luther Yap, Robert Geirhos,
  Jonathon Kean, Dingsu Wang, Sina Mollaei, Chenkai Sun, Yifan Yin, Shiqi Wang, Rui Li, Yaowen
  Chang, Anjiang Wei, Alice Bizeul, Xiaohan Wang, Alexandre Oliveira Arrais, Kushin Mukherjee,
  Jorge Chamorro-Padial, Jiachen Liu, Xingyu Qu, Junyi Guan, Adam Bouyamourn, Shuyu Wu,
  Martyna Plomecka, Junda Chen, Mengze Tang, Jiaqi Deng, Shreyas Subramanian, Haocheng Xi,
  Haoxuan Chen, Weizhi Zhang, Yinuo Ren, Haoqin Tu, Sejong Kim, Yushun Chen, Sara Vera
  Marjanović, Junwoo Ha, Grzegorz Luczyna, Jeff J. Ma, Zewen Shen, Dawn Song, Cedegao E.
  Zhang, Zhun Wang, Gaël Gendron, Yunze Xiao, Leo Smucker, Erica Weng, Kwok Hao Lee,
  Zhe Ye, Stefano Ermon, Ignacio D. Lopez-Miguel, Theo Knights, Anthony Gitter, Namkyu Park,
  Boyi Wei, Hongzheng Chen, Kunal Pai, Ahmed Elkhanany, Han Lin, Philipp D. Siedler, Jichao
  Fang, Ritwik Mishra, Károly Zsolnai-Fehér, Xilin Jiang, Shadab Khan, Jun Yuan, Rishab Kumar
  Jain, Xi Lin, Mike Peterson, Zhe Wang, Aditya Malusare, Maosen Tang, Isha Gupta, Ivan Fosin,
  Timothy Kang, Barbara Dworakowska, Kazuki Matsumoto, Guangyao Zheng, Gerben Sewuster,
  Jorge Pretel Villanueva, Ivan Rannev, Igor Chernyavsky, Jiale Chen, Deepayan Banik, Ben Racz,
  Wenchao Dong, Jianxin Wang, Laila Bashmal, Duarte V. Gonçalves, Wei Hu, Kaushik Bar, Ondrej
  Bohdal, Atharv Singh Patlan, Shehzaad Dhuliawala, Caroline Geirhos, Julien Wist, Yuval Kansal,
  Bingsen Chen, Kutay Tire, Atak Talay Yücel, Brandon Christof, Veerupaksh Singla, Zijian Song,
  Sanxing Chen, Jiaxin Ge, Kaustubh Ponkshe, Isaac Park, Tianneng Shi, Martin Q. Ma, Joshua Mak,
  Sherwin Lai, Antoine Moulin, Zhuo Cheng, Zhanda Zhu, Ziyi Zhang, Vaidehi Patil, Ketan Jha,
  Qiutong Men, Jiaxuan Wu, Tianchi Zhang, Bruno Hebling Vieira, Alham Fikri Aji, Jae-Won Chung,
  Mohammed Mahfoud, Ha Thi Hoang, Marc Sperzel, Wei Hao, Kristof Meding, Sihan Xu, Vassilis
  Kostakos, Davide Manini, Yueying Liu, Christopher Toukmaji, Jay Paek, Eunmi Yu, Arif Engin
  Demircali, Zhiyi Sun, Ivan Dewerpe, Hongsen Qin, Roman Pflugfelder, James Bailey, Johnathan
  Morris, Ville Heilala, Sybille Rosset, Zishun Yu, Peter E. Chen, Woongyeong Yeo, Eeshaan Jain,
  Ryan Yang, Sreekar Chigurupati, Julia Chernyavsky, Sai Prajwal Reddy, Subhashini Venugopalan,
  Hunar Batra, Core Francisco Park, Hieu Tran, Guilherme Maximiano, Genghan Zhang, Yizhuo
  Liang, Hu Shiyu, Rongwu Xu, Rui Pan, Siddharth Suresh, Ziqi Liu, Samaksh Gulati, Songyang
  Zhang, Peter Turchin, Christopher W. Bartlett, Christopher R. Scotese, Phuong M. Cao, Ben Wu,
  Jacek Karwowski, Davide Scaramuzza, Aakaash Nattanmai, Gordon McKellips, Anish Cheraku,
  Asim Suhail, Ethan Luo, Marvin Deng, Jason Luo, Ashley Zhang, Kavin Jindel, Jay Paek, Kasper
  Halevy, Allen Baranov, Michael Liu, Advaith Avadhanam, David Zhang, Vincent Cheng, Brad Ma,
  Evan Fu, Liam Do, Joshua Lass, Hubert Yang, Surya Sunkari, Vishruth Bharath, Violet Ai, James
  Leung, Rishit Agrawal, Alan Zhou, Kevin Chen, Tejas Kalpathi, Ziqi Xu, Gavin Wang, Tyler Xiao,
  Erik Maung, Sam Lee, Ryan Yang, Roy Yue, Ben Zhao, Julia Yoon, Sunny Sun, Aryan Singh,
  Ethan Luo, Clark Peng, Tyler Osbey, Taozhi Wang, Daryl Echeazu, Hubert Yang, Timothy Wu,
  Spandan Patel, Vidhi Kulkarni, Vijaykaarti Sundarapandiyan, Ashley Zhang, Andrew Le, Zafir
  Nasim, Srikar Yalam, Ritesh Kasamsetty, Soham Samal, Hubert Yang, David Sun, Nihar Shah,
  Abhijeet Saha, Alex Zhang, Leon Nguyen, Laasya Nagumalli, Kaixin Wang, Alan Zhou, Aidan
  Wu, Jason Luo, Anwith Telluri, Summer Yue, Alexandr Wang, and Dan Hendrycks. Humanity’s
  last exam, 2025. URL https://arxiv.org/abs/2501.14249.

Runnan Qi, Yanan Ni, Lumin Jiang, Zongyuan Li, Kuihua Huang, and Xian Guo. Memory-augmented
  state machine prompting: A novel llm agent framework for real-time strategy games. CoRR,
  abs/2510.18395, 2025. URL https://arxiv.org/abs/2510.18395.

Preston Rasmussen, Pavlo Paliychuk, Travis Beauvais, Jack Ryan, and Daniel Chalef. Zep: A
  temporal knowledge graph architecture for agent memory, 2025. URL https://arxiv.org/abs/
  2501.13956.


Adam Santoro, Ryan Faulkner, David Raposo, Jack Rae, Mike Chrzanowski, Théophane Weber,
  Daan Wierstra, Oriol Vinyals, Razvan Pascanu, and Timothy Lillicrap. Relational recurrent neural
  networks. In Proceedings of the 32nd International Conference on Neural Information Processing
 Systems, NIPS’18, pp. 7310–7321, Red Hook, NY, USA, 2018. Curran Associates Inc.


                                               21
Preprint. Work in progress.




Ming-Tung Shen and Yuh-Jzer Joung. Talm: Dynamic tree-structured multi-agent framework
 with long-term memory for scalable code generation. CoRR, abs/2510.23010, 2025. URL
 https://arxiv.org/abs/2510.23010.

Alina Shutova, Vladimir Malinovskii, Vage Egiazarian, Denis Kuznedelev, Denis Mazur, Surkov
  Nikita, Ivan Ermakov, and Dan Alistarh. Cache me if you must: Adaptive key-value quantization
  for large language models. In Forty-second International Conference on Machine Learning, 2025.
  URL https://openreview.net/forum?id=COowwJOAZi.
Haoran Sun and Shaoning Zeng. Hierarchical memory for high-efficiency long-term reasoning in llm
  agents. CoRR, abs/2507.22925, 2025. URL https://arxiv.org/abs/2507.22925.
Atakan Tekparmak and Ömer Kaya. mem-agent: Equipping llm agents with memory using rl, Octo-
  ber 2025. URL https://huggingface.co/blog/driaforall/mem-agent-blog. Community
  Article.
Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Łukasz
  Kaiser, and Illia Polosukhin. Attention is all you need. In Proceedings of the 31st International
  Conference on Neural Information Processing Systems, NIPS’17, pp. 6000–6010, Red Hook, NY,
  USA, 2017. Curran Associates Inc. ISBN 9781510860964.
Luanbo Wan and Weizhi Ma. Storybench: A dynamic benchmark for evaluating long-term memory
  with multi turns. CoRR, 2025.
Bo Wang, Heyan Huang, Yixin Cao, Jiahao Ying, Wei Tang, and Chong Feng. Qrmem: Unleash the
  length limitation through question then reflection memory mechanism. In Findings of the Associa-
  tion for Computational Linguistics: EMNLP 2024, pp. 4837–4851, Miami, Florida, USA, Novem-
  ber 2024a. Association for Computational Linguistics. doi: 10.18653/v1/2024.findings-emnlp.278.
  URL https://aclanthology.org/2024.findings-emnlp.278/.
Qingyue Wang, Yanhe Fu, Yanan Cao, Shuai Wang, Zhiliang Tian, and Liang Ding. Recursively
  summarizing enables long-term dialogue memory in large language models. Neurocomputing,
  639:130193, 2025a. ISSN 0925-2312. doi: https://doi.org/10.1016/j.neucom.2025.130193. URL
  https://www.sciencedirect.com/science/article/pii/S0925231225008653.

Yu Wang, Yifan Gao, Xiusi Chen, Haoming Jiang, Shiyang Li, Jingfeng Yang, Qingyu Yin, Zheng Li,
  Xian Li, Bing Yin, Jingbo Shang, and Julian J. McAuley. MEMORYLLM: towards self-updatable
  large language models. In Forty-first International Conference on Machine Learning, ICML 2024,
  Vienna, Austria, July 21-27, 2024. OpenReview.net, 2024b. URL https://openreview.net/
  forum?id=p0lKWzdikQ.

Yu Wang, Dmitry Krotov, Yuanzhe Hu, Yifan Gao, Wangchunshu Zhou, Julian McAuley, Dan
  Gutfreund, Rogerio Feris, and Zexue He. M+: Extending memoryllm with scalable long-term
  memory, 2025b. URL https://arxiv.org/abs/2502.00592.
Zixuan Wang, Bo Yu, Junzhe Zhao, Wenhao Sun, Sai Hou, Shuai Liang, Xing Hu, Yinhe Han, and
  Yiming Gan. Karma: Augmenting embodied ai agents with long-and-short term memory systems.
  CoRR, abs/2409.14908, 2024c. URL https://arxiv.org/abs/2409.14908.
Tianxin Wei, Noveen Sachdeva, Benjamin Coleman, Zhankui He, Yuanchen Bei, Xuying Ning,
  Mengting Ai, Yunzhe Li, Jingrui He, Ed H. Chi, Chi Wang, Shuo Chen, Fernando Pereira, Wang-
  Cheng Kang, and Derek Zhiyuan Cheng. Evo-memory: Benchmarking llm agent test-time learning
  with self-evolving memory. arXiv preprint arXiv:2511.20857, 2025.
Di Wu, Hongwei Wang, Wenhao Yu, Yuwei Zhang, Kai-Wei Chang, and Dong Yu. Longmemeval:
  Benchmarking chat assistants on long-term interactive memory. CoRR, 2024. URL https:
  //arxiv.org/abs/2410.10813.

Qingyang Wu, Zhenzhong Lan, Kun Qian, Jing Gu, Alborz Geramifard, and Zhou Yu. Memformer:
  A memory-augmented transformer for sequence modeling. In Findings of the Association for
  Computational Linguistics: AACL-IJCNLP 2022, pp. 308–318, Online only, November 2022.
  Association for Computational Linguistics. doi: 10.18653/v1/2022.findings-aacl.29. URL https:
  //aclanthology.org/2022.findings-aacl.29/.


                                                22
Preprint. Work in progress.




Guangxuan Xiao, Yuandong Tian, Beidi Chen, Song Han, and Mike Lewis. Efficient streaming
  language models with attention sinks. arXiv, 2023.

Jing Xu, Arthur Szlam, and Jason Weston. Beyond goldfish memory: Long-term open-domain
   conversation. In Smaranda Muresan, Preslav Nakov, and Aline Villavicencio (eds.), Proceedings of
   the 60th Annual Meeting of the Association for Computational Linguistics (Volume 1: Long Papers),
   pp. 5180–5197, Dublin, Ireland, May 2022. Association for Computational Linguistics. doi:
  10.18653/v1/2022.acl-long.356. URL https://aclanthology.org/2022.acl-long.356/.

Wujiang Xu, Zujie Liang, Kai Mei, Hang Gao, Juntao Tan, and Yongfeng Zhang. A-mem: Agentic
 memory for llm agents. CoRR, abs/2502.12110, 2025. URL https://arxiv.org/abs/2502.
 12110.

Sikuan Yan, Xiufeng Yang, Zuchao Huang, Ercong Nie, Zifeng Ding, Zonggen Li, Xiaowen Ma,
  Jinhe Bi, Kristian Kersting, Jeff Z. Pan, Hinrich Schütze, Volker Tresp, and Yunpu Ma. Memory-r1:
  Enhancing large language model agents to manage and utilize memories via reinforcement learning.
  CoRR, 2026. URL https://arxiv.org/abs/2508.19828.

An Yang, Bowen Yu, Chengyuan Li, Dayiheng Liu, Fei Huang, Haoyan Huang, Jiandong Jiang,
 Jianhong Tu, Jianwei Zhang, Jingren Zhou, Junyang Lin, Kai Dang, Kexin Yang, Le Yu, Mei
  Li, Minmin Sun, Qin Zhu, Rui Men, Tao He, Weijia Xu, Wenbiao Yin, Wenyuan Yu, Xiafei Qiu,
 Xingzhang Ren, Xinlong Yang, Yong Li, Zhiying Xu, and Zipeng Zhang. Qwen2.5-1m technical
  report, 2025. URL https://arxiv.org/abs/2501.15383.

Ningning Zhang, Xingxing Yang, Zhizhong Tan, Weiping Deng, and Wenyong Wang. Himem:
  Hierarchical long-term memory for llm long-horizon agents. CoRR, abs/2601.06377, 2026a. URL
  https://arxiv.org/abs/2601.06377.

Qiang Zhang, Jason Naradowsky, and Yusuke Miyao. Mind the gap between conversations for
  improved long-term dialogue generation. In Houda Bouamor, Juan Pino, and Kalika Bali (eds.),
  Findings of the Association for Computational Linguistics: EMNLP 2023, pp. 10735–10762,
  Singapore, December 2023a. Association for Computational Linguistics. doi: 10.18653/v1/2023.
  findings-emnlp.720. URL https://aclanthology.org/2023.findings-emnlp.720/.

Qizheng Zhang, Changran Hu, Shubhangi Upasani, Boyuan Ma, Fenglu Hong, Vamsidhar Kamanuru,
  Jay Rainton, Chen Wu, Mengmeng Ji, Hanchen Li, Urmish Thakker, James Zou, and Kunle
  Olukotun. Agentic context engineering: Evolving contexts for self-improving language models. In
  International Conference on Learning Representations, 2026b. URL https://arxiv.org/abs/
  2510.04618.

Yujie Zhang, Weikang Yuan, and Zhuoren Jiang. Bridging intuitive associations and deliberate recall:
  Empowering LLM personal assistant with graph-structured long-term memory. In Wanxiang
  Che, Joyce Nabende, Ekaterina Shutova, and Mohammad Taher Pilehvar (eds.), Findings of the
  Association for Computational Linguistics: ACL 2025, pp. 17533–17547, Vienna, Austria, July
  2025. Association for Computational Linguistics. ISBN 979-8-89176-256-5. doi: 10.18653/v1/
  2025.findings-acl.901. URL https://aclanthology.org/2025.findings-acl.901/.

Zhenyu Zhang, Ying Sheng, Tianyi Zhou, Tianlong Chen, Lianmin Zheng, Ruisi Cai, Zhao Song,
  Yuandong Tian, Christopher Ré, Clark Barrett, Zhangyang Wang, and Beidi Chen. H2o: heavy-
  hitter oracle for efficient generative inference of large language models. In Proceedings of the 37th
  International Conference on Neural Information Processing Systems, NIPS ’23, Red Hook, NY,
  USA, 2023b. Curran Associates Inc.

Lianmin Zheng, Wei-Lin Chiang, Ying Sheng, Siyuan Zhuang, Zhanghao Wu, Yonghao Zhuang,
  Zi Lin, Zhuohan Li, Dacheng Li, Eric Xing, et al. Judging llm-as-a-judge with mt-bench and
  chatbot arena. Advances in Neural Information Processing Systems, 36:46595–46623, 2023.

Sizhe Zhou and Jiawei Han. A simple yet strong baseline for long-term conversational memory of
  llm agents. arXiv preprint arXiv:2511.17208, 2025.

                                                 23
Preprint. Work in progress.




A    D ETAILS ON DATA C OLLECTION
In this section, we describe the data gathering protocol for each task subset in StructMemEval. Our
approach consists of the following stages: i) manually create initial scenarios to test their feasibility
for different memory types, ii) use LLM augmentations to create multiple similar scenarios and
additional evaluaiton questions iii) manually verify the resulting scenarios to fix hallucinations and
make sure that the reference answers are valid. However, there are slight variations in methodology
depending on the task at hand. We also use 3 different LLMs for augmentation to reduce the risk of
style contamination implicitly favoring one model over another (Panickssery et al., 2024).
Accounting problems: we start by manually specifying examples of transactions (e.g. ”Alice
gave Bob $N for ...”), then use deepseek/deepseek-v3.1-terminus to generate more transactions
similar to the manually created ones. We also introduce unrelated messages, creating scenarios with
around 10%, 30% and 50% unrelated messages (5 unique scenarios each, for a total of 15). For
these tasks, the only task for the model is to determine the final settlement between parties (with
netting) and test if it matches the correct one. We ask for the total settlement amounts multiple times
after certain numbers of transactions (conversation depth) to create tasks of different complexity. To
determine the reference settlement, we run the same LLM in agentic setup, giving it tools to compute
settlement from individual transactions, then verify and correct answers manually. This is because,
without tools and verification, even full-context reference LLM sometimes hallucinates transactions.
Recommendation problems: for this subset, we consider tasks where the LLM assistant interacts
with a user who watches movies, reads books or attends other activities over a prolonged period of
time, after which the agent must decide what activities the user tried more and which ones did they
like more on average, expecting an exact numeric answer. This task is difficult for retrieval-augmented
LLMs since they can’t calculate statistics for top-k search results if the sample size is larger than k. To
gather these tasks, we follow a similar pattern to how we did accounting problems, except that we use
qwen/qwen3-max to generate dialogues, then verify with deepseek/deepseek-v3.1-terminus.

Tree-based problems: for relations and family tree tasks, we first generate a reference graph
corresponding to a family tree where each node corresponds to a person. For simplicity, we ensure
that all persons have unique names to avoid confusion. For each graph, we pick pairs of nodes for
which there is a unique shortest path between them that has 10 hops (11 nodes visited). Then, we
create subsets of graphs containing 10, 20, 30, 40, 50, 100, 150, 200 and 250 links (encoded as
messages). We ensure that each subset includes the shortest path between the pair of nodes that we
picked previously. After the agent processes these messages, we ask it to find the shortest path. For
augmentation, we use the same DeepSeek model as in the accounting subset, but we allow tool use.
State tracking problems: finally, we gather tasks that require the agent to track state changes.
Overall, we adopt a similar pipeline to our accounting tasks, but using anthropic/claude-opus-
4.5 (through Claude Code) for data augmentation. For this evaluation, we start with control tasks
with no 0 changes (“static”) and consider progressively more complex transitions up to 5 state
changes. Tasks with 1 transition have one state change that affects the final outcome, such as with
the “I owe $X to my neighbor; I moved to a different city Y, do I owe something to my neighbor?”,
and subsequent difficulty levels feature multiple such transitions, all of which are necessary to solve
the problem. Unlike accounting tasks, we do not reuse conversations between difficulty levels and
instead create different unique conversations for each number of transitions. Table 1 summarizes data
collection statistics. Curiously, note that the conversations with 2 state transitions are shorter than 1
transition tasks in terms of the average number of messages, but models still find them more difficult.
                       Table 1: Data gathering statistics for state tracking problems.
 Difficulty    Files      Sessions    Total Msgs    User Msgs     Avg. msgs/session      Avg. msgs/file
 static            7            15           150            75                   10.0               10.7
 1tr               7            35           219           110                    6.3               15.7
 2tr               7            36           188            94                    5.2               13.4
 3tr               7            49           238           119                    4.9               17.0
 4tr               7            59           296           148                    5.0               21.1
 5tr               7            73           362           181                    5.0               25.9
 TOTAL           42            267          1453           727                    5.4               17.3



                                                     24
Preprint. Work in progress.




B        D ETAILS ON M EMORY F RAMEWORKS
In Section 4, we evaluate the following LLM configurations:
• Retrieval-augmented LLM: we considered several implementations for purely retrieval-
  augmented LLMs and eventually found that Mem0’s built-in retrieval module over OpenAI’s
  text-embedding-3-large embeddings works well on standard benchmarks. To evaluate this
  configuration, we use Mem0 codebase3 version 1.0.2, run the built-in search module, then feed the
  search results into the main LLM to compose the final answer. We search as follows:

 import mem0
 m = mem0.memory.main.Memory(
   mem0.configs.base.MemoryConfig(
     llm=mem0.llms.configs.LlmConfig(provider=..., model=..., api_key=...), # main LLM
     embedder=mem0.embeddings.configs.EmbedderConfig(
        provider="openai", config={"model": "text-embedding-3-large", "api_key":...}),
     vector_db=mem0.vector_stores.configs.VectorStoreConfig(
        provider="qdrant", config={"collection_name": ..., "path": ..., # random uid
        "embedding_model_dims": 3072},
     )
   )
 )
 m.reset()
 m.add(FEED_CONVERSATION_HERE, user_id="same_user_everywhere", infer=False)
 results = m.search(question, user_id="same_user_everywhere", limit=TOP_K_LIMIT_HERE)

• Mem-agent memory: for a simple abstract memory framework, we use the markdown-based
  memory from Tekparmak & Ömer Kaya (2025) using their official codebase4 . This memory frame-
  work allows the agent to create, modify and retrieve any number of markdown files locally. While
  the original study focuses on teaching small LLMs (Qwen3-4B) to use this memory, we found that
  google/gemini-2.5-pro can already use the memory well with the prompt alone: it solves simple
  retrieval tasks well and, when it fails on our tasks, it is because of a knowledge organization error
  or hallucination, not failure to use the framework itself. Our main rationale for experimenting with
  Mem-agent is that it is extremely easy to use: pure-python using files, no need to spin up services be-
  fore use. However, as our experiments demonstrate, it can implement proper memory organization
  patterns when hinted to do so, which means that it is flexible enough for our tasks. When evaluating
  mem-agent, we instantiate mem_agent = agent.agent.Agent(model=MAIN_LLM_HERE) and
  use mem_agent.chat(input_shard) to both encode memory and answer questions. Crucially,
  we clear agent’s recent message history (mem_agent.messages = mem_agent.messages[:1])
  after each conversation message. That way, we can be certain that the agent answers the question
  from memory, not by directly accessing conversation history. This corresponds to a use case where
  the messages are spread over multiple conversations over a long time-frame and are not neatly
  packed into one session. When evaluating with hints, we additionally modify the agent’s system
  prompt (first message) and append the task-specific hint after the default mem-agent prompt.
• Mem0 agentic memory: Finally, we evaluate the full agentic Mem0 memory. For this evaluation, we
  use the same search module as in our earlier retrieval-baed evaluation, but we allow the LLM to
  decide which memories to store and how to formulate questions for retrieval, allowing the LLM to
  create, manage and retrieve memories. We use the official codebase (Chhikara et al., 2025) with de-
  fault parameters. Note that both Mem0 and other frameworks will likely work better after tuning.

On the (lack of) hyperparameter tuning. In this initial evaluation, we deliberately evaluate memory
as is with minimal tuning. We urge the readers not to draw conclusions such as “Memory A is better
than memory B because of this experiment.” There are two main reasons for this:

• Framework configuraiton: Popular long-term memory frameworks typically have a large number
  of “knobs” to tune to optimize the framework for the given task. We avoid this in our initial analysis.

• Model dependency: we run our experiments with gemini-2.5-pro with some additional experi-
  ments with gemini-3-pro and gpt-4o-mini in Appendix C. Other models can score differently.
    3
        https://github.com/mem0ai/mem0
    4
        https://github.com/firstbatchxyz/mem-agent


                                                  25
Preprint. Work in progress.




C     A DDITIONAL M ODEL E VALUATION
C.1     C OUNT- BASED TASKS

Table 2: Early evaluation for gemini-2.5-pro and different retrieval budgets on count-based tasks
for 10% and 30% noise (we omit 50% as non-informative). Agentic memory fares poorly across all
budgets due to hallucinations. Gemini 3 pro scores significantly higher (see Table 3 below).

            Noise level                          10%                        30%                 Average
            Transactions                  10      20     50          10      20    50     10      20 50
            Retrieval (top-5)              0      0       0           0      0     0       0        0        0
            Retrieval (top-10)            0.6     0       0          0.6     0     0      0.6       0        0
            Retrieval (top-20)            1.0    0.4      0          0.6    0.6    0      0.8      0.5       0
            mem-agent (w/o hint)           0      0       0           0      0     0       0        0        0
            mem-agent (with hint)         0.2     0       0          0.2    0.2    0      0.2      0.1       0

Table 3: Detailed evaluation for gemini-3-pro and different retrieval budgets on count-based tasks.

    Noise level                     10%                  30%                       50%                      Average
    Transactions              10     20 50         10     20 50              10     20 50              10     20    50
    Retrieval (top-5)          0     0      0       0      0          0      0.6    0      0        0.2        0      0
    Retrieval (top-10)         1     0      0       1      0          0       1    0.6     0         1        0.2     0
    Retrieval (top-20)         1    0.6     0       1     0.6         0       1     1      0         1       0.73     0
    mem-agent (w/o hint)      0.8   0.6    0.2     0.8    0.6         0      0.6   0.8    0.4      0.73      0.67   0.20
    mem-agent (with hint)     0.8   0.8    0.4      1     0.6        0.2     0.8   0.4    0.4      0.67      0.47   0.27



C.2     S TATE T RACKING TASKS

Table 4: Accuracy on state tracking tasks by model, tr is the number of relevant state transitions.
Per-transition results are noisy due to small sample. Avg. is the mean accuracy over all scenarios.

    Model            Memory System                0tr.        1tr.         2tr.    3tr.         4tr.        5tr.    Avg.
                     retrieval (top-5)           86%      43%               0%     14%       0%              0%     24%
                     retrieval (top-20)          86%      71%              43%     29%      14%              0%     40%
                     mem-agent (w/o hint)        71%      43%              86%     29%      71%              43%    57%
    gpt-4o-mini      mem-agent (with hint)       86%      71%              86%     43%      57%             100%    74%
                     Mem0 agent (w/o hint)       71%      57%              29%     14%      0%                0%    29%
                     Mem0 agent (with hint)      43%      57%              71%     71%      71%              43%    60%
                     retrieval (top-5)           86%      29%               0%     14%       0%             0%      21%
                     retrieval (top-20)          71%      71%              14%      0%       0%             0%      26%
                     mem-agent (no hint)         57%      71%              100%    71%      57%             29%     64%
    gemini-2.5-pro
                     mem-agent (with hint)       71%      86%              71%     86%      86%             71%     79%
                     Mem0 agent (w/o hint)       86%      57%               71%    57%      43%             57%     62%
                     Mem0 agent (with hint)      71%      57%               86%    100%     86%             86%     81%
    gemini-3-flash   Mem0 agent (hint)           71%      100%             100%    100%     100%            100%    95%

D     E RROR A NALYSIS
We identified three categories of errors in the agentic memory files for the most demanding high
precision benchmark subset – accounting problems: 1) the omission of transactions, which was the
most common; 2) the duplication of existing transactions; and 3) most significantly, the hallucination
of transactions, as illustrated in Table 5.




                                                         26
Preprint. Work in progress.




Table 5: Example memory entries for mem-agent generated for accounting problem 11 with gemini-
2.5-pro. There is a transaction with the note “sandwich” – but no line in this conversation the word
“sandwich”, and there is no real transaction with its listed payer/amount. Moreover, the first and last
rows are duplicate entries for the same transaction.
               Payer     For Whom         Amount    Currency            Notes

               Bob       All               57           EUR               lunch
               Bob       All                51          EUR              snacks
               Alice     Alice, Bob         84          EUR              dinner
               Alice     All               120          EUR           train tickets
               Charlie   Bob, Charlie       60          EUR             groceries
               Alice     All                45          EUR         Museum entry
               Charlie   All                75          EUR              Lunch
               Alice     Alice, Charlie    -15          EUR    refund on museum tickets
               Bob       All                30          EUR                taxi
               Alice     All                90          EUR              Dinner
               Bob       Alice, Bob         36          EUR             breakfast
               Alice     Bob                15          EUR            sandwich
               Bob       All               57           EUR               lunch




                                                   27
