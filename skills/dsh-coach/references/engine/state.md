# State：状态文件协议（唯一事实源）

来源：原文 §五、§十；改动经审核裁定 W03、W04、W05、W15。

## 载体

| 路径 | 性质 |
|---|---|
| `.coach/state.json` | **唯一事实源**，机器校验，字段级更新 |
| `.coach/PROGRESS.md` | **生成物**，给人阅读；禁止手工编辑；与 json 冲突时以 json 为准 |

不使用 YAML：状态由模型写入，JSON 的严格语法与枚举可被机械校验，避免缩进、冒号、中文标点导致的静默歧义。

多项目时用显式路径（例如 `.coach/<project>/state.json`）；同一路径同一时间只能有一个活动状态。

## 顶层字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `schemaVersion` | string | 当前 `"1.0"` |
| `engineVersion` | string | 引擎版本，与技能包一致 |
| `domain` | string | 领域包 id，须与领域包 `manifest.yml` 的 `id` 一致 |
| `domainVersion` | string | 领域包版本 |
| `assumeGoal` | boolean | 本次是否默认已知目标 |
| `revision` | integer | 每次写入 +1 |
| `updatedAt` | string | ISO 8601 |
| `goal` | object | `statement`、`deliverable`、`why`、`doneCriteria[]`、`constraints{time,tools,environment,permissions}`、`nonGoals[]` |
| `capability` | array | 7 个维度各一条：`dimension`、`level(1–5)`、`status`、`evidence[]`（引用证据 id）、`gap`、`impact` |
| `strategy` | object | `deferred[]`、`immediate[]`、`practice[]`、`assumptions[]` |
| `route` | array | 阶段：`n`、`name`、`deliverable`、`nonGoals[]`、`skills[]`、`prereq[]`、`tasks[]`、`userOnly[]`、`acceptance[]`、`risks[]`、`estimate`、`next` |
| `current` | object | `stage`、`stageStatus`、`task{title,deliverable,criteria[],limits[],nonGoals[],estimateMin,state}` |
| `evidence` | array | `id`、`stage`（**`0` = 诊断期证据**）、`claim`、`artifact`、`strength`、`note` |
| `open` | array | `id`、`issue`、`severity`、`status`（未解决/已解决）、`next`；**可选** `basis`（依据：文档章节或文件行号）与 `checkStatus`（`已核对`／`推测`，默认 `推测`）——R10 要求的实测依据必须落在这里才可复核 |
| `routeChanges` | array | `at`、`reason`、`change` |
| `directAnswers` | array | `at`、`topic`。**记录本身不计入能力证据**；该成果只有在用户能解释、修改、验证之后，才可另行作为证据计入（见 `task-loop.md`） |
| `authorizations` | array | `scope`、`mode`（read/write）、`grantedAt` |
| `completedTasks` | array | 已完成任务的摘要行（原文 §十 的档案项之一），可为空数组；只存摘要，不内联大段代码或日志 |
| `retrievalRecap` | string | 最近一次阶段验收的检索式复述结论 |
| `nextTask` | string | 下一步 |

枚举与格式细则：

- `evidence[].strength`：`已验证 / 部分验证 / 待验证`（三态，与 `capability[].status` 同枚举）；
- `evidence[].id`：非空且唯一，格式约定 `E<数字>`；
- `evidence[].artifact`：非空，且**不得是占位符**（`-`、`无`、`N/A`、`待补` 等）。**下列都算可核对材料**：文件与行号、日志片段、截图位置、可复现步骤、**问答记录（题目编号＋学员原话摘录）**、**操作自述记录（学员原话摘录＋时间）**。后两类是知识类结论与操作自述的**合法材料**，不得因为"不是文件"而拒绝，也不得因此要求学员补交截图或重复实测；
- 时间字段：严格 ISO 8601（日期 + 时间 + 时区，如 `2026-03-08T20:15:00.000Z`）；
- `current.task.estimateMin`：正整数分钟估计，超过领域包 `taskMinutes` 上限时给出提醒。

## 等级定义（1–5，源自原文 §五）

| 等级 | 含义 |
|---:|---|
| 1 | 需要大量引导 |
| 2 | 理解局部内容，但难以独立应用 |
| 3 | 能完成常规任务，边界和结构仍需指导 |
| 4 | 能独立完成并排查多数问题 |
| 5 | 能解释取舍、设计结构并迁移到新问题 |

领域包可在题目级给出更细的锚点（见其 `diagnosis` 小节的"1–5 等级锚点"），但**整体等级的口径以上表为准**。

枚举：

- `capability[].dimension`：基础知识 / 实际应用 / 问题拆解 / 调试与纠错 / 结构与质量 / 独立程度 / 解释与迁移
- `capability[].status`：已验证 / 部分验证 / 待验证
- `open[].severity`：阻塞 / 重要 / 建议
- `current.stageStatus`：未开始 / 进行中 / 待验收 / 已通过 / 有条件通过 / 未通过

## 机械不变量（由 `scripts/coach-validate.mjs` 强制）

1. 顶层键齐备、类型正确、枚举合法（**缺键不再中断后续检查**，避免一处缺失掩盖全部问题）；
2. `capability` 覆盖全部 7 个维度，无重复；
3. `status=已验证` ⇒ `evidence` 非空、`level≥3`，**且被引用的证据中至少有一条强度为"已验证"**（只查 id 存在会被"引用一条待验证证据"绕过）；
4. `evidence` 为空 ⇒ `level≤2` 且 `status=待验证`；`status=部分验证` ⇒ 引用证据强度不得全为"待验证"；
5. `capability[].evidence` 中每个 id 必须存在于 `evidence[]`；
6. 每条 `evidence` 必须有非空 `artifact`，且**不得是占位符**（`-`／`无`／`N/A`／`待补` 等）；问答记录与操作自述记录**都算合法材料**（见上文格式细则）；
7. `route[].userOnly` 与 `route[].acceptance` 非空；`route[].n` **从 1 开始**、连续、唯一；
8. `route` 非空时 `current.stage` 必须存在于 `route`；`route` 为空时降为提醒（intake/基线阶段属正常），但**任务一旦开工而 `route` 仍为空则报错**；
9. 存在 `severity=阻塞` 且 `status=未解决` 的 `open` 项时，`current.stageStatus` 不得为 `已通过`；
10. `current.stageStatus=已通过` ⇒ `retrievalRecap` 非空；
11. `goal.statement`、`goal.deliverable`、`goal.doneCriteria` 非空；
12. `revision` 为 ≥1 的整数，所有时间字段为**严格 ISO 8601**；
13. **分层检查**：`SKILL.md`、`references/engine/*.md`、`assets/*.md` 不得出现学科专有词条。匹配方式为 NFKC 归一化 + 整词匹配（英文普通词不会因为包含某学科词根而误报，一行可报多个令牌）；`scripts/` 不参与扫描（校验器自身含黑名单词表）。**边界**：只拦常见英文写法，全角／同义改写／拼音不在覆盖范围——它是**护栏，不是证明**。（本条与 6.x 审核记录中的 D7、D14 同源：说明文字里一旦举出具体词例，就会触发本条自身。）
14. `completedTasks` 为字符串数组；条目过长（>200 字符）时提醒"只保存结论摘要"（原文 §十）；
15. `evidence[].artifact`／`note` 超长（>500 字符）时提醒疑似内联大段内容；
16. `current.task.estimateMin` 超过领域包 `taskMinutes` 上限时提醒"必须拆分或由用户显式调整节奏"；
17. `goal.constraints` 四项为空时提醒缺少边界依据；
18. `evidence[].stage` 为 ≥0 的整数（`0` 表示**诊断期证据**：诊断、基线、路线阶段的问答记录与操作自述都落在这里）；
19. **提醒（warn，不拦截）**：某维度 `status=已验证`，且其引用证据的 `artifact` **全部**形如「问答记录…」、去重后题目编号 **<2** → 提醒"知识类结论疑为单题即发已验证"。**warn 不构成门禁**（CI 退出码只看 error），其强制力由 `docs/zero-knowledge-path.zh.md` 的人工清单承担——这是 2.1 修订的明确取舍：漏报的代价是"可能漂移"（有清单兜底），误报的代价是每次正常教学都被阻塞；
20. `open[].basis`／`open[].checkStatus` 为**可选**字段（R10 的实测留痕）：出现时校验类型与枚举；`checkStatus=推测` 时给出提醒 **ST-W8**（R10 规定推测状态不得据此要求实测）。**如实声明**：**省略这两个字段不会触发任何提醒**——留痕是否完整靠人工清单，不靠机械门禁；
21. `current.task.criteria` 为空且任务已开始 → 提醒 **ST-W2**（本条此前仅存在于校验器代码中，现补录于此）。

## 更新时机（原文 §十）

- 完成初步诊断；
- 完成一个可验收任务；
- 完成阶段复盘；
- 路线发生重大调整；
- 新证据改变能力判断。

## 信息优先级与合并规则（原文 §十 + 审核裁定 W04）

优先级：**用户当前明确说明 > 最近的实际成果与测试 > 状态文件 > 较早的自述或推测**。

冲突处理：

1. 高优先级信息覆盖低优先级，覆盖时在 `evidence` 或 `routeChanges` 留一条记录；
2. 不得因为"档案里写着"就拒绝用户当前的更正；
3. 不得为了保持档案"好看"而保留已被推翻的结论——过时结论标记为 `待验证`，不删除证据历史。

## 校验器边界（如实声明）

校验器只检查**状态层**：它能保证"无证据不得标已验证""阻塞项未清不得通过""目标必须落盘"等结构约束；它**不能**检查对话质量（例如是否真的只给了 3 级提示、是否泄露了完整答案）。不要把校验通过当作教学质量的证明。

## 无持久化环境

若运行环境无法写文件，则在每阶段结束输出《可复制学习状态摘要》（即状态文件的最小可读子集），交用户保存，并在下次对话中优先粘贴回来。
