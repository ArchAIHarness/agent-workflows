---
name: csdn-publisher
version: 1.1.0
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
   - If the article contains local images, a `article.placeholder.md` and `images.map.json` will also be generated.
3. Check title, summary, category, tags, originality declaration, Markdown code fences, images, links, and sensitive information.
4. If browser automation is available, open the CSDN creator/editor and fill a draft only after the package is ready.
   - **Import method preferred**: Use 「更多操作 → 导入」to import the Markdown file into the editor.
   - After import, fix the title (import sets title from filename).
   - For articles with images, use the **placeholder replacement method**: import `article.placeholder.md`, then replace each `@@@IMG_N@@@` placeholder with an uploaded image.
5. Stop before publish unless the user explicitly says `确认发布到 CSDN` or `确认更新 CSDN 文章`.

## Image Upload: Placeholder Replacement Method

The single most reliable way to upload inline images to CSDN editor — reference implementation from open-source `md-publisher`.

### Why not just paste Markdown with image paths?

CSDN editor cannot resolve local relative paths. Pasting raw Markdown results in "外链图片转存失败" placeholders. Uploading images first and inserting them later causes position drift and overlap.

### How it works

1. Replace all local `![alt](path)` images with `@@@IMG_0@@@`, `@@@IMG_1@@@`, ... placeholders.
2. Import the placeholder Markdown into the editor.
3. For each placeholder:
   a. Select the placeholder text in the editor (use TreeWalker or text search).
   b. Click the toolbar image button to open the upload dialog.
   c. Select and upload the corresponding local image file.
   d. The uploaded image replaces the selected placeholder in place.
   e. **Verify**: placeholder is gone, image count increased by 1, no "上传中" or "转存失败" text.

### Verification checklist (all must pass)

- [ ] All `@@@IMG_N@@@` placeholders are replaced.
- [ ] No residual `@@@IMG_` text in the body.
- [ ] No "外链图片转存失败" warnings.
- [ ] All images render correctly in preview mode.

## Safe Operation Boundaries

### ✅ Safe operations

- Import Markdown via 「更多操作 → 导入」
- `execCommand('selectAll') + execCommand('insertText')` for full-content replacement
- `execCommand('insertText')` for inserting text at cursor
- Click toolbar buttons to open dialogs (image, link, more insert)
- Upload files via file chooser API (cover, inline images)
- Set input values via `value + dispatchEvent` (title, summary, etc.)

### ❌ Forbidden operations

- Directly modifying editor `innerHTML` / `innerText` (breaks editor state)
- Using `fill()` on the editor (clears everything)
- Direct DOM manipulation of editor nodes (delete, insert nodes)
- Setting content via `createTextNode + appendChild` (loses formatting)
- Bypassing login, CAPTCHA, security verification of any kind

## Fallback Selector Strategy

CSDN UI changes frequently. Prepare 2-3 selectors per action; try the next if the first fails.

| Action | Primary | Fallback | Backup |
|--------|---------|----------|--------|
| Title input | `input[placeholder*="标题"]` | `#txtTitle` | `.article-title input` |
| Image toolbar button | 2nd button left of 「更多插入」 | `button[aria-label*="图片"]` | `button[title*="图片"]` |
| Tag input | `input[placeholder*="请输入文字搜索"]` | `input[placeholder*="标签"]` | `.tag-dialog input` |
| Summary input | `textarea[aria-label*="摘要"]` | `textarea[placeholder*="摘要"]` | `#txtSammary` |
| Save draft button | `button:has-text("保存草稿")` | `.button-save` | `button[aria-label*="保存"]` |
| Publish button | `button:has-text("发布文章")` | `.publish-btn` | `button[aria-label*="发布"]` |

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
图片：X 张，占位符替换法
发布门禁：已停在发布前 / 未发布，原因...
下一步：...
```
