# 发布清单

> **当前状态（2026-09-27 核实）**：仓库 <https://github.com/Kirisame1969/dsh-project-based-learning> 已公开，默认分支 `main`。
> 远端 `main` = `32db71e`（**3.0.0**，教学协议替换）。npm 上已发布 `1.1.0` / `2.0.0` / `2.0.1`，`latest` = `2.0.1`。
>
> 本文件记录推送、npm 发布、本机安装同步与社区列表投稿的步骤，以及本机通道的**实测**结论。

## 0. 发布前自检

```bash
node test/entry.smoke.mjs
node skills/dsh-project-based-learning/scripts/validate-learning-state.mjs \
     --state skills/dsh-project-based-learning/assets/state.template.json
npm pack --dry-run     # 期望：21 files，约 40 kB
```

三项都应退出码 0。`npm pack --dry-run` 的清单里**不应**出现 `test/`、`docs/`、`examples/`、`node_modules/`（`package.json#files` 白名单控制）。

## 1. 推送 GitHub

### 通道实测结论（2026-09-27，本机）

| 通道 | 结论 |
|---|---|
| HTTPS 直连 `github.com` | ❌ **网络层不通**。`Test-NetConnection github.com -Port 443` 为 False，`git ls-remote` 报 `Recv failure: Connection was reset` |
| HTTPS 经本地代理 | ✅ **可用**。本机代理监听 `127.0.0.1:7897`（Clash 混合端口；端口随代理软件配置变化，用前先确认） |
| SSH（`git@github.com:...`） | ⚠️ **只读可用、写被拒**。`ls-remote` 正常，`push` 报 `Permission to ... denied to deploy key`——本机现有密钥是**另一个仓库**（`K19-Blogs`）的部署密钥 |
| `api.github.com` / `raw.githubusercontent.com` / `codeload.github.com` | ✅ 直连可达（注意：只有 `github.com` 本身被阻断） |

结论：**推送必须走「HTTPS + 代理 + gh token」**，SSH 不能用于写。

### 推送命令

```powershell
$repo = "<仓库根>"
$url  = "https://github.com/Kirisame1969/dsh-project-based-learning.git"
$proxy = "http://127.0.0.1:7897"

$t   = gh auth token
$b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("x-access-token:$t"))

# 先 dry-run 确认鉴权与快进关系
git -C $repo -c http.proxy=$proxy -c https.proxy=$proxy `
    -c http.extraheader="AUTHORIZATION: basic $b64" push --dry-run $url main

git -C $repo -c http.proxy=$proxy -c https.proxy=$proxy `
    -c http.extraheader="AUTHORIZATION: basic $b64" push $url main
```

用 `http.extraheader` 直接带 token，**不落盘、不写进 URL**。`gh` 需要处于已登录状态（`gh auth status` 应显示账号 `Kirisame1969` 与 `repo` 权限）。

推送后用 API 独立核实，不要只看 git 的输出：

```bash
gh api repos/Kirisame1969/dsh-project-based-learning/git/ref/heads/main
gh api repos/Kirisame1969/dsh-project-based-learning --jq .pushed_at
```

> **注意**：`origin` 配置的是 SSH 地址，只适合 fetch。推送请像上面那样显式给出 HTTPS URL，不要改 `origin`。

## 2. 发布 npm

```bash
npm login                        # 浏览器授权，由账号持有人完成
npm publish --access public
```

发布后自检：

```bash
npm view dsh-project-based-learning version      # 应显示新版本
npm view dsh-project-based-learning versions
```

### 凭据注意

- token 存放在 `~/.npmrc` 的 `//registry.npmjs.org/:_authToken=`。**token 会被吊销或过期**：2026-09-27 实测该文件里的 token 格式完全合法（40 字符、`npm_` 前缀、无 BOM、无多余引号空格），但 `npm whoami` 与直接 `Bearer` 请求 `/-/whoami` 均返回 **401**。遇到 401 先换 token，不要怀疑配置文件。
- 若账号开了 2FA（`auth-and-writes`），`npm publish` 会要求一次性口令。**Automation 类型 token 可绕过 2FA**，适合脚本化发布；经典 token 需要 `--otp=<code>`。

## 3. 更新本机 DSH 安装

发布后把 profile 依赖从旧版本切到新版本：

```powershell
$dsh = "C:\Users\26937\AppData\Local\Programs\DSH Desktop\resources\app.asar.unpacked\node_modules\@deepseek-ai\dsh\lib\bin.js"
node $dsh plugin --profile web add dsh-project-based-learning@3.0.0
node $dsh --profile web --dump-config     # 应出现 dsh-project-based-learning 层
```

装完需**重启 Harness**（菜单 Harness → 重启 Harness，`Ctrl+Shift+R`）。技能正文是插件在 `apply()` 时一次性读入的，不重启不会换版。

### 坑：DSH 更新会把 profile 里的插件退回 registry 版本

DSH Desktop 更新时会重跑 profile 的 pnpm install。此时 profile 的 `package.json` 里依赖标记若仍是旧范围（例如 `^2.0.0`），pnpm 会从 registry 拉回旧版并**覆盖**手工同步进去的新内容——表现为"明明换过，更新后又变回去了"。

判断依据：`node_modules/<包名>/package.json` 的 mtime 会保持 npm 发布时的时间（pnpm 从 store 还原会保留 mtime），而不是你同步的时间。

规避：发布后立刻用上面的 `add <包名>@<新版本>` 把依赖标记更新到位；开发期可临时用 `add file:<本地仓库路径>` 链到工作副本。

## 4. 本机环境实测结论

| 事项 | 结论 |
|---|---|
| `dsh` CLI 位置 | `%LOCALAPPDATA%\Programs\DSH Desktop\resources\app.asar.unpacked\node_modules\@deepseek-ai\dsh\lib\bin.js`。**不在 PATH 上**，调用需全路径或自建包装脚本。注意旧路径 `resources\app\node_modules\...` 在 0.1.7 之后**已不存在** |
| profile pnpm 配置 | `nodeLinker: hoisted`、`autoInstallPeers: false` → 必装 peer 无法自动补装，首次安装会以退出码 1 结束。因此 `peerDependenciesMeta` 必须把 `@deepseek-ai/cordis` 与 `@deepseek-ai/dsh` 都标为 `optional` |
| profile 位置 | `%APPDATA%\dsh-desktop\harness\profiles\<profile>\`（桌面端默认 profile 为 `web`） |
| `dsh plugin add` 的退出码 | 输出里若只有 pnpm 的 peer 警告，且 stdout 为 `Done in ...`，则安装成功。PowerShell 会把 stderr 的提示行变成 `NativeCommandError` 并让整条命令显示为非 0——**用 `2>文件` 重定向后看 `$LASTEXITCODE` 才是真实退出码** |
| 手动同步插件的可验证方式 | 对 `node_modules/<包名>/lib/index.js` 用桩 ctx 调 `apply()`，断言注册出的 `name` / `description` / `content` 长度符合预期；这一步不需要重启 Harness |

## 5. 提交到社区列表

向 [awesome-dsh-plugin/awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 提 PR，新增一个目录条目文件 `data/plugins/<owner>__<repo>.yml`。标题遵循既有先例：

```
feat(catalog): add dsh-project-based-learning by Kirisame1969
```

相关仓库（按需一并提交）：

| 仓库 | 说明 |
|---|---|
| [awesome-dsh-plugin/awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) | 主列表，含 `contributing.md` |
| [dshworks/awesome-dsh-plugins](https://github.com/dshworks/awesome-dsh-plugins) | 平行列表，含 `CONTRIBUTING.md` |
| [0xsline/awesome-deepseek-harness](https://github.com/0xsline/awesome-deepseek-harness) | 另一个精选列表 |
| [dsh-plugin-evaluation/dsh-plugin-evaluation-standards](https://github.com/dsh-plugin-evaluation/dsh-plugin-evaluation-standards) | 社区插件评测标准，投稿前值得对照自检 |

**提 PR 前请用浏览器读对方仓库的 contributing 文件。**

## 6. 发布后

- 把 `CHANGELOG.md` 对应条目的日期核实一遍，必要时打 release tag。
- 若本次改动影响了安装命令或技能注册名，检查 README（中英）的「快速开始」提示词里的版本号门槛。

## 7. 已知限制

- **迁移脚本是有损的**：2.x 的 `strategy.assumptions`（可能含学员下发的格式约定）、`open`、`authorizations` 与 `routeChanges` 不进入 2.0 结构，需人工补进 `preferences`、`decisions` 与 `context.exclusions`。
- **3.0 起「学科专有词不得进入教学协议文件」不再是机械门禁**：原 `LY01` 检查随 `coach-validate.mjs` 一并移除，改由 `references/domain-guidance.md` 的契约约束，只能靠人工与评审把关。
- **没有反向夹具自动回归**：CI 目前只覆盖「入口契约」与「随包状态模板自校验」两步。校验器能否正确**拒绝**非法状态，没有自动化覆盖。
- **校验器不容忍 UTF-8 BOM**：Windows 上记事本或 `Set-Content` 容易写出带 BOM 的 JSON，`JSON.parse` 会直接失败并报「无法读取或解析状态文件」，错误信息不指向真正原因。
- **`assets/lesson-note.md` 当前未被 `SKILL.md` 引用**，纯随包分发，不会按需加载。
