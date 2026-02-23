"""End-to-end tests for the Memory class."""

import json
from datetime import datetime, timedelta, timezone

from memv.memory.memory import Memory
from memv.models import ExtractedKnowledge
from memv.processing.extraction import ExtractionResponse

from .conftest import MockEmbedder, MockLLM


def _ts(minutes: int = 0) -> datetime:
    return datetime(2024, 6, 15, 12, 0, 0, tzinfo=timezone.utc) + timedelta(minutes=minutes)


def _episode_json(title="Test Episode", content="A test narrative."):
    return json.dumps({"title": title, "content": content})


def _extraction(statements: list[str]) -> ExtractionResponse:
    return ExtractionResponse(extracted=[ExtractedKnowledge(statement=s, knowledge_type="new", confidence=0.9) for s in statements])


def _make_memory(tmp_path, llm, embedder, **kwargs):
    db_path = str(tmp_path / "e2e.db")
    return Memory(
        db_path=db_path,
        embedding_client=embedder,
        llm_client=llm,
        embedding_dimensions=1536,
        enable_episode_merging=False,
        enable_embedding_cache=False,
        **kwargs,
    )


async def test_full_cycle(tmp_path):
    """add_exchange -> process -> retrieve -> verify statement found."""
    llm = MockLLM()
    embedder = MockEmbedder()

    # add_exchange creates 2 msgs (<=2, segmenter skips LLM)
    # Pipeline: 1 generate (episode gen) + 1 structured (cold start extraction)
    llm.set_responses("generate", [_episode_json("Python Chat", "User discussed Python")])
    llm.set_responses("generate_structured", [_extraction(["User likes Python"])])

    memory = _make_memory(tmp_path, llm, embedder)
    async with memory:
        await memory.add_exchange("user1", "I like Python", "Great choice!", timestamp=_ts())
        count = await memory.process("user1")

        assert count == 1

        result = await memory.retrieve("User likes Python", user_id="user1")
        assert len(result.retrieved_knowledge) >= 1
        statements = [k.statement for k in result.retrieved_knowledge]
        assert "User likes Python" in statements


async def test_process_returns_count(tmp_path):
    llm = MockLLM()
    embedder = MockEmbedder()

    llm.set_responses("generate", [_episode_json()])
    llm.set_responses("generate_structured", [_extraction(["User knows Fact A", "User knows Fact B"])])

    memory = _make_memory(tmp_path, llm, embedder, enable_knowledge_dedup=False)
    async with memory:
        await memory.add_exchange("user1", "hi", "hello", timestamp=_ts())
        count = await memory.process("user1")
        assert count == 2


async def test_process_no_messages(tmp_path):
    llm = MockLLM()
    embedder = MockEmbedder()
    memory = _make_memory(tmp_path, llm, embedder)
    async with memory:
        count = await memory.process("user1")
        assert count == 0


async def test_multiple_exchanges(tmp_path):
    """4 messages → segmentation + episode gen + extraction."""
    llm = MockLLM()
    embedder = MockEmbedder()

    # 4 msgs with same timestamp → 1 time batch, >2 msgs → LLM segmentation
    # Segmenter groups all 4 together
    llm.set_responses(
        "generate",
        [
            json.dumps([[0, 1, 2, 3]]),  # segmentation: all in one group
            _episode_json("Multi Exchange", "Multiple exchanges"),  # episode gen
        ],
    )
    llm.set_responses("generate_structured", [_extraction(["User studies AI"])])

    memory = _make_memory(tmp_path, llm, embedder)
    async with memory:
        await memory.add_exchange("user1", "I study AI", "Interesting!", timestamp=_ts())
        await memory.add_exchange("user1", "It's fun", "Indeed!", timestamp=_ts(1))
        count = await memory.process("user1")

        assert count == 1
        # Verify: 1 segmentation + 1 episode gen = 2 generate calls
        assert len(llm.calls["generate"]) == 2


async def test_user_isolation_e2e(tmp_path):
    llm = MockLLM()
    embedder = MockEmbedder()

    # Two users, each gets episode gen + extraction
    llm.set_responses(
        "generate",
        [
            _episode_json("User1 Ep", "User1 narrative"),
            _episode_json("User2 Ep", "User2 narrative"),
        ],
    )
    llm.set_responses(
        "generate_structured",
        [
            _extraction(["User likes cats"]),
            _extraction(["User likes dogs"]),
        ],
    )

    memory = _make_memory(tmp_path, llm, embedder)
    async with memory:
        await memory.add_exchange("user1", "I like cats", "Nice!", timestamp=_ts())
        await memory.process("user1")
        await memory.add_exchange("user2", "I like dogs", "Cool!", timestamp=_ts())
        await memory.process("user2")

        r1 = await memory.retrieve("cats", user_id="user1")
        r2 = await memory.retrieve("dogs", user_id="user2")

        s1 = [k.statement for k in r1.retrieved_knowledge]
        s2 = [k.statement for k in r2.retrieved_knowledge]
        assert "User likes cats" in s1
        assert "User likes dogs" not in s1
        assert "User likes dogs" in s2
        assert "User likes cats" not in s2


async def test_clear_user(tmp_path):
    llm = MockLLM()
    embedder = MockEmbedder()

    llm.set_responses("generate", [_episode_json()])
    llm.set_responses("generate_structured", [_extraction(["User has a fact to delete"])])

    memory = _make_memory(tmp_path, llm, embedder)
    async with memory:
        await memory.add_exchange("user1", "hi", "hello", timestamp=_ts())
        await memory.process("user1")

        counts = await memory.clear_user("user1")
        assert counts["messages"] >= 2
        assert counts["episodes"] >= 1

        result = await memory.retrieve("User has a fact to delete", user_id="user1")
        assert len(result.retrieved_knowledge) == 0


async def test_to_prompt_integration(tmp_path):
    llm = MockLLM()
    embedder = MockEmbedder()

    llm.set_responses("generate", [_episode_json()])
    llm.set_responses("generate_structured", [_extraction(["User is an engineer"])])

    memory = _make_memory(tmp_path, llm, embedder)
    async with memory:
        await memory.add_exchange("user1", "I'm an engineer", "Cool!", timestamp=_ts())
        await memory.process("user1")

        result = await memory.retrieve("User is an engineer", user_id="user1")
        prompt = result.to_prompt()
        assert "## Relevant Context" in prompt
        assert "User is an engineer" in prompt


async def test_auto_process_at_threshold(tmp_path):
    """auto_process=True, batch_threshold=4 → 2 exchanges (4 msgs) trigger background processing."""
    llm = MockLLM()
    embedder = MockEmbedder()

    # 4 msgs with same timestamp → 1 time batch, >2 → LLM segmentation
    llm.set_responses(
        "generate",
        [
            json.dumps([[0, 1, 2, 3]]),  # segmentation
            _episode_json("Auto", "Auto processed"),  # episode gen
        ],
    )
    llm.set_responses("generate_structured", [_extraction(["User has auto fact"])])

    memory = _make_memory(tmp_path, llm, embedder, auto_process=True, batch_threshold=4)
    async with memory:
        await memory.add_exchange("user1", "msg1", "resp1", timestamp=_ts())
        # 2 msgs buffered, below threshold
        await memory.add_exchange("user1", "msg2", "resp2", timestamp=_ts(1))
        # 4 msgs buffered, at threshold → triggers background processing

        count = await memory.wait_for_processing("user1", timeout=10)
        assert count == 1

        result = await memory.retrieve("Auto fact", user_id="user1")
        assert len(result.retrieved_knowledge) >= 1


async def test_flush_forces_processing(tmp_path):
    """flush() processes below threshold."""
    llm = MockLLM()
    embedder = MockEmbedder()

    llm.set_responses("generate", [_episode_json("Flushed", "Flushed episode")])
    llm.set_responses("generate_structured", [_extraction(["User has flushed fact"])])

    memory = _make_memory(tmp_path, llm, embedder, auto_process=True, batch_threshold=100)
    async with memory:
        await memory.add_exchange("user1", "hi", "hello", timestamp=_ts())
        # Below threshold (2 < 100), but flush forces processing
        count = await memory.flush("user1")
        assert count == 1


async def test_confidence_filters_low_quality_statements(tmp_path):
    """Only statements with confidence >= 0.7 survive the pipeline filter."""
    llm = MockLLM()
    embedder = MockEmbedder()

    llm.set_responses("generate", [_episode_json("Mixed", "Mixed quality")])
    llm.set_responses(
        "generate_structured",
        [
            ExtractionResponse(
                extracted=[
                    ExtractedKnowledge(statement="User prefers Vim", knowledge_type="new", confidence=0.9),
                    ExtractedKnowledge(statement="User likes Emacs", knowledge_type="new", confidence=0.5),
                    ExtractedKnowledge(statement="User uses Neovim", knowledge_type="new", confidence=0.3),
                ]
            )
        ],
    )

    memory = _make_memory(tmp_path, llm, embedder)
    async with memory:
        await memory.add_exchange("user1", "I prefer Vim", "Nice!", timestamp=_ts())
        count = await memory.process("user1")
        assert count == 1

        result = await memory.retrieve("Vim", user_id="user1")
        assert result.retrieved_knowledge[0].statement == "User prefers Vim"


async def test_dedup_skips_duplicate(tmp_path):
    """enable_knowledge_dedup=True → identical statement not stored twice."""
    llm = MockLLM()
    embedder = MockEmbedder()

    # First process: episode gen (cold start, no prediction)
    # Second process: episode gen + prediction (existing knowledge exists)
    llm.set_responses(
        "generate",
        [
            _episode_json("Ep1", "First episode"),
            _episode_json("Ep2", "Second episode"),
            "I predict user likes Python.",  # prediction for second process
        ],
    )
    llm.set_responses(
        "generate_structured",
        [
            _extraction(["User likes Python"]),
            _extraction(["User likes Python"]),  # duplicate
        ],
    )

    memory = _make_memory(tmp_path, llm, embedder, enable_knowledge_dedup=True, knowledge_dedup_threshold=0.8)
    async with memory:
        await memory.add_exchange("user1", "I like Python", "Cool!", timestamp=_ts())
        count1 = await memory.process("user1")
        assert count1 == 1

        await memory.add_exchange("user1", "Python is great", "Indeed!", timestamp=_ts(60))
        count2 = await memory.process("user1")
        # Second extraction should be skipped as duplicate (identical embedding)
        assert count2 == 0
