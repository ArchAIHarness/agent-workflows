# Installing ArchAIHarness Agent Workflows for OpenCode

## Installation

Add the plugin to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["archai-agent-workflows@git+https://github.com/ArchAIHarness/agent-workflows.git"]
}
```

Restart OpenCode after changing config.

## What gets registered

- `agents/*.md` becomes OpenCode agents.
- `skills/**/SKILL.md` becomes OpenCode skills.

## Verify

After restart:

1. Check agents:
   - `@office`
   - `@ddd-java-developer`
   - `@resume`
2. Use the skill tool to list skills:
   - `formal-resume-builder`
   - `ddd-java-developer`
   - `code-quality`

## Troubleshooting

- If agents are missing, verify the plugin line in `opencode.json` and restart OpenCode.
- If skills are missing, check that `.opencode/plugins/archai-agent-workflows.js` loads and that `skills/` exists in the installed package.
- If OpenCode fails to start, remove the plugin line and validate `opencode.json` against `https://opencode.ai/config.json`.
