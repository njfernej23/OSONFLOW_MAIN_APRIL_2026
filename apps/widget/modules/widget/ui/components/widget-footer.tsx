import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { HomeIcon, InboxIcon } from "lucide-react"
import { useAtomValue, useSetAtom } from "jotai"
import {
  contactSessionIdAtomFamily,
  organizationIdAtom,
  screenAtom,
  widgetSettingsAtom,
} from "@/modules/widget/atoms/widget-atoms"
import { mergeWidgetAppearance } from "@workspace/ui/lib/widget-customization"
import { useQuery } from "convex/react"
import { api } from "@workspace/backend/_generated/api"

export const WidgetFooter = () => {
  const screen = useAtomValue(screenAtom)
  const organizationId = useAtomValue(organizationIdAtom)
  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(organizationId || "")
  )
  const widgetSettings = useAtomValue(widgetSettingsAtom)
  const setScreen = useSetAtom(screenAtom)
  const appearance = mergeWidgetAppearance(widgetSettings?.appearance)
  const unreadSummary = useQuery(
    api.public.conversations.getUnreadSummary,
    contactSessionId ? { contactSessionId } : "skip"
  )
  const unreadConversationCount = unreadSummary?.unreadConversationCount ?? 0

  return (
    <footer className="border-t bg-background">
      <div className="flex items-center justify-between">
        <Button
          className="h-14 flex-1 rounded-none"
          onClick={() => setScreen("selection")}
          size="icon"
          variant="ghost"
        >
          <HomeIcon
            className={cn("size-5", screen === "selection" && "text-primary")}
          />
        </Button>

        <Button
          className="relative h-14 flex-1 rounded-none"
          onClick={() => setScreen("inbox")}
          size="icon"
          variant="ghost"
        >
          <InboxIcon
            className={cn("size-5", screen === "inbox" && "text-primary")}
          />
          {unreadConversationCount > 0 ? (
            <span className="absolute top-3 right-[calc(50%-18px)] inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-semibold text-white">
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
