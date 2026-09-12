#!/usr/bin/env node
/**
 * coach-validate.mjs — 教学教练状态与领域包校验器
 *
 * 用法：
 *   node scripts/coach-validate.mjs [--state <state.json>] [--domain-dir <dir>]
 *        [--skill-dir <dir>] [--render] [--out <PROGRESS.md>] [--json] [--quiet]
 *
 * 默认值：
 *   --state       .coach/state.json（相对当前工作目录）
 *   --skill-dir   scripts/ 的上一级目录
 *   --domain-dir  <skill-dir>/references/domains/<state.domain>
 *   --render      在 state 同目录写 PROGRESS.md（生成物，勿手工编辑）
 *
 * 退出码：0 全部通过；1 存在 error（warn 不影响退出码）。
 *
 * 覆盖边界（如实声明）：本脚本只校验状态层与领域包结构，不能校验对话质量
 * （例如是否真的只给出了 3 级提示、是否泄露完整答案）。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR_DEFAULT = path.resolve(HERE, '..');

const DIMENSIONS = ['基础知识', '实际应用', '问题拆解', '调试与纠错', '结构与质量', '独立程度', '解释与迁移'];
const STATUS = ['已验证', '部分验证', '待验证'];
const SEVERITIES = ['阻塞', '重要', '建议'];
const OPEN_STATUS = ['未解决', '已解决'];
/** open[].checkStatus：R10 实测要求的依据是否已核对（缺省视为"推测"） */
const CHECK_STATUS = ['已核对', '推测'];
const STAGE_STATUS = ['未开始', '进行中', '待验收', '已通过', '有条件通过', '未通过'];
const AUTH_MODES = ['read', 'write'];
const SECTIONS = ['archetypes', 'diagnosis', 'verification', 'pitfalls', 'example', 'glossary'];
const MANIFEST_KEYS = ['id', 'name', 'version', 'engine', 'locale', 'sections', 'taskMinutes', 'notes'];
const SCHEMA_VERSION = '1.0';

/** 引擎层禁止出现的学科硬令牌（分层检查） */
const DOMAIN_TOKENS = ['unity', 'c#', 'monobehaviour', 'unityengine', 'gameobject', 'prefab', 'asmdef', 'scriptableobject'];

/** 占位符式材料引用：不算可核对材料 */
const PLACEHOLDER_ARTIFACTS = new Set(['-', '—', '–', '无', '暂无', '略', 'n/a', 'na', 'none', 'tbd', '待补', '待填', '待定']);

/** 严格 ISO 8601：日期 + 时间 + 时区（Date.parse 会接受 "March 8, 2026" 之类的宽泛写法） */
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/;

/** 单行内查找全部整词（避免 community 命中 unity 这类假阳性；一行可命中多个令牌） */
function findDomainTokens(line) {
  const norm = line.normalize('NFKC').toLowerCase();
  const hits = [];
  for (const token of DOMAIN_TOKENS) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`);
    if (re.test(norm)) hits.push(token);
  }
  return hits;
}

// ── 参数 ─────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = { render: false, json: false, quiet: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const next = () => {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) throw new Error(`缺少参数值：${a}`);
      i += 1;
      return v;
    };
    if (a === '--state') out.state = next();
    else if (a === '--domain-dir') out.domainDir = next();
    else if (a === '--skill-dir') out.skillDir = next();
    else if (a === '--out') out.out = next();
    else if (a === '--render') out.render = true;
    else if (a === '--json') out.json = true;
    else if (a === '--quiet') out.quiet = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`未知参数：${a}`);
  }
  return out;
}

// ── 极简 YAML 子集解析（仅支持 manifest.yml 的受限结构）─────────────────────
// 支持：`key: value`、一层缩进映射、行内数组 [a, b]、引号字符串、# 注释。
// 不支持：锚点、多行块、嵌套数组、多层缩进。违反限制时报错而不是静默误读。

function parseSimpleYaml(text, fileLabel) {
  const root = {};
  const stack = [{ indent: -1, obj: root }];
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const indent = raw.match(/^ */)[0].length;
    if (indent % 2 !== 0) throw new Error(`${fileLabel}:${i + 1} 缩进必须为 2 的倍数`);
    const body = raw.trim();
    const m = body.match(/^([^:]+):(.*)$/);
    if (!m) throw new Error(`${fileLabel}:${i + 1} 无法解析：${body}`);
    const key = m[1].trim();
    const rest = m[2].trim();

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].obj;
    if (indent > stack[stack.length - 1].indent + 2 && stack[stack.length - 1].indent !== -1) {
      // 父层必须先出现嵌套映射
    }

    if (rest === '') {
      const child = {};
      parent[key] = child;
      stack.push({ indent, obj: child });
      continue;
    }
    if (rest.startsWith('[') && rest.endsWith(']')) {
      parent[key] = rest
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s !== '')
        .map(coerce);
      continue;
    }
    parent[key] = coerce(rest);
  }
  return root;
}

function coerce(v) {
  const unquoted = /^"(.*)"$/.exec(v) || /^'(.*)'$/.exec(v);
  if (unquoted) return unquoted[1];
  if (/^-?\d+$/.test(v)) return Number(v);
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v;
}

// ── 校验框架 ─────────────────────────────────────────────────────────────────

class Report {
  constructor() {
    this.issues = [];
  }
  error(rule, where, msg, hint) {
    this.issues.push({ level: 'error', rule, where, msg, hint });
  }
  warn(rule, where, msg, hint) {
    this.issues.push({ level: 'warn', rule, where, msg, hint });
  }
  get errors() {
    return this.issues.filter((i) => i.level === 'error');
  }
  get warns() {
    return this.issues.filter((i) => i.level === 'warn');
  }
}

/** 读取 UTF-8 文本并去掉 BOM：Windows 编辑器常写入 BOM，会让 JSON.parse 与 YAML 首键解析失败 */
function readText(p) {
  return fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
}

const isStr = (v) => typeof v === 'string';
const isNonEmptyStr = (v) => isStr(v) && v.trim() !== '';
const isStrArray = (v) => Array.isArray(v) && v.every(isStr);
const isNonEmptyStrArray = (v) => Array.isArray(v) && v.length > 0 && v.every(isNonEmptyStr);
const isInt = (v) => Number.isInteger(v);
const isIsoTime = (v) => isStr(v) && ISO_RE.test(v) && !Number.isNaN(Date.parse(v));

function requireKeys(r, obj, where, keys) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    r.error('ST-TYPE', where, '应为对象', null);
    return false;
  }
  let ok = true;
  for (const k of keys) {
    if (!(k in obj)) {
      r.error('ST-MISSING', `${where}.${k}`, '缺少必需字段', null);
      ok = false;
    }
  }
  return ok;
}

// ── 状态校验 ─────────────────────────────────────────────────────────────────

function checkState(r, state) {
  // 注意：不因缺一个键就 return——那会让一处缺失掩盖其余全部问题。
  requireKeys(r, state, '$', [
    'schemaVersion', 'engineVersion', 'domain', 'domainVersion', 'assumeGoal', 'revision', 'updatedAt',
    'goal', 'capability', 'strategy', 'route', 'current', 'evidence', 'open', 'routeChanges',
    'directAnswers', 'authorizations', 'completedTasks', 'retrievalRecap', 'nextTask',
  ]);

  if (state.schemaVersion !== SCHEMA_VERSION) {
    r.error('ST01', '$.schemaVersion', `期望 "${SCHEMA_VERSION}"，实际 ${JSON.stringify(state.schemaVersion)}`, '升级状态文件或使用匹配的引擎版本');
  }
  for (const k of ['engineVersion', 'domain', 'domainVersion']) {
    if (!isNonEmptyStr(state[k])) r.error('ST01', `$.${k}`, '必须是非空字符串', null);
  }
  if (typeof state.assumeGoal !== 'boolean') r.error('ST01', '$.assumeGoal', '必须是布尔值', null);
  if (!isInt(state.revision) || state.revision < 1) r.error('ST12', '$.revision', '必须是 ≥1 的整数', '每次写入 +1');
  if (!isIsoTime(state.updatedAt)) {
    r.error('ST12', '$.updatedAt', '必须是严格 ISO 8601（含日期、时间与时区，例如 2026-03-08T20:15:00.000Z）', null);
  }
  if (!isStr(state.retrievalRecap)) r.error('ST10', '$.retrievalRecap', '必须是字符串（无复述时为空串）', null);
  if (!isStr(state.nextTask)) r.error('ST-TYPE', '$.nextTask', '必须是字符串', null);

  checkGoal(r, state.goal);
  checkCapability(r, state.capability, state.evidence);
  checkEvidence(r, state.evidence);
  checkRoute(r, state.route, state.current);
  checkCurrent(r, state.current, state.route, state.open, state.retrievalRecap);
  checkOpen(r, state.open);
  checkSimpleArrays(r, state);
}

function checkGoal(r, goal) {
  if (!requireKeys(r, goal, '$.goal', ['statement', 'deliverable', 'why', 'doneCriteria', 'constraints', 'nonGoals'])) return;
  if (!isNonEmptyStr(goal.statement)) r.error('ST11', '$.goal.statement', '目标必须落盘且非空（验收判据的唯一来源）', null);
  if (!isNonEmptyStr(goal.deliverable)) r.error('ST11', '$.goal.deliverable', '可交付成果必须非空且可观察', null);
  if (!isStr(goal.why)) r.error('ST-TYPE', '$.goal.why', '必须是字符串', null);
  if (!isNonEmptyStrArray(goal.doneCriteria)) r.error('ST11', '$.goal.doneCriteria', '完成判据必须是非空的非空字符串数组', null);
  if (!isStrArray(goal.nonGoals)) r.error('ST-TYPE', '$.goal.nonGoals', '必须是字符串数组', null);
  if (requireKeys(r, goal.constraints, '$.goal.constraints', ['time', 'tools', 'environment', 'permissions'])) {
    for (const k of ['time', 'tools', 'environment', 'permissions']) {
      if (!isStr(goal.constraints[k])) r.error('ST-TYPE', `$.goal.constraints.${k}`, '必须是字符串（未知时填空串）', null);
      else if (goal.constraints[k].trim() === '') r.warn('ST-W1', `$.goal.constraints.${k}`, '限制未填写，审阅与验收时可能缺少边界依据', null);
    }
  }
}

function checkCapability(r, capability, evidence) {
  if (!Array.isArray(capability)) {
    r.error('ST02', '$.capability', '必须是数组', null);
    return;
  }
  const seen = new Set();
  const evIndex = new Map();
  for (const e of Array.isArray(evidence) ? evidence : []) {
    if (e && isNonEmptyStr(e.id) && !evIndex.has(e.id)) evIndex.set(e.id, e);
  }
  const strengthsOf = (ids) => ids.map((id) => (evIndex.get(id) ? evIndex.get(id).strength : undefined));
  const evidenceIds = new Set(evIndex.keys());

  capability.forEach((c, i) => {
    const w = `$.capability[${i}]`;
    if (!requireKeys(r, c, w, ['dimension', 'level', 'status', 'evidence', 'gap', 'impact'])) return;
    if (!DIMENSIONS.includes(c.dimension)) r.error('ST02', `${w}.dimension`, `未知维度 ${JSON.stringify(c.dimension)}`, `允许：${DIMENSIONS.join(' / ')}`);
    if (seen.has(c.dimension)) r.error('ST02', `${w}.dimension`, `维度重复：${c.dimension}`, null);
    seen.add(c.dimension);
    if (!isInt(c.level) || c.level < 1 || c.level > 5) r.error('ST03', `${w}.level`, '必须是 1–5 的整数', null);
    if (!STATUS.includes(c.status)) r.error('ST03', `${w}.status`, `状态必须是 ${STATUS.join(' / ')}`, null);
    if (!isStrArray(c.evidence)) r.error('ST-TYPE', `${w}.evidence`, '必须是字符串数组（证据 id）', null);
    const ev = Array.isArray(c.evidence) ? c.evidence : [];

    if (c.status === '已验证') {
      if (ev.length === 0) r.error('ST03', `${w}.status`, '标记"已验证"但没有证据引用', '补 evidence，或降级为"部分验证/待验证"');
      if (isInt(c.level) && c.level < 3) r.error('ST03', `${w}.level`, '"已验证"要求等级 ≥3', null);
      // 只查引用 id 存在是不够的：被引用证据的强度必须能支撑"已验证"，
      // 否则可以靠引用一条"待验证"证据把维度刷成"已验证"。
      if (ev.length > 0) {
        const strengths = strengthsOf(ev);
        const unknown = strengths.filter((s) => s === undefined).length;
        if (unknown < ev.length && !strengths.includes('已验证')) {
          r.error('ST03', `${w}.status`, `标记"已验证"，但引用的证据强度为 ${strengths.filter(Boolean).join(' / ') || '（无）'}，没有一条是"已验证"`, '把被引用证据的强度提升为"已验证"，或把本维度降级为"部分验证"');
        }
      }
      // F8-lite（修订 2.1）：知识类结论疑为"单题即发已验证"——**只提醒，不拦截**。
      // 取舍理由见 docs/ENGINE-REVISION-2.zh.md §7.3：误报的代价是每次正常教学被阻塞。
      // 闭合的绕过路径（第 2 轮审核提出）：
      //   A 改前缀（"诊断问答："）→ 改为按题号正则识别，不看前缀；
      //   B 混入一条非问答记录 → 已收窄为"只统计 strength=已验证 的证据"，故混入"待验证"证据无效；
      //     **残余**：混入一条 strength=已验证、artifact 不含题号的行为类证据 → untagged>0 → 完全抑制本提醒。
      //     这是 warn-only 的已知边界，如实记录在 §7.3，不通过加严判据去堵（那会误伤正常表述）。
      //   C 伪造题号（"Q1-1 加难追问（对照 Q2-1）"）→ 题号归一化为 `主-次` 并取首个匹配；
      //   E 裸 `Q` 误报 → 正则要求 `Q<数字>-<数字>`。
      // 残余边界（如实声明）：把 status 降为"部分验证"仍可完全回避本提醒——这正是它**只做提醒**的原因。
      if (ev.length > 0) {
        const refs = ev.map((id) => evIndex.get(id)).filter(Boolean);
        const verified = refs.filter((e) => e.strength === '已验证');
        const topicOf = (e) => {
          const m = /Q(\d+)-(\d+)/i.exec(String(e.artifact));
          return m ? `${m[1]}-${m[2]}` : null;
        };
        const untagged = verified.filter((e) => topicOf(e) === null).length;
        if (verified.length > 0 && untagged === 0) {
          const topics = new Set(verified.map(topicOf));
          if (topics.size < 2) {
            r.warn('ST-W7', `${w}.status`, '知识类结论疑为"单题即发已验证"：标"已验证"的证据全部指向同一道题（按题号去重）', '按 diagnosis.md 的证据分层：知识类需"无提示解释机制 ＋ 迁移到新情境"；单题正确只算"部分验证"');
          }
        }
      }
    }
    if (c.status === '部分验证' && ev.length > 0) {
      const strengths = strengthsOf(ev);
      const usable = strengths.some((s) => s === '已验证' || s === '部分验证');
      if (!usable) {
        r.error('ST04', `${w}.status`, '标记"部分验证"，但引用的证据强度全是"待验证"', '降级为"待验证"，或先提升证据强度');
      }
    }
    if (ev.length === 0) {
      if (isInt(c.level) && c.level > 2) r.error('ST04', `${w}.level`, '无任何证据时等级不得超过 2', '把等级降到 ≤2，或补充证据');
      if (c.status !== '待验证') r.error('ST04', `${w}.status`, '无证据时必须标"待验证"', null);
    }
    for (const id of ev) {
      if (!evidenceIds.has(id)) r.error('ST05', `${w}.evidence`, `引用了不存在的证据 id：${id}`, null);
    }
    if (!isStr(c.gap)) r.error('ST-TYPE', `${w}.gap`, '必须是字符串', null);
    if (!isStr(c.impact)) r.error('ST-TYPE', `${w}.impact`, '必须是字符串', null);
  });

  for (const d of DIMENSIONS) {
    if (!seen.has(d)) r.error('ST02', '$.capability', `缺少维度：${d}`, '7 个维度必须齐全，哪怕标"待验证"');
  }
}

function checkEvidence(r, evidence) {
  if (!Array.isArray(evidence)) {
    r.error('ST-TYPE', '$.evidence', '必须是数组', null);
    return;
  }
  const ids = new Set();
  evidence.forEach((e, i) => {
    const w = `$.evidence[${i}]`;
    if (!requireKeys(r, e, w, ['id', 'stage', 'claim', 'artifact', 'strength', 'note'])) return;
    if (!isNonEmptyStr(e.id)) r.error('ST06', `${w}.id`, '证据 id 必须非空', null);
    else if (ids.has(e.id)) r.error('ST06', `${w}.id`, `证据 id 重复：${e.id}`, null);
    else ids.add(e.id);
    if (!isInt(e.stage) || e.stage < 0) r.error('ST-TYPE', `${w}.stage`, '必须是 ≥0 的整数（0 表示诊断期证据）', null);
    if (!isNonEmptyStr(e.claim)) r.error('ST-TYPE', `${w}.claim`, '必须说明这条证据支持什么结论', null);
    if (!isNonEmptyStr(e.artifact)) r.error('ST06', `${w}.artifact`, '证据必须指向可核对材料（文件与行号／日志片段／截图位置／可复现步骤／问答记录／操作自述记录）', '能力自述不是证据；缺口自述转 R9 讲授；操作自述按"部分验证"接受，不要求重复实测');
    else if (PLACEHOLDER_ARTIFACTS.has(e.artifact.trim().toLowerCase())) {
      r.error('ST06', `${w}.artifact`, `"${e.artifact}" 是占位符，不是可核对材料`, '写出具体文件路径与行号、日志片段、截图位置或可复现步骤');
    }
    if (isStr(e.artifact) && e.artifact.length > 500) {
      r.warn('ST-W5', `${w}.artifact`, `材料引用长达 ${e.artifact.length} 字符，疑似内联大段内容`, '档案只保存结论与证据摘要，大段代码/日志应指向文件而不是内联');
    }
    if (isStr(e.note) && e.note.length > 500) {
      r.warn('ST-W5', `${w}.note`, `说明长达 ${e.note.length} 字符，疑似内联大段内容`, '同上：只保存结论与证据摘要');
    }
    if (!STATUS.includes(e.strength)) r.error('ST-TYPE', `${w}.strength`, `强度必须是 ${STATUS.join(' / ')}`, null);
    if (!isStr(e.note)) r.error('ST-TYPE', `${w}.note`, '必须是字符串', null);
  });
}

function checkRoute(r, route, current) {
  if (!Array.isArray(route)) {
    r.error('ST-TYPE', '$.route', '必须是数组', null);
    return;
  }
  route.forEach((s, i) => {
    const w = `$.route[${i}]`;
    if (!requireKeys(r, s, w, ['n', 'name', 'deliverable', 'nonGoals', 'skills', 'prereq', 'tasks', 'userOnly', 'acceptance', 'risks', 'estimate', 'next'])) return;
    if (!isInt(s.n) || s.n < 1) r.error('ST07', `${w}.n`, '阶段号必须是 ≥1 的整数', null);
    if (i > 0 && isInt(s.n) && isInt(route[i - 1].n) && s.n !== route[i - 1].n + 1) {
      r.error('ST07', `${w}.n`, `阶段号必须从 1 连续递增（上一阶段为 ${route[i - 1].n}）`, null);
    }
    if (!isNonEmptyStr(s.name)) r.error('ST07', `${w}.name`, '阶段名不能为空', null);
    if (!isNonEmptyStr(s.deliverable)) r.error('ST07', `${w}.deliverable`, '可交付成果不能为空', null);
    if (!isNonEmptyStrArray(s.userOnly)) r.error('ST07', `${w}.userOnly`, '"用户必须亲自完成的部分"必须非空（验收时逐项核对）', null);
    if (!isNonEmptyStrArray(s.acceptance)) r.error('ST07', `${w}.acceptance`, '验收标准必须非空且可判定', null);
    for (const k of ['nonGoals', 'skills', 'prereq', 'tasks', 'risks']) {
      if (!isStrArray(s[k])) r.error('ST-TYPE', `${w}.${k}`, '必须是字符串数组', null);
    }
    if (!isStr(s.estimate)) r.error('ST-TYPE', `${w}.estimate`, '必须是字符串', null);
    if (!isStr(s.next)) r.error('ST-TYPE', `${w}.next`, '必须是字符串', null);
  });

  const ns = new Set(route.map((s) => s && s.n));
  if (route.length > 0 && isInt(route[0].n) && route[0].n !== 1) {
    r.error('ST07', '$.route[0].n', `阶段号必须从 1 开始（实际为 ${route[0].n}）`, null);
  }
  if (current && isInt(current.stage)) {
    if (route.length === 0) {
      r.warn('ST-W4', '$.route', '尚未建立阶段路线（intake/基线阶段属正常）', '首个任务卡之前必须补齐 route');
    } else if (!ns.has(current.stage)) {
      r.error('ST08', '$.current.stage', `阶段 ${current.stage} 不存在于 route`, '先补 route 或修正 current.stage');
    }
  }
}

function checkCurrent(r, current, route, open, retrievalRecap) {
  if (!requireKeys(r, current, '$.current', ['stage', 'stageStatus', 'task'])) return;
  if (!isInt(current.stage) || current.stage < 1) r.error('ST08', '$.current.stage', '必须是 ≥1 的整数', null);
  if (!STAGE_STATUS.includes(current.stageStatus)) r.error('ST-TYPE', '$.current.stageStatus', `必须是 ${STAGE_STATUS.join(' / ')}`, null);

  const t = current.task;
  if (requireKeys(r, t, '$.current.task', ['title', 'deliverable', 'criteria', 'limits', 'nonGoals', 'estimateMin', 'state'])) {
    if (!isStr(t.title)) r.error('ST-TYPE', '$.current.task.title', '必须是字符串', null);
    if (!isStr(t.deliverable)) r.error('ST-TYPE', '$.current.task.deliverable', '必须是字符串', null);
    for (const k of ['criteria', 'limits', 'nonGoals']) {
      if (!isStrArray(t[k])) r.error('ST-TYPE', `$.current.task.${k}`, '必须是字符串数组', null);
    }
    if (t.criteria && Array.isArray(t.criteria) && t.criteria.length === 0 && t.state && t.state !== '未开始') {
      r.warn('ST-W2', '$.current.task.criteria', '任务已开始但完成标准为空', '任务卡应给出可判定的完成标准');
    }
    if (!isInt(t.estimateMin) || t.estimateMin < 1) r.error('ST-TYPE', '$.current.task.estimateMin', '必须是正整数的分钟估计', null);
    if (!STAGE_STATUS.includes(t.state)) r.error('ST-TYPE', '$.current.task.state', `必须是 ${STAGE_STATUS.join(' / ')}`, null);
  }

  const hasBlocker = Array.isArray(open) && open.some((o) => o && o.severity === '阻塞' && o.status === '未解决');
  if (hasBlocker && current.stageStatus === '已通过') {
    r.error('ST09', '$.current.stageStatus', '存在未解决的"阻塞"项时不得判为"已通过"', '先解决阻塞项，或改为"有条件通过/未通过"');
  }
  if (current.stageStatus === '已通过' && isStr(retrievalRecap) && retrievalRecap.trim() === '') {
    r.error('ST10', '$.retrievalRecap', '"已通过"要求先完成检索式复述并记录结论', null);
  }
  // route 为空时的 ST08 已在 checkRoute 中改为提醒；但任务一旦开工就必须属于某个阶段
  const tk = current.task || {};
  const taskStarted = isNonEmptyStr(tk.title) || (isStr(tk.state) && tk.state !== '未开始');
  const routeEmpty = !Array.isArray(route) || route.length === 0;
  if (routeEmpty && taskStarted) {
    r.error('ST08', '$.current.task', '已开始任务但 route 为空：任务必须属于某个阶段', '先建立 route（阶段与验收标准）再出任务卡');
  }
}

function checkOpen(r, open) {
  if (!Array.isArray(open)) {
    r.error('ST-TYPE', '$.open', '必须是数组', null);
    return;
  }
  open.forEach((o, i) => {
    const w = `$.open[${i}]`;
    if (!requireKeys(r, o, w, ['id', 'issue', 'severity', 'status', 'next'])) return;
    if (!isNonEmptyStr(o.id)) r.error('ST-TYPE', `${w}.id`, '待解决项 id 必须非空', null);
    if (!isNonEmptyStr(o.issue)) r.error('ST-TYPE', `${w}.issue`, '问题描述必须非空', null);
    if (!SEVERITIES.includes(o.severity)) r.error('ST-TYPE', `${w}.severity`, `严重程度必须是 ${SEVERITIES.join(' / ')}`, null);
    if (!OPEN_STATUS.includes(o.status)) r.error('ST-TYPE', `${w}.status`, `状态必须是 ${OPEN_STATUS.join(' / ')}`, null);
    // R10 留痕：basis（依据的文档章节/行号）与 checkStatus（已核对/推测）为**可选**字段，
    // 兼容既有状态文件；出现时校验类型与枚举。
    if ('basis' in o && !isStr(o.basis)) r.error('ST-TYPE', `${w}.basis`, '必须是字符串（依据：文档章节或文件行号）', null);
    if ('checkStatus' in o) {
      if (!CHECK_STATUS.includes(o.checkStatus)) r.error('ST-TYPE', `${w}.checkStatus`, `核对状态必须是 ${CHECK_STATUS.join(' / ')}`, null);
      else if (o.checkStatus === '推测') r.warn('ST-W8', `${w}.checkStatus`, '依据的核对状态为"推测"', 'R10 规定：推测状态不得据此要求实测——先自行核对文档');
    }
    if (!isStr(o.next)) r.error('ST-TYPE', `${w}.next`, '必须是字符串', null);
  });
}

function checkSimpleArrays(r, state) {
  const { routeChanges, directAnswers, authorizations, strategy } = state;

  // 原文 §十 的档案项之一：已完成任务（只存摘要，不存大段内容）
  if (!isStrArray(state.completedTasks)) {
    r.error('ST-TYPE', '$.completedTasks', '必须是字符串数组（已完成任务摘要，可为空数组）', null);
  } else {
    state.completedTasks.forEach((x, i) => {
      if (!isNonEmptyStr(x)) r.error('ST-TYPE', `$.completedTasks[${i}]`, '每项必须是非空摘要字符串', null);
      else if (x.length > 200) r.warn('ST-W5', `$.completedTasks[${i}]`, `摘要长达 ${x.length} 字符，疑似内联大段内容`, '只保存结论摘要，细节指向材料');
    });
  }

  if (!Array.isArray(routeChanges)) r.error('ST-TYPE', '$.routeChanges', '必须是数组', null);
  else routeChanges.forEach((c, i) => {
    const w = `$.routeChanges[${i}]`;
    if (!requireKeys(r, c, w, ['at', 'reason', 'change'])) return;
    if (!isIsoTime(c.at)) r.error('ST-TYPE', `${w}.at`, '必须是严格 ISO 8601 时间', null);
    if (!isNonEmptyStr(c.reason)) r.error('ST-TYPE', `${w}.reason`, '路线变更必须说明原因', null);
    if (!isNonEmptyStr(c.change)) r.error('ST-TYPE', `${w}.change`, '必须说明改了什么', null);
  });

  if (!Array.isArray(directAnswers)) r.error('ST-TYPE', '$.directAnswers', '必须是数组', null);  else directAnswers.forEach((d, i) => {
    const w = `$.directAnswers[${i}]`;
    if (!requireKeys(r, d, w, ['at', 'topic'])) return;
    if (!isIsoTime(d.at)) r.error('ST-TYPE', `${w}.at`, '必须是严格 ISO 8601 时间', null);
    if (!isNonEmptyStr(d.topic)) r.error('ST-TYPE', `${w}.topic`, '必须记录主题', null);
  });

  if (!Array.isArray(authorizations)) r.error('ST-TYPE', '$.authorizations', '必须是数组', null);
  else authorizations.forEach((a, i) => {
    const w = `$.authorizations[${i}]`;
    if (!requireKeys(r, a, w, ['scope', 'mode', 'grantedAt'])) return;
    if (!isNonEmptyStr(a.scope)) r.error('ST-TYPE', `${w}.scope`, '必须记录授权对象与范围', null);
    if (!AUTH_MODES.includes(a.mode)) r.error('ST-TYPE', `${w}.mode`, `授权类型必须是 ${AUTH_MODES.join(' / ')}`, null);
    if (!isIsoTime(a.grantedAt)) r.error('ST-TYPE', `${w}.grantedAt`, '必须是严格 ISO 8601 时间', null);
  });

  if (!requireKeys(r, strategy, '$.strategy', ['deferred', 'immediate', 'practice', 'assumptions'])) return;
  for (const k of ['deferred', 'immediate', 'practice', 'assumptions']) {
    if (!isStrArray(strategy[k])) r.error('ST-TYPE', `$.strategy.${k}`, '必须是字符串数组', null);
  }
}

// ── 领域包校验 ───────────────────────────────────────────────────────────────

function checkDomain(r, domainDir, state) {
  if (!fs.existsSync(domainDir)) {
    r.error('DP01', domainDir, '领域包目录不存在', '按 references/engine/domain-contract.md 创建，或修正 state.domain');
    return null;
  }
  let manifest;
  let manifestPath = path.join(domainDir, 'manifest.yml');
  if (!fs.existsSync(manifestPath)) {
    const jsonPath = path.join(domainDir, 'manifest.json');
    if (fs.existsSync(jsonPath)) {
      manifestPath = jsonPath;
      try {
        manifest = JSON.parse(readText(jsonPath));
      } catch (e) {
        r.error('DP02', manifestPath, `JSON 解析失败：${e.message}`, null);
        return null;
      }
    } else {
      r.error('DP01', manifestPath, '缺少 manifest.yml', null);
      return null;
    }
  } else {
    try {
      manifest = parseSimpleYaml(readText(manifestPath), 'manifest.yml');
    } catch (e) {
      r.error('DP02', manifestPath, e.message, '本脚本仅支持受限 YAML 子集：键值、一层映射、行内数组');
      return null;
    }
  }

  for (const k of MANIFEST_KEYS) {
    if (!(k in manifest)) r.error('DP03', `manifest.${k}`, '缺少必需键', `必需键：${MANIFEST_KEYS.join(', ')}`);
  }
  for (const k of Object.keys(manifest)) {
    if (!MANIFEST_KEYS.includes(k)) r.error('DP03', `manifest.${k}`, '存在契约外的键', `契约固定 ${MANIFEST_KEYS.join(', ')} 八个键，不增删`);
  }

  if (state && isNonEmptyStr(state.domain) && manifest.id !== state.domain) {
    r.error('DP04', 'manifest.id', `领域包 id (${manifest.id}) 与 state.domain (${state.domain}) 不一致`, null);
  }
  for (const k of ['id', 'name', 'version', 'engine', 'locale']) {
    if (k in manifest && !isNonEmptyStr(manifest[k])) r.error('DP03', `manifest.${k}`, '必须是非空字符串', null);
  }
  if (isNonEmptyStr(manifest.engine)) {
    const m = /^>=\s*(\d+)\.(\d+)\.(\d+)$/.exec(manifest.engine.trim());
    if (!m) r.warn('DP-W1', 'manifest.engine', `无法解析兼容范围：${manifest.engine}`, '建议使用 ">=1.0.0" 形式');
    else if (state && isNonEmptyStr(state.engineVersion)) {
      const e = state.engineVersion.split('.').map(Number);
      const need = [Number(m[1]), Number(m[2]), Number(m[3])];
      const lower = e[0] < need[0] || (e[0] === need[0] && (e[1] < need[1] || (e[1] === need[1] && e[2] < need[2])));
      if (lower) r.error('DP05', 'manifest.engine', `领域包要求引擎 ${manifest.engine}，当前状态记录为 ${state.engineVersion}`, '升级引擎或改用兼容的领域包');
    }
  }
  if ('taskMinutes' in manifest) {
    const tm = manifest.taskMinutes;
    if (!Array.isArray(tm) || tm.length !== 2 || !tm.every((v) => Number.isInteger(v) && v > 0) || tm[0] >= tm[1]) {
      r.error('DP03', 'manifest.taskMinutes', '必须是 [下限, 上限] 且下限 < 上限', null);
    }
  }
  if ("notes" in manifest && !isStr(manifest.notes)) r.error('DP03', 'manifest.notes', '必须是字符串', null);

  const sections = manifest.sections;
  if (!sections || typeof sections !== 'object' || Array.isArray(sections)) {
    r.error('DP03', 'manifest.sections', '必须是映射', null);
    return manifest;
  }
  for (const key of SECTIONS) {
    const rel = sections[key];
    if (!isNonEmptyStr(rel)) {
      r.error('DP06', `manifest.sections.${key}`, '缺少小节声明', `必须声明 ${SECTIONS.join(' / ')}`);
      continue;
    }
    const abs = path.join(domainDir, rel);
    if (!fs.existsSync(abs)) {
      r.error('DP06', abs, `小节文件不存在（sections.${key}）`, null);
      continue;
    }
    const size = fs.statSync(abs).size;
    if (size < 200) r.warn('DP-W2', abs, `小节文件过小（${size} 字节），可能未实际编写`, null);
  }
  for (const key of Object.keys(sections)) {
    if (!SECTIONS.includes(key)) r.warn('DP-W3', `manifest.sections.${key}`, '契约外的小节键', '契约小节：' + SECTIONS.join(' / '));
  }
  return manifest;
}

// ── 分层检查：引擎不得含学科专有词条 ─────────────────────────────────────────

function checkLayering(r, skillDir) {
  const targets = [];
  const skillMd = path.join(skillDir, 'SKILL.md');
  if (fs.existsSync(skillMd)) targets.push(skillMd);
  const engineDir = path.join(skillDir, 'references', 'engine');
  if (fs.existsSync(engineDir)) {
    for (const f of fs.readdirSync(engineDir)) {
      if (f.endsWith('.md')) targets.push(path.join(engineDir, f));
    }
  }
  // 模板也要扫描：它们会作为提示词直接发给用户看
  const assetsDir = path.join(skillDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    for (const f of fs.readdirSync(assetsDir)) {
      if (f.endsWith('.md')) targets.push(path.join(assetsDir, f));
    }
  }
  // 注：scripts/ 不参与扫描——校验器自身包含黑名单词表，扫它必然自命中。
  if (targets.length === 0) {
    r.warn('LY-W1', skillDir, '未找到 SKILL.md、references/engine 或 assets，跳过分层检查', null);
    return targets.length;
  }
  for (const file of targets) {
    const lines = readText(file).split(/\r?\n/);
    lines.forEach((line, i) => {
      for (const token of findDomainTokens(line)) {
        r.error('LY01', `${path.relative(skillDir, file)}:${i + 1}`, `引擎层出现学科硬令牌 "${token}"`, '学科内容应放在 references/domains/<id>/ 下');
      }
    });
  }
  return targets.length;
}
// ── PROGRESS.md 生成 ─────────────────────────────────────────────────────────

function renderProgress(state, statePathLabel) {
  const L = [];
  const table = (rows) => rows.join('\n');
  L.push('# 学习进度');
  L.push('');
  L.push('> 本文件由 ' + '`' + (statePathLabel || '.coach/state.json') + '`' + ' 自动生成，**请勿手工编辑**；冲突时以该状态文件为准。');
  L.push(`> revision ${state.revision} ｜ 更新于 ${state.updatedAt} ｜ 领域包 ${state.domain}@${state.domainVersion}`);
  L.push('');
  L.push('## 目标');
  L.push(`- 目标：${state.goal.statement}`);
  L.push(`- 可交付成果：${state.goal.deliverable}`);
  L.push(`- 为什么：${state.goal.why || '—'}`);
  L.push(`- 完成判据：${state.goal.doneCriteria.join('；')}`);
  L.push(`- 当前非目标：${state.goal.nonGoals.length ? state.goal.nonGoals.join('；') : '—'}`);
  L.push(`- 限制：时间 ${state.goal.constraints.time || '—'}｜工具 ${state.goal.constraints.tools || '—'}｜环境 ${state.goal.constraints.environment || '—'}｜权限 ${state.goal.constraints.permissions || '—'}`);
  L.push('');
  L.push('## 能力画像');
  L.push('| 维度 | 等级 | 状态 | 证据 | 主要缺口 | 对当前目标的影响 |');
  L.push('|---|---:|---|---|---|---|');
  for (const c of state.capability) {
    L.push(`| ${c.dimension} | ${c.level} | ${c.status} | ${c.evidence.length ? c.evidence.join(', ') : '—'} | ${c.gap || '—'} | ${c.impact || '—'} |`);
  }
  L.push('');
  L.push('## 当前阶段与任务');
  const stage = state.route.find((s) => s.n === state.current.stage);
  L.push(`- 阶段 ${state.current.stage}：${stage ? stage.name : '（未在 route 中）'} ｜ 状态：${state.current.stageStatus}`);
  if (stage) {
    L.push(`- 可交付成果：${stage.deliverable}`);
    L.push(`- 用户必须亲自完成：${stage.userOnly.join('；')}`);
    L.push(`- 验收标准：${stage.acceptance.join('；')}`);
  }
  const t = state.current.task;
  L.push(`- 本次任务：${t.title || '—'}（${t.state}，约 ${t.estimateMin} 分钟）`);
  if (t.criteria.length) L.push(`- 完成标准：${t.criteria.join('；')}`);
  L.push(`- 检索式复述：${state.retrievalRecap || '尚未进行'}`);
  L.push('');
  L.push('## 路线');
  L.push('| 阶段 | 名称 | 可交付成果 | 预计投入 | 通过后进入 |');
  L.push('|---|---|---|---|---|');
  for (const s of state.route) {
    L.push(`| ${s.n} | ${s.name} | ${s.deliverable} | ${s.estimate || '—'} | ${s.next || '—'} |`);
  }
  L.push('');
  L.push('## 证据');
  if (state.evidence.length === 0) L.push('（暂无）');
  else {
    L.push('| id | 阶段 | 支持结论 | 材料 | 强度 |');
    L.push('|---|---:|---|---|---|');
    for (const e of state.evidence) {
      const stageLabel = e.stage === 0 ? '诊断期' : String(e.stage);
      L.push(`| ${e.id} | ${stageLabel} | ${e.claim} | ${e.artifact} | ${e.strength} |`);
    }
  }
  L.push('');
  L.push('## 已完成任务');
  L.push(state.completedTasks.length ? state.completedTasks.map((x) => `- ${x}`).join('\n') : '（暂无）');
  L.push('');
  L.push('## 待解决项');
  const open = state.open.filter((o) => o.status === '未解决');
  if (open.length === 0) L.push('（无）');
  else for (const o of open) {
    const trail = [o.basis ? `依据：${o.basis}` : null, o.checkStatus ? `核对状态：${o.checkStatus}` : null]
      .filter(Boolean).join('｜');
    L.push(`- [${o.severity}] ${o.id}：${o.issue} → ${o.next}${trail ? `（${trail}）` : ''}`);
  }
  L.push('');
  L.push('## 教学策略');
  L.push(`- 暂缓：${state.strategy.deferred.join('；') || '—'}`);
  L.push(`- 即时补齐：${state.strategy.immediate.join('；') || '—'}`);
  L.push(`- 练习方式：${state.strategy.practice.join('；') || '—'}`);
  L.push(`- 待验证假设：${state.strategy.assumptions.join('；') || '—'}`);
  L.push('');
  if (state.routeChanges.length) {
    L.push('## 路线变更');
    for (const c of state.routeChanges) L.push(`- ${c.at}：${c.change}（原因：${c.reason}）`);
    L.push('');
  }
  if (state.directAnswers.length) {
    L.push('## 直接答案记录（不计入能力证据）');
    for (const d of state.directAnswers) L.push(`- ${d.at}：${d.topic}`);
    L.push('');
  }
  if (state.authorizations.length) {
    L.push('## 权限授权记录');
    for (const a of state.authorizations) L.push(`- ${a.grantedAt}｜${a.mode}｜${a.scope}`);
    L.push('');
  }
  L.push('## 下一步');
  L.push(state.nextTask || '（未指定）');
  L.push('');
  return table(L);
}

// ── 主流程 ───────────────────────────────────────────────────────────────────

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`参数错误：${e.message}`);
    process.exit(2);
  }
  if (args.help) {
    console.log(
      fs.readFileSync(fileURLToPath(import.meta.url), 'utf8')
        .split('*/')[0]
        .replace(/^#!.*\n/, '')
        .replace(/^\/\*\*?/, '')
        .trim(),
    );
    process.exit(0);
  }

  const skillDir = path.resolve(args.skillDir || SKILL_DIR_DEFAULT);
  const statePath = path.resolve(args.state || path.join('.coach', 'state.json'));
  const r = new Report();
  let state = null;

  if (!fs.existsSync(statePath)) {
    r.error('ST00', statePath, '状态文件不存在', '用 assets/state.template.json 建立骨架后填写');
  } else {
    try {
      const parsed = JSON.parse(readText(statePath));
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        const kind = parsed === null ? 'null' : Array.isArray(parsed) ? '数组' : typeof parsed;
        r.error('ST00', statePath, `状态文件必须是 JSON 对象，实际为 ${kind}`, '用 assets/state.template.json 重建骨架');
      } else {
        state = parsed;
      }
    } catch (e) {
      r.error('ST00', statePath, `JSON 解析失败：${e.message}`, '状态文件必须是严格 JSON（无注释、无尾逗号）');
    }
    if (state) checkState(r, state);
  }

  const domainDir = args.domainDir
    ? path.resolve(args.domainDir)
    : state && isNonEmptyStr(state.domain)
      ? path.join(skillDir, 'references', 'domains', state.domain)
      : null;
  let manifest = null;
  if (domainDir) manifest = checkDomain(r, domainDir, state);
  else r.warn('DP-W0', skillDir, '无法确定领域包目录（state.domain 缺失且未指定 --domain-dir）', null);

  // 任务时长上限：领域包给了 [下限, 上限]，超出上限应拆分（原文 §七.1 + 审核裁定 W16）
  if (manifest && Array.isArray(manifest.taskMinutes) && state && state.current && state.current.task) {
    const [lo, hi] = manifest.taskMinutes;
    const est = state.current.task.estimateMin;
    if (Number.isInteger(lo) && Number.isInteger(hi) && isInt(est) && est > hi) {
      r.warn('ST-W6', '$.current.task.estimateMin', `本次任务估计 ${est} 分钟，超过领域包上限 ${hi} 分钟`, '超限任务必须拆成多个可独立验收的子任务，或由用户"调整节奏"显式覆盖');
    }
  }

  const scanned = checkLayering(r, skillDir);

  if (args.render && state && r.errors.length === 0) {
    const outPath = args.out ? path.resolve(args.out) : path.join(path.dirname(statePath), 'PROGRESS.md');
    try {
      if (fs.existsSync(outPath) && fs.statSync(outPath).isDirectory()) {
        r.error('ST-W3', outPath, '--out 指向一个已存在的目录，不是文件路径', '改成具体的 .md 文件路径');
      } else {
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, renderProgress(state, path.relative(process.cwd(), statePath) || statePath), 'utf8');
        if (!args.quiet && !args.json) console.log(`已生成视图：${outPath}`);
      }
    } catch (e) {
      r.error('ST-W3', outPath, `写入视图失败：${e.message}`, null);
    }
  } else if (args.render && state && r.errors.length > 0) {
    r.warn('ST-W3', '--render', '存在 error，未生成 PROGRESS.md', '先修完 error 再渲染');
  }

  if (args.json) {
    console.log(JSON.stringify({ ok: r.errors.length === 0, errors: r.errors, warnings: r.warns, scannedEngineFiles: scanned }, null, 2));
  } else if (!args.quiet) {
    const name = r.errors.length === 0 ? 'PASS' : 'FAIL';
    console.log(`教练状态校验：${name}`);
    console.log(`状态：${statePath}`);
    if (domainDir) console.log(`领域包：${domainDir}`);
    console.log(`引擎分层检查：扫描 ${scanned} 个文件`);
    if (r.errors.length) {
      console.log(`\n错误 ${r.errors.length} 项：`);
      for (const i of r.errors) console.log(`  [${i.rule}] ${i.where}\n      ${i.msg}${i.hint ? `\n      → ${i.hint}` : ''}`);
    }
    if (r.warns.length) {
      console.log(`\n提醒 ${r.warns.length} 项：`);
      for (const i of r.warns) console.log(`  [${i.rule}] ${i.where} — ${i.msg}${i.hint ? ` → ${i.hint}` : ''}`);
    }
    if (r.errors.length === 0) console.log('\n未发现结构问题。注意：本校验不覆盖对话质量与教学效果。');
  }

  process.exit(r.errors.length === 0 ? 0 : 1);
}

const isMainModule = (() => {
  try {
    return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMainModule) main();

export { Report, checkState, checkDomain, checkLayering, renderProgress, parseSimpleYaml, readText };
