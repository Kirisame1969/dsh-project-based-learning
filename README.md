[简体中文](README.zh.md)

# dsh-coach

**A project-based learning coach for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH): the learner does the work, the coach runs the loop.**

One tree, two forms: a **skill**, and an installable **plugin bundle**. The teaching engine is subject-agnostic; subject knowledge lives in swappable **domain packs** (one ships today: Unity / C#).

It does not tutor by lecturing. It runs a loop: confirm the goal → diagnose with real tasks → build an evidence-backed capability baseline → set staged deliverables → let the learner attempt first → review with graded problems → accept or reject a stage on evidence.

## Why it exists

Most AI "tutoring" collapses into one of two failures: lecturing from zero, or handing over finished work. Both destroy learning. This skill encodes the opposite rules as a protocol the agent must follow:

- **The learner attempts first.** A complete answer is a last resort, not a first move.
- **Hints are graded** (1 remind the goal → 5 full reference), and jumping to level 5 unasked is forbidden.
- **Self-reports are graded, never taken on faith and never waved away.** An *ability* claim ("I'm fluent") is only a lead and never counts as verified by itself; a *gap* claim ("I never learned X") is believed immediately and switches the coach into **teaching** instead of quizzing; an *action* report ("I ran it, the output was X") is accepted as partially verified unless contradicted — the coach will not keep asking you to re-run it.
- **Facts get taught; skills get practised.** When the missing piece is factual knowledge (an API name or signature, a call order, a language rule, a documented default), the coach explains it — mechanism, why your task needs it, a minimal example, then one confirmation question. Scaffolding and graded hints are for *skills* (writing code, debugging, designing), not for facts.
- **AI-assisted work counts only once the learner can explain, modify and verify it.**
- **Acceptance is three-tiered** (pass / conditional / fail), with a *reproducible + explainable + modifiable* test for evidence sufficiency.

These rules are not just prose: a zero-dependency validator enforces them mechanically on the learner's state file.

## Install

### Option 1 — plugin bundle (recommended)

Into any DSH profile:

```bash
dsh plugin --profile web add dsh-project-based-learning    # or --profile headless, or your own profile
dsh --profile web --dump-config                 # the dsh-project-based-learning layer should appear
```

Without npm, install straight from this repository:

```bash
dsh plugin --profile web add github:Kirisame1969/dsh-project-based-learning
```

The bundle layer (`cordis.patch.yml`) registers the packaged skill through `ctx.skills.register()`. The plugin only consumes the `skills` service — it imports nothing from the harness and brings no second copy of Cordis.

### Option 2 — skill files only

Into a DSH skill root (project-scoped `.dsh/skills/`, or `$DSH_HOME/skills/` for every workspace):

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

## Using it

Once loaded, drive it with natural-language commands:

| Command | What happens |
|---|---|
| `开始诊断` | Goal + experience intake, then a 3-task minimum diagnostic |
| `制定路线` | Stage plan with deliverables, non-goals and acceptance criteria |
| `本次任务：…` | One task loop (deliverable → attempt → hints → evidence) |
| `给提示，级别 N` | Only the requested hint level (1–5) |
| `审阅成果：…` | Review with severity + mechanism + impact + minimal fix + verification |
| `验收阶段` | Three-tier verdict, `userOnly` checklist, retrieval recap |
| `复盘` | Capability delta, error patterns, next step |
| `调整节奏` | Re-plan for time/difficulty |
| `直接答案` | Full reference answer (recorded as *not* evidence) |
| `查看学习档案` / `更新学习档案` | Read / write the state file |

The command vocabulary is Chinese today. The engine prose is language-neutral — translating it is a welcome contribution.

## How it works

```
skills/dsh-coach/
├── SKILL.md                  # engine: the loop, the standing rules, command → file map
├── references/engine/        # 9 protocol files, loaded on demand
├── references/domains/unity-csharp/   # the swappable subject pack (7 files)
├── assets/                   # state template + task/review/acceptance templates
└── scripts/                  # zero-dependency validator, selftest, installer
```

- **State** lives in `.coach/state.json` — a single source of truth — with `.coach/PROGRESS.md` rendered from it (never hand-edited).
- **The validator** checks the state file, the domain-pack contract, and a **layering rule**: no subject-specific tokens may appear in engine files. Run it after every accepted action:

  ```bash
  node skills/dsh-coach/scripts/coach-validate.mjs --state .coach/state.json --render
  ```

## Adding another subject

The engine is subject-agnostic; adding a subject never requires touching it. Create `references/domains/<new-id>/` with the seven contract files and fill in `manifest.yml` — see [`CONTRIBUTING.md`](CONTRIBUTING.md) and `skills/dsh-coach/references/engine/domain-contract.md`.

## Requirements

- Node.js `^22.19.0 || >=24.0.0` (the scripts themselves only need `fs.cpSync`, available since 16.7; the plugin matrix matches the harness).
- No npm dependencies, no build step. `lib/index.js` is hand-written source, not a build artifact.

## Documentation

- [`docs/installing.zh.md`](docs/installing.zh.md) — installation details (native DSH / DSH Desktop / each skill root)
- [`CHANGELOG.md`](CHANGELOG.md) — version history
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — how to add a domain pack

## Contributing

The most valuable contribution is a **new domain pack**. Start with [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

[MIT](LICENSE).
