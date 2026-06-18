import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { tool } from '@opencode-ai/plugin';
import { ArchAIAgentWorkflowsPlugin } from '../../opencode-plugin.js';
import { createCsdnTools, getCsdnBrowserAutomationGuide, prepareCsdnArticlePackage } from './csdn-tools.js';

test('prepareCsdnArticlePackage creates article package files', () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'csdn-tool-test-'));
  const result = prepareCsdnArticlePackage({
    title: 'AI Agent 工程化实践',
    markdown: '# 开头\n\n这是一篇技术文章。\n\n```js\nconsole.log("agent")\n```',
    tags: 'AI,OpenCode,工程化',
    category: '人工智能',
    output_dir: outputDir,
  });

  assert.ok(fs.existsSync(result.article_path));
  assert.ok(fs.existsSync(result.metadata_path));
  assert.ok(fs.existsSync(result.checklist_path));
  assert.ok(fs.existsSync(result.browser_playbook_path));
  assert.equal(result.metadata.channel, 'csdn');
  assert.equal(result.metadata.platform, 'csdn');
  assert.equal(result.metadata.article_type, 'original');
  assert.equal(result.metadata.editor_type, 'markdown');
  assert.equal(result.metadata.category, '人工智能');
  assert.equal(result.metadata.draft_gate, 'browser-or-manual');
  assert.equal(result.metadata.publish_gate, 'manual-confirmation-required');
  assert.ok(result.metadata.validation_points.includes('originality-declaration'));
  assert.ok(result.metadata.manual_steps.includes('stop-before-publish'));
});

test('prepareCsdnArticlePackage flags unclosed code fences in checklist', () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'csdn-tool-test-'));
  const result = prepareCsdnArticlePackage({
    title: 'AI Agent 工程化实践',
    markdown: '# 开头\n\n```js\nconsole.log("agent")',
    tags: 'AI,OpenCode',
    category: '人工智能',
    output_dir: outputDir,
  });

  const checklist = fs.readFileSync(result.checklist_path, 'utf8');
  assert.match(checklist, /代码块围栏数量为奇数/);
});

test('prepareCsdnArticlePackage can adapt a content package into channels/csdn', () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'csdn-tool-test-'));
  const contentPackageDir = path.join(outputDir, 'content');
  fs.mkdirSync(contentPackageDir, { recursive: true });
  fs.writeFileSync(path.join(contentPackageDir, 'content.md'), '# 开头\n\n内容包正文。', 'utf8');
  fs.writeFileSync(path.join(contentPackageDir, 'metadata.json'), JSON.stringify({ title: '内容包转 CSDN', tags: ['AI'] }), 'utf8');

  const result = prepareCsdnArticlePackage({ content_package_dir: contentPackageDir });

  assert.equal(result.package_dir, path.join(contentPackageDir, 'channels', 'csdn'));
  assert.ok(fs.existsSync(result.article_path));
});

test('prepareCsdnArticlePackage rejects sensitive content', () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'csdn-tool-test-'));
  assert.throws(
    () => prepareCsdnArticlePackage({
      title: '敏感内容测试',
      markdown: 'Authorization: Bearer abc.def.ghi',
      output_dir: outputDir,
    }),
    /sensitive information/,
  );
});

test('getCsdnBrowserAutomationGuide returns safe guidance', () => {
  const guide = getCsdnBrowserAutomationGuide();
  assert.match(guide, /CSDN/);
  assert.match(guide, /Playwright/);
  assert.match(guide, /不会读取账号、密码、Cookie/);
  assert.match(guide, /确认发布到 CSDN/);
});

test('createCsdnTools exposes csdn tools', async () => {
  const tools = createCsdnTools(tool);
  assert.ok(tools.csdn_prepare_article);
  assert.ok(tools.csdn_browser_setup_guide);
  assert.ok(tools.csdn_draft_playbook);
  const playbook = await tools.csdn_draft_playbook.execute({ title: 'CSDN 草稿测试' }, { directory: process.cwd() });
  assert.match(playbook, /CSDN 浏览器操作手册/);
});

test('plugin registers csdn tools', async () => {
  const plugin = await ArchAIAgentWorkflowsPlugin();
  assert.ok(plugin.tool.csdn_prepare_article);
  assert.ok(plugin.tool.csdn_draft_playbook);
});
