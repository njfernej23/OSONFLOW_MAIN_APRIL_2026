"use client"

import {
  CheckIcon,
  CreditCardIcon,
  ExternalLinkIcon,
  SparklesIcon,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

const proFeatures = [
  "AI voice support and premium integrations",
  "Knowledge base files and website training",
  "Customer memory and analytics",
  "Team-ready organization billing",
]

type SubscriptionState = {
  isActive: boolean
  isPro: boolean
  status: string | null
  provider: string | null
  currentPeriodEnd: number | null
} | undefined

type PricingTableProps = {
  subscription: SubscriptionState
}

const formatRenewalDate = (timestamp: number | null) => {
  if (!timestamp) {
    return null
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp))
}

const formatStatusLabel = (status: string | null) => {
  switch (status) {
    case "active":
      return "Active"
    case "trialing":
      return "Trial"
    case "past_due":
      return "Past due"
    case "canceled":
      return "Canceled"
    default:
      return status ? status.replaceAll("_", " ") : "Inactive"
  }
}

const getStatusVariant = (
  status: string | null
): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "active":
    case "trialing":
      return "default"
    case "past_due":
      return "destructive"
    default:
      return "outline"
  }
}

export const PricingTable = ({ subscription }: PricingTableProps) => {
  if (subscription === undefined) {
    return (
      <div className="grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    )
  }

  const isPro = subscription.isPro
  const renewalDate = formatRenewalDate(subscription.currentPeriodEnd)

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <Card
        className={`rounded-lg transition-opacity ${isPro ? "opacity-70" : ""}`}
      >
        <CardHeader>
          <CardTitle>Free workspace</CardTitle>
          <CardDescription>
            Keep building with the core support inbox and widget.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-3xl font-semibold">$0</div>
          <p className="text-sm text-muted-foreground">
            {isPro
              ? "Core features remain available. Premium AI tools are unlocked on Pro."
              : "Your workspace can stay on the free plan until you need premium AI features."}
          </p>
        </CardContent>
      </Card>

      <Card
        className={`rounded-lg ${
          isPro
            ? "border-primary bg-primary/[0.03] shadow-sm"
            : "border-primary/35"
        }`}
      >
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            {isPro ? (
              <Badge variant="default">Current plan</Badge>
            ) : (
              <div className="flex items-center gap-2 text-primary">
                <SparklesIcon className="size-4" />
                <span className="text-sm font-medium">Recommended</span>
              </div>
            )}
            {isPro && subscription.status ? (
              <Badge variant={getStatusVariant(subscription.status)}>
                {formatStatusLabel(subscription.status)}
              </Badge>
            ) : null}
          </div>
          <CardTitle>Pro</CardTitle>
          <CardDescription>
            {isPro
              ? "Billed through Polar. Update payment details or cancel anytime."
              : "Upgrade through Polar. Polar handles checkout, tax, receipts, and subscription management."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <span className="text-3xl font-semibold">$29.99</span>
            <span className="text-sm text-muted-foreground"> / month</span>
          </div>
          {isPro && renewalDate ? (
            <p className="text-sm text-muted-foreground">
              {subscription.status === "canceled"
                ? `Access ends ${renewalDate}`
                : `Renews on ${renewalDate}`}
            </p>
          ) : null}
          <div className="space-y-2">
            {proFeatures.map((feature) => (
              <div className="flex items-start gap-2 text-sm" key={feature}>
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 sm:flex-row">
          {isPro ? (
            <Button asChild className="w-full">
              <a href="/api/polar/portal">
                <ExternalLinkIcon className="size-4" />
                Manage billing in Polar
              </a>
            </Button>
          ) : (
            <>
              <Button asChild className="w-full sm:flex-1">
                <a href="/api/polar/checkout">
                  <CreditCardIcon className="size-4" />
                  Upgrade with Polar
                </a>
              </Button>
              <Button asChild className="w-full sm:flex-1" variant="outline">
                <a href="/api/polar/portal">
                  <ExternalLinkIcon className="size-4" />
                  Manage billing
                </a>
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
