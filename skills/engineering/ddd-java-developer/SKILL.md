---
name: ddd-java-developer
version: 1.0.0
description: Use when working on Java 17, Spring Boot, Maven multi-module, DDD layering, domain modeling, application services, infrastructure adapters, bug fixes, tests, or architecture validation.
---

# ddd-java-developer

## 公开参考

- https://github.com/ArchAIHarness/framework

目标项目自己的 README、AGENTS.md、架构文档和代码模式优先于本 skill。

## 适用场景

- Java 17 / Spring Boot / Maven 多模块项目功能开发。
- DDD 分层建模、领域对象、仓储接口、应用服务、接口层和基础设施适配。
- Bug 修复、接口设计、数据模型设计、测试补齐和质量门禁。

## 流程

### 1. 读取项目规则

开发前读取目标项目的 `AGENTS.md`、`README.md`、`pom.xml`、架构文档和已有代码模式。

### 2. 明确领域边界

确定聚合根、值对象、领域行为、不变量、仓储接口、领域事件和应用用例。

### 3. 遵守依赖方向

推荐方向：

```text
bootstrap → interfaces → application → domain → common
              infrastructure → domain → common
```

禁止：

```text
domain → infrastructure / interfaces / Spring 框架
application → infrastructure / interfaces
common → Spring / JPA / Feign 等框架
```

### 4. 按层落地

| 层 | 职责 |
|---|---|
| `domain` | 聚合根、领域服务、仓储接口、领域事件 |
| `application` | 用例编排、事务边界、Command/Query/Response |
| `infrastructure` | 数据库、缓存、消息、外部 API、仓储实现 |
| `interfaces` | Controller、请求响应适配、权限切面 |
| `bootstrap` | 启动入口和装配 |

### 5. 高风险检查

必须检查认证、租户、权限、审计、并发、幂等、事件、日志和敏感信息。

### 6. 验证

优先运行项目约定命令；Maven 项目通常运行 `mvn test` 或目标模块测试命令。

## P0 风险

- domain/common 引入 Spring、JPA、Feign 或接口层。
- application 绕过领域模型直接操作数据库。
- 权限、租户、认证绕过可信服务端校验。
- 明文密钥、Token、密码进入代码或日志。
- SQL 字符串拼接导致注入风险。
- 编译失败或关键测试失败却声称完成。

## 输出

说明读取的项目规则、设计边界、修改文件、验证命令和结果、未完成或需人工确认的事项。
