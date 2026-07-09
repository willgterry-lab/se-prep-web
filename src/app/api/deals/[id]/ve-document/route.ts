import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { buildVeProposalDocx } from "@/lib/ve-document"
import type { VeProposal } from "@/types"

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
const BUCKET = "ve-documents"

function storagePath(dealId: string) {
  return `${dealId}/ve-proposal.docx`
}

// GET: download the current VE document -- the SC's uploaded edited version if
// one exists (ve_document_uploaded_at set), otherwise generated fresh from the
// saved proposal.
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
    .select("prospect_company, ve_proposal, ve_document_uploaded_at")
    .eq("id", dealId)
    .eq("user_id", user.id)
    .single()

  if (!deal) return new Response("Not found", { status: 404 })

  const safeName = deal.prospect_company.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "-")

  let buffer: Buffer
  if (deal.ve_document_uploaded_at) {
    const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(storagePath(dealId))
    if (error || !data) {
      return new Response("Uploaded document not found in storage", { status: 500 })
    }
    buffer = Buffer.from(await data.arrayBuffer())
  } else {
    if (!deal.ve_proposal) return new Response("No value proposal saved yet", { status: 404 })
    buffer = await buildVeProposalDocx(deal.ve_proposal as VeProposal, deal.prospect_company)
  }

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": DOCX_MIME,
      "Content-Disposition": `attachment; filename="${safeName}-value-proposal.docx"`,
    },
  })
}

// POST: replace the downloadable artifact with an offline-edited DOCX. Stored
// as-is -- edits are not parsed back into deals.ve_proposal, only the artifact
// itself changes.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: dealId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: deal } = await supabase
    .from("deals")
    .select("id")
    .eq("id", dealId)
    .eq("user_id", user.id)
    .single()
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
  if (!file.name.toLowerCase().endsWith(".docx")) {
    return NextResponse.json({ error: "Only .docx files are accepted" }, { status: 400 })
  }
  if (file.size > 10_000_000) {
    return NextResponse.json({ error: "File too large (10MB limit)" }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath(dealId), bytes, { contentType: DOCX_MIME, upsert: true })
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const uploaded_at = new Date().toISOString()
  await supabase.from("deals").update({ ve_document_uploaded_at: uploaded_at }).eq("id", dealId)

  return NextResponse.json({ uploaded_at })
}

// DELETE: revert to the generated document -- removes the uploaded override.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: dealId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: deal } = await supabase
    .from("deals")
    .select("id")
    .eq("id", dealId)
    .eq("user_id", user.id)
    .single()
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await supabaseAdmin.storage.from(BUCKET).remove([storagePath(dealId)])
  await supabase.from("deals").update({ ve_document_uploaded_at: null }).eq("id", dealId)

  return NextResponse.json({ reverted: true })
}
