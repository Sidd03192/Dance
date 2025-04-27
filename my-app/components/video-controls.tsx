"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw } from "lucide-react"
import { motion } from "framer-motion"

interface VideoControlsProps {
  isPlaying: boolean
  onPlayPause: () => void
  onRestart: () => void
  duration: number
  currentTime: number
  onSeek: (time: number) => void
  volume: number
  onVolumeChange: (volume: number) => void
  isMuted: boolean
  onMuteToggle: () => void
  isFullscreen: boolean
  onFullscreenToggle: () => void
  showControls: boolean
}

export function VideoControls({
  isPlaying,
  onPlayPause,
  onRestart,
  duration,
  currentTime,
  onSeek,
  volume,
  onVolumeChange,
  isMuted,
  onMuteToggle,
  isFullscreen,
  onFullscreenToggle,
  showControls,
}: VideoControlsProps) {
  const [isHovering, setIsHovering] = useState(false)
  const [sliderValue, setSliderValue] = useState(0)
  const [volumeSliderValue, setVolumeSliderValue] = useState([volume * 100])
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Update slider value when currentTime changes
  useEffect(() => {
    const percentage = duration ? (currentTime / duration) * 100 : 0
    setSliderValue(percentage)
  }, [currentTime, duration])

  // Update volume slider when volume changes
  useEffect(() => {
    setVolumeSliderValue([volume * 100])
  }, [volume])

  // Handle seek
  const handleSeek = (value: number[]) => {
    const newTime = (value[0] / 100) * duration
    setSliderValue(value[0])
    onSeek(newTime)
  }

  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    setVolumeSliderValue(value)
    onVolumeChange(value[0] / 100)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: showControls || isHovering ? 1 : 0,
        y: showControls || isHovering ? 0 : 10,
      }}
      transition={{ duration: 0.2 }}
      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pt-16 pb-4 px-4"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Progress bar */}
      <div className="mb-2">
        <Slider
          value={[sliderValue]}
          onValueChange={handleSeek}
          max={100}
          step={0.1}
          className="w-full [&>span:first-child]:h-1.5 [&>span:first-child]:bg-white/30 [&_[role=slider]]:bg-white [&_[role=slider]]:w-4 [&_[role=slider]]:h-4 [&_[role=slider]]:border-0 [&>span:first-child_span]:bg-[#b8a2db] [&_[role=slider]:focus-visible]:ring-0 [&_[role=slider]:focus-visible]:ring-offset-0"
        />
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPlayPause}
            className="text-white hover:bg-white/20 rounded-full w-10 h-10"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onRestart}
            className="text-white hover:bg-white/20 rounded-full w-10 h-10"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          <div
            className="relative"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={onMuteToggle}
              className="text-white hover:bg-white/20 rounded-full w-10 h-10"
            >
              {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>

            {showVolumeSlider && (
              <div className="absolute bottom-full left-0 mb-2 bg-black/80 backdrop-blur-md rounded-lg p-3 w-32">
                <Slider
                  value={volumeSliderValue}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                  className="w-full [&>span:first-child]:h-1 [&>span:first-child]:bg-white/30 [&_[role=slider]]:bg-white [&_[role=slider]]:w-3 [&_[role=slider]]:h-3 [&_[role=slider]]:border-0 [&>span:first-child_span]:bg-[#b8a2db] [&_[role=slider]:focus-visible]:ring-0 [&_[role=slider]:focus-visible]:ring-offset-0"
                />
              </div>
            )}
          </div>

          <span className="text-white text-sm ml-2">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={onFullscreenToggle}
            className="text-white hover:bg-white/20 rounded-full w-10 h-10"
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
