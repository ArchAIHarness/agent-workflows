<div align="center">

# ArchAIHarness Skills

**OpenCode / Claude Code Skill 集合 · 把架构哲学装进 AI 工作流**

[![OpenCode](https://img.shields.io/badge/OpenCode-Skills-6E40C9?logo=opensourceinitiative&logoColor=white)](https://opencode.ai)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Compatible-D97757?logo=anthropic&logoColor=white)](https://www.anthropic.com/claude-code)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Skills](https://img.shields.io/badge/skills-1-blue.svg)](#skills-index)

</div>

---

## 这是什么

`ArchAIHarness/skills` 是 **ArchAIHarness** 体系下的 AI 代理技能(skill)集合。
每个 skill 都是一份**可被 OpenCode / Claude Code 直接加载执行**的工程化模板:把架构师的方法论沉淀成 AI 能调用的具体工序,让 AI 真正承接「按规范执行」的活。

> 与 [docs](https://github.com/ArchAIHarness/docs) 的关系:`docs` 写"为什么 + 怎么做",`skills` 提供"AI 直接代你做"的工具。

---

## Skills 索引

<a name="skills-index"></a>

| Skill | 一句话定位 | 版本 | 状态 |
|---|---|---|---|
| [`code-quality`](./code-quality/) | 基于项目自身设计文档的 AI 代码质量评估 | 9.0 | ✅ 稳定 |

> 更多 skill 正在路上。

---

## 设计哲学

| 原则 | 含义 |
|---|---|
| **可执行优于可阅读** | 每个 skill 都能被 AI 直接拉起跑完,而不是「读完受启发」 |
| **设计文档驱动** | 评估、生成、改造的标准来自被作用项目自己的设计文档,不强加通用规范 |
| **证据强制** | 任何判定必须给文件/行号/链接,严禁 AI 信口开河 |
| **零配置启动** | 装上即用,定制是选项不是前提 |
| **可组合** | 一个 skill 解决一件事,跨 skill 的协作由 AI agent 编排 |

---

## 安装单个 skill

### OpenCode 项目内

```bash
cd your-project
mkdir -p .opencode/skills
git clone --depth=1 https://github.com/ArchAIHarness/skills.git /tmp/archai-skills
cp -R /tmp/archai-skills/<skill-name> .opencode/skills/
rm -rf /tmp/archai-skills
```

### Claude Code 用户级

```bash
mkdir -p ~/.claude/skills
git clone --depth=1 https://github.com/ArchAIHarness/skills.git /tmp/archai-skills
cp -R /tmp/archai-skills/<skill-name> ~/.claude/skills/
rm -rf /tmp/archai-skills
```

替换 `<skill-name>` 为目标 skill 的目录名(见上方索引)。

### 全套安装

```bash
mkdir -p .opencode/skills
git clone --depth=1 https://github.com/ArchAIHarness/skills.git /tmp/archai-skills
cp -R /tmp/archai-skills/*/ .opencode/skills/
rm -rf /tmp/archai-skills
```

---

## 贡献新 skill

希望贡献一个新的 skill?看 [AGENTS.md](./AGENTS.md) 的贡献规范。
核心要求:

- 单一职责,一个 skill 解决一类问题
- 完整的 `SKILL.md` + `README.md` + 至少一个真实使用样例
- 通过 [code-quality](./code-quality/) 自评,P0 问题清零

---

## 兼容性

| 平台 | 支持情况 |
|---|---|
| [OpenCode](https://opencode.ai) | ✅ 一等公民,首选适配目标 |
| [Claude Code](https://www.anthropic.com/claude-code) | ✅ skill 协议相近,直接可用 |
| 其他 AI Agent 平台 | 🟡 skill 结构通用(YAML frontmatter + Markdown),理论可适配,未做官方验证 |

---

## 相关仓库

- 📚 [docs](https://github.com/ArchAIHarness/docs) — 哲学、方法论、实践模式
- 🏗 [framework](https://github.com/ArchAIHarness/framework) — DDD 多租户企业脚手架
- 🚪 [gateway](https://github.com/ArchAIHarness/gateway) — 反应式 API 网关
- 🧠 **skills**(本仓库)— AI 代理技能集

---

<div align="center">

**Engineered by Architects · Empowered by AI**

</div>
