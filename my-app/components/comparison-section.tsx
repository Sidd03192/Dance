"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, RotateCcw, X, Sparkles, ArrowRight, Maximize2 } from "lucide-react"
import { motion } from "framer-motion"

// Import the FullscreenComparison component
import { FullscreenComparison } from "@/components/fullscreen-comparison"

interface ComparisonSectionProps {
  referenceVideo: string
  userVideo: string
  onGetFeedback: () => void
  onReset: () => void
  autoPlay?: boolean // Add autoPlay prop
}

export function ComparisonSection({
  referenceVideo,
  userVideo,
  onGetFeedback,
  onReset,
  autoPlay = false, // Default to false if not provided
}: ComparisonSectionProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [sensitivity, setSensitivity] = useState([50])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const referenceVideoRef = useRef<HTMLVideoElement>(null)
  const userVideoRef = useRef<HTMLVideoElement>(null)

  // Add fullscreen mode state and functions
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  // Update time tracking
  useEffect(() => {
    const updateTime = () => {
      if (referenceVideoRef.current) {
        setCurrentTime(referenceVideoRef.current.currentTime)
        setDuration(referenceVideoRef.current.duration || 0)
      }
    }

    const interval = setInterval(updateTime, 250)
    return () => clearInterval(interval)
  }, [])

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Function to toggle fullscreen mode
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)

    if (!isFullscreen) {
      // Request fullscreen on the container
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch((err) => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`)
        })
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.error(`Error attempting to exit fullscreen: ${err.message}`)
        })
      }
    }
  }

  // Add event listener for fullscreen change
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

  // Initialize videos
  useEffect(() => {
    if (referenceVideoRef.current && referenceVideo) {
      referenceVideoRef.current.src = referenceVideo

      // If autoPlay is true, set up videos to play once loaded
      if (autoPlay) {
        referenceVideoRef.current.onloadedmetadata = () => {
          if (userVideoRef.current?.readyState >= 2) {
            // Both videos are ready
            syncAndPlay()
          }
        }
      }
    }

    if (userVideoRef.current && userVideo) {
      userVideoRef.current.src = userVideo

      // If autoPlay is true, set up videos to play once loaded
      if (autoPlay) {
        userVideoRef.current.onloadedmetadata = () => {
          if (referenceVideoRef.current?.readyState >= 2) {
            // Both videos are ready
            syncAndPlay()
          }
        }
      }
    }
  }, [referenceVideo, userVideo, autoPlay])

  // Function to sync and play both videos
  const syncAndPlay = () => {
    if (referenceVideoRef.current && userVideoRef.current) {
      Promise.all([referenceVideoRef.current.play(), userVideoRef.current.play()])
        .then(() => {
          setIsPlaying(true)
        })
        .catch((err) => {
          console.error("Error playing videos:", err)
          setIsPlaying(false)
        })
    }
  }

  // Synchronize video playback
  useEffect(() => {
    const syncVideos = () => {
      if (referenceVideoRef.current && userVideoRef.current) {
        if (isPlaying) {
          Promise.all([referenceVideoRef.current.play(), userVideoRef.current.play()]).catch((err) =>
            console.error("Error playing videos:", err),
          )
        } else {
          referenceVideoRef.current.pause()
          userVideoRef.current.pause()
        }
      }
    }

    syncVideos()
  }, [isPlaying])

  const togglePlayback = () => {
    setIsPlaying(!isPlaying)
  }

  const resetPlayback = () => {
    setIsPlaying(false)
    if (referenceVideoRef.current) {
      referenceVideoRef.current.currentTime = 0
      referenceVideoRef.current.pause()
    }
    if (userVideoRef.current) {
      userVideoRef.current.currentTime = 0
      userVideoRef.current.pause()
    }
  }

  const handleGetFeedback = () => {
    setIsAnalyzing(true)
    // Simulate analysis time
    setTimeout(() => {
      setIsAnalyzing(false)
      onGetFeedback()
    }, 2000)
  }

  // Update the return statement to include the FullscreenComparison component
  return (
    <div className="max-w-5xl mx-auto">
      {/* Fullscreen comparison mode */}
      <FullscreenComparison
        referenceVideo={referenceVideo}
        userVideo={userVideo}
        isFullscreen={isFullscreen}
        onExitFullscreen={() => setIsFullscreen(false)}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`text-center mb-10 ${isFullscreen ? "hidden" : ""}`}
      >
        <h1 className="text-3xl font-jakarta font-medium text-[#333333] mb-3">Compare Performances</h1>
        <p className="text-[#666666]">Watch both videos side by side to see how your performance compares</p>
      </motion.div>

      <div ref={containerRef} className={isFullscreen ? "hidden" : ""}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* Reference Video */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-2xl overflow-hidden bg-black aspect-video relative shadow-md"
          >
            <video
              ref={referenceVideoRef}
              className="w-full h-full object-contain"
              playsInline
              muted
              controls={false}
            />
            {!referenceVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <p className="text-white">Reference video not available</p>
              </div>
            )}
            <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full">
              Reference
            </div>
          </motion.div>

          {/* User Video */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="rounded-2xl overflow-hidden bg-black aspect-video relative shadow-md"
          >
            <video ref={userVideoRef} className="w-full h-full object-contain" playsInline muted controls={false} />
            {!userVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <p className="text-white">Your video not available</p>
              </div>
            )}
            <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full">
              Your Performance
            </div>
          </motion.div>
        </div>

        {/* Enhanced Play Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="w-full max-w-3xl bg-black/80 backdrop-blur-md rounded-xl p-4 shadow-lg">
            {/* Progress bar */}
            <div className="mb-4 px-2">
              <Slider
                value={[currentTime && duration ? (currentTime / duration) * 100 : 0]}
                onValueChange={(value) => {
                  if (referenceVideoRef.current && userVideoRef.current && duration) {
                    const newTime = (value[0] / 100) * duration
                    referenceVideoRef.current.currentTime = newTime
                    userVideoRef.current.currentTime = newTime
                  }
                }}
                max={100}
                step={0.1}
                className="w-full [&>span:first-child]:h-1.5 [&>span:first-child]:bg-white/20 [&_[role=slider]]:bg-white [&_[role=slider]]:w-4 [&_[role=slider]]:h-4 [&_[role=slider]]:border-0 [&>span:first-child_span]:bg-[#7851c4] [&_[role=slider]:focus-visible]:ring-0 [&_[role=slider]:focus-visible]:ring-offset-0"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  onClick={resetPlayback}
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10 rounded-full w-10 h-10"
                >
                  <RotateCcw className="h-5 w-5" />
                </Button>

                {/* Play/Pause button - larger and more prominent */}
                <Button
                  onClick={togglePlayback}
                  className={`
                    rounded-full w-14 h-14 flex items-center justify-center
                    ${
                      isPlaying
                        ? "bg-white/20 hover:bg-white/30 text-white"
                        : "bg-white hover:bg-white/90 text-[#7851c4]"
                    }
                  `}
                >
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
                </Button>

                <Button
                  onClick={onReset}
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10 rounded-full w-10 h-10"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-white/80 text-sm font-medium mr-2">
                  {formatTime(currentTime || 0)} <span className="text-white/40 mx-1">/</span>{" "}
                  {formatTime(duration || 0)}
                </div>

                <Button
                  onClick={toggleFullscreen}
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10 rounded-full w-10 h-10"
                >
                  <Maximize2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="w-full max-w-md bg-white p-6 rounded-2xl shadow-sm"
          >
            <h3 className="text-sm font-medium text-[#333333] mb-4">AI Sensitivity</h3>
            <div className="flex justify-between mb-2 text-xs text-[#666666]">
              <span>Less Detail</span>
              <span>More Detail</span>
            </div>
            <Slider value={sensitivity} onValueChange={setSensitivity} max={100} step={1} className="w-full" />
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={handleGetFeedback}
              className="bg-[#7851c4] hover:bg-[#6a46b0] px-10 py-3 rounded-full text-white shadow-sm"
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Get AI Feedback
                </>
              )}
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-4"
        >
          <Button
            onClick={handleGetFeedback}
            className="bg-[#7851c4] hover:bg-[#6a46b0] px-10 py-3 rounded-full text-white shadow-sm flex items-center"
          >
            Continue to Feedback
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
