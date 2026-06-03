"use client"

import Link from "next/link"
import {
  CheckIcon,
  CreditCardIcon,
  ExternalLinkIcon,
  SparklesIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

const proFeatures = [
  "AI voice support and premium integrations",
  "Knowledge base files and website training",
  "Customer memory and analytics",
  "Team-ready organization billing",
]

export const PricingTable = () => {
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Free workspace</CardTitle>
          <CardDescription>
            Keep building with the core support inbox and widget.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-3xl font-semibold">$0</div>
          <p className="text-sm text-muted-foreground">
            Your workspace can stay on the free plan until you need premium AI
            features.
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-lg border-primary/35">
        <CardHeader>
          <div className="flex items-center gap-2 text-primary">
            <SparklesIcon className="size-4" />
            <span className="text-sm font-medium">Recommended</span>
          </div>
          <CardTitle>Pro</CardTitle>
          <CardDescription>
            Upgrade through Polar. Polar handles checkout, tax, receipts, and
            subscription management.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <span className="text-3xl font-semibold">$29.99</span>
            <span className="text-sm text-muted-foreground"> / month</span>
          </div>
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
          <Button asChild className="w-full sm:flex-1">
            <Link href="/api/polar/checkout">
              <CreditCardIcon className="size-4" />
              Upgrade with Polar
            </Link>
          </Button>
          <Button asChild className="w-full sm:flex-1" variant="outline">
            <Link href="/api/polar/portal">
              <ExternalLinkIcon className="size-4" />
              Manage billing
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
