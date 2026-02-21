---
primitive: daily-note
description: Canonical schema for daily context snapshots.
fields:
  title:
    type: string
    required: true
    default: "{{date}}"
    description: Daily note title.
  date:
    type: date
    required: true
    default: "{{date}}"
    description: Date represented by this note.
  type:
    type: string
    required: true
    default: daily-note
    description: Primitive discriminator for daily note documents.
---

# {{date}}

## Focus
- 

## Wins
- 

## Notes
- 

## Next
- [ ]
