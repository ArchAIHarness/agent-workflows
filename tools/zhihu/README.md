# tools/zhihu

知乎渠道管理相关工具目录。

当前能力：

- `zhihu_prepare_article`：将通用内容管理包或 Markdown 适配为知乎渠道包。
- `zhihu_browser_setup_guide`：在缺少浏览器自动化能力时，返回可复制的 OpenCode / Playwright MCP 配置引导、重启提醒、手动登录步骤和发布门禁说明。

## 渠道管理边界

知乎渠道只负责：

- 渠道内容获取：读取通用内容包或用户显式传入的 Markdown，生成知乎适配版本。
- 保存草稿：依赖浏览器自动化工具打开知乎创作页，由用户手动登录后辅助填写。
- 发布上线：必须用户明确回复“确认发布到知乎”或“确认更新知乎文章”。

知乎渠道不负责：

- 内容选题、内容生成、内容预审的通用逻辑；这些由 `tools/content` 承担。
- 读取、保存或导出 Cookie、Token、账号密码、`.env`、浏览器 profile。
- 绕过知乎登录、验证码、审核、风控或平台权限。

## 输出内容

当输入 `content_package_dir` 时，默认输出到：

```text
<content-package>/channels/zhihu/
```

包含：

- `article.zhihu.md`：知乎适配正文。
- `metadata.json`：渠道、标题、摘要、标签、来源内容包、发布门禁。
- `publish-checklist.md`：知乎发布前检查清单。
