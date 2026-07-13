"use client"

import { useEffect, useState } from "react"
import { UserButton, useOrganization, useUser } from "@clerk/nextjs"
import { AnimatePresence, motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"

import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import { appPath } from "@/lib/urls"

const NAV_LINKS = [
  { href: "#product", label: "Platform" },
  { href: "#loop", label: "How it works" },
  { href: "#experience", label: "Live demo" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "Resources" },
] as const

function SignedOutNav({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean
  onNavigate?: () => void
}) {
  return (
    <>
      <Link
        className={mobile ? "nav__mobile-auth-link" : "link-quiet"}
        href={appPath("/sign-in")}
        onClick={onNavigate}
      >
        Sign in
      </Link>
      <Link
        className={
          mobile
            ? "btn btn--primary btn--block nav__mobile-cta"
            : "btn btn--primary btn--sm"
        }
        href={appPath("/sign-up")}
        onClick={onNavigate}
      >
        Sign up
      </Link>
    </>
  )
}

function SignedInNav({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean
  onNavigate?: () => void
}) {
  const { isLoaded: isOrgLoaded, organization } = useOrganization()
  const dashboardHref =
    isOrgLoaded && !organization
      ? appPath("/org-selection")
      : appPath("/analytics")

  if (mobile) {
    return (
      <>
        <Link
          className="btn btn--primary btn--block nav__mobile-cta"
          href={dashboardHref}
          onClick={onNavigate}
        >
          Open dashboard
        </Link>
        <div className="nav__user">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "h-10 w-10",
              },
            }}
          />
        </div>
      </>
    )
  }

  return (
    <>
      <Link className="btn btn--primary btn--sm" href={dashboardHref}>
        Open dashboard
      </Link>
      <UserButton
        appearance={{
          elements: {
            avatarBox: "h-9 w-9",
          },
        }}
      />
    </>
  )
}

function NavAuthActions({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean
  onNavigate?: () => void
}) {
  const { isLoaded, isSignedIn } = useUser()

  if (!isLoaded || !isSignedIn) {
    return <SignedOutNav mobile={mobile} onNavigate={onNavigate} />
  }

  return <SignedInNav mobile={mobile} onNavigate={onNavigate} />
}

export const JapandiLandingNav = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : ""

    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 40)
    }

    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })

    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <>
      <header
        className={`nav${isScrolled ? " is-scrolled" : ""}${isOpen ? " is-open" : ""}`}
        id="nav"
      >
        <div className="nav__shell">
          <div className="nav__capsule">
            <div className="nav__brand-chip">
              <Link className="brand" href="/" aria-label="Osonflow home">
                <span className="brand__mark" aria-hidden="true">
                  <Image
                    alt=""
                    className="brand__img"
                    height={30}
                    src="/landing/assets/logo-mark.png"
                    width={30}
                  />
                </span>
                <span className="brand__name">Osonflow</span>
              </Link>
            </div>

            <nav aria-label="Primary" className="nav__links">
              <div className="nav__menu" id="navMenu">
                {NAV_LINKS.map((item) => (
                  <Link href={item.href} key={item.href}>
                    {item.label}
                  </Link>
                ))}
              </div>
            </nav>

            <div className="nav__actions">
              <div className="nav__lang">
                <LanguageSwitcher className="nav__lang-switch" compact display="code" />
              </div>
              <div className="nav__auth">
                <NavAuthActions />
              </div>
              <button
                aria-expanded={isOpen}
                aria-label="Toggle menu"
                className="nav__toggle"
                id="navToggle"
                onClick={() => setIsOpen((open) => !open)}
                type="button"
              >
                <span />
                <span />
              </button>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isOpen ? (
          <>
            <motion.button
              aria-label="Close menu"
              className="nav__backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              type="button"
            />
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="nav__mobile"
              exit={{ opacity: 0, y: -12 }}
              id="navMobile"
              initial={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {NAV_LINKS.map((item) => (
                <Link
                  href={item.href}
                  key={item.href}
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <div className="nav__mobile-lang">
                <LanguageSwitcher compact display="code" />
              </div>
              <div className="nav__mobile-actions">
                <NavAuthActions mobile onNavigate={() => setIsOpen(false)} />
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  )
}
