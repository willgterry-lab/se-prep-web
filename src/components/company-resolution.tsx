"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import type { ResolvedCompany } from "@/types"

// Shared between the Prep form (automatic, notes-derived resolution) and the
// deal page's manual "Run prospect research" flow -- same components, same
// /api/resolve-company contract, so the two entry points the spec describes
// stay visually and behaviourally identical.

export function CompanyChip({ company, onWrongCompany }: { company: ResolvedCompany; onWrongCompany: () => void }) {
  return (
    <div className="rounded-md border bg-gray-50/50 px-3 py-2.5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{company.name}</span>
          {company.domain && <span className="text-xs text-gray-400">{company.domain}</span>}
          {company.hq && <Badge variant="outline" className="text-xs">{company.hq}</Badge>}
        </div>
        {company.description && <p className="text-xs text-gray-500 mt-0.5">{company.description}</p>}
      </div>
      <button
        type="button"
        onClick={onWrongCompany}
        className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 shrink-0 mt-0.5"
      >
        Wrong company?
      </button>
    </div>
  )
}

export function CompanyOverrideInput({
  placeholder,
  defaultValue,
  onSubmit,
  onCancel,
  loading,
}: {
  placeholder: string
  defaultValue?: string
  onSubmit: (value: string) => void
  onCancel?: () => void
  loading: boolean
}) {
  const [value, setValue] = useState(defaultValue ?? "")
  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) {
            e.preventDefault()
            onSubmit(value.trim())
          }
        }}
        disabled={loading}
        className="text-sm"
      />
      <Button type="button" size="sm" disabled={loading || !value.trim()} onClick={() => onSubmit(value.trim())}>
        {loading ? "Resolving…" : "Confirm"}
      </Button>
      {onCancel && (
        <button type="button" onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600 shrink-0">
          Cancel
        </button>
      )}
    </div>
  )
}

export function CompanyCandidatePicker({
  candidates,
  onPick,
  onManual,
  loading,
}: {
  candidates: ResolvedCompany[]
  onPick: (c: ResolvedCompany) => void
  onManual: (value: string) => void
  loading: boolean
}) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50/50 p-3 space-y-2">
      <p className="text-xs font-medium text-amber-800">Which company is this?</p>
      <div className="space-y-1.5">
        {candidates.map((c, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onPick(c)}
            disabled={loading}
            className="w-full text-left rounded border bg-white px-2.5 py-2 hover:border-gray-400 transition-colors"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">{c.name}</span>
              {c.domain && <span className="text-xs text-gray-400">{c.domain}</span>}
              {c.hq && <span className="text-xs text-gray-400">{c.hq}</span>}
            </div>
            {c.description && <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>}
          </button>
        ))}
      </div>
      <p className="text-xs text-amber-700">Or enter it directly:</p>
      <CompanyOverrideInput placeholder="Company name or URL" onSubmit={onManual} loading={loading} />
    </div>
  )
}

export function CompanyNotFound({ onManual, loading }: { onManual: (value: string) => void; loading: boolean }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50/50 p-3 space-y-2">
      <p className="text-xs font-medium text-amber-800">
        Couldn&apos;t identify a company from the notes yet. Enter it directly:
      </p>
      <CompanyOverrideInput placeholder="Company name or URL" onSubmit={onManual} loading={loading} />
    </div>
  )
}
