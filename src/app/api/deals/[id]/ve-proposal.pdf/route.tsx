import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
  Svg,
  Rect,
} from "@react-pdf/renderer"
import type { VeProposal, VeDriver, VeConfidence } from "@/types"
import React from "react" // needed for JSX in renderToBuffer cast

const GREEN = "#1ED760"
const GRAY_LIGHT = "#E5E7EB"
const GRAY_TEXT = "#6B7280"
const DARK = "#111827"
const AMBER = "#D97706"

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: DARK,
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
    lineHeight: 1.5,
  },
  label: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: GREEN,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  headline: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 6,
  },
  summary: {
    fontSize: 10,
    color: GRAY_TEXT,
    marginBottom: 24,
    lineHeight: 1.6,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: GRAY_TEXT,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 20,
  },
  driverBox: {
    borderWidth: 1,
    borderColor: GRAY_LIGHT,
    borderRadius: 4,
    padding: 12,
    marginBottom: 10,
  },
  driverName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  driverPain: {
    fontSize: 9,
    color: GRAY_TEXT,
    fontStyle: "italic",
    marginBottom: 6,
  },
  driverValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: GREEN,
    marginBottom: 4,
  },
  driverCalc: {
    fontSize: 9,
    color: GRAY_TEXT,
    marginBottom: 6,
  },
  driverEvidence: {
    fontSize: 9,
    borderLeftWidth: 2,
    borderLeftColor: GREEN,
    paddingLeft: 8,
    color: GRAY_TEXT,
    fontStyle: "italic",
    marginBottom: 8,
  },
  confidenceBadge: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    alignSelf: "flex-start",
  },
  barContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 8,
    color: GRAY_TEXT,
    marginBottom: 3,
  },
  investmentBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 4,
    padding: 12,
    marginTop: 4,
  },
  investmentText: {
    fontSize: 10,
    color: DARK,
    lineHeight: 1.6,
  },
  riskItem: {
    fontSize: 9,
    color: GRAY_TEXT,
    marginBottom: 4,
    paddingLeft: 10,
  },
  nextStep: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    backgroundColor: "#F0FDF4",
    borderRadius: 4,
    padding: 12,
    marginTop: 4,
  },
  footer: {
    fontSize: 8,
    color: GRAY_TEXT,
    marginTop: 32,
    borderTopWidth: 1,
    borderTopColor: GRAY_LIGHT,
    paddingTop: 8,
  },
})

const CONFIDENCE_COLOURS: Record<VeConfidence, { bg: string; text: string }> = {
  high: { bg: "#D1FAE5", text: "#065F46" },
  medium: { bg: "#FEF3C7", text: AMBER },
  low: { bg: GRAY_LIGHT, text: GRAY_TEXT },
}

function DriverChart({ pct }: { pct: number }) {
  const totalWidth = 320
  const barHeight = 10
  const filledWidth = Math.round((pct / 100) * totalWidth)

  return (
    <View style={styles.barContainer}>
      <Text style={styles.barLabel}>SC improvement assumption: {pct}%</Text>
      <Svg width={totalWidth} height={barHeight}>
        <Rect x={0} y={0} width={totalWidth} height={barHeight} rx={3} fill={GRAY_LIGHT} />
        <Rect x={0} y={0} width={filledWidth} height={barHeight} rx={3} fill={GREEN} />
      </Svg>
    </View>
  )
}

function DriverCard({ driver }: { driver: VeDriver }) {
  const conf = CONFIDENCE_COLOURS[driver.confidence]
  return (
    <View style={styles.driverBox}>
      <Text style={styles.driverName}>{driver.name}</Text>
      <Text style={styles.driverPain}>{driver.pain_addressed}</Text>
      <Text style={styles.driverValue}>{driver.calculated_value}</Text>
      <Text style={styles.driverCalc}>{driver.calculation}</Text>
      <DriverChart pct={driver.pct_improvement} />
      <Text style={styles.driverEvidence}>{driver.evidence}</Text>
      <View style={[styles.confidenceBadge, { backgroundColor: conf.bg }]}>
        <Text style={{ color: conf.text, fontSize: 8, fontFamily: "Helvetica-Bold" }}>
          {driver.confidence} confidence
        </Text>
      </View>
    </View>
  )
}

function ProposalDocument({
  proposal,
  prospect_company,
}: {
  proposal: VeProposal
  prospect_company: string
}) {
  const generatedDate = new Date(proposal.generated_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <Text style={styles.label}>Value Proposal</Text>
        <Text style={styles.headline}>{prospect_company}</Text>
        <Text style={styles.summary}>{proposal.executive_summary}</Text>

        {/* Headline */}
        <Text style={[styles.summary, { fontFamily: "Helvetica-Bold", color: DARK, fontSize: 11, marginBottom: 20 }]}>
          {proposal.headline}
        </Text>

        {/* Value drivers */}
        <Text style={styles.sectionTitle}>Value Drivers</Text>
        {proposal.value_drivers.map((driver, i) => (
          <DriverCard key={i} driver={driver} />
        ))}

        {/* Investment */}
        <Text style={styles.sectionTitle}>Investment</Text>
        <View style={styles.investmentBox}>
          <Text style={styles.investmentText}>{proposal.investment_notes}</Text>
        </View>

        {/* Risks */}
        {proposal.risks_and_sensitivities.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Risks and Sensitivities</Text>
            {proposal.risks_and_sensitivities.map((r, i) => (
              <Text key={i} style={styles.riskItem}>
                {"•"} {r}
              </Text>
            ))}
          </>
        )}

        {/* Next step */}
        <Text style={styles.sectionTitle}>Recommended Next Step</Text>
        <Text style={styles.nextStep}>{proposal.recommended_next_step}</Text>

        {/* Footer */}
        <Text style={styles.footer}>
          Generated {generatedDate}. SC improvement assumptions are estimates, not evidenced outcomes. All baseline figures are verbatim from discovery calls.
        </Text>
      </Page>
    </Document>
  )
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: dealId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })

  const { data: deal } = await supabase
    .from("deals")
    .select("prospect_company, ve_proposal")
    .eq("id", dealId)
    .eq("user_id", user.id)
    .single()

  if (!deal) return new Response("Not found", { status: 404 })
  if (!deal.ve_proposal) return new Response("No value proposal saved yet", { status: 404 })

  const element = (
    <ProposalDocument
      proposal={deal.ve_proposal as VeProposal}
      prospect_company={deal.prospect_company}
    />
  ) as React.ReactElement<import("@react-pdf/renderer").DocumentProps>

  const buffer = await renderToBuffer(element)
  const safeName = deal.prospect_company.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "-")

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}-value-proposal.pdf"`,
    },
  })
}
