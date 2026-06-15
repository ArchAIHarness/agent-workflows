<div align="center">

# code-quality

**OpenCode Skill · 基于项目自身设计文档的 AI 代码质量评估**

[![OpenCode](https://img.shields.io/badge/OpenCode-Skill-6E40C9?logo=opensourceinitiative&logoColor=white)](https://opencode.ai)
[![Version](https://img.shields.io/badge/version-9.0-blue.svg)](./SKILL.md)
[![Languages](https://img.shields.io/badge/languages-Java%20%7C%20Node.js-success.svg)](#)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](../../../LICENSE)

</div>

---

## 一句话定位

> 以被评估项目自己的 README.md / AGENTS.md 为标准，让 AI 代理自动审查代码实现是否符合项目设计，输出可量化、可追溯、有证据的质量评估报告。

## 解决什么问题

通用代码规范工具只能告诉你“这行代码不符合通用规范”。`code-quality` 关注的是：代码是否违反项目自己的设计要求。

示例：

- 项目 README 要求 DDD 分层，代码却在接口层写 SQL。
- AGENTS.md 禁止同步 HTTP 客户端，代码却使用阻塞调用。
- 设计文档要求网关全反应式，代码里出现 `block()`。

## OpenCode 使用

安装 `agent-workflows` 插件后，使用包含以下关键词的请求即可触发：

```text
qa
代码质量
质量评估
代码评估
质量报告
代码审查
code quality
quality report
```

示例：

```text
帮我对当前项目做一次 qa
```

## 支持范围

| 维度 | 当前内容 |
|---|---|
| 语言 | Java、Node.js |
| 框架 | Spring Boot / Spring Cloud / DDD、Express / NestJS / Koa |
| 报告 | Markdown 质量报告，包含评分、问题清单、证据和修复建议 |
| 规则 | `rules/` |
| 清单 | `checklist/` |
| 脚本 | `scripts/score_calculator.js` |

## 文档

| 文档 | 用途 |
|---|---|
| [SKILL.md](./SKILL.md) | skill 入口 |
| [USAGE.md](./USAGE.md) | 使用说明 |
| [DESIGN.md](./DESIGN.md) | 设计说明 |

[← 返回仓库首页](../../../README.md)
