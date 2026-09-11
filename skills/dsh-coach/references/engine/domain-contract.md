# Domain Contract：领域包契约（可替换特化内容）

来源：分层设计目标；改动经审核裁定 C1（引擎与领域分离）、W09、W11。

## 目的

教学法内核不动，学科内容可整体替换。替换一个学科 = 换一个目录 + 改状态里的 `domain` 字段，引擎逻辑不重写。

## 目录

```
references/domains/<domain-id>/
  manifest.yml
  archetypes.md
  diagnosis-bank.md
  verification.md
  pitfalls.md
  example.md
  glossary.md
```

不得把学校/学科词条写进 `SKILL.md` 或 `references/engine/*.md`；校验器的分层检查会用硬令牌黑名单拦截常见违规。

## manifest.yml（键固定，不增删）

```yaml
id: <domain-id>          # 必须与 state.domain 一致
name: <显示名>
version: <语义化版本>
engine: ">=1.0.0"        # 引擎兼容范围
locale: zh-CN
sections:                # 七个小节的文件名，路径相对本目录
  archetypes: archetypes.md
  diagnosis: diagnosis-bank.md
  verification: verification.md
  pitfalls: pitfalls.md
  example: example.md
  glossary: glossary.md
taskMinutes: [30, 90]    # 单次任务时长默认区间（分钟）
notes: <一句话，说明本包适用边界>
```

## 各文件职责

| 文件 | 供引擎哪个环节使用 | 必须包含 |
|---|---|---|
| `archetypes.md` | `route.md` 阶段切分、`intake.md` 目标收敛 | 项目原型、最小可验证成果、阶段建议、验收要点、失败模式 |
| `diagnosis-bank.md` | `diagnosis.md` | 按 7 维度的题目、最小诊断类别标注、合格/错误回答、加减难追问、等级锚点 |
| `verification.md` | `review-acceptance.md`、`task-loop.md` | 可执行核对配方：前置条件、命令、期望输出、失败含义、所需沙箱模式、AI 可否代为执行 |
| `pitfalls.md` | 审阅、复盘、`adapt.md` | 症状、机制、最小修复、验证方式、对应能力维度 |
| `example.md` | 输出锚定 | 一份填好的 intake + 画像 + 阶段 + 审阅 + 验收结论 |
| `glossary.md` | 术语一致性 | 中英对照术语表 |

## 引用与回退规则

1. 引擎只通过**小节名与 id** 引用领域包，不复制其内容到引擎文本；
2. 领域包缺少某个小节或某条内容时，引擎回退到通用行为（原文的学科无关描述），并在回复中说明"该学科包未提供 X，本次按通用做法处理"；
3. 领域包不得包含教学法规则（例如进度判定、验收档位），只提供学科事实与配方；
4. 领域包中的命令若未经实测，必须标注"（未验证）"，且**不得仅凭标注为未验证的命令判定验收通过**。

## 替换流程

1. 新增目录 `references/domains/<new-id>/`，按上表补齐文件；
2. 运行校验器，确认 manifest 键齐备、小节文件存在、`id` 与状态一致；
3. 更新 `state.domain` 与 `domainVersion`，在 `routeChanges` 记一条替换原因；
4. 已完成的证据与结论保留——学科替换不重置学习历史，只影响后续路线与题目来源。

## 版本

- 领域包 `version` 变更时同步 `state.domainVersion`；
- 引擎与领域包之间以 `engine` 字段声明兼容范围，不兼容时拒绝加载并说明原因，而不是降级运行。
