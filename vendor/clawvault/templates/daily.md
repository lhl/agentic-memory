---
primitive: daily-note
description: Legacy alias for daily-note template.
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
    default: daily
    description: Legacy discriminator used by older vaults.
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
