# agent-skill-validator

[![CI](https://github.com/ollieb89/agent-skill-validator/actions/workflows/ci.yml/badge.svg)](https://github.com/ollieb89/agent-skill-validator/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/agent-skill-validator)](https://www.npmjs.com/package/agent-skill-validator)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/ollieb89/agent-skill-validator)](https://github.com/ollieb89/agent-skill-validator/releases)

> **The first CI/CD tool for agent skill repositories.** Lint, validate, and test skills for OpenClaw, Claude Code, Codex, Gemini CLI, and the HCS-26 registry standard.

The agent skill ecosystem is exploding — thousands of skills for OpenClaw, Claude Code, Codex, and Gemini CLI are being published daily. But there is **zero CI/CD tooling** for skill repos. No linting, no schema validation, no publish readiness checks. `agent-skill-validator` fixes that.

## Features

- **SKILL.md Linting** — validates required fields (name, description, location, schema-version), detects placeholder text and broken links
- **Schema Validation** — validates frontmatter against OpenClaw, HCS-26, and generic skill schemas
- **Structure Checks** — verifies README, LICENSE, SKILL.md, examples/, and scans for leaked secrets
- **Registry Compatibility** — validates against ClaweHub / HCS-26 registry publish requirements
- **Multi-Ecosystem** — auto-detects OpenClaw, Claude Code, Codex, or Gemini CLI from repo structure
- **Configurable Fail Policy** — `errors` / `warnings` / `none`
- **PR Comment + Job Summary** — detailed breakdown in GitHub Actions

## Ecosystem Guide

| Ecosystem | Detection Signal | Key File |
|-----------|-----------------|----------|
| OpenClaw | `SKILL.md` | `~/.agents/skills/*/SKILL.md` |
| Claude Code | `.claude/` directory | `commands/` or `.claude/CLAUDE.md` |
| Codex | `codex.yml` / `.codex/` | `codex.yml` |
| Gemini CLI | `GEMINI.md` / `gemini.yml` | `GEMINI.md` |

## Quick Start

```yaml
- uses: ollieb89/agent-skill-validator@v1
  with:
    skill-path: .
    ecosystem: auto
    fail-on: errors
```

## Full Example

```yaml
- uses: ollieb89/agent-skill-validator@v1
  with:
    skill-path: .
    ecosystem: openclaw
    strict: false
    fail-on: errors
    check-registry: true
    registry: clawhub
```

## Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `skill-path` | Path to skill repo | `.` |
| `ecosystem` | `openclaw`, `claude-code`, `codex`, `gemini`, or `auto` | `auto` |
| `strict` | Enable strict validation | `false` |
| `fail-on` | `errors`, `warnings`, or `none` | `errors` |
| `check-registry` | Run registry compatibility checks | `false` |
| `registry` | `clawhub`, `hcs26`, or `none` | `none` |

## Outputs

| Output | Description |
|--------|-------------|
| `valid` | `true` if all checks passed |
| `errors` | Number of errors found |
| `warnings` | Number of warnings found |
| `publish-ready` | `true` if skill is ready to publish |

## CLI

```bash
npx agent-skill-validator .
npx agent-skill-validator --ecosystem claude-code .
npx agent-skill-validator --check-registry --registry clawhub .
npx agent-skill-validator --fail-on warnings --format markdown .
```

## Config File

Create `.agent-skill-validator.yml` in your skill repo:

```yaml
ecosystem: openclaw
strict: false
fail-on: errors
check-registry: true
registry: clawhub
ignore:
  - drafts/
```

## Example Output

```
agent-skill-validator
=====================
Skill: /path/to/my-skill
Ecosystem: openclaw

Errors:   0
Warnings: 1
Publish ready: NO
Overall: PASS
```

## SKILL.md Checks

| Check | Level | Description |
|-------|-------|-------------|
| `name-missing` | Error | `name` field absent |
| `name-too-short` | Error | Name < 2 characters |
| `description-missing` | Error | `description` field absent |
| `description-too-short` | Error | Description < 20 characters |
| `location-missing` | Error | `location` field absent |
| `schema-version-missing` | Warning | `schema-version` not specified |
| `name-placeholder` | Error | Name contains TODO/FIXME/TBD |
| `description-placeholder` | Error | Description contains placeholder text |
| `body-placeholder` | Warning | Body contains TODO/FIXME |
| `tags-too-many` | Warning | More than 10 tags |

## Structure Checks

| Check | Level | Description |
|-------|-------|-------------|
| `readme-missing` | Error | README.md not present |
| `license-missing` | Warning | No LICENSE file |
| `skill-md-missing` | Warning | SKILL.md not found |
| `examples-missing` | Info | No examples/ directory |
| `secret-detected` | Error | Potential secret in tracked files |
| `env-file-present` | Warning | .env file present |

## Registry Checks (ClaweHub / HCS-26)

| Check | Level | Description |
|-------|-------|-------------|
| `skill-id-missing` | Error | `skill-id` not set |
| `skill-id-format` | Error | Must be `org/skill-name` format |
| `category-invalid` | Error | Category not in allowed list |
| `tags-min` | Error | Fewer than 3 tags |
| `compatible-with-missing` | Error | No compatible agents listed |

## Tests

```bash
npm test
```

71 tests covering linter, detector, structure-checker, registry-checker, schema-validator, and reporter.

## License

MIT — see [LICENSE](LICENSE)
