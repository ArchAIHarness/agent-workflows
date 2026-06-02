# code-quality · 使用指南

> 本文档教你三件事:**装上 · 用起来 · 按需定制**。如果想了解 skill 的内部设计,看 [DESIGN.md](./DESIGN.md)。

---

## 1. 安装

### 1.1 OpenCode 项目内安装(推荐)

```bash
cd /path/to/your-project
mkdir -p .opencode/skills

# 从 ArchAIHarness/skills 拉取 code-quality 子目录
git clone --depth=1 https://github.com/ArchAIHarness/skills.git /tmp/archai-skills
cp -R /tmp/archai-skills/code-quality .opencode/skills/code-quality
rm -rf /tmp/archai-skills
```

### 1.2 Claude Code 用户级安装

```bash
mkdir -p ~/.claude/skills
git clone --depth=1 https://github.com/ArchAIHarness/skills.git /tmp/archai-skills
cp -R /tmp/archai-skills/code-quality ~/.claude/skills/code-quality
rm -rf /tmp/archai-skills
```

### 1.3 验证安装

```bash
ls -la .opencode/skills/code-quality/SKILL.md  # 或 ~/.claude/skills/code-quality/SKILL.md
# 应当看到 SKILL.md 文件存在
```

---

## 2. 使用

### 2.1 触发评估

在 AI 对话中输入以下任一关键词即可激活:

`qa` · `代码质量` · `质量评估` · `代码评估` · `质量报告` · `代码审查` · `code quality` · `quality report`

最常用的两种说法:

```
对当前项目做一次 qa
```

```
帮我做代码质量评估
```

### 2.2 评估流程(AI 自动执行,无需干预)

| 阶段 | AI 在做什么 |
|---|---|
| 1. 扫描 | 列出全部源码与配置文件,跳过依赖与构建产物 |
| 2. 读设计 | 读 README.md / AGENTS.md / 主要配置文件 |
| 3. 提取标准 | 把项目自己的「设计要求」转为可勾选的检查项 |
| 4. 加载 rules | 按项目语言加载 `rules/rules_xxx.md` |
| 5. 代码核对 | 逐文件核对,记录 `文件:行号` 证据 |
| 6. 流程走查 | 跑通核心业务流程,定位 P0 阻断 |
| 7. 填 checklist | 用 `checklist/checklist_xxx.md` 模板记录全部判定 |
| 8. 评分计算 | 跑 `scripts/score_calculator.js` 得到加权分 |
| 9. 出报告 | 用 `report.md` 模板生成,保存到被评估项目根目录 |

### 2.3 报告位置

报告会被写到**被评估项目根目录**,文件名形如:

```
{被评估项目}/QA_REPORT_2026-06-02.md
```

---

## 3. 为你自己的项目定制

### 3.1 让评估更精准 — 写好被评估项目的 README/AGENTS

`code-quality` 的核心机制是「以你项目的设计文档为标准」。所以**你的设计文档写得越具体,评估越精准**。

推荐在被评估项目的 README.md 中,清楚写出:

```markdown
## 设计要求(本节将作为 code-quality 评估标准)

### 分层规则
- interfaces 层只能调 application,不能直接调 domain/infrastructure
- domain 层零框架依赖
- infrastructure 实现 domain 定义的接口

### 技术约束
- 严禁使用 RestTemplate,统一用 WebClient
- 严禁 Mono.block() / Thread.sleep
- 金额计算必须用 BigDecimal,严禁 double

### 命名规范
- DTO 后缀 Request/Response
- 仓储接口 Repository,实现 RepositoryImpl
```

AI 会把这些条目转成 checklist 的一部分,逐条核对代码。

### 3.2 自定义扣分规则

打开 `rules/rules.md`,核心评分模型如下:

```
基础分 100
P0 问题 -20 分/个(必须修复,阻断上线)
P1 问题 -8 分/个(高优修复)
P2 问题 -3 分/个(改进项)
P3 问题 -1 分/个(参考性建议)
```

你可以按团队偏好调整扣分值,改完 AI 下次评估即生效。

### 3.3 给特定语言加更严的规则

`rules/rules_java.md` 和 `rules/rules_nodejs.md` 各自含 270+ 条规则。
团队若想增加自定义规则(例如「禁止使用 Optional.get()」),直接在文件末尾按既有格式追加:

```markdown
### YOUR-RULE-001 · 禁止 Optional.get()
- 定级: P1
- 检查方式: grep `\.get\(\)` 调用方,确认是否对 Optional 类型
- 修复建议: 改用 orElseThrow / orElse / ifPresent
```

---

## 4. 为新语言贡献规则

目前支持 Java + Node.js。欢迎为下列语言贡献规则集:

- Python · Go · Rust · TypeScript-only · Kotlin · Swift

### 4.1 创建步骤

```bash
# 1) fork ArchAIHarness/skills
# 2) 复制现有 rules 作为模板
cp rules/rules_java.md   rules/rules_python.md
cp checklist/checklist_java.md checklist/checklist_python.md

# 3) 改写为目标语言的规则
#    - 保持文件结构(章节、定级、检查项格式)
#    - 至少覆盖:命名 / 异常 / 日志 / 并发 / 资源 / 安全 / 性能 / 框架特性
#    - 推荐 200+ 条规则起步

# 4) 在 SKILL.md 中登记新语言识别逻辑
#    搜索 "rules_java" / "rules_nodejs",照葫芦画瓢

# 5) 提 PR
```

### 4.2 质量要求

| 项 | 要求 |
|---|------|
| 规则数 | ≥ 150 条 |
| 定级覆盖 | P0~P3 四级均要有 |
| 主流框架覆盖 | 该语言的 Top 3 框架(如 Python 的 Django/Flask/FastAPI) |
| 示例代码 | 每条规则至少 1 个反例 + 1 个正例 |

---

## 5. 故障排查

| 症状 | 排查 |
|---|---|
| AI 不识别 skill | 确认 `SKILL.md` 在正确路径;OpenCode/Claude Code 已重启 |
| 报告没生成 | 检查 AI 是否完整跑完 9 个阶段;有些 LLM 会在阶段 5 就提前总结 |
| 评分计算错 | 跑 `node scripts/score_calculator.js path/to/checklist.md` 手动验证 |
| 问题定级争议 | 看 `rules/rules.md` 的「定级原则」段落,或在 Issue 里讨论 |
| 误报 / 漏报 | 八成是被评估项目 README/AGENTS 没写清楚,先完善设计文档 |

---

## 6. 反馈与贡献

- 提 issue: <https://github.com/ArchAIHarness/skills/issues>
- 提 PR: 看 [../AGENTS.md](../AGENTS.md) 的贡献规范

---

> 用得顺手?给 [ArchAIHarness/skills](https://github.com/ArchAIHarness/skills) 一个 ⭐ 是对作者最大的鼓励。
