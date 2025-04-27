"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Video, StopCircle, Camera, RefreshCw, ArrowRight, Maximize2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface RecordSectionProps {
  referenceVideo: string
}

export function RecordSection({ referenceVideo }: RecordSectionProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [countdown, setCountdown] = useState(0)
  const [cameraActive, setCameraActive] = useState(false)

  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [rawFilename, setRawFilename] = useState<string | null>(null)
  const [landmarksFilename, setLandmarksFilename] = useState<string | null>(null)
  const [comparisonSrc, setComparisonSrc] = useState<string | null>(null)
  const [isComparing, setIsComparing] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraActive(true)
      }
    } catch {
      alert("Camera access denied.")
    }
  }

  // Recording countdown & timer
  useEffect(() => {
    let t: NodeJS.Timeout
    if (countdown > 0) {
      t = setTimeout(() => setCountdown(c => c-1), 1000)
    } else if (countdown === 0 && isRecording) {
      t = setInterval(() => setRecordingTime(t => t+1), 1000)
    }
    return () => clearTimeout(t)
  }, [countdown, isRecording])

  const startRecording = () => {
    if (!streamRef.current) {
      startCamera()
      return
    }
    setCountdown(3)
    setTimeout(() => {
      setIsRecording(true)
      const mr = new MediaRecorder(streamRef.current!)
      mediaRecorderRef.current = mr
      chunksRef.current = []
      mr.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" })
        setRecordedBlob(blob)
      }
      mr.start()
    }, 3000)
  }

  const stopRecording = () => {
    setIsRecording(false)
    mediaRecorderRef.current?.stop()
  }

  const reset = () => {
    setRecordedBlob(null)
    setRawFilename(null)
    setLandmarksFilename(null)
    setComparisonSrc(null)
    setIsComparing(false)
    setRecordingTime(0)
    if (streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play()
    }
  }

  // Upload & get filenames
  const startComparison = async () => {
    if (!recordedBlob) return
    const file = new File([recordedBlob], "recorded.webm", { type: "video/webm" })
    const fd = new FormData()
    fd.append("video", file)
    const res = await fetch("/upload", { method: "POST", body: fd })
    const data = await res.json()
    setRawFilename(data.raw_filename)
    setLandmarksFilename(data.landmarks_filename)
    setComparisonSrc(`/compare_feed?video=${data.raw_filename}&landmarks=${data.landmarks_filename}`)
    setIsComparing(true)
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s/60).toString().padStart(2,"0")
    const sec = (s%60).toString().padStart(2,"0")
    return `${m}:${sec}`
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl mb-4">Compare Your Dance to Reference</h1>

      {!isComparing ? (
        <div className="aspect-video bg-black relative mb-4 rounded-xl overflow-hidden">
          {!streamRef.current || !recordedBlob ? (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          ) : (
            <video src={URL.createObjectURL(recordedBlob)} autoPlay loop className="w-full h-full object-cover" />
          )}

          {countdown>0 && (
            <div className="absolute inset-0 flex items-center justify-center text-white text-6xl bg-black/50">
              {countdown}
            </div>
          )}
          {isRecording && (
            <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded">
              REC {formatTime(recordingTime)}
            </div>
          )}
        </div>
      ) : (
        // MJPEG comparison stream
        <img
          src={comparisonSrc!}
          className="aspect-video w-full object-cover rounded-xl mb-4"
          alt="Comparison Stream"
        />
      )}

      <div className="flex gap-4">
        {!isRecording && !recordedBlob && (
          <Button onClick={startRecording}>
            <Video className="mr-2" /> Record
          </Button>
        )}
        {isRecording && (
          <Button variant="destructive" onClick={stopRecording}>
            <StopCircle className="mr-2" /> Stop
          </Button>
        )}
        {recordedBlob && !isComparing && (
          <>
            <Button onClick={reset} variant="outline">
              <RefreshCw className="mr-2" /> Re-record
            </Button>
            <Button onClick={startComparison}>
              <ArrowRight className="mr-2" /> Start Comparison
            </Button>
          </>
        )}
        {isComparing && (
          <Button onClick={reset} variant="outline">
            <Maximize2 className="mr-2" /> Reset
          </Button>
        )}
      </div>
    </div>
  )
}
