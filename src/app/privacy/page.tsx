import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const metadata = {
  title: "Privacy Policy — SE Prep",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-semibold text-lg tracking-tight">
            SE Prep
          </Link>
          <Link href="/login" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Sign in
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-gray-500 mt-2 text-sm">Last updated: May 2026</p>
        </div>

        <Section title="Who we are">
          <p>
            SE Prep is a tool for Solutions Engineers to prepare for discovery and demo calls.
            It is operated by Will Terry. If you have any questions about this policy or your
            data, contact{" "}
            <a href="mailto:will@seagent.co.uk" className="underline">
              will@seagent.co.uk
            </a>
            .
          </p>
        </Section>

        <Section title="What data we hold">
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Email address</strong> — used for sign-in only. We never send marketing
              email.
            </li>
            <li>
              <strong>Product context</strong> — information extracted from your product&apos;s
              website: value proposition, pricing, case studies, and competitor names.
            </li>
            <li>
              <strong>Discovery call notes</strong> — the raw notes or transcripts you paste when
              creating a brief. These may contain prospect names, company details, and sensitive
              commercial information.
            </li>
            <li>
              <strong>Generated briefs</strong> — MEDDPICC scores, matched case studies, and
              follow-up email drafts produced from your notes.
            </li>
          </ul>
        </Section>

        <Section title="How your data is processed">
          <p className="mb-3">
            We use the following third-party services to operate SE Prep. Each is bound by its
            own data processing agreement.
          </p>
          <div className="space-y-4">
            <Processor
              name="Supabase"
              role="Authentication and database"
              detail="Your data is stored in a Supabase-managed PostgreSQL database. Supabase is SOC 2 Type II certified and encrypts data at rest (AES-256) and in transit (TLS). Row-level security ensures each user can only access their own data."
              link="https://supabase.com/privacy"
            />
            <Processor
              name="Vercel"
              role="Hosting and compute"
              detail="SE Prep runs on Vercel's infrastructure. Vercel is SOC 2 Type II certified. Your data passes through Vercel's servers when you use the app but is not persisted there."
              link="https://vercel.com/legal/privacy-policy"
            />
            <Processor
              name="Anthropic"
              role="AI analysis"
              detail="Your discovery call notes and product context are sent to Anthropic's Claude API to generate MEDDPICC scores, case study matches, and follow-up email drafts. Anthropic does not use API inputs or outputs to train its models. Your data is subject to Anthropic's API data retention policy."
              link="https://www.anthropic.com/legal/privacy"
            />
          </div>
        </Section>

        <Section title="The important point about AI processing">
          <p>
            When you generate a brief, your discovery call notes are transmitted to
            Anthropic&apos;s API. This means the text of your notes — which may include prospect
            names, pain points, and deal details — is processed by Anthropic&apos;s servers.
            Anthropic&apos;s API terms state they do not use customer API data to train models,
            but you should be aware this data leaves SE Prep&apos;s infrastructure during
            processing.
          </p>
          <p className="mt-3">
            If your organisation has strict data residency or confidentiality requirements,
            consider anonymising prospect-identifying information before pasting notes.
          </p>
        </Section>

        <Section title="Data retention and your rights">
          <p>
            Your data is retained until you delete it. You can:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-3">
            <li>
              Delete individual briefs from the brief view (this removes the transcript and all
              generated content permanently).
            </li>
            <li>
              Delete your entire account from the dashboard, which removes all briefs, product
              context, and your email address from our systems.
            </li>
            <li>
              Email{" "}
              <a href="mailto:will@seagent.co.uk" className="underline">
                will@seagent.co.uk
              </a>{" "}
              for any data request we can&apos;t fulfil through the app.
            </li>
          </ul>
        </Section>

        <Section title="Cookies and tracking">
          <p>
            SE Prep uses a single session cookie managed by Supabase to keep you signed in. We
            do not use advertising trackers, analytics SDKs, or third-party cookies.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            If we make material changes we will update the date at the top of this page. For
            significant changes affecting how your data is processed, we will notify you by
            email.
          </p>
        </Section>
      </main>

      <footer className="border-t py-6 text-center mt-8">
        <p className="text-xs text-gray-400">SE Prep · Built for Solutions Engineers</p>
      </footer>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="text-gray-600 text-sm leading-relaxed space-y-2">{children}</div>
    </section>
  )
}

function Processor({
  name,
  role,
  detail,
  link,
}: {
  name: string
  role: string
  detail: string
  link: string
}) {
  return (
    <div className="rounded-lg border p-4 space-y-1">
      <div className="flex items-center justify-between">
        <p className="font-medium text-gray-900">{name}</p>
        <span className="text-xs text-gray-400">{role}</span>
      </div>
      <p className="text-sm text-gray-600">{detail}</p>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-600 hover:underline"
      >
        {name} privacy policy →
      </a>
    </div>
  )
}
