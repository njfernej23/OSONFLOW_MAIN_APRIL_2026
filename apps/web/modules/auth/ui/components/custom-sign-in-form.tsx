"use client"

import { useSignIn } from "@clerk/nextjs"
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

type SignInStep = "credentials" | "mfa" | "forgot" | "reset-code" | "new-password"

export const CustomSignInForm = () => {
  const { signIn, errors, fetchStatus } = useSignIn()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get("redirect_url") ?? "/analytics"

  const [step, setStep] = useState<SignInStep>("credentials")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mfaCode, setMfaCode] = useState("")
  const [resetCode, setResetCode] = useState("")
  const [newPassword, setNewPassword] = useState("")

  const isLoading = fetchStatus === "fetching"

  const completeSignIn = async () => {
    if (!signIn) return
    await finalizeAuthSession(signIn, router, redirectUrl)
  }

  const handleCredentials = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!signIn) return

    await signIn.password({ emailAddress: email, password })

    if (signIn.status === "needs_second_factor" || signIn.status === "needs_client_trust") {
      const hasPhone = signIn.supportedSecondFactors?.some(
        (factor) => factor.strategy === "phone_code"
      )
      if (hasPhone) {
        await signIn.mfa.sendPhoneCode()
      } else {
        await signIn.mfa.sendEmailCode()
      }
      setStep("mfa")
      return
    }

    await completeSignIn()
  }

  const handleMfa = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!signIn) return

    const factors = signIn.supportedSecondFactors ?? []
    const hasTotp = factors.some((factor) => factor.strategy === "totp")

    if (hasTotp) {
      await signIn.mfa.verifyTOTP({ code: mfaCode })
    } else {
      const hasPhone = factors.some((factor) => factor.strategy === "phone_code")
      if (hasPhone) {
        await signIn.mfa.verifyPhoneCode({ code: mfaCode })
      } else {
        await signIn.mfa.verifyEmailCode({ code: mfaCode })
      }
    }

    await completeSignIn()
  }

  const handleForgotPassword = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!signIn) return

    await signIn.create({ identifier: email })
    await signIn.resetPasswordEmailCode.sendCode()
    setStep("reset-code")
  }

  const handleVerifyResetCode = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!signIn) return

    await signIn.resetPasswordEmailCode.verifyCode({ code: resetCode })
    setStep("new-password")
  }

  const handleNewPassword = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!signIn) return

    await signIn.resetPasswordEmailCode.submitPassword({ password: newPassword })
    await completeSignIn()
  }

  if (step === "mfa") {
    return (
      <div className="auth-form-stack">
        <header className="space-y-2 text-center lg:text-left">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Verify it&apos;s you
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Enter the verification code we sent to continue signing in.
          </p>
        </header>

        <form className="space-y-5" onSubmit={handleMfa}>
          <FieldGroup>
            <Field data-invalid={!!errors?.fields?.code}>
              <FieldLabel htmlFor="mfa-code">Verification code</FieldLabel>
              <InputOTP
                id="mfa-code"
                maxLength={6}
                onChange={setMfaCode}
                value={mfaCode}
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

          <Button className="auth-primary-btn h-11 w-full rounded-xl" disabled={isLoading || mfaCode.length < 6} type="submit">
            {isLoading ? <Spinner /> : "Verify and continue"}
          </Button>

          <button
            className="w-full text-sm text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => {
              signIn?.reset()
              setStep("credentials")
              setMfaCode("")
            }}
            type="button"
          >
            Back to sign in
          </button>
        </form>
      </div>
    )
  }

  if (step === "forgot") {
    return (
      <div className="auth-form-stack">
        <header className="space-y-2 text-center lg:text-left">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Reset your password
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We&apos;ll email you a code to choose a new password.
          </p>
        </header>

        <form className="space-y-5" onSubmit={handleForgotPassword}>
          <FieldGroup>
            <Field data-invalid={!!errors?.fields?.identifier}>
              <FieldLabel htmlFor="reset-email">Email</FieldLabel>
              <Input
                autoComplete="email"
                className="auth-input h-11 rounded-xl"
                id="reset-email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                required
                type="email"
                value={email}
              />
              <FieldError errors={errors?.fields?.identifier ? [errors.fields.identifier] : undefined} />
            </Field>
          </FieldGroup>

          <Button className="auth-primary-btn h-11 w-full rounded-xl" disabled={isLoading || !email} type="submit">
            {isLoading ? <Spinner /> : "Send reset code"}
          </Button>

          <button
            className="w-full text-sm text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setStep("credentials")}
            type="button"
          >
            Back to sign in
          </button>
        </form>
      </div>
    )
  }

  if (step === "reset-code") {
    return (
      <div className="auth-form-stack">
        <header className="space-y-2 text-center lg:text-left">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Check your inbox
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Enter the 6-digit code we sent to <span className="font-medium text-foreground">{email}</span>.
          </p>
        </header>

        <form className="space-y-5" onSubmit={handleVerifyResetCode}>
          <FieldGroup>
            <Field data-invalid={!!errors?.fields?.code}>
              <FieldLabel htmlFor="reset-code">Reset code</FieldLabel>
              <InputOTP
                id="reset-code"
                maxLength={6}
                onChange={setResetCode}
                value={resetCode}
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

          <Button className="auth-primary-btn h-11 w-full rounded-xl" disabled={isLoading || resetCode.length < 6} type="submit">
            {isLoading ? <Spinner /> : "Continue"}
          </Button>
        </form>
      </div>
    )
  }

  if (step === "new-password") {
    return (
      <div className="auth-form-stack">
        <header className="space-y-2 text-center lg:text-left">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Choose a new password
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Use at least 8 characters with a mix of letters and numbers.
          </p>
        </header>

        <form className="space-y-5" onSubmit={handleNewPassword}>
          <FieldGroup>
            <Field data-invalid={!!errors?.fields?.password}>
              <FieldLabel htmlFor="new-password">New password</FieldLabel>
              <Input
                autoComplete="new-password"
                className="auth-input h-11 rounded-xl"
                id="new-password"
                minLength={8}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                type="password"
                value={newPassword}
              />
              <FieldError errors={errors?.fields?.password ? [errors.fields.password] : undefined} />
            </Field>
          </FieldGroup>

          <Button className="auth-primary-btn h-11 w-full rounded-xl" disabled={isLoading || newPassword.length < 8} type="submit">
            {isLoading ? <Spinner /> : "Update password"}
          </Button>
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
          Welcome back
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Sign in to your workspace and pick up where you left off.
        </p>
      </header>

      <AuthSocialButtons mode="sign-in" redirectUrl={redirectUrl} />
      <AuthDivider />

      <form className="space-y-5" onSubmit={handleCredentials}>
        <FieldGroup>
          <Field data-invalid={!!errors?.fields?.identifier}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              autoComplete="email"
              className="auth-input h-11 rounded-xl"
              id="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              required
              type="email"
              value={email}
            />
            <FieldError errors={errors?.fields?.identifier ? [errors.fields.identifier] : undefined} />
          </Field>

          <Field data-invalid={!!errors?.fields?.password}>
            <div className="flex items-center justify-between gap-3">
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <button
                className="text-xs font-medium text-[#635bff] transition-colors hover:text-[#4f48d9]"
                onClick={() => setStep("forgot")}
                type="button"
              >
                Forgot password?
              </button>
            </div>
            <Input
              autoComplete="current-password"
              className="auth-input h-11 rounded-xl"
              id="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
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
          {isLoading ? <Spinner /> : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link className="font-semibold text-[#240029] underline-offset-4 hover:underline" href="/sign-up">
          Create one
        </Link>
      </p>
    </div>
  )
}
