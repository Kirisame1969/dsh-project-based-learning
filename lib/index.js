// dsh-project-based-learning bundle entry point.
//
// 把随包分发的教练技能注册为一个 DSH 运行时技能。技能正文是本仓库的
// `skills/dsh-project-based-learning/SKILL.md`；它的相对引用（`references/`、`assets/`、`scripts/`）
// 通过目录型 resourceBase 解析到技能目录，因此 agent 只在需要时才读取引擎协议、
// 领域包与模板（progressive disclosure）。
//
// 本文件是手写来源，不是构建产物：本包没有构建步骤，`lib/` 只是与 harness 各包
// 保持一致的约定目录。运行时不 import 任何 harness 包，只在 apply 时消费注入进来
// 的 `skills` 服务，因此不会带入第二份 cordis 副本；peer 依赖仅用于对齐宿主版本。
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'dsh-project-based-learning'

/** 依赖 `skills` 服务：缺失该服务的组合不会加载本插件。 */
export const inject = ['skills']

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const skillRoot = join(packageRoot, 'skills', 'dsh-project-based-learning')

const FALLBACK_DESCRIPTION =
  '项目制学习教练：以真实项目为主线，通过诊断、分级提示、证据审阅与阶段验收，引导学员独立完成成果。仅在用户明确要求教学模式时启用。'

/**
 * 拆分 SKILL.md 的 YAML frontmatter，取出 description / whenToUse 与正文。
 * frontmatter 缺失或格式不符时回退为整篇正文，不抛错。
 * @param {string} text - SKILL.md 原文。
 * @returns {{ description?: string, whenToUse?: string, body: string }}
 */
function splitFrontmatter(text) {
  if (!text.startsWith('---\n')) return { body: text }
  const end = text.indexOf('\n---', 4)
  if (end < 0) return { body: text }
  const meta = text.slice(4, end)
  const body = text.slice(end + 4).replace(/^\n+/, '')
  const read = (key) => {
    const m = new RegExp(`^${key}:\\s*(.+)$`, 'm').exec(meta)
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : undefined
  }
  return { description: read('description'), whenToUse: read('whenToUse'), body }
}

/**
 * 注册教练技能。注册即 effect：`ctx.skills.register()` 返回的 disposer 会在卸载时
 * 撤销该贡献，无需手工清理。
 * @param {import('@deepseek-ai/cordis').Context & { skills: { register: (skill: object) => () => void } }} ctx
 */
export function apply(ctx) {
  const raw = readFileSync(join(skillRoot, 'SKILL.md'), 'utf8')
  const { description, whenToUse, body } = splitFrontmatter(raw)
  const summary = whenToUse ? `${description ?? FALLBACK_DESCRIPTION}（适用时机：${whenToUse}）` : description

  ctx.effect(() =>
    ctx.skills.register({
      name: 'dsh-project-based-learning',
      source: 'bundled',
      description: summary ?? FALLBACK_DESCRIPTION,
      content: body,
      resourceBase: { kind: 'directory', path: skillRoot },
    }),
  )
}
