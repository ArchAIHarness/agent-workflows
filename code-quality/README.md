<div align="center">

# code-quality

**OpenCode Skill · 基于项目自身设计文档的 AI 代码质量评估**

[![OpenCode](https://img.shields.io/badge/OpenCode-Skill-6E40C9?logo=opensourceinitiative&logoColor=white)](https://opencode.ai)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Compatible-D97757?logo=anthropic&logoColor=white)](https://www.anthropic.com/claude-code)
[![Version](https://img.shields.io/badge/version-9.0-blue.svg)](./SKILL.md)
[![Languages](https://img.shields.io/badge/languages-Java%20%7C%20Node.js-success.svg)](#)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](../LICENSE)

</div>

---

## 一句话定位

> **以被评估项目自己的 README.md / AGENTS.md 为标准**,让 AI 代理自动审查代码实现是否符合项目设计,输出可量化、可追溯、有证据的质量评估报告。

这是 ArchAIHarness 体系下的**评估闭环工具**:与 [docs/0xA4_代码质量评估体系](https://github.com/ArchAIHarness/docs/blob/main/0xA0_%E5%AE%9E%E8%B7%B5%E6%96%B9%E6%B3%95/0xA4_%E4%BB%A3%E7%A0%81%E8%B4%A8%E9%87%8F%E8%AF%84%E4%BC%B0%E4%BD%93%E7%B3%BB.md) 理论对应,让"评估"从口号变为可执行的工程动作。

---

## 解决什么问题

通用代码规范工具(SonarQube / Checkstyle / ESLint)只能告诉你「这行代码不符合通用规范」。
但**真正的质量问题**往往是:

- ❌ 项目自己 README 说"必须 DDD 分层",代码却在 `interfaces` 里写 SQL
- ❌ AGENTS.md 说"禁止 RestTemplate",代码却到处都是同步调用
- ❌ 设计文档说"网关必须全反应式",代码里有 `Mono.block()`

这些**「违反项目自己的设计」**的问题,只有读懂项目设计文档的 AI 才发现得了。

`code-quality` 就是为此而生:

```
被评估项目的 README.md / AGENTS.md
              ↓ (AI 读懂)
       评估标准 + 检查清单
              ↓ (AI 执行)
        代码逐行核对 + 业务流程走查
              ↓ (AI 输出)
   质量报告(评分 + 证据 + 修复建议)
```

---

## 三大设计原则

| 原则 | 含义 |
|---|---|
| **设计文档驱动** | 评估的标准是被评估项目**自己的**设计文档,不是通用规范 |
| **证据强制** | 每个问题必须给出 `文件:行号` 证据,严禁编造 |
| **流程不可绕** | 9 个阶段必须完整执行,不允许"我看着差不多就这样"式跳过 |

---

## 快速安装

### OpenCode

```bash
# 进入你的项目根目录
cd your-project

# 克隆 skill 到 .opencode/skills/
mkdir -p .opencode/skills
git clone https://github.com/ArchAIHarness/skills.git /tmp/archai-skills
cp -R /tmp/archai-skills/code-quality .opencode/skills/code-quality
```

### Claude Code

```bash
# Claude Code 的 skill 路径
mkdir -p ~/.claude/skills
git clone https://github.com/ArchAIHarness/skills.git /tmp/archai-skills
cp -R /tmp/archai-skills/code-quality ~/.claude/skills/code-quality
```

完整安装指南、按项目定制 rules 的方式、为新语言扩展规则的步骤,请看 [USAGE.md](./USAGE.md)。

---

## 触发关键词

skill 自动激活,无需手动调用。在 AI 对话中输入任一关键词即可:

`qa` · `代码质量` · `质量评估` · `代码评估` · `质量报告` · `代码审查` · `code quality` · `quality report`

示例:

```
> 帮我对当前项目做一次 qa
```

AI 会自动:
1. 扫描项目文件
2. 读取 README.md / AGENTS.md
3. 提取设计要求
4. 加载对应语言的检查规则
5. 逐文件核对、业务流程走查
6. 计算评分并输出报告到项目根目录

---

## 支持范围

| 维度 | 现状 |
|---|---|
| 语言 | Java(302 条规则) · Node.js(269 条规则) |
| 框架 | Java 侧覆盖 Spring Boot / Spring Cloud / DDD;Node.js 侧覆盖 Express / NestJS / Koa |
| 报告 | 标准 Markdown,含项目概况 / 评分 / 各级问题清单 / 修复建议 |
| 扩展 | 支持按项目定制 rules,详见 USAGE.md |
| 待扩展语言 | Python / Go / Rust / TypeScript-only(欢迎 PR,模板在 `rules/`) |

---

## 报告样例

```markdown
# {项目名} 代码质量评估报告

## 项目概况
- 项目名称: my-service
- 开发语言: Java 17 + Spring Boot 3.2.5
- 代码规模: 87 文件 / 4523 行
- 评估日期: 2026-06-02

## 评分总览(总分 100)
| 维度 | 得分 | 满分 |
|---|---|---|
| 设计一致性 | 82 | 100 |
| 安全性 | 95 | 100 |
| 可维护性 | 78 | 100 |
| **加权总分** | **85** | **100** |

## 问题清单
### 🔴 P0(必须修复)
1. `interfaces/UserController.java:42` — 在 controller 中直接拼接 SQL,违反项目 README 第 3 节「分层规则」
2. `infrastructure/MailClient.java:18` — 使用 RestTemplate,违反 AGENTS.md「禁止同步 HTTP 客户端」

### 🟠 P1(高优修复)
...
```

更多细节、阶段流程、定级规则的设计原理,请看 [DESIGN.md](./DESIGN.md)。

---

## 文档导航

| 文档 | 用途 |
|---|---|
| [README.md](./README.md) | 你现在看的,产品介绍 |
| [USAGE.md](./USAGE.md) | 安装、配置、定制、扩展 |
| [SKILL.md](./SKILL.md) | skill 入口,AI 代理执行的指令文件 |
| [DESIGN.md](./DESIGN.md) | 完整设计文档(580 行) |
| `checklist/` | 检查结果填写模板 |
| `rules/` | 检查规则与扣分标准 |
| `scripts/` | 评分计算辅助脚本 |

---

<div align="center">

Engineered by Architects · Empowered by AI

[← 返回 skills 集合](../README.md)

</div>
