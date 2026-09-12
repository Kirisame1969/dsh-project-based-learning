# Unity / C# 诊断题库

> 本文件是学科题目库，供引擎的 `diagnosis` 环节取题。题型与题量规则由引擎决定，本文件只提供题目与判分锚点。
>
> **每题固定字段**
> - `考察维度`：7 维度之一（基础知识 / 实际应用 / 问题拆解 / 调试与纠错 / 结构与质量 / 独立程度 / 解释与迁移），与 `state.capability[].dimension` 对齐。
> - `最小诊断类别`：`理解预测` / `问题定位` / `小型实现`——供引擎凑齐三类最小覆盖时直接筛选。
> - `类型`：`事实性` / `推理性` / `综合`——**事实性题不得作为首次接触题**：学员尚未学过该知识点时，先按 R9 讲授，再用它作确认题。
> - `前置知识`：使用本题前必须已具备的内容；**未满足时不得使用**（先补前置，或换一道不需要该前置的题）。
> - `合格回答要点`：学员答到什么程度可以判为合格；带「加分」的条目用于区分 4 级与 5 级。
> - `典型错误回答`：出现这些回答时的常见根因，用于定位缺口而不是简单扣分。
> - `加难追问` / `降难追问`：同一题目的向上、向下变形，不需要另出题。
> - `1–5 等级锚点`：针对**本题**的等级描述，不构成对学员的整体评价。
>
> **API 版本提示**：题库中 `Rigidbody2D.linearVelocity` 是 Unity 6（6000.x）的名称；Unity 2022 及更早版本中该属性名为 `velocity`（同一概念）。判分以学员实际使用的版本为准，**不要把版本差异当作错误**。
>
> **按需读取（重要）**：本文件共 7 个维度、14 道题，题目编号为 `### Q<维度号>-<序号>`。不要整篇读入：
> 1. 先读**文件末尾的《最小覆盖索引》**——它给出每个最小诊断类别可直接使用的题号，以及按项目原型推荐的「三题组合」；
> 2. 再用题号检索定位该题正文（例如搜索 `Q4-2`），只读本次要用的题目。
> 3. 提问与复盘时引用题号与考察维度，便于后续核对判分依据。
>
> **生命周期题（Q1-1）的依据来源**：Unity 2022.3 官方脚本 API `MonoBehaviour.Awake`——"Unity calls `Awake` on scripts derived from `MonoBehaviour` in the following scenarios: The parent GameObject is active and initializes on Scene load / The parent GameObject goes from inactive to active / After initialization of a parent GameObject created with `Object.Instantiate`"；同页 Example1/Example2 示例：Cube1 初始未勾选（inactive），按空格 `SetActive(true)` **之后**才调用 `Example1.Awake()`，随后 `Start`。核对日期 2026-09-11。

---

## 维度 1：基础知识

> **本维度共 3 道题**：Q1-2、**Q1-3（首触可用，前置为空）**（均在下方）与 **Q1-1（已移入《讲授后确认题》）**。Q1-1 属**事实性**题，零基础学员先按 R9 讲授再用它确认；自述熟悉生命周期的学员可直接用它诊断——是否可用由 `前置知识` 与学员记录决定，见《取题前置检查》。

### Q1-2 Inspector 改了值却不生效

**题目**
学员提交了这段代码（速度在 Inspector 里改成了 `12`，但运行起来移动速度和默认值一样）：

```csharp
using UnityEngine;

public class PlayerMove : MonoBehaviour
{
    [SerializeField] private float moveSpeed = 5f;

    private void Awake()
    {
        moveSpeed = 5f;
    }

    private void Update()
    {
        float h = Input.GetAxisRaw("Horizontal");
        transform.Translate(Vector3.right * h * moveSpeed * Time.deltaTime);
    }
}
```

他坚称「我在 Inspector 里明明把 moveSpeed 改成 12 了」。请定位问题出在哪一行，并解释为什么 Inspector 里的值看起来「没被读进去」。

**考察维度**：基础知识
**最小诊断类别**：问题定位
**类型**：推理性
**前置知识**：序列化与 Inspector 基础

**合格回答要点**
- 直接指出 `Awake()` 里的 `moveSpeed = 5f;` 是元凶：每帧运行前都会把序列化进来的 Inspector 值重新覆盖成 `5`。
- 机制解释：**序列化的值在对象创建时就已经从场景/预制体数据写入字段**，`Awake` 在其后执行，因此 `Awake` 里的赋值会覆盖 Inspector 值。
- 最小修复：删掉 `Awake` 里那行赋值；如果确实需要一个「运行时重置」，改为在 `OnValidate` 或单独的 `Reset()` 里设默认值，或用一个独立的 `defaultSpeed` 常量。
- 顺带正确指出：`[SerializeField]` 只影响「是否显示/保存」，不会让字段绕过后续代码赋值。
- 加分：指出第二处问题——用 `transform.Translate` 直接改位置，在有 `Rigidbody2D` 的项目里会和物理引擎打架（见维度 3）。

**典型错误回答**
- 「`[SerializeField]` 写错了，应该用 `public`」——把可见性和序列化混为一谈，且改 `public` 并不能解决问题。
- 「Inspector 没保存，重新保存场景就行」。
- 只说「你重新赋值了」但指不出是哪一行。
- 认为是缓存/编译问题，建议重启 Unity。

**加难追问**
如果字段声明改成 `private float moveSpeed;` 且**不加** `[SerializeField]`，Inspector 里看不到它——此时运行结果会是什么？为什么属性 `public float MoveSpeed { get; set; }` 加了 `[SerializeField]` 也一样看不到？

**降难追问**
`Awake` 和 Inspector 里保存的值，哪一个先「写进」这个字段？只说先后顺序即可。

**1–5 等级锚点**
- 1：认为问题在 Inspector 或序列化特性上，指不出代码行。
- 2：能指出是 `Awake` 里的赋值，但解释成「代码优先级高」这类含糊说法。
- 3：定位准确，能说出「序列化先写入、`Awake` 后执行所以被覆盖」。
- 4：定位准确 + 给出至少一种正确修复方式，并说明 `Reset()`/`OnValidate` 的适用场景。
- 5：能进一步指出「不过度用 `Awake` 赋默认值」的工程习惯，并主动发现 `transform.Translate` 与物理冲突的第二处问题。

---

### Q1-3 改了参数却没生效：哪几个字段能在 Inspector 里看到并保存

**题目**
学员说"我在 Inspector 里改了参数，运行起来还是老样子"。下面是三段字段声明：

```csharp
public int speedA = 5;
private int speedB = 5;
[SerializeField] private int speedC = 5;
```

请回答：哪几个会在 Inspector 里**显示并保存**？看不到的那个，最可能的原因是什么？如果学员坚持说"我明明改了"，你会先让他检查哪一处？

**考察维度**：基础知识
**最小诊断类别**：问题定位
**类型**：推理性
**前置知识**：无（可首触：只需知道 Inspector 的存在，以及"字段可以被编辑器显示"这一常识）

**合格回答要点**
- `public` 字段默认在 Inspector 可见并可保存；带 `[SerializeField]` 的 `private` 字段同样可见可保存；**普通 `private` 字段不显示、也不会被编辑器保存**——这是本题的关键区分。
- 因此 **A 与 C 可见可保存，B 不可见**。
- "改了没生效"的常见原因至少覆盖两类：改的是**运行时实例**而预制体资产未变；字段不可序列化（漏加特性）；在 **Play 模式**下的改动退出播放后不保留。
- 排查顺序：先确认字段在 Inspector 里**是否存在**，再看它的当前值，最后确认改动发生在编辑态还是播放态。

**典型错误回答**
- 认为三个字段都能在 Inspector 看到（把"字段"与"可序列化字段"当成同一件事）。
- 认为 `private` 加不加特性没区别。
- 只给出"重新导入资源／重启编辑器"这类与机制无关的猜测，说不出检查顺序。

**加难追问**
把字段换成 `public List<int> xs = new List<int>();`：在 Inspector 里改动后运行，有没有可能"改了又变回去"？为什么？（提示方向：序列化时机与实例创建时机。）

**降难追问**
只回答一个问题：想让一个 `private` 字段可以在 Inspector 里编辑，**最少**要加什么？

**1–5 等级锚点**
- 1：说不出哪些字段可见，或认为全部可见。
- 2：知道 `public` 可见，但不确定 `[SerializeField]` 的作用。
- 3：A、C 可见、B 不可见的判断正确，但"改了没生效"只给出"重启"类猜测。
- 4：判断正确，并能指出"运行时实例未保存／字段不可序列化／Play 模式改动不持久"中的至少两类原因。
- 5：能主动把"字段可见性"与"改动是否持久"区分为两件事，并说明应先验证哪一项、怎么验证。

---

## 维度 2：实际应用
### Q2-1 协程在对象被禁用/销毁之后

**题目**
学员写了这段「无敌 2 秒」的逻辑：

```csharp
using System.Collections;
using UnityEngine;

public class Invincible : MonoBehaviour
{
    private bool invincible;

    public void TriggerInvincible()
    {
        StartCoroutine(InvincibleRoutine());
    }

    private IEnumerator InvincibleRoutine()
    {
        invincible = true;
        yield return new WaitForSeconds(2f);
        invincible = false;
    }
}
```

请预测三种情形下会发生什么：
1. 无敌期间把脚本所在组件 `enabled = false`；
2. 无敌期间把整个 GameObject `SetActive(false)`；
3. 无敌期间把这个 GameObject `Destroy` 掉。

每种情形都说清「`invincible` 最终会不会被设回 `false`」。

**考察维度**：实际应用
**最小诊断类别**：理解预测
**类型**：推理性
**前置知识**：协程基础

**合格回答要点**
- 协程由**那个 MonoBehaviour** 驱动。`enabled = false` 会让该组件上的协程停止推进（Unity 在组件被禁用时停止其协程），后续 `yield` 之后的代码不会继续执行 → `invincible` 会**永久停留在 `true`**。
- `SetActive(false)` 同理（组件随之失效），协程停住 → 同样卡在 `true`。再次 `SetActive(true)` 也**不会**从断点恢复这个协程。
- `Destroy` 时对象被销毁，协程被终止，`invincible` 随对象一起消失（不再有「卡住」的可见后果，但 `InvincibleRoutine` 的收尾逻辑确实没跑）。
- 由此得出正确结论：**不能在协程里承担「必须执行的状态复位」**，需要复位就必须放在 `OnDisable`，或用 `StopCoroutine` 之外的手段（如记录时间戳、或用不受组件启用状态影响的计时）。
- 加分：指出 `WaitForSeconds` 受 `Time.timeScale` 影响；若游戏会暂停（`timeScale = 0`），这 2 秒会变成永远，需要 `WaitForSecondsRealtime`。

**典型错误回答**
- 「协程会自己继续跑完，因为它属于 Unity 引擎，不属于这个对象」——最常见的错误心智模型。
- 「`enabled = false` 不影响协程，只有 `Destroy` 才影响」。
- 「`SetActive(true)` 之后协程会接着执行剩下的部分」。
- 完全不提 `timeScale`（在加难追问时也答不上来）。

**加难追问**
如果改成 `Destroy(gameObject, 0.5f)`（即延迟销毁），无敌期间对象被销毁，`OnDisable` 与 `OnDestroy` 各自的执行时机是什么？如果要求「无论对象怎么被禁用或销毁，`invincible` 都必须复位」，你会把复位逻辑放在哪里？

**降难追问**
`StartCoroutine` 是「谁」在跑这段代码？如果承载它的组件被禁用，这段代码还会继续往下走吗？

**1–5 等级锚点**
- 1：认为协程独立于 MonoBehaviour，三种情形都答「会正常复位」。
- 2：知道销毁会中断，但认为禁用不影响。
- 3：三种情形都判断正确，结论是「会卡在 `true`」。
- 4：判断正确并主动给出「复位逻辑放 `OnDisable`」的修复方向。
- 5：额外指出 `timeScale` 对 `WaitForSeconds` 的影响，并能提出「用记录时间戳代替协程做状态计时」这类更稳的方案。

---

### Q2-2 用 ScriptableObject 把数值抽出来

**题目**
**小型实现（限时 15 分钟，可查文档）**：为「敌人波次」写一个配置资源，要求：

1. 能在 Project 窗口右键菜单里创建（菜单路径自定，如 `Create/游戏/波次配置`）；
2. 资源上可编辑：敌人预制体引用、每波数量、波次间隔秒数、总波数；
3. 写出**读取端**：一个挂在场景对象上的脚本，在进入 Play 模式时从 Inspector 里拖入的配置资源读出总波数并 `Debug.Log` 出来。

只需写出两个文件的关键代码，不需要真的做刷怪逻辑。

**考察维度**：实际应用
**最小诊断类别**：小型实现
**类型**：综合
**前置知识**：C# 类与资源引用概念

**合格回答要点**
- 正确写出 `ScriptableObject` 子类，并使用 `[CreateAssetMenu]`（`fileName` / `menuName` 参数任一写法均可）提供创建入口。
- 字段用 `public` 或 `[SerializeField] private`，类型合适（`GameObject` 存预制体、`int` 存数量、`float` 存间隔）。
- 读取端用 `[SerializeField] private WaveConfig config;`，在 Inspector 里赋值，并在 `Awake` 或 `Start` 里读取；**不**使用 `Resources.Load` 这类硬编码路径方式（除非学员说明理由）。
- 知道 `ScriptableObject` 是**资源**，用 `ScriptableObject.CreateInstance<T>()` 只能创建内存实例，要落盘需在编辑器里 `AssetDatabase.CreateAsset` 或走右键菜单创建。
- 加分：说明「配置是只读输入」的意图——运行时不应回写配置资源，否则 Play 模式结束会把改动留在资源上。

**典型错误回答**
- 把 `ScriptableObject` 当 `MonoBehaviour` 写，加上了 `Update()` 并且期望它每帧跑。
- 忘记 `[CreateAssetMenu]`，导致 Project 窗口里创建不出来。
- 用 `Instantiate(config)` 来「使用配置」。
- 读取端把所有值又硬编码了一遍，配置资源实际上是装饰品。
- 在 `Update` 里每帧读配置（不算致命，但要追问为什么不放在 `Awake`）。

**加难追问**
如果策划希望「同一份配置被多关卡复用，但每关的波次间隔略有不同」，你会怎么改结构？再进一步：`ScriptableObject` 在编辑器里改了值，Play 模式结束会不会保留？为什么这一点在设计配置数据时很重要？

**降难追问**
`ScriptableObject` 和普通 `class` 相比，多出来的最实用的那个能力是什么？（提示：它能不能像预制体一样被拖进 Inspector 的字段槽？）

**1–5 等级锚点**
- 1：写不出 `ScriptableObject` 子类，或把它当 `MonoBehaviour` 用。
- 2：能继承 `ScriptableObject` 并声明字段，但漏 `[CreateAssetMenu]` 或读取端接不上。
- 3：两端都能工作，字段类型与读取时机合理。
- 4：代码可直接运行，且明确说明「配置只读、不回写」的边界。
- 5：能主动讨论复用与覆盖（如每关覆盖值、`ScriptableObject` 改动会落盘带来的污染风险），并提出可维护的结构。

---

## 维度 3：问题拆解

### Q3-1 「一打开背包就卡一下」

**题目**
学员描述：「按 Tab 打开背包时，画面会明显卡顿一下（大概半秒），打开之后操作是流畅的。背包最多 40 个格子，每个格子是一个预制体，打开时用 `Instantiate` 生成。」

请说出你**排查这个问题的前三步**，每步说明「你要看什么数据、看到什么就能确认或排除什么」。同时给出你对最可能原因的判断。

**考察维度**：问题拆解
**最小诊断类别**：问题定位
**类型**：推理性
**前置知识**：更新循环与性能常识

**合格回答要点**
- 第一步应当是**用 Profiler 复现并采集**，而不是先改代码。具体做法：打开 Profiler，按 Tab 触发一次卡顿，然后在 CPU 模块里查看这一帧的耗时构成。
- 关键判据：卡顿集中在**单帧**（那一帧的毫秒数明显尖峰），而不是持续偏高——这与「打开后流畅」的现象一致。
- 第二步：在这一帧的调用树里找 `Instantiate` 的耗时占比，以及 `GC.Alloc` 的分配量；如果主耗时确实在 `Instantiate`，方向就是「一次性创建 40 个对象的成本」。
- 第三步：确认是否还有其它叠加成本——首次打开时 `Awake`/`Start` 里的初始化、UI 布局重建（Layout Rebuild）、以及有没有 `GetComponent`/`Find` 之类的搜索调用被放在循环里。
- 结论方向：这是典型的「一次性大开销」而不是「每帧开销」，所以**优化的正确目标是把它摊开或提前**，例如：预先生成并隐藏（对象池）、分帧生成（每帧生成几个）、或用滚动列表只生成可见格子。
- 加分：指出这个问题的验收判据是「同一场景、同样操作下那一帧的毫秒数下降」，而不是「感觉快了」。

**典型错误回答**
- 直接给结论「用对象池」但不提任何测量步骤——即使结论方向对，也说明是在背套路而非拆解问题。
- 建议「优化 `GetComponent`」而没有先确认瓶颈在哪里。
- 认为是「Unity 第一次打开 UI 的正常现象，没法优化」。
- 把问题归因到「电脑配置」或「Unity 版本」。
- 只说「用 Profiler 看一下」但说不出要看哪一个模块、什么指标。

**加难追问**
如果 Profiler 显示这一帧的耗时主要不在 `Instantiate`，而是在 `Canvas.BuildBatch` 或布局重建上，你的方向会怎么变？如果 40 个格子改成 400 个，你的方案还成立吗——什么时候必须换成滚动列表 + 复用？

**降难追问**
「打开时卡一下，之后流畅」和「一直都很卡」，这两种现象指向的原因类型有什么不同？（提示：一次性开销 vs 每帧开销。）

**1–5 等级锚点**
- 1：直接猜结论，或归因到环境因素。
- 2：知道要用 Profiler，但说不出具体看哪一列/哪个指标。
- 3：能给出「先测、再定位到 `Instantiate`、再谈方案」的合理顺序。
- 4：步骤与判据都具体，且能区分「一次性开销」与「每帧开销」，据此选方案。
- 5：额外考虑布局重建等叠加成本，并能回答规模放大后方案何时失效。

---

### Q3-2 帧率变化时物理行为不一致

**题目**
学员说：「我的角色跳跃高度不稳定，有时候跳得高有时候跳得低；在性能好的机器上跳得高，性能差的时候跳得低。」

他贴出的相关代码：

```csharp
private void Update()
{
    if (Input.GetKeyDown(KeyCode.Space))
    {
        rb.linearVelocity = new Vector2(rb.linearVelocity.x, jumpForce);
    }
}
```

请把「跳跃高度不稳定」这件事拆成可以分别验证的假设，并指出这段代码里至少一处会被帧率影响的地方。（若学员用的是 Unity 2022 或更早版本，`linearVelocity` 写作 `velocity`，属同一属性。）

**考察维度**：问题拆解
**最小诊断类别**：理解预测（先要求预测「哪里会被帧率影响」，再要求列出可验证假设；因此也可当问题定位使用）
**类型**：推理性
**前置知识**：物理更新与 FixedUpdate

**合格回答要点**
- 指出物理是在**固定时间步长**（`FixedUpdate` / `Time.fixedDeltaTime`）里推进的，而 `Update` 按渲染帧执行；两者的调用次数比例不固定。
- 关键机制：`Input.GetKeyDown` 在 `Update` 里读、赋值却只影响下一个物理步；当帧率远高于物理步频时，同一个按压可能被读到一次但物理步错过/延迟，或反过来在掉帧时一次 `Update` 跨过多个物理步，导致这一帧的处理与预期不符。正确做法是**在 `Update` 里记录输入意图（置一个 `bool`），在 `FixedUpdate` 里消费它并执行物理赋值**。
- 指出 `rb.linearVelocity = ...` 这种「直接赋值速度」会**覆盖**已有的垂直速度，如果同一帧内有重力/碰撞在起作用，结果取决于赋值发生在物理步的哪一侧。更稳的是 `AddForce(..., ForceMode2D.Impulse)` 或至少保证赋值发生在物理步内。
- 可验证的假设清单示例：
  - 假设 A：赋值时机与物理步不同步 → 验证方式：打印 `FixedUpdate` 与赋值点的时序，或把逻辑挪到 `FixedUpdate` 后对比高度方差。
  - 假设 B：帧率本身在变（背景程序占用）→ 验证方式：固定帧率上限或用 `Application.targetFrameRate` 锁定后再测。
  - 假设 C：`jumpForce` 被其它逻辑改写 → 验证方式：在赋值前 `Debug.Log(jumpForce)`。
  - 假设 D：落地检测导致的二段跳/吞跳 → 验证方式：记录每次起跳时的着地状态。
- 结论：这个 bug 的「不稳定」正是帧率相关的特征，所以**先怀疑时序，再怀疑数值**。

**典型错误回答**
- 「把 `Update` 改成 `FixedUpdate` 就好了」——方向对，但说不出为什么，且没意识到还要在 `Update` 里读输入（`GetKeyDown` 在 `FixedUpdate` 里可能漏读，这是常见反向陷阱）。
- 认为是 `jumpForce` 数值不稳定。
- 建议加上 `Time.deltaTime` 乘法来「修」物理赋值（`deltaTime` 在物理赋值里不是这么用的）。
- 认为「性能差的机器物理会算错」——把时序问题误解成精度问题。

**加难追问**
如果要求在**掉帧**（一帧跨过多个物理步）时也保证「一次按键只跳一次」，你会怎么保证不重复触发？再进一步：为什么 `Input.GetKeyDown` 放在 `FixedUpdate` 里可能漏掉一次按压？

**降难追问**
物理相关的位移和速度赋值，应该写在 `Update` 还是 `FixedUpdate`？为什么？

**1–5 等级锚点**
- 1：归因到数值或「机器性能导致物理算错」。
- 2：能说出「应该放 `FixedUpdate`」，但说不出机制。
- 3：正确解释 `Update` 与 `FixedUpdate` 频率不同步，并指出这段代码会被帧率影响。
- 4：给出「`Update` 记录意图 + `FixedUpdate` 消费」的正确分工，并能列出可验证的假设。
- 5：能进一步讨论掉帧时一次按压跨多个物理步的去重，以及覆盖速度 vs 施加冲量的取舍。

---

## 维度 4：调试与纠错

### Q4-1 点一次按钮，日志打印了三次

**题目**
学员的面板脚本如下，现象是「打开面板 → 关闭面板 → 再打开，这时点一次「购买」按钮，Console 里日志出现 3 次」（每重复一次开关，次数还会增加）：

```csharp
using UnityEngine;
using UnityEngine.UI;

public class ShopPanel : MonoBehaviour
{
    [SerializeField] private Button buyButton;
    [SerializeField] private GameObject panelRoot;

    private void OnEnable()
    {
        buyButton.onClick.AddListener(OnBuy);
    }

    private void OnBuy()
    {
        Debug.Log("购买");
    }

    public void Close()
    {
        panelRoot.SetActive(false);
    }
}
```

请定位原因，解释「为什么次数会随开关次数递增」，并给出最小修复。

**考察维度**：调试与纠错
**最小诊断类别**：问题定位
**类型**：推理性
**前置知识**：事件与委托基础

**合格回答要点**
- 定位：`OnEnable` 里每次启用都调用 `buyButton.onClick.AddListener(OnBuy)`，但**从来没有解绑**。`AddListener` 是**追加**而不是替换，所以每启用一次就多挂一份委托。
- 递增机制解释清楚：开关面板 → `OnEnable` 执行 N 次 → 委托列表里有 N 个 `OnBuy` → 点一次按钮触发 N 次。
- 关键细节（能说清这一点才算真的懂）：`panelRoot.SetActive(false)` 关掉的可能是**父对象**，而 `ShopPanel` 组件挂在**父对象自己**身上时，`SetActive(false)` 会触发 `OnDisable`——但如果 `ShopPanel` 挂在**子对象**上而关闭的是父对象，子对象上的 `OnDisable` 依然会触发（因为整个子树被停用）。要能指出「必须确认 `ShopPanel` 与 `panelRoot` 的层级关系，因为解绑逻辑要挂在真正会被禁用的那个对象上」。
- 最小修复（任一即可，说明理由）：
  - 在 `OnDisable` 里 `buyButton.onClick.RemoveListener(OnBuy);`（与 `OnEnable` 配对）；
  - 用 `OnDisable` + `RemoveAllListeners()`（但会清掉别人的监听，需说明风险）；
  - 改在 `Awake`/`Start` 里只绑一次，并确认面板不会被销毁重建。
- 加分：指出「`AddListener`/`RemoveListener` 必须成对」应当作为一条自查规则；并说明为什么**不能**用 `OnDestroy` 代替 `OnDisable`（`OnDisable` 可能发生多次而 `OnDestroy` 只一次，只解绑一次不够）。

**典型错误回答**
- 「Unity 的 Button 有 bug」或「UI 事件本来就会触发多次」。
- 认为是 `OnBuy` 被三个不同按钮绑定了。
- 建议在 `OnBuy` 里加去重标志（治症状不治因，且会引入新状态）。
- 只说要 `RemoveListener`，但说不出「次数递增」正是「没解绑」的证据。

**加难追问**
如果这个面板是被 `Instantiate` 出来的、每次打开都新建一份、关闭时 `Destroy`，那还会出现重复触发吗？`OnDestroy` 与 `OnDisable` 在这个场景下各自的角色是什么？再进一步：如果按钮是别人（外部脚本）绑的，你只 `RemoveAllListeners()` 会发生什么后果？

**降难追问**
`onClick.AddListener(f)` 执行两次之后，按钮的点击事件列表里有几个 `f`？点一下会调用几次 `f`？

**1–5 等级锚点**
- 1：认为问题在 Button 组件或 UI 系统本身。
- 2：看出「绑定了多次」，但说不出为什么次数随开关递增。
- 3：准确定位到 `OnEnable` 只加不减，并给出 `OnDisable` 解绑的修复。
- 4：能解释递增规律即证据，并说明 `OnDisable` 与 `OnDestroy` 在解绑上的区别。
- 5：能按面板的生命周期（复用 vs 重建）讨论哪种绑定策略更合适，并指出 `RemoveAllListeners` 会误伤他人监听。

---

### Q4-2 2D 触发器「怎么都不触发」

**题目**
学员做的 2D 玩法里，角色走到金币上时应该加分。他确认了：
- 金币上加了 `BoxCollider2D`，并且勾选了 `Is Trigger`；
- 角色上加了 `CircleCollider2D`（未勾 `Is Trigger`）；
- 角色上有 `Rigidbody2D`；
- 代码里写了 `OnTriggerEnter2D(Collider2D other)` 并且方法名拼写正确、脚本挂在角色上、脚本组件已启用；
- 但 Console 什么都不打印。

请列出**至少 4 个**还能导致「不触发」的原因，并说明各怎么快速验证。

**考察维度**：调试与纠错
**最小诊断类别**：问题定位
**类型**：推理性
**前置知识**：碰撞体与刚体基础

**合格回答要点**
- **金币一侧缺刚体**：触发器检测要求至少一方有 Rigidbody。若角色有刚体、金币没有，通常仍应触发（Unity 的 2D 触发器在「一方有 Rigidbody2D」时可工作），所以要验证的是**金币有没有被意外设为 `Static` 并且整棵层级被判定为静态**导致不参与运行时碰撞。更常见的是：角色刚体被设为 `Body Type = Static` 或 `Kinematic` 且金币也是静态 → 两个静态刚体之间不产生接触，不触发。
- **刚体类型问题**：`Rigidbody2D.Body Type` 为 `Static` 时对象不移动也不参与动态接触；`Kinematic` 与 `Static` 之间默认不产生触发回调（需要至少一方为 `Dynamic`，或显式配置）。验证：把角色刚体设为 `Dynamic` 再试。
- **Layer 碰撞矩阵**：Project Settings → Physics 2D 的 Layer Collision Matrix 里，角色与金币所在 Layer 的勾选被取消。验证：把两者临时都设为 `Default` 层再试。注意：2D 用的是 **Physics 2D** 设置，不是 3D 的 Physics 设置。
- **`Physics2D.simulationMode` 或 `Physics2D.queriesHitTriggers` 无关但易混**：`queriesHitTriggers` 影响的是 `Raycast` 类查询，**不影响** `OnTriggerEnter2D`——能指出这一点说明理解到位（这是一个典型误诊方向）。
- **Z 轴/排序层无关但耗时**：2D 里碰撞判定看 XY 与 Z 是否重叠；若一个对象被挪到 `z = 10` 而另一在 `z = 0`，`BoxCollider2D` 的厚度仍会覆盖，一般不因此失败——所以不要在这上面浪费时间，能主动排除这一项也是加分。
- **代码侧**：脚本挂在金币上而不是角色上（或相反），且只有一方有回调——这仍应触发（回调会发给双方）。但若脚本挂在**另一个没有碰撞体的父对象**上，则收不到。验证：在 `OnTriggerEnter2D` 外加一个 `Update` 日志确认脚本确实在跑。
- **碰撞体尺寸为 0 / 未按正确轴向**：`BoxCollider2D` 的 `Size` 被设成 0，或 `CircleCollider2D.Radius` 为 0。验证：Scene 视图里打开 Gizmos 看绿色轮廓。
- **加分**：建议用 `OnTriggerEnter2D` + `OnTriggerStay2D` 一起打日志，并说明「用 Gizmos 先确认两个碰撞体在视觉上真的重叠了」是最快的排除法。

**典型错误回答**
- 「两个都要勾 `Is Trigger`」——错误，触发器只需一方勾选，且要求见上。
- 「`OnTriggerEnter2D` 只能挂在有刚体的对象上」——不准确。
- 「要用 `OnCollisionEnter2D` 才行」——把触发与碰撞回调搞混。
- 只列 1–2 个原因就停，且都是代码侧，完全不含 Layer/刚体类型。

**加难追问**
如果两个对象都是 `Kinematic` 刚体，触发回调会不会发生？为什么？再进一步：如果金币带着 `Rigidbody2D` 且设为 `Dynamic`，但勾了 `Simulated = false`，会发生什么？

**降难追问**
2D 触发器要生效，最少需要满足哪两个条件？（提示：碰撞体 + 刚体。）

**1–5 等级锚点**
- 1：认为「两边都要勾 Trigger」或直接归因到代码拼写。
- 2：能说出一两个原因，但集中在代码侧，缺少 Layer/刚体类型。
- 3：列出 4 个以上分组合理的原因（层级、刚体类型、Layer 矩阵、碰撞体尺寸），并给出对应验证动作。
- 4：明确排除 `queriesHitTriggers` 这类易混项，并提出用 Gizmos 先确认几何重叠。
- 5：能讨论 `Kinematic`/`Static`/`Dynamic` 三者组合下的触发规则，并把结论落到「先看 Gizmos 再查矩阵最后看代码」的效率顺序上。

---

## 维度 5：结构与质量

### Q5-1 asmdef 之后一堆「找不到类型」

**题目**
学员为了缩短编译时间，把 `Assets/Scripts` 拆成了两个 `.asmdef`：`Game.Core` 和 `Game.Gameplay`。拆完之后：
- `Game.Gameplay` 里 `using Game.Core;` 报「找不到命名空间」；
- 他在 `Game.Core` 的 asmdef 里添加了对 `Game.Gameplay` 的引用，`Game.Gameplay` 的 asmdef 里又添加了对 `Game.Core` 的引用，结果 Unity 提示程序集引用有问题。

请说明：为什么拆 asmdef 之后原来能用的类型突然看不见了？以及这个「双向引用」为什么不行、正确的结构应该是什么样？

**考察维度**：结构与质量
**最小诊断类别**：问题定位
**类型**：推理性
**前置知识**：程序集（asmdef）概念

**合格回答要点**
- 核心机制：**asmdef 划分了编译边界**。每个 asmdef 是一个独立程序集，默认只能访问自己 + 自己显式引用的其它程序集。拆分之前，所有没有 asmdef 的脚本都在同一个预定义程序集 `Assembly-CSharp` 里，所以互相可见；拆分后这种「默认可见」消失了。
- 修复方向一：在 `Game.Gameplay` 的 asmdef 里**添加对 `Game.Core` 的引用**（单向）。这是最常见且正确的做法：Gameplay 依赖 Core。
- 关于双向引用：**程序集不能循环依赖**。A 引用 B 且 B 引用 A 会让编译器无法确定编译顺序，Unity 会拒绝/报错。所以必须在结构上打破环。
- 打破环的正确结构（能说出至少一种）：
  - 把双方共用的类型（接口、数据类、枚举、事件定义）**下沉**到一个第三个程序集，如 `Game.Common`，让 Core 与 Gameplay 都只引用它；
  - 或者用**接口反转依赖**：把 Gameplay 需要调用的能力抽成接口放在下层，由上层实现并注入；
  - 或者干脆接受「它们其实是一层」，合并为一个程序集——**不要为了拆而拆**。
- 加分：指出拆分 asmdef 的正确收益是「减少不必要的重编译」和「强制依赖方向」，而不是单纯的「看起来更专业」；并指出拆得太碎（每个文件夹一个 asmdef）会适得其反。
- 加分：提到编辑器专用代码需要单独一个 asmdef 并在 Platform 里排除非 Editor 平台，否则打包会带上 `UnityEditor` 引用。

**典型错误回答**
- 「删掉 `.asmdef` 就好了」——能解决问题但没理解，且放弃拆分的收益；不加解释地这样答只能给低等级。
- 「在 asmdef 里勾选 `Auto Referenced` 就行了」——把「被预定义程序集自动引用」误解为「能引用别人」。
- 「把 `using` 语句改一下就行」。
- 认为双向引用在 Unity 里是允许的，只是会变慢。
- 建议把所有类改成 `public static` 来绕开引用问题。

**加难追问**
如果 `Game.Core` 里有一个基类，`Game.Gameplay` 里有一个子类继承它，方向是 Gameplay → Core，这没问题。现在 Core 里需要一个「回调」在某个时机调用 Gameplay 的实现，你会怎么设计而不引入循环引用？再进一步：asmdef 的 `Auto Referenced` 与「被谁引用」分别是什么意思？

**降难追问**
拆分 asmdef 之前，这些脚本都在哪一个程序集里？为什么那个时候互相能看见？

**1–5 等级锚点**
- 1：建议删掉 asmdef，或认为 `using` 语句写错。
- 2：知道要「加引用」，但方向搞反或解释不清为什么原来能看见。
- 3：能解释编译边界，并给出「Gameplay 引用 Core」的单向修复。
- 4：能说明循环依赖为什么被禁止，并提出下沉共用类型或接口反转的破环方案。
- 5：能讨论 asmdef 拆分的收益与代价（重编译范围、依赖方向约束），并主动提到编辑器程序集需要排除平台。

---

### Q5-2 把「上帝类」拆开

**题目**
**小型实现（限时 20 分钟）**：下面这个类已经 200 多行，学员想拆。请给出一个**拆分方案**：说明你会拆成哪几个类、各自的职责、它们之间怎么通信。不需要写完整实现，但每个类要给出「名字 + 一句话职责 + 关键成员签名」。

```csharp
using UnityEngine;

public class Player : MonoBehaviour
{
    public float moveSpeed = 5f;
    public int hp = 100;
    public int score = 0;
    public GameObject bulletPrefab;
    public Transform firePoint;
    public GameObject gameOverPanel;

    private Rigidbody2D rb;
    private float fireCooldown;

    private void Awake() { rb = GetComponent<Rigidbody2D>(); }

    private void Update()
    {
        // 移动
        float h = Input.GetAxisRaw("Horizontal");
        rb.linearVelocity = new Vector2(h * moveSpeed, rb.linearVelocity.y);

        // 射击
        fireCooldown -= Time.deltaTime;
        if (Input.GetKeyDown(KeyCode.Space) && fireCooldown <= 0f)
        {
            Instantiate(bulletPrefab, firePoint.position, firePoint.rotation);
            fireCooldown = 0.2f;
        }

        // 血量与死亡
        if (hp <= 0) { gameOverPanel.SetActive(true); Time.timeScale = 0f; }
    }

    public void TakeDamage(int amount) { hp -= amount; score += 1; }
    public void AddScore(int amount) { score += amount; }
}
```

（若使用 Unity 2022 或更早版本，`linearVelocity` 写作 `velocity`。）

**考察维度**：结构与质量
**最小诊断类别**：小型实现
**类型**：综合
**前置知识**：组件化与单一职责

**合格回答要点**
- 能识别出这里至少混了 **4 类职责**：输入与移动、射击（含冷却计时）、生命值/受伤、得分与 UI/游戏状态。
- 给出一个具体的拆分方案，例如：
  - `PlayerInput`：只负责把输入转成意图（暴露 `float MoveX`、`bool FirePressed`），不碰物理。
  - `PlayerMotor`：持有 `Rigidbody2D`，对外暴露 `Move(float x)`；所有物理赋值集中在此。
  - `Weapon`：持有冷却与开火逻辑，暴露 `TryFire()`；不关心是谁调用的。
  - `Health`：持有 `int Current`、`event Action<int> Changed`、`event Action Died`、`TakeDamage(int)`；**不含任何 UI 代码**。
  - `ScoreTracker`：持有分数与 `Add(int)` / `event Action<int> Changed`。
  - （可选）`PlayerFacade` / `PlayerController`：把上面几个组件接起来，做最少量的编排。
- 关键设计点（能说到就上等级）：
  - **组件间用事件或直接引用，而不是静态单例**。`Health.Died` 事件 → UI 与游戏状态各自订阅，`Health` 不需要知道 `gameOverPanel` 存在。
  - **各组件放在同一个 GameObject 上，用 `GetComponent` 在 `Awake` 里取一次并缓存**，而不是每帧取。
  - 明确 `Time.timeScale = 0f` 这类**全局副作用**应该由谁负责（建议单独一个 `GameFlowManager` 或至少在编排层），而不是散落在 `Health` 里。
  - 指出 `Update` 里的移动赋值其实是物理操作，拆分后应放进 `PlayerMotor` 并考虑 `FixedUpdate`（顺带修正原代码的时序问题）。
- 加分：指出拆分**不是为了类多**，并说明「拆到什么程度算够」的判据——例如「每个类只有一个改变它的理由」「`Health` 的单元测试不需要场景」。

**典型错误回答**
- 只是把方法挪到几个文件里但仍然是 `static` 互调，职责边界没变。
- 拆出一堆类全部走 `Player.Instance` 单例互相访问——把耦合换了个形式。
- 把 `gameOverPanel` 直接塞进 `Health`，只是搬了代码。
- 拆得过碎（`PlayerMoveX`、`PlayerMoveY` 各一个类），没有实际收益。
- 完全不提通信方式，只给类名清单。

**加难追问**
拆完之后，如果要在不加载场景的情况下为 `Health` 写一个单元测试（拿不到 `MonoBehaviour` 的运行环境），你的设计需要怎么调整？再进一步：`Health` 用事件通知外部，如果外部忘记取消订阅，会出什么问题——这和维度 4 的那个 bug 是同一类吗？

**降难追问**
先只回答一个问题：这个 `Player` 类里，哪些代码「完全不关心 Unity 的物理和 UI」？把它们圈出来，就是可以最先独立出去的部分。

**1–5 等级锚点**
- 1：只搬代码不改职责，或建议「加注释分段」。
- 2：能说出 2–3 个职责并给出类名，但通信方式含糊或依赖单例。
- 3：拆分合理、职责单一，通信方式明确（引用或事件）。
- 4：方案可直接落地，缓存引用、事件解耦、全局副作用有明确归属。
- 5：能讨论可测试性与「拆到什么程度算够」的判据，并主动关联到事件订阅泄漏的风险。

---

## 维度 6：独立程度

### Q6-1 写一个最小的对象池

**题目**
**小型实现（限时 20 分钟）**：为子弹写一个最简单的对象池。要求：

1. `Get()`：取出一个可用对象；池空时按需创建；
2. `Release(GameObject obj)`：把对象还回池并隐藏它；
3. 取出时必须**重置状态**（位置由调用方设置，但速度、计时等内部状态要清干净）；
4. 说明你的池在「场景切换」时会怎样，以及是否需要额外处理。

不要追求完美实现，写出能说明思路的核心代码即可。

**考察维度**：独立程度
**最小诊断类别**：小型实现
**类型**：综合
**前置知识**：实例化与集合操作

**合格回答要点**
- 用 `Queue<GameObject>` 或 `Stack<GameObject>` 存储空闲对象；用 `Instantiate` 在池空时扩容。
- `Release` 里必须 `SetActive(false)`，`Get` 里 `SetActive(true)`——能主动说明「用启用/禁用而不是销毁」是池的关键。
- **重置状态**这一点是本题的核心区分点：
  - 主动指出「复用的对象会带着上一次的脏状态」（如剩余速度、剩余生命周期计时、拖尾特效、碰撞开关），必须在 `Get` 或 `Release` 时清掉；
  - 提到让子弹自己负责重置（如接口 `IPooled { void OnSpawned(); void OnDespawned(); }`）比让池去 `GetComponent` 猜字段更干净。
- 场景切换：池持有的是**场景对象引用**，切场景后这些对象会被销毁，池里的引用会变成「Unity 已销毁对象」（`== null` 为 `true` 但引用非空）。必须说明要么清空池、要么用 `DontDestroyOnLoad` 管理生命周期，**否则下一次 `Get` 会返回已销毁对象**。
- 加分：说明「池不是免费的」——它用内存换 CPU，池太大反而浪费；以及「不是所有对象都值得池化」（只在有实测的频繁创建/销毁时才用）。
- 加分：提到池应该挂在一个不会随场景销毁的管理器下，或做成 `ScriptableObject` 之外的普通类由管理器持有。

**典型错误回答**
- `Release` 里直接 `Destroy(obj)`——那就不是池。
- 池里存的是预制体而不是实例，`Get` 每次都 `Instantiate`——等于没池化。
- 完全不提状态重置（典型后果：子弹复用后速度异常、特效残影）。
- 认为「对象池一定更快」，在所有地方都套用。
- 答不出场景切换会发生什么。

**加难追问**
如果子弹在飞行中被 `Release`，而它身上还有一个「3 秒后自动回收」的协程在跑，会发生什么？你怎么保证一个对象不会被重复 `Release` 两次（导致池里出现两个相同引用）？

**降难追问**
对象池节省的是什么开销？如果 `Get` 出来的对象忘了 `SetActive(true)`，现象会是什么？

**1–5 等级锚点**
- 1：写成「每次 Instantiate/Destroy」，或完全跑不起来。
- 2：有队列结构，但缺状态重置或 `SetActive` 处理。
- 3：池的基本取还正确，能说明用启用/禁用代替销毁。
- 4：主动处理状态重置，并正确说明场景切换的影响。
- 5：进一步处理重复 `Release`/协程残留等边界，并能判断「什么时候不该用池」。

---

### Q6-2 技能冷却：不用协程怎么做

**题目**
**小型实现（限时 12 分钟）**：实现一个技能冷却。要求：

1. 技能触发后进入 N 秒冷却，冷却期间再次触发无效；
2. 暴露一个 `float CooldownRemaining` 给 UI 读，用来画冷却圈；
3. 暴露一个 `float Normalized`（0–1，1 表示已就绪）给 UI 用；
4. **不使用协程**，也不使用 `Invoke`；
5. 说明为什么在暂停（`Time.timeScale = 0`）时你希望冷却是否继续走，并据此选择时间源。

**考察维度**：独立程度
**最小诊断类别**：小型实现
**类型**：综合
**前置知识**：时间与状态管理

**合格回答要点**
- 用时间戳而不是倒计时累减：记录 `nextAvailableTime = Time.time + cooldown`，判断 `Time.time >= nextAvailableTime`。能说出这种写法的好处——**不会被跳过的帧影响精度**，而 `timer -= Time.deltaTime` 在长帧下会累积误差。
- 属性实现：`CooldownRemaining => Mathf.Max(0f, nextAvailableTime - Time.time);`、`Normalized => 1f - Mathf.Clamp01(CooldownRemaining / cooldown);`（具体归一化方向由学员自己定义并说明即可，关键是**方向一致且 UI 能直接用**）。
- **时间源的选择是本题的真正考点**：
  - `Time.time` / `Time.deltaTime` 受 `Time.timeScale` 影响 → 暂停时冷却停住；
  - `Time.unscaledTime` / `Time.unscaledDeltaTime` 不受影响 → 暂停时冷却继续走；
  - 学员必须**明确表态选哪个并说明理由**（一般游戏内技能应与游戏时间一致 → 选受 `timeScale` 影响的；UI 动画或真实等待 → 选不受影响的）。含糊带过不给高等级。
- 加分：指出 `Time.time` 在长时间运行后精度下降，对长时间计时可考虑用 `Time.unscaledTimeAsDouble`（能提到「有 double 精度的版本」即可，具体 API 名不确定时可以说明而不硬写）。
- 加分：说明 UI 每帧读属性而不是让冷却去 `Find` UI 对象——依赖方向是 UI → 冷却。

**典型错误回答**
- 用协程或 `Invoke` 实现（违反题目要求）。
- 用 `timer -= Time.deltaTime` 但不提长帧误差，也不说时间源。
- 把 UI 引用塞进冷却类里（`[SerializeField] private Image cooldownMask;`）。
- `Normalized` 方向搞反且不自知。
- 用 `DateTime.Now` 之类的墙上时钟（与游戏暂停无关，且受系统时间调整影响）。

**加难追问**
如果这个技能冷却需要**存档**（关掉游戏再打开，冷却还剩几秒要保留），你现在的设计需要改什么？用 `Time.time` 能直接存吗？为什么不行？

**降难追问**
冷却还剩几秒，用「每帧 `timer -= Time.deltaTime`」和「记住一个结束时刻，每次算差值」，哪一种在掉帧时更准？为什么？

**1–5 等级锚点**
- 1：仍然用协程/`Invoke`，或完全写不出。
- 2：写出了倒计时，但缺 `Normalized` 或时间源说明。
- 3：用时间戳实现，两个属性都正确，方向自洽。
- 4：主动讨论时间源与 `timeScale` 的关系，并说明对暂停的期望行为。
- 5：能处理存档/长时间精度/依赖方向等边界，并解释为什么不让冷却类持有 UI 引用。

---

## 维度 7：解释与迁移

### Q7-1 预测这行代码的 GC 开销

**题目**
下面是同一件事的两种写法。请预测：**哪一种会在运行中持续产生垃圾（GC Alloc）**，为什么？并说出 `GetComponent` 本身在这两种写法下的开销差别。

```csharp
// 写法 A
private void Update()
{
    var sr = GetComponent<SpriteRenderer>();
    sr.color = Color.Lerp(Color.white, Color.red, Mathf.PingPong(Time.time, 1f));
}

// 写法 B
private SpriteRenderer sr;

private void Awake()
{
    sr = GetComponent<SpriteRenderer>();
}

private void Update()
{
    sr.color = Color.Lerp(Color.white, Color.red, Mathf.PingPong(Time.time, 1f));
}
```

**考察维度**：解释与迁移
**最小诊断类别**：理解预测
**类型**：推理性
**前置知识**：值类型与引用类型、装箱

**合格回答要点**
- 必须区分**两个独立的成本**，很多学员会混成一个：
  1. **`GetComponent` 的调用成本**：写法 A 每帧调用一次。`GetComponent` 是原生调用、需要在组件列表里查找，成本明显高于一次普通字段读取；`Update` 每帧执行，帧率 60 时就是每秒 60 次。
  2. **GC 分配**：这两段代码里的 `Color.Lerp` 返回的是 `Color`（值类型 `struct`），`Mathf.PingPong` 返回 `float`，都**不产生堆分配**；`Color.white` / `Color.red` 是静态属性，也不是每次新建对象。所以**严格讲，这两段代码本身都不会产生托管堆垃圾**。
- 因此正确答案是：**写法 A 的主要代价是每帧的 `GetComponent` 查找开销，而不是 GC 分配**；写法 B 缓存引用后两者都消除。
- 能明确指出「不要一看到 `Update` 里有调用就说它产生 GC」——是否有分配取决于返回值是不是引用类型、有没有装箱、有没有闭包/字符串拼接/`new`。能说出这些判据才算真的掌握。
- 加分：给出「怎么验证」——用 Profiler 看 GC Alloc 列，或看 CPU 模块里 `GetComponent` 的耗时占比。
- 加分：提到如果 `GetComponent<T>()` 里的 `T` 是**接口类型**，在较早的 Unity 版本上会走不同的查找路径、成本更高（并说明「不确定具体版本行为时应实测」）。
- 加分：指出如果 `sr` 在运行时可能被销毁，缓存后需要判空（Unity 的「已销毁对象」判空行为）。

**典型错误回答**
- 「写法 A 每帧 `GetComponent` 会产生大量 GC」——把查找开销错误地归为 GC，这是本题最典型的误答，必须扣在该维度上。
- 「`Color.Lerp` 会产生 GC，因为是函数调用」。
- 「两种写法一样，反正编译器会优化」。
- 说不出怎么验证，只凭印象。

**加难追问**
现在把写法 B 改成在 `Update` 里拼接调试字符串：`Debug.Log("color=" + sr.color.ToString("F2"));`，这时会不会产生 GC？为什么？如果这段日志只在按住某个键时才打印，问题是否就解决了？（提示：`Debug.Log` 的字符串参数在调用前就已经被拼接出来了。）

**降难追问**
`Color` 是 `class` 还是 `struct`？这个答案和「会不会产生 GC」有什么关系？

**1–5 等级锚点**
- 1：坚称写法 A 产生大量 GC，并以此为主要理由。
- 2：知道要缓存 `GetComponent`，但把理由说成 GC。
- 3：能区分「调用开销」与「GC 分配」，判断正确。
- 4：判据清晰（值类型/引用类型、装箱、闭包、字符串），并能说出验证手段。
- 5：能主动扩展到接口 `GetComponent`、销毁后判空、字符串拼接等真实分配源的识别。

---

### Q7-2 把「事件订阅泄漏」迁移到新代码

**题目**
先看这个已修复的例子（面板关闭时解绑，修复了「点一次触发多次」）：

```csharp
private void OnEnable()  { health.Changed += OnHealthChanged; }
private void OnDisable() { health.Changed -= OnHealthChanged; }
```

现在有三段**新代码**，请分别判断「会不会有同一类问题」，并说明触发条件：

```csharp
// 片段 1：订阅一个全局事件总线
private void Start()
{
    EventBus.OnScoreChanged += UpdateScoreUI;
    EventBus.OnLevelUp += ShowLevelUp;
}

// 片段 2：订阅自己 new 出来的临时对象
private void Start()
{
    var spawner = new EnemySpawner();
    spawner.OnSpawned += HandleSpawned;
}

// 片段 3：用 lambda 订阅，且没有解绑
private void OnEnable()
{
    button.onClick.AddListener(() => DoSomething(this));
}
```

**考察维度**：解释与迁移
**最小诊断类别**：问题定位
**类型**：综合
**前置知识**：事件订阅与生命周期

**合格回答要点**
- **片段 1：有同类问题，且更危险。** `EventBus` 是静态/全局的，它的生命周期长于这个 MonoBehaviour；`Start` 只订阅不解绑 → 对象被销毁后**订阅依然存在于总线里**，总线持有该对象的委托引用，导致：
  - 对象无法被 GC 回收（**内存泄漏**，这是比重复触发更隐蔽的后果）；
  - 下次事件触发时**调用到已销毁对象的方法**，抛 `MissingReferenceException` 或空引用。
  - 修复：改在 `OnEnable`/`OnDisable` 成对订阅解绑；若必须在 `Start` 订阅，则至少在 `OnDestroy` 解绑（但 `OnDisable` 更稳）。能指出「全局事件的订阅要用 `OnEnable`/`OnDisable` 而不是 `Start`/`OnDestroy`」即为高等级。
- **片段 2：没有泄漏，但要说明理由。** `spawner` 是局部变量 `new` 出来的，没有被任何长生命周期对象持有；这个对象和订阅者**同时变得不可达**，所以能一起被回收。但要点出**真正的问题**：`spawner` 是局部变量，方法结束后就没有引用了，这个 spawner **永远不会有人调用它的逻辑**（它也无法被看到），这段代码是无效代码。这属于「没泄漏但设计错误」。
- **片段 3：有同类问题，且是 lambda 特有的陷阱。** 每次 `AddListener` 都创建一个**新的 lambda 实例**，因此：
  - 无法用 `RemoveListener(同一个 lambda)` 解绑——因为每次写 `() => DoSomething(this)` 都是不同对象，这行代码**根本做不到解绑**；
  - `OnEnable` 每执行一次就多一个 lambda，重复触发随之递增；
  - lambda 捕获了 `this`，还额外延长了该 MonoBehaviour 的存活（配合全局事件时形成泄漏链）。
  - 修复：把 lambda 提取成具名方法（`private void OnClick() => DoSomething(this);`）后按常规 `AddListener`/`RemoveListener` 成对处理。
- 综合结论：**判断「会不会泄漏」的关键不是「有没有订阅」，而是「被订阅者的生命周期是否长于订阅者」**。这条判据能直接迁移到任何新代码上。
- 加分：指出可以用「先解绑再订阅」（`-=` 然后 `+=`）作为幂等订阅的防御写法，并说明它的适用场景与代价。

**典型错误回答**
- 三个片段一律答「都会泄漏」——说明只有模式记忆，没有生命周期判据。
- 三个片段一律答「都不会泄漏，因为解绑那一步只是好习惯」。
- 片段 2 答「会泄漏，因为没有解绑」——没看出被订阅者也是临时对象。
- 片段 3 答「可以直接 `RemoveListener(() => DoSomething(this))`」——这是本题最关键的错误，必须指出。
- 完全不提「对象无法被 GC 回收」这层后果，只谈重复触发。

**加难追问**
如果 `EventBus` 是静态的，而订阅者是一个随场景反复卸载的对象，你会怎么**验证**它真的泄漏了？请给出一个可观察的验证方法。（提示：观察每次场景重载后事件触发次数，或看内存快照里该类型实例数是否持续增长。）

**降难追问**
只判断片段 1：`EventBus` 和这个 MonoBehaviour，谁活得更久？订阅者先死了、被订阅者还活着的情况下，会发生什么？

**1–5 等级锚点**
- 1：三个片段一律同答，或认为 lambda 能正常解绑。
- 2：能指出片段 1 和 3 有问题，但理由停留在「没解绑」这一层。
- 3：三个片段判断正确，且能说出「生命周期长短」这一判据。
- 4：能说明泄漏的内存后果（无法回收 / 调用已销毁对象），并给出 lambda 的具体修复。
- 5：能主动提出验证泄漏的可观察方法，并讨论「先解绑再订阅」的幂等写法及其代价。

---

## 讲授后确认题

> 本节题目**不作为首次接触题**：当学员明说没学过、或该知识点在其记录中既无"已验证"也无"部分验证"时，
> 先按引擎 **R9** 讲授，再用这些题作**确认题**（确认题不是实测）。题面中的讲授要点即讲授时应覆盖的内容。

### Q1-1 生命周期调用顺序

**题目**
下面这个脚本挂在场景里一个**初始处于未启用**的 GameObject 上（Hierarchy 中该对象未勾选）。之后在运行时把它 `SetActive(true)`。

```csharp
using UnityEngine;

public class LifecycleProbe : MonoBehaviour
{
    [SerializeField] private int seed = 7;

    private void Awake()   { Debug.Log("A"); }
    private void OnEnable(){ Debug.Log("B"); }
    private void Start()   { Debug.Log("C"); }
    private void Update()  { Debug.Log("D"); }
    private void OnDisable(){ Debug.Log("E"); }
    private void OnDestroy(){ Debug.Log("F"); }
}
```

请说出：从 `SetActive(true)` 那一刻起，Console 里**按什么顺序**出现这些字母，以及每个字母**出现几次**（`Update` 按「至少一次」计）。如果之后又 `SetActive(false)`，再补一句会发生什么。

**考察维度**：基础知识
**最小诊断类别**：理解预测
**类型**：事实性
**前置知识**：无（但属边界细节：仅在学员自述熟悉生命周期、或已按 R9 讲授后使用）

**合格回答要点**（依据见文件头部「生命周期题（Q1-1）的依据来源」）
- 关键区分：`Awake` 绑定的是「脚本实例何时被创建」，**不是**「对象是否已激活」。官方文档列出三种触发情形：父对象**处于激活**且在场景加载时初始化、父对象**由未激活转为激活**、`Instantiate` 创建的对象初始化之后。
- 因此本题的对象初始未激活，**场景加载时不会执行 `Awake`**；它推迟到 `SetActive(true)` 那一刻。正确顺序是 `Awake → OnEnable → Start → Update…`，即从 `SetActive(true)` 起依次出现 A B C D…（`Awake` 与 `OnEnable` 的先后不可颠倒）。
- `SetActive(false)` 只触发 `OnDisable`（E），此后 `Update` 停止，**不会**触发 `OnDestroy`；`OnDestroy` 只在真正销毁（`Destroy` 或场景卸载）时触发一次。
- 再次 `SetActive(true)` 会**只**再触发 `OnEnable` 与随后的 `Update`，**不会**再触发 `Awake` 或 `Start`。
- 判分边界（勿与本题混淆）：`enabled = false`（**组件**禁用）与对象未激活不是一回事——官方文档明确 `Awake` 在「脚本是激活对象上的禁用组件」时**仍会**执行。

**典型错误回答**
- 把顺序说成 `OnEnable → Awake → Start → Update`（激活回调排在初始化回调之前）——最常见，说明把「对象被激活」与「脚本实例被创建」当成同一件事。
- 「每次 `SetActive(true)` 都会重新 `Start` 一次」。
- 把顺序说成 `Start → Awake → OnEnable`。
- 认为 `SetActive(false)` 会触发 `OnDestroy`，或把 `OnDisable` 与 `OnDestroy` 混为一谈。
- 反向错误：以为本题对象在场景加载时就执行了 `Awake`（把「激活对象上的禁用组件仍会执行 `Awake`」这条规则错误外推到「未激活对象」）。

**加难追问**
如果这个对象不是场景里预先摆好的，而是运行时用 `Instantiate` 创建的预制体实例，且预制体在资产里保存时就是**未勾选**状态，`Awake` 的时机与上面有什么不同？再进一步：如果父对象被 `SetActive(false)`，子对象上的 `OnDisable` 会不会触发？
（判分注意：官方文档对「`Instantiate` 创建」这一情形未加「处于激活」的限定词，与「场景中初始未激活」的措辞不同——这属于引擎 **R10 的例外情形（文档措辞自相矛盾／版本差异）**，因此**可以**要求实测：先给出所依据的文档章节，再让学员实测确认，而不是凭文档措辞反推。其余情形（生命周期顺序本身）按 R10 属"通常可静态判定"，不需实测。）

**降难追问**
只回答一个问题：`Start` 在一个 MonoBehaviour 的一生中会被调用几次？`OnEnable` 呢？为什么这两个答案不一样？

**1–5 等级锚点**
- 1：认为未启用对象完全不会执行任何回调，或顺序说不出。
- 2：知道 `Awake` 在最前、`Update` 在最后，但把 `Awake` 与 `OnEnable` 的先后说反，或说不清 `Start` 只一次而 `OnEnable` 可多次。
- 3：顺序正确（`Awake → OnEnable → Start → Update…`），知道 `Start` 只一次、`OnEnable` 可多次，但仍不确定 `SetActive(false)` 是否触发 `OnDestroy`。
- 4：顺序、次数与 `SetActive(false)` 的后果全部正确，能说明 `Awake` 与「脚本实例是否已创建」相关，并能区分 `enabled = false` 与 `SetActive(false)`。
- 5：能主动指出 `Instantiate`（含运行时创建）与场景预置两种情形下 `Awake` 时机的差异，并由此说明「不要在 `Awake` 里依赖另一个对象的 `Start` 结果」。

**讲授要点（讲授时须覆盖）**

- 本题对象**初始未激活**：**场景加载时不会执行 `Awake`**；它推迟到 `SetActive(true)` 那一刻。从那一刻起依次是 `Awake → OnEnable → Start → Update…`（A B C D…），**`Awake` 与 `OnEnable` 的先后不可颠倒**。
- 关键区分：`Awake` 绑定的是「**脚本实例何时被创建**」，**不是**「对象是否已激活」；官方文档列出的三种触发情形见上方「合格回答要点」。
- `Start` 一生只一次；`OnEnable`／`OnDisable` 可多次；`Update` 随激活状态启停；再次 `SetActive(true)` **不会**重跑 `Awake`／`Start`。
- `OnDestroy` 只在真正销毁时一次；`SetActive(false)` **不是**销毁，只触发 `OnDisable`。
- **易混边界（勿外推）**：`enabled = false`（**组件**禁用、对象仍激活）时 `Awake` **仍会**执行——这条**不适用**于「未激活对象」，把它外推正是本题的典型错误回答之一。
- `Instantiate` 创建的对象（含资产里就未勾选的预制体）`Awake` 时机与上面不同，属 R10 的例外情形，需按文档章节实测确认。
- 判分仍用本题原有的 1–5 等级锚点，但**结论用于确认讲授效果**，不是首次能力诊断。

---

## 最小覆盖索引

> **零基础／无状态学员先读**：他们无法判定任何题目的 `前置知识`，因此**不在首次接触取诊断题**——按 `diagnosis.md` 的"零基础／无状态学员的首次接触"规则，先就当前目标最缺的一个机制讲授，再用《讲授后确认题》与后续可用题凑齐三类覆盖（结论记 `stage: 0`）。
>
> **首触可用题**（`前置知识` 为"无（可首触）"，可直接用于首次诊断）：**Q1-3**。其余题目各有前置，请先核对 `前置知识` 或改用确认题路径。

排一次 3 题诊断时，按下列组合任选一组即可满足「一项理解预测 + 一项问题定位 + 一项小型实现」，且不重复维度。

| 类别 | 可用题目 |
| --- | --- |
| **理解预测** | Q2-1 协程与禁用销毁、Q3-2 物理与帧率、Q7-1 GC 开销预测（Q1-1 已移入《讲授后确认题》，只作讲授后的确认使用） |
| **问题定位** | Q1-2 Inspector 值被覆盖、Q3-1 打开背包卡顿、Q4-1 按钮重复触发、Q4-2 触发器不触发、Q5-1 asmdef 引用、Q7-2 订阅泄漏迁移 |
| **小型实现** | Q2-2 ScriptableObject 配置、Q5-2 拆分上帝类、Q6-1 对象池、Q6-2 技能冷却 |

**按原型推荐的 3 题组合**

| 学员要做哪个原型 | 推荐组合 | 理由 |
| --- | --- | --- |
| 2D 玩法原型 | Q3-2 + Q4-2 + Q6-1 | 物理与帧率是 2D 手感的直接来源；触发器是 2D 最高频卡点；对象池是该原型的第一扩展项 |
| 3D 移动与相机 | Q2-1 + Q3-2 + Q6-2 | 协程与对象禁用／销毁直接关系到相机与状态复位；帧率影响手感；冷却/计时考察时间源理解 |
| 编辑器工具 / 资源管线 | Q7-1 + Q5-1 + Q2-2 | 分配开销预测决定工具能否用在批量场景；asmdef 决定工具能否打包；配置化是编辑器侧的日常 |
| 数据驱动 UI 与存档 | Q2-1 + Q4-1 + Q2-2 | 生命周期与禁用/销毁直接决定 UI 回调是否还在跑；事件重复绑定是复发点；配置化是存档的基础 |
| 小规模网络同步 | Q2-1 + Q4-1 + Q6-2 | 生命周期与断线回调强相关；订阅泄漏在联网场景会放大；计时/状态管理要能脱离协程实现 |
| 性能优化专项 | Q7-1 + Q3-1 + Q6-1 | 必须能把「调用开销」和「GC 分配」分开，且能用数据定位；对象池是最小可验证的优化实现 |
