from uuid import uuid4

from memv.storage.sqlite._text_index import TextIndex


async def test_add_and_search(text_index):
    uid = uuid4()
    await text_index.add(uid, "the quick brown fox jumps over the lazy dog", user_id="user1")

    results = await text_index.search("quick fox", top_k=5, user_id="user1")
    assert uid in results


async def test_search_empty(text_index):
    results = await text_index.search("anything", top_k=5)
    assert results == []


async def test_search_no_match(text_index):
    await text_index.add(uuid4(), "python programming language", user_id="user1")
    results = await text_index.search("javascript", top_k=5, user_id="user1")
    assert results == []


async def test_search_top_k(text_index):
    for i in range(5):
        await text_index.add(uuid4(), f"document about testing number {i}", user_id="user1")

    results = await text_index.search("testing", top_k=3, user_id="user1")
    assert len(results) == 3


async def test_search_by_user(text_index):
    alice_id = uuid4()
    bob_id = uuid4()
    await text_index.add(alice_id, "machine learning algorithms", user_id="alice")
    await text_index.add(bob_id, "machine learning models", user_id="bob")

    results = await text_index.search("machine learning", top_k=10, user_id="alice")
    assert alice_id in results
    assert bob_id not in results


async def test_search_no_user_filter(text_index):
    await text_index.add(uuid4(), "neural networks deep learning", user_id="alice")
    await text_index.add(uuid4(), "deep learning frameworks", user_id="bob")

    results = await text_index.search("deep learning", top_k=10)
    assert len(results) == 2


async def test_search_special_characters(text_index):
    uid = uuid4()
    await text_index.add(uid, "hello world program", user_id="user1")
    # Should not crash on FTS5 special chars, and valid tokens should still match
    results = await text_index.search("hello! (world)", top_k=5, user_id="user1")
    assert uid in results


async def test_search_empty_after_sanitize(text_index):
    await text_index.add(uuid4(), "some content", user_id="user1")
    # All special characters → empty after sanitize → returns []
    results = await text_index.search("!@#$%^&*()", top_k=5)
    assert results == []


async def test_clear_user(text_index):
    await text_index.add(uuid4(), "alice document one", user_id="alice")
    await text_index.add(uuid4(), "alice document two", user_id="alice")
    bob_id = uuid4()
    await text_index.add(bob_id, "bob document one", user_id="bob")

    deleted = await text_index.clear_user("alice")
    assert deleted == 2

    results = await text_index.search("document", top_k=10)
    assert len(results) == 1
    assert results[0] == bob_id


async def test_clear_user_empty(text_index):
    assert await text_index.clear_user("nobody") == 0


def test_sanitize_fts_query(tmp_path):
    idx = TextIndex(str(tmp_path / "sanitize.db"))
    assert idx._sanitize_fts_query("hello world") == '"hello" "world"'
    assert idx._sanitize_fts_query("") == ""
    assert idx._sanitize_fts_query("!@#$") == ""
    assert idx._sanitize_fts_query("test-query") == '"test" "query"'
