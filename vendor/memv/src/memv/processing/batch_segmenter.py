"""
Batch segmentation for episode boundary detection.

Groups messages into coherent episodes using a single LLM call,
handling interleaved topics and time gaps correctly.
"""

import json
from datetime import timedelta

from memv.models import Message
from memv.processing.prompts import batch_segmentation_prompt
from memv.protocols import LLMClient


class BatchSegmenter:
    """
    Segments messages into episodes using batch processing.

    Key improvements over incremental boundary detection:
    - Handles interleaved topics (non-consecutive message groupings)
    - Uses time gaps as automatic segmentation boundaries
    - Single LLM call for entire batch (more efficient)

    Args:
        llm_client: LLM for semantic grouping
        batch_threshold: Max messages before forcing segmentation (default 20)
        time_gap_threshold: Time gap that forces a segment boundary (default 30 min)
    """

    def __init__(
        self,
        llm_client: LLMClient,
        batch_threshold: int = 20,
        time_gap_minutes: int = 30,
    ):
        self.llm = llm_client
        self.batch_threshold = batch_threshold
        self.time_gap = timedelta(minutes=time_gap_minutes)

    async def segment(self, messages: list[Message]) -> list[list[Message]]:
        """
        Segment messages into episode groups.

        Flow:
        1. Split on time gaps first (creates independent batches)
        2. For each batch, use LLM to group by topic
        3. Return all episode groups

        Args:
            messages: Messages to segment (should be chronologically ordered)

        Returns:
            List of message groups, each group becomes one episode
        """
        if not messages:
            return []

        if len(messages) == 1:
            return [messages]

        # Step 1: Split on time gaps
        time_batches = self._split_on_time_gaps(messages)

        # Step 2: Segment each batch semantically
        all_episodes: list[list[Message]] = []
        for batch in time_batches:
            if len(batch) <= 2:
                # Small batches don't need LLM segmentation
                all_episodes.append(batch)
            else:
                # Use LLM to group by topic
                episode_groups = await self._segment_batch(batch)
                all_episodes.extend(episode_groups)

        return all_episodes

    def _split_on_time_gaps(self, messages: list[Message]) -> list[list[Message]]:
        """Split messages into batches based on time gaps."""
        if not messages:
            return []

        batches: list[list[Message]] = []
        current_batch: list[Message] = [messages[0]]

        for i in range(1, len(messages)):
            prev_msg = messages[i - 1]
            curr_msg = messages[i]

            gap = curr_msg.sent_at - prev_msg.sent_at
            if gap >= self.time_gap:
                # Time gap detected, start new batch
                batches.append(current_batch)
                current_batch = [curr_msg]
            else:
                current_batch.append(curr_msg)

        # Don't forget the last batch
        if current_batch:
            batches.append(current_batch)

        return batches

    async def _segment_batch(self, messages: list[Message]) -> list[list[Message]]:
        """Use LLM to semantically group messages within a batch."""
        # Format messages for prompt
        messages_text = self._format_messages(messages)

        # Get groupings from LLM
        prompt = batch_segmentation_prompt(messages_text)
        response = await self.llm.generate(prompt)

        # Parse response into index groups
        index_groups = self._parse_response(response, len(messages))

        # Convert index groups to message groups
        return [[messages[i] for i in group] for group in index_groups]

    def _format_messages(self, messages: list[Message]) -> str:
        """Format messages with indices for LLM prompt."""
        lines = []
        for i, msg in enumerate(messages):
            timestamp = msg.sent_at.strftime("%Y-%m-%d %H:%M")
            lines.append(f"[{i}] [{timestamp}] {msg.role.value}: {msg.content}")
        return "\n".join(lines)

    def _parse_response(self, response: str, num_messages: int) -> list[list[int]]:
        """
        Parse LLM response into index groups.

        Handles:
        - JSON array of arrays: [[0,1,2], [3,4]]
        - Markdown code blocks
        - Fallback to single group on parse failure
        """
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

            groups = json.loads(response.strip())

            # Validate structure
            if not isinstance(groups, list):
                raise ValueError("Response is not a list")

            # Validate and normalize groups
            validated = self._validate_groups(groups, num_messages)
            return validated

        except (json.JSONDecodeError, ValueError):
            # Fallback: all messages in one group
            return [list(range(num_messages))]

    def _validate_groups(self, groups: list, num_messages: int) -> list[list[int]]:
        """
        Validate and normalize index groups.

        Ensures:
        - All indices are valid (0 to num_messages-1)
        - Every message appears exactly once
        - Groups maintain chronological order of first message
        """
        seen_indices: set[int] = set()
        valid_groups: list[list[int]] = []

        for group in groups:
            if not isinstance(group, list):
                continue

            valid_indices = []
            for idx in group:
                if isinstance(idx, int) and 0 <= idx < num_messages and idx not in seen_indices:
                    valid_indices.append(idx)
                    seen_indices.add(idx)

            if valid_indices:
                valid_groups.append(valid_indices)

        # Add any missing indices as individual groups
        for i in range(num_messages):
            if i not in seen_indices:
                valid_groups.append([i])

        # Sort groups by first message index
        valid_groups.sort(key=lambda g: min(g))

        return valid_groups
