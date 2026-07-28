"use client"

import { useLayoutEffect } from "react"
import { animate, inView, stagger } from "framer-motion"

type MotionKind =
  | "cards"
  | "method"
  | "signal"
  | "features"
  | "plans"
  | "faq"
  | "cta"
  | "logos"
  | "channels"
  | "xroom"
  | "analytics"
  | "tenancy"
  | "default"

const EASE = [0.22, 1, 0.36, 1] as const
const SPRING = { type: "spring" as const, stiffness: 120, damping: 20, mass: 0.85 }

const KIND_SELECTORS: Record<MotionKind, string[]> = {
  cards: [],
  method: [".method__intro", ".method__step"],
  signal: [".signal__claim", ".signal__stat"],
  features: [".lede", ".feature"],
  plans: [".lede", ".plan"],
  faq: [".lede", ".acc"],
  cta: [".site-end__panel"],
  logos: [".trust__label", ".case-logo-btn", ".logo-img", ".trustband .logo-img"],
  channels: [".lede", ".channel", ".channels__grid > *"],
  xroom: [".lede", ".xstage"],
  analytics: [".lede", ".opsboard"],
  tenancy: [".tenancy__intro", ".tenancy__board"],
  default: [
    ".lede",
    ".pipeline__stage",
    ".pstep",
    ".widget",
    ".workspace",
    ".xroom__pane",
    ".roicard > *",
    ".safeguard",
    "[data-reveal]",
  ],
}

function kindFor(section: Element): MotionKind {
  if (section.classList.contains("method")) return "method"
  if (section.classList.contains("signal")) return "signal"
  if (section.classList.contains("features")) return "features"
  if (section.classList.contains("pricing")) return "plans"
  if (section.classList.contains("faq")) return "faq"
  if (section.classList.contains("cta")) return "cta"
  if (section.classList.contains("trustband")) return "tenancy"
  if (section.classList.contains("trust")) return "logos"
  if (section.classList.contains("channels") || section.classList.contains("integrations"))
    return "channels"
  if (section.classList.contains("xroom")) return "xroom"
  if (section.classList.contains("analytics")) return "analytics"
  return "default"
}

function pickTargets(section: Element, kind: MotionKind): HTMLElement[] {
  const nodes: HTMLElement[] = []
  const seen = new Set<HTMLElement>()

  for (const selector of KIND_SELECTORS[kind]) {
    section.querySelectorAll(selector).forEach((node) => {
      if (!(node instanceof HTMLElement)) return
      if (node.closest(".hero")) return
      if (seen.has(node)) return
      seen.add(node)
      nodes.push(node)
    })
  }

  return nodes.filter(
    (node) => !nodes.some((other) => other !== node && other.contains(node))
  )
}

function prepare(el: HTMLElement) {
  if (el.classList.contains("fm-in") || el.classList.contains("fm-ready")) return

  el.classList.add("fm-ready")
  el.style.opacity = "0"
  el.style.willChange = "transform, opacity, filter"
}

function clearInline(el: HTMLElement) {
  el.style.opacity = ""
  el.style.transform = ""
  el.style.filter = ""
  el.style.willChange = ""
  el.classList.add("is-in", "fm-in")
  el.classList.remove("fm-ready")
}

function resetPrepared(el: HTMLElement) {
  if (el.classList.contains("fm-in")) return

  el.classList.remove("fm-ready")
  el.style.opacity = ""
  el.style.transform = ""
  el.style.filter = ""
  el.style.willChange = ""
}

async function runAnimation(kind: MotionKind, targets: HTMLElement[]) {
  if (!targets.length) return

  switch (kind) {
    case "cards":
    case "plans":
    case "channels":
      await animate(
        targets,
        { opacity: [0, 1], y: [40, 0], scale: [0.97, 1] },
        { ...SPRING, delay: stagger(0.07, { startDelay: 0.05 }) }
      )
      break
    case "method": {
      const intro = targets.filter((el) => el.classList.contains("method__intro"))
      const steps = targets.filter((el) => el.classList.contains("method__step"))
      await Promise.all([
        intro.length
          ? animate(
              intro,
              { opacity: [0, 1], y: [28, 0], filter: ["blur(8px)", "blur(0px)"] },
              { duration: 0.85, ease: EASE }
            )
          : Promise.resolve(),
        steps.length
          ? animate(
              steps,
              { opacity: [0, 1], y: [40, 0], x: [28, 0] },
              {
                duration: 0.8,
                ease: EASE,
                delay: stagger(0.14, { startDelay: 0.18 }),
              }
            )
          : Promise.resolve(),
      ])
      break
    }
    case "signal": {
      const claim = targets.filter((el) => el.classList.contains("signal__claim"))
      const stats = targets.filter((el) => el.classList.contains("signal__stat"))
      await Promise.all([
        claim.length
          ? animate(
              claim,
              { opacity: [0, 1], x: [-36, 0], filter: ["blur(6px)", "blur(0px)"] },
              { duration: 0.9, ease: EASE }
            )
          : Promise.resolve(),
        stats.length
          ? animate(
              stats,
              { opacity: [0, 1], y: [24, 0], x: [18, 0] },
              {
                duration: 0.75,
                ease: EASE,
                delay: stagger(0.12, { startDelay: 0.22 }),
              }
            )
          : Promise.resolve(),
      ])
      break
    }
    case "features": {
      const forward = targets.filter((el) => !el.classList.contains("feature--rev"))
      const reverse = targets.filter((el) => el.classList.contains("feature--rev"))
      await Promise.all([
        forward.length
          ? animate(
              forward,
              { opacity: [0, 1], x: [-52, 0] },
              { duration: 0.9, ease: EASE, delay: stagger(0.12) }
            )
          : Promise.resolve(),
        reverse.length
          ? animate(
              reverse,
              { opacity: [0, 1], x: [52, 0] },
              { duration: 0.9, ease: EASE, delay: stagger(0.12, { startDelay: 0.08 }) }
            )
          : Promise.resolve(),
      ])
      break
    }
    case "faq":
      await animate(
        targets,
        { opacity: [0, 1], y: [24, 0] },
        {
          duration: 0.7,
          ease: EASE,
          delay: stagger(0.06, { startDelay: 0.04 }),
        }
      )
      break
    case "cta":
      await animate(
        targets,
        { opacity: [0, 1], y: [28, 0], scale: [0.98, 1], filter: ["blur(6px)", "blur(0px)"] },
        { duration: 1, ease: EASE }
      )
      break
    case "logos":
      await animate(
        targets,
        { opacity: [0, 1], y: [16, 0] },
        {
          duration: 0.65,
          ease: EASE,
          delay: stagger(0.05, { startDelay: 0.02 }),
        }
      )
      break
    case "xroom": {
      const lede = targets.filter((el) => el.classList.contains("lede"))
      const stage = targets.filter((el) => el.classList.contains("xstage"))
      await Promise.all([
        lede.length
          ? animate(
              lede,
              { opacity: [0, 1], y: [28, 0], filter: ["blur(8px)", "blur(0px)"] },
              { duration: 0.85, ease: EASE }
            )
          : Promise.resolve(),
        stage.length
          ? animate(
              stage,
              { opacity: [0, 1], y: [36, 0], scale: [0.985, 1] },
              { duration: 0.95, ease: EASE, delay: 0.16 }
            )
          : Promise.resolve(),
      ])
      break
    }
    case "analytics": {
      const lede = targets.filter((el) => el.classList.contains("lede"))
      const board = targets.filter((el) => el.classList.contains("opsboard"))
      await Promise.all([
        lede.length
          ? animate(
              lede,
              { opacity: [0, 1], y: [24, 0], filter: ["blur(6px)", "blur(0px)"] },
              { duration: 0.8, ease: EASE }
            )
          : Promise.resolve(),
        board.length
          ? animate(
              board,
              { opacity: [0, 1], y: [40, 0], scale: [0.985, 1] },
              { duration: 0.95, ease: EASE, delay: 0.12 }
            )
          : Promise.resolve(),
      ])
      break
    }
    case "tenancy": {
      const intro = targets.filter((el) => el.classList.contains("tenancy__intro"))
      const board = targets.filter((el) => el.classList.contains("tenancy__board"))
      await Promise.all([
        intro.length
          ? animate(
              intro,
              { opacity: [0, 1], x: [-28, 0], filter: ["blur(8px)", "blur(0px)"] },
              { duration: 0.9, ease: EASE }
            )
          : Promise.resolve(),
        board.length
          ? animate(
              board,
              { opacity: [0, 1], x: [28, 0], filter: ["blur(6px)", "blur(0px)"] },
              { duration: 0.95, ease: EASE, delay: 0.1 }
            )
          : Promise.resolve(),
      ])
      break
    }
    default:
      await animate(
        targets,
        { opacity: [0, 1], y: [32, 0] },
        {
          duration: 0.8,
          ease: EASE,
          delay: stagger(0.08, { startDelay: 0.04 }),
        }
      )
  }

  targets.forEach(clearInline)
}

function bindCardHover(root: Element) {
  const cards = root.querySelectorAll(
    ".plan, .channel, .method__step"
  )
  const cleanups: Array<() => void> = []

  cards.forEach((node) => {
    if (!(node instanceof HTMLElement)) return
    if (node.closest(".hero")) return

    const onEnter = () => {
      animate(
        node,
        { y: -5, scale: 1.012 },
        { type: "spring", stiffness: 340, damping: 24 }
      )
    }
    const onLeave = () => {
      animate(
        node,
        { y: 0, scale: 1 },
        { type: "spring", stiffness: 280, damping: 26 }
      )
    }

    node.addEventListener("pointerenter", onEnter)
    node.addEventListener("pointerleave", onLeave)
    cleanups.push(() => {
      node.removeEventListener("pointerenter", onEnter)
      node.removeEventListener("pointerleave", onLeave)
    })
  })

  return () => cleanups.forEach((fn) => fn())
}

/**
 * Premium Framer Motion scroll choreography for the landing page.
 * Hero is intentionally left alone.
 */
export function LandingScrollMotion() {
  useLayoutEffect(() => {
    const root = document.querySelector(".japandi-landing")
    if (!root) return

    root.classList.add("fm-on")

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const sections = Array.from(
      root.querySelectorAll("main section, main .trust")
    ).filter((section) => !section.classList.contains("hero"))

    if (reduceMotion) {
      sections.forEach((section) => {
        section
          .querySelectorAll(
            "[data-reveal], .method__step, .method__intro, .signal__claim, .signal__stat, .xstage, .opsboard, .tenancy__intro, .tenancy__board"
          )
          .forEach((node) => {
            if (node instanceof HTMLElement) clearInline(node)
          })
      })
      return () => root.classList.remove("fm-on")
    }

    const cleanups: Array<() => void> = []
    const preparedTargets: HTMLElement[] = []

    sections.forEach((section) => {
      const kind = kindFor(section)
      const targets = pickTargets(section, kind).filter(
        (el) => !el.classList.contains("fm-in")
      )
      if (!targets.length) return

      targets.forEach((el) => {
        prepare(el)
        preparedTargets.push(el)
      })

      const stop = inView(
        section,
        () => {
          stop()
          void runAnimation(kind, targets)
        },
        {
          amount: kind === "method" || kind === "signal" ? 0.18 : 0.22,
          margin: "0px 0px -10% 0px",
        }
      )

      cleanups.push(stop)
    })

    cleanups.push(bindCardHover(root))

    return () => {
      preparedTargets.forEach(resetPrepared)
      root.classList.remove("fm-on")
      cleanups.forEach((fn) => fn())
    }
  }, [])

  return null
}
