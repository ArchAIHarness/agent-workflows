---
name: juejin-publisher
version: 1.0.0
description: |
  Use when preparing or publishing Juejin/掘金 articles, 掘金草稿, technical Markdown, Juejin front matter, theme/highlight adaptation, categories, tags, or safe Juejin publishing workflows.
---

# juejin-publisher

## Goal

Adapt technical Markdown or a content package into Juejin-ready article content.

## Default Tools

- Article package: `juejin_prepare_article`
- Browser guidance: `juejin_browser_setup_guide`
- Draft playbook: `juejin_draft_playbook`

## Workflow

1. Identify source content.
2. Generate `channels/juejin/` with `article.juejin.md`, `metadata.json`, `publish-checklist.md`, and `browser-playbook.md`.
3. Add Juejin front matter with `theme` and `highlight`.
4. Check code blocks, technical tags, category, title, summary, external links, Markdown preview, and code highlighting.
5. If browser automation is available, open the Juejin editor and fill a draft only after the package is ready.
6. Stop before publish unless the user explicitly says `确认发布到掘金` or `确认更新掘金文章`.

## Safety Rules

- Do not read Cookie, Token, password, `.env`, browser profile, or account files.
- Do not use comment, private-message, acquisition, or growth automation.
- Do not bypass login, CAPTCHA, audit, or platform risk checks.
- Do not auto-publish, update, delete, withdraw, comment, or send messages.

## Output Format

```text
建议：...
事实：...
已执行：...
掘金渠道包：...
分类/标签：...
发布门禁：已停在发布前 / 未发布，原因...
下一步：...
```
