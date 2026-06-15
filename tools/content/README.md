# tools/content

平台无关的内容管理工具目录。

当前能力：

- `content-tools.js`：提供 `content_prepare_package` OpenCode 工具定义，生成通用内容管理包。

## 内容管理边界

内容管理只负责：

- 内容选题：明确主题、目标读者、核心问题和目标渠道。
- 内容生成：保存平台无关的 Markdown 正文、摘要、标签和元数据。
- 内容预审：检查事实、敏感信息、版权、外链、夸大表达和平台合规风险。

内容管理不负责：

- 登录渠道账号。
- 保存渠道草稿。
- 点击发布上线。
- 读取 Cookie、Token、账号密码、`.env` 或浏览器 profile。

## 输出内容

默认生成到当前项目 `.tmp/content-packages/`：

- `content.md`：平台无关正文。
- `metadata.json`：选题、标题、摘要、标签、目标渠道、内容状态和预审门禁。
- `review-checklist.md`：内容预审清单。
- `channels/`：渠道适配输出目录，例如 `channels/zhihu/`。
