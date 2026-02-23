from datetime import datetime, timedelta, timezone
from uuid import uuid4

from memv.models import (
    BiTemporalValidity,
    Episode,
    ExtractedKnowledge,
    Message,
    MessageRole,
    RetrievalResult,
    SemanticKnowledge,
)


def test_message_creation():
    now = datetime.now(timezone.utc)
    msg = Message(user_id="user1", role=MessageRole.USER, content="Hello", sent_at=now)

    assert msg.user_id == "user1"
    assert msg.role == MessageRole.USER
    assert msg.content == "Hello"
    assert msg.sent_at == now
    assert msg.id is not None


def test_episode_message_count():
    ep = Episode(
        user_id="user1",
        title="Test Episode",
        content="A test episode.",
        original_messages=[{"role": "user", "content": "Hi"}, {"role": "assistant", "content": "Hello"}],
        start_time=datetime.now(timezone.utc),
        end_time=datetime.now(timezone.utc),
    )

    assert ep.message_count == 2


def test_bitemporal_validity_is_valid_at():
    now = datetime.now(timezone.utc)
    past = now - timedelta(days=30)
    future = now + timedelta(days=30)

    # No bounds - always valid
    validity = BiTemporalValidity()
    assert validity.is_valid_at(now)
    assert validity.is_valid_at(past)

    # Valid from past
    validity = BiTemporalValidity(valid_at=past)
    assert validity.is_valid_at(now)
    assert not validity.is_valid_at(past - timedelta(days=1))

    # Valid until future
    validity = BiTemporalValidity(invalid_at=future)
    assert validity.is_valid_at(now)
    assert not validity.is_valid_at(future + timedelta(days=1))


def test_bitemporal_validity_is_current():
    validity = BiTemporalValidity()
    assert validity.is_current()

    validity = BiTemporalValidity(expired_at=datetime.now(timezone.utc))
    assert not validity.is_current()


def test_semantic_knowledge_invalidate():
    episode_id = uuid4()
    knowledge = SemanticKnowledge(statement="User likes Python", source_episode_id=episode_id)

    assert knowledge.is_current()
    knowledge.invalidate()
    assert not knowledge.is_current()
    assert knowledge.expired_at is not None


def test_retrieval_result_empty():
    result = RetrievalResult()
    assert result.to_prompt() == "No relevant context found."


def test_retrieval_result_with_knowledge():
    episode_id = uuid4()

    knowledge = SemanticKnowledge(statement="User prefers Python over JavaScript", source_episode_id=episode_id)

    result = RetrievalResult(retrieved_knowledge=[knowledge])
    prompt = result.to_prompt()

    assert "## Relevant Context" in prompt
    assert "- User prefers Python over JavaScript" in prompt


def test_extracted_knowledge_with_temporal_fields():
    """Test ExtractedKnowledge model with valid_at/invalid_at fields."""
    valid_at = datetime(2024, 1, 1, tzinfo=timezone.utc)
    invalid_at = datetime(2024, 12, 31, tzinfo=timezone.utc)

    ek = ExtractedKnowledge(
        statement="User works at Anthropic",
        knowledge_type="new",
        temporal_info="from January to December 2024",
        valid_at=valid_at,
        invalid_at=invalid_at,
        confidence=0.95,
    )

    assert ek.statement == "User works at Anthropic"
    assert ek.knowledge_type == "new"
    assert ek.temporal_info == "from January to December 2024"
    assert ek.valid_at == valid_at
    assert ek.invalid_at == invalid_at
    assert ek.confidence == 0.95


def test_extracted_knowledge_json_roundtrip():
    """Test ExtractedKnowledge serializes/deserializes with datetime fields."""
    valid_at = datetime(2024, 1, 1, tzinfo=timezone.utc)

    ek = ExtractedKnowledge(
        statement="User started new job",
        knowledge_type="new",
        valid_at=valid_at,
    )

    json_str = ek.model_dump_json()
    ek2 = ExtractedKnowledge.model_validate_json(json_str)

    assert ek2.statement == ek.statement
    assert ek2.valid_at == ek.valid_at


def test_semantic_knowledge_validity_with_dates():
    """Test SemanticKnowledge.is_valid_at with explicit valid_at/invalid_at."""
    episode_id = uuid4()
    jan_2024 = datetime(2024, 1, 1, tzinfo=timezone.utc)
    dec_2024 = datetime(2024, 12, 31, tzinfo=timezone.utc)

    knowledge = SemanticKnowledge(
        statement="User works at Anthropic",
        source_episode_id=episode_id,
        valid_at=jan_2024,
        invalid_at=dec_2024,
    )

    # Valid during 2024
    assert knowledge.is_valid_at(datetime(2024, 6, 15, tzinfo=timezone.utc))

    # Not valid before Jan 2024
    assert not knowledge.is_valid_at(datetime(2023, 12, 1, tzinfo=timezone.utc))

    # Not valid after Dec 2024
    assert not knowledge.is_valid_at(datetime(2025, 1, 1, tzinfo=timezone.utc))
