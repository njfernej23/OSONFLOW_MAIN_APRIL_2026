import { AuthGuard } from "@/modules/auth/ui/components/auth-guard"
import { OrganizationGuard } from "@/modules/auth/ui/components/organization-guard"
import {
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"
import { cookies } from "next/headers"
import { DashboardSidebar } from "../components/dashboard-sidebar"
import { DashboardSwipeMenu } from "../components/dashboard-swipe-menu"
import { DashboardThemeToggle } from "../components/dashboard-theme-toggle"
import { Provider } from "jotai"

export const DashboardLayout = async ({
  children,
}: {
  children: React.ReactNode
}) => {
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true"

  return (
    <AuthGuard>
      <OrganizationGuard>
        <Provider>
          <SidebarProvider defaultOpen={defaultOpen}>
            <DashboardSidebar />
            <DashboardSwipeMenu />
            {/* main must be flex-col + h-svh so resizable panels inside get a real height */}
            <main className="flex h-svh flex-1 flex-col overflow-hidden bg-muted transition-colors">
              <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 border-b border-sidebar-border bg-sidebar/95 px-3 text-sidebar-foreground backdrop-blur-sm transition-colors md:hidden">
                <SidebarTrigger className="shrink-0" />
                <div className="h-4 w-px bg-sidebar-border" />
                <span className="truncate text-sm font-medium">Dashboard</span>
                <div className="ml-auto">
                  <DashboardThemeToggle />
                </div>
              </header>
              {/* children scroll independently; conversations layout handles its own overflow */}
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {children}
              </div>
            </main>
          </SidebarProvider>
        </Provider>
      </OrganizationGuard>
    </AuthGuard>
  )
}
