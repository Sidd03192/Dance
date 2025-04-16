"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Video, StopCircle, Camera, RefreshCw, ArrowRight } from "lucide-react"
import { motion } from "framer-motion"

interface RecordSectionProps {
  referenceVideo: string
  onVideoRecorded: (videoUrl: string) => void
}

export function RecordSection({ referenceVideo, onVideoRecorded }: RecordSectionProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [countdown, setCountdown] = useState(0)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState(false)

  // Separate refs for live feed and preview may help
  const liveVideoRef = useRef<HTMLVideoElement>(null)
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const referenceVideoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const recordedVideoUrlRef = useRef<string | null>(null)

  // Set the source of the reference video.
  useEffect(() => {
    if (referenceVideoRef.current && referenceVideo) {
      referenceVideoRef.current.src = referenceVideo
    }
  }, [referenceVideo])

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (recordedVideoUrlRef.current) {
        URL.revokeObjectURL(recordedVideoUrlRef.current)
      }
    }
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      })
      streamRef.current = stream
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream
        setCameraActive(true)
        console.log("Camera activated.")
        liveVideoRef.current.onloadedmetadata = () => {
          liveVideoRef.current?.play().catch((err) => {
            console.error("Error playing camera feed:", err)
            setCameraError(true)
          })
        }
      }
    } catch (err) {
      console.error("Error accessing camera:", err)
      setCameraError(true)
      // Even if there's an error, set cameraActive true so that placeholder is hidden
      setCameraActive(true)
    }
  }

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    } else if (countdown === 0 && isRecording) {
      timer = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown, isRecording])

  const startRecording = () => {
    if (!cameraActive) {
      startCamera()
      return
    }
    setCountdown(3)
    setTimeout(() => {
      setIsRecording(true)
      if (streamRef.current) {
        try {
          const recorder = new MediaRecorder(streamRef.current)
          mediaRecorderRef.current = recorder
          chunksRef.current = []
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              chunksRef.current.push(e.data)
            }
          }
          recorder.onstop = () => {
            // Create recorded video URL for previewing
            const blob = new Blob(chunksRef.current, { type: "video/webm" })
            const videoUrl = URL.createObjectURL(blob)
            recordedVideoUrlRef.current = videoUrl
            setIsPreviewing(true)
            console.log("Recording stopped. Video URL:", videoUrl)
          }
          recorder.start()
          console.log("Recording started.")
        } catch (err) {
          console.error("Error starting recording:", err)
        }
      }
    }, 3000)
  }

  const stopRecording = () => {
    setIsRecording(false)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    } else {
      setIsPreviewing(true)
    }
  }

  const resetCamera = () => {
    setIsPreviewing(false)
    setRecordingTime(0)
    if (recordedVideoUrlRef.current) {
      URL.revokeObjectURL(recordedVideoUrlRef.current)
      recordedVideoUrlRef.current = null
    }
    // Restart live feed
    if (streamRef.current && liveVideoRef.current) {
      liveVideoRef.current.srcObject = streamRef.current
      liveVideoRef.current.play().catch(err => console.error("Error playing stream after reset:", err))
    }
  }

  const acceptRecording = async () => {
    if (!recordedVideoUrlRef.current) return
    const blob = await fetch(recordedVideoUrlRef.current).then((res) => res.blob())
    const formData = new FormData()
    formData.append("video", blob, "recording.webm")
    try {
      const response = await fetch("http://localhost:5000/compare", {
        method: "POST",
        body: formData,
      })
      const result = await response.json()
      console.log("Comparison result:", result)
      // You might want to pass the result to a parent component here
    } catch (err) {
      console.error("Error comparing video:", err)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const skipToNext = () => {
    onVideoRecorded("/placeholder.svg?height=720&width=1280")
  }

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <h1 className="text-3xl font-jakarta font-medium text-[#333333] mb-3">
          Record Your Performance
        </h1>
        <p className="text-[#666666]">
          Watch the reference video and record yourself performing the same dance
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Reference Video */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-2xl overflow-hidden bg-black aspect-video relative shadow-md"
        >
         <video width="320" height="240" controls>
      <source src="/example.mp4" type="video/mp4" />
      Your browser does not support the video tag.
    </video>


          <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full">
            Ref
          </div>
        </motion.div>

        {/* Recording / Preview Area */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="rounded-2xl overflow-hidden bg-black aspect-video relative shadow-md"
        >
          {/* If preview mode is active, show the recorded video */}
          {isPreviewing && recordedVideoUrlRef.current ? (
            <video
              ref={previewVideoRef}
              src={recordedVideoUrlRef.current}
              className="w-full h-full object-cover"
              controls
              playsInline
            />
          ) : (
            // Otherwise, show live camera feed (if active), or a placeholder if not
            !cameraActive ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-20">
                <Camera className="h-12 w-12 mb-3 text-gray-400" />
                <p className="mb-4">Click start to activate your camera</p>
              </div>
            ) : (
              <video
                ref={liveVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />
            )
          )}

          {countdown > 0 && (
            <motion.div
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-30"
            >
              <div className="text-7xl font-bold text-white">{countdown}</div>
            </motion.div>
          )}

          {isRecording && (
            <div className="absolute top-4 left-4 bg-[#e25c5c]/80 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 z-30">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
              REC {formatTime(recordingTime)}
            </div>
          )}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="flex flex-col items-center gap-6"
      >
        <div className="flex gap-4">
          {!cameraActive ? (
            <Button
              onClick={startCamera}
              className="bg-[#b8a2db] hover:bg-[#a28bc9] px-8 py-3 rounded-full text-white shadow-sm"
            >
              <Camera className="mr-2 h-5 w-5" />
              Start Camera
            </Button>
          ) : !isRecording && !isPreviewing ? (
            <Button
              onClick={startRecording}
              className="bg-[#b8a2db] hover:bg-[#a28bc9] px-8 py-3 rounded-full text-white shadow-sm"
            >
              <Video className="mr-2 h-5 w-5" />
              Start Recording
            </Button>
          ) : isRecording ? (
            <Button
              onClick={stopRecording}
              variant="outline"
              className="border-[#e25c5c] text-[#e25c5c] hover:bg-[#fff5f5] px-8 py-3 rounded-full shadow-sm"
            >
              <StopCircle className="mr-2 h-5 w-5" />
              Stop Recording
            </Button>
          ) : (
            <div className="flex gap-4">
              <Button
                onClick={resetCamera}
                variant="outline"
                className="border-[#cccccc] text-[#666666] hover:bg-[#f5f5f7] px-6 py-3 rounded-full shadow-sm"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Re-record
              </Button>
              <Button
                onClick={() => {
                  if (recordedVideoUrlRef.current) onVideoRecorded(recordedVideoUrlRef.current)
                }}
                className="bg-[#b8a2db] hover:bg-[#a28bc9] px-8 py-3 rounded-full text-white shadow-sm"
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                Continue to Compare
              </Button>
            </div>
          )}
        </div>
        <div className="mt-4">
          <Button
            onClick={skipToNext}
            variant="ghost"
            className="text-[#999999] hover:text-[#666666] hover:bg-transparent underline text-sm"
          >
            Skip recording (demo only)
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
