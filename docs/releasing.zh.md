# 发布清单

> **当前状态（第三轮全局复核后核实）**：仓库 <https://github.com/Kirisame1969/dsh-project-based-learning> **存在但已转为 private**——已认证 API 返回 `"private": true`（`visibility: private`），未认证访问因此是 404；远端 `main` 仍停在发布时的 `372f381`（远端 `package.json` = 1.0.0），本地已到 **1.1.0**（提交 `ecf7b17`）。默认分支 `main`｜GitHub 已识别 MIT｜10 个 topics 保留。
>
> ⚠️ **发布前必须先决定这件事**：仓库处于私有状态时，① `package.json` 的 `repository`/`homepage`/`bugs` 三个 URL 对匿名访问者是 404（对外陈述与事实不符）；② 社区列表 PR 明确要求公开仓库。**恢复公开**是账号持有人的决定，不由本次修订代做。
>
> 本文件保留后续步骤（npm 发布、awesome 列表提交）与**本机 git 不通的修复方案**。

## 0. 已完成，不要重做

```bash
node test/entry.smoke.mjs                                   # 入口契约 + 资源齐全 → PASS
node skills/dsh-coach/scripts/coach-selftest.mjs            # 校验器回归 → 9/9 PASS
node skills/dsh-coach/scripts/coach-validate.mjs --state examples/state.demo.json
dsh-plugin-dev check                                        # 社区静态检查 → ok=true（9 通过 / 0 失败 / 2 警告）
```

- 占位已替换：`package.json` 三处 URL → `Kirisame1969/dsh-project-based-learning`；`author` → `Kirisame1969`；`LICENSE` 版权行 → `Kirisame1969`。
- 本地提交：`46fefba`（作者 `Kirisame1969 <2693719447@qq.com>`）。
- GitHub 仓库已创建（public）+ 描述 + 10 个 topics（`dsh`、`deepseek-harness`、`dsh-plugin`、`cordis`、`agent-skill`、`skill`、`project-based-learning`、`ai-tutor`、`unity`、`csharp`）。
- 内容已发布并逐文件比对与本地一致（`package.json`、`lib/index.js`、`cordis.patch.yml`、`SKILL.md`、`README.md` 全部一致）。

## 1. ⚠️ 本机 git 无法直接 push —— 先修这个

发布是靠 GitHub API 完成的，不是 git push。原因有两个，**互相独立**：

1. **HTTPS 到 github.com 对 git 不通**：`curl https://github.com` 返回 200，但 `git ls-remote` 连接超时 21 秒；换 `http.version=HTTP/1.1`、换 `http.sslBackend=openssl` 同样失败。像是安全软件/网络对 `git.exe` 的拦截。
2. **现有 SSH 密钥是别的仓库的部署密钥**：`ssh -T git@github.com` 回显 `Hi Kirisame1969/K19-Blogs!`，而部署密钥（deploy key）只能访问它所属的那个仓库，推送本仓库被拒：`Permission to ... denied to deploy key`。

**推荐修复**（SSH 通路本身是通的，所以这是最短路径）：

```powershell
ssh-keygen -t ed25519 -C "2693719447@qq.com"          # 一路回车即可
Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub" | Set-Clipboard
# 打开 GitHub → Settings → SSH and GPG keys → New SSH key → 粘贴 → 保存
ssh -T git@github.com                                  # 应回显 "Hi Kirisame1969!"（不再是 K19-Blogs）
cd coach
git remote set-url origin git@github.com:Kirisame1969/dsh-project-based-learning.git
git fetch origin
git reset --hard origin/main                           # 见下方说明
git push -u origin main
```

> **本地提交与远端提交的关系**：本地 `46fefba` 与远端 `470c526` **内容完全相同、SHA 不同**（远端是经 API 创建的根提交）。`git reset --hard origin/main` 不会丢内容；确认无误后再推。

## 2. 备用发布通道（当前环境已验证可用）

工作区根的 `.publish/publish-via-api.mjs`（**不在本仓库内**）用 gh 的 API 通路把整个目录作为一次根提交发布，适合 git 不可用时更新内容：

```powershell
cd C:\Users\26937\.DSH_workspace\EVE_VER.D
node .publish\publish-via-api.mjs coach Kirisame1969/dsh-project-based-learning
```

它做的事：`Contents API` 初始化空仓库 → `Git Data API` 建 tree（内联文件内容）→ 建**根提交** → 强制更新 `refs/heads/main`。全程不用 git 网络，也不用子进程管道。

## 3. 发布到 npm（可选但推荐）

```bash
npm login
npm publish --access public     # 包名 dsh-coach 目前未被占用（已核实）
```

发布后：

```bash
npm view dsh-coach version
dsh plugin --profile <profile> add dsh-coach
```

## 4. 提交到社区列表（"被搜到"的关键）

**已确认的提交形态**：向 [awesome-dsh-plugin/awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 提 PR，标题遵循仓库既有先例（已合并的 [PR #3405](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/3405)）：

```
feat(catalog): add dsh-vision-bridge by alaxrpg
```

即 `feat(catalog): add <插件名> by <GitHub 账号>`，内容是在目录 README 中增行。

相关仓库（按需一并提交）：

| 仓库 | 说明 |
|---|---|
| [awesome-dsh-plugin/awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) | 主列表（约 270 个插件），含 `contributing.md` 与 `PUSH-AND-PR.sh` |
| [dshworks/awesome-dsh-plugins](https://github.com/dshworks/awesome-dsh-plugins) | 平行列表，含 `CONTRIBUTING.md` |
| [0xsline/awesome-deepseek-harness](https://github.com/0xsline/awesome-deepseek-harness) | 另一个精选列表，含 `contributing.md` |
| [dsh-plugin-evaluation/dsh-plugin-evaluation-standards](https://github.com/dsh-plugin-evaluation/dsh-plugin-evaluation-standards) | 社区插件评测标准（投稿前值得对照自检） |

**提 PR 前请用浏览器读对方仓库的 contributing 文件**（本机抓取这些 raw 文件持续失败）。PR 描述里建议附上本仓库 README 的 "Verification status" 表。

## 5. 发布后

把 `CHANGELOG.md` 的 `[1.0.0]` 条目日期改为实际发布日期；如需 badge，把仓库 URL 加到 README 顶部。

## 仍未验证的两件事（已知即可）

1. **原生 `dsh plugin add` 的完整闭环**（add → 启动 → 技能出现在会话目录 → remove）。patch 已用 `dsh --profile web --dump-config --patch ./cordis.patch.yml` 在真实 profile 树中验证组合成立；缺的是安装与启动那一步（需写 `$DSH_HOME/profiles/`，新 profile 会连带 pnpm 下载整套 harness 核心）。
2. **领域包中标注「（未验证）」的 Unity 配方**：需在装有 Unity Editor 的机器上实测，实测后把标注改为实测结论并更新 `CHANGELOG.md`。
