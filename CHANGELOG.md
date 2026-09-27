# Changelog

本文件记录 `dsh-project-based-learning` 的对外变更。版本号含义：

- **插件包版本**（`package.json#version`）：npm 包与组合包层的版本。
- **状态 schema 版本**（`state.json#schemaVersion`）：`2.0`，字段语义变化才递增。
- **教学协议**：随包分发于 `skills/dsh-project-based-learning/`，不单独计版本。3.0 起不再有 2.x 的 `engineVersion` 字段。
- **领域导航**：`references/domains/<id>.md` 单文件，不单独计版本（2.x 的 `manifest.yml#version` 已取消）。

## [3.0.0] - 2026-09-27

**教学协议整体替换为先教学后实践的 2.0 结构。** 状态路径、状态 schema、领域导航结构与随包脚本全部不兼容，故按破坏性变更升主版本。

### 变更（破坏性）

- **教学协议整体替换**：`SKILL.md` 与 `references/` 换成 2.0 版本。核心循环由「诊断 → 阶段路线 → 任务循环 → 阶段验收」改为「**定位 → 教学 → 示范 → 实践 → 观察 → 反馈 → 邻近变化 → 调整 → 记录**」：把明确讲授作为正式环节，让初学者先获得足以行动的理解，再尽快进入真实实践。
- **状态路径由 `.coach/state.json` 改为 `.learning/state.json`**；`schemaVersion` 由 `1.0` 升为 `2.0`。旧路径不再被读写。
- **概念状态改为五档描述性状态**：`尚未接触` / `已讲授待实践` / `带练中` / `可在熟悉任务中独立使用` / `已迁移到新任务`。移除 `capability[].level` 数字等级、`status` 与 `impact` 维度打分；不再有数字评分或固定维度分级。
- **引擎文件由 `references/engine/`（9 个）改为平铺的 `references/`（5 个协议文件 + `domain-guidance.md`）**：`teaching-loop.md`、`planning-and-state.md`、`review-and-adapt.md`、`permissions.md`、`domain-guidance.md`。原 `intake` / `diagnosis` / `route` / `task-loop` / `review-acceptance` / `adapt` / `state` / `domain-contract` 全部退役。
- **领域包改为单文件导航**：`references/domains/<id>/`（7 文件 + `manifest.yml`）改为 `references/domains/<id>.md`，并新增 `references/domains/index.md` 作为选择入口。导航只保留「覆盖范围、粗略路线、关键门槛概念、常见误区与风险、教学取向、版本核对」，**不得**再含题库、固定课时、预制练习清单或验收量表。
- **`references/domains/unity-csharp/` 整包移除**（archetypes、diagnosis-bank、example、glossary、pitfalls、verification、manifest），由 `references/domains/unity-csharp.md` 取代。
- **随包脚本替换**：`coach-validate.mjs` / `coach-selftest.mjs` / `coach-install.mjs` 移除，改为 `validate-learning-state.mjs`（2.0 状态校验）与 `migrate-v1-state.mjs`（从 2.x 状态一次性迁移）。
- **`package.json#bin` 变更**：`coach-validate` 重新指向 `validate-learning-state.mjs`；新增 `coach-migrate`；移除 `coach-selftest` 与 `coach-install`。
- **`assets/` 由 4 个改为 2 个**：保留并更新 `state.template.json`（2.0 结构），新增 `lesson-note.md`；`review-report.md`、`stage-acceptance.md`、`task-card.md` 移除。
- **移除 `examples/` 与 `docs/`**，并从 `package.json#files` 中移除对应条目。
- **移除指令词表**：`开始诊断` / `制定路线` / `本次任务：…` / `给提示，级别 N` / `审阅成果：…` / `验收阶段` / `复盘` / `调整节奏` / `直接答案` / `查看学习档案` / `切换或替换学科：<id>` 不再存在。改由技能按请求自动选择五条教学车道（快速教学 / 单次带练 / 持续课程 / 成果审阅或排错 / 里程碑回顾），用户直接用自然语言说明要学什么即可。

### 新增

- **五条教学车道**：按请求选择最轻的一条；只有持续课程默认建档。
- **五档描述性概念状态**及其中三档（`带练中` / `可在熟悉任务中独立使用` / `已迁移到新任务`）**必须有实践证据**的机械门禁：讲授或示例本身不算证据。
- **`references/domain-guidance.md`**：领域导航的「应包含 / 不得包含」契约，使学科解耦由契约约束而非逐条检查。
- **`references/domains/unity-shader.md`**：新增 Unity Shader 领域导航（依赖图、门槛概念、透明渲染与过度绘制风险、版本核对）。
- **`references/domains/unity-csharp.md`**：以单文件粗粒度导航重写 Unity C# 方向。
- **`migrate-v1-state.mjs`**：`.coach/state.json` → `.learning/state.json` 一次性迁移，保留目标、完成判据、环境、非目标、当前任务与路线文字并压缩为 `now / next / later`；**不迁移数字能力等级**，也不把旧「已验证」自动映射为任何概念状态。
- **`assets/lesson-note.md`**：可选的单课记录模板。
- CI 新增「随包状态模板必须通过随包校验器」步骤；`test/entry.smoke.mjs` 改为从 `SKILL.md` **现场提取** Markdown 相对链接并逐个断言存在，避免引用列表与正文漂移。

### 移除（明确记录）

- **诊断题库**（原 16 题 × 7 维度）与**分级提示（1–5 级）**：题库只用于定位与分级，不再作为教学内容存在。
- **阶段验收三档结论**（通过／有条件通过／未通过）与 `PROGRESS.md` 生成视图（`coach-validate --render`）。
- **`coach-install.mjs` 与「只装技能文件」安装路径**：README 中 `npx -p dsh-project-based-learning coach-install` 的用法不再可用；需要独立技能副本时请自行复制 `skills/dsh-project-based-learning/`。
- **`coach-selftest.mjs` 回归自测**（含反向夹具与分层负例自动化）。
- **引擎分层机械检查**（「学科专有词不得出现在引擎文件中」）：2.0 改由 `domain-guidance.md` 的契约约束，**不再是机械门禁**。
- `references/engine/domain-contract.md` 契约与 `coach-validate.mjs --domain-dir` 领域包结构校验。
- 历史文档：`docs/DESIGN-AUDIT.md`、`docs/ENGINE-REVISION-2.zh.md`、`docs/installing.zh.md`、`docs/original-workflow.zh.md`、`docs/releasing.zh.md`、`docs/review-round1-{A-edu,B-eng,C-bounded}.zh.md`、`docs/zero-knowledge-path.zh.md`。

### 说明

- **技能注册名与 npm 包名均保持不变**，仍为 `dsh-project-based-learning`；`cordis.patch.yml` 无需改动。已有的安装命令与 `skill("dsh-project-based-learning")` 调用不受影响。
- **迁移脚本是有损的**：2.x 的 `strategy.assumptions`（可能含学员下发的格式约定）、`open`（未解决事项）、`authorizations`（授权范围）与 `routeChanges` 不会被搬进 2.0 结构，需人工补进 `preferences`、`decisions` 与 `context.exclusions`。
- `references/domains/unity-shader.md` 与 `unity-csharp.md` 均为**粗粒度导航**，不含预制示例代码；具体讲解、示例、练习与问题须围绕学习者当前作品即时生成。

## [2.0.1] - 2026-09-13

**仅同步随包文档。** 代码、技能、引擎与领域包与 2.0.0 逐字节相同（发布前已逐文件比对确认）。

### 文档

- README（中英）带上「让 DSH 自己装」的一键安装提示词，以及安装细节一节的小节改名；npm 页面渲染的是发布包内的 README，故需重新发版才能同步。

## [2.0.0] - 2026-09-12

**技能名与包名统一，学科机制文档化。** 技能注册名属于包的公开接口，改名会让引用旧名的提示词失效，故按破坏性变更升主版本。

### 变更（破坏性）

- **技能注册名由 `dsh-coach` 改为 `dsh-project-based-learning`**；技能目录由 `skills/dsh-coach/` 改为 `skills/dsh-project-based-learning/`。仓库名、npm 包名、技能名三者自此一致（社区先例：`dsh-ops-skill` 同样以一个同名技能分发）。引用旧技能名的提示词、脚本与文档需同步更新。
- `cordis.patch.yml` 的插件行 `id` 与加载器模块名同步为包名——该 `name` 必须等于 npm 包名，否则层加载会因模块解析失败而报错。

### 文档

- README 新增「学科与领域包」章节：折叠式列出随包提供的 Unity / C# 包内容（16 题 / 6 原型 / 5 配方 / 7 文件）；给出「让 AI 生成领域包」的可复制提示词；说明切换学科的指令与三条边界（缺小节回退通用行为、校验器不解析题库、领域包须位于技能目录内）。
- 指令手册补 `切换或替换学科：<id>`。
- 历史审核记录 `docs/DESIGN-AUDIT.md` 保留 1.0.0 / 1.1.0 时期的旧路径原文，仅在文首加一条改名勘误，不篡改记录。

### 说明

- **引擎版本保持 `1.1.0`**：本次不涉及教学法逻辑，只涉及技能标识与外层文档；`state.json#schemaVersion` 仍为 `1.0`。

## [1.1.0] - 2026-09-12

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

### 打包与发布

- **npm 包名**：`dsh-project-based-learning`（与仓库同名）。`cordis.patch.yml` 的 `name:` 必须等于包名，已同步。
- `@deepseek-ai/cordis` 与 `@deepseek-ai/dsh` 均标为 `optional` peer：profile 的 pnpm 配置为 `autoInstallPeers: false`，必装 peer 无法自动补装，会让首次 `dsh plugin add` 以退出码 1 结束。
- README 按社区惯例重写：首行语言互链、首屏给出可复制的安装命令；删除「验证状态」一类过程记录。

### 未做（明确记录）

- **未**把 `evidence[].kind` 设为必填、**未**升 `schemaVersion`：第 1 轮三份审核一致认为该方案会被自贴标签绕过、与分层判据不等价，且会让既有 `schemaVersion=1.0` 的状态文件全部失败。留待下一版以"选填 + 缺失从严"的形式评估。

## [1.0.0] - 2026-09-11

仓库：<https://github.com/Kirisame1969/dsh-project-based-learning>（默认分支 `main`，CI 在 ubuntu/windows × node 22/24 四组合全绿）

首个公开版本。

### 新增

- **教学引擎**（学科无关）：`skills/dsh-project-based-learning/SKILL.md` + `references/engine/`（intake、diagnosis、route、task-loop、review-acceptance、adapt、state、permissions、domain-contract）。
- **状态契约**：`.coach/state.json` 为唯一事实源，`.coach/PROGRESS.md` 为生成视图；含机械不变量与多项补充检查（1.0.0 时为 13 条；**1.1.0 增至 21 条**，见 `references/engine/state.md`）。
- **校验器**：`coach-validate.mjs`（状态层 + 领域包结构 + 引擎分层检查，零依赖）。
- **回归自测**：`coach-selftest.mjs`（含反向夹具与分层负例自动化；不启动子进程，可在受限沙箱内运行）。
- **安装器**：`coach-install.mjs`（复制或目录联接安装到技能根，含递归与覆盖守卫）。
- **Unity/C# 领域包**：`references/domains/unity-csharp/` —— 6 个项目原型、14 道诊断题（7 维度 ×2）、19 条陷阱分 9 组、5 条核对配方、完整示例、约 86 条术语。
- **组合包形态**：`lib/index.js` + `cordis.patch.yml`，把同一份技能注册为 DSH 运行时技能；`dsh-plugin-dev check` 通过。
- **文档**：`docs/DESIGN-AUDIT.md`（三轮改动审核记录，含被驳回的自身建议）、`docs/installing.zh.md`、双语 README、`CONTRIBUTING.md`。

### 已知限制

- 领域包中标注"（未验证）"的 Unity 命令需在装有 Unity Editor 的环境实测后才可用于验收判定。
- 校验器只覆盖状态层、领域包结构与引擎分层，不能验证对话质量。
