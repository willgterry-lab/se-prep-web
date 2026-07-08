"use client"

import { useState, useRef } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BriefView } from "@/components/brief-view"
import type { MeddpiccScore, MatchedCaseStudy, Brief } from "@/types"

// "Upload AE Discovery to prep for first SC Call" -- Prep on a deal that
// already has a resolved company and research (research-first flow via
// /deal/new). No company resolution step here, unlike /brief/new -- the deal
// and its research already exist, this just needs notes.

type Phase = "form" | "streaming" | "review"

type StreamState = {
  phase: Phase
  meddpicc: MeddpiccScore | null
  caseStudies: MatchedCaseStudy[] | null
  email: string | null
  error: string | null
  briefId: string | null
}

type UploadedFile = {
  id: string
  name: string
  status: "extracting" | "done" | "error"
  error?: string
}

function StepRow({ label, status }: { label: string; status: "pending" | "active" | "done" }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-4 flex justify-center">
        {status === "done" && (
          <svg className="w-4 h-4 text-[#1ED760]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        {status === "active" && (
          <svg className="w-4 h-4 text-gray-700 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        )}
        {status === "pending" && (
          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
        )}
      </span>
      <span className={`text-sm ${status === "done" ? "text-gray-500 line-through" : status === "active" ? "font-medium text-gray-900" : "text-gray-400"}`}>
        {label}
      </span>
    </div>
  )
}

function FileRow({ file, onRemove }: { file: UploadedFile; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between text-sm py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        {file.status === "extracting" && (
          <svg className="w-3.5 h-3.5 text-gray-400 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        )}
        {file.status === "done" && (
          <svg className="w-3.5 h-3.5 text-[#1ED760] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        {file.status === "error" && (
          <svg className="w-3.5 h-3.5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        <span className="truncate text-gray-700">{file.name}</span>
        {file.status === "error" && file.error && (
          <span className="text-red-500 text-xs shrink-0">{file.error}</span>
        )}
      </div>
      {file.status !== "extracting" && (
        <button
          type="button"
          onClick={onRemove}
          className="text-gray-300 hover:text-gray-500 ml-2 shrink-0"
          aria-label="Remove"
        >
          ×
        </button>
      )}
    </div>
  )
}

export default function DealPrepNewPage() {
  const { id: dealId } = useParams<{ id: string }>()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [prospectName, setProspectName] = useState("")
  const [discoveryNotes, setDiscoveryNotes] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [dragging, setDragging] = useState(false)
  const [stream, setStream] = useState<StreamState>({
    phase: "form",
    meddpicc: null,
    caseStudies: null,
    email: null,
    error: null,
    briefId: null,
  })

  async function processFiles(files: File[]) {
    const allowed = files.filter((f) =>
      f.name.toLowerCase().endsWith(".pdf") ||
      f.name.toLowerCase().endsWith(".docx") ||
      f.name.toLowerCase().endsWith(".txt")
    )
    if (!allowed.length) return

    const entries: UploadedFile[] = allowed.map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      name: f.name,
      status: "extracting",
    }))
    setUploadedFiles((prev) => [...prev, ...entries])

    await Promise.all(
      allowed.map(async (file, i) => {
        const id = entries[i].id
        try {
          const fd = new FormData()
          fd.append("file", file)
          const res = await fetch("/api/extract-text", { method: "POST", body: fd })
          const data = await res.json()

          if (res.ok) {
            setDiscoveryNotes((prev) =>
              prev ? `${prev}\n\n--- ${file.name} ---\n${data.text}` : `--- ${file.name} ---\n${data.text}`
            )
            setUploadedFiles((prev) =>
              prev.map((f) => (f.id === id ? { ...f, status: "done" } : f))
            )
          } else {
            setUploadedFiles((prev) =>
              prev.map((f) => (f.id === id ? { ...f, status: "error", error: data.error } : f))
            )
          }
        } catch {
          setUploadedFiles((prev) =>
            prev.map((f) => (f.id === id ? { ...f, status: "error", error: "Upload failed" } : f))
          )
        }
      })
    )
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    processFiles(Array.from(e.dataTransfer.files))
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    processFiles(Array.from(e.target.files ?? []))
    e.target.value = ""
  }

  function removeFile(id: string) {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id))
  }

  function stepStatus(key: "meddpicc" | "case_studies" | "email", state: StreamState): "pending" | "active" | "done" {
    if (key === "meddpicc") return state.meddpicc ? "done" : "active"
    if (key === "case_studies") return state.caseStudies ? "done" : state.meddpicc ? "active" : "pending"
    if (key === "email") return state.email ? "done" : state.meddpicc && state.caseStudies ? "active" : "pending"
    return "pending"
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStream({ phase: "streaming", meddpicc: null, caseStudies: null, email: null, error: null, briefId: null })

    try {
      const res = await fetch(`/api/deals/${dealId}/prep`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discovery_notes: discoveryNotes, prospect_name: prospectName }),
      })

      if (!res.ok || !res.body) {
        const text = await res.text()
        throw new Error(text || "Request failed")
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.trim()) continue
          const event = JSON.parse(line)

          if (event.type === "meddpicc") {
            setStream((s) => ({ ...s, meddpicc: event.data }))
          } else if (event.type === "case_studies") {
            setStream((s) => ({ ...s, caseStudies: event.data }))
          } else if (event.type === "email") {
            setStream((s) => ({ ...s, email: event.data }))
          } else if (event.type === "done") {
            setStream((s) => ({ ...s, phase: "review", briefId: event.data.brief_id }))
          } else if (event.type === "error") {
            throw new Error(event.message)
          }
        }
      }
    } catch (err) {
      setStream((s) => ({ ...s, phase: "form", error: err instanceof Error ? err.message : "Something went wrong." }))
    }
  }

  if (stream.phase === "form") {
    const hasExtracting = uploadedFiles.some((f) => f.status === "extracting")

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Upload AE Discovery</h1>
          <p className="text-gray-500 mt-1">
            Paste or upload the AE&apos;s discovery notes to prep for your first SC call.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-2">
              <Label htmlFor="name">Contact name (optional)</Label>
              <Input
                id="name"
                placeholder="Jane Smith"
                value={prospectName}
                onChange={(e) => setProspectName(e.target.value)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Discovery notes</CardTitle>
              <CardDescription>
                Upload files, drag and drop, or paste directly. Multiple files supported — all text is combined.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`rounded-lg border-2 border-dashed px-6 py-8 text-center cursor-pointer transition-colors ${
                  dragging
                    ? "border-black bg-gray-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileInput}
                  className="hidden"
                />
                <p className="text-sm text-gray-500">
                  Drop files here or{" "}
                  <span className="text-black font-medium underline underline-offset-2">
                    browse to upload
                  </span>
                </p>
                <p className="text-xs text-gray-400 mt-1">PDF, DOCX, TXT — multiple files supported</p>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="divide-y rounded-md border px-3">
                  {uploadedFiles.map((file) => (
                    <FileRow key={file.id} file={file} onRemove={() => removeFile(file.id)} />
                  ))}
                </div>
              )}

              <Textarea
                placeholder="Or paste notes directly — transcripts, bullet points, anything. The more detail, the better the MEDDPICC score."
                value={discoveryNotes}
                onChange={(e) => setDiscoveryNotes(e.target.value)}
                rows={18}
                required
              />
            </CardContent>
          </Card>

          {stream.error && <p className="text-sm text-red-600">{stream.error}</p>}

          <Button type="submit" className="w-full" size="lg" disabled={hasExtracting || !discoveryNotes.trim()}>
            {hasExtracting ? "Extracting files…" : "Generate prep brief"}
          </Button>
        </form>
      </div>
    )
  }

  if (stream.phase === "review" && stream.meddpicc && stream.briefId) {
    const brief: Brief = {
      id: stream.briefId,
      user_id: "",
      deal_id: dealId,
      stage: "prep",
      prospect_name: prospectName,
      prospect_company: "",
      discovery_notes: discoveryNotes,
      meddpicc: stream.meddpicc,
      matched_case_studies: stream.caseStudies ?? [],
      follow_up_email: stream.email ?? "",
      delta: null,
      risks: [],
      pov_assessment: [],
      recording_url: null,
      ve_baseline_inputs: [],
      call_date: null,
      research_brief_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    return <BriefView brief={brief} continueHref={`/deal/${dealId}`} />
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Generating your prep brief…</h1>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <StepRow label="Scoring MEDDPICC" status={stepStatus("meddpicc", stream)} />
          <StepRow label="Matching case studies" status={stepStatus("case_studies", stream)} />
          <StepRow label="Drafting follow-up email" status={stepStatus("email", stream)} />
        </CardContent>
      </Card>
    </div>
  )
}
