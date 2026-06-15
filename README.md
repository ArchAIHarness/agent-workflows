<div align="center">

# ArchAIHarness Agent Workflows

**OpenCode 插件 / Agent / Skill / Tool 集合**

[![OpenCode](https://img.shields.io/badge/OpenCode-Plugin%20%7C%20Agents%20%7C%20Skills-6E40C9?logo=opensourceinitiative&logoColor=white)](https://opencode.ai)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Agents](https://img.shields.io/badge/agents-3-success.svg)](#agents)
[![Skills](https://img.shields.io/badge/skills-4-blue.svg)](#skills)

</div>

---

## 这是什么

`ArchAIHarness/agent-workflows` 是公开的 OpenCode 能力集合，提供可直接加载的插件、Agents、Skills 和 Tools。

当前能力覆盖：

- 日常办公：办公材料整理、正式简历制作。
- 编码开发：DDD Java / Spring Boot 多模块开发。
- 内容运营：内容选题、内容生成、内容预审，与知乎等发布渠道适配分离。
- 质量评估：基于项目自身设计文档的代码质量评估。

---

## OpenCode 安装

在 `opencode.json` 中添加：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["archai-agent-workflows@git+https://github.com/ArchAIHarness/agent-workflows.git"]
}
```

重启 OpenCode。

插件会注册：

- `agents/*.md` 为 OpenCode agents。
- `skills/**/SKILL.md` 为 OpenCode skills。
- 依赖内置的 `superpowers` skills 会从 `node_modules/superpowers/skills` 自动注册，用户无需单独安装。
- 自动注册 `playwright` 与 `chrome-devtools` MCP，用于浏览器自动化；如用户已有自定义 `mcp.playwright` 或 `mcp.chrome-devtools`，插件不会覆盖。
- `tools/zhihu` 中的 `zhihu_prepare_publish` / `zhihu_prepare_article` / `zhihu_browser_setup_guide` 为 OpenCode custom tools，用于一句话知乎发布准备、渠道适配、浏览器自动化引导和发布前检查。

安装说明见 [.opencode/INSTALL.md](./.opencode/INSTALL.md)。

---

## Agents

<a name="agents"></a>

| Agent | 定位 |
|---|---|
| [`office`](./agents/office.md) | 日常办公材料整理、会议纪要、日报周报、文档总结 |
| [`resume`](./agents/resume.md) | 正式简历制作、排版、HTML/PDF 导出编排 |
| [`ddd-java-developer`](./agents/ddd-java-developer.md) | DDD Java / Spring Boot 多模块工程开发 |

---

## Skills

<a name="skills"></a>

| Skill | 分组 | 定位 | 版本 |
|---|---|---|---|
| [`formal-resume-builder`](./skills/office/formal-resume-builder/) | office | 正式简历制作、排版、HTML/PDF 输出和质量校验 | 1.0.0 |
| [`ddd-java-developer`](./skills/engineering/ddd-java-developer/) | engineering | DDD Java / Spring Boot 多模块开发约束流程 | 1.0.0 |
| [`zhihu-article-manager`](./skills/content/zhihu-article-manager/) | content | 一句话知乎发布编排、内容管理与渠道适配、浏览器自动化引导和发布门禁 | 1.2.0 |
| [`code-quality`](./skills/quality/code-quality/) | quality | 基于项目自身设计文档的 AI 代码质量评估 | 9.0 |

---

## Tools

| 目录 | 定位 |
|---|---|
| [`tools/office`](./tools/office/) | 办公文档处理、格式转换、摘要生成辅助工具 |
| [`tools/java`](./tools/java/) | Java / DDD 工程检查和模板辅助工具 |
| [`tools/quality`](./tools/quality/) | 质量评估辅助工具 |
| [`tools/content`](./tools/content/) | 平台无关内容选题、生成、预审和内容包工具 |
| [`tools/zhihu`](./tools/zhihu/) | 知乎渠道适配、浏览器自动化引导和发布前检查工具 |

---

## 仓库结构

```text
agent-workflows/
├── package.json
├── README.md
├── AGENTS.md
├── LICENSE
├── .opencode/
│   └── INSTALL.md
├── opencode-plugin.js
├── agents/
├── skills/
│   ├── office/
│   ├── engineering/
│   ├── content/
│   └── quality/
└── tools/
    ├── office/
    ├── java/
    ├── quality/
    ├── content/
    └── zhihu/
```

---

## 相关仓库

- [docs](https://github.com/ArchAIHarness/docs)
- [framework](https://github.com/ArchAIHarness/framework)
- [gateway](https://github.com/ArchAIHarness/gateway)

---

<div align="center">

**Engineered by Architects · Empowered by AI**

</div>
