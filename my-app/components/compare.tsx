"use client"

import { useState, ChangeEvent } from "react"
import { Button } from "@/components/ui/button"

const API_BASE = "http://localhost:5000"  // <-- adjust if your Flask is elsewhere

export function CompareSection() {
  const [file, setFile] = useState<File|null>(null)
  const [streamUrl, setStreamUrl] = useState<string|null>(null)
  const [loading, setLoading] = useState(false)

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0])
  }

  const startComparison = async () => {
    if (!file) {
      alert("Please select a video file first.")
      return
    }
    setLoading(true)
    const fd = new FormData()
    fd.append("video", file)
    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: fd
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || res.statusText)
      }
      const data = await res.json()
      const raw  = encodeURIComponent(data.raw_filename)
      const pkl  = encodeURIComponent(data.landmarks_filename)
      setStreamUrl(`${API_BASE}/compare_feed?video=${raw}&landmarks=${pkl}`)
    } catch (err: any) {
      alert("Upload failed: " + err.message)
    }
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto space-y-4 text-center">
      {!streamUrl ? (
        <>
          <input
            type="file"
            accept="video/*"
            onChange={onFileChange}
            className="mx-auto"
          />
          <Button
            onClick={startComparison}
            disabled={loading || !file}
            className="mt-2 bg-purple-600 hover:bg-purple-700 text-white"
          >
            {loading ? "Uploading…" : "Start Comparison"}
          </Button>
        </>
      ) : (
        <div className="relative aspect-video rounded-lg overflow-hidden">
          <img
            src={streamUrl}
            alt="Reference + Live Comparison"
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  )
}
