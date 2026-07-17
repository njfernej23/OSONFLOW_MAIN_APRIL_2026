"use client"

import { useCallback, useLayoutEffect, useRef, useState } from "react"

type CaseStudy = {
  id: string
  label: string
  logoSrc: string
  logoAlt: string
  logoClass?: string
  video: string
  poster?: string
  statNum: string
  statLabel: string
  cardText: string
  cardHref: string
}

const CASE_STUDIES: CaseStudy[] = [
  {
    id: "sanlam",
    label: "Play Sanlam case study",
    logoSrc: "/landing/assets/trust/coreweave.png",
    logoAlt: "Sanlam",
    logoClass: "logo-img--90",
    video: "/landing/assets/case-studies/sanlam-case-study-h264.mp4",
    poster: "/landing/assets/case-studies/sanlam-poster.jpg",
    statNum: "6",
    statLabel: "Week rollout",
    cardText:
      "Sanlam deployed an AI customer support agent across regional channels using Osonflow, empowering non-technical teams to launch without engineering bottlenecks.",
    cardHref: "#",
  },
  {
    id: "stubhub",
    label: "Play StubHub case study",
    logoSrc: "/landing/assets/trust/beacon.png",
    logoAlt: "StubHub",
    logoClass: "logo-img--90",
    video: "/landing/assets/case-studies/stubhub-case-study-h264.mp4",
    poster: "/landing/assets/case-studies/stubhub-poster.jpg",
    statNum: "3",
    statLabel: "Month development",
    cardText:
      "StubHub International built and launched a powerful AI customer support agent in 90 days using Osonflow, empowering non-technical teams and transforming their support operations.",
    cardHref: "#",
  },
  {
    id: "superloop",
    label: "Play Superloop case study",
    logoSrc: "/landing/assets/trust/northwind.png",
    logoAlt: "Superloop",
    video: "/landing/assets/case-studies/superloop-case-study-h264.mp4",
    poster: "/landing/assets/case-studies/superloop-poster.jpg",
    statNum: "42%",
    statLabel: "Faster resolution",
    cardText:
      "Superloop scaled always-on AI support for broadband customers, cutting handle time while keeping complex escalations in the same shared agent workspace.",
    cardHref: "#",
  },
  {
    id: "turo",
    label: "Play Turo case study",
    logoSrc: "/landing/assets/trust/stark-solutions.png",
    logoAlt: "Stark Solutions",
    logoClass: "logo-img--90",
    video: "/landing/assets/case-studies/turo-case-study-h264.mp4",
    poster: "/landing/assets/case-studies/turo-poster.jpg",
    statNum: "2×",
    statLabel: "Agent efficiency",
    cardText:
      "Stark Solutions unified voice and chat in one support loop, letting agents pick up any thread with full conversation context from the first message.",
    cardHref: "#",
  },
]

async function playVideo(video: HTMLVideoElement, preferUnmuted: boolean) {
  video.muted = true
  try {
    await video.play()
  } catch {
    return
  }

  if (!preferUnmuted) return

  video.muted = false
  try {
    await video.play()
  } catch {
    video.muted = true
    await video.play().catch(() => {})
  }
}

export function LandingCaseStudyShowcase() {
  const preferUnmutedRef = useRef(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const labelTextRef = useRef<HTMLSpanElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [activeId, setActiveId] = useState(CASE_STUDIES[0]?.id ?? "sanlam")
  const [isSwitching, setIsSwitching] = useState(false)
  const active =
    CASE_STUDIES.find((study) => study.id === activeId) ?? CASE_STUDIES[0]

  useLayoutEffect(() => {
    const root = rootRef.current
    const labelText = labelTextRef.current
    if (!root || !labelText) return

    const syncLabelEnd = () => {
      const labelRight = labelText.getBoundingClientRect().right
      root.style.setProperty("--case-label-text-end", `${labelRight}px`)
    }

    syncLabelEnd()
    const observer = new ResizeObserver(syncLabelEnd)
    observer.observe(labelText)
    window.addEventListener("resize", syncLabelEnd)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", syncLabelEnd)
    }
  }, [])

  const attachVideo = useCallback((video: HTMLVideoElement | null) => {
    videoRef.current = video
    if (!video) return

    const preferUnmuted = preferUnmutedRef.current
    preferUnmutedRef.current = false

    video.muted = true
    video.defaultMuted = true
    video.loop = true
    video.playsInline = true
    video.setAttribute("playsinline", "")
    video.setAttribute("webkit-playsinline", "")

    const startPlayback = () => {
      void playVideo(video, preferUnmuted)
    }

    video.addEventListener("canplay", startPlayback, { once: true })
    video.addEventListener("loadeddata", startPlayback, { once: true })

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      startPlayback()
      return
    }

    video.load()
  }, [active?.video])

  // Resume playback when the showcase scrolls back into view (iOS often pauses offscreen).
  useLayoutEffect(() => {
    const video = videoRef.current
    if (!video) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return
        if (entry.isIntersecting && video.paused) {
          void playVideo(video, false)
        }
      },
      { threshold: 0.35 },
    )

    observer.observe(video)
    return () => observer.disconnect()
  }, [active?.video])

  if (!active) return null

  const selectCase = (study: CaseStudy) => {
    if (study.id === activeId) return

    preferUnmutedRef.current = true
    setIsSwitching(true)
    window.setTimeout(() => setIsSwitching(false), 160)
    setActiveId(study.id)
  }

  return (
    <div ref={rootRef} className="case-study-showcase">
      <div className="trust reveal is-in" data-reveal>
        <span className="trust__label">
          <span ref={labelTextRef} className="trust__label-text">
            Choose case study
          </span>
        </span>
        <div className="trust__logos" id="caseStudyLogos">
          {CASE_STUDIES.map((study) => {
            const isActive = study.id === activeId
            return (
              <button
                key={study.id}
                type="button"
                className={`case-logo-btn${isActive ? " is-active" : ""}`}
                data-case={study.id}
                aria-pressed={isActive}
                aria-label={study.label}
                onClick={() => selectCase(study)}
              >
                <img
                  className={`logo-img${study.logoClass ? ` ${study.logoClass}` : ""}`}
                  src={study.logoSrc}
                  alt={study.logoAlt}
                />
              </button>
            )
          })}
        </div>
      </div>

      <div className="hero__showcase">
        <div className="hero__showcase-bg" aria-hidden="true" />
        <div className="hero__showcase-layout">
          <article
            className={`case-study-card reveal is-in${isSwitching ? " is-switching" : ""}`}
            data-reveal
            id="caseStudyCard"
            aria-live="polite"
          >
            <div className="case-study-card__stat">
              <span className="case-study-card__num" id="caseStudyStatNum">
                {active.statNum}
              </span>
              <span className="case-study-card__unit" id="caseStudyStatLabel">
                {active.statLabel}
              </span>
            </div>
            <p className="case-study-card__text" id="caseStudyCardText">
              {active.cardText}
            </p>
            <a className="case-study-card__link" id="caseStudyCardLink" href={active.cardHref}>
              See case study <span aria-hidden="true">›</span>
            </a>
          </article>
          <div className="hero__video reveal is-in" data-reveal>
            <video
              key={active.video}
              ref={attachVideo}
              id="caseStudyVideo"
              className="case-study-video"
              playsInline
              muted
              loop
              autoPlay
              preload="auto"
              poster={active.poster}
              src={active.video}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
