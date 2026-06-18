---
name: zhihu-article-manager
version: 1.6.0
description: Use when managing Zhihu articles, 知乎文章, 知乎专栏, 知乎草稿, publishing workflows, content topic/generation/review, markdown-to-Zhihu channel adaptation, browser automation setup guidance, draft saving, or AI-assisted Zhihu content operations in OpenCode. Compatibility entry; prefer zhihu-publisher for new work.
---

# zhihu-article-manager

## Compatibility Notice

This Skill is kept as a compatibility entry for existing users and prompts.

For new work, use `zhihu-publisher`. It provides the channel-specific publishing workflow, unified channel package metadata, browser playbooks, and explicit publish gates.

## Routing

When this Skill is triggered:

1. Treat the user intent as Zhihu publishing or Zhihu draft management.
2. Follow the `zhihu-publisher` workflow.
3. Prefer these tools:
   - `zhihu_prepare_publish`
   - `zhihu_prepare_article`
   - `zhihu_browser_setup_guide`
   - `zhihu_draft_playbook`
4. Keep the same safety boundary: no Cookie, Token, `.env`, browser profile, or automatic publish.

## Publish Gate

Only publish or update after the user explicitly replies:

- `确认发布到知乎`
- `确认更新知乎文章`

Do not treat `继续`, `可以`, `ok`, or `行` as publish authorization.
