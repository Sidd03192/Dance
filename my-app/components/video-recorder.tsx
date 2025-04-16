"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Video, StopCircle, RotateCcw, CheckCircle } from "lucide-react"

interface VideoRecorderProps {
  onVideoRecorded: (videoUrl: string) => void
}

export function VideoRecorder({ onVideoRecorded }: VideoRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)

  // In a real app, this would be the actual recorded video
  const demoVideoUrl = "/placeholder.svg?height=720&width=1280"

  const startRecording = () => {
    setIsRecording(true)
    // In a real app, this would start the camera recording

    // Simulate recording time counter
    const interval = setInterval(() => {
      setRecordingTime((prev) => prev + 1)
    }, 1000)

    // Simulate stopping after 5 seconds
    setTimeout(() => {
      clearInterval(interval)
      stopRecording()
    }, 5000)
  }

  const stopRecording = () => {
    setIsRecording(false)
    setIsPreviewing(true)
    // In a real app, this would stop the recording and save the video
  }

  const resetRecording = () => {
    setIsPreviewing(false)
    setRecordingTime(0)
    // In a real app, this would reset the recording
  }

  const acceptRecording = () => {
    // In a real app, this would be the URL of the recorded video
    onVideoRecorded(demoVideoUrl)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <Card className="overflow-hidden">
      <div className="aspect-video bg-gray-900 relative flex items-center justify-center">
        {!isRecording && !isPreviewing ? (
          <div className="text-center p-6">
            <Video className="h-12 w-12 text-purple-300 mx-auto mb-4" />
            <h3 className="text-white text-lg font-medium mb-2">Ready to record</h3>
            <p className="text-gray-400 text-sm mb-4">Position yourself in frame and press record when ready</p>
            <Button onClick={startRecording} className="bg-purple-500 hover:bg-purple-600 text-white">
              Start Recording
            </Button>
          </div>
        ) : (
          // This would be a video element in a real app
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <div className="text-white text-lg">{isRecording ? "Recording..." : "Preview"}</div>
          </div>
        )}

        {isRecording && (
          <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            {formatTime(recordingTime)}
          </div>
        )}

        {isRecording && (
          <Button
            variant="outline"
            size="icon"
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white text-red-500 hover:bg-gray-100 rounded-full h-12 w-12"
            onClick={stopRecording}
          >
            <StopCircle className="h-6 w-6" />
          </Button>
        )}

        {isPreviewing && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
            <Button variant="outline" className="bg-white text-gray-700 hover:bg-gray-100" onClick={resetRecording}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Re-record
            </Button>
            <Button className="bg-purple-500 hover:bg-purple-600 text-white" onClick={acceptRecording}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Use This Video
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}
