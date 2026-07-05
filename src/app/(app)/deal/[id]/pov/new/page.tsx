"use client"

import { useState, useRef, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import type { MeddpiccScore, MeddpiccDelta, RiskItem, PovAssessment, SuccessCriterion, PovCallType } from "@/types"

// ─── Types ───────────────────────────────────────────────────────────────────

type Phase = "form" | "classifying" | "confirm" | "streaming"

type StreamState = {
  phase: "form" | "streaming" | "done"
  criteria: SuccessCriterion[] | null
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

type CallSlot = {
  id: string
  transcript: string
  recordingUrl: string
  callDate: string
  uploadedFiles: UploadedFile[]
}

type OrderedCall = {
  slotId: string
  sourceIndex: number
  callType: PovCallType
  reasoning: string
}

type CallProgress = {
  meddpicc: MeddpiccScore | null
  criteria: SuccessCriterion[] | null
  povAssessment: PovAssessment[] | null
  risks: RiskItem[] | null
  done: boolean
}

type Deal = {
  id: string
  prospect_name: string
  prospect_company: string
  success_criteria: SuccessCriterion[]
}

const CALL_TYPE_LABELS: Record<PovCallType, string> = {
  setup: "Setup / kickoff",
  checkin: "Check-in",
  review: "Final review",
}

function emptySlot(): CallSlot {
  return {
    id: `${Date.now()}-${Math.random()}`,
    transcript: "",
    recordingUrl: "",
    callDate: "",
    uploadedFiles: [],
  }
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

function SlotEditor({
  slot,
  label,
  showRemove,
  onUpdate,
  onRemove,
}: {
  slot: CallSlot
  label: string
  showRemove: boolean
  onUpdate: (fn: (s: CallSlot) => CallSlot) => void
  onRemove: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

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
    onUpdate((s) => ({ ...s, uploadedFiles: [...s.uploadedFiles, ...entries] }))

    await Promise.all(
      allowed.map(async (file, i) => {
        const id = entries[i].id
        try {
          const fd = new FormData()
          fd.append("file", file)
          const res = await fetch("/api/extract-text", { method: "POST", body: fd })
          const data = await res.json()
          if (res.ok) {
            onUpdate((s) => ({
              ...s,
              transcript: s.transcript
                ? `${s.transcript}\n\n--- ${file.name} ---\n${data.text}`
                : `--- ${file.name} ---\n${data.text}`,
              uploadedFiles: s.uploadedFiles.map((f) => (f.id === id ? { ...f, status: "done" } : f)),
            }))
          } else {
            onUpdate((s) => ({
              ...s,
              uploadedFiles: s.uploadedFiles.map((f) => (f.id === id ? { ...f, status: "error", error: data.error } : f)),
            }))
          }
        } catch {
          onUpdate((s) => ({
            ...s,
            uploadedFiles: s.uploadedFiles.map((f) => (f.id === id ? { ...f, status: "error", error: "Upload failed" } : f)),
          }))
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
  function removeFile(id: string) {
    onUpdate((s) => ({ ...s, uploadedFiles: s.uploadedFiles.filter((f) => f.id !== id) }))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{label}</CardTitle>
            <CardDescription className="mt-1">Paste the transcript, or upload a file.</CardDescription>
          </div>
          {showRemove && (
            <button type="button" onClick={onRemove} className="text-xs text-gray-400 hover:text-red-500 shrink-0">
              Remove
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`rounded-lg border-2 border-dashed px-6 py-6 text-center cursor-pointer transition-colors ${
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

        {slot.uploadedFiles.length > 0 && (
          <div className="divide-y rounded-md border px-3">
            {slot.uploadedFiles.map((file) => (
              <FileRow key={file.id} file={file} onRemove={() => removeFile(file.id)} />
            ))}
          </div>
        )}

        <Textarea
          placeholder="Paste the call transcript here..."
          value={slot.transcript}
          onChange={(e) => onUpdate((s) => ({ ...s, transcript: e.target.value }))}
          rows={10}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Recording link (optional)</Label>
            <Input
              type="url"
              placeholder="https://loom.com/share/..."
              value={slot.recordingUrl}
              onChange={(e) => onUpdate((s) => ({ ...s, recordingUrl: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Call date (optional)</Label>
            <input
              type="date"
              value={slot.callDate}
              onChange={(e) => onUpdate((s) => ({ ...s, callDate: e.target.value }))}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const VALID_CALL_TYPES: PovCallType[] = ["setup", "checkin", "review"]

export default function PovNewPage() {
  const { id: dealId } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()

  const callTypeParam = searchParams.get("call_type")
  const hasCallTypeParam = VALID_CALL_TYPES.includes(callTypeParam as PovCallType)

  const [deal, setDeal] = useState<Deal | null>(null)
  const [callType, setCallType] = useState<PovCallType>(
    hasCallTypeParam ? (callTypeParam as PovCallType) : "setup"
  )
  const [slots, setSlots] = useState<CallSlot[]>([emptySlot()])
  const [phase, setPhase] = useState<Phase>("form")
  const [formError, setFormError] = useState<string | null>(null)

  // Single-call path (unchanged from before multi-call support existed).
  const [stream, setStream] = useState<StreamState>({
    phase: "form",
    criteria: null,
    meddpicc: null,
    delta: null,
    povAssessment: null,
    risks: null,
    error: null,
  })

  // Multi-call path.
  const [orderedCalls, setOrderedCalls] = useState<OrderedCall[] | null>(null)
  const [callProgress, setCallProgress] = useState<CallProgress[]>([])
  const [activeCallIndex, setActiveCallIndex] = useState(0)
  const [batchError, setBatchError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/deals/${dealId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.deal) {
          const d = data.deal as Deal
          setDeal(d)
          if (!hasCallTypeParam) {
            const povBriefCount = (data.briefs as { stage: string }[]).filter(
              (b) => b.stage === "pov"
            ).length
            if (povBriefCount === 1) setCallType("checkin")
            else if (povBriefCount >= 2) setCallType("review")
          }
        }
      })
      .catch(() => {})
  }, [dealId, hasCallTypeParam])

  const existingCriteria = deal?.success_criteria ?? []
  const isFirstPov = existingCriteria.length === 0

  function updateSlot(id: string, fn: (s: CallSlot) => CallSlot) {
    setSlots((prev) => prev.map((s) => (s.id === id ? fn(s) : s)))
  }
  function removeSlot(id: string) {
    setSlots((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev))
  }
  function addSlot() {
    setSlots((prev) => [...prev, emptySlot()])
  }

  const hasExtracting = slots.some((s) => s.uploadedFiles.some((f) => f.status === "extracting"))
  const allTranscriptsFilled = slots.every((s) => s.transcript.trim().length > 0)

  // ── Single-call submit (unchanged behaviour) ──────────────────────────────

  async function submitSingleCall() {
    const slot = slots[0]
    setStream({ phase: "streaming", criteria: null, meddpicc: null, delta: null, povAssessment: null, risks: null, error: null })

    try {
      const res = await fetch(`/api/deals/${dealId}/pov`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: slot.transcript,
          recording_url: slot.recordingUrl.trim() || null,
          call_type: callType,
          call_date: slot.callDate || null,
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

          if (event.type === "criteria") setStream((s) => ({ ...s, criteria: event.data }))
          else if (event.type === "meddpicc") setStream((s) => ({ ...s, meddpicc: event.data }))
          else if (event.type === "delta") setStream((s) => ({ ...s, delta: event.data }))
          else if (event.type === "pov_assessment") setStream((s) => ({ ...s, povAssessment: event.data }))
          else if (event.type === "risks") setStream((s) => ({ ...s, risks: event.data }))
          else if (event.type === "done") {
            setStream((s) => ({ ...s, phase: "done" }))
            router.push(`/deal/${event.data.deal_id}`)
          } else if (event.type === "error") {
            throw new Error(event.message)
          }
        }
      }
    } catch (err) {
      setStream((s) => ({ ...s, phase: "form", error: err instanceof Error ? err.message : "Something went wrong." }))
    }
  }

  // ── Multi-call classify + confirm + batch submit ──────────────────────────

  async function submitForClassification() {
    setFormError(null)
    setPhase("classifying")
    try {
      const res = await fetch(`/api/deals/${dealId}/pov/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcripts: slots.map((s) => s.transcript) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Could not work out call order.")

      const ordering = data.ordering as { index: number; call_type: PovCallType; reasoning: string }[]
      setOrderedCalls(
        ordering.map((o) => ({
          slotId: slots[o.index].id,
          sourceIndex: o.index,
          callType: o.call_type,
          reasoning: o.reasoning,
        }))
      )
      setPhase("confirm")
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong.")
      setPhase("form")
    }
  }

  function moveCall(i: number, dir: -1 | 1) {
    setOrderedCalls((prev) => {
      if (!prev) return prev
      const next = [...prev]
      const j = i + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  function setCallTypeAt(i: number, type: PovCallType) {
    setOrderedCalls((prev) => (prev ? prev.map((c, idx) => (idx === i ? { ...c, callType: type } : c)) : prev))
  }

  async function runBatch() {
    if (!orderedCalls) return
    setBatchError(null)
    setPhase("streaming")
    setActiveCallIndex(0)
    setCallProgress(orderedCalls.map(() => ({ meddpicc: null, criteria: null, povAssessment: null, risks: null, done: false })))

    const slotsById = new Map(slots.map((s) => [s.id, s]))

    try {
      const res = await fetch(`/api/deals/${dealId}/pov/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calls: orderedCalls.map((c) => {
            const s = slotsById.get(c.slotId)!
            return {
              transcript: s.transcript,
              recording_url: s.recordingUrl.trim() || null,
              call_date: s.callDate || null,
              call_type: c.callType,
            }
          }),
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
          const idx: number | undefined = event.call_index

          if (event.type === "call_start") {
            setActiveCallIndex(idx ?? 0)
          } else if (event.type === "call_done" && idx !== undefined) {
            setCallProgress((prev) => prev.map((c, i) => (i === idx ? { ...c, done: true } : c)))
          } else if (idx !== undefined && ["meddpicc", "delta", "criteria", "pov_assessment", "risks"].includes(event.type)) {
            setCallProgress((prev) =>
              prev.map((c, i) => {
                if (i !== idx) return c
                if (event.type === "meddpicc") return { ...c, meddpicc: event.data }
                if (event.type === "criteria") return { ...c, criteria: event.data }
                if (event.type === "pov_assessment") return { ...c, povAssessment: event.data }
                if (event.type === "risks") return { ...c, risks: event.data }
                return c
              })
            )
          } else if (event.type === "done") {
            router.push(`/deal/${event.data.deal_id}`)
          } else if (event.type === "error") {
            throw new Error(event.message)
          }
        }
      }
    } catch (err) {
      setBatchError(err instanceof Error ? err.message : "Something went wrong.")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (slots.length === 1) {
      await submitSingleCall()
    } else {
      await submitForClassification()
    }
  }

  function stepStatus(
    key: "scoring" | "pov_assessment" | "risks" | "email",
    s: StreamState
  ): "pending" | "active" | "done" {
    const scoringDone = s.meddpicc !== null && (!isFirstPov || s.criteria !== null)
    if (key === "scoring") {
      if (scoringDone) return "done"
      if (s.phase === "streaming") return "active"
    }
    if (key === "pov_assessment") {
      if (s.povAssessment) return "done"
      if (scoringDone) return "active"
    }
    if (key === "risks") {
      if (s.risks) return "done"
      if (scoringDone) return "active"
    }
    if (key === "email") {
      if (s.phase === "done") return "done"
      if (s.risks && s.povAssessment) return "active"
    }
    return "pending"
  }

  function callStepStatus(
    key: "scoring" | "pov_assessment" | "risks" | "email",
    call: CallProgress,
    isActive: boolean,
    expectsCriteria: boolean
  ): "pending" | "active" | "done" {
    const scoringDone = call.meddpicc !== null && (!expectsCriteria || call.criteria !== null)
    if (call.done) return "done"
    if (!isActive) return "pending"
    if (key === "scoring") return scoringDone ? "done" : "active"
    if (key === "pov_assessment") return call.povAssessment ? "done" : scoringDone ? "active" : "pending"
    if (key === "risks") return call.risks ? "done" : scoringDone ? "active" : "pending"
    if (key === "email") return call.risks && call.povAssessment ? "active" : "pending"
    return "pending"
  }

  // ── Render: multi-call classifying ────────────────────────────────────────

  if (phase === "classifying") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{deal?.prospect_name ?? "POV analysis"}</h1>
          <p className="text-gray-500 mt-1 text-sm">Working out the order of your {slots.length} calls...</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <StepRow label="Comparing transcripts to detect setup / check-in / final review" status="active" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Render: confirm detected order ────────────────────────────────────────

  if (phase === "confirm" && orderedCalls) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Confirm call order</h1>
          <p className="text-gray-500 mt-1 text-sm">
            This determines which call sets the success criteria (the first one) -- check it before running the analysis.
          </p>
        </div>

        <div className="space-y-3">
          {orderedCalls.map((c, i) => {
            const slot = slots.find((s) => s.id === c.slotId)
            const excerpt = slot ? slot.transcript.trim().slice(0, 220) : ""
            return (
              <Card key={c.slotId}>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs text-gray-400">
                        Call {i + 1} of {orderedCalls.length} -- originally uploaded as Call {c.sourceIndex + 1}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {(["setup", "checkin", "review"] as PovCallType[]).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setCallTypeAt(i, t)}
                            className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                              c.callType === t
                                ? "border-black bg-black text-white"
                                : "border-gray-200 text-gray-700 hover:border-gray-400"
                            }`}
                          >
                            {CALL_TYPE_LABELS[t]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveCall(i, -1)}
                        disabled={i === 0}
                        className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400"
                        aria-label="Move earlier"
                      >
                        &uarr;
                      </button>
                      <button
                        type="button"
                        onClick={() => moveCall(i, 1)}
                        disabled={i === orderedCalls.length - 1}
                        className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400"
                        aria-label="Move later"
                      >
                        &darr;
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 italic">{c.reasoning}</p>
                  <p className="text-xs text-gray-400 border-l-2 border-gray-200 pl-2 line-clamp-2">
                    {excerpt}
                    {excerpt.length === 220 ? "..." : ""}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {batchError && <p className="text-sm text-red-600">{batchError}</p>}

        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={() => setPhase("form")}>
            Back
          </Button>
          <Button type="button" className="flex-1" size="lg" onClick={runBatch}>
            Run analysis for {orderedCalls.length} calls
          </Button>
        </div>
      </div>
    )
  }

  // ── Render: multi-call streaming ──────────────────────────────────────────

  if (phase === "streaming" && orderedCalls) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{deal?.prospect_name ?? "POV analysis"}</h1>
          <p className="text-gray-500 mt-1 text-sm">Running analysis for {orderedCalls.length} calls...</p>
        </div>
        {batchError && <p className="text-sm text-red-600">{batchError}</p>}
        <div className="space-y-4">
          {orderedCalls.map((c, i) => {
            const expectsCriteria = isFirstPov && i === 0
            const progress = callProgress[i] ?? { meddpicc: null, criteria: null, povAssessment: null, risks: null, done: false }
            const isActive = i === activeCallIndex || progress.done
            return (
              <Card key={c.slotId}>
                <CardHeader>
                  <CardTitle className="text-base">
                    Call {i + 1} of {orderedCalls.length}: {CALL_TYPE_LABELS[c.callType]}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <StepRow
                    label={expectsCriteria ? "Scoring MEDDPICC and extracting success criteria" : "Scoring MEDDPICC"}
                    status={callStepStatus("scoring", progress, isActive, expectsCriteria)}
                  />
                  <StepRow label="Assessing criteria progress" status={callStepStatus("pov_assessment", progress, isActive, expectsCriteria)} />
                  <StepRow label="Identifying risks and updating questions" status={callStepStatus("risks", progress, isActive, expectsCriteria)} />
                  <StepRow label="Drafting follow-up email and next actions" status={progress.done ? "done" : callStepStatus("email", progress, isActive, expectsCriteria)} />
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Render: single-call streaming (unchanged) ─────────────────────────────

  if (stream.phase !== "form") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{deal?.prospect_name ?? "POV analysis"}</h1>
          <p className="text-gray-500 mt-1 text-sm">Running POV analysis...</p>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-3">
            <StepRow
              label={isFirstPov ? "Scoring MEDDPICC and extracting success criteria" : "Scoring MEDDPICC"}
              status={stepStatus("scoring", stream)}
            />
            <StepRow label="Assessing criteria progress" status={stepStatus("pov_assessment", stream)} />
            <StepRow label="Identifying risks and updating questions" status={stepStatus("risks", stream)} />
            <StepRow label="Drafting follow-up email and next actions" status={stepStatus("email", stream)} />
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Render: form ───────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">POV analysis</h1>
        {deal && (
          <p className="text-gray-500 mt-1">
            {deal.prospect_name} at {deal.prospect_company}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          Add more than one call below (e.g. setup, check-in, and final review together) and the order will be
          detected automatically before anything is saved.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Call type -- only shown for a single call; with multiple calls the stage is auto-detected */}
        {slots.length === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Call type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                {(["setup", "checkin", "review"] as PovCallType[]).map((t) => (
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
                    {CALL_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
              {isFirstPov && (
                <p className="text-xs text-gray-400 mt-3">
                  Success criteria will be extracted automatically from the transcript.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Show existing criteria as read-only context */}
        {!isFirstPov && existingCriteria.length > 0 && (
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

        {slots.map((slot, i) => (
          <SlotEditor
            key={slot.id}
            slot={slot}
            label={`Call ${i + 1}`}
            showRemove={slots.length > 1}
            onUpdate={(fn) => updateSlot(slot.id, fn)}
            onRemove={() => removeSlot(slot.id)}
          />
        ))}

        <button
          type="button"
          onClick={addSlot}
          className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2"
        >
          + Add another call
        </button>

        {formError && <p className="text-sm text-red-600">{formError}</p>}
        {stream.error && <p className="text-sm text-red-600">{stream.error}</p>}

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={hasExtracting || !allTranscriptsFilled}
        >
          {hasExtracting
            ? "Extracting files..."
            : slots.length === 1
            ? "Run POV analysis"
            : `Analyse ${slots.length} calls`}
        </Button>
      </form>
    </div>
  )
}
