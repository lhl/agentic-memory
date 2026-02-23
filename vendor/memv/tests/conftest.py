import hashlib
import struct
from datetime import datetime, timezone
from uuid import uuid4

import pytest

from memv.models import Episode, Message, MessageRole, SemanticKnowledge
from memv.storage.sqlite._episodes import EpisodeStore
from memv.storage.sqlite._knowledge import KnowledgeStore
from memv.storage.sqlite._messages import MessageStore
from memv.storage.sqlite._text_index import TextIndex
from memv.storage.sqlite._vector_index import VectorIndex


@pytest.fixture
async def message_store(tmp_path):
    store = MessageStore(str(tmp_path / "test.db"))
    async with store:
        yield store


@pytest.fixture
async def episode_store(tmp_path):
    store = EpisodeStore(str(tmp_path / "test.db"))
    async with store:
        yield store


@pytest.fixture
async def knowledge_store(tmp_path):
    store = KnowledgeStore(str(tmp_path / "test.db"))
    async with store:
        yield store


@pytest.fixture
async def text_index(tmp_path):
    idx = TextIndex(str(tmp_path / "test.db"))
    async with idx:
        yield idx


@pytest.fixture
async def vector_index(tmp_path):
    idx = VectorIndex(str(tmp_path / "test.db"), dimensions=4)
    try:
        await idx.open()
    except ImportError as e:
        pytest.skip(f"sqlite-vec extension not available: {e}")
    try:
        yield idx
    finally:
        await idx.close()


def make_message(user_id="user1", role=MessageRole.USER, content="hello", sent_at=None):
    return Message(
        user_id=user_id,
        role=role,
        content=content,
        sent_at=sent_at or datetime(2024, 6, 15, 12, 0, 0, tzinfo=timezone.utc),
    )


def make_episode(user_id="user1", title="Test Episode", content="A test episode.", start_time=None, end_time=None):
    return Episode(
        user_id=user_id,
        title=title,
        content=content,
        original_messages=[{"role": "user", "content": "Hi"}, {"role": "assistant", "content": "Hello"}],
        start_time=start_time or datetime(2024, 6, 15, 12, 0, 0, tzinfo=timezone.utc),
        end_time=end_time or datetime(2024, 6, 15, 13, 0, 0, tzinfo=timezone.utc),
        created_at=datetime(2024, 6, 15, 13, 0, 0, tzinfo=timezone.utc),
    )


def make_knowledge(episode_id=None, statement="User likes Python", embedding=None, valid_at=None, invalid_at=None, expired_at=None):
    return SemanticKnowledge(
        statement=statement,
        source_episode_id=episode_id or uuid4(),
        embedding=embedding,
        valid_at=valid_at,
        invalid_at=invalid_at,
        expired_at=expired_at,
        created_at=datetime(2024, 6, 15, 12, 0, 0, tzinfo=timezone.utc),
    )


# ---------------------------------------------------------------------------
# Mock LLM & Embedding clients
# ---------------------------------------------------------------------------


class MockLLM:
    """Mock LLM client with sequential canned responses.

    Usage:
        llm = MockLLM()
        llm.set_responses("generate", ["response1", "response2"])
        llm.set_responses("generate_structured", [obj1, obj2])
    """

    def __init__(self):
        self._responses: dict[str, list] = {"generate": [], "generate_structured": []}
        self._call_index: dict[str, int] = {"generate": 0, "generate_structured": 0}
        self.calls: dict[str, list] = {"generate": [], "generate_structured": []}

    def set_responses(self, method: str, responses: list) -> None:
        self._responses[method] = responses
        self._call_index[method] = 0

    async def generate(self, prompt: str) -> str:
        self.calls["generate"].append(prompt)
        idx = self._call_index["generate"]
        responses = self._responses["generate"]
        if idx >= len(responses):
            raise RuntimeError(f"MockLLM.generate: no response at index {idx} (have {len(responses)})")
        self._call_index["generate"] = idx + 1
        return responses[idx]

    async def generate_structured(self, prompt: str, response_model: type):
        self.calls["generate_structured"].append((prompt, response_model))
        idx = self._call_index["generate_structured"]
        responses = self._responses["generate_structured"]
        if idx >= len(responses):
            raise RuntimeError(f"MockLLM.generate_structured: no response at index {idx} (have {len(responses)})")
        self._call_index["generate_structured"] = idx + 1
        return responses[idx]


class MockEmbedder:
    """Mock embedding client using SHA-256 hash → deterministic unit vector.

    Same text → identical vector (cosine sim = 1.0).
    Different text → near-orthogonal vector (sim ≈ 0).
    """

    def __init__(self, dimensions: int = 1536):
        self.dimensions = dimensions
        self.calls: list[str | list[str]] = []

    def _hash_to_vector(self, text: str) -> list[float]:
        digest = hashlib.sha256(text.encode()).digest()
        # Expand hash to fill dimensions (repeat hash bytes as needed)
        needed_bytes = self.dimensions * 4  # 4 bytes per float
        expanded = digest * (needed_bytes // len(digest) + 1)
        expanded = expanded[:needed_bytes]
        raw = struct.unpack(f"{self.dimensions}f", expanded)
        # Normalize to unit vector
        norm = sum(x * x for x in raw) ** 0.5
        if norm == 0:
            return [0.0] * self.dimensions
        return [x / norm for x in raw]

    async def embed(self, text: str) -> list[float]:
        self.calls.append(text)
        return self._hash_to_vector(text)

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        self.calls.append(texts)
        return [self._hash_to_vector(t) for t in texts]


@pytest.fixture
def mock_llm():
    return MockLLM()


@pytest.fixture
def mock_embedder():
    return MockEmbedder(dimensions=1536)


@pytest.fixture
async def pipeline_stores(tmp_path):
    """All 5 stores on a single temp DB for pipeline/e2e tests."""
    db_path = str(tmp_path / "pipeline.db")
    messages = MessageStore(db_path)
    episodes = EpisodeStore(db_path)
    knowledge = KnowledgeStore(db_path)
    text_idx = TextIndex(db_path)
    vec_idx = VectorIndex(db_path, dimensions=1536)

    await messages.open()
    await episodes.open()
    await knowledge.open()
    await text_idx.open()
    try:
        await vec_idx.open()
    except ImportError:
        await text_idx.close()
        await knowledge.close()
        await episodes.close()
        await messages.close()
        pytest.skip("sqlite-vec extension not available")

    yield {
        "db_path": db_path,
        "messages": messages,
        "episodes": episodes,
        "knowledge": knowledge,
        "text_index": text_idx,
        "vector_index": vec_idx,
    }

    await vec_idx.close()
    await text_idx.close()
    await knowledge.close()
    await episodes.close()
    await messages.close()
