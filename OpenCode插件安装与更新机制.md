# OpenCode 插件安装与更新机制

本文记录 `agent-workflows` 在 OpenCode 中的安装、缓存、更新和版本发布策略。结论来自 OpenCode 官方文档、`https://opencode.ai/config.json` schema、OpenCode 源码和 Superpowers 的 OpenCode 安装文档。

## 结论

OpenCode 支持两类插件来源：

1. **本地插件**：放在 `.opencode/plugins/` 或 `~/.config/opencode/plugins/`，启动时直接加载。
2. **包插件**：在 `opencode.json` 的 `plugin` 数组里配置 npm/git package spec，OpenCode 启动时通过 Bun/npm 机制安装并缓存。

对于 git-backed package spec，例如：

```json
{
  "plugin": ["archai-agent-workflows@git+https://github.com/ArchAIHarness/agent-workflows.git"]
}
```

OpenCode 会把插件安装到本地 package cache。若缓存中已经存在该 package，普通重启不保证重新解析远端 `main` 最新提交。

因此：

- 不应把“推送 main 后用户重启即可更新”作为正式发布策略。
- 正式用户推荐使用 tag/commit pin 或 npm semver 版本。
- 开发验证推荐使用本地 `file://` 插件路径。

## 官方机制依据

### OpenCode 文档

OpenCode 官方插件文档说明：

- 本地插件目录：
  - `.opencode/plugins/`
  - `~/.config/opencode/plugins/`
- npm 插件在 `opencode.json` 中通过 `plugin` 数组配置。
- npm plugins 会在启动时自动安装，并缓存 package 与依赖。

OpenCode 的 `autoupdate` 配置是 OpenCode 主程序自动更新，不是插件依赖更新机制。

### OpenCode schema

`https://opencode.ai/config.json` 中 `plugin` 字段是数组，元素支持：

- string package spec
- `[package, options]` tuple

这意味着 GitHub/git package spec、npm semver、file path 都走同一个插件声明入口。

### OpenCode 源码

OpenCode 的 package 安装逻辑位于 `packages/core/src/npm.ts`。核心行为是：

1. 用 package spec 生成 cache 目录：
   ```text
   <global-cache>/packages/<sanitized-package-spec>
   ```
2. 若 `node_modules/<package-name>` 已存在，直接解析 entrypoint 并返回。
3. 只有不存在时才执行 `arborist.reify({ add: [pkg] })` 安装。

这说明普通重启不会强制重新解析 git 远端 HEAD。

### Superpowers 文档

Superpowers 的 OpenCode 安装文档也采用 git-backed package spec：

```json
{
  "plugin": ["superpowers@git+https://github.com/obra/superpowers.git"]
}
```

其更新说明明确指出：

- 一些 OpenCode/Bun 版本会把 git dependency 固定在 lockfile/cache 中。
- 重启可能拿不到最新 Superpowers commit。
- 如果更新没有出现，需要清理 OpenCode package cache 或 reinstall plugin。
- 如果要 pin 版本，可以使用 tag：
  ```json
  {
    "plugin": ["superpowers@git+https://github.com/obra/superpowers.git#v5.0.3"]
  }
  ```

`agent-workflows` 应采用同样的发布和更新口径。

## 推荐使用模式

### 1. 开发模式：本地 file 插件

适合维护者本地开发和调试。

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "file:///absolute/path/to/agent-workflows/opencode-plugin.js"
  ]
}
```

特点：

- 不经过 OpenCode package cache。
- 重启后直接加载本地源码。
- 适合验证新 tools、skills、plugin hooks。
- 不适合作为普通用户安装方式。

### 2. 正式 GitHub 发布：tag pin

适合当前阶段的真实用户验证和稳定发布。

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "archai-agent-workflows@git+https://github.com/ArchAIHarness/agent-workflows.git#v0.2.0"
  ]
}
```

特点：

- 版本明确。
- 不依赖无 tag 的 `main` 缓存刷新。
- 升级时修改 tag 并重启 OpenCode。
- 每次正式能力发布都应创建 Git tag。

升级示例：

```json
{
  "plugin": [
    "archai-agent-workflows@git+https://github.com/ArchAIHarness/agent-workflows.git#v0.2.1"
  ]
}
```

### 3. 追 main：仅作临时体验

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "archai-agent-workflows@git+https://github.com/ArchAIHarness/agent-workflows.git"
  ]
}
```

特点：

- 首次安装可能拿到当前 `main`。
- 已安装用户可能继续使用旧缓存。
- 普通重启不保证更新。
- 不建议作为正式用户推荐安装方式。

### 4. 长期产品化：npm semver

未来如果 `agent-workflows` 发布到 npm，可推荐：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["archai-agent-workflows@0.2.0"]
}
```

特点：

- 最符合 OpenCode 官方“From npm”的主路径。
- semver 清晰。
- 适合更广泛公开用户。
- 需要维护 npm package 发布权限和版本策略。

## 发布流程建议

每次正式发布 `agent-workflows` 时：

1. 完成实现和测试。
2. 运行验证：
   ```bash
   node --check opencode-plugin.js
   node --check .opencode/plugins/archai-agent-workflows.js
   node -e "const fs=require('fs'); const p=require('./package.json'); if(!fs.existsSync(p.main)) process.exit(1); console.log(p.main)"
   node --test tools/zhihu/zhihu-tools.test.js tools/xiaohongshu/xiaohongshu-tools.test.js tools/juejin/juejin-tools.test.js
   ```
3. 提交并推送 `main`。
4. 创建语义化 tag，例如：
   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```
5. 更新安装文档中的推荐版本。
6. 用户升级时修改 `opencode.json` 中的 tag，并重启 OpenCode。

## 故障排查

### 新工具没有出现

先检查当前配置是否使用了明确版本：

```json
"plugin": [
  "archai-agent-workflows@git+https://github.com/ArchAIHarness/agent-workflows.git#v0.2.0"
]
```

再重启 OpenCode。

如果仍没有出现：

1. 检查 OpenCode logs。
2. 检查 package cache 中是否安装了对应 tag/commit。
3. 确认插件包内是否存在目标文件，例如：
   - `tools/xiaohongshu/xiaohongshu-tools.js`
   - `tools/juejin/juejin-tools.js`
   - `skills/content/xiaohongshu-publisher/SKILL.md`
4. 必要时清理 OpenCode package cache 或 reinstall plugin。

### 不建议直接依赖清缓存

清缓存适合排障或强制刷新，但不是正式用户升级策略。正式升级应优先通过修改 tag/版本号触发新的安装解析。

## 当前推荐策略

`agent-workflows` 当前阶段采用：

- 维护者开发：`file://` 本地路径。
- 真实用户验证：Git tag pin。
- 普通说明：无 tag 的 `main` 仅作临时体验，不承诺重启更新。
- 长期目标：发布 npm semver 包。
