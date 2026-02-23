"""Tests for EpisodeGenerator."""

import json
from datetime import datetime, timezone

import pytest

from memv.processing.episodes import EpisodeGenerator

from .conftest import MockLLM, make_message


def _ts(hour=12, minute=0):
    return datetime(2024, 6, 15, hour, minute, 0, tzinfo=timezone.utc)


async def test_generate_basic():
    llm = MockLLM()
    llm.set_responses("generate", [json.dumps({"title": "Python Discussion", "content": "The user discussed Python."})])
    gen = EpisodeGenerator(llm)
    msgs = [
        make_message(content="I like Python", sent_at=_ts(12, 0)),
        make_message(content="Me too", sent_at=_ts(12, 5)),
    ]
    episode = await gen.generate(msgs, user_id="user1")
    assert episode.title == "Python Discussion"
    assert episode.content == "The user discussed Python."
    assert episode.user_id == "user1"
    assert episode.start_time == _ts(12, 0)
    assert episode.end_time == _ts(12, 5)


async def test_original_messages_preserved():
    llm = MockLLM()
    llm.set_responses("generate", [json.dumps({"title": "T", "content": "C"})])
    gen = EpisodeGenerator(llm)
    msgs = [
        make_message(role="user", content="hello", sent_at=_ts(12, 0)),
        make_message(role="assistant", content="hi", sent_at=_ts(12, 1)),
    ]
    episode = await gen.generate(msgs, user_id="user1")
    assert len(episode.original_messages) == 2
    assert episode.original_messages[0]["role"] == "user"
    assert episode.original_messages[0]["content"] == "hello"
    assert "sent_at" in episode.original_messages[0]
    assert episode.original_messages[1]["role"] == "assistant"


async def test_markdown_code_block():
    llm = MockLLM()
    llm.set_responses("generate", ['```json\n{"title": "T", "content": "C"}\n```'])
    gen = EpisodeGenerator(llm)
    msgs = [make_message(sent_at=_ts())]
    episode = await gen.generate(msgs, user_id="user1")
    assert episode.title == "T"
    assert episode.content == "C"


async def test_fallback_on_invalid_json():
    llm = MockLLM()
    llm.set_responses("generate", ["This is just plain text about the conversation."])
    gen = EpisodeGenerator(llm)
    msgs = [make_message(sent_at=_ts())]
    episode = await gen.generate(msgs, user_id="user1")
    assert episode.title == "Conversation Episode"
    assert episode.content == "This is just plain text about the conversation."


async def test_fallback_on_empty_content():
    llm = MockLLM()
    llm.set_responses("generate", [json.dumps({"title": "T", "content": ""})])
    gen = EpisodeGenerator(llm)
    msgs = [make_message(sent_at=_ts())]
    episode = await gen.generate(msgs, user_id="user1")
    # Empty content triggers fallback
    assert episode.title == "Conversation Episode"


async def test_empty_messages_raises():
    llm = MockLLM()
    gen = EpisodeGenerator(llm)
    with pytest.raises(ValueError, match="empty"):
        await gen.generate([], user_id="user1")


async def test_single_message_times():
    llm = MockLLM()
    llm.set_responses("generate", [json.dumps({"title": "T", "content": "C"})])
    gen = EpisodeGenerator(llm)
    ts = _ts(14, 30)
    msgs = [make_message(sent_at=ts)]
    episode = await gen.generate(msgs, user_id="user1")
    assert episode.start_time == ts
    assert episode.end_time == ts
