export const AuthDivider = ({ label = "or continue with email" }: { label?: string }) => {
  return (
    <div className="auth-divider" role="separator">
      <span className="auth-divider__line" />
      <span className="auth-divider__label">{label}</span>
      <span className="auth-divider__line" />
    </div>
  )
}
