# 贡献指南

感谢你考虑为 dsh-coach 做贡献。本项目的核心设计是**教学法引擎与学科内容分离**，因此最有价值的贡献通常是**新增或改进一个领域包**。

## 环境要求

- Node.js `^22.19.0 || >=24.0.0`（与 `package.json#engines` 一致）
- **零运行时依赖**：本项目不引入构建步骤、不使用 npm 依赖。请保持这一点。

## 本地验证（提交前必须全绿）

```bash
node test/entry.smoke.mjs                                   # 组合包入口契约 + 技能资源齐全
node skills/dsh-coach/scripts/coach-selftest.mjs            # 校验器回归自测（含反向夹具与分层负例）
node skills/dsh-coach/scripts/coach-validate.mjs --state examples/state.demo.json
```

若你手上有 `dsh-plugin-guide` 提供的工具链，可再跑一次静态检查：

```bash
dsh-plugin-dev check --strict
```

## 贡献类型

### 1. 新增学科领域包（最欢迎）

引擎是学科无关的；学科内容全部住在 `skills/dsh-coach/references/domains/<domain-id>/`。新增一个学科 = 新增一个目录，**不需要改引擎**。

**步骤**

1. 读契约：`skills/dsh-coach/references/engine/domain-contract.md`。
2. 新建 `references/domains/<domain-id>/`，按契约补齐七个文件：
   `manifest.yml`、`archetypes.md`、`diagnosis-bank.md`、`verification.md`、`pitfalls.md`、`example.md`、`glossary.md`。
3. `manifest.yml` 必须恰好包含契约规定的 8 个键（不增删），且 `id` 与目录名一致。
4. 跑校验器确认契约通过：

   ```bash
   node skills/dsh-coach/scripts/coach-validate.mjs --state examples/state.demo.json --domain-dir skills/dsh-coach/references/domains/<domain-id>
   ```

**内容要求（会被人工审）**

- 诊断题必须贴合真实项目，而不是通用考试；每题标注考察维度与最小诊断类别（理解预测 / 问题定位 / 小型实现）。
- 核对配方必须可复制执行，并标注前置条件、期望输出、失败含义、所需沙箱模式、AI 能否代执行。
- 无法实测的命令必须在行内标注「（未验证）」，并说明原因——**这是硬性要求**，不要凭记忆编造命令或 API。
- 陷阱条目要写出机制，而不只是症状。

### 2. 改引擎

引擎文件是 `skills/dsh-coach/SKILL.md` 与 `references/engine/*.md`。

**红线**：`SKILL.md`、`references/engine/*.md`、`assets/*.md` 中**不得出现学科专有词条**。校验器的 `LY01` 检查会用硬令牌黑名单拦截（NFKC 归一化 + 整词匹配；`scripts/` 不参与扫描，因为校验器自身含词表）。这条红线是"可替换特化"能成立的唯一保证。

改教学法规则时，请在 PR 描述里说明：**原规则的失败场景是什么、为什么必须改**。本项目对引擎改动采用保守流程——参见 `docs/DESIGN-AUDIT.md` 记录的六项检验（必要性 / 最小性 / 反方论证 / 回归 / 可验证 / 复审），其中多条"看起来更好"的改动被明确驳回。

### 3. 改校验器与工具

`skills/dsh-coach/scripts/` 下三个脚本，同样零依赖：

- 新增不变量时，**必须同时**：在 `references/engine/state.md` 声明该不变量、在 `coach-selftest.mjs` 增加断言、并在反向夹具 `examples/state.selftest-invalid.json` 里覆盖它。
- 禁止引入子进程与管道（受限沙箱下会失败）；自测必须在进程内调用校验函数。
- 只读代码路径不得写文件；写文件路径必须可清理。

## 提交 PR

1. 分支命名：`feat/domain-<id>`、`fix/engine-<topic>`、`chore/<topic>`。
2. 提交信息：祈使句，说明**为什么**；领域包 PR 请附上题目/配方的来源或实测记录。
3. 确认清单：
   - [ ] 上述三条本地验证命令全绿
   - [ ] 未把学科词条写进引擎文件
   - [ ] 新领域包补了 `example.md`（填好的基线 + 阶段 + 审阅 + 验收结论）
   - [ ] 无法实测的命令已标「（未验证）」
   - [ ] `CHANGELOG.md` 在"未发布"处补了条目（如有）
4. 若你要把插件收录进社区列表，那是**另一个仓库**的 PR：[awesome-dsh-plugin/awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)（另有 [dshworks/awesome-dsh-plugins](https://github.com/dshworks/awesome-dsh-plugins)）。请先读该仓库的 `contributing.md` 再提。

## 许可

本项目为 MIT。提交贡献即表示你同意以 MIT 许可发布你的贡献。
