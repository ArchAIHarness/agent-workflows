import fs from 'fs';
import path from 'path';

const VIDEO_API_BASE = 'https://ark.cn-beijing.volces.com/api/plan/v3/contents/generations/tasks';

const VIDEO_MODELS = [
  'doubao-seedance-2.0',
  'doubao-seedance-2.0-fast',
  'doubao-seedance-1.5-pro',
  'doubao-seedream-5.0-lite',
];

function findConfigDir(startDir) {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    const configDir = path.join(dir, '.doubao-video');
    if (fs.existsSync(path.join(configDir, '.env'))) return configDir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  const homeDir = path.join(process.env.HOME || process.env.USERPROFILE || '~', '.doubao-video');
  if (fs.existsSync(path.join(homeDir, '.env'))) return homeDir;
  return null;
}

function getOrInitConfigDir(workspaceDir) {
  const existing = findConfigDir(workspaceDir);
  if (existing) return existing;

  const projectDir = workspaceDir || process.cwd();
  const configDir = path.join(projectDir, '.doubao-video');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const envPath = path.join(configDir, '.env');
  if (!fs.existsSync(envPath)) {
    const template = [
      '# Doubao Video API 配置',
      '# 在下方填入你的 API Key（豆包/火山方舟 ARK）',
      '# 获取方式：https://console.volcengine.com/ark',
      'API_KEY=',
      '',
      '# 可用视频/图像生成模型（调用时通过 model 参数指定）：',
      '#   doubao-seedance-2.0',
      '#   doubao-seedance-2.0-fast',
      '#   doubao-seedance-1.5-pro',
      '#   doubao-seedream-5.0-lite',
      '',
    ].join('\n');
    fs.writeFileSync(envPath, template, 'utf8');
  }

  return configDir;
}

function parseEnvFile(filePath) {
  if (!filePath) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const vars = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, '');
    vars[key] = value;
  }
  return vars;
}

function getApiKeyWithInit(workspaceDir) {
  const configDir = getOrInitConfigDir(workspaceDir);
  const envVars = parseEnvFile(path.join(configDir, '.env'));
  const key = envVars.API_KEY || process.env.API_KEY || '';
  return { key, configDir };
}

function missingKeyMessage(configDir) {
  const envPath = path.join(configDir, '.env');
  return [
    '❌ API_KEY 未配置。',
    '',
    `已自动创建配置文件: ${envPath}`,
    '请打开该文件，填入你的 API Key：',
    '',
    `  1. 打开 ${envPath}`,
    '  2. 将 API_KEY= 改为 API_KEY=你的key',
    '  3. 保存后重新执行',
    '',
    '获取 API Key：https://console.volcengine.com/ark',
  ].join('\n');
}

function buildContent({ prompt, imageUrl, lastFrameUrl }) {
  const content = [];
  if (prompt) {
    content.push({ type: 'text', text: String(prompt) });
  }
  if (imageUrl) {
    content.push({ type: 'image_url', role: 'first_frame', image_url: { url: String(imageUrl) } });
  }
  if (lastFrameUrl) {
    content.push({ type: 'image_url', role: 'last_frame', image_url: { url: String(lastFrameUrl) } });
  }
  return content;
}

export async function createVideoTask({ model, prompt, imageUrl, lastFrameUrl, callbackUrl, workspaceDir }) {
  const { key: apiKey, configDir } = getApiKeyWithInit(workspaceDir);
  if (!apiKey) return missingKeyMessage(configDir);

  const modelId = model || 'doubao-seedance-2.0';
  const content = buildContent({ prompt, imageUrl, lastFrameUrl });
  if (content.length === 0) {
    return '❌ 至少需要提供 prompt（文生视频）或 imageUrl（图生视频）之一。';
  }

  const requestBody = { model: modelId, content };
  if (callbackUrl) requestBody.callback_url = String(callbackUrl);

  try {
    const response = await fetch(VIDEO_API_BASE, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const text = await response.text().catch(() => '');
    if (!response.ok) {
      return `❌ 创建视频任务失败 (${response.status}): ${text || response.statusText}`;
    }

    let data;
    try { data = JSON.parse(text); } catch { data = {}; }
    const taskId = data.id || data.task_id || '';
    return [
      '✅ 视频生成任务已创建。',
      `任务ID: ${taskId}`,
      `模型: ${modelId}`,
      '',
      `可用 doubao_video_query 查询任务状态（taskId="${taskId}"）。`,
      '',
      '原始响应:',
      text,
    ].join('\n');
  } catch (err) {
    return `❌ 创建视频任务异常: ${err.message}`;
  }
}

export async function queryVideoTask({ taskId, workspaceDir }) {
  const { key: apiKey, configDir } = getApiKeyWithInit(workspaceDir);
  if (!apiKey) return missingKeyMessage(configDir);
  if (!taskId) return '❌ 缺少 taskId 参数。';

  try {
    const response = await fetch(`${VIDEO_API_BASE}/${encodeURIComponent(taskId)}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    const text = await response.text().catch(() => '');
    if (!response.ok) {
      return `❌ 查询视频任务失败 (${response.status}): ${text || response.statusText}`;
    }

    let data;
    try { data = JSON.parse(text); } catch { data = {}; }
    const status = data.status || 'unknown';
    const videoUrl = (data.content && data.content.video_url) || '';
    const lines = ['✅ 查询成功。', `任务ID: ${taskId}`, `状态: ${status}`];
    if (videoUrl) lines.push(`视频地址: ${videoUrl}`);
    lines.push('', '原始响应:', text);
    return lines.join('\n');
  } catch (err) {
    return `❌ 查询视频任务异常: ${err.message}`;
  }
}

export async function listVideoTasks({ pageNum, pageSize, status, taskIds, model, workspaceDir }) {
  const { key: apiKey, configDir } = getApiKeyWithInit(workspaceDir);
  if (!apiKey) return missingKeyMessage(configDir);

  const params = new URLSearchParams();
  if (pageNum) params.set('page_num', String(pageNum));
  if (pageSize) params.set('page_size', String(pageSize));
  if (status) params.set('filter.status', String(status));
  if (taskIds) params.set('filter.task_ids', String(taskIds));
  if (model) params.set('filter.model', String(model));

  const query = params.toString();
  const url = query ? `${VIDEO_API_BASE}?${query}` : VIDEO_API_BASE;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    const text = await response.text().catch(() => '');
    if (!response.ok) {
      return `❌ 查询任务列表失败 (${response.status}): ${text || response.statusText}`;
    }
    return ['✅ 任务列表查询成功。', '', '原始响应:', text].join('\n');
  } catch (err) {
    return `❌ 查询任务列表异常: ${err.message}`;
  }
}

export async function cancelVideoTask({ taskId, workspaceDir }) {
  const { key: apiKey, configDir } = getApiKeyWithInit(workspaceDir);
  if (!apiKey) return missingKeyMessage(configDir);
  if (!taskId) return '❌ 缺少 taskId 参数。';

  try {
    const response = await fetch(`${VIDEO_API_BASE}/${encodeURIComponent(taskId)}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    const text = await response.text().catch(() => '');
    if (!response.ok) {
      return `❌ 取消/删除视频任务失败 (${response.status}): ${text || response.statusText}`;
    }
    return ['✅ 视频任务已取消/删除。', `任务ID: ${taskId}`, '', '原始响应:', text || '(无响应体)'].join('\n');
  } catch (err) {
    return `❌ 取消/删除视频任务异常: ${err.message}`;
  }
}

export function createDoubaoVideoTools(tool) {
  return {
    doubao_video_create: tool({
      description: `创建豆包视频生成任务（火山方舟 ARK）。支持文生视频和图生视频。可用模型：${VIDEO_MODELS.join('、')}。需要 API_KEY 配置在 .doubao-video/.env 中`,
      args: {
        model: tool.schema.string({ description: `生成模型，默认 doubao-seedance-2.0。可选：${VIDEO_MODELS.join(', ')}` }).optional(),
        prompt: tool.schema.string({ description: '视频描述文本提示词，可包含 --ratio --dur 等参数' }).optional(),
        imageUrl: tool.schema.string({ description: '图生视频的首帧图片 URL（可选）' }).optional(),
        lastFrameUrl: tool.schema.string({ description: '图生视频的尾帧图片 URL（可选）' }).optional(),
        callbackUrl: tool.schema.string({ description: '任务完成回调 URL（可选）' }).optional(),
      },
      async execute(args, context) {
        return await createVideoTask({
          model: args.model,
          prompt: args.prompt,
          imageUrl: args.imageUrl,
          lastFrameUrl: args.lastFrameUrl,
          callbackUrl: args.callbackUrl,
          workspaceDir: context?.directory,
        });
      },
    }),
    doubao_video_query: tool({
      description: '查询豆包视频生成任务状态和结果。需要 API_KEY 配置在 .doubao-video/.env 中',
      args: {
        taskId: tool.schema.string({ description: '视频生成任务 ID' }),
      },
      async execute(args, context) {
        return await queryVideoTask({
          taskId: args.taskId,
          workspaceDir: context?.directory,
        });
      },
    }),
    doubao_video_list: tool({
      description: '查询豆包视频生成任务列表，支持分页和按状态/模型/任务ID过滤。需要 API_KEY 配置在 .doubao-video/.env 中',
      args: {
        pageNum: tool.schema.number({ description: '页码，默认 1' }).optional(),
        pageSize: tool.schema.number({ description: '每页数量，默认 10' }).optional(),
        status: tool.schema.string({ description: '按任务状态过滤，如 queued/running/succeeded/failed/cancelled' }).optional(),
        taskIds: tool.schema.string({ description: '按任务 ID 过滤，多个用逗号分隔' }).optional(),
        model: tool.schema.string({ description: '按模型过滤' }).optional(),
      },
      async execute(args, context) {
        return await listVideoTasks({
          pageNum: args.pageNum,
          pageSize: args.pageSize,
          status: args.status,
          taskIds: args.taskIds,
          model: args.model,
          workspaceDir: context?.directory,
        });
      },
    }),
    doubao_video_cancel: tool({
      description: '取消或删除豆包视频生成任务。需要 API_KEY 配置在 .doubao-video/.env 中',
      args: {
        taskId: tool.schema.string({ description: '视频生成任务 ID' }),
      },
      async execute(args, context) {
        return await cancelVideoTask({
          taskId: args.taskId,
          workspaceDir: context?.directory,
        });
      },
    }),
  };
}
