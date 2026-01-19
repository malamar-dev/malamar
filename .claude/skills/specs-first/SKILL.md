---
name: specs-first
description: Read the Malamar specs before any coding task to understand requirements and context.
user-invocable: false
---

## Overview

This repository (`malamar-dev/malamar`) contains the Malamar implementation — both UI and API. All requirements, design documents, and meeting minutes live in a separate specs repository.

**Specs Location:** `/Users/irvingdinh/Workspace/github.com/malamar-dev/specs`

## When to Read Specs

Read the relevant specs **at the start of each new conversation/session**, before beginning any coding task.

## How to Read Specs

1. **Always start with `README.md`** — understand the document index and what's available
2. **Based on the task**, read the relevant documents referenced in the README:
   - `SPECS.md` — what Malamar does and why (product behavior, features, UX)
   - `TECHNICAL_DESIGN.md` — how Malamar is implemented (architecture, APIs, data models)
   - `MEETING-MINUTES/` — detailed implementation sessions for specific areas
   - `AGENTS/` — knowledge base for the Malamar agent

### Example

If asked to set up the backend folder structure:
1. Read `README.md` first
2. See that `SESSION-012` covers "Backend repository structure"
3. Read `MEETING-MINUTES/SESSION-012.md` for folder organization, module patterns, and tooling

## Conflict Handling

If there's a conflict or ambiguity between the specs and existing code, **ask the user for clarification** before proceeding.

## Rules

- ✅ Always verify behavior against specs before implementing
- ✅ Use specs as the source of truth for product requirements
- ❌ Don't implement features that aren't in the specs without asking first
- ❌ Don't assume behavior — always verify against specs
- ❌ Don't reference `ROADMAP.md` items as current requirements (roadmap is for future vision only)
