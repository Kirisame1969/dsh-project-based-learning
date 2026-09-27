#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const allowedConceptStates = new Set([
  "尚未接触",
  "已讲授待实践",
  "带练中",
  "可在熟悉任务中独立使用",
  "已迁移到新任务",
]);

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === "--state") {
      args.state = argv[i + 1];
      i += 1;
    } else if (item === "--help" || item === "-h") {
      args.help = true;
    } else {
      throw new Error(`未知参数: ${item}`);
    }
  }
  return args;
}

function usage() {
  return "用法: node validate-learning-state.mjs --state <.learning/state.json>";
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireObject(value, location, errors) {
  if (!isObject(value)) errors.push(`${location} 必须是对象`);
}

function requireString(value, location, errors) {
  if (typeof value !== "string") errors.push(`${location} 必须是字符串`);
}

function requireStringArray(value, location, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${location} 必须是数组`);
    return;
  }
  value.forEach((item, index) => {
    if (typeof item !== "string" || item.trim() === "") {
      errors.push(`${location}[${index}] 必须是非空字符串`);
    }
  });
}

function validateState(state) {
  const errors = [];
  requireObject(state, "根节点", errors);
  if (!isObject(state)) return errors;

  if (state.schemaVersion !== "2.0") {
    errors.push('schemaVersion 必须是 "2.0"');
  }
  if (!Number.isInteger(state.revision) || state.revision < 0) {
    errors.push("revision 必须是非负整数");
  }
  if (typeof state.updatedAt !== "string" || Number.isNaN(Date.parse(state.updatedAt))) {
    errors.push("updatedAt 必须是有效的 ISO 日期字符串");
  }

  requireStringArray(state.preferences, "preferences", errors);

  requireObject(state.context, "context", errors);
  if (isObject(state.context)) {
    requireString(state.context.domain, "context.domain", errors);
    requireString(state.context.project, "context.project", errors);
    requireObject(state.context.environment, "context.environment", errors);
    requireStringArray(state.context.exclusions, "context.exclusions", errors);
  }

  requireObject(state.goal, "goal", errors);
  if (isObject(state.goal)) {
    requireString(state.goal.outcome, "goal.outcome", errors);
    requireStringArray(state.goal.successSignals, "goal.successSignals", errors);
    requireStringArray(state.goal.nonGoals, "goal.nonGoals", errors);
  }

  requireObject(state.current, "current", errors);
  if (isObject(state.current)) {
    requireString(state.current.milestone, "current.milestone", errors);
    requireString(state.current.visibleResult, "current.visibleResult", errors);
    requireStringArray(state.current.newKnowledge, "current.newKnowledge", errors);
    requireString(state.current.nextAction, "current.nextAction", errors);
  }

  requireObject(state.route, "route", errors);
  if (isObject(state.route)) {
    requireStringArray(state.route.now, "route.now", errors);
    requireStringArray(state.route.next, "route.next", errors);
    requireStringArray(state.route.later, "route.later", errors);
  }

  if (!Array.isArray(state.concepts)) {
    errors.push("concepts 必须是数组");
  } else {
    const names = new Set();
    state.concepts.forEach((concept, index) => {
      const location = `concepts[${index}]`;
      if (!isObject(concept)) {
        errors.push(`${location} 必须是对象`);
        return;
      }
      if (typeof concept.name !== "string" || concept.name.trim() === "") {
        errors.push(`${location}.name 必须是非空字符串`);
      } else {
        const normalized = concept.name.trim().toLocaleLowerCase();
        if (names.has(normalized)) errors.push(`${location}.name 与其他概念重复`);
        names.add(normalized);
      }
      if (!allowedConceptStates.has(concept.state)) {
        errors.push(`${location}.state 不是允许的描述性状态`);
      }
      requireStringArray(concept.evidence, `${location}.evidence`, errors);
      requireString(concept.nextSupport, `${location}.nextSupport`, errors);
      if (
        ["带练中", "可在熟悉任务中独立使用", "已迁移到新任务"].includes(concept.state) &&
        Array.isArray(concept.evidence) &&
        concept.evidence.length === 0
      ) {
        errors.push(`${location} 处于“${concept.state}”时必须有实践证据；讲授或示例本身不是证据`);
      }
    });
  }

  requireStringArray(state.artifacts, "artifacts", errors);
  requireStringArray(state.decisions, "decisions", errors);
  return errors;
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

if (!args.state) {
  console.error(usage());
  process.exit(2);
}

const statePath = path.resolve(args.state);
let state;
try {
  state = JSON.parse(fs.readFileSync(statePath, "utf8"));
} catch (error) {
  console.error(`无法读取或解析状态文件: ${statePath}`);
  console.error(error.message);
  process.exit(1);
}

const errors = validateState(state);
if (errors.length > 0) {
  console.error(`学习状态校验失败，共 ${errors.length} 项：`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`学习状态有效: ${statePath}`);
