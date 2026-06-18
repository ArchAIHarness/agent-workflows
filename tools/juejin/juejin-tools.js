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
  const normalized = String(title || 'juejin-article')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `${normalized || 'juejin-article'}-${digest}`;
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
  const target = outputDir || path.join(process.cwd(), '.tmp', 'juejin-article-packages');
  fs.mkdirSync(target, { recursive: true });
  return target;
}

function withJuejinFrontmatter(markdown, theme, highlight) {
  const body = stripFrontmatter(markdown);
  return [`---`, `theme: ${theme}`, `highlight: ${highlight}`, `---`, '', body, ''].join('\n');
}

export function buildJuejinBrowserPlaybook({ title }) {
  return [
    `# 掘金浏览器操作手册：${title}`,
    '',
    '## 原则',
    '',
    '- 不读取 Cookie、Token、密码、浏览器 profile 或 `.env`。',
    '- 不点击发布或更新，除非用户明确回复“确认发布到掘金”或“确认更新掘金文章”。',
    '- 不执行评论、私信、获客、批量运营等动作。',
    '- 出现验证码、安全验证、登录异常或审核提示时立即停止。',
    '',
    '## 草稿流程',
    '',
    '1. 打开掘金创作中心或 Markdown 编辑器。',
    '2. 如未登录，让用户在浏览器页面手动登录。',
    '3. 复制 `article.juejin.md` 内容到编辑器。',
    '4. 检查标题、分类、标签、代码块和预览效果。',
    '5. 保存草稿或停在发布前。',
    '6. 等待用户明确回复“确认发布到掘金”后才允许发布。',
    '',
  ].join('\n');
}

export function getJuejinBrowserAutomationGuide() {
  return [
    '掘金渠道发布需要浏览器自动化能力。当前工具不会读取账号、密码、Cookie 或浏览器 Profile。',
    '',
    '插件会自动注册 Playwright MCP 和 Chrome DevTools MCP。若当前会话没有浏览器工具，请重启 OpenCode。',
    '登录掘金时请在浏览器页面手动完成，不要把 Cookie 或 Token 提供给 AI。',
    '发布上线前必须明确回复“确认发布到掘金”或“确认更新掘金文章”。',
  ].join('\n');
}

export function prepareJuejinArticlePackage(input = {}) {
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
  const category = String(input.category || packageMetadata.category || 'AI').trim();
  const theme = String(input.theme || 'juejin').trim();
  const highlight = String(input.highlight || 'juejin').trim();
  const body = stripFrontmatter(markdown);
  const summary = inferSummary(body, input.summary || packageMetadata.summary || '');
  const sensitiveFindings = scanSensitiveContent(`${title}\n${summary}\n${body}\n${tags.join('\n')}\n${category}`);
  if (sensitiveFindings.length > 0) {
    throw new Error(`content may contain sensitive information: ${sensitiveFindings.join('；')}`);
  }

  const checklist = [
    title.length >= 8 ? '标题长度正常' : '标题偏短，建议补充具体技术对象或收益',
    body.includes('```') ? '包含代码块，发布后需检查高亮和缩进' : '未检测到代码块，如为技术文建议补充关键示例',
    tags.length > 0 ? `标签已准备：${tags.join('、')}` : '标签缺失，建议补充 2-4 个技术标签',
    category ? `分类已设置：${category}` : '分类缺失，建议选择技术分类',
    '发布前人工确认：标题、摘要、分类、标签、代码块、外链和敏感信息',
  ];

  const outputDir = ensureOutputDir(input.output_dir || (sourceContentPackage ? path.join(sourceContentPackage, 'channels') : undefined));
  const packageDir = sourceContentPackage ? path.join(outputDir, 'juejin') : path.join(outputDir, safeSlug(title));
  fs.mkdirSync(packageDir, { recursive: true });

  const metadata = {
    type: 'channel-package',
    channel: 'juejin',
    platform: 'juejin',
    title,
    summary,
    tags,
    category,
    theme,
    highlight,
    source_content_package: sourceContentPackage || '',
    draft_gate: 'browser-or-manual',
    publish_gate: 'manual-confirmation-required',
    channel_actions: ['prepare-technical-markdown', 'save-draft-with-browser-automation', 'publish-after-human-confirmation'],
    assets: [],
    session: buildSession('juejin', title),
    generated_at: new Date().toISOString(),
    sensitive_findings: sensitiveFindings,
    checklist,
  };

  const articlePath = path.join(packageDir, 'article.juejin.md');
  const metadataPath = path.join(packageDir, 'metadata.json');
  const checklistPath = path.join(packageDir, 'publish-checklist.md');
  const browserPlaybookPath = path.join(packageDir, 'browser-playbook.md');

  fs.writeFileSync(articlePath, withJuejinFrontmatter(body, theme, highlight), 'utf8');
  fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
  fs.writeFileSync(browserPlaybookPath, buildJuejinBrowserPlaybook({ title }), 'utf8');
  fs.writeFileSync(
    checklistPath,
    [`# 掘金发布检查：${title}`, '', ...checklist.map((item) => `- [ ] ${item}`), ''].join('\n'),
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

export function createJuejinTools(tool) {
  return {
    juejin_prepare_article: tool({
      description: '准备掘金技术文章渠道包：生成 article.juejin.md、metadata.json、发布检查清单和浏览器操作手册，不读取 Cookie/Token，不发布。',
      args: {
        title: tool.schema.string({ description: '掘金文章标题；使用 content_package_dir 时可省略' }).optional(),
        content_package_dir: tool.schema.string({ description: '通用内容管理包目录；提供后输出到 channels/juejin' }).optional(),
        markdown: tool.schema.string({ description: 'Markdown 正文；与 content_package_dir 二选一' }).optional(),
        tags: tool.schema.string({ description: '标签，逗号分隔' }).optional(),
        category: tool.schema.string({ description: '掘金分类，如 AI、后端、前端、工具' }).optional(),
        theme: tool.schema.string({ description: '掘金 Markdown 主题，默认 juejin' }).optional(),
        highlight: tool.schema.string({ description: '代码高亮主题，默认 juejin' }).optional(),
        summary: tool.schema.string({ description: '摘要，可留空自动从正文提取' }).optional(),
        output_dir: tool.schema.string({ description: '输出目录；默认当前项目 .tmp/juejin-article-packages' }).optional(),
      },
      async execute(args, context) {
        try {
          const result = prepareJuejinArticlePackage({
            ...args,
            output_dir: args.output_dir || (args.content_package_dir ? undefined : path.join(context?.directory || process.cwd(), '.tmp', 'juejin-article-packages')),
          });
          return [
            '掘金技术文章渠道包已生成。',
            `- 渠道包：${result.package_dir}`,
            `- 文章正文：${result.article_path}`,
            `- 检查清单：${result.checklist_path}`,
            `- 浏览器操作手册：${result.browser_playbook_path}`,
            `- 分类：${result.metadata.category}`,
            `- 发布门禁：${result.metadata.publish_gate}`,
          ].join('\n');
        } catch (error) {
          return `掘金技术文章渠道包生成失败：${error.message}`;
        }
      },
    }),

    juejin_browser_setup_guide: tool({
      description: '返回掘金发布所需的浏览器自动化配置引导、手动登录说明和发布门禁。不会读取 Cookie/Token。',
      args: {},
      async execute() {
        return getJuejinBrowserAutomationGuide();
      },
    }),

    juejin_draft_playbook: tool({
      description: '返回掘金草稿填写、分类标签检查和发布门禁操作手册。不会读取 Cookie/Token。',
      args: {
        title: tool.schema.string({ description: '掘金文章标题，用于生成操作手册标题' }),
      },
      async execute(args) {
        return buildJuejinBrowserPlaybook({ title: args.title });
      },
    }),
  };
}
