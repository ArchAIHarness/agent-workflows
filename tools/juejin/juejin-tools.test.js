import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { tool } from '@opencode-ai/plugin';
import { ArchAIAgentWorkflowsPlugin } from '../../opencode-plugin.js';
import { createJuejinTools, getJuejinBrowserAutomationGuide, prepareJuejinArticlePackage } from './juejin-tools.js';

test('prepareJuejinArticlePackage creates article package files', () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'juejin-tool-test-'));
  const result = prepareJuejinArticlePackage({
    title: 'AI Agent 工程化实践',
    markdown: '# 开头\n\n这是一篇技术文章。\n\n```js\nconsole.log("agent")\n```',
    tags: 'AI,OpenCode,工程化',
    category: 'AI',
    output_dir: outputDir,
  });

  assert.ok(fs.existsSync(result.article_path));
  assert.ok(fs.existsSync(result.metadata_path));
  assert.ok(fs.existsSync(result.checklist_path));
  assert.ok(fs.existsSync(result.browser_playbook_path));
  const article = fs.readFileSync(result.article_path, 'utf8');
  assert.match(article, /^---\ntheme: juejin\nhighlight: juejin\n---\n/);
  assert.equal(result.metadata.channel, 'juejin');
  assert.equal(result.metadata.category, 'AI');
  assert.equal(result.metadata.draft_gate, 'browser-or-manual');
  assert.equal(result.metadata.publish_gate, 'manual-confirmation-required');
});

test('prepareJuejinArticlePackage can adapt a content package into channels/juejin', () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'juejin-tool-test-'));
  const contentPackageDir = path.join(outputDir, 'content');
  fs.mkdirSync(contentPackageDir, { recursive: true });
  fs.writeFileSync(path.join(contentPackageDir, 'content.md'), '# 开头\n\n内容包正文。', 'utf8');
  fs.writeFileSync(path.join(contentPackageDir, 'metadata.json'), JSON.stringify({ title: '内容包转掘金', tags: ['AI'] }), 'utf8');

  const result = prepareJuejinArticlePackage({ content_package_dir: contentPackageDir });

  assert.equal(result.package_dir, path.join(contentPackageDir, 'channels', 'juejin'));
  assert.ok(fs.existsSync(result.article_path));
});

test('getJuejinBrowserAutomationGuide returns safe guidance', () => {
  const guide = getJuejinBrowserAutomationGuide();
  assert.match(guide, /掘金/);
  assert.match(guide, /Playwright/);
  assert.match(guide, /不会读取账号、密码、Cookie/);
  assert.match(guide, /确认发布到掘金/);
});

test('createJuejinTools exposes juejin tools', async () => {
  const tools = createJuejinTools(tool);
  assert.ok(tools.juejin_prepare_article);
  assert.ok(tools.juejin_browser_setup_guide);
  assert.ok(tools.juejin_draft_playbook);
  const playbook = await tools.juejin_draft_playbook.execute({ title: '掘金草稿测试' }, { directory: process.cwd() });
  assert.match(playbook, /掘金浏览器操作手册/);
});

test('plugin registers juejin tools', async () => {
  const plugin = await ArchAIAgentWorkflowsPlugin();
  assert.ok(plugin.tool.juejin_prepare_article);
  assert.ok(plugin.tool.juejin_draft_playbook);
});
