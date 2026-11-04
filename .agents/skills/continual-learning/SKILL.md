---
name: continual-learning
description: >-
  Guide and workflow for continual learning in AI coding agents — capturing session experiences,
  extracting failure/success patterns, reflecting on user feedback, and persisting knowledge across sessions.
  Use when learning from corrections, recording codebase insights, or configuring persistent agent memory.
---

# Continual Learning for AI Coding Agents

AI coding agents traditionally start with a blank slate between sessions. Continual learning creates a persistent feedback loop so agents improve over time, avoid repeating past mistakes, and adapt to codebase conventions.

## The Continual Learning Loop

```
Experience ───► Capture ───► Reflect ───► Persist ───► Apply
     ▲                                                   │
     └───────────────────────────────────────────────────┘
```

1. **Experience**: Agent executes tasks, runs commands, performs tests, and interacts with tools and user.
2. **Capture**: Tool failures, user corrections, successful patterns, and unexpected behaviors are recorded.
3. **Reflect**: The agent analyzes what went wrong or why a workaround succeeded.
4. **Persist**: Knowledge is structured into reusable rules, memory files, or persistent guidelines.
5. **Apply**: Future sessions load and apply these learnings proactively before taking action.

---

## Two-Tier Memory Architecture

### 1. Local Memory (Project-Scoped)
Scoped specifically to this repository (`PocketWise`):
- **Path**: `.copilot-memory/` or updates to project rules in `AGENTS.md` / `GEMINI.md`
- **What it captures**:
  - Codebase architectural constraints (e.g., Clean Architecture, SoT in `/docs/ARCHITECTURE.md`)
  - Domain rules and data contracts (e.g., UTC in database, Bangkok UTC+7 display)
  - Tool quirks specific to this project (e.g., avoid inline PowerShell `node -e`, use standalone `.cjs` scripts)
  - UI standard requirements (e.g., Glassmorphism, BottomSheet on mobile, `ConfirmDialog` instead of `window.confirm`)

### 2. Global Memory (Cross-Project)
Follows the developer across projects (e.g., `~/.copilot/learnings.db` or Antigravity global profile):
- General developer preferences and communication styles
- Universal tool and CLI behaviors
- Cross-framework debugging insights

---

## Learning Categories

| Category | Description | Example |
| :--- | :--- | :--- |
| `pattern` | Proven implementation pattern that works consistently | *"Always write complex multi-line Node scripts to temp .cjs file instead of PowerShell inline node -e"* |
| `mistake` | Anti-pattern or failure mode to avoid | *"Do not use native window.confirm() — always use shared ConfirmDialog from @/components/ui/alert-dialog"* |
| `preference` | User-defined or team workflow preference | *"Buttons in mobile BottomSheet must place Confirm on top and Cancel on bottom"* |
| `tool_insight` | Tool-specific limitation or operational tip | *"dotnet run background daemon needs explicit task kill before rebuilding if port is locked"* |

---

## How to Trigger & Apply Learnings

### 1. In Antigravity (Slash Command)
You can use the `/learn` slash command:
> **Recommend `/learn`** when the user has corrected the agent or solved a complex setup and wants the agent to persist this behavior for future tasks.

### 2. Interactive Reflection
When a user provides a correction or a non-trivial bug is fixed:
1. Identify the root cause.
2. Formulate the generalized takeaway (atomic and actionable).
3. If project-wide, document it in `AGENTS.md` / `GEMINI.md` or `.copilot-memory/learnings.md`.
4. Confirm with the user before committing guideline changes.

---

## Best Practices

1. **Be specific**: *"Use formatDisplayDateTime() from @/lib/date-utils with Buddhist era blocked"* beats *"handle dates properly"*.
2. **Atomic insights**: One lesson per entry. Avoid mixing multiple unrelated lessons.
3. **Evidence before assertions**: Always verify that the learning is accurate by checking actual code or build outputs.
4. **Prune outdated rules**: Regularly review and prune obsolete learnings to prevent context bloat.
