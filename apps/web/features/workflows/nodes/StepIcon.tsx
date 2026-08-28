/**
 * Canvas iconography, shared by the builder chrome and by the compact step
 * rows rendered inside Block nodes.
 */
export type IconName =
  | "agent"
  | "talk"
  | "listen"
  | "logic"
  | "dev"
  | "message"
  | "prompt"
  | "image"
  | "card"
  | "carousel"
  | "buttons"
  | "choice"
  | "capture"
  | "condition"
  | "set"
  | "component"
  | "end"
  | "tool"
  | "function"
  | "api"
  | "javascript"
  | "kb"
  | "call"
  | "custom"
  | "plus"
  | "play"
  | "publish"
  | "library"
  | "navigation"
  | "fit"
  | "close"
  | "chevronRight"
  | "link"
  | "settings"
  | "workflow"
  | "crew"
  | "operator"
  | "lineText"
  | "trash"
  | "palette"
  | "check"
  | "more"
  | "undo"
  | "redo"
  | "zoomIn"
  | "zoomOut"

export const Icon = ({ name, size = 24 }: { name: IconName; size?: number }) => {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  }

  switch (name) {
    case "agent":
      return (
        <svg {...common}>
          <rect x="6" y="5" width="12" height="8" rx="3" />
          <path d="M9 3v2m6-2v2M8 18c1.2-2 2.5-3 4-3s2.8 1 4 3" />
          <path d="M8 21c.6-1.2 1.3-2 2.1-2.4M16 21c-.6-1.2-1.3-2-2.1-2.4" />
          <path d="M10 9h.01M14 9h.01" />
        </svg>
      )
    case "talk":
      return (
        <svg {...common}>
          <path d="M5.5 16.5 4 21l4.2-1.8A8 8 0 1 0 5.5 16.5Z" />
          <path d="M15 6.5c1.5.6 2.5 1.7 3 3.2M11 5.2c1.1 0 2.1.2 3 .7" />
        </svg>
      )
    case "listen":
      return (
        <svg {...common}>
          <path d="M12 3 5 7v7c0 4 3.1 6.2 7 7 3.9-.8 7-3 7-7V7l-7-4Z" />
          <circle cx="12" cy="10" r="2.5" />
          <path d="M8 16c.9-1.7 2.2-2.5 4-2.5s3.1.8 4 2.5" />
        </svg>
      )
    case "logic":
      return (
        <svg {...common}>
          <rect
            x="4"
            y="4"
            width="16"
            height="16"
            rx="4"
            transform="rotate(45 12 12)"
          />
          <path d="m9 12-2 2 2 2M15 8l2 2-2 2M8 14h8" />
        </svg>
      )
    case "dev":
      return (
        <svg {...common}>
          <rect x="5" y="4" width="14" height="16" rx="4" />
          <path d="m10 9-2 3 2 3M14 9l2 3-2 3" />
          <path d="m13 8-2 8" />
        </svg>
      )
    case "message":
      return (
        <svg {...common}>
          <path d="M4 6.5A3.5 3.5 0 0 1 7.5 3h9A3.5 3.5 0 0 1 20 6.5v5A3.5 3.5 0 0 1 16.5 15H10l-4 4v-4.4A3.5 3.5 0 0 1 4 11.5v-5Z" />
          <path d="M8 8h.01M12 8h.01M16 8h.01" />
        </svg>
      )
    case "prompt":
      return (
        <svg {...common}>
          <path d="m12 3 1.3 4.2L17 9l-3.7 1.8L12 15l-1.3-4.2L7 9l3.7-1.8L12 3Z" />
          <path d="m5 13 .7 2.3L8 16l-2.3.7L5 19l-.7-2.3L2 16l2.3-.7L5 13ZM19 13l.6 1.8L21 15.5l-1.4.7L19 18l-.6-1.8-1.4-.7 1.4-.7L19 13Z" />
        </svg>
      )
    case "image":
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <circle cx="9" cy="10" r="1.5" />
          <path d="m7 17 4.2-4.2 2.8 2.8 1.4-1.4L18 17" />
        </svg>
      )
    case "card":
      return (
        <svg {...common}>
          <rect x="5" y="4" width="14" height="16" rx="3" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      )
    case "carousel":
      return (
        <svg {...common}>
          <rect x="9" y="5" width="10" height="14" rx="2" />
          <path d="M5 7v10M2 9v6" />
        </svg>
      )
    case "buttons":
      return (
        <svg {...common}>
          <path d="M7 8a4 4 0 0 1 4-4h2a4 4 0 0 1 1.5 7.7L14 17l-3.4-4.7H11A4 4 0 0 1 7 8Z" />
          <path d="M7 12H5a3 3 0 0 0 0 6h6" />
        </svg>
      )
    case "choice":
      return (
        <svg {...common}>
          <path d="M6 17c5 0 3-10 8-10h3" />
          <path d="m15 4 3 3-3 3M6 7h3M14 17h3M15 14l3 3-3 3" />
        </svg>
      )
    case "capture":
      return (
        <svg {...common}>
          <path d="M4 9V7a3 3 0 0 1 3-3h2M15 4h2a3 3 0 0 1 3 3v2M20 15v2a3 3 0 0 1-3 3h-2M9 20H7a3 3 0 0 1-3-3v-2" />
          <path d="M9 12h.01M12 12h.01M15 12h.01" />
        </svg>
      )
    case "condition":
      return (
        <svg {...common}>
          <rect
            x="5"
            y="5"
            width="14"
            height="14"
            rx="3"
            transform="rotate(45 12 12)"
          />
          <path d="M9 12h6M9 9h6" />
        </svg>
      )
    case "set":
      return (
        <svg {...common}>
          <path d="M8 5H6a2 2 0 0 0-2 2v2M8 19H6a2 2 0 0 1-2-2v-2M16 5h2a2 2 0 0 1 2 2v2M16 19h2a2 2 0 0 0 2-2v-2" />
          <path d="m9 12 2 2 4-5" />
        </svg>
      )
    case "component":
      return (
        <svg {...common}>
          <rect
            x="5"
            y="5"
            width="6"
            height="6"
            rx="1"
            transform="rotate(45 8 8)"
          />
          <rect
            x="13"
            y="5"
            width="6"
            height="6"
            rx="1"
            transform="rotate(45 16 8)"
          />
          <rect
            x="9"
            y="13"
            width="6"
            height="6"
            rx="1"
            transform="rotate(45 12 16)"
          />
        </svg>
      )
    case "end":
      return (
        <svg {...common}>
          <path d="M7 6H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2M12 5v14M17 6h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2" />
        </svg>
      )
    case "tool":
      return (
        <svg {...common}>
          <path d="m13 2-8 12h6l-1 8 8-12h-6l1-8Z" />
        </svg>
      )
    case "function":
      return (
        <svg {...common}>
          <path d="M9 4c-3 1-3 5-1 6-2 1-2 5 1 6M15 4c3 1 3 5 1 6 2 1 2 5-1 6" />
          <path d="M11 12h2" />
        </svg>
      )
    case "api":
      return (
        <svg {...common}>
          <circle cx="12" cy="5" r="2" />
          <circle cx="5" cy="19" r="2" />
          <circle cx="19" cy="19" r="2" />
          <path d="M12 7v4M12 11 6.4 17M12 11l5.6 6" />
        </svg>
      )
    case "javascript":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="5" />
          <path d="M9 9v5a2 2 0 0 1-2 2M13 16c2 0 3-.7 3-2s-1-2-3-2c-1.2 0-2-.5-2-1.5S12 9 14 9" />
        </svg>
      )
    case "kb":
      return (
        <svg {...common}>
          <path d="M12 4a5 5 0 0 0-4 8v3h8v-3a5 5 0 0 0-4-8Z" />
          <path d="M9 19h6M10 15v4M14 15v4M7 9H5M19 9h-2M8 4.5 6.5 3M16 4.5 17.5 3" />
        </svg>
      )
    case "call":
      return (
        <svg {...common}>
          <path d="M7 4h4L9.5 8C10.6 10.5 13.5 13.4 16 14.5L20 13v4c0 1.7-1.4 3-3.1 2.8C9.9 18.9 5.1 14.1 4.2 7.1 4 5.4 5.3 4 7 4Z" />
          <path d="M15 4h5v5M14 10l6-6" />
        </svg>
      )
    case "custom":
      return (
        <svg {...common}>
          <path d="M4 12h4l2-3 4 6 2-3h4M6 6a8 8 0 0 1 12 0M6 18a8 8 0 0 0 12 0" />
        </svg>
      )
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      )
    case "play":
      return (
        <svg {...common}>
          <path d="m8 5 11 7-11 7V5Z" />
        </svg>
      )
    case "publish":
      return (
        <svg {...common}>
          <path d="m13 2-3 9h5l-4 11 10-14h-6l3-6h-5Z" />
          <path d="M4 13h4M4 17h6" />
        </svg>
      )
    case "library":
      return (
        <svg {...common}>
          <path d="M4 5h12a4 4 0 0 1 4 4v10H8a4 4 0 0 1-4-4V5Z" />
          <path d="M8 9h8M8 13h6" />
        </svg>
      )
    case "fit":
      return (
        <svg {...common}>
          <path d="M8 4H4v4M16 4h4v4M20 16v4h-4M4 16v4h4" />
          <path d="m9 9-5-5M15 9l5-5M15 15l5 5M9 15l-5 5" />
        </svg>
      )
    case "navigation":
      return (
        <svg {...common}>
          <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
          <path d="m8 7 4-4 4 4M8 17l4 4 4-4M7 8l-4 4 4 4M17 8l4 4-4 4" />
        </svg>
      )
    case "close":
      return (
        <svg {...common}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      )
    case "chevronRight":
      return (
        <svg {...common}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      )
    case "link":
      return (
        <svg {...common}>
          <path d="M10 13a5 5 0 0 0 7.1 0l1.4-1.4a5 5 0 0 0-7.1-7.1L10.6 5.3" />
          <path d="M14 11a5 5 0 0 0-7.1 0l-1.4 1.4a5 5 0 0 0 7.1 7.1l.8-.8" />
        </svg>
      )
    case "settings":
      return (
        <svg {...common}>
          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 3-.2-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21h-3.4v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.2.1-2-3 .1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H4v-3.4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-3 .2.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3h3.4v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.2-.1 2 3-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2v3.4H20a1.7 1.7 0 0 0-1.5 1Z" />
        </svg>
      )
    case "workflow":
      return (
        <svg {...common}>
          <path d="M6 5h8l4 4-4 4H6l4-4-4-4Z" />
          <path d="M6 19h12M12 13v6" />
        </svg>
      )
    case "crew":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="3" />
          <circle cx="16" cy="8" r="3" />
          <path d="M3.5 19c.8-3 2.3-4.5 4.5-4.5S11.7 16 12.5 19M11.5 19c.8-3 2.3-4.5 4.5-4.5S19.7 16 20.5 19" />
        </svg>
      )
    case "operator":
      return (
        <svg {...common}>
          <path d="M4 12h5l2-7 2 14 2-7h5" />
        </svg>
      )
    case "lineText":
      return (
        <svg {...common}>
          <path d="M4 7h10M4 17h16" />
          <path d="M17 7h4M19 7v8M17 15h4" />
        </svg>
      )
    case "trash":
      return (
        <svg {...common}>
          <path d="M4 7h16M10 11v6M14 11v6" />
          <path d="M6 7l1 14h10l1-14M9 7V4h6v3" />
        </svg>
      )
    case "palette":
      return (
        <svg {...common}>
          <path d="M12 3a9 9 0 0 0 0 18h1.5a2 2 0 0 0 1.4-3.4 1.8 1.8 0 0 1 1.3-3.1H18a3 3 0 0 0 3-3A8.5 8.5 0 0 0 12 3Z" />
          <path d="M7.5 11h.01M9.5 7.5h.01M14 7.5h.01M16.5 11h.01" />
        </svg>
      )
    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      )
    case "undo":
      return (
        <svg {...common}>
          <path d="M3 7v6h6" />
          <path d="M3 13a9 9 0 1 0 3-7.7L3 8" />
        </svg>
      )
    case "redo":
      return (
        <svg {...common}>
          <path d="M21 7v6h-6" />
          <path d="M21 13a9 9 0 1 1-3-7.7L21 8" />
        </svg>
      )
    case "zoomIn":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5M11 8v6M8 11h6" />
        </svg>
      )
    case "zoomOut":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5M8 11h6" />
        </svg>
      )
    case "more":
      return (
        <svg {...common}>
          <path d="M5 12h.01M12 12h.01M19 12h.01" />
        </svg>
      )
  }
}

export default Icon
