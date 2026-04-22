import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { HomeIcon, InboxIcon } from "lucide-react";
import { useAtomValue, useSetAtom } from "jotai";
import { screenAtom, widgetSettingsAtom } from "@/modules/widget/atoms/widget-atoms";
import { mergeWidgetAppearance } from "@workspace/ui/lib/widget-customization";

export const WidgetFooter = () => {
  const screen = useAtomValue(screenAtom);
  const widgetSettings = useAtomValue(widgetSettingsAtom);
  const setScreen = useSetAtom(screenAtom);
  const appearance = mergeWidgetAppearance(widgetSettings?.appearance);

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
          className="h-14 flex-1 rounded-none"
          onClick={() => setScreen("inbox")}
          size="icon"
          variant="ghost"
        >
          <InboxIcon
            className={cn("size-5", screen === "inbox" && "text-primary")}
          />
        </Button>
      </div>

      {appearance.showPoweredBy && (
        <p className="pb-3 text-center text-[11px] text-muted-foreground">
          Powered by Osonflow
        </p>
      )}
    </footer>
  );
};