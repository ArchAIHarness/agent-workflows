import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { normalizeList, scanSensitiveContent } from '../content/content-tools.js';

const MAX_SOURCE_FILE_BYTES = 2 * 1024 * 1024;
const DEFAULT_FORBIDDEN_PATTERNS = [
  { code: 'authorization-header', pattern: /authorization\s*[:=]/i },
  { code: 'bearer-token', pattern: /bearer\s+[a-z0-9._\-]+/i },
  { code: 'cookie', pattern: /cookie\s*[:=]/i },
  { code: 'token', pattern: /token\s*[:=]/i },
  { code: 'secret', pattern: /secret\s*[:=]/i },
  { code: 'password', pattern: /password\s*[:=]/i },
  { code: 'private-key', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { code: 'ip-address', pattern: /(?:\d{1,3}\.){3}\d{1,3}/ },
];
const FORBIDDEN_SOURCE_PATH_PATTERN = /(^|[/.\\_-])(\.env|cookie|token|secret|password|passwd|credential|credentials|profile|config\.(ya?ml|json))(?:$|[/.\\_-])/i;

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.map(String).map((item) => item.trim()).filter(Boolean);
  if (!tags) return [];
  return String(tags)
    .split(/[，,;；\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function stripFrontmatter(markdown) {
  return String(markdown || '').replace(/^---\n[\s\S]*?\n---\n/, '').trim();
}

function compactMarkdownForZhihu(markdown) {
  return stripFrontmatter(markdown)
    .replace(/\r\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
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
  return plain.slice(0, 180);
}

function scanSensitive(content) {
  const findings = [];
  const lines = String(content || '').split('\n');
  for (const { code, pattern } of DEFAULT_FORBIDDEN_PATTERNS) {
    const lineIndex = lines.findIndex((line) => pattern.test(line));
    if (lineIndex >= 0) {
      findings.push(`疑似 ${code}，位置：第 ${lineIndex + 1} 行，请脱敏后重试`);
    }
  }
  return findings;
}

function assertSafeSourceFile(sourceFile) {
  const sourcePath = path.resolve(String(sourceFile));
  const sourceExt = path.extname(sourcePath).toLowerCase();
  if (!['.md', '.markdown'].includes(sourceExt)) {
    throw new Error('source_file only supports .md or .markdown files');
  }
  if (FORBIDDEN_SOURCE_PATH_PATTERN.test(sourcePath)) {
    throw new Error('source_file path looks sensitive; provide sanitized markdown content instead');
  }

  const linkStat = fs.lstatSync(sourcePath);
  if (linkStat.isSymbolicLink()) {
    throw new Error('source_file must not be a symbolic link');
  }

  const realPath = fs.realpathSync(sourcePath);
  const realExt = path.extname(realPath).toLowerCase();
  if (!['.md', '.markdown'].includes(realExt)) {
    throw new Error('source_file only supports .md or .markdown files');
  }
  if (FORBIDDEN_SOURCE_PATH_PATTERN.test(realPath)) {
    throw new Error('source_file path looks sensitive; provide sanitized markdown content instead');
  }

  const stat = fs.statSync(realPath);
  if (!stat.isFile()) throw new Error('source_file must be a regular file');
  if (stat.size > MAX_SOURCE_FILE_BYTES) throw new Error('source_file is too large; limit is 2MB');
  return realPath;
}

function buildChecklist({ title, body, tags, summary, canonicalUrl }) {
  const checklist = [];
  checklist.push(title.length >= 8 ? '标题长度正常' : '标题偏短，建议补充具体对象或收益');
  checklist.push(summary ? '摘要已生成' : '摘要缺失，建议补充 80-180 字摘要');
  checklist.push(tags.length > 0 ? `标签已准备：${tags.join('、')}` : '标签缺失，建议补充 2-5 个知乎话题');
  checklist.push(body.includes('```') ? '包含代码块，发布后需人工检查格式' : '未检测到代码块');
  checklist.push(canonicalUrl ? '包含原文/规范链接，发布前确认外链策略' : '未设置原文链接');
  checklist.push('发布前人工确认：标题、首屏三段、标签、敏感信息、外链、版权');
  return checklist;
}

function ensureOutputDir(outputDir) {
  const target = outputDir || path.join(process.cwd(), '.tmp', 'zhihu-article-packages');
  fs.mkdirSync(target, { recursive: true });
  return target;
}

function loadContentPackage(contentPackageDir) {
  const packageDir = path.resolve(String(contentPackageDir));
  const metadataPath = path.join(packageDir, 'metadata.json');
  const contentPath = path.join(packageDir, 'content.md');
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  const markdown = fs.readFileSync(contentPath, 'utf8');
  return { packageDir, metadata, markdown };
}

function safeSlug(title) {
  const digest = crypto.createHash('sha1').update(String(title || Date.now())).digest('hex').slice(0, 8);
  const normalized = String(title || 'article')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `${normalized || 'article'}-${digest}`;
}

export function prepareZhihuArticlePackage(input = {}) {
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

  if (input.source_file) {
    const sourcePath = assertSafeSourceFile(input.source_file);
    markdown = fs.readFileSync(sourcePath, 'utf8');
  }
  if (!String(markdown).trim()) throw new Error('markdown, source_file, or content_package_dir is required');

  const body = compactMarkdownForZhihu(markdown);
  const tags = normalizeList(input.tags || packageMetadata.tags || []);
  const summary = inferSummary(body, input.summary || packageMetadata.summary || '');
  const canonicalUrl = input.canonical_url ? String(input.canonical_url).trim() : '';
  const sensitiveFindings = scanSensitiveContent(`${title}\n${summary}\n${body}\n${canonicalUrl}\n${tags.join('\n')}`);
  if (sensitiveFindings.length > 0) {
    throw new Error(`content may contain sensitive information: ${sensitiveFindings.join('；')}`);
  }
  const checklist = buildChecklist({ title, body, tags, summary, canonicalUrl });

  const outputDir = ensureOutputDir(input.output_dir || (sourceContentPackage ? path.join(sourceContentPackage, 'channels') : undefined));
  const packageDir = sourceContentPackage ? path.join(outputDir, 'zhihu') : path.join(outputDir, safeSlug(title));
  fs.mkdirSync(packageDir, { recursive: true });

  const metadata = {
    type: 'channel-package',
    channel: 'zhihu',
    platform: 'zhihu',
    title,
    summary,
    tags,
    canonical_url: canonicalUrl,
    source_content_package: sourceContentPackage || '',
    channel_actions: ['fetch-channel-content', 'save-draft-with-browser-automation', 'publish-after-human-confirmation'],
    generated_at: new Date().toISOString(),
    publish_gate: 'manual-confirmation-required',
    sensitive_findings: sensitiveFindings,
    checklist,
  };

  const articlePath = path.join(packageDir, 'article.zhihu.md');
  const metadataPath = path.join(packageDir, 'metadata.json');
  const checklistPath = path.join(packageDir, 'publish-checklist.md');

  fs.writeFileSync(articlePath, body.endsWith('\n') ? body : `${body}\n`, 'utf8');
  fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
  fs.writeFileSync(
    checklistPath,
    [
      `# 知乎发布检查：${title}`,
      '',
      `- 标题：${title}`,
      `- 摘要：${summary || '待补充'}`,
      `- 标签：${tags.length ? tags.join('、') : '待补充'}`,
      `- 原文链接：${canonicalUrl || '无'}`,
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
    metadata,
  };
}

export function getZhihuBrowserAutomationGuide() {
  return [
    '知乎渠道发布需要浏览器自动化能力。当前工具不会读取账号、密码、Cookie 或浏览器 Profile。',
    '',
    '插件会自动注册 Playwright MCP。若当前会话仍没有浏览器工具，通常只需要重启 OpenCode。需要手动核对时，可确认 opencode.json 中存在以下配置：',
    '```json',
    '{',
    '  "$schema": "https://opencode.ai/config.json",',
    '  "mcp": {',
    '    "playwright": {',
    '      "type": "local",',
    '      "command": ["npx", "-y", "@playwright/mcp"],',
    '      "enabled": true',
    '    }',
    '  }',
    '}',
    '```',
    '',
    '配置后请重启 OpenCode。重启后让 AI 打开 https://www.zhihu.com/creator，你在浏览器页面手动登录知乎。',
    '登录完成后，AI 可辅助保存草稿；发布上线仍必须等待你明确回复“确认发布到知乎”。',
  ].join('\n');
}

export function createZhihuTools(tool) {
  return {
    zhihu_browser_setup_guide: tool({
      description: '返回知乎渠道发布所需的浏览器自动化配置引导，包括 Playwright MCP 示例、重启提醒、手动登录和发布门禁。不会读取 Cookie/Token。',
      args: {},
      async execute() {
        return getZhihuBrowserAutomationGuide();
      },
    }),

    zhihu_prepare_article: tool({
      description: '准备知乎文章内容包：从标题、Markdown、标签生成 article.zhihu.md、metadata.json 和发布检查清单。不会读取 Cookie/Token，也不会发布文章。',
      args: {
        title: tool.schema.string({ description: '知乎文章标题；使用 content_package_dir 时可省略' }).optional(),
        content_package_dir: tool.schema.string({ description: '通用内容管理包目录；提供后输出到 channels/zhihu' }).optional(),
        markdown: tool.schema.string({ description: 'Markdown 正文；与 source_file/content_package_dir 三选一' }).optional(),
        source_file: tool.schema.string({ description: '本地 Markdown 文件路径；与 markdown/content_package_dir 三选一' }).optional(),
        tags: tool.schema.string({ description: '知乎话题/标签，逗号分隔' }).optional(),
        summary: tool.schema.string({ description: '摘要，可留空自动从正文提取' }).optional(),
        canonical_url: tool.schema.string({ description: '原文或规范链接，可留空' }).optional(),
        output_dir: tool.schema.string({ description: '输出目录；默认当前项目 .tmp/zhihu-article-packages' }).optional(),
      },
      async execute(args, context) {
        try {
          const result = prepareZhihuArticlePackage({
            ...args,
            output_dir: args.output_dir || path.join(context?.directory || process.cwd(), '.tmp', 'zhihu-article-packages'),
          });
          return [
            '知乎文章内容包已生成。',
            `- 内容包：${result.package_dir}`,
            `- 正文：${result.article_path}`,
            `- 元数据：${result.metadata_path}`,
            `- 检查清单：${result.checklist_path}`,
            `- 发布门禁：${result.metadata.publish_gate}`,
            result.metadata.sensitive_findings.length
              ? `- 风险提示：${result.metadata.sensitive_findings.join('；')}`
              : '- 风险提示：未发现明显敏感片段',
          ].join('\n');
        } catch (error) {
          return `知乎文章内容包生成失败：${error.message}`;
        }
      },
    }),
  };
}
