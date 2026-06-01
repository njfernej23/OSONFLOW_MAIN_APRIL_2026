"use client"

import type { CSSProperties, HTMLAttributes } from "react"
import { memo } from "react"
import ReactMarkdown, { type Options } from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@workspace/ui/lib/utils"

export type AIResponseProps = HTMLAttributes<HTMLDivElement> & {
  options?: Options
  children: Options["children"]
}

const linkStyle = {
  color: "var(--ai-response-link-color, var(--primary))",
  textDecorationColor:
    "var(--ai-response-link-decoration-color, color-mix(in srgb, var(--ai-response-link-color, var(--primary)) 70%, transparent))",
} satisfies CSSProperties

const components: Options["components"] = {
  ol: ({ children, className, ...props }) => (
    <ol className={cn("ml-4 list-outside list-decimal", className)} {...props}>
      {children}
    </ol>
  ),
  li: ({ children, className, ...props }) => (
    <li className={cn("py-1", className)} {...props}>
      {children}
    </li>
  ),
  ul: ({ children, className, ...props }) => (
    <ul className={cn("ml-4 list-outside list-decimal", className)} {...props}>
      {children}
    </ul>
  ),
  strong: ({ children, className, ...props }) => (
    <span className={cn("font-semibold", className)} {...props}>
      {children}
    </span>
  ),
  a: ({ children, className, style, ...props }) => (
    <a
      className={cn(
        "font-medium break-words underline underline-offset-2 transition-opacity hover:opacity-80",
        className
      )}
      {...props}
      rel="noreferrer"
      style={{ ...linkStyle, ...style }}
      target="_blank"
    >
      {children}
    </a>
  ),
  h1: ({ children, className, ...props }) => (
    <h1
      className={cn("mt-6 mb-2 text-3xl font-semibold", className)}
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, className, ...props }) => (
    <h2
      className={cn("mt-6 mb-2 text-2xl font-semibold", className)}
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, className, ...props }) => (
    <h3 className={cn("mt-6 mb-2 text-xl font-semibold", className)} {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, className, ...props }) => (
    <h4 className={cn("mt-6 mb-2 text-lg font-semibold", className)} {...props}>
      {children}
    </h4>
  ),
  h5: ({ children, className, ...props }) => (
    <h5
      className={cn("mt-6 mb-2 text-base font-semibold", className)}
      {...props}
    >
      {children}
    </h5>
  ),
  h6: ({ children, className, ...props }) => (
    <h6 className={cn("mt-6 mb-2 text-sm font-semibold", className)} {...props}>
      {children}
    </h6>
  ),
}

export const AIResponse = memo(
  ({ className, options, children, ...props }: AIResponseProps) => (
    <div
      className={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className
      )}
      {...props}
    >
      <ReactMarkdown
        components={components}
        remarkPlugins={[remarkGfm]}
        {...options}
      >
        {children}
      </ReactMarkdown>
    </div>
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
)

AIResponse.displayName = "AIResponse"
