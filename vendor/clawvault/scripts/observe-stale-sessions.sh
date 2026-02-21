#!/usr/bin/env bash
set -euo pipefail

MODE="${CLAWVAULT_OBSERVE_MODE:-all}"
EXTRA_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --mode" >&2
        exit 2
      fi
      MODE="$2"
      shift 2
      ;;
    --mode=*)
      MODE="${1#--mode=}"
      shift
      ;;
    *)
      EXTRA_ARGS+=("$1")
      shift
      ;;
  esac
done

case "${MODE}" in
  all|stale|active)
    ;;
  *)
    echo "Invalid --mode '${MODE}'. Expected: all|stale|active" >&2
    exit 2
    ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAWVAULT_BIN="${CLAWVAULT_BIN:-clawvault}"

BASE_ARGS=()
if [[ -n "${CLAWVAULT_AGENT_ID:-}" ]]; then
  BASE_ARGS+=(--agent "${CLAWVAULT_AGENT_ID}")
fi
if [[ -n "${CLAWVAULT_SESSIONS_DIR:-}" ]]; then
  BASE_ARGS+=(--sessions-dir "${CLAWVAULT_SESSIONS_DIR}")
fi
if [[ -n "${CLAWVAULT_PATH:-}" ]]; then
  BASE_ARGS+=(-v "${CLAWVAULT_PATH}")
fi

run_stale_mode() {
  # Legacy stale sweep behavior: force observation for any unseen session delta.
  local min_new="${CLAWVAULT_STALE_MIN_NEW:-1}"
  "${CLAWVAULT_BIN}" observe --cron --min-new "${min_new}" "${BASE_ARGS[@]}" "${EXTRA_ARGS[@]}"
}

run_active_mode() {
  "${SCRIPT_DIR}/observe-active-sessions.sh" "${EXTRA_ARGS[@]}"
}

case "${MODE}" in
  stale)
    run_stale_mode
    ;;
  active)
    run_active_mode
    ;;
  all)
    run_stale_mode
    run_active_mode
    ;;
esac
