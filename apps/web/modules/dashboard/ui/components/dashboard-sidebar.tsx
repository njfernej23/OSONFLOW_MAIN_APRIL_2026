"use client"

import { OrganizationSwitcher, UserButton } from "@clerk/nextjs"

import {
  BotIcon,
  BrainIcon,
  CreditCardIcon,
  InboxIcon,
  LineChartIcon,
  LayoutDashboardIcon,
  LibraryBigIcon,
  PaletteIcon,
} from "lucide-react"

import Image from "next/image"
import Link from "next/link"

import { usePathname } from "next/navigation"
import { useCallback, useEffect } from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@workspace/ui/components/sidebar"

import { cn } from "@workspace/ui/lib/utils"
import { DashboardThemeToggle } from "./dashboard-theme-toggle"
import { useMutation, useQuery } from "convex/react"
import { api } from "@workspace/backend/_generated/api"

const customerSupportItems = [
  {
    title: "Conversations",
    url: "/conversations",
    icon: InboxIcon,
  },
  {
    title: "AI Voicechats",
    url: "/ai-conversations",
    icon: BotIcon,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: LineChartIcon,
  },
  {
    title: "Customer Memory",
    url: "/customer-memory",
    icon: BrainIcon,
  },

  {
    title: "Knowledge Base",
    url: "/files",
    icon: LibraryBigIcon,
  },
]
const configurationItems = [
  {
    title: "Widget Customization",
    url: "/customization",
    icon: PaletteIcon,
  },
  {
    title: "Integrations",
    url: "/integrations",
    icon: LayoutDashboardIcon,
  },
  {
    title: "Vapi Voice",
    url: "/plugins/vapi",
    icon: null, // Will use custom image
    customIcon: "/vapi.jpg",
  },
]

const accountsItem = [
  {
    title: "Plans & Billing",
    url: "/billing",
    icon: CreditCardIcon,
  },
]

export const DashboardSidebar = () => {
  const pathname = usePathname()
  const conversationUnreadSummary = useQuery(
    api.private.conversations.getUnreadSummary
  )
  const aiVoicechatUnreadSummary = useQuery(
    api.private.aiConversations.getUnreadSummary
  )
  const markAllConversationsAsRead = useMutation(
    api.private.conversations.markAllAsRead
  )
  const markAllAiVoicechatsAsRead = useMutation(
    api.private.aiConversations.markAllAsRead
  )
  const conversationUnreadCount =
    conversationUnreadSummary?.unreadConversationCount ?? 0
  const aiVoicechatUnreadCount =
    aiVoicechatUnreadSummary?.unreadConversationCount ?? 0

  const isActive = (url: string) => {
    if (url === "/") {
      return pathname === "/"
    }
    return pathname.startsWith(url)
  }

  const getUnreadCount = (url: string) => {
    if (isActive(url)) {
      return 0
    }

    if (url === "/conversations") {
      return conversationUnreadCount
    }

    if (url === "/ai-conversations") {
      return aiVoicechatUnreadCount
    }

    return 0
  }

  const clearUnreadForUrl = useCallback(
    (url: string) => {
      if (url === "/conversations" && conversationUnreadCount > 0) {
        void markAllConversationsAsRead({})
        return
      }

      if (url === "/ai-conversations" && aiVoicechatUnreadCount > 0) {
        void markAllAiVoicechatsAsRead({})
      }
    },
    [
      aiVoicechatUnreadCount,
      conversationUnreadCount,
      markAllAiVoicechatsAsRead,
      markAllConversationsAsRead,
    ]
  )

  useEffect(() => {
    if (pathname.startsWith("/conversations")) {
      clearUnreadForUrl("/conversations")
      return
    }

    if (pathname.startsWith("/ai-conversations")) {
      clearUnreadForUrl("/ai-conversations")
    }
  }, [clearUnreadForUrl, pathname])

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <OrganizationSwitcher
                hidePersonal
                skipInvitationScreen
                appearance={{
                  elements: {
                    rootBox: "w-full! h-8!",
                    avatarBox: "size-4! rounded-sm!",
                    organizationSwitcherTrigger:
                      "w-full! justify-start! group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2!",
                    organizationPreview:
                      "group-data-[collapsible=icon]:justify-center! gap-2!",
                    organizationPreviewTextContainer:
                      "group-data-[collapsible=icon]:hidden! text-xs! font-medium! text-sidebar-foreground!",
                    organizationSwitcherTriggerIcon:
                      "group-data-[collapsible=icon]:hidden! ml-auto! text-sidebar-foreground!",
                  },
                }}
              />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Customer Support */}
        <SidebarGroup>
          <SidebarGroupLabel>Customer Support</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {customerSupportItems.map((item) => (
                <SidebarMenuItem className="relative" key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isActive(item.url)}
                    className={cn(
                      isActive(item.url) &&
                        "bg-sidebar-primary! text-sidebar-primary-foreground!"
                    )}
                  >
                    <Link
                      href={item.url}
                      onClick={() => clearUnreadForUrl(item.url)}
                    >
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {getUnreadCount(item.url) > 0 ? (
                    <SidebarMenuBadge className="bg-rose-500 text-white peer-data-active/menu-button:bg-white/20 peer-data-active/menu-button:text-sidebar-primary-foreground">
                      {getUnreadCount(item.url) > 99
                        ? "99+"
                        : getUnreadCount(item.url)}
                    </SidebarMenuBadge>
                  ) : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Configuration */}
        <SidebarGroup>
          <SidebarGroupLabel>Configuration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {configurationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isActive(item.url)}
                    className={cn(
                      isActive(item.url) &&
                        "bg-sidebar-primary! text-sidebar-primary-foreground!"
                    )}
                  >
                    <Link href={item.url}>
                      {item.customIcon ? (
                        <Image
                          src={item.customIcon}
                          alt={item.title}
                          width={16}
                          height={16}
                          className="size-4 rounded-sm object-cover"
                        />
                      ) : item.icon ? (
                        <item.icon className="size-4" />
                      ) : null}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Billing */}
        <SidebarGroup>
          <SidebarGroupLabel>Billing</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountsItem.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isActive(item.url)}
                    className={cn(
                      isActive(item.url) &&
                        "bg-sidebar-primary! text-sidebar-primary-foreground!"
                    )}
                  >
                    <Link href={item.url}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DashboardThemeToggle sidebar />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <UserButton
              showName
              appearance={{
                elements: {
                  rootBox: "w-full! h-8!",
                  userButtonTrigger:
                    "w-full! p-2! hover:bg-sidebar-accent! hover:text-sidebar-accent-foreground! group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2!",
                  userButtonBox:
                    "w-full! flex-row-reverse! justify-end! gap-2! group-data-[collapsible=icon]:justify-center! text-sidebar-foreground!",
                  userButtonOuterIdentifier:
                    "pl-0! group-data-[collapsible=icon]:hidden!",
                  avatarBox: "size-4!",
                },
              }}
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
