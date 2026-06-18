---
name: csdn-publisher
version: 1.0.0
description: |
  Use when preparing or publishing CSDN/CSDN博客 articles, CSDN草稿, technical Markdown, categories, tags, originality declarations, or safe CSDN publishing workflows.
---

# csdn-publisher

## Goal

Adapt technical Markdown or a content package into CSDN-ready article content with safe draft and publish gates.

## Default Tools

- Article package: `csdn_prepare_article`
- Browser guidance: `csdn_browser_setup_guide`
- Draft playbook: `csdn_draft_playbook`

## Workflow

1. Identify source content.
2. Generate `channels/csdn/` with `article.csdn.md`, `metadata.json`, `publish-checklist.md`, and `browser-playbook.md`.
3. Check title, summary, category, tags, originality declaration, Markdown code fences, images, links, and sensitive information.
4. If browser automation is available, open the CSDN creator/editor and fill a draft only after the package is ready.
5. Stop before publish unless the user explicitly says `确认发布到 CSDN` or `确认更新 CSDN 文章`.

## CSDN Checks

- Confirm editor mode is Markdown or Markdown-compatible.
- Confirm article type is correct: original, repost, or translation.
- Confirm category and tags match the article topic.
- Confirm code blocks render correctly in preview.
- Confirm images render correctly and links are accessible.
- Confirm the summary does not include secrets, customer information, internal URLs, or exaggerated claims.

## Safety Rules

- Do not read Cookie, Token, password, `.env`, browser profile, or account files.
- Do not use comment, private-message, follow, acquisition, traffic, or growth automation.
- Do not bypass login, CAPTCHA, audit, or platform risk checks.
- Do not auto-publish, update, delete, withdraw, comment, follow, or send messages.

## Output Format

```text
建议：...
事实：...
已执行：...
CSDN 渠道包：...
分类/标签/文章类型：...
发布门禁：已停在发布前 / 未发布，原因...
下一步：...
```
