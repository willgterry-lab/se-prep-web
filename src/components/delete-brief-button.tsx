"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function DeleteBriefButton({ briefId }: { briefId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const res = await fetch(`/api/briefs/${briefId}`, { method: "DELETE" })
    if (res.ok) {
      router.push("/dashboard")
      router.refresh()
    } else {
      setLoading(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Delete this brief?</span>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={loading}
        >
          {loading ? "Deleting…" : "Yes, delete"}
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
    )
  }

  return (
    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-600" onClick={() => setConfirming(true)}>
      Delete brief
    </Button>
  )
}
