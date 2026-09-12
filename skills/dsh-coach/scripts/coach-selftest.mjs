#!/usr/bin/env node
/**
 * coach-selftest.mjs — 校验器自身的回归自测（不启动子进程，可在沙箱内运行）
 *
 * 用法：
 *   node scripts/coach-selftest.mjs [--examples <dir>] [--skill-dir <dir>] [--keep-temp]
 *
 * 覆盖：
 *   1. 反向夹具必须被拦下（并按规则号断言关键不变量真的触发）
 *   2. 正向夹具在状态层必须零错误
 *   3. 领域包结构（缺文件时记为 SKIP，不误判为通过）
 *   4. 分层负例：往引擎副本注入学科硬令牌，必须报 LY01；原目录不得报
 *   5. 迷你 YAML 子集解析与渲染函数的形状检查
 *
 * 退出码：0 全部通过（SKIP 不算失败）；1 存在失败。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Report, checkState, checkDomain, checkLayering, renderProgress, parseSimpleYaml, readText } from './coach-validate.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(HERE, '..');

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const EXAMPLES = path.resolve(opt('--examples', path.resolve(SKILL_DIR, '..', '..', 'examples')));
const KEEP_TEMP = args.includes('--keep-temp');

const results = [];
const record = (name, status, detail) => {
  results.push({ name, status, detail });
  const mark = status === 'PASS' ? '✓' : status === 'SKIP' ? '-' : '✗';
  console.log(`${mark} [${status}] ${name}${detail ? `\n      ${detail}` : ''}`);
};

function readJsonIfExists(p) {
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(readText(p));
  } catch (e) {
    return { __parseError: e.message };
  }
}

// ── 1. 反向夹具必须被拦下 ────────────────────────────────────────────────────
const invalidPath = path.join(EXAMPLES, 'state.selftest-invalid.json');
const invalidState = readJsonIfExists(invalidPath);
if (!invalidState || invalidState.__parseError) {
  record('反向夹具被拦下', 'FAIL', `${invalidPath} 读取失败：${invalidState ? invalidState.__parseError : '文件不存在'}`);
} else {
  const r = new Report();
  checkState(r, invalidState);
  const rules = new Set(r.errors.map((e) => e.rule));
  const required = ['ST02', 'ST03', 'ST04', 'ST06', 'ST07', 'ST09', 'ST10', 'ST11', 'ST12'];
  const missing = required.filter((x) => !rules.has(x));
  if (missing.length === 0 && r.errors.length >= 15) {
    record('反向夹具被拦下', 'PASS', `命中 ${r.errors.length} 条 error，关键规则齐全：${required.join(', ')}`);
  } else {
    record('反向夹具被拦下', 'FAIL', `缺少规则：${missing.join(', ') || '无'}；error 数 ${r.errors.length}（期望 ≥15）`);
  }
}

// ── 2. 正向夹具状态层零错误 ─────────────────────────────────────────────────
const demoPath = path.join(EXAMPLES, 'state.demo.json');
const demoState = readJsonIfExists(demoPath);
if (!demoState || demoState.__parseError) {
  record('正向夹具状态层', 'FAIL', `${demoPath} 读取失败：${demoState ? demoState.__parseError : '文件不存在'}`);
} else {
  const r = new Report();
  checkState(r, demoState);
  if (r.errors.length === 0) record('正向夹具状态层', 'PASS', `warn ${r.warns.length} 条`);
  else record('正向夹具状态层', 'FAIL', r.errors.map((e) => `${e.rule}@${e.where}`).join('; '));
}

// ── 3. 领域包结构 ───────────────────────────────────────────────────────────
if (demoState && !demoState.__parseError) {
  const domainDir = path.join(SKILL_DIR, 'references', 'domains', demoState.domain);
  const r = new Report();
  const manifest = checkDomain(r, domainDir, demoState);
  if (r.errors.length === 0 && manifest) {
    record('领域包结构', 'PASS', `${manifest.id}@${manifest.version}，小节齐全`);
  } else if (r.errors.every((e) => e.rule === 'DP06')) {
    record('领域包结构', 'SKIP', `领域包尚未补齐：${r.errors.map((e) => path.basename(e.where)).join(', ')}`);
  } else {
    record('领域包结构', 'FAIL', r.errors.map((e) => `${e.rule}@${e.where}: ${e.msg}`).join('; '));
  }
}

// ── 3.5 ST-W7：知识类"单题即发已验证"必须被提醒 ─────────────────────────────
// 修订 2.1 的取舍：这是 warn（只提醒、不拦截），所以断言必须同时检查
// "命中了 warn" 与 "没有升级成 error"——否则一次改动就可能把它变成门禁。
if (demoState && !demoState.__parseError) {
  const probe = JSON.parse(JSON.stringify(demoState));
  probe.evidence.push(
    { id: 'E90', stage: 0, claim: '能解释生命周期回调的顺序与次数', artifact: '问答记录：Q1-1 作答原文', strength: '已验证', note: '' },
    { id: 'E91', stage: 0, claim: '同一知识点的追问记录', artifact: '问答记录：Q1-1 加难追问', strength: '已验证', note: '' },
  );
  const target = probe.capability.find((c) => c.dimension === '解释与迁移');
  target.status = '已验证';
  target.level = 3;
  target.evidence = ['E90', 'E91'];
  const r = new Report();
  checkState(r, probe);
  const hit = r.warns.some((x) => x.rule === 'ST-W7');
  const escalated = r.errors.some((x) => x.rule === 'ST-W7');
  if (hit && !escalated) record('ST-W7 提醒（单题即发已验证）', 'PASS', '命中 warn，且未升级为 error');
  else if (escalated) record('ST-W7 提醒（单题即发已验证）', 'FAIL', 'ST-W7 被当作 error 拦截（应为 warn-only）');
  else record('ST-W7 提醒（单题即发已验证）', 'FAIL', '未命中 ST-W7');
}

// ── 3.6 不变量 3 的反绕过子句：强度不足的证据不得支撑"已验证" ───────────────
// 只断言规则号出现是不够的（level<3 等分支同样报 ST03），因此这里单独构造
// "已验证 + 引用的证据强度是待验证" 的探针，确认反绕过子句真的生效。
if (demoState && !demoState.__parseError) {
  const probe = JSON.parse(JSON.stringify(demoState));
  probe.evidence.push({ id: 'E92', stage: 0, claim: '某机制', artifact: '问答记录：Q9-9 作答原文', strength: '待验证', note: '' });
  const target = probe.capability.find((c) => c.dimension === '结构与质量');
  target.status = '已验证';
  target.level = 3;
  target.evidence = ['E92'];
  const r = new Report();
  checkState(r, probe);
  const hit = r.errors.some((x) => x.rule === 'ST03' && /没有一条是/.test(x.msg));
  if (hit) record('不变量 3 反绕过子句', 'PASS', '引用"待验证"证据却标已验证据此被拦下');
  else record('不变量 3 反绕过子句', 'FAIL', '未命中"没有一条是已验证"的 ST03');
}

// ── 3.7 ST-W8：实测依据标为"推测"时必须提醒；省略字段时不提醒 ────────────────
if (demoState && !demoState.__parseError) {
  const withSpec = JSON.parse(JSON.stringify(demoState));
  withSpec.open.push({ id: 'O90', issue: '疑为文档与实测不一致', severity: '重要', status: '未解决', next: '要求实测', basis: '官方文档某节', checkStatus: '推测' });
  const rWith = new Report();
  checkState(rWith, withSpec);
  const hit = rWith.warns.some((x) => x.rule === 'ST-W8');

  const withoutSpec = JSON.parse(JSON.stringify(demoState));
  withoutSpec.open.push({ id: 'O91', issue: '未填留痕字段', severity: '重要', status: '未解决', next: '照常推进' });
  const rWithout = new Report();
  checkState(rWithout, withoutSpec);
  const noWarn = !rWithout.warns.some((x) => x.rule === 'ST-W8');

  if (hit && noWarn) record('ST-W8 推测状态提醒', 'PASS', '标"推测"时提醒；省略留痕字段时不提醒（与 state.md 的如实声明一致）');
  else record('ST-W8 推测状态提醒', 'FAIL', hit ? '省略字段时被误报' : '标"推测"时未提醒');
}

// ── 4. 分层负例：注入硬令牌必须被发现 ───────────────────────────────────────
const tempRoot = path.join(SKILL_DIR, '..', '.selftest-tmp');
try {
  fs.rmSync(tempRoot, { recursive: true, force: true });
  fs.cpSync(SKILL_DIR, tempRoot, { recursive: true });
  const target = path.join(tempRoot, 'references', 'engine', 'state.md');
  fs.appendFileSync(target, '\n<!-- 自测注入：MonoBehaviour Prefab asmdef -->\n', 'utf8');

  const rBad = new Report();
  checkLayering(rBad, tempRoot);
  const rGood = new Report();
  checkLayering(rGood, SKILL_DIR);

  const badHits = rBad.errors.filter((e) => e.rule === 'LY01');
  const goodHits = rGood.errors.filter((e) => e.rule === 'LY01');
  if (badHits.length >= 3 && goodHits.length === 0) {
    record('分层负例（注入 3 个令牌）', 'PASS', `副本报 ${badHits.length} 条 LY01，原目录 0 条`);
  } else {
    record('分层负例（注入 3 个令牌）', 'FAIL', `副本 LY01=${badHits.length}（期望 ≥3），原目录 LY01=${goodHits.length}（期望 0）`);
  }
} catch (e) {
  record('分层负例（注入 3 个令牌）', 'FAIL', `异常：${e.message}`);
} finally {
  if (!KEEP_TEMP) fs.rmSync(tempRoot, { recursive: true, force: true });
  else console.log(`      （--keep-temp：保留 ${tempRoot}）`);
}

// ── 5. 迷你 YAML 解析与渲染形状 ─────────────────────────────────────────────
try {
  const parsed = parseSimpleYaml('id: x\nsections:\n  a: a.md\n  b: b.md\ntaskMinutes: [30, 90]\n', 'test.yml');
  const ok = parsed.id === 'x' && parsed.sections && parsed.sections.a === 'a.md' && parsed.sections.b === 'b.md'
    && Array.isArray(parsed.taskMinutes) && parsed.taskMinutes[0] === 30 && parsed.taskMinutes[1] === 90;
  record('迷你 YAML 子集解析', ok ? 'PASS' : 'FAIL', ok ? '嵌套映射与行内数组解析正确' : JSON.stringify(parsed));
} catch (e) {
  record('迷你 YAML 子集解析', 'FAIL', e.message);
}

if (demoState && !demoState.__parseError) {
  try {
    const md = renderProgress(demoState);
    const need = ['# 学习进度', '## 目标', '## 能力画像', '## 当前阶段与任务', '## 证据', '## 待解决项'];
    const missing = need.filter((h) => !md.includes(h));
    if (missing.length === 0) record('渲染函数形状', 'PASS', `${md.split('\n').length} 行`);
    else record('渲染函数形状', 'FAIL', `缺少小节：${missing.join(', ')}`);
  } catch (e) {
    record('渲染函数形状', 'FAIL', e.message);
  }
}

// ── 汇总 ────────────────────────────────────────────────────────────────────
const failed = results.filter((x) => x.status === 'FAIL');
const skipped = results.filter((x) => x.status === 'SKIP');
console.log(`\n自测结果：PASS ${results.length - failed.length - skipped.length} ｜ SKIP ${skipped.length} ｜ FAIL ${failed.length}`);
if (failed.length) console.log('存在失败项，需修复后才可依赖校验器的结论。');
process.exit(failed.length ? 1 : 0);
