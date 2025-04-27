// VideoRecorder.tsx
"use client"

import { useRef, useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Video, StopCircle, RotateCcw, CheckCircle } from "lucide-react"

interface VideoRecorderProps {
  onVideoRecorded: (videoUrl: string) => void
}

export function VideoRecorder({ onVideoRecorded }: VideoRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [chunks, setChunks] = useState<Blob[]>([])
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isPreview, setIsPreview] = useState(false)
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)

  // start the camera preview
  const startCamera = async () => {
    if (isCameraOn) return
    const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    setStream(s)
    if (videoRef.current) videoRef.current.srcObject = s
    const mr = new MediaRecorder(s)
    recorderRef.current = mr
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) setChunks((c) => [...c, e.data])
    }
    mr.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" })
      const url  = URL.createObjectURL(blob)
      setRecordedUrl(url)
      setIsPreview(true)
    }
    setIsCameraOn(true)
  }

  const startRecording = () => {
    if (!recorderRef.current) return
    setChunks([])
    recorderRef.current.start()
    setIsRecording(true)
    setIsPreview(false)
  }

  const stopRecording = () => {
    recorderRef.current?.stop()
    setIsRecording(false)
  }

  const reRecord = () => {
    setIsPreview(false)
    setRecordedUrl(null)
    if (videoRef.current && stream) videoRef.current.srcObject = stream
  }

  const acceptVideo = () => {
    if (recordedUrl) onVideoRecorded(recordedUrl)
  }

  // cleanup on unmount
  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [stream])

  return (
    <Card className="overflow-hidden">
      <div className="aspect-video bg-gray-900 relative flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay={!isPreview}
          muted={!isPreview}
          controls={isPreview}
          playsInline
          className="w-full h-full object-cover"
        />

        {!isCameraOn && (
          <Button
            onClick={startCamera}
            className="absolute bg-purple-500 text-white px-4 py-2 rounded-full"
          >
            <Video className="mr-2" /> Start Camera
          </Button>
        )}

        {isCameraOn && !isRecording && !isPreview && (
          <Button
            onClick={startRecording}
            className="absolute bg-green-500 text-white px-4 py-2 rounded-full"
          >
            <Video className="mr-2" /> Start Recording
          </Button>
        )}

        {isRecording && (
          <Button
            onClick={stopRecording}
            className="absolute bottom-4 bg-red-500 text-white p-3 rounded-full"
          >
            <StopCircle />
          </Button>
        )}

        {isPreview && (
          <div className="absolute bottom-4 flex gap-4">
            <Button
              variant="outline"
              onClick={reRecord}
              className="bg-white text-gray-700"
            >
              <RotateCcw className="mr-2" /> Re-record
            </Button>
            <Button
              onClick={acceptVideo}
              className="bg-blue-500 text-white"
            >
              <CheckCircle className="mr-2" /> Use This Video
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}
