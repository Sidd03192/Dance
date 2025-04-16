"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, RotateCcw, X, Sparkles, ArrowRight } from "lucide-react"
import { motion } from "framer-motion"

interface ComparisonSectionProps {
  referenceVideo: string
  userVideo: string
  onGetFeedback: () => void
  onReset: () => void
}

export function ComparisonSection({ referenceVideo, userVideo, onGetFeedback, onReset }: ComparisonSectionProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [sensitivity, setSensitivity] = useState([50])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const referenceVideoRef = useRef<HTMLVideoElement>(null)
  const userVideoRef = useRef<HTMLVideoElement>(null)

  // Initialize videos
  useEffect(() => {
    if (referenceVideoRef.current && referenceVideo) {
      referenceVideoRef.current.src = referenceVideo
    }
    if (userVideoRef.current && userVideo) {
      userVideoRef.current.src = userVideo
    }
  }, [referenceVideo, userVideo])

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

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <h1 className="text-3xl font-jakarta font-medium text-[#333333] mb-3">Compare Performances</h1>
        <p className="text-[#666666]">Watch both videos side by side to see how your performance compares</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Reference Video */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-2xl overflow-hidden bg-black aspect-video relative shadow-md"
        >
          <video ref={referenceVideoRef} className="w-full h-full object-contain" playsInline muted controls={false} />
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="flex flex-col items-center gap-10"
      >
        <div className="flex gap-4">
          <Button
            onClick={togglePlayback}
            className="bg-[#b8a2db] hover:bg-[#a28bc9] rounded-full px-6 text-white shadow-sm"
          >
            {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
            {isPlaying ? "Pause" : "Play"}
          </Button>
          <Button
            variant="outline"
            onClick={resetPlayback}
            className="rounded-full border-[#cccccc] text-[#666666] hover:bg-[#f5f5f7] shadow-sm"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Restart
          </Button>
          <Button
            variant="outline"
            className="text-[#666666] rounded-full border-[#cccccc] hover:bg-[#f5f5f7] shadow-sm"
            onClick={onReset}
          >
            <X className="mr-2 h-4 w-4" />
            End
          </Button>
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
            className="bg-[#b8a2db] hover:bg-[#a28bc9] px-10 py-3 rounded-full text-white shadow-sm"
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

        {/* Clear Next button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-4"
        >
          <Button
            onClick={handleGetFeedback}
            className="bg-[#b8a2db] hover:bg-[#a28bc9] px-10 py-3 rounded-full text-white shadow-sm flex items-center"
          >
            Continue to Feedback
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}
