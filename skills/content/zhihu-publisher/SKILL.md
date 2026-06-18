---
name: zhihu-publisher
version: 1.0.0
description: |
  Use when publishing or preparing Zhihu articles, 知乎发布, 知乎文章, 知乎专栏, 知乎草稿, Markdown-to-Zhihu adaptation, Zhihu browser draft workflows, or safe Zhihu publishing gates.
---

# zhihu-publisher

## Goal

Prepare and manage safe Zhihu publishing workflows from Markdown or a platform-neutral content package.

## Default Tools

- One-shot publishing preparation: `zhihu_prepare_publish`
- Existing content package adaptation: `zhihu_prepare_article`
- Browser guidance: `zhihu_browser_setup_guide`
- Draft operation playbook: `zhihu_draft_playbook`

## Workflow

1. Identify article source: current conversation, explicit Markdown file, pasted Markdown, or content package.
2. Generate or reuse a platform-neutral content package when needed.
3. Generate `channels/zhihu/` with `article.zhihu.md`, `metadata.json`, `publish-checklist.md`, and `browser-playbook.md`.
4. If browser automation is available, open Zhihu creator/editor only after the package is ready.
5. Prefer no-image Markdown import for body text; insert images one by one after the imported draft is stable.
6. Stop before publish unless the user explicitly says `确认发布到知乎` or `确认更新知乎文章`.

## Zhihu Stability Rules

- Confirm editor body is empty before importing.
- Import no-image Markdown first.
- Verify word count is non-zero, article start appears once, first section title appears once, and body image count is zero.
- Wait for draft save state, refresh editor, and verify again.
- Insert images one by one; each upload must be followed by clicking `插入图片`.
- After each image, verify image count increments by one and the article is not duplicated.
- Do not automate public article or public column page visits for verification.

## Safety Rules

- Do not read or write Cookie, Token, password, `.env`, browser profile, or account files.
- Do not bypass login, CAPTCHA, audit, security checks, or platform rate limits.
- Do not auto-publish, update, delete, withdraw, comment, or send messages.
- Stop immediately on 40362, abnormal request, security verification, CAPTCHA, login anomaly, or audit warning.

## Output Format

```text
建议：...
事实：...
已执行：...
知乎渠道包：...
浏览器能力：可用 / 不可用
发布门禁：已停在发布前 / 未发布，原因...
下一步：...
```
