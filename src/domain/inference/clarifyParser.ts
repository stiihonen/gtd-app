import type { Context, EnergyLevel } from '../entities/NextAction'
import type { Project } from '../entities/Project'

export interface InferredClarification {
  context: Context
  energy: EnergyLevel
  timeEstimate: string
  nextActionTitle: string
  inferredProjectId?: string
  inferredProjectTitle?: string
}

// ─── Context inference ────────────────────────────────────────────────────────

const CONTEXT_PATTERNS: [RegExp, Context][] = [
  [/\bcall\b|\bphone\b|\bring\b|\bdial\b/i, '@calls'],
  [/\bemail\b|\bslack\b|\bmessage\b|\btext\b|\breply\b|\brespond\b|\bbrowse\b|\bcode\b|\bfix\b|\bdebug\b|\bimplement\b|\bdeploy\b|\bwrite\b|\bdraft\b|\bresearch\b|\breview\b/i, '@computer'],
  [/\bbuy\b|\bpick.?up\b|\bgrocery\b|\bstore\b|\bshop\b|\bpurchase\b|\berrand\b/i, '@errands'],
  [/\bhome\b|\bgarden\b|\bclean\b|\blaundry\b|\brepair\b/i, '@home'],
  [/\bmeeting\b|\bagenda\b|\bin.person\b|\boffice\b/i, '@office'],
]

function inferContext(content: string): Context {
  // Explicit @tag wins
  const atTag = content.match(/@(\w+)/)
  if (atTag) {
    const tag = `@${atTag[1]}` as Context
    const valid: Context[] = ['@computer', '@calls', '@home', '@errands', '@office', '@agenda', '@anywhere']
    if (valid.includes(tag)) return tag
  }

  for (const [pattern, context] of CONTEXT_PATTERNS) {
    if (pattern.test(content)) return context
  }

  return '@computer'
}

// ─── Energy inference ─────────────────────────────────────────────────────────

function inferEnergy(content: string): EnergyLevel {
  if (/\bquick\b|\bsimple\b|\beasy\b|\broutine\b|\bminor\b|\bsmall\b|\bcheck\b|\bconfirm\b|\bremind\b/i.test(content)) {
    return 1
  }
  if (/\bplan\b|\bdesign\b|\bthink\b|\bresearch\b|\bwrite\b|\bcreate\b|\bcomplex\b|\bstrategy\b|\bdecide\b|\banalyze\b|\bevaluate\b|\bdraft\b/i.test(content)) {
    return 3
  }
  return 2
}

// ─── Time estimate inference ──────────────────────────────────────────────────

function inferTimeEstimate(content: string): string {
  // Explicit hours: e.g. "2h", "2 hours"
  const hoursMatch = content.match(/(\d+)\s*h(?:ours?)?/i)
  if (hoursMatch) return String(parseInt(hoursMatch[1]) * 60)

  // Explicit minutes: e.g. "30min", "30 minutes"
  const minsMatch = content.match(/(\d+)\s*min/i)
  if (minsMatch) return minsMatch[1]

  // Half hour
  if (/half.?hour/i.test(content)) return '30'

  // Keyword-based
  if (/\bquick\b|\bbrief\b|\bping\b/i.test(content)) return '15'
  if (/\bcall\b|\bemail\b|\bmessage\b/i.test(content)) return '15'
  if (/\bmeeting\b|\bsync\b|\bstandup\b/i.test(content)) return '30'
  if (/\breview\b|\bwrite\b|\bresearch\b|\bdraft\b/i.test(content)) return '60'

  return '30'
}

// ─── Project inference ────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'about', 'that', 'this', 'from', 'into',
  'are', 'was', 'has', 'its', 'our', 'but', 'not', 'can', 'you', 'all',
])

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(t => t.length >= 3 && !STOP_WORDS.has(t))
  )
}

function inferProject(
  contentTokens: Set<string>,
  projects: Project[]
): { id: string; title: string } | undefined {
  const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'stalled')

  let bestScore = 0
  let bestProject: Project | undefined

  for (const project of activeProjects) {
    const titleTokens = tokenize(project.title)
    let shared = 0
    for (const t of contentTokens) {
      if (titleTokens.has(t)) shared++
    }
    if (shared === 0) continue
    const score = shared / contentTokens.size
    if (score > bestScore) {
      bestScore = score
      bestProject = project
    }
  }

  if (bestScore >= 0.3 && bestProject) {
    return { id: bestProject.id, title: bestProject.title }
  }

  return undefined
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function parseInboxItem(content: string, projects: Project[]): InferredClarification {
  const contentTokens = tokenize(content)

  const context = inferContext(content)
  const energy = inferEnergy(content)
  const timeEstimate = inferTimeEstimate(content)
  const nextActionTitle = content.trim()
  const projectMatch = inferProject(contentTokens, projects)

  return {
    context,
    energy,
    timeEstimate,
    nextActionTitle,
    inferredProjectId: projectMatch?.id,
    inferredProjectTitle: projectMatch?.title,
  }
}
