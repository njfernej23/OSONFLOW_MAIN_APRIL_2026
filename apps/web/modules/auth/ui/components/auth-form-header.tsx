import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"

import { marketingPath } from "@/lib/urls"

type AuthFormHeaderProps = {
  eyebrow?: string
  title: string
  description: ReactNode
}

export const AuthFormHeader = ({ eyebrow, title, description }: AuthFormHeaderProps) => {
  return (
    <header className="auth-form-header">
      <Link
        className="auth-mobile-brand lg:hidden"
        href={marketingPath("/")}
        aria-label="Back to Osonflow home"
      >
        <Image
          alt=""
          className="auth-mobile-brand__mark"
          height={28}
          src="/landing/assets/logo-mark.png"
          width={28}
        />
        <span>Osonflow</span>
      </Link>

      {eyebrow ? <p className="auth-eyebrow">{eyebrow}</p> : null}

      <h1 className="auth-title">{title}</h1>
      <p className="auth-description">{description}</p>
    </header>
  )
}
