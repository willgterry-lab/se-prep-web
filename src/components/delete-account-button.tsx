"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function DeleteAccountButton() {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleDelete() {
    setLoading(true)
    setError("")
    const res = await fetch("/api/account", { method: "DELETE" })
    if (res.ok) {
      window.location.href = "/"
    } else {
      const data = await res.json()
      setError(data.error ?? "Something went wrong.")
      setLoading(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          This will permanently delete your account, all briefs, and your product context.
          This cannot be undone.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Deleting…" : "Yes, delete everything"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirming(false)}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-400" onClick={() => setConfirming(true)}>
      Delete my account
    </Button>
  )
}
