'use client'

import ReactMarkdown from 'react-markdown'

interface SummaryMarkdownProps {
  markdown: string
}

export function SummaryMarkdown({ markdown }: SummaryMarkdownProps) {
  return (
    <div className="text-[13px] leading-[1.55] text-white/90">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-[15px] font-semibold text-white tracking-tight mt-4 first:mt-0 mb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-[10px] font-bold uppercase tracking-[0.12em] text-violet-200/70 mt-4 first:mt-0 mb-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[12px] font-semibold text-white/85 mt-3 first:mt-0 mb-1.5">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-[13px] leading-[1.6] text-white/85 mb-3 last:mb-0">{children}</p>
          ),
          ul: ({ children }) => <ul className="space-y-1.5 mb-3 last:mb-0">{children}</ul>,
          ol: ({ children }) => (
            <ol className="space-y-1.5 mb-3 last:mb-0 list-decimal pl-5">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-[13px] leading-[1.55] text-white/85 pl-4 relative before:content-[''] before:absolute before:left-1 before:top-[0.55em] before:w-1 before:h-1 before:rounded-full before:bg-violet-300/70">
              {children}
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-white/75">{children}</em>,
          code: ({ children }) => (
            <code className="px-1.5 py-0.5 rounded bg-white/8 text-[12px] font-mono text-violet-100">
              {children}
            </code>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-violet-200 underline underline-offset-2 decoration-violet-400/40 hover:decoration-violet-300"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-violet-400/40 pl-3 my-3 text-white/70 italic">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-white/8" />,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
