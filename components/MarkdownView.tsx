import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { rehypeHeadingIds } from '@/lib/toc'
import { ArticleEnhancer } from './ArticleEnhancer'

export function MarkdownView({ content }: { content: string }) {
  return (
    <div className="markdown-body">
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHeadingIds, [rehypeHighlight, { detect: false, ignoreMissing: true }]]}
        components={{
          img({ src, alt, ...rest }) {
            const s = typeof src === 'string' ? src : ''
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s}
                alt={alt || ''}
                loading="lazy"
                decoding="async"
                className="rounded-lg shadow-sm my-4 max-w-full h-auto"
                {...rest}
              />
            )
          },
          a({ href, children, ...rest }) {
            const h = typeof href === 'string' ? href : ''
            const external = /^https?:\/\//.test(h)
            return (
              <a
                href={h}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer nofollow' : undefined}
                {...rest}
              >
                {children}
              </a>
            )
          },
          table({ children, ...rest }) {
            return (
              <div className="table-wrap">
                <table {...rest}>{children}</table>
              </div>
            )
          },
        }}
      >
        {content}
      </Markdown>
      <ArticleEnhancer />
    </div>
  )
}
