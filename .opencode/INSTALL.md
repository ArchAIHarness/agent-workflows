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
- `tools/content` registers `content_prepare_package` as an OpenCode custom tool for platform-neutral content topic/generation/review packages.
- The plugin auto-registers `mcp.playwright` for browser automation when it is missing; existing user-defined `mcp.playwright` is preserved.
- `tools/zhihu` registers `zhihu_prepare_article` and `zhihu_browser_setup_guide` as OpenCode custom tools for Zhihu channel adaptation, browser automation guidance, and pre-publish checks.

## Verify

After restart:

1. Check agents:
   - `@office`
   - `@ddd-java-developer`
   - `@resume`
2. Use the skill tool to list skills:
   - `formal-resume-builder`
   - `ddd-java-developer`
   - `zhihu-article-manager`
   - `code-quality`
3. Ask OpenCode to prepare a platform-neutral content package and confirm the `content_prepare_package` tool is available.
4. Ask OpenCode to adapt that package to Zhihu and confirm the `zhihu_prepare_article` tool is available.
5. If you need channel draft/publish automation, restart OpenCode once after installing the plugin, then ask OpenCode to open the Zhihu creator page. If browser tools are still unavailable, call `zhihu_browser_setup_guide` for diagnosis and fallback instructions.

## Troubleshooting

- If agents are missing, verify the plugin line in `opencode.json` and restart OpenCode.
- If skills are missing, check that `opencode-plugin.js` loads and that `skills/` exists in the installed package.
- If OpenCode fails to start, remove the plugin line and validate `opencode.json` against `https://opencode.ai/config.json`.
