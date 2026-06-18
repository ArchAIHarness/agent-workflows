# Channel Publisher Skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build channel-specific publishing Skills and Tools for Zhihu, Xiaohongshu, and Juejin, with Zhihu as the first complete implementation and Xiaohongshu/Juejin as usable channel-package skeletons.

**Architecture:** Keep content management platform-neutral, then route platform-specific work through one Skill and one Tool module per channel. Tools only generate safe packages, checklists, browser playbooks, and manual publish gates; no tool reads credentials or auto-publishes.

**Tech Stack:** OpenCode plugin, ESM Node.js, `node:test`, `@opencode-ai/plugin` custom tools, Markdown Skills.

---

## File Structure

- Create `skills/content/content-package-manager/SKILL.md`: platform-neutral content package Skill.
- Create `skills/content/zhihu-publisher/SKILL.md`: new Zhihu channel Skill.
- Modify `skills/content/zhihu-article-manager/SKILL.md`: compatibility entry pointing to `zhihu-publisher`.
- Create `skills/content/xiaohongshu-publisher/SKILL.md`: Xiaohongshu channel Skill.
- Create `skills/content/juejin-publisher/SKILL.md`: Juejin channel Skill.
- Modify `tools/zhihu/zhihu-tools.js`: unified metadata and `zhihu_draft_playbook` tool.
- Modify `tools/zhihu/zhihu-tools.test.js`: tests for unified Zhihu metadata and draft playbook.
- Create `tools/xiaohongshu/xiaohongshu-tools.js`: Xiaohongshu package, cards, guide, playbook.
- Create `tools/xiaohongshu/xiaohongshu-tools.test.js`: Xiaohongshu tests.
- Create `tools/juejin/juejin-tools.js`: Juejin package, front matter, guide, playbook.
- Create `tools/juejin/juejin-tools.test.js`: Juejin tests.
- Modify `opencode-plugin.js`: register Xiaohongshu and Juejin tools.
- Modify `README.md`: update Skills and Tools inventory.

---

## Task 1: Add channel Skill files

**Files:**
- Create `skills/content/content-package-manager/SKILL.md`
- Create `skills/content/zhihu-publisher/SKILL.md`
- Modify `skills/content/zhihu-article-manager/SKILL.md`
- Create `skills/content/xiaohongshu-publisher/SKILL.md`
- Create `skills/content/juejin-publisher/SKILL.md`

Steps:

- [ ] Write `content-package-manager` with frontmatter `name: content-package-manager`, version `1.0.0`, and rules: use `content_prepare_package`, no platform opening, no Cookie/Token/`.env`.
- [ ] Write `zhihu-publisher` with tools `zhihu_prepare_publish`, `zhihu_prepare_article`, `zhihu_browser_setup_guide`, `zhihu_draft_playbook`, and Zhihu stable draft rules.
- [ ] Replace old `zhihu-article-manager` body with compatibility guidance that routes users to `zhihu-publisher` while keeping old trigger frontmatter.
- [ ] Write `xiaohongshu-publisher` with tools `xhs_prepare_note`, `xhs_browser_setup_guide`, `xhs_draft_playbook`, card planning rules, and `确认发布到小红书` gate.
- [ ] Write `juejin-publisher` with tools `juejin_prepare_article`, `juejin_browser_setup_guide`, `juejin_draft_playbook`, front matter rules, and `确认发布到掘金` gate.
- [ ] Verify all Skill files start with frontmatter and contain no private paths or credentials.

Verification:

```bash
node -e "const fs=require('fs'); for (const f of ['skills/content/content-package-manager/SKILL.md','skills/content/zhihu-publisher/SKILL.md','skills/content/xiaohongshu-publisher/SKILL.md','skills/content/juejin-publisher/SKILL.md','skills/content/zhihu-article-manager/SKILL.md']) { const s=fs.readFileSync(f,'utf8'); if(!s.startsWith('---\n')) throw new Error(f+' missing frontmatter'); } console.log('skills ok')"
```

Expected: `skills ok`.

---

## Task 2: Enhance Zhihu tools to unified protocol

**Files:**
- Modify `tools/zhihu/zhihu-tools.js`
- Modify `tools/zhihu/zhihu-tools.test.js`

Steps:

- [ ] Add failing tests requiring `metadata.draft_gate`, `metadata.assets`, `metadata.image_plan`, `metadata.session.id`, and `zhihu_draft_playbook` tool.
- [ ] Run `node --test tools/zhihu/zhihu-tools.test.js`; expected failure before implementation.
- [ ] Add `buildSession(channel, title)` helper returning `{ id, status: 'package-prepared', current_step: 'channel-package-created', recoverable: true }`.
- [ ] Extend Zhihu metadata with unified fields: `draft_gate`, `publish_gate`, `assets`, `image_plan`, `session`, `channel_actions`.
- [ ] Export `buildZhihuBrowserPlaybook({ title })` and reuse it when writing `browser-playbook.md`.
- [ ] Add `zhihu_draft_playbook` custom tool that returns the playbook text for a given title.
- [ ] Run `node --test tools/zhihu/zhihu-tools.test.js`; expected pass.

---

## Task 3: Add Xiaohongshu tools

**Files:**
- Create `tools/xiaohongshu/xiaohongshu-tools.js`
- Create `tools/xiaohongshu/xiaohongshu-tools.test.js`

Steps:

- [ ] Write tests for `prepareXiaohongshuNotePackage`: it creates `note.xhs.md`, `cards.json`, `metadata.json`, `publish-checklist.md`, and `browser-playbook.md`.
- [ ] Write tests for `createXiaohongshuTools`: it exposes `xhs_prepare_note`, `xhs_browser_setup_guide`, and `xhs_draft_playbook`.
- [ ] Run `node --test tools/xiaohongshu/xiaohongshu-tools.test.js`; expected failure because implementation does not exist.
- [ ] Implement `prepareXiaohongshuNotePackage(input)` with safe title/markdown validation, normalized tags, summary, card plan, and unified metadata.
- [ ] Implement `buildXhsBrowserPlaybook({ title })` with creator-platform draft steps and manual publish gate.
- [ ] Implement `getXhsBrowserAutomationGuide()` with Playwright/Chrome DevTools guidance, manual login, and no Cookie/Token rules.
- [ ] Implement `createXiaohongshuTools(tool)` registering `xhs_prepare_note`, `xhs_browser_setup_guide`, `xhs_draft_playbook`.
- [ ] Run `node --test tools/xiaohongshu/xiaohongshu-tools.test.js`; expected pass.

---

## Task 4: Add Juejin tools

**Files:**
- Create `tools/juejin/juejin-tools.js`
- Create `tools/juejin/juejin-tools.test.js`

Steps:

- [ ] Write tests for `prepareJuejinArticlePackage`: it creates `article.juejin.md`, `metadata.json`, `publish-checklist.md`, and `browser-playbook.md`.
- [ ] Assert `article.juejin.md` starts with front matter containing `theme: juejin` and `highlight: juejin`.
- [ ] Write tests for `createJuejinTools`: it exposes `juejin_prepare_article`, `juejin_browser_setup_guide`, and `juejin_draft_playbook`.
- [ ] Run `node --test tools/juejin/juejin-tools.test.js`; expected failure because implementation does not exist.
- [ ] Implement `prepareJuejinArticlePackage(input)` with front matter injection, normalized tags, category, summary, and unified metadata.
- [ ] Implement `buildJuejinBrowserPlaybook({ title })` with editor draft steps and manual publish gate.
- [ ] Implement `getJuejinBrowserAutomationGuide()` with Playwright/Chrome DevTools guidance, manual login, and no Cookie/Token rules.
- [ ] Implement `createJuejinTools(tool)` registering `juejin_prepare_article`, `juejin_browser_setup_guide`, `juejin_draft_playbook`.
- [ ] Run `node --test tools/juejin/juejin-tools.test.js`; expected pass.

---

## Task 5: Register tools in plugin

**Files:**
- Modify `opencode-plugin.js`
- Add tests in existing channel test files or create a plugin registration test if useful.

Steps:

- [ ] Add imports: `createXiaohongshuTools` and `createJuejinTools`.
- [ ] Spread both tool groups into plugin `tool` map.
- [ ] Add test assertions that plugin exposes `xhs_prepare_note`, `xhs_draft_playbook`, `juejin_prepare_article`, and `juejin_draft_playbook`.
- [ ] Run `node --check opencode-plugin.js`.
- [ ] Run `node --test tools/zhihu/zhihu-tools.test.js tools/xiaohongshu/xiaohongshu-tools.test.js tools/juejin/juejin-tools.test.js`.

---

## Task 6: Update README and verify repository

**Files:**
- Modify `README.md`

Steps:

- [ ] Update Skills count and Skill table to include `content-package-manager`, `zhihu-publisher`, `xiaohongshu-publisher`, `juejin-publisher`; keep `zhihu-article-manager` as compatibility if retained in list.
- [ ] Update Tools section to include `tools/xiaohongshu` and `tools/juejin`.
- [ ] Update plugin registration description to mention Zhihu/Xiaohongshu/Juejin tools.
- [ ] Run validation commands:

```bash
node --check opencode-plugin.js
node --check .opencode/plugins/archai-agent-workflows.js
node -e "const fs=require('fs'); const p=require('./package.json'); if(!fs.existsSync(p.main)) process.exit(1); console.log(p.main)"
node --test tools/zhihu/zhihu-tools.test.js tools/xiaohongshu/xiaohongshu-tools.test.js tools/juejin/juejin-tools.test.js
git status --short
```

Expected: syntax checks pass, tests pass, git status only shows intended files.

---

## Self-Review

Spec coverage:

- Channel-specific Skills: Task 1.
- Zhihu complete implementation: Task 2.
- Xiaohongshu skeleton: Task 3.
- Juejin skeleton: Task 4.
- Plugin registration: Task 5.
- README and verification: Task 6.
- Safety boundary: encoded in each Skill and each tool package/checklist/playbook.

Placeholder scan: no `TBD`, `TODO`, or unspecified implementation steps are required for execution.

Type consistency: planned function names match tool names and plugin registration names.
