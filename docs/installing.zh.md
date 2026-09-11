# 安装细则

本文覆盖 dsh-coach 的全部安装路径，并**明确区分"本机实测过"与"依据官方文档/结构推断"**。最后更新：第 4 轮构建（Bundle 形态落地）后。

## 先选路径

| 你的情况 | 选哪个 | 需要什么 |
|---|---|---|
| 只要在**当前项目**里用 | A1 项目级技能目录 | 无（复制文件即可） |
| 想在**所有工作区**用（原生 DSH） | A2 用户级技能根 | 知道 `$DSH_HOME`（默认 `~/.dsh`） |
| 已装 `dsh` CLI，且想按插件方式管理 | B 组合包 | `dsh` CLI；`dsh plugin add` 会调 pnpm |
| 用 DSH Desktop | C 市场或技能目录 | 桌面端；市场插件 `dshmarket` |
| 只想试一次 | D 直接让 agent 读 `SKILL.md` | 无 |

技能根与优先级的**官方约定**（来自 `@deepseek-ai/dsh-skill-filesystem` 文档）：

| Rank | 来源 | 路径 |
|---:|---|---|
| 100 | 项目 | `<项目根>/.dsh/skills` |
| 200 | 项目 | `<项目根>/.agents/skills` |
| 300 | 自定义 | `customSkillDirs` 配置项 |
| 400 | 用户 | `<DSH_HOME>/skills` |
| 500 | 用户 | `<AGENTS_HOME>/skills`（默认 `~/.agents`） |

> **项目根的定义**：最近一个包含 `.git` 的祖先目录；**若不存在，就是当前工作目录**。本机工作区没有 `.git`，因此项目级技能只在"以该目录为工作目录"的会话里出现——在它的子目录里开会话也找不到。要跨工作区，请用 A2。

## A. 纯技能安装

### A1 项目级

```powershell
# 在本仓库根执行；默认目标是 <cwd>/.dsh/skills/dsh-coach
node skills/dsh-coach/scripts/coach-install.mjs

# 先看会做什么（不写盘）
node skills/dsh-coach/scripts/coach-install.mjs --dry-run

# 用目录联接安装：源文件改动即时生效，适合边改边用
node skills/dsh-coach/scripts/coach-install.mjs --link
```

`--link` 在 Windows 上建立**目录联接（Junction）**，不需要管理员权限；其它平台建立目录符号链接。**分发时不要用 `--link`**——对方删掉你的源目录，技能就失效了。

### A2 用户级（跨工作区）

```powershell
node skills/dsh-coach/scripts/coach-install.mjs --dest-root "$env:DSH_HOME\skills"
# 原生 DSH 若未设置 DSH_HOME，其默认 home 为 ~/.dsh
```

### A3 其它技能根

任何被扫描的根都可以，只要目录名是技能名：

```powershell
node skills/dsh-coach/scripts/coach-install.mjs --dest-root "<项目根>\.agents\skills"
```

## B. 组合包（插件）安装

```bash
dsh plugin --profile <profile> add /path/to/dsh-coach     # 本地检出
dsh plugin --profile <profile> add dsh-coach              # 从 npm（发布后）
dsh --profile <profile> --dump-config                     # 应出现 "# == dsh-coach" 层
dsh --profile <profile>                                   # 启动
dsh plugin --profile <profile> remove dsh-coach           # 卸载（依赖与层一并移除）
```

层序（官方文档）：各组合包按 `dsh.profile.bundles` 顺序 → profile 自己的 `cordis.patch.yml` → `$DSH_HOME/cordis.patch.yml` → `--patch` overlay。

**前提**：目标 profile 已挂载 `@deepseek-ai/dsh-skill`（`@deepseek-ai/dsh-base` 已包含）。本插件通过 `ctx.skills.register()` 注册技能，不贡献工具、不插队、不覆盖既有行。

## C. DSH Desktop

- 桌面端有自己的插件界面（市场插件 `dshmarket`，站点 <https://dshmarket.com>，仓库 [dsh-market/dsh-market](https://github.com/dsh-market/dsh-market)）。若 dsh-coach 已被收录，可直接在界面里一键安装。
- 尚未收录时，用 A1/A2 的技能目录方式即可——桌面端同样扫描这些技能根。
- 桌面端把插件装在 `$DSH_HOME/profiles/<profile>/` 下的"代际"目录中，并通过 profile 的 `package.json` 依赖与 pnpm override 指向它。

## D. 不安装

让 agent 直接读本仓库的 `skills/dsh-coach/SKILL.md` 并按它执行。适合评估与调试。

## 怎么确认装好了

1. **会话技能目录**里出现 `dsh-coach`（模型会在下一步看到它）；
2. 让模型调用一次 `skill("dsh-coach")`，应返回技能正文，并在资源提示里给出技能目录的绝对路径；
3. 目录检查：`<技能根>/dsh-coach/SKILL.md` 存在，且 `references/domains/unity-csharp/` 下有 7 个文件。

## 卸载

- 纯技能：删除 `<技能根>/dsh-coach` 目录（联接方式则删除联接本身，源目录不受影响）。
- 组合包：`dsh plugin --profile <profile> remove dsh-coach`。
- 学习数据在**你自己的工作区** `.coach/` 下，与安装无关；卸载技能不会删除它。

## 实测状态

| 路径 | 状态 |
|---|---|
| A1 项目级安装（复制与 `--link` 两种模式）+ 免重启被发现 + `skill("dsh-coach")` 加载 | ✅ 已在 DSH Desktop 运行环境实测 |
| 安装器守卫（重复安装拒绝、`--force`、目标落在源内时中止） | ✅ 已实测 |
| B 组合包：`dsh-plugin-dev check` 静态检查 | ✅ 9 通过 / 0 失败 |
| B 组合包：patch 在真实 profile 树中的组合（`dsh --profile web --dump-config --patch ./cordis.patch.yml`） | ✅ 已实测：输出中出现 `dsh-coach` 层，无错误 |
| B 组合包：`dsh plugin add` → 启动 → 技能出现在会话目录 → 卸载 | ⚠️ **未实测**：需要写 `$DSH_HOME/profiles/`；新建 profile 还会连带下载整套 harness 核心（pnpm），属较重且有副作用的操作，待你确认后再做 |
| A2/A3 用户级与自定义技能根 | ⚠️ 依据官方技能根文档；本机未在这些根上实测（本机 `$DSH_HOME/skills` 与 `~/.agents/skills` 均不存在） |
| C 市场一键安装 | ⚠️ 取决于是否被 awesome 列表/市场收录 |

## 常见问题

- **技能没出现**：确认工作目录就是技能所在的项目根（没有 `.git` 时项目根 = 当前目录）；或新开一个会话/重启宿主。
- **`node` 找不到**：安装器与自测需要 Node ≥ 16.7（用 `fs.cpSync`）；本仓库在 Node 24 上验证。
- **`dsh: command not found`**：`dsh` CLI 由 DSH 发行版提供；用桌面端时它位于桌面的运行时里，不一定会进入 PATH。
- **改了源文件不生效**：若用复制模式安装，需要重新运行安装器（或加 `--force`）；`--link` 模式则即时生效。
