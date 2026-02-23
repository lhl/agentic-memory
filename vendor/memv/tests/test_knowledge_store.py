from datetime import datetime, timezone
from uuid import uuid4

from .conftest import make_knowledge


async def test_add_and_get(knowledge_store):
    k = make_knowledge(
        valid_at=datetime(2024, 1, 1, 0, 0, 0, tzinfo=timezone.utc),
        invalid_at=datetime(2024, 12, 31, 0, 0, 0, tzinfo=timezone.utc),
    )
    await knowledge_store.add(k)

    got = await knowledge_store.get(k.id)
    assert got is not None
    assert got.id == k.id
    assert got.statement == k.statement
    assert got.source_episode_id == k.source_episode_id
    assert got.created_at == k.created_at
    assert got.valid_at == k.valid_at
    assert got.invalid_at == k.invalid_at
    assert got.expired_at is None


async def test_add_with_embedding(knowledge_store):
    emb = [0.1, 0.2, 0.3, 0.4]
    k = make_knowledge(embedding=emb)
    await knowledge_store.add(k)

    got = await knowledge_store.get(k.id)
    assert got.embedding == emb


async def test_get_nonexistent(knowledge_store):
    assert await knowledge_store.get(uuid4()) is None


async def test_get_by_episode(knowledge_store):
    ep_id = uuid4()
    other_ep_id = uuid4()
    await knowledge_store.add(make_knowledge(episode_id=ep_id, statement="fact 1"))
    await knowledge_store.add(make_knowledge(episode_id=ep_id, statement="fact 2"))
    await knowledge_store.add(make_knowledge(episode_id=other_ep_id, statement="other"))

    results = await knowledge_store.get_by_episode(ep_id)
    assert len(results) == 2
    assert all(r.source_episode_id == ep_id for r in results)


async def test_get_by_episode_empty(knowledge_store):
    assert await knowledge_store.get_by_episode(uuid4()) == []


async def test_get_all(knowledge_store):
    await knowledge_store.add(make_knowledge(statement="a"))
    k_expired = make_knowledge(statement="b", expired_at=datetime(2024, 7, 1, 0, 0, 0, tzinfo=timezone.utc))
    await knowledge_store.add(k_expired)

    all_k = await knowledge_store.get_all()
    assert len(all_k) == 2


async def test_get_current(knowledge_store):
    await knowledge_store.add(make_knowledge(statement="current"))
    await knowledge_store.add(make_knowledge(statement="expired", expired_at=datetime(2024, 7, 1, 0, 0, 0, tzinfo=timezone.utc)))

    current = await knowledge_store.get_current()
    assert len(current) == 1
    assert current[0].statement == "current"


async def test_get_valid_at_no_bounds(knowledge_store):
    # valid_at=None, invalid_at=None → valid at any time
    await knowledge_store.add(make_knowledge(statement="always valid"))

    results = await knowledge_store.get_valid_at(datetime(2020, 1, 1, 0, 0, 0, tzinfo=timezone.utc))
    assert len(results) == 1

    results = await knowledge_store.get_valid_at(datetime(2030, 1, 1, 0, 0, 0, tzinfo=timezone.utc))
    assert len(results) == 1


async def test_get_valid_at_with_range(knowledge_store):
    await knowledge_store.add(
        make_knowledge(
            statement="2024 fact",
            valid_at=datetime(2024, 1, 1, 0, 0, 0, tzinfo=timezone.utc),
            invalid_at=datetime(2025, 1, 1, 0, 0, 0, tzinfo=timezone.utc),
        )
    )

    # Jun 2024 → valid
    results = await knowledge_store.get_valid_at(datetime(2024, 6, 15, 0, 0, 0, tzinfo=timezone.utc))
    assert len(results) == 1

    # Jun 2025 → invalid
    results = await knowledge_store.get_valid_at(datetime(2025, 6, 15, 0, 0, 0, tzinfo=timezone.utc))
    assert len(results) == 0


async def test_get_valid_at_excludes_expired(knowledge_store):
    await knowledge_store.add(make_knowledge(statement="expired fact", expired_at=datetime(2024, 7, 1, 0, 0, 0, tzinfo=timezone.utc)))

    results = await knowledge_store.get_valid_at(datetime(2024, 6, 15, 0, 0, 0, tzinfo=timezone.utc))
    assert len(results) == 0


async def test_get_valid_at_include_expired(knowledge_store):
    await knowledge_store.add(make_knowledge(statement="expired fact", expired_at=datetime(2024, 7, 1, 0, 0, 0, tzinfo=timezone.utc)))

    results = await knowledge_store.get_valid_at(datetime(2024, 6, 15, 0, 0, 0, tzinfo=timezone.utc), include_expired=True)
    assert len(results) == 1


async def test_invalidate(knowledge_store):
    k = make_knowledge()
    await knowledge_store.add(k)

    assert await knowledge_store.invalidate(k.id) is True

    got = await knowledge_store.get(k.id)
    assert got.expired_at is not None


async def test_invalidate_already_expired(knowledge_store):
    k = make_knowledge(expired_at=datetime(2024, 7, 1, 0, 0, 0, tzinfo=timezone.utc))
    await knowledge_store.add(k)

    assert await knowledge_store.invalidate(k.id) is False


async def test_invalidate_nonexistent(knowledge_store):
    assert await knowledge_store.invalidate(uuid4()) is False


async def test_count(knowledge_store):
    await knowledge_store.add(make_knowledge(statement="a"))
    await knowledge_store.add(make_knowledge(statement="b", expired_at=datetime(2024, 7, 1, 0, 0, 0, tzinfo=timezone.utc)))
    assert await knowledge_store.count() == 2


async def test_delete(knowledge_store):
    k = make_knowledge()
    await knowledge_store.add(k)
    assert await knowledge_store.delete(k.id) is True
    assert await knowledge_store.get(k.id) is None


async def test_delete_nonexistent(knowledge_store):
    assert await knowledge_store.delete(uuid4()) is False


async def test_clear_by_episodes(knowledge_store):
    ep1 = uuid4()
    ep2 = uuid4()
    ep3 = uuid4()
    await knowledge_store.add(make_knowledge(episode_id=ep1, statement="e1a"))
    await knowledge_store.add(make_knowledge(episode_id=ep1, statement="e1b"))
    await knowledge_store.add(make_knowledge(episode_id=ep2, statement="e2"))
    await knowledge_store.add(make_knowledge(episode_id=ep3, statement="e3"))

    deleted = await knowledge_store.clear_by_episodes([ep1, ep2])
    assert deleted == 3
    assert await knowledge_store.count() == 1

    remaining = await knowledge_store.get_all()
    assert remaining[0].source_episode_id == ep3


async def test_clear_by_episodes_empty_list(knowledge_store):
    await knowledge_store.add(make_knowledge())
    assert await knowledge_store.clear_by_episodes([]) == 0
    assert await knowledge_store.count() == 1


async def test_isolation_via_episodes(knowledge_store):
    """Knowledge doesn't have user_id — isolation is via episode ownership.

    Each user's knowledge is linked to their episodes via source_episode_id.
    Retrieval isolation is enforced by VectorIndex/TextIndex (which store user_id).
    clear_by_episodes scopes deletion to a user's episode IDs.
    """
    alice_ep = uuid4()
    bob_ep = uuid4()
    await knowledge_store.add(make_knowledge(episode_id=alice_ep, statement="Alice's secret"))
    await knowledge_store.add(make_knowledge(episode_id=bob_ep, statement="Bob's secret"))

    # get_by_episode scopes to a single episode (owned by one user)
    alice_k = await knowledge_store.get_by_episode(alice_ep)
    assert len(alice_k) == 1
    assert alice_k[0].statement == "Alice's secret"

    bob_k = await knowledge_store.get_by_episode(bob_ep)
    assert len(bob_k) == 1
    assert bob_k[0].statement == "Bob's secret"

    # clear_by_episodes only deletes knowledge for given episode IDs
    deleted = await knowledge_store.clear_by_episodes([alice_ep])
    assert deleted == 1
    assert await knowledge_store.count() == 1
    remaining = await knowledge_store.get_all()
    assert remaining[0].source_episode_id == bob_ep
