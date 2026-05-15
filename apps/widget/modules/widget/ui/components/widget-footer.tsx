import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { useAtomValue, useSetAtom } from "jotai"
import type { SVGProps } from "react"
import {
  contactSessionIdAtomFamily,
  organizationIdAtom,
  screenAtom,
  widgetSettingsAtom,
} from "@/modules/widget/atoms/widget-atoms"
import { mergeWidgetAppearance } from "@workspace/ui/lib/widget-customization"
import { useQuery } from "convex/react"
import { api } from "@workspace/backend/_generated/api"
import { useHelpTopics } from "../../hooks/use-help-articles"

const homeIconPaths = {
  active:
    "M6 21q-1.25 0-2.125-.875T3 18v-6q0-.6.225-1.15t.65-.975l6-6q.425-.45.988-.663T12 3t1.125.213t1 .662l.75.75L7 12.5V17h10v-4.5l-3.6-3.6l2.875-2.85l3.85 3.825q.425.425.65.975T21 12v6q0 1.25-.875 2.125T18 21z",
  inactive:
    "M6 21q-1.25 0-2.125-.875T3 18v-6q0-.6.225-1.15t.65-.975l6-6q.425-.45.988-.663T12 3t1.125.213t1 .662l6 6q.425.425.65.975T21 12v6q0 1.25-.875 2.125T18 21zm0-2h12q.425 0 .713-.288T19 18v-6q0-.2-.075-.375T18.7 11.3l-3.825-3.85L13.4 8.9l3.6 3.6V17H7v-4.5l6.45-6.45l-.75-.75q-.2-.2-.387-.25T12 5t-.312.05t-.388.25l-6 6q-.15.15-.225.325T5 12v6q0 .425.288.713T6 19m3-4h6v-1.675l-3-3l-3 3z",
} as const

const WidgetHomeIcon = ({
  active,
  ...props
}: SVGProps<SVGSVGElement> & { active: boolean }) => (
  <svg
    aria-hidden="true"
    fill="currentColor"
    focusable="false"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d={active ? homeIconPaths.active : homeIconPaths.inactive} />
  </svg>
)

const messagesIconPaths = {
  active:
    "M10.5 13q.425 0 .713-.288T11.5 12t-.288-.712T10.5 11t-.712.288T9.5 12t.288.713t.712.287m-3 0q.425 0 .713-.288T8.5 12t-.288-.712T7.5 11t-.712.288T6.5 12t.288.713T7.5 13m6 0q.425 0 .713-.288T14.5 12t-.288-.712T13.5 11t-.712.288T12.5 12t.288.713t.712.287m3 0q.425 0 .713-.288T17.5 12t-.288-.712T16.5 11t-.712.288T15.5 12t.288.713t.712.287M7 19H5q-1.65 0-2.825-1.175T1 15V9q0-1.65 1.175-2.825T5 5h14q1.65 0 2.825 1.175T23 9v6q0 1.65-1.175 2.825T19 19h-2q0 .425-.288.713T16 20H8q-.425 0-.712-.288T7 19",
  inactive:
    "M10.5 13q.425 0 .713-.288T11.5 12t-.288-.712T10.5 11t-.712.288T9.5 12t.288.713t.712.287m-3 0q.425 0 .713-.288T8.5 12t-.288-.712T7.5 11t-.712.288T6.5 12t.288.713T7.5 13m6 0q.425 0 .713-.288T14.5 12t-.288-.712T13.5 11t-.712.288T12.5 12t.288.713t.712.287m3 0q.425 0 .713-.288T17.5 12t-.288-.712T16.5 11t-.712.288T15.5 12t.288.713t.712.287M5 17h14q.825 0 1.413-.587T21 15V9q0-.825-.587-1.412T19 7H5q-.825 0-1.412.588T3 9v6q0 .825.588 1.413T5 17m2 2H5q-1.65 0-2.825-1.175T1 15V9q0-1.65 1.175-2.825T5 5h14q1.65 0 2.825 1.175T23 9v6q0 1.65-1.175 2.825T19 19h-2q0 .425-.288.713T16 20H8q-.425 0-.712-.288T7 19m5-7",
} as const

const WidgetMessagesIcon = ({
  active,
  ...props
}: SVGProps<SVGSVGElement> & { active: boolean }) => (
  <svg
    aria-hidden="true"
    fill="currentColor"
    focusable="false"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d={active ? messagesIconPaths.active : messagesIconPaths.inactive} />
  </svg>
)

const helpIconPaths = {
  active:
    "M11.95 18q.525 0 .888-.363t.362-.887t-.362-.888t-.888-.362t-.887.363t-.363.887t.363.888t.887.362m.05 4q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22m.1-14.3q.625 0 1.088.4t.462 1q0 .55-.337.975t-.763.8q-.575.5-1.012 1.1t-.438 1.35q0 .35.263.588t.612.237q.375 0 .638-.25t.337-.625q.1-.525.45-.937t.75-.788q.575-.55.988-1.2t.412-1.45q0-1.275-1.037-2.087T12.1 6q-.95 0-1.812.4T8.975 7.625q-.175.3-.112.638t.337.512q.35.2.725.125t.625-.425q.275-.375.688-.575t.862-.2",
  inactive:
    "M11.95 18q.525 0 .888-.363t.362-.887t-.362-.888t-.888-.362t-.887.363t-.363.887t.363.888t.887.362m.05 4q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22m0-2q3.35 0 5.675-2.325T20 12t-2.325-5.675T12 4T6.325 6.325T4 12t2.325 5.675T12 20m.1-12.3q.625 0 1.088.4t.462 1q0 .55-.337.975t-.763.8q-.575.5-1.012 1.1t-.438 1.35q0 .35.263.588t.612.237q.375 0 .638-.25t.337-.625q.1-.525.45-.937t.75-.788q.575-.55.988-1.2t.412-1.45q0-1.275-1.037-2.087T12.1 6q-.95 0-1.812.4T8.975 7.625q-.175.3-.112.638t.337.512q.35.2.725.125t.625-.425q.275-.375.688-.575t.862-.2",
} as const

const WidgetHelpIcon = ({
  active,
  ...props
}: SVGProps<SVGSVGElement> & { active: boolean }) => (
  <svg
    aria-hidden="true"
    fill="currentColor"
    focusable="false"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d={active ? helpIconPaths.active : helpIconPaths.inactive} />
  </svg>
)

const footerTabButtonClassName =
  "h-16 flex-1 rounded-none text-muted-foreground transition-none hover:translate-y-0 hover:bg-transparent hover:text-muted-foreground active:translate-y-0"

const footerTabContentClassName =
  "flex min-w-24 flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 transition-colors group-hover/button:text-foreground"

export const WidgetFooter = () => {
  const screen = useAtomValue(screenAtom)
  const organizationId = useAtomValue(organizationIdAtom)
  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(organizationId || "")
  )
  const widgetSettings = useAtomValue(widgetSettingsAtom)
  const setScreen = useSetAtom(screenAtom)
  const appearance = mergeWidgetAppearance(widgetSettings?.appearance)
  const helpTopics = useHelpTopics()
  const hasHelpContent = helpTopics.length > 0
  const isHomeActive = screen === "selection"
  const isMessagesActive = screen === "inbox"
  const isHelpActive =
    screen === "help" || screen === "topic" || screen === "article"
  const unreadSummary = useQuery(
    api.public.conversations.getUnreadSummary,
    contactSessionId ? { contactSessionId } : "skip"
  )
  const unreadConversationCount = unreadSummary?.unreadConversationCount ?? 0

  return (
    <footer className="shrink-0 border-t bg-background/98 backdrop-blur">
      <div className="flex items-stretch justify-between">
        <Button
          className={footerTabButtonClassName}
          onClick={() => setScreen("selection")}
          size="icon"
          variant="ghost"
        >
          <span className={footerTabContentClassName}>
            <WidgetHomeIcon
              active={isHomeActive}
              className={cn("size-6", isHomeActive && "text-primary")}
            />
            <span
              className={cn(
                "text-[13px] font-medium",
                isHomeActive && "font-bold text-foreground"
              )}
            >
              Home
            </span>
          </span>
        </Button>

        {hasHelpContent ? (
          <Button
            className={footerTabButtonClassName}
            onClick={() => setScreen("help")}
            size="icon"
            variant="ghost"
          >
            <span className={footerTabContentClassName}>
              <WidgetHelpIcon
                active={isHelpActive}
                className={cn("size-6", isHelpActive && "text-primary")}
              />
              <span
                className={cn(
                  "text-[13px] font-medium",
                  isHelpActive && "font-bold text-foreground"
                )}
              >
                Help
              </span>
            </span>
          </Button>
        ) : null}

        <Button
          className={cn("relative", footerTabButtonClassName)}
          onClick={() => setScreen("inbox")}
          size="icon"
          variant="ghost"
        >
          <span className={footerTabContentClassName}>
            <WidgetMessagesIcon
              active={isMessagesActive}
              className={cn("size-6", isMessagesActive && "text-primary")}
            />
            <span
              className={cn(
                "text-[13px] font-medium",
                isMessagesActive && "font-bold text-foreground"
              )}
            >
              Messages
            </span>
          </span>
          {unreadConversationCount > 0 ? (
            <span className="absolute top-3 right-[calc(50%-22px)] inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-semibold text-white">
              {unreadConversationCount > 9 ? "9+" : unreadConversationCount}
            </span>
          ) : null}
        </Button>
      </div>

      {appearance.showPoweredBy && (
        <p className="pb-3 text-center text-[11px] text-muted-foreground">
          Powered by {appearance.poweredByText}
        </p>
      )}
    </footer>
  )
}
