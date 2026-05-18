import { NextRequest, NextResponse } from "next/server"
import { anthropic, MODEL } from "@/lib/anthropic"

const MAIN_PATHS = [
  "/",
  "/product",
  "/products",
  "/solutions",
  "/platform",
  "/features",
  "/customers",
  "/case-studies",
  "/all-case-studies",
  "/customer-stories",
  "/pricing",
  "/about",
  "/about-us",
  "/company",
]

const BLOG_PATHS = ["/blog", "/resources", "/insights", "/learn", "/content", "/articles"]

type PageResult = { title: string; text: string; links: string[] } | { error: string }

async function fetchPage(url: string, timeoutMs = 10000): Promise<PageResult> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SEPrepBot/1.0)" },
      signal: AbortSignal.timeout(timeoutMs),
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
      .slice(0, 3000)

    const hostname = new URL(url).hostname
    const linkMatches = [...html.matchAll(/href=["']([^"'#?][^"']*?)["']/g)]
    const links = linkMatches
      .map((m) => {
        try { return new URL(m[1], url).toString() } catch { return null }
      })
      .filter((l): l is string => {
        if (!l) return false
        try { return new URL(l).hostname === hostname } catch { return false }
      })
      .slice(0, 40)

    return { title, text, links }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "fetch failed" }
  }
}

// SaaSHub: simple slug-based URL, no category needed, returns 200 for known products
async function fetchSaasHubCompetitors(hostname: string): Promise<string> {
  // Try slug variants: "funnel.io" → "funnel-io", "funnel", "funnel-io" with -io suffix
  const base = hostname.replace(/^www\./, "")
  const slugVariants = [
    base.replace(/\./g, "-"),                          // funnel.io → funnel-io
    base.replace(/\.[^.]+$/, ""),                      // funnel.io → funnel
    base.replace(/\.[^.]+$/, "") + "-io",              // funnel → funnel-io (if not already)
  ].filter((s, i, arr) => arr.indexOf(s) === i)

  for (const slug of slugVariants) {
    try {
      const url = `https://www.saashub.com/${slug}-alternatives`
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
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
        .slice(0, 5000)
      if (text.toLowerCase().includes("alternative") || text.toLowerCase().includes("similar")) {
        return text
      }
    } catch {
      continue
    }
  }
  return ""
}

function collectLinks(results: readonly (readonly [string, PageResult])[]): string[] {
  const links = new Set<string>()
  for (const [, result] of results) {
    if ("links" in result) result.links.forEach((l) => links.add(l))
  }
  return [...links]
}

function isCaseStudyLink(url: string): boolean {
  return /case-stud|customer-stor|success-stor|client-stor/.test(url.toLowerCase())
}

// Competitor content: "vs" pages, comparison pages, alternatives pages, and blog posts
function isCompetitorBlogLink(url: string): boolean {
  const lower = url.toLowerCase()
  // Explicit vs/compare/alternative pages anywhere on the site (e.g. /funnel-vs-supermetrics, /vs/supermetrics, /compare/)
  if (/\/vs[/-]|[/-]vs\/|[/-]vs-|-vs$|\bcompare\b|\/alternat/.test(lower)) return true
  // Blog/resource articles about comparisons or best-of lists
  if (/\/blog\/|\/resources\/|\/insights\/|\/articles\//.test(lower) &&
    /\bvs\b|alternat|compari|best[-_\s]\d*[-_\s]?\w+[-_\s]tool|top[-_\s]\d|review/.test(lower)) return true
  return false
}

export async function POST(req: NextRequest) {
  const { url } = await req.json()

  if (!url || !url.startsWith("https://")) {
    return NextResponse.json({ error: "A valid https:// URL is required." }, { status: 400 })
  }

  const hostname = new URL(url).hostname

  const mainUrls = MAIN_PATHS.map((p) => `https://${hostname}${p}`)
  const blogUrls = BLOG_PATHS.map((p) => `https://${hostname}${p}`)

  // Phase 1 — main pages + blog index + SaaSHub all in parallel
  const [mainResults, blogIndexResults, saashubText] = await Promise.all([
    Promise.all(mainUrls.map(async (u) => [u, await fetchPage(u)] as const)),
    Promise.all(blogUrls.map(async (u) => [u, await fetchPage(u)] as const)),
    fetchSaasHubCompetitors(hostname),
  ])

  const crawlOutput = Object.fromEntries(mainResults)

  // Collect all internal links from main pages + blog index
  const allLinks = collectLinks([...mainResults, ...blogIndexResults])

  const caseStudyLinks = allLinks.filter(isCaseStudyLink)
  const competitorBlogLinks = allLinks.filter(isCompetitorBlogLink)

  // Phase 2 — case study pages + competitor blog posts in parallel
  const [caseStudyPages, competitorBlogPages] = await Promise.all([
    Promise.all(caseStudyLinks.slice(0, 15).map(async (u) => [u, await fetchPage(u)] as const)),
    Promise.all(competitorBlogLinks.slice(0, 5).map(async (u) => [u, await fetchPage(u)] as const)),
  ])

  const caseStudyCrawl = Object.fromEntries(caseStudyPages)
  const competitorBlogCrawl = Object.fromEntries(competitorBlogPages)
  const blogIndexCrawl = Object.fromEntries(blogIndexResults)

  // Phase 3 — Claude extraction
  const prompt = `You are an expert at extracting structured product information from SaaS marketing site content.

Extract a JSON object from the crawled pages below. Use this exact shape:
{
  "company": "brand/company name",
  "homepage": "${url}",
  "one_line_value": "exact hero tagline from the homepage — quote it verbatim",
  "icp": ["specific ICP signals — job titles, team types, industries, company sizes explicitly mentioned"],
  "pricing_tiers": [
    { "name": "exact tier name", "summary": "one sentence including price if shown" }
  ],
  "named_customers": ["every named brand, logo, testimonial source, or case study customer found anywhere in the crawl"],
  "case_studies": [
    {
      "title": "Customer + Company",
      "url": "exact full URL from the crawl",
      "customer": "company name",
      "industry": "industry vertical",
      "headline_pain": "one sentence — problem before using the product",
      "summary": "one sentence — key result, prefer a specific metric"
    }
  ],
  "competitor_mentions": ["all named competitor/alternative products from any source — product site, SaaSHub, vs pages, blog posts"],
  "crawled_at": "${new Date().toISOString()}"
}

RULES:
- Never invent. Missing fields → null or [].
- one_line_value: exact words from the page, not a paraphrase.
- pricing_tiers: extract EVERY tier — Starter, Business, Enterprise, Free, Pro, etc. Do not skip any.
- named_customers: be thorough — include every brand name mentioned in testimonials, logos, case studies, or customer lists across all pages.
- case_studies: only include if you have both a real URL and real customer name in the crawl output. Do not synthesise.
- competitor_mentions: extract named competitors from (a) the product site, (b) the GetApp page, and (c) blog posts comparing this product to others. Include everything — deduplicate and normalise names.

---
MAIN SITE PAGES:
${JSON.stringify(crawlOutput, null, 2)}

---
CASE STUDY PAGES:
${JSON.stringify(caseStudyCrawl, null, 2)}

---
BLOG INDEX PAGES:
${JSON.stringify(blogIndexCrawl, null, 2)}

---
COMPETITOR BLOG POSTS (vs / alternatives / best-X-tools articles):
${Object.keys(competitorBlogCrawl).length > 0 ? JSON.stringify(competitorBlogCrawl, null, 2) : "None found."}

---
SAASHUB ALTERNATIVES PAGE:
${saashubText || "Not found — SaaSHub may not list this product yet."}

Return ONLY valid JSON. No prose, no markdown fences.`

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  })

  const raw = message.content[0].type === "text" ? message.content[0].text : ""

  let extracted
  try {
    extracted = JSON.parse(raw)
  } catch {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]+?)```/)
    if (fenced) {
      extracted = JSON.parse(fenced[1])
    } else {
      return NextResponse.json({ error: "Failed to parse extracted data." }, { status: 500 })
    }
  }

  return NextResponse.json({ extracted })
}
