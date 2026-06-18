import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { tool } from '@opencode-ai/plugin';
import { ArchAIAgentWorkflowsPlugin } from '../../opencode-plugin.js';
import { createXiaohongshuTools, getXhsBrowserAutomationGuide, prepareXiaohongshuNotePackage } from './xiaohongshu-tools.js';

test('prepareXiaohongshuNotePackage creates note package files', () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xhs-tool-test-'));
  const result = prepareXiaohongshuNotePackage({
    title: 'AI Agent 怎么从会回答到会干活',
    markdown: '# 开头\n\nAI 不只是回答问题，还需要工具、流程和边界。\n\n## 能力来源\n\n业务系统、专业流程和数据能力都可以封装成外部能力。',
    tags: 'AI,智能体,效率工具',
    output_dir: outputDir,
  });

  assert.ok(fs.existsSync(result.note_path));
  assert.ok(fs.existsSync(result.cards_path));
  assert.ok(fs.existsSync(result.metadata_path));
  assert.ok(fs.existsSync(result.checklist_path));
  assert.ok(fs.existsSync(result.browser_playbook_path));
  assert.equal(result.metadata.channel, 'xiaohongshu');
  assert.equal(result.metadata.draft_gate, 'browser-or-manual');
  assert.equal(result.metadata.publish_gate, 'manual-confirmation-required');
  assert.deepEqual(result.metadata.publish_targets, ['xiaohongshu-note']);
  assert.ok(Array.isArray(result.metadata.validation_points));
  assert.ok(result.metadata.validation_points.includes('image-count-and-order'));
  assert.ok(Array.isArray(result.metadata.manual_steps));
  assert.ok(result.metadata.manual_steps.includes('stop-before-publish'));
  assert.equal(result.metadata.image_requirements.aspect_ratio, '3:4 or 1:1');
  assert.ok(Array.isArray(result.metadata.cards));
  assert.ok(result.metadata.cards.length >= 2);
  assert.equal(result.metadata.cards[0].role, 'cover');
});

test('prepareXiaohongshuNotePackage can adapt a content package into channels/xiaohongshu', () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xhs-tool-test-'));
  const contentPackageDir = path.join(outputDir, 'content');
  fs.mkdirSync(contentPackageDir, { recursive: true });
  fs.writeFileSync(path.join(contentPackageDir, 'content.md'), '# 开头\n\n内容包正文。', 'utf8');
  fs.writeFileSync(path.join(contentPackageDir, 'metadata.json'), JSON.stringify({ title: '内容包转小红书', tags: ['AI'] }), 'utf8');

  const result = prepareXiaohongshuNotePackage({ content_package_dir: contentPackageDir });

  assert.equal(result.package_dir, path.join(contentPackageDir, 'channels', 'xiaohongshu'));
  assert.ok(fs.existsSync(result.note_path));
});

test('getXhsBrowserAutomationGuide returns safe guidance', () => {
  const guide = getXhsBrowserAutomationGuide();
  assert.match(guide, /小红书/);
  assert.match(guide, /Playwright/);
  assert.match(guide, /不会读取账号、密码、Cookie/);
  assert.match(guide, /确认发布到小红书/);
});

test('createXiaohongshuTools exposes xhs tools', async () => {
  const tools = createXiaohongshuTools(tool);
  assert.ok(tools.xhs_prepare_note);
  assert.ok(tools.xhs_browser_setup_guide);
  assert.ok(tools.xhs_draft_playbook);
  const playbook = await tools.xhs_draft_playbook.execute({ title: '小红书草稿测试' }, { directory: process.cwd() });
  assert.match(playbook, /小红书浏览器操作手册/);
});

test('plugin registers xhs tools', async () => {
  const plugin = await ArchAIAgentWorkflowsPlugin();
  assert.ok(plugin.tool.xhs_prepare_note);
  assert.ok(plugin.tool.xhs_draft_playbook);
});
