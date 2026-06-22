import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ArchAIAgentWorkflowsPlugin } from './opencode-plugin.js';

test('plugin config registers Playwright MCP automatically when missing', async () => {
  const plugin = await ArchAIAgentWorkflowsPlugin();
  const config = {};

  await plugin.config(config);

  assert.deepEqual(config.mcp.playwright, {
    type: 'local',
    command: ['npx', '-y', '@playwright/mcp'],
    enabled: true,
  });
});

test('plugin config preserves existing Playwright MCP when user configured it', async () => {
  const plugin = await ArchAIAgentWorkflowsPlugin();
  const existing = {
    type: 'local',
    command: ['custom-playwright'],
    enabled: false,
  };
  const config = { mcp: { playwright: existing } };

  await plugin.config(config);

  assert.equal(config.mcp.playwright, existing);
});

test('plugin config auto-registers bundled superpowers skills path when available', async () => {
  const plugin = await ArchAIAgentWorkflowsPlugin();
  const config = { skills: { paths: [] } };

  await plugin.config(config);

  const superpowersPath = config.skills.paths.find((item) => item.endsWith(path.join('superpowers', 'skills')));
  assert.ok(superpowersPath, 'expected bundled superpowers skills path');
  assert.ok(fs.existsSync(superpowersPath));
});

test('plugin config does not duplicate superpowers skills path', async () => {
  const plugin = await ArchAIAgentWorkflowsPlugin();
  const config = { skills: { paths: [] } };

  await plugin.config(config);
  await plugin.config(config);

  const superpowersPaths = config.skills.paths.filter((item) => item.endsWith(path.join('superpowers', 'skills')));
  assert.equal(superpowersPaths.length, 1);
});
