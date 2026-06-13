"use client"

import { useEffect, useState } from "react"
import { UserButton, useOrganization, useUser } from "@clerk/nextjs"
import Image from "next/image"
import Link from "next/link"

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
        href="/sign-in"
        onClick={onNavigate}
      >
        Sign in
      </Link>
      <Link
        className={mobile ? "btn btn--primary btn--block nav__mobile-cta" : "btn btn--primary btn--sm"}
        href="/sign-up"
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
    isOrgLoaded && !organization ? "/org-selection" : "/analytics"

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
      setIsScrolled(window.scrollY > 8)
    }

    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })

    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={`nav${isScrolled ? " is-scrolled" : ""}${isOpen ? " is-open" : ""}`}
      id="nav"
    >
      <div className="container nav__inner">
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

        <nav className="nav__links" aria-label="Primary">
          <div className="nav__menu" id="navMenu">
            <Link href="#product">Product</Link>
            <Link href="#loop">How it works</Link>
            <Link href="#experience">Live demo</Link>
            <Link href="#pricing">Pricing</Link>
            <Link href="#faq">FAQ</Link>
          </div>
        </nav>

        <div className="nav__actions">
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

      {isOpen ? (
        <button
          aria-label="Close menu"
          className="nav__backdrop"
          onClick={() => setIsOpen(false)}
          type="button"
        />
      ) : null}

      <div className="nav__mobile" hidden={!isOpen} id="navMobile">
        <Link href="#product" onClick={() => setIsOpen(false)}>
          Product
        </Link>
        <Link href="#loop" onClick={() => setIsOpen(false)}>
          How it works
        </Link>
        <Link href="#experience" onClick={() => setIsOpen(false)}>
          Live demo
        </Link>
        <Link href="#pricing" onClick={() => setIsOpen(false)}>
          Pricing
        </Link>
        <Link href="#faq" onClick={() => setIsOpen(false)}>
          FAQ
        </Link>
        <div className="nav__mobile-actions">
          <NavAuthActions mobile onNavigate={() => setIsOpen(false)} />
        </div>
      </div>
    </header>
  )
}
