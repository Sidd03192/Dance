interface VideoPlayerProps {
  src: string
  isPlaying: boolean
  label?: string
}

export function VideoPlayer({ src, isPlaying, label }: VideoPlayerProps) {
  return (
    <div className="relative w-full h-full">
      <video
        src={src}
        className="w-full h-full object-contain"
        controls
        autoPlay={isPlaying}
      />
      {label && (
        <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded-md text-sm">
          {label}
        </div>
      )}
    </div>
  );
}
