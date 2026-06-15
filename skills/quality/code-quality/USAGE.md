# code-quality · 使用指南

`code-quality` 是 OpenCode skill，用于按照被评估项目自己的 README.md / AGENTS.md / 架构文档做代码质量评估。

## 1. 安装

通过 `ArchAIHarness/agent-workflows` OpenCode 插件安装。

在 `opencode.json` 中添加：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["archai-agent-workflows@git+https://github.com/ArchAIHarness/agent-workflows.git"]
}
```

保存后重启 OpenCode。

## 2. 触发评估

在 OpenCode 对话中输入以下任一关键词：

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

常用说法：

```text
对当前项目做一次 qa
```

```text
帮我做代码质量评估
```

## 3. 评估流程

| 阶段 | AI 在做什么 |
|---|---|
| 1. 扫描 | 列出源码与配置文件，跳过依赖与构建产物 |
| 2. 读设计 | 读取 README.md / AGENTS.md / 主要配置文件 |
| 3. 提取标准 | 把项目设计要求转为可勾选检查项 |
| 4. 加载 rules | 按项目语言加载 `rules/rules_xxx.md` |
| 5. 代码核对 | 逐文件核对，记录 `文件:行号` 证据 |
| 6. 流程走查 | 跑通核心业务流程，定位 P0 阻断 |
| 7. 填 checklist | 用 `checklist/checklist_xxx.md` 记录判定 |
| 8. 评分计算 | 跑 `scripts/score_calculator.js` 得到加权分 |
| 9. 出报告 | 用 `report.md` 模板生成质量报告 |

报告写入被评估项目根目录，文件名形如：

```text
QA_REPORT_2026-06-02.md
```

## 4. 让评估更精准

`code-quality` 的核心机制是“以项目自己的设计文档为标准”。被评估项目的 README.md / AGENTS.md 写得越具体，评估越精准。

推荐明确写出：

```markdown
## 设计要求

### 分层规则
- interfaces 层只能调 application，不能直接调 domain/infrastructure
- domain 层零框架依赖
- infrastructure 实现 domain 定义的接口

### 技术约束
- 严禁使用 RestTemplate，统一用 WebClient
- 严禁 Mono.block() / Thread.sleep
- 金额计算必须用 BigDecimal，严禁 double
```

## 5. 自定义规则

规则目录：

```text
rules/
checklist/
```

评分模型：

```text
基础分 100
P0 问题 -20 分/个
P1 问题 -8 分/个
P2 问题 -3 分/个
P3 问题 -1 分/个
```

可以按团队偏好调整规则和扣分值。

## 6. 故障排查

| 症状 | 排查 |
|---|---|
| AI 不识别 skill | 确认 `agent-workflows` 插件已安装并重启 OpenCode |
| 报告没生成 | 检查 AI 是否完整跑完 9 个阶段 |
| 评分计算错 | 运行 `node scripts/score_calculator.js path/to/checklist.md` 验证 |
| 问题定级争议 | 查看 `rules/rules.md` 的定级原则 |
| 误报 / 漏报 | 优先完善被评估项目 README.md / AGENTS.md |

## 7. 反馈

- Issues: <https://github.com/ArchAIHarness/agent-workflows/issues>
- Repository: <https://github.com/ArchAIHarness/agent-workflows>
