# AGENTS.md · ArchAIHarness Agent Workflows

本文件是维护 `agent-workflows` 仓库自身的协作规则。它不是 OpenCode 插件、不是 Agent 定义、不是 Skill，也不应被插件注册到 OpenCode。

## 1. 仓库定位

本仓库是公开的 OpenCode 插件 / Agent / Skill / Tool 集合。

当前内容：

- OpenCode 插件入口：`opencode-plugin.js`
- OpenCode Agent 定义：`agents/*.md`
- OpenCode Skill 定义：`skills/**/SKILL.md`
- 工具脚本或资源：`tools/**`

## 2. 目录职责

| 路径 | 职责 | 是否由插件注册 |
|---|---|---|
| `AGENTS.md` | 维护本仓库的规则 | 否 |
| `README.md` | 仓库说明、安装、索引 | 否 |
| `package.json` | git/npm 插件包入口 | 被 OpenCode 用于定位插件 main |
| `opencode-plugin.js` | OpenCode 插件入口 | 是 |
| `agents/` | 可注入 OpenCode 的 Agent 定义 | 是 |
| `skills/` | 可被 OpenCode skill tool 加载的 Skill 定义 | 是 |
| `tools/` | 工具脚本或资源 | 视插件实现 |

## 3. Agent 维护规则

Agent 文件位于：

```text
agents/<agent-name>.md
```

必须包含 frontmatter：

```markdown
---
description: <触发场景和职责>
mode: subagent
color: <color>
---
```

要求：

- 内容通用，不绑定个人、公司、客户或私有路径。
- 说明职责、默认使用的 skill、禁止事项和输出要求。
- 不在 agent 文件中配置权限；权限由使用方 OpenCode 配置管理。

## 4. Skill 维护规则

Skill 文件位于：

```text
skills/<domain>/<skill-name>/SKILL.md
```

当前分组：

| domain | 用途 |
|---|---|
| `office` | 日常办公、简历、文档处理 |
| `engineering` | 编码开发、架构设计、技术落地 |
| `quality` | 质量评估、审查、验收 |
| `content` | 内容创作、平台发布、公开表达工作流 |

`SKILL.md` 必须包含：

```markdown
---
name: <skill-name>
version: <semver>
description: |
  <触发关键词与适用场景>
---
```

要求：

- `name` 与目录名一致。
- `description` 写清触发场景。
- 内容通用，不包含私有路径、客户信息、内网地址、账号密码、Token、Cookie。
- 质量判断必须要求证据来源；代码问题必须要求文件和行号。

## 5. Tool 维护规则

Tool 文件位于：

```text
tools/<domain>/
```

要求：

- 工具通过显式参数接收输入路径或内容。
- 不硬编码本机路径。
- 不读取密钥、Token、Cookie、`.env` 等敏感文件。
- 如注册为 OpenCode custom tool，必须提供清晰参数 schema 和安全边界。
- 内容运营类工具必须分离内容管理和渠道管理：内容管理覆盖选题、生成、预审；渠道管理覆盖渠道内容获取、保存草稿、发布上线。
- 渠道发布能力依赖浏览器自动化或平台 API 时，必须提供可执行配置引导和能力降级说明，不得把依赖问题直接抛给用户。

## 6. OpenCode 插件维护规则

插件入口：

```text
opencode-plugin.js
```

`.opencode/plugins/archai-agent-workflows.js` 仅作为本地源码形态下的兼容入口，转发到根插件入口。

当前职责：

1. 将本仓库 `skills/` 和依赖内置的 `node_modules/superpowers/skills` 加入 `config.skills.paths`，路径存在时才注册。
2. 读取 `agents/*.md` 并注入 `config.agent`。
3. 在缺少 `mcp.playwright` 时自动注册浏览器 MCP，支撑浏览器自动化；不得覆盖用户已有 MCP 配置。

要求：

- 不读取或注入 `AGENTS.md`。
- 不修改用户默认 agent。
- 不注入私有路径。
- 不自动提交、推送或生成用户文件。
- 插件必须通过 `node --check`。

## 7. 公开安全规则

禁止提交：

- 真实密钥、Token、Cookie、账号密码。
- 私有路径、内网地址、客户材料、未公开业务数据。
- 与个人工作区绑定的规则或私有协作偏好。

## 8. 变更验证

结构或插件变更后至少运行：

```bash
node --check opencode-plugin.js
node --check .opencode/plugins/archai-agent-workflows.js
node -e "const fs=require('fs'); const p=require('./package.json'); if(!fs.existsSync(p.main)) process.exit(1); console.log(p.main)"
```

并检查：

- `agents/*.md` 可解析 frontmatter。
- `skills/**/SKILL.md` 存在且 frontmatter 合法。
- README 索引与实际目录一致。
- 公开文件不包含敏感信息。
- `git status --short` 只包含预期变更。
