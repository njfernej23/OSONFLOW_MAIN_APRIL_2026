import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Page not found",
  description:
    "That page does not exist. Head back to the Osonflow homepage or jump straight to the product, pricing, or integrations pages.",
  robots: { index: false, follow: true },
}

// Kept deliberately self-contained: this renders for unmatched routes on both
// the marketing host and the app host, so it cannot assume the marketing nav's
// data or an authenticated session.
const DESTINATIONS = [
  { href: "/", label: "Homepage", hint: "AI support that knows your business" },
  { href: "/#pricing", label: "Pricing", hint: "Plans and what each one includes" },
  { href: "/#experience", label: "Live demo", hint: "Try the assistant in your browser" },
  { href: "/#faq", label: "FAQ", hint: "What teams ask before going live" },
]

export default function NotFound() {
  return (
    <main
      className="flex min-h-screen items-center bg-[#080b0f] px-5 py-20 text-[#f8f3ea] sm:px-8"
      id="main"
    >
      <div className="mx-auto w-full max-w-3xl">
        <p className="text-sm font-bold tracking-wide text-[#b7ff5a]">
          Error 404
        </p>
        <h1 className="mt-4 text-[2.4rem] leading-[1.05] font-bold [text-wrap:balance] sm:text-6xl">
          We could not find that page.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 [text-wrap:pretty] text-[#c9c0b7]">
          The link may be out of date, or the address may have a typo. Everything
          below still works.
        </p>

        <ul className="mt-10 grid gap-px overflow-hidden rounded-[10px] border border-white/10 bg-white/10 sm:grid-cols-2">
          {DESTINATIONS.map(({ href, label, hint }) => (
            <li key={href}>
              <Link
                className="block h-full bg-[#0d1218] p-5 transition-colors hover:bg-[#141b24] focus-visible:bg-[#141b24]"
                href={href}
              >
                <span className="text-base font-bold text-[#f8f3ea]">
                  {label}
                </span>
                <span className="mt-1 block text-sm leading-6 text-[#8d98a8]">
                  {hint}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-sm leading-6 text-[#8d98a8]">
          Still stuck? Email{" "}
          <a
            className="font-bold text-[#f8f3ea] underline underline-offset-4 hover:text-[#b7ff5a]"
            href="mailto:support@osonflow.uz"
          >
            support@osonflow.uz
          </a>{" "}
          and we will point you the right way.
        </p>
      </div>
    </main>
  )
}
