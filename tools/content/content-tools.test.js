import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { tool } from '@opencode-ai/plugin';
import { ArchAIAgentWorkflowsPlugin } from '../../opencode-plugin.js';
import { createContentTools, prepareContentPackage } from './content-tools.js';

test('prepareContentPackage creates platform-neutral content package', () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'content-tool-test-'));
  const result = prepareContentPackage({
    topic: 'AI Agent 工程化',
    title: 'AI Agent 工程化为什么需要架构约束',
    markdown: '# 开头\n\n先给结论。',
    tags: 'AI Agent,工程化',
    target_channels: 'zhihu,xiaohongshu',
    output_dir: outputDir,
  });

  assert.ok(fs.existsSync(result.content_path));
  assert.ok(fs.existsSync(result.metadata_path));
  assert.ok(fs.existsSync(result.review_checklist_path));
  assert.ok(fs.existsSync(path.join(result.package_dir, 'channels')));
  assert.equal(result.metadata.type, 'content-package');
  assert.deepEqual(result.metadata.target_channels, ['zhihu', 'xiaohongshu']);
  assert.equal(result.metadata.review_gate, 'required');
});

test('prepareContentPackage rejects sensitive content before writing package', () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'content-tool-test-'));
  assert.throws(
    () => prepareContentPackage({
      topic: '敏感测试',
      title: '敏感测试',
      markdown: ['to', 'ken="abc"'].join(''),
      output_dir: outputDir,
    }),
    /may contain sensitive information/,
  );

  assert.equal(fs.readdirSync(outputDir).length, 0);
});

test('prepareContentPackage rejects JWT and access key style secrets without echoing values', () => {
  const jwt = ['eyJhbGciOiJIUzI1NiJ9', 'eyJzdWIiOiIxMjM0NTY3ODkwIn0', 'signaturepart'].join('.');
  const accessKey = ['AK', 'IA1234567890ABCDEF'].join('');
  const secretAccessKey = ['secret', '_access_key=abc123'].join('');
  const shortSk = ['s', 'k=abc123456'].join('');
  const upperShortSk = ['S', 'K: abc123456'].join('');

  for (const sensitive of [jwt, accessKey, secretAccessKey, 'accessKeySecret=abc123', shortSk, upperShortSk, 'ak=public\nsk=private123']) {
    assert.throws(
      () => prepareContentPackage({
        title: '敏感信息扩展扫描',
        markdown: `正文\n${sensitive}`,
      }),
      (error) => {
        assert.match(error.message, /may contain sensitive information/);
        assert.doesNotMatch(error.message, /abc123|abc123456|private123|signaturepart|1234567890ABCDEF/);
        return true;
      },
    );
  }
});

test('content_prepare_package tool is exposed by content tools and plugin', async () => {
  const contentTools = createContentTools(tool);
  assert.ok(contentTools.content_prepare_package);
  assert.equal(typeof contentTools.content_prepare_package.execute, 'function');

  const plugin = await ArchAIAgentWorkflowsPlugin();
  assert.ok(plugin.tool.content_prepare_package);
});
