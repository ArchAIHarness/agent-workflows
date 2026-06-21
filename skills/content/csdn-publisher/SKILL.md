---
name: csdn-publisher
version: 2.0.0
description: |
  Use when preparing or publishing CSDN/CSDN博客 articles, CSDN草稿, technical Markdown, categories, tags, originality declarations, or safe CSDN publishing workflows.
---

# csdn-publisher

## Goal

Adapt technical Markdown or a content package into CSDN-ready article content with safe draft and publish gates.

## Core Principle: Don't Guess, Inspect First

CSDN's editor is a Vue.js SPA that changes frequently. **Before any operation**, inspect the current DOM:

1. **Editor mode**: Check if Markdown tab is active (`.editor__inner` → `<pre contenteditable>` exists) or Rich Text.
2. **Existing article ID**: Read from URL `articleId=XXXXXX`. This ID persists across sessions once a draft is saved. If you close and reopen the editor without saving, the ID changes.
3. **Editor state**: Check `Markdown | XXXX 字数 | XX 行数` in the status bar for current content health.
4. **Toolbar visibility**: Make sure the toolbar buttons are rendered before clicking.
5. **Publish dialog state**: If you closed the publish dialog previously, settings (column, tags, cover) may persist — but you must reopen and verify.

## Default Tools

- One-shot publish prep: `csdn_prepare_publish`
- Article package: `csdn_prepare_article`
- Browser guidance: `csdn_browser_setup_guide`
- Draft playbook: `csdn_draft_playbook`

## Browser Automation: Tool Selection

CSDN publish workflow needs browser automation. Two options are available; **Playwright MCP is preferred** for this task.

| Tool | Best For | Why |
|------|----------|-----|
| **Playwright MCP** ✅ **首选** | 点按钮、填表单、上传文件、页面交互 | `getByRole` 精确匹配元素；`browser_file_upload` 原生支持文件选择器；`run_code_unsafe` 可执行任意 Playwright 代码做复杂操作 |
| Chrome DevTools MCP | 查网络请求、控制台错误、性能分析、Playwright 失灵时兜底 | 网络面板比 Playwright 直观；查看 `console.error`；Playwright 定位不到元素时备选 |

**Keep both installed.** They coexist in OpenCode (different MCP tools). Default to Playwright MCP for CSDN tasks; fall back to Chrome DevTools when Playwright encounters issues or when you need to inspect network/console state.

## Workflow

1. Identify source content (markdown string, source file, or a content package).
2. **One-shot flow** (recommended for "publish this to CSDN" intents): call `csdn_prepare_publish` — generates both the content review package and CSDN channel package in one step.
3. **Channel-only flow**: call `csdn_prepare_article` directly if you already have a content package or raw markdown.
4. Check title, summary, category, tags, originality declaration, Markdown code fences, images, links, and sensitive information.
5. If browser automation is available, open the CSDN creator/editor and fill a draft only after the package is ready.
6. Stop before publish unless the user explicitly says `确认发布到 CSDN` or `确认更新 CSDN 文章`.

---

## Content Injection Into CSDN Editor

This is the highest-risk and most error-prone step. **Do not rush it.** Verify at every step.

### Step 0: Understand the Editor Architecture

CSDN's Markdown editor uses a **Vue.js component** with this DOM structure:

```
<pre class="editor__inner markdown-highlighting" contenteditable="true">
  <!-- text content lives here as bare text nodes -->
</pre>
```

Key facts:
- The element is a `<pre contenteditable>`, not a `<textarea>` or `<div>`.
- Content is stored as **plain text** (with `\n` newlines), not HTML.
- The editor's Vue data model and the DOM `textContent` are synced.
- The **line counter** in the status bar (`XX 行数`) reads from `element.textContent` — it counts real `\n` characters.
- `highlight.js` (or similar) adds syntax highlighting by wrapping text in `<span>` elements, but the underlying `textContent` is what matters.

### Step 1: Choose the Injection Method (Priority Order)

#### Tier A: File Import (Most Reliable Overall)
Click **「更多操作 → 导入」** and select the local `.md` file. If available, always prefer this.

**Pros**: Preserves formatting perfectly; no encoding issues.
**Cons**: Requires a local Markdown file; cannot inject from a string variable.

#### Tier B: `textContent` Injection on `<pre>` Editor (Automation-Friendly)
When file import is not feasible, inject directly into the `<pre>` element:

```javascript
const ed = document.querySelector('.editor__inner');
// MUST clear first
ed.innerHTML = '';
// Set content as plain text — textContent preserves \n characters
ed.textContent = fullContent;
```

**⚠️ CRITICAL: NEVER use `innerText` on `<pre>` elements.**
- `innerText` converts `\n` to `<br>` HTML elements.
- CSDN reads `textContent` for line counting, which strips `<br>` tags.
- Result: `innerText` → shows "2 行数" instead of the real count.
- **Always use `textContent` on `<pre>` editors.**

**Why `textContent` works:**
- It preserves actual `\n` newline characters in the DOM.
- The `contenteditable` state remains active after setting `textContent`.
- Syntax highlighting (highlight.js) re-scans the `<pre>` content after change.
- The line counter reads the same `textContent` and shows correct line count.

#### Tier C: `execCommand` Full Replacement (Fallback)
```javascript
ed.focus();
document.execCommand('selectAll');
document.execCommand('insertText', false, content);
```

**Warning**: May also have `\n` vs `<br>` issues depending on browser/editor state. Verify line count after injection.

#### Tier D: Manual Instructions (Last Resort)
If all automated methods produce broken content, stop and tell the user exactly what to do: open the editor, click Import, and select the file. Never force a method that corrupts content.

### Step 2: Content Encoding for Programmatic Injection

When building an injection script that runs in the browser context, **content must survive shell escaping**:

**The base64 pattern** (field-verified for Chinese content):

```bash
# 1. Base64 encode the content
b64=$(base64 < content.md | tr -d '\n')

# 2. Generate a .mjs injection script
cat > inject.mjs << 'SCRIPT'
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
// ... navigate to editor ...

const content = (() => {
  // Fix: atob alone mangles Chinese chars (Latin-1 encoding)
  // Must use decodeURIComponent + escape to preserve UTF-8
  const b64 = 'PASTE_BASE64_HERE';
  return decodeURIComponent(escape(atob(b64)));
})();

await page.evaluate((c) => {
  const ed = document.querySelector('.editor__inner');
  ed.innerHTML = '';
  ed.textContent = c;
}, content);
SCRIPT

# 3. Replace the placeholder
sed -i '' "s/PASTE_BASE64_HERE/$b64/" inject.mjs

# 4. Run with node
node inject.mjs
```

**Why the decodeURIComponent/escape dance is necessary:**
- `atob()` decodes base64 into Latin-1 (ISO-8859-1), which corrupts multi-byte Chinese characters.
- `escape()` percent-encodes non-ASCII bytes.
- `decodeURIComponent()` interprets the percent-encoded string as UTF-8.
- This is the only reliable way to transport full UTF-8 content through base64 in a browser context.

### Step 3: Verify After Injection

**Must check ALL of these:**

| Check | Method | Pass/Fail |
|-------|--------|-----------|
| Line count | Read status bar `XX 行数` | Should match original file line count (within ±1) |
| Word count | Read status bar `XXXX 字数` | Should be close to original |
| Code highlighting | Check a code block visually | Highlighting should be active |
| Headings | Check `##` lines render as headings | No raw `##` text visible |
| Tables | Check table rendering | Columns aligned, no broken pipes |
| Images | Check `![alt](url)` render | Placeholder replaced, image visible |
| No residual artifacts | No `@@@IMG_`, no stray HTML, no `&nbsp;` | Clean content |

**If line count is very low (e.g., "2 行数" for a 340-line article):**
- The `innerText` bug is confirmed — you used `innerText` instead of `textContent`.
- Fix: Clear the editor again and use `textContent`.

---

## Cover Image Upload

CSDN's cover upload uses a **Vue image crop component** (`vue-image-crop-upload`).

### Flow

1. Open the publish dialog (click "发布文章" button in the bottom toolbar).
2. In the dialog, click the **"从本地上传"** button (selector: `.upload-img-box`).
3. The file chooser opens — select the cover image (supported: `.png,.jpg,.jpeg,.gif`).
4. A crop preview appears: `vicp-step2` with the image and adjustment controls.
5. Click **"确认上传"** (selector: `.vicp-operate-btn`) to confirm.
6. The image uploads to CSDN CDN and returns a URL like `https://i-blog.csdnimg.cn/direct/XXXX.png`.
7. **Verify**: A cover image preview appears in the dialog (`.cover-img` or similar), replacing the "添加封面" text.

### Playwright Implementation

```javascript
// Step 1: Click upload button in the dialog
await page.evaluate(() => document.querySelector('.upload-img-box')?.click());
// Step 2: File chooser opens — handle it
await page.locator('input[type="file"]').setInputFiles(coverPath);
// Or use Playwright's fileChooser event
const [fileChooser] = await Promise.all([
  page.waitForEvent('filechooser'),
  page.evaluate(() => document.querySelector('.upload-img-box')?.click())
]);
await fileChooser.setFiles(coverPath);
// Step 3: Wait for crop preview
await page.waitForSelector('.vicp-step2');
// Step 4: Confirm
await page.evaluate(() => document.querySelector('.vicp-operate-btn')?.click());
// Step 5: Wait for upload to complete
await page.waitForTimeout(2000);
```

### Cover Image Requirements

- **This is a proper cover image, NOT an inline article image.** They serve different purposes.
- Cover image appears in article cards, search results, and social shares.
- Inline images appear within the article body only.
- The crop tool shows a preview of how the cover will look — adjust if needed.

---

## Publish Dialog Settings Checklist

After clicking "发布文章", the modal opens with these settings. Verify each:

| Setting | How to Check | How to Fix |
|---------|-------------|------------|
| **封面图 (Cover)** | Look for uploaded image preview. If "添加封面" is still visible, no cover set. | Upload via "从本地上传" (see above) |
| **文章标签 (Tags)** | Check for existing tags like "人工智能". | Click "添加文章标签" to add more |
| **文章摘要 (Summary)** | Check char count `XX/256`. If 0, click "AI提取摘要". | Edit manually or regenerate |
| **分类专栏 (Column)** | Look for selected column names (e.g., "看懂AI和智能体"). | Click the column to select/deselect |
| **文章类型** | Should be "原创" (original) for new articles. | Radio button selection |
| **创作声明** | Default is "无声明". | Check "部分内容由AI辅助生成" if applicable |
| **可见范围** | Default "全部可见". | Change to "仅我可见" for drafts, "粉丝可见" for follower-only |
| **参与活动/话题** | None selected by default. | Scroll to find and toggle relevant activities |
| **原文链接** | Should be empty for original articles. | Only fill for republished content |

**Important**: The publish dialog settings **persist across close/reopen** within the same editor session. If you close and reopen the dialog, previously set column and tags should still be there. But always verify — CSDN's SPA can lose state.

---

## Image Upload: Placeholder Replacement Method

The most reliable way to upload inline images to CSDN editor — reference implementation from open-source `md-publisher`.

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

---

## Article ID Stability

**Rule**: The article ID in the URL (`articleId=XXXXXX`) is **stable once a draft has been saved** at least once. But there are edge cases:

| Scenario | articleId Behavior |
|----------|-------------------|
| Editor opened for a new article, no draft saved | ID changes if you close and reopen |
| Editor opened for a new article, draft auto-saved | ID is stable — auto-save happens ~30s after first edit |
| Editor opened from an existing draft/article | ID is the original article's ID |
| Title changed | ID does NOT change — title only affects the URL slug/permalink |
| Published and edited again | Same article ID |

**Practical advice**: Always note the articleId when you first open the editor. If you lose the editor URL, you can find it from the article management page at `https://mp.csdn.net/mp_blog/manage/article`.

---

## Safe Operation Boundaries

### ✅ Safe operations

- Import Markdown via **「更多操作 → 导入」**
- On `<pre contenteditable>` elements: `ed.textContent = content` (correct approach for Markdown editor)
- `execCommand('selectAll') + execCommand('insertText')` for content replacement
- `execCommand('insertText')` for inserting text at cursor
- Click toolbar buttons to open dialogs (image, link, more insert)
- Upload files via file chooser API (cover, inline images)
- Set input values via `value + dispatchEvent` (title, summary, etc.)
- Read `element.textContent` to verify content
- Read status bar text for word count and line count verification

### ❌ Forbidden operations on `<pre contenteditable>` editors

- **`ed.innerText = content`** — converts `\n` to `<br>`, breaks line counting
- `ed.innerHTML = htmlString` — replaces highlight.js spans, but acceptable if followed by `textContent` assignment
- Using Playwright's `fill()` on the `<pre>` editor — clears everything to 3 lines
- Direct DOM manipulation that bypasses the Vue model (deleting/inserting child nodes)
- Setting content via `createTextNode + appendChild` — loses formatting

### ❌ Universal forbidden operations

- Reading Cookie, Token, password, `.env`, browser profile, or account files
- Using comment, private-message, follow, acquisition, traffic, or growth automation
- Bypassing login, CAPTCHA, audit, or platform risk checks
- Auto-publishing, updating, deleting, withdrawing, commenting, following, or sending messages
- Assuming the editor state without verification

---

## Fallback Selector Strategy

CSDN UI changes frequently. Prepare 2-3 selectors per action; try the next if the first fails.

| Action | Primary | Fallback | Backup |
|--------|---------|----------|--------|
| Title input | `input[placeholder*="标题"]` | `#txtTitle` | `.article-title input` |
| Image toolbar button | 2nd button left of 「更多插入」 | `button[aria-label*="图片"]` | `button[title*="图片"]` |
| Tag input | `input[placeholder*="请输入文字搜索"]` | `input[placeholder*="标签"]` | `.tag-dialog input` |
| Summary input | `textarea[aria-label*="摘要"]` | `textarea[placeholder*="摘要"]` | `#txtSammary` |
| More ops button | `button:has-text("更多操作")` | `.more-ops-btn` | `button[aria-label*="更多"]` |
| Import button | `button:has-text("导入")` | `.import-btn` | `li:has-text("导入")` |
| Save draft button | `button:has-text("保存草稿")` | `.button-save` | `button[aria-label*="保存"]` |
| Publish button (editor) | getByRole('button', { name: '发布文章' }) | `.btn-publish` | `button[aria-label*="发布"]` |
| Cover upload button | `.upload-img-box` | `button:has-text("从本地上传")` | `.cover-upload-box` |
| Confirm cover upload | `.vicp-operate-btn` | `div:has-text("确认上传")` | `.vicp-operate div` |

---

## CSDN Checks

- Confirm editor mode is **Markdown** (not Rich Text). Check the active tab in the navigation bar.
- Confirm article type is correct: **原创** (original), **转载** (repost), or **翻译** (translation).
- Confirm **column** matches the article topic and the column exists for your account.
- Confirm **tags** are relevant and not spammy (3-5 tags recommended).
- Confirm code blocks render correctly with syntax highlighting.
- Confirm images render correctly and all CDN URLs are accessible.
- Confirm the **summary** accurately represents the article without secrets, customer info, internal URLs, or exaggerated claims.
- Confirm **line count** in the status bar matches the source — this is a strong signal that content was injected correctly.
- Confirm the "35/100" (readability score) in the header is reasonable for a technical article.

---

## Common Issues & Troubleshooting

| Issue | Likely Cause | Fix |
|-------|--------------|-----|
| Line count shows "2 行数" for a 340-line article | Used `innerText` instead of `textContent` on `<pre>` editor | Clear with `innerHTML = ''`, re-inject with `textContent` |
| Chinese characters corrupted | `atob()` treats content as Latin-1 | Use `decodeURIComponent(escape(atob(b64)))` for UTF-8 |
| Content becomes 3 lines / 1 paragraph | Playwright `fill()` was used on the editor | Clear editor, use `textContent` or file import |
| Editor shows "0 字数" after injection | Editor Vue model not synced with DOM | Try `ed.dispatchEvent(new Event('input'))` or focus/blur |
| Publish dialog shows stale content | Dialog was closed without saving | Reopen dialog — settings (column, tags) may persist |
| Cover upload fails silently | File format not supported | Use `.png` or `.jpg` format |
| Cover upload shows "确认上传" but nothing happens | Network issue or file too large | Check browser console, try smaller file |
| Syntax highlighting not working after injection | highlight.js didn't re-scan | Dispatch `input` event on the editor, or switch tabs and back |
| "外链图片转存失败" in published article | Markdown with local paths was pasted directly | Use image placeholder replacement method |
| Draft save succeeds but content is empty | Content was set on wrong element | Verify editor element selector: `.editor__inner`, not `.markdown-highlighting` wrapper |
| Title becomes filename | Import `.md` file sets filename as title | Set title explicitly after import |
| Toolbar buttons not found | CSDN UI changed | Take screenshot, find new selectors |

---

## Output Format

```text
建议：...
事实：...
已执行：...
CSDN 渠道包：...
分类/标签/文章类型：...
图片：X 张，占位符替换法
编辑器状态：Markdown | XXXX 字数 | XX 行数
发布门禁：已停在发布前 / 未发布，原因...
下一步：...
```
