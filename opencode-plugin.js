import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { tool } from '@opencode-ai/plugin';
import { createContentTools } from './tools/content/content-tools.js';
import { createZhihuTools } from './tools/zhihu/zhihu-tools.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = __dirname;
const agentsDir = path.join(repoRoot, 'agents');
const skillsDir = path.join(repoRoot, 'skills');

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: markdown.trimStart() };

  const frontmatter = {};
  for (const line of match[1].split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf(':');
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '');
    frontmatter[key] = value;
  }

  return { frontmatter, body: match[2].trimStart() };
}

function registerSkills(config) {
  if (!fs.existsSync(skillsDir)) return;
  config.skills = config.skills || {};
  config.skills.paths = config.skills.paths || [];
  if (!config.skills.paths.includes(skillsDir)) {
    config.skills.paths.push(skillsDir);
  }
}

function registerBrowserMcp(config) {
  config.mcp = config.mcp || {};
  config.mcp.playwright = config.mcp.playwright || {
    type: 'local',
    command: ['npx', '-y', '@playwright/mcp'],
    enabled: true,
  };
}

function registerAgents(config) {
  if (!fs.existsSync(agentsDir)) return;
  config.agent = config.agent || {};

  for (const fileName of fs.readdirSync(agentsDir)) {
    if (!fileName.endsWith('.md')) continue;

    const agentName = path.basename(fileName, '.md');
    const fullPath = path.join(agentsDir, fileName);
    const markdown = fs.readFileSync(fullPath, 'utf8');
    const { frontmatter, body } = parseFrontmatter(markdown);

    config.agent[agentName] = {
      ...config.agent[agentName],
      description: frontmatter.description || config.agent[agentName]?.description || `${agentName} agent`,
      mode: frontmatter.mode || config.agent[agentName]?.mode || 'subagent',
      color: frontmatter.color || config.agent[agentName]?.color,
      prompt: body,
    };
  }
}

export const ArchAIAgentWorkflowsPlugin = async () => {
  return {
    config: async (config) => {
      registerSkills(config);
      registerAgents(config);
      registerBrowserMcp(config);
    },
    tool: {
      ...createContentTools(tool),
      ...createZhihuTools(tool),
    },
  };
};

export default ArchAIAgentWorkflowsPlugin;
