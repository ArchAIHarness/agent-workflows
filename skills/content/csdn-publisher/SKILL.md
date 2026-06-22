---
name: csdn-publisher
version: 3.1.0
description: |
  Use when preparing or publishing CSDN/CSDN博客 articles, CSDN草稿, technical Markdown, categories, tags, originality declarations, or safe CSDN publishing workflows.
---

# csdn-publisher

## Goal

Adapt technical Markdown into CSDN-ready article: import content, place inline images at correct positions (CDP mouse + setInputFiles), configure publish settings (cover → tags → summary → column → type → visibility), and save as draft only.

## Core Principle: Inspect Before Act

CSDN's editor is a Vue SPA. **Always inspect current DOM before any operation.**

Key editor facts (verified against production 2026-06):
- Editor uses **比对模式** (compare mode): left = markdown source, right = preview
- Markdown source is split into `<div class="cledit-section" contenteditable="true">` elements
- NOT a `<pre>` element — the old `textContent` approach is wrong
- `execCommand('insertText')` inserts text at cursor with correct `\n` handling
- Image CDN URLs are persisted once uploaded
- Auto-save triggers ~30s after any change

## Browser Automation: Tool Selection

**Chrome DevTools MCP is preferred** for CSDN tasks on macOS. Playwright MCP is the fallback.

| Tool | Strength | Use For |
|------|----------|---------|
| **Chrome DevTools MCP** ✅ 首选 | CDP mouse events work on Vue buttons; DOM manipulation; snapshot for inspection | Click buttons that Playwright can't reach; evaluate JS; content inspection |
| Playwright MCP | `setInputFiles` for file chooser; `getByRole` for standard UI | File upload handling; form filling when DevTools is unreliable |

Default to DevTools MCP for navigation/evaluation; use Playwright for file chooser only.

## End-to-End Workflow

### Phase 1: Open Editor

1. Navigate to `https://mp.csdn.net/mp_blog/manage/article` or direct editor URL.
2. Click "写文章" or open existing draft.
3. **Take snapshot** to verify editor loaded; check for toolbar, title input, status bar.
4. Note `articleId` from URL — stable once a draft is saved.

### Phase 2: Inject Body Content

Use `execCommand('insertText')` on the contenteditable editor:

```javascript
// Step 1: Focus and select all, then delete
const editor = document.querySelector('.cledit-section').closest('[contenteditable]')
  || document.querySelector('.md-content');
editor.focus();
document.execCommand('selectAll');
document.execCommand('insertText', false, '');

// Step 2: Insert full markdown at cursor
// For a large file, the base64+decode approach (see below) is safest
document.execCommand('insertText', false, markdownContent);
```

**Content encoding for large files (base64 + decodeURIComponent)**:

```javascript
const content = decodeURIComponent(escape(atob('BASE64_STRING')));
const editor = document.querySelector('.cledit-section').parentElement;
editor.focus();
// Clear
document.execCommand('selectAll');
document.execCommand('insertText', false, '');
// Insert
document.execCommand('insertText', false, content);
```

**Verify**: Check status bar shows correct line count (`XX 行数`) and word count (`XXX 字数`).

#### Playwright-only fallback: synthetic paste event (verified 2026-06)

When only Playwright MCP is available (no DevTools CDP), `execCommand('insertText')` on the
cledit editor can **drop newlines**. Instead dispatch a synthetic `paste` ClipboardEvent —
it preserves `\n` and triggers CSDN's Vue markdown parser:

```javascript
// b64 = base64 of article.final.md (with real CDN image URLs already substituted)
const md = decodeURIComponent(escape(atob(b64)));
const editor = document.querySelector('.cledit-section').closest('[contenteditable]');
editor.focus();
// 1) CLEAR FIRST — paste does NOT replace selection/existing content, it APPENDS.
//    Skipping this duplicates the whole body. Select-all + delete to leave 1 empty section.
const sel = window.getSelection();
const r = document.createRange();
r.selectNodeContents(editor); sel.removeAllRanges(); sel.addRange(r);
document.execCommand('delete');
// 2) Synthetic paste
const dt = new DataTransfer();
dt.setData('text/plain', md);
editor.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
```

Gotchas:
- **paste appends, never replaces** — always clear the editor first, or you get
  placeholder+CDN duplicated content.
- The page sandbox has **no `Buffer`/`require`** — inline the base64 string into the script;
  decode with `decodeURIComponent(escape(atob(b64)))`.
- `playwright_browser_run_code_unsafe` script files must live under the project
  `.playwright-mcp/` dir (`/tmp` is rejected); `require` is also unavailable there, so the
  base64 must be inlined into the script string.
- Verify after paste: section count ≈ original, image count = N CDN images, **0 placeholders**,
  no stray "在这里插入图片描述" text.

#### Image strategy when using synthetic paste

Upload the N images first (cursor at end is fine) to collect their CDN URLs, substitute them
into the markdown placeholders to produce `article.final.md`, THEN do the single clean paste.
This avoids per-position cursor dance. The cover image is uploaded separately in Phase 4 and
yields its own CDN URL via the cropper's "确认上传" button.

### Phase 3: Place Inline Images (Critical Gate)

**Strategy**: Upload each image at its exact position in the markdown, using CDP mouse click to open the upload dialog + Playwright `setInputFiles` to upload.

```
For each image to insert:
  1. Find the target cledit-section (e.g., the section after which the image should appear)
  2. Use JavaScript Selection API to set cursor AFTER the target section
  3. Click the image toolbar button via CDP mouse event
  4. Handle file chooser via Playwright setInputFiles
  5. Wait for CDN URL to appear at cursor
  6. Verify: section count increased by 1, CDN URL rendered
```

#### Step 3a: Setting cursor at correct markdown position

```javascript
// Set cursor after a specific cledit-section
const sections = document.querySelectorAll('.cledit-section');
const targetSection = sections[TARGET_INDEX]; // 0-based index

const range = document.createRange();
range.setStartAfter(targetSection);
range.collapse(true);

const sel = window.getSelection();
sel.removeAllRanges();
sel.addRange(range);
```

#### Step 3b: Click image button via CDP mouse event

The CSDN image button (`data-title="图片 – Command+Shift+G"`) often rejects Playwright `.click()` due to Vue event handling. **Use Chrome DevTools CDP click**:

```javascript
// Use DevTools MCP to click the button
// First find the button element's bounding box
const btn = document.querySelector('.article-btn-image');
const rect = btn.getBoundingClientRect();
// Click at center via CDP
// (Use chrome-devtools_click tool with the uid from snapshot)
```

**The image dialog opens**. If using Playwright for the file chooser:

```javascript
// After clicking the image button via DevTools MCP,
// switch to Playwright for file chooser handling:
const [fileChooser] = await Promise.all([
  page.waitForEvent('filechooser', { timeout: 10000 }),
]);
await fileChooser.setFiles(imagePath);
await page.waitForTimeout(2000);
```

**Verify**:
- The image section dialog disappears
- `![在这里插入图片描述](https://i-blog.csdnimg.cn/direct/XXX.png#pic_center)` appears at cursor position
- Image renders in the preview pane (right side)

#### Step 3c: Repositioning existing images (if needed)

If images were uploaded at wrong positions, remove and re-insert:

1. Remove each image's `cledit-section` from DOM (from highest index to lowest to avoid index drift):
   ```javascript
   const imgSections = document.querySelectorAll('.cledit-section');
   // Find sections containing 'i-blog.csdnimg.cn/direct/'
   // Remove from highest index to lowest
   ```
2. Extract the CDN URLs from the removed sections
3. Insert at correct positions using `execCommand('insertText')` with `![alt](cdn-url)` syntax

#### Phase 3 Gate: Verification

- [ ] All images render in preview
- [ ] Each image is at its correct position (check prev/next section content)
- [ ] No "外链图片转存失败" warnings
- [ ] No residual placeholder text
- [ ] Total section count matches original markdown section count + image count

### Phase 4: Publish Settings

**Must follow this exact order: Cover → Tags → Summary → Column → Type → Visibility**.

1. Click "发布文章" button in the bottom toolbar
2. Set cover image: click upload area → File chooser → confirm upload
3. Set tags: click tag input → select/search tags
4. Set summary: click summary field → type or use "AI提取摘要"
5. Set column: click column selector → choose relevant column
6. Set article type: verify "原创" selected
7. Set visibility: default "全部可见"

**Verify after each step** before moving to the next.

#### Tag restriction by blog level (verified 2026-06)

CSDN **blocks custom-tag creation for blogs below level 3**. The tag popover shows
"博客等级不满足三级，无法创建自定义标签". Typing a brand-new term + Enter does nothing.

Workaround — use **existing platform tags** only:
- Type a keyword in the tag search box; CSDN returns existing tags in
  `ul.el-autocomplete-suggestion__list > li`. Click an `<li>` to add it.
- Recommended tags (shown under "添加标签" as `.el-tag` without a close icon) can be
  clicked to add. Added tags get an `.el-tag__close` icon; the counter reads
  "还可添加N个标签" (max 7, decrements on each add).
- Pick existing tags closest to the article topic (e.g. for a RAG article:
  人工智能 / AI编程 / 全文检索 / 语言模型 / 知识图谱).
- Record both the intended tags and the actually-applied tags in metadata.json.

#### Tag popover mask gotcha

After interacting with the tag autocomplete, a `.mark-mask-box-div` overlay can stay up
and intercept clicks on later fields (cover/summary). Don't click random close buttons —
that may close the whole publish drawer. Press `Escape` to dismiss the autocomplete popover,
then verify the drawer is still open (look for the "保存为草稿" button); if the drawer
closed, reopen via "发布文章" — **tags/cover/summary already entered are preserved**.

#### Save-draft button

The publish drawer's bottom bar has 取消 / 保存为草稿 (`button.btn-b-normal`) / 定时发布 /
发布文章 (`button.btn-b-red`). Click **保存为草稿** — never the red 发布文章.
Confirm via toast "文章已保存 HH:MM:SS" AND by inspecting the `saveArticle` request body
(`"status":2`, `"pubStatus":"draft"`). The drawer may NOT auto-close after save — that's fine;
the draft is already persisted. Use `playwright_browser_network_request` on the latest
`bizapi.csdn.net/blog-console-api/v3/mdeditor/saveArticle` POST to verify status, tags,
categories, cover_images.

### Phase 5: Save Draft Only

1. Verify all settings are correct
2. **Do NOT click "发布文章" or "定时发布"**
3. The editor auto-saves; confirm by checking status bar "已保存"
4. Report to user: article ID, title, settings summary, image count

## Image Upload: Two Approaches

### Approach A: Dialog Upload (Preferred for fresh articles)

Upload images via the image upload dialog at the correct cursor position.

**Working mechanism** (verified):
1. Position cursor at correct cledit-section
2. Click image toolbar button using CDP mouse event (Chrome DevTools MCP `click`)
3. The Vue image dialog opens
4. File chooser appears — handle via Playwright `setInputFiles`
5. CSDN uploads image to CDN and inserts `![alt](cdn-url)` at cursor

**Why CDP click instead of Playwright click**: The CSDN image toolbar button's Vue event handler requires trusted click events. Playwright's synthetic clicks don't always trigger the handler. CDP mouse events (from Chrome DevTools MCP) produce native OS-level click events that Vue recognizes.

### Approach B: URL Insertion (For repositioning)

If images are already on CDN (uploaded in a previous session), insert the markdown directly at cursor:

```javascript
document.execCommand('insertText', false, 
  '\n![描述文字](CDN_URL)\n');
```

This approach requires only execCommand — no dialog, no file chooser.

## Safe Operation Boundaries

### ✅ Safe operations

- Use DevTools MCP `evaluate` to inspect DOM, set cursor, manipulate content
- Use DevTools MCP `click` (CDP) for toolbar buttons
- Use Playwright `setInputFiles` for file uploads
- `document.execCommand('insertText')` for content injection
- Read `element.textContent` for verification
- Read status bar for word/line count

### ❌ Forbidden

- `ed.textContent = content` on the modern cledit-section editor — breaks the Vue model
- Playwright `.fill()` on contenteditable — destroys formatting
- Reading Cookie, Token, password, `.env`, browser profile
- Auto-publishing, clicking "发布文章" without explicit user consent
- Deleting body sections without verifying context first
- Assuming editor state without snapshot verification

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Image button click does nothing | Vue event handler rejects synthetic click | Use CDP mouse event (DevTools MCP click) instead of Playwright click |
| Image uploads but appears at wrong position | Cursor was not at correct section | Remove image section from DOM; re-insert at correct position via execCommand |
| Content shows all on one line | `innerHTML` was used and stripped newlines | Re-inject via `execCommand('insertText')` |
| cledit-sections not found | Wrong mode (Rich Text instead of Markdown, or not in 比对模式) | Check editor mode; switch to Markdown + 比对 |
| Article ID lost after reopen | No draft was saved | Save draft first via auto-save (wait 30s) or trigger save |
| Sheet count shows "0 字数" | Vue model not synced | Dispatch `new Event('input')` on first section |
| Image dialog opens but file upload fails | File chooser URL timeout | Ensure image file exists at absolute path; retry with Playwright setInputFiles |
| Body content duplicated after paste | Synthetic paste appends, didn't clear first | Select-all + `execCommand('delete')` to leave 1 empty section, then paste once |
| Newlines lost / all on one line | Used `execCommand('insertText')` | Use synthetic `paste` ClipboardEvent with `text/plain` instead |
| Custom tag won't add (Enter does nothing) | Blog level < 3 blocks custom tags | Use existing platform tags via search dropdown `ul.el-autocomplete-suggestion__list > li` |
| Cover/summary click intercepted | `.mark-mask-box-div` overlay from tag popover | Press Escape; verify drawer still open (else reopen 发布文章, entries persist) |
| Publish drawer won't close after save-draft | Normal CSDN behavior | Ignore — draft already saved; verify via saveArticle request body `status:2` |

## Output Format

```text
建议：...
事实：...
已执行：
- 正文注入：XX 行，完成
- 配图：X 张，已就位
- 发布设置：[封面/标签/摘要/专栏/类型/可见范围] 已完成
- 状态：草稿已保存（ID: XXXXXX）
需用户确认：点击「发布文章」上线
下一步：...
```
