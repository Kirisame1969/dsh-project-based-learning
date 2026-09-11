# Unity / C# 术语表（中英对照）

> 用途：教练与学员对齐用词。学员说出「中文名」时，教练应能对应到「英文名」，因为 Unity 报错、Inspector 字段名、官方文档都以英文呈现。
> 「易混点」列只写这一条最容易被误解的地方，不写完整定义。

## A. C# 语言

| 中文名 | 英文名 | 一句话说明 | 易混点 |
| --- | --- | --- | --- |
| 引用类型 | reference type | 变量存的是对象地址，赋值只复制地址 | 与值类型混淆：`Vector3 a = b;` 改 `a` 不影响 `b` |
| 值类型 | value type | 变量直接存数据本身，赋值复制整份数据 | `struct` 默认是值类型，`class` 是引用类型 |
| 装箱 | boxing | 把值类型转成 `object` 时会新建堆对象 | 每次装箱都产生垃圾，是隐藏的 GC 来源 |
| 拆箱 | unboxing | 把装箱后的 `object` 转回值类型 | 类型不符会抛 `InvalidCastException` |
| 垃圾回收 | Garbage Collection (GC) | 运行时自动回收不再使用的托管堆内存 | Unity 用的是 Boehm 式非分代 GC，一次回收容易造成卡顿 |
| 托管堆 | managed heap | C# 对象所在、由 GC 管理的内存区域 | 与 Unity 的原生内存（贴图、Mesh）是两套账 |
| 属性 | property | 带 `get`/`set` 的成员，语法像字段 | 属性不能被 `[SerializeField]` 直接序列化 |
| 自动属性 | auto-property | 编译器自动生成后备字段的属性 | `public int Hp { get; set; }` 不会出现在 Inspector |
| 接口 | interface | 只声明契约、不含实现的类型 | Unity 旧版不支持在 Inspector 里直接拖接口引用 |
| 委托 | delegate | 指向方法的类型，可当参数传递 | 与 `event` 关键字不是一回事 |
| 事件 | event | 基于委托、只允许 `+=`/`-=` 的成员 | 外部无法直接调用或清空事件 |
| 匿名方法 | anonymous method | 用 `delegate {}` 或 `=>` 就地写的方法体 | 闭包会捕获外部变量，导致对象无法释放 |
| 闭包 | closure | lambda 捕获了外部局部变量后形成的引用 | 循环里捕获循环变量是经典错误 |
| 装箱集合 | non-generic collection | `ArrayList`、`Hashtable` 等 `System.Collections` 类型 | 新代码一律用 `List<T>`、`Dictionary<K,V>` |
| 泛型 | generics | 用类型参数写一份代码适配多种类型 | 泛型集合通常不装箱 |
| 可空类型 | nullable type | `int?` / `float?`，表示「可能没有值」 | `Vector3?` 与 `Vector3` 是不同类型 |
| 结构体 | struct | 值类型的数据容器，常用于小型数据 | `struct` 方法内改字段不会改到调用者的副本 |
| 静态成员 | static member | 属于类型而非实例，全局只有一份 | 静态字段跨场景重载不会自动重置 |
| 分部类 | partial class | 一个类拆到多个文件声明 | Unity 生成的代码常用它，手写代码别重复声明 |
| 只读字段 | readonly field | 只能在声明处或构造函数里赋值 | `readonly` 不等于「引用内容不可变」 |
| 常量 | const | 编译期常量，只能用于基本类型和字符串 | `const` 会内联进调用方程序集，改值需重新编译所有程序集 |
| 静态只读 | static readonly | 运行期初始化一次，可用于复杂类型 | 初始化时机不确定，别依赖它做跨脚本初始化 |
| 命名空间 | namespace | 类型的逻辑分组，避免重名 | 不会自动成为 `using`，跨程序集还要引 asmdef |
| 特性 | attribute | 附加在类型/成员上的元数据标记 | `[SerializeField]`、`[Test]`、`[RequireComponent]` 都是特性 |
| 扩展方法 | extension method | 在静态类里为已有类型「加」方法 | 必须写在非泛型静态类里，第一个参数带 `this` |
| 异步方法 | async method | 用 `async`/`await` 写、由状态机驱动的方法 | 与协程是两套机制，不能互相 `yield` |
| 任务 | Task | .NET 的异步操作抽象 | `Task` 的续体默认不保证回到 Unity 主线程 |
| 可枚举 | IEnumerable | 能被 `foreach` 遍历的对象 | 协程里 `yield return someEnumerable` 的语义和普通 `foreach` 不同 |

## B. Unity 运行时

| 中文名 | 英文名 | 一句话说明 | 易混点 |
| --- | --- | --- | --- |
| 游戏对象 | GameObject | 场景里的容器实体，本身不含行为 | GameObject 的「启用」和组件的「启用」是两级开关 |
| 组件 | Component | 挂在 GameObject 上提供功能 | 所有组件都继承自 `Component` |
| 行为脚本 | MonoBehaviour | 可挂载、有生命周期回调的脚本基类 | 不继承它就进不了 Inspector、收不到 `Update` |
| 变换 | Transform | 位置/旋转/缩放组件，每个 GameObject 必有 | 3D 用 `Transform`，2D 也用它但只看 XY |
| 刚体 | Rigidbody | 让对象受物理引擎驱动 | 2D 用 `Rigidbody2D`，强行混用不生效 |
| 碰撞体 | Collider | 定义物理外形 | 触发器也要碰撞体，只把 `isTrigger` 打勾 |
| 触发器 | Trigger | 只检测「进入/停留/离开」不做物理反弹 | 触发需要至少一方带刚体 |
| 预制体 | Prefab | 可复用的 GameObject 模板 | 实例上的改动要 Apply 才回写模板 |
| 实例化 | Instantiate | 运行时从预制体/对象复制出新实例 | 频繁调用是性能与 GC 大坑 |
| 销毁 | Destroy | 延迟到帧末真正删除对象 | 销毁后同一帧内引用仍「非空」但在 Unity 里等同已死 |
| 立即销毁 | DestroyImmediate | 立刻删除对象 | 官方不建议在运行时用，容易破坏遍历与引用 |
| 生命周期回调 | lifecycle callback / message | Unity 按固定顺序反射调用的方法 | 顺序不随脚本挂载顺序或代码书写顺序变化 |
| 启用回调 | OnEnable | 组件被启用时调用，可能多次触发 | 与 `Start` 不同：禁用再启用会再调一次 |
| 物理帧 | FixedUpdate | 固定时间步长调用，物理相关逻辑写这里 | 与 `Update` 帧率不同步，别在这里读输入 |
| 逐帧更新 | Update | 每渲染帧调用一次 | 帧率越高调用越频繁，逻辑要乘 `deltaTime` |
| 迟帧更新 | LateUpdate | 所有 `Update` 之后调用 | 相机跟随应写在这里，避免抖动 |
| 帧间隔 | deltaTime | 上一帧到这一帧的秒数 | `FixedUpdate` 里应使用 `fixedDeltaTime` |
| 时间缩放 | Time.timeScale | 全局时间倍率，`0` 即暂停 | 设为 0 后 `Update` 仍执行，`FixedUpdate` 停止 |
| 协程 | Coroutine | 用 `IEnumerator` + `yield` 写的分帧流程 | 由挂载它的 MonoBehaviour 驱动，组件禁用即失效 |
| 等待指令 | yield instruction | `yield return` 后面跟的等待对象 | `WaitForSeconds` 受 `timeScale` 影响，`WaitForSecondsRealtime` 不受 |
| 脚本化对象 | ScriptableObject | 可当资源保存的数据容器，适合放配置 | 它是资源不是场景对象，不能用 `Instantiate` 当运行时实例 |
| 单例 | singleton | 全局唯一访问点 | `static Instance` 跨场景不重置，是常见脏状态来源 |
| 对象池 | object pool | 复用对象、避免频繁创建销毁 | 取出的对象要重置状态，否则带回上次的脏数据 |
| 射线检测 | Raycast | 从一点沿方向探测碰撞体 | 2D 必须用 `Physics2D.Raycast`，不通用 |
| 刚体插值 | interpolation | 在物理步之间平滑渲染位置 | 不解决逻辑抖动，只改善视觉 |
| 主线程 | main thread | 唯一能安全访问 Unity API 的线程 | 子线程调 Unity API 会抛异常或崩溃 |
| 时间步长 | fixedDeltaTime | 物理帧的固定间隔 | 改它会影响所有物理行为的手感 |

## C. Unity 编辑器

| 中文名 | 英文名 | 一句话说明 | 易混点 |
| --- | --- | --- | --- |
| 检视窗口 | Inspector | 显示并编辑选中对象/资源的字段 | 只显示可序列化字段 |
| 序列化 | serialization | 把字段值保存进场景/预制体/资源文件 | `public` 字段默认序列化，`private` 需要 `[SerializeField]` |
| 序列化字段 | SerializeField | 让私有字段出现在 Inspector 并被保存 | 加了这个特性字段仍不是 `public` |
| 隐藏字段 | HideInInspector | 让公开字段不显示但仍被保存 | 与 `[NonSerialized]` 完全不同，后者不保存 |
| 不可序列化 | NonSerialized | 标记字段完全不参与序列化 | 运行时赋值在重载后会丢失 |
| 自定义编辑器 | custom Editor / EditorWindow | 扩展 Inspector 或新建编辑器窗口 | 编辑器代码必须放在 `Editor` 文件夹或编辑器程序集 |
| 资产数据库 | AssetDatabase | 编辑器侧访问/刷新资源的 API | 只能在编辑器里用 |
| 菜单项 | MenuItem | 给编辑器菜单加自定义入口 | 同样属于编辑器专用 API |
| 控制台 | Console | 显示日志、警告、错误的窗口 | `Debug.Log` 在正式包里也会执行 |
| 播放模式 | Play Mode | 编辑器内运行游戏的模式 | Play 模式下的改动默认不保存回资源 |
| 暂停 | pause | 冻结编辑器更新 | 暂停时 `Update` 不再执行，协程也停 |
| 帧调试器 | Frame Debugger | 逐 DrawCall 查看渲染过程 | 与 Profiler 分工不同 |
| 性能分析器 | Profiler | 采样 CPU/GPU/内存开销 | 连接真机分析才有意义，编辑器数据会偏高 |
| 域重载 | Domain Reload | 进入 Play 模式前重新加载脚本域 | 关闭它会让静态字段不再自动重置 |
| 资源导入设置 | import settings | 每种资源各自的导入参数 | 2D 项目常要手动改贴图的 Pixels Per Unit 与 Filter Mode |

## D. 构建与程序集

| 中文名 | 英文名 | 一句话说明 | 易混点 |
| --- | --- | --- | --- |
| 程序集 | assembly | 编译产物的最小单元（`.dll`） | 它决定了「哪些代码能看见哪些代码」 |
| 程序集定义 | assembly definition / asmdef | 用 `.asmdef` 文件把脚本划分成独立程序集 | 划分后默认看不见其它程序集的类型 |
| 预定义程序集 | predefined assembly | `Assembly-CSharp`、`Assembly-CSharp-Editor` 等 | 所有没被 asmdef 覆盖的脚本都进 `Assembly-CSharp` |
| 程序集引用 | assembly reference | 在 asmdef 里声明依赖的其它程序集 | 循环引用会被 Unity 拒绝 |
| 编辑器程序集 | editor assembly | 只在编辑器编译、能访问 UnityEditor API | 平台设置里没排除 Editor 就会打包报错 |
| 脚本宏定义 | scripting define symbol | 按平台/配置条件编译的符号 | 写错符号名不会有任何提示，代码静默不编译 |
| 条件编译 | conditional compilation | `#if UNITY_EDITOR` 等预处理分支 | 分支写错会导致「编辑器里好、打包就挂」 |
| 构建目标 | Build Target | 目标平台（Windows/Android/WebGL…） | 与「运行平台」不是同一个概念 |
| 脚本后端 | scripting backend | Mono 或 IL2CPP | IL2CPP 会做代码剥离，反射用法容易被打掉 |
| 托管代码剥离 | managed stripping | 构建时移除未引用的代码 | 只靠反射调用的代码可能被误删 |
| 链接文件 | link.xml | 告诉剥离器保留指定类型 | 只在 IL2CPP/剥离开启时起作用 |
| 播放器日志 | Player.log | 打包后运行时的日志文件 | 与编辑器 `Editor.log` 路径不同 |
| 批处理模式 | batch mode | 无界面、无人工交互地运行编辑器 | 出异常会直接以返回码 1 退出 |
| 测试程序集 | test assembly | 引用了 NUnit 的程序集，测试必须放在里面 | 少了 `UnityEngine.TestRunner` 引用就不会被识别 |
| 编辑模式测试 | Edit mode test | 不在 Play 模式下运行的测试 | 无法测试依赖帧循环的行为 |
| 播放模式测试 | Play mode test | 在 Play 模式下运行、可跨帧的测试 | 跨帧测试需要 `[UnityTest]` 与 `yield` |
