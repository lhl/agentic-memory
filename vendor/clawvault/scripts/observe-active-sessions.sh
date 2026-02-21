#!/usr/bin/env bash
set -euo pipefail

CLAWVAULT_BIN="${CLAWVAULT_BIN:-clawvault}"

ARGS=(observe --cron)

if [[ -n "${CLAWVAULT_AGENT_ID:-}" ]]; then
  ARGS+=(--agent "${CLAWVAULT_AGENT_ID}")
fi

if [[ -n "${CLAWVAULT_ACTIVE_MIN_NEW:-}" ]]; then
  ARGS+=(--min-new "${CLAWVAULT_ACTIVE_MIN_NEW}")
fi

if [[ -n "${CLAWVAULT_SESSIONS_DIR:-}" ]]; then
  ARGS+=(--sessions-dir "${CLAWVAULT_SESSIONS_DIR}")
fi

if [[ "${CLAWVAULT_ACTIVE_DRY_RUN:-0}" == "1" ]]; then
  ARGS+=(--dry-run)
fi

if [[ -n "${CLAWVAULT_PATH:-}" ]]; then
  ARGS+=(-v "${CLAWVAULT_PATH}")
fi

if [[ $# -gt 0 ]]; then
  ARGS+=("$@")
fi

exec "${CLAWVAULT_BIN}" "${ARGS[@]}"
