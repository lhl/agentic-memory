"""
Episode generation.

Transforms segmented conversations into structured episodic memories
with titles and third-person narratives.
"""

from datetime import datetime

from memv.models import Episode, Message
from memv.processing.prompts import episode_generation_prompt
from memv.protocols import LLMClient


class EpisodeGenerator:
    """
    Generates episodic memories from conversation segments.

    Transforms raw message sequences into structured episodes with:
    - Title: Concise summary of the episode's core theme
    - Narrative: Third-person account preserving key information

    This implements Nemori's "Representation Alignment" principle.
    """

    def __init__(self, llm_client: LLMClient):
        self.llm = llm_client

    async def generate(
        self,
        messages: list[Message],
        user_id: str,
    ) -> Episode:
        """
        Generate an episode from a conversation segment.

        Args:
            messages: The messages comprising this episode
            user_id: User ID for the episode

        Returns:
            A structured Episode with title, content, and original messages
        """
        if not messages:
            raise ValueError("Cannot generate episode from empty message list")

        # Format conversation for LLM
        conversation = self._format_conversation(messages)

        # Get reference timestamp for resolving relative dates
        reference_time = messages[-1].sent_at

        # Generate title and content
        title, content = await self._generate_title_and_content(conversation, reference_time)

        # Store raw messages on episode (Nemori pattern)
        original_messages = [{"role": m.role.value, "content": m.content, "sent_at": m.sent_at.isoformat()} for m in messages]

        # Build episode
        return Episode(
            user_id=user_id,
            title=title,
            content=content,
            original_messages=original_messages,
            start_time=messages[0].sent_at,
            end_time=messages[-1].sent_at,
        )

    async def _generate_title_and_content(
        self,
        conversation: str,
        reference_time: datetime,
    ) -> tuple[str, str]:
        """Generate title and content via LLM."""
        prompt = episode_generation_prompt(conversation, reference_time.isoformat())
        response = await self.llm.generate(prompt)
        return self._parse_response(response)

    def _format_conversation(self, messages: list[Message]) -> str:
        """Format messages into readable conversation."""
        lines = []
        for msg in messages:
            timestamp = msg.sent_at.strftime("%Y-%m-%d %H:%M")
            lines.append(f"[{timestamp}] {msg.role.value}: {msg.content}")
        return "\n".join(lines)

    def _parse_response(self, response: str) -> tuple[str, str]:
        """Parse LLM response into title and content."""
        import json

        try:
            # Handle markdown code blocks
            if "```json" in response:
                start = response.index("```json") + 7
                end = response.index("```", start)
                response = response[start:end]
            elif "```" in response:
                start = response.index("```") + 3
                end = response.index("```", start)
                response = response[start:end]

            data = json.loads(response.strip())

            title = data.get("title", "Untitled Episode")
            content = data.get("content", "")

            if not content:
                raise ValueError("Empty content")

            return title, content

        except (json.JSONDecodeError, ValueError, KeyError):
            # Fallback: use raw response as content
            return "Conversation Episode", response.strip()
