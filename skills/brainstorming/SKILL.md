---
name: brainstorming
description: >-
  USE BEFORE any creative/build work — creating features, components, adding
  functionality, or modifying behavior. Explores intent, requirements, and
  design before implementation. TRIGGER when the user asks to build, add,
  create, implement, or change behavior. DO NOT skip straight to code.
metadata:
  origin: superpowers
---

# Brainstorming — Ideas into Designs

Turn an idea into an agreed design before writing code. Classify the request,
understand intent, present a design, get approval.

## HARD GATE (the mechanism that makes this autonomous)

Before ANY implementation action (writing product code, scaffolding, installing
deps, creating a project), the selected path's approval MUST be complete:

- **Spike** (feasibility question): human approves the question + probe.
- **Bounded** (scoped change to code that already exists here): human approves a
  short in-chat design.
- **Architectural** (new project/subsystem/interface change): human approves a
  written spec, then reviews the plan (via `writing-plans`) and picks execution.

A reply approves only the stage presented. Read-only exploration is allowed while
approval is pending. When in doubt between paths, take the heavier one; hidden
complexity upgrades the path mid-task (never downgrades).

## Three paths — announce the classification out loud

Say e.g. "this looks bounded, so I'll present a short design here" so the user
can override.

- **Spike** → output is an answer, not kept code. 2-3 sentence probe → nod →
  investigate cheaply → report recommendation (label any code throwaway).
- **Bounded** → the flow you're changing already exists in this repo. Ask the
  clarifying questions that matter (one at a time), present a short design in
  chat, STOP for explicit yes, then implement via normal workflow (TDD applies).
- **Architectural** → full process: explore context → questions one at a time →
  propose 2-3 approaches with a recommendation → present design in sections
  (approval per section) → write spec → self-review → user reviews spec → invoke
  `writing-plans`.

## Red flags (all mean: take the heavier path / get approval)

- "Too simple to need a design" · "I'll call it bounded to skip the spec" ·
  "design is obvious, I'll start while they read" · "I know this kind of app so
  it's bounded" (bounded measures the repo, not your familiarity) · "the spike
  works so I'll keep the code" · "it grew but I'm almost done".

## Terminal states are path-bound

Architectural: the ONLY skill you invoke next is `writing-plans`. Bounded: after
yes, implement directly (no plan doc). Spike: end at a reported recommendation.

## Principles

YAGNI ruthlessly. Design for isolation: small units, one clear purpose, testable
independently. In existing codebases, follow existing patterns; improve only what
serves the goal.
