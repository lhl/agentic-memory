"""Task management: auto-processing, buffering, background tasks."""

from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING

from memv.models import ProcessStatus, ProcessTask

if TYPE_CHECKING:
    from memv.memory._lifecycle import LifecycleManager
    from memv.memory._pipeline import Pipeline


class TaskManager:
    """Manages background processing tasks and message buffering."""

    def __init__(self, lifecycle: LifecycleManager, pipeline: Pipeline):
        self._lc = lifecycle
        self._pipeline = pipeline
        self._buffers: dict[str, int] = {}
        self._processing_tasks: dict[str, ProcessTask] = {}

    async def recover_buffer_state(self) -> None:
        """Recover buffer counts from DB state after restart."""
        users = await self._lc.messages.list_users()
        for user_id in users:
            all_messages = await self._lc.messages.get_by_user(user_id)
            episodes = await self._lc.episodes.get_by_user(user_id)

            if episodes:
                latest_end = max(ep.end_time for ep in episodes)
                unprocessed_count = sum(1 for m in all_messages if m.sent_at > latest_end)
            else:
                unprocessed_count = len(all_messages)

            if unprocessed_count > 0:
                self._buffers[user_id] = unprocessed_count

    async def cancel_pending_tasks(self, wait: bool = False) -> None:
        """Cancel or wait for pending processing tasks."""
        for _user_id, task in list(self._processing_tasks.items()):
            if not task.done:
                if not wait and task._task is not None:
                    task._task.cancel()
                    try:
                        await task._task
                    except asyncio.CancelledError:
                        pass
                else:
                    await task.wait()

        self._processing_tasks.clear()
        self._buffers.clear()

    def increment_buffer(self, user_id: str, count: int = 2) -> None:
        """Increment buffer count for a user."""
        self._buffers[user_id] = self._buffers.get(user_id, 0) + count

    def should_process(self, user_id: str) -> bool:
        """Check if buffer has reached threshold."""
        return self._buffers.get(user_id, 0) >= self._lc.batch_threshold

    def schedule_processing(self, user_id: str) -> None:
        """Schedule background processing if not already running."""
        existing = self._processing_tasks.get(user_id)
        if existing is not None and not existing.done:
            return

        task = self.process_async(user_id)
        self._processing_tasks[user_id] = task
        self._buffers[user_id] = 0

    def process_async(self, user_id: str) -> ProcessTask:
        """
        Non-blocking process. Returns handle to monitor/await.

        Returns:
            ProcessTask handle to monitor progress or await completion
        """
        self._lc.ensure_open()
        if self._lc.llm is None:
            raise RuntimeError("LLM client required for processing. Pass llm_client to Memory().")

        task = ProcessTask(user_id=user_id, status=ProcessStatus.RUNNING)

        async def _run() -> int:
            try:
                result = await self._pipeline.process(user_id)
                task.knowledge_count = result
                task.status = ProcessStatus.COMPLETED
                return result
            except Exception as e:
                task.status = ProcessStatus.FAILED
                task.error = str(e)
                raise

        task._task = asyncio.create_task(_run())
        return task

    async def wait_for_processing(self, user_id: str, timeout: float | None = None) -> int:
        """
        Wait for background processing to complete.

        Returns:
            Number of knowledge entries extracted, or 0 if no task running

        Raises:
            asyncio.TimeoutError: If timeout is exceeded
        """
        task = self._processing_tasks.get(user_id)
        if task is None or task.done:
            return task.knowledge_count if task else 0

        if timeout is not None:
            return await asyncio.wait_for(task.wait(), timeout)
        return await task.wait()

    async def flush(self, user_id: str) -> int:
        """
        Force processing of buffered messages regardless of threshold.

        Returns:
            Number of knowledge entries extracted
        """
        self._lc.ensure_open()
        if self._lc.llm is None:
            raise RuntimeError("LLM client required for processing.")

        self.schedule_processing(user_id)
        return await self.wait_for_processing(user_id)

    async def cancel_user_tasks(self, user_id: str) -> None:
        """Cancel pending tasks for a specific user."""
        existing_task = self._processing_tasks.get(user_id)
        if existing_task and not existing_task.done and existing_task._task:
            existing_task._task.cancel()
            try:
                await existing_task._task
            except asyncio.CancelledError:
                pass
        self._processing_tasks.pop(user_id, None)
        self._buffers.pop(user_id, None)
