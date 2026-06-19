import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { tool } from '@opencode-ai/plugin';
import { ArchAIAgentWorkflowsPlugin } from '../../opencode-plugin.js';
import {
  createCsdnTools,
  getCsdnBrowserAutomationGuide,
  prepareCsdnArticlePackage,
  extractContentImages,
  buildPlaceholderMarkdown,
  buildCsdnBrowserPlaybook,
  CSDN_SAFE_OPS,
  buildImageUploadPlaybook,
} from './csdn-tools.js';

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

// ===== 新增功能测试 =====

test('extractContentImages extracts local images with metadata', () => {
  const markdown = `# 标题

正文一段。

![第一张图](images/fig1.png)

正文第二段。

![第二张图](images/fig2.jpg "标题")

远程图片应该被跳过：

![远程图](https://example.com/img.png)
`;
  const images = extractContentImages(markdown);
  assert.equal(images.length, 2);
  assert.equal(images[0].index, 0);
  assert.equal(images[0].alt, '第一张图');
  assert.equal(images[0].src, 'images/fig1.png');
  assert.equal(images[0].placeholder, '@@@IMG_0@@@');
  assert.equal(images[1].index, 1);
  assert.equal(images[1].alt, '第二张图');
  assert.equal(images[1].placeholder, '@@@IMG_1@@@');
});

test('extractContentImages returns empty array for text-only markdown', () => {
  const markdown = '# 标题\n\n纯文字内容。\n\n## 第二节\n\n没有图片。';
  const images = extractContentImages(markdown);
  assert.equal(images.length, 0);
});

test('buildPlaceholderMarkdown replaces images with placeholders', () => {
  const markdown = '# 标题\n\n正文。\n\n![图1](img/a.png)\n\n更多正文。\n\n![图2](img/b.png)\n\n结尾。';
  const { placeholderMarkdown, images } = buildPlaceholderMarkdown(markdown);
  assert.equal(images.length, 2);
  assert.match(placeholderMarkdown, /@@@IMG_0@@@/);
  assert.match(placeholderMarkdown, /@@@IMG_1@@@/);
  assert.doesNotMatch(placeholderMarkdown, /!\[图1\]/);
  assert.doesNotMatch(placeholderMarkdown, /!\[图2\]/);
});

test('CSDN_SAFE_OPS defines safe and forbidden operations', () => {
  assert.ok(Array.isArray(CSDN_SAFE_OPS.safeMethods));
  assert.ok(Array.isArray(CSDN_SAFE_OPS.forbiddenMethods));
  assert.ok(CSDN_SAFE_OPS.safeMethods.length > 0);
  assert.ok(CSDN_SAFE_OPS.forbiddenMethods.length > 0);
  // 安全操作包含导入 Markdown
  assert.ok(CSDN_SAFE_OPS.safeMethods.some((m) => m.includes('导入')));
  // 禁止操作包含直接修改 innerHTML
  assert.ok(CSDN_SAFE_OPS.forbiddenMethods.some((m) => m.includes('innerHTML')));
  // 有降级选择器
  assert.ok(CSDN_SAFE_OPS.fallbackSelectors.titleInput.length > 0);
  assert.ok(CSDN_SAFE_OPS.fallbackSelectors.imageToolbarButton.length > 0);
});

test('buildImageUploadPlaybook generates image upload guide', () => {
  const images = [
    { index: 0, alt: '图1', src: 'img/a.png', placeholder: '@@@IMG_0@@@' },
    { index: 1, alt: '图2', src: 'img/b.png', placeholder: '@@@IMG_1@@@' },
  ];
  const playbook = buildImageUploadPlaybook({ images });
  assert.match(playbook, /占位符替换法/);
  assert.match(playbook, /@@@IMG_0@@@/);
  assert.match(playbook, /@@@IMG_1@@@/);
  assert.match(playbook, /验证/);
  assert.match(playbook, /图片映射表/);
  assert.match(playbook, /img\/a\.png/);
  assert.match(playbook, /img\/b\.png/);
});

test('buildImageUploadPlaybook returns empty string for no images', () => {
  const result = buildImageUploadPlaybook({ images: [] });
  assert.equal(result, '');
});

test('prepareCsdnArticlePackage generates placeholder files when images present', () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'csdn-tool-test-img-'));
  const result = prepareCsdnArticlePackage({
    title: '带图片的文章',
    markdown: '# 标题\n\n正文。\n\n![示意图](assets/diagram.png)\n\n结尾。',
    tags: 'AI',
    category: '人工智能',
    output_dir: outputDir,
  });

  assert.equal(result.image_count, 1);
  assert.ok(result.placeholder_path);
  assert.ok(result.images_map_path);
  assert.ok(fs.existsSync(result.placeholder_path));
  assert.ok(fs.existsSync(result.images_map_path));

  // 占位符文件包含占位符
  const placeholderContent = fs.readFileSync(result.placeholder_path, 'utf8');
  assert.match(placeholderContent, /@@@IMG_0@@@/);
  assert.doesNotMatch(placeholderContent, /!\[示意图\]/);

  // 图片映射表包含正确信息
  const imagesMap = JSON.parse(fs.readFileSync(result.images_map_path, 'utf8'));
  assert.equal(imagesMap.count, 1);
  assert.equal(imagesMap.images[0].src, 'assets/diagram.png');
  assert.equal(imagesMap.images[0].placeholder, '@@@IMG_0@@@');

  // metadata 中有图片信息
  assert.equal(result.metadata.image_count, 1);
  assert.equal(result.metadata.content_images.length, 1);
  assert.ok(result.metadata.manual_steps.includes('upload-images-via-placeholder-replacement'));
});

test('prepareCsdnArticlePackage skips placeholder files when no images', () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'csdn-tool-test-noimg-'));
  const result = prepareCsdnArticlePackage({
    title: '无图片文章',
    markdown: '# 标题\n\n纯文字内容。',
    tags: 'AI',
    category: '人工智能',
    output_dir: outputDir,
  });

  assert.equal(result.image_count, 0);
  assert.equal(result.placeholder_path, '');
  assert.equal(result.images_map_path, '');
  assert.ok(!result.metadata.manual_steps.includes('upload-images-via-placeholder-replacement'));
});

test('buildCsdnBrowserPlaybook includes safety boundaries and image section', () => {
  const images = [
    { index: 0, alt: '图', src: 'img/a.png', placeholder: '@@@IMG_0@@@' },
  ];
  const playbook = buildCsdnBrowserPlaybook({
    title: '测试文章',
    images,
  });

  // 包含安全操作边界
  assert.match(playbook, /安全操作边界/);
  assert.match(playbook, /✅ 安全操作/);
  assert.match(playbook, /❌ 禁止操作/);
  // 包含降级选择器
  assert.match(playbook, /降级选择器参考/);
  // 包含图片上传章节
  assert.match(playbook, /占位符替换法/);
  // 包含阶段化流程
  assert.match(playbook, /第一阶段/);
  assert.match(playbook, /第二阶段/);
  assert.match(playbook, /第三阶段/);
  assert.match(playbook, /第四阶段/);
});
