---
name: clawvault
description: "Context resilience - recovery detection, auto-checkpoint, and session context injection"
metadata:
  openclaw:
    emoji: "🐘"
    events: ["gateway:startup", "gateway:heartbeat", "command:new", "session:start", "compaction:memoryFlush", "cron.weekly"]
    requires:
      bins: ["clawvault"]
---

# ClawVault Hook

Integrates ClawVault's context death resilience into OpenClaw:

- **On gateway startup**: Checks for context death, alerts agent
- **On heartbeat**: Runs cheap threshold checks and observes active sessions when needed
- **On /new command**: Auto-checkpoints before session reset
- **On context compaction**: Forces incremental observation flush before context is lost
- **On session start**: Injects relevant vault context for the initial prompt
- **On weekly cron**: Runs `clawvault reflect` every Sunday midnight (UTC)

## Installation

```bash
npm install -g clawvault
openclaw hooks install clawvault
openclaw hooks enable clawvault

# Verify
openclaw hooks list --verbose
openclaw hooks info clawvault
openclaw hooks check
```

After enabling, restart your OpenClaw gateway process so hook registration reloads.

## Requirements

- ClawVault CLI installed globally
- Vault initialized (`clawvault setup` or `CLAWVAULT_PATH` set)

## What It Does

### Gateway Startup

1. Runs `clawvault recover --clear`
2. If context death detected, injects warning into first agent turn
3. Clears dirty death flag for clean session start

### Command: /new

1. Creates automatic checkpoint with session info
2. Captures state even if agent forgot to handoff
3. Ensures continuity across session resets

### Session Start

1. Extracts the initial user prompt (`context.initialPrompt` or first user message)
2. Runs `clawvault context "<prompt>" --format json --profile auto -v <vaultPath>`
   - Delegates profile selection to the shared context intent policy (`incident`, `planning`, `handoff`, or `default`)
3. Injects up to 4 relevant context bullets into session messages

Injection format:

```text
[ClawVault] Relevant context for this task:
- <title> (<age>): <snippet>
- <title> (<age>): <snippet>
```

### Event Compatibility

The hook accepts canonical OpenClaw events (`gateway:startup`, `gateway:heartbeat`, `command:new`, `session:start`, `compaction:memoryFlush`, `cron.weekly`) and tolerates alias payload shapes (`event`, `eventName`, `name`, `hook`, `trigger`) to remain robust across runtime wrappers.

## Configuration Notes

The hook auto-detects vault path via:

1. `CLAWVAULT_PATH` environment variable
2. Walking up from cwd to find `.clawvault.json`

If `openclaw hooks enable clawvault` fails with hook-not-found, run `openclaw hooks install clawvault` first and verify discovery with `openclaw hooks list --verbose`.
