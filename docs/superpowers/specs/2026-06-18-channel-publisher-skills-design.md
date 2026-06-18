# 渠道发布 Skills 与 Tools 重构设计

## 背景

`agent-workflows` 已有平台无关内容包工具和知乎发布准备工具，但知乎能力偏操作手册，缺少发布会话、统一渠道协议和可扩展渠道结构。后续需要支持知乎、小红书、掘金等内容渠道，且保持公开插件安全边界。

## 目标

第一阶段采用“按渠道做 Skill，配套 Tools”的方式建设：

1. 建立统一内容包与渠道包协议。
2. 新增或重构渠道 Skill：`zhihu-publisher`、`xiaohongshu-publisher`、`juejin-publisher`。
3. 知乎作为第一条完整落地链路。
4. 小红书、掘金先提供可用渠道包与浏览器操作手册，后续渐进增强。
5. 保留旧 `zhihu-article-manager` 作为兼容入口，引导迁移到 `zhihu-publisher`。

## 非目标

第一阶段不做：

- Cookie、Token、`.env`、浏览器 profile 读取。
- 逆向接口默认发布。
- 自动点击发布。
- 自动评论、私信、批量营销、账号设置。
- 绕过登录、验证码、风控或审核。

## 目录结构

```text
skills/content/
  content-package-manager/
    SKILL.md
  zhihu-publisher/
    SKILL.md
  xiaohongshu-publisher/
    SKILL.md
  juejin-publisher/
    SKILL.md
  zhihu-article-manager/
    SKILL.md        # 兼容入口

tools/content/
  content-tools.js
  content-tools.test.js

tools/zhihu/
  zhihu-tools.js
  zhihu-tools.test.js

tools/xiaohongshu/
  xiaohongshu-tools.js
  xiaohongshu-tools.test.js

tools/juejin/
  juejin-tools.js
  juejin-tools.test.js
```

## 统一内容包

平台无关内容包由 `content-package-manager` 管理。输出：

```text
content.md
metadata.json
review-checklist.md
channels/
assets/
```

内容包职责：

- 保存平台无关 Markdown 正文。
- 保存标题、摘要、标签、目标渠道和资产引用。
- 执行敏感信息、公开表达、外链、版权等预审。
- 不打开平台，不执行渠道发布。

## 统一渠道包

所有渠道包放在：

```text
channels/<channel>/
```

通用文件：

```text
metadata.json
publish-checklist.md
browser-playbook.md
assets/
```

渠道正文文件：

```text
channels/zhihu/article.zhihu.md
channels/xiaohongshu/note.xhs.md
channels/xiaohongshu/cards.json
channels/juejin/article.juejin.md
```

`metadata.json` 至少包含：

```json
{
  "type": "channel-package",
  "channel": "zhihu",
  "title": "...",
  "summary": "...",
  "tags": [],
  "source_content_package": "...",
  "draft_gate": "browser-or-manual",
  "publish_gate": "manual-confirmation-required",
  "channel_actions": [],
  "checklist": [],
  "generated_at": "..."
}
```

## Skill 设计

### content-package-manager

触发：内容包、内容预审、多渠道准备、平台无关内容管理。

职责：

- 生成内容包。
- 执行内容预审。
- 为目标渠道准备基础任务清单。
- 不处理具体平台编辑器。

工具：

- `content_prepare_package`
- 后续扩展 `content_review_package`、`content_status`

### zhihu-publisher

触发：知乎文章、知乎发布、知乎草稿、知乎专栏。

职责：

- 生成知乎渠道包。
- 适配长文 Markdown。
- 输出知乎发布检查清单。
- 输出知乎浏览器操作手册。
- 浏览器可用时按手册打开创作后台、导入无图 Markdown、逐张插图、保存草稿。
- 发布前必须明确确认。

工具：

- `zhihu_prepare_article`
- `zhihu_prepare_publish`
- `zhihu_browser_setup_guide`
- `zhihu_draft_playbook`

第一阶段增强：

- 渠道包 metadata 对齐统一协议。
- 增加图片资产映射字段，为后续自动插图做准备。
- 增加发布会话字段，便于断点恢复。
- 保留旧知乎稳定流程：导入前清空、无图导入、保存刷新、逐张插图、逐张验证。

### xiaohongshu-publisher

触发：小红书、XHS、RED、图文笔记、小红书发布。

职责：

- 将长文适配为小红书图文笔记。
- 输出标题、正文、话题和卡片规划。
- 检查图片数量、比例、文字密度和封面要求。
- 输出浏览器操作手册。
- 发布前必须明确确认。

工具：

- `xhs_prepare_note`
- `xhs_browser_setup_guide`
- `xhs_draft_playbook`

第一阶段输出：

- `note.xhs.md`
- `cards.json`
- `metadata.json`
- `publish-checklist.md`
- `browser-playbook.md`

### juejin-publisher

触发：掘金、Juejin、技术文章发布、掘金草稿。

职责：

- 生成掘金 Markdown。
- 添加 front matter：`theme`、`highlight`。
- 检查技术文章格式、代码块、分类和标签。
- 输出浏览器操作手册。
- 发布前必须明确确认。

工具：

- `juejin_prepare_article`
- `juejin_browser_setup_guide`
- `juejin_draft_playbook`

第一阶段输出：

- `article.juejin.md`
- `metadata.json`
- `publish-checklist.md`
- `browser-playbook.md`

## 兼容策略

旧 `zhihu-article-manager` 暂时保留，作为兼容入口。其内容更新为：

- 说明新入口为 `zhihu-publisher`。
- 保留原触发关键词。
- 引导调用新工具和新流程。

不在第一阶段删除旧目录，避免破坏已安装用户的触发习惯。

## 安全边界

所有渠道 Skill 和 Tools 必须遵守：

- 不读取 Cookie、Token、账号密码、`.env`、浏览器 profile。
- 不保存账号标识和登录态。
- 不绕过登录、验证码、审核或平台风控。
- 不自动点击发布、更新、删除、撤回。
- 只有用户明确回复 `确认发布到<渠道>` 或 `确认更新<渠道>文章` 后，才允许进入发布动作。
- 内容包和渠道包不得包含真实凭证、客户信息、内部地址、未公开指标。

## 验证要求

结构或插件变更后至少运行：

```bash
node --check opencode-plugin.js
node --check .opencode/plugins/archai-agent-workflows.js
node -e "const fs=require('fs'); const p=require('./package.json'); if(!fs.existsSync(p.main)) process.exit(1); console.log(p.main)"
node --test tools/**/*.test.js
```

并检查：

- README 索引与实际 Skills/Tools 一致。
- `skills/**/SKILL.md` frontmatter 合法。
- 工具不读取敏感文件。
- 公开仓库不包含密钥、Token、Cookie、账号密码、私有路径。
- `git status --short` 只包含预期变更。

## 成功标准

第一阶段完成时：

1. OpenCode 能识别新渠道 Skills。
2. 插件能注册内容、知乎、小红书、掘金工具。
3. 知乎链路可从 Markdown 一键生成内容包和知乎渠道包。
4. 小红书链路可生成笔记包和卡片规划。
5. 掘金链路可生成带 front matter 的技术文章包。
6. 所有渠道都有发布前检查清单和浏览器操作手册。
7. 测试通过，且不引入敏感信息。
