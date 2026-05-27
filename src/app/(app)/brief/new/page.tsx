"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { MeddpiccScore, MatchedCaseStudy } from "@/types"

// ─── Types ───────────────────────────────────────────────────────────────────

type Phase = "form" | "streaming" | "done"

type StreamState = {
  phase: Phase
  meddpicc: MeddpiccScore | null
  caseStudies: MatchedCaseStudy[] | null
  email: string | null
  error: string | null
}

type UploadedFile = {
  id: string
  name: string
  status: "extracting" | "done" | "error"
  error?: string
}

// ─── Step indicator ───────────────────────────────────────────────────────────

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

// ─── Streaming preview components ────────────────────────────────────────────

const MEDDPICC_LABELS: Record<string, string> = {
  metrics: "Metrics",
  economic_buyer: "Economic Buyer",
  decision_criteria: "Decision Criteria",
  decision_process: "Decision Process",
  paper_process: "Paper Process",
  identify_pain: "Identify Pain",
  champion: "Champion",
  competition: "Competition",
}

function ScorePip({ score }: { score: number }) {
  const colors = ["bg-gray-200", "bg-red-400", "bg-amber-400", "bg-[#1ED760]"]
  return (
    <div className="flex gap-1">
      {[1, 2, 3].map((i) => (
        <span key={i} className={`w-2 h-2 rounded-full ${i <= score ? colors[score] : "bg-gray-200"}`} />
      ))}
    </div>
  )
}

function MeddpiccPreview({ score }: { score: MeddpiccScore }) {
  const keys = Object.keys(MEDDPICC_LABELS) as Array<keyof typeof MEDDPICC_LABELS>
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>MEDDPICC</CardTitle>
          <div className="text-2xl font-bold">
            {score.overall_score}<span className="text-sm font-normal text-gray-400">/24</span>
          </div>
        </div>
        <CardDescription>{score.summary}</CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        {keys.map((key) => {
          const el = score[key as keyof MeddpiccScore] as { score: number; evidence: string; gap: string }
          if (!el || typeof el !== "object") return null
          return (
            <div key={key} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{MEDDPICC_LABELS[key]}</span>
                <ScorePip score={el.score} />
              </div>
              {el.evidence && el.evidence !== "none" && (
                <p className="text-xs text-gray-600 mb-0.5">&ldquo;{el.evidence}&rdquo;</p>
              )}
              {el.gap && <p className="text-xs text-gray-400">Gap: {el.gap}</p>}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

function CaseStudiesPreview({ studies }: { studies: MatchedCaseStudy[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Case studies matched</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {studies.map((cs, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{cs.industry}</Badge>
              <a href={cs.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline">
                {cs.customer}
              </a>
            </div>
            <p className="text-xs text-blue-600">{cs.relevance_reason}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function EmailPreview({ email }: { email: string }) {
  const lines = email.split("\n")
  const subject = lines[0]
  const body = lines.slice(2).join("\n")
  return (
    <Card>
      <CardHeader>
        <CardTitle>Follow-up email</CardTitle>
        <CardDescription className="font-medium text-gray-700">{subject}</CardDescription>
      </CardHeader>
      <CardContent>
        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">{body}</pre>
      </CardContent>
    </Card>
  )
}

// ─── File status row ──────────────────────────────────────────────────────────

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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NewBriefPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    prospect_name: "",
    prospect_company: "",
    discovery_notes: "",
  })
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [dragging, setDragging] = useState(false)
  const [generatingTranscript, setGeneratingTranscript] = useState(false)
  const [stream, setStream] = useState<StreamState>({
    phase: "form",
    meddpicc: null,
    caseStudies: null,
    email: null,
    error: null,
  })

  function setNotes(updater: string | ((prev: string) => string)) {
    setForm((prev) => ({
      ...prev,
      discovery_notes: typeof updater === "function" ? updater(prev.discovery_notes) : updater,
    }))
  }

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // Fire-and-forget: extract prospect name/company from text and populate empty fields
  async function tryExtractProspect(text: string) {
    try {
      const res = await fetch("/api/extract-prospect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) return
      const data = await res.json()
      setForm((prev) => ({
        ...prev,
        prospect_name: prev.prospect_name || data.prospect_name || prev.prospect_name,
        prospect_company: prev.prospect_company || data.prospect_company || prev.prospect_company,
      }))
    } catch {
      // non-critical — silent failure is fine
    }
  }

  async function handleGenerateTranscript() {
    setGeneratingTranscript(true)
    try {
      const res = await fetch("/api/generate-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospect_name: form.prospect_name || undefined,
          prospect_company: form.prospect_company || undefined,
        }),
      })
      if (!res.ok) return
      const data = await res.json()
      setForm((prev) => ({
        prospect_name: prev.prospect_name || data.prospect_name || prev.prospect_name,
        prospect_company: prev.prospect_company || data.prospect_company || prev.prospect_company,
        discovery_notes: data.transcript || prev.discovery_notes,
      }))
    } catch {
      // non-critical
    } finally {
      setGeneratingTranscript(false)
    }
  }

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
            setNotes((prev) =>
              prev ? `${prev}\n\n--- ${file.name} ---\n${data.text}` : `--- ${file.name} ---\n${data.text}`
            )
            setUploadedFiles((prev) =>
              prev.map((f) => (f.id === id ? { ...f, status: "done" } : f))
            )
            tryExtractProspect(data.text)
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
    if (key === "meddpicc") {
      if (state.meddpicc) return "done"
      if (state.phase === "streaming") return "active"
    }
    if (key === "case_studies") {
      if (state.caseStudies) return "done"
      if (state.phase === "streaming") return "active"
    }
    if (key === "email") {
      if (state.email) return "done"
      if (state.meddpicc && state.caseStudies) return "active"
    }
    return "pending"
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStream({ phase: "streaming", meddpicc: null, caseStudies: null, email: null, error: null })

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
            setStream((s) => ({ ...s, phase: "done" }))
            router.push(`/brief/${event.data.brief_id}`)
          } else if (event.type === "error") {
            throw new Error(event.message)
          }
        }
      }
    } catch (err) {
      setStream((s) => ({
        ...s,
        phase: "form",
        error: err instanceof Error ? err.message : "Something went wrong.",
      }))
    }
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  if (stream.phase === "form") {
    const hasExtracting = uploadedFiles.some((f) => f.status === "extracting")

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">New prep brief</h1>
          <p className="text-gray-500 mt-1">
            Paste your discovery notes, or upload transcripts and files — then generate your brief.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Prospect details */}
          <Card>
            <CardHeader>
              <CardTitle>Prospect details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Contact name</Label>
                <Input
                  id="name"
                  placeholder="Jane Smith"
                  value={form.prospect_name}
                  onChange={(e) => set("prospect_name", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  placeholder="Acme Corp"
                  value={form.prospect_company}
                  onChange={(e) => set("prospect_company", e.target.value)}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Discovery notes */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Discovery notes</CardTitle>
                  <CardDescription className="mt-1">
                    Upload files, drag and drop, or paste directly. Multiple files supported — all text is combined.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 mt-0.5"
                  onClick={handleGenerateTranscript}
                  disabled={generatingTranscript}
                >
                  {generatingTranscript ? (
                    <>
                      <svg className="w-3.5 h-3.5 mr-1.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Generating…
                    </>
                  ) : (
                    "Generate example"
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Drop zone */}
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

              {/* File list */}
              {uploadedFiles.length > 0 && (
                <div className="divide-y rounded-md border px-3">
                  {uploadedFiles.map((file) => (
                    <FileRow key={file.id} file={file} onRemove={() => removeFile(file.id)} />
                  ))}
                </div>
              )}

              {/* Notes textarea */}
              <Textarea
                placeholder="Or paste notes directly — transcripts, bullet points, anything. The more detail, the better the MEDDPICC score."
                value={form.discovery_notes}
                onChange={(e) => setNotes(e.target.value)}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData("text")
                  if (pasted) tryExtractProspect(pasted)
                }}
                rows={18}
                required
              />
            </CardContent>
          </Card>

          {stream.error && <p className="text-sm text-red-600">{stream.error}</p>}

          <Button type="submit" className="w-full" size="lg" disabled={hasExtracting}>
            {hasExtracting ? "Extracting files…" : "Generate prep brief"}
          </Button>
        </form>
      </div>
    )
  }

  // ── Streaming / done ──────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {form.prospect_name} · {form.prospect_company}
        </h1>
        <p className="text-gray-500 mt-1 text-sm">Generating your prep brief…</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <StepRow label="Scoring MEDDPICC" status={stepStatus("meddpicc", stream)} />
          <StepRow label="Matching case studies" status={stepStatus("case_studies", stream)} />
          <StepRow label="Drafting follow-up email" status={stepStatus("email", stream)} />
        </CardContent>
      </Card>

      {stream.meddpicc && <MeddpiccPreview score={stream.meddpicc} />}
      {stream.caseStudies && <CaseStudiesPreview studies={stream.caseStudies} />}
      {stream.email && <EmailPreview email={stream.email} />}
    </div>
  )
}
