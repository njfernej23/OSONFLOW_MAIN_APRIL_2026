import Image from "next/image"
import Link from "next/link"
import { ArrowUpRightIcon, MessageSquareIcon, SparklesIcon, ZapIcon } from "lucide-react"

const highlights = [
  {
    icon: MessageSquareIcon,
    title: "Unified inbox",
    description: "Chat, email, and social — one calm workspace.",
  },
  {
    icon: SparklesIcon,
    title: "AI that assists",
    description: "Draft replies and resolve faster, without losing the human touch.",
  },
  {
    icon: ZapIcon,
    title: "Real-time clarity",
    description: "Live analytics so your team always knows what matters.",
  },
] as const

export const AuthBrandPanel = () => {
  return (
    <aside className="auth-brand-panel relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between">
      <div className="auth-brand-pattern pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative z-10 flex flex-col gap-10 p-10 xl:p-14">
        <Link className="inline-flex w-fit items-center gap-3" href="/">
          <Image
            alt="Osonflow"
            className="h-10 w-auto brightness-0 invert"
            height={44}
            priority
            src="/logo.svg"
            width={72}
          />
          <span className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-white">
            Osonflow
          </span>
        </Link>

        <div className="max-w-md space-y-5">
          <p className="auth-brand-eyebrow text-xs font-semibold tracking-[0.22em] text-white/55 uppercase">
            Customer support, reimagined
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-[clamp(2rem,3.4vw,3.25rem)] leading-[1.05] font-semibold tracking-tight text-white">
            Every conversation,
            <span className="auth-brand-accent block">beautifully unified.</span>
          </h1>
          <p className="max-w-sm text-base leading-relaxed text-white/68">
            Join teams who replaced scattered tools with one elegant support layer.
          </p>
        </div>

        <ul className="max-w-md space-y-4">
          {highlights.map((item) => (
            <li
              className="auth-brand-card flex gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md"
              key={item.title}
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                <item.icon className="size-[1.1rem]" strokeWidth={1.75} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-sm leading-relaxed text-white/60">{item.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative z-10 flex items-center justify-between gap-4 border-t border-white/10 px-10 py-6 xl:px-14">
        <p className="text-sm text-white/45">Trusted by modern support teams</p>
        <Link
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-white/80 transition-colors hover:text-white"
          href="/"
        >
          Explore product
          <ArrowUpRightIcon className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </aside>
  )
}
