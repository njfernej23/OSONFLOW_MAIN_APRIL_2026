"use client"

import { LanguagesIcon } from "lucide-react"

import {
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  useLanguage,
} from "@/lib/i18n/language-provider"
import { SidebarMenuButton } from "@workspace/ui/components/sidebar"
import type { Language } from "@/lib/i18n/translations"
import { cn } from "@workspace/ui/lib/utils"

type LanguageSwitcherProps = {
  className?: string
  compact?: boolean
  surface?: "light" | "dark" | "sidebar"
}

const LANGUAGE_ICONS: Record<Language, string> = {
  en: "🇺🇸",
  uz: "🇺🇿",
  ru: "🇷🇺",
}

export function LanguageSwitcher({
  className,
  compact = false,
  surface = "light",
}: LanguageSwitcherProps) {
  const { language, setLanguage, t } = useLanguage()
  const languageOptions = SUPPORTED_LANGUAGES.map((item) => (
    <option className="text-[#101828]" key={item} value={item}>
      {LANGUAGE_LABELS[item]}
    </option>
  ))

  if (surface === "sidebar") {
    return (
      <SidebarMenuButton
        asChild
        tooltip={`${t("Language")}: ${LANGUAGE_LABELS[language]}`}
        className={cn(
          "surface-frosted relative h-11 cursor-pointer rounded-2xl border-0 px-2.5 text-sidebar-foreground group-data-[collapsible=icon]:size-11 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 hover:bg-sidebar-accent/70 group-data-[collapsible=icon]:[&>span]:hidden",
          className
        )}
      >
        <label title={`${t("Language")}: ${LANGUAGE_LABELS[language]}`}>
          <LanguagesIcon className="size-4 shrink-0" aria-hidden="true" />
          <span className="text-sm font-semibold">
            {LANGUAGE_LABELS[language]}
          </span>
          <select
            aria-label={t("Language")}
            className={cn(
              "absolute inset-0 size-full cursor-pointer appearance-none opacity-0 outline-none"
            )}
            onChange={(event) => setLanguage(event.target.value as Language)}
            value={language}
          >
            {languageOptions}
          </select>
        </label>
      </SidebarMenuButton>
    )
  }

  if (compact) {
    return (
      <label
        className={cn(
          "relative inline-flex size-10 shrink-0 items-center justify-center rounded-full border text-lg transition",
          surface === "dark" &&
            "border-white/18 bg-white/8 text-white hover:bg-white/14",
          surface === "light" &&
            "border-[#101828]/12 bg-white/80 text-[#344054] hover:bg-white",
          className
        )}
        title={`${t("Language")}: ${LANGUAGE_LABELS[language]}`}
      >
        <span aria-hidden="true">{LANGUAGE_ICONS[language]}</span>
        <select
          aria-label={t("Language")}
          className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0 outline-none"
          onChange={(event) => setLanguage(event.target.value as Language)}
          value={language}
        >
          {languageOptions}
        </select>
      </label>
    )
  }

  return (
    <label
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition",
        surface === "dark" &&
          "border-white/18 bg-white/8 text-white hover:bg-white/14",
        surface === "light" &&
          "border-[#101828]/12 bg-white/80 text-[#344054] hover:bg-white",
        className
      )}
    >
      <LanguagesIcon className="size-4 shrink-0" aria-hidden="true" />
      <span className={cn("sr-only", !compact && "sm:not-sr-only")}>
        {t("Language")}
      </span>
      <select
        aria-label={t("Language")}
        className={cn(
          "min-w-0 appearance-none bg-transparent text-sm font-semibold outline-none",
          "w-[5.8rem]",
          surface === "dark" && "text-white",
          surface !== "dark" && "text-inherit"
        )}
        onChange={(event) => setLanguage(event.target.value as Language)}
        value={language}
      >
        {languageOptions}
      </select>
    </label>
  )
}
