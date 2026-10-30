export type TocItem = { depth: number; text: string; id: string }

/** 与 rehypeHeadingIds 保持一致的 id 生成规则（参考 github-slugger 的简化版） */
export function makeHeadingId(text: string, used?: Map<string, number>): string {
  let s = text
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\- ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
  if (!s) s = 'section'
  if (!used) return s
  const n = used.get(s) ?? 0
  used.set(s, n + 1)
  return n === 0 ? s : `${s}-${n}`
}

/** 从 Markdown 原文提取目录（跳过代码块内的 # 注释） */
export function extractToc(markdown: string): TocItem[] {
  const lines = markdown.split('\n')
  const items: TocItem[] = []
  const used = new Map<string, number>()
  let inFence = false
  for (const raw of lines) {
    const line = raw.trimEnd()
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const m = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line)
    if (!m) continue
    const depth = m[1].length
    const text = m[2].replace(/[*_`]/g, '').trim()
    if (!text) continue
    items.push({ depth, text, id: makeHeadingId(text, used) })
  }
  return items
}

/** rehype 插件：为 h1~h6 注入 id，供目录锚点跳转 */
export function rehypeHeadingIds() {
  return (tree: any) => {
    const used = new Map<string, number>()
    const textOf = (node: any): string => {
      if (node.type === 'text') return node.value ?? ''
      if (Array.isArray(node.children)) return node.children.map(textOf).join('')
      return ''
    }
    const walk = (node: any) => {
      if (node?.type === 'element' && /^h[1-6]$/.test(node.tagName)) {
        const id = makeHeadingId(textOf(node), used)
        node.properties = node.properties || {}
        node.properties.id = id
      }
      if (Array.isArray(node?.children)) node.children.forEach(walk)
    }
    walk(tree)
  }
}
