---
name: zhihu-publisher
version: 2.0.0
description: |
  Use when publishing or preparing Zhihu articles, 知乎发布, 知乎文章, 知乎专栏, 知乎草稿, Markdown-to-Zhihu adaptation, Zhihu browser draft workflows, or safe Zhihu publishing gates.
---

# zhihu-publisher

## Goal

Prepare and manage safe Zhihu publishing workflows from Markdown or a platform-neutral content package, using a browser-automation flow that is verified against Zhihu's editor quirks: paste does not parse Markdown, import is append-mode, header levels collapse, and the cover may be lost after re-import.

## Default Tools

- One-shot publishing preparation: `zhihu_prepare_publish`
- Existing content package adaptation: `zhihu_prepare_article`
- Browser guidance: `zhihu_browser_setup_guide`
- Draft operation playbook: `zhihu_draft_playbook`

## Browser Automation: Tool Selection

Zhihu publish workflow needs browser automation. Two options are available; **Playwright MCP is preferred** for this task.

| Tool | Best For | Why |
|------|----------|-----|
| **Playwright MCP** ✅ **首选** | Draft.js 编辑器交互、文件导入、图片上传、发布设置面板操作 | `getByRole` 精确匹配 Draft.js 的复杂 DOM；`browser_file_upload` 原生支持文件选择器触发导入/上传 |
| Chrome DevTools MCP | 查网络请求、控制台错误、Playwright 失灵时兜底 | 网络面板定位上传失败原因；查看 `console.error`；Playwright 定位不到元素时备选 |

**Keep both installed.** They coexist in OpenCode. Default to Playwright MCP for Zhihu tasks; fall back to Chrome DevTools when Playwright encounters issues or when you need to inspect network/console state.

## Core Principles

1. Split body and images first. Build a channel package with the title, an image-free body Markdown, and an ordered image manifest containing anchor text and local file paths. Never type Markdown into the editor and expect it to render.
2. Always import, never paste. The editor only renders structure when content arrives via the toolbar `导入 → 导入文档 (MD/Doc)` flow. Pasted or `fill()`-injected Markdown stays as raw source.
3. Import is append-mode. The editor must be empty before each import; otherwise content stacks. If anything goes wrong, select-all, delete, and re-import.
4. Insert images only after the body structure is correct. Locate each anchor paragraph, place the caret, press Enter, then upload via `图片 → 本地图片上传 → 插入图片`.
5. Cover and column may be reset by re-import. Always re-verify and re-apply them after the body is finalized.
6. Final state must be verified by screenshot or computer-preview. Never claim done from log output alone.

## Workflow

### Phase 1 — Prepare the channel package (offline)

1. Detect article source: current conversation, explicit Markdown file, pasted Markdown, or content package.
2. Generate or reuse a platform-neutral content package when needed.
3. Generate `channels/zhihu/` containing:
   - `article.zhihu.md` — image-free body Markdown. Strip the leading `# 主标题` line (the title goes into Zhihu's title input, not the body) and remove every line starting with `![`.
   - `images.json` (or equivalent in `metadata.json`) — ordered list of `{ index, file_path, anchor_text, alt }`. `anchor_text` is a short unique substring of the paragraph that should immediately precede the image.
   - `metadata.json` — title, summary, tags, target column, cover image path.
   - `publish-checklist.md`, `browser-playbook.md`.
4. Header-level remap (avoid sed cascade). Zhihu maps `#` to H2 and `##` to H3 in the body. To preserve the article's section / sub-section hierarchy, promote levels using a placeholder so replacements do not cascade. Example:

   ```bash
   sed '1,2d; /^!\[/d; s/^### /@@H3@@/; s/^## /# /; s/^@@H3@@/## /' src.md > article.zhihu.md
   ```

   Verify expected counts with `grep -c '^# '` and `grep -c '^## '` before importing.
5. Sanity-check the file: no images, no leading H1, expected `#` and `##` counts, expected length.

### Phase 2 — Open the editor and check login

1. Open `https://zhuanlan.zhihu.com/write` (new draft) or the existing draft URL.
2. Detect login state by checking the title input and toolbar.
3. If not logged in, stop and ask the user to log in manually. Never automate login, CAPTCHA, or security verification.
4. Once logged in, proceed to fill the title.

### Phase 3 — Set title

1. Fill the article title into the title `<textarea>` (`textarea[placeholder*="标题"]`).
2. Verify `value.length > 0` and matches the expected title.

### Phase 4 — Import the image-free body

1. Ensure the editor is empty. If `textLength > 1`, click into `.public-DraftEditor-content`, select all (`Meta+A` / `Control+A`), press `Backspace`, and re-check `textLength === 1`.
2. Click toolbar `导入` button (`button[aria-label="导入"]`).
3. In the dropdown click `导入文档` (`button[aria-label="导入文档"]`).
4. Trigger the hidden file input whose `accept` matches `.docx,.markdown,.mdown,.mkdn,.md` and upload `article.zhihu.md`.
5. Wait until import completes (typically 3–5 s).
6. Verify structural rendering before moving on:
   - `imgCount === 0`
   - `h2Count` equals the number of `#` headings
   - `h3Count` equals the number of `##` headings
   - `blockquoteCount`, `hrCount`, `ulCount` are at least the expected values
   - First sentence of the article appears exactly once
7. If the structure is wrong (for example all headings collapsed to H3, or the title appears inside the body), do the recovery routine:
   - Select-all in the editor and delete to empty state.
   - Re-generate `article.zhihu.md` with corrected level promotion.
   - Refresh the page if the toolbar / file inputs no longer respond, then re-import.

### Phase 5 — Insert images one by one

For each image in `images.json` order:

1. Resolve the anchor: find the `[data-block="true"]` paragraph in `.public-DraftEditor-content` whose text contains `anchor_text`.
2. Place the caret at the end of that paragraph's last text node, then press `End` and `Enter` to create a new empty paragraph below it.
3. Click toolbar `图片` button (`button[aria-label="图片"]`).
4. Click `本地图片上传` and trigger the hidden image file input (typically `input.css-1hyfx7x[type="file"]`, accept `image/*`). Upload the local image file.
5. Wait for the preview, then click `插入图片` (`button.css-owamhi`).
6. Verify `imgCount` incremented by exactly 1 and the new `<img>` sits between the anchor paragraph and the next structural element (`---`, next H2, etc.).
7. If the upload modal hangs or the click goes nowhere, refresh the page and resume from the next un-inserted image — the autosaved draft survives.

### Phase 6 — Cover image

1. Open the `发布设置` panel.
2. If the cover slot shows `添加封面` (no cover), the cover was lost — common after re-import. Re-upload via the hidden cover input (`input.UploadPicture-input`, accept `.jpeg, .jpg, .png`).
3. Wait until the cover thumbnail renders and the `添加封面` placeholder disappears.
4. The cover is a publishing asset only; do not insert it into the body.

### Phase 7 — Column / 专栏

1. In `发布设置`, set the `专栏收录` radio to `发布到专栏` (`label[for="PublishPanel-columnLabel-1"]`).
2. From the column dropdown, select the target column.
3. Verify the selected column text is visible in the panel.
4. Per user preference, do not set 话题 / 创作声明 / 投稿至问题 unless explicitly requested.

### Phase 8 — Wait for autosave, then human verification

1. Wait until the bottom status shows `刚刚 · 草稿` or `已保存`.
2. Click `预览 → 电脑预览` to open the preview tab.
3. Verify in the preview tab:
   - Title, cover, H2×N, H3×N, image count = expected (body images + cover), blockquotes, hr, lists all render.
   - No raw Markdown source (no `##`, `**`, `![`) leaks into the rendered text.
   - No duplicate first paragraph or section title.
4. Take a screenshot for the record. Close the preview tab and return to the editor tab.
5. Stop here. Do not click `发布` unless the user explicitly says `确认发布到知乎` or `确认更新知乎文章`.

## Recovery Playbook

| Symptom | Action |
|---|---|
| Pasted Markdown shows raw `##`, `**`, `![` | The user used paste / `fill()`. Select-all + delete, then import via `导入文档`. |
| All headings rendered as H3 | The `#` level was missing in the import file. Empty editor, regenerate with the placeholder-based level remap, re-import. |
| Body starts with a duplicated H2 of the article title | The leading `# 主标题` was not stripped. Empty editor, strip line 1 of the source, re-import. |
| Editor contents stack after import | Editor was not empty. Empty editor and re-import. |
| Toolbar buttons unresponsive after long uploads | Refresh the page; the autosaved draft survives. Resume from the next pending step. |
| Cover slot shows `添加封面` after re-import | Re-upload via `input.UploadPicture-input`. |
| Image inserted at the wrong position | Undo (`Meta+Z`), reposition the caret on the correct anchor paragraph, retry. |

## Zhihu Stability Rules

- Confirm editor body is empty before importing.
- Import the image-free Markdown first; never trust paste / `fill()` for body content.
- After import, verify word count is non-zero, the article's first sentence appears once, the first section title appears once, and body image count is zero.
- Wait for draft save state, optionally refresh, and verify again before inserting images.
- Insert images one by one; each upload must be followed by clicking `插入图片` and an `imgCount` increment check.
- After all images, re-verify cover and column in `发布设置` because re-imports can drop them.
- Always end with computer-preview verification and a screenshot; do not rely on log output alone.
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
登录状态：已登录 / 未登录（已请求人工登录）
导入校验：H2=.. H3=.. img=.. blockquote=.. hr=.. ul=.. firstLine=..
插图进度：N / 总数（每张已校验 imgCount 自增）
封面：已设置 / 已重传 / 缺失
专栏：已选《...》 / 未选
预览验证：通过 / 未通过（原因）
发布门禁：已停在发布前 / 未发布，原因...
下一步：...
```
