"use client"

import { useState, useRef, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import type { MeddpiccScore, MeddpiccDelta, RiskItem, PovAssessment, SuccessCriterion, PovCallType } from "@/types"

// ─── Types ───────────────────────────────────────────────────────────────────

type Phase = "form" | "streaming" | "done"

type StreamState = {
  phase: Phase
  meddpicc: MeddpiccScore | null
  delta: MeddpiccDelta | null
  povAssessment: PovAssessment[] | null
  risks: RiskItem[] | null
  error: string | null
}

type UploadedFile = {
  id: string
  name: string
  status: "extracting" | "done" | "error"
  error?: string
}

type Deal = {
  id: string
  prospect_name: string
  prospect_company: string
  success_criteria: SuccessCriterion[]
}

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

export default function PovNewPage() {
  const { id: dealId } = useParams<{ id: string }>()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [deal, setDeal] = useState<Deal | null>(null)
  const [callType, setCallType] = useState<PovCallType>("setup")
  const [recordingUrl, setRecordingUrl] = useState("")
  const [criteria, setCriteria] = useState<string[]>(["", ""])
  const [transcript, setTranscript] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [dragging, setDragging] = useState(false)
  const [stream, setStream] = useState<StreamState>({
    phase: "form",
    meddpicc: null,
    delta: null,
    povAssessment: null,
    risks: null,
    error: null,
  })

  useEffect(() => {
    fetch(`/api/deals/${dealId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.deal) {
          const d = data.deal as Deal
          setDeal(d)
          // Default call type based on existing pov briefs
          const povBriefCount = (data.briefs as { stage: string }[]).filter(
            (b) => b.stage === "pov"
          ).length
          if (povBriefCount > 0) setCallType("checkin")
        }
      })
      .catch(() => {})
  }, [dealId])

  const existingCriteria = deal?.success_criteria ?? []
  const needsCriteria = existingCriteria.length === 0

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

  function handleDragOver(e: React.DragEvent) { e.preventDefault(); setDragging(true) }
  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false)
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false); processFiles(Array.from(e.dataTransfer.files))
  }
  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    processFiles(Array.from(e.target.files ?? [])); e.target.value = ""
  }
  function removeFile(id: string) { setUploadedFiles((prev) => prev.filter((f) => f.id !== id)) }

  function addCriterion() {
    if (criteria.length < 5) setCriteria((prev) => [...prev, ""])
  }
  function removeCriterion(i: number) {
    setCriteria((prev) => prev.filter((_, idx) => idx !== i))
  }
  function updateCriterion(i: number, value: string) {
    setCriteria((prev) => prev.map((c, idx) => (idx === i ? value : c)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStream({ phase: "streaming", meddpicc: null, delta: null, povAssessment: null, risks: null, error: null })

    const builtCriteria: SuccessCriterion[] | undefined = needsCriteria
      ? criteria
          .map((d, i) => ({ id: i + 1, description: d.trim() }))
          .filter((c) => c.description.length > 0)
      : undefined

    try {
      const res = await fetch(`/api/deals/${dealId}/pov`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          recording_url: recordingUrl.trim() || null,
          call_type: callType,
          success_criteria: builtCriteria,
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
          } else if (event.type === "delta") {
            setStream((s) => ({ ...s, delta: event.data }))
          } else if (event.type === "pov_assessment") {
            setStream((s) => ({ ...s, povAssessment: event.data }))
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
    key: "meddpicc" | "pov_assessment" | "risks" | "email",
    s: StreamState
  ): "pending" | "active" | "done" {
    if (key === "meddpicc") {
      if (s.meddpicc) return "done"
      if (s.phase === "streaming") return "active"
    }
    if (key === "pov_assessment") {
      if (s.povAssessment) return "done"
      if (s.meddpicc) return "active"
    }
    if (key === "risks") {
      if (s.risks) return "done"
      if (s.meddpicc) return "active"
    }
    if (key === "email") {
      if (s.phase === "done") return "done"
      if (s.risks && s.povAssessment) return "active"
    }
    return "pending"
  }

  const hasExtracting = uploadedFiles.some((f) => f.status === "extracting")
  const criteriaValid = needsCriteria
    ? criteria.filter((c) => c.trim().length > 0).length >= 1
    : true

  if (stream.phase !== "form") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{deal?.prospect_name ?? "POV analysis"}</h1>
          <p className="text-gray-500 mt-1 text-sm">Running POV analysis...</p>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-3">
            <StepRow label="Scoring MEDDPICC" status={stepStatus("meddpicc", stream)} />
            <StepRow label="Assessing criteria progress" status={stepStatus("pov_assessment", stream)} />
            <StepRow label="Identifying risks and updating questions" status={stepStatus("risks", stream)} />
            <StepRow label="Drafting follow-up email and next actions" status={stepStatus("email", stream)} />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">POV analysis</h1>
        {deal && (
          <p className="text-gray-500 mt-1">
            {deal.prospect_name} at {deal.prospect_company}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Call type */}
        <Card>
          <CardHeader>
            <CardTitle>Call type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              {(["setup", "checkin", "review"] as PovCallType[]).map((t) => {
                const labels: Record<PovCallType, string> = {
                  setup: "Setup / kickoff",
                  checkin: "Check-in",
                  review: "Final review",
                }
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCallType(t)}
                    className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                      callType === t
                        ? "border-black bg-black text-white"
                        : "border-gray-200 text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    {labels[t]}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Success criteria - only if not yet defined */}
        {needsCriteria && (
          <Card>
            <CardHeader>
              <CardTitle>Success criteria</CardTitle>
              <CardDescription className="mt-1">
                Define the criteria you agreed with the prospect for this POV. These are saved to the deal and used on all future POV calls.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {criteria.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm text-gray-400 w-4 shrink-0">{i + 1}.</span>
                  <Input
                    value={c}
                    onChange={(e) => updateCriterion(i, e.target.value)}
                    placeholder={`Criterion ${i + 1}`}
                    className="flex-1"
                  />
                  {criteria.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCriterion(i)}
                      className="text-gray-300 hover:text-gray-500 text-sm"
                      aria-label="Remove"
                    >
                      x
                    </button>
                  )}
                </div>
              ))}
              {criteria.length < 5 && (
                <button
                  type="button"
                  onClick={addCriterion}
                  className="text-sm text-gray-500 hover:text-gray-800 underline underline-offset-2"
                >
                  + Add criterion
                </button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Show existing criteria as read-only */}
        {!needsCriteria && existingCriteria.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Success criteria</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {existingCriteria.map((c) => (
                <div key={c.id} className="py-2 first:pt-0 last:pb-0 flex gap-3">
                  <span className="text-sm text-gray-400 shrink-0">{c.id}.</span>
                  <p className="text-sm text-gray-700">{c.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Recording URL */}
        <Card>
          <CardHeader>
            <CardTitle>Recording link</CardTitle>
            <CardDescription className="mt-1">
              Optional. Paste a Loom, Chorus, or Gong link to attach to this brief and surface in the prospect salesroom.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              type="url"
              placeholder="https://loom.com/share/..."
              value={recordingUrl}
              onChange={(e) => setRecordingUrl(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Transcript */}
        <Card>
          <CardHeader>
            <CardTitle>Call transcript</CardTitle>
            <CardDescription className="mt-1">
              Paste the transcript, or upload a file. The full text of the call is used for scoring.
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
                placeholder="Paste the call transcript here..."
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={20}
                required
              />
            </div>
          </CardContent>
        </Card>

        {stream.error && <p className="text-sm text-red-600">{stream.error}</p>}

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={hasExtracting || !transcript.trim() || !criteriaValid}
        >
          {hasExtracting ? "Extracting files..." : "Run POV analysis"}
        </Button>
      </form>
    </div>
  )
}
