---
primitive: project
description: Canonical schema for project definition documents.
fields:
  type:
    type: string
    required: true
    default: project
    description: Primitive discriminator for project documents.
  status:
    type: string
    required: true
    default: active
    enum:
      - active
      - paused
      - completed
      - archived
    description: Project lifecycle state.
  created:
    type: datetime
    required: true
    default: "{{datetime}}"
    description: ISO timestamp when the project was created.
  updated:
    type: datetime
    required: true
    default: "{{datetime}}"
    description: ISO timestamp of the most recent update.
  owner:
    type: string
    description: Primary owner for the project.
  team:
    type: string[]
    description: Team members collaborating on the project.
  client:
    type: string
    description: Client or stakeholder name.
  tags:
    type: string[]
    description: Labels used for filtering.
  description:
    type: string
    description: One-line project summary.
  started:
    type: date
    description: Optional project start date.
  deadline:
    type: date
    description: Project due date.
  repo:
    type: string
    description: Source repository URL.
  url:
    type: string
    description: Production or staging URL.
  completed:
    type: datetime
    description: Completion timestamp when finished.
  reason:
    type: string
    description: Optional reason for archival/completion.
---

# {{title}}

{{links_line}}

{{content}}

## Objective
- 

## Status
- [ ] Planning
- [ ] In progress
- [ ] Blocked
- [ ] Done

## Next
- [ ]

## Notes
- 
