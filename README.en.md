<p align="center">
  <strong>A project-based learning coach — the learner does the work, the coach runs the loop</strong><br/>
  A teaching engine for <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a> (DSH): subject-agnostic, with swappable domain packs (Unity / C# included)
</p>

<p align="center">
  <a href="README.md">简体中文</a> · <a href="README.en.md"><strong>English</strong></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/dsh-project-based-learning"><img src="https://img.shields.io/npm/v/dsh-project-based-learning?style=for-the-badge&logo=npm&label=npm&color=CB3837" alt="npm version" /></a>
  <a href="https://github.com/Kirisame1969/dsh-project-based-learning/actions"><img src="https://img.shields.io/github/actions/workflow/status/Kirisame1969/dsh-project-based-learning/ci.yml?style=for-the-badge&logo=github&label=CI" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/Kirisame1969/dsh-project-based-learning?style=for-the-badge&color=blue" alt="License" /></a>
  <a href="https://github.com/Kirisame1969/dsh-project-based-learning/stargazers"><img src="https://img.shields.io/github/stars/Kirisame1969/dsh-project-based-learning?style=for-the-badge&logo=github&color=yellow" alt="Stars" /></a>
</p>

<p align="center">
  <a href="https://github.com/topics/dsh-plugin"><img src="https://img.shields.io/badge/DSH-plugin-4B6BFB?style=for-the-badge" alt="DSH plugin" /></a>
  <img src="https://img.shields.io/badge/zero--dependency-no%20build%20step-16A34A?style=for-the-badge" alt="Zero dependency" />
</p>

<br/>

**dsh-coach** is a **project-based teaching protocol** that runs inside DSH. It does not lecture: it runs a loop around your real project — confirm the goal → diagnose with real tasks → build an evidence-backed capability baseline → set staged deliverables → **let you attempt first** → review with graded problems → accept or reject a stage on evidence.

Teaching method and subject matter are separated: the method lives in the engine, the knowledge lives in **swappable domain packs** (Unity / C# ships today; changing subject never requires touching the engine).

## 🚀 Quick start

```bash
dsh plugin --profile web add dsh-project-based-learning
```

Then say one line in a session:

> 教学模式：我完全没学过 Unity 的生命周期，请评估我的水平

The coach **teaches the lifecycle first** (concept → why your task needs it → minimal example → you apply it once → one confirmation question) before talking about a route — instead of opening with a quiz.

## ✨ How it differs from ordinary AI tutoring

| Common behaviour | dsh-coach |
|---|---|
| Lecture a chapter from zero | **The learner attempts first**: a complete answer is a last resort, not a first move |
| Dump the whole answer at once | **Hints are graded 1–5**; jumping to the top level unasked is forbidden |
| You say "I never learned X" and it quizzes you anyway | **A gap claim is believed immediately** and switches the coach into teaching |
| You answer a conceptual question correctly and it still demands a run and a screenshot | Knowledge evidence means **explaining the mechanism unprompted + transferring to a new situation**; an action report is accepted as partially verified unless contradicted — **no re-running required** |
| The AI wrote it, so you "know" it | AI-assisted work counts only once you can **explain, modify and verify** it |
| Stage acceptance by vibes | **Three-tier verdict** (pass / conditional / fail) plus a *reproducible + explainable + modifiable* test |

These rules are not just prose: a **zero-dependency validator** enforces them mechanically on your state file — ability claims their evidence does not support are rejected, and a stage cannot pass while blockers are open.

## 📦 Install

### Option 1 — plugin bundle (recommended)

```bash
dsh plugin --profile web add dsh-project-based-learning     # or --profile headless, or your own profile
dsh --profile web --dump-config                             # the dsh-project-based-learning layer should appear
```

Without npm, install straight from this repository:

```bash
dsh plugin --profile web add github:Kirisame1969/dsh-project-based-learning
```

The bundle layer (`cordis.patch.yml`) registers the packaged skill through `ctx.skills.register()`. The plugin only consumes the `skills` service — it imports nothing from the harness and brings no second copy of Cordis.

### Option 2 — skill files only

Into any DSH skill root (project-scoped `.dsh/skills/`, or `$DSH_HOME/skills/` for every workspace):

```bash
npx -y -p dsh-project-based-learning coach-install --dest-root "$DSH_HOME/skills"
```

From a checkout, the same installer runs locally and supports `--dry-run`, `--link` and `--force`:

```bash
node skills/dsh-coach/scripts/coach-install.mjs --dry-run
node skills/dsh-coach/scripts/coach-install.mjs --dest-root "$DSH_HOME/skills"
```

### Option 3 — no install at all

Point your agent at `skills/dsh-coach/SKILL.md` and ask it to follow that file. Everything (engine protocol, domain pack, scripts) is plain files.

## 💬 Commands

| Command | What happens |
|---|---|
| `开始诊断` | Goal + experience intake, then a 3-task minimum diagnostic |
| `制定路线` | Stage plan with deliverables, non-goals and acceptance criteria |
| `本次任务：…` | One task loop (deliverable → attempt → hints → evidence) |
| `给提示，级别 N` | Only the requested hint level (1–5) |
| `审阅成果：…` | Review with severity + mechanism + impact + minimal fix + verification |
| `验收阶段` | Three-tier verdict, per-item checklist, retrieval recap |
| `复盘` | Capability delta, error patterns, next step |
| `调整节奏` | Re-plan for time/difficulty |
| `直接答案` | Full reference answer (recorded as *not* evidence) |
| `查看学习档案` / `更新学习档案` | Read / write the state file |

The command vocabulary is Chinese today. The engine prose is language-neutral — translating it is a welcome contribution.

## 🧩 How it works

```mermaid
flowchart LR
    A["Confirm the goal"] --> B["Diagnose with real tasks"] --> C["Capability baseline"] --> D["Stage route"]
    D --> E["Learner attempts"] --> F["Graded hints and review"] --> G{"Stage acceptance"}
    G -->|pass| D
    G -->|conditional or fail| E
```

```
skills/dsh-coach/
├── SKILL.md                            # engine: the loop, standing rules, command → file map
├── references/engine/                  # 9 protocol files, loaded on demand
├── references/domains/unity-csharp/    # the swappable subject pack (7 files)
├── assets/                             # state template + task / review / acceptance templates
└── scripts/                            # zero-dependency validator, selftest, installer
```

- **State** lives in `.coach/state.json` — a single source of truth — with `.coach/PROGRESS.md` rendered from it (never hand-edited).
- **The validator** checks the state file, the domain-pack contract, and a **layering rule**: no subject-specific tokens may appear in engine files. Run it after every accepted action:

  ```bash
  node skills/dsh-coach/scripts/coach-validate.mjs --state .coach/state.json --render
  ```

## 🔄 Adding another subject

The engine is subject-agnostic; adding a subject never requires touching it. Create `references/domains/<new-id>/` with the seven contract files and fill in `manifest.yml` — see [`CONTRIBUTING.md`](CONTRIBUTING.md) and `skills/dsh-coach/references/engine/domain-contract.md`.

## 📋 Requirements

- Node.js `^22.19.0 || >=24.0.0` (the scripts themselves only need `fs.cpSync`, available since 16.7; the plugin matrix matches the harness).
- No npm dependencies, no build step. `lib/index.js` is hand-written source, not a build artifact.

## 📚 Documentation

- [`docs/installing.zh.md`](docs/installing.zh.md) — installation details (native DSH / DSH Desktop / each skill root)
- [`CHANGELOG.md`](CHANGELOG.md) — version history
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — how to add a domain pack

## 🤝 Contributing

The most valuable contribution is a **new domain pack**. Start with [`CONTRIBUTING.md`](CONTRIBUTING.md).

## 📄 License

[MIT](LICENSE).
