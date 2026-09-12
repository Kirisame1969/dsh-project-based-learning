# 发布清单

> **当前状态（2026-09-12 核实）**：仓库 <https://github.com/Kirisame1969/dsh-project-based-learning> **已公开**（已认证 API 返回 `"private": false`，默认分支 `main`，GitHub 已识别 MIT，10 个 topics 保留）。远端 `main` = `43e3008`（**1.1.0**，CI 通过）；本地与远端一致。npm 包名定为本仓库同名 `dsh-project-based-learning`（发布前核实未被占用）。
>
> 本文件保留推送、npm 发布与社区列表投稿的步骤，以及本机通道的实测结论。

## 0. 已完成，不要重做

```bash
node test/entry.smoke.mjs                                   # 入口契约 + 资源齐全 → PASS
node skills/dsh-project-based-learning/scripts/coach-selftest.mjs            # 校验器回归 → 9/9 PASS
node skills/dsh-project-based-learning/scripts/coach-validate.mjs --state examples/state.demo.json
dsh-plugin-dev check                                        # 社区静态检查 → ok=true（9 通过 / 0 失败 / 2 警告）
```

- 占位已替换：`package.json` 三处 URL → `Kirisame1969/dsh-project-based-learning`；`author` → `Kirisame1969`；`LICENSE` 版权行 → `Kirisame1969`。
- GitHub 仓库已创建 + 描述 + 10 个 topics（`dsh`、`deepseek-harness`、`dsh-plugin`、`cordis`、`agent-skill`、`skill`、`project-based-learning`、`ai-tutor`、`unity`、`csharp`）。
- 内容已发布并逐文件比对与本地一致（`package.json`、`lib/index.js`、`cordis.patch.yml`、`SKILL.md`、`README.md` 全部一致）。
- 本地历史已 rebase 到远端 `372f381` 之上：`git diff <rebase 前 HEAD> HEAD` 为空，树完全一致，只是提交号变化。

## 1. 推送（通道已实测）

**可用通道：HTTPS + gh token**。`git push` 的 dry-run 已到达 GitHub 并完成鉴权（仅因当时尚无共同历史而被拒 non-fast-forward）：

```powershell
$t = gh auth token
$b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("x-access-token:$t"))
git -C coach -c http.extraheader="AUTHORIZATION: basic $b64" `
    push https://github.com/Kirisame1969/dsh-project-based-learning.git main
```

**只读通道：SSH**。`git fetch origin`（remote 为 `git@github.com:...`）可用——公开仓库允许任意有效密钥读取。但**写被拒**：本机现有密钥是另一个仓库（`K19-Blogs`）的部署密钥，部署密钥只能访问它所属的仓库。

> 换用 HTTPS 时注意：早前 `git push` 走默认凭据助手会失败（`schannel: AcquireCredentialsHandle failed`），因此上面的写法用 `http.extraheader` 直接带 token，不落盘、不进 URL。

## 2. 发布到 npm

```bash
npm login                        # 需要账号持有人完成浏览器授权
npm publish --access public      # 包名 dsh-project-based-learning（发布前已核实未被占用）
```

发布后自检：

```bash
npm view dsh-project-based-learning version
dsh plugin --profile web add dsh-project-based-learning
```

## 3. 提交到社区列表（"被搜到"的关键）

**已确认的提交形态**：向 [awesome-dsh-plugin/awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 提 PR，新增一个目录条目文件 `data/plugins/<owner>__<repo>.yml`（本地草稿在 `.publish/awesome-submission/`）。标题遵循仓库既有先例（已合并的 [PR #3405](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/3405)）：

```
feat(catalog): add dsh-project-based-learning by Kirisame1969
```

相关仓库（按需一并提交）：

| 仓库 | 说明 |
|---|---|
| [awesome-dsh-plugin/awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) | 主列表（数千条目），含 `contributing.md` |
| [dshworks/awesome-dsh-plugins](https://github.com/dshworks/awesome-dsh-plugins) | 平行列表，含 `CONTRIBUTING.md` |
| [0xsline/awesome-deepseek-harness](https://github.com/0xsline/awesome-deepseek-harness) | 另一个精选列表，含 `contributing.md` |
| [dsh-plugin-evaluation/dsh-plugin-evaluation-standards](https://github.com/dsh-plugin-evaluation/dsh-plugin-evaluation-standards) | 社区插件评测标准（投稿前值得对照自检） |

**提 PR 前请用浏览器读对方仓库的 contributing 文件**（本机抓取这些 raw 文件持续失败）。

## 4. 发布后

- 把 `CHANGELOG.md` 对应条目的「未发布」改为实际发布版本与日期。
- 打一个 release tag（社区里 8 个可比仓库中仅 1 个有 tag，非必需）。

## 5. 本机通道的实测结论（供排查用）

| 事项 | 结论 |
|---|---|
| 原生安装 `dsh plugin --profile <p> add <spec>` | ✅ 可用。`github:Kirisame1969/dsh-project-based-learning` 与 `file:<本地路径>` 均成功；profile 的 `package.json` 写入 `dsh.profile.bundles`，`--dump-config` 出现 `dsh-project-based-learning` 层 |
| profile 的 pnpm 配置 | `nodeLinker: hoisted`、`autoInstallPeers: false` → 必装 peer 无法自动补装，首次安装会以退出码 1 结束。因此 `peerDependenciesMeta` 必须把 `@deepseek-ai/cordis` 与 `@deepseek-ai/dsh` 都标为 `optional`（已改，实测退出码 0） |
| `dsh-plugin-dev verify` | pack ✅ / install ✅ / dump-config ✅；headless 冒烟 ✗，原因是临时 DSH_HOME 里官方基础插件 `@deepseek-ai/dsh-web-fetch-http` 找不到 `@deepseek-ai/dsh-http-proxy`，与本包无关 |
| `dsh` CLI 位置 | `%LOCALAPPDATA%\Programs\DSH Desktop\resources\app\node_modules\@deepseek-ai\dsh\lib\bin.js`（不在 PATH 上，调用时需给全路径或自建包装脚本） |

## 6. 已知限制

- 领域包中标注「（未验证）」的 Unity 配方：需在装有 Unity Editor 的机器上实测，实测后把标注改为实测结论并更新 `CHANGELOG.md`。
