"use client"

import { getCountryFlagUrl, getCountryFromTimezone } from "@/lib/country-utils"
import { api } from "@workspace/backend/_generated/api"
import { Id } from "@workspace/backend/_generated/dataModel"
import { Button } from "@workspace/ui/components/button"
import { DicebearAvatar } from "@workspace/ui/components/dicebear-avatar"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { useAction, useQuery } from "convex/react"
import { useParams } from "next/navigation"
import { useMemo, useState } from "react"
import Bowser from "bowser"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion"
import Link from "next/link"
import {
  BrainIcon,
  ClockIcon,
  GlobeIcon,
  MailIcon,
  MonitorIcon,
  RefreshCwIcon,
} from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"
import { toast } from "sonner"

type InfoItem = {
  label: string
  value: string | React.ReactNode
  className?: string
}

type InfoSection = {
  id: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  items: InfoItem[]
}

export const ContactPanel = () => {
  const params = useParams()
  const conversationId = params.conversationId as Id<"conversations"> | null

  const contactSession = useQuery(
    api.private.contactSessions.getOneByConversationId,
    conversationId ? { conversationId } : "skip"
  )
  const refreshInstagramProfile = useAction(
    (api as any).private.instagram.refreshContactProfile
  ) as (args: { conversationId: Id<"conversations"> }) => Promise<{
    username?: string
    fullName?: string
    profilePicUrl?: string
    followerCount?: number
  }>
  const customerMemory = useQuery(
    api.private.customerMemories.getByEmail,
    contactSession?.email ? { email: contactSession.email } : "skip"
  )
  const [isRefreshingInstagramProfile, setIsRefreshingInstagramProfile] =
    useState(false)

  const parseUserAgent = useMemo(() => {
    return (userAgent?: string) => {
      if (!userAgent) {
        return { browser: "Unknown", os: "Unknown", device: "Unknown" }
      }

      const browser = Bowser.getParser(userAgent)
      const result = browser.getResult()

      return {
        browser: result.browser.name || "Unknown",
        browserVersion: result.browser.version || "",
        os: result.os.name || "Unknown",
        osVersion: result.os.version || "",
        device: result.platform.type || "desktop",
        deviceVendor: result.platform.vendor || "",
        deviceModel: result.platform.model || "",
      }
    }
  }, [])

  const userAgentInfo = useMemo(
    () => parseUserAgent(contactSession?.metadata?.userAgent),
    [contactSession?.metadata?.userAgent, parseUserAgent]
  )

  const countryInfo = useMemo(() => {
    return getCountryFromTimezone(contactSession?.metadata?.timezone)
  }, [contactSession?.metadata?.timezone])
  const instagramProfilePic = contactSession?.metadata?.instagramProfilePic
  const instagramUsername = contactSession?.metadata?.instagramUsername
  const instagramFullName = contactSession?.metadata?.instagramFullName
  const isInstagramSession = contactSession?.metadata?.platform === "Instagram"
  const isWhatsappSession = contactSession?.metadata?.platform === "WhatsApp"
  const secondaryIdentity =
    isInstagramSession && instagramUsername
      ? `@${instagramUsername}`
      : isWhatsappSession && contactSession?.metadata?.whatsappPhoneNumber
        ? contactSession.metadata.whatsappPhoneNumber
      : (contactSession?.email ?? "")
  const handleRefreshInstagramProfile = async () => {
    if (!conversationId) {
      return
    }

    setIsRefreshingInstagramProfile(true)
    try {
      const profile = await refreshInstagramProfile({ conversationId })
      const label = profile.fullName || profile.username || "Instagram profile"
      toast.success(`Updated ${label}`)
    } catch (error: any) {
      toast.error(
        error?.data?.message ||
          error?.message ||
          "Failed to refresh Instagram profile"
      )
    } finally {
      setIsRefreshingInstagramProfile(false)
    }
  }

  const accordionSections = useMemo<InfoSection[]>(() => {
    if (!contactSession?.metadata) {
      return []
    }

    const isExternalChannel =
      contactSession.metadata.platform === "Telegram" ||
      contactSession.metadata.platform === "Instagram" ||
      contactSession.metadata.platform === "WhatsApp"
    const isTelegramSession = contactSession.metadata.platform === "Telegram"
    const isInstagramSession = contactSession.metadata.platform === "Instagram"
    const isWhatsappSession = contactSession.metadata.platform === "WhatsApp"

    return [
      {
        id: "device-info",
        icon: MonitorIcon,
        title: "Device",
        items: isExternalChannel
          ? [
              {
                label: "Platform",
                value: contactSession.metadata.platform || "External",
              },
              {
                label: "Vendor",
                value: contactSession.metadata.vendor || "Unknown",
              },
            ]
          : [
              {
                label: "Browser",
                value:
                  userAgentInfo.browser +
                  (userAgentInfo.browserVersion
                    ? ` ${userAgentInfo.browserVersion}`
                    : ""),
              },
              {
                label: "OS",
                value:
                  userAgentInfo.os +
                  (userAgentInfo.osVersion
                    ? ` ${userAgentInfo.osVersion}`
                    : ""),
              },
            ],
      },
      {
        id: "location-language",
        icon: GlobeIcon,
        title: "Location & Language",
        items: [
          {
            label: "Country",
            value: countryInfo?.name || "Unknown",
          },
          {
            label: "Timezone",
            value: contactSession.metadata.timezone || "Unknown",
          },
          {
            label: "Language",
            value:
              contactSession.metadata.language ||
              contactSession.metadata.telegramLanguageCode ||
              "Unknown",
          },
        ],
      },
      {
        id: "session-details",
        icon: ClockIcon,
        title: "Session",
        items: [
          {
            label: "First Seen",
            value: new Date(contactSession._creationTime).toLocaleString(),
          },
          {
            label: "Resolution",
            value: contactSession.metadata.screenResolution || "Unknown",
          },
          ...(isTelegramSession
            ? [
                {
                  label: "Telegram ID",
                  value: contactSession.metadata.telegramUserId || "Unknown",
                },
                {
                  label: "Username",
                  value: contactSession.metadata.telegramUsername
                    ? `@${contactSession.metadata.telegramUsername}`
                    : "Unknown",
                },
              ]
            : []),
          ...(isInstagramSession
            ? [
                {
                  label: "Profile name",
                  value: contactSession.metadata.instagramFullName || "Unknown",
                },
                {
                  label: "Instagram ID",
                  value: contactSession.metadata.instagramUserId || "Unknown",
                },
                {
                  label: "Username",
                  value: contactSession.metadata.instagramUsername
                    ? `@${contactSession.metadata.instagramUsername}`
                    : "Unknown",
                },
                {
                  label: "Followers",
                  value:
                    typeof contactSession.metadata.instagramFollowerCount ===
                    "number"
                      ? contactSession.metadata.instagramFollowerCount.toLocaleString()
                      : "Unknown",
                },
              ]
            : []),
          ...(isWhatsappSession
            ? [
                {
                  label: "WhatsApp phone",
                  value:
                    contactSession.metadata.whatsappPhoneNumber || "Unknown",
                },
                {
                  label: "Profile name",
                  value:
                    contactSession.metadata.whatsappProfileName || "Unknown",
                },
                {
                  label: "Phone number ID",
                  value:
                    contactSession.metadata.whatsappPhoneNumberId || "Unknown",
                },
              ]
            : []),
        ],
      },
    ]
  }, [contactSession, userAgentInfo, countryInfo])

  if (contactSession === undefined) {
    return <ContactPanelSkeleton />
  }

  if (contactSession === null) {
    return null
  }

  return (
    <div className="surface-panel flex h-full w-full min-w-0 flex-col overflow-x-hidden overflow-y-auto rounded-[30px] bg-background/90 text-foreground">
      {/* Profile card */}
      <div className="border-b border-border/70 px-4 pt-4 pb-4">
        <div className="flex items-start gap-3">
          <DicebearAvatar
            badgeImageUrl={
              countryInfo?.code
                ? getCountryFlagUrl(countryInfo.code)
                : undefined
            }
            imageUrl={instagramProfilePic}
            seed={contactSession._id}
            size={44}
            className="shrink-0"
          />
          <div className="min-w-0 flex-1 pt-0.5">
            <h4 className="truncate text-[14px] leading-snug font-semibold text-foreground">
              {contactSession.name}
            </h4>
            <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
              {secondaryIdentity}
            </p>
            {isInstagramSession && instagramFullName && instagramUsername && (
              <p className="mt-1 text-[11px] text-muted-foreground/70">
                Instagram
              </p>
            )}
            {countryInfo?.name && (
              <p className="mt-1 text-[11px] text-muted-foreground/70">
                {countryInfo.name}
              </p>
            )}
          </div>
        </div>

        {!isInstagramSession && (
          <Button asChild className="mt-3 w-full" size="sm" variant="outline">
            <Link href={`mailto:${contactSession.email}`}>
              <MailIcon className="size-3.5" />
              <span>Send Email</span>
            </Link>
          </Button>
        )}
        {isInstagramSession && (
          <Button
            className="mt-3 w-full"
            disabled={isRefreshingInstagramProfile}
            onClick={handleRefreshInstagramProfile}
            size="sm"
            type="button"
            variant="outline"
          >
            <RefreshCwIcon
              className={cn(
                "size-3.5",
                isRefreshingInstagramProfile && "animate-spin"
              )}
            />
            <span>Refresh Instagram Profile</span>
          </Button>
        )}
      </div>

      {/* Info sections */}
      {contactSession.metadata && (
        <Accordion
          className="w-full"
          collapsible
          defaultValue="device-info"
          type="single"
        >
          {accordionSections.map((section) => (
            <AccordionItem
              key={section.id}
              value={section.id}
              className="border-b border-border/70 last:border-b-0"
            >
              <AccordionTrigger className="flex w-full items-center gap-3 px-4 py-3 text-left text-[12px] font-medium text-foreground transition-colors hover:bg-muted/30 hover:no-underline">
                <div className="flex items-center gap-2">
                  <section.icon className="size-3.5 shrink-0 text-muted-foreground" />
                  <span>{section.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pt-0 pb-3">
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <div
                      className="flex items-start justify-between gap-4"
                      key={`${section.id}-${item.label}`}
                    >
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {item.label}
                      </span>
                      <span
                        className={`text-right text-[11px] font-medium text-foreground ${item.className ?? ""}`}
                      >
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {customerMemory && (
        <div className="border-t border-border/70 px-4 py-4">
          <div className="flex items-center gap-2 text-[12px] font-medium text-foreground">
            <BrainIcon className="size-3.5 text-muted-foreground" />
            <span>Customer memory</span>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
            {customerMemory.summary}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {customerMemory.recentIntents.slice(0, 3).map((intent) => (
              <Badge key={intent} variant="secondary" className="text-[10px]">
                {intent.replaceAll("_", " ")}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export const ContactPanelSkeleton = () => {
  return (
    <div className="surface-panel flex h-full w-full min-w-0 flex-col overflow-x-hidden overflow-y-auto rounded-[30px] bg-background/90 text-foreground">
      <div className="border-b border-border/70 px-4 pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="relative size-11 shrink-0">
            <Skeleton className="size-11 rounded-full" />
            <Skeleton className="absolute right-0 bottom-0 size-4 rounded-full border-2 border-background" />
          </div>
          <div className="min-w-0 flex-1 space-y-2 pt-1">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-2.5 w-20" />
          </div>
        </div>
        <Skeleton className="mt-3 h-9 w-full rounded-lg" />
      </div>

      <div className="w-full">
        {Array.from({ length: 3 }).map((_, index) => (
          <div className="border-b border-border/70 px-4 py-3" key={index}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Skeleton className="size-3.5 rounded" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="size-3 rounded" />
            </div>
            {index === 0 && (
              <div className="mt-4 space-y-2">
                {Array.from({ length: 2 }).map((_, itemIndex) => (
                  <div
                    className="flex items-start justify-between gap-4"
                    key={itemIndex}
                  >
                    <Skeleton className="h-2.5 w-14" />
                    <Skeleton
                      className={cn("h-2.5", itemIndex === 0 ? "w-24" : "w-20")}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-border/70 px-4 py-4">
        <div className="flex items-center gap-2">
          <Skeleton className="size-3.5 rounded" />
          <Skeleton className="h-3 w-28" />
        </div>
        <div className="mt-3 space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-11/12" />
          <Skeleton className="h-3 w-3/4" />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Skeleton className="h-6 w-12 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
    </div>
  )
}
