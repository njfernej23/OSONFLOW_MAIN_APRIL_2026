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
import { AuthFormHeader } from "./auth-form-header"
import { AuthSocialButtons } from "./auth-social-buttons"

type SignInStep = "credentials" | "mfa" | "forgot" | "reset-code" | "new-password"

const otpSlots = Array.from({ length: 6 }, (_, index) => index)

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
        <AuthFormHeader
          eyebrow="Security check"
          title="Verify it's you"
          description="Enter the verification code we sent to continue signing in."
        />

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
                  {otpSlots.map((index) => (
                    <InputOTPSlot className="auth-otp-slot" index={index} key={index} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <FieldError errors={errors?.fields?.code ? [errors.fields.code] : undefined} />
            </Field>
          </FieldGroup>

          <Button className="auth-primary-btn w-full" disabled={isLoading || mfaCode.length < 6} type="submit">
            {isLoading ? <Spinner /> : "Verify and continue"}
          </Button>

          <button
            className="auth-link-muted w-full"
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
        <AuthFormHeader
          eyebrow="Account recovery"
          title="Reset your password"
          description="We'll email you a code to choose a new password."
        />

        <form className="space-y-5" onSubmit={handleForgotPassword}>
          <FieldGroup>
            <Field data-invalid={!!errors?.fields?.identifier}>
              <FieldLabel htmlFor="reset-email">Email</FieldLabel>
              <Input
                autoComplete="email"
                className="auth-input"
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

          <Button className="auth-primary-btn w-full" disabled={isLoading || !email} type="submit">
            {isLoading ? <Spinner /> : "Send reset code"}
          </Button>

          <button className="auth-link-muted w-full" onClick={() => setStep("credentials")} type="button">
            Back to sign in
          </button>
        </form>
      </div>
    )
  }

  if (step === "reset-code") {
    return (
      <div className="auth-form-stack">
        <AuthFormHeader
          eyebrow="Check your inbox"
          title="Enter your reset code"
          description={
            <>
              We sent a 6-digit code to <span className="font-medium text-[var(--auth-ink)]">{email}</span>.
            </>
          }
        />

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
                  {otpSlots.map((index) => (
                    <InputOTPSlot className="auth-otp-slot" index={index} key={index} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <FieldError errors={errors?.fields?.code ? [errors.fields.code] : undefined} />
            </Field>
          </FieldGroup>

          <Button className="auth-primary-btn w-full" disabled={isLoading || resetCode.length < 6} type="submit">
            {isLoading ? <Spinner /> : "Continue"}
          </Button>
        </form>
      </div>
    )
  }

  if (step === "new-password") {
    return (
      <div className="auth-form-stack">
        <AuthFormHeader
          eyebrow="Almost there"
          title="Choose a new password"
          description="Use at least 8 characters with a mix of letters and numbers."
        />

        <form className="space-y-5" onSubmit={handleNewPassword}>
          <FieldGroup>
            <Field data-invalid={!!errors?.fields?.password}>
              <FieldLabel htmlFor="new-password">New password</FieldLabel>
              <Input
                autoComplete="new-password"
                className="auth-input"
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

          <Button className="auth-primary-btn w-full" disabled={isLoading || newPassword.length < 8} type="submit">
            {isLoading ? <Spinner /> : "Update password"}
          </Button>
        </form>
      </div>
    )
  }

  return (
    <div className="auth-form-stack">
      <AuthFormHeader
        eyebrow="Welcome back"
        title="Sign in to Osonflow"
        description="Pick up where you left off — inbox, AI, and analytics in one workspace."
      />

      <AuthSocialButtons mode="sign-in" redirectUrl={redirectUrl} />
      <AuthDivider />

      <form className="space-y-5" onSubmit={handleCredentials}>
        <FieldGroup>
          <Field data-invalid={!!errors?.fields?.identifier}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              autoComplete="email"
              className="auth-input"
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
              <button className="auth-link text-xs" onClick={() => setStep("forgot")} type="button">
                Forgot password?
              </button>
            </div>
            <Input
              autoComplete="current-password"
              className="auth-input"
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
          <p className="auth-error" key={error.message}>
            {error.message}
          </p>
        ))}

        <Button className="auth-primary-btn w-full" disabled={isLoading} type="submit">
          {isLoading ? <Spinner /> : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-sm text-[var(--auth-ink-soft)]">
        Don&apos;t have an account?{" "}
        <Link className="auth-link" href="/sign-up">
          Create one
        </Link>
      </p>
    </div>
  )
}
