import Image from "next/image"
import Link from "next/link"
import {
  ArrowUpRightIcon,
  HeadphonesIcon,
  LineChartIcon,
  MessageSquareTextIcon,
} from "lucide-react"

import { marketingPath } from "@/lib/urls"

const highlights = [
  {
    icon: MessageSquareTextIcon,
    title: "Unified inbox",
    description: "Chat, email, and social in one calm workspace.",
  },
  {
    icon: HeadphonesIcon,
    title: "AI with a human handoff",
    description: "Resolve faster without losing context or judgment.",
  },
  {
    icon: LineChartIcon,
    title: "Support you can measure",
    description: "Live analytics so your team always knows what matters.",
  },
] as const

export const AuthBrandPanel = () => {
  return (
    <aside className="auth-brand-panel relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between">
      <div className="auth-brand-ambient pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative z-10 flex flex-col gap-10 p-10 xl:p-14">
        <Link
          className="auth-brand-logo inline-flex w-fit items-center gap-3"
          href={marketingPath("/")}
        >
          <Image
            alt=""
            className="auth-brand-logo__mark"
            height={30}
            priority
            src="/landing/assets/logo-mark.png"
            width={30}
          />
          <span className="auth-brand-logo__name">Osonflow</span>
        </Link>

        <div className="max-w-md space-y-5">
          <p className="auth-eyebrow auth-eyebrow--panel">Customer support, reimagined</p>
          <h2 className="auth-brand-headline">
            One calm front door
            <span className="auth-brand-headline__accent"> for every conversation.</span>
          </h2>
          <p className="auth-brand-lede">
            Join teams who replaced scattered tools with one elegant support layer — grounded
            in context, ready for humans when it matters.
          </p>
        </div>

        <ul className="max-w-md space-y-3">
          {highlights.map((item, index) => (
            <li
              className="auth-brand-card"
              key={item.title}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="auth-brand-card__icon">
                <item.icon className="size-[1.05rem]" strokeWidth={1.75} />
              </div>
              <div className="space-y-0.5">
                <p className="auth-brand-card__title">{item.title}</p>
                <p className="auth-brand-card__text">{item.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="auth-brand-footer relative z-10">
        <p className="auth-brand-footer__note">Trusted by modern support teams</p>
        <Link className="auth-brand-footer__link group" href={marketingPath("/")}>
          Explore the platform
          <ArrowUpRightIcon className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </aside>
  )
}
