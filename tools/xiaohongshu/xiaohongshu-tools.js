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
  return plain.slice(0, 120);
}

function safeSlug(title) {
  const digest = crypto.createHash('sha1').update(String(title || Date.now())).digest('hex').slice(0, 8);
  const normalized = String(title || 'xhs-note')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `${normalized || 'xhs-note'}-${digest}`;
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
  const target = outputDir || path.join(process.cwd(), '.tmp', 'xhs-note-packages');
  fs.mkdirSync(target, { recursive: true });
  return target;
}

function buildCards(title, markdown) {
  const lines = stripFrontmatter(markdown)
    .split('\n')
    .map((line) => line.replace(/^#+\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 6);
  const bodyCards = lines.length ? lines : ['提炼核心问题', '拆解关键方法', '给出行动建议'];
  return [
    { index: 1, type: 'cover', title, text: '一句话讲清核心问题', image_role: 'cover' },
    ...bodyCards.slice(0, 7).map((text, index) => ({
      index: index + 2,
      type: 'content',
      title: text.slice(0, 24),
      text: text.slice(0, 80),
      image_role: 'card',
    })),
  ];
}

export function buildXhsBrowserPlaybook({ title }) {
  return [
    `# 小红书浏览器操作手册：${title}`,
    '',
    '## 原则',
    '',
    '- 不读取 Cookie、Token、密码、浏览器 profile 或 `.env`。',
    '- 不点击发布，除非用户明确回复“确认发布到小红书”。',
    '- 只操作小红书创作平台、上传图片、填写标题正文和话题。',
    '- 出现验证码、安全验证、登录异常或审核提示时立即停止。',
    '',
    '## 草稿流程',
    '',
    '1. 打开小红书创作平台。',
    '2. 如未登录，让用户在浏览器页面手动扫码或验证码登录。',
    '3. 按 `cards.json` 的顺序上传封面和正文卡片。',
    '4. 填入 `note.xhs.md` 中的标题、正文和话题。',
    '5. 检查图片数量、顺序、标题、话题和正文是否符合预期。',
    '6. 停在发布前，等待用户明确回复“确认发布到小红书”。',
    '',
  ].join('\n');
}

export function getXhsBrowserAutomationGuide() {
  return [
    '小红书渠道发布需要浏览器自动化能力。当前工具不会读取账号、密码、Cookie 或浏览器 Profile。',
    '',
    '插件会自动注册 Playwright MCP 和 Chrome DevTools MCP。若当前会话没有浏览器工具，请重启 OpenCode。',
    '登录小红书时请在浏览器页面手动扫码或输入验证码，不要把 Cookie 或 Token 提供给 AI。',
    '发布上线前必须明确回复“确认发布到小红书”。',
  ].join('\n');
}

export function prepareXiaohongshuNotePackage(input = {}) {
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

  const body = stripFrontmatter(markdown);
  const tags = normalizeList(input.tags || packageMetadata.tags || []);
  const summary = inferSummary(body, input.summary || packageMetadata.summary || '');
  const sensitiveFindings = scanSensitiveContent(`${title}\n${summary}\n${body}\n${tags.join('\n')}`);
  if (sensitiveFindings.length > 0) {
    throw new Error(`content may contain sensitive information: ${sensitiveFindings.join('；')}`);
  }

  const cards = buildCards(title, body);
  const checklist = [
    title.length <= 20 ? '标题适合小红书首屏' : '标题偏长，建议压缩到 20 字以内',
    cards.length >= 2 ? `卡片规划已生成：${cards.length} 张` : '卡片规划不足，建议至少 1 封面 + 1 内容卡',
    tags.length > 0 ? `话题已准备：${tags.join('、')}` : '话题缺失，建议补充 3-5 个话题',
    '检查图片比例、图片顺序、封面可读性和文字密度',
    '发布前人工确认：标题、正文、话题、图片版权、敏感信息',
  ];

  const outputDir = ensureOutputDir(input.output_dir || (sourceContentPackage ? path.join(sourceContentPackage, 'channels') : undefined));
  const packageDir = sourceContentPackage ? path.join(outputDir, 'xiaohongshu') : path.join(outputDir, safeSlug(title));
  fs.mkdirSync(packageDir, { recursive: true });

  const metadata = {
    type: 'channel-package',
    channel: 'xiaohongshu',
    platform: 'xiaohongshu',
    title,
    summary,
    tags,
    source_content_package: sourceContentPackage || '',
    draft_gate: 'browser-or-manual',
    publish_gate: 'manual-confirmation-required',
    channel_actions: ['prepare-note', 'upload-images-with-browser-automation', 'publish-after-human-confirmation'],
    cards,
    assets: [],
    session: buildSession('xiaohongshu', title),
    generated_at: new Date().toISOString(),
    sensitive_findings: sensitiveFindings,
    checklist,
  };

  const notePath = path.join(packageDir, 'note.xhs.md');
  const cardsPath = path.join(packageDir, 'cards.json');
  const metadataPath = path.join(packageDir, 'metadata.json');
  const checklistPath = path.join(packageDir, 'publish-checklist.md');
  const browserPlaybookPath = path.join(packageDir, 'browser-playbook.md');
  const note = [`# ${title}`, '', summary, '', ...tags.map((tag) => `#${tag.replace(/^#/, '')}`), ''].join('\n');

  fs.writeFileSync(notePath, note, 'utf8');
  fs.writeFileSync(cardsPath, `${JSON.stringify(cards, null, 2)}\n`, 'utf8');
  fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
  fs.writeFileSync(browserPlaybookPath, buildXhsBrowserPlaybook({ title }), 'utf8');
  fs.writeFileSync(
    checklistPath,
    [`# 小红书发布检查：${title}`, '', ...checklist.map((item) => `- [ ] ${item}`), ''].join('\n'),
    'utf8',
  );

  return {
    package_dir: packageDir,
    note_path: notePath,
    cards_path: cardsPath,
    metadata_path: metadataPath,
    checklist_path: checklistPath,
    browser_playbook_path: browserPlaybookPath,
    metadata,
  };
}

export function createXiaohongshuTools(tool) {
  return {
    xhs_prepare_note: tool({
      description: '准备小红书图文笔记渠道包：生成 note.xhs.md、cards.json、metadata.json、发布检查清单和浏览器操作手册，不读取 Cookie/Token，不发布。',
      args: {
        title: tool.schema.string({ description: '小红书笔记标题；使用 content_package_dir 时可省略' }).optional(),
        content_package_dir: tool.schema.string({ description: '通用内容管理包目录；提供后输出到 channels/xiaohongshu' }).optional(),
        markdown: tool.schema.string({ description: 'Markdown 正文；与 content_package_dir 二选一' }).optional(),
        tags: tool.schema.string({ description: '话题/标签，逗号分隔' }).optional(),
        summary: tool.schema.string({ description: '摘要，可留空自动从正文提取' }).optional(),
        output_dir: tool.schema.string({ description: '输出目录；默认当前项目 .tmp/xhs-note-packages' }).optional(),
      },
      async execute(args, context) {
        try {
          const result = prepareXiaohongshuNotePackage({
            ...args,
            output_dir: args.output_dir || (args.content_package_dir ? undefined : path.join(context?.directory || process.cwd(), '.tmp', 'xhs-note-packages')),
          });
          return [
            '小红书图文笔记渠道包已生成。',
            `- 渠道包：${result.package_dir}`,
            `- 笔记正文：${result.note_path}`,
            `- 卡片规划：${result.cards_path}`,
            `- 检查清单：${result.checklist_path}`,
            `- 浏览器操作手册：${result.browser_playbook_path}`,
            `- 发布门禁：${result.metadata.publish_gate}`,
          ].join('\n');
        } catch (error) {
          return `小红书图文笔记渠道包生成失败：${error.message}`;
        }
      },
    }),

    xhs_browser_setup_guide: tool({
      description: '返回小红书发布所需的浏览器自动化配置引导、手动登录说明和发布门禁。不会读取 Cookie/Token。',
      args: {},
      async execute() {
        return getXhsBrowserAutomationGuide();
      },
    }),

    xhs_draft_playbook: tool({
      description: '返回小红书草稿上传图片、填写标题正文话题和发布门禁操作手册。不会读取 Cookie/Token。',
      args: {
        title: tool.schema.string({ description: '小红书笔记标题，用于生成操作手册标题' }),
      },
      async execute(args) {
        return buildXhsBrowserPlaybook({ title: args.title });
      },
    }),
  };
}
