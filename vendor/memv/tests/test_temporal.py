"""Tests for temporal parsing utilities."""

from datetime import datetime, timezone

from memv.processing.temporal import (
    backfill_temporal_fields,
    contains_relative_time,
    parse_temporal_expression,
)


def _ref(year=2024, month=6, day=15, hour=12):
    return datetime(year, month, day, hour, 0, 0, tzinfo=timezone.utc)


# ---------------------------------------------------------------------------
# contains_relative_time
# ---------------------------------------------------------------------------


class TestContainsRelativeTime:
    def test_yesterday(self):
        assert contains_relative_time("User started yesterday")

    def test_today(self):
        assert contains_relative_time("User is working today")

    def test_tomorrow(self):
        assert contains_relative_time("User will finish tomorrow")

    def test_last_week(self):
        assert contains_relative_time("User mentioned last week")

    def test_next_month(self):
        assert contains_relative_time("User plans to move next month")

    def test_n_days_ago(self):
        assert contains_relative_time("User joined 3 days ago")

    def test_n_years_from_now(self):
        assert contains_relative_time("User plans to retire 5 years from now")

    def test_recently(self):
        assert contains_relative_time("User recently switched to Rust")

    def test_soon(self):
        assert contains_relative_time("User will deploy soon")

    def test_absolute_date_not_flagged(self):
        assert not contains_relative_time("User started on 2024-06-14")

    def test_plain_text_not_flagged(self):
        assert not contains_relative_time("User prefers Python over JavaScript")

    def test_iso_date_not_flagged(self):
        assert not contains_relative_time("User moved to Berlin in 2023")

    def test_case_insensitive(self):
        assert contains_relative_time("User started YESTERDAY")

    def test_earlier_as_adjective_not_flagged(self):
        assert not contains_relative_time("User prefers the earlier version of Python")

    def test_later_as_adjective_not_flagged(self):
        assert not contains_relative_time("User upgraded to a later release of Node")


# ---------------------------------------------------------------------------
# parse_temporal_expression
# ---------------------------------------------------------------------------


class TestParseTemporalExpression:
    def test_yesterday(self):
        result = parse_temporal_expression("yesterday", _ref())
        assert result == datetime(2024, 6, 14, 12, 0, 0, tzinfo=timezone.utc)

    def test_tomorrow(self):
        result = parse_temporal_expression("tomorrow", _ref())
        assert result == datetime(2024, 6, 16, 12, 0, 0, tzinfo=timezone.utc)

    def test_today(self):
        result = parse_temporal_expression("today", _ref())
        assert result == _ref()

    def test_last_week(self):
        result = parse_temporal_expression("last week", _ref())
        assert result == datetime(2024, 6, 8, 12, 0, 0, tzinfo=timezone.utc)

    def test_3_days_ago(self):
        result = parse_temporal_expression("3 days ago", _ref())
        assert result == datetime(2024, 6, 12, 12, 0, 0, tzinfo=timezone.utc)

    def test_2_months_from_now(self):
        result = parse_temporal_expression("2 months from now", _ref())
        assert result == datetime(2024, 8, 15, 12, 0, 0, tzinfo=timezone.utc)

    def test_iso_8601(self):
        result = parse_temporal_expression("2024-01-15", _ref())
        assert result is not None
        assert result.year == 2024
        assert result.month == 1
        assert result.day == 15

    def test_natural_date(self):
        result = parse_temporal_expression("January 2024", _ref())
        assert result is not None
        assert result.year == 2024
        assert result.month == 1

    def test_garbage_returns_none(self):
        result = parse_temporal_expression("not a date at all xyz", _ref())
        assert result is None

    def test_last_monday(self):
        # 2024-06-15 is a Saturday (weekday=5), last Monday = 2024-06-10
        result = parse_temporal_expression("last monday", _ref())
        assert result is not None
        assert result.weekday() == 0  # Monday
        assert result < _ref()

    def test_next_friday(self):
        # 2024-06-15 is a Saturday (weekday=5), next Friday = 2024-06-21
        result = parse_temporal_expression("next friday", _ref())
        assert result is not None
        assert result.weekday() == 4  # Friday
        assert result > _ref()

    def test_next_monday_when_ref_is_monday(self):
        # 2024-06-10 is a Monday — "next monday" should return 2024-06-17, not same day
        ref_monday = _ref(year=2024, month=6, day=10)
        result = parse_temporal_expression("next monday", ref_monday)
        assert result is not None
        assert result.weekday() == 0  # Monday
        assert result > ref_monday  # must be future, not same day


# ---------------------------------------------------------------------------
# backfill_temporal_fields
# ---------------------------------------------------------------------------


class TestBackfillTemporalFields:
    def test_since_x(self):
        valid_at, invalid_at = backfill_temporal_fields(
            "since January 2024",
            None,
            None,
            _ref(),
        )
        assert valid_at is not None
        assert valid_at.year == 2024
        assert valid_at.month == 1
        assert invalid_at is None

    def test_until_x(self):
        valid_at, invalid_at = backfill_temporal_fields(
            "until December 2024",
            None,
            None,
            _ref(),
        )
        assert valid_at is None
        assert invalid_at is not None
        assert invalid_at.year == 2024
        assert invalid_at.month == 12

    def test_from_x_to_y(self):
        valid_at, invalid_at = backfill_temporal_fields(
            "from January 2024 to June 2024",
            None,
            None,
            _ref(),
        )
        assert valid_at is not None
        assert valid_at.month == 1
        assert invalid_at is not None
        assert invalid_at.month == 6

    def test_preserves_existing_valid_at(self):
        existing = datetime(2023, 1, 1, tzinfo=timezone.utc)
        valid_at, invalid_at = backfill_temporal_fields(
            "since March 2024",
            existing,
            None,
            _ref(),
        )
        assert valid_at == existing  # preserved, not overwritten

    def test_preserves_existing_invalid_at(self):
        existing = datetime(2025, 12, 31, tzinfo=timezone.utc)
        valid_at, invalid_at = backfill_temporal_fields(
            "until March 2024",
            None,
            existing,
            _ref(),
        )
        assert invalid_at == existing  # preserved

    def test_none_temporal_info_noop(self):
        valid_at, invalid_at = backfill_temporal_fields(None, None, None, _ref())
        assert valid_at is None
        assert invalid_at is None

    def test_empty_string_noop(self):
        valid_at, invalid_at = backfill_temporal_fields("", None, None, _ref())
        assert valid_at is None
        assert invalid_at is None

    def test_unparseable_temporal_info(self):
        valid_at, invalid_at = backfill_temporal_fields(
            "some random text",
            None,
            None,
            _ref(),
        )
        # Should not crash, fields stay None
        assert valid_at is None
        assert invalid_at is None

    def test_since_relative_date(self):
        # "since yesterday" should resolve relative to reference
        valid_at, invalid_at = backfill_temporal_fields(
            "since yesterday",
            None,
            None,
            _ref(),
        )
        assert valid_at is not None
        assert valid_at == datetime(2024, 6, 14, 12, 0, 0, tzinfo=timezone.utc)
        assert invalid_at is None

    def test_bare_to_not_matched_as_until(self):
        # "related to data pipelines" should not trigger _UNTIL_PATTERN
        valid_at, invalid_at = backfill_temporal_fields(
            "related to data pipelines",
            None,
            None,
            _ref(),
        )
        assert valid_at is None
        assert invalid_at is None

    def test_began_prefix(self):
        valid_at, invalid_at = backfill_temporal_fields(
            "began January 2024",
            None,
            None,
            _ref(),
        )
        assert valid_at is not None
        assert valid_at.year == 2024
        assert valid_at.month == 1
