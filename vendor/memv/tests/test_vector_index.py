from uuid import uuid4


async def test_add_and_search(vector_index):
    uid = uuid4()
    await vector_index.add(uid, [1.0, 0.0, 0.0, 0.0], user_id="user1")

    results = await vector_index.search([1.0, 0.0, 0.0, 0.0], top_k=5, user_id="user1")
    assert uid in results


async def test_search_empty(vector_index):
    results = await vector_index.search([1.0, 0.0, 0.0, 0.0], top_k=5)
    assert results == []


async def test_search_ordering(vector_index):
    close = uuid4()
    far = uuid4()
    await vector_index.add(close, [0.9, 0.1, 0.0, 0.0], user_id="user1")
    await vector_index.add(far, [0.0, 1.0, 0.0, 0.0], user_id="user1")

    results = await vector_index.search([1.0, 0.0, 0.0, 0.0], top_k=2, user_id="user1")
    assert results[0] == close
    assert results[1] == far


async def test_search_top_k(vector_index):
    for _ in range(5):
        await vector_index.add(uuid4(), [1.0, 0.0, 0.0, 0.0], user_id="user1")

    results = await vector_index.search([1.0, 0.0, 0.0, 0.0], top_k=3, user_id="user1")
    assert len(results) == 3


async def test_search_with_scores(vector_index):
    uid = uuid4()
    await vector_index.add(uid, [1.0, 0.0, 0.0, 0.0], user_id="user1")

    results = await vector_index.search_with_scores([1.0, 0.0, 0.0, 0.0], top_k=5, user_id="user1")
    assert len(results) == 1
    result_uuid, score = results[0]
    assert result_uuid == uid
    assert score > 0.99  # identical vector → distance ≈ 0 → score ≈ 1.0


async def test_search_by_user(vector_index):
    alice_id = uuid4()
    bob_id = uuid4()
    await vector_index.add(alice_id, [1.0, 0.0, 0.0, 0.0], user_id="alice")
    await vector_index.add(bob_id, [1.0, 0.0, 0.0, 0.0], user_id="bob")

    results = await vector_index.search([1.0, 0.0, 0.0, 0.0], top_k=10, user_id="alice")
    assert alice_id in results
    assert bob_id not in results


async def test_search_no_user_filter(vector_index):
    alice_id = uuid4()
    bob_id = uuid4()
    await vector_index.add(alice_id, [1.0, 0.0, 0.0, 0.0], user_id="alice")
    await vector_index.add(bob_id, [0.9, 0.1, 0.0, 0.0], user_id="bob")

    results = await vector_index.search([1.0, 0.0, 0.0, 0.0], top_k=10)
    assert len(results) == 2


async def test_clear_user(vector_index):
    await vector_index.add(uuid4(), [1.0, 0.0, 0.0, 0.0], user_id="alice")
    await vector_index.add(uuid4(), [0.0, 1.0, 0.0, 0.0], user_id="alice")
    bob_id = uuid4()
    await vector_index.add(bob_id, [0.0, 0.0, 1.0, 0.0], user_id="bob")

    deleted = await vector_index.clear_user("alice")
    assert deleted == 2

    results = await vector_index.search([1.0, 0.0, 0.0, 0.0], top_k=10)
    assert len(results) == 1
    assert results[0] == bob_id


async def test_clear_user_empty(vector_index):
    assert await vector_index.clear_user("nobody") == 0
