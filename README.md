# dsh-coach

**A project-based learning coach for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH).**

One tree, two forms: a **skill**, and an installable **plugin bundle**. The teaching engine is subject-agnostic; subject knowledge lives in swappable **domain packs** (one ships today: Unity / C#).

It does not tutor by lecturing. It runs a loop: confirm the goal → diagnose with real tasks → build an evidence-backed capability baseline → set staged deliverables → let the learner attempt first → review with graded problems → accept or reject a stage on evidence.

Chinese documentation: [`README.zh.md`](README.zh.md).

## Why it exists

Most AI "tutoring" collapses into one of two failures: lecturing from zero, or handing over finished work. Both destroy learning. This skill encodes the opposite rules as a protocol the agent must follow:

- **The learner attempts first.** A complete answer is a last resort, not a first move.
- **Hints are graded** (1 remind the goal → 5 full reference), and jumping to level 5 unasked is forbidden.
- **Self-reports are graded, never taken on faith and never waved away.** An *ability* claim ("I'm fluent") is only a lead and never counts as verified by itself; a *gap* claim ("I never learned X") is believed immediately and switches the coach into **teaching** instead of quizzing; an *action* report ("I ran it, the output was X") is accepted as partially verified unless contradicted — the coach will not keep asking you to re-run it.
- **Facts get taught; skills get practised.** When the missing piece is factual knowledge (an API name or signature, a call order, a language rule, a documented default), the coach explains it — mechanism, why your task needs it, a minimal example, then one confirmation question. Scaffolding and graded hints are for *skills* (writing code, debugging, designing), not for facts.
- **AI-assisted work counts only once the learner can explain, modify and verify it.**
- **Acceptance is three-tiered** (pass / conditional / fail), with a *reproducible + explainable + modifiable* test for evidence sufficiency.

These rules are not just prose: a zero-dependency validator enforces them mechanically on the learner's state file.

## Quick start

### Option 1 — plain skill (no build, no dependencies)

Copy the skill directory into any DSH skill root:

```bash
# project-scoped: applies to this working directory
cp -r skills/dsh-coach <your-project>/.dsh/skills/

# user-scoped: applies to every workspace (native DSH home defaults to ~/.dsh)
cp -r skills/dsh-coach "$DSH_HOME/skills/"
```

There is also an installer with guards and a `--dry-run`:

```bash
node skills/dsh-coach/scripts/coach-install.mjs --dry-run
node skills/dsh-coach/scripts/coach-install.mjs --dest-root "$DSH_HOME/skills"
```

### Option 2 — plugin bundle

```bash
dsh plugin --profile <profile> add /path/to/this/repo     # local checkout
dsh --profile <profile> --dump-config                     # the dsh-coach layer should appear
```

The bundle layer (`cordis.patch.yml`) registers the packaged skill through `ctx.skills.register()`. The plugin only consumes the `skills` service — it imports nothing from the harness and brings no second copy of Cordis.

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

## Verification status

What has actually been executed, versus what is only documented:

| Item | Status |
|---|---|
| `coach-selftest.mjs` (validator regression, incl. adversarial fixtures) | ✅ 9/9 pass |
| `test/entry.smoke.mjs` (bundle entry contract) | ✅ pass |
| `dsh-plugin-dev check` (community static checker) | ✅ 9 passed / 0 failed (2 warnings, both about README conventions — see below) |
| Skill discovery on DSH Desktop (project skill root, no restart) | ✅ verified |
| Bundle install via native `dsh plugin add` | ⚠️ not yet executed on a native CLI (structure follows the official publish tutorial) |
| Unity recipes marked「（未验证）」in the domain pack | ⚠️ require a machine with Unity Editor |

> About that one warning: the checker expects READMEs in five languages (its author's own convention). The official harness repository ships English + Chinese only, and so does this project. We do not ship unreviewed machine translations.

## Adding another subject

The engine is subject-agnostic; adding a subject never requires touching it. Create `references/domains/<new-id>/` with the seven contract files and fill in `manifest.yml` — see [`CONTRIBUTING.md`](CONTRIBUTING.md) and `skills/dsh-coach/references/engine/domain-contract.md`.

## Requirements

- Node.js `^22.19.0 || >=24.0.0` (the scripts themselves only need `fs.cpSync`, available since 16.7; the plugin matrix matches the harness).
- No npm dependencies, no build step. `lib/index.js` is hand-written source, not a build artifact.

## Documentation

- [`docs/installing.zh.md`](docs/installing.zh.md) — installation details (native DSH / DSH Desktop / each skill root), with verified vs unverified marks
- [`docs/DESIGN-AUDIT.md`](docs/DESIGN-AUDIT.md) — three rounds of change review, including the author's own proposals that were **rejected** and the defects found by adversarial review
- [`docs/original-workflow.zh.md`](docs/original-workflow.zh.md) — the author's original workflow document (cited by line number in the audit)

## Contributing

The most valuable contribution is a **new domain pack**. Start with [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

[MIT](LICENSE).
