---
name: content-package-manager
version: 1.0.0
description: |
  Use when preparing platform-neutral content packages, 内容包, 多渠道发布准备, 内容预审, channel package planning, or separating article content from publishing channels.
---

# content-package-manager

## Goal

Manage platform-neutral content packages before any channel-specific publishing work.

## Responsibilities

- Prepare `content.md`, `metadata.json`, `review-checklist.md`, `channels/`, and optional `assets/`.
- Normalize title, topic, summary, tags, target channels, and source Markdown.
- Run public-content checks for sensitive information, exaggerated claims, copyright risk, external links, and platform suitability.
- Route channel-specific work to channel Skills such as `zhihu-publisher`, `xiaohongshu-publisher`, and `juejin-publisher`.

## Default Tool

Use `content_prepare_package` when the user asks to prepare reusable content or publish to multiple platforms.

## Safety Rules

- Do not read Cookie, Token, password, `.env`, browser profile, or account files.
- Do not open publishing platforms.
- Do not click publish, update, delete, withdraw, comment, or send messages.
- Treat private work material, customer information, internal addresses, unpublished metrics, and credentials as non-public.

## Output Format

Return:

```text
建议：...
事实：...
已执行：...
内容包：...
目标渠道：...
下一步：...
```
