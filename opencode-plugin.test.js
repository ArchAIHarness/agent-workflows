import test from 'node:test';
import assert from 'node:assert/strict';
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
