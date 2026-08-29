"use client"

import { cn } from "@workspace/ui/lib/utils"
import type { CSSProperties } from "react"

import type { CatalogIcon } from "../../catalog"

/**
 * The vendor's tile. One hue per vendor, carried through the catalog card, the
 * detail sheet, the installed rail and the editor header so a tool is
 * recognisable at a glance rather than by reading its name.
 */

type BrandMarkSize = "xs" | "sm" | "md" | "lg"

const SIZE_CLASS: Record<BrandMarkSize, string> = {
  xs: "size-7 rounded-[8px]",
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
}

const ICON_CLASS: Record<BrandMarkSize, string> = {
  xs: "size-3.5",
  sm: "size-4",
  md: "size-[18px]",
  lg: "size-5",
}

export const BrandMark = ({
  brand,
  icon: Icon,
  size = "md",
  muted = false,
  className,
}: {
  brand: string
  icon: CatalogIcon
  size?: BrandMarkSize
  /** Drops the hue — used for tools that are switched off or on the roadmap. */
  muted?: boolean
  className?: string
}) => (
  <span
    className={cn("brand-mark shrink-0", SIZE_CLASS[size], className)}
    data-muted={muted || undefined}
    style={{ "--brand-hue": brand } as CSSProperties}
  >
    <Icon className={ICON_CLASS[size]} />
  </span>
)

/** Applies the same hue to a card so its hover edge matches the mark. */
export const brandStyle = (brand: string) =>
  ({ "--brand-hue": brand }) as CSSProperties
