---
primitive: person
description: Canonical schema for people and relationship notes.
fields:
  title:
    type: string
    required: true
    default: "{{title}}"
    description: Person display name.
  date:
    type: date
    required: true
    default: "{{date}}"
    description: Date this profile was created.
  type:
    type: string
    required: true
    default: person
    description: Primitive discriminator for person notes.
  relationship:
    type: string
    default: contact
    description: Relationship category.
---

# {{title}}

## Context
- 

## Details
- Contact:
- Role:
- Timezone:

## History
- {{date}}: 
