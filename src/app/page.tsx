import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default async function LandingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect("/dashboard")

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-10 bg-[#0A192F]">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-semibold text-lg tracking-tight text-white">
            <span className="text-[#1ED760]">SE</span> Prep
          </span>
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "border-white/30 text-white bg-transparent hover:bg-white/10 hover:text-white"
            )}
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 pt-24 pb-20 text-center">
        <h1 className="text-5xl font-bold tracking-tight leading-tight text-[#0A192F]">
          Prep for any discovery call.
          <br />
          In minutes.
        </h1>
        <p className="mt-6 text-xl text-gray-500 leading-relaxed max-w-2xl mx-auto">
          Paste your product URL and discovery notes. SE Prep generates your
          MEDDPICC scorecard, matched case studies, and follow-up email —
          instantly.
        </p>
        <div className="mt-10">
          <Link href="/login" className={cn(buttonVariants({ size: "lg" }))}>
            Get started free
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-[#F4F7F6] py-20">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-12 text-[#0A192F]">How it works</h2>
          <div className="grid md:grid-cols-3 gap-10">
            {STEPS.map((step, i) => (
              <div key={i} className="space-y-3">
                <div className="w-8 h-8 rounded-full bg-[#1ED760] text-[#0A192F] text-sm font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                <h3 className="font-semibold text-[#0A192F]">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="py-20 bg-background">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-12 text-[#0A192F]">
            What you get
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {OUTPUTS.map((output, i) => (
              <div
                key={i}
                className="rounded-xl border-l-4 border-l-[#1ED760] border border-border bg-card p-6 space-y-2 shadow-sm"
              >
                <p className="font-semibold text-[#0A192F]">{output.title}</p>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {output.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-[#0A192F] py-20 text-center">
        <div className="max-w-xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-white">
            Stop winging your discovery calls.
          </h2>
          <p className="mt-3 text-white/60">
            Set up in under a minute. Free to use.
          </p>
          <div className="mt-8">
            <Link href="/login" className={cn(buttonVariants({ size: "lg" }))}>
              Get started free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center bg-background">
        <p className="text-xs text-gray-400">
          SE Prep · Built for Solutions Engineers ·{" "}
          <Link href="/privacy" className="underline hover:text-gray-600">
            Privacy policy
          </Link>
        </p>
      </footer>
    </div>
  )
}

const STEPS = [
  {
    title: "Set up your product once",
    body: "Enter your product homepage. We crawl it and extract your value prop, pricing, ICP signals, case studies, and competitors.",
  },
  {
    title: "Drop in your discovery notes",
    body: "After any call, paste raw notes — transcript, bullets, anything. No structure needed.",
  },
  {
    title: "Get your full prep brief",
    body: "Instant MEDDPICC scoring with verbatim evidence, ranked case study matches, and a ready-to-send follow-up email.",
  },
]

const OUTPUTS = [
  {
    title: "MEDDPICC scorecard",
    body: "Each element scored 0–3 with evidence cited from your own words and specific questions to close the gaps.",
  },
  {
    title: "Matched case studies",
    body: "Top 3 case studies from your library, ranked by relevance to this prospect's situation with reasoning.",
  },
  {
    title: "Follow-up email",
    body: "Drafted using the prospect's actual language and your strongest proof point. Ready to personalize and send.",
  },
]
