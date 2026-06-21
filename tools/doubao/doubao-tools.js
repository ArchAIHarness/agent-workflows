import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function findConfigDir(startDir) {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    const configDir = path.join(dir, '.doubao-speech');
    if (fs.existsSync(path.join(configDir, '.env'))) return configDir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  const homeDir = path.join(process.env.HOME || process.env.USERPROFILE || '~', '.doubao-speech');
  if (fs.existsSync(path.join(homeDir, '.env'))) return homeDir;
  return null;
}

function getOrInitConfigDir(workspaceDir) {
  const existing = findConfigDir(workspaceDir);
  if (existing) return existing;

  const projectDir = workspaceDir || process.cwd();
  const configDir = path.join(projectDir, '.doubao-speech');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const envPath = path.join(configDir, '.env');
  if (!fs.existsSync(envPath)) {
    const template = `# Doubao Speech API 配置
# 在下方填入你的 API Key（豆包/火山引擎）
# 获取方式：https://console.volcengine.com/ark
API_KEY=

# Resource-Id 配置（一般不需要修改）
# TTS: seed-tts-2.0
# ASR: volc.seedasr.sauc.duration
`;
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

export async function doubaoTts({ text, voice, speed, format, workspaceDir }) {
  const { key: apiKey, configDir } = getApiKeyWithInit(workspaceDir);
  if (!apiKey) {
    return `❌ API_KEY 未配置。

已自动创建配置文件: ${path.join(configDir, '.env')}
请打开该文件，填入你的 API Key：

  1. 打开 ${path.join(configDir, '.env')}
  2. 将 API_KEY= 改为 API_KEY=你的key
  3. 保存后重新执行

获取 API Key：https://console.volcengine.com/ark`;
  }

  const modelId = voice || 'seed-tts-2.0';
  const audioFormat = format || 'mp3';
  const speakingRate = speed || 1.0;

  const requestBody = {
    model: {
      app: '',
      resource_id: 'seed-tts-2.0',
    },
    params: {
      text: String(text || ''),
      format: audioFormat,
      rate: speakingRate,
    },
  };

  try {
    const response = await fetch('https://openspeech.bytedance.com/api/v3/plan/tts/unidirectional', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      return `❌ TTS 请求失败 (${response.status}): ${errorBody || response.statusText}`;
    }

    const outputDir = workspaceDir ? path.join(workspaceDir, 'assets', 'audio') : 'assets/audio';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const fileName = `${safeSlug(text.slice(0, 30))}.${audioFormat}`;
    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, buffer);

    return `✅ 音频已生成: ${filePath}\n文件大小: ${(buffer.length / 1024).toFixed(1)} KB`;
  } catch (err) {
    return `❌ TTS 请求异常: ${err.message}`;
  }
}

export function createDoubaoTools(tool) {
  return {
    doubao_tts: tool({
        description: '将文本转换为语音音频文件。需要 ARK_API_KEY 配置在 .doubao-speech/.env 中',
      args: {
        text: tool.schema.string({ description: '要转换为语音的文本内容' }),
        voice: tool.schema.string({ description: '语音模型，默认 seed-tts-2.0' }).optional(),
        speed: tool.schema.number({ description: '语速，默认 1.0' }).optional(),
        format: tool.schema.string({ description: '音频格式，默认 mp3' }).optional(),
      },
      async execute(args, context) {
        return await doubaoTts({
          text: args.text,
          voice: args.voice,
          speed: args.speed,
          format: args.format,
          workspaceDir: context?.directory,
        });
      },
    }),
  };
}
