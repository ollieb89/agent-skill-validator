# agent-skill-validator — Spec

## What
GitHub Action + CLI that lints, validates, and tests agent skill repositories (SKILL.md, action configs, tool schemas) for the OpenClaw, Claude Code, Codex, Gemini CLI, and Antigravity ecosystems.

## Problem
The agent skill ecosystem is exploding (antigravity-awesome-skills: 26k★, awesome-claude-skills: 46k★, awesome-agent-skills: 12k★). There is ZERO CI/CD tooling for skill repos. No linting, no schema validation, no testing, no publish pipeline. Every skill author is flying blind.

## Features (MVP v1.0.0)
1. **SKILL.md Linting** — validate required fields: name, description, location, schema version
2. **Schema Validation** — validate YAML/JSON skill configs against MCP/HCS-26 spec patterns
3. **Dependency Check** — verify referenced tools, models, and external resources are reachable
4. **Dry-Run Test** — invoke skill in sandbox mode, verify it produces valid output structure
5. **Publish Readiness** — check all required files exist (SKILL.md, README, LICENSE, examples/)
6. **Registry Compatibility** — validate against ClaweHub / HCS-26 registry publish requirements
7. **CI Report** — GitHub Actions job summary + PR comment with lint/test breakdown
8. **Fail Modes** — configurable: fail on errors, warnings, or schema drift

## Architecture
- TypeScript GitHub Action + CLI (npx agent-skill-validator)
- Multi-ecosystem support: OpenClaw (SKILL.md), Claude Code (commands/), Codex, Gemini CLI
- Schema detection: auto-detect skill type from file structure
- Inputs: skill-path, ecosystem, strict, fail-on, registry
- Outputs: valid, errors, warnings, publish-ready

## Validation Checks

### SKILL.md Checks
- name: present, non-empty, no special chars
- description: present, >20 chars, no placeholder text
- location: valid path, file exists
- schema-version: present, semver format
- No broken markdown links
- No placeholder text ("TODO", "FIXME", "your description here")

### Structure Checks
- README.md exists
- LICENSE exists (MIT preferred)
- examples/ directory with at least one example
- No secrets in tracked files (.env, API keys pattern scan)

### Registry Checks (ClaweHub / HCS-26)
- skill-id unique format: org/skill-name
- category from allowed list
- tags: minimum 3, maximum 10
- compatible-with: at least one agent listed

## Config Example
```yaml
# .agent-skill-validator.yml
ecosystem: openclaw    # openclaw | claude-code | codex | gemini | auto
strict: false
fail-on: errors        # errors | warnings | none
check-registry: true
registry: clawhub      # clawhub | hcs26 | none
ignore:
  - drafts/
```

## CLI Usage
```bash
npx agent-skill-validator .
npx agent-skill-validator --ecosystem claude-code --strict ./my-skill
npx agent-skill-validator --check-registry --registry clawhub .
```

## Deliverables
- action.yml
- src/: index.ts, detector.ts, linter.ts, schema-validator.ts, structure-checker.ts, registry-checker.ts, reporter.ts, config.ts
- bin/cli.ts
- schemas/: skill-md.schema.json, hcs26.schema.json, openclaw-skill.schema.json
- tests/ (Jest, 30+ tests)
- README.md — ecosystem guide, config reference, example output, CI integration
- LICENSE (MIT, ollieb89)
- .github/workflows/ci.yml — dog-food: validate own skill if present
- Tag v1.0.0, GitHub Release, npm publish (agent-skill-validator)

## SEO Topics
agent-skills, github-actions, claude-code, openclaw, ci-cd, skill-validation, linting, developer-tools, ai-agents, codex

## Post-Ship Synthesis Log
- Tool: agent-skill-validator
- Category: AI Systems / Agent Tooling
- Ecosystem fit: tight (rides antigravity 26k★ + awesome-claude-skills 46k★ wave)
- Reusable pattern: schema-first validation + multi-ecosystem detection
- Bundle narrative: "GitHub Actions for AI systems" — 5th piece, completes the stack
