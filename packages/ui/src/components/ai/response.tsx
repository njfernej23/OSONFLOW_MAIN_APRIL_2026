"use client"

import type { CSSProperties, HTMLAttributes, ReactNode } from "react"
import { isValidElement, memo } from "react"
import ReactMarkdown, { type Options } from "react-markdown"
import remarkGfmImport from "remark-gfm"
import { cn } from "@workspace/ui/lib/utils"
import {
  parseRichMessage,
  RichMessage,
  type RichMessageActions,
} from "@workspace/ui/components/ai/rich-message"

const remarkGfm =
  typeof remarkGfmImport === "function"
    ? remarkGfmImport
    : (remarkGfmImport as { default?: typeof remarkGfmImport }).default

export type AIResponseProps = HTMLAttributes<HTMLDivElement> & {
  options?: Options
  children: Options["children"]
  /** Given, Card and Carousel buttons in this message become clickable. */
  richActions?: RichMessageActions
}

const linkStyle = {
  color: "var(--ai-response-link-color, var(--primary))",
  textDecorationColor:
    "var(--ai-response-link-decoration-color, color-mix(in srgb, var(--ai-response-link-color, var(--primary)) 70%, transparent))",
} satisfies CSSProperties

/** Flattens a code element's children back into its raw source text. */
const codeText = (children: ReactNode): string => {
  if (typeof children === "string") {
    return children
  }

  if (Array.isArray(children)) {
    return children.map(codeText).join("")
  }

  return ""
}

const buildComponents = (
  richActions?: RichMessageActions
): Options["components"] => ({
  // Workflow Card and Carousel steps arrive as fenced osonflow-* blocks. They
  // render as real cards; anything else stays an ordinary code block.
  pre: ({ children, className, ...props }) => {
    const child = Array.isArray(children) ? children[0] : children
    const childProps = isValidElement<{
      className?: string
      children?: ReactNode
    }>(child)
      ? child.props
      : null
    const payload = parseRichMessage(
      childProps?.className,
      codeText(childProps?.children)
    )

    if (payload) {
      return <RichMessage actions={richActions} payload={payload} />
    }

    return (
      <pre className={className} {...props}>
        {children}
      </pre>
    )
  },
  // Fixed height and cropped, so consecutive images in a thread line up
  // instead of each taking the height of its own source.
  img: ({ className, alt, ...props }) => (
    <img
      alt={alt ?? ""}
      className={cn(
        "my-1 block h-[132px] w-full max-w-[260px] rounded-xl border bg-black/5 object-cover",
        className
      )}
      loading="lazy"
      {...props}
    />
  ),
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
})

const staticComponents = buildComponents()

export const AIResponse = memo(
  ({
    className,
    options,
    children,
    richActions,
    ...props
  }: AIResponseProps) => (
    <div
      className={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className
      )}
      {...props}
    >
      <ReactMarkdown
        components={
          richActions ? buildComponents(richActions) : staticComponents
        }
        remarkPlugins={remarkGfm ? [remarkGfm] : undefined}
        {...options}
      >
        {children}
      </ReactMarkdown>
    </div>
  ),
  // Card buttons live inside the markdown, so a changed handler or a
  // disabled flag has to re-render alongside the text.
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.richActions?.onButtonClick ===
      nextProps.richActions?.onButtonClick &&
    prevProps.richActions?.disabled === nextProps.richActions?.disabled
)

AIResponse.displayName = "AIResponse"
