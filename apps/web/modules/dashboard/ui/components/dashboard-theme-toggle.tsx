"use client"

import * as React from "react"
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@workspace/ui/components/button"
import { SidebarMenuButton } from "@workspace/ui/components/sidebar"

type DashboardThemeToggleProps = {
  sidebar?: boolean
}

export const DashboardThemeToggle = ({
  sidebar = false,
}: DashboardThemeToggleProps) => {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const nextTheme = resolvedTheme === "dark" ? "light" : "dark"
  const label = mounted
    ? nextTheme === "dark"
      ? "Dark mode"
      : "Light mode"
    : "Theme"

  const icon = !mounted ? (
    <MonitorIcon className="size-4" />
  ) : nextTheme === "dark" ? (
    <MoonIcon className="size-4" />
  ) : (
    <SunIcon className="size-4" />
  )

  const handleToggle = () => {
    if (!mounted) return
    setTheme(nextTheme)
  }

  if (sidebar) {
    return (
      <SidebarMenuButton
        type="button"
        tooltip={label}
        onClick={handleToggle}
        className="text-sidebar-foreground"
        aria-label={`Switch to ${label.toLowerCase()}`}
        title={`Switch to ${label.toLowerCase()}`}
      >
        {icon}
        <span>{label}</span>
      </SidebarMenuButton>
    )
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={handleToggle}
      aria-label={`Switch to ${label.toLowerCase()}`}
      title={`Switch to ${label.toLowerCase()}`}
    >
      {icon}
    </Button>
  )
}
