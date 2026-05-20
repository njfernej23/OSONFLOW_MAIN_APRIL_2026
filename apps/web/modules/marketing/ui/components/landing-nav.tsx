"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

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
    <span className="hidden text-[1.35rem] leading-none font-semibold text-[#0A0A0A] sm:inline">
      Osonflow
    </span>
  </Link>
)

export const LandingNav = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const isScrolledRef = useRef(false)

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
    <header className="sticky top-0 z-40 px-3 py-3 sm:px-8 sm:py-4">
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
              className="shrink-0 rounded-full px-5 py-2.5 whitespace-nowrap text-[#344054] transition hover:bg-white/70 hover:text-[#101828]"
              href={item.href}
              key={item.label}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="osonflow-nav-island flex h-10 shrink-0 items-center gap-1 px-1 sm:h-12 sm:px-1.5">
          <Link
            className="hidden rounded-full px-4 py-2.5 whitespace-nowrap text-[#667085] transition hover:bg-white/70 hover:text-[#101828] sm:inline-flex"
            href="/sign-in"
          >
            Login
          </Link>
          <Link
            className="hidden rounded-full px-4 py-2.5 whitespace-nowrap text-[#344054] transition hover:bg-white/70 hover:text-[#101828] md:inline-flex"
            href="/sign-up"
          >
            Sign up
          </Link>
          <Link
            className="group inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#3A7BFF] px-4 font-semibold whitespace-nowrap text-white shadow-[0_18px_42px_-22px_rgba(58,123,255,0.9)] transition hover:-translate-y-0.5 hover:bg-[#256DFF] sm:h-11 sm:px-5"
            href="/sign-up"
          >
            Book a demo
            <ArrowRightIcon className="hidden size-4 transition group-hover:translate-x-0.5 sm:block" />
          </Link>
        </div>
      </div>
    </header>
  )
}
