import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { normalizeList, prepareContentPackage, scanSensitiveContent } from '../content/content-tools.js';

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
  checklist.push('草稿导入：导入前必须确认正文为空，导入后验证字数非 0、正文只出现 1 份');
  checklist.push('插图处理：逐张定位、逐张上传、逐张插入、逐张验证，不批量连续插入');
  checklist.push('风控规避：自动化只操作创作后台；公开文章/专栏页由用户手动验收');
  checklist.push('发布前人工确认：标题、首屏三段、标签、敏感信息、外链、版权');
  return checklist;
}

function buildBrowserPlaybook({ title }) {
  return [
    `# 知乎浏览器操作手册：${title}`,
    '',
    '## 原则',
    '',
    '- 不读取 Cookie、Token、密码、浏览器 profile 或 `.env`。',
    '- 不点击发布/更新，除非用户明确回复“确认发布到知乎”或“确认更新知乎文章”。',
    '- 自动化只操作创作后台、内容管理、编辑器和草稿页；不要用自动化打开公开文章或专栏页做验收。',
    '- 公开页由用户手动验收；需要确认公开链接时，只返回链接和检查项，不主动导航公开页。',
    '- 出现 40362、异常请求、验证码、安全验证或账号风险提示时立即停止，并让用户手动处理。',
    '- 不要直接填充正文作为最终方案；直接填充可能页面可见但知乎内部字数仍为 0。',
    '- 正文优先用“导入 → 导入文档”导入无图 Markdown，让知乎内部字数、草稿状态和编辑器状态一致。',
    '',
    '## 草稿导入稳定流程',
    '',
    '1. 打开编辑页后先确认标题、封面和正文区域。',
    '2. 如果正文不是空的，先让用户清空或用编辑器清空；导入前必须确认正文为空。',
    '3. 验证清空状态：正文长度接近 0、正文图片数为 0、字数显示为 0。',
    '4. 点击“导入 → 导入文档”，上传无图 Markdown。',
    '5. 等待导入完成后验证：字数非 0、开头句只出现 1 次、第一节标题只出现 1 次、正文图片数为 0。',
    '6. 如果发现正文重复或字数异常，立即停止，不要继续插图；先恢复到干净正文。',
    '',
    '## 正文插图稳定流程',
    '',
    '- 图 1 放第一节后、第二节前。',
    '- 图 2 放第二节后、第三节前。',
    '- 图 3 放第四节后、第五节前。',
    '- 每张图都先把光标定位到目标小标题前，再点图片按钮上传并插入。',
    '- 每插入一张图后立即验证：图片数递增 1、正文仍只出现 1 份、字数不变、图片前后段落符合预期。',
    '- 不要连续上传多张后一次性插入；知乎弹窗和光标容易复用旧状态，导致图片堆在一起。',
    '- 不要用含图 Markdown/DOCX 导入替代手动插图；知乎可能追加正文或丢图。',
    '',
    '## 推荐验证脚本思路',
    '',
    '- `imgCount`：正文编辑器中的图片数量。',
    '- `startCount`：正文开头句出现次数，应为 1。',
    '- `sectionOneCount`：第一节标题出现次数，应为 1。',
    '- `wordCount`：页面字数，应非 0 且插图前后稳定。',
    '- `imgs[].prev/next`：每张图的前后文本，用于确认图片位置。',
    '',
  ].join('\n');
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
  const browserPlaybookPath = path.join(packageDir, 'browser-playbook.md');

  fs.writeFileSync(articlePath, body.endsWith('\n') ? body : `${body}\n`, 'utf8');
  fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
  fs.writeFileSync(browserPlaybookPath, buildBrowserPlaybook({ title }), 'utf8');
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
    browser_playbook_path: browserPlaybookPath,
    metadata,
  };
}

export function prepareZhihuPublishWorkflow(input = {}) {
  const contentPackage = prepareContentPackage({
    topic: input.topic,
    title: input.title,
    markdown: input.markdown,
    tags: input.tags,
    summary: input.summary,
    target_channels: 'zhihu',
    output_dir: input.output_dir,
  });
  const zhihuPackage = prepareZhihuArticlePackage({
    content_package_dir: contentPackage.package_dir,
    title: input.title,
    tags: input.tags,
    summary: input.summary,
    canonical_url: input.canonical_url,
  });
  return {
    content_package: contentPackage,
    zhihu_package: zhihuPackage,
    publish_gate: zhihuPackage.metadata.publish_gate,
  };
}

export function getZhihuBrowserAutomationGuide() {
  return [
    '知乎渠道发布需要浏览器自动化能力。当前工具不会读取账号、密码、Cookie 或浏览器 Profile。',
    '',
    '插件会自动注册 Playwright MCP 和 Chrome DevTools MCP。若当前会话仍没有浏览器工具，通常只需要重启 OpenCode。需要手动核对时，可确认 opencode.json 中至少存在以下配置之一：',
    '```json',
    '{',
    '  "$schema": "https://opencode.ai/config.json",',
    '  "mcp": {',
    '    "playwright": {',
    '      "type": "local",',
    '      "command": ["npx", "-y", "@playwright/mcp"],',
    '      "enabled": true',
    '    },',
    '    "chrome-devtools": {',
    '      "type": "local",',
    '      "command": ["npx", "-y", "chrome-devtools-mcp"],',
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
    zhihu_prepare_publish: tool({
      description: '一键准备知乎发布流程：从用户文章生成平台无关内容包和 channels/zhihu 渠道包，保留发布确认门禁，不点击发布。适合“把这个文章发布知乎”这类一句话意图。',
      args: {
        title: tool.schema.string({ description: '文章标题' }),
        markdown: tool.schema.string({ description: '文章正文 Markdown' }),
        topic: tool.schema.string({ description: '内容选题或核心问题' }).optional(),
        tags: tool.schema.string({ description: '标签，逗号分隔' }).optional(),
        summary: tool.schema.string({ description: '摘要，可留空自动提取' }).optional(),
        canonical_url: tool.schema.string({ description: '原文或规范链接，可留空' }).optional(),
        output_dir: tool.schema.string({ description: '内容包输出目录；默认当前项目 .tmp/content-packages' }).optional(),
      },
      async execute(args, context) {
        try {
          const result = prepareZhihuPublishWorkflow({
            ...args,
            output_dir: args.output_dir || path.join(context?.directory || process.cwd(), '.tmp', 'content-packages'),
          });
          return [
            '知乎发布准备已完成。',
            `- 内容包：${result.content_package.package_dir}`,
            `- 内容预审：${result.content_package.review_checklist_path}`,
            `- 知乎适配包：${result.zhihu_package.package_dir}`,
            `- 知乎正文：${result.zhihu_package.article_path}`,
            `- 浏览器操作手册：${result.zhihu_package.browser_playbook_path}`,
            `- 发布门禁：${result.publish_gate}`,
            '- 下一步：打开知乎创作页，登录后保存草稿；发布前必须明确确认。',
          ].join('\n');
        } catch (error) {
          return `知乎发布准备失败：${error.message}`;
        }
      },
    }),

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
            output_dir: args.output_dir || (args.content_package_dir ? undefined : path.join(context?.directory || process.cwd(), '.tmp', 'zhihu-article-packages')),
          });
          return [
            '知乎文章内容包已生成。',
            `- 内容包：${result.package_dir}`,
            `- 正文：${result.article_path}`,
            `- 元数据：${result.metadata_path}`,
            `- 检查清单：${result.checklist_path}`,
            `- 浏览器操作手册：${result.browser_playbook_path}`,
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
