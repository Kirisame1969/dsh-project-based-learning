# Unity / C# 可执行核对配方

> 用途：为 `task-loop` 与 `review-acceptance` 提供可直接复制的核对手段。
> 每条配方固定七字段：**目的 / 前置条件 / 命令 / 期望输出 / 失败含义 / 所需沙箱模式 / AI 可否代执行**。
>
> **标注约定**
> - 命令后带 `（未验证）`＝该命令或参数的完整形式**未经实测**，只作为方向提示；**不得仅凭未验证的命令判定验收通过**（领域包契约第 4 条）。
> - 未标注的命令＝本文件编写时已实测，或已对照下方官方文档逐字核对。
>
> **依据来源**（均为官方文档，逐条核对过参数拼写）
> - Unity Manual《Unity Editor command line arguments reference》：`-batchmode`、`-nographics`、`-quit`、`-quitTimeout`、`-projectPath`、`-logFile`、`-executeMethod`、`-accept-apiupdate`、`-buildTarget`
> - Unity Manual《Command-line reference》（Test Framework）：`-runTests`、`-testPlatform`、`-testResults`、`-testFilter`、`-testCategory`、`-assemblyNames`、`-testSettingsFile`、`-runSynchronously`、`-repeat`、`-retry`
> - Unity Manual《Run tests from the command line》《Create a test assembly》《Log files reference》
> - Unity Manual《Awaitable completion and continuation》
> - Microsoft Learn《dotnet build》《dotnet test》
>
> **本工作区实测环境**（影响下列配方的可执行性，环境会变，使用前请重新核对）
> - `dotnet --list-sdks` → `8.0.302`、`8.0.405`、`9.0.315`（存在 .NET SDK）
> - `csc`、`msbuild` **不在 PATH 上**
> - 未发现 Unity 安装（`C:\Program Files\Unity\Hub\Editor` 不存在）
> - 因此 (a) 类配方在此环境可执行；(b)(c) 类配方需要用户自己的 Unity 环境，(d) 类为兜底。

---

## (a) 纯 C# 片段的语法 / 编译检查

### V-a1 有 .NET SDK：用 SDK 风格工程编译片段

**目的**
在不打开 Unity 的前提下，确认一段**不依赖 `UnityEngine`** 的纯 C# 片段能否通过编译，从而把「语法错误 / 类型错误」与「Unity 环境问题」分开。

**前置条件**
- 机器上存在 .NET SDK：`dotnet --list-sdks` 有输出。
- 待检查的片段**不引用 `UnityEngine` / `UnityEditor` 命名空间**（这是本配方的硬边界，见「失败含义」）。
- 片段中出现的类型都在 BCL 内，或已一并提供。

**命令**
```powershell
# 1. 建一个临时目录（放在工作区内，便于沙箱放行）
$d = ".\_snipcheck"
New-Item -ItemType Directory -Path $d -Force | Out-Null

# 2. 手写工程文件（不要用 dotnet new，原因见下方「注意」）
@'
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Library</OutputType>
    <TargetFramework>netstandard2.1</TargetFramework>
    <LangVersion>9.0</LangVersion>
    <Nullable>disable</Nullable>
    <AssemblyName>SnipCheck</AssemblyName>
    <EnableDefaultCompileItems>false</EnableDefaultCompileItems>
  </PropertyGroup>
  <ItemGroup>
    <Compile Include="Snippet.cs" />
  </ItemGroup>
</Project>
'@ | Set-Content -Path "$d\SnipCheck.csproj" -Encoding utf8

# 3. 把待检查的片段存成 Snippet.cs（UTF-8），然后编译
#    （把你的代码写入 $d\Snippet.cs）
dotnet build $d -v q --nologo
```

**期望输出**
- 成功：输出含「已成功生成。」（英文界面为 `Build succeeded.`），并有 `0 个警告` / `0 个错误`；退出码 `0`。
- 失败：退出码 `1`，并出现形如
  `…\Snippet.cs(3,61): error CS1002: 应输入 ; […\SnipCheck.csproj]`

**失败含义**
- 出现 `error CSxxxx` 且文件是 `Snippet.cs` → 片段本身有语法或语义错误；行号列号可直接定位。**这是本配方的主要价值。**
- 出现 `error CS0246: 未能找到类型或命名空间名"UnityEngine"`（或 `MonoBehaviour`、`SerializeField` 等）→ **不是学员的错**，而是本配方不适用于依赖 Unity 的片段。此类片段必须走 (b) 或 (d)。
- `error CS0518: 预定义类型"System.Object"未定义或导入` → 编译时没带上引用程序集，通常是用裸 `csc` 而非本配方所致（见 V-a2）。
- 还原（restore）阶段报网络错误 → 环境问题，与片段无关；可先 `dotnet build --no-restore` 或用已缓存的 SDK。

**所需沙箱模式**：**工作区可写**（需在磁盘上创建工程与中间产物；`obj/`、`bin/` 会写入）。
**AI 可否代执行**：**可以**。本配方已在当前环境实测通过（含成功与失败两条路径）。

**注意（重要，已实测）**
- **不要用 `dotnet new console` 建工程**。实测在受限环境下它会因模板引擎要写 `%USERPROFILE%\.templateengine\dotnetcli\<版本>` 而报
  `Unhandled exception: Access to the path '…\.templateengine\dotnetcli\9.0.315' is denied.`。
  手写 `.csproj`（如上）绕开模板引擎，更稳。
- `TargetFramework` 选 `netstandard2.1` 是刻意的：它与 Unity 的 **Api Compatibility Level = .NET Standard 2.1** 大致对应，能更接近 Unity 实际可见的 BCL 表面。若片段用了 `netstandard2.1` 之外的 BCL API，此处能编过但 Unity 里可能编不过——所以本配方通过**不等于**在 Unity 里通过。
- 检查完请删除临时目录，不要把它留在交付物里。

---

### V-a2 无 .NET SDK：可行替代与不可行替代

**目的**
在**没有** .NET SDK 的机器上，尽量完成同一件事，并如实说明能力边界。

**前置条件**
无 SDK；但机器上可能装了 Unity（Unity 自带 Roslyn 编译器与 Mono/IL2CPP 工具链）。

**可行程度分三种，按推荐顺序：**

1. **首选：改用 Unity 自身编译（跳到 V-b / V-c）**
   有 Unity 时，最可靠的「能不能编过」判据就是让 Unity 编译一次真实工程。它天然包含 `UnityEngine` 引用，不存在 V-a1 的边界问题。

2. **次选：调用 SDK 内置的 Roslyn `csc.dll`（部分可行，务必注意边界）**
   Roslyn 编译器随 .NET SDK 一起分发，实测路径形如
   `C:\Program Files\dotnet\sdk\<版本>\Roslyn\bincore\csc.dll`，可用 `dotnet` 直接启动：
   ```powershell
   $csc = "C:\Program Files\dotnet\sdk\9.0.315\Roslyn\bincore\csc.dll"
   & dotnet $csc /nologo /target:library /out:.\_snipcheck\out.dll .\_snipcheck\Snippet.cs
   ```
   实测结论（重要）：
   - 该调用**能报出语法错误**，例如 `…\A.cs(1,44): error CS1002: 应输入 ;` —— 所以它对「语法检查」这一项确实有用。
   - 但**裸调用无法完成完整编译**：不带 `/reference:` 时会报
     `error CS0518: 预定义类型"System.Object"未定义或导入`、
     `error CS0518: 预定义类型"System.Int32"未定义或导入`。
   - 因此**不能**把裸 `csc.dll` 当作 V-a1 的等价替代。要让它真正可用，必须手动补上引用程序集（`/reference:` 指向 `System.Runtime.dll` 等）。
   - **一套完整的、带 `/reference:` 且实测可用的 `csc.dll` 命令（未验证）** ——本次未实测出完整可用的引用集合。原因：需要按目标框架挑出 ref 程序集清单，版本相关，未逐一验证；因此不作为验收依据。
   - 另需注意：`csc` 可执行文件本身**不在 PATH 上**（实测 `Get-Command csc` 无结果），所以只能走上面的 `dotnet <csc.dll>` 形式。

3. **不可行：指望系统自带 `csc` 或 `msbuild`**
   实测本环境 `csc`、`msbuild` 均不在 PATH。除非用户确认已装 Visual Studio 或 Build Tools，不要把这两者写进配方。

**期望输出**
- 第 2 种：能定位语法错误即达到目的；出现 `CS0518` 属预期，不代表片段有错。
- 若三种都不可用（无 SDK、无 Unity、无 VS）→ 直接进入 (d) 降级方案，**不要伪造核对结果**。

**失败含义**
- `CS0518` → 缺引用程序集，是**工具用法**问题，不是学员代码问题。
- `error CS0246: 未能找到类型或命名空间名"UnityEngine"` → 同 V-a1，此路不通，转 V-b/V-c。

**所需沙箱模式**：**工作区可写**（要写 `out.dll` 等产物）。
**AI 可否代执行**：**部分可以**。语法错误定位可代执行；完整编译验证不可代执行，需明确声明未完成。

---

## (b) Unity Test Framework 命令行运行 EditMode / PlayMode 测试

### V-b1 批处理模式运行测试并导出结果

**目的**
让 Unity 自己编译并运行测试程序集，得到机器可读的测试结果，作为「行为是否正确」的硬证据。

**前置条件**
- 用户机器上装有 Unity 编辑器，且路径已知（Hub 安装时形如
  `C:\Program Files\Unity\Hub\Editor\<版本>\Editor\Unity.exe`）。
- 工程中**存在测试程序集**：按 Unity 文档，测试必须放在引用了 NUnit 的程序集里；通过 Test Runner 创建时会自动带上 `nunit.framework.dll`、`UnityEngine.TestRunner`、`UnityEditor.TestRunner` 三个引用，其中 `UnityEditor.TestRunner` 仅对 EditMode 测试可用。
- 该工程**没有被同一个编辑器实例打开**（文档明确：批处理模式下不能打开已被另一个实例打开的项目；同一时间只能有一个 Unity 实例运行）。
- 测试结果输出目录存在且可写。

**命令**
```powershell
# EditMode
& "C:\Program Files\Unity\Hub\Editor\<版本>\Editor\Unity.exe" `
  -runTests -batchmode `
  -projectPath "C:\path\to\YourProject" `
  -testPlatform EditMode `
  -testResults "C:\path\to\results-editmode.xml" `
  -logFile "C:\path\to\unity-test-editmode.log"

# PlayMode（把 -testPlatform 换成 PlayMode，结果与日志换文件名）
```

**期望输出**
- 进程结束后 `results-*.xml` 存在，内容为 **NUnit XML** 格式（文档：`-testResults` 指定的文件按 NUnit 定义的 XML 格式保存）。
- XML 里能看到每个测试的名字与结果（通过 / 失败 / 跳过），失败项带消息与堆栈。
- `-testResults` 省略时，结果文件默认落在**工程根目录**。

**失败含义**
- **不要把退出码当作唯一的通过判据。** 文档明确指出：目前**对被测的各个 Unity 组件所报告的退出码没有统一定义**，理解问题来源的最佳方式是错误消息与堆栈内容。因此**必须解析 XML / 读日志**，而不是只看 `$LASTEXITCODE`。
- 没有生成结果文件 → 测试根本没跑起来：常见原因是工程未编译通过、测试程序集缺少必需引用、或 `-projectPath` 指错。
- XML 中测试数为 0 → 测试程序集未被识别或未被包含。可用 `-assemblyNames "第一个;第二个"`（分号分隔、整体加引号）显式指定要包含的测试程序集；也可用 `-testFilter`（按测试全名或正则）、`-testCategory`（按类别）缩小范围。`-testFilter` 与 `-testCategory` 同时给出时，只有**两者都匹配**的测试会运行。
- 日志里出现编译错误（`error CS…`）→ 转 V-c 解读，此时测试未执行，不能判定通过。

**所需沙箱模式**：**工作区可写**（Unity 会写 `Library/`、`Temp/`、结果 XML 与日志）。
**AI 可否代执行**：**通常不可以**。需要本机安装 Unity 且路径已知；当前环境未发现 Unity 安装。AI 可以代为**生成命令、解读日志与 XML、写测试代码**，但**启动 Unity 这一步应由用户在自己的环境执行**。

**参数要点（均已对照文档核对）**
- `-batchmode`：文档要求命令行跑测试时使用它，以去掉人工交互（例如「保存场景」弹窗）。
- **绝对不要同时加 `-quit`。** 文档两处明确：`-quit` 在运行测试时**不受支持**；若编辑器正以 `-runTests` 跑测试，`-quit` 会让编辑器**立刻退出，使进行中的测试来不及完成**。
- `-testPlatform` 接受 `EditMode`、`PlayMode`，以及 `BuildTarget` 枚举中的任意值（后者表示在对应平台的 Player 上跑 PlayMode 测试）。**省略该参数时默认跑 EditMode。**
- `-runSynchronously`：让测试同步跑完（保证在一次编辑器 Update 内），**仅支持 EditMode**；跨帧的测试（`[UnityTest]`、或带 `[UnitySetUp]` / `[UnityTearDown]` 的测试）会被过滤掉。
- 稳定性相关：`-repeat <整数>`（重复成功测试）、`-retry <整数>`（重试失败测试）、`-randomOrderSeed <非零整数>`（随机顺序复现）。
- `-nographics` 慎用：它不初始化图形设备，适合无 GPU 的机器；但文档明确**该模式下输出日志会被关闭**，所以**必须同时用 `-logFile` 指定日志文件**。此外文档提示自动化工作流需要窗口处于焦点状态才能发送模拟输入命令——因此**依赖模拟输入的 PlayMode 测试在无头环境下可能无法工作**，这一点在验收前要先确认。

---

## (c) 编译错误日志的定位与解读

### V-c1 找到并解读 Editor.log / 批处理日志

**目的**
拿到 Unity 的完整错误输出，把「编译错误」翻译成可修改的具体位置；批处理模式下控制台只给精简日志，完整内容在日志文件里。

**前置条件**
- 知道日志路径或已用 `-logFile` 指定。
- 有读取该路径的权限。

**路径（Windows，已对照官方文档核对）**
| 日志 | 路径 |
| --- | --- |
| Editor.log | `%LOCALAPPDATA%\Unity\Editor\Editor.log` |
| Package Manager | `%LOCALAPPDATA%\Unity\Editor\upm.log` |
| Player.log（打包后运行时） | `%USERPROFILE%\AppData\LocalLow\<CompanyName>\<ProductName>\Player.log` |
| 崩溃文件 | `%TMP%\Unity\Editor\Crashes` |

也可以在编辑器里用 Console 窗口菜单的 **Open Editor Log** / **Open Player Log** 直接打开；代码里可用 `Application.consoleLogPath` 取到当前运行进程的日志位置（文档注明并非所有平台都支持）。

**命令**
```powershell
# 读 Editor.log 末尾（批处理刚跑完时最相关）
Get-Content "$env:LOCALAPPDATA\Unity\Editor\Editor.log" -Tail 200

# 只挑编译错误行
Select-String -Path "$env:LOCALAPPDATA\Unity\Editor\Editor.log" -Pattern "error CS" |
  Select-Object -First 40

# 批处理模式下自己指定日志路径（推荐，便于归档与对比）
& "C:\Program Files\Unity\Hub\Editor\<版本>\Editor\Unity.exe" `
  -batchmode -quit `
  -projectPath "C:\path\to\YourProject" `
  -logFile "C:\path\to\build.log" `
  -executeMethod YourNamespace.BuildEntry.Point
```

**期望输出**
- 编译错误形如 `Assets/Scripts/PlayerMove.cs(23,17): error CS0103: 当前上下文中不存在名称"rb"` —— **文件(行,列)** 可直接定位。
- 成功时日志尾部会有编译完成 / 构建完成的记录，且没有 `error CS` 行。
- 批处理模式下，文档说明 Unity 只把**精简版**日志发到控制台，**完整日志仍在日志文件里**——所以只读控制台是不够的。

**失败含义**
- 有 `error CS` → 编译未通过，后续测试/构建都无效，**不得据此判定任何功能通过**。
- 日志里是**警告**（`warning CS…`）时不算失败，但涉及 `CS0618`（使用了过时 API，例如 Unity 6 中的 `Object.FindObjectOfType`）应提示学员改用官方建议的替代 API。
- 出现 `error CS0246: 未能找到类型或命名空间名"UnityEditor"` → 编辑器脚本泄漏到了运行时程序集或未排除平台，见 `pitfalls.md` P-16。
- 出现「程序集引用…循环」之类的提示 → 见 `pitfalls.md` P-18。
- 日志里没有 `error CS` 但功能没生效 → 属运行期问题，不是编译问题；改用 (d) 收集运行日志，或按 `pitfalls.md` 的症状表排查。

**关于「让批处理以失败退出」**
文档明确：用 `-executeMethod` 时，可以通过**抛异常**（会让 Unity 以返回码 1 退出）或调用 `EditorApplication.Exit(非零返回码)` 来把失败反馈给命令行；并且要求被执行的脚本放在 `Editor` 文件夹、方法为 `static`。这条是让 CI 能判断成败的正规做法。

**关于 `-logFile` 的一个坑（已核对文档）**
`-logFile -` 表示输出到 stdout；但文档同时指出 **Windows 上默认并不存在 stdout 流**，且若把 `-` 指向 stdout，在控制台窗口里**看不到输出**。因此在 Windows 上做自动化时，**优先显式给出日志文件路径**，而不是依赖 `-`。
`-nographics` 模式下输出日志被关闭，也必须配 `-logFile`。

**所需沙箱模式**：**只读**即可（仅读取日志文件）。若要跑批处理、写 `build.log`，则需要**工作区可写**，且日志路径应落在工作区内。
**AI 可否代执行**：**可以代读与代解读**（读日志、grep 错误行、归类错误）。**不能代跑 Unity**；另外 `%LOCALAPPDATA%` 在**工作区之外**，受沙箱限制时 AI 可能读不到，此时应请用户把日志片段粘贴过来，或让用户改用 `-logFile` 输出到工作区内。

---

## (d) 无 Unity 环境时的降级方案

### V-d1 静态审查 + 索取证据 + 显式声明未验证

**目的**
在无法运行 Unity、无法编译、无法跑测试的条件下，仍然推进教学，同时**不把未验证的东西说成已验证**。

**前置条件**
- 明确承认当前环境**不能**执行 (b)(c)。
- 用户愿意提供材料或按指引自查。

**步骤与命令**

**第 1 步：只读静态审查（AI 可代执行）**
只审可静态判定的事项，例如：
- 生命周期回调里是否有明显的赋值覆盖 Inspector 值（P-01）；
- 协程里是否承担了「必须执行的复位」（P-03）；
- `AddListener` / `+=` 是否都有配对的解绑（P-11、P-12）；
- 物理位移与速度赋值是否写在 `Update`（P-09）；
- 是否有 `UnityEditor` 引用出现在非 `Editor` 目录的脚本里（P-16）；
- asmdef 的引用方向是否存在环（P-18）。
这一类的判据是**代码文本本身**，不需要运行，因此结论可以标为「已核对」，但只能支持「结构与质量」「基础知识」类判断。

**第 2 步：向用户索取最小证据集（按优先级，一次只要必需项）**
1. **精确的报错文本**（不是「报错了」，而是整行 `error CS…` 或异常全文 + 堆栈）。
2. **可复现步骤**：从哪个场景、按什么顺序操作、期望什么、实际什么。
3. **Editor.log 或 Player.log 的相关片段**（用 V-c1 的 `Select-String -Pattern "error CS"` 抽出来，附前后各 10 行）。
4. **Console 截图**：要求包含**完整错误首行**，不要只截红色图标。
5. **Profiler 截图**（性能类问题必需）：要求同时能看到**帧号/时间范围**与**具体方法名及数值**，不接受只有曲线形状的截图。
6. **运行环境信息**：Unity 版本、目标平台、是否 Development Build。版本尤其重要——`Rigidbody2D.linearVelocity` 与 `velocity` 的命名差异、`FindObjectOfType` 是否已过时，都随版本变化。

**第 3 步：明确声明未验证**
- 凡未实际编译 / 未实际运行 / 未实际跑测试得出的结论，一律标 **待验证** 或 **部分验证**，并在回复里**逐条写出「未验证」字样与未验证的原因**（例如「本机无 Unity 环境，此结论仅基于静态审查，未运行验证」）。
- 依据领域包契约：**不得仅凭标注为未验证的命令判定验收通过**。

**期望输出**
- 一份「已核对（静态）」与「待验证（需运行）」分开列出的清单，每项注明证据来源与核对状态。
- 明确列出「下一轮待验证的假设」，例如「假设 `FixedUpdate` 迁移后帧率依赖消失，将在用户提供两次对比数据后验证」。

**失败含义**
- 若用户无法提供任何运行证据 → 只能停在「部分验证」，**不得判「通过」**；此时应把任务目标收窄为「产出一个可复现的自查清单」，而不是宣称功能正确。
- 若静态审查与用户自述冲突 → 依信息优先级，以**用户当前明确说明与实际证据**为准，并把冲突记入待验证项，不要替用户下结论。
- 若把「静态看起来没问题」说成「已验证」→ 这是本配方最需要防住的失误：静态审查**不能**证明运行期行为（时序、GC、物理、线程都不在文本里）。

**所需沙箱模式**：**只读**（若用户把日志/截图放进工作区供 AI 查看；写入工作区外材料需用户自行完成）。
**AI 可否代执行**：**部分可以**——静态审查、日志解读、清单生成可代执行；**运行与实测不可代执行**，必须由用户完成并回传证据。

---

## 附：配方速查

| 配方 | 能证明什么 | 沙箱模式 | AI 可代执行 |
| --- | --- | --- | --- |
| V-a1 | 纯 C# 片段语法/语义正确 | 工作区可写 | 可以（已实测） |
| V-a2 | 仅有 SDK 内置 Roslyn 时的语法定位 | 工作区可写 | 部分可以 |
| V-b1 | 行为正确（EditMode/PlayMode 测试） | 工作区可写 | 通常不可以 |
| V-c1 | 编译是否通过、错误在哪一行 | 只读 / 工作区可写 | 可代读代解读，不可代跑 |
| V-d1 | 结构性问题 + 收窄未知范围 | 只读 | 部分可以 |

**未验证清单**（使用前须自行核实，且不得据此判定验收通过）
1. 一套完整的、带 `/reference:` 引用程序集的 `csc.dll` 编译命令——本次未实测出可用引用集合，原因：需按目标框架挑选 ref 程序集清单且版本相关。
2. 本文件中所有 `C:\Program Files\Unity\Hub\Editor\<版本>\...` 形式的 Unity 可执行文件路径——当前环境未安装 Unity，无法实测；`<版本>` 需用户按实际安装替换（Hub 安装路径为官方文档给出的示例形式）。
3. `-nographics` 下 PlayMode 测试的实际可行性——文档已说明「输出日志关闭、需配 `-logFile`」以及「自动化工作流需要窗口获得焦点」，但**未在真实无 GPU 机器上实测**。
