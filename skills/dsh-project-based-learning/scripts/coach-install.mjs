#!/usr/bin/env node
/**
 * coach-install.mjs — 把本技能安装到可被 DSH 发现的位置
 *
 * 用法：
 *   node scripts/coach-install.mjs [--dest-root <dir>] [--link] [--force] [--dry-run]
 *
 * 默认目标： <cwd>/.dsh/skills/dsh-project-based-learning
 *   `.dsh/skills` 是 DSH 的 project-dsh 技能根（rank 100），按官方说明新增 skill
 *   会在下一次模型步骤进入会话目录，无需重启宿主。
 *
 * --link   建立目录联接（Windows junction / 其它平台 symlink），源改动即时生效，
 *          适合在源目录继续迭代；不指定时为目标处的一份副本。
 * --force  目标已存在时先删除再安装。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.resolve(HERE, '..');
const SKILL_NAME = path.basename(SOURCE);

function parseArgs(argv) {
  const out = { link: false, force: false, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dest-root') out.destRoot = argv[++i];
    else if (a === '--link') out.link = true;
    else if (a === '--force') out.force = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`未知参数：${a}`);
  }
  return out;
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`参数错误：${e.message}`);
    process.exit(2);
  }
  if (args.help) {
    console.log('用法：node scripts/coach-install.mjs [--dest-root <dir>] [--link] [--force] [--dry-run]');
    process.exit(0);
  }

  const destRoot = path.resolve(args.destRoot || path.join(process.cwd(), '.dsh', 'skills'));
  const target = path.join(destRoot, SKILL_NAME);

  if (path.resolve(target) === SOURCE) {
    console.error(`源与目标相同（${target}）：请在源目录之外的当前工作目录运行。`);
    process.exit(2);
  }
  if (target.startsWith(SOURCE + path.sep)) {
    console.error(`目标位于源目录内部（${target}）：会造成递归复制，已中止。`);
    process.exit(2);
  }

  const exists = fs.existsSync(target) || fs.lstatSync(target, { throwIfNoEntry: false }) !== undefined;
  if (exists && !args.force) {
    console.error(`目标已存在：${target}\n如需覆盖请加 --force。`);
    process.exit(1);
  }

  console.log(`源：  ${SOURCE}`);
  console.log(`目标：${target}`);
  console.log(`方式：${args.link ? '目录联接（实时同步源改动）' : '复制副本'}`);
  if (args.dryRun) {
    console.log('（--dry-run：未执行任何写入）');
    process.exit(0);
  }

  fs.mkdirSync(destRoot, { recursive: true });
  if (exists) {
    console.log('移除既有目标…');
    fs.rmSync(target, { recursive: true, force: true });
  }

  if (args.link) {
    const type = process.platform === 'win32' ? 'junction' : 'dir';
    fs.symlinkSync(SOURCE, target, type);
  } else {
    fs.cpSync(SOURCE, target, { recursive: true });
  }

  console.log('\n完成。验证：');
  console.log('  1) 目录存在：' + fs.existsSync(target));
  console.log('  2) 结构自检：node ' + path.join(target, 'scripts', 'coach-validate.mjs') + ' --help');
  console.log('  3) 在 DSH 会话中让模型加载技能：skill("' + SKILL_NAME + '")');
  console.log('     （若目录未刷新，新开一个会话或重启宿主）');
}

main();
