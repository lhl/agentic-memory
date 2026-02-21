---
primitive: task
description: Canonical schema for task primitives in tasks/.
fields:
  status:
    type: string
    required: true
    default: open
    enum:
      - open
      - in-progress
      - blocked
      - done
    description: Task lifecycle state.
  source:
    type: string
    description: Origin of the task request.
  created:
    type: datetime
    required: true
    default: "{{datetime}}"
    description: ISO timestamp when the task was created.
  updated:
    type: datetime
    required: true
    default: "{{datetime}}"
    description: ISO timestamp of the latest task update.
  owner:
    type: string
    description: Task owner.
  project:
    type: string
    description: Related project slug.
  priority:
    type: string
    enum:
      - critical
      - high
      - medium
      - low
    description: Priority used for sorting and urgency.
  blocked_by:
    type: string
    description: Blocker description when status is blocked.
  completed:
    type: datetime
    description: Completion timestamp when status is done.
  escalation:
    type: boolean
    description: Escalation flag raised after repeated blocked transitions.
  confidence:
    type: number
    description: Optional confidence score for transitions.
  reason:
    type: string
    description: Optional reason for a transition.
  due:
    type: date
    description: Due date in YYYY-MM-DD format.
  tags:
    type: string[]
    description: Tags used for filtering.
  description:
    type: string
    description: One-line task summary.
  estimate:
    type: string
    description: Effort estimate (for example 2h, 1d, 1w).
  parent:
    type: string
    description: Parent task slug.
  depends_on:
    type: string[]
    description: Upstream task slugs that this task depends on.
---

# {{title}}

{{links_line}}

{{content}}
