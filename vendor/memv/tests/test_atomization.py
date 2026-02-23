"""Tests for atomization: validation filter + prompt integration."""

import json
from datetime import datetime, timedelta, timezone

from memv.memory.memory import Memory
from memv.models import ExtractedKnowledge
from memv.processing.extraction import ExtractionResponse
from memv.processing.prompts import (
    ATOMIZATION_RULES,
    cold_start_extraction_prompt,
    extraction_prompt_with_prediction,
)

from .conftest import MockEmbedder, MockLLM


def _ts(minutes: int = 0) -> datetime:
    return datetime(2024, 6, 15, 12, 0, 0, tzinfo=timezone.utc) + timedelta(minutes=minutes)


def _episode_json(title="Test Episode", content="A test narrative."):
    return json.dumps({"title": title, "content": content})


def _extraction(items: list[ExtractedKnowledge]) -> ExtractionResponse:
    return ExtractionResponse(extracted=items)


def _make_memory(tmp_path, llm, embedder):
    db_path = str(tmp_path / "atom.db")
    return Memory(
        db_path=db_path,
        embedding_client=embedder,
        llm_client=llm,
        embedding_dimensions=1536,
        enable_episode_merging=False,
        enable_embedding_cache=False,
    )


# ---------------------------------------------------------------------------
# Confidence threshold
# ---------------------------------------------------------------------------


async def test_rejects_low_confidence(tmp_path):
    """Low-confidence items rejected."""
    llm = MockLLM()
    embedder = MockEmbedder()

    llm.set_responses("generate", [_episode_json()])
    llm.set_responses(
        "generate_structured",
        [_extraction([ExtractedKnowledge(statement="User might like Rust", knowledge_type="new", confidence=0.3)])],
    )

    memory = _make_memory(tmp_path, llm, embedder)
    async with memory:
        await memory.add_exchange("user1", "Maybe Rust?", "Interesting!", timestamp=_ts())
        count = await memory.process("user1")
        assert count == 0


async def test_accepts_high_confidence(tmp_path):
    """Statement with confidence >= 0.7 passes."""
    llm = MockLLM()
    embedder = MockEmbedder()

    llm.set_responses("generate", [_episode_json()])
    llm.set_responses(
        "generate_structured",
        [
            _extraction(
                [ExtractedKnowledge(statement="User prefers Python for backend development", knowledge_type="new", confidence=0.9)]
            )
        ],
    )

    memory = _make_memory(tmp_path, llm, embedder)
    async with memory:
        await memory.add_exchange("user1", "I prefer Python for backend", "Good choice!", timestamp=_ts())
        count = await memory.process("user1")
        assert count == 1


async def test_accepts_assistant_communicated_fact(tmp_path):
    """Facts communicated by the assistant (dates, appointments) are accepted."""
    llm = MockLLM()
    embedder = MockEmbedder()

    llm.set_responses("generate", [_episode_json()])
    llm.set_responses(
        "generate_structured",
        [
            _extraction(
                [
                    ExtractedKnowledge(
                        statement="User's dentist appointment was moved to March 15, 2024", knowledge_type="new", confidence=0.9
                    )
                ]
            )
        ],
    )

    memory = _make_memory(tmp_path, llm, embedder)
    async with memory:
        await memory.add_exchange("user1", "When is my appointment?", "It was moved to March 15", timestamp=_ts())
        count = await memory.process("user1")
        assert count == 1

        result = await memory.retrieve("dentist appointment", user_id="user1")
        assert "March 15, 2024" in result.retrieved_knowledge[0].statement


async def test_confidence_boundary(tmp_path):
    """Confidence exactly at 0.7 passes, below does not."""
    llm = MockLLM()
    embedder = MockEmbedder()

    llm.set_responses("generate", [_episode_json()])
    llm.set_responses(
        "generate_structured",
        [
            _extraction(
                [
                    ExtractedKnowledge(statement="User works at Vstorm", knowledge_type="new", confidence=0.7),
                    ExtractedKnowledge(statement="User likes tea", knowledge_type="new", confidence=0.69),
                ]
            )
        ],
    )

    memory = _make_memory(tmp_path, llm, embedder)
    async with memory:
        await memory.add_exchange("user1", "I work at Vstorm and like tea", "Nice!", timestamp=_ts())
        count = await memory.process("user1")
        assert count == 1

        result = await memory.retrieve("Vstorm", user_id="user1")
        assert result.retrieved_knowledge[0].statement == "User works at Vstorm"


# ---------------------------------------------------------------------------
# Temporal backfill
# ---------------------------------------------------------------------------


async def test_temporal_backfill_in_pipeline(tmp_path):
    """temporal_info 'since January 2024' backfills valid_at when LLM leaves it None."""
    llm = MockLLM()
    embedder = MockEmbedder()

    llm.set_responses("generate", [_episode_json()])
    llm.set_responses(
        "generate_structured",
        [
            _extraction(
                [
                    ExtractedKnowledge(
                        statement="User works at Vstorm",
                        knowledge_type="new",
                        confidence=0.9,
                        temporal_info="since January 2024",
                        valid_at=None,
                        invalid_at=None,
                    )
                ]
            )
        ],
    )

    memory = _make_memory(tmp_path, llm, embedder)
    async with memory:
        await memory.add_exchange("user1", "I work at Vstorm since Jan 2024", "Nice!", timestamp=_ts())
        count = await memory.process("user1")
        assert count == 1

        result = await memory.retrieve("Vstorm", user_id="user1")
        knowledge = result.retrieved_knowledge[0]
        assert knowledge.valid_at is not None
        assert knowledge.valid_at.year == 2024
        assert knowledge.valid_at.month == 1


# ---------------------------------------------------------------------------
# Prompt content assertions
# ---------------------------------------------------------------------------


class TestPromptContent:
    def test_cold_start_contains_atomization_rules(self):
        prompt = cold_start_extraction_prompt("Test", [{"role": "user", "content": "hi"}], "2024-06-15T12:00:00Z")
        assert "Self-Contained Statement Rules" in prompt
        assert "PROHIBIT" in prompt

    def test_warm_extraction_contains_atomization_rules(self):
        prompt = extraction_prompt_with_prediction("prediction", ">>> USER: hi", "2024-06-15T12:00:00Z")
        assert "Self-Contained Statement Rules" in prompt
        assert "PROHIBIT" in prompt

    def test_cold_start_contains_strong_timestamp_wording(self):
        prompt = cold_start_extraction_prompt("Test", [{"role": "user", "content": "hi"}], "2024-06-15T12:00:00Z")
        assert "are INVALID" in prompt

    def test_warm_extraction_contains_strong_timestamp_wording(self):
        prompt = extraction_prompt_with_prediction("prediction", ">>> USER: hi", "2024-06-15T12:00:00Z")
        assert "are INVALID" in prompt

    def test_atomization_rules_constant_exists(self):
        assert "Self-Contained Statement Rules" in ATOMIZATION_RULES
