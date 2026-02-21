---
primitive: lesson
description: Canonical schema for lessons learned.
fields:
  title:
    type: string
    required: true
    default: "{{title}}"
    description: Lesson title.
  date:
    type: date
    required: true
    default: "{{date}}"
    description: Date the lesson was captured.
  type:
    type: string
    required: true
    default: lesson
    description: Primitive discriminator for lessons.
---

# Lesson: {{title}}

## Insight
- 

## Evidence
- 

## Application
- 
