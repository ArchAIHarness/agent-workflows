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
  const imageCount = (body.match(/!\[.*?\]\(.*?\)/g) || []).length;
  return [
    title.length >= 8 ? '标题长度正常' : '标题偏短，建议补充具体技术对象或收益',
    summary ? '摘要已生成，发布前可填入 CSDN 摘要/描述区域' : '摘要缺失，建议补充 80-160 字摘要',
    tags.length > 0 ? `标签已准备：${tags.join('、')}` : '标签缺失，建议补充 2-5 个技术标签',
    category ? `分类已设置：${category}` : '分类缺失，建议选择 CSDN 技术分类',
    articleType === 'original' ? '文章类型：原创，发布前确认原创声明' : `文章类型：${articleType}，发布前确认转载/翻译来源`,
    fenceCount % 2 === 0 ? '代码块围栏数量正常' : '代码块围栏数量为奇数，发布前必须修复 Markdown 代码块',
    imageCount > 0
      ? `包含 ${imageCount} 张图片，使用占位符替换法逐张上传并验证`
      : '未检测到 Markdown 图片',
    /https?:\/\//.test(body) ? '包含外链，发布前检查链接可访问性与平台策略' : '未检测到外链',
    '发布前人工确认：标题、摘要、分类、标签、原创声明、代码块、图片、外链和敏感信息',
  ];
}

/**
 * 从 Markdown 正文中提取所有图片，返回图片列表
 * 每张图片包含：index、alt、src、raw、position
 */
export function extractContentImages(markdown) {
  const body = stripFrontmatter(markdown);
  const images = [];
  const regex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  let idx = 0;
  while ((match = regex.exec(body)) !== null) {
    const src = match[2].trim();
    // 跳过已经是远程 http/https 的图片（不需要上传）
    if (/^https?:\/\//.test(src)) continue;
    images.push({
      index: idx,
      alt: match[1].trim(),
      src,
      raw: match[0],
      position: match.index,
      placeholder: `@@@IMG_${idx}@@@`,
    });
    idx += 1;
  }
  return images;
}

/**
 * 生成带占位符的 Markdown 版本
 * 把本地图片替换成 @@@IMG_0@@@ 占位符，便于后续逐张上传替换
 * 返回：{ placeholderMarkdown, images }
 */
export function buildPlaceholderMarkdown(markdown) {
  const images = extractContentImages(markdown);
  let body = stripFrontmatter(markdown);
  for (const img of images) {
    body = body.replace(img.raw, img.placeholder);
  }
  return { placeholderMarkdown: body, images };
}

/**
 * CSDN 编辑器安全操作边界
 * 明确哪些操作是安全的、哪些是禁止的
 */
export const CSDN_SAFE_OPS = {
  safeMethods: [
    '通过「更多操作 → 导入」导入 Markdown 文件填充正文',
    '使用 execCommand(\'selectAll\') + execCommand(\'insertText\') 全量替换正文',
    '使用 execCommand(\'insertText\') 在光标位置插入文本',
    '点击工具栏按钮打开对话框（图片、链接、更多插入等）',
    '通过 file chooser API 上传文件（封面图、正文图片）',
    '使用 value + dispatchEvent 设置标题、摘要等输入框内容',
  ],
  forbiddenMethods: [
    '直接修改编辑器 innerHTML / innerText（会破坏编辑器内部状态）',
    '使用 fill() 方法填充编辑器（会清空整个内容）',
    '直接操作编辑器 DOM 节点（删除、插入节点）',
    '用 createTextNode + appendChild 设置内容（格式会丢失）',
    '绕过登录态、验证码、安全验证的任何操作',
  ],
  fallbackSelectors: {
    titleInput: [
      'input[placeholder*="标题"]',
      'input[placeholder*="title" i]',
      '#txtTitle',
      '.article-title input',
    ],
    imageToolbarButton: [
      '更多插入按钮左侧第二个工具栏按钮',
      'button[aria-label*="图片" i]',
      'button[title*="图片" i]',
      '.navigation-bar__button:nth-child(10)',
    ],
    tagInput: [
      'input[placeholder*="请输入文字搜索"]',
      'input[placeholder*="标签"]',
      '.tag-dialog input',
    ],
    summaryInput: [
      'textarea[aria-label*="摘要" i]',
      'textarea[placeholder*="摘要"]',
      '#txtSammary',
    ],
  },
};

/**
 * 生成图片上传的详细操作手册（占位符替换法）
 * 参考开源方案 md-publisher 的实现思路
 */
export function buildImageUploadPlaybook({ images }) {
  if (!images || images.length === 0) return '';
  const lines = [
    '## 正文图片上传：占位符替换法',
    '',
    '### 原理',
    '',
    '先把所有本地图片替换成 `@@@IMG_0@@@`、`@@@IMG_1@@@` 这样的占位符，再逐张选中占位符 → 上传图片 → 图片自动替换占位符到正确位置。',
    '',
    '**优势**：图片直接落到正确位置，不需要事后移动；每次只处理一张，不会互相覆盖。',
    '',
    '### 前置条件',
    '',
    '- 正文已导入/填入，且使用占位符版本（@@@IMG_N@@@）',
    '- 编辑器已获得焦点',
    `- 共 ${images.length} 张图片待上传`,
    '',
    '### 逐张上传步骤（每张图片都执行）',
    '',
    '1. **定位占位符**：在编辑器中找到当前要替换的 @@@IMG_N@@@ 占位符',
    '2. **选中占位符**：用 TreeWalker 或文本查找选中占位符文字（确保只有占位符被选中）',
    '3. **打开图片上传对话框**：点击工具栏图片按钮（「更多插入」左侧第二个按钮）',
    '4. **选择图片文件**：点击对话框中的 file input，选择对应本地图片文件',
    '5. **等待上传完成**：上传成功后占位符会被图片替换',
    '6. **验证**：',
    '   - 占位符 @@@IMG_N@@@ 已消失',
    '   - 编辑器中图片数量比上传前多 1',
    '   - 没有「外链图片转存失败」或「正在上传」字样',
    '7. 下一张',
    '',
    '### 验证清单（全部通过才算完成）',
    '',
    `- [ ] 所有 ${images.length} 张占位符都已被替换`,
    '- [ ] 正文中没有残留的 @@@IMG_ 字样',
    '- [ ] 正文中没有「外链图片转存失败」提示',
    '- [ ] 预览模式下所有图片正常显示',
    '',
    '### 异常处理',
    '',
    '- **上传后占位符还在**：等待 3 秒再检查；如果还在，重新选中占位符再传一次',
    '- **图片数量没增加**：检查是否选中了占位符（必须选中才会替换）',
    '- **对话框打不开**：先点击编辑器空白处获得焦点，再点工具栏图片按钮',
    '- **上传失败/超时**：检查图片大小（CSDN 单张最大 5MB），重试一次',
    '',
    '### 图片映射表',
    '',
    '| 占位符 | 文件路径 | alt 文本 |',
    '|--------|----------|----------|',
  ];
  for (const img of images) {
    lines.push(`| ${img.placeholder} | ${img.src} | ${img.alt || '(无)'} |`);
  }
  lines.push('');
  return lines.join('\n');
}

export function buildCsdnBrowserPlaybook({ title, images = [] }) {
  const hasImages = images.length > 0;
  const lines = [
    `# CSDN 浏览器操作手册：${title}`,
    '',
    '## 原则',
    '',
    '- 不读取 Cookie、Token、密码、浏览器 profile 或 `.env`。',
    '- 不点击发布或更新，除非用户明确回复“确认发布到 CSDN”或“确认更新 CSDN 文章”。',
    '- 不执行评论、私信、关注、批量运营、引流等动作。',
    '- 出现验证码、安全验证、登录异常、审核提示或账号风险提示时立即停止。',
    '',
    '## 安全操作边界',
    '',
    '### ✅ 安全操作',
    '',
    '- 通过「更多操作 → 导入」导入 Markdown 文件填充正文',
    '- 使用 `execCommand(\'selectAll\') + execCommand(\'insertText\')` 全量替换正文',
    '- 使用 `execCommand(\'insertText\')` 在光标位置插入文本',
    '- 点击工具栏按钮打开对话框（图片、链接、更多插入等）',
    '- 通过 file chooser API 上传文件（封面图、正文图片）',
    '- 使用 `value + dispatchEvent` 设置标题、摘要等输入框内容',
    '',
    '### ❌ 禁止操作',
    '',
    '- 直接修改编辑器 innerHTML / innerText（会破坏编辑器内部状态）',
    '- 使用 fill() 方法填充编辑器（会清空整个内容）',
    '- 直接操作编辑器 DOM 节点（删除、插入节点）',
    '- 用 createTextNode + appendChild 设置内容（格式会丢失）',
    '- 绕过登录态、验证码、安全验证的任何操作',
    '',
    '## 草稿流程',
    '',
    '### 第一阶段：基础内容填充',
    '',
    '1. 打开 CSDN 创作中心或 Markdown 编辑器。',
    '2. 如未登录，让用户在浏览器页面手动登录。',
    '3. 选择 Markdown 编辑器或确认当前编辑器支持 Markdown。',
    '4. **推荐方式**：点击「更多操作 → 导入」选择 `article.csdn.md` 导入内容。',
    '5. 修正标题：导入后标题会变成文件名，需手动设置正确标题。',
    '   - 设置方式：`titleInput.value = 标题` + dispatchEvent 触发 input/change 事件',
    '   - 降级选择器：`input[placeholder*="标题"]` → `#txtTitle` → `.article-title input`',
    '6. 填写或核对分类、标签和原创/转载/翻译声明。',
    '',
    '### 第二阶段：图片上传（有图片时执行）',
    '',
    hasImages
      ? `使用**占位符替换法**逐张上传 ${images.length} 张正文配图。`
      : '本文无正文配图，跳过图片上传阶段。',
    '',
    hasImages
      ? '详见「正文图片上传：占位符替换法」章节。'
      : '',
    '',
    '### 第三阶段：元信息完善',
    '',
    '1. 填写摘要（80-160 字，不含敏感信息）。',
    '2. 设置分类和标签（2-5 个技术标签）。',
    '3. 确认原创/转载/翻译声明。',
    '4. 上传封面图（如有）。',
    '',
    '### 第四阶段：验收与发布前检查',
    '',
    '1. 切换到预览模式检查：',
    '   - 代码块闭合且高亮正常',
    '   - 所有图片正常显示（无「外链图片转存失败」）',
    '   - 外链可访问',
    '   - 目录结构正确',
    '   - 标题与正文首屏一致',
    '2. 保存草稿。',
    '3. 停在发布前，等待用户明确回复“确认发布到 CSDN”。',
    '',
    '## 降级选择器参考',
    '',
    'CSDN UI 可能变化，每个操作建议准备 2-3 个选择器，第一个失败就试下一个。',
    '',
    '| 操作 | 首选选择器 | 降级选择器 | 备选 |',
    '|------|-----------|-----------|------|',
    '| 标题输入框 | `input[placeholder*="标题"]` | `#txtTitle` | `.article-title input` |',
    '| 工具栏图片按钮 | 「更多插入」左侧第二个按钮 | `button[aria-label*="图片"]` | `button[title*="图片"]` |',
    '| 标签输入框 | `input[placeholder*="请输入文字搜索"]` | `input[placeholder*="标签"]` | `.tag-dialog input` |',
    '| 摘要输入框 | `textarea[aria-label*="摘要"]` | `textarea[placeholder*="摘要"]` | `#txtSammary` |',
    '| 保存草稿按钮 | `button:has-text("保存草稿")` | `.button-save` | `button[aria-label*="保存"]` |',
    '| 发布文章按钮 | `button:has-text("发布文章")` | `.publish-btn` | `button[aria-label*="发布"]` |',
    '',
    '## 验收重点',
    '',
    '- 标题与正文首屏一致。',
    '- 摘要没有敏感信息和夸大表达。',
    '- 分类和标签符合文章主题。',
    '- 原创声明选择正确。',
    '- 代码块闭合且高亮正常。',
    `- 图片显示正常（${images.length} 张全部渲染，无转存失败提示）。`,
    '- 外链可访问。',
    '',
  ];
  if (hasImages) {
    lines.push('', buildImageUploadPlaybook({ images }));
  }
  return lines.join('\n');
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

  // 提取图片并生成占位符版
  const contentImages = extractContentImages(markdown);
  const { placeholderMarkdown } = buildPlaceholderMarkdown(markdown);

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
  const manualSteps = contentImages.length > 0
    ? [
        'open-csdn-creator',
        'manual-login-if-needed',
        'select-markdown-editor',
        'import-placeholder-markdown',
        'fix-title-after-import',
        'upload-images-via-placeholder-replacement',
        'fill-summary-category-tags',
        'confirm-originality-declaration',
        'preview-article',
        'save-draft',
        'stop-before-publish',
      ]
    : [
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
    content_images: contentImages.map((img) => ({
      index: img.index,
      alt: img.alt,
      src: img.src,
      placeholder: img.placeholder,
    })),
    image_count: contentImages.length,
    session: buildSession('csdn', title),
    generated_at: new Date().toISOString(),
    sensitive_findings: sensitiveFindings,
    checklist,
  };

  const articlePath = path.join(packageDir, 'article.csdn.md');
  const placeholderPath = path.join(packageDir, 'article.placeholder.md');
  const imagesMapPath = path.join(packageDir, 'images.map.json');
  const metadataPath = path.join(packageDir, 'metadata.json');
  const checklistPath = path.join(packageDir, 'publish-checklist.md');
  const browserPlaybookPath = path.join(packageDir, 'browser-playbook.md');

  fs.writeFileSync(articlePath, body.endsWith('\n') ? body : `${body}\n`, 'utf8');
  if (contentImages.length > 0) {
    fs.writeFileSync(
      placeholderPath,
      placeholderMarkdown.endsWith('\n') ? placeholderMarkdown : `${placeholderMarkdown}\n`,
      'utf8',
    );
    fs.writeFileSync(
      imagesMapPath,
      `${JSON.stringify(
        {
          count: contentImages.length,
          images: contentImages.map((img) => ({
            index: img.index,
            alt: img.alt,
            src: img.src,
            placeholder: img.placeholder,
            raw: img.raw,
          })),
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
  }
  fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
  fs.writeFileSync(browserPlaybookPath, buildCsdnBrowserPlaybook({ title, images: contentImages }), 'utf8');
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
      `- 图片数量：${contentImages.length} 张`,
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
    placeholder_path: contentImages.length > 0 ? placeholderPath : '',
    images_map_path: contentImages.length > 0 ? imagesMapPath : '',
    metadata_path: metadataPath,
    checklist_path: checklistPath,
    browser_playbook_path: browserPlaybookPath,
    image_count: contentImages.length,
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
