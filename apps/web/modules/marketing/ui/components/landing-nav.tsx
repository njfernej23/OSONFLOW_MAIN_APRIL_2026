"use client"

import { useEffect, useRef, useState } from "react"
import { UserButton, useOrganization, useUser } from "@clerk/nextjs"
import Image from "next/image"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import { navItems } from "./marketing-nav-data"

const SCROLLED_THRESHOLD = 4

const NavLogo = () => (
  <Link className="inline-flex shrink-0 items-center gap-2.5" href="/">
    <Image
      alt="Osonflow logo"
      className="h-9 w-auto"
      height={40}
      priority
      src="/logo.svg"
      width={70}
    />
    <span className="hidden text-[1.35rem] leading-none font-bold text-[#240029] sm:inline">
      Osonflow
    </span>
  </Link>
)

export const LandingNav = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const isScrolledRef = useRef(false)
  const { isLoaded, isSignedIn } = useUser()
  const { isLoaded: isOrganizationLoaded, organization } = useOrganization()

  useEffect(() => {
    const updateScrolledState = () => {
      const nextScrolled =
        window.scrollY > SCROLLED_THRESHOLD ||
        document.documentElement.scrollTop > SCROLLED_THRESHOLD ||
        document.body.scrollTop > SCROLLED_THRESHOLD

      if (isScrolledRef.current === nextScrolled) {
        return
      }

      isScrolledRef.current = nextScrolled
      setIsScrolled(nextScrolled)
    }

    updateScrolledState()
    window.addEventListener("scroll", updateScrolledState, { passive: true })
    window.addEventListener("resize", updateScrolledState)

    return () => {
      window.removeEventListener("scroll", updateScrolledState)
      window.removeEventListener("resize", updateScrolledState)
    }
  }, [])

  return (
    <header className="sticky top-0 z-40 bg-white px-3 py-3 sm:px-8 sm:py-4">
      <div
        className={cn(
          "osonflow-nav-shell mx-auto flex h-14 w-full items-center justify-between gap-2 px-2 text-sm font-medium sm:h-16 sm:text-[0.95rem]",
          isScrolled && "is-scrolled"
        )}
        data-scrolled={isScrolled ? "true" : "false"}
      >
        <div className="osonflow-nav-island osonflow-nav-logo flex h-10 shrink-0 items-center px-2 sm:h-12 sm:px-3">
          <NavLogo />
        </div>

        <nav
          aria-label="Main navigation"
          className="osonflow-nav-island hidden h-12 items-center gap-1 px-3 lg:flex"
        >
          {navItems.map((item) => (
            <Link
              className="shrink-0 rounded-full px-5 py-2.5 font-bold whitespace-nowrap text-[#6d526d] transition hover:bg-[#240029] hover:text-white"
              href={item.href}
              key={item.label}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {(!isLoaded || !isSignedIn) && (
          <div className="osonflow-nav-island flex h-10 max-w-[calc(100vw-7.5rem)] shrink-0 items-center gap-1 overflow-hidden px-1 sm:h-12 sm:max-w-none sm:px-1.5">
            <LanguageSwitcher compact />
            <Link
              className="hidden rounded-full px-4 py-2.5 font-bold whitespace-nowrap text-[#6d526d] transition hover:bg-[#29002908] hover:text-[#240029] sm:inline-flex"
              href="/sign-in"
            >
              Login
            </Link>
            <Link
              className="hidden rounded-full px-4 py-2.5 font-bold whitespace-nowrap text-[#240029] transition hover:bg-[#29002908] md:inline-flex"
              href="/sign-up"
            >
              Sign up
            </Link>
            <Link
              className="group inline-flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-[4px] bg-[#df37a7] px-0 font-bold whitespace-nowrap text-white shadow-[rgba(255,255,255,0.2)_0_0_0_1px_inset,rgba(0,0,0,0.05)_0_1px_2px_0] transition hover:-translate-y-0.5 hover:bg-[#d0339c] sm:h-11 sm:w-auto sm:px-5"
              href="/sign-up"
            >
              <span className="hidden sm:inline">Book a demo</span>
              <ArrowRightIcon className="size-4 transition group-hover:translate-x-0.5" />
            </Link>
          </div>
        )}

        {isLoaded && isSignedIn && (
          <div className="osonflow-nav-island flex h-10 shrink-0 items-center gap-2 px-1.5 sm:h-12 sm:px-2">
            <LanguageSwitcher compact />
            <Link
              className="inline-flex h-10 shrink-0 items-center rounded-[4px] bg-[#240029] px-4 text-sm font-bold whitespace-nowrap text-white shadow-[rgba(255,255,255,0.2)_0_0_0_1px_inset,rgba(0,0,0,0.05)_0_1px_2px_0] transition hover:-translate-y-0.5 hover:bg-[#3a083f] sm:h-11 sm:px-5"
              href={
                isOrganizationLoaded && !organization
                  ? "/org-selection"
                  : "/analytics"
              }
            >
              Dashboard
            </Link>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-10 w-10 sm:h-11 sm:w-11",
                },
              }}
            />
          </div>
        )}
      </div>
    </header>
  )
}
