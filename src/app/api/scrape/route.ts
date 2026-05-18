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
  "/pricing",
  "/about",
  "/about-us",
  "/company",
]

async function fetchPage(url: string): Promise<{ title: string; text: string; links: string[] } | { error: string }> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SEPrepBot/1.0)" },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return { error: `HTTP ${res.status}` }

    const html = await res.text()

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
    const title = (titleMatch?.[1] || h1Match?.[1] || url).trim()

    // Strip tags and collapse whitespace, cap at 2000 chars
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
      .slice(0, 2000)

    // Extract internal links
    const hostname = new URL(url).hostname
    const linkMatches = [...html.matchAll(/href="([^"]+)"/g)]
    const links = linkMatches
      .map((m) => {
        try {
          return new URL(m[1], url).toString()
        } catch {
          return null
        }
      })
      .filter((l): l is string => !!l && new URL(l).hostname === hostname)
      .slice(0, 20)

    return { title, text, links }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "fetch failed" }
  }
}

export async function POST(req: NextRequest) {
  const { url } = await req.json()

  if (!url || !url.startsWith("https://")) {
    return NextResponse.json({ error: "A valid https:// URL is required." }, { status: 400 })
  }

  const hostname = new URL(url).hostname
  const urls = PATHS.map((p) => `https://${hostname}${p}`)

  // Fetch all pages in parallel
  const results = await Promise.all(
    urls.map(async (u) => [u, await fetchPage(u)] as const)
  )
  const crawlOutput = Object.fromEntries(results)

  // Also fetch /all-case-studies to get individual case study links
  const caseStudiesIndex = await fetchPage(`https://${hostname}/all-case-studies`)
  const caseStudyLinks = "links" in caseStudiesIndex
    ? caseStudiesIndex.links.filter((l) => l.includes("case-stud"))
    : []

  // Fetch up to 12 case study pages
  const caseStudyPages = await Promise.all(
    caseStudyLinks.slice(0, 12).map(async (u) => [u, await fetchPage(u)] as const)
  )
  const caseStudyCrawl = Object.fromEntries(caseStudyPages)

  // Use Claude to extract structured product context
  const prompt = `You are an expert at extracting structured product information from marketing site content.

Given the following crawled pages from ${hostname}, extract a JSON object with this exact shape:
{
  "company": "string",
  "homepage": "${url}",
  "one_line_value": "exact hero tagline from the homepage",
  "icp": ["array of ICP signals — roles, industries, company sizes mentioned"],
  "pricing_tiers": [{ "name": "string", "summary": "one sentence" }],
  "named_customers": ["array of named customer/brand logos or testimonial sources"],
  "case_studies": [
    {
      "title": "Customer + Product",
      "url": "exact URL",
      "customer": "company name",
      "industry": "industry",
      "headline_pain": "one sentence — problem before the product",
      "summary": "one sentence — key result, prefer quoting a specific metric"
    }
  ],
  "competitor_mentions": [],
  "crawled_at": "${new Date().toISOString()}"
}

Rules:
- Never invent. If a field cannot be found, use null or [].
- For one_line_value, use the exact words from the page.
- Only include case studies where you have a real URL and real customer name from the crawl output.
- Leave competitor_mentions as [] — it will be set by the user.

Crawled main pages:
${JSON.stringify(crawlOutput, null, 2)}

Crawled case study pages:
${JSON.stringify(caseStudyCrawl, null, 2)}

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
    // Claude occasionally wraps in fences despite instructions
    const fenced = raw.match(/```(?:json)?\s*([\s\S]+?)```/)
    if (fenced) {
      extracted = JSON.parse(fenced[1])
    } else {
      return NextResponse.json({ error: "Failed to parse extracted data." }, { status: 500 })
    }
  }

  return NextResponse.json({ extracted })
}
