# AGENTS.md · ArchAIHarness Skills

> 本仓库内由 AI 协作完成的编辑都必须遵守以下条款,**不得以"是小改动"为由跳过**。

---

## 0. 仓库性质

本仓库是 **AI 代理 skill 集合**,每个子目录是一个独立可加载的 skill。
不要把这里当作普通工程仓库 —— 这里的文件最终是被 AI agent 拿去解释执行的,**格式即合约**。

---

## 1. 目录约定

```
skills/
├── README.md              集合门面(本仓库索引)
├── AGENTS.md              本文件(AI 协作约束)
├── LICENSE                MIT
├── .gitignore
├── .github/               (可选)CI / Issue 模板
└── <skill-name>/          每个 skill 一个目录
    ├── SKILL.md           必含,skill 入口
    ├── README.md          必含,产品门面
    ├── USAGE.md           推荐,使用与定制指南
    ├── DESIGN.md          可选,内部设计说明
    └── ...其他资产(rules / checklist / scripts / templates)
```

新增 skill = 在仓库根新建一个**仅含字母、数字、`-`** 的目录,如 `code-quality/`、`feishu-bot/`。

---

## 2. SKILL.md 强制格式

每个 skill 的 `SKILL.md` 头部必须是合法的 YAML frontmatter:

```markdown
---
name: <skill-name>          # 必须与目录名一致
version: <semver>           # 必须用语义化版本
description: |              # 必须含触发关键词与适用场景
  ...
---

## ...skill 正文从此开始
```

`name` 与目录名不一致 = AI 加载时会出现命名漂移,**禁止**。

---

## 3. 不可硬编码

skill 内容**严禁**出现以下硬编码:

- 绝对路径(`/Users/xxx/...`、`/opt/...`)
- 个人/公司专属信息(邮箱、内网 IP、域名)
- 特定项目的业务术语(订单号格式、租户 ID 命名规则等)

skill 应当对任何项目通用,差异化通过被作用项目自己的 README/AGENTS/配置 来表达。

---

## 4. 证据强制

skill 让 AI 输出的任何判定,必须能溯源:

- 「这段代码违反规范」→ 必须给 `文件:行号`
- 「评分扣了 8 分」→ 必须列出扣分的具体问题
- 「按设计文档应该是 X」→ 必须给设计文档的具体段落引用

**不给证据的 skill 不接受合入**。

---

## 5. 文件命名

- 全小写
- 单词用 `-` 分隔,**不**用 `_`(目录与文件名一律 kebab-case),**例外**:`SKILL.md` / `README.md` / `USAGE.md` / `DESIGN.md` / `AGENTS.md` / `LICENSE` 等惯例全大写
- rules / checklist 等需要按语言拆分时,允许下划线:`rules_java.md`、`checklist_nodejs.md`(与 skill 内部既有约定一致)

---

## 6. 文档语言

- 中文为主、英文徽章为辅
- README 顶部必含徽章组(平台、版本、license)
- 关键决策必须用表格而非散段落表达
- 严禁 emoji 满屏(Anthropic skill 风格:克制 emoji,只在必要标识处使用)

---

## 7. 新 skill 的贡献清单

提 PR 前请确认:

- [ ] 目录名是 kebab-case
- [ ] `SKILL.md` 含完整 frontmatter,`name` 与目录名一致
- [ ] `README.md` 含徽章组、一句话定位、解决什么问题、安装、触发方式、示例
- [ ] 至少有一个真实使用样例(可以是 USAGE.md 里的 demo,也可以是单独 `examples/`)
- [ ] 已用 `code-quality` skill 自评本 skill,P0 问题清零
- [ ] 顶层 `README.md` 的 Skills 索引表已新增对应行
- [ ] 不引入任何二进制或大体积资产(如必须,放在 `assets/` 并在 PR 描述里说明)

---

## 8. 版本与变更

- skill 内部用 SemVer:`1.0.0` → 破坏性变更升 major
- 仓库本身不发版,以 git tag + GitHub Release 标记里程碑
- 每次 skill 升 major 必须同步更新 README 的 `Skills 索引` 表

---

## 9. 与 ArchAIHarness 其他仓库的关系

- `docs` 是「为什么 / 怎么做」,`skills` 是「AI 直接帮你做」
- 一个 skill 如果对应 docs 里的某篇方法论,README 必须显式链接
- skill 之间不耦合(每个目录独立,无相互 import)

---

> 本文档优先级高于个人偏好。如条款与实际需要冲突,**发 PR 改本文档**,而不是绕过。
