import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const FORBIDDEN_PATTERNS = [
  { code: 'authorization-header', pattern: /authorization\s*[:=]/i },
  { code: 'bearer-token', pattern: /bearer\s+[a-z0-9._\-]+/i },
  { code: 'cookie', pattern: /cookie\s*[:=]/i },
  { code: 'token', pattern: /token\s*[:=]/i },
  { code: 'secret', pattern: /secret\s*[:=]/i },
  { code: 'password', pattern: /password\s*[:=]/i },
  { code: 'jwt', pattern: /eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/ },
  { code: 'access-key-id', pattern: /(?:AKIA|ASIA)[0-9A-Z]{16}/ },
  { code: 'secret-access-key', pattern: /(?:secret_access_key|accessKeySecret|access_key_secret|secretKey|secret_key)\s*[:=]/i },
  { code: 'access-key-id-field', pattern: /(?:access_key_id|accessKeyId|ak)\s*[:=]/i },
  { code: 'secret-key-field', pattern: /(?:^|[\s{,;"'`])sk\s*[:=]\s*["']?[A-Za-z0-9/+_.=-]{6,}/i },
  { code: 'private-key', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { code: 'ip-address', pattern: /(?:\d{1,3}\.){3}\d{1,3}/ },
];

export function normalizeList(value) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(/[，,;；\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function scanSensitiveContent(content) {
  const findings = [];
  const lines = String(content || '').split('\n');
  for (const { code, pattern } of FORBIDDEN_PATTERNS) {
    const lineIndex = lines.findIndex((line) => pattern.test(line));
    if (lineIndex >= 0) findings.push(`疑似 ${code}，位置：第 ${lineIndex + 1} 行，请脱敏后重试`);
  }
  return findings;
}

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
  return plain.slice(0, 180);
}

function safeSlug(value) {
  const digest = crypto.createHash('sha1').update(String(value || Date.now())).digest('hex').slice(0, 8);
  const normalized = String(value || 'content')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `${normalized || 'content'}-${digest}`;
}

function buildReviewChecklist({ topic, title, markdown, targetChannels }) {
  return [
    topic ? '选题已明确' : '选题缺失，需补充目标读者与核心问题',
    title.length >= 8 ? '标题长度正常' : '标题偏短，建议补充对象/场景/收益',
    markdown.length >= 80 ? '正文长度初步可用' : '正文偏短，建议补充论证或案例',
    targetChannels.length > 0 ? `目标渠道：${targetChannels.join('、')}` : '目标渠道未指定，可后续选择',
    '内容预审：检查事实、敏感信息、版权、外链、夸大表达和平台合规',
  ];
}

export function prepareContentPackage(input = {}) {
  const topic = String(input.topic || '').trim();
  const title = String(input.title || topic || '').trim();
  if (!title) throw new Error('title or topic is required');

  const markdown = stripFrontmatter(input.markdown || '');
  if (!markdown) throw new Error('markdown is required');

  const tags = normalizeList(input.tags);
  const targetChannels = normalizeList(input.target_channels);
  const summary = inferSummary(markdown, input.summary);
  const sensitiveFindings = scanSensitiveContent(`${topic}\n${title}\n${summary}\n${markdown}\n${tags.join('\n')}\n${targetChannels.join('\n')}`);
  if (sensitiveFindings.length > 0) {
    throw new Error(`content may contain sensitive information: ${sensitiveFindings.join('；')}`);
  }

  const outputDir = input.output_dir || path.join(process.cwd(), '.tmp', 'content-packages');
  fs.mkdirSync(outputDir, { recursive: true });
  const packageDir = path.join(outputDir, safeSlug(title));
  const channelsDir = path.join(packageDir, 'channels');
  fs.mkdirSync(channelsDir, { recursive: true });

  const checklist = buildReviewChecklist({ topic, title, markdown, targetChannels });
  const metadata = {
    type: 'content-package',
    topic,
    title,
    summary,
    tags,
    status: 'draft',
    review_gate: 'required',
    target_channels: targetChannels,
    generated_at: new Date().toISOString(),
    channels: {},
    checklist,
  };

  const contentPath = path.join(packageDir, 'content.md');
  const metadataPath = path.join(packageDir, 'metadata.json');
  const reviewChecklistPath = path.join(packageDir, 'review-checklist.md');

  fs.writeFileSync(contentPath, markdown.endsWith('\n') ? markdown : `${markdown}\n`, 'utf8');
  fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
  fs.writeFileSync(
    reviewChecklistPath,
    [
      `# 内容预审：${title}`,
      '',
      `- 选题：${topic || '待补充'}`,
      `- 摘要：${summary || '待补充'}`,
      `- 标签：${tags.length ? tags.join('、') : '待补充'}`,
      `- 目标渠道：${targetChannels.length ? targetChannels.join('、') : '待选择'}`,
      '',
      '## 检查项',
      ...checklist.map((item) => `- [ ] ${item}`),
      '',
    ].join('\n'),
    'utf8',
  );

  return {
    package_dir: packageDir,
    content_path: contentPath,
    metadata_path: metadataPath,
    review_checklist_path: reviewChecklistPath,
    channels_dir: channelsDir,
    metadata,
  };
}

export function createContentTools(tool) {
  return {
    content_prepare_package: tool({
      description: '准备平台无关的内容管理包：覆盖内容选题、内容生成结果、内容预审清单和目标渠道，不执行任何渠道发布。',
      args: {
        topic: tool.schema.string({ description: '内容选题或核心问题' }).optional(),
        title: tool.schema.string({ description: '内容标题；可留空使用 topic' }).optional(),
        markdown: tool.schema.string({ description: '正文 Markdown' }),
        tags: tool.schema.string({ description: '标签，逗号分隔' }).optional(),
        summary: tool.schema.string({ description: '摘要，可留空自动提取' }).optional(),
        target_channels: tool.schema.string({ description: '目标渠道，如 zhihu,xiaohongshu' }).optional(),
        output_dir: tool.schema.string({ description: '输出目录；默认当前项目 .tmp/content-packages' }).optional(),
      },
      async execute(args, context) {
        try {
          const result = prepareContentPackage({
            ...args,
            output_dir: args.output_dir || path.join(context?.directory || process.cwd(), '.tmp', 'content-packages'),
          });
          return [
            '内容管理包已生成。',
            `- 内容包：${result.package_dir}`,
            `- 正文：${result.content_path}`,
            `- 元数据：${result.metadata_path}`,
            `- 预审清单：${result.review_checklist_path}`,
            `- 目标渠道：${result.metadata.target_channels.join('、') || '待选择'}`,
            `- 内容预审：${result.metadata.review_gate}`,
          ].join('\n');
        } catch (error) {
          return `内容管理包生成失败：${error.message}`;
        }
      },
    }),
  };
}
