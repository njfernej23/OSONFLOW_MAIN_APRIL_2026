"use client"

import { getCountryFlagUrl, getCountryFromTimezone } from "@/lib/country-utils"
import { api } from "@workspace/backend/_generated/api"
import { Id } from "@workspace/backend/_generated/dataModel"
import { Button } from "@workspace/ui/components/button"
import { DicebearAvatar } from "@workspace/ui/components/dicebear-avatar"
import { useQuery } from "convex/react"
import { useParams } from "next/navigation"
import { useMemo } from "react"
import Bowser from "bowser"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion"
import Link from "next/link"
import { GlobeIcon, MailIcon, MonitorIcon, ClockIcon } from "lucide-react"

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

  const accordionSections = useMemo<InfoSection[]>(() => {
    if (!contactSession?.metadata) {
      return []
    }

    return [
      {
        id: "device-info",
        icon: MonitorIcon,
        title: "Device",
        items: [
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
              (userAgentInfo.osVersion ? ` ${userAgentInfo.osVersion}` : ""),
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
            value: contactSession.metadata.language || "Unknown",
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
        ],
      },
    ]
  }, [contactSession, userAgentInfo, countryInfo])

  if (contactSession === undefined || contactSession === null) {
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
            seed={contactSession._id}
            size={44}
            className="shrink-0"
          />
          <div className="min-w-0 flex-1 pt-0.5">
            <h4 className="truncate text-[14px] leading-snug font-semibold text-foreground">
              {contactSession.name}
            </h4>
            <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
              {contactSession.email}
            </p>
            {countryInfo?.name && (
              <p className="mt-1 text-[11px] text-muted-foreground/70">
                {countryInfo.name}
              </p>
            )}
          </div>
        </div>

        <Button asChild className="mt-3 w-full" size="sm" variant="outline">
          <Link href={`mailto:${contactSession.email}`}>
            <MailIcon className="size-3.5" />
            <span>Send Email</span>
          </Link>
        </Button>
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
    </div>
  )
}
