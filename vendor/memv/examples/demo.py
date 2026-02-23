"""
memv Demo
================

This demo shows how memv extracts and retrieves knowledge from conversations.

Key concepts demonstrated:
1. Setting up Memory with embedding and LLM clients
2. Adding conversation exchanges
3. Processing conversations to extract semantic knowledge (predict-calibrate)
4. Retrieving relevant context for new queries
5. Using retrieved context in LLM prompts

Run with:
    uv run python examples/demo.py

Requires:
    - OPENAI_API_KEY environment variable
"""

import asyncio
from datetime import datetime, timedelta, timezone

from memv import Memory
from memv.embeddings import OpenAIEmbedAdapter
from memv.llm import PydanticAIAdapter


async def main():
    # =========================================================================
    # SETUP
    # =========================================================================

    print("=" * 70)
    print("memv Demo")
    print("=" * 70)

    # Initialize clients
    # - Embeddings: for semantic search (vector similarity)
    # - LLM: for episode generation and knowledge extraction
    embedder = OpenAIEmbedAdapter()  # Uses text-embedding-3-small by default
    llm = PydanticAIAdapter("openai:gpt-4o-mini")

    # Create memory instance
    # - db_path: SQLite database file (created if doesn't exist)
    # - embedding_client: for creating embeddings
    # - llm_client: for processing (episode generation, knowledge extraction)
    async with Memory(
        db_path=".db/demo_memory.db",
        embedding_client=embedder,
        llm_client=llm,
    ) as memory:
        user_id = "demo-user"
        base_time = datetime.now(timezone.utc)

        # =====================================================================
        # CONVERSATION 1: User's job
        # =====================================================================

        print("\n[Conversation 1: User's job]")
        print("-" * 50)

        exchanges_1 = [
            ("I just started a new job at Anthropic!", "Congratulations! What will you be doing there?"),
            (
                "I'm working on AI safety research. It's been a dream of mine.",
                "That sounds amazing! AI safety is such important work.",
            ),
            ("Yeah, I moved to San Francisco for it. Left my old job at Google.", "Big change! How are you finding SF so far?"),
        ]

        for i, (user_msg, assistant_msg) in enumerate(exchanges_1):
            msg_time = base_time + timedelta(minutes=i)
            print(f"  User: {user_msg}")
            print(f"  Assistant: {assistant_msg}")
            await memory.add_exchange(
                user_id=user_id,
                user_message=user_msg,
                assistant_message=assistant_msg,
                timestamp=msg_time,
            )

        # =====================================================================
        # CONVERSATION 2: User's preferences (different topic)
        # =====================================================================

        print("\n[Conversation 2: User's preferences]")
        print("-" * 50)

        # Simulate time passing
        base_time_2 = base_time + timedelta(hours=2)

        exchanges_2 = [
            ("By the way, can you recommend a good coffee shop?", "Sure! What kind of coffee do you prefer?"),
            ("I love oat milk lattes. And I prefer quiet places to work.", "Got it - quiet spots with good oat milk options."),
            ("Also, I'm vegetarian, so bonus points if they have good food.", "I'll keep that in mind for recommendations!"),
        ]

        for i, (user_msg, assistant_msg) in enumerate(exchanges_2):
            msg_time = base_time_2 + timedelta(minutes=i)
            print(f"  User: {user_msg}")
            print(f"  Assistant: {assistant_msg}")
            await memory.add_exchange(
                user_id=user_id,
                user_message=user_msg,
                assistant_message=assistant_msg,
                timestamp=msg_time,
            )

        # =====================================================================
        # PROCESS: Extract knowledge using predict-calibrate
        # =====================================================================

        print("\n[Processing conversations...]")
        print("-" * 50)

        # This runs the predict-calibrate pipeline:
        # 1. Segment messages into episodes (topic-based)
        # 2. Generate episode narratives
        # 3. For each episode:
        #    a. Predict what the episode should contain (from existing knowledge)
        #    b. Compare prediction to actual content
        #    c. Extract only novel knowledge (what prediction missed)

        extracted_count = await memory.process(user_id)
        print(f"  Extracted {extracted_count} knowledge entries")

        # =====================================================================
        # RETRIEVE: Query the memory
        # =====================================================================

        print("\n[Retrieval Demo]")
        print("-" * 50)

        # Query 1: Where does the user work?
        query1 = "Where does the user work?"
        print(f"\nQuery: '{query1}'")
        result1 = await memory.retrieve(query1, user_id=user_id, top_k=3)
        print(result1.to_prompt())

        # Query 2: What are the user's food preferences?
        query2 = "What are the user's dietary preferences?"
        print(f"\nQuery: '{query2}'")
        result2 = await memory.retrieve(query2, user_id=user_id, top_k=3)
        print(result2.to_prompt())

        # Query 3: Where did the user live before?
        query3 = "Where did the user move from?"
        print(f"\nQuery: '{query3}'")
        result3 = await memory.retrieve(query3, user_id=user_id, top_k=3)
        print(result3.to_prompt())

        # =====================================================================
        # USING CONTEXT IN AN LLM PROMPT
        # =====================================================================

        print("\n[Using Memory in LLM Prompts]")
        print("-" * 50)

        # This is how you'd use retrieved context in a real agent:
        new_user_message = "Can you suggest a lunch spot near my office?"

        # 1. Retrieve relevant context
        context = await memory.retrieve(new_user_message, user_id=user_id, top_k=5)

        # 2. Build prompt with context
        system_prompt = f"""You are a helpful assistant with memory of past conversations.

{context.to_prompt()}

Use the above context to personalize your responses. Reference specific details you know about the user when relevant."""

        print(f"\nUser asks: '{new_user_message}'")
        print("\nSystem prompt with memory context:")
        print("-" * 40)
        print(system_prompt)
        print("-" * 40)

        print("\n[Demo Complete]")
        print("=" * 70)
        print("\nKey takeaways:")
        print("1. Memory extracts persistent facts from conversations")
        print("2. Predict-calibrate avoids re-extracting known information")
        print("3. Hybrid search (vector + BM25) finds relevant context")
        print("4. to_prompt() formats context for LLM injection")
        print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
