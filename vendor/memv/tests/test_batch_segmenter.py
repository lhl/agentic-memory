"""Tests for BatchSegmenter."""

import json
from datetime import datetime, timedelta, timezone

from memv.processing.batch_segmenter import BatchSegmenter

from .conftest import MockLLM, make_message


def _ts(minutes: int = 0) -> datetime:
    return datetime(2024, 6, 15, 12, 0, 0, tzinfo=timezone.utc) + timedelta(minutes=minutes)


async def test_empty_messages():
    llm = MockLLM()
    seg = BatchSegmenter(llm)
    result = await seg.segment([])
    assert result == []
    assert len(llm.calls["generate"]) == 0


async def test_single_message():
    llm = MockLLM()
    seg = BatchSegmenter(llm)
    msg = make_message(content="hi", sent_at=_ts())
    result = await seg.segment([msg])
    assert len(result) == 1
    assert result[0] == [msg]
    assert len(llm.calls["generate"]) == 0


async def test_two_messages_no_llm():
    llm = MockLLM()
    seg = BatchSegmenter(llm)
    msgs = [
        make_message(content="hello", sent_at=_ts(0)),
        make_message(content="world", sent_at=_ts(1)),
    ]
    result = await seg.segment(msgs)
    assert len(result) == 1
    assert result[0] == msgs
    assert len(llm.calls["generate"]) == 0


async def test_time_gap_splitting():
    llm = MockLLM()
    seg = BatchSegmenter(llm, time_gap_minutes=30)
    msgs = [
        make_message(content="a", sent_at=_ts(0)),
        make_message(content="b", sent_at=_ts(1)),
        make_message(content="c", sent_at=_ts(31)),
        make_message(content="d", sent_at=_ts(32)),
    ]
    result = await seg.segment(msgs)
    # Time gap at 31 min splits into two batches, each ≤2 so no LLM
    assert len(result) == 2
    assert [m.content for m in result[0]] == ["a", "b"]
    assert [m.content for m in result[1]] == ["c", "d"]
    assert len(llm.calls["generate"]) == 0


async def test_time_gap_custom_threshold():
    llm = MockLLM()
    seg = BatchSegmenter(llm, time_gap_minutes=10)
    msgs = [
        make_message(content="a", sent_at=_ts(0)),
        make_message(content="b", sent_at=_ts(5)),
        make_message(content="c", sent_at=_ts(16)),
    ]
    result = await seg.segment(msgs)
    # 10-min gap between b(5) and c(16) splits into [a,b] and [c]
    assert len(result) == 2
    assert len(result[0]) == 2
    assert len(result[1]) == 1


async def test_semantic_grouping():
    llm = MockLLM()
    llm.set_responses("generate", [json.dumps([[0, 1, 3], [2]])])
    seg = BatchSegmenter(llm)
    msgs = [
        make_message(content="a", sent_at=_ts(0)),
        make_message(content="b", sent_at=_ts(1)),
        make_message(content="c", sent_at=_ts(2)),
        make_message(content="d", sent_at=_ts(3)),
    ]
    result = await seg.segment(msgs)
    # 4 msgs, no time gap, LLM groups [[0,1,3],[2]]
    assert len(result) == 2
    assert [m.content for m in result[0]] == ["a", "b", "d"]
    assert [m.content for m in result[1]] == ["c"]


async def test_markdown_code_block():
    llm = MockLLM()
    llm.set_responses("generate", ["```json\n[[0, 1], [2]]\n```"])
    seg = BatchSegmenter(llm)
    msgs = [
        make_message(content="x", sent_at=_ts(0)),
        make_message(content="y", sent_at=_ts(1)),
        make_message(content="z", sent_at=_ts(2)),
    ]
    result = await seg.segment(msgs)
    assert len(result) == 2
    assert [m.content for m in result[0]] == ["x", "y"]
    assert [m.content for m in result[1]] == ["z"]


async def test_parse_failure_fallback():
    llm = MockLLM()
    llm.set_responses("generate", ["this is not json at all"])
    seg = BatchSegmenter(llm)
    msgs = [
        make_message(content="a", sent_at=_ts(0)),
        make_message(content="b", sent_at=_ts(1)),
        make_message(content="c", sent_at=_ts(2)),
    ]
    result = await seg.segment(msgs)
    # Fallback: all messages in one group
    assert len(result) == 1
    assert len(result[0]) == 3


async def test_time_gap_then_semantic():
    llm = MockLLM()
    # Only the second batch (3 msgs) triggers LLM
    llm.set_responses("generate", [json.dumps([[0, 2], [1]])])
    seg = BatchSegmenter(llm, time_gap_minutes=30)
    msgs = [
        make_message(content="a", sent_at=_ts(0)),
        make_message(content="b", sent_at=_ts(1)),
        # 31-min gap
        make_message(content="c", sent_at=_ts(31)),
        make_message(content="d", sent_at=_ts(32)),
        make_message(content="e", sent_at=_ts(33)),
    ]
    result = await seg.segment(msgs)
    # First batch [a,b] → ≤2, no LLM → 1 group
    # Second batch [c,d,e] → LLM groups [[0,2],[1]] → 2 groups
    assert len(result) == 3
    assert [m.content for m in result[0]] == ["a", "b"]
    assert [m.content for m in result[1]] == ["c", "e"]
    assert [m.content for m in result[2]] == ["d"]


async def test_missing_indices_filled():
    llm = MockLLM()
    # LLM only returns index 0 — indices 1 and 2 should get their own groups
    llm.set_responses("generate", [json.dumps([[0]])])
    seg = BatchSegmenter(llm)
    msgs = [
        make_message(content="a", sent_at=_ts(0)),
        make_message(content="b", sent_at=_ts(1)),
        make_message(content="c", sent_at=_ts(2)),
    ]
    result = await seg.segment(msgs)
    assert len(result) == 3
    assert [m.content for m in result[0]] == ["a"]
    assert [m.content for m in result[1]] == ["b"]
    assert [m.content for m in result[2]] == ["c"]
