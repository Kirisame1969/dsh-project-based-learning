#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = { force: false };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === "--input") {
      args.input = argv[i + 1];
      i += 1;
    } else if (item === "--output") {
      args.output = argv[i + 1];
      i += 1;
    } else if (item === "--force") {
      args.force = true;
    } else if (item === "--help" || item === "-h") {
      args.help = true;
    } else {
      throw new Error(`未知参数: ${item}`);
    }
  }
  return args;
}

function usage() {
  return "用法: node migrate-v1-state.mjs --input .coach/state.json --output .learning/state.json [--force]";
}

function strings(values) {
  if (!Array.isArray(values)) return [];
  return values.filter((value) => typeof value === "string" && value.trim() !== "");
}

function unique(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim() !== ""))];
}

function routeLabel(item) {
  if (!item || typeof item !== "object") return "";
  const name = typeof item.name === "string" ? item.name.trim() : "";
  const deliverable = typeof item.deliverable === "string" ? item.deliverable.trim() : "";
  if (name && deliverable) return `${name}：${deliverable}`;
  return name || deliverable;
}

function evidenceLabel(item) {
  if (!item || typeof item !== "object") return "";
  const claim = typeof item.claim === "string" ? item.claim.trim() : "";
  const artifact = typeof item.artifact === "string" ? item.artifact.trim() : "";
  if (claim && artifact) return `${claim}（来源：${artifact}）`;
  return claim || artifact;
}

function migrate(oldState, inputPath) {
  const goal = oldState?.goal && typeof oldState.goal === "object" ? oldState.goal : {};
  const constraints = goal?.constraints && typeof goal.constraints === "object" ? goal.constraints : {};
  const current = oldState?.current && typeof oldState.current === "object" ? oldState.current : {};
  const task = current?.task && typeof current.task === "object" ? current.task : {};
  const route = Array.isArray(oldState?.route) ? oldState.route : [];
  const currentStage = Number.isInteger(current.stage) ? current.stage : 1;
  const futureRoutes = route.filter((item) => !Number.isInteger(item?.n) || item.n > currentStage);
  const nextRoute = futureRoutes.slice(0, 1).map(routeLabel).filter(Boolean);
  const laterRoutes = futureRoutes.slice(1).map(routeLabel).filter(Boolean);
  const deferred = strings(oldState?.strategy?.deferred);
  const immediate = strings(oldState?.strategy?.immediate);
  const currentLabel = route.find((item) => item?.n === currentStage);

  return {
    schemaVersion: "2.0",
    revision: 1,
    updatedAt: new Date().toISOString(),
    preferences: [],
    context: {
      domain: typeof oldState?.domain === "string" ? oldState.domain : "",
      project: "",
      environment: {
        summary: typeof constraints.environment === "string" ? constraints.environment : "",
        tools: typeof constraints.tools === "string" ? constraints.tools : "",
        time: typeof constraints.time === "string" ? constraints.time : "",
        permissions: typeof constraints.permissions === "string" ? constraints.permissions : "",
      },
      exclusions: [],
    },
    goal: {
      outcome:
        (typeof goal.deliverable === "string" && goal.deliverable.trim()) ||
        (typeof goal.statement === "string" ? goal.statement : ""),
      successSignals: strings(goal.doneCriteria),
      nonGoals: strings(goal.nonGoals),
    },
    current: {
      milestone: routeLabel(currentLabel) || (typeof task.title === "string" ? task.title : ""),
      visibleResult: typeof task.deliverable === "string" ? task.deliverable : "",
      newKnowledge: immediate,
      nextAction: typeof oldState?.nextTask === "string" ? oldState.nextTask : "",
    },
    route: {
      now: unique([
        typeof task.title === "string" && typeof task.deliverable === "string"
          ? `${task.title}：${task.deliverable}`
          : typeof task.title === "string"
            ? task.title
            : "",
      ]),
      next: unique(nextRoute),
      later: unique([...laterRoutes, ...deferred]),
    },
    concepts: [],
    artifacts: unique((Array.isArray(oldState?.evidence) ? oldState.evidence : []).map(evidenceLabel)),
    decisions: [
      `由旧版状态迁移：${path.resolve(inputPath)}。旧数字能力等级未迁移；概念状态需要根据实际课程证据重新建立。`,
    ],
  };
}

let args;
try {
  args = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  console.error(usage());
  process.exit(2);
}

if (args.help) {
  console.log(usage());
  process.exit(0);
}

if (!args.input || !args.output) {
  console.error(usage());
  process.exit(2);
}

const inputPath = path.resolve(args.input);
const outputPath = path.resolve(args.output);

if (inputPath === outputPath) {
  console.error("输入与输出路径不能相同");
  process.exit(2);
}
if (fs.existsSync(outputPath) && !args.force) {
  console.error(`输出文件已存在，未覆盖: ${outputPath}`);
  console.error("如已核对目标，可添加 --force");
  process.exit(1);
}

let oldState;
try {
  oldState = JSON.parse(fs.readFileSync(inputPath, "utf8"));
} catch (error) {
  console.error(`无法读取或解析旧状态: ${inputPath}`);
  console.error(error.message);
  process.exit(1);
}

const migrated = migrate(oldState, inputPath);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(migrated, null, 2)}\n`, "utf8");
console.log(`已生成 2.0 状态: ${outputPath}`);
console.log("请人工核对目标、路线与证据；旧数字能力等级没有迁移。");
