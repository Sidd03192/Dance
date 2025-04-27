// VideoPlayer.tsx
import { useEffect, useRef } from "react"

interface VideoPlayerProps {
  src: string
  isPlaying: boolean
  label?: string
}

export function VideoPlayer({ src, isPlaying, label }: VideoPlayerProps) {
  const ref = useRef<HTMLVideoElement>(null)

  // play / pause when isPlaying changes
  useEffect(() => {
    if (!ref.current) return
    if (isPlaying) ref.current.play().catch(() => {})
    else ref.current.pause()
  }, [isPlaying])

  return (
    <div className="relative w-full h-full">
      {label && (
        <span className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 rounded">
          {label}
        </span>
      )}
      <video
        ref={ref}
        src={src}
        controls
        className="w-full h-full object-contain"
      />
    </div>
  )
}
