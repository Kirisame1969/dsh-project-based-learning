# dsh-coach

**面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）的项目制学习教练。**

同一棵树同时提供两种形态：**技能（skill）**，以及可安装的**组合包（plugin bundle）**。教学引擎与学科内容分离——学科知识住在可整体替换的**领域包**里（当前提供 Unity / C#）。

它不靠讲课来"教"。它跑一条闭环：确认目标 → 用真实任务做诊断 → 建立有证据支撑的能力基线 → 设定分阶段可交付成果 → 让学员先动手 → 用分级问题审阅 → 依据证据判阶段通过与否。

## 为什么做这个

AI"辅导"通常掉进两个坑：从零开始照本宣科，或者直接替人把活干完。两者都毁掉学习。本项目把相反的规则写成了 agent 必须遵守的协议：

- **学员先尝试。** 完整答案是最后手段，不是第一步。
- **提示分级**（1 提醒目标 → 5 完整参考），未经请求跳到第 5 级是禁止的。
- **自述按三类区别对待**，既不一律采信、也不一律不采信：**能力自述**（"我熟练"）只是线索，不能单独作为已验证；**缺口自述**（"我没学过 X"）**直接采信并转入讲授**，而不是先考一遍；**操作自述**（"我跑了一次，输出是 X"）无反证时按部分验证接受——教练不会再要求你重跑一遍，也不会再要你先补截图。
- **知识直接教，技能才靠练。** 缺的是事实性知识（API 名称与签名、调用顺序、语言规则、文档已明的默认值）时，教练会**讲清楚**：概念 → 为什么你的任务需要它 → 最小示例 → 一道确认题。脚手架与分级提示用于**技能**（写代码、排错、设计），不用于事实。
- **AI 参与的成果，只有在学员能解释、修改、验证之后**才算作他的能力证据。
- **验收三档**（通过 / 有条件通过 / 未通过），证据充分性的判据是"可复现 + 可解释 + 可修改"。

这些规则不只是文字：一个**零依赖校验器**会在学员的状态文件上机械地执行它们。

## 快速开始

### 方式一：纯技能（无需构建、无依赖）

把技能目录拷进任意 DSH 技能根：

```powershell
# 项目级：只在该工作目录生效
Copy-Item -Recurse skills\dsh-coach <你的项目>\.dsh\skills\

# 用户级：所有工作区都生效（原生 DSH 默认 home 为 ~/.dsh）
Copy-Item -Recurse skills\dsh-coach "$env:DSH_HOME\skills\"
```

也提供带守卫与 `--dry-run` 的安装器：

```powershell
node skills\dsh-coach\scripts\coach-install.mjs --dry-run
node skills\dsh-coach\scripts\coach-install.mjs --dest-root "$env:DSH_HOME\skills"
```

### 方式二：组合包（插件）

```bash
dsh plugin --profile <profile> add /path/to/this/repo     # 本地检出
dsh --profile <profile> --dump-config                     # 应出现 dsh-coach 层
```

组合包层（`cordis.patch.yml`）通过 `ctx.skills.register()` 注册随包分发的技能。插件只消费 `skills` 服务，不 import 任何 harness 包，也不会带进第二份 Cordis。

### 方式三：完全不安装

把 agent 指向 `skills/dsh-coach/SKILL.md`，让它按该文件执行。所有内容（引擎协议、领域包、脚本）都是普通文件。

## 用法

加载后用自然语言指令驱动：

| 指令 | 作用 |
|---|---|
| `开始诊断` | 收集目标与经验，做三类最小覆盖诊断 |
| `制定路线` | 生成/调整阶段路线 |
| `本次任务：…` | 进入单次任务循环 |
| `给提示，级别 N` | 只给指定级别的提示 |
| `审阅成果：…` | 按五要素 + 依据 + 核对状态审阅 |
| `验收阶段` | 三档结论 + `userOnly` 逐项核对 + 检索式复述 |
| `复盘` | 能力变化 / 错误模式 / 下一步 |
| `调整节奏` | 按时间或难度调整路线 |
| `直接答案` | 给完整参考实现（记录为**不计**能力证据） |
| `查看学习档案` / `更新学习档案` | 读/写状态并校验 |

## 工作原理

```
skills/dsh-coach/
├── SKILL.md                  # 引擎：闭环、常驻规则、指令→必读文件映射
├── references/engine/        # 9 个协议文件，按需加载
├── references/domains/unity-csharp/   # 可替换的学科包（7 个文件）
├── assets/                   # 状态模板 + 任务卡/审阅/验收模板
└── scripts/                  # 零依赖校验器、回归自测、安装器
```

- **状态**在 `.coach/state.json`——唯一事实源；`.coach/PROGRESS.md` 由它渲染而来（**禁止手工编辑**）。
- **校验器**检查状态文件、领域包契约，以及一条**分层规则**：引擎文件中不得出现学科专有词条。每次可验收动作后运行：

  ```bash
  node skills/dsh-coach/scripts/coach-validate.mjs --state .coach/state.json --render
  ```

## 验证状态

我们区分"真的跑过"和"只是写在文档里"：

| 项目 | 状态 |
|---|---|
| `coach-selftest.mjs`（校验器回归，含对抗性夹具） | ✅ 9/9 通过 |
| `test/entry.smoke.mjs`（组合包入口契约） | ✅ 通过 |
| `dsh-plugin-dev check`（社区静态检查器） | ✅ 9 通过 / 0 失败（1 警告：五语 README，见下） |
| DSH Desktop 上的技能发现（项目技能根，免重启） | ✅ 已实测 |
| 原生 `dsh plugin add` 的端到端安装 | ⚠️ 尚未在原生 CLI 上执行（结构遵循官方 publish 教程） |
| 领域包中标注「（未验证）」的 Unity 配方 | ⚠️ 需在装有 Unity Editor 的环境实测 |

> 两条警告都是**该样板作者自身的文档约定**，本项目不采纳且已写明理由：① 期望五种语言的 README——官方 harness 仓库也只有中英双语；② 要求各语言 README 的**标题字符串完全相同**——官方包自己的 `README.zh.md` 用的就是翻译标题（如 `## 概述` 对 `## Overview`）。我们不做未经审校的机器翻译，也不为此改写标题。

## 替换学科特化

引擎学科无关；换学科**不需要改引擎**。新增 `references/domains/<new-id>/` 七个文件并按契约填 `manifest.yml` 即可，步骤见 [`CONTRIBUTING.md`](CONTRIBUTING.md) 与 `skills/dsh-coach/references/engine/domain-contract.md`。

## 环境要求

- Node.js `^22.19.0 || >=24.0.0`（脚本本身只需 ≥ 16.7 的 `fs.cpSync`；插件矩阵与 harness 对齐）。
- 无 npm 依赖、无构建步骤。`lib/index.js` 是手写来源，不是构建产物。

## 文档

- [`docs/installing.zh.md`](docs/installing.zh.md) —— 安装细则（原生 DSH / DSH Desktop / 各技能根），含实测与未实测标注
- [`docs/DESIGN-AUDIT.md`](docs/DESIGN-AUDIT.md) —— 三轮改动审核记录（含被**驳回**的自身建议、对抗性复核发现的缺陷与处置）
- [`docs/original-workflow.zh.md`](docs/original-workflow.zh.md) —— 作者本人的原始工作流文档（审核记录按行号引用它）

## 贡献

最受欢迎的贡献是**新增一个学科领域包**。请先读 [`CONTRIBUTING.md`](CONTRIBUTING.md)。

## 许可

[MIT](LICENSE)。
