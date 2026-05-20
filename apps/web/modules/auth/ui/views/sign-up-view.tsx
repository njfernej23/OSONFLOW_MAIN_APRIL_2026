import { SignUp } from "@clerk/nextjs"

export const SignUpView = () => {
  return <SignUp fallbackRedirectUrl="/" forceRedirectUrl="/" />
}
