import { NextRequest, NextResponse } from "next/server"
import { anthropic, MODEL } from "@/lib/anthropic"

const PATHS = [
  "/",
  "/product",
  "/products",
  "/solutions",
  "/platform",
  "/features",
  "/customers",
  "/case-studies",
  "/all-case-studies",
  "/pricing",
  "/about",
  "/about-us",
  "/company",
]

type PageResult =
  | { title: string; text: string; links: string[] }
  | { error: string }

async function fetchPage(url: string): Promise<PageResult> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SEPrepBot/1.0)" },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return { error: `HTTP ${res.status}` }

    const html = await res.text()

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
    const title = (titleMatch?.[1] || h1Match?.[1] || url).trim()

    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 2500)

    const hostname = new URL(url).hostname
    const linkMatches = [...html.matchAll(/href=["']([^"']+)["']/g)]
    const links = linkMatches
      .map((m) => {
        try {
          return new URL(m[1], url).toString()
        } catch {
          return null
        }
      })
      .filter((l): l is string => !!l && new URL(l).hostname === hostname)
      .slice(0, 30)

    return { title, text, links }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "fetch failed" }
  }
}

async function fetchGetAppCompetitors(companyName: string): Promise<string> {
  const slug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

  const slugsToTry = [slug, slug.replace(/-io$|-hq$|-app$/, "")]

  for (const s of slugsToTry) {
    try {
      const url = `https://www.getapp.com/marketing-software/a/${s}/alternatives/`
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SEPrepBot/1.0)" },
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) continue
      const html = await res.text()
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 3000)
      return text
    } catch {
      continue
    }
  }
  return ""
}

export async function POST(req: NextRequest) {
  const { url } = await req.json()

  if (!url || !url.startsWith("https://")) {
    return NextResponse.json(
      { error: "A valid https:// URL is required." },
      { status: 400 }
    )
  }

  const hostname = new URL(url).hostname
  const urls = PATHS.map((p) => `https://${hostname}${p}`)

  // Crawl main pages
  const results = await Promise.all(
    urls.map(async (u) => [u, await fetchPage(u)] as const)
  )
  const crawlOutput = Object.fromEntries(results)

  // Collect all internal links from every successfully crawled page
  const allInternalLinks = new Set<string>()
  for (const result of Object.values(crawlOutput)) {
    if ("links" in result) {
      result.links.forEach((l) => allInternalLinks.add(l))
    }
  }

  // Find case study links across all crawled pages
  const caseStudyLinks = [...allInternalLinks].filter(
    (l) =>
      l.includes("case-stud") ||
      l.includes("customer-stor") ||
      l.includes("success-stor")
  )

  // Fetch up to 15 individual case study pages
  const caseStudyPages = await Promise.all(
    caseStudyLinks.slice(0, 15).map(async (u) => [u, await fetchPage(u)] as const)
  )
  const caseStudyCrawl = Object.fromEntries(caseStudyPages)

  // Fetch GetApp competitors in parallel with case studies
  const companySlug = hostname.replace(/^www\./, "").split(".")[0]
  const getappText = await fetchGetAppCompetitors(companySlug)

  // Extract structured product context with Claude
  const prompt = `You are an expert at extracting structured product information from marketing site content.

Given the following crawled pages from ${hostname}, extract a JSON object with this exact shape:
{
  "company": "string — the brand/company name",
  "homepage": "${url}",
  "one_line_value": "exact hero tagline or value proposition from the homepage",
  "icp": ["array of ICP signals — roles, industries, company sizes explicitly mentioned"],
  "pricing_tiers": [
    { "name": "tier name", "summary": "one sentence including price if shown" }
  ],
  "named_customers": ["array of named customer/brand logos, quotes, or testimonials"],
  "case_studies": [
    {
      "title": "Customer + Product",
      "url": "exact full URL",
      "customer": "company name",
      "industry": "industry vertical",
      "headline_pain": "one sentence — the problem they had before the product",
      "summary": "one sentence — key result, quote a specific metric if present"
    }
  ],
  "competitor_mentions": ${getappText ? `["extract ALL competitor/alternative product names mentioned on the GetApp page below"]` : "[]"},
  "crawled_at": "${new Date().toISOString()}"
}

IMPORTANT RULES:
- Never invent. If a field cannot be found, use null or [].
- For one_line_value, use the exact words from the page.
- For pricing_tiers, extract EVERY tier shown — do not skip any. Include price if shown.
- For case_studies, only include entries where you have a real URL and real customer name from the crawl. Do not fabricate.
- For competitor_mentions, extract ALL named alternatives from the GetApp page below (ignore generic BI tools unless explicitly listed as alternatives).

Crawled main pages:
${JSON.stringify(crawlOutput, null, 2)}

Crawled case study pages:
${JSON.stringify(caseStudyCrawl, null, 2)}

${getappText ? `GetApp alternatives page content (use this to populate competitor_mentions):
${getappText}` : "No GetApp data available — leave competitor_mentions as []."}

Return ONLY valid JSON. No prose, no markdown fences.`

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  })

  const raw =
    message.content[0].type === "text" ? message.content[0].text : ""

  let extracted
  try {
    extracted = JSON.parse(raw)
  } catch {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]+?)```/)
    if (fenced) {
      extracted = JSON.parse(fenced[1])
    } else {
      return NextResponse.json(
        { error: "Failed to parse extracted data." },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ extracted })
}
