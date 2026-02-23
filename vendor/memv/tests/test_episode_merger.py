"""Tests for EpisodeMerger."""

import json
from datetime import datetime, timezone

import pytest

from memv.models import Episode
from memv.processing.episode_merger import EpisodeMerger

from .conftest import MockEmbedder, MockLLM


def _ts(hour=12, minute=0):
    return datetime(2024, 6, 15, hour, minute, 0, tzinfo=timezone.utc)


def _episode(user_id="user1", title="Episode", content="Content", start_hour=12, end_hour=13, original_messages=None):
    return Episode(
        user_id=user_id,
        title=title,
        content=content,
        original_messages=original_messages or [{"role": "user", "content": "hi"}],
        start_time=_ts(start_hour),
        end_time=_ts(end_hour),
    )


async def test_no_existing_episodes():
    llm = MockLLM()
    embedder = MockEmbedder()
    merger = EpisodeMerger(llm, embedder, similarity_threshold=0.85)

    new_ep = _episode(title="New")
    result_ep, merged_with = await merger.merge_if_appropriate(new_ep, [])

    assert result_ep is new_ep
    assert merged_with is None


async def test_below_threshold_no_merge():
    llm = MockLLM()
    embedder = MockEmbedder()
    merger = EpisodeMerger(llm, embedder, similarity_threshold=0.85)

    new_ep = _episode(title="Cooking pasta recipes", content="A discussion about Italian cooking")
    existing = _episode(title="Quantum physics equations", content="Debate about wave functions")
    result_ep, merged_with = await merger.merge_if_appropriate(new_ep, [existing])

    # Different text → low similarity → no merge, no LLM call
    assert result_ep is new_ep
    assert merged_with is None
    assert len(llm.calls["generate"]) == 0


async def test_above_threshold_llm_yes():
    llm = MockLLM()
    embedder = MockEmbedder()
    merger = EpisodeMerger(llm, embedder, similarity_threshold=0.85)

    # Same title+content → identical embedding → similarity = 1.0
    new_ep = _episode(title="Python discussion", content="User loves Python", start_hour=14, end_hour=15)
    existing = _episode(title="Python discussion", content="User loves Python", start_hour=12, end_hour=13)

    # LLM says merge, then generates merged content
    llm.set_responses(
        "generate",
        [
            json.dumps({"should_merge": True, "reason": "Same topic"}),
            json.dumps({"title": "Merged Python", "content": "Combined discussion"}),
        ],
    )

    result_ep, merged_with = await merger.merge_if_appropriate(new_ep, [existing])

    assert merged_with is existing
    assert result_ep.title == "Merged Python"
    assert result_ep.content == "Combined discussion"


async def test_above_threshold_llm_no():
    llm = MockLLM()
    embedder = MockEmbedder()
    merger = EpisodeMerger(llm, embedder, similarity_threshold=0.85)

    new_ep = _episode(title="Same text", content="Same text")
    existing = _episode(title="Same text", content="Same text")

    llm.set_responses("generate", [json.dumps({"should_merge": False, "reason": "Different context"})])

    result_ep, merged_with = await merger.merge_if_appropriate(new_ep, [existing])

    assert result_ep is new_ep
    assert merged_with is None


async def test_cross_user_raises():
    llm = MockLLM()
    embedder = MockEmbedder()
    merger = EpisodeMerger(llm, embedder)

    ep1 = _episode(user_id="user1")
    ep2 = _episode(user_id="user2")

    with pytest.raises(ValueError, match="different users"):
        await merger.merge(ep1, ep2)


async def test_merged_combines_messages():
    llm = MockLLM()
    embedder = MockEmbedder()
    merger = EpisodeMerger(llm, embedder)

    ep1_msgs = [{"role": "user", "content": "msg1"}]
    ep2_msgs = [{"role": "user", "content": "msg2"}, {"role": "assistant", "content": "msg3"}]

    llm.set_responses("generate", [json.dumps({"title": "Merged", "content": "Combined"})])

    merged = await merger.merge(
        _episode(original_messages=ep1_msgs),
        _episode(original_messages=ep2_msgs),
    )

    assert len(merged.original_messages) == 3
    assert merged.original_messages[0]["content"] == "msg1"
    assert merged.original_messages[1]["content"] == "msg2"
    assert merged.original_messages[2]["content"] == "msg3"


async def test_merged_time_range():
    llm = MockLLM()
    embedder = MockEmbedder()
    merger = EpisodeMerger(llm, embedder)

    llm.set_responses("generate", [json.dumps({"title": "T", "content": "C"})])

    merged = await merger.merge(
        _episode(start_hour=14, end_hour=15),
        _episode(start_hour=10, end_hour=11),
    )

    assert merged.start_time == _ts(10)
    assert merged.end_time == _ts(15)


async def test_decision_parse_failure():
    llm = MockLLM()
    embedder = MockEmbedder()
    merger = EpisodeMerger(llm, embedder, similarity_threshold=0.85)

    new_ep = _episode(title="Same", content="Same")
    existing = _episode(title="Same", content="Same")

    # Bad JSON → parse failure → defaults to no merge
    llm.set_responses("generate", ["not valid json"])

    result_ep, merged_with = await merger.merge_if_appropriate(new_ep, [existing])

    assert result_ep is new_ep
    assert merged_with is None
