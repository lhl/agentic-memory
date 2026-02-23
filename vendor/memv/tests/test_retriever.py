"""Tests for Retriever."""

from datetime import datetime, timezone
from uuid import uuid4

import pytest

from memv.models import SemanticKnowledge
from memv.retrieval.retriever import Retriever
from memv.storage.sqlite._knowledge import KnowledgeStore
from memv.storage.sqlite._text_index import TextIndex
from memv.storage.sqlite._vector_index import VectorIndex

from .conftest import MockEmbedder


def _ts(hour=12, minute=0):
    return datetime(2024, 6, 15, hour, minute, 0, tzinfo=timezone.utc)


async def _seed_knowledge(knowledge_store, vector_index, text_index, embedder, statement, user_id="user1", **kwargs):
    """Helper: create knowledge, embed it, add to all stores/indices."""
    embedding = await embedder.embed(statement)
    k = SemanticKnowledge(
        statement=statement,
        source_episode_id=uuid4(),
        embedding=embedding,
        created_at=_ts(),
        **kwargs,
    )
    await knowledge_store.add(k)
    await vector_index.add(k.id, embedding, user_id)
    await text_index.add(k.id, k.statement, user_id)
    return k


@pytest.fixture
async def retriever_env(tmp_path):
    """Set up a Retriever with real stores and MockEmbedder."""
    db_path = str(tmp_path / "retriever.db")
    ks = KnowledgeStore(db_path)
    vi = VectorIndex(db_path, dimensions=1536)
    ti = TextIndex(db_path)
    embedder = MockEmbedder(dimensions=1536)

    await ks.open()
    await ti.open()
    try:
        await vi.open()
    except ImportError:
        await ti.close()
        await ks.close()
        pytest.skip("sqlite-vec extension not available")

    retriever = Retriever(
        knowledge_store=ks,
        vector_index=vi,
        text_index=ti,
        embedding_client=embedder,
    )
    yield {"retriever": retriever, "ks": ks, "vi": vi, "ti": ti, "embedder": embedder}

    await ti.close()
    await vi.close()
    await ks.close()


async def test_basic_retrieval(retriever_env):
    env = retriever_env
    await _seed_knowledge(env["ks"], env["vi"], env["ti"], env["embedder"], "User likes Python")

    result = await env["retriever"].retrieve("User likes Python", user_id="user1")

    assert len(result.retrieved_knowledge) == 1
    assert result.retrieved_knowledge[0].statement == "User likes Python"


async def test_empty_retrieval(retriever_env):
    env = retriever_env
    result = await env["retriever"].retrieve("anything", user_id="user1")
    assert len(result.retrieved_knowledge) == 0


async def test_user_isolation(retriever_env):
    env = retriever_env
    await _seed_knowledge(env["ks"], env["vi"], env["ti"], env["embedder"], "User A fact", user_id="userA")
    await _seed_knowledge(env["ks"], env["vi"], env["ti"], env["embedder"], "User B fact", user_id="userB")

    result_a = await env["retriever"].retrieve("User A fact", user_id="userA")
    result_b = await env["retriever"].retrieve("User A fact", user_id="userB")

    assert len(result_a.retrieved_knowledge) == 1
    assert result_a.retrieved_knowledge[0].statement == "User A fact"
    # userB should not see userA's knowledge even with same query
    statements_b = [k.statement for k in result_b.retrieved_knowledge]
    assert "User A fact" not in statements_b


async def test_top_k_limits(retriever_env):
    env = retriever_env
    for i in range(5):
        await _seed_knowledge(env["ks"], env["vi"], env["ti"], env["embedder"], f"Fact number {i}")

    result = await env["retriever"].retrieve("Fact", user_id="user1", top_k=3)
    assert len(result.retrieved_knowledge) <= 3


async def test_temporal_at_time(retriever_env):
    env = retriever_env
    # Fact valid from hour 10 to hour 14
    await _seed_knowledge(
        env["ks"],
        env["vi"],
        env["ti"],
        env["embedder"],
        "User worked at Acme",
        valid_at=_ts(10),
        invalid_at=_ts(14),
    )

    # Query at hour 12 → within validity window
    result_in = await env["retriever"].retrieve("User worked at Acme", user_id="user1", at_time=_ts(12))
    assert len(result_in.retrieved_knowledge) == 1

    # Query at hour 15 → outside validity window
    result_out = await env["retriever"].retrieve("User worked at Acme", user_id="user1", at_time=_ts(15))
    assert len(result_out.retrieved_knowledge) == 0


async def test_expired_excluded_by_default(retriever_env):
    env = retriever_env
    await _seed_knowledge(
        env["ks"],
        env["vi"],
        env["ti"],
        env["embedder"],
        "Old fact",
        expired_at=_ts(11),
    )

    result = await env["retriever"].retrieve("Old fact", user_id="user1")
    assert len(result.retrieved_knowledge) == 0


async def test_include_expired(retriever_env):
    env = retriever_env
    await _seed_knowledge(
        env["ks"],
        env["vi"],
        env["ti"],
        env["embedder"],
        "Old fact",
        expired_at=_ts(11),
    )

    result = await env["retriever"].retrieve("Old fact", user_id="user1", include_expired=True)
    assert len(result.retrieved_knowledge) == 1
    assert result.retrieved_knowledge[0].statement == "Old fact"


async def test_rrf_fusion_ordering(retriever_env):
    env = retriever_env
    # Seed two facts. The one matching the query text exactly should rank higher
    # because it appears in both vector and text search results.
    await _seed_knowledge(env["ks"], env["vi"], env["ti"], env["embedder"], "User likes Python programming")
    await _seed_knowledge(env["ks"], env["vi"], env["ti"], env["embedder"], "User enjoys cooking Italian food")

    result = await env["retriever"].retrieve("User likes Python programming", user_id="user1")

    assert len(result.retrieved_knowledge) >= 1
    # The exact match should be first due to RRF boosting from both sources
    assert result.retrieved_knowledge[0].statement == "User likes Python programming"


async def test_no_embedder_raises(tmp_path):
    db_path = str(tmp_path / "no_embedder.db")
    ks = KnowledgeStore(db_path)
    vi = VectorIndex(db_path, dimensions=4)
    ti = TextIndex(db_path)
    retriever = Retriever(knowledge_store=ks, vector_index=vi, text_index=ti, embedding_client=None)

    with pytest.raises(RuntimeError, match="Embedding client required"):
        await retriever.retrieve("test", user_id="user1")


async def test_to_prompt_format(retriever_env):
    env = retriever_env
    await _seed_knowledge(env["ks"], env["vi"], env["ti"], env["embedder"], "User likes Python")

    result = await env["retriever"].retrieve("User likes Python", user_id="user1")
    prompt = result.to_prompt()

    assert "## Relevant Context" in prompt
    assert "- User likes Python" in prompt
