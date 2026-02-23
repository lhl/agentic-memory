from datetime import datetime, timezone
from uuid import uuid4

from .conftest import make_message


async def test_add_and_get(message_store):
    msg = make_message(content="round trip")
    await message_store.add(msg)

    got = await message_store.get(msg.id)
    assert got is not None
    assert got.id == msg.id
    assert got.user_id == msg.user_id
    assert got.role == msg.role
    assert got.content == msg.content
    assert got.sent_at == msg.sent_at


async def test_get_nonexistent(message_store):
    assert await message_store.get(uuid4()) is None


async def test_get_by_user(message_store):
    m1 = make_message(user_id="alice", content="a1")
    m2 = make_message(user_id="bob", content="b1")
    m3 = make_message(user_id="alice", content="a2", sent_at=datetime(2024, 6, 15, 13, 0, 0, tzinfo=timezone.utc))
    await message_store.add(m1)
    await message_store.add(m2)
    await message_store.add(m3)

    alice_msgs = await message_store.get_by_user("alice")
    assert len(alice_msgs) == 2
    assert all(m.user_id == "alice" for m in alice_msgs)


async def test_get_by_user_empty(message_store):
    assert await message_store.get_by_user("nobody") == []


async def test_get_by_time_range(message_store):
    t1 = datetime(2024, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    t2 = datetime(2024, 6, 1, 0, 0, 0, tzinfo=timezone.utc)
    t3 = datetime(2024, 12, 1, 0, 0, 0, tzinfo=timezone.utc)

    await message_store.add(make_message(sent_at=t1, content="jan"))
    await message_store.add(make_message(sent_at=t2, content="jun"))
    await message_store.add(make_message(sent_at=t3, content="dec"))

    results = await message_store.get_by_time_range("user1", t1, t2)
    assert len(results) == 2
    # Implementation guarantees ORDER BY sent_at ASC
    assert results[0].content == "jan"
    assert results[1].content == "jun"


async def test_list_users(message_store):
    await message_store.add(make_message(user_id="alice"))
    await message_store.add(make_message(user_id="bob"))
    await message_store.add(make_message(user_id="alice", sent_at=datetime(2024, 6, 15, 13, 0, 0, tzinfo=timezone.utc)))

    users = await message_store.list_users()
    assert sorted(users) == ["alice", "bob"]


async def test_list_users_empty(message_store):
    assert await message_store.list_users() == []


async def test_count_all(message_store):
    await message_store.add(make_message(user_id="a"))
    await message_store.add(make_message(user_id="b"))
    assert await message_store.count() == 2


async def test_count_by_user(message_store):
    await message_store.add(make_message(user_id="a"))
    await message_store.add(make_message(user_id="a", sent_at=datetime(2024, 6, 15, 13, 0, 0, tzinfo=timezone.utc)))
    await message_store.add(make_message(user_id="b"))
    assert await message_store.count("a") == 2
    assert await message_store.count("b") == 1


async def test_count_empty(message_store):
    assert await message_store.count() == 0


async def test_delete(message_store):
    msg = make_message()
    await message_store.add(msg)
    assert await message_store.delete(msg.id) is True
    assert await message_store.get(msg.id) is None


async def test_delete_nonexistent(message_store):
    assert await message_store.delete(uuid4()) is False


async def test_clear_user(message_store):
    await message_store.add(make_message(user_id="alice"))
    await message_store.add(make_message(user_id="alice", sent_at=datetime(2024, 6, 15, 13, 0, 0, tzinfo=timezone.utc)))
    await message_store.add(make_message(user_id="bob"))

    deleted = await message_store.clear_user("alice")
    assert deleted == 2
    assert await message_store.count("alice") == 0
    assert await message_store.count("bob") == 1


async def test_clear_user_empty(message_store):
    assert await message_store.clear_user("nobody") == 0


async def test_user_isolation(message_store):
    await message_store.add(make_message(user_id="alice", content="secret"))
    await message_store.add(make_message(user_id="bob", content="other"))

    bob_msgs = await message_store.get_by_user("bob")
    assert all(m.content != "secret" for m in bob_msgs)

    alice_msgs = await message_store.get_by_user("alice")
    assert all(m.content != "other" for m in alice_msgs)
