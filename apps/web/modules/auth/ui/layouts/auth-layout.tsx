import { LanguageSwitcher } from "@/components/i18n/language-switcher"

export const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center px-4">
      <div className="fixed top-4 right-4 z-20">
        <LanguageSwitcher compact />
      </div>
      {children}
    </div>
  )
}
