# Changelog

本文件记录 dsh-coach 的对外变更。版本号含义：

- **插件包版本**（`package.json#version`）：npm 包与组合包层的版本。
- **引擎版本**（`SKILL.md` 与 `references/engine/` 的教学法逻辑）：`1.0.0` 起，交互协议变化才递增。
- **状态 schema 版本**（`state.json#schemaVersion`）：`1.0`，字段语义变化才递增。
- **领域包版本**（`references/domains/<id>/manifest.yml#version`）：各学科独立演进，与引擎版本解耦。

## [1.1.0] - 2026-03-09

**教学缺陷修复**（来自真实使用反馈：只问不教、过度要求实测、该教的让人自己悟）。引擎交互协议变化 → 引擎版本与插件包版本同步递增。

### 修复

- **新增 R9 讲授**：知识类内容不再要求学员自我发现。三条触发（学员明说没学过／诊断显示前置缺失／内容属事实性知识）**必须引用可见观察**；讲授为五步结构（概念 → 为什么需要 → 最小示例 → 用户亲自应用 → 确认题）；**技能类只改变"回补的形式"，不改变"先尝试"的顺序**；R9 明示"不是加速项"。同时修复了 `SKILL.md` 丢失原文限定词「在获得必要信息前」而变成**无条件禁令**的回归——那条禁令原本正面挡住了"零基础就直接讲"。
- **新增 R10 实测最小化**：只有"依赖运行时行为"且"静态阅读代码或文档无法判定"时才要求实测；要求时**必须给出所依据的文档章节或文件行号**。文档矛盾／版本差异属例外，仍须实测。
- **R3 拆为三类自述**：能力自述（线索）／缺口自述（**直接采信并转入讲授**）／操作自述（按部分验证接受，**不得要求重复实测，也不得要求补交实测材料**）。同步改写 `task-loop.md` 中"声称'我做了'不是证据"。
- **证据按结论类型分层**：知识类看"无提示解释机制 ＋ 迁移到新情境"（**单题正确只算部分验证**）；行为类看运行结果或材料。`artifact` 明确承认**问答记录**与**操作自述记录**；`review-acceptance.md` 声明"充分证据三条件**只用于阶段验收**"。
- **受阻路径补上讲授出口**：`task-loop.md`、`adapt.md`、`diagnosis.md` 三处终点各加"知识类缺失 → 按 R9 讲授"。
- **领域包题库加门槛**：每题新增 `类型`（事实性／推理性／综合）与 `前置知识`；**事实性题不得作为首次接触题**；Q1-1 移入《讲授后确认题》并补讲授要点；最小覆盖索引与按原型推荐组合同步更新（4 组组合补齐三类覆盖）；`example.md` 的示范同步改为"先讲授、再用 Q1-1 确认"的 R9 路径。

### 新增

- `evidence[].stage` 允许 `0`（**诊断期证据**），`PROGRESS.md` 显示为"诊断期"。
- 校验器新增 warn `ST-W7`：疑为"单题即发已验证"时提醒（**只提醒、不拦截**，取舍理由见 `docs/ENGINE-REVISION-2.zh.md` §7.3）。
- 指令 `先讲再做` / `讲一下 X`。
- `docs/zero-knowledge-path.zh.md`：零基础路径人工回归清单。

### 变更

- 双语 README 的「自述不算证据／Self-reports are not evidence」改为**三类自述**的准确表述，并补"知识直接教、技能才靠练"。
- `docs/ENGINE-REVISION-2.zh.md` 与三份第 1 轮独立审核报告（`docs/review-round1-{A-edu,B-eng,C-bounded}.zh.md`）：改动过程、被驳回项与理由。

### 未做（明确记录）

- **未**把 `evidence[].kind` 设为必填、**未**升 `schemaVersion`：第 1 轮三份审核一致认为该方案会被自贴标签绕过、与分层判据不等价，且会让既有 `schemaVersion=1.0` 的状态文件全部失败。留待下一版以"选填 + 缺失从严"的形式评估。

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
