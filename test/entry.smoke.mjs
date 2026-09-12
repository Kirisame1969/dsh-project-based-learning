// test/entry.smoke.mjs — 组合包入口的离线冒烟测试
//
// 不启动 Cordis、不安装任何依赖：用桩 ctx 调用 `apply()`，断言它确实把
// `skills/dsh-project-based-learning/SKILL.md` 注册成了一个可用的运行时技能。CI 与本地都可跑：
//
//   node test/entry.smoke.mjs
//
// 退出码 0 表示通过，非 0 表示入口契约被破坏。
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { apply, inject, name } from '../lib/index.js'

assert.equal(name, 'dsh-project-based-learning', '插件名必须是 dsh-project-based-learning')
assert.deepEqual(inject, ['skills'], '必须声明注入 skills 服务')

const registered = []
let effectUsed = false
const ctx = {
  effect(fn) {
    effectUsed = true
    return fn()
  },
  skills: {
    register(skill) {
      registered.push(skill)
      return () => {}
    },
  },
}

apply(ctx)

assert.equal(effectUsed, true, '注册必须走 ctx.effect()，以便卸载时自动撤销')
assert.equal(registered.length, 1, '应当恰好注册一个技能')

const skill = registered[0]
assert.equal(skill.name, 'dsh-project-based-learning')
assert.equal(skill.source, 'bundled')
assert.ok(typeof skill.description === 'string' && skill.description.length > 10, '描述必须非空')
assert.ok(skill.description.includes('项目制学习教练'), '描述应来自 SKILL.md frontmatter')
assert.ok(skill.content.includes('# 项目制教学教练（引擎）'), '正文应是 SKILL.md 的指令体')
assert.ok(!skill.content.startsWith('---'), '正文不应包含 frontmatter')
assert.equal(skill.resourceBase.kind, 'directory', '必须以目录型 resourceBase 暴露技能目录')
assert.ok(skill.resourceBase.path.endsWith(join('skills', 'dsh-project-based-learning')), `resourceBase 应指向技能目录，实际 ${skill.resourceBase.path}`)
assert.ok(existsSync(join(skill.resourceBase.path, 'SKILL.md')), 'resourceBase 下的 SKILL.md 必须存在')

// 技能正文引用的引擎协议文件必须随包分发，否则加载后是死链
for (const rel of [
  'references/engine/intake.md',
  'references/engine/diagnosis.md',
  'references/engine/route.md',
  'references/engine/task-loop.md',
  'references/engine/review-acceptance.md',
  'references/engine/adapt.md',
  'references/engine/state.md',
  'references/engine/permissions.md',
  'references/engine/domain-contract.md',
  'assets/state.template.json',
  'scripts/coach-validate.mjs',
]) {
  assert.ok(existsSync(join(skill.resourceBase.path, rel)), `技能资源缺失：${rel}`)
}

console.log('entry smoke: PASS（入口契约与技能资源齐全）')
