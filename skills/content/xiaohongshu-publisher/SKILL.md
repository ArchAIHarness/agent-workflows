---
name: xiaohongshu-publisher
version: 1.0.0
description: |
  Use when preparing or publishing Xiaohongshu/小红书/XHS/RED notes, 小红书图文笔记, image cards, hashtags, creator-platform drafts, or safe Xiaohongshu publishing workflows.
---

# xiaohongshu-publisher

## Goal

Adapt long-form Markdown or a content package into Xiaohongshu-ready note content and card planning.

## Default Tools

- Note package: `xhs_prepare_note`
- Browser guidance: `xhs_browser_setup_guide`
- Draft playbook: `xhs_draft_playbook`

## Workflow

1. Identify source content.
2. Generate `channels/xiaohongshu/` with `note.xhs.md`, `cards.json`, `metadata.json`, `publish-checklist.md`, and `browser-playbook.md`.
3. Turn long-form logic into a short note, image-card outline, title, and hashtags.
4. If browser automation is available, open the creator platform and fill draft fields only after the package is ready.
5. Stop before publish unless the user explicitly says `确认发布到小红书`.

## Content Rules

- Prefer 1 cover card plus 3-8 content cards.
- Keep card text short and readable.
- Avoid exaggerated claims, fake results, sensitive work details, customer information, and internal metrics.
- Check image ratio and image order before draft filling.

## Safety Rules

- Do not read Cookie, Token, password, `.env`, browser profile, or account files.
- Do not bypass login, CAPTCHA, audit, or platform risk checks.
- Do not auto-publish, delete, comment, send private messages, or batch operate.

## Output Format

```text
建议：...
事实：...
已执行：...
小红书渠道包：...
卡片规划：...
发布门禁：已停在发布前 / 未发布，原因...
下一步：...
```
