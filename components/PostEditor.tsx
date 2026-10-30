'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { rehypeHeadingIds } from '@/lib/toc'
import { savePostAction } from '@/lib/admin'
import { countWords, readingTime } from '@/lib/utils'

export type EditorPost = {
  id?: number
  title: string
  slug: string
  content: string
  excerpt: string
  cover: string
  categoryName: string
  tags: string[]
  status: 'DRAFT' | 'PUBLISHED'
  scheduledAt: string
  pinned: boolean
  columnId: number | null
}

export function PostEditor({
  post,
  categories,
  columns,
  allTags = [],
}: {
  post: EditorPost
  categories: string[]
  columns: { id: number; title: string }[]
  allTags?: string[]
}) {
  const router = useRouter()
  const [form, setForm] = useState<EditorPost>(post)
  const [tagText, setTagText] = useState(post.tags.join(', '))
  const [mode, setMode] = useState<'edit' | 'split' | 'preview'>('edit')
  const [saving, start] = useTransition()
  const [msg, setMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const mdFileRef = useRef<HTMLInputElement>(null)

  const set = <K extends keyof EditorPost>(k: K, v: EditorPost[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  function save(publish?: boolean) {
    const status = publish ? 'PUBLISHED' : form.status
    start(async () => {
      const res = await savePostAction({
        ...form,
        status,
        tags: tagText.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
        scheduledAt: form.scheduledAt || null,
      })
      if (!res.ok) {
        setMsg(res.msg)
        return
      }
      setMsg('已保存')
      router.push('/admin/posts')
      router.refresh()
    })
  }

  async function upload(file: File) {
    const fd = new FormData()
    fd.append('file', file)
    setMsg('上传中…')
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!json.ok) {
        setMsg(json.msg || '上传失败')
        return
      }
      const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(json.url)
      const insert = isImage ? `\n![](${json.url})\n` : `\n[附件](${json.url})\n`
      set('content', form.content + insert)
      if (!form.cover && isImage) set('cover', json.url)
      setMsg('上传完成')
    } catch {
      setMsg('上传失败')
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Ctrl/Cmd + S 保存
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault()
      save()
      return
    }
    // Tab 缩进
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = e.currentTarget
      const s = ta.selectionStart
      const t = ta.selectionEnd
      const next = `${form.content.slice(0, s)}  ${form.content.slice(t)}`
      set('content', next)
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = s + 2
      })
    }
  }

  const words = countWords(form.content)

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* 顶部操作 */}
      <div className="card" style={{ padding: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn" onClick={() => save()} disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </button>
        <button className="btn btn-primary" onClick={() => save(true)} disabled={saving}>
          保存并发布
        </button>
        <button className="btn" onClick={() => mdFileRef.current?.click()}>
          📄 上传 MD 文件
        </button>
        <input
          ref={mdFileRef}
          type="file"
          accept=".md,.markdown,.txt"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (f) {
              const text = await f.text()
              set('content', text)
              if (!form.title) set('title', f.name.replace(/\.(md|markdown|txt)$/i, ''))
              setMsg(`已导入 ${f.name}`)
            }
            e.target.value = ''
          }}
        />
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {(['edit', 'split', 'preview'] as const).map((m) => (
            <button key={m} className={`btn ${mode === m ? 'btn-primary' : ''}`} onClick={() => setMode(m)}>
              {m === 'edit' ? '编辑' : m === 'split' ? '分屏' : '预览'}
            </button>
          ))}
        </div>
        {msg && <span className="muted" style={{ fontSize: 13, width: '100%' }}>{msg}</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: mode === 'split' ? '1fr 1fr' : '1fr', gap: 14 }} className="editor-grid">
        {/* 正文编辑区 */}
        {mode !== 'preview' && (
          <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
            <input
              className="input"
              placeholder="文章标题"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              style={{ fontSize: 17, fontWeight: 600 }}
            />

            {/* 分类/标签/专栏 快速选择 */}
            <div className="card" style={{ padding: 14, display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                <span className="muted">📂 分类</span>
                <input className="input" list="cat-options" value={form.categoryName} onChange={(e) => set('categoryName', e.target.value)} placeholder="如：技术随笔" />
                <datalist id="cat-options">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </label>

              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                <span className="muted">🏷️ 标签（逗号分隔，可从已有标签选）</span>
                <input
                  className="input"
                  value={tagText}
                  onChange={(e) => setTagText(e.target.value)}
                  placeholder="输入或从下方选择标签"
                  list="all-tags"
                />
                <datalist id="all-tags">
                  {allTags.map((tag) => (
                    <option key={tag} value={tag} />
                  ))}
                </datalist>
              </label>

              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                <span className="muted">📚 专栏</span>
                <select
                  className="input"
                  value={form.columnId ?? ''}
                  onChange={(e) => set('columnId', e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">不属于专栏</option>
                  {columns.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </label>
            </div>

            <textarea
              className="input"
              placeholder="支持 Markdown。Ctrl/Cmd + S 保存，Tab 缩进"
              value={form.content}
              onChange={(e) => set('content', e.target.value)}
              onKeyDown={onKeyDown}
              rows={20}
              style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 13.5, lineHeight: 1.7 }}
            />
            <div className="muted" style={{ fontSize: 12.5 }}>
              {words} 字 · 约 {readingTime(words)} 分钟阅读
            </div>
          </div>
        )}

        {/* 预览区 */}
        {mode !== 'edit' && (
          <div className="card" style={{ padding: 20, minWidth: 0, maxHeight: 760, overflowY: 'auto' }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>{form.title || '（无标题）'}</h1>
            <div className="markdown-body">
              <Markdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHeadingIds, [rehypeHighlight, { detect: false, ignoreMissing: true }]]}
              >
                {form.content || '_还没有内容_'}
              </Markdown>
            </div>
          </div>
        )}
      </div>

      {/* 元数据 */}
      <div className="card" style={{ padding: 16, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
          <span className="muted">Slug（留空自动生成）</span>
          <input className="input" value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="url-friendly-slug" />
        </label>

        <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
          <span className="muted">摘要（留空自动截取）</span>
          <input className="input" value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} />
        </label>

        <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
          <span className="muted">封面图</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <input className="input" value={form.cover} onChange={(e) => set('cover', e.target.value)} placeholder="/uploads/xxx.png" />
            <button className="btn" type="button" onClick={() => fileRef.current?.click()}>上传</button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) upload(f)
              e.target.value = ''
            }}
          />
        </label>

        <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
          <span className="muted">状态</span>
          <select className="input" value={form.status} onChange={(e) => set('status', e.target.value as any)}>
            <option value="DRAFT">草稿</option>
            <option value="PUBLISHED">已发布</option>
          </select>
        </label>

        <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
          <span className="muted">定时发布（可选）</span>
          <input
            className="input"
            type="datetime-local"
            value={form.scheduledAt}
            onChange={(e) => set('scheduledAt', e.target.value)}
          />
        </label>

        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
          <input type="checkbox" checked={form.pinned} onChange={(e) => set('pinned', e.target.checked)} />
          <span>置顶显示</span>
        </label>
      </div>

      <style>{`@media(max-width:900px){.editor-grid{grid-template-columns:1fr !important;}}`}</style>
    </div>
  )
}
