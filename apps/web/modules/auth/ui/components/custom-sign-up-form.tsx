"use client"

import { useSignUp } from "@clerk/nextjs"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@workspace/ui/components/input-otp"
import { Spinner } from "@workspace/ui/components/spinner"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

import { finalizeAuthSession } from "@/modules/auth/lib/finalize-auth"
import { AuthDivider } from "./auth-divider"
import { AuthSocialButtons } from "./auth-social-buttons"

type SignUpStep = "details" | "verify"

export const CustomSignUpForm = () => {
  const { signUp, errors, fetchStatus } = useSignUp()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get("redirect_url") ?? "/org-selection"

  const [step, setStep] = useState<SignUpStep>("details")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [verificationCode, setVerificationCode] = useState("")

  const isLoading = fetchStatus === "fetching"

  const completeSignUp = async () => {
    if (!signUp) return
    await finalizeAuthSession(signUp, router, redirectUrl)
  }

  const handleDetails = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!signUp) return

    await signUp.password({
      emailAddress: email,
      password,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
    })

    if (signUp.isTransferable) {
      return
    }

    if (
      signUp.status === "missing_requirements" &&
      signUp.unverifiedFields.includes("email_address")
    ) {
      await signUp.verifications.sendEmailCode()
      setStep("verify")
      return
    }

    await completeSignUp()
  }

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!signUp) return

    await signUp.verifications.verifyEmailCode({ code: verificationCode })
    await completeSignUp()
  }

  if (signUp?.isTransferable) {
    return (
      <div className="auth-form-stack">
        <header className="space-y-2 text-center lg:text-left">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            You already have an account
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            This email is already registered. Sign in instead to continue.
          </p>
        </header>

        <Button asChild className="auth-primary-btn h-11 w-full rounded-xl">
          <Link href="/sign-in">Go to sign in</Link>
        </Button>
      </div>
    )
  }

  if (step === "verify") {
    return (
      <div className="auth-form-stack">
        <header className="space-y-2 text-center lg:text-left">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Verify your email
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>.
          </p>
        </header>

        <form className="space-y-5" onSubmit={handleVerify}>
          <FieldGroup>
            <Field data-invalid={!!errors?.fields?.code}>
              <FieldLabel htmlFor="verification-code">Verification code</FieldLabel>
              <InputOTP
                id="verification-code"
                maxLength={6}
                onChange={setVerificationCode}
                value={verificationCode}
              >
                <InputOTPGroup className="w-full justify-between">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <InputOTPSlot className="size-11 rounded-xl border-border/90" index={index} key={index} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <FieldError errors={errors?.fields?.code ? [errors.fields.code] : undefined} />
            </Field>
          </FieldGroup>

          <Button
            className="auth-primary-btn h-11 w-full rounded-xl"
            disabled={isLoading || verificationCode.length < 6}
            type="submit"
          >
            {isLoading ? <Spinner /> : "Create account"}
          </Button>

          <button
            className="w-full text-sm text-muted-foreground transition-colors hover:text-foreground"
            disabled={isLoading}
            onClick={() => signUp?.verifications.sendEmailCode()}
            type="button"
          >
            Resend code
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="auth-form-stack">
      <header className="space-y-2 text-center lg:text-left">
        <p className="auth-mobile-logo mb-4 flex items-center justify-center gap-2 lg:hidden">
          <span className="font-[family-name:var(--font-display)] text-xl font-semibold text-[#240029]">
            Osonflow
          </span>
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Create your account
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Start unifying customer conversations in minutes.
        </p>
      </header>

      <AuthSocialButtons mode="sign-up" redirectUrl={redirectUrl} />
      <AuthDivider />

      <form className="space-y-5" onSubmit={handleDetails}>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors?.fields?.firstName}>
              <FieldLabel htmlFor="first-name">First name</FieldLabel>
              <Input
                autoComplete="given-name"
                className="auth-input h-11 rounded-xl"
                id="first-name"
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="Jane"
                value={firstName}
              />
              <FieldError errors={errors?.fields?.firstName ? [errors.fields.firstName] : undefined} />
            </Field>

            <Field data-invalid={!!errors?.fields?.lastName}>
              <FieldLabel htmlFor="last-name">Last name</FieldLabel>
              <Input
                autoComplete="family-name"
                className="auth-input h-11 rounded-xl"
                id="last-name"
                onChange={(event) => setLastName(event.target.value)}
                placeholder="Doe"
                value={lastName}
              />
              <FieldError errors={errors?.fields?.lastName ? [errors.fields.lastName] : undefined} />
            </Field>
          </div>

          <Field data-invalid={!!errors?.fields?.emailAddress}>
            <FieldLabel htmlFor="signup-email">Work email</FieldLabel>
            <Input
              autoComplete="email"
              className="auth-input h-11 rounded-xl"
              id="signup-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              required
              type="email"
              value={email}
            />
            <FieldError errors={errors?.fields?.emailAddress ? [errors.fields.emailAddress] : undefined} />
          </Field>

          <Field data-invalid={!!errors?.fields?.password}>
            <FieldLabel htmlFor="signup-password">Password</FieldLabel>
            <Input
              autoComplete="new-password"
              className="auth-input h-11 rounded-xl"
              id="signup-password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              required
              type="password"
              value={password}
            />
            <FieldError errors={errors?.fields?.password ? [errors.fields.password] : undefined} />
          </Field>
        </FieldGroup>

        {errors?.global?.map((error) => (
          <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive" key={error.message}>
            {error.message}
          </p>
        ))}

        <Button className="auth-primary-btn h-11 w-full rounded-xl" disabled={isLoading} type="submit">
          {isLoading ? <Spinner /> : "Continue"}
        </Button>

        <div id="clerk-captcha" />
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link className="font-semibold text-[#240029] underline-offset-4 hover:underline" href="/sign-in">
          Sign in
        </Link>
      </p>

      <p className="text-center text-xs leading-relaxed text-muted-foreground/80">
        By continuing, you agree to our terms of service and privacy policy.
      </p>
    </div>
  )
}
