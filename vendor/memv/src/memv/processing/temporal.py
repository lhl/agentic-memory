"""Temporal parsing utilities for knowledge atomization.

Safety net for when LLMs ignore reference_timestamp instructions.
Validates and backfills temporal fields on extracted knowledge.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone

from dateutil.parser import parse as dateutil_parse
from dateutil.relativedelta import relativedelta

# Relative time patterns that indicate unresolved temporal references
_RELATIVE_PATTERNS = re.compile(
    r"\b("
    r"yesterday|today|tomorrow"
    r"|(?:last|next|this)\s+(?:week|month|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday)"
    r"|recently|soon"
    r"|\d+\s+(?:days?|weeks?|months?|years?)\s+(?:ago|from\s+now)"
    r")\b",
    re.IGNORECASE,
)

# Named relative expressions → relativedelta offsets
_RELATIVE_OFFSETS: dict[str, relativedelta] = {
    "yesterday": relativedelta(days=-1),
    "today": relativedelta(),
    "tomorrow": relativedelta(days=1),
    "last week": relativedelta(weeks=-1),
    "next week": relativedelta(weeks=1),
    "this week": relativedelta(),
    "last month": relativedelta(months=-1),
    "next month": relativedelta(months=1),
    "this month": relativedelta(),
    "last year": relativedelta(years=-1),
    "next year": relativedelta(years=1),
    "this year": relativedelta(),
}

# N units ago / from now
_WEEKDAY_NAMES = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

_N_UNITS_PATTERN = re.compile(
    r"(\d+)\s+(days?|weeks?|months?|years?)\s+(ago|from\s+now)",
    re.IGNORECASE,
)

# Backfill patterns for temporal_info strings
_SINCE_PATTERN = re.compile(r"(?:since|from|starting|began)\s+(.+?)(?:\s*$|\s*(?:to|until|through)\s+)", re.IGNORECASE)
_UNTIL_PATTERN = re.compile(r"(?:until|through|ending|ended?)\s+(.+?)$", re.IGNORECASE)
_FROM_TO_PATTERN = re.compile(r"(?:from|since)\s+(.+?)\s+(?:to|until|through)\s+(.+?)$", re.IGNORECASE)


def contains_relative_time(text: str) -> bool:
    """Check if text contains unresolved relative time expressions."""
    return bool(_RELATIVE_PATTERNS.search(text))


def parse_temporal_expression(text: str, reference: datetime) -> datetime | None:
    """Parse a temporal expression relative to a reference time.

    Handles common relative patterns via relativedelta, falls through
    to dateutil.parser.parse for natural language / ISO dates.
    Returns None on failure.
    """
    normalized = text.strip().lower()

    # Named relative offsets
    if normalized in _RELATIVE_OFFSETS:
        return reference + _RELATIVE_OFFSETS[normalized]

    # "last/next <weekday>" patterns
    for prefix, direction in [("last", -1), ("next", 1)]:
        for target_weekday, day_name in enumerate(_WEEKDAY_NAMES):
            if normalized == f"{prefix} {day_name}":
                days_diff = (reference.weekday() - target_weekday) % 7
                if direction == -1:
                    days_diff = days_diff or 7
                    return reference - relativedelta(days=days_diff)
                else:
                    days_diff = (target_weekday - reference.weekday()) % 7
                    days_diff = days_diff or 7
                    return reference + relativedelta(days=days_diff)

    # "N days/weeks/months/years ago/from now"
    # .match() is intentionally start-anchored — input is already stripped/normalized
    match = _N_UNITS_PATTERN.match(normalized)
    if match:
        n = int(match.group(1))
        unit = match.group(2).removesuffix("s")  # normalize "days" -> "day"
        direction = -1 if match.group(3).lower() == "ago" else 1
        unit_map = {"day": "days", "week": "weeks", "month": "months", "year": "years"}
        delta = relativedelta(**{unit_map[unit]: n * direction})
        return reference + delta

    # Fall through to dateutil for ISO 8601 and natural dates
    try:
        return dateutil_parse(text, default=reference.replace(hour=0, minute=0, second=0, microsecond=0))
    except (ValueError, OverflowError):
        return None


def backfill_temporal_fields(
    temporal_info: str | None,
    valid_at: datetime | None,
    invalid_at: datetime | None,
    reference: datetime,
) -> tuple[datetime | None, datetime | None]:
    """Attempt to populate valid_at/invalid_at from temporal_info string.

    Only fills None fields — preserves existing values.
    Returns (valid_at, invalid_at).
    """
    if not temporal_info:
        return valid_at, invalid_at

    # "from X to Y" — try to fill both
    from_to = _FROM_TO_PATTERN.search(temporal_info)
    if from_to:
        if valid_at is None:
            parsed = parse_temporal_expression(from_to.group(1), reference)
            if parsed:
                valid_at = parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed
        if invalid_at is None:
            parsed = parse_temporal_expression(from_to.group(2), reference)
            if parsed:
                invalid_at = parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed
        return valid_at, invalid_at

    # "from X to Y" handled above — remaining checks are single-endpoint patterns

    # "since X" → valid_at
    if valid_at is None:
        since = _SINCE_PATTERN.search(temporal_info)
        if since:
            parsed = parse_temporal_expression(since.group(1), reference)
            if parsed:
                valid_at = parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed

    # "until X" → invalid_at
    if invalid_at is None:
        until = _UNTIL_PATTERN.search(temporal_info)
        if until:
            parsed = parse_temporal_expression(until.group(1), reference)
            if parsed:
                invalid_at = parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed

    return valid_at, invalid_at
