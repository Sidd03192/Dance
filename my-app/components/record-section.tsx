"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Video, StopCircle, Camera, RefreshCw, ArrowRight, Maximize2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

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

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null)
  const fullscreenContainerRef = useRef<HTMLDivElement>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const referenceVideoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const recordedVideoUrlRef = useRef<string | null>(null)

  // Initialize reference video
  useEffect(() => {
    if (referenceVideoRef.current && referenceVideo) {
      referenceVideoRef.current.src = referenceVideo
    }
  }, [referenceVideo])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Clean up camera stream when component unmounts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

      // Clean up any object URLs
      if (recordedVideoUrlRef.current) {
        URL.revokeObjectURL(recordedVideoUrlRef.current)
      }
    }
  }, [])

  // Update the startCamera function to properly initialize the camera
  const startCamera = async () => {
    try {
      // Make sure we're using the correct constraints for better compatibility
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      }

      console.log("Requesting camera access...")
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log("Camera access granted:", stream)

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream

        // Make sure we're properly handling the video element loading
        videoRef.current.onloadedmetadata = () => {
          console.log("Video metadata loaded")
          videoRef.current?.play().catch((err) => {
            console.error("Error playing video:", err)
            setCameraError(true)
          })
        }

        // Add error handling for the video element
        videoRef.current.onerror = (err) => {
          console.error("Video element error:", err)
          setCameraError(true)
        }

        setCameraActive(true)
      } else {
        console.error("Video ref is not available")
        setCameraError(true)
      }
    } catch (err) {
      console.error("Error accessing camera:", err)
      setCameraError(true)
      // Fallback for demo purposes - show a placeholder
      setCameraActive(true)
    }
  }

  // Simulate recording
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

      // In a real implementation, we would start recording from the camera stream
      if (streamRef.current) {
        try {
          const mediaRecorder = new MediaRecorder(streamRef.current)
          mediaRecorderRef.current = mediaRecorder
          chunksRef.current = []

          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              chunksRef.current.push(e.data)
            }
          }

          mediaRecorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: "video/webm" })
            const videoUrl = URL.createObjectURL(blob)
            recordedVideoUrlRef.current = videoUrl

            if (videoRef.current) {
              videoRef.current.srcObject = null
              videoRef.current.src = videoUrl
              videoRef.current.play()
            }

            setIsPreviewing(true)
          }

          mediaRecorder.start()
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
      // Fallback for demo
      setIsPreviewing(true)
    }
  }

  const resetCamera = () => {
    setIsPreviewing(false)
    setRecordingTime(0)

    // Clean up recorded video URL
    if (recordedVideoUrlRef.current) {
      URL.revokeObjectURL(recordedVideoUrlRef.current)
      recordedVideoUrlRef.current = null
    }

    // Restart camera feed
    if (streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play()
    }
  }

  const acceptRecording = () => {
    // Use the actual recorded video URL if available
    if (recordedVideoUrlRef.current) {
      onVideoRecorded(recordedVideoUrlRef.current)
    } else {
      // Fallback for demo
      onVideoRecorded("/placeholder.svg?height=720&width=1280")
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // For demo purposes, allow skipping to next step
  const skipToNext = () => {
    onVideoRecorded("/placeholder.svg?height=720&width=1280")
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)

    if (!isFullscreen) {
      if (fullscreenContainerRef.current?.requestFullscreen) {
        fullscreenContainerRef.current.requestFullscreen().catch((err) => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`)
        })
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.error(`Error attempting to exit fullscreen: ${err.message}`)
        })
      }
    }
  }

  // Add this effect for fullscreen change detection:
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false)
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  // Add this effect for auto-hiding controls:
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true)

      if (controlsTimeout) {
        clearTimeout(controlsTimeout)
      }

      const timeout = setTimeout(() => {
        setShowControls(false)
      }, 3000)

      setControlsTimeout(timeout)
    }

    if (isFullscreen) {
      window.addEventListener("mousemove", handleMouseMove)

      return () => {
        window.removeEventListener("mousemove", handleMouseMove)
        if (controlsTimeout) {
          clearTimeout(controlsTimeout)
        }
      }
    }
  }, [isFullscreen, controlsTimeout])

  // Update the UI to show a more prominent camera button
  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <h1 className="text-3xl font-jakarta font-medium text-[#333333] mb-3">Record Your Performance</h1>
        <p className="text-[#666666]">Watch the reference video and record yourself performing the same dance</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Reference Video */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-2xl overflow-hidden bg-black aspect-video relative shadow-md"
        >
          <video ref={referenceVideoRef} className="w-full h-full object-contain" controls playsInline />
          <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full">
            Reference
          </div>
        </motion.div>

        {/* Recording Area */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="rounded-2xl overflow-hidden bg-black aspect-video relative shadow-md"
        >
          {!cameraActive ? (
            <div className="absolute inset-0 flex items-center justify-center text-center text-white z-20">
              <div className="p-8 rounded-xl bg-black/40 backdrop-blur-md">
                <Camera className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="mb-6 text-gray-200">Camera access required to record your dance</p>
                <Button
                  onClick={startCamera}
                  className="bg-[#b8a2db] hover:bg-[#a28bc9] px-6 py-2 rounded-full text-white shadow-sm"
                >
                  <Camera className="mr-2 h-5 w-5" />
                  Enable Camera
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* This is the actual camera feed */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
                style={{ display: cameraActive ? "block" : "none" }}
              />

              {/* Show error message if camera fails */}
              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                  <div className="text-center text-white p-4">
                    <p className="mb-2">Camera could not be accessed</p>
                    <p className="text-sm text-gray-400">Please check your camera permissions</p>
                  </div>
                </div>
              )}
            </>
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
                onClick={acceptRecording}
                className="bg-[#b8a2db] hover:bg-[#a28bc9] px-8 py-3 rounded-full text-white shadow-sm"
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                Continue to Compare
              </Button>
            </div>
          )}

          <Button
            onClick={toggleFullscreen}
            variant="outline"
            className="border-[#b8a2db] text-[#b8a2db] hover:bg-[#f5f0ff] px-6 py-3 rounded-full shadow-sm"
          >
            <Maximize2 className="mr-2 h-4 w-4" />
            Fullscreen View
          </Button>
        </div>

        {/* Skip button for demo purposes */}
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

      {/* Fullscreen Mode */}
      {isFullscreen && (
        <div ref={fullscreenContainerRef} className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Videos container */}
          <div className="flex-1 flex">
            {/* Reference Video */}
            <div className="w-1/2 h-full relative">
              <video ref={referenceVideoRef} className="w-full h-full object-contain" playsInline controls={false} />
              <div className="absolute bottom-16 left-4 bg-black/40 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full">
                Reference
              </div>
            </div>

            {/* Camera/Recording Video */}
            <div className="w-1/2 h-full relative">
              {cameraActive ? (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-900">
                  <Button
                    onClick={startCamera}
                    className="bg-[#b8a2db] hover:bg-[#a28bc9] px-6 py-2 rounded-full text-white shadow-sm"
                  >
                    <Camera className="mr-2 h-5 w-5" />
                    Enable Camera
                  </Button>
                </div>
              )}
              <div className="absolute bottom-16 left-4 bg-black/40 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full">
                Your Camera
              </div>

              {isRecording && (
                <div className="absolute top-4 left-4 bg-[#e25c5c]/80 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 z-30">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                  REC {formatTime(recordingTime)}
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <AnimatePresence>
            {showControls && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent"
              >
                <div className="flex items-center justify-between">
                  <Button
                    onClick={() => setIsFullscreen(false)}
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                  >
                    Exit Fullscreen
                  </Button>

                  <div className="flex gap-4">
                    {!isRecording && !isPreviewing ? (
                      <Button
                        onClick={startRecording}
                        className="bg-[#b8a2db] hover:bg-[#a28bc9] px-6 rounded-full text-white"
                      >
                        <Video className="mr-2 h-5 w-5" />
                        Start Recording
                      </Button>
                    ) : isRecording ? (
                      <Button
                        onClick={stopRecording}
                        className="bg-[#e25c5c] hover:bg-[#d14c4c] px-6 rounded-full text-white"
                      >
                        <StopCircle className="mr-2 h-5 w-5" />
                        Stop Recording
                      </Button>
                    ) : (
                      <div className="flex gap-4">
                        <Button
                          onClick={resetCamera}
                          variant="outline"
                          className="border-white text-white hover:bg-white/20"
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Re-record
                        </Button>
                        <Button
                          onClick={acceptRecording}
                          className="bg-[#b8a2db] hover:bg-[#a28bc9] px-6 rounded-full text-white"
                        >
                          <ArrowRight className="mr-2 h-4 w-4" />
                          Continue
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}