"use client"

import { useState, useRef, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import type { MeddpiccScore, MeddpiccDelta, RiskItem, VeBaselineInput } from "@/types"

// ─── Types ───────────────────────────────────────────────────────────────────

type Phase = "form" | "streaming" | "done"

type StreamState = {
  phase: Phase
  meddpicc: MeddpiccScore | null
  caseStudies: boolean
  baseline: VeBaselineInput[] | null
  delta: MeddpiccDelta | null
  risks: RiskItem[] | null
  error: string | null
}

type UploadedFile = {
  id: string
  name: string
  status: "extracting" | "done" | "error"
  error?: string
}

type Deal = { prospect_name: string; prospect_company: string }

// ─── Sub-components ───────────────────────────────────────────────────────────

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
        <button type="button" onClick={onRemove} className="text-gray-300 hover:text-gray-500 ml-2 shrink-0" aria-label="Remove">
          x
        </button>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function VeNewPage() {
  const { id: dealId } = useParams<{ id: string }>()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [deal, setDeal] = useState<Deal | null>(null)
  const [questions, setQuestions] = useState<string[]>([])
  const [questionsLoading, setQuestionsLoading] = useState(true)
  const [transcript, setTranscript] = useState("")
  const [recordingUrl, setRecordingUrl] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [dragging, setDragging] = useState(false)
  const [stream, setStream] = useState<StreamState>({
    phase: "form",
    meddpicc: null,
    caseStudies: false,
    baseline: null,
    delta: null,
    risks: null,
    error: null,
  })

  useEffect(() => {
    fetch(`/api/deals/${dealId}`)
      .then((r) => r.json())
      .then((data) => { if (data.deal) setDeal(data.deal as Deal) })
      .catch(() => {})
  }, [dealId])

  useEffect(() => {
    fetch(`/api/deals/${dealId}/ve-questions`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.questions)) setQuestions(data.questions)
      })
      .catch(() => {})
      .finally(() => setQuestionsLoading(false))
  }, [dealId])

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
            setTranscript((prev) =>
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStream({
      phase: "streaming",
      meddpicc: null,
      caseStudies: false,
      baseline: null,
      delta: null,
      risks: null,
      error: null,
    })

    try {
      const res = await fetch(`/api/deals/${dealId}/value-engineering`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          recording_url: recordingUrl || null,
        }),
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
            setStream((s) => ({ ...s, caseStudies: true }))
          } else if (event.type === "baseline") {
            setStream((s) => ({ ...s, baseline: event.data }))
          } else if (event.type === "delta") {
            setStream((s) => ({ ...s, delta: event.data }))
          } else if (event.type === "risks") {
            setStream((s) => ({ ...s, risks: event.data }))
          } else if (event.type === "done") {
            setStream((s) => ({ ...s, phase: "done" }))
            router.push(`/deal/${event.data.deal_id}`)
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

  function stepStatus(
    key: "phase1" | "risks" | "email",
    s: StreamState
  ): "pending" | "active" | "done" {
    if (key === "phase1") {
      if (s.meddpicc && s.baseline) return "done"
      if (s.phase === "streaming") return "active"
    }
    if (key === "risks") {
      if (s.risks) return "done"
      if (s.meddpicc && s.baseline) return "active"
    }
    if (key === "email") {
      if (s.phase === "done") return "done"
      if (s.risks) return "active"
    }
    return "pending"
  }

  const hasExtracting = uploadedFiles.some((f) => f.status === "extracting")

  if (stream.phase !== "form") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">
            {deal?.prospect_name ?? "Value Engineering"}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Running workshop analysis...</p>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-3">
            <StepRow
              label="Scoring MEDDPICC, matching case studies, extracting baseline inputs"
              status={stepStatus("phase1", stream)}
            />
            <StepRow
              label="Identifying risks and updating questions"
              status={stepStatus("risks", stream)}
            />
            <StepRow
              label="Drafting follow-up email and next actions"
              status={stepStatus("email", stream)}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Value Engineering workshop</h1>
        {deal && (
          <p className="text-gray-500 mt-1">
            {deal.prospect_name} at {deal.prospect_company}
          </p>
        )}
      </div>

      {/* Workshop planning questions */}
      <Card>
        <CardHeader>
          <CardTitle>Workshop planning questions</CardTitle>
          <CardDescription className="mt-1">
            Questions to ask in the workshop, targeting gaps in what has been captured so far.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {questionsLoading ? (
            <p className="text-sm text-gray-400">Generating questions...</p>
          ) : questions.length > 0 ? (
            <ol className="space-y-2">
              {questions.map((q, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-700">
                  <span className="text-gray-400 font-medium w-5 shrink-0">{i + 1}.</span>
                  <span>{q}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-gray-400">No questions generated. Run prior call analyses first to capture MEDDPICC evidence.</p>
          )}
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Recording URL */}
        <Card>
          <CardHeader>
            <CardTitle>Recording URL</CardTitle>
            <CardDescription className="mt-1">Optional. Paste a Loom, Gong, or Chorus link to attach to this brief.</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              type="url"
              placeholder="https://..."
              value={recordingUrl}
              onChange={(e) => setRecordingUrl(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Transcript */}
        <Card>
          <CardHeader>
            <CardTitle>Workshop transcript</CardTitle>
            <CardDescription className="mt-1">
              Paste the workshop transcript or upload a file. Baseline inputs will be extracted automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`rounded-lg border-2 border-dashed px-6 py-8 text-center cursor-pointer transition-colors ${
                dragging ? "border-black bg-gray-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
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
                <span className="text-black font-medium underline underline-offset-2">browse to upload</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">PDF, DOCX, TXT</p>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="divide-y rounded-md border px-3">
                {uploadedFiles.map((file) => (
                  <FileRow key={file.id} file={file} onRemove={() => removeFile(file.id)} />
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="transcript">Transcript</Label>
              <Textarea
                id="transcript"
                placeholder="Paste the workshop transcript here..."
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={20}
                required
              />
            </div>
          </CardContent>
        </Card>

        {stream.error && <p className="text-sm text-red-600">{stream.error}</p>}

        <Button type="submit" className="w-full" size="lg" disabled={hasExtracting || !transcript.trim()}>
          {hasExtracting ? "Extracting files..." : "Analyse workshop"}
        </Button>
      </form>
    </div>
  )
}
