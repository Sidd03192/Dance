"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { VideoControls } from "@/components/video-controls"
import { ArrowLeft } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface FullscreenComparisonProps {
  referenceVideo: string
  userVideo: string
  isFullscreen: boolean
  onExitFullscreen: () => void
}

export function FullscreenComparison({
  referenceVideo,
  userVideo,
  isFullscreen,
  onExitFullscreen,
}: FullscreenComparisonProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.5)
  const [isMuted, setIsMuted] = useState(false)
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null)

  const referenceVideoRef = useRef<HTMLVideoElement>(null)
  const userVideoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize videos
  useEffect(() => {
    if (referenceVideoRef.current && referenceVideo) {
      referenceVideoRef.current.src = referenceVideo
      referenceVideoRef.current.volume = volume
      referenceVideoRef.current.muted = isMuted
    }
    if (userVideoRef.current && userVideo) {
      userVideoRef.current.src = userVideo
      userVideoRef.current.volume = volume
      userVideoRef.current.muted = isMuted
    }
  }, [referenceVideo, userVideo, volume, isMuted])

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

  // Update current time and duration
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

  // Auto-hide controls
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true)

      if (controlsTimeout) {
        clearTimeout(controlsTimeout)
      }

      const timeout = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false)
        }
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
  }, [isFullscreen, isPlaying, controlsTimeout])

  // Handle play/pause
  const togglePlayback = () => {
    setIsPlaying(!isPlaying)
  }

  // Handle restart
  const handleRestart = () => {
    if (referenceVideoRef.current && userVideoRef.current) {
      referenceVideoRef.current.currentTime = 0
      userVideoRef.current.currentTime = 0
      setIsPlaying(true)
    }
  }

  // Handle seek
  const handleSeek = (time: number) => {
    if (referenceVideoRef.current && userVideoRef.current) {
      referenceVideoRef.current.currentTime = time
      userVideoRef.current.currentTime = time
    }
  }

  // Handle volume change
  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume)
    if (referenceVideoRef.current && userVideoRef.current) {
      referenceVideoRef.current.volume = newVolume
      userVideoRef.current.volume = newVolume
    }

    if (newVolume > 0 && isMuted) {
      setIsMuted(false)
    }
  }

  // Handle mute toggle
  const handleMuteToggle = () => {
    const newMutedState = !isMuted
    setIsMuted(newMutedState)

    if (referenceVideoRef.current && userVideoRef.current) {
      referenceVideoRef.current.muted = newMutedState
      userVideoRef.current.muted = newMutedState
    }
  }

  if (!isFullscreen) return null

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Exit button */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-4 z-20"
          >
            <Button
              onClick={onExitFullscreen}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 rounded-full w-10 h-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Videos container */}
      <div className="flex-1 flex">
        {/* Reference Video */}
        <div className="w-1/2 h-full relative">
          <video
            ref={referenceVideoRef}
            className="w-full h-full object-contain"
            playsInline
            muted={isMuted}
            onClick={togglePlayback}
          />
          <div className="absolute bottom-16 left-4 bg-black/40 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full">
            Reference
          </div>
        </div>

        {/* User Video */}
        <div className="w-1/2 h-full relative">
          <video
            ref={userVideoRef}
            className="w-full h-full object-contain"
            playsInline
            muted={isMuted}
            onClick={togglePlayback}
          />
          <div className="absolute bottom-16 left-4 bg-black/40 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full">
            Your Performance
          </div>
        </div>
      </div>

      {/* Video Controls */}
      <VideoControls
        isPlaying={isPlaying}
        onPlayPause={togglePlayback}
        onRestart={handleRestart}
        duration={duration}
        currentTime={currentTime}
        onSeek={handleSeek}
        volume={volume}
        onVolumeChange={handleVolumeChange}
        isMuted={isMuted}
        onMuteToggle={handleMuteToggle}
        isFullscreen={isFullscreen}
        onFullscreenToggle={onExitFullscreen}
        showControls={showControls}
      />
    </div>
  )
}
