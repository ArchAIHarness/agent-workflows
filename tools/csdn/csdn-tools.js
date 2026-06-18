import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { normalizeList, scanSensitiveContent } from '../content/content-tools.js';

function stripFrontmatter(markdown) {
  return String(markdown || '').replace(/^---\n[\s\S]*?\n---\n/, '').trim();
}

function inferSummary(markdown, fallback = '') {
  if (fallback && String(fallback).trim()) return String(fallback).trim();
  const plain = stripFrontmatter(markdown)
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[#>*_`\-[\]()]/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');
  return plain.slice(0, 160);
}

function safeSlug(title) {
  const digest = crypto.createHash('sha1').update(String(title || Date.now())).digest('hex').slice(0, 8);
  const normalized = String(title || 'csdn-article')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `${normalized || 'csdn-article'}-${digest}`;
}

function buildSession(channel, title) {
  const digest = crypto.createHash('sha1').update(`${channel}:${title}:${Date.now()}`).digest('hex').slice(0, 10);
  return {
    id: `${channel}-${digest}`,
    status: 'package-prepared',
    current_step: 'channel-package-created',
    recoverable: true,
  };
}

function loadContentPackage(contentPackageDir) {
  const packageDir = path.resolve(String(contentPackageDir));
  const metadataPath = path.join(packageDir, 'metadata.json');
  const contentPath = path.join(packageDir, 'content.md');
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  const markdown = fs.readFileSync(contentPath, 'utf8');
  return { packageDir, metadata, markdown };
}

function ensureOutputDir(outputDir) {
  const target = outputDir || path.join(process.cwd(), '.tmp', 'csdn-article-packages');
  fs.mkdirSync(target, { recursive: true });
  return target;
}

function countCodeFences(markdown) {
  return (String(markdown || '').match(/```/g) || []).length;
}

function buildCsdnChecklist({ title, body, tags, category, articleType, summary }) {
  const fenceCount = countCodeFences(body);
  return [
    title.length >= 8 ? '标题长度正常' : '标题偏短，建议补充具体技术对象或收益',
    summary ? '摘要已生成，发布前可填入 CSDN 摘要/描述区域' : '摘要缺失，建议补充 80-160 字摘要',
    tags.length > 0 ? `标签已准备：${tags.join('、')}` : '标签缺失，建议补充 2-5 个技术标签',
    category ? `分类已设置：${category}` : '分类缺失，建议选择 CSDN 技术分类',
    articleType === 'original' ? '文章类型：原创，发布前确认原创声明' : `文章类型：${articleType}，发布前确认转载/翻译来源`,
    fenceCount % 2 === 0 ? '代码块围栏数量正常' : '代码块围栏数量为奇数，发布前必须修复 Markdown 代码块',
    body.includes('![') ? '包含图片，发布前检查图片是否上传成功' : '未检测到 Markdown 图片',
    /https?:\/\//.test(body) ? '包含外链，发布前检查链接可访问性与平台策略' : '未检测到外链',
    '发布前人工确认：标题、摘要、分类、标签、原创声明、代码块、图片、外链和敏感信息',
  ];
}

export function buildCsdnBrowserPlaybook({ title }) {
  return [
    `# CSDN 浏览器操作手册：${title}`,
    '',
    '## 原则',
    '',
    '- 不读取 Cookie、Token、密码、浏览器 profile 或 `.env`。',
    '- 不点击发布或更新，除非用户明确回复“确认发布到 CSDN”或“确认更新 CSDN 文章”。',
    '- 不执行评论、私信、关注、批量运营、引流等动作。',
    '- 出现验证码、安全验证、登录异常、审核提示或账号风险提示时立即停止。',
    '',
    '## 草稿流程',
    '',
    '1. 打开 CSDN 创作中心或 Markdown 编辑器。',
    '2. 如未登录，让用户在浏览器页面手动登录。',
    '3. 选择 Markdown 编辑器或确认当前编辑器支持 Markdown。',
    '4. 复制 `article.csdn.md` 内容到编辑器。',
    '5. 填写或核对标题、摘要、分类、标签和原创/转载/翻译声明。',
    '6. 检查预览效果、代码高亮、图片、外链和目录。',
    '7. 保存草稿或停在发布前。',
    '8. 等待用户明确回复“确认发布到 CSDN”后才允许发布。',
    '',
    '## 验收重点',
    '',
    '- 标题与正文首屏一致。',
    '- 摘要没有敏感信息和夸大表达。',
    '- 分类和标签符合文章主题。',
    '- 原创声明选择正确。',
    '- 代码块闭合且高亮正常。',
    '- 图片显示正常，外链可访问。',
    '',
  ].join('\n');
}

export function getCsdnBrowserAutomationGuide() {
  return [
    'CSDN 渠道发布需要浏览器自动化能力。当前工具不会读取账号、密码、Cookie 或浏览器 Profile。',
    '',
    '插件会自动注册 Playwright MCP 和 Chrome DevTools MCP。若当前会话没有浏览器工具，请重启 OpenCode。',
    '登录 CSDN 时请在浏览器页面手动完成，不要把 Cookie 或 Token 提供给 AI。',
    '发布上线前必须明确回复“确认发布到 CSDN”或“确认更新 CSDN 文章”。',
  ].join('\n');
}

export function prepareCsdnArticlePackage(input = {}) {
  let sourceContentPackage = '';
  let packageMetadata = {};
  let markdown = input.markdown || '';

  if (input.content_package_dir) {
    const loaded = loadContentPackage(input.content_package_dir);
    sourceContentPackage = loaded.packageDir;
    packageMetadata = loaded.metadata;
    markdown = loaded.markdown;
  }

  const title = String(input.title || packageMetadata.title || '').trim();
  if (!title) throw new Error('title is required');
  if (!String(markdown).trim()) throw new Error('markdown or content_package_dir is required');

  const tags = normalizeList(input.tags || packageMetadata.tags || []);
  const category = String(input.category || packageMetadata.category || '人工智能').trim();
  const articleType = String(input.article_type || packageMetadata.article_type || 'original').trim();
  const body = stripFrontmatter(markdown);
  const summary = inferSummary(body, input.summary || packageMetadata.summary || '');
  const sensitiveFindings = scanSensitiveContent(`${title}\n${summary}\n${body}\n${tags.join('\n')}\n${category}\n${articleType}`);
  if (sensitiveFindings.length > 0) {
    throw new Error(`content may contain sensitive information: ${sensitiveFindings.join('；')}`);
  }

  const validationPoints = [
    'markdown-preview',
    'code-highlight-rendered',
    'image-rendered',
    'external-links-reviewed',
    'category-and-tags-selected',
    'originality-declaration',
    'manual-publish-confirmation',
  ];
  const manualSteps = [
    'open-csdn-creator',
    'manual-login-if-needed',
    'select-markdown-editor',
    'paste-article-markdown',
    'fill-title-summary-category-tags',
    'confirm-originality-declaration',
    'preview-article',
    'save-draft',
    'stop-before-publish',
  ];
  const previewRequirements = ['markdown-rendered', 'code-highlight-rendered', 'images-rendered', 'links-clickable'];
  const checklist = buildCsdnChecklist({ title, body, tags, category, articleType, summary });

  const outputDir = ensureOutputDir(input.output_dir || (sourceContentPackage ? path.join(sourceContentPackage, 'channels') : undefined));
  const packageDir = sourceContentPackage ? path.join(outputDir, 'csdn') : path.join(outputDir, safeSlug(title));
  fs.mkdirSync(packageDir, { recursive: true });

  const metadata = {
    type: 'channel-package',
    channel: 'csdn',
    platform: 'csdn',
    title,
    summary,
    tags,
    category,
    article_type: articleType,
    editor_type: 'markdown',
    source_content_package: sourceContentPackage || '',
    draft_gate: 'browser-or-manual',
    publish_gate: 'manual-confirmation-required',
    channel_actions: ['prepare-csdn-markdown', 'save-draft-with-browser-automation', 'publish-after-human-confirmation'],
    validation_points: validationPoints,
    manual_steps: manualSteps,
    preview_requirements: previewRequirements,
    assets: [],
    session: buildSession('csdn', title),
    generated_at: new Date().toISOString(),
    sensitive_findings: sensitiveFindings,
    checklist,
  };

  const articlePath = path.join(packageDir, 'article.csdn.md');
  const metadataPath = path.join(packageDir, 'metadata.json');
  const checklistPath = path.join(packageDir, 'publish-checklist.md');
  const browserPlaybookPath = path.join(packageDir, 'browser-playbook.md');

  fs.writeFileSync(articlePath, body.endsWith('\n') ? body : `${body}\n`, 'utf8');
  fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
  fs.writeFileSync(browserPlaybookPath, buildCsdnBrowserPlaybook({ title }), 'utf8');
  fs.writeFileSync(
    checklistPath,
    [
      `# CSDN 发布检查：${title}`,
      '',
      `- 标题：${title}`,
      `- 摘要：${summary || '待补充'}`,
      `- 分类：${category || '待补充'}`,
      `- 标签：${tags.length ? tags.join('、') : '待补充'}`,
      `- 文章类型：${articleType}`,
      '',
      '## 检查项',
      ...checklist.map((item) => `- [ ] ${item}`),
      '',
      '## 敏感信息扫描',
      ...(sensitiveFindings.length ? sensitiveFindings.map((item) => `- ${item}`) : ['- 未发现明显敏感片段']),
      '',
    ].join('\n'),
    'utf8',
  );

  return {
    package_dir: packageDir,
    article_path: articlePath,
    metadata_path: metadataPath,
    checklist_path: checklistPath,
    browser_playbook_path: browserPlaybookPath,
    metadata,
  };
}

export function createCsdnTools(tool) {
  return {
    csdn_prepare_article: tool({
      description: '准备 CSDN 技术文章渠道包：生成 article.csdn.md、metadata.json、发布检查清单和浏览器操作手册，不读取 Cookie/Token，不发布。',
      args: {
        title: tool.schema.string({ description: 'CSDN 文章标题；使用 content_package_dir 时可省略' }).optional(),
        content_package_dir: tool.schema.string({ description: '通用内容管理包目录；提供后输出到 channels/csdn' }).optional(),
        markdown: tool.schema.string({ description: 'Markdown 正文；与 content_package_dir 二选一' }).optional(),
        tags: tool.schema.string({ description: '标签，逗号分隔' }).optional(),
        category: tool.schema.string({ description: 'CSDN 分类，如 人工智能、后端、前端、云原生' }).optional(),
        article_type: tool.schema.string({ description: '文章类型：original、repost、translation，默认 original' }).optional(),
        summary: tool.schema.string({ description: '摘要，可留空自动从正文提取' }).optional(),
        output_dir: tool.schema.string({ description: '输出目录；默认当前项目 .tmp/csdn-article-packages' }).optional(),
      },
      async execute(args, context) {
        try {
          const result = prepareCsdnArticlePackage({
            ...args,
            output_dir: args.output_dir || (args.content_package_dir ? undefined : path.join(context?.directory || process.cwd(), '.tmp', 'csdn-article-packages')),
          });
          return [
            'CSDN 技术文章渠道包已生成。',
            `- 渠道包：${result.package_dir}`,
            `- 文章正文：${result.article_path}`,
            `- 检查清单：${result.checklist_path}`,
            `- 浏览器操作手册：${result.browser_playbook_path}`,
            `- 分类：${result.metadata.category}`,
            `- 文章类型：${result.metadata.article_type}`,
            `- 发布门禁：${result.metadata.publish_gate}`,
          ].join('\n');
        } catch (error) {
          return `CSDN 技术文章渠道包生成失败：${error.message}`;
        }
      },
    }),

    csdn_browser_setup_guide: tool({
      description: '返回 CSDN 发布所需的浏览器自动化配置引导、手动登录说明和发布门禁。不会读取 Cookie/Token。',
      args: {},
      async execute() {
        return getCsdnBrowserAutomationGuide();
      },
    }),

    csdn_draft_playbook: tool({
      description: '返回 CSDN 草稿填写、分类标签、原创声明、预览检查和发布门禁操作手册。不会读取 Cookie/Token。',
      args: {
        title: tool.schema.string({ description: 'CSDN 文章标题，用于生成操作手册标题' }),
      },
      async execute(args) {
        return buildCsdnBrowserPlaybook({ title: args.title });
      },
    }),
  };
}
