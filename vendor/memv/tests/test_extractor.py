"""Tests for PredictCalibrateExtractor."""

from datetime import datetime, timezone
from uuid import uuid4

from memv.models import Episode, ExtractedKnowledge, SemanticKnowledge
from memv.processing.extraction import ExtractionResponse, PredictCalibrateExtractor

from .conftest import MockLLM


def _ts(hour=12, minute=0):
    return datetime(2024, 6, 15, hour, minute, 0, tzinfo=timezone.utc)


def _episode(title="Test Episode", content="Narrative content", original_messages=None):
    return Episode(
        user_id="user1",
        title=title,
        content=content,
        original_messages=original_messages
        or [
            {"role": "user", "content": "I use Python daily"},
            {"role": "assistant", "content": "That's great!"},
        ],
        start_time=_ts(12, 0),
        end_time=_ts(12, 10),
    )


def _knowledge(statement="User likes Python"):
    return SemanticKnowledge(
        statement=statement,
        source_episode_id=uuid4(),
        created_at=_ts(),
    )


async def test_cold_start():
    """No existing knowledge → no prediction call, 1 structured call."""
    llm = MockLLM()
    extraction = ExtractionResponse(
        extracted=[ExtractedKnowledge(statement="User uses Python daily", knowledge_type="new", confidence=0.9)]
    )
    llm.set_responses("generate_structured", [extraction])
    extractor = PredictCalibrateExtractor(llm)

    result = await extractor.extract(_episode(), existing_knowledge=[])

    assert len(result) == 1
    assert result[0].statement == "User uses Python daily"
    # Cold start: no generate call (no prediction), 1 structured call
    assert len(llm.calls["generate"]) == 0
    assert len(llm.calls["generate_structured"]) == 1


async def test_warm_with_prediction():
    """Existing knowledge → 1 generate (prediction) + 1 structured (extraction)."""
    llm = MockLLM()
    llm.set_responses("generate", ["I predict the episode discusses Python."])
    extraction = ExtractionResponse(
        extracted=[ExtractedKnowledge(statement="User uses Python daily", knowledge_type="new", confidence=0.9)]
    )
    llm.set_responses("generate_structured", [extraction])
    extractor = PredictCalibrateExtractor(llm)

    result = await extractor.extract(_episode(), existing_knowledge=[_knowledge()])

    assert len(result) == 1
    assert len(llm.calls["generate"]) == 1
    assert len(llm.calls["generate_structured"]) == 1


async def test_warm_empty_result():
    """Prediction covers everything → empty extraction list."""
    llm = MockLLM()
    llm.set_responses("generate", ["Prediction covers all content."])
    llm.set_responses("generate_structured", [ExtractionResponse(extracted=[])])
    extractor = PredictCalibrateExtractor(llm)

    result = await extractor.extract(_episode(), existing_knowledge=[_knowledge()])

    assert result == []


async def test_multiple_extractions():
    """3 items returned at once."""
    llm = MockLLM()
    items = [
        ExtractedKnowledge(statement="Fact A", knowledge_type="new", confidence=0.9),
        ExtractedKnowledge(statement="Fact B", knowledge_type="new", confidence=0.8),
        ExtractedKnowledge(statement="Fact C", knowledge_type="update", confidence=0.85),
    ]
    llm.set_responses("generate_structured", [ExtractionResponse(extracted=items)])
    extractor = PredictCalibrateExtractor(llm)

    result = await extractor.extract(_episode(), existing_knowledge=[])

    assert len(result) == 3
    assert {r.statement for r in result} == {"Fact A", "Fact B", "Fact C"}


async def test_uses_original_messages():
    """Prompt contains '>>> USER:' from original_messages, not episode.content."""
    llm = MockLLM()
    llm.set_responses("generate", ["prediction"])
    llm.set_responses("generate_structured", [ExtractionResponse(extracted=[])])
    extractor = PredictCalibrateExtractor(llm)

    episode = _episode(
        content="This is a narrative that should NOT appear in extraction prompt",
        original_messages=[
            {"role": "user", "content": "I love Rust"},
            {"role": "assistant", "content": "Cool language"},
        ],
    )
    await extractor.extract(episode, existing_knowledge=[_knowledge()])

    # The structured call prompt should contain the formatted original messages
    structured_prompt = llm.calls["generate_structured"][0][0]
    assert ">>> USER: I love Rust" in structured_prompt
    assert "ASSISTANT: Cool language" in structured_prompt


async def test_contradiction_type_preserved():
    """knowledge_type='contradiction' flows through."""
    llm = MockLLM()
    item = ExtractedKnowledge(statement="User now prefers Rust", knowledge_type="contradiction", confidence=0.95)
    llm.set_responses("generate_structured", [ExtractionResponse(extracted=[item])])
    extractor = PredictCalibrateExtractor(llm)

    result = await extractor.extract(_episode(), existing_knowledge=[])

    assert result[0].knowledge_type == "contradiction"


async def test_temporal_fields_preserved():
    """valid_at, invalid_at, temporal_info flow through."""
    llm = MockLLM()
    valid = datetime(2024, 1, 1, tzinfo=timezone.utc)
    invalid = datetime(2025, 1, 1, tzinfo=timezone.utc)
    item = ExtractedKnowledge(
        statement="User worked at Acme",
        knowledge_type="new",
        confidence=0.9,
        valid_at=valid,
        invalid_at=invalid,
        temporal_info="from Jan 2024 to Jan 2025",
    )
    llm.set_responses("generate_structured", [ExtractionResponse(extracted=[item])])
    extractor = PredictCalibrateExtractor(llm)

    result = await extractor.extract(_episode(), existing_knowledge=[])

    assert result[0].valid_at == valid
    assert result[0].invalid_at == invalid
    assert result[0].temporal_info == "from Jan 2024 to Jan 2025"


async def test_cold_start_prompt_contains_atomization_rules():
    """Cold start extraction prompt includes ATOMIZATION_RULES."""
    llm = MockLLM()
    llm.set_responses("generate_structured", [ExtractionResponse(extracted=[])])
    extractor = PredictCalibrateExtractor(llm)

    await extractor.extract(_episode(), existing_knowledge=[])

    prompt = llm.calls["generate_structured"][0][0]
    assert "Self-Contained Statement Rules" in prompt


async def test_warm_prompt_contains_atomization_rules():
    """Warm extraction prompt includes ATOMIZATION_RULES."""
    llm = MockLLM()
    llm.set_responses("generate", ["prediction"])
    llm.set_responses("generate_structured", [ExtractionResponse(extracted=[])])
    extractor = PredictCalibrateExtractor(llm)

    await extractor.extract(_episode(), existing_knowledge=[_knowledge()])

    prompt = llm.calls["generate_structured"][0][0]
    assert "Self-Contained Statement Rules" in prompt


async def test_prompt_contains_reference_timestamp():
    """Both extraction paths include reference_timestamp in the prompt."""
    llm = MockLLM()
    llm.set_responses("generate_structured", [ExtractionResponse(extracted=[])])
    extractor = PredictCalibrateExtractor(llm)

    await extractor.extract(_episode(), existing_knowledge=[])

    prompt = llm.calls["generate_structured"][0][0]
    assert "reference_timestamp" in prompt
