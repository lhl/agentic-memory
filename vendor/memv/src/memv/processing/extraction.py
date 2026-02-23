"""
Predict-calibrate extraction.

Nemori's core innovation: importance emerges from prediction error,
not upfront LLM scoring.
"""

import logging

from pydantic import BaseModel, Field

from memv.models import Episode, ExtractedKnowledge, SemanticKnowledge
from memv.processing.prompts import (
    cold_start_extraction_prompt,
    extraction_prompt_with_prediction,
    prediction_prompt,
)
from memv.protocols import LLMClient

logger = logging.getLogger(__name__)


class ExtractionResponse(BaseModel):
    """Structured response from calibration LLM call."""

    extracted: list[ExtractedKnowledge] = Field(default_factory=list)


class PredictCalibrateExtractor:
    """
    Extract novel knowledge by comparing predictions against reality.

    Flow:
    1. Predict what the episode should contain (given existing knowledge)
    2. Compare prediction vs actual episode
    3. Extract only what we FAILED to predict

    Key insight:
    - Episode content is for RETRIEVAL (narrative is fine)
    - Extraction source is ONLY original messages (ground truth)
    - Cold start and prediction-based both use original_messages
    """

    def __init__(self, llm_client: LLMClient):
        self.llm = llm_client

    async def extract(
        self,
        episode: Episode,
        existing_knowledge: list[SemanticKnowledge],
    ) -> list[ExtractedKnowledge]:
        """
        Core predict-calibrate loop.

        Args:
            episode: The episode to extract from (contains original_messages)
            existing_knowledge: Already-known facts to predict against

        Returns:
            Only genuinely novel knowledge
        """
        # Stage 1: Predict
        prediction = await self._predict(episode.title, existing_knowledge)

        # Stage 2: Calibrate
        # Cold start (no prediction): use episode content + original messages
        # With prediction: compare against original messages
        novel = await self._extract_gaps(prediction, episode)

        return novel

    async def _predict(
        self,
        episode_title: str,
        existing_knowledge: list[SemanticKnowledge],
    ) -> str:
        """
        Predict what the episode likely contains based on existing KB.

        This is the "world model" generating expectations.
        """
        if not existing_knowledge:
            # No existing knowledge = can't predict anything
            # Everything in the episode is novel by definition
            return ""

        knowledge_text = self._format_knowledge(existing_knowledge)
        prompt = prediction_prompt(knowledge_text, episode_title)

        return await self.llm.generate(prompt)

    async def _extract_gaps(
        self,
        prediction: str,
        episode: Episode,
    ) -> list[ExtractedKnowledge]:
        """
        Compare prediction to reality, extract what we missed.

        Importance emerges here:
        - Predicted correctly → already known → don't extract
        - Prediction failed → novel information → extract

        Both cold-start and prediction-based extraction use original_messages only.
        Episode content is for retrieval, not extraction - it's LLM-generated
        and can corrupt facts (wrong acronym expansions, transformed phrasing).
        """
        # Use episode end_time as reference for resolving relative dates
        reference_timestamp = episode.end_time.isoformat() if episode.end_time else None

        if not prediction:
            # Cold start: use original messages only (episode title for context)
            logger.info(f"Cold start extraction for episode: {episode.title}")
            prompt = cold_start_extraction_prompt(
                episode.title,
                episode.original_messages,
                reference_timestamp,
            )
        else:
            # With prediction: compare against raw conversation
            logger.info(f"Prediction-based extraction for episode: {episode.title}")
            raw_content = self._format_messages(episode.original_messages)
            prompt = extraction_prompt_with_prediction(prediction, raw_content, reference_timestamp)

        logger.debug(f"Extraction prompt:\n{prompt[:500]}...")
        response = await self.llm.generate_structured(prompt, ExtractionResponse)
        logger.info(f"Extraction result: {len(response.extracted)} items")
        for item in response.extracted:
            logger.info(f"  - {item.statement} (conf={item.confidence})")
        return response.extracted

    def _format_messages(self, messages: list[dict]) -> str:
        """Format original messages for the prompt, highlighting user statements."""
        lines = []
        for msg in messages:
            if msg["role"] == "user":
                lines.append(f">>> USER: {msg['content']}")
            else:
                lines.append(f"ASSISTANT: {msg['content']}")
        return "\n".join(lines)

    def _format_knowledge(self, knowledge: list[SemanticKnowledge]) -> str:
        """Format existing knowledge for the prompt."""
        return "\n".join(f"- {k.statement}" for k in knowledge)
