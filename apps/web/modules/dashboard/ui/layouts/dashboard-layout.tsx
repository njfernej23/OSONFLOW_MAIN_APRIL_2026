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
            <main className="relative flex h-svh flex-1 flex-col overflow-hidden bg-transparent transition-colors">
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="animate-ambient absolute top-0 right-[-6rem] h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
                <div className="animate-float absolute bottom-[-8rem] left-[-6rem] h-80 w-80 rounded-full bg-sky-400/10 blur-3xl" />
              </div>
              <header className="surface-frosted sticky top-0 z-20 mx-2 mt-2 flex h-[3.25rem] shrink-0 items-center gap-2 rounded-2xl px-3 text-sidebar-foreground transition-colors md:hidden">
                <SidebarTrigger className="shrink-0" />
                <div className="h-4 w-px bg-sidebar-border/70" />
                <span className="truncate text-sm font-medium">Dashboard</span>
                <div className="ml-auto">
                  <DashboardThemeToggle />
                </div>
              </header>
              {/* children scroll independently; conversations layout handles its own overflow */}
              <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                {children}
              </div>
            </main>
          </SidebarProvider>
        </Provider>
      </OrganizationGuard>
    </AuthGuard>
  )
}
