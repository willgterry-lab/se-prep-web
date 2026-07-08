// Pre-computed full prep brief for the Kitwave Group demo -- research plus the
// downstream MEDDPICC/case-study/email/questions/stakeholders output. All of
// it generated for real (see git history for the one-shot fixture-builder
// routes used) against the real Choco product context and the exact AE
// discovery transcript used in the live demo -- not invented data. Serving
// the whole brief from cache (see getDemoCache in research.ts) is what gets a
// live demo under ~20s: research alone still needed ~25s of real, unavoidable
// MEDDPICC/case-study/email generation time downstream once the notes are
// fixed and known in advance, so that gets cached too.
import type { ResolvedCompany, ResearchSections, SourceLogEntry, MeddpiccScore, MatchedCaseStudy, ExtractedStakeholder } from "@/types"

export const KITWAVE_COMPANY: ResolvedCompany = {
  "name": "Kitwave Group plc",
  "domain": "kitwave.co.uk",
  "hq": "North Shields, Tyne & Wear, United Kingdom",
  "description": "A UK-based delivered wholesale business supplying ambient, frozen, chilled, fresh foods, alcohol, and tobacco to retail, foodservice, and wholesale customers across the UK."
}

export const KITWAVE_SECTIONS: ResearchSections = {
  "snapshot": {
    "description": {
      "value": "UK-wide delivered wholesale distributor of ambient, frozen, chilled, and fresh food, drinks, and consumables to independent convenience retailers, foodservice operators, and other wholesalers.",
      "evidence": [
        {
          "text": "Kitwave Group is a delivered wholesale business, serving the Retail, Wholesale and Foodservice Markets across the UK.",
          "origin": "web",
          "source_tier": "company_site",
          "url": "https://www.kitwave.co.uk/",
          "retrieved_at": "2026-03-17"
        },
        {
          "text": "Distributor of food and beverage wholesale products intended for supplying retail, wholesale, and foodservice markets. The company distributes ambient, chilled, frozen, and fresh food items along with beverages, tobacco, and related goods through a nationwide depot and delivery network.",
          "origin": "web",
          "source_tier": "filings",
          "url": "https://pitchbook.com/profiles/company/51749-83"
        }
      ]
    },
    "hq": {
      "value": "North Shields, Tyne & Wear, United Kingdom",
      "evidence": [
        {
          "text": "Unit S3 Narvik Way, Tyne Tunnel Trading Estate, North Shields, Tyne And Wear, United Kingdom, NE29 7XJ",
          "origin": "web",
          "source_tier": "filings",
          "url": "https://find-and-update.company-information.service.gov.uk/company/09892174"
        }
      ]
    },
    "geographies": {
      "value": [
        "United Kingdom"
      ],
      "evidence": [
        {
          "text": "With a network of 37 depots, Kitwave is able to support delivery throughout the UK to a diverse customer base.",
          "origin": "web",
          "source_tier": "company_site",
          "url": "https://www.kitwave.co.uk/kitwave-appoints-new-non-executive-chair/",
          "retrieved_at": "2025-06-02"
        }
      ]
    },
    "size": {
      "value": "Revenue £802.7m (FY2025, 12 months ended 31 Oct 2025); ~2,100 employees",
      "evidence": [
        {
          "text": "Since its founding in 1987, Kitwave has undergone a period of significant growth and transformation achieving revenues of £802.7 million for the 12 month financial period",
          "origin": "web",
          "source_tier": "filings",
          "url": "https://www.investegate.co.uk/announcement/rns/kitwave-group--kitw/recommended-cash-acquisition-of-kitwave-group-plc/9374535",
          "retrieved_at": "2026-01-22"
        },
        {
          "text": "Kitwave Group has 2,100 total employees.",
          "origin": "web",
          "source_tier": "news",
          "url": "https://pitchbook.com/profiles/company/51749-83"
        }
      ]
    },
    "ownership_type": {
      "value": "PE-owned (One Equity Partners, acquired Q1 2026; previously AIM-listed public company)",
      "evidence": [
        {
          "text": "One Equity Partners (\"OEP\"), a middle market private equity firm, today announced that it has acquired Kitwave Group plc (LON:KITW), a wholesale distributor providing food, drinks and other consumables to foodservice and retail customers in the U.K.",
          "origin": "web",
          "source_tier": "news",
          "url": "https://www.oneequity.com/news/one-equity-partners-acquires-kitwave-group/"
        },
        {
          "text": "North East wholesaler Kitwave Group agrees to a £251m all-cash takeover by Kite UK Bidco, backed by OEP Capital Advisers funds.",
          "origin": "web",
          "source_tier": "news",
          "url": "https://www.asiantrader.biz/kitwave-251m-takeover-deal",
          "retrieved_at": "2026-03-05"
        }
      ]
    },
    "business_lines": {
      "value": [
        "Ambient (confectionery, soft drinks, crisps & snacks, tobacco, grocery)",
        "Frozen & Chilled (ice cream, frozen meals, chilled and fresh foods)",
        "Foodservice (frozen, chilled, fresh and ambient food, alcohol and soft drinks to bars, restaurants, leisure outlets)",
        "Retail & Wholesale distribution",
        "Vending products supply"
      ],
      "evidence": [
        {
          "text": "The Company operates through three main product segments: Foodservice, distributing to restaurants, bars, and leisure outlets; Frozen and Chilled, distributing fresh and frozen foods to retail customers; and Ambient, distributing packaged goods, including candy, soft drinks, chips and tobacco to independent convenience stores and grocery chains.",
          "origin": "web",
          "source_tier": "news",
          "url": "https://www.oneequity.com/news/one-equity-partners-acquires-kitwave-group/"
        },
        {
          "text": "We specialise in delivering a wide impulse product portfolio including Ambient, Frozen, Chilled, Fresh Foods, Butchery, Alcohol and Tobacco.",
          "origin": "web",
          "source_tier": "company_site",
          "url": "https://www.kitwave.co.uk/",
          "retrieved_at": "2026-03-17"
        }
      ]
    },
    "customer_segments": {
      "value": [
        "Independent convenience retailers",
        "Foodservice operators (bars, restaurants, leisure outlets)",
        "Vending machine operators",
        "Other wholesalers and national retailers"
      ],
      "evidence": [
        {
          "text": "With a network of 37 depots, Kitwave is able to support delivery throughout the UK to a diverse customer base, which includes independent convenience retailers, leisure outlets, vending machine operators, foodservice providers and other wholesalers, as well as leading national retailers.",
          "origin": "web",
          "source_tier": "filings",
          "url": "https://www.kitwave.co.uk/kitwave-appoints-new-non-executive-chair/",
          "retrieved_at": "2025-06-02"
        },
        {
          "text": "Kitwave is a delivered wholesale business, specialising in selling and delivering impulse products, frozen, chilled and fresh foods, alcohol, groceries and tobacco to approximately 46,000, mainly independent, customers.",
          "origin": "web",
          "source_tier": "filings",
          "url": "https://data.fca.org.uk/artefacts/NSM/RNS/5419804.html"
        }
      ]
    },
    "competitors": {
      "value": [
        "Booker Group (Tesco)",
        "Bestway Wholesale",
        "Bidfood",
        "Brakes (Sysco)",
        "Parfetts"
      ],
      "evidence": [
        {
          "text": "Kitwave Group sits between local independents and vertically integrated majors, competing with Booker, Bestway, Parfetts, Brakes and Bidfood while focusing on service-led value for independents and mid-market foodservice.",
          "origin": "web",
          "source_tier": "news",
          "url": "https://portersfiveforce.com/blogs/how-it-works/kitwave",
          "retrieved_at": "2025-12-03"
        },
        {
          "text": "Booker Group (Tesco) and Bestway Wholesale pressure Kitwave on price and private-label breadth in the wholesale distribution market UK. Brakes (Sysco) and Bidfood compete on logistics scale, global sourcing and digital ordering.",
          "origin": "web",
          "source_tier": "news",
          "url": "https://matrixbcg.com/blogs/competitors/kitwave",
          "retrieved_at": "2026-04-08"
        }
      ]
    }
  },
  "strategic_context": {
    "items": [
      {
        "text": "One Equity Partners (OEP) acquired Kitwave Group plc via a recommended all-cash takeover at £251m (295p per share), taking it private from AIM in Q1 2026, with OEP citing Kitwave's M&A integration track record as the foundation for future buy-and-build growth.",
        "tag": "expansion_move",
        "evidence": {
          "text": "North East wholesaler Kitwave Group agrees to a £251m all-cash takeover by Kite UK Bidco, backed by OEP Capital Advisers funds.",
          "origin": "web",
          "source_tier": "news",
          "url": "https://www.asiantrader.biz/kitwave-251m-takeover-deal",
          "retrieved_at": "2026-03-05"
        }
      },
      {
        "text": "Kitwave acquired Creed Catering Supplies Limited in September 2024 for an initial consideration of £60m (rising to £70m on performance targets), creating a fully national foodservice network and completing the most significant single deal in the group's history.",
        "tag": "expansion_move",
        "evidence": {
          "text": "After acquiring Wilds of Oldham and Total Foodservice Solutions in the first half of the Period, the year culminated with the acquisition of Creed Catering Supplies Limited on 27 September 2024, for an initial consideration of £60 million, rising to £70 million dependent on certain performance targets being achieved over the next two years.",
          "origin": "web",
          "source_tier": "filings",
          "url": "https://data.fca.org.uk/artefacts/NSM/RNS/5419804.html"
        }
      },
      {
        "text": "Dr Marnie Millard OBE appointed as Non-Executive Chair effective 30 May 2025, replacing Steve Smith who resigned; Millard brings FMCG and M&A leadership experience as former CEO of Nichols Plc (Vimto).",
        "tag": "leadership_change",
        "evidence": {
          "text": "Kitwave Group plc (LON: KITW), the delivered wholesale business, announced the appointment of Marnie Millard OBE to its Board as Non-Executive Chair, effective from 30 May 2025, replacing Steve Smith who resigned from the Board.",
          "origin": "web",
          "source_tier": "company_site",
          "url": "https://www.kitwave.co.uk/kitwave-appoints-new-non-executive-chair/",
          "retrieved_at": "2025-06-02"
        }
      },
      {
        "text": "The Group invested in a new state-of-the-art storage and delivery facility in the South West of England (Ugbrooke Business Park, south of Exeter), consolidating three legacy sites (WestCountry and M.J. Baker) into one as part of the Creed/WestCountry integration programme.",
        "tag": "initiative",
        "evidence": {
          "text": "The new South West depot has enabled the Group to consolidate three sites into one as part of the integration of WestCountry and M.J. Baker. The Company believes that the scale and capabilities of the new site will provide both longer-term capacity for growth and the ability to cross-sell by providing the full Kitwave product offering.",
          "origin": "web",
          "source_tier": "filings",
          "url": "https://data.fca.org.uk/artefacts/NSM/RNS/5718362.html",
          "retrieved_at": "2025-07-01"
        }
      },
      {
        "text": "Kitwave's foodservice division joined the Country Range Group (CRG) buying consortium as of 15 July 2024, immediately gaining access to CRG's buying power, data, own-brand portfolio, and marketing campaigns.",
        "tag": "initiative",
        "evidence": {
          "text": "The Country Range Group (CRG) is pleased to announce that the foodservice division of Kitwave Group plc is to join as its newest member as of the 15th July 2024. Kitwave will immediately benefit from the Country Range Group's buying power, analysis, data and insights, the formidable three-tiered, own brand portfolio and wide-ranging marketing campaigns and promotions.",
          "origin": "web",
          "source_tier": "company_site",
          "url": "https://www.kitwave.co.uk/news/",
          "retrieved_at": "2024-07-15"
        }
      },
      {
        "text": "The board flagged that a profit warning was issued in summer 2025 due to a new depot investment, rising employer National Insurance contributions, and lower leisure-sector sales volumes, highlighting margin and cost pressures in the transition to PE ownership.",
        "tag": "risk",
        "evidence": {
          "text": "A profit warning was issued last summer due to extra short-term investment in a new depot, an increase in employer National Insurance contributions and lower sales volumes to the leisure sector.",
          "origin": "web",
          "source_tier": "news",
          "url": "https://www.proactiveinvestors.co.uk/companies/news/1086076/kitwave-jumps-after-agreeing-to-be-taken-private-for-251m-1086076.html",
          "retrieved_at": "2026-01-22"
        }
      }
    ]
  },
  "operating_model": {
    "order_process": {
      "value": "Kitwave operates a multi-channel order capture model explicitly comprising: EDI, an award-winning e-commerce website, app-based ordering, telesales (phone), email ordering, and electronic rep ordering (field sales reps placing orders on behalf of customers). Next-day delivery is available when minimum order thresholds are met (£100 ambient, £150 frozen). Orders are fulfilled from a network of 37 depots using ~650 owned delivery vehicles, fulfilling 4,800–6,500 deliveries per day.",
      "evidence": [
        {
          "text": "We offer a variety of ways to order capture including EDI, an award winning e-Commerce Website, App Sales, Telesales, Email Ordering and Electronic Rep Ordering.",
          "origin": "web",
          "source_tier": "company_site",
          "url": "https://www.kitwave.co.uk/",
          "retrieved_at": "2026-03-17"
        },
        {
          "text": "Kitwave's typical minimum order value is £100 for ambient goods, £150 for frozen",
          "origin": "web",
          "source_tier": "filings",
          "url": "https://sohrapeakcapital.com/wp-content/uploads/2024/05/Sohra_Peak_Capital_Partners_Kitwave_Group_Investment_Memorandum.pdf",
          "retrieved_at": "2024-05-02"
        }
      ]
    },
    "tech_stack": [
      {
        "item": "Akeneo (Product Information Management)",
        "confidence": "medium",
        "evidence": {
          "text": "Kitwave Limited uses 18 technologies like Akeneo, Amazon API Gateway, and Amazon s3.",
          "origin": "web",
          "source_tier": "reviews",
          "url": "https://rocketreach.co/kitwave-limited-technology-stack_b59531d8f9e385d4"
        }
      },
      {
        "item": "AWS (Amazon API Gateway + Amazon S3)",
        "confidence": "medium",
        "evidence": {
          "text": "Kitwave Limited uses 18 technologies like Akeneo, Amazon API Gateway, and Amazon s3.",
          "origin": "web",
          "source_tier": "reviews",
          "url": "https://rocketreach.co/kitwave-limited-technology-stack_b59531d8f9e385d4"
        }
      },
      {
        "item": "Laravel (PHP web framework) - likely underpinning e-commerce ordering platform",
        "confidence": "medium",
        "evidence": {
          "text": "Kitwave Limited uses 18 technologies like Akeneo, Amazon API Gateway, and Amazon s3.",
          "origin": "web",
          "source_tier": "reviews",
          "url": "https://rocketreach.co/kitwave-limited-technology-stack_b59531d8f9e385d4"
        }
      },
      {
        "item": "WordPress / PHP (corporate web presence)",
        "confidence": "medium",
        "evidence": {
          "text": "Some of the popular technologies that Kitwave uses are: WordPress.org, reCAPTCHA, PHP, Google Universal Analytics",
          "origin": "web",
          "source_tier": "reviews",
          "url": "https://www.zoominfo.com/c/kitwave-ltd/357108815"
        }
      },
      {
        "item": "Voice-picking technology (warehouse/fulfilment operations)",
        "confidence": "low",
        "evidence": {
          "text": "Recent investments in technology, such as voice-picking technology and a new Foodservice distribution center, are enhancing operational efficiencies.",
          "origin": "web",
          "source_tier": "news",
          "url": "https://swottemplate.com/blogs/how-it-works/kitwave-how-it-works",
          "retrieved_at": "2025-09-19"
        }
      }
    ],
    "catalogue_pricing_complexity": {
      "value": "Kitwave carries approximately 40,000 SKUs across four temperature/category divisions: Ambient, Frozen & Chilled, Foodservice, and Fresh. The group serves ~46,000 customers spanning convenience retail, vending, leisure, QSR, care homes, and education - each segment likely requiring distinct price lists. Minimum order thresholds differ by product type (£100 ambient, £150 frozen). The buy-and-build acquisition of 15+ businesses over 13 years means multiple legacy catalogues and pricing schemes have been consolidated or are in the process of integration. Over 300 supplier relationships further contribute to pricing complexity via rebate structures.",
      "evidence": [
        {
          "text": "Kitwave Group is a UK wholesale distributor serving 46k+ independent convenience and foodservice outlets with c. 40k SKUs across ambient, chilled, frozen, and foodservice.",
          "origin": "web",
          "source_tier": "news",
          "url": "https://tscsw.substack.com/p/kitwave-group-overview-and-highlights",
          "retrieved_at": "2025-09-10"
        },
        {
          "text": "The company leverages its established brand relationships and scale to negotiate favorable terms and rebates with over 300 suppliers.",
          "origin": "web",
          "source_tier": "news",
          "url": "https://swottemplate.com/blogs/how-it-works/kitwave-how-it-works",
          "retrieved_at": "2025-09-19"
        }
      ]
    },
    "manual_process_evidence": [
      {
        "text": "We offer a variety of ways to order capture including EDI, an award winning e-Commerce Website, App Sales, Telesales, Email Ordering and Electronic Rep Ordering.",
        "origin": "web",
        "source_tier": "company_site",
        "url": "https://www.kitwave.co.uk/",
        "retrieved_at": "2026-03-17"
      },
      {
        "text": "Kitwave's model combines national reach with regional focus, underpinned by a modern logistics infrastructure and increasingly digitalised ordering capabilities.",
        "origin": "web",
        "source_tier": "filings",
        "url": "https://www.investegate.co.uk/announcement/rns/kitwave-group--kitw/recommended-cash-acquisition-of-kitwave-group-plc/9374535",
        "retrieved_at": "2026-01-22"
      },
      {
        "text": "Operational complexity from integrations persists, UK demand stays weak, wage and NI rises weigh on distribution costs, and synergy delivery undershoots, keeping leverage and working capital elevated.",
        "origin": "web",
        "source_tier": "news",
        "url": "https://tscsw.substack.com/p/kitwave-group-overview-and-highlights",
        "retrieved_at": "2025-09-10"
      },
      {
        "text": "15 acquisitions over 13 years, disciplined prices, equity raise and RCF used to fund Creed.",
        "origin": "web",
        "source_tier": "news",
        "url": "https://tscsw.substack.com/p/kitwave-group-overview-and-highlights",
        "retrieved_at": "2025-09-10"
      }
    ]
  },
  "value_drivers": {
    "most_visible_pain_headline": "40+ sales office staff manually keying phone, voicemail, email, and WhatsApp orders into Sanderson Swords every day - peak summer in the South West is eight weeks away and last year's voicemail backlog caused missed next-day cutoffs across Devon and Cornwall.",
    "suggested_demo_angle": "Run a live OrderAgent session against a batch of realistic Kitwave Foodservice inputs - overnight voicemail audio, a WhatsApp photo of a notepad, and a multi-line email - showing each resolving to a Swords-ready order in seconds, without a human touching a keyboard. Close with the multi-site dashboard to frame the ten-depot picture Gemma owns.",
    "hypotheses": [
      {
        "driver_statement": "Automating voicemail, phone, email and WhatsApp order ingestion across 40+ sales office staff will cut cost-to-serve in the division's highest-cost function, directly improving the margin number OEP has asked Marcus Threlfall to deliver.",
        "taxonomy": "lower_cost",
        "evidence": [
          {
            "text": "cost-to-serve in the sales offices came out of it looking worse than anyone expected",
            "origin": "notes"
          },
          {
            "text": "Kitwave continues to pursue operational and commercial synergies from the integration of its Foodservice business to mitigate cost headwinds and provide a platform for future growth",
            "origin": "web",
            "source_tier": "news",
            "url": "https://www.ajbell.co.uk/news/articles/kitwave-accepts-ps250-million-oep-bid-sales-grow-profit-stalls",
            "retrieved_at": "2026-01-22"
          },
          {
            "text": "the impact of the changes to employers NIC and minimum wage announced in the October 2024 budget will add c.£2 million to the Group's annual operating costs",
            "origin": "web",
            "source_tier": "filings",
            "url": "https://www.investegate.co.uk/announcement/rns/kitwave-group--kitw/final-results/8761355",
            "retrieved_at": "2025-03-04"
          }
        ],
        "facts": [
          "Gemma manages 40+ sales office staff across 10 depots who manually key orders into Sanderson Swords.",
          "OEP acquisition completed March 2026; Marcus Threlfall has been given a margin improvement number by new owners.",
          "Group absorbed £2.4m in exceptional restructuring charges in FY2025, up from £100k the prior year, with NIC/wage headwinds adding c.£2m annually."
        ],
        "inferences": [
          "If 40 FTEs spend even 50% of their time on order transcription, labour cost reduction from automation is likely the largest single addressable cost line in the function.",
          "OEP's value creation plan - replacing bi-annual public reporting with monthly PE portfolio reviews - creates a hard quarterly deadline for Gemma to show measurable progress.",
          "Employer NIC and wage cost inflation make reducing headcount dependency in manual processing more urgent than it was under the previous plc structure."
        ],
        "product_mapping": "A dedicated AI platform built for food & beverage wholesalers that automates order processing, drives sales efficiency, and powers modern ecommerce - ingests every inbound channel (voicemail, phone, email, WhatsApp) and pushes clean orders into Swords, eliminating the manual keying step entirely.",
        "confidence": "high",
        "matched_case_study": {
          "url": "https://choco.com/uk/stories/case-studies/fb-the-wholesaler-digitize-every-order-and-unlock-growth",
          "title": "FB the Wholesaler + Choco",
          "customer": "FB the Wholesaler",
          "industry": "Food Wholesale / Distribution",
          "headline_pain": "Orders pouring in from calls, voicemails, texts, and handwritten notes caused constant errors, rescheduled deliveries, and wasted fuel and time.",
          "summary": "Adopting Choco's OrderAgent and eCommerce enabled FB the Wholesaler to digitize every order channel and achieve 250% dairy sales growth.",
          "relevance_reason": "Exact channel mix match - calls, voicemails, texts, and handwritten notes - mirroring Kitwave Foodservice's multi-channel chaos, and the outcome framing (cost + growth) maps directly to what Marcus needs to show OEP.",
          "relevance_score": 9,
          "one_liner": "FB the Wholesaler unified calls, voicemails, texts and handwritten notes through Choco OrderAgent, eliminating manual re-keying and unlocking 250% dairy sales growth."
        },
        "validation_question": "If we could show you exactly how many hours per week each of your ten sites spends on manual order transcription today - broken down by channel - what cost-per-order number would make this a straightforward business case for Marcus?"
      },
      {
        "driver_statement": "Eliminating manual re-keying of orders arriving from the merged MJ Baker and Westcountry price files will reduce the weekly pricing-error credit note cycle, recovering margin that is currently invisible in the division's P&L.",
        "taxonomy": "lower_cost",
        "evidence": [
          {
            "text": "we merged MJ Baker and Westcountry we inherited two price files and two product catalogues, and the mess from that still generates pricing errors that turn into credit notes every single week",
            "origin": "notes"
          },
          {
            "text": "exceptional restructuring expenses of £2.4 million compared to just £100,000 the year prior, relating to operational changes, including reducing the number of distribution centres from four to two",
            "origin": "web",
            "source_tier": "news",
            "url": "https://www.ajbell.co.uk/news/articles/kitwave-accepts-ps250-million-oep-bid-sales-grow-profit-stalls",
            "retrieved_at": "2026-01-22"
          }
        ],
        "facts": [
          "MJ Baker and Westcountry were merged into the new Exeter DC; their separate price files and product catalogues were never fully reconciled.",
          "Gemma confirmed pricing errors from the merge still generate credit notes every single week - the cost is unquantified at divisional level.",
          "The new South West depot incurred additional short-term costs during its transition (confirmed in H1 FY2025 interim results)."
        ],
        "inferences": [
          "Credit note volume is a proxy for order accuracy; if Choco OrderAgent resolves items against a single unified product catalogue before submission to Swords, it intercepts pricing mismatches at entry rather than after fulfilment.",
          "Finance has not yet produced a clean credit-note cost number - quantifying it before the SE call would create a ready-made ROI hook for Marcus.",
          "With OEP conducting monthly portfolio reviews, an unquantified credit leakage is a visible governance gap that Gemma will be pressed to close."
        ],
        "product_mapping": "A dedicated AI platform built for food & beverage wholesalers that automates order processing, drives sales efficiency, and powers modern ecommerce - validates each order line against the live Swords product catalogue and flags substitutions or pricing anomalies before the order is committed, blocking the error at source.",
        "confidence": "medium",
        "matched_case_study": {
          "url": "https://choco.com/uk/stories/case-studies/swaledale-butchers-ai-order-processing",
          "title": "Swaledale Butchers + Choco",
          "customer": "Swaledale Butchers",
          "industry": "Food Distribution / Butchery",
          "headline_pain": "Manual order processing from WhatsApp and procurement platforms took around 2 minutes per order and created significant cognitive load for the team.",
          "summary": "Using Choco's OrderAgent, Swaledale Butchers cut order processing from 2 minutes to 8 seconds per order, achieving 97% accuracy.",
          "relevance_reason": "97% accuracy headline directly counters Kitwave's weekly credit-note problem, and the UK-based food distribution context is a precise fit for the Exeter site audience.",
          "relevance_score": 7,
          "one_liner": "Swaledale Butchers used Choco OrderAgent to hit 97% order accuracy and cut processing from 2 minutes to 8 seconds - directly addressing the error-to-credit-note cycle Kitwave experiences post-merger."
        },
        "validation_question": "Can you get a rough monthly credit note value from finance before the SE call - even a directional figure - so we can anchor the accuracy ROI to a real number rather than a percentage?"
      },
      {
        "driver_statement": "Automating the overnight voicemail backlog at the Exeter site before Devon and Cornwall's summer peak removes the operational risk of missed next-day cutoffs that crippled the division last July and August.",
        "taxonomy": "lower_cost",
        "evidence": [
          {
            "text": "last July and August the South West went through its first summer peak as a merged site, and the voicemail backlog got so bad we were missing next-day cutoffs for orders that had been sitting on the answerphone since the night before",
            "origin": "notes"
          },
          {
            "text": "To protect customer service during the transition to the new South West depot, the Group took the decision to incur some additional, short-term costs",
            "origin": "web",
            "source_tier": "filings",
            "url": "https://data.fca.org.uk/artefacts/NSM/RNS/5718362.html",
            "retrieved_at": "2025-07-01"
          }
        ],
        "facts": [
          "The South West site experienced its first summer peak post-merger in July–August 2024; voicemail backlogs caused missed next-day cutoffs for Devon and Cornwall customers.",
          "Summer 2025 peak is approximately eight weeks away from the May 14 discovery call date.",
          "The group publicly cited additional short-term costs incurred to protect customer service at the new South West depot in H1 FY2025."
        ],
        "inferences": [
          "If the same peak recurs without automation, Gemma faces an identical backlog problem - now under PE ownership where a service-level miss has direct P&L visibility in monthly reviews.",
          "Choco's OrderAgent processes voicemail audio autonomously from 6am, eliminating the queue that builds between last service (11pm) and when coordinators arrive - this is a direct point-in-time fix for the cutoff problem.",
          "Summer seasonality in Devon and Cornwall (hospitality-heavy) means the consequences of missed cutoffs are disproportionately concentrated in a short window, making a pre-season deployment timeline credible and urgent."
        ],
        "product_mapping": "A dedicated AI platform built for food & beverage wholesalers that automates order processing, drives sales efficiency, and powers modern ecommerce - processes overnight voicemail orders automatically so Swords-ready entries are waiting when coordinators log in at 6am, eliminating backlog before the trading day begins.",
        "confidence": "high",
        "matched_case_study": {
          "url": "https://choco.com/us/stories/case-studies/how-produce-express-modernized-food-distribution-with-choco-ecommerce",
          "title": "Produce Express + Choco",
          "customer": "Produce Express",
          "industry": "Food Distribution / Produce",
          "headline_pain": "Thousands of manual phone orders each week were creating overnight workload and limiting the company's ability to scale efficiently.",
          "summary": "By moving 40% of customers online with Choco's eCommerce and AI platform, Produce Express reduced overnight workload and improved order accuracy while preserving its personal service model.",
          "relevance_reason": "Overnight workload reduction is the direct structural match to Kitwave's voicemail-backlog-at-6am problem, and the 'preserving personal service' framing addresses Gemma's concern that chefs will not change how they order.",
          "relevance_score": 8,
          "one_liner": "Produce Express cut overnight manual order workload by moving 40% of customers to Choco - directly analogous to clearing Kitwave's pre-dawn voicemail queue before Devon and Cornwall's summer peak."
        },
        "validation_question": "How many voicemail orders does Exeter typically process between 11pm and 6am on a peak summer night - and what's the cutoff time for next-day dispatch?"
      },
      {
        "driver_statement": "Freeing sales office coordinators from transcription work enables them to act as proactive account managers, supporting the organic top-line growth OEP requires in a division where like-for-like revenue was slightly negative last year.",
        "taxonomy": "retain_and_grow",
        "evidence": [
          {
            "text": "like-for-like growth was slightly negative last year, which the group could live with as a plc because the acquisitions kept the headline moving. Private equity reads that differently. Everything now has to either grow the top line organically or take cost out",
            "origin": "notes"
          },
          {
            "text": "weaker levels of demand from hospitality, which impacted the Foodservice division's performance earlier in the period",
            "origin": "web",
            "source_tier": "filings",
            "url": "https://data.fca.org.uk/artefacts/NSM/RNS/5718362.html",
            "retrieved_at": "2025-07-01"
          }
        ],
        "facts": [
          "Gemma explicitly stated Foodservice like-for-like revenue was slightly negative in the last reporting year.",
          "H1 FY2025 interim results confirmed weaker hospitality demand impacted the Foodservice division's performance.",
          "OEP's stated investment thesis emphasises accelerating organic growth, not just integration synergies."
        ],
        "inferences": [
          "Sales office coordinators currently spend the majority of their time on order transcription; time freed from keying is time available for upselling, gap-fill calls, and proactive customer contact.",
          "T. Quality's Choco case study shows that when sales staff shift from processing to selling across multiple depots, customer onboarding and revenue per account both improve - a directly transferable playbook for Kitwave's ten-site structure.",
          "With monthly PE reviews and a negative organic growth trend, Marcus needs a narrative that connects operational efficiency to top-line recovery - Choco provides the linkage."
        ],
        "product_mapping": "A dedicated AI platform built for food & beverage wholesalers that automates order processing, drives sales efficiency, and powers modern ecommerce - converts coordinators from order takers to active account managers by eliminating the transcription queue that consumes their day.",
        "confidence": "medium",
        "matched_case_study": {
          "url": "https://choco.com/uk/stories/case-studies/t-quality-grows-with-choco",
          "title": "T. Quality + Choco",
          "customer": "T. Quality",
          "industry": "Food Distribution",
          "headline_pain": "Scaling sales efficiently across multiple depots while onboarding all customers onto a digital platform was a key challenge.",
          "summary": "T. Quality scaled sales across 11 depots, onboarded every customer onto Choco, and turned AI prospecting and quoting into a competitive edge.",
          "relevance_reason": "Multi-depot UK foodservice distributor scaling sales efficiency - structural match to Kitwave Foodservice's ten-depot picture and OEP's demand for organic growth alongside cost reduction.",
          "relevance_score": 8,
          "one_liner": "T. Quality scaled sales across 11 depots with Choco - a direct structural parallel to Kitwave's ten-site Foodservice division needing organic top-line growth alongside cost reduction."
        },
        "validation_question": "What percentage of your coordinators' day is currently billable as customer-facing time versus order entry and admin - and has that ratio worsened as the division has grown through acquisition?"
      },
      {
        "driver_statement": "Retaining experienced senior coordinators like Dawn at Exeter - whose departure risk was triggered by transcription workload, not pay - requires reducing the cognitive burden of manual order processing before the next resignation cycle.",
        "taxonomy": "lower_cost",
        "evidence": [
          {
            "text": "I nearly lost Dawn in March, she's my most experienced senior coordinator at the Exeter site, she had an offer elsewhere and the honest reason she was looking was the workload. Talked her into staying, but that was a warning shot.",
            "origin": "notes"
          },
          {
            "text": "Manual order processing from WhatsApp and procurement platforms took around 2 minutes per order and created significant cognitive load for the team.",
            "origin": "web",
            "source_tier": "company_site",
            "url": "https://choco.com/uk/stories/case-studies/swaledale-butchers-ai-order-processing",
            "retrieved_at": "2025-07-01"
          }
        ],
        "facts": [
          "The most experienced senior coordinator at Exeter sought outside employment in March 2026, citing workload as the primary reason.",
          "Gemma retained her but described it as a 'warning shot', implying the risk is live and unresolved.",
          "Replacing a senior coordinator with deep product, pricing, and customer knowledge would carry recruitment, training, and service continuity costs well above a typical admin replacement."
        ],
        "inferences": [
          "If the summer peak recreates the same workload conditions that drove Dawn to look elsewhere, the resignation risk re-activates at the worst possible operational moment.",
          "Reducing transcription volume is the one lever Gemma can pull that directly addresses the stated cause of attrition without requiring a pay increase or headcount addition.",
          "Under PE ownership, a key-person departure at a recently integrated site creates a disproportionate integration risk narrative in monthly reviews."
        ],
        "product_mapping": "A dedicated AI platform built for food & beverage wholesalers that automates order processing, drives sales efficiency, and powers modern ecommerce - removes the repetitive transcription workload that creates burnout in experienced coordinators, shifting their effort to higher-value, more satisfying customer work.",
        "confidence": "medium",
        "matched_case_study": {
          "url": "https://choco.com/us/stories/case-studies/krystal-produce-success-story",
          "title": "Krystal Produce + Choco",
          "customer": "Krystal Produce",
          "industry": "Food Distribution / Produce",
          "headline_pain": "Labor shortages and inefficiencies of manual order processing were hampering operations and service quality.",
          "summary": "Integrating Choco AI reduced each order to 13 seconds to process, saving 15 hours per week and $23,000 per year with one client alone.",
          "relevance_reason": "Labour retention driven by reducing the manual processing burden is the precise mechanism - Krystal's 'labour shortages and inefficiencies' framing maps directly to Dawn's workload-driven attrition risk at Exeter.",
          "relevance_score": 7,
          "one_liner": "Krystal Produce used Choco AI to save 15 hours per week and reduce order processing to 13 seconds - the same workload relief that would address Exeter's senior coordinator retention risk."
        },
        "validation_question": "If Dawn's role - or one like it - became vacant during the July–August peak, what would the realistic cost and time-to-competence be for a replacement, and is that a number finance has ever modelled?"
      }
    ]
  },
  "stakeholders": {
    "entries": [
      {
        "name": "Ben Maxted",
        "role": "Chief Executive Officer",
        "is_placeholder": false,
        "evidence": {
          "text": "Ben was appointed to the Kitwave Board as Chief Operating Officer in November 2021 and Chief Executive Officer in March 2024.",
          "origin": "web",
          "source_tier": "company_site",
          "url": "https://www.kitwave.co.uk/board/",
          "retrieved_at": "2026-01-14"
        }
      },
      {
        "name": "Mark Earl",
        "role": "Chief Financial Officer (appointed to Board March 2026, succeeding David Brind)",
        "is_placeholder": false,
        "evidence": {
          "text": "Mark was appointed to the Kitwave Board as CFO in March 2026 and now focuses on strategic initiatives and opportunities while retaining responsibility for Group finance and compliance.",
          "origin": "web",
          "source_tier": "company_site",
          "url": "https://www.kitwave.co.uk/board/",
          "retrieved_at": "2026-01-14"
        }
      },
      {
        "name": "Paul Young",
        "role": "Founder; Non-Executive Director / Executive Chairman (transitioned from CEO to non-executive role post-2024)",
        "is_placeholder": false,
        "evidence": {
          "text": "Leadership transitioned with Ben Maxted promoted to CEO from COO while founder Paul Young moved to a non-executive/founder role, formalising succession aligned to scale and institutional ownership.",
          "origin": "web",
          "source_tier": "news",
          "url": "https://portersfiveforce.com/blogs/brief-history/kitwave",
          "retrieved_at": "2025-12-03"
        }
      },
      {
        "name": "Dr Marnie Millard OBE",
        "role": "Non-Executive Chair (appointed 30 May 2025)",
        "is_placeholder": false,
        "evidence": {
          "text": "Kitwave Group plc is pleased to announce the appointment of Dr Marnie Millard OBE to the Board as Non-Executive Chair, with effect from 30 May 2025.",
          "origin": "web",
          "source_tier": "company_site",
          "url": "https://www.kitwave.co.uk/news/",
          "retrieved_at": "2021-04-21"
        }
      },
      {
        "name": null,
        "role": "Group IT Director (first name 'Alan' only; surname not publicly disclosed)",
        "is_placeholder": true,
        "evidence": null
      },
      {
        "name": null,
        "role": "Group Commercial Director (first name 'Michael' only; surname not publicly disclosed)",
        "is_placeholder": true,
        "evidence": null
      }
    ],
    "likely_economic_buyer": "Ben Maxted (CEO) is the primary economic buyer for major strategic initiatives and capital expenditure; Mark Earl (CFO) co-holds budget authority for any significant vendor or technology spend. For the pending OEP Capital Advisors acquisition, the buyer authority transitions to the incoming private-equity-backed leadership.",
    "likely_champion_profile": "The Group IT Director ('Alan') is the most probable internal champion for technology or systems deals, given his stated accountability for all core IT systems and his track record of implementing IT projects that enabled growth over 11 years. The CFO (Mark Earl) would be a secondary champion for finance, ERP, or compliance-adjacent solutions.",
    "who_is_missing": "Full surnames and LinkedIn profiles for the Group IT Director ('Alan') and Group Commercial Director ('Michael') are not publicly disclosed on the company website. No Chief Operating Officer has been publicly named since Ben Maxted was promoted to CEO. NED names beyond Marnie Millard and Paul Young are not confirmed from public sources reviewed. The incoming OEP Capital Advisors management layer post-acquisition is entirely unknown."
  },
  "buying_signals": {
    "signals": [
      {
        "text": "OEP Capital Advisors recommended cash acquisition of Kitwave Group plc announced January 2026; private-equity ownership transition typically triggers rapid technology, ERP, and operational transformation spend as the new owner seeks to accelerate synergies and return on investment.",
        "strength": "high",
        "evidence": {
          "text": "OEP Capital Advisors via Kite UK Bidco Limited agrees cash acquisition of Kitwave Group Plc.",
          "origin": "web",
          "source_tier": "filings",
          "url": "https://www.investegate.co.uk/announcement/rns/kitwave-group--kitw/recommended-cash-acquisition-of-kitwave-group-plc/9374535",
          "retrieved_at": "2026-01-22"
        }
      },
      {
        "text": "Full ERP integration of Creed Foodservice (acquired September 2024) onto the Group's ERP system planned to be completed in early 2026, representing an active, time-bound technology consolidation programme across a recently enlarged depot network.",
        "strength": "high",
        "evidence": {
          "text": "The full integration onto the Group's ERP system is planned to be completed in early 2026.",
          "origin": "web",
          "source_tier": "filings",
          "url": "https://data.fca.org.uk/artefacts/NSM/RNS/5718362.html",
          "retrieved_at": "2025-07-01"
        }
      },
      {
        "text": "Headcount surged 250% year-on-year to 2,100 employees as of October 2024, driven by the Creed Foodservice acquisition, creating acute pressure on HR systems, workforce management, training, and compliance tooling across a much larger organisation.",
        "strength": "high",
        "evidence": {
          "text": "Kitwave Group had 2,100 employees as of October 31, 2024. The number of employees increased by 1,500 or 250.00% compared to the previous year.",
          "origin": "web",
          "source_tier": "filings",
          "url": "https://stockanalysis.com/quote/aim/KITW/employees/",
          "retrieved_at": "2024-09-07"
        }
      },
      {
        "text": "UK employer National Insurance rate rise to 15% plus reduced NI threshold (effective April 2025) is adding approximately £2 million to Kitwave's annual operating costs; the company has explicitly signalled it will seek to offset this through efficiencies and savings, creating openings for cost-reduction and workforce-optimisation solutions.",
        "strength": "medium",
        "evidence": {
          "text": "The reduction in the national insurance threshold was not anticipated, and when combined with the rise in the employers' national insurance rate to 15% the effect is to add c.£2 million to the Group's annual operating costs.",
          "origin": "web",
          "source_tier": "filings",
          "url": "https://data.fca.org.uk/artefacts/NSM/RNS/5419804.html",
          "retrieved_at": "2025-07-01"
        }
      },
      {
        "text": "Active investment in voice-picking technology at the Northern ambient hub and a new 80,000 sq ft Foodservice distribution centre in the South West signals an ongoing depot-level operational technology refresh cycle that could extend to WMS, route-optimisation, and fleet-management tooling.",
        "strength": "medium",
        "evidence": {
          "text": "We also made some key strategic decisions to improve operational efficiencies in the Period, including investment in the new Foodservice distribution centre in the South West and our voice-picking technology at the Northern ambient hub.",
          "origin": "web",
          "source_tier": "filings",
          "url": "https://data.fca.org.uk/artefacts/NSM/RNS/5419804.html",
          "retrieved_at": "2025-07-01"
        }
      }
    ],
    "none_found": false
  },
  "risks": {
    "risks": [
      {
        "pattern": "competitor_in_account",
        "text": "REKKI was trialled at Creed's High Wycombe site before the Kitwave acquisition and was quietly abandoned after roughly one month. It failed on two of Kitwave Foodservice's most critical requirements: no phone/voicemail capability (their highest-volume channel) and no Swords integration (meaning coordinators had to re-key everything it captured anyway). The risk is not that REKKI is still active - it clearly is not - but that the failed pilot has raised Gemma's bar for proof on both integration fidelity and channel breadth. The 'accuracy figures looked almost too good' comment about Choco's German wholesaler case study signals healthy scepticism that must be pre-empted with a live technical demonstration rather than slide-based claims. Andrea Kowalczyk's gatekeeping of the Swords estate means any integration claim will face detailed scrutiny from a technically protective IT director who is already managing multiple acquisition integrations simultaneously.",
        "evidence": [
          {
            "text": "Creed trialled REKKI at the High Wycombe site before we acquired them, ran it about a month. It read emails reasonably well, but it does nothing for phone or voicemail, which is most of our volume, and there was no integration into Swords, so the team was re-keying everything it captured anyway. It quietly died.",
            "origin": "notes"
          },
          {
            "text": "Andrea Kowalczyk, group IT director. Anything that touches Swords goes through her, and she is, I'd say protective is the polite word, of that estate right now. Fairly, she's carrying the integration workload for every business we buy.",
            "origin": "notes"
          }
        ]
      },
      {
        "pattern": "build_vs_buy",
        "text": "There is no evidence of a large in-house engineering team or internal tooling job ads at Kitwave. However, two signals create a softer version of this risk. First, Kitwave commissioned a bespoke Magento/Adobe Commerce customer portal through iWeb (a named external agency) that was heavily invested in and actively marketed to customers - yet adoption has stalled completely because chefs continue to order by voicemail. IT floated extending the Swords web ordering module as a self-build option. This history means Andrea's team has lived through one failed portal build-cycle and may default to 'extend what we have' as a lower-risk posture. Second, Andrea is described as mid-way through multi-acquisition ERP integration work with no spare capacity to build anything new - which cuts both ways: it argues against build, but also against any project that demands heavy IT involvement for implementation. The SE should prepare a crisp answer to 'how much does this touch our Swords instance and who does the integration work' before the first call.",
        "evidence": [
          {
            "text": "IT floated extending the Swords web ordering module themselves at one point, but Andrea's team is mid-way through integration work from the acquisitions and has no capacity to build anything, and honestly a portal we build ourselves still has the same problem, it asks the customer to change.",
            "origin": "notes"
          },
          {
            "text": "Kitwave Wholesale Group chose iWeb as their Magento ecommerce agency because of our strategic and forward-thinking approach as well as our vast experience with Adobe Commerce (Powered by Magento) custom development.",
            "origin": "web",
            "source_tier": "company_site",
            "url": "https://www.iweb.co.uk/portfolio/kitwave-central-supplies/",
            "retrieved_at": "2023-06-14"
          }
        ],
        "cost_of_doing_nothing_seed": "If the Exeter site loses Dawn or another senior coordinator during the July–August peak - and no automation is in place - Kitwave will face simultaneous peak-demand backlog, recruitment cost, and a visible service-level miss in OEP's first full summer portfolio review. The counterfactual cost of a senior coordinator vacancy during peak (recruitment fee, agency cover, onboarding lag, customer churn risk in Devon and Cornwall) has never been formally modelled by finance; quantifying it in a pre-call Value Engineering exercise would make the do-nothing cost concrete and defensible for Marcus's margin review."
      }
    ]
  },
  "discovery_questions": {
    "questions": [
      {
        "question": "You mentioned the integration review flagged cost-to-serve in the sales offices as worse than expected - do you have a sense yet of what the fully-loaded cost per order looks like across the ten sites, or is that one of the numbers the review is still trying to establish?",
        "meddpicc_element": "metrics",
        "hypothesis_ref": "Automating voicemail, phone, email and WhatsApp order ingestion across 40+ sales office staff will cut cost-to-serve in the division's highest-cost function, directly improving the margin number OEP has asked Marcus Threlfall to deliver."
      },
      {
        "question": "When you say Marcus has been given a margin improvement number by OEP - is that framed as a basis-points target on divisional EBITDA, a cash cost reduction figure, or something else, and what's the timeline he's working to?",
        "meddpicc_element": "metrics",
        "hypothesis_ref": "Automating voicemail, phone, email and WhatsApp order ingestion across 40+ sales office staff will cut cost-to-serve in the division's highest-cost function, directly improving the margin number OEP has asked Marcus Threlfall to deliver."
      },
      {
        "question": "Have you or finance ever put a monthly sterling value on the credit notes that are coming out of the MJ Baker and Westcountry price-file conflicts - even a rough directional figure - or is that still unquantified?",
        "meddpicc_element": "metrics",
        "hypothesis_ref": "Eliminating manual re-keying of orders arriving from the merged MJ Baker and Westcountry price files will reduce the weekly pricing-error credit note cycle, recovering margin that is currently invisible in the division's P&L."
      },
      {
        "question": "On the voicemail backlog last summer - how many overnight voicemail orders was Exeter typically receiving between 11pm and 6am on a peak night, and what is the hard cutoff time for next-day dispatch?",
        "meddpicc_element": "metrics",
        "hypothesis_ref": "Automating the overnight voicemail backlog at the Exeter site before Devon and Cornwall's summer peak removes the operational risk of missed next-day cutoffs that crippled the division last July and August."
      },
      {
        "question": "If you had to estimate the split of a coordinator's working day today - time spent on actual order transcription versus customer-facing activity - what would that ratio look like across your best and worst sites?",
        "meddpicc_element": "metrics",
        "hypothesis_ref": "Freeing sales office coordinators from transcription work enables them to act as proactive account managers, supporting the organic top-line growth OEP requires in a division where like-for-like revenue was slightly negative last year."
      },
      {
        "question": "If Dawn's role at Exeter became vacant during the July–August peak, what would the realistic cost and time-to-competence look like for a replacement - and is that a number finance has ever formally modelled?",
        "meddpicc_element": "metrics",
        "hypothesis_ref": "Retaining experienced senior coordinators like Dawn at Exeter - whose departure risk was triggered by transcription workload, not pay - requires reducing the cognitive burden of manual order processing before the next resignation cycle."
      },
      {
        "question": "Marcus owns the margin number and signs off material spend - does he also set the evaluation criteria for what he'd want to see in a business case, or does OEP's portfolio team specify the return hurdles and payback period he has to meet?",
        "meddpicc_element": "economic_buyer"
      },
      {
        "question": "You mentioned the monthly reviews the new owners run - do you know whether a technology investment of this kind would need to clear a specific spend threshold to appear in one of those reviews, and who from OEP would be in the room?",
        "meddpicc_element": "economic_buyer"
      },
      {
        "question": "When you think about what would make this an easy yes for Marcus versus something he'd push back on, what does he care about most - the speed of payback, the confidence in the integration with Swords, or the ability to put a clean before-and-after number in front of OEP?",
        "meddpicc_element": "decision_criteria",
        "hypothesis_ref": "Automating voicemail, phone, email and WhatsApp order ingestion across 40+ sales office staff will cut cost-to-serve in the division's highest-cost function, directly improving the margin number OEP has asked Marcus Threlfall to deliver."
      },
      {
        "question": "Given that REKKI failed specifically on phone and voicemail coverage and on the Swords integration, are those two capabilities now non-negotiable filters for anything you'd take forward - and are there other must-haves the REKKI experience added to your list?",
        "meddpicc_element": "decision_criteria"
      },
      {
        "question": "When Andrea evaluates anything that touches the Swords estate, what does her technical due diligence typically look like - does she run her own integration tests, require vendor certification, or rely on a reference from another Sanderson customer?",
        "meddpicc_element": "decision_criteria"
      },
      {
        "question": "You said the customer portal the group invested in has stalled on adoption - is there a risk that any solution which requires customers to change their behaviour would face the same internal scepticism, and how would you want us to address that concern with Marcus and Andrea?",
        "meddpicc_element": "decision_criteria"
      },
      {
        "question": "Assuming the SC session with Andrea goes well and there's a clear fit - what would the next steps look like internally before Marcus could formally evaluate a proposal, and who else would need to be involved between now and a decision?",
        "meddpicc_element": "decision_process"
      },
      {
        "question": "Is there a formal vendor evaluation or procurement process that kicks in at a certain contract value, or does Marcus have discretion to move quickly if the business case is compelling and Andrea is comfortable with the integration?",
        "meddpicc_element": "decision_process"
      },
      {
        "question": "Given that summer peak is roughly eight weeks away - is there a realistic internal timeline by which a decision would need to be made for a deployment at Exeter to be in place before July, or is the South West site effectively a second phase?",
        "meddpicc_element": "decision_process"
      },
      {
        "question": "Once Marcus approves something at divisional level, does it require a separate sign-off from OEP's portfolio team, or does he have full capex and opex authority within a defined threshold?",
        "meddpicc_element": "paper_process"
      },
      {
        "question": "If this moves to a commercial proposal, does Kitwave have a preferred contract structure at this stage - opex subscription versus capex - and does the new PE ownership have a preference that would affect how a vendor agreement needs to be structured?",
        "meddpicc_element": "paper_process"
      },
      {
        "question": "Are there any existing supplier or technology agreements that a new solution would need to sit alongside or potentially replace - for example, anything contractually tied to the iWeb portal build or the Swords licensing - that could complicate or extend the paper process?",
        "meddpicc_element": "paper_process"
      },
      {
        "question": "Beyond the voicemail backlog, the credit notes, and Dawn's near-departure - are there other pain points in the sales office operation that the integration review has surfaced that we haven't talked about yet?",
        "meddpicc_element": "identify_pain"
      },
      {
        "question": "When the voicemail backlog caused missed next-day cutoffs last summer, what was the downstream impact - were there customer complaints, lost accounts, or emergency re-deliveries, and did any of that show up visibly in the divisional P&L?",
        "meddpicc_element": "identify_pain",
        "hypothesis_ref": "Automating the overnight voicemail backlog at the Exeter site before Devon and Cornwall's summer peak removes the operational risk of missed next-day cutoffs that crippled the division last July and August."
      },
      {
        "question": "The like-for-like revenue being slightly negative last year - was that uniform across all ten depots or concentrated in particular sites or customer segments, and does Marcus have a view on how much of that is addressable through the sales office function specifically?",
        "meddpicc_element": "identify_pain",
        "hypothesis_ref": "Freeing sales office coordinators from transcription work enables them to act as proactive account managers, supporting the organic top-line growth OEP requires in a division where like-for-like revenue was slightly negative last year."
      },
      {
        "question": "You described yourself as being asked which lever your function is contributing to - cost reduction or organic growth. How are you personally framing the answer to Marcus right now, before anything is in place?",
        "meddpicc_element": "champion"
      },
      {
        "question": "When you take something to Marcus, do you typically go with a recommendation and a business case, or does he prefer to be brought in earlier and shape the evaluation himself - and how does that dynamic change now that OEP is running monthly reviews?",
        "meddpicc_element": "champion"
      },
      {
        "question": "You said Andrea will want substance rather than a demo reel - is there anything specific you'd want us to prepare or lead with in that session to make sure she leaves with confidence rather than more questions about the Swords integration?",
        "meddpicc_element": "champion"
      },
      {
        "question": "Is there anyone else inside the business - at group level or within OEP's portfolio team - who you'd expect to take an active interest in this, positively or negatively, once it moves beyond the initial evaluation?",
        "meddpicc_element": "champion"
      },
      {
        "question": "The REKKI trial ran for about a month at High Wycombe before it was abandoned - is that experience still live in the memory of people who would be evaluating this, and is there a risk it creates a higher proof threshold for the phone and voicemail claims specifically?",
        "meddpicc_element": "competition"
      },
      {
        "question": "Beyond REKKI and the internal Swords extension option, is there anything else actively being evaluated in parallel - whether another vendor, a different process change, or a headcount-based solution - or is this currently an open field?",
        "meddpicc_element": "competition"
      },
      {
        "question": "If Andrea concludes the Swords integration is technically sound, is the internal build option genuinely off the table given her team's capacity constraints, or would a positive proof-of-concept from us risk re-opening that conversation?",
        "meddpicc_element": "competition",
        "hypothesis_ref": "Automating voicemail, phone, email and WhatsApp order ingestion across 40+ sales office staff will cut cost-to-serve in the division's highest-cost function, directly improving the margin number OEP has asked Marcus Threlfall to deliver."
      }
    ]
  }
}

export const KITWAVE_SOURCE_LOG: SourceLogEntry[] = [
  {
    "url": "https://www.kitwave.co.uk/",
    "retrieved_at": "2026-03-17",
    "sections": [
      "snapshot",
      "operating_model"
    ],
    "tier": "company_site",
    "stale": false
  },
  {
    "url": "https://pitchbook.com/profiles/company/51749-83",
    "retrieved_at": "2026-07-08T15:14:56.865Z",
    "sections": [
      "snapshot"
    ],
    "tier": "filings",
    "stale": false
  },
  {
    "url": "https://find-and-update.company-information.service.gov.uk/company/09892174",
    "retrieved_at": "2026-07-08T15:14:56.865Z",
    "sections": [
      "snapshot"
    ],
    "tier": "filings",
    "stale": false
  },
  {
    "url": "https://www.kitwave.co.uk/kitwave-appoints-new-non-executive-chair/",
    "retrieved_at": "2025-06-02",
    "sections": [
      "snapshot",
      "strategic_context"
    ],
    "tier": "company_site",
    "stale": true
  },
  {
    "url": "https://www.investegate.co.uk/announcement/rns/kitwave-group--kitw/recommended-cash-acquisition-of-kitwave-group-plc/9374535",
    "retrieved_at": "2026-01-22",
    "sections": [
      "snapshot",
      "operating_model",
      "buying_signals"
    ],
    "tier": "filings",
    "stale": false
  },
  {
    "url": "https://www.oneequity.com/news/one-equity-partners-acquires-kitwave-group/",
    "retrieved_at": "2026-07-08T15:14:56.865Z",
    "sections": [
      "snapshot"
    ],
    "tier": "news",
    "stale": false
  },
  {
    "url": "https://www.asiantrader.biz/kitwave-251m-takeover-deal",
    "retrieved_at": "2026-03-05",
    "sections": [
      "snapshot",
      "strategic_context"
    ],
    "tier": "news",
    "stale": false
  },
  {
    "url": "https://data.fca.org.uk/artefacts/NSM/RNS/5419804.html",
    "retrieved_at": "2026-07-08T15:14:56.865Z",
    "sections": [
      "snapshot",
      "strategic_context",
      "buying_signals"
    ],
    "tier": "filings",
    "stale": false
  },
  {
    "url": "https://portersfiveforce.com/blogs/how-it-works/kitwave",
    "retrieved_at": "2025-12-03",
    "sections": [
      "snapshot"
    ],
    "tier": "news",
    "stale": false
  },
  {
    "url": "https://matrixbcg.com/blogs/competitors/kitwave",
    "retrieved_at": "2026-04-08",
    "sections": [
      "snapshot"
    ],
    "tier": "news",
    "stale": false
  },
  {
    "url": "https://data.fca.org.uk/artefacts/NSM/RNS/5718362.html",
    "retrieved_at": "2025-07-01",
    "sections": [
      "strategic_context",
      "value_drivers",
      "buying_signals"
    ],
    "tier": "filings",
    "stale": true
  },
  {
    "url": "https://www.kitwave.co.uk/news/",
    "retrieved_at": "2024-07-15",
    "sections": [
      "strategic_context",
      "stakeholders"
    ],
    "tier": "company_site",
    "stale": true
  },
  {
    "url": "https://www.proactiveinvestors.co.uk/companies/news/1086076/kitwave-jumps-after-agreeing-to-be-taken-private-for-251m-1086076.html",
    "retrieved_at": "2026-01-22",
    "sections": [
      "strategic_context"
    ],
    "tier": "news",
    "stale": false
  },
  {
    "url": "https://sohrapeakcapital.com/wp-content/uploads/2024/05/Sohra_Peak_Capital_Partners_Kitwave_Group_Investment_Memorandum.pdf",
    "retrieved_at": "2024-05-02",
    "sections": [
      "operating_model"
    ],
    "tier": "filings",
    "stale": true
  },
  {
    "url": "https://rocketreach.co/kitwave-limited-technology-stack_b59531d8f9e385d4",
    "retrieved_at": "2026-07-08T15:14:56.865Z",
    "sections": [
      "operating_model"
    ],
    "tier": "reviews",
    "stale": false
  },
  {
    "url": "https://www.zoominfo.com/c/kitwave-ltd/357108815",
    "retrieved_at": "2026-07-08T15:14:56.865Z",
    "sections": [
      "operating_model"
    ],
    "tier": "reviews",
    "stale": false
  },
  {
    "url": "https://swottemplate.com/blogs/how-it-works/kitwave-how-it-works",
    "retrieved_at": "2025-09-19",
    "sections": [
      "operating_model"
    ],
    "tier": "news",
    "stale": false
  },
  {
    "url": "https://tscsw.substack.com/p/kitwave-group-overview-and-highlights",
    "retrieved_at": "2025-09-10",
    "sections": [
      "operating_model"
    ],
    "tier": "news",
    "stale": false
  },
  {
    "url": "https://www.ajbell.co.uk/news/articles/kitwave-accepts-ps250-million-oep-bid-sales-grow-profit-stalls",
    "retrieved_at": "2026-01-22",
    "sections": [
      "value_drivers"
    ],
    "tier": "news",
    "stale": false
  },
  {
    "url": "https://www.investegate.co.uk/announcement/rns/kitwave-group--kitw/final-results/8761355",
    "retrieved_at": "2025-03-04",
    "sections": [
      "value_drivers"
    ],
    "tier": "filings",
    "stale": true
  },
  {
    "url": "https://choco.com/uk/stories/case-studies/swaledale-butchers-ai-order-processing",
    "retrieved_at": "2025-07-01",
    "sections": [
      "value_drivers"
    ],
    "tier": "company_site",
    "stale": true
  },
  {
    "url": "https://www.kitwave.co.uk/board/",
    "retrieved_at": "2026-01-14",
    "sections": [
      "stakeholders"
    ],
    "tier": "company_site",
    "stale": false
  },
  {
    "url": "https://portersfiveforce.com/blogs/brief-history/kitwave",
    "retrieved_at": "2025-12-03",
    "sections": [
      "stakeholders"
    ],
    "tier": "news",
    "stale": false
  },
  {
    "url": "https://stockanalysis.com/quote/aim/KITW/employees/",
    "retrieved_at": "2024-09-07",
    "sections": [
      "buying_signals"
    ],
    "tier": "filings",
    "stale": true
  },
  {
    "url": "https://www.iweb.co.uk/portfolio/kitwave-central-supplies/",
    "retrieved_at": "2023-06-14",
    "sections": [
      "risks"
    ],
    "tier": "company_site",
    "stale": true
  }
]


export const KITWAVE_MEDDPICC: MeddpiccScore = {
  "metrics": {
    "score": 1,
    "evidence": "I don't have a clean number on what that costs, finance would. / I couldn't give you the exact keying hours off the top of my head, that's one of the things the integration review is making me go and properly measure.",
    "gap": "No quantified metrics have been established yet. SE must ask: What is the fully-loaded cost of 40+ sales office staff (hours x rate)? What is the monthly credit note value from pricing errors? How many orders were missed or delayed last summer and what was the revenue/margin impact? What is the margin improvement number OEP has given Marcus in basis points or absolute £?"
  },
  "economic_buyer": {
    "score": 2,
    "evidence": "Marcus Threlfall, managing director of the division, yes. He owns the margin number, he'd sign off anything material, and above a certain size I believe it goes into the monthly review the new owners run, though I've never taken anything through that myself, so I couldn't tell you how it works.",
    "gap": "Marcus has not been met or qualified directly. What is the threshold spend that triggers OEP's monthly portfolio review? Does OEP have a formal investment committee approval step above Marcus? What is Marcus's personal stake in the value creation plan outcome?"
  },
  "decision_criteria": {
    "score": 1,
    "evidence": "She'll want to know it's substance rather than a demo reel. / something with numbers on it that Marcus can put in front of the new owners, because goodwill doesn't survive contact with a portfolio review.",
    "gap": "No formal evaluation criteria have been articulated. SE must ask: What specific criteria will Marcus and Andrea use to evaluate solutions - integration depth with Swords, accuracy thresholds, implementation risk, payback period? Is there a written requirements document or RFP coming out of the integration review? What does 'substance' mean to Andrea technically?"
  },
  "decision_process": {
    "score": 1,
    "evidence": "above a certain size I believe it goes into the monthly review the new owners run, though I've never taken anything through that myself, so I couldn't tell you how it works. / Send me times for the last week of May.",
    "gap": "The formal decision process is almost entirely unknown. SE must ask: What are the stages from technical validation to commercial approval? What is the spend threshold that triggers OEP review? Who are the other stakeholders who must sign off - finance director, procurement, legal? Is there a procurement or vendor approval process at group level? What is the target go-live date given the summer peak in approximately 8 weeks?"
  },
  "paper_process": {
    "score": 0,
    "evidence": "none",
    "gap": "No discussion of contracting, legal, or procurement process at all. SE must ask: Does Kitwave have a preferred vendor list or procurement policy for software? Who owns the commercial and legal review - group-level or divisional? What are typical contract terms and notice periods for technology vendors? Is there a data processing or information security review required given Swords integration?"
  },
  "identify_pain": {
    "score": 3,
    "evidence": "Last July and August the South West went through its first summer peak as a merged site, and the voicemail backlog got so bad we were missing next-day cutoffs for orders that had been sitting on the answerphone since the night before. / I nearly lost Dawn in March, she's my most experienced senior coordinator at the Exeter site, she had an offer elsewhere and the honest reason she was looking was the workload. / the mess from that still generates pricing errors that turn into credit notes every single week. / my function is being asked which one it's contributing to.",
    "gap": "Pain is vivid and multi-layered but not yet quantified in £ or hours. SE should probe the financial consequence of each pain: missed order cutoff revenue lost last summer, cost of a senior coordinator replacement, and aggregate annual credit note value from pricing errors."
  },
  "champion": {
    "score": 2,
    "evidence": "when your note landed it wasn't a cold start, I'd already been asked to come back with options. / I read your case study with the German wholesaler over the weekend. / I'll ask. She'll want to know it's substance rather than a demo reel, but the timing might work, she's been asked to feed into the same integration review.",
    "gap": "Gemma is engaged and internally mandated but her ability to champion has not been tested. SE must ask: Has Gemma presented a recommendation to Marcus before and had it approved? Does she have access to Marcus directly and regularly? Is she prepared to make an internal case for Choco specifically, and what would she need to do so confidently? What is her personal upside if this succeeds?"
  },
  "competition": {
    "score": 2,
    "evidence": "Creed trialled REKKI at the High Wycombe site before we acquired them, ran it about a month. It read emails reasonably well, but it does nothing for phone or voicemail, which is most of our volume, and there was no integration into Swords, so the team was re-keying everything it captured anyway. It quietly died. / the internal option is the portal, which I mentioned, the group spent properly on it, marketed it to customers, and the chefs who were ordering by voicemail at midnight are still ordering by voicemail at midnight. / IT floated extending the Swords web ordering module themselves at one point, but Andrea's team is mid-way through integration work from the acquisitions and has no capacity to build anything.",
    "gap": "Known competitors are REKKI (failed trial), the existing customer portal, and the Swords web ordering module (no internal capacity). SE must confirm: Is REKKI still being considered or is it formally out? Are there any other vendors Gemma or Marcus is evaluating or has been approached by? Has Sanderson itself been asked whether Swords has a native order capture capability that could address voice and WhatsApp channels?"
  },
  "overall_score": 12,
  "summary": "This is a well-qualified early-stage opportunity with strong identified pain, a named economic buyer under real PE margin pressure, and a credible internal champion who was pre-sold before the call. The deal is held back by an almost complete absence of quantified metrics, no visibility into the formal decision or paper process, and an influential IT gatekeeper (Andrea) who has not yet been engaged. The immediate priority is the late-May working session to validate the Swords integration story with Andrea and begin attaching £ figures to the summer peak risk, credit note leakage, and staffing cost before Gemma tables options with Marcus.",
  "suggested_questions": {
    "sc_intro": [
      "Gemma, Jordan shared his notes but what did he miss or underplay about your situation?",
      "Is Andrea joining today, and if not, what would make her want to engage next?",
      "Should we focus today on summer readiness at Exeter or the broader ten-site picture?"
    ],
    "discovery": [
      "Has finance put any sterling figure on the credit notes from the MJ Baker price-file conflicts?",
      "When Marcus evaluates a proposal, does OEP set the return hurdles or does he?",
      "If this works at Exeter before July, who inside Kitwave would that proof point need to convince?"
    ],
    "technical": [
      "Across your ten sites, is Sanderson Swords fully live everywhere or are some depots still mid-migration?",
      "When REKKI failed on Swords integration, was that an API gap or a Sanderson licensing issue?",
      "What does Andrea typically require from a vendor before she approves anything touching the Swords estate?"
    ]
  }
}

export const KITWAVE_CASE_STUDIES: MatchedCaseStudy[] = [
  {
    "title": "FB the Wholesaler + Choco",
    "url": "https://choco.com/uk/stories/case-studies/fb-the-wholesaler-digitize-every-order-and-unlock-growth",
    "customer": "FB the Wholesaler",
    "industry": "Food Wholesale / Distribution",
    "headline_pain": "Orders pouring in from calls, voicemails, texts, and handwritten notes caused constant errors, rescheduled deliveries, and wasted fuel and time.",
    "summary": "Adopting Choco's OrderAgent and eCommerce enabled FB the Wholesaler to digitize every order channel and achieve 250% dairy sales growth.",
    "relevance_reason": "FB the Wholesaler faced the identical multi-channel chaos - calls, voicemails, texts, handwritten notes - that Kitwave Foodservice's 40+ staff are manually transcribing into Swords today, making it the closest structural and operational match to Gemma's situation.",
    "one_liner": "FB the Wholesaler eliminated errors from voicemail, call, and text orders across every channel - the same mix overwhelming Kitwave's Exeter team ahead of the Devon and Cornwall summer peak.",
    "relevance_score": 10
  },
  {
    "title": "Crowbond Foodservice + Choco",
    "url": "https://choco.com/uk/stories/case-studies/choco-ai-case-study-crowbond-foodservice",
    "customer": "Crowbond Foodservice",
    "industry": "Food Wholesale / Distribution",
    "headline_pain": "Manual processing of 50–100 orders a day was no longer sustainable as rapid growth added over 200 new accounts from recent acquisitions.",
    "summary": "With Choco AI, Crowbond doubled daily orders from 100 to 200, added 200+ new accounts, and grew monthly orders by 1,000+.",
    "relevance_reason": "Crowbond's pain was triggered specifically by acquisition-driven growth overwhelming manual order processing capacity - directly mirroring Kitwave Foodservice's post-acquisition integration pressure from OEP and the merged MJ Baker/Westcountry sites.",
    "one_liner": "Crowbond Foodservice doubled order capacity after acquisitions strained their manual processing - directly relevant as Kitwave's merged South West sites face the same post-acquisition scaling pressure.",
    "relevance_score": 8
  },
  {
    "title": "Reach Food Group + Choco",
    "url": "https://choco.com/uk/stories/case-studies",
    "customer": "Reach Food Group",
    "industry": "Food Distribution",
    "headline_pain": "Order processing was taking up to 40 hours and accuracy was a persistent challenge.",
    "summary": "Using Choco AI, Reach Food Group achieved 96% order accuracy and reduced processing time from 40 hours to just 4 hours within 3 weeks.",
    "relevance_reason": "The dramatic reduction in processing hours with a quantified accuracy outcome gives Marcus Threlfall and OEP exactly the kind of hard, margin-linked numbers Gemma said she needs to survive a portfolio review.",
    "one_liner": "Reach Food Group cut order processing from 40 hours to 4 and hit 96% accuracy within three weeks - the kind of quantified outcome Marcus can put in front of OEP's monthly review.",
    "relevance_score": 7
  }
]

export const KITWAVE_EMAIL: string = "Subject: Ahead of our call, Will from Choco\n\nGemma,\n\nI'm Will, the Solutions Consultant Jordan has brought in ahead of our session later this month. He's walked me through everything, so I wanted to introduce myself properly before we speak.\n\nThe picture is clear enough that I've been doing some thinking already: the voicemail backlog that cost you next-day cutoffs last July, the weekly credit note leakage from the inherited price files, and the near-miss with Dawn in March. I also noticed that Kitwave's own reporting flags the Foodservice integration as the primary vehicle for delivering margin improvement to the group, which tells me the pressure Marcus is carrying isn't going away.\n\nThe thread running through all of it is that your busiest window starts in roughly eight weeks, and the metrics to make a credible case to Marcus aren't fully on paper yet.\n\n[NEXT_STEPS]\n\nOn our call I want to work through how Choco sits against Swords and your actual order channels, start putting numbers against the summer peak risk and the credit note leakage, and make sure the session is worth Andrea's time as well as yours.\n\nWill"

export const KITWAVE_NOTES_STAKEHOLDERS: ExtractedStakeholder[] = [
  {
    "name": "Gemma Hartley",
    "role": "Head of Sales Office Operations, Kitwave Foodservice"
  },
  {
    "name": "Marcus Threlfall",
    "role": "managing director of the division"
  },
  {
    "name": "Dawn",
    "role": "senior coordinator at the Exeter site"
  },
  {
    "name": "Andrea Kowalczyk",
    "role": "group IT director"
  }
]
