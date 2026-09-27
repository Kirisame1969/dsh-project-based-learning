# 贡献指南

感谢你考虑为 dsh-project-based-learning 做贡献。本项目的核心设计是**教学法与学科内容分离**，因此最有价值的贡献通常是**新增或改进一份领域导航**。

## 环境要求

- Node.js `^22.19.0 || >=24.0.0`（与 `package.json#engines` 一致）
- **零运行时依赖**：本项目不引入构建步骤、不使用 npm 依赖。请保持这一点。

## 本地验证（提交前必须全绿）

```bash
node test/entry.smoke.mjs                    # 组合包入口契约 + SKILL.md 链接与随包资源齐全
node skills/dsh-project-based-learning/scripts/validate-learning-state.mjs \
     --state skills/dsh-project-based-learning/assets/state.template.json
```

（等价写法：`npm run smoke` 与 `npm run validate`。）

若你手上有 `dsh-plugin-guide` 提供的工具链，可再跑一次静态检查：

```bash
dsh-plugin-dev check --strict
```

## 贡献类型

### 1. 新增领域导航（最欢迎）

教学协议是学科无关的；学科内容全部住在 `skills/dsh-project-based-learning/references/domains/`。新增一个学科 = 新增**一个单文件**，并在 `domains/index.md` 加一行指向它——**不需要改教学协议**。

**步骤**

1. 读契约：`skills/dsh-project-based-learning/references/domain-guidance.md`。
2. 新建 `references/domains/<domain-id>.md`。
3. 在 `references/domains/index.md` 增加一行，把尖括号占位符换成真实值：

   ```markdown
   - <适用场景描述>：[<domain-id>.md](<domain-id>.md)
   ```

4. 跑本地验证命令确认链接与随包资源齐全。

**内容要求（会被人工审）**

一份导航**应包含**：

- 领域覆盖范围和典型作品；
- 粗略阶段与关键依赖（写成依赖图，不是课程表）；
- 少数不能轻易跳过的门槛概念；
- 常见误区、安全风险和版本敏感点；
- 必要时建议优先查阅的官方资料类型。

一份导航**不得包含**：

- 诊断题库、答案或固定测验；
- 逐课讲稿、固定课时和完整课程树；
- 预制练习清单、任务卡或验收量表；
- 为每个概念准备的固定示例代码；
- 穷举式术语表。

保持**单文件、粗粒度**。具体讲解、示例、练习与问题必须由 agent 围绕学习者当前作品**即时生成**，不写回导航。只有长期有效的路线依赖、稳定风险或版本边界才值得维护进导航。

无法实测的命令必须在行内标注「（未验证）」并说明原因——**这是硬性要求**，不要凭记忆编造命令或 API。

### 2. 改教学协议

教学协议是 `skills/dsh-project-based-learning/SKILL.md` 与 `references/*.md`。

**红线**：`SKILL.md` 与 `references/*.md`（`domains/` 除外）中**不得出现学科专有词条**。这条红线是「可替换特化」能成立的唯一保证。

> ⚠️ **3.0 起该红线不再有机械门禁。** 2.x 的 `coach-validate.mjs` 有一个 `LY01` 检查（硬令牌黑名单 + NFKC 归一化 + 整词匹配）会自动拦截；该脚本已在 3.0 移除，现在**只能靠人工与评审把关**。改协议时请显式自查这一点。

改教学法规则时，请在 PR 描述里说明：**原规则的失败场景是什么、为什么必须改**。请特别留意 `SKILL.md` 的「不可违背的教学原则」一节——这些条款对应 `PORTING-BRIEF` 级的教学不变量，不要在没有充分理由的情况下弱化或删除。

### 3. 改状态 schema 与脚本

`skills/dsh-project-based-learning/scripts/` 下两个脚本，同样零依赖：

- **改状态结构时**，必须同步三处：`assets/state.template.json` 模板、`validate-learning-state.mjs` 的校验规则、`references/planning-and-state.md` 的字段说明；若涉及不兼容变化，还要升 `schemaVersion` 并更新 `migrate-v1-state.mjs`。
- **五档概念状态**（`尚未接触` / `已讲授待实践` / `带练中` / `可在熟悉任务中独立使用` / `已迁移到新任务`）中，后三档在语义上要求实践证据；校验器**必须**保留这条机械门禁——它防止"讲授即掌握"被写进状态。
- 禁止引入子进程与管道（受限沙箱下会失败）。
- 只读代码路径不得写文件；写文件路径必须可清理。

## 提交 PR

1. 分支命名：`feat/domain-<id>`、`fix/protocol-<topic>`、`chore/<topic>`。
2. 提交信息：祈使句，说明**为什么**；领域导航 PR 请附上内容来源或实测记录。
3. 确认清单：
   - [ ] 上述两条本地验证命令全绿
   - [ ] 未把学科词条写进教学协议文件（`domains/` 除外）
   - [ ] 新领域导航已在 `domains/index.md` 注册，且不含题库／固定课时／预制练习／术语表
   - [ ] 无法实测的命令已标「（未验证）」
   - [ ] 若改了状态结构，模板、校验器、字段文档三处已同步
   - [ ] `CHANGELOG.md` 在「未发布」处补了条目（如有）
4. 若你要把插件收录进社区列表，那是**另一个仓库**的 PR：[awesome-dsh-plugin/awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)（另有 [dshworks/awesome-dsh-plugins](https://github.com/dshworks/awesome-dsh-plugins)）。请先读该仓库的 `contributing.md` 再提。

## 许可

本项目为 MIT。提交贡献即表示你同意以 MIT 许可发布你的贡献。
