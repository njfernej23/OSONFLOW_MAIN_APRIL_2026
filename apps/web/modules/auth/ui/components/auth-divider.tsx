export const AuthDivider = ({ label = "or continue with email" }: { label?: string }) => {
  return (
    <div className="relative flex items-center py-1">
      <div className="h-px flex-1 bg-border/80" />
      <span className="px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <div className="h-px flex-1 bg-border/80" />
    </div>
  )
}
