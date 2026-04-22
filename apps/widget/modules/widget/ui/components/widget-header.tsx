import { cn } from "@workspace/ui/lib/utils";

export const WidgetHeader = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <header
      style={{
        background:
          "linear-gradient(to bottom, var(--widget-header-start), var(--widget-header-end))",
      }}
      className={cn(
        "p-4 text-white",
        className,
      )}
    >
      {children}
    </header>
  );
};