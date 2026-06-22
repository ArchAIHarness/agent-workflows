---
name: juejin-publisher
version: 2.0.0
description: |
  Use when preparing or publishing Juejin/掘金 articles, 掘金草稿, technical Markdown, Juejin front matter, theme/highlight adaptation, categories, tags, or safe Juejin publishing workflows.
---

# juejin-publisher

## Goal

Adapt technical Markdown or a content package into Juejin-ready article content, and (when a browser is available) drive the Juejin Markdown editor to a saved draft without publishing.

## Default Tools

- Article package: `juejin_prepare_article`
- Browser guidance: `juejin_browser_setup_guide`
- Draft playbook: `juejin_draft_playbook`
- Browser automation: Playwright MCP (CodeMirror injection + image upload)

## Workflow

1. Identify source content.
2. Generate the Juejin channel package with `article.juejin.md`, `metadata.json`, `publish-checklist.md`, and `browser-playbook.md`.
   - If `juejin_prepare_article` fails on very large inline Markdown (JSON parse), build the package manually: write `article.juejin.md` from the source file, then hand-write `metadata.json`.
3. Add Juejin front matter with `theme` and `highlight` (e.g. `atom-one-dark`).
4. Check code blocks, technical tags, category, title, summary, external links, Markdown preview, and code highlighting.
5. If browser automation is available, open the Juejin editor and fill a draft only after the package is ready (see Browser Automation Playbook).
6. Stop before publish unless the user explicitly says `确认发布到掘金` or `确认更新掘金文章`.

## Browser Automation Playbook (proven stable)

Juejin's Markdown editor uses **bytemd + CodeMirror**. The right-side pane is a live preview.

### Title

- Fill the title textbox directly (`输入文章标题...`). The editor auto-saves to a draft; URL changes to `/editor/drafts/<draftId>`.

### Body injection (CodeMirror `setValue`, NOT paste/typing)

- Body for injection = article Markdown WITHOUT YAML front matter and WITHOUT the duplicate H1 title (title goes in the title bar).
- Inject via Playwright `run_code_unsafe`, inline the body as base64 in the script file (placed under `.playwright-mcp/`), decode in-page with `decodeURIComponent(escape(atob(b64)))` (no Buffer/require in page context):
  ```js
  const cm = document.querySelector('.CodeMirror');
  if (cm && cm.CodeMirror) { cm.CodeMirror.setValue(md); cm.CodeMirror.refresh(); }
  ```
- `cm.setValue` replaces the whole document cleanly and preserves newlines — far more reliable than synthetic paste or `execCommand('insertText')`.
- The CodeMirror `textarea` is intercepted by `.CodeMirror-line` overlays, so a Playwright `.click()` on it times out — do not rely on clicking the editor; use the `cm.CodeMirror` API instead.

### Inline images (upload to Juejin CDN, then swap local paths)

Local relative image paths (`assets/...`) will NOT render. Upload each image to Juejin's image host and replace:

1. Find the toolbar **image** button (bytemd toolbar; hover to confirm tooltip `图片`). Move CodeMirror cursor to end first so uploads append at the bottom:
   ```js
   const ed = document.querySelector('.CodeMirror').CodeMirror;
   const last = ed.lineCount()-1; ed.setCursor({line:last, ch:ed.getLine(last).length}); ed.focus();
   ```
2. Click the image button → it opens a native file chooser → `browser_file_upload` with the absolute image path. Wait ~3s; the editor inserts `![filename](https://p?-xtjj-private.juejin.cn/...)`.
3. Repeat for every image.
4. Extract the uploaded CDN URLs and the original local refs from `cm.getValue()`, then in one `cm.setValue` pass:
   - delete the trailing bare uploaded image lines (`![filename](cdn)`),
   - replace each `(assets/.../<filename>)` with `(<cdn-url>)`, keeping the descriptive alt text.
5. Verify in the preview pane that every `img` has `complete && naturalWidth>0`.

### Publish drawer config (fill, do NOT submit)

Click `发布` to open the `发布文章` drawer. Fill every required field, then close with `取消` (config persists to the draft):

- **分类**: single-select chip (e.g. `人工智能`).
- **添加标签**: tags must come from Juejin's **predefined tag library** (free-text tags are NOT allowed). Type a candidate, wait for the dropdown, click the matching option. The placeholder div intercepts clicks on the input — click the `.byte-select__wrap` wrapper, or set the input via the wrapper. The counter `你还能添加 N 个标签` enforces a per-account cap (often 2). Common matches: `人工智能`, `机器学习`, `后端`, `前端`, `AI 编程`. Try alternates if a term has no library match (e.g. `RAG`/`大语言模型` may not exist).
- **文章封面**: click `上传封面` → native file chooser → `browser_file_upload` cover image. Recommended 192*128px; only shown in feed.
- **收录至专栏**: type the column name, click the dropdown match (max 3 columns).
- **编辑摘要**: 100-char limit. Auto-filled from body head; replace with a concise summary using the React-safe setter:
  ```js
  const ta = document.querySelector('textarea[maxlength="100"]');
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
  setter.call(ta, summary); ta.dispatchEvent(new Event('input',{bubbles:true}));
  ```

### Save draft, never publish

- Juejin auto-saves to draft on edit (header shows `保存成功`). The publish drawer's config (category/tags/cover/column/summary) **persists with the draft** — verified by closing with `取消` and re-opening: all fields remain.
- The publish buttons are `发布` → `确定并发布`. **Never click `确定并发布`** unless the user explicitly authorizes publishing. Closing the drawer with `取消` leaves a complete, configured draft.
- After saving, record `draft_id`, `draft_url`, CDN image URLs, tags actually applied (+ intended), cover/column/summary into `metadata.json`; set `session.status = draft-saved`.

## Troubleshooting

- Editor click times out → use `cm.CodeMirror.setValue`, never click the CodeMirror textarea.
- Pasted/typed body loses newlines or appends to existing text → use `cm.setValue` (full replace).
- Local images blank in preview → upload to Juejin CDN and swap paths; verify `naturalWidth>0`.
- Tag won't add → it's not in Juejin's tag library; pick a library term; mind the per-account tag cap.
- Tag/column dropdown option not clickable by ref → query the option text inside a `*dropdown*`/`*popper*`/`*select__option*` container and click it.
- `run_code_unsafe` script with large base64 → save the JS to `.playwright-mcp/` and load via `filename`.
- Lost publish config after `取消` → it does NOT lose; config persists with the draft (re-open to confirm).

## Safety Rules

- Do not read Cookie, Token, password, `.env`, browser profile, or account files.
- Do not use comment, private-message, acquisition, or growth automation.
- Do not bypass login, CAPTCHA, audit, or platform risk checks.
- Do not auto-publish, update, delete, withdraw, comment, or send messages.
- Never click `确定并发布` without explicit user authorization.

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
