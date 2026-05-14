import { type CSSProperties } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { XIcon } from "lucide-react"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@workspace/ui/components/form"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { useMutation } from "convex/react"
import { api } from "@workspace/backend/_generated/api"
import { Doc } from "@workspace/backend/_generated/dataModel"
import {
  contactSessionIdAtomFamily,
  organizationIdAtom,
  screenAtom,
  widgetSettingsAtom,
} from "../../atoms/widget-atoms"
import { useSetAtom, useAtomValue } from "jotai"
import { mergeWidgetTheme } from "@workspace/ui/lib/widget-customization"

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
})

const toCssImageUrl = (url: string) => url.replaceAll('"', "%22")

export const WidgetAuthScreen = () => {
  const setScreen = useSetAtom(screenAtom)
  const organizationId = useAtomValue(organizationIdAtom)
  const widgetSettings = useAtomValue(widgetSettingsAtom)
  const theme = mergeWidgetTheme(widgetSettings?.theme)
  const setContactSessionsId = useSetAtom(
    contactSessionIdAtomFamily(organizationId || "")
  )
  const createContactSession = useMutation(api.public.contactSessions.create)

  const backgroundImageUrl = theme.backgroundImageUrl.trim()
  const headerStyle: CSSProperties = {
    backgroundColor: theme.headerGradientEnd,
    backgroundImage: backgroundImageUrl
      ? `linear-gradient(180deg, rgba(17, 24, 39, 0.34), rgba(17, 24, 39, 0.78)), url("${toCssImageUrl(backgroundImageUrl)}")`
      : `linear-gradient(135deg, ${theme.headerGradientStart}, ${theme.headerGradientEnd})`,
    backgroundPosition: "center",
    backgroundSize: "cover",
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  })

  const closeWidget = () => {
    window.parent?.postMessage({ type: "close" }, "*")
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!organizationId) {
      return
    }
    const metadata: Doc<"contactSessions">["metadata"] = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: navigator.languages?.join(","),
      platform: navigator.platform,
      vendor: navigator.vendor,
      screenResolution: `${screen.width}x${screen.height}`,
      viewportSize: `${window.innerWidth}x${innerHeight}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      cookieEnabled: navigator.cookieEnabled,
      referrer: document.referrer || "direct",
      currentUrl: window.location.href,
    }

    const contactSessionId = await createContactSession({
      ...values,
      organizationId,
      metadata,
    })

    setContactSessionsId(contactSessionId)
    setScreen("selection")
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[250px]"
        style={headerStyle}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_34%)]" />
      </div>
      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
        <section className="relative flex min-h-[230px] flex-col overflow-hidden px-6 pt-6 pb-8 text-white">
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              {theme.logoUrl ? (
                <img
                  alt="Assistant logo"
                  className="size-10 rounded-full bg-white/92 object-contain p-1.5 shadow-sm"
                  src={theme.logoUrl}
                />
              ) : (
                <p className="max-w-[8rem] truncate rounded-full bg-white/16 px-3 py-2 text-sm font-extrabold tracking-tight">
                  {theme.assistantName}
                </p>
              )}
            </div>
            <Button
              aria-label="Close widget"
              className="size-9 shrink-0 rounded-full text-white hover:bg-white/12 hover:text-white"
              onClick={closeWidget}
              size="icon"
              type="button"
              variant="transparent"
            >
              <XIcon className="size-5" />
            </Button>
          </div>

          <div className="relative mt-12 max-w-[16rem]">
            <p className="text-2xl font-bold tracking-tight text-white/68">
              Hi there <span className="text-xl">👋</span>
            </p>
            <h1 className="mt-1 text-3xl leading-[1.08] font-extrabold tracking-tight">
              Let me know how we can help!
            </h1>
          </div>
        </section>

        <Form {...form}>
          <form
            className="flex min-h-0 flex-1 flex-col gap-y-4 bg-background p-4"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      className="h-10 rounded-full bg-background text-sm"
                      placeholder="zyzz mukh"
                      type="text"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      className="h-10 rounded-full bg-background text-sm"
                      placeholder="your@email.com"
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              className="mt-auto h-10 rounded-full text-sm font-semibold"
              type="submit"
            >
              Get Started
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
}
