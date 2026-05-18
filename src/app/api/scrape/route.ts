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
  "/success-stories",
  "/stories",
  "/pricing",
  "/about",
  "/about-us",
  "/company",
]

const BLOG_PATHS = ["/blog", "/resources", "/insights", "/learn", "/content", "/articles"]

// Non-standard customer story index paths — companies use all sorts of URL schemes
const CUSTOMER_INDEX_PATHS = [
  "/magazine/articles/customer-stories",
  "/magazine/customers",
  "/magazine",
  "/customers/stories",
  "/resources/customer-stories",
  "/resources/case-studies",
  "/blog/customer-stories",
  "/wins",
  "/testimonials",
]

type PageResult =
  | { title: string; text: string; jsonLd: unknown[]; links: string[] }
  | { error: string }

async function fetchPage(url: string, timeoutMs = 10000): Promise<PageResult> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return { error: `HTTP ${res.status}` }

    const html = await res.text()

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
    const title = (titleMatch?.[1] || h1Match?.[1] || url).trim()

    // Extract JSON-LD structured data — present even on JS-rendered pages
    const jsonLdMatches = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]+?)<\/script>/gi)]
    const jsonLd = jsonLdMatches.map((m) => {
      try { return JSON.parse(m[1].trim()) } catch { return null }
    }).filter(Boolean)

    // Extract meta description as a fallback for text-light pages
    const metaDesc = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)?.[1] || ""
    const ogDesc = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)?.[1] || ""

    const text = (metaDesc || ogDesc ? `${metaDesc} ${ogDesc}\n\n` : "") + html
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
    // Extract links from raw HTML (before script stripping) — RSC/Next.js apps
    // embed hrefs inside script payloads which would be lost after stripping
    const linkMatches = [...html.matchAll(/href=["']([^"'#?][^"']*?)["']/g)]
    const links = [...new Set(
      linkMatches
        .map((m) => {
          try { return new URL(m[1], url).toString() } catch { return null }
        })
        .filter((l): l is string => {
          if (!l) return false
          try { return new URL(l).hostname === hostname } catch { return false }
        })
    )].slice(0, 60)

    return { title, text, jsonLd, links }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "fetch failed" }
  }
}

// Fetch sitemap to discover correct page paths the site actually uses
async function fetchSitemap(hostname: string): Promise<string> {
  for (const path of ["/sitemap.xml", "/sitemap_index.xml", "/sitemap"]) {
    try {
      const res = await fetch(`https://${hostname}${path}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) continue
      const text = await res.text()
      if (!text.includes("<loc>")) continue
      // Return URLs relevant to pricing, customers, case studies, blog
      const locs = [...text.matchAll(/<loc>([^<]+)<\/loc>/g)]
        .map((m) => m[1])
        .filter((u) => /pric|customer|case|success|story|testimonial|blog|resource|insight|learn|about|compan/.test(u.toLowerCase()))
        .slice(0, 40)
      return locs.join("\n")
    } catch {
      continue
    }
  }
  return ""
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
  return /case-stud|customer-stor|success-stor|client-stor|customer-story|-customer-story|\/magazine\/[^/]+-story/.test(url.toLowerCase())
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

  const customerIndexUrls = CUSTOMER_INDEX_PATHS.map((p) => `https://${hostname}${p}`)

  // Phase 1 — main pages + blog index + customer story indexes + SaaSHub + sitemap all in parallel
  const [mainResults, blogIndexResults, customerIndexResults, saashubText, sitemapText] = await Promise.all([
    Promise.all(mainUrls.map(async (u) => [u, await fetchPage(u)] as const)),
    Promise.all(blogUrls.map(async (u) => [u, await fetchPage(u)] as const)),
    Promise.all(customerIndexUrls.map(async (u) => [u, await fetchPage(u)] as const)),
    fetchSaasHubCompetitors(hostname),
    fetchSitemap(hostname),
  ])

  const crawlOutput = Object.fromEntries(mainResults)

  // Collect all internal links from main pages + blog index + customer indexes + sitemap
  const allLinks = collectLinks([...mainResults, ...blogIndexResults, ...customerIndexResults])
  const sitemapLinks = sitemapText.split("\n").filter(Boolean)

  const caseStudyLinks = [...new Set([
    ...allLinks.filter(isCaseStudyLink),
    ...sitemapLinks.filter(isCaseStudyLink),
  ])]
  const competitorBlogLinks = [...new Set([
    ...allLinks.filter(isCompetitorBlogLink),
    ...sitemapLinks.filter(isCompetitorBlogLink),
  ])]

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
- pricing_tiers: check the jsonLd arrays first (look for OfferCatalog, Offer, or Product schema types) — this is the most reliable source for JS-rendered sites. Then check pricing page text. Extract EVERY tier including any Free plan.
- named_customers: check jsonLd (mentions of org/company names in FAQPage answers, testimonials etc.), then text. Include every brand cited as a customer or user anywhere in the crawl.
- case_studies: only include if you have a real URL and real customer name in the crawl. Do not synthesise.
- competitor_mentions: extract from (a) the product site text, (b) SaaSHub, (c) vs/comparison/alternative pages, (d) blog posts. Deduplicate and normalise.

---
MAIN SITE PAGES (includes jsonLd structured data per page):
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

---
SITEMAP URLS (use to understand what pages exist — esp. for case studies and pricing):
${sitemapText || "Not available."}

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
