---
primitive: decision
description: Canonical schema for decision records.
fields:
  title:
    type: string
    required: true
    default: "{{title}}"
    description: Decision title.
  date:
    type: date
    required: true
    default: "{{date}}"
    description: Date the decision was captured.
  type:
    type: string
    required: true
    default: decision
    description: Primitive discriminator for decision notes.
  status:
    type: string
    default: decided
    enum:
      - proposed
      - decided
      - superseded
    description: Decision state.
---

# Decision: {{title}}

## Context
- 

## Decision
- 

## Consequences
- 
