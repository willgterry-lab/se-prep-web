import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  BorderStyle,
  AlignmentType,
  ShadingType,
} from "docx"
import type { VeProposal, VeDriver, VeConfidence } from "@/types"

const GREEN = "1ED760"
const NAVY = "0A192F"
const GRAY_TEXT = "6B7280"
const GRAY_LIGHT = "E5E7EB"
const AMBER = "D97706"

const CONFIDENCE_COLOURS: Record<VeConfidence, { bg: string; text: string }> = {
  high: { bg: "D1FAE5", text: "065F46" },
  medium: { bg: "FEF3C7", text: AMBER },
  low: { bg: GRAY_LIGHT, text: GRAY_TEXT },
}

const cardBorder = {
  top: { style: BorderStyle.SINGLE, size: 4, color: GRAY_LIGHT },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: GRAY_LIGHT },
  left: { style: BorderStyle.SINGLE, size: 4, color: GRAY_LIGHT },
  right: { style: BorderStyle.SINGLE, size: 4, color: GRAY_LIGHT },
}

function label(text: string) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text: text.toUpperCase(), bold: true, size: 16, color: GREEN, characterSpacing: 20 }),
    ],
  })
}

function sectionTitle(text: string) {
  return new Paragraph({
    spacing: { before: 320, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GRAY_LIGHT } },
    children: [
      new TextRun({ text: text.toUpperCase(), bold: true, size: 16, color: GRAY_TEXT, characterSpacing: 16 }),
    ],
  })
}

function driverParagraphs(driver: VeDriver): Paragraph[] {
  const conf = CONFIDENCE_COLOURS[driver.confidence]
  return [
    new Paragraph({
      spacing: { before: 240, after: 40 },
      border: cardBorder,
      children: [new TextRun({ text: driver.name, bold: true, size: 22 })],
    }),
    new Paragraph({
      border: { left: cardBorder.left, right: cardBorder.right },
      spacing: { after: 80 },
      children: [new TextRun({ text: driver.pain_addressed, italics: true, size: 18, color: GRAY_TEXT })],
    }),
    new Paragraph({
      border: { left: cardBorder.left, right: cardBorder.right },
      spacing: { after: 60 },
      children: [new TextRun({ text: driver.calculated_value, bold: true, size: 28, color: GREEN })],
    }),
    new Paragraph({
      border: { left: cardBorder.left, right: cardBorder.right },
      spacing: { after: 60 },
      children: [new TextRun({ text: driver.calculation, size: 18, color: GRAY_TEXT })],
    }),
    new Paragraph({
      border: { left: cardBorder.left, right: cardBorder.right },
      spacing: { after: 80 },
      children: [
        new TextRun({ text: `SC improvement assumption: ${driver.pct_improvement}%`, size: 16, color: GRAY_TEXT }),
      ],
    }),
    new Paragraph({
      border: { left: cardBorder.left, right: cardBorder.right },
      indent: { left: 200 },
      spacing: { after: 80 },
      children: [new TextRun({ text: driver.evidence, italics: true, size: 18, color: GRAY_TEXT })],
    }),
    new Paragraph({
      border: { ...cardBorder, top: { style: BorderStyle.NONE, size: 0, color: "auto" } },
      spacing: { after: 40 },
      shading: { type: ShadingType.CLEAR, fill: conf.bg, color: "auto" },
      children: [
        new TextRun({
          text: `${driver.confidence.toUpperCase()} CONFIDENCE`,
          bold: true,
          size: 14,
          color: conf.text,
        }),
      ],
    }),
  ]
}

export async function buildVeProposalDocx(proposal: VeProposal, prospect_company: string): Promise<Buffer> {
  const generatedDate = new Date(proposal.generated_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const children: Paragraph[] = [
    label("Value Proposal"),
    new Paragraph({
      spacing: { after: 120 },
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: prospect_company, bold: true, size: 44, color: NAVY })],
    }),
    new Paragraph({
      spacing: { after: 240 },
      children: [new TextRun({ text: proposal.executive_summary, size: 20, color: GRAY_TEXT })],
    }),
    new Paragraph({
      spacing: { after: 320 },
      children: [new TextRun({ text: proposal.headline, bold: true, size: 22, color: NAVY })],
    }),
    sectionTitle("Value Drivers"),
    ...proposal.value_drivers.flatMap(driverParagraphs),
    sectionTitle("Investment"),
    new Paragraph({
      spacing: { after: 240 },
      shading: { type: ShadingType.CLEAR, fill: "F9FAFB", color: "auto" },
      children: [new TextRun({ text: proposal.investment_notes, size: 20 })],
    }),
  ]

  if (proposal.risks_and_sensitivities.length > 0) {
    children.push(sectionTitle("Risks and Sensitivities"))
    for (const r of proposal.risks_and_sensitivities) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 60 },
          children: [new TextRun({ text: r, size: 18, color: GRAY_TEXT })],
        })
      )
    }
  }

  children.push(
    sectionTitle("Recommended Next Step"),
    new Paragraph({
      spacing: { after: 320 },
      shading: { type: ShadingType.CLEAR, fill: "F0FDF4", color: "auto" },
      children: [new TextRun({ text: proposal.recommended_next_step, bold: true, size: 20, color: NAVY })],
    }),
    new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: GRAY_LIGHT } },
      spacing: { before: 240 },
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({
          text: `Generated ${generatedDate}. SC improvement assumptions are estimates, not evidenced outcomes. All baseline figures are verbatim from discovery calls.`,
          size: 14,
          color: GRAY_TEXT,
        }),
      ],
    })
  )

  const doc = new Document({
    sections: [{ properties: {}, children }],
  })

  return Packer.toBuffer(doc)
}
