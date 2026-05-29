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

const WidgetHomeIcon = ({
  active,
  ...props
}: SVGProps<SVGSVGElement> & { active: boolean }) => (
  <svg
    aria-hidden="true"
    fill="none"
    focusable="false"
    viewBox="0 0 48 48"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    {active ? (
      <path
        clipRule="evenodd"
        d="M20.5682 2.81246c2.1784 -0.99734 4.6852 -0.99734 6.8636 0 7.7657 3.5554 13.5513 8.64154 16.3373 11.38514 1.5022 1.4793 2.3049 3.4519 2.4175 5.4865 0.1388 2.5072 0.3134 6.5725 0.3134 11.1586 0 3.2363 -0.087 6.2126 -0.1868 8.5643 -0.1601 3.7688 -3.1695 6.7252 -6.9275 6.8541 -3.4773 0.1192 -8.6464 0.2389 -15.3857 0.2389s-11.9084 -0.1197 -15.38569 -0.2389c-3.75796 -0.1289 -6.76743 -3.0853 -6.92748 -6.8541C1.58696 37.0553 1.5 34.079 1.5 30.8427c0 -4.5861 0.17463 -8.6514 0.31339 -11.1586 0.1126 -2.0346 0.91528 -4.0072 2.41753 -5.4865C7.01693 11.454 12.8025 6.36786 20.5682 2.81246ZM16 36c-1.1046 0 -2 0.8954 -2 2s0.8954 2 2 2h16c1.1046 0 2 -0.8954 2 -2s-0.8954 -2 -2 -2H16Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    ) : (
      <>
        <path
          d="M26.8148 4.15979c7.2347 3.21132 12.7189 7.42931 15.5541 9.86701 1.4328 1.232 2.2317 3.0051 2.3306 4.8921C44.8354 21.5103 45 25.5652 45 30c0 3.4116 -0.0974 6.7062 -0.2042 9.293 -0.1239 3.0011 -2.5102 5.3682 -5.5121 5.4707 -3.4603 0.1181 -8.5948 0.2363 -15.2836 0.2363 -6.6889 0 -11.8234 -0.1182 -15.28377 -0.2363 -3.00187 -0.1025 -5.38809 -2.4695 -5.51204 -5.4706C3.09745 36.7063 3 33.4116 3 30c0 -4.4348 0.16468 -8.4898 0.30058 -11.0812 0.09897 -1.887 0.89784 -3.66 2.33063 -4.8919 2.83511 -2.4377 8.31939 -6.65576 15.55409 -9.86711 1.7913 -0.79509 3.8383 -0.79509 5.6295 0Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
        <path
          d="m16 38 16 0"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
      </>
    )}
  </svg>
)

const WidgetMessagesIcon = ({
  active,
  ...props
}: SVGProps<SVGSVGElement> & { active: boolean }) => (
  <svg
    aria-hidden="true"
    fill="none"
    focusable="false"
    viewBox="0 0 48 48"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    {active ? (
      <path
        clipRule="evenodd"
        d="M8.1434 1.96626C11.4083 1.73864 16.5967 1.5 24 1.5s12.5917 0.23864 15.8566 0.46626c3.2657 0.22767 5.8619 2.6924 6.152 5.99264 0.2492 2.8354 0.4914 7.1152 0.4914 13.0411s-0.2422 10.2057 -0.4914 13.0411c-0.2901 3.3002 -2.8863 5.765 -6.152 5.9926 -3.1326 0.2184 -8.0358 0.447 -14.967 0.4651l-7.2626 6.2251c-1.6217 1.39 -4.127 0.2378 -4.127 -1.8981v-4.5101c-2.1631 -0.0825 -3.94068 -0.1832 -5.3566 -0.282 -3.26575 -0.2276 -5.86192 -2.6924 -6.152 -5.9926C1.74218 31.2057 1.5 26.9259 1.5 21s0.24218 -10.2057 0.4914 -13.0411c0.29008 -3.30024 2.88625 -5.76497 6.152 -5.99264ZM35.4686 14.4123c0.019 0.3031 0.0314 0.6635 0.0314 1.0877 0 0.4274 -0.0126 0.7895 -0.0318 1.0933 -0.0657 1.0402 -0.891 1.7281 -1.8707 1.7724 -1.3662 0.0616 -4.134 0.1343 -9.5975 0.1343 -5.445 0 -8.2121 -0.0694 -9.5828 -0.1286 -0.987 -0.0425 -1.8203 -0.7356 -1.8858 -1.7837 -0.019 -0.3031 -0.0314 -0.6635 -0.0314 -1.0877 0 -0.4242 0.0124 -0.7846 0.0314 -1.0877 0.0655 -1.0481 0.8988 -1.7412 1.8858 -1.7837C15.7879 12.5694 18.5551 12.5 24 12.5c5.445 0 8.2121 0.0694 9.5828 0.1286 0.987 0.0425 1.8203 0.7356 1.8858 1.7837Zm-7.9867 11.0526c0.011 0.2905 0.0181 0.6336 0.0181 1.0351 0 0.4058 -0.0073 0.7516 -0.0185 1.0433 -0.0398 1.0367 -0.8141 1.7964 -1.837 1.8515 -0.993 0.0535 -2.7105 0.1052 -5.6445 0.1052 -2.9174 0 -4.6316 -0.0492 -5.6267 -0.1003 -1.0313 -0.053 -1.8156 -0.8182 -1.8552 -1.8646 -0.011 -0.2905 -0.0181 -0.6336 -0.0181 -1.0351 0 -0.4015 0.0071 -0.7446 0.0181 -1.0351 0.0396 -1.0464 0.8239 -1.8116 1.8552 -1.8646 0.9951 -0.0511 2.7093 -0.1003 5.6267 -0.1003 2.9174 0 4.6316 0.0492 5.6267 0.1003 1.0313 0.053 1.8156 0.8182 1.8552 1.8646Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    ) : (
      <>
        <path
          d="M8.248 38.537c-2.55 -0.177 -4.539 -2.081 -4.762 -4.627C3.24 31.12 3 26.885 3 21s0.24 -10.121 0.486 -12.91c0.223 -2.546 2.212 -4.45 4.762 -4.627C11.475 3.238 16.628 3 24 3c7.371 0 12.525 0.238 15.752 0.463 2.55 0.177 4.539 2.081 4.762 4.627C44.76 10.88 45 15.115 45 21s-0.24 10.121 -0.486 12.91c-0.223 2.546 -2.212 4.45 -4.762 4.627 -3.003 0.21 -7.674 0.43 -14.248 0.46l-7.202 6.173C17.004 46.282 15 45.36 15 43.652v-4.785a178.95 178.95 0 0 1 -6.752 -0.33Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="3"
        />
        <path
          d="M32.898 12.123c1.165 0.048 2.052 0.862 2.09 2.028a26.646 26.646 0 0 1 -0.001 1.71c-0.038 1.155 -0.914 1.96 -2.068 2.01 -1.525 0.065 -4.223 0.129 -8.919 0.129 -4.674 0 -7.369 -0.061 -8.898 -0.123 -1.165 -0.048 -2.052 -0.862 -2.09 -2.028a26.646 26.646 0 0 1 0 -1.698c0.038 -1.166 0.925 -1.98 2.09 -2.028C16.632 12.061 19.326 12 24 12c4.674 0 7.369 0.061 8.898 0.123Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="3"
        />
        <path
          d="M24.99 24.087c1.156 0.053 1.978 0.896 2.002 2.055a41.565 41.565 0 0 1 0 1.733c-0.025 1.145 -0.833 1.978 -1.976 2.033 -1.032 0.05 -2.613 0.092 -5.016 0.092 -2.383 0 -3.957 -0.04 -4.99 -0.087 -1.156 -0.053 -1.978 -0.896 -2.002 -2.055a41.565 41.565 0 0 1 0 -1.716c0.024 -1.159 0.846 -2.002 2.003 -2.055C16.043 24.039 17.618 24 20 24c2.383 0 3.957 0.04 4.99 0.087Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="3"
        />
      </>
    )}
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
    <footer className="relative shrink-0 bg-background/98 backdrop-blur">
      <div className="absolute inset-x-0 -top-[3px] h-px bg-border" />
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
