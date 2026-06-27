import { AuthBrandPanel } from "@/modules/auth/ui/components/auth-brand-panel"
import { LanguageSwitcher } from "@/components/i18n/language-switcher"

export const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="auth-page min-h-svh lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <AuthBrandPanel />

      <div className="relative flex min-h-svh flex-col items-center justify-center bg-[#fcfcfa] px-5 py-10 sm:px-8 lg:px-12">
        <div className="auth-form-glow pointer-events-none absolute inset-0" aria-hidden />

        <div className="fixed top-4 right-4 z-20">
          <LanguageSwitcher compact />
        </div>

        <div className="relative z-10 w-full max-w-[26rem]">
          <div className="auth-form-card rounded-[1.75rem] border border-border/70 bg-white/90 p-6 shadow-[0_28px_80px_-48px_rgba(36,0,41,0.45)] backdrop-blur-sm sm:p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
