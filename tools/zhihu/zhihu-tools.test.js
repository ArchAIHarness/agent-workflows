import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { tool } from '@opencode-ai/plugin';
import { ArchAIAgentWorkflowsPlugin } from '../../opencode-plugin.js';
import { prepareContentPackage } from '../content/content-tools.js';
import { createZhihuTools, getZhihuBrowserAutomationGuide, prepareZhihuArticlePackage, prepareZhihuPublishWorkflow } from './zhihu-tools.js';

test('prepareZhihuPublishWorkflow creates content package and zhihu channel package in one call', () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zhihu-tool-test-'));
  const result = prepareZhihuPublishWorkflow({
    title: '一句话发布知乎闭环',
    topic: '一句话发布知乎',
    markdown: '# 开头\n\n用户只说发布知乎时，也应生成内容包和渠道包。',
    tags: 'AI Agent,知乎',
    output_dir: outputDir,
  });

  const expectedZhihuDir = path.join(result.content_package.package_dir, 'channels', 'zhihu');
  assert.equal(result.zhihu_package.package_dir, expectedZhihuDir);
  assert.ok(fs.existsSync(result.content_package.content_path));
  assert.ok(fs.existsSync(result.zhihu_package.article_path));
  assert.equal(result.publish_gate, 'manual-confirmation-required');
});

test('prepareZhihuArticlePackage creates article package files', () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zhihu-tool-test-'));
  const result = prepareZhihuArticlePackage({
    title: 'AI Agent 工程化实践复盘',
    markdown: '# 开头\n\n这是正文内容。\n\n```js\nconsole.log("ok")\n```\n',
    tags: 'AI Agent,工程化,OpenCode',
    output_dir: outputDir,
  });

  assert.ok(fs.existsSync(result.article_path));
  assert.ok(fs.existsSync(result.metadata_path));
  assert.ok(fs.existsSync(result.checklist_path));
  assert.equal(result.metadata.publish_gate, 'manual-confirmation-required');
  assert.deepEqual(result.metadata.tags, ['AI Agent', '工程化', 'OpenCode']);
  assert.match(fs.readFileSync(result.checklist_path, 'utf8'), /发布前人工确认/);
});

test('prepareZhihuArticlePackage can adapt a platform-neutral content package into channels/zhihu', () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zhihu-tool-test-'));
  const contentPackage = prepareContentPackage({
    topic: '内容渠道分离',
    title: '为什么内容管理和发布渠道要分开',
    markdown: '# 开头\n\n内容管理负责选题、生成和预审，渠道管理负责获取、草稿和发布。',
    target_channels: 'zhihu,xiaohongshu',
    output_dir: outputDir,
  });

  const result = prepareZhihuArticlePackage({ content_package_dir: contentPackage.package_dir });

  assert.equal(result.package_dir, path.join(contentPackage.package_dir, 'channels', 'zhihu'));
  assert.ok(fs.existsSync(result.article_path));
  assert.equal(result.metadata.channel, 'zhihu');
  assert.equal(result.metadata.source_content_package, contentPackage.package_dir);
});

test('prepareZhihuArticlePackage reads safe markdown source files', () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zhihu-tool-test-'));
  const sourceFile = path.join(outputDir, 'source.md');
  fs.writeFileSync(sourceFile, '# 标题\n\n安全正文', 'utf8');

  const result = prepareZhihuArticlePackage({
    title: '安全 Markdown 来源文件',
    source_file: sourceFile,
    output_dir: outputDir,
  });

  assert.ok(fs.existsSync(result.article_path));
});

test('prepareZhihuArticlePackage rejects missing title', () => {
  assert.throws(
    () => prepareZhihuArticlePackage({ markdown: 'content' }),
    /title is required/,
  );
});

test('prepareZhihuArticlePackage rejects sensitive source paths', () => {
  assert.throws(
    () => prepareZhihuArticlePackage({ title: '敏感路径', source_file: '/tmp/.env' }),
    /only supports .md|path looks sensitive/,
  );
});

test('prepareZhihuArticlePackage rejects symbolic link source files', () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zhihu-tool-test-'));
  const targetFile = path.join(outputDir, 'target.md');
  const linkFile = path.join(outputDir, 'safe.md');
  fs.writeFileSync(targetFile, '# Secret\n\nTOKEN=abc', 'utf8');
  fs.symlinkSync(targetFile, linkFile);

  assert.throws(
    () => prepareZhihuArticlePackage({ title: '符号链接拒绝测试', source_file: linkFile }),
    /symbolic link/,
  );
});

test('prepareZhihuArticlePackage throws on sensitive content without echoing value', () => {
  const sensitive = 'Authorization: Bearer abc.def.ghi';
  assert.throws(
    () => prepareZhihuArticlePackage({
      title: '敏感信息扫描测试',
      markdown: sensitive,
    }),
    (error) => {
      assert.match(error.message, /may contain sensitive information/);
      assert.doesNotMatch(error.message, /abc\.def\.ghi/);
      return true;
    },
  );
});

test('getZhihuBrowserAutomationGuide returns actionable MCP setup guidance', () => {
  const guide = getZhihuBrowserAutomationGuide();
  assert.match(guide, /opencode\.json/);
  assert.match(guide, /@playwright\/mcp/);
  assert.match(guide, /重启 OpenCode/);
  assert.match(guide, /手动登录知乎/);
});

test('zhihu_prepare_article tool keeps channel output inside content package when content_package_dir is provided', async () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zhihu-tool-test-'));
  const contentPackage = prepareContentPackage({
    topic: '工具执行路径闭环',
    title: '工具执行路径闭环',
    markdown: '# 开头\n\n渠道适配应输出到内容包内。',
    output_dir: outputDir,
  });
  const tools = createZhihuTools(tool);

  const result = await tools.zhihu_prepare_article.execute(
    { content_package_dir: contentPackage.package_dir },
    { directory: path.join(outputDir, 'workspace') },
  );

  const expectedChannelDir = path.join(contentPackage.package_dir, 'channels', 'zhihu');
  assert.match(result, new RegExp(expectedChannelDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.ok(fs.existsSync(expectedChannelDir));
});

test('createZhihuTools exposes zhihu channel tool definitions', () => {
  const tools = createZhihuTools(tool);
  assert.ok(tools.zhihu_prepare_publish);
  assert.ok(tools.zhihu_prepare_article);
  assert.ok(tools.zhihu_browser_setup_guide);
  assert.equal(typeof tools.zhihu_prepare_article.execute, 'function');
  assert.equal(typeof tools.zhihu_browser_setup_guide.execute, 'function');
  assert.ok(tools.zhihu_prepare_article.args.title);
});

test('plugin registers zhihu_prepare_article alongside config hook', async () => {
  const plugin = await ArchAIAgentWorkflowsPlugin();
  assert.equal(typeof plugin.config, 'function');
  assert.ok(plugin.tool.zhihu_prepare_article);
});
