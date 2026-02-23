from datetime import datetime, timezone
from uuid import uuid4

from .conftest import make_episode


async def test_add_and_get(episode_store):
    ep = make_episode()
    await episode_store.add(ep)

    got = await episode_store.get(ep.id)
    assert got is not None
    assert got.id == ep.id
    assert got.user_id == ep.user_id
    assert got.title == ep.title
    assert got.content == ep.content
    assert got.original_messages == ep.original_messages
    assert got.start_time == ep.start_time
    assert got.end_time == ep.end_time
    assert got.created_at == ep.created_at


async def test_get_nonexistent(episode_store):
    assert await episode_store.get(uuid4()) is None


async def test_get_by_user(episode_store):
    await episode_store.add(make_episode(user_id="alice", title="a1"))
    await episode_store.add(make_episode(user_id="bob", title="b1"))
    await episode_store.add(
        make_episode(
            user_id="alice",
            title="a2",
            start_time=datetime(2024, 6, 16, 12, 0, 0, tzinfo=timezone.utc),
            end_time=datetime(2024, 6, 16, 13, 0, 0, tzinfo=timezone.utc),
        )
    )

    alice_eps = await episode_store.get_by_user("alice")
    assert len(alice_eps) == 2
    assert all(e.user_id == "alice" for e in alice_eps)


async def test_get_by_user_empty(episode_store):
    assert await episode_store.get_by_user("nobody") == []


async def test_get_by_time_range_overlap(episode_store):
    # Episode spans 10:00-14:00, query range 12:00-16:00 → overlap
    ep = make_episode(
        start_time=datetime(2024, 6, 15, 10, 0, 0, tzinfo=timezone.utc),
        end_time=datetime(2024, 6, 15, 14, 0, 0, tzinfo=timezone.utc),
    )
    await episode_store.add(ep)

    results = await episode_store.get_by_time_range(
        "user1",
        datetime(2024, 6, 15, 12, 0, 0, tzinfo=timezone.utc),
        datetime(2024, 6, 15, 16, 0, 0, tzinfo=timezone.utc),
    )
    assert len(results) == 1
    assert results[0].id == ep.id


async def test_get_by_time_range_contained(episode_store):
    # Episode fully inside query range
    ep = make_episode(
        start_time=datetime(2024, 6, 15, 12, 0, 0, tzinfo=timezone.utc),
        end_time=datetime(2024, 6, 15, 13, 0, 0, tzinfo=timezone.utc),
    )
    await episode_store.add(ep)

    results = await episode_store.get_by_time_range(
        "user1",
        datetime(2024, 6, 15, 10, 0, 0, tzinfo=timezone.utc),
        datetime(2024, 6, 15, 16, 0, 0, tzinfo=timezone.utc),
    )
    assert len(results) == 1


async def test_get_by_time_range_no_match(episode_store):
    # Episode 10:00-11:00, query 14:00-16:00 → no overlap
    await episode_store.add(
        make_episode(
            start_time=datetime(2024, 6, 15, 10, 0, 0, tzinfo=timezone.utc),
            end_time=datetime(2024, 6, 15, 11, 0, 0, tzinfo=timezone.utc),
        )
    )

    results = await episode_store.get_by_time_range(
        "user1",
        datetime(2024, 6, 15, 14, 0, 0, tzinfo=timezone.utc),
        datetime(2024, 6, 15, 16, 0, 0, tzinfo=timezone.utc),
    )
    assert results == []


async def test_count(episode_store):
    await episode_store.add(make_episode(user_id="alice"))
    await episode_store.add(
        make_episode(
            user_id="alice",
            start_time=datetime(2024, 6, 16, 12, 0, 0, tzinfo=timezone.utc),
            end_time=datetime(2024, 6, 16, 13, 0, 0, tzinfo=timezone.utc),
        )
    )
    await episode_store.add(make_episode(user_id="bob"))

    assert await episode_store.count() == 3
    assert await episode_store.count("alice") == 2
    assert await episode_store.count("bob") == 1


async def test_delete(episode_store):
    ep = make_episode()
    await episode_store.add(ep)
    assert await episode_store.delete(ep.id) is True
    assert await episode_store.get(ep.id) is None


async def test_delete_nonexistent(episode_store):
    assert await episode_store.delete(uuid4()) is False


async def test_clear_user(episode_store):
    await episode_store.add(make_episode(user_id="alice"))
    await episode_store.add(
        make_episode(
            user_id="alice",
            start_time=datetime(2024, 6, 16, 12, 0, 0, tzinfo=timezone.utc),
            end_time=datetime(2024, 6, 16, 13, 0, 0, tzinfo=timezone.utc),
        )
    )
    await episode_store.add(make_episode(user_id="bob"))

    deleted = await episode_store.clear_user("alice")
    assert deleted == 2
    assert await episode_store.count("alice") == 0
    assert await episode_store.count("bob") == 1


async def test_update(episode_store):
    ep = make_episode(title="Original", content="Original content")
    await episode_store.add(ep)

    ep.title = "Updated"
    ep.content = "Updated content"
    assert await episode_store.update(ep) is True

    got = await episode_store.get(ep.id)
    assert got.title == "Updated"
    assert got.content == "Updated content"
    assert got.created_at == ep.created_at  # unchanged


async def test_update_nonexistent(episode_store):
    ep = make_episode()
    assert await episode_store.update(ep) is False


async def test_original_messages_json_roundtrip(episode_store):
    complex_messages = [
        {"role": "user", "content": "What's 2+2?", "metadata": {"source": "web", "tags": ["math"]}},
        {"role": "assistant", "content": "4", "metadata": {"confidence": 0.99}},
        {"role": "user", "content": "Thanks!", "nested": {"deep": {"value": True}}},
    ]
    ep = make_episode()
    ep.original_messages = complex_messages
    await episode_store.add(ep)

    got = await episode_store.get(ep.id)
    assert got.original_messages == complex_messages
