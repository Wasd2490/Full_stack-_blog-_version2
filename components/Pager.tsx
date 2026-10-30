import Link from 'next/link'

export function Pager({
  page,
  totalPages,
  basePath,
  query,
}: {
  page: number
  totalPages: number
  basePath: string
  query?: Record<string, string | undefined>
}) {
  if (totalPages <= 1) return null

  const href = (p: number) => {
    const params = new URLSearchParams()
    Object.entries(query ?? {}).forEach(([k, v]) => {
      if (v && k !== 'page') params.set(k, v)
    })
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return `${basePath}${qs ? `?${qs}` : ''}`
  }

  // 生成页码：1 ... 当前页前后各1页 ... 最后一页
  const pages: (number | '…')[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…')
    }
  }

  return (
    <nav className="pager" aria-label="分页">
      {page > 1 ? (
        <Link href={href(page - 1)} className="pager-btn">
          ← 上一页
        </Link>
      ) : (
        <span className="pager-btn disabled">← 上一页</span>
      )}
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} className="pager-ellipsis">…</span>
        ) : (
          <Link
            key={p}
            href={href(p)}
            className={`pager-btn ${p === page ? 'active' : ''}`}
          >
            {p}
          </Link>
        )
      )}
      {page < totalPages ? (
        <Link href={href(page + 1)} className="pager-btn">
          下一页 →
        </Link>
      ) : (
        <span className="pager-btn disabled">下一页 →</span>
      )}
    </nav>
  )
}
