# Changelog

本文件记录 dsh-coach 的对外变更。版本号含义：

- **插件包版本**（`package.json#version`）：npm 包与组合包层的版本。
- **引擎版本**（`SKILL.md` 与 `references/engine/` 的教学法逻辑）：`1.0.0` 起，交互协议变化才递增。
- **状态 schema 版本**（`state.json#schemaVersion`）：`1.0`，字段语义变化才递增。
- **领域包版本**（`references/domains/<id>/manifest.yml#version`）：各学科独立演进，与引擎版本解耦。

## [1.0.0] - 2026-03-09

仓库：<https://github.com/Kirisame1969/dsh-project-based-learning>（默认分支 `main`，CI 在 ubuntu/windows × node 22/24 四组合全绿）

首个公开版本。

### 新增

- **教学引擎**（学科无关）：`skills/dsh-coach/SKILL.md` + `references/engine/`（intake、diagnosis、route、task-loop、review-acceptance、adapt、state、permissions、domain-contract）。
- **状态契约**：`.coach/state.json` 为唯一事实源，`.coach/PROGRESS.md` 为生成视图；含 13 条机械不变量之外的多项补充检查。
- **校验器**：`coach-validate.mjs`（状态层 + 领域包结构 + 引擎分层检查，零依赖）。
- **回归自测**：`coach-selftest.mjs`（含反向夹具与分层负例自动化；不启动子进程，可在受限沙箱内运行）。
- **安装器**：`coach-install.mjs`（复制或目录联接安装到技能根，含递归与覆盖守卫）。
- **Unity/C# 领域包**：`references/domains/unity-csharp/` —— 6 个项目原型、14 道诊断题（7 维度 ×2）、19 条陷阱分 9 组、5 条核对配方、完整示例、约 86 条术语。
- **组合包形态**：`lib/index.js` + `cordis.patch.yml`，把同一份技能注册为 DSH 运行时技能；`dsh-plugin-dev check` 通过。
- **文档**：`docs/DESIGN-AUDIT.md`（三轮改动审核记录，含被驳回的自身建议）、`docs/installing.zh.md`、双语 README、`CONTRIBUTING.md`。

### 已知限制

- 领域包中标注"（未验证）"的 Unity 命令需在装有 Unity Editor 的环境实测后才可用于验收判定。
- 组合包安装路径已在 DSH Desktop 的运行环境下验证技能可被加载；原生 `dsh plugin add` 的端到端流程尚未在原生环境实测。
- 校验器只覆盖状态层、领域包结构与引擎分层，不能验证对话质量。
