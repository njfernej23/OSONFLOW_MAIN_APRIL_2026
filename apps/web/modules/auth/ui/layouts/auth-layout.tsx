import { AuthBrandPanel } from "@/modules/auth/ui/components/auth-brand-panel"
import { LanguageSwitcher } from "@/components/i18n/language-switcher"

export const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="auth-page light min-h-svh lg:grid lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
      <AuthBrandPanel />

      <div className="auth-form-side relative flex min-h-svh flex-col">
        <div className="auth-form-ambient pointer-events-none absolute inset-0" aria-hidden />

        <div className="relative z-20 flex items-center justify-end px-5 pt-5 sm:px-8 lg:px-10">
          <LanguageSwitcher className="auth-lang-switch" compact />
        </div>

        <div className="relative z-10 flex flex-1 items-center justify-center px-5 pb-10 pt-2 sm:px-8 lg:px-10 lg:pb-12">
          <div className="auth-form-shell w-full max-w-[27rem]">
            <div className="auth-form-card">{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
