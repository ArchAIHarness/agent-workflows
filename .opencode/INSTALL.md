# Installing ArchAIHarness Agent Workflows for OpenCode

## Installation

For stable user installs, prefer a pinned Git tag:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["archai-agent-workflows@git+https://github.com/ArchAIHarness/agent-workflows.git#v0.2.0"]
}
```

For local development, use a local file URL instead:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["file:///path/to/agent-workflows"]
}
```

Using the unpinned `main` branch is allowed for quick trials, but ordinary restarts do not guarantee that OpenCode will fetch the latest commit because package specs are cached.

Restart OpenCode after changing config.

## What gets registered

- `agents/*.md` becomes OpenCode agents.
- `skills/**/SKILL.md` becomes OpenCode skills.
- Bundled `superpowers` skills are auto-registered from `node_modules/superpowers/skills` when available; users do not need to install superpowers separately.
- The plugin auto-registers `mcp.playwright` and `mcp.chrome-devtools` for browser automation when missing; existing user-defined MCP entries are preserved.
- `tools/zhihu` registers `zhihu_prepare_publish`, `zhihu_prepare_article`, and `zhihu_browser_setup_guide` as OpenCode custom tools for one-step Zhihu publish preparation, channel adaptation, browser automation guidance, and pre-publish checks.
- `tools/xiaohongshu`, `tools/juejin`, and `tools/csdn` register channel package, browser guidance, and draft playbook tools for 小红书、掘金、CSDN distribution workflows. All publish actions require explicit human confirmation.

## Verify

After restart:

1. Check agents:
   - `@office`
   - `@ddd-java-developer`
   - `@resume`
2. Use the skill tool to list skills:
   - `formal-resume-builder`
   - `ddd-java-developer`
   - `content-package-manager`
   - `zhihu-publisher`
   - `zhihu-article-manager`
   - `xiaohongshu-publisher`
   - `juejin-publisher`
   - `csdn-publisher`
   - `code-quality`
   - `using-superpowers`
   - `brainstorming`
3. Ask OpenCode to prepare a platform-neutral content package and confirm the `content_prepare_package` tool is available.
4. Ask OpenCode to adapt that package to Zhihu and confirm the `zhihu_prepare_article` tool is available.
5. Ask OpenCode to prepare Xiaohongshu, Juejin, or CSDN channel packages and confirm `xhs_prepare_note`, `juejin_prepare_article`, and `csdn_prepare_article` are available.
6. If you need channel draft/publish automation, restart OpenCode once after installing the plugin, then ask OpenCode to open the target creator page. If browser tools are still unavailable, call the relevant `*_browser_setup_guide` tool for diagnosis and fallback instructions.

## Updating

OpenCode installs package plugins through Bun/npm package resolution and caches installed packages. If the plugin is configured without a tag, a restart may keep using the previously resolved commit.

Recommended update path:

1. Publish a new Git tag in `ArchAIHarness/agent-workflows`.
2. Change the tag in `opencode.json`, for example from `#v0.2.0` to `#v0.2.1`.
3. Restart OpenCode.

If a new tag still does not appear, inspect OpenCode logs and package cache. Clearing package cache is a troubleshooting step, not the normal upgrade path.

See [OpenCode 插件安装与更新机制](../OpenCode插件安装与更新机制.md) for the full rationale.

## Troubleshooting

- If agents are missing, verify the plugin line in `opencode.json` and restart OpenCode.
- If skills are missing, check that `opencode-plugin.js` loads and that `skills/` exists in the installed package.
- If new tools are missing after a release, prefer switching to a pinned tag before clearing cache.
- If OpenCode fails to start, remove the plugin line and validate `opencode.json` against `https://opencode.ai/config.json`.
